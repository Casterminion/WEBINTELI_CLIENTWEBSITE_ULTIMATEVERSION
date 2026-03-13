"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import styles from './PremiumButton.module.css';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: 'primary' | 'secondary' | 'white' | 'outline-black';
  className?: string;
  iconDirection?: 'down' | 'right';
  type?: 'button' | 'submit' | 'reset';
}

const PremiumButton: React.FC<ButtonProps> = ({ 
  children, 
  href, 
  variant = 'primary', 
  className = '',
  iconDirection = 'right',
  type = 'button'
}) => {
  const variantClass = styles[variant];

  const Content = (
    <>
      <span className={styles.text}>{children}</span>
      <motion.div 
        className={styles.iconWrapper}
        whileHover={{ scale: 1.15 }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40">
           {iconDirection === 'down' ? (
             <path d="M12 15L20 23L28 15" stroke="currentColor" strokeWidth="2" fill="none" />
           ) : (
             <path d="M15 12L23 20L15 28" stroke="currentColor" strokeWidth="2" fill="none" />
           )}
        </svg>
      </motion.div>
    </>
  );

  const fullClassName = `${styles.button} ${variantClass} ${className}`;

  if (href) {
    if (href.startsWith('#')) {
      return (
        <a href={href} className={fullClassName}>
          {Content}
        </a>
      );
    }
    return (
      <Link href={href} className={fullClassName}>
        {Content}
      </Link>
    );
  }

  return (
    <button type={type} className={fullClassName}>
      {Content}
    </button>
  );
};

export default PremiumButton;
