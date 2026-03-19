// GET /api/leads/read (mock data for now)
export const getLeads = async (req, res) => {
  const mockLeads = [
    {
      id: 1,
      name: 'UMKM Maju Jaya',
      category: 'Food & Beverage',
      location: 'Jakarta',
      potential_score: 85
    },
    {
      id: 2,
      name: 'Toko Berkah',
      category: 'Fashion',
      location: 'Bandung',
      potential_score: 72
    }
  ];

  res.json({ success: true, data: mockLeads });
};

// POST /api/leads/convert
export const convertLead = async (req, res) => {
  res.json({ success: true, message: 'Lead conversion endpoint' });
};