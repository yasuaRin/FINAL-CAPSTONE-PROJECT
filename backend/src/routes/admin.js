const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync');

// Admin dashboard (Beautiful HTML page)
router.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VidHelp Admin API</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      width: 100%;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header h1 {
      color: white;
      font-size: 2.5rem;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .header p {
      color: rgba(255,255,255,0.9);
      font-size: 1.1rem;
      margin-top: 10px;
    }

    .status-badge {
      display: inline-block;
      background: #4ade80;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 25px;
      margin-bottom: 30px;
    }

    .card {
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.25);
    }

    .card h2 {
      color: #667eea;
      font-size: 1.5rem;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card h2 svg {
      width: 24px;
      height: 24px;
    }

    .endpoint {
      background: #f8fafc;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 8px;
      transition: background 0.3s ease;
    }

    .endpoint:hover {
      background: #e0e7ff;
    }

    .endpoint-method {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.85rem;
      margin-right: 10px;
    }

    .endpoint-path {
      font-family: 'Courier New', monospace;
      color: #1e293b;
      font-weight: 600;
    }

    .endpoint-desc {
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 5px;
    }

    .quick-actions {
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .quick-actions h2 {
      color: #667eea;
      font-size: 1.5rem;
      margin-bottom: 20px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }

    .action-btn {
      padding: 15px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    .action-btn.secondary {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .footer {
      text-align: center;
      color: rgba(255,255,255,0.7);
      font-size: 0.9rem;
      margin-top: 30px;
    }

    @media (max-width: 768px) {
      .cards {
        grid-template-columns: 1fr;
      }
      
      .header h1 {
        font-size: 2rem;
      }
      
      .card, .quick-actions {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 VidHelp Admin API</h1>
      <p>Live Selling Analytics Platform</p>
      <div class="status-badge">✅ API Status: Ready</div>
    </div>

    <div class="cards">
      <div class="card">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Available Endpoints
        </h2>
        
        <div class="endpoint">
          <div>
            <span class="endpoint-method">POST</span>
            <span class="endpoint-path">/admin/sync/:brandSlug</span>
          </div>
          <div class="endpoint-desc">Sync data for a specific brand from Google Sheets</div>
        </div>

        <div class="endpoint">
          <div>
            <span class="endpoint-method">POST</span>
            <span class="endpoint-path">/admin/sync-all</span>
          </div>
          <div class="endpoint-desc">Sync all brands (use scripts/sync.js for full sync)</div>
        </div>
      </div>

      <div class="card">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Start Guide
        </h2>
        
        <div style="line-height: 1.8; color: #475569;">
          <p style="margin-bottom: 15px;">
            <strong>1. Sync a Brand:</strong><br>
            Use Postman or PowerShell to POST to <code>/admin/sync/yves-rocher</code>
          </p>
          
          <p style="margin-bottom: 15px;">
            <strong>2. Test in PowerShell:</strong><br>
            <code style="background: #f1f5f9; padding: 8px; border-radius: 6px; display: block; margin-top: 8px;">
Invoke-RestMethod -Uri "http://localhost:3000/admin/sync/yves-rocher" -Method POST
            </code>
          </p>
          
          <p>
            <strong>3. Frontend Integration:</strong><br>
            Use <code>fetch()</code> or <code>axios</code> from your React app to call these endpoints
          </p>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <h2>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
        Quick Actions
      </h2>
      
      <div class="actions-grid">
        <a href="/health" class="action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Check Health
        </a>
        
        <button class="action-btn secondary" onclick="testSync()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Test Sync (Yves Rocher)
        </button>
        
        <a href="https://www.postman.com/" target="_blank" class="action-btn" style="background: linear-gradient(135deg, #14171A 0%, #333639 100%);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9" />
          </svg>
          Open in Postman
        </a>
      </div>
    </div>

    <div class="footer">
      <p>VidHelp Admin API • Port 3000 • ${new Date().getFullYear()}</p>
    </div>
  </div>

  <script>
    function testSync() {
      const btn = event.target;
      const originalText = btn.innerHTML;
      
      btn.disabled = true;
      btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:20px;height:20px;margin-right:10px;"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /><animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></svg>Syncing...';
      
      fetch('/admin/sync/yves-rocher', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          alert('✅ Sync successful!\\n\\n' + JSON.stringify(data, null, 2));
        })
        .catch(error => {
          alert('❌ Sync failed: ' + error.message);
        })
        .finally(() => {
          btn.disabled = false;
          btn.innerHTML = originalText;
        });
    }
  </script>
</body>
</html>
  `);
});

// Sync endpoints
router.post('/sync/:brandSlug', syncController.syncBrand);
router.post('/sync-all', syncController.syncAll);

module.exports = router;