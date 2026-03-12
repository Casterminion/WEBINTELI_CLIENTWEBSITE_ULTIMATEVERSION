import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const Header: React.FC = () => (
  <motion.header
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="header"
  >
    <div className="container">
      <Link href="/">
        <a className="logo">Svetainių Kūrimas</a>
      </Link>
      <nav className="nav">
        <Link href="/"><a>Pagrindinis</a></Link>
        <Link href="/apie-mus"><a>Apie mus</a></Link>
        <Link href="/paslaugos"><a>Paslaugos</a></Link>
        <Link href="/projektai"><a>Projektai</a></Link>
        <Link href="/kontaktai"><a>Kontaktai</a></Link>
      </nav>
    </div>
  </motion.header>
);

export default Header;
