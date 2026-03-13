import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPackageBySlug } from '@/data/packages';
import { checkRateLimit, recordSubmission } from '@/lib/rateLimit';

const MIN_FORM_TIME_MS = 3000; // reject if submit < 3 seconds after form open

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) return realIp.trim();
  return 'unknown';
}

function sanitize(s: string): string {
  return s
    .trim()
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

type ValidationCode =
  | 'name_length'
  | 'email_invalid'
  | 'city_length'
  | 'industry_length'
  | 'package_invalid'
  | 'invalid_request';

function validateBody(
  body: unknown
): { ok: true; data: Record<string, string> } | { ok: false; code: ValidationCode } {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'invalid_request' };
  }

  const b = body as Record<string, unknown>;

  // Honeypot: if filled, treat as bot (handled in POST)
  const website = typeof b.website === 'string' ? b.website.trim() : '';
  if (website.length > 0) {
    return { ok: false, code: 'invalid_request' };
  }

  const name = typeof b.name === 'string' ? sanitize(b.name) : '';
  const email = typeof b.email === 'string' ? sanitize(b.email) : '';
  const city = typeof b.city === 'string' ? sanitize(b.city) : '';
  const industry = typeof b.industry === 'string' ? sanitize(b.industry) : '';
  const packageSlug = typeof b.package_slug === 'string' ? b.package_slug.trim() : '';
  const service = typeof b.service === 'string' ? b.service.trim() || 'SEO' : 'SEO';
  const packagePriceDisplay = typeof b.package_price_display === 'string' ? b.package_price_display.trim() : '';

  if (name.length < 2 || name.length > 100) {
    return { ok: false, code: 'name_length' };
  }
  if (email.length < 5 || email.length > 255 || !EMAIL_REGEX.test(email)) {
    return { ok: false, code: 'email_invalid' };
  }
  if (city.length < 2 || city.length > 200) {
    return { ok: false, code: 'city_length' };
  }
  if (industry.length < 2 || industry.length > 200) {
    return { ok: false, code: 'industry_length' };
  }

  const pkg = getPackageBySlug(packageSlug);
  if (!pkg) {
    return { ok: false, code: 'package_invalid' };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      city,
      industry,
      package_slug: packageSlug,
      service,
      package_price_display: packagePriceDisplay,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const b = body as Record<string, unknown>;
    const ip = getClientIp(request);

    // Honeypot: silent fail for bots
    const website = typeof b.website === 'string'
      ? b.website.trim()
      : '';
    if (website.length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Time-based bot check
    const formOpenedAt = b.form_opened_at;
    if (typeof formOpenedAt === 'string') {
      const opened = Date.parse(formOpenedAt);
      if (!Number.isNaN(opened) && Date.now() - opened < MIN_FORM_TIME_MS) {
        return NextResponse.json(
          { error: 'validation', code: 'invalid_request' },
          { status: 400 }
        );
      }
    }

    const validated = validateBody(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: 'validation', code: validated.code },
        { status: 400 }
      );
    }

    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'rate_limit', retryAfterSeconds: rate.retryAfterSeconds },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.retryAfterSeconds ?? 60),
          },
        }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      const missing = [
        !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
        !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
      ].filter(Boolean) as string[];
      const missingStr = missing.join(' and ');
      if (process.env.NODE_ENV === 'development') {
        console.error(`Intake API: missing ${missingStr}. Add to .env.local (see README).`);
        return NextResponse.json(
          { error: 'config', message: `Missing setup: add ${missingStr} to .env.local (see README).` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'config', message: 'Something went wrong on our end. Please try again later.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { error } = await supabase.from('intake_submissions').insert({
      name: validated.data.name,
      email: validated.data.email,
      city: validated.data.city,
      industry: validated.data.industry,
      package_slug: validated.data.package_slug,
      service: validated.data.service,
      package_price_display: validated.data.package_price_display,
    });

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Intake API Supabase insert error:', error.message);
      }
      return NextResponse.json(
        {
          error: 'validation',
          message:
            process.env.NODE_ENV === 'development'
              ? `Database error: ${error.message}`
              : 'Something went wrong. Please try again.',
        },
        { status: 500 }
      );
    }

    recordSubmission(ip);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'validation', code: 'invalid_request' },
      { status: 400 }
    );
  }
}
