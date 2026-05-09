import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, X, Mail, Navigation, Filter, Loader2,
  Zap, Radar, Globe, LocateFixed, Shield, Activity,
  Layers, MapPin, Info, ExternalLink
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { INDONESIAN_PROVINCES, PROVINCE_COORDINATES } from '../../constants';
import { usePartners } from '../../context/PartnerContext';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const INDUSTRIES = ['Fashion', 'F&B', 'Beauty', 'Crafts', 'Electronics'];

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

function LeadsInner() {
  const [isScanning,      setIsScanning]      = useState(false);
  const [leadsFound,      setLeadsFound]      = useState([]);
  const [selectedLead,    setSelectedLead]    = useState(null);
  const [userPos,         setUserPos]         = useState({ latitude: -6.2088, longitude: 106.8456 });
  const [status,          setStatus]          = useState('SYSTEM READY');
  const [industryFilter,  setIndustryFilter]  = useState('All');
  const [locationFilter,  setLocationFilter]  = useState('');
  const [potentialFilter, setPotentialFilter] = useState('All');

  const { partneredBrands, addPartner, updateStatus, getPartner, isPartner, partnerCount } = usePartners();

  const scanInitiated = useRef(false);
  const lastScanPos   = useRef(null);

  const LeadMarker = ({ lead }) => {
    const isHigh      = lead.potentialScore >= 85;
    const isMid       = lead.potentialScore >= 70 && lead.potentialScore < 85;
    const isSelected  = selectedLead?.id === lead.id;
    const partnerData = getPartner(lead.id);
    const partnered   = !!partnerData;

    let color = isHigh ? '#f43f5e' : isMid ? '#f59e0b' : '#64748b';
    if (partnered) {
      if      (partnerData.status === 'Partner') color = '#3b82f6';
      else if (partnerData.status === 'Dealing') color = '#8b5cf6';
      else                                        color = '#94a3b8';
    }

    const size      = isHigh ? 56 : isMid ? 42 : 32;
    const innerSize = isHigh ? 14 : isMid ? 10 : 8;

    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width:${size}px;height:${size}px;
          background-color:${isSelected ? '#1a1a1a' : 'white'};
          border:${isHigh ? '4px' : '3px'} solid ${color};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 10px 15px -3px rgb(0 0 0/0.1);
          transform:${isSelected ? 'scale(1.1)' : 'scale(1)'};
          transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
          position:relative;
        ">
          <div style="width:${innerSize}px;height:${innerSize}px;background-color:${color};border-radius:50%;${isHigh ? 'box-shadow:0 0 12px '+color : ''}"></div>
          ${isHigh ? `<div style="position:absolute;top:-6px;right:-6px;background:#f43f5e;color:white;padding:2px;border-radius:4px;font-size:8px;font-weight:900;border:2px solid white;">HOT</div>` : ''}
          ${partnered ? `<div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;background:${color};border:2px solid white;border-radius:50%;"></div>` : ''}
        </div>
      `,
      iconSize:   [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    return (
      <Marker
        position={[lead.lat, lead.lng]}
        icon={customIcon}
        eventHandlers={{ click: () => setSelectedLead(lead) }}
      >
        <Popup>
          <div className="p-1">
            <p className="font-bold text-sm">{lead.name}</p>
            <p className="text-[10px] uppercase font-bold">{lead.industry} • {lead.potentialScore}%</p>
          </div>
        </Popup>
      </Marker>
    );
  };

  const handleAIScan = useCallback(async (latLng, locationName) => {
    if (isScanning) return;

    const targetPos = latLng || userPos;

    if (lastScanPos.current) {
      const dist = Math.sqrt(
        Math.pow(targetPos.latitude  - lastScanPos.current.lat, 2) +
        Math.pow(targetPos.longitude - lastScanPos.current.lng, 2)
      );
      if (dist < 0.02) return;
    }

    const activeLocation = locationName || locationFilter || 'Indonesia';
    setIsScanning(true);
    setStatus('ESTABLISHING UPLINK');
    lastScanPos.current = { lat: targetPos.latitude, lng: targetPos.longitude };

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const prompt = `Act as a business intelligence scout helping a live-streaming commerce agency find potential seller partners in Indonesia.

Generate 10-15 realistic business leads in ${activeLocation} (near coordinates ${targetPos.latitude}, ${targetPos.longitude}) that sell physical products and could benefit from live streaming commerce.

Include any type of business such as:
- Local brands & startups
- UMKM / small businesses
- Established companies & distributors
- Manufacturers & producers
- Retailers & resellers

For each lead, provide:
- name: Realistic Indonesian business name
- industry: One of [Fashion, F&B, Beauty, Crafts, Electronics]
- potentialScore: 0-100 (how suitable for live commerce selling)
- productFitScore: 0-100 (how well their products sell via live host)
- authorityScore: 0-100 (market reputation)
- snippet: Brief insight about their product/business in English (max 150 chars)
- lat: Latitude near ${targetPos.latitude}
- lng: Longitude near ${targetPos.longitude}
- email: Realistic Indonesian contact email
- phone: Indonesian phone number starting with +62

Return as a JSON array of objects.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const rawText  = response.text || '[]';
      const parsed   = JSON.parse(rawText);
      const newLeads = parsed.map((lead, index) => ({
        id: `lead-${index}-${Date.now()}-${Math.random()}`,
        ...lead,
        location: activeLocation,
        uri: '#',
      }));

      if (newLeads.length > 0) {
        setLeadsFound(prev => {
          const existing = new Set(prev.map(l => l.name));
          return [...prev, ...newLeads.filter(l => !existing.has(l.name))];
        });
        setStatus('NODES DETECTED');
      } else {
        throw new Error('empty');
      }
    } catch {
      setStatus('SIMULATING NODES');
      const FALLBACK_NAMES = [
        'Konveksi Maju Jaya', 'Dapur Bu Siti', 'Batik Asri', 'Kosmetik Cantik',
        'Kerajinan Rotan Indah', 'Seblak Meriah', 'Produsen Tempe Murni',
        'Konveksi Berkah', 'Kue Lebaran Homemade', 'Sablon Kaos Express',
        'Oleh-oleh Nusantara', 'Tahu Pak Budi', 'Anyaman Bambu Sejati',
        'Jamu Tradisional', 'Distro Lokal Keren', 'Catering Bu Ani',
        'Sambal Rumahan', 'Rajut & Bordir', 'Sepatu Lokal Handmade',
        'Baju Muslim Amanah', 'Keripik Singkong Renyah', 'Batik Tulis',
        'Frozen Food Homemade', 'Aksesori Handmade', 'Percetakan Sablon',
        'Snack Kiloan', 'Konveksi Seragam', 'Skincare Herbal',
        'Elektronik Terpercaya', 'Katering Ibu Rumahan',
        'Kerupuk Udang Asli', 'Kopi Lokal Nusantara', 'Tas Kulit Handmade',
        'Minyak Kelapa Murni', 'Baju Anak Lucu', 'Laundry Kiloan',
        'Kecap Manis Homemade', 'Rajutan Benang Wol', 'Herbal & Rempah',
        'Sembako Pak Haji',
      ];
      const fallback = Array.from({ length: 40 }).map((_, i) => {
        const lat             = targetPos.latitude  + (Math.random() - 0.5) * 0.4;
        const lng             = targetPos.longitude + (Math.random() - 0.5) * 0.4;
        const industry        = INDUSTRIES[i % INDUSTRIES.length];
        let   productFitScore = 45 + Math.floor(Math.random() * 35);
        if (['Fashion', 'F&B', 'Beauty'].includes(industry)) productFitScore += 15;
        const authorityScore  = 40 + Math.floor(Math.random() * 55);
        const potentialScore  = Math.min(99, Math.floor(productFitScore * 0.6 + authorityScore * 0.4));
        const name            = FALLBACK_NAMES[i] || `Local Business ${activeLocation} ${i + 1}`;
        const cleanName       = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return {
          id: `fallback-${i}-${Date.now()}-${Math.random()}`,
          name, industry, location: activeLocation, uri: '#',
          lat, lng, potentialScore, productFitScore, authorityScore,
          snippet: `Local business in ${activeLocation} with high live commerce potential. Products ready to sell online.`,
          email:   `info@${cleanName}.id`,
          phone:   `+62 812 ${Math.floor(1000000 + Math.random() * 9000000)}`,
        };
      });
      setLeadsFound(prev => [...prev, ...fallback]);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, userPos, locationFilter]);

  useEffect(() => {
    if (scanInitiated.current) return;
    scanInitiated.current = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserPos(coords);
          handleAIScan(coords);
        },
        () => handleAIScan(),
        { timeout: 5000 }
      );
    } else {
      handleAIScan();
    }
  }, []);

  const filteredLeads = useMemo(() => leadsFound.filter(lead => {
    const matchesIndustry  = industryFilter  === 'All' || lead.industry === industryFilter;
    const matchesLocation  = !locationFilter || lead.location === locationFilter;
    const matchesPotential =
      potentialFilter === 'All' ||
      (potentialFilter === 'High' && lead.potentialScore >= 85) ||
      (potentialFilter === 'Mid'  && lead.potentialScore >= 70 && lead.potentialScore < 85) ||
      (potentialFilter === 'Low'  && lead.potentialScore < 70);
    return matchesIndustry && matchesLocation && matchesPotential;
  }), [leadsFound, industryFilter, locationFilter, potentialFilter]);

  const handleLocationChange = e => {
    const province = e.target.value;
    setLocationFilter(province);
    if (province && PROVINCE_COORDINATES[province]) {
      const coords = { latitude: PROVINCE_COORDINATES[province].lat, longitude: PROVINCE_COORDINATES[province].lng };
      setUserPos(coords);
      setLeadsFound([]);
      lastScanPos.current = null;
      handleAIScan(coords, province);
    }
  };

  const MapEvents = () => {
    useMapEvents({
      moveend: e => {
        const center = e.target.getCenter();
        const coords = { latitude: center.lat, longitude: center.lng };
        setUserPos(coords);
        handleAIScan(coords);
      },
    });
    return null;
  };

  return (
    <div className="flex flex-col gap-8 pb-10">

      {/* Header HUD */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 primary-gradient rounded-xl flex items-center justify-center text-white shadow-lg relative">
            <Radar size={28} className={isScanning ? 'animate-spin' : ''} />
            {isScanning && <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leads Radar</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                status === 'UPLINK OFFLINE' ? 'bg-slate-500' :
                isScanning ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' :
                'bg-emerald-500 shadow-[0_0_8px_#10b981]'
              }`} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{status}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-muted/50 border border-border px-4 py-2 rounded-md flex-1 lg:flex-none">
            <MapPin size={14} className="text-muted-foreground" />
            <select
              value={locationFilter}
              onChange={handleLocationChange}
              className="bg-transparent text-xs font-semibold outline-none w-32 lg:w-40 cursor-pointer hover:text-primary transition-colors appearance-none"
            >
              <option value="">All Provinces</option>
              {INDONESIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 border border-border px-4 py-2 rounded-md">
            <Filter size={14} className="text-muted-foreground" />
            <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold uppercase outline-none cursor-pointer hover:text-primary transition-colors appearance-none">
              <option value="All">All Sectors</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <span className="text-border">|</span>
            <select value={potentialFilter} onChange={e => setPotentialFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold uppercase outline-none cursor-pointer hover:text-primary transition-colors appearance-none">
              <option value="All">All Potential</option>
              <option value="High">Elite Tier (Red)</option>
              <option value="Mid">Growth Tier (Yellow)</option>
              <option value="Low">Low Potential (Gray)</option>
            </select>
          </div>
          <button
            onClick={() => handleAIScan(undefined, locationFilter)}
            disabled={isScanning}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 py-2 gap-2 bg-primary text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isScanning ? <Loader2 className="animate-spin" size={16} /> : <LocateFixed size={16} />} Rescan Grid
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="h-[600px] relative dashboard-card overflow-hidden bg-muted/30 border border-border shrink-0">
        <MapContainer
          center={[userPos.latitude, userPos.longitude]}
          zoom={12}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={[userPos.latitude, userPos.longitude]} zoom={12} />
          <MapEvents />
          {filteredLeads.map(lead => <LeadMarker key={lead.id} lead={lead} />)}
        </MapContainer>

        {/* Scanning overlay */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-background/20 backdrop-blur-[1px]"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border text-[10px] font-bold uppercase tracking-widest shadow-sm">
                  Scanning Local Businesses...
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedLead && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="absolute inset-y-4 right-4 w-full lg:w-[400px] bg-background border border-border rounded-xl z-40 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                    ${selectedLead.potentialScore >= 85 ? 'bg-rose-500 text-white' :
                      selectedLead.potentialScore >= 70 ? 'bg-amber-500 text-white' :
                      'bg-slate-500 text-white'}`}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold tracking-tight">{selectedLead.name}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {selectedLead.industry} • {selectedLead.location}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-muted rounded-md text-muted-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Live Commerce Fit</p>
                    <p className="text-2xl font-bold">{selectedLead.potentialScore}%</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Priority Rank</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedLead.potentialScore >= 85 ? 'P-1 🔥' : selectedLead.potentialScore >= 70 ? 'P-2' : 'P-3'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Product Fit</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${selectedLead.productFitScore}%` }} />
                      </div>
                      <span className="text-[10px] font-mono">{selectedLead.productFitScore}%</span>
                    </div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/50">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Local Reputation</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${selectedLead.authorityScore}%` }} />
                      </div>
                      <span className="text-[10px] font-mono">{selectedLead.authorityScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Zap size={14} className="text-primary" /> AI Strategic Insight
                  </p>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 italic text-sm leading-relaxed">
                    "{selectedLead.snippet}"
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Info size={14} /> Sector Analysis
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border text-sm text-muted-foreground leading-relaxed">
                    The <strong>{selectedLead.industry}</strong> sector in <strong>{selectedLead.location}</strong> presents
                    strong live commerce potential. <strong>{selectedLead.name}</strong> is identified as a high-fit
                    candidate for seller partnership.
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { icon: <Globe size={14} />,                             text: selectedLead.location },
                    { icon: <Navigation size={14} />,                        text: 'Location Verified' },
                    { icon: <Mail size={14} className="text-primary" />,     text: selectedLead.email },
                    { icon: <Activity size={14} className="text-primary" />, text: selectedLead.phone },
                    { icon: <MapPin size={14} />,                            text: `${selectedLead.lat.toFixed(4)}, ${selectedLead.lng.toFixed(4)}` },
                  ].map(({ icon, text }, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {icon}<span className="font-medium">{text}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-4">
                  {isPartner(selectedLead.id) ? (
                    <div className="space-y-3">
                      <div className="bg-muted/50 p-3 rounded-lg border border-border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Partnership Status</p>
                        <div className="flex items-center justify-between gap-2">
                          {['In Progress', 'Dealing', 'Partner'].map(s => {
                            const cur      = getPartner(selectedLead.id)?.status;
                            const isActive = cur === s;
                            return (
                              <button key={s} onClick={() => updateStatus(selectedLead.id, s)}
                                className={`flex-1 py-1.5 rounded text-[9px] font-bold transition-all ${
                                  isActive
                                    ? s === 'Partner' ? 'bg-blue-500 text-white' : s === 'Dealing' ? 'bg-purple-500 text-white' : 'bg-slate-500 text-white'
                                    : 'bg-background text-muted-foreground hover:bg-muted'
                                }`}
                              >{s.toUpperCase()}</button>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`mailto:${selectedLead.email}?subject=Follow Up: Live Commerce Partnership&body=Dear ${selectedLead.name} Team,%0D%0A%0D%0AWe would like to follow up on our previous discussion regarding the live commerce partnership...`)}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <Mail size={18} /> SEND FOLLOW UP
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        addPartner({ id: selectedLead.id, name: selectedLead.name, industry: selectedLead.industry, location: selectedLead.location }, 'In Progress');
                        window.open(`mailto:${selectedLead.email}?subject=Live Commerce Partnership Proposal&body=Dear ${selectedLead.name} Team,%0D%0A%0D%0AWe are VidHelp, a leading live commerce platform in Indonesia.%0D%0A%0D%0AWe have identified ${selectedLead.name} as a strong potential seller partner for our platform...`);
                      }}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Mail size={18} /> SEND PARTNERSHIP MESSAGE
                    </button>
                  )}
                  {selectedLead.uri !== '#' && (
                    <a href={selectedLead.uri} target="_blank" rel="noopener noreferrer"
                      className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink size={14} /> View Source
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coordinates overlay */}
        <div className="absolute bottom-6 left-6 z-30 hidden md:flex">
          <div className="bg-background/80 backdrop-blur-md border border-border p-4 rounded-xl shadow-lg flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Longitude</span>
              <span className="text-sm font-mono font-bold">{userPos.longitude.toFixed(6)}°E</span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Latitude</span>
              <span className="text-sm font-mono font-bold">{userPos.latitude.toFixed(6)}°N</span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                status === 'UPLINK OFFLINE' ? 'bg-slate-500' :
                isScanning ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' :
                'bg-emerald-500 shadow-[0_0_8px_#10b981]'
              }`} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Signal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Partnership Table */}
      <div className="dashboard-card bg-background border border-border overflow-hidden flex flex-col shadow-sm">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between bg-muted/10 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 primary-gradient rounded-xl flex items-center justify-center text-white shadow-md">
              <Layers size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight uppercase">Partnership Status</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Strategic Pipeline & Partner Registry</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 bg-background/50 px-6 py-3 rounded-full border border-border">
            {[
              { color: 'bg-slate-400',  label: 'In Progress' },
              { color: 'bg-purple-500', label: 'Dealing' },
              { color: 'bg-blue-500',   label: 'Partner' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {['Business Name', 'Sector', 'Location', 'Date', 'Status'].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partneredBrands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                      <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center">
                        <Target size={40} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-black uppercase tracking-[0.4em]">No Active Partners Yet</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Scan the area to discover local businesses</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                partneredBrands.map(brand => (
                  <tr key={brand.id} className="hover:bg-muted/20 transition-all border-l-4 border-l-transparent hover:border-l-primary">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center font-black text-sm shadow-sm rounded">
                          {brand.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-sm tracking-tight block">{brand.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground/60 uppercase">ID: {brand.id.split('-').pop()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-muted/50 border border-border px-3 py-1 rounded">
                        {brand.industry}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        <MapPin size={12} className="text-primary" />{brand.location}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                        {new Date(brand.datePartnered).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <select
                        value={brand.status}
                        onChange={e => updateStatus(brand.id, e.target.value)}
                        className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-md border outline-none cursor-pointer transition-all shadow-sm
                          ${brand.status === 'Partner' ? 'bg-blue-500 text-white border-blue-600' :
                            brand.status === 'Dealing' ? 'bg-purple-500 text-white border-purple-600' :
                            'bg-slate-500 text-white border-slate-600'}`}
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Dealing">Dealing</option>
                        <option value="Partner">Partner</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-muted/5 border-t border-border flex justify-between items-center">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Total Active Partners: {partnerCount}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Real-time Sync Active</span>
          </div>
        </div>
      </div>

      <style>{`
        .leaflet-container { background: #f0f2f5 !important; }
        .custom-marker:hover div { transform: scale(1.1); }
      `}</style>
    </div>
  );
}

export default function Leads() {
  return <LeadsInner />;
}