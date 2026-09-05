const { Events } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // 1) Lệnh slash — bọc trong player.context để nhạc chạy đúng guild
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      try {
        if (client.player?.context) {
          await client.player.context.provide({ guild: interaction.guild }, () => cmd.execute(interaction, client));
        } else {
          await cmd.execute(interaction, client);
        }
      } catch (err) {
        console.error(`[Lỗi lệnh /${interaction.commandName}]`, err);
        const payload = { embeds: [errorEmbed('Có lỗi khi chạy lệnh này.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
        else await interaction.reply(payload).catch(() => {});
      }
      return;
    }

    // 2) Chọn loại ticket (select menu)
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-select') {
      try {
        await require('../utils/tickets').handleSelect(interaction);
      } catch (err) {
        console.error('[Lỗi select]', err);
        if (!interaction.replied) await interaction.reply({ embeds: [errorEmbed('Có lỗi khi xử lý.')], ephemeral: true }).catch(() => {});
      }
      return;
    }

    // 3) Form lý do ticket (modal)
    if (interaction.isModalSubmit() && (interaction.customId || '').startsWith('ticket-modal:')) {
      try {
        await require('../utils/tickets').handleModal(interaction);
      } catch (err) {
        console.error('[Lỗi modal]', err);
        if (!interaction.replied) await interaction.reply({ embeds: [errorEmbed('Không tạo được ticket.')], ephemeral: true }).catch(() => {});
      }
      return;
    }

    // 4) Nút bấm (giveaway + ticket + đánh giá)
    if (interaction.isButton()) {
      const id = interaction.customId || '';
      try {
        if (id.startsWith('giveaway-join:')) {
          await require('../utils/giveaways').handleJoin(interaction, id.split(':')[1]);
          return;
        }
        if (id === 'ticket-create') {
          await require('../utils/tickets').handleCreate(interaction);
          return;
        }
        if (id.startsWith('ticket-close')) {
          await require('../utils/tickets').handleClose(interaction);
          return;
        }
        if (id.startsWith('ticket-claim')) {
          await require('../utils/tickets').handleClaim(interaction);
          return;
        }
        if (id === 'ticket-transcript' || id.startsWith('ticket-transcript')) {
          await require('../utils/tickets').handleTranscript(interaction);
          return;
        }
        if (id.startsWith('ticket-rate:')) {
          await require('../utils/tickets').handleRate(interaction);
          return;
        }
      } catch (err) {
        console.error('[Lỗi button]', err);
        if (!interaction.replied) await interaction.reply({ embeds: [errorEmbed('Có lỗi khi xử lý nút này.')], ephemeral: true }).catch(() => {});
      }
    }
  },
};
