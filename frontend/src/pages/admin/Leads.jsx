import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, X, Mail, Navigation, Filter, Loader2, Zap, Radar, Globe, LocateFixed, Shield, Activity, Layers, MapPin, Info, ExternalLink, Check, Edit3, Trash2, Star, Phone, Clock, Send, CheckCircle2 } from "lucide-react";
import { INDONESIAN_PROVINCES, PROVINCE_COORDINATES } from "../../constants";
import { usePartners } from "../../contexts/PartnerContext";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const INDUSTRIES = ["Fashion", "F&B", "Beauty", "Crafts", "Electronics", "Health", "Home & Living", "Grocery", "Sports", "Toys & Kids"];

function estimatePotentialScore(place) {
  let score = 50;
  if (place.rating) score += Math.min(25, (place.rating - 3) * 12.5);
  if (place.userRatingCount) {
    if (place.userRatingCount > 500) score += 20;
    else if (place.userRatingCount > 100) score += 12;
    else if (place.userRatingCount > 20) score += 6;
  }
  if (place.websiteUri) score += 8;
  if (place.nationalPhoneNumber) score += 5;
  if (place.regularOpeningHours?.openNow) score += 5;
  return Math.min(99, Math.max(30, Math.round(score)));
}

function estimateProductFitScore(place, industry) {
  let score = 55;
  if (["Fashion", "F&B", "Beauty"].includes(industry)) score += 15;
  if (place.rating) score += Math.min(20, (place.rating - 3) * 10);
  return Math.min(99, Math.max(30, Math.round(score)));
}

function estimateAuthorityScore(place) {
  let score = 40;
  if (place.rating) score += Math.min(30, (place.rating - 3) * 15);
  if (place.userRatingCount) {
    if (place.userRatingCount > 1000) score += 25;
    else if (place.userRatingCount > 200) score += 15;
    else if (place.userRatingCount > 50) score += 8;
  }
  if (place.websiteUri) score += 10;
  return Math.min(99, Math.max(20, Math.round(score)));
}

