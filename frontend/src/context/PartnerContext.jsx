import { createContext, useContext, useState } from 'react';

export const PartnerStatus = { IN_PROGRESS: 'In Progress', DEALING: 'Dealing', PARTNER: 'Partner' };

const PartnerContext = createContext(null);

export function PartnerProvider({ children }) {
  const [partneredBrands, setPartneredBrands] = useState([]);

  const addPartner = (lead, status = 'In Progress') => {
    setPartneredBrands(prev => {
      if (prev.find(b => b.id === lead.id)) return prev;
      return [...prev, { ...lead, status, datePartnered: new Date().toISOString() }];
    });
  };

  const updateStatus = (id, status) => {
    setPartneredBrands(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const removePartner = (id) => {
    setPartneredBrands(prev => prev.filter(b => b.id !== id));
  };

  const getPartner = (id) => partneredBrands.find(b => b.id === id) || null;
  const isPartner   = (id) => !!getPartner(id);

  return (
    <PartnerContext.Provider value={{
      partneredBrands, addPartner, updateStatus, removePartner,
      getPartner, isPartner, partnerCount: partneredBrands.length
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