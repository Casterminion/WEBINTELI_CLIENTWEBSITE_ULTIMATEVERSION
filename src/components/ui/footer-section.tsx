"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Facebook, 
  Linkedin, 
  Instagram,
  Mail,
  Phone,
  MapPin,
  Youtube,
  X
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { useLanguage } from '@/contexts/LanguageContext';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  )
}

const Footerdemo: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="relative border-t bg-gradient-to-br from-background via-muted/50 to-muted pt-32 pb-12 overflow-hidden transition-colors duration-300">
      {/* Background patterns - no fade mask */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          <div className="group">
            <div className="flex items-center mb-8">
              <span className="text-xl font-bold tracking-tight text-foreground">
                Webinteli
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {t.footer.tagline}
            </p>
            <div className="grid w-fit grid-cols-3 gap-3">
              <TooltipProvider>
                {[
                  { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61584275999888", label: "Facebook" },
                  { icon: Instagram, href: "https://www.instagram.com/webinteli/", label: "Instagram" },
                  { icon: Linkedin, href: "https://www.linkedin.com/company/110282018/", label: "LinkedIn" },
                  { icon: X, href: "https://x.com/TheWebinteli", label: "X" },
                  { icon: Youtube, href: "https://www.youtube.com/channel/UCHcdoW9rscVNNiH1Cua1x8g", label: "YouTube" },
                  { icon: TikTokIcon, href: "https://www.tiktok.com/@webinteli", label: "TikTok" }
                ].map((social, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <a 
                        href={social.href} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-background/90 text-muted-foreground shadow-sm transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2"
                      >
                        <social.icon className="h-[18px] w-[18px]" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{t.footer.follow} {social.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">{t.footer.services}</h4>
            <ul className="space-y-4">
              {[
                { label: t.footer.serviceLabels.chat, href: "/more/ai-chat-agents" },
                { label: t.footer.serviceLabels.voice, href: "/more/ai-voice-agents" },
                { label: t.footer.serviceLabels.custom, href: "/more/custom-ai-solutions" },
                { label: t.footer.serviceLabels.workflow, href: "/more/workflow-automation" },
                { label: t.footer.serviceLabels.process, href: "/more/business-process-automation" },
                { label: t.footer.serviceLabels.web, href: "/more/web-development" },
                { label: t.footer.serviceLabels.ecommerce, href: "/more/e-commerce-development" },
                { label: t.footer.serviceLabels.mobile, href: "/more/mobile-app-development" }
              ].map((service, idx) => (
                <li key={idx}>
                  <Link href={service.href} className="text-muted-foreground hover:text-foreground transition-colors duration-300 flex items-center group">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">{t.footer.links}</h4>
            <ul className="space-y-4">
              {[
                { label: t.beforeAfter.tag, href: '/#before-after' },
                { label: t.process.tag, href: '/#process' },
                { label: t.faq.tag, href: '/#questions' },
                { label: t.pricing.tag, href: '/#pricing' },
                { label: t.nav.privacy, href: '/privacy' },
                { label: t.nav.terms, href: '/terms' }
              ].map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors duration-300 flex items-center group">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">{t.footer.contact}</h4>
            <ul className="space-y-4">
              <li className="text-muted-foreground flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary/60" />
                Lithuania, Kaunas
              </li>
              <li>
                <a href="mailto:kontaktai@webinteli.lt" className="text-muted-foreground hover:text-foreground transition-colors duration-300 flex items-center group">
                  <Mail className="w-5 h-5 mr-2 text-primary/60" />
                  kontaktai@webinteli.lt
                </a>
              </li>
              <li>
                <a href="tel:+37060521705" className="text-muted-foreground hover:text-foreground transition-colors duration-300 flex items-center group">
                  <Phone className="w-5 h-5 mr-2 text-primary/60" />
                  +370 (605) 21705
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-foreground/10 text-center">
          <p className="text-muted-foreground text-sm font-medium">
            © {new Date().getFullYear()} Webinteli. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
};


export { Footerdemo };
