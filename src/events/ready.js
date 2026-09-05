const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot online: ${client.user.tag}`);
    console.log(`📊 Phục vụ ${client.guilds.cache.size} server`);
  },
};
