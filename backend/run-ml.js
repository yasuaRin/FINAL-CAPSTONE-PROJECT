import dotenv from 'dotenv';
import { trainAndSelect } from './src/ml/trainer.js';
import { predictAndSave } from './src/ml/predictor.js';

dotenv.config();

async function run() {
  console.log('🚀 Starting ML Pipeline...\n');
  
  try {
    // Step 1: Train and select best model
    console.log('📊 Step 1: Training models...');
    const result = await trainAndSelect();
    console.log(`✅ Best model: ${result.bestModel}`);
    console.log(`   Test MAE: ${result.metrics.test_mae}\n`);
    
    // Step 2: Generate predictions
    console.log('🔮 Step 2: Generating predictions...');
    const predictions = await predictAndSave();
    console.log(`✅ Saved ${predictions.saved} predictions to database\n`);
    
    console.log('🎉 ML Pipeline Complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

run();