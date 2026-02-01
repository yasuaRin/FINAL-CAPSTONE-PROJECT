CREATE EXTENSION IF NOT EXISTS ""uuid-ossp"";

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'Beauty',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    sheet_name VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    UNIQUE(brand_id, sheet_name)
);

CREATE TABLE live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES periods(id),
    host_id UUID NOT NULL REFERENCES hosts(id),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours DECIMAL(3,1) NOT NULL,
    platform VARCHAR(20) DEFAULT 'MULTI',
    tiktok_revenue NUMERIC(15,2) DEFAULT 0,
    tiktok_viewers INTEGER DEFAULT 0,
    tiktok_likes INTEGER DEFAULT 0,
    shopee_revenue NUMERIC(15,2) DEFAULT 0,
    shopee_viewers INTEGER DEFAULT 0
);

CREATE INDEX idx_sessions_date ON live_sessions(session_date);

CREATE OR REPLACE VIEW daily_revenue_summary AS
SELECT 
    s.session_date,
    b.name AS brand_name,
    COUNT(*) AS sessions,
    SUM(s.tiktok_revenue + s.shopee_revenue) AS total_revenue
FROM live_sessions s
JOIN periods p ON s.period_id = p.id
JOIN brands b ON p.brand_id = b.id
GROUP BY s.session_date, b.id, b.name;
"@ | Set-Content -Path database\schema.sql -Encoding UTF8

# Recreate seed.sql
@"
INSERT INTO brands (name, slug, category) VALUES
  ('Yves Rocher','yvesrocher','Beauty'),
  ('Wardah','wardah','Beauty'),
  ('Make Over','makeover','Beauty'),
  ('Sociolla','sociolla','Beauty'),
  ('Emina','emina','Beauty'),
  ('Rollover','rollover','Fashion'),
  ('Somethinc','somethinc','Beauty'),
  ('Skintific','skintific','Beauty'),
  ('Avoskin','avoskin','Beauty'),
  ('MS Glow','msglow','Beauty'),
  ('Lemonilo','lemonilo','Food')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO hosts (name) VALUES
  ('ARRA'), ('ZAHRA'), ('MIA'), ('CINDY'), ('MENTARI'), ('PUING'), ('TATA KRISTI'), ('NANAZ'), ('ELIZABETH'), ('KEY'), ('WULAN'), ('VINA'), ('DEBORA'), ('CACA'), ('WANDA'), ('KARIN'), ('APRIL'), ('DINI'), ('NAYA')
ON CONFLICT (name) DO NOTHING;