const createLeadIcon = (lead, isSelected, partnerData) => {
  const isHigh = lead.potentialScore >= 85;
  const isMid = lead.potentialScore >= 70 && lead.potentialScore < 85;
  const partnered = !!partnerData;

  let color = isHigh ? "#3b82f6" : isMid ? "#f59e0b" : "#64748b";
  if (partnered) {
    if (partnerData.status === "Partner") color = "#2563eb";
    else if (partnerData.status === "Dealing") color = "#8b5cf6";
    else color = "#94a3b8";
  }

  const size = isHigh ? 48 : isMid ? 38 : 30;
  const innerSize = isHigh ? 14 : isMid ? 10 : 7;

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background-color:${isSelected ? "#1a1a1a" : "white"};
        border:${isHigh ? "4px" : "3px"} solid ${color};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 12px rgba(0,0,0,0.15);
        position:relative;
        box-sizing:border-box;
      ">
        <div style="width:${innerSize}px;height:${innerSize}px;background-color:${color};border-radius:50%;${isHigh ? `box-shadow:0 0 10px ${color}` : ""}"></div>
        ${isHigh ? `<div style="position:absolute;top:-7px;right:-7px;background:#3b82f6;color:white;padding:1px 3px;border-radius:3px;font-size:7px;font-weight:900;border:1.5px solid white;line-height:1.4;">HOT</div>` : ""}
        ${partnered ? `<div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;"></div>` : ""}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function LeadsInner() {
  const [isScanning, setIsScanning] = useState(false);
  const [leadsFound, setLeadsFound] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [userPos, setUserPos] = useState({ latitude: -6.2088, longitude: 106.8456 });
  const [status, setStatus] = useState("SYSTEM READY");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [potentialFilter, setPotentialFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.2088, 106.8456]);
  const [contactModal, setContactModal] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [waOpened, setWaOpened] = useState(false);
  const [websiteVisited, setWebsiteVisited] = useState(false);
  const [aiInsights, setAiInsights] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All");

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadingInsightIds = useRef(new Set());
  const mapSectionRef = useRef(null);

  const { partneredBrands, addPartner, updateStatus, updateOutreachMethod, removePartner, getPartner, isPartner, partnerCount } = usePartners();

  const scanInitiated = useRef(false);
  const lastScanPos = useRef(null);
  const PLACES_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

  const filteredBrands = statusFilter === "All" ? partneredBrands : partneredBrands.filter((b) => b.status === statusFilter);
  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / pageSize));
  const paginatedBrands = filteredBrands.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const fetchRealPlaces = useCallback(
    async (lat, lng, industry) => {
      const includedTypes = (() => {
        if (industry === "F&B") return ["restaurant", "cafe", "bakery", "meal_takeaway", "food_store"];
        if (industry === "Beauty") return ["beauty_salon", "spa", "hair_care"];
        if (industry === "Fashion") return ["clothing_store", "shoe_store"];
        if (industry === "Electronics") return ["electronics_store"];
        if (industry === "Crafts") return ["gift_shop", "art_gallery"];
        if (industry === "Health") return ["pharmacy", "drugstore", "hospital", "health"];
        if (industry === "Home & Living") return ["furniture_store", "home_goods_store", "florist"];
        if (industry === "Grocery") return ["supermarket", "grocery_store", "convenience_store"];
        if (industry === "Sports") return ["sporting_goods_store", "gym", "fitness_center"];
        if (industry === "Toys & Kids") return ["toy_store", "children_clothing_store"];
        return ["store", "restaurant", "beauty_salon", "clothing_store", "electronics_store", "pharmacy", "supermarket", "sporting_goods_store"];
      })();

      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": PLACES_KEY,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.shortFormattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.websiteUri",
            "places.nationalPhoneNumber",
            "places.regularOpeningHours",
            "places.googleMapsUri",
            "places.primaryType",
            "places.editorialSummary",
          ].join(","),
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
          rankPreference: "POPULARITY",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Places API ${response.status}: ${err}`);
      }
      const data = await response.json();
      return data.places || [];
    },
    [PLACES_KEY],
  );

  const fetchPlaceById = useCallback(
    async (placeId) => {
      const rawId = placeId.startsWith("place-") ? placeId.slice(6) : placeId;
      const response = await fetch(`https://places.googleapis.com/v1/places/${rawId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": PLACES_KEY,
          "X-Goog-FieldMask": [
            "id",
            "displayName",
            "formattedAddress",
            "shortFormattedAddress",
            "location",
            "rating",
            "userRatingCount",
            "websiteUri",
            "nationalPhoneNumber",
            "regularOpeningHours",
            "googleMapsUri",
            "primaryType",
            "editorialSummary",
          ].join(","),
        },
      });
      if (!response.ok) throw new Error(`Place detail API ${response.status}`);
      return await response.json();
    },
    [PLACES_KEY],
  );

  const mapPlaceToLead = useCallback((place, industry, locationName) => {
    const resolvedIndustry =
      industry === "All"
        ? (() => {
            const t = place.primaryType || "";
            if (t.includes("restaurant") || t.includes("cafe") || t.includes("food") || t.includes("bakery")) return "F&B";
            if (t.includes("beauty") || t.includes("spa") || t.includes("hair")) return "Beauty";
            if (t.includes("clothing") || t.includes("shoe")) return "Fashion";
            if (t.includes("electronics")) return "Electronics";
            if (t.includes("pharmacy") || t.includes("drug") || t.includes("health") || t.includes("hospital")) return "Health";
            if (t.includes("furniture") || t.includes("home_goods") || t.includes("florist")) return "Home & Living";
            if (t.includes("supermarket") || t.includes("grocery") || t.includes("convenience")) return "Grocery";
            if (t.includes("sporting") || t.includes("gym") || t.includes("fitness")) return "Sports";
            if (t.includes("toy") || t.includes("children")) return "Toys & Kids";
            return "Crafts";
          })()
        : industry;

    return {
      id: `place-${place.id}`,
      name: place.displayName?.text || "Unknown Business",
      industry: resolvedIndustry,
      location: (() => {
        const addr = place.formattedAddress || "";
        const kotaMatch = addr.match(/(?:Kota|Kabupaten)\s[\w\s]+?(?=,|$)/);
        if (kotaMatch) return kotaMatch[0].trim();
        return locationName || "Indonesia";
      })(),
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      potentialScore: estimatePotentialScore(place),
      productFitScore: estimateProductFitScore(place, resolvedIndustry),
      authorityScore: estimateAuthorityScore(place),
      snippet: place.editorialSummary?.text || `${resolvedIndustry} business with live commerce potential.`,
      phone: place.nationalPhoneNumber || "",
      rating: place.rating,
      ratingCount: place.userRatingCount,
      website: place.websiteUri || "",
      googleMapsUri: place.googleMapsUri || "",
      address: place.formattedAddress || place.shortFormattedAddress || "",
      isOpen: place.regularOpeningHours?.openNow,
      uri: place.websiteUri || place.googleMapsUri || "#",
      isReal: true,
    };
  }, []);

  const handleAIScan = useCallback(
    async (latLng, locationName) => {
      if (isScanning) return;

      const targetPos = latLng || userPos;

      if (lastScanPos.current) {
        const dist = Math.sqrt(Math.pow(targetPos.latitude - lastScanPos.current.lat, 2) + Math.pow(targetPos.longitude - lastScanPos.current.lng, 2));
        if (dist < 0.02) return;
      }

      const activeLocation = locationName || locationFilter || "Indonesia";
      setIsScanning(true);
      setStatus("SCANNING REAL BUSINESSES");
      lastScanPos.current = { lat: targetPos.latitude, lng: targetPos.longitude };

      try {
        const places = await fetchRealPlaces(targetPos.latitude, targetPos.longitude, industryFilter);
        const newLeads = places.filter((p) => p.location?.latitude && p.location?.longitude).map((p) => mapPlaceToLead(p, industryFilter, activeLocation));

        if (newLeads.length > 0) {
          setLeadsFound((prev) => {
            const existing = new Set(prev.map((l) => l.id));
            const merged = [...prev, ...newLeads.filter((l) => !existing.has(l.id))];
            return merged;
          });
        } else {
          setStatus("NO RESULTS IN THIS AREA");
        }
      } catch (err) {
        console.error("Places API error:", err);
        setStatus("API ERROR — CHECK CONSOLE");
      } finally {
        setIsScanning(false);
      }
    },
    [isScanning, userPos, locationFilter, industryFilter, fetchRealPlaces, mapPlaceToLead],
  );

  useEffect(() => {
    if (scanInitiated.current) return;
    scanInitiated.current = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserPos(coords);
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
          handleAIScan(coords);
        },
        () => handleAIScan(),
        { timeout: 5000 },
      );
    } else {
      handleAIScan();
    }
  }, []);

  const filteredLeads = useMemo(
    () =>
      leadsFound.filter((lead) => {
        const matchesIndustry = industryFilter === "All" || lead.industry === industryFilter;
        const matchesLocation = !locationFilter || lead.location === locationFilter;
        const matchesPotential =
          potentialFilter === "All" ||
          (potentialFilter === "High" && lead.potentialScore >= 85) ||
          (potentialFilter === "Mid" && lead.potentialScore >= 70 && lead.potentialScore < 85) ||
          (potentialFilter === "Low" && lead.potentialScore < 70);
        return matchesIndustry && matchesLocation && matchesPotential;
      }),
    [leadsFound, industryFilter, locationFilter, potentialFilter],
  );

  const allMapLeads = useMemo(() => {
    const scanIds = new Set(filteredLeads.map((l) => l.id));
    const partnerLeads = partneredBrands
      .filter((b) => b.lat && b.lng && !scanIds.has(b.id))
      .map((b) => ({
        id: b.id,
        name: b.name,
        industry: b.industry,
        location: b.location,
        lat: b.lat,
        lng: b.lng,
        potentialScore: 70,
        address: b.location,
        phone: "",
        website: "",
        googleMapsUri: "",
        snippet: "",
        isReal: true,
      }));
    return [...filteredLeads, ...partnerLeads];
  }, [filteredLeads, partneredBrands]);

  const handleLocationChange = (e) => {
    const province = e.target.value;
    setLocationFilter(province);
    if (province && PROVINCE_COORDINATES[province]) {
      const coords = { latitude: PROVINCE_COORDINATES[province].lat, longitude: PROVINCE_COORDINATES[province].lng };
      setUserPos(coords);
      setLeadsFound([]);
      setSelectedLead(null);
      lastScanPos.current = null;
      handleAIScan(coords, province);
    }
  };

  const handleIndustryChange = (e) => {
    setIndustryFilter(e.target.value);
    setLeadsFound([]);
    setSelectedLead(null);
    lastScanPos.current = null;
  };

  const handleContact = useCallback((lead) => {
    setContactModal(lead);
    setEmailInput("");
    setWaOpened(false);
    setWebsiteVisited(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setContactModal(null);
    setEmailInput("");
    setWaOpened(false);
    setWebsiteVisited(false);
  }, []);

  const handleConfirmSent = useCallback(
    (lead, method) => {
      if (!isPartner(lead.id)) {
        addPartner(
          {
            id: lead.id,
            name: lead.name,
            industry: lead.industry,
            location: lead.location,
            lat: lead.lat ?? null,
            lng: lead.lng ?? null,
            outreachMethod: method,
          },
          "In Progress",
        );
      } else {
        updateOutreachMethod(lead.id, method);
      }
      setContactModal(null);
      setEmailInput("");
      setWaOpened(false);
      setWebsiteVisited(false);
    },
    [isPartner, addPartner, updateOutreachMethod],
  );

  const aiInsightsRef = useRef({});

  const generateAiInsight = useCallback(
    async (lead) => {
      if (!lead?.id || aiInsightsRef.current[lead.id] || loadingInsightIds.current.has(lead.id)) return;
      loadingInsightIds.current.add(lead.id);
      setAiInsights((prev) => ({ ...prev }));
      try {
        const prompt = `You are a partnership analyst for Vidhelp, an Indonesian live commerce company. Vidhelp has a studio, hosts, and live selling platform. Vidhelp contacts local businesses and offers to feature and sell their products on Vidhelp's live streams. Vidhelp earns from commission per sale, so they only want products that will actually sell to live audiences.

Business to evaluate:
- Name: ${lead.name}
- Type: ${lead.industry}
- Rating: ${lead.rating ? lead.rating + "/5 from " + lead.ratingCount?.toLocaleString() + " reviews" : "no reviews"}
- Location: ${lead.address || lead.location}
- Currently open: ${lead.isOpen === true ? "Yes" : "No"}

Write 3 sentences in English, max 75 words total:
1. What this business sells and what proves their product quality (use real data like rating/reviews).
2. Why their product is a good fit for live selling — is it visually compelling, demo-able, giftable, food, fashion, beauty, etc?
3. The business case for Vidhelp to reach out — why will this product convert well and make Vidhelp money through commission?

Be direct. No fluff. No percentages.`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
            temperature: 0.7,
          }),
        });
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "";
        if (text) {
          aiInsightsRef.current[lead.id] = text;
          setAiInsights((prev) => ({ ...prev, [lead.id]: text }));
        }
      } catch (err) {
        console.error("AI insight error:", err);
        const errMsg = "Could not generate insight: " + (err?.message || "Unknown error");
        aiInsightsRef.current[lead.id] = errMsg;
        setAiInsights((prev) => ({ ...prev, [lead.id]: errMsg }));
      } finally {
        loadingInsightIds.current.delete(lead.id);
        setAiInsights((prev) => ({ ...prev }));
      }
    },
    [GROQ_KEY],
  );

  useEffect(() => {
    if (!selectedLead) return;
    if (aiInsightsRef.current[selectedLead.id]) return;
    const timer = setTimeout(() => {
      generateAiInsight(selectedLead);
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedLead?.id, generateAiInsight]);

  const handleTableRowClick = useCallback(
    async (brand) => {
      const existingLead = leadsFound.find((l) => l.id === brand.id);
      if (existingLead) {
        setSelectedLead(existingLead);
        mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (brand.id?.startsWith("place-") && brand.lat && brand.lng) {
        setIsFetchingDetail(true);
        setSelectedLead({
          id: brand.id,
          name: brand.name,
          industry: brand.industry,
          location: brand.location,
          lat: brand.lat,
          lng: brand.lng,
          potentialScore: 70,
          address: brand.location,
          phone: "",
          website: "",
          googleMapsUri: "",
          snippet: "",
          isReal: true,
          _loading: true,
        });
        mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

        try {
          const place = await fetchPlaceById(brand.id);
          const fullLead = mapPlaceToLead(place, brand.industry, brand.location);
          fullLead.id = brand.id;
          setSelectedLead(fullLead);
          setLeadsFound((prev) => {
            const existing = new Set(prev.map((l) => l.id));
            return existing.has(fullLead.id) ? prev : [...prev, fullLead];
          });
        } catch (err) {
          console.error("Failed to fetch place details:", err);
          setSelectedLead({
            id: brand.id,
            name: brand.name,
            industry: brand.industry,
            location: brand.location,
            lat: brand.lat,
            lng: brand.lng,
            potentialScore: 70,
            address: brand.location,
            phone: "",
            website: "",
            googleMapsUri: "",
            snippet: "",
            isReal: true,
          });
        } finally {
          setIsFetchingDetail(false);
        }
        return;
      }

      if (brand.lat && brand.lng) {
        setSelectedLead({
          id: brand.id,
          name: brand.name,
          industry: brand.industry,
          location: brand.location,
          lat: brand.lat,
          lng: brand.lng,
          potentialScore: 70,
          address: brand.location,
          phone: "",
          website: "",
          googleMapsUri: "",
          snippet: "",
          isReal: true,
        });
        mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [leadsFound, fetchPlaceById, mapPlaceToLead],
  );

  const LeadMarkerComponent = ({ lead }) => {
    const partnerData = getPartner(lead.id);
    const isSelected = selectedLead?.id === lead.id;
    const icon = createLeadIcon(lead, isSelected, partnerData);

    return (
      <Marker position={[lead.lat, lead.lng]} icon={icon} eventHandlers={{ click: () => setSelectedLead(lead) }}>
        <Popup>
          <div className="p-1">
            <p className="font-bold text-sm">{lead.name}</p>
            <p className="text-[10px] uppercase font-bold">
              {lead.industry} • {lead.potentialScore}%
            </p>
            {lead.rating && (
              <p className="text-[10px] text-amber-500">
                ★ {lead.rating} ({lead.ratingCount?.toLocaleString()})
              </p>
            )}
          </div>
        </Popup>
      </Marker>
    );
  };

  const FlyToLocation = () => {
    const map = useMap();
    const prevKey = useRef("");
    useEffect(() => {
      const key = `${userPos.latitude.toFixed(3)},${userPos.longitude.toFixed(3)}`;
      if (prevKey.current === key) return;
      prevKey.current = key;
      if (locationFilter) {
        map.flyTo([userPos.latitude, userPos.longitude], 13, { duration: 1.2 });
      }
    }, [userPos.latitude.toFixed(3), userPos.longitude.toFixed(3)]);
    return null;
  };

  const MapEvents = () => {
    useMapEvents({
      moveend: (e) => {
        const center = e.target.getCenter();
        const coords = { latitude: center.lat, longitude: center.lng };
        setUserPos(coords);
        handleAIScan(coords);
      },
    });
    return null;
  };

  const actionBtn = (bg, color) => ({
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    background: bg,
    cursor: "pointer",
    color,
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const canMarkSent = emailInput.trim().length > 0 || waOpened;

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  return (
    <div id="leads-report-container" className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 primary-gradient rounded-xl flex items-center justify-center text-white shadow-lg relative">
            <Radar size={28} className={isScanning ? "animate-spin" : ""} />
            {isScanning && <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leads Radar</h1>
            <p className="text-[11px] font-semibold text-muted-foreground tracking-wide mt-0.5">Find your potential partnership</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isScanning ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : leadsFound.length > 0 ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-slate-500"}`} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{isScanning ? "SCANNING..." : leadsFound.length > 0 ? `${leadsFound.length} REAL BUSINESSES FOUND` : "SYSTEM READY"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-muted/50 border border-border px-4 py-2 rounded-md flex-1 lg:flex-none">
            <MapPin size={14} className="text-muted-foreground" />
            <select value={locationFilter} onChange={handleLocationChange} className="bg-transparent text-xs font-semibold outline-none w-32 lg:w-40 cursor-pointer hover:text-primary transition-colors appearance-none">
              <option value="">All Provinces</option>
              {INDONESIAN_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 border border-border px-4 py-2 rounded-md">
            <Filter size={14} className="text-muted-foreground" />
            <select value={industryFilter} onChange={handleIndustryChange} className="bg-transparent text-xs font-semibold uppercase outline-none cursor-pointer hover:text-primary transition-colors appearance-none">
              <option value="All">All Sectors</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <span className="text-border">|</span>
            <select value={potentialFilter} onChange={(e) => setPotentialFilter(e.target.value)} className="bg-transparent text-xs font-semibold uppercase outline-none cursor-pointer hover:text-primary transition-colors appearance-none">
              <option value="All">All Potential</option>
              <option value="High">Elite Tier (Blue)</option>
              <option value="Mid">Growth Tier (Yellow)</option>
              <option value="Low">Low Potential (Gray)</option>
            </select>
          </div>
          <button
            onClick={() => {
              setLeadsFound([]);
              setSelectedLead(null);
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

      <div ref={mapSectionRef} className="h-[600px] relative dashboard-card overflow-hidden bg-muted/30 border border-border shrink-0">
        <MapContainer key={`${mapCenter[0].toFixed(3)},${mapCenter[1].toFixed(3)}`} center={mapCenter} zoom={15} style={{ height: "100%", width: "100%", zIndex: 0 }} zoomControl={true}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FlyToLocation />
          <MapEvents />
          {allMapLeads.map((lead) => (
            <LeadMarkerComponent key={lead.id} lead={lead} />
          ))}
        </MapContainer>

        <AnimatePresence>
          {isScanning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border text-[10px] font-bold uppercase tracking-widest shadow-sm">
                  Scanning Real{industryFilter !== "All" ? ` ${industryFilter}` : ""} Businesses...
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedLead && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-y-4 right-4 w-full lg:w-[400px] bg-background border border-border rounded-xl z-40 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center
                    ${selectedLead.potentialScore >= 85 ? "bg-blue-500 text-white" : selectedLead.potentialScore >= 70 ? "bg-amber-500 text-white" : "bg-slate-500 text-white"}`}
                  >
                    {isFetchingDetail ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
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

              {selectedLead._loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs font-bold uppercase tracking-widest">Loading business details...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedLead.rating && (
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-lg">
                      <Star size={16} className="text-amber-500 fill-amber-500" />
                      <span className="font-bold text-amber-600">{selectedLead.rating}</span>
                      <span className="text-[10px] text-muted-foreground">({selectedLead.ratingCount?.toLocaleString()} reviews)</span>
                      {selectedLead.isOpen !== undefined && (
                        <span className={`ml-auto text-[9px] font-bold uppercase px-2 py-0.5 rounded ${selectedLead.isOpen ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>
                          {selectedLead.isOpen ? "Open Now" : "Closed"}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Live Commerce Fit</p>
                      <p className="text-2xl font-bold">{selectedLead.potentialScore}%</p>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Priority Rank</p>
                      <p className="text-2xl font-bold text-primary">{selectedLead.potentialScore >= 85 ? "P-1 🔥" : selectedLead.potentialScore >= 70 ? "P-2" : "P-3"}</p>
                    </div>
                  </div>

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
                          <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate max-w-[280px]">
                            {selectedLead.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Navigation size={14} className="shrink-0" />
                        <span className="font-medium">
                          {selectedLead.lat?.toFixed(4)}, {selectedLead.lng?.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
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

                    {getPartner(selectedLead.id)?.outreachMethod ? (
                      <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                        <CheckCircle2 size={18} /> CONTACTED VIA {getPartner(selectedLead.id)?.outreachMethod?.toUpperCase()}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleContact(selectedLead)}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <Mail size={18} /> REACH OUT
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
              <div className={`w-2 h-2 rounded-full animate-pulse ${isScanning ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"}`} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{filteredLeads.length} Real Businesses</span>
            </div>
          </div>
        </div>
      </div>

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
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "All", dot: "bg-foreground" },
              { label: "In Progress", dot: "bg-slate-400" },
              { label: "Dealing", dot: "bg-purple-500" },
              { label: "Partner", dot: "bg-blue-500" },
            ].map(({ label, dot }) => (
              <button
                key={label}
                onClick={() => {
                  setStatusFilter(label);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all
                  ${statusFilter === label ? "bg-foreground text-background border-foreground" : "bg-background/50 text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"}`}
              >
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                {label}
              </button>
            ))}
          </div>
        </div>
       
      <div className="overflow-x-auto">
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 2fr 1fr 1.2fr 1fr 1fr 1.2fr 120px", borderBottom: "1px solid var(--border)", background: "var(--muted)", padding: "0 8px" }}>
          {["No", "Business Name", "Sector", "Location", "Date", "Outreach", "Status", "Actions"].map((h) => (
            <div key={h} style={{ padding: "14px 16px", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", color: "var(--muted-foreground)" }}>
              {h}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {["No", "Business Name", "Sector", "Location", "Date", "Outreach", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                    {h}
                  </th>
                ))}
               </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partneredBrands.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                      <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center">
                        <Target size={40} />
        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 8px" }}>
          {partneredBrands.length === 0 ? (
            <div style={{ padding: "80px 32px", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, opacity: 0.2 }}>
                <div style={{ width: 80, height: 80, border: "2px dashed var(--muted-foreground)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Target size={40} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4em" }}>No Active Partners Yet</p>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 8 }}>Scan the area and reach out to get started</p>
                </div>
              </div>
            </div>
          ) : (
            paginatedBrands.map((brand, index) => {
              const rowNumber = (currentPage - 1) * pageSize + index + 1;
              const hasCoords = !!(brand.lat && brand.lng);
              const isClickable = hasCoords;
              return (
                <div
                  key={brand.id}
                  onClick={() => isClickable && handleTableRowClick(brand)}
                  className="leads-table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 2fr 1fr 1.2fr 1fr 1fr 1.2fr 120px",
                    alignItems: "center",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    cursor: isClickable ? "pointer" : "default",
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(219,26,26,0.15), 0 4px 12px rgba(0,0,0,0.08)";
                    e.currentTarget.style.borderColor = "rgba(219,26,26,0.3)";
                    e.currentTarget.style.background = "rgba(219,26,26,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--background)";
                  }}
                >
                  {/* No */}
                  <div style={{ padding: "20px 16px" }}>
                    <span
                      className="lead-row-number"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 8, background: "var(--muted)", fontSize: 11, fontWeight: 700, color: "var(--primary)", transition: "background 0.18s ease, color 0.18s ease" }}
                    >
                      {rowNumber}
                    </span>
                  </div>

                  {/* Business Name */}
                  <div style={{ padding: "20px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: "var(--foreground)", color: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, borderRadius: 8, flexShrink: 0 }}>
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="lead-name" style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", transition: "color 0.15s ease" }}>
                        {brand.name}
                      </span>
                    </div>
                  </div>

                  {/* Sector */}
                  <div style={{ padding: "20px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--muted)", border: "1px solid var(--border)", padding: "3px 10px", borderRadius: 6 }}>
                      {brand.industry}
                    </span>
                  </div>

                  {/* Location */}
                  <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)" }}>{brand.location}</span>
                  </div>

                  {/* Date */}
                  <div style={{ padding: "20px 16px" }}>
                    <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                      {new Date(brand.datePartnered).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {/* Outreach */}
                  <div style={{ padding: "20px 16px" }}>
                    {brand.outreachMethod ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {brand.outreachMethod === "email" ? "Email" : brand.outreachMethod === "whatsapp" ? "WhatsApp" : "Sent"}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); const lead = leadsFound.find((l) => l.id === brand.id) || brand; handleContact(lead); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#7c3aed", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <Mail size={12} /> Send Email
                      </button>
                    )}
                  </div>

                  {/* Status */}
                  <div style={{ padding: "20px 16px" }}>
                    {editingId === brand.id ? (
                      <select
                        value={brand.status}
                        onChange={(e) => updateStatus(brand.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", padding: "6px 12px", borderRadius: 20, border: "1px solid", outline: "none", cursor: "pointer",
                          background: brand.status === "Partner" ? "rgba(59,130,246,0.1)" : brand.status === "Dealing" ? "rgba(139,92,246,0.1)" : "rgba(100,116,139,0.1)",
                          color: brand.status === "Partner" ? "#3b82f6" : brand.status === "Dealing" ? "#8b5cf6" : "#94a3b8",
                          borderColor: brand.status === "Partner" ? "rgba(59,130,246,0.3)" : brand.status === "Dealing" ? "rgba(139,92,246,0.3)" : "rgba(100,116,139,0.3)",
                        }}
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Dealing">Dealing</option>
                        <option value="Partner">Partner</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", padding: "6px 16px", borderRadius: 20, border: "1px solid", display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 100,
                        background: brand.status === "Partner" ? "rgba(59,130,246,0.1)" : brand.status === "Dealing" ? "rgba(139,92,246,0.1)" : "rgba(100,116,139,0.1)",
                        color: brand.status === "Partner" ? "#3b82f6" : brand.status === "Dealing" ? "#8b5cf6" : "#94a3b8",
                        borderColor: brand.status === "Partner" ? "rgba(59,130,246,0.3)" : brand.status === "Dealing" ? "rgba(139,92,246,0.3)" : "rgba(100,116,139,0.3)",
                      }}>
                        {brand.status}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ padding: "20px 16px" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      {editingId === brand.id ? (
                        <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} style={actionBtn("rgba(34,197,94,0.1)", "#22c55e")} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.1)")} title="Save"><Check size={14} /></button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setEditingId(brand.id); }} style={actionBtn("rgba(99,102,241,0.08)", "#6366f1")} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.18)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")} title="Edit Status"><Edit3 size={14} /></button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(brand); }} style={actionBtn("rgba(219,26,26,0.08)", "#DB1A1A")} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(219,26,26,0.18)")} onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(219,26,26,0.08)")} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBrands.map((brand, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  const hasCoords = !!(brand.lat && brand.lng);
                  const isClickable = hasCoords;
                  return (
                    <tr
                      key={brand.id}
                      onClick={() => isClickable && handleTableRowClick(brand)}
                      className={`transition-all border-l-4 border-l-transparent hover:border-l-primary hover:bg-muted/20 ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <td className="px-6 py-6">
                        <span className="text-sm font-bold text-blue-500">{rowNumber}</span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center font-black text-sm shadow-sm rounded">{brand.name.substring(0, 2).toUpperCase()}</div>
                          <div>
                            <span className="font-bold text-sm tracking-tight block">{brand.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-muted/50 border border-border px-3 py-1 rounded">{brand.industry}</span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                          <MapPin size={12} className="text-primary" />
                          {brand.location}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{new Date(brand.datePartnered).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </td>
                      <td className="px-6 py-6">
                        {brand.outreachMethod ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">{brand.outreachMethod === "email" ? "Email" : brand.outreachMethod === "whatsapp" ? "WhatsApp" : "Sent"}</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const lead = leadsFound.find((l) => l.id === brand.id) || brand;
                              handleContact(lead);
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
                            onChange={(e) => updateStatus(brand.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full border outline-none cursor-pointer transition-all
                              ${
                                brand.status === "Partner"
                                  ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                  : brand.status === "Dealing"
                                    ? "bg-purple-500/10 text-purple-500 border-purple-500/30"
                                    : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                              }`}
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Dealing">Dealing</option>
                            <option value="Partner">Partner</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full border inline-flex items-center justify-center min-w-[100px]
                            ${
                              brand.status === "Partner"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                : brand.status === "Dealing"
                                  ? "bg-purple-500/10 text-purple-500 border-purple-500/30"
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                            }`}
                          >
                            {brand.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-6">
                        <div className="inline-flex gap-2">
                          {editingId === brand.id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                              style={actionBtn("rgba(34,197,94,0.1)", "#22c55e")}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.2)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.1)")}
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(brand.id);
                              }}
                              style={actionBtn("rgba(99,102,241,0.08)", "#6366f1")}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.18)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
                              title="Edit Status"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (paginatedBrands.length === 1 && currentPage > 1) {
                                setCurrentPage((p) => p - 1);
                              }
                              removePartner(brand.id);
                              if (editingId === brand.id) setEditingId(null);
                            }}
                            style={actionBtn("rgba(239,68,68,0.08)", "#2563eb")}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.18)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

        <div className="p-6 bg-muted/5 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-muted/50 border border-border text-xs font-bold px-3 py-1.5 rounded-md outline-none cursor-pointer hover:bg-muted transition-colors"
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">entries</span>
          </div>

          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
            {filteredBrands.length === 0
              ? statusFilter === "All"
                ? "No entries"
                : `No ${statusFilter} partners`
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredBrands.length)} of ${filteredBrands.length} partners`}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-border rounded-md bg-muted/30 hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Prev
              </button>
              {getPageNumbers().map((page, i) =>
                page === "..." ? (
                  <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 text-[10px] font-black rounded-md border transition-colors
                      ${currentPage === page ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground"}`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-border rounded-md bg-muted/30 hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
            {deleteConfirm && (
              <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div onClick={() => setDeleteConfirm(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
                <div style={{ position: "relative", zIndex: 10, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(219,26,26,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={24} color="#DB1A1A" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }} className="text-foreground">Remove Partner?</h3>
                      <p style={{ fontSize: 13, margin: "8px 0 0" }} className="text-muted-foreground">
                        This will permanently remove <strong className="text-foreground">{deleteConfirm.name}</strong> from the pipeline.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 12, width: "100%" }}>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                        className="text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (paginatedBrands.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
                          removePartner(deleteConfirm.id);
                          if (editingId === deleteConfirm.id) setEditingId(null);
                          setDeleteConfirm(null);
                        }}
                        style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#DB1A1A", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

      {/* CONTACT MODAL */}
      <AnimatePresence>
        {contactModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleCloseModal}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg tracking-tight">{contactModal.name}</h3>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{contactModal.industry} • Partnership Outreach</p>
                </div>
                <button onClick={handleCloseModal} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                <p className="font-bold mb-1">📧 Email Not Available</p>
                <p>Find their email on the website, or reach out via WhatsApp. Once sent, click "Mark as Sent".</p>
              </div>

              <div className="space-y-3">
                {contactModal.phone ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Via WhatsApp</p>
                    <a
                      href={`https://wa.me/${contactModal.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Hi ${contactModal.name}, we're from Vidhelp — an Indonesian live commerce platform. We'd love to feature and sell your products through our live streams. Would you be open to a quick discussion?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setWaOpened(true)}
                      className="w-full py-3 bg-green-500 text-white rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                    >
                      <Phone size={16} /> OPEN WHATSAPP — {contactModal.phone}
                    </a>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground text-center">No WhatsApp number available</div>
                )}

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    Via Email
                    {!websiteVisited && contactModal.website && <span className="text-[9px] text-amber-500 font-bold normal-case tracking-normal">— visit website first to find their email</span>}
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="email"
                        placeholder={!contactModal.website ? "No website — email unavailable" : !websiteVisited ? "Visit website first..." : "Paste their email here..."}
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        disabled={!contactModal.website || !websiteVisited}
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50"
                      />
                    </div>
                    {contactModal.website && (
                      <a
                        href={contactModal.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Visit website to find their email"
                        onClick={() => setWebsiteVisited(true)}
                        className={`px-3 py-2 border rounded-md transition-colors flex items-center gap-1.5 text-[10px] font-bold ${
                          websiteVisited ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        }`}
                      >
                        <Globe size={15} />
                        {websiteVisited ? <Check size={12} /> : null}
                      </a>
                    )}
                  </div>
                  {emailInput.trim().length > 0 && (
                    <a
                      href={`mailto:${emailInput}?subject=${encodeURIComponent(`Partnership Opportunity: Live Commerce Collaboration with Vidhelp × ${contactModal.name}`)}&body=${encodeURIComponent(`Dear ${contactModal.name} Team,

We are reaching out from Vidhelp, an Indonesian live commerce platform with a professional studio, experienced hosts, and a live selling platform.

We believe ${contactModal.name}'s products would perform exceptionally well through live streaming, and we'd love to feature them on our platform. Here's what we offer:

• Professional live streaming setup (studio, hosts, equipment — all provided by Vidhelp)
• Access to our engaged live shopping audience
• Commission-based model — no upfront cost to you
• Real-time sales tracking and performance insights

We handle everything on our end. You simply supply the products, and we take care of the rest.

We'd love to explore this partnership. Are you available for a quick call this week?

Best regards,
Partnership Team — Vidhelp
vidhelp.com`)}`}
                      className="w-full py-2.5 bg-primary text-primary-foreground rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                      <Mail size={15} /> OPEN EMAIL DRAFT
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <button
                  disabled={!canMarkSent}
                  onClick={() => handleConfirmSent(contactModal, emailInput.trim() ? "email" : "whatsapp")}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-md font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={16} /> MARK AS SENT & ADD TO PIPELINE
                </button>
                {!canMarkSent && <p className="text-center text-[10px] text-muted-foreground">Open WhatsApp or enter an email address first</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
      .leaflet-container { background: #f0f2f5 !important; }
      .custom-marker { background: transparent !important; border: none !important; }
      .custom-marker:hover > div { transform: scale(1.15) !important; transition: transform 0.2s ease !important; }

      .leads-table-row:hover .lead-name {
        color: var(--primary) !important;
      }

      .leads-table-row:hover .lead-row-number {
        background: var(--primary) !important;
        color: #fff !important;
      }
    `}</style>
    </div>
  );
}

export default function Leads() {
  return <LeadsInner />;
}