const express = require('express');
const config = require('./config');

function startKeepAlive() {
  const app = express();
  app.get('/', (req, res) => res.send('🤖 Bot đang online 24/24!'));
  app.get('/health', (req, res) => res.json({ status: 'online', uptime: process.uptime() }));

  try {
    require('./dashboard').mount(app);
  } catch (e) {
    console.warn('[dashboard] không bật được:', e?.message);
  }

  const server = app.listen(config.port, () => {
    console.log(`🌐 Keep-alive server chạy ở port ${config.port}`);
  });
  return { app, server };
}

if (require.main === module) {
  startKeepAlive();
}

module.exports = { startKeepAlive };
