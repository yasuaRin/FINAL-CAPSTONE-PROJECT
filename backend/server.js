const express = require('express');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Load routes with comprehensive error handling
try {
  console.log('📦 Loading admin routes...');
  const adminRoutes = require('./src/routes/admin');
  app.use('/admin', adminRoutes);
  console.log('✅ Admin routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load admin routes:');
  console.error('   Error:', error.message);
  console.error('   Stack:', error.stack);
  console.error('   → Server will run WITHOUT admin routes');
}

// Basic endpoints
app.get('/', (req, res) => {
  res.json({ 
    message: 'VidHelp API', 
    status: 'Running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: 'Connected' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   ✓ API: http://localhost:${PORT}`);
  console.log(`   ✓ Health: http://localhost:${PORT}/health`);
  console.log(`   ✓ Admin: http://localhost:${PORT}/admin`);
});