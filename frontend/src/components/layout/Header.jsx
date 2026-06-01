import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ scrollToSection }) => {
  const navigate = useNavigate();

  const handleNavClick = (e, id) => {
    if (scrollToSection) {
      scrollToSection(e, id);
    } else {
      e.preventDefault();
      navigate('/#' + id);
    }
  };

  return (
    <header className="fixed w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 px-6 py-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between" aria-label="Main Navigation">
        <a href="/#hero" onClick={(e) => handleNavClick(e, 'hero')} className="flex items-center gap-3 group">
          <img src="/VH-removebg.png" alt="VidHelp Logo" className="w-12 h-12 object-contain" />
          <span className="text-2xl font-black text-white tracking-tighter uppercase font-sans">VidHelp</span>
        </a>
        <div className="hidden md:flex items-center gap-10 text-white/60 font-black text-[10px] uppercase tracking-[0.3em]">
          <a href="/#problem" onClick={(e) => handleNavClick(e, 'problem')} className="hover:text-primary transition-colors">Why</a>
          <a href="/#results" onClick={(e) => handleNavClick(e, 'results')} className="hover:text-primary transition-colors">Services</a>
          <a href="/#clients" onClick={(e) => handleNavClick(e, 'clients')} className="hover:text-primary transition-colors">Clients</a>
          <a href="/#impact" onClick={(e) => handleNavClick(e, 'impact')} className="hover:text-primary transition-colors">Impact</a>
          <a href="/#industry-honor" onClick={(e) => handleNavClick(e, 'industry-honor')} className="hover:text-primary transition-colors">Award</a>
          <a href="/#news" onClick={(e) => handleNavClick(e, 'news')} className="hover:text-primary transition-colors">News</a>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => window.open('https://wa.me/6285121057706?text=Hi%20Admin!%20Mau%20Konsultasi%20Brand%20aku%20dong!', '_blank')} className="bg-primary text-white px-8 py-3 font-black hover:bg-black transition-all text-[10px] tracking-[0.2em] uppercase rounded-full">
            Konsultasi
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
