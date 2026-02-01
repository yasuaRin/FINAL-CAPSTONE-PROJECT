const brands = require('../config/brands');
const sheets = require('../services/sheets');
const parser = require('../services/parser');
const db = require('../lib/db');

exports.syncBrand = async (req, res) => {
  try {
    const { brandSlug } = req.params;
    const brand = brands.find(b => b.slug === brandSlug);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    console.log(`🔄 Syncing ${brand.name}...`);
    
    const brandId = await db.upsertBrand(brand);
    const periods = await sheets.listPeriods(brand.id);
    let totalSessions = 0;
    
    for (const period of periods) {
      const rows = await sheets.getSheetData(brand.id, period);
      const periodId = await db.upsertPeriod(brandId, period);
      const sessions = parser.parseSessions(rows, periodId);
      
      if (sessions.length) {
        const inserted = await db.insertSessions(sessions);
        totalSessions += inserted;
      }
      
      await new Promise(r => setTimeout(r, 300));
    }
    
    res.json({
      success: true,
      brand: brand.name,
      periods: periods.length,
      sessions: totalSessions
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.syncAll = async (req, res) => {
  res.json({ message: 'Use scripts/sync.js for full sync' });
};