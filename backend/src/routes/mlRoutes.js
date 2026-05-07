const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);
const router = express.Router();

// Paths to Python scripts
const TRAIN_SCRIPT = path.join(__dirname, '../ml/trainer.py');
const PREDICT_SCRIPT = path.join(__dirname, '../ml/predictor.py');

let isRunning = false;
let lastResult = null;

// POST /api/ml/retrain - Train + Predict
router.post('/retrain', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: 'Training already in progress' });
  }

  const { brand_id = null, n_future = 4 } = req.body;
  isRunning = true;

  try {
    console.log('Starting ML training...');
    
    // Step 1: Train model
    const trainCmd = `python "${TRAIN_SCRIPT}" ${brand_id || ''}`;
    const { stdout: trainOut, stderr: trainErr } = await execPromise(trainCmd);
    
    if (trainErr) {
      throw new Error(`Training failed: ${trainErr}`);
    }
    console.log('Training complete:', trainOut.slice(-200));
    
    // Step 2: Generate predictions
    const predictCmd = `python "${PREDICT_SCRIPT}" ${n_future}`;
    const { stdout: predOut, stderr: predErr } = await execPromise(predictCmd);
    
    if (predErr) {
      throw new Error(`Prediction failed: ${predErr}`);
    }
    
    lastResult = {
      success: true,
      message: 'Model retrained and predictions generated',
      trainingOutput: trainOut.slice(-500),
      completedAt: new Date().toISOString()
    };
    
    res.json(lastResult);
  } catch (err) {
    lastResult = { error: err.message };
    res.status(500).json({ error: err.message });
  } finally {
    isRunning = false;
  }
});

// GET /api/ml/status
router.get('/status', (req, res) => {
  res.json({ isRunning, lastResult });
});

// POST /api/ml/predict - Predict only
router.post('/predict', async (req, res) => {
  try {
    const { n_future = 4 } = req.body;
    const predictCmd = `python "${PREDICT_SCRIPT}" ${n_future}`;
    const { stdout, stderr } = await execPromise(predictCmd);
    
    if (stderr) {
      throw new Error(stderr);
    }
    
    res.json({ 
      success: true, 
      message: 'Predictions generated',
      output: stdout.slice(-500)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;