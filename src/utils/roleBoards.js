const fs = require('node:fs');
const path = require('node:path');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed } = require('./embeds');

const FILE = path.join(__dirname, '..', '..', 'data', 'role-boards.json');
const MAX_ITEMS = 25; // Discord: 5 hàng x 5 nút
const MAX_BOARDS = 10;

function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return {}; }
}
function saveAll(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}
function useMongo() {
  try {
    return require('../db').isMongo();
  } catch { return false; }
}
const norm = (s) => String(s || '').trim().toLowerCase();

async function listBoards(guildId) {
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    return (await RoleBoard.find({ guildId }).lean().catch(() => []))
      .map((b) => ({ id: String(b._id), name: b.name, channelId: b.channelId, itemCount: (b.items || []).length }));
  }
  return Object.values(loadAll()[guildId] || {}).map((b) => ({ id: b.id, name: b.name, channelId: b.channelId, itemCount: (b.items || []).length }));
}

async function getBoard(guildId, nameOrId) {
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    const q = { guildId };
    if (/^[0-9a-f]{24}$/i.test(String(nameOrId || ''))) {
      return (await RoleBoard.findOne({ ...q, _id: nameOrId }).lean().catch(() => null)) || null;
    }
    return (await RoleBoard.find({ guildId }).lean().catch(() => []))
      .find((b) => norm(b.name) === norm(nameOrId)) || null;
  }
  const boards = loadAll()[guildId] || {};
  return boards[nameOrId] || Object.values(boards).find((b) => norm(b.name) === norm(nameOrId)) || null;
}

// Tìm bảng: theo tên, hoặc bảng duy nhất nếu chỉ có 1
async function resolveBoard(guildId, name) {
  const boards = useMongo()
    ? await require('../db').RoleBoard.find({ guildId }).lean().catch(() => [])
    : Object.values(loadAll()[guildId] || {});
  if (name) return boards.find((b) => norm(b.name) === norm(name)) || null;
  if (boards.length === 1) return boards[0];
  return boards.length ? 'MANY' : null;
}

async function createBoard(guildId, { name, channelId, title, description }) {
  const clean = String(name || '').trim().slice(0, 50);
  if (!clean) throw new Error('no-name');
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    const count = await RoleBoard.countDocuments({ guildId }).catch(() => 0);
    if (count >= MAX_BOARDS) throw new Error('limit');
    if (await RoleBoard.findOne({ guildId, name: { $regex: `^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })) {
      throw new Error('exists');
    }
    const doc = await RoleBoard.create({ guildId, name: clean, channelId: channelId || null, title: title || null, description: description || null, items: [] });
    return doc.toObject();
  }
  const all = loadAll();
  all[guildId] = all[guildId] || {};
  if (Object.keys(all[guildId]).length >= MAX_BOARDS) throw new Error('limit');
  if (Object.values(all[guildId]).some((b) => norm(b.name) === norm(clean))) throw new Error('exists');
  const id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  all[guildId][id] = { id, name: clean, channelId: channelId || null, messageId: null, title: title || null, description: description || null, items: [] };
  saveAll(all);
  return all[guildId][id];
}

async function saveBoard(guildId, boardId, patch) {
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[k] = v;
  }
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    await RoleBoard.updateOne({ guildId, _id: boardId }, { $set: clean }).catch(() => null);
    return getBoard(guildId, boardId);
  }
  const all = loadAll();
  if (!all[guildId]?.[boardId]) return null;
  all[guildId][boardId] = { ...all[guildId][boardId], ...clean };
  saveAll(all);
  return all[guildId][boardId];
}

async function deleteBoard(guildId, boardId) {
  const board = await getBoard(guildId, boardId);
  if (useMongo()) {
    const { RoleBoard } = require('../db');
    await RoleBoard.deleteOne({ guildId, _id: boardId }).catch(() => {});
  } else {
    const all = loadAll();
    if (all[guildId]) {
      delete all[guildId][boardId];
      saveAll(all);
    }
  }
  return board;
}

function boardIdOf(board) {
  return String(board._id || board.id);
}

function buildRows(board, withEmoji = true) {
  const rows = [];
  const items = board.items || [];
  for (let i = 0; i < items.length && rows.length < 5; i += 5) {
    const row = new ActionRowBuilder();
    for (const it of items.slice(i, i + 5)) {
      const btn = new ButtonBuilder()
        .setCustomId(`rpb:${boardIdOf(board)}:${it.roleId}`)
        .setLabel((it.label || 'Role').slice(0, 80))
        .setStyle(ButtonStyle.Secondary);
      if (withEmoji && it.emoji) {
        try { btn.setEmoji(it.emoji); } catch {}
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

async function renderBoard(client, guildId, nameOrId) {
  const board = typeof nameOrId === 'object' ? nameOrId : await getBoard(guildId, nameOrId);
  if (!board?.channelId || !board.items?.length) return null;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return null;
  const ch = await guild.channels.fetch(board.channelId).catch(() => null);
  if (!ch?.isTextBased()) {
    console.warn('[rolepanel] không tìm thấy kênh', board.channelId);
    return null;
  }
  const data = {
    embeds: [embed({
      title: board.title || '🎮 CHỌN ROLE',
      description: board.description || 'Bấm nút bên dưới để nhận / bỏ role.',
      footer: guild.name,
    })],
  };
  const bid = boardIdOf(board);
  const trySend = async (withEmoji) => {
    const rows = buildRows({ ...board, _id: bid, id: bid }, withEmoji);
    if (board.messageId) {
      const msg = await ch.messages.fetch(board.messageId).catch(() => null);
      if (msg) return msg.edit({ ...data, components: rows }).catch(() => null);
    }
    return ch.send({ ...data, components: rows }).catch(() => null);
  };
  let msg = await trySend(true);
  if (!msg) msg = await trySend(false); // emoji lỗi → vẽ lại không emoji
  if (msg && msg.id !== board.messageId) {
    if (useMongo()) {
      const { RoleBoard } = require('../db');
      await RoleBoard.updateOne({ guildId, _id: bid }, { $set: { messageId: msg.id } }).catch(() => {});
    } else {
      const all = loadAll();
      if (all[guildId]?.[bid]) {
        all[guildId][bid].messageId = msg.id;
        saveAll(all);
      }
    }
  }
  return msg;
}

module.exports = { listBoards, getBoard, resolveBoard, createBoard, saveBoard, deleteBoard, renderBoard, MAX_ITEMS, MAX_BOARDS };
