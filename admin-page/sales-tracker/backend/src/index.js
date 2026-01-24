const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const MODULE_INFO = {
  name: 'Admin - Revenue Tracker',
  developer: 'Dadia',
  port: process.env.PORT || 5002,
  description: 'Detailed revenue tracking and analytics'
};

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    module: MODULE_INFO.name,
    developer: MODULE_INFO.developer,
    endpoints: [
      '/api/revenue/daily',
      '/api/revenue/platforms',
      '/api/revenue/trends',
      '/api/upload/excel'
    ]
  });
});

// Daily revenue
app.get('/api/revenue/daily', (req, res) => {
  res.json([
    { date: '2024-01-01', tiktok: 15456959, shopee: 0, total: 15456959 },
    { date: '2024-01-02', tiktok: 13033088, shopee: 15713792, total: 28746880 }
  ]);
});

// Platform comparison
app.get('/api/revenue/platforms', (req, res) => {
  res.json({
    tiktok: { revenue: 170922485, percentage: 53.6 },
    shopee: { revenue: 148001701, percentage: 46.4 },
    total: 318924186
  });
});

const PORT = MODULE_INFO.port;
app.listen(PORT, () => {
  console.log(` ${MODULE_INFO.name} - Port ${PORT}`);
});