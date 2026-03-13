"use client";

import React from 'react';
import Link from 'next/link';
import { Globe, ShoppingCart, Bot, Workflow } from 'lucide-react';
import './GlassIcons.css';

const gradientMapping: Record<string, string> = {
  blue: 'linear-gradient(hsl(223, 90%, 50%), hsl(208, 90%, 50%))',
  purple: 'linear-gradient(hsl(283, 90%, 50%), hsl(268, 90%, 50%))',
  red: 'linear-gradient(hsl(3, 90%, 50%), hsl(348, 90%, 50%))',
  indigo: 'linear-gradient(hsl(253, 90%, 50%), hsl(238, 90%, 50%))',
  orange: 'linear-gradient(hsl(43, 90%, 50%), hsl(28, 90%, 50%))',
  green: 'linear-gradient(hsl(123, 90%, 40%), hsl(108, 90%, 40%))',
};

const ICON_SIZE = 40;

export type GlassIconItem = {
  icon: React.ReactNode;
  color: string;
  label: string;
  customClass?: string;
  href?: string;
};

const DEFAULT_ITEMS: GlassIconItem[] = [
  { icon: <Globe size={ICON_SIZE} strokeWidth={1.8} />, color: 'blue', label: 'Web Development', href: '/more/web-development' },
  { icon: <ShoppingCart size={ICON_SIZE} strokeWidth={1.8} />, color: 'orange', label: 'E-commerce Development', href: '/more/e-commerce-development' },
  { icon: <Bot size={ICON_SIZE} strokeWidth={1.8} />, color: 'purple', label: 'DI Chat Agents', href: '/more/ai-chat-agents' },
  { icon: <Workflow size={ICON_SIZE} strokeWidth={1.8} />, color: 'green', label: 'Workflow Automation', href: '/more/workflow-automation' },
];

function getBackgroundStyle(color: string, colorful: boolean): React.CSSProperties {
  if (colorful && gradientMapping[color]) {
    return { background: gradientMapping[color] };
  }
  return { background: 'linear-gradient(hsl(220, 15%, 35%), hsl(220, 15%, 25%))' };
}

function IconBlock({
  item,
  colorful,
}: {
  item: GlassIconItem;
  colorful: boolean;
}) {
  return (
    <>
      <span
        className="icon-btn__back"
        style={getBackgroundStyle(item.color, colorful)}
      />
      <span className="icon-btn__front">
        <span className="icon-btn__icon" aria-hidden="true">
          {item.icon}
        </span>
      </span>
      <span className="icon-btn__label">{item.label}</span>
    </>
  );
}

type GlassIconsProps = {
  items?: GlassIconItem[];
  className?: string;
  colorful?: boolean;
  onItemClick?: () => void;
};

export default function GlassIcons({
  items = DEFAULT_ITEMS,
  className = '',
  colorful = false,
  onItemClick,
}: GlassIconsProps) {
  return (
    <div className={`icon-btns ${className}`.trim()}>
      {items.map((item, index) => {
        const content = <IconBlock item={item} colorful={colorful} />;
        if (item.href) {
          return (
            <Link
              key={index}
              href={item.href}
              className={`icon-btn ${item.customClass || ''}`.trim()}
              aria-label={item.label}
              onClick={onItemClick}
            >
              {content}
            </Link>
          );
        }
        return (
          <button
            key={index}
            type="button"
            className={`icon-btn ${item.customClass || ''}`.trim()}
            aria-label={item.label}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
