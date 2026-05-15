import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Phone, Mail, ArrowUp, Cpu } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white text-black pt-10 pb-6 px-6 border-t border-black/10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <img src="/VH-removebg.png" alt="VidHelp Logo" className="w-8 h-8 object-contain" />
              <span className="text-2xl font-black tracking-tighter uppercase font-sans text-black">VidHelp</span>
            </div>
            <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest leading-loose mb-6">WHERE COMMERCE MEETS HUMAN CONNECTION,<br />
              Your digital partner to scales up your business</p>
          </div>
          <div>
             <h4 className="font-black mb-6 uppercase tracking-[0.4em] text-[10px] text-primary font-sans">Layanan</h4>
             <ul className="space-y-4 text-black/60 font-black text-[10px] uppercase tracking-[0.2em] mb-8">
               <li><a href="/#results" className="hover:text-primary transition-colors">SERVICE</a></li>
               <li><button onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))} className="hover:text-primary transition-colors uppercase">FAQ</button></li>
               <li><a href="https://wa.me/6285121057706?text=Hi%20VidHelp%20Team,%20I'm%20interested%20in%20bringing%20my%20creative%20energy%20to%20VH.%20I've%20attached%20my%20profile%20and%20I'd%20love%20to%20discuss%20how%20I%20can%20contribute%20to%20your%20next%20big%20digital%20commerce%20breakthrough.%20Are%20there%20any%20open%20opportunities%20for%20us%20to%20collaborate" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors uppercase">HIRING</a></li>
             </ul>
             <div className="pt-6 border-t border-black/5">
                <Link to="/admin" className="text-primary font-black text-[10px] hover:text-black transition-colors uppercase tracking-[0.3em] flex items-center gap-2">
                  <Cpu size={14} /> Admin Portal
                </Link>
             </div>
          </div>
            <div>
             <h4 className="font-black mb-6 uppercase tracking-[0.4em] text-[10px] text-primary font-sans">Kontak</h4>
             <ul className="space-y-6">
               <li>
                 <a href="https://wa.me/6285121057706" target="_blank" rel="noreferrer" className="flex items-start gap-6 group">
                   <div className="w-10 h-10 border border-black/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0"><Phone size={18} /></div>
                   <div><p className="text-[10px] text-black/20 font-black uppercase tracking-widest mb-1">Telepon / WhatsApp</p><p className="text-sm font-black text-black tracking-tight">+62 851 2105 7706</p></div>
                 </a>
               </li>
               <li>
                 <a href="https://instagram.com/vidhelp.id" target="_blank" rel="noreferrer" className="flex items-start gap-6 group">
                   <div className="w-10 h-10 border border-black/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0"><Instagram size={18} /></div>
                   <div><p className="text-[10px] text-black/20 font-black uppercase tracking-widest mb-1">Instagram</p><p className="text-sm font-black text-black tracking-tight">@vidhelp.id</p></div>
                 </a>
               </li>
               <li>
                 <a href="mailto:vidhelp.admin@gmail.com" className="flex items-start gap-6 group">
                   <div className="w-10 h-10 border border-black/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0"><Mail size={18} /></div>
                   <div><p className="text-[10px] text-black/20 font-black uppercase tracking-widest mb-1">Email Support</p><p className="text-sm font-black text-black tracking-tight">vidhelp.admin@gmail.com</p></div>
                 </a>
               </li>
             </ul>
             <div className="mt-12 pt-8 border-t border-black/5">
                <h4 className="font-black mb-2 uppercase tracking-[0.4em] text-[10px] text-primary font-sans">Office</h4>
                <a href="https://www.google.com/maps/search/?api=1&query=Jl.+Ki+Hajar+Dewantara+No.15,+RT.2%2FRW.4,+Simpangan,+Cikarang+Utara,+Bekasi" target="_blank" rel="noreferrer" className="block text-[10px] font-bold text-black/60 leading-relaxed uppercase hover:text-black transition-colors">Jl. Ki Hajar Dewantara No.15, RT.2/RW.4, Simpangan, Cikarang Utara, Bekasi</a>
             </div>
          </div>
        </div>
        <div className="pt-8 border-t border-black/10 flex flex-col md:flex-row items-center justify-center gap-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-black/20">@ Copyright 2026 by VIDHELP AGENCY</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
