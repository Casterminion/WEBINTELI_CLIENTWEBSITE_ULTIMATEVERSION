"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Footerdemo } from "@/components/ui/footer-section";

const Footer: React.FC = () => {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="block">
      <Footerdemo />
    </footer>
  );
};

export default Footer;
