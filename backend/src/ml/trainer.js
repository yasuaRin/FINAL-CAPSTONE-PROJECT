import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadDailyRevenue } from './data_loader.js';
import { engineerFeatures, toMatrix, FEATURE_KEYS } from './features.js';
import { RobustScaler, RidgeRegression, RFRegressor, mae, r2, mape } from './models.js';
import { supabaseAdmin } from '../utils/supabase.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, 'savedModels');


try {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log('[ML] Created models directory:', MODELS_DIR);
  }
} catch (err) {
  console.warn('[ML] Could not create models directory:', err.message);
  // Fallback: use memory only
}

export let modelCache = {
  bestModel: null,
  scores: null,
  nSamples: 0,
  modelData: null,
  scalerData: null,
  featureKeys: null,
  timestamp: null
};

async function loocv(ModelClass, modelArgs, X, y, shouldCancel) {
  const n = X.length;
  const preds = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    if (shouldCancel()) return { cancelled: true };
    await new Promise((resolve) => setImmediate(resolve));

    const XTrain = X.filter((_, j) => j !== i);
    const yTrain = y.filter((_, j) => j !== i);

    const model = new ModelClass(...modelArgs);
    model.fit(XTrain, yTrain);
    preds[i] = model.predict([X[i]])[0];
  }

  return {
    mae: mae(y, preds),
    r2: r2(y, preds),
    mape: mape(y, preds),
  };
}

async function kfoldcv(ModelClass, modelArgs, X, y, k = 5, shouldCancel = () => false) {
  const n = X.length;
  const preds = new Array(n).fill(0);

  // Shuffle indices so folds aren't just contiguous date chunks
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const foldSize = Math.ceil(n / k);

  for (let f = 0; f < k; f++) {
    if (shouldCancel()) return { cancelled: true };
    await new Promise((resolve) => setImmediate(resolve));

    const testIdx = new Set(indices.slice(f * foldSize, (f + 1) * foldSize));
    if (testIdx.size === 0) continue;

    const XTrain = [], yTrain = [], XTest = [], testPositions = [];
    for (let i = 0; i < n; i++) {
      if (testIdx.has(i)) {
        XTest.push(X[i]);
        testPositions.push(i);
      } else {
        XTrain.push(X[i]);
        yTrain.push(y[i]);
      }
    }

    const model = new ModelClass(...modelArgs);
    model.fit(XTrain, yTrain);
    const foldPreds = model.predict(XTest);
    testPositions.forEach((origIdx, pos) => {
      preds[origIdx] = foldPreds[pos];
    });
  }

  return {
    mae: mae(y, preds),
    r2: r2(y, preds),
    mape: mape(y, preds),
  };
}

function crossValidate(ModelClass, modelArgs, X, y, shouldCancel) {
  const n = X.length;
  if (n <= 100) {
    return loocv(ModelClass, modelArgs, X, y, shouldCancel);
  }
  return kfoldcv(ModelClass, modelArgs, X, y, 5, shouldCancel);
}

export async function trainAndSelect(brandId = null, shouldCancel = () => false) {
  console.log('Loading daily revenue data...');
  const daily = await loadDailyRevenue(brandId);

  if (daily.length < 10) {
    return { error: `Not enough data - got ${daily.length} days, need at least 10` };
  }

  console.log(`Loaded ${daily.length} daily records`);
  console.log(`Date range: ${daily[0].date} to ${daily[daily.length - 1].date}`);

  const featured = engineerFeatures(daily);
  const X = toMatrix(featured, FEATURE_KEYS);
  const y = daily.map(row => row.revenue);

  const scaler = new RobustScaler();
  const XScaled = scaler.fitTransform(X);

  const candidates = [
    { name: 'Ridge (l=1)',    cls: RidgeRegression, args: [1.0] },
    { name: 'Ridge (l=10)',   cls: RidgeRegression, args: [10.0] },
    { name: 'Random Forest',  cls: RFRegressor,     args: [{ nEstimators: 100 }] },
  ];

  const cvMethod = daily.length <= 100 ? 'LOOCV' : 'k-fold CV (k=5)';
  console.log(`\nRunning ${cvMethod}...`);
  const results = {};

  for (const cand of candidates) {
      if (shouldCancel()) {
      console.log('[ML] Cancellation requested — stopping before', cand.name);
      return { cancelled: true };
    }
    await new Promise((resolve) => setImmediate(resolve));

    console.log(`   Evaluating ${cand.name}...`);
    const scores = await crossValidate(cand.cls, cand.args, XScaled, y, shouldCancel);
    if (scores.cancelled) {
            console.log('[ML] Cancellation requested — stopping mid', cand.name);
      return { cancelled: true };
    }
    results[cand.name] = scores;
    console.log(`   ${cand.name}: MAE=${scores.mae.toFixed(0)} | R2=${scores.r2.toFixed(4)} | MAPE=${scores.mape.toFixed(1)}%`);
  }

   if (shouldCancel()) {
    console.log('[ML] Cancellation requested — stopping before saving model');
    return { cancelled: true };
  }

const bestName = Object.entries(results).reduce((best, [name, s]) =>
    s.mae < results[best].mae ? name : best
  , Object.keys(results)[0]);

  const bestCand = candidates.find(c => c.name === bestName);

  const bestModel = new bestCand.cls(...bestCand.args);
  bestModel.fit(XScaled, y);

  try {
    fs.writeFileSync(
      path.join(MODELS_DIR, 'best_model.json'),
      JSON.stringify(bestModel.toJSON())
    );
    fs.writeFileSync(
      path.join(MODELS_DIR, 'scaler.json'),
      JSON.stringify(scaler.toJSON())
    );
    fs.writeFileSync(
      path.join(MODELS_DIR, 'feature_names.json'),
      JSON.stringify(FEATURE_KEYS)
    );
    fs.writeFileSync(
      path.join(MODELS_DIR, 'model_type.json'),
      JSON.stringify({ type: bestCand.cls.name, name: bestName })
    );
    fs.writeFileSync(
      path.join(MODELS_DIR, 'model_comparison.json'),
      JSON.stringify({ best: bestName, scores: results }, null, 2)
    );
    console.log('[ML] Models saved to filesystem');
    // Upload model files to Supabase Storage
    const files = [
      'best_model.json',
      'scaler.json',
      'feature_names.json',
      'model_type.json',
      'model_comparison.json'
    ];

    for (const file of files) {
      const filePath = path.join(MODELS_DIR, file);

      const { error } = await supabaseAdmin.storage
        .from('ml-models')
        .upload(file, fs.readFileSync(filePath), {
          upsert: true,
          contentType: 'application/json'
        });

      if (error) {
        console.error(`[ML] Failed to upload ${file}:`, error.message);
      } else {
        console.log(`[ML] Uploaded ${file} to Supabase Storage`);
      }
    }

  } catch (err) {
    console.warn('[ML] Could not save to filesystem (Vercel read-only):', err.message);
    console.log('[ML] Models saved to memory cache only');
  }

  modelCache = {
    bestModel: bestName,
    scores: results,
    nSamples: daily.length,
    modelData: bestModel.toJSON(),
    scalerData: scaler.toJSON(),
    featureKeys: FEATURE_KEYS,
    timestamp: new Date().toISOString()
  };

  return { bestModel: bestName, scores: results, nSamples: daily.length };
}


if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  trainAndSelect()
    .then(result => {
      console.log('\nTraining completed!');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('\n[ML] Training FAILED:', err);
      process.exitCode = 1;
    });
}

export function getCachedModel() {
  return modelCache;
}