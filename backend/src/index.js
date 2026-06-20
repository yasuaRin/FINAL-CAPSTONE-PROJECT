import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT ML MODULES (JavaScript versions) - WITH ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────
let trainAndSelect, predictAndSave;

try {
  const trainer = await import('./ml/trainer.js');
  const predictor = await import('./ml/predictor.js');
  trainAndSelect = trainer.trainAndSelect;
  predictAndSave = predictor.predictAndSave;
  console.log('[ML] ✅ ML modules loaded successfully');
} catch (error) {
  console.error('[ML] ❌ Failed to load ML modules:', error.message);
  trainAndSelect = async () => ({ 
    error: 'ML module not available', 
    message: 'Please ensure all ML files are present in the repository' 
  });
  predictAndSave = async () => ({ 
    error: 'ML module not available', 
    message: 'Please ensure all ML files are present in the repository' 
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Loading .env from:', path.join(__dirname, '../.env'));
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
// CORS - Allow frontend domains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://vidhelp-capstone.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(compression());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// ROOT ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VidHelp Backend API is running!',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      train: '/api/ml/train',
      predict: '/api/ml/predict',
      retrain: '/api/ml/retrain',
      status: '/api/ml/status'
    }
  });
});

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
// ML MODEL ENDPOINTS (Now using JavaScript with error handling)
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/ml/train', async (req, res) => {
  console.log('[ML] Starting model training...');
  
  try {
    const result = await trainAndSelect();
    res.json({ 
      success: true, 
      message: 'Models trained successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ML] Training error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Model training failed',
      details: error.message 
    });
  }
});

app.post('/api/ml/predict', async (req, res) => {
  const { periods = 14 } = req.body;
  console.log(`[ML] Generating predictions for ${periods} future periods...`);
  
  try {
    const result = await predictAndSave(null, periods);
    res.json({ 
      success: true, 
      message: `Generated predictions for ${periods} periods`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ML] Prediction error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Prediction failed',
      details: error.message 
    });
  }
});

app.post('/api/ml/retrain', async (req, res) => {
  console.log('[ML] Full retrain + predict workflow started...');
  
  try {
    // Step 1: Train
    const trainResult = await trainAndSelect();
    console.log('[ML] Training complete');
    
    // Step 2: Predict
    const predictResult = await predictAndSave(null, 14);
    console.log('[ML] Predictions generated');
    
    res.json({ 
      success: true, 
      message: 'Models retrained and predictions generated successfully',
      data: {
        training: trainResult,
        prediction: predictResult
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ML] Retrain error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Retrain failed',
      details: error.message 
    });
  }
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
    const metricsPath = path.join(__dirname, 'ml', 'savedModels', 'model_comparison.json');
    
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

app.post('/api/team/create-admin', async (req, res) => {
  try {
    const { name, email, phone, password, role, status, avatar_url } = req.body;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

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

app.post('/api/team/create-super-admin', async (req, res) => {
  try {
    const { name, email, phone, password, role, status, avatar_url } = req.body;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

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
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER - RAILWAY COMPATIBLE (FIXED)
// ─────────────────────────────────────────────────────────────────────────────
// PORT is already declared at line 28 - using the existing one
app.listen(PORT, '0.0.0.0', () => {
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
╠═══════════════════════════════════════════════════════════════════════════════╣
║   Environment:  ${process.env.NODE_ENV || 'development'}                                      ║
║   Status:       Operational                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;