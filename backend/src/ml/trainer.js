// trainer.js - ES Module version
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDailyRevenue } from './data_loader.js';
import { engineerFeatures, toMatrix, FEATURE_KEYS } from './features.js';
import { RobustScaler, RidgeRegression, RFRegressor, mae, r2, mape } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, 'savedModels');
if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

function loocv(ModelClass, modelArgs, X, y) {
  const n = X.length;
  const preds = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
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

export async function trainAndSelect(brandId = null) {
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

  console.log('\nRunning LOOCV...');
  const results = {};

  for (const cand of candidates) {
    const scores = loocv(cand.cls, cand.args, XScaled, y);
    results[cand.name] = scores;
    console.log(`   ${cand.name}: MAE=${scores.mae.toFixed(0)} | R2=${scores.r2.toFixed(4)} | MAPE=${scores.mape.toFixed(1)}%`);
  }

  const bestName = Object.entries(results).reduce((best, [name, s]) =>
    s.mae < results[best].mae ? name : best
  , Object.keys(results)[0]);

  const bestCand = candidates.find(c => c.name === bestName);
  console.log(`\nBest: ${bestName}`);

  const bestModel = new bestCand.cls(...bestCand.args);
  bestModel.fit(XScaled, y);

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

  return { bestModel: bestName, scores: results, nSamples: daily.length };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  trainAndSelect().then(result => {
    console.log('\nTraining completed!');
    console.log(JSON.stringify(result, null, 2));
  });
}