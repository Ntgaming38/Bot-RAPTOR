const express = require('express');
const config = require('./config');

function startKeepAlive() {
  const app = express();
  app.get('/', (req, res) => res.send('🤖 Bot đang online 24/24!'));
  app.get('/health', (req, res) => res.json({ status: 'online', uptime: process.uptime() }));

  app.listen(config.port, () => {
    console.log(`🌐 Keep-alive server chạy ở port ${config.port}`);
  });
}

if (require.main === module) {
  startKeepAlive();
}

module.exports = { startKeepAlive };
