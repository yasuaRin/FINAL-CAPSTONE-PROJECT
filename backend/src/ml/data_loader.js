// data_loader.js - ES Module version
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function loadDailyRevenue(brandId = null) {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('live_sessions')
    .select('date, revenue_shopee, revenue_tiktok, viewers_shopee, viewers_tiktok, likes_shopee, likes_tiktok, period_id, brand_id')
    .lte('date', today);

  if (brandId) {
    query = query.eq('brand_id', brandId);
  }

  // Pagination to get ALL records
  const allData = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const response = await query.range(offset, offset + pageSize - 1);
    
    if (!response.data || response.data.length === 0) {
      break;
    }
    
    allData.push(...response.data);
    offset += pageSize;
    
    if (response.data.length < pageSize) {
      break;
    }
  }

  console.log(` Fetched ${allData.length} total sessions`);

  if (allData.length === 0) return [];

  // Group by date
  const byDate = {};
  for (const row of allData) {
    const dateKey = row.date;
    if (!dateKey) continue;

    const revenue = (row.revenue_shopee || 0) + (row.revenue_tiktok || 0);
    const viewers = (row.viewers_shopee || 0) + (row.viewers_tiktok || 0);
    const likes = (row.likes_shopee || 0) + (row.likes_tiktok || 0);

    if (!byDate[dateKey]) {
      byDate[dateKey] = {
        date: dateKey,
        revenue: 0,
        sessions: 0,
        viewers: 0,
        likes: 0,
        period_id: row.period_id,
      };
    }

    byDate[dateKey].revenue += revenue;
    byDate[dateKey].viewers += viewers;
    byDate[dateKey].likes += likes;
    byDate[dateKey].sessions += 1;
  }

  const result = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  console.log(` Final Loaded Data:`);
  console.log(`   Total unique dates: ${result.length}`);
  console.log(`   Total sessions represented: ${result.reduce((sum, d) => sum + d.sessions, 0)}`);
  
  if (result.length > 0) {
    console.log(`   Date range: ${result[0].date} to ${result[result.length - 1].date}`);
  }

  return result;
}