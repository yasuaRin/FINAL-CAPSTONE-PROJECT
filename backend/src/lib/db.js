const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vidhelp_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

exports.upsertBrand = async (brand) => {
    const slug = brand.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')  
    .replace(/^-+|-+$/g, '');  
    
  const res = await pool.query(
    `INSERT INTO brands (name, slug, category) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (slug) DO UPDATE 
     SET name = EXCLUDED.name, category = EXCLUDED.category
     RETURNING id`,
    [brand.name, brand.slug.toLowerCase(), brand.category || 'Beauty']  
  );
  return res.rows[0].id;
};

exports.upsertPeriod = async (brandId, name) => {
  const res = await pool.query(
    `INSERT INTO periods (brand_id, sheet_name, name, start_date, end_date)
     VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
     ON CONFLICT (brand_id, sheet_name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [brandId, name, name]
  );
  return res.rows[0].id;
};

exports.upsertHost = async (name) => {
  await pool.query(`INSERT INTO hosts (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
  const res = await pool.query(`SELECT id FROM hosts WHERE name = $1`, [name]);
  return res.rows[0].id;
};

exports.insertSessions = async (sessions) => {
  if (!sessions.length) return 0;
  
  // Resolve hosts
  const hostNames = [...new Set(sessions.map(s => s.host))];
  const hostIds = {};
  for (const name of hostNames) hostIds[name] = await exports.upsertHost(name);
  
  // Bulk insert
  const values = sessions.flatMap(s => [
    s.period_id, hostIds[s.host], s.date, s.start_time, s.end_time, s.duration_hours,
    s.platform, s.tiktok_revenue, s.tiktok_viewers, 0, s.shopee_revenue, s.shopee_viewers
  ]);
  
  const placeholders = sessions.map((_, i) => 
    `($${i*12+1}, $${i*12+2}, $${i*12+3}, $${i*12+4}, $${i*12+5}, $${i*12+6}, $${i*12+7}, $${i*12+8}, $${i*12+9}, $${i*12+10}, $${i*12+11}, $${i*12+12})`
  ).join(', ');
  
  await pool.query(
    `INSERT INTO live_sessions (
      period_id, host_id, session_date, start_time, end_time, duration_hours,
      platform, tiktok_revenue, tiktok_viewers, tiktok_likes,
      shopee_revenue, shopee_viewers
    ) VALUES ${placeholders} ON CONFLICT DO NOTHING`, values
  );
  
  return sessions.length;
};

exports.close = () => pool.end();