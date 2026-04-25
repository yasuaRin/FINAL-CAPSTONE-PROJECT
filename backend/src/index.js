import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import revenueRoutes from './routes/revenueRoutes.js';
import brandsRoutes from './routes/brandsRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import leadsRoutes from './routes/leadsRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic CORS - accepts any localhost port
const allowedOrigins = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/
];

// Single CORS middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Other middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'VIDHELP Backend is running',
    timestamp: new Date().toISOString() 
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/leads', leadsRoutes);

// 404 handler - FIXED: Use function with (req, res) instead of '*'
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Local:  http://localhost:${PORT}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});