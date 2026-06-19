const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load .env from parent dir

const app = express();
const PORT = 3000;

// Dynamic config endpoint for client-side
app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`
    window.__SOLE_CONFIG = {
      apiKey: "${process.env.FIREBASE_API_KEY || ''}",
      authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
      projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
      storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
      messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
      appId: "${process.env.FIREBASE_APP_ID || ''}"
    };
  `);
});

// Serve all static files from current folder
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'store.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'checkout.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log('✅ SOLE is running at http://localhost:' + PORT);
});