// diagnostic.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { loadDailyRevenue } = require('./dataLoader');

async function runDiagnostic() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('='.repeat(60));
  console.log('DATA DIAGNOSTIC');
  console.log('='.repeat(60));

  const { data: allData, error } = await supabase
    .table('live_sessions')
    .select('date, revenue_shopee, revenue_tiktok');

  if (error) throw error;

  console.log(`\n📊 Supabase Query Results:`);
  console.log(`   Total sessions: ${allData.length}`);

  const datesWith = { revenue: {}, zero: {}, total: {} };

  for (const row of allData) {
    const date = row.date;
    if (!date) continue;

    const revenue = (row.revenue_shopee || 0) + (row.revenue_tiktok || 0);
    datesWith.total[date] = (datesWith.total[date] || 0) + 1;

    if (revenue > 0) {
      datesWith.revenue[date] = (datesWith.revenue[date] || 0) + 1;
    } else {
      datesWith.zero[date] = (datesWith.zero[date] || 0) + 1;
    }
  }

  console.log(`\n📅 Date Statistics:`);
  console.log(`   Total unique dates in DB: ${Object.keys(datesWith.total).length}`);
  console.log(`   Dates with revenue > 0: ${Object.keys(datesWith.revenue).length}`);
  console.log(`   Dates with revenue = 0: ${Object.keys(datesWith.zero).length}`);

  const revenueDates = Object.keys(datesWith.revenue).sort();
  if (revenueDates.length > 0) {
    console.log(`   Date range (revenue > 0): ${revenueDates[0]} to ${revenueDates[revenueDates.length - 1]}`);
  }

  console.log(`\n📊 loadDailyRevenue() output:`);
  const daily = await loadDailyRevenue();
  console.log(`   Days returned: ${daily.length}`);

  if (daily.length > 0) {
    console.log(`   First date: ${daily[0].date}`);
    console.log(`   Last date: ${daily[daily.length - 1].date}`);

    const zeroRevenueDays = daily.filter(d => d.revenue === 0).length;
    const positiveRevenueDays = daily.length - zeroRevenueDays;
    console.log(`   Days with revenue > 0 in result: ${positiveRevenueDays}`);
    console.log(`   Days with revenue = 0 in result: ${zeroRevenueDays}`);
  }

  const today = new Date().toISOString().split('T')[0];
  const allDates = Object.keys(datesWith.total);
  const futureDates = allDates.filter(d => d > today).sort();
  const pastDates = allDates.filter(d => d <= today);

  console.log(`\n📅 Date Filtering:`);
  console.log(`   Dates before/on today: ${pastDates.length}`);
  console.log(`   Dates after today (future): ${futureDates.length}`);
  if (futureDates.length > 0) {
    console.log(`   Future date range: ${futureDates[0]} to ${futureDates[futureDates.length - 1]}`);
  }
}

runDiagnostic().catch(console.error);