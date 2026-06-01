import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Phone, Mail, Cpu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Footer = ({ variant = 'public' }) => {
  const { user } = useAuth();
  
  return (
    <>
      <style>{`
        html:not(.dark) .vh-footer-public { 
          background-color: #e5e7eb !important;
        }
        .dark .vh-footer-public { 
          background-color: #1e1e1e !important;
        }
        html:not(.dark) .vh-footer-admin { 
          background-color: #e5e7eb !important;
        }
        .dark .vh-footer-admin { 
          background-color: #1e1e1e !important;
        }
        .vh-footer-admin .footer-icon-box {
          color: #2563eb !important;
          border-color: currentColor;
        }
        .vh-footer-admin .footer-icon-box:hover {
          background-color: #2563eb !important;
          color: white !important;
        }
        .vh-footer-admin .footer-heading {
          color: #2563eb !important;
        }
        .vh-footer-admin .footer-link:hover {
          color: #2563eb !important;
        }
        .vh-footer-admin .footer-admin-portal {
          color: #2563eb !important;
        }
      `}</style>

      <footer className={`vh-footer-${variant} w-full text-foreground border-t border-border pt-10 pb-6 px-6`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10 text-left">
            
            {/* Column 1: Agency Profile */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                {user ? (
<span className={`text-2xl font-black tracking-tighter uppercase font-sans ${variant === 'admin' ? 'text-[#2563eb]' : 'text-primary'}`}>VH</span>                ) : (
                  <>
                    <img src="/VH-removebg.png" alt="VidHelp Logo" className="w-8 h-8 object-contain" />
                    <span className="text-2xl font-black tracking-tighter uppercase font-sans text-foreground">VidHelp</span>
                  </>
                )}
              </div>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest leading-loose mb-6">
                WHERE COMMERCE MEETS HUMAN CONNECTION,<br/>
                Your digital partner to scale up your business
              </p>
            </div>

            {/* Column 2: Services & Navigation */}
<div>
  <h4 className="footer-heading font-black mb-6 uppercase tracking-[0.4em] text-[10px] text-primary font-sans">Layanan</h4>
  <ul className="space-y-4 text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] mb-8">
    <li>
      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))} 
        className="footer-link hover:text-primary transition-colors uppercase"
      >
        FAQ
      </button>
    </li>
    <li>
      <a 
        href="https://wa.me/6285121057706?text=Hi%20VidHelp%20Team..." 
        target="_blank" 
        rel="noreferrer" 
        className="footer-link hover:text-primary transition-colors uppercase"
      >
        HIRING
      </a>
    </li>
    {user && (
      <li>
        <Link to="/" className="transition-colors uppercase text-[#2563eb] hover:text-[#1d4ed8]">
          LANDING PAGE
        </Link>
      </li>
    )}
  </ul>
  
  {!user && (
    <div className="pt-6 border-t border-border">
      <Link 
        to="/admin" 
        className="font-black text-[10px] hover:text-foreground transition-colors uppercase tracking-[0.3em] flex items-center gap-2 text-[#DB1A1A]"
      >
        <Cpu size={14} /> Admin Portal
      </Link>
    </div>
  )}
</div>

            {/* Column 3: Contact & Office Info */}
            <div>
              <h4 className="footer-heading font-black mb-6 uppercase tracking-[0.4em] text-[10px] text-primary font-sans">Contact</h4>
              <ul className="space-y-6">
                <li>
                  <a href="https://wa.me/6285121057706" target="_blank" rel="noreferrer" className="flex items-start gap-6 group">
                    <div className="footer-icon-box w-10 h-10 border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Phone / WhatsApp</p>
                      <p className="text-sm font-black text-foreground tracking-tight">+62 851 2105 7706</p>
                    </div>
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com/vidhelp.id" target="_blank" rel="noreferrer" className="flex items-start gap-6 group">
                    <div className="footer-icon-box w-10 h-10 border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Instagram size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Instagram</p>
                      <p className="text-sm font-black text-foreground tracking-tight">@vidhelp.id</p>
                    </div>
                  </a>
                </li>
                <li>
                  <a href="mailto:vidhelp.admin@gmail.com" className="flex items-start gap-6 group">
                    <div className="footer-icon-box w-10 h-10 border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Email Support</p>
                      <p className="text-sm font-black text-foreground tracking-tight">vidhelp.admin@gmail.com</p>
                    </div>
                  </a>
                </li>
              </ul>
              
              <div className="mt-12 pt-8 border-t border-border">
                <h4 className="footer-heading font-black mb-2 uppercase tracking-[0.4em] text-[10px] text-primary font-sans">Office</h4>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Jl.+Ki+Hajar+Dewantara+No.15,+RT.2%2FRW.4,+Simpangan,+Cikarang+Utara,+Bekasi" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="block text-[10px] font-bold text-muted-foreground leading-relaxed uppercase hover:text-foreground transition-colors"
                >
                  Jl. Ki Hajar Dewantara No.15, RT.2/RW.4, Simpangan, Cikarang Utara, Bekasi
                </a>
              </div>
            </div>

          </div>

          {/* Copyright Area */}
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-center gap-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">
              @ Copyright 2026 by VIDHELP AGENCY
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;