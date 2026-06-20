// api.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { trainAndSelect } = require('./trainer');
const { predictAndSave } = require('./predictor');

const app = express();
app.use(express.json());

app.use(cors({
  origin: /http:\/\/.*:5173/,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
}));

const retrainStatus = {
  isRunning: false,
  lastResult: null,
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/ml/retrain', (req, res) => {
  if (retrainStatus.isRunning) {
    return res.status(409).json({ detail: 'Training already in progress' });
  }

  const { brand_id: brandId = null, n_future: nFuture = 14 } = req.body || {};

  async function runPipeline() {
    retrainStatus.isRunning = true;
    try {
      console.log('\n' + '='.repeat(60));
      console.log('STARTING ML TRAINING...');
      console.log('='.repeat(60));

      console.log('Training models on historical data...');
      const trainResult = await trainAndSelect(brandId);
      if (trainResult.error) {
        console.log('Training failed:', trainResult.error);
        retrainStatus.lastResult = trainResult;
        return;
      }

      console.log('Training completed successfully!');
      console.log('Best model:', trainResult.bestModel || 'Unknown');
      console.log('Scores:', trainResult.scores || 'N/A');

      console.log('Generating predictions...');
      const predResult = await predictAndSave(brandId, nFuture);

      console.log('Predictions saved to database!');
      console.log('Future predictions:', nFuture, 'periods');

      retrainStatus.lastResult = { ...trainResult, ...predResult, completed: true };

      console.log('\n' + '='.repeat(60));
      console.log('TRAINING COMPLETED SUCCESSFULLY!');
      console.log('='.repeat(60));
      console.log('Refresh your browser to see the forecast.\n');
    } catch (e) {
      console.log('Error during training:', e.message);
      retrainStatus.lastResult = { error: e.message, completed: false };
    } finally {
      retrainStatus.isRunning = false;
    }
  }

  runPipeline();
  res.json({ message: 'Training started', status: 'running' });
});

app.get('/api/ml/retrain/status', (req, res) => {
  res.json({
    is_running: retrainStatus.isRunning,
    last_result: retrainStatus.lastResult,
  });
});

app.post('/api/ml/predict', async (req, res) => {
  const { brand_id: brandId = null, n_future: nFuture = 14 } = req.body || {};
  try {
    const result = await predictAndSave(brandId, nFuture);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3001;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
============================================================
                    ML REVENUE FORECAST API
============================================================
  Server: http://localhost:${PORT}
  Retrain: POST /api/ml/retrain
  Status:  GET /api/ml/retrain/status
  Predict: POST /api/ml/predict
============================================================
    `);
  });
}

module.exports = app;