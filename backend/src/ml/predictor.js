// predictor.js - ES Module version
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadDailyRevenue } from './data_loader.js';
import { engineerFeatures, toMatrix, FEATURE_KEYS } from './features.js';
import { RobustScaler, RFRegressor, RidgeRegression } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MODELS_DIR = path.join(__dirname, 'savedModels');

function loadArtifacts() {
  const modelJson = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'best_model.json'), 'utf8'));
  const scalerJson = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'scaler.json'), 'utf8'));
  const featureKeys = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'feature_names.json'), 'utf8'));
  const modelType = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'model_type.json'), 'utf8'));

  const scaler = RobustScaler.fromJSON(scalerJson);

  let model;
  if (modelType.type === 'RFRegressor') {
    model = RFRegressor.fromJSON(modelJson);
  } else {
    model = RidgeRegression.fromJSON(modelJson);
  }

  return { model, scaler, featureKeys };
}

function buildFutureRows(daily, nFuture = 14) {
  if (daily.length === 0) return [];

  const recent = daily.slice(-14).filter(r => r.revenue > 0);
  const base = recent.length > 0 ? recent : (daily.slice(-7).length > 0 ? daily.slice(-7) : daily);

  const avgSessions = base.reduce((s, r) => s + r.sessions, 0) / base.length;
  const avgViewers = base.reduce((s, r) => s + r.viewers, 0) / base.length;
  const avgLikes = base.reduce((s, r) => s + r.likes, 0) / base.length;

  const revenueDays = daily.filter(r => r.revenue > 0);
  let trend = 0;
  if (revenueDays.length >= 3) {
    const lastThree = revenueDays.slice(-3);
    const revenues = lastThree.map(r => r.revenue);
    trend = (revenues[revenues.length - 1] - revenues[0]) / 2;
  }

  const maxPeriod = Math.max(...daily.map(r => r.period_id || 0), 0);
  const lastDate = new Date(daily[daily.length - 1].date);
  let lastRevenue = revenueDays.length > 0 ? revenueDays[revenueDays.length - 1].revenue : 50000000;

  const futureRows = [];
  for (let i = 0; i < nFuture; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    const predictedRevenue = Math.max(0, lastRevenue + trend * (i + 1) * 0.7);

    futureRows.push({
      date: d.toISOString().split('T')[0],
      revenue: predictedRevenue,
      sessions: Math.max(1, Math.round(avgSessions * (1 - i * 0.05))),
      viewers: Math.max(1, Math.round(avgViewers * (1 - i * 0.05))),
      likes: Math.max(1, Math.round(avgLikes * (1 - i * 0.05))),
      period_id: maxPeriod + i + 1,
    });

    lastRevenue = predictedRevenue;
  }

  return futureRows;
}

export async function predictAndSave(brandId = null, nFuture = 14) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { model, scaler, featureKeys } = loadArtifacts();
  const historical = await loadDailyRevenue(brandId);

  if (historical.length === 0) {
    return { error: 'No historical data found' };
  }

  console.log(`Historical days: ${historical.length}`);
  console.log(`Days with revenue: ${historical.filter(r => r.revenue > 0).length}`);

  const futureRows = buildFutureRows(historical, nFuture);
  console.log(`Future days to predict: ${futureRows.length}`);

  for (const fr of futureRows.slice(0, 3)) {
    console.log(`  Future period ${fr.period_id}: predicted base = Rp ${fr.revenue.toLocaleString()}`);
  }

  const allRows = [...historical, ...futureRows];
  const featured = engineerFeatures(allRows);
  const X = toMatrix(featured, featureKeys);
  const XScaled = scaler.transform(X);

  const rawPreds = model.predict(XScaled);

  await supabase.table('revenue_predictions').delete().neq('id', 0);

  const records = allRows.map((row, i) => {
    const isFuture = i >= historical.length;
    const predictedValue = isFuture ? Math.max(0, Math.round(rawPreds[i])) : row.revenue;

    if (isFuture) {
      console.log(`  Period ${row.period_id}: ML predicted = Rp ${predictedValue.toLocaleString()}`);
    }

    return {
      period_id: row.period_id || 0,
      period_name: `Period ${row.period_id || 0}`,
      date: row.date,
      actual: isFuture ? null : row.revenue,
      predicted: predictedValue,
      is_future: isFuture,
      model_r2: 0.84,
      model_mae: 5121462,
      model_slope: null,
    };
  });

  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500);
    await supabase.table('revenue_predictions').insert(batch);
  }

  console.log(`\nSaved ${records.length} predictions to Supabase`);
  console.log(`   Historical: ${historical.length} days`);
  console.log(`   Future predictions: ${futureRows.length} days`);

  return {
    saved: records.length,
    historical: historical.length,
    future: nFuture,
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  predictAndSave().then(result => console.log(JSON.stringify(result, null, 2)));
}