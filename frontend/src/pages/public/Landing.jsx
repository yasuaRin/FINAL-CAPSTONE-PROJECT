import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import { 
  CheckCircle2, 
  Rocket, 
  TrendingUp, 
  ShieldCheck, 
  Play, 
  ArrowRight,
  MonitorPlay,
  Zap,
  Users,
  MessageSquare,
  Heart,
  Share2,
  Camera,
  BarChart3,
  Globe,
  Star,
  Layers,
  ShoppingBag,
  Cpu,
  Sparkles,
  Instagram,
  Mail,
  Phone,
  ArrowUp,
  Diamond,
  Watch,
  Coffee,
  Smartphone,
  Shirt,
  Scissors,
  X,
  Briefcase, ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';


function AnimatedNumber({ value, suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (inView) {
      const controls = animate(0, value, {
        duration: 2,
        onUpdate: (latest) => setCount(Math.floor(latest))
      });
      return () => controls.stop();
    }
  }, [inView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const LandingPage = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const triggerPoint = document.documentElement.scrollHeight - window.innerHeight * 3;
      if (scrollPosition > (triggerPoint > 1000 ? triggerPoint : 1000)) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const services = [
    { icon: <MonitorPlay />, title: "Operasional 24/7", desc: "Sesi live shopping non-stop yang dioptimalkan untuk TikTok & Shopee." },
    { icon: <Users />, title: "Host Elit", desc: "Akses ke host bersertifikat (Influencer seperti Tasya Farasya, Cindy Gulla) yang ahli konversi." },
    { icon: <Camera />, title: "Produksi OBS", desc: "Visual sinematik dengan sistem OBS untuk branding profesional dan interaktif." },
    { icon: <BarChart3 />, title: "Analisis GMV", desc: "Strategi berbasis data yang telah menghasilkan akumulasi $5jt++ USD." },
    { icon: <Briefcase />, title: "Paket UMKM", desc: "Solusi live streaming terjangkau mulai dari Rp 100rb/jam untuk brand lokal." },
    { icon: <Rocket />, title: "Growth Cepat", desc: "Bantu client mendapatkan jutaan pengikut dan akumulasi penjualan masif." }
  ];

  const clients = [
    { name: "Verites", logo: "/verites.png" },
    { name: "KUNDAL", logo: "/kundal.png" },
    { name: "C&F", logo: "/c&f.png" },
    { name: "innisfree", logo: "/innisfree.png" },
    { name: "Pyunkang Yul", logo: "/pyunkangyul.webp" },
    { name: "juva by zap", logo: "/juva.png" },
    { name: "SOZO CLINIC", logo: "/Sozoclinic.png" },
    { name: "MOMOGI", logo: "/momogi.png" },
    { name: "SATURDAYS", logo: "/saturdays.png" },
    { name: "BYOOTE", logo: "/byoote.png" },
    { name: "flimty", logo: "/flimty.webp" },
    { name: "Rollover", logo: "/rollover.png" },
    { name: "Luxcrime", logo: "/luxcrime.png" },
    { name: "Remington", logo: "/remington.png" },
    { name: "Laboré", logo: "/labore.png" },
    { name: "Yves Rocher", logo: "/yvesrocher.png" },
    { name: "Deorex", logo: "/deorex.png" },
    { name: "Base", logo: "/base.webp" },
    { name: "Nacific", logo: "/nacific.png" },
    { name: "Erha Ultimate Hair Care", logo: "/erhaultimatehaircare.png" },
    { name: "Erha Ultimate Acne Cure", logo: "/erhaultimateacnecure.png" }
  ];

  const newsData = [
    {
      title: "Viral itu Bonus, Jasver Jas Founder VidHelp Dorong Kreator Fokus pada Konsistensi dan Data",
      desc: "Menurut Jasver Jas, keberhasilan kreator dan brand bersama VidHelp tidak lagi ditentukan oleh satu konten viral, melainkan strategi yang digerakkan oleh data nyata di tengah derasnya arus informasi.",
      url: "https://gobekasi.id/2026/05/07/viral-itu-bonus-kreator-didorong-fokus-pada-konsistensi-dan-data/",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Jasver Jas: Generasi Muda Bisa Manfaatkan Media Sosial untuk Bangun Karier Bersama VidHelp",
      desc: "Merespons pergeseran tren industri kreatif digital, Founder VidHelp, Jasver Jas, membuka wawasan generasi muda untuk memanfaatkan ekosistem livestream sebagai peluang membangun karier masa depan.",
      url: "https://katadata.co.id/lifestyle/edukasi/69fc329e1ee32/generasi-muda-bisa-manfaatkan-media-sosial-untuk-bangun-karier#goog_rewarded",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Mahasiswa President University Bersama Jasver Jas Soroti Pergeseran Tren Industri Kreatif Digital",
      desc: "Dalam Expo Karier 2026, Jasver Jas (Founder VidHelp) mengupas tuntas pergeseran tren livestream dan peluang karir agensi kreatif digital bagi talenta muda tanah air.",
      url: "https://siaran-berita.com/mahasiswa-president-university-gelar-expo-karier-2026-soroti-pergeseran-tren-industri-kreatif-digital-catatan-redaksi-tulis-beritanya-langsung-di-kolom-berita-bukan-link-ke-dokumen-lain-pdf-ata/",
      image: "https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=800"
    }
  ];

  return (
    <div className="w-full">
      <section id="hero" className="relative pt-48 lg:pt-56 pb-20 px-6 overflow-hidden hero-gradient scroll-mt-24">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <h1 className="text-3xl lg:text-5xl font-bold text-white leading-[0.85] mb-4 tracking-tighter uppercase font-sans">
              Maksimalkan <span className="text-secondary">Penjualan</span> Anda <br />
              Dengan <span className="text-primary">VidHelp</span>
            </h1>
            <p className="text-sm md:text-base text-white/80 mb-8 leading-relaxed max-w-2xl mx-auto font-medium">
              VidHelp membantu UMKM dan perusahaan anda dalam livestream jualan untuk meningkatkan penjualan Anda. Bersama VidHelp, raih kesuksesan bisnis dengan strategi pemasaran yang efektif dan kreatif.
            </p>
            
            <div className="relative mt-12 max-w-4xl mx-auto">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3 space-y-4">
                  <div className="rounded-xl overflow-hidden shadow-2xl aspect-[3/4] w-full">
                    <img src="/live3.jpeg" className="transition-all grayscale hover:grayscale-0 cursor-pointer object-cover w-full h-full scale-[1.35] origin-[50%_40%]" alt="Streamer 1" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <div className="col-span-6 space-y-4">
                  <img src="/live2.jpeg" className="rounded-xl shadow-2xl transition-all grayscale hover:grayscale-0 cursor-pointer object-cover w-full h-[300px]" alt="Main Streamer" referrerPolicy="no-referrer" />
                  <div className="grid grid-cols-2 gap-4">
                    <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400" className="rounded-xl shadow-2xl transition-all grayscale hover:grayscale-0 cursor-pointer" alt="Streamer 2" referrerPolicy="no-referrer" />
                    <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=400" className="rounded-xl shadow-2xl transition-all grayscale hover:grayscale-0 cursor-pointer" alt="Streamer 3" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <div className="col-span-3 space-y-4">
                   <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400" className="rounded-xl shadow-2xl transition-all grayscale hover:grayscale-0 cursor-pointer" alt="Streamer 4" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="absolute inset-0 opacity-20 pointer-events-none grid-pattern"></div>
      </section>

<section id="problem" className="py-16 px-6 bg-black text-center scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl lg:text-3xl font-bold text-white mb-8 tracking-tight uppercase font-sans">
            Kenapa Live Stream Wajib Untuk Brand Anda?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="p-8 border border-primary bg-white shadow-[8px_8px_0px_#ff0054]">
              <h3 className="text-lg font-bold mb-3 uppercase text-black font-sans">I. Interaktif</h3>
              <p className="text-black/60 font-medium text-xs leading-relaxed font-sans">Customer bisa langsung nanya & lihat produk real. Live memberikan pengalaman lebih dari sekadar foto atau video biasa di shopping centre.</p>
            </div>
            <div className="p-8 border border-primary bg-white text-black shadow-[8px_8px_0px_#ff0054]">
              <h3 className="text-lg font-bold mb-3 uppercase font-sans">II. Voucher Masif</h3>
              <p className="text-black/80 font-medium text-xs leading-relaxed font-sans">Shopee & TikTok sering bakar uang via voucher diskon hingga 50% khusus di sesi Live. Jangan lewatkan momentum subsidi platform ini.</p>
            </div>
            <div className="p-8 border border-primary bg-white shadow-[8px_8px_0px_#ff0054]">
              <h3 className="text-lg font-bold mb-3 uppercase text-black font-sans">III. Tren Belanja</h3>
              <p className="text-black/60 font-medium text-xs leading-relaxed font-sans">Bayangkan belanja sambil rebahan tapi bisa minta spill produk. Tren Live Shopping adalah masa depan e-commerce yang meroket.</p>
            </div>
          </div>
        </div>
      </section>

<section id="preview" className="py-24 px-6 bg-black text-white relative z-20 scroll-mt-24 overflow-x-clip">
        <div className="max-w-6xl mx-auto relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl lg:text-5xl font-bold mb-8 leading-[0.85] tracking-tighter uppercase font-sans"><span className="text-primary">LIVESTREAM</span></h2>
            <p className="text-white/60 text-base mb-10 leading-relaxed font-medium border-l-4 border-primary pl-6">
              <span className="text-white font-bold block mb-2">"Live Stream Bukan Sekadar Tren, Melainkan Jembatan Kepercayaan."</span>
              Di era digital, konsumen membutuhkan validasi real-time. VidHelp menghadirkan interaksi manusiawi ke dalam transaksi digital, memanfaatkan subsidi platform secara strategis, dan memaksimalkan potensi bakar uang raksasa teknologi untuk keuntungan brand Anda.
            </p>
            <div className="border border-white/10 rounded-2xl overflow-hidden group">
              <div className="flex border-b border-white/10">
                <button 
                  onMouseEnter={() => setPreviewSlide(0)}
                  onClick={() => setPreviewSlide(0)} 
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${previewSlide === 0 ? 'bg-primary text-black' : 'text-white/60 hover:text-white bg-white/5'}`}
                >
                  OBS
                </button>
                <button 
                  onMouseEnter={() => setPreviewSlide(1)}
                  onClick={() => setPreviewSlide(1)} 
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${previewSlide === 1 ? 'bg-primary text-black' : 'text-white/60 hover:text-white bg-white/5'}`}
                >
                  NON OBS
                </button>
              </div>
              <div className="relative overflow-hidden h-[16rem]">
                 <div 
                   className="absolute inset-0 flex transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                   style={{ transform: `translateX(-${previewSlide * 100}%)` }}
                 >
                   <div className="w-full flex-shrink-0 p-8 h-full flex flex-col justify-center bg-white transition-opacity">
                     <div className="space-y-4 text-sm font-medium text-black">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 bg-primary rounded-full"></div>
                         <p><span className="text-primary font-bold">Device</span> <ArrowRight size={14} className="inline mx-1 text-black/40" /> Camera</p>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 bg-primary rounded-full"></div>
                         <p>Real Green Screen</p>
                       </div>
                       <div className="flex items-start gap-3 mt-4 pt-4 border-t border-black/10">
                         <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                         <div>
                           <p className="text-black/40 uppercase text-[10px] tracking-widest mb-2 font-bold">Include</p>
                           <p className="leading-relaxed">Host, Lightning, Device, Studio, OBS Background, Live Strategy, Report, Multistream Platform, Interactive Live Animation</p>
                         </div>
                       </div>
                     </div>
                   </div>
                   <div className="w-full flex-shrink-0 p-8 h-full flex flex-col justify-center bg-white transition-opacity">
                     <div className="space-y-4 text-sm font-medium text-black">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 bg-primary rounded-full"></div>
                         <p><span className="text-primary font-bold">Device</span> <ArrowRight size={14} className="inline mx-1 text-black/40" /> iPhone</p>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 bg-primary rounded-full"></div>
                         <p>Green Screen TikTok Filter</p>
                       </div>
                       <div className="flex items-start gap-3 mt-4 pt-4 border-t border-black/10">
                         <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                         <div>
                           <p className="text-black/40 uppercase text-[10px] tracking-widest mb-2 font-bold">Include</p>
                           <p className="leading-relaxed">Host, Lightning, Device, Studio, Live Strategy, Report</p>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
          <div className="relative flex justify-center lg:justify-end lg:-translate-x-4">
             <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="relative z-20 w-fit group">
               <img src="/live-example.png" className="w-[18rem] md:w-[20rem] h-auto object-contain shadow-[0_0_120px_rgba(253,0,84,0.2)] hover:scale-105 transition-transform duration-500" alt="VidHelp Live Production Interface" referrerPolicy="no-referrer" />
             </motion.div>
             <div className="absolute inset-0 scale-[1.5] bg-primary/10 blur-[100px] rounded-full -z-10"></div>
          </div>
        </div>
      </section>

<section id="results" className="bg-black text-white pt-20 overflow-hidden scroll-mt-24">
  <div className="max-w-6xl mx-auto px-6 mb-10 text-center">
    <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4 tracking-tighter uppercase font-sans">
      OUR <span className="text-primary">EXPERTISE</span>
    </h2>
  </div>

  <div className="flex w-full h-[20rem] md:h-[25rem] lg:h-[30rem] overflow-hidden font-sans bg-black">
    {[
      { 
        title: "Creative\nIntelligence", 
        desc: "Creative Strategy, Brand Consultancy, dan Corporate Identity. Kami mengubah suara pasar menjadi makna, membangun brand yang memiliki pengikut setia.", 
        img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200" 
      },
      { 
        title: "Live-Commerce\nArchitecture", 
        desc: "80+ Studio Profesional dengan Host yang terlatih secara ahli. Kami mengorkestrasi ekosistem live-shopping dari TikTok, Shopee, dan platform lainnya dengan interaksi yang terukur.", 
        img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200" 
      },
      { 
        title: "Omni-Digital\nStrategy", 
        desc: "Digital Marketing Performance dan Innovative Campaign Strategies. Memastikan brand presence Anda konsisten dan berdampak di setiap touchpoint digital.", 
        img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200" 
      },
      { 
        title: "Brand\nCommunication", 
        desc: "Content Creation and Massive strategic affiliate. Ide-ide berani untuk menghubungkan emosi brand dengan tujuan masyarakat yang bermakna.", 
        img: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1200" 
      }
    ].map((item, index) => (
      <div key={index} className="group relative flex-1 hover:flex-[2] transition-all duration-700 ease-in-out border-r border-white/10 overflow-hidden cursor-pointer">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src={item.img} 
            alt={item.title} 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80 group-hover:via-transparent transition-all duration-500" />
        </div>

        {/* Content Container - Fixed Positioning, No Curve */}
        <div className="absolute top-6 left-5 right-5 lg:top-8 lg:left-8 lg:right-8 flex flex-col items-start z-10">
          {/* Header - Using font-sans for Elegance */}
          <h3 className="text-lg md:text-xl lg:text-3xl font-sans font-bold text-white mb-4 leading-[1] whitespace-pre-line group-hover:text-primary transition-colors duration-500 tracking-tighter">
            {item.title}
          </h3>
          
          {/* Description - Appears on Hover */}
          <div className="overflow-hidden">
            <p className="text-white/80 text-xs md:text-sm leading-relaxed transform translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 delay-100 w-[12rem] sm:w-[14rem] lg:w-[20rem] font-sans font-medium">
              {item.desc}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
</section>

<section id="clients" className="py-24 px-6 bg-white scroll-mt-24">
        <div className="max-w-6xl mx-auto mb-16 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-black mb-4 tracking-tighter uppercase font-sans">
            OUR <span className="text-primary">CLIENTS</span>
          </h2>
          <p className="text-black/60 text-base max-w-xl mx-auto font-medium leading-relaxed uppercase tracking-widest">We help brands thrive in the digital era with a touch of Creativity and Innovation</p>
        </div>
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center items-center gap-8 lg:gap-12">
          {clients.map((client, idx) => (
            <motion.div 
              key={idx} 
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center p-3 transition-transform grayscale hover:grayscale-0 hover:drop-shadow-lg"
            >
              <img src={client.logo} alt={client.name} className={`h-6 md:h-8 lg:h-10 object-contain w-auto mix-blend-multiply ${client.name.toLowerCase() === 'kundal' ? 'scale-75 origin-center' : ['innisfree', 'juva by zap', 'saturdays', 'rollover', 'laboré', 'c&f', 'yves rocher', 'deorex', 'nacific', 'erha ultimate hair care'].includes(client.name.toLowerCase()) ? 'scale-[2] origin-center' : ''}`} />
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-16 flex flex-col items-center">
          <p className="text-black/40 font-black text-[10px] uppercase tracking-[0.5em] text-center">
            TOTAL <AnimatedNumber value={350} suffix="++" /> BRANDS OPTIMIZED • <AnimatedNumber value={70} suffix="+" /> ACTIVE BRANDS
          </p>
        </motion.div>
      </section>

<section id="impact" className="py-20 bg-white overflow-hidden scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6 text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-black mb-12 tracking-tight font-sans">
            Based on data, live shopping contributes at least 80% of the total gmv.
          </motion.h2>
        </div>

        <div className="max-w-6xl mx-auto relative group overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
          <div className="marquee-slower flex py-6">
            <div className="flex gap-4 shrink-0">
               {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4 shrink-0">
                  {[16, 22, 25].map((imgNum) => (
                    <div 
                      key={`${i}-${imgNum}`}
                      className="w-[18rem] md:w-[24rem] aspect-[16/9] rounded-md overflow-hidden shadow-2xl border border-black/5"
                    >
                      <img 
                        src={`/img${imgNum}.png`} 
                        alt="Performance Data" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center mt-12">
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-base md:text-xl font-bold text-black leading-relaxed max-w-2xl mx-auto"
          >
            Vidhelp has helped our partners get a total of millions of followers and an accumulation of <span className="text-secondary">5 million USD++</span> through live streaming optimization, even through the 24 Hours Live Shopping program
          </motion.p>
        </div>
      </section>

<section id="solution" className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="text-primary font-black text-xs uppercase tracking-[0.3em] mb-4 block">VIDHELP</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-black mb-6 tracking-tight uppercase font-sans leading-tight">
              Solusi Untuk Livestream Penjualan Anda
            </h2>
            <p className="text-black/60 text-base mb-8 leading-relaxed font-medium">
              VidHelp adalah agency yang berdedikasi untuk membantu UMKM dan perusahaan dalam mengelola livestream penjualan. Kami menyediakan layanan lengkap mulai dari perencanaan hingga eksekusi livestream yang profesional dan menarik.
            </p>
            <button onClick={() => window.open('https://wa.me/6285121057706?text=Hi%20Admin!%20Mau%20Konsultasi%20Brand%20aku%20dong!', '_blank')} className="bg-primary text-white px-8 py-4 rounded-lg font-black text-base hover:bg-black transition-all flex items-center gap-3 group">
              Konsultasi <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative lg:translate-x-6">
            <div className="relative z-10 bg-white p-3 shadow-2xl rounded-2xl">
              <img src="/tsp.png" alt="TSP" className="w-full rounded-xl" />
              <div 
                className="absolute -bottom-4 -right-4 lg:-bottom-8 lg:-right-8 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 hover:from-white hover:via-white hover:to-white bg-[length:200%_auto] animate-gradient-slow hover:scale-105 p-4 rounded-xl shadow-2xl transition-all duration-300 cursor-pointer group"
                onClick={() => window.open('https://wa.me/6285121057706?text=Hi%20Admin!%20Mau%20Konsultasi%20TSP!', '_blank')}
              >
                <div className="flex items-center justify-center">
                  <p className="text-white group-hover:text-black font-bold text-xs lg:text-base uppercase tracking-tighter transition-colors">FREE CONSULTATION!</p>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-primary/5 blur-[100px] -z-10"></div>
          </motion.div>
        </div>
      </section>


      <section id="industry-honor" className="py-24 px-6 bg-white overflow-hidden text-center scroll-mt-24">
         <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-8 tracking-tighter uppercase font-sans">Our <span className="text-primary">Award</span></h2>
            <p className="text-black/60 text-base font-medium leading-relaxed uppercase tracking-widest mb-10">Dipercaya oleh platform e-commerce terbesar di Asia Tenggara.</p>
            <div className="grid md:grid-cols-3 gap-6">
               <div className="relative group p-6 border border-black bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-rose-900 to-blue-950 bg-[length:200%_auto] opacity-0 group-hover:opacity-100 animate-gradient-fast transition-opacity duration-500"></div>
                  <div className="relative z-10 flex flex-col items-center justify-center h-full">
                     <img src="/tiktokLogo.png" alt="TikTok Partner" className="h-12 mx-auto mb-4 object-contain transition-all" />
                     <h3 className="text-xl font-bold mb-4 uppercase text-black font-sans">TikTok Shop</h3>
                     <p className="text-primary text-sm font-bold group-hover:text-white/80 transition-colors">Top 3 Official Partner</p>
                  </div>
               </div>
               <div className="relative group p-6 border border-black bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-200 to-orange-500 bg-[length:200%_auto] opacity-0 group-hover:opacity-100 animate-gradient-fast transition-opacity duration-500"></div>
                  <div className="relative z-10 flex flex-col items-center justify-center h-full">
                     <img src="/shopee.png" alt="Shopee Partner" className="h-12 mx-auto mb-4 object-contain transition-all" />
                     <h3 className="text-xl font-bold mb-4 uppercase text-black font-sans">Shopee</h3>
                     <p className="text-primary text-sm font-bold group-hover:text-black/80 transition-colors">Top Official Partner</p>
                  </div>
               </div>
               <div className="relative group p-6 border border-black bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-black to-primary bg-[length:200%_auto] opacity-0 group-hover:opacity-100 animate-gradient-fast transition-opacity duration-500"></div>
                  <div className="relative z-10 flex flex-col items-center justify-center h-full">
                     <img src="/trsVH.png" alt="TikTok Shop Partner" className="h-24 lg:h-32 mx-auto mb-4 object-contain transition-all" />
                     <h3 className="text-xl font-bold mb-4 uppercase text-black font-sans">TikTok Shop</h3>
                     <p className="text-primary text-sm font-bold group-hover:text-white/80 transition-colors">The Rising Star TSP</p>
                  </div>
               </div>
            </div>
         </div>
      </section>


<section id="news" className="py-20 bg-black overflow-hidden scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6 text-center mb-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl md:text-3xl font-bold text-white tracking-tighter uppercase font-sans leading-tight border-b-4 border-primary inline-block pb-3"
          >
            NEWS
          </motion.h2>
        </div>

        <div className="relative group overflow-hidden">
          <div className="marquee-slow flex py-4">
            <div className="flex gap-6 shrink-0">
               {[...Array(4)].map((_, groupIdx) => (
                 <React.Fragment key={groupIdx}>
                   {newsData.map((news, i) => (
                     <a href={news.url} target="_blank" rel="noreferrer" key={`${groupIdx}-${i}`} className="w-[16rem] md:w-[20rem] shrink-0 bg-[#0a0a0a] border border-white/10 p-4 flex flex-col hover:bg-white/5 transition-all text-left rounded-lg">
                       <div className="w-full aspect-[16/9] rounded-lg overflow-hidden mb-4">
                         <img src={news.image} alt={news.title} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
                       </div>
                       <h3 className="text-white text-base md:text-lg font-bold uppercase font-sans mb-2 line-clamp-3 leading-snug hover:text-primary transition-colors">{news.title}</h3>
                       <p className="text-white/60 text-xs font-medium leading-relaxed line-clamp-3">{news.desc}</p>
                     </a>
                   ))}
                 </React.Fragment>
               ))}
            </div>
          </div>
        </div>
      </section>



      

      

      

      

      

      

      

      {/* Hasil Nyata Section - Performance Dashboards */}
      

      

      

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
        
        .marquee-slow {
          animation: marquee-slow 120s linear infinite;
          width: fit-content;
        }
        .marquee-slower {
          animation: marquee-slow 240s linear infinite;
          width: fit-content;
        }
        .marquee-slow:hover, .marquee-slower:hover {
          animation-play-state: paused;
        }
        @keyframes marquee-slow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes gradient-fast {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-fast {
          animation: gradient-fast 3s ease infinite;
        }
        @keyframes gradient-slow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-slow {
          animation: gradient-slow 6s ease-in-out infinite;
        }
      `}</style>
      
      {/* Scroll to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0.8, pointerEvents: showScrollTop ? 'auto' : 'none' }}
        transition={{ duration: 0.3 }}
        onClick={scrollToTop}
        className="fixed bottom-8 left-8 z-50 p-3 rounded-full border-2 border-primary bg-white/20 text-primary hover:bg-white/40 hover:text-primary transition-all duration-300 backdrop-blur-md shadow-lg"
        aria-label="Scroll to top"
      >
        <ChevronUp size={32} strokeWidth={2} />
      </motion.button>
    </div>
  );
};

export default LandingPage;