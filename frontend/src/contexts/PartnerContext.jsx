import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const PartnerStatus = {
  IN_PROGRESS: 'In Progress',
  DEALING: 'Dealing',
  PARTNER: 'Partner',
};

const PartnerContext = createContext(null);

export function PartnerProvider({ children }) {
  const [partneredBrands, setPartneredBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Load from Supabase on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchPartners = async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('date_partnered', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
      } else {
        setPartneredBrands(data.map(row => ({
          id:             row.id,
          name:           row.name,
          industry:       row.industry,
          location:       row.location,
          status:         row.status,
          outreachMethod: row.outreach_method,
          datePartnered:  row.date_partnered,
          lat:            row.lat,
          lng:            row.lng,
        })));
      }
      setLoading(false);
    };

    fetchPartners();
  }, []);

  // ── Add partner ──────────────────────────────────────────────────────────
  const addPartner = async (lead, status = 'In Progress') => {
    if (partneredBrands.find(b => b.id === lead.id)) return;

    const newPartner = {
      id:              lead.id,
      name:            lead.name,
      industry:        lead.industry,
      location:        lead.location,
      status,
      outreach_method: lead.outreachMethod || null,
      date_partnered:  new Date().toISOString(),
      lat:             lead.lat ?? null,
      lng:             lead.lng ?? null,
    };

    const { error } = await supabase.from('partners').insert([newPartner]);

    if (error) {
      console.error('Supabase insert error:', error);
      return;
    }

    setPartneredBrands(prev => [{
      id:             newPartner.id,
      name:           newPartner.name,
      industry:       newPartner.industry,
      location:       newPartner.location,
      status:         newPartner.status,
      outreachMethod: newPartner.outreach_method,
      datePartnered:  newPartner.date_partnered,
      lat:            newPartner.lat,
      lng:            newPartner.lng,
    }, ...prev]);
  };

  // ── Update status ────────────────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('partners')
      .update({ status })
      .eq('id', id);

    if (error) { console.error('Supabase update error:', error); return; }

    setPartneredBrands(prev =>
      prev.map(b => b.id === id ? { ...b, status } : b)
    );
  };

  // ── Update outreach method ───────────────────────────────────────────────
  const updateOutreachMethod = async (id, method) => {
    const { error } = await supabase
      .from('partners')
      .update({ outreach_method: method })
      .eq('id', id);

    if (error) { console.error('Supabase update outreach error:', error); return; }

    setPartneredBrands(prev =>
      prev.map(b => b.id === id ? { ...b, outreachMethod: method } : b)
    );
  };

  // ── Remove partner ───────────────────────────────────────────────────────
  const removePartner = async (id) => {
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id);

    if (error) { console.error('Supabase delete error:', error); return; }

    setPartneredBrands(prev => prev.filter(b => b.id !== id));
  };

  const getPartner = (id) => partneredBrands.find(b => b.id === id) || null;
  const isPartner  = (id) => !!getPartner(id);

  return (
    <PartnerContext.Provider value={{
      partneredBrands,
      loading,
      addPartner,
      updateStatus,
      updateOutreachMethod,
      removePartner,
      getPartner,
      isPartner,
      partnerCount: partneredBrands.length,
    }}>
      {children}
    </PartnerContext.Provider>
  );
}

export function usePartners() {
  const ctx = useContext(PartnerContext);
  if (!ctx) throw new Error('usePartners must be used within PartnerProvider');
  return ctx;
}