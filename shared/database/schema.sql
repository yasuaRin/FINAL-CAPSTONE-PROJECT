-- Shared database schema for all modules

-- Brands table (used by Overview and Revenue)
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily revenue (YOUR tables, Dadia)
CREATE TABLE daily_revenue (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    date DATE NOT NULL,
    platform VARCHAR(20) CHECK (platform IN ('tiktok', 'shopee')),
    revenue DECIMAL(15,2) DEFAULT 0,
    viewers INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0
);

-- Churn alerts (Overview module)
CREATE TABLE churn_alerts (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    alert_date DATE NOT NULL,
    risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high')),
    reason TEXT,
    resolved BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX idx_daily_revenue_date ON daily_revenue(date);
CREATE INDEX idx_daily_revenue_brand ON daily_revenue(brand_id);