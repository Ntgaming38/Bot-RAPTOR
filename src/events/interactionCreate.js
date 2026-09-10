const { Events } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // 1) Lệnh slash — bọc trong player.context để nhạc chạy đúng guild
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      // Lệnh bị tắt trên dashboard (trang Commands) → báo, không chạy
      try {
        const st = await require('../utils/guildSettings').getGuildSettings(interaction.guildId).catch(() => null);
        const off = st?.disabledCommands || [];
        if (Array.isArray(off) && off.includes(interaction.commandName)) {
          return interaction.reply({ embeds: [errorEmbed('Lệnh này đang tắt trên server (mở dashboard trang Commands để bật lại).')], ephemeral: true }).catch(() => {});
        }
      } catch {}
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

    // 2) Chọn loại ticket (select menu) + priority ticket + select-menu role
    if (interaction.isStringSelectMenu() && (interaction.customId === 'ticket-select' || interaction.customId === 'ticket-priority' || interaction.customId.startsWith('rps:'))) {
      try {
        if (interaction.customId === 'ticket-priority') {
          await require('../utils/ticketsPro').handlePriority(interaction);
        } else if (interaction.customId.startsWith('rps:')) {
          const bid = interaction.customId.split(':')[1];
          try {
            const rb = require('../utils/roleBoards');
            const board = await rb.getBoard(interaction.guildId, bid);
            if (!board) {
              await interaction.reply({ content: 'Bảng này không còn tồn tại.', ephemeral: true }).catch(() => {});
              return;
            }
            const out = [];
            for (const roleId of interaction.values || []) {
              const item = (board.items || []).find((i) => i.roleId === roleId);
              if (!item) continue;
              const r = await rb.toggleBoardRole(interaction.guild, interaction.member, board, item);
              out.push(r.action === 'added' ? `+${r.role.name}` : r.action === 'removed' ? `−${r.role.name}` : `⚠ ${r.reason}`);
            }
            await interaction.reply({ content: out.join('\n').slice(0, 2000) || 'Xong.', ephemeral: true }).catch(() => {});
          } catch (e) {
            console.error('[rps]', e?.message);
          }
        } else {
          await require('../utils/tickets').handleSelect(interaction);
        }
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

    // 4) Nút bấm (giveaway + ticket + đánh giá + chọn role)
    if (interaction.isButton()) {
      const id = interaction.customId || '';
      try {
        if (id.startsWith('role-toggle:')) {
          await require('../utils/rolePanels').handleToggle(interaction, id.split(':')[1]);
          return;
        }
        if (id.startsWith('rpb:')) {
          const [, bid, roleId] = id.split(':');
          try {
            const rb = require('../utils/roleBoards');
            const board = await rb.getBoard(interaction.guildId, bid);
            const item = board?.items?.find((i) => i.roleId === roleId);
            if (!board || !item) {
              await interaction.reply({ content: 'Bảng này không còn tồn tại.', ephemeral: true }).catch(() => {});
              return;
            }
            const r = await rb.toggleBoardRole(interaction.guild, interaction.member, board, item);
            const msg = r.action === 'added' ? `✅ Đã nhận role **${r.role.name}**!`
              : r.action === 'removed' ? `➖ Đã bỏ role **${r.role.name}**.`
              : `⚠️ ${r.reason}`;
            await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
          } catch (e) {
            console.error('[rpb]', e?.message);
          }
          return;
        }
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
        if (id === 'ticket-reopen') {
          await require('../utils/ticketsPro').handleReopen(interaction);
          return;
        }
        if (id === 'ticket-delete') {
          await require('../utils/ticketsPro').handleDeleteNow(interaction);
          return;
        }
        if (id === 'welcome-accept') {
          // Nút đồng ý luật trên tin welcome → cấp role
          try {
            const st = await require('../utils/welcomeSettings').getWelcomeSettings(interaction.guildId).catch(() => null);
            if (!st?.acceptRoleId) {
              await interaction.reply({ content: 'Bảng này chưa cài role đồng ý luật.', ephemeral: true }).catch(() => {});
              return;
            }
            const member = interaction.member;
            if (member.roles.cache.has(st.acceptRoleId)) {
              await interaction.reply({ content: 'Bạn đã xác nhận rồi nhé!', ephemeral: true }).catch(() => {});
              return;
            }
            await member.roles.add(st.acceptRoleId).catch(() => null);
            if (!member.roles.cache.has(st.acceptRoleId)) {
              await interaction.reply({ content: '⚠️ Không gắn được role (bot thiếu quyền hoặc role cao hơn bot).', ephemeral: true }).catch(() => {});
              return;
            }
            await interaction.reply({ content: '✅ Đã xác nhận! Chào mừng bạn.', ephemeral: true }).catch(() => {});
          } catch (e) {
            console.error('[welcome-accept]', e?.message);
          }
          return;
        }
      } catch (err) {
        console.error('[Lỗi button]', err);
        if (!interaction.replied) await interaction.reply({ embeds: [errorEmbed('Có lỗi khi xử lý nút này.')], ephemeral: true }).catch(() => {});
      }
    }
  },
};
