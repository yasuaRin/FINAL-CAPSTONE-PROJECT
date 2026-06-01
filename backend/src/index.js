import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get current directory (ONCE)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder (one level up from src)
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Loading .env from:', path.join(__dirname, '../.env'));
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing');

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

import revenueRoutes from './routes/revenueRoutes.js';


// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE - FIXED CORS
// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE CORS - Allows all origins (for development)
app.use(cors({
  origin: true,  // Allows any origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


//app.use(helmet({
//crossOriginResourcePolicy: { policy: "cross-origin" }
//}));
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/revenue', revenueRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// ML MODEL PATHS
// ─────────────────────────────────────────────────────────────────────────────
const ML_DIR = path.join(__dirname, 'ml');
const TRAIN_SCRIPT = path.join(ML_DIR, 'trainer.py');
const PREDICT_SCRIPT = path.join(ML_DIR, 'predictor.py');

// Check if ML scripts exist
import fs from 'fs';
console.log('[ML] Train script exists:', fs.existsSync(TRAIN_SCRIPT));
console.log('[ML] Predict script exists:', fs.existsSync(PREDICT_SCRIPT));

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'VIDHELP Backend Operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ML MODEL ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/ml/train', async (req, res) => {
  console.log('[ML] Starting model training...');
  
  exec(`python "${TRAIN_SCRIPT}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('[ML] Training error:', error.message);
      console.error('[ML] stderr:', stderr);
      return res.status(500).json({ 
        success: false, 
        error: 'Model training failed',
        details: stderr 
      });
    }
    
    console.log('[ML] Training completed successfully');
    console.log('[ML] Output:', stdout.slice(-500));
    
    res.json({ 
      success: true, 
      message: 'Models trained successfully',
      output: stdout,
      timestamp: new Date().toISOString()
    });
  });
});

app.post('/api/ml/predict', async (req, res) => {
  const { periods = 4 } = req.body;
  console.log(`[ML] Generating predictions for ${periods} future periods...`);
  
  exec(`python "${PREDICT_SCRIPT}" ${periods}`, (error, stdout, stderr) => {
    if (error) {
      console.error('[ML] Prediction error:', error.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Prediction failed',
        details: stderr 
      });
    }
    
    console.log('[ML] Predictions generated');
    
    res.json({ 
      success: true, 
      message: `Generated predictions for ${periods} periods`,
      output: stdout,
      timestamp: new Date().toISOString()
    });
  });
});

app.post('/api/ml/retrain', async (req, res) => {
  console.log('[ML] Full retrain + predict workflow started...');
  
  exec(`python "${TRAIN_SCRIPT}"`, (trainError, trainStdout, trainStderr) => {
    if (trainError) {
      console.error('[ML] Training failed:', trainError.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Training failed',
        details: trainStderr 
      });
    }
    
    console.log('[ML] Training complete, generating predictions...');
    
    exec(`python "${PREDICT_SCRIPT}" 4`, (predError, predStdout, predStderr) => {
      if (predError) {
        console.error('[ML] Prediction failed:', predError.message);
        return res.status(500).json({ 
          success: false, 
          error: 'Training succeeded but prediction failed',
          details: predStderr 
        });
      }
      
      console.log('[ML] Full workflow completed successfully');
      
      res.json({ 
        success: true, 
        message: 'Models retrained and predictions generated successfully',
        training_output: trainStdout.slice(-500),
        prediction_output: predStdout.slice(-500),
        timestamp: new Date().toISOString()
      });
    });
  });
});

app.get('/api/ml/status', async (req, res) => {
  try {
    const { data: predictions, error: predError } = await supabase
      .from('revenue_predictions')
      .select('*')
      .eq('is_future', true)
      .order('period_id', { ascending: true });
    
    if (predError) throw predError;
    
    const { data: metrics, error: metricsError } = await supabase
      .from('revenue_predictions')
      .select('model_r2, model_mae, created_at')
      .not('model_r2', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    
    res.json({ 
      success: true, 
      data: {
        hasPredictions: predictions?.length > 0,
        predictionsCount: predictions?.length || 0,
        predictions: predictions,
        modelMetrics: metrics?.[0] || null,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ML] Status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ml/metrics', async (req, res) => {
  try {
    const metricsPath = path.join(ML_DIR, 'savedModels', 'model_comparison.json');
    
    if (fs.existsSync(metricsPath)) {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      res.json({ success: true, data: metrics });
    } else {
      res.json({ success: true, data: null, message: 'No metrics available yet' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/revenue/predictions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('revenue_predictions')
      .select('*')
      .order('period_id', { ascending: true });
    
    if (error) throw error;
    
    const futurePredictions = data.filter(p => p.is_future === true);
    const historicalPredictions = data.filter(p => p.is_future === false);
    
    res.json({ 
      success: true, 
      data: {
        futurePredictions,
        historicalPredictions,
        all: data
      }
    });
  } catch (error) {
    console.error('Predictions fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/revenue/historical', async (req, res) => {
  try {
    const { brandId } = req.query;
    
    let query = supabase
      .from('live_sessions')
      .select('date, period_id, revenue_shopee, revenue_tiktok');
    
    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const periodMap = new Map();
    data.forEach(session => {
      const periodId = session.period_id;
      if (!periodMap.has(periodId)) {
        periodMap.set(periodId, {
          period_id: periodId,
          total_revenue: 0,
          date: session.date
        });
      }
      const revenue = (session.revenue_shopee || 0) + (session.revenue_tiktok || 0);
      periodMap.get(periodId).total_revenue += revenue;
    });
    
    const historical = Array.from(periodMap.values())
      .sort((a, b) => a.period_id - b.period_id);
    
    res.json({ success: true, data: historical });
  } catch (error) {
    console.error('Historical error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/revenue/summary', async (req, res) => {
  try {
    const { brandId } = req.query;
    
    let query = supabase
      .from('live_sessions')
      .select('revenue_shopee, revenue_tiktok, date');
    
    if (brandId && brandId !== 'all') {
      query = query.eq('brand_id', brandId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const totalRevenue = data.reduce((sum, session) => {
      return sum + (session.revenue_shopee || 0) + (session.revenue_tiktok || 0);
    }, 0);
    
    res.json({ 
      success: true, 
      data: {
        total_revenue: totalRevenue,
        total_sessions: data.length,
        period: 'all_time'
      }
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BRANDS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/brands', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('brand_name');
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/brands/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('brand_id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/brands', async (req, res) => {
  try {
    const { brand_name, brand_category, brand_status } = req.body;
    const { data, error } = await supabase
      .from('brands')
      .insert([{ brand_name, brand_category, brand_status }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/brands/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .update(req.body)
      .eq('brand_id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/brands/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('brand_id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true, message: 'Brand deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEAM ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/team', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('name');
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE STAFF
app.post('/api/team/create-staff', async (req, res) => {
  try {
    const { name, email, phone, role, status, avatar_url } = req.body;

    const { data, error } = await supabase
      .from('team_members')
      .insert([{
        name,
        email,
        phone,
        role_description: role,
        status,
        avatar_url,
        role: 'staff',
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE ADMIN
app.post('/api/team/create-admin', async (req, res) => {
  try {
    const { name, email, phone, password, role, status, avatar_url } = req.body;

    // 1. Buat akun di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Simpan ke tabel team_members
    const { data, error } = await supabase
      .from('team_members')
      .insert([{
        name,
        email,
        phone: phone || null,
        role_description: role || null,
        status: status || 'active',
        avatar_url: avatar_url || null,
        role: role || 'admin',
        auth_user_id: authData.user.id,
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE SUPER ADMIN
app.post('/api/team/create-super-admin', async (req, res) => {
  try {
    const { name, email, phone, password, role, status, avatar_url } = req.body;

    // 1. Buat akun di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Simpan ke tabel team_members
    const { data, error } = await supabase
      .from('team_members')
      .insert([{
        name,
        email,
        phone: phone || null,
        role_description: role || null,
        status: status || 'active',
        avatar_url: avatar_url || null,
        role: role || 'super_admin',
        auth_user_id: authData.user.id,
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Create super admin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// UPDATE MEMBER
app.post('/api/team/update-member', async (req, res) => {
  try {
    const { id, name, phone, status, avatar_url, roleDescription } = req.body;

    const { data, error } = await supabase
      .from('team_members')
      .update({
        name,
        phone,
        status,
        avatar_url,
        role_description: roleDescription,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE MEMBER
app.post('/api/team/delete-member', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'ID is required.' });

    const { data: member, error: fetchError } = await supabase
      .from('team_members')
      .select('id, auth_user_id')
      .eq('id', id)
      .single();

    if (fetchError || !member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    if (member.auth_user_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(member.auth_user_id);
      if (authError) throw authError;
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Member deleted' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  res.json({ success: true, message: 'Auth endpoint - implement your logic' });
});

app.post('/api/auth/logout', async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Endpoint ${req.method} ${req.url} not found` 
  });
});

app.use((err, req, res, next) => {
  console.error('[Server] Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              VIDHELP BACKEND SERVER                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║   Server:       http://localhost:${PORT}                                      ║
║   Health:       http://localhost:${PORT}/health                              ║
║   ML Train:     POST http://localhost:${PORT}/api/ml/train                   ║
║   ML Predict:   POST http://localhost:${PORT}/api/ml/predict                 ║
║   ML Retrain:   POST http://localhost:${PORT}/api/ml/retrain                 ║
║   ML Status:    GET  http://localhost:${PORT}/api/ml/status                  ║
║   ML Metrics:   GET  http://localhost:${PORT}/api/ml/metrics                 ║
║   Revenue Pred: GET  http://localhost:${PORT}/api/revenue/predictions        ║
║   Brands:       GET  http://localhost:${PORT}/api/brands                     ║
║   Team:         GET  http://localhost:${PORT}/api/team                       ║
║   Create Staff: POST http://localhost:${PORT}/api/team/create-staff          ║
║   Create Admin: POST http://localhost:${PORT}/api/team/create-admin          ║
║   Create SAdmin:POST http://localhost:${PORT}/api/team/create-super-admin    ║
║   Update Member:POST http://localhost:${PORT}/api/team/update-member         ║
║   Delete Member:POST http://localhost:${PORT}/api/team/delete-member         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║   Environment:  ${process.env.NODE_ENV || 'development'}                                      ║
║   Status:       Operational                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;