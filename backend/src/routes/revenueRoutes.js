import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('RevenueRoutes - SUPABASE_URL:', process.env.SUPABASE_URL ? 'Loaded' : 'Missing');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// ENDPOINT 1: Compare Models
// POST /api/revenue/models/compare
// ─────────────────────────────────────────────────────────────
// router.post('/models/compare', async (req, res) => {
//   try {
//     res.json({ 
//       success: true, 
//       message: 'Model comparison - implement MLBridge or call Python directly',
//       output: 'Placeholder - implement compareModels()'
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// ─────────────────────────────────────────────────────────────
// ENDPOINT 2: Generate predictions using best model
// POST /api/revenue/predictions/generate
// ─────────────────────────────────────────────────────────────
router.post('/predictions/generate', async (req, res) => {
  try {
    const { periods = 4 } = req.body;
    
    const { exec } = await import('child_process');
    const predictScript = path.join(__dirname, '../ml/predictor.py');
    
    exec(`python "${predictScript}" ${periods}`, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      res.json({ 
        success: true, 
        message: `Generated predictions for ${periods} periods`,
        output: stdout
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT 3: Get model comparison results
// GET /api/revenue/models/comparison
// ─────────────────────────────────────────────────────────────
router.get('/models/comparison', async (req, res) => {
  try {
    const fs = await import('fs');
    const comparisonPath = path.join(__dirname, '../ml/savedModels/model_comparison.json');
    
    if (fs.existsSync(comparisonPath)) {
      const comparison = JSON.parse(fs.readFileSync(comparisonPath, 'utf8'));
      res.json({ success: true, data: comparison });
    } else {
      res.json({ success: true, data: null, message: 'No comparison data available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT 4: Get all predictions for dashboard
// GET /api/revenue/predictions
// ─────────────────────────────────────────────────────────────
router.get('/predictions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('revenue_predictions')
      .select('*')
      .order('period_id', { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT 5: Get predictions separated (future vs historical)
// GET /api/revenue/predictions/separated
// ─────────────────────────────────────────────────────────────
router.get('/predictions/separated', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('revenue_predictions')
      .select('*')
      .order('period_id', { ascending: true });

    if (error) throw error;

    const futurePredictions = data.filter(item => item.is_future === true);
    const historicalPredictions = data.filter(item => item.is_future === false);

    res.json({
      success: true,
      data: {
        futurePredictions,
        historicalPredictions,
        all: data
      }
    });
  } catch (error) {
    console.error('Predictions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT 6: Get historical revenue grouped by period
// GET /api/revenue/historical
// ─────────────────────────────────────────────────────────────
router.get('/historical', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('period_id, revenue_shopee, revenue_tiktok, date');

    if (error) throw error;

    const periodMap = new Map();
    data.forEach(session => {
      const periodId = session.period_id;
      const revenue = (session.revenue_shopee || 0) + (session.revenue_tiktok || 0);
      
      if (!periodMap.has(periodId)) {
        periodMap.set(periodId, {
          period_id: periodId,
          total_revenue: 0,
          date: session.date
        });
      }
      periodMap.get(periodId).total_revenue += revenue;
    });

    const historical = Array.from(periodMap.values())
      .sort((a, b) => a.period_id - b.period_id);

    res.json({ success: true, data: historical });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT 7: Get revenue summary for KPIs
// GET /api/revenue/summary
// ─────────────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
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

export default router;