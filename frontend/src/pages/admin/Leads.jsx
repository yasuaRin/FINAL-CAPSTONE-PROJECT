import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, X, Mail, Navigation, Filter, Loader2,
  Zap, Radar, Globe, LocateFixed, Shield, Activity,
  Layers, MapPin, Info, ExternalLink, Check, Edit3, Trash2,
  Star, Phone, Clock, Send, CheckCircle2
} from 'lucide-react';
import { INDONESIAN_PROVINCES, PROVINCE_COORDINATES } from '../../constants';
import { usePartners } from '../../context/PartnerContext';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const INDUSTRIES = ['Fashion', 'F&B', 'Beauty', 'Crafts', 'Electronics'];

// ── Estimate scores from Places data ─────────────────────────────────────────
function estimatePotentialScore(place) {
  let score = 50;
  if (place.rating)          score += Math.min(25, (place.rating - 3) * 12.5);
  if (place.userRatingCount) {
    if (place.userRatingCount > 500)  score += 20;
    else if (place.userRatingCount > 100) score += 12;
    else if (place.userRatingCount > 20)  score += 6;
  }
  if (place.websiteUri)      score += 8;
  if (place.nationalPhoneNumber) score += 5;
  if (place.regularOpeningHours?.openNow) score += 5;
  return Math.min(99, Math.max(30, Math.round(score)));
}

function estimateProductFitScore(place, industry) {
  let score = 55;
  if (['Fashion', 'F&B', 'Beauty'].includes(industry)) score += 15;
  if (place.rating) score += Math.min(20, (place.rating - 3) * 10);
  return Math.min(99, Math.max(30, Math.round(score)));
}

function estimateAuthorityScore(place) {
  let score = 40;
  if (place.rating)          score += Math.min(30, (place.rating - 3) * 15);
  if (place.userRatingCount) {
    if (place.userRatingCount > 1000) score += 25;
    else if (place.userRatingCount > 200) score += 15;
    else if (place.userRatingCount > 50)  score += 8;
  }
  if (place.websiteUri) score += 10;
  return Math.min(99, Math.max(20, Math.round(score)));
}

