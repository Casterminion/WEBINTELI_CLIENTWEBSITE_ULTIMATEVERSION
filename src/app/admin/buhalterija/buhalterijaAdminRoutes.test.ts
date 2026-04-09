import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));

describe("Buhalterija routing (source)", () => {
  it("/admin/buhalterija serves dashboard component, not redirect to saskaitos", () => {
    const src = readFileSync(join(dir, "page.tsx"), "utf8");
    expect(src).toContain("BuhalterijaDashboardView");
    expect(src).not.toMatch(/redirect\s*\(\s*["']\/admin\/buhalterija\/saskaitos["']\s*\)/);
  });

  it("/admin/buhalterija/saskaitos keeps invoice list page", () => {
    const src = readFileSync(join(dir, "saskaitos/page.tsx"), "utf8");
    expect(src).toContain("admin_invoices");
    expect(src).toContain("BuhalterijaNav");
  });

  it("BuhalterijaNav links overview, invoices, settings", () => {
    const src = readFileSync(join(dir, "../../../components/admin/buhalterija/BuhalterijaNav.tsx"), "utf8");
    expect(src).toContain('"/admin/buhalterija"');
    expect(src).toContain('"/admin/buhalterija/saskaitos"');
    expect(src).toContain('"/admin/buhalterija/nustatymai"');
  });

  it("Admin shell points Buhalterija to overview route", () => {
    const src = readFileSync(join(dir, "../../../components/admin/AdminShell.tsx"), "utf8");
    expect(src).toContain('{ href: "/admin/buhalterija"');
  });

  it("dashboard view includes VAT progress ring markup", () => {
    const src = readFileSync(join(dir, "../../../components/admin/buhalterija/BuhalterijaDashboardView.tsx"), "utf8");
    expect(src).toContain("strokeDashoffset");
    expect(src).toContain("dashboardVatMonitorTitle");
  });
});
