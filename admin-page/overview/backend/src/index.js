const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const MODULE_INFO = {
  name: 'Admin - Overview Dashboard',
  developer: 'Dadia',
  port: process.env.PORT || 5001,
  description: 'Main dashboard with KPIs, charts, and summary'
};

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    module: MODULE_INFO.name,
    developer: MODULE_INFO.developer,
    endpoints: [
      '/api/kpis',
      '/api/brand-performance',
      '/api/churn-alerts'
    ]
  });
});

// Dashboard KPIs
app.get('/api/kpis', (req, res) => {
  res.json({
    total_revenue: 318924186,
    active_brands: 11,
    avg_daily_revenue: 10287877,
    growth_rate: 12.5,
    churn_risk: 'low'
  });
});

// Brand performance
app.get('/api/brand-performance', (req, res) => {
  res.json([
    { brand: 'Brand A', revenue: 45000000, growth: 15 },
    { brand: 'Brand B', revenue: 38000000, growth: 8 },
    { brand: 'Brand C', revenue: 32000000, growth: -3 }
  ]);
});

const PORT = MODULE_INFO.port;
app.listen(PORT, () => {
  console.log(` ${MODULE_INFO.name} - Port ${PORT}`);
});