#!/usr/bin/env node
require('dotenv').config();
const brands = require('../src/config/brands');
const sheets = require('../src/services/sheets');
const parser = require('../src/services/parser');
const db = require('../src/lib/db');

// Exponential backoff retry for API calls
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      console.log(`  ⏳ Retry ${i + 1}/${retries} in ${delay/1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

// Network error retry (for DNS failures)
const withNetworkRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        if (i === maxRetries - 1) throw error;
        console.log(`  🌐 Network error, retrying (${i + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        throw error;
      }
    }
  }
};

(async () => {
  console.log('🚀 Syncing VidHelp brands...\n');
  let totalSessions = 0;
  
  for (let idx = 0; idx < brands.length; idx++) {
    const brand = brands[idx];
    
    // Longer delay between brands (avoid quota exceeded)
    if (idx > 0) {
      const delay = 5000; // 5 seconds between brands
      console.log(`⏳ Waiting ${delay/1000}s before next brand...\n`);
      await new Promise(r => setTimeout(r, delay));
    }
    
    try {
      console.log(`📦 ${brand.name}`);
      
      // Upsert brand
      const brandId = await db.upsertBrand(brand);
      
      // Get periods with retry
      const periods = await withNetworkRetry(() => retryWithBackoff(() => sheets.listPeriods(brand.id)));
      console.log(`   Found ${periods.length} periods`);
      
      // Sync each period with longer delays
      for (let p = 0; p < periods.length; p++) {
        const period = periods[p];
        
        // Get sheet data with retry
        const rows = await withNetworkRetry(() => retryWithBackoff(() => sheets.getSheetData(brand.id, period)));
        
        const periodId = await db.upsertPeriod(brandId, period);
        const sessions = parser.parseSessions(rows, periodId);
        
        if (sessions.length) {
          const inserted = await db.insertSessions(sessions);
          totalSessions += inserted;
          console.log(`   → ${period}: ${inserted} sessions`);
        }
        
        // Longer delay between periods (2 seconds)
        if (p < periods.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      
      console.log(`✅ ${brand.name} synced\n`);
      
    } catch (error) {
      console.error(`❌ Failed ${brand.name}:`, error.message);
    }
  }
  
  console.log(`\n✅ Sync complete!`);
  console.log(`📊 Total sessions: ${totalSessions}`);
  await db.close();
})().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});