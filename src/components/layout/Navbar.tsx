"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Locale } from '@/contexts/LanguageContext';
import { PHONE_DISPLAY, PHONE_TEL } from '@/lib/phone';
import styles from './Navbar.module.css';

type NavItem = { label: string; href: string };
type DropdownGroup = { title: string; items: { label: string; href: string }[] };

const LANG_OPTIONS: { locale: Locale; label: string }[] = [
  { locale: 'lt', label: 'Lietuvių' },
  { locale: 'en', label: 'English' },
];

const Navbar: React.FC = () => {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale, t } = useLanguage();
  const siteName = "Webinteli";

  const navItems: NavItem[] = [
    { label: t.nav.beforeAfter, href: '/#before-after' },
    { label: t.nav.process, href: '/#process' },
    { label: t.nav.questions, href: '/#questions' },
    { label: t.nav.pricing, href: '/#pricing' },
  ];

  const dropdownGroups: DropdownGroup[] = [
    {
      title: t.nav.beyondSeoDropdown.ai.title,
      items: [
        { label: t.nav.beyondSeoDropdown.ai.chat, href: '/more/ai-chat-agents' },
        { label: t.nav.beyondSeoDropdown.ai.voice, href: '/more/ai-voice-agents' },
        { label: t.nav.beyondSeoDropdown.ai.custom, href: '/more/custom-ai-solutions' },
      ],
    },
    {
      title: t.nav.beyondSeoDropdown.automation.title,
      items: [
        { label: t.nav.beyondSeoDropdown.automation.workflow, href: '/more/workflow-automation' },
        { label: t.nav.beyondSeoDropdown.automation.business, href: '/more/business-process-automation' },
      ],
    },
    {
      title: t.nav.beyondSeoDropdown.development.title,
      items: [
        { label: t.nav.beyondSeoDropdown.development.web, href: '/more/web-development' },
        { label: t.nav.beyondSeoDropdown.development.ecommerce, href: '/more/e-commerce-development' },
        { label: t.nav.beyondSeoDropdown.development.mobile, href: '/more/mobile-app-development' },
      ],
    },
  ];

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setDropdownOpen(false);
      if (langRef.current && !langRef.current.contains(target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}
    >
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          {siteName}
        </Link>

        <nav className={styles.nav}>
          {navItems.map(({ label, href }) => (
            <Link key={href} href={href} className={styles.navLink}>
              {label}
            </Link>
          ))}
          <div
            ref={dropdownRef}
            className={`${styles.dropdown} ${dropdownOpen ? styles.dropdownOpen : ''}`}
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <button
              type="button"
              className={styles.dropdownTrigger}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              {t.nav.beyondSeo}
              <svg className={styles.dropdownChevron} width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              className={`${styles.servicesMenu} ${dropdownOpen ? styles.servicesMenuOpen : ''}`}
              role="menu"
              aria-label="Services"
            >
              {dropdownGroups.map((group, groupIdx) => (
                <div key={group.title} className={styles.servicesGroup}>
                  <span className={styles.servicesGroupTitle} aria-hidden>
                    {group.title}
                  </span>
                  <ul className={styles.servicesList} role="none">
                    {group.items.map(({ label, href }) => (
                      <li key={href} role="none">
                        <Link
                          href={href}
                          className={styles.servicesLink}
                          role="menuitem"
                          onClick={() => setDropdownOpen(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setDropdownOpen(false);
                          }}
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </nav>

        <div ref={langRef} className={styles.langSwitch} role="group" aria-label="Language">
          <button
            type="button"
            onClick={() => setLangOpen(!langOpen)}
            className={styles.langTrigger}
            aria-expanded={langOpen}
            aria-haspopup="true"
          >
            {locale === 'lt' ? 'LT' : 'EN'}
            <svg className={`${styles.langChevron} ${langOpen ? styles.langChevronOpen : ''}`} width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className={`${styles.langMenu} ${langOpen ? styles.langMenuOpen : ''}`} role="menu">
            {LANG_OPTIONS.map(({ locale: l, label }) => (
              <button
                key={l}
                type="button"
                role="menuitem"
                className={styles.langItem}
                onClick={() => { setLocale(l); setLangOpen(false); }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <a href={`tel:${PHONE_TEL}`} className={styles.callButton} aria-label={`Call ${PHONE_DISPLAY}`}>
          {PHONE_DISPLAY}
        </a>

        <div className={styles.mobileMenu}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor">
            <path d="M5 7H25M5 15H20M5 23H10" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