// ── LeadMarker defined OUTSIDE component to prevent re-render issues ──────────
// This fixes the bug where only HOT markers appear
const createLeadIcon = (lead, isSelected, partnerData) => {
  const isHigh = lead.potentialScore >= 85;
  const isMid  = lead.potentialScore >= 70 && lead.potentialScore < 85;
  const partnered = !!partnerData;

  let color = isHigh ? '#f43f5e' : isMid ? '#f59e0b' : '#64748b';
  if (partnered) {
    if      (partnerData.status === 'Partner') color = '#3b82f6';
    else if (partnerData.status === 'Dealing') color = '#8b5cf6';
    else                                        color = '#94a3b8';
  }

  // Use consistent size for ALL markers, just vary the inner dot and border
  const size      = isHigh ? 48 : isMid ? 38 : 30;
  const innerSize = isHigh ? 14 : isMid ? 10 : 7;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background-color:${isSelected ? '#1a1a1a' : 'white'};
        border:${isHigh ? '4px' : '3px'} solid ${color};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 12px rgba(0,0,0,0.15);
        position:relative;
        box-sizing:border-box;
      ">
        <div style="width:${innerSize}px;height:${innerSize}px;background-color:${color};border-radius:50%;${isHigh ? `box-shadow:0 0 10px ${color}` : ''}"></div>
        ${isHigh ? `<div style="position:absolute;top:-7px;right:-7px;background:#f43f5e;color:white;padding:1px 3px;border-radius:3px;font-size:7px;font-weight:900;border:1.5px solid white;line-height:1.4;">HOT</div>` : ''}
        ${partnered ? `<div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;"></div>` : ''}
      </div>
    `,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

// ── Email template generator ──────────────────────────────────────────────────
function generatePartnershipEmail(business) {
  const subject = `Partnership Opportunity: Live Commerce Collaboration with Vidhelp × ${business.name}`;
  const body = `Dear ${business.name} Team,

I hope this message finds you well.

My name is [Your Name], and I'm reaching out on behalf of Vidhelp — a live commerce platform that helps local businesses grow their reach and sales through engaging live streaming experiences.

We've been following ${business.name}'s presence in the ${business.industry} space and believe there's a strong alignment between our platforms. We'd love to explore a partnership where we can help promote your products to a wider audience through our live commerce network.

What we offer:
• Live streaming promotion of your products/services
• Access to our engaged audience base
• Data-driven insights to maximize your sales
• Dedicated support from our partnership team

We'd love to schedule a brief call to discuss how we can work together. Please let us know your availability.

Looking forward to hearing from you!

Best regards,
[Your Name]
Partnership Team — Vidhelp
[Your Phone/WhatsApp]
vidhelp.com`;

  return { subject, body };
}

function LeadsInner() {
  const [isScanning,      setIsScanning]      = useState(false);
  const [leadsFound,      setLeadsFound]      = useState([]);
  const [selectedLead,    setSelectedLead]    = useState(null);
  const [userPos,         setUserPos]         = useState({ latitude: -6.2088, longitude: 106.8456 });
  const [status,          setStatus]          = useState('SYSTEM READY');
  const [industryFilter,  setIndustryFilter]  = useState('All');
  const [locationFilter,  setLocationFilter]  = useState('');
  const [potentialFilter, setPotentialFilter] = useState('All');
  const [editingId,       setEditingId]       = useState(null);
  const [emailSentIds,    setEmailSentIds]    = useState(new Set());
  const [aiInsights,      setAiInsights]      = useState({});
  const loadingInsightIds = useRef(new Set()); // track which leads are being fetched

  const { partneredBrands, addPartner, updateStatus, removePartner, getPartner, isPartner, partnerCount } = usePartners();

  const scanInitiated = useRef(false);
  const lastScanPos   = useRef(null);
  const PLACES_KEY      = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const GROQ_KEY        = import.meta.env.VITE_GROQ_API_KEY;

  // ── Fetch real businesses from Google Places API ──────────────────────────
  const fetchRealPlaces = useCallback(async (lat, lng, industry) => {
    const includedTypes = (() => {
      if (industry === 'F&B')         return ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'food_store'];
      if (industry === 'Beauty')      return ['beauty_salon', 'spa', 'hair_care'];
      if (industry === 'Fashion')     return ['clothing_store', 'shoe_store'];
      if (industry === 'Electronics') return ['electronics_store'];
      if (industry === 'Crafts')      return ['store', 'gift_shop'];
      return ['store', 'restaurant', 'beauty_salon', 'clothing_store', 'electronics_store'];
    })();

    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.shortFormattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.websiteUri',
          'places.nationalPhoneNumber',
          'places.regularOpeningHours',
          'places.googleMapsUri',
          'places.primaryType',
          'places.editorialSummary',
        ].join(','),
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 5000,
          },
        },
        rankPreference: 'POPULARITY',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Places API ${response.status}: ${err}`);
    }
    const data = await response.json();
    return data.places || [];
  }, [PLACES_KEY]);

  // ── Map Places result → lead object ──────────────────────────────────────
  const mapPlaceToLead = useCallback((place, industry, locationName) => {
    const resolvedIndustry = industry === 'All'
      ? (() => {
          const t = place.primaryType || '';
          if (t.includes('restaurant') || t.includes('cafe') || t.includes('food') || t.includes('bakery')) return 'F&B';
          if (t.includes('beauty') || t.includes('spa') || t.includes('hair')) return 'Beauty';
          if (t.includes('clothing') || t.includes('shoe')) return 'Fashion';
          if (t.includes('electronics')) return 'Electronics';
          return 'Crafts';
        })()
      : industry;

    return {
      id:              `place-${place.id}`,
      name:            place.displayName?.text || 'Unknown Business',
      industry:        resolvedIndustry,
      location:        locationName || 'Indonesia',
      lat:             place.location?.latitude,
      lng:             place.location?.longitude,
      potentialScore:  estimatePotentialScore(place),
      productFitScore: estimateProductFitScore(place, resolvedIndustry),
      authorityScore:  estimateAuthorityScore(place),
      snippet:         place.editorialSummary?.text || `${resolvedIndustry} business with live commerce potential.`,
      phone:           place.nationalPhoneNumber || '',
      rating:          place.rating,
      ratingCount:     place.userRatingCount,
      website:         place.websiteUri || '',
      googleMapsUri:   place.googleMapsUri || '',
      address:         place.formattedAddress || place.shortFormattedAddress || '',
      isOpen:          place.regularOpeningHours?.openNow,
      uri:             place.websiteUri || place.googleMapsUri || '#',
      isReal:          true,
    };
  }, []);

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
    setStatus('SCANNING REAL BUSINESSES');
    lastScanPos.current = { lat: targetPos.latitude, lng: targetPos.longitude };

    try {
      const places   = await fetchRealPlaces(targetPos.latitude, targetPos.longitude, industryFilter);
      const newLeads = places
        .filter(p => p.location?.latitude && p.location?.longitude)
        .map(p => mapPlaceToLead(p, industryFilter, activeLocation));

      if (newLeads.length > 0) {
        setLeadsFound(prev => {
          const existing = new Set(prev.map(l => l.id));
          return [...prev, ...newLeads.filter(l => !existing.has(l.id))];
        });
        setStatus(`${newLeads.length} REAL BUSINESSES FOUND`);
      } else {
        setStatus('NO RESULTS IN THIS AREA');
      }
    } catch (err) {
      console.error('Places API error:', err);
      setStatus('API ERROR — CHECK CONSOLE');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, userPos, locationFilter, industryFilter, fetchRealPlaces, mapPlaceToLead]);

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

  const handleIndustryChange = e => {
    setIndustryFilter(e.target.value);
    setLeadsFound([]);
    lastScanPos.current = null;
  };

  // ── Send partnership email handler ────────────────────────────────────────
  const handleSendEmail = useCallback((lead) => {
    const { subject, body } = generatePartnershipEmail(lead);
    // Open default mail client
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');

    // Mark as emailed
    setEmailSentIds(prev => new Set([...prev, lead.id]));

    // Auto-add to pipeline if not already there
    if (!isPartner(lead.id)) {
      addPartner({
        id:       lead.id,
        name:     lead.name,
        industry: lead.industry,
        location: lead.location,
        emailSent: true,
      }, 'In Progress');
    } else {
      // Mark existing partner as emailed (update notes)
      updateStatus(lead.id, getPartner(lead.id)?.status || 'In Progress');
    }
  }, [isPartner, addPartner, updateStatus, getPartner]);


  // ── Generate AI insight for selected lead via Claude API ──────────────────
  const generateAiInsight = useCallback(async (lead) => {
    if (!lead?.id || aiInsights[lead.id] || loadingInsightIds.current.has(lead.id)) return;
    loadingInsightIds.current.add(lead.id);
    setAiInsights(prev => ({ ...prev })); // trigger re-render to show spinner
    try {
      const prompt = `You are a business analyst for Vidhelp, a live commerce platform that helps local Indonesian businesses grow through live streaming sales.

Analyze this business and write a 2-3 sentence insight (in English) covering:
1. What kind of business this is and what makes it notable
2. Why it scored ${lead.potentialScore >= 85 ? 'HOT (P-1)' : lead.potentialScore >= 70 ? 'Growth (P-2)' : 'Standard (P-3)'} — ${lead.potentialScore}% live commerce potential
3. How Vidhelp's live commerce platform specifically fits this business

Business data:
- Name: ${lead.name}
- Industry: ${lead.industry}
- Location: ${lead.address || lead.location}
- Google Rating: ${lead.rating ? `${lead.rating}/5 (${lead.ratingCount?.toLocaleString()} reviews)` : 'N/A'}
- Has Website: ${lead.website ? 'Yes' : 'No'}
- Currently Open: ${lead.isOpen === true ? 'Yes' : lead.isOpen === false ? 'No' : 'Unknown'}
- Google description: ${lead.snippet || 'None'}

Be specific, concise, and business-focused. No bullet points. Plain paragraph only.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      if (text) {
        setAiInsights(prev => ({ ...prev, [lead.id]: text.trim() }));
      }
    } catch (err) {
      console.error('AI insight error:', err);
      setAiInsights(prev => ({ ...prev, [lead.id]: 'Could not generate insight: ' + (err?.message || 'Unknown error') }));
    } finally {
      loadingInsightIds.current.delete(lead.id);
      setAiInsights(prev => ({ ...prev })); // trigger re-render
    }
  }, [aiInsights, GROQ_KEY]);

  // Auto-generate insight when a lead is selected — debounced 600ms to avoid rate limit
  useEffect(() => {
    if (!selectedLead || aiInsights[selectedLead.id]) return;
    const timer = setTimeout(() => {
      generateAiInsight(selectedLead);
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedLead?.id]);

  // ── Map sub-components ────────────────────────────────────────────────────
  const LeadMarkerComponent = ({ lead }) => {
    const partnerData = getPartner(lead.id);
    const isSelected  = selectedLead?.id === lead.id;
    const icon        = createLeadIcon(lead, isSelected, partnerData);

    return (
      <Marker
        position={[lead.lat, lead.lng]}
        icon={icon}
        eventHandlers={{ click: () => setSelectedLead(lead) }}
      >
        <Popup>
          <div className="p-1">
            <p className="font-bold text-sm">{lead.name}</p>
            <p className="text-[10px] uppercase font-bold">{lead.industry} • {lead.potentialScore}%</p>
            {lead.rating && <p className="text-[10px] text-amber-500">★ {lead.rating} ({lead.ratingCount?.toLocaleString()})</p>}
          </div>
        </Popup>
      </Marker>
    );
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

  const actionBtn = (bg, color) => ({
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    background: bg, cursor: 'pointer', color,
    transition: 'all 0.15s', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  });

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
                isScanning ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' :
                leadsFound.length > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                'bg-slate-500'
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
            <select
              value={industryFilter}
              onChange={handleIndustryChange}
              className="bg-transparent text-xs font-semibold uppercase outline-none cursor-pointer hover:text-primary transition-colors appearance-none"
            >
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
            onClick={() => {
              setLeadsFound([]);
              lastScanPos.current = null;
              handleAIScan(undefined, locationFilter);
            }}
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
          zoom={14}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={[userPos.latitude, userPos.longitude]} zoom={14} />
          <MapEvents />
          {/* Render ALL filtered leads — bug was LeadMarker defined inside component causing remount */}
          {filteredLeads.map(lead => (
            <LeadMarkerComponent key={lead.id} lead={lead} />
          ))}
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
                  Scanning Real{industryFilter !== 'All' ? ` ${industryFilter}` : ''} Businesses...
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

                {/* Verified badge */}
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    Verified Real Business — Google Places
                  </span>
                </div>

                {/* Rating row */}
                {selectedLead.rating && (
                  <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-lg">
                    <Star size={16} className="text-amber-500 fill-amber-500" />
                    <span className="font-bold text-amber-600">{selectedLead.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({selectedLead.ratingCount?.toLocaleString()} reviews)</span>
                    {selectedLead.isOpen !== undefined && (
                      <span className={`ml-auto text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        selectedLead.isOpen
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {selectedLead.isOpen ? 'Open Now' : 'Closed'}
                      </span>
                    )}
                  </div>
                )}

                {/* Score cards */}
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

                {/* AI Business Insight */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Zap size={14} className="text-primary" /> AI Business Insight
                  </p>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-sm leading-relaxed min-h-[72px] flex items-center">
                    {loadingInsightIds.current.has(selectedLead.id) && !aiInsights[selectedLead.id] ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs italic">Generating insight...</span>
                      </div>
                    ) : aiInsights[selectedLead.id] ? (
                      <p className="text-foreground/80">{aiInsights[selectedLead.id]}</p>
                    ) : (
                      <p className="italic text-muted-foreground text-xs">No insight available</p>
                    )}
                  </div>
                </div>


                {/* Contact info */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Info size={14} /> Contact & Location
                  </p>
                  <div className="space-y-2">
                    {selectedLead.address && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span className="font-medium">{selectedLead.address}</span>
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone size={14} className="text-primary shrink-0" />
                        <span className="font-medium">{selectedLead.phone}</span>
                      </div>
                    )}
                    {selectedLead.website && (
                      <div className="flex items-center gap-2 text-xs">
                        <Globe size={14} className="text-primary shrink-0" />
                        <a
                          href={selectedLead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline truncate max-w-[280px]"
                        >
                          {selectedLead.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Navigation size={14} className="shrink-0" />
                      <span className="font-medium">{selectedLead.lat?.toFixed(4)}, {selectedLead.lng?.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* CTA buttons */}
                <div className="pt-2 space-y-3">
                  {selectedLead.googleMapsUri && (
                    <a
                      href={selectedLead.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-primary text-primary-foreground rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <MapPin size={18} /> OPEN IN GOOGLE MAPS
                    </a>
                  )}

                  {selectedLead.website && (
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-primary text-primary-foreground rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Globe size={18} /> VISIT WEBSITE
                    </a>
                  )}

                  {/* ── PARTNERSHIP EMAIL BUTTON ── */}
                  {emailSentIds.has(selectedLead.id) ? (
                    <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} /> PARTNERSHIP EMAIL SENT
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendEmail(selectedLead)}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Mail size={18} /> SEND PARTNERSHIP EMAIL
                    </button>
                  )}

                  {isPartner(selectedLead.id) && (
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
                isScanning ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
              }`} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {filteredLeads.length} Real Businesses
              </span>
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
                {['Business Name', 'Sector', 'Location', 'Date', 'Email', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partneredBrands.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                      <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center">
                        <Target size={40} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-black uppercase tracking-[0.4em]">No Active Partners Yet</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Scan the area and send partnership emails to get started</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                partneredBrands.map(brand => (
                  <tr key={brand.id} className="hover:bg-muted/20 transition-all border-l-4 border-l-transparent hover:border-l-primary">
                    <td className="px-6 py-6">
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
                    <td className="px-6 py-6">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-muted/50 border border-border px-3 py-1 rounded">
                        {brand.industry}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        <MapPin size={12} className="text-primary" />{brand.location}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                        {new Date(brand.datePartnered).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    {/* Email sent column */}
                    <td className="px-6 py-6">
                      {emailSentIds.has(brand.id) ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Sent</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            // Find the lead data or create a minimal object
                            const lead = leadsFound.find(l => l.id === brand.id) || brand;
                            handleSendEmail(lead);
                          }}
                          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-violet-600 hover:text-violet-700 transition-colors"
                        >
                          <Mail size={12} /> Send Email
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      {editingId === brand.id ? (
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
                      ) : (
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-md border inline-block
                          ${brand.status === 'Partner' ? 'bg-blue-500 text-white border-blue-600' :
                            brand.status === 'Dealing' ? 'bg-purple-500 text-white border-purple-600' :
                            'bg-slate-500 text-white border-slate-600'}`}
                        >
                          {brand.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      <div className="inline-flex gap-2">
                        {editingId === brand.id ? (
                          <button
                            onClick={() => setEditingId(null)}
                            style={actionBtn('rgba(34,197,94,0.1)', '#22c55e')}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingId(brand.id)}
                            style={actionBtn('rgba(99,102,241,0.08)', '#6366f1')}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                            title="Edit Status"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            removePartner(brand.id);
                            if (editingId === brand.id) setEditingId(null);
                            // Also remove from emailSentIds
                            setEmailSentIds(prev => {
                              const next = new Set(prev);
                              next.delete(brand.id);
                              return next;
                            });
                          }}
                          style={actionBtn('rgba(219,26,26,0.08)', '#DB1A1A')}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(219,26,26,0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(219,26,26,0.08)'}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Powered by Google Places</span>
          </div>
        </div>
      </div>

      <style>{`
        .leaflet-container { background: #f0f2f5 !important; }
        .custom-marker { background: transparent !important; border: none !important; }
        .custom-marker:hover > div { transform: scale(1.15) !important; transition: transform 0.2s ease !important; }
      `}</style>
    </div>
  );
}

export default function Leads() {
  return <LeadsInner />;
}
