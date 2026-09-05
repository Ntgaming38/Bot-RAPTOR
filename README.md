# 🤖 Discord Bot 24/24 — discord.js v14 + Nhạc + Giveaway + Level + Ticket + Log

Bot hoàn chỉnh, chạy 24/24, lệnh slash `/`, dễ thêm chức năng mới.

## ✨ Chức năng

### Cơ bản
| Nhóm | Lệnh | Mô tả |
|------|------|-------|
| utility | `/ping` | Đo độ trễ bot |
| utility | `/help` | Liệt kê tất cả lệnh |
| utility | `/serverinfo` | Thông tin server |
| utility | `/userinfo [user]` | Thông tin người dùng |
| utility | `/avatar [user]` | Xem avatar |
| moderation | `/ban <user> [lydo]` | Ban member |
| moderation | `/kick <user> [lydo]` | Kick member |
| moderation | `/timeout <user> <phut> [lydo]` | Mute tạm thời |
| moderation | `/unban <user_id>` | Gỡ ban |
| moderation | `/clear <soluong>` | Xóa 1–100 tin nhắn |
| fun | `/say <noidung>` | Bot nhắc lại |
| fun | `/poll <cauhoi> <lua-chon>` | Tạo bình chọn (VD: `Có|Không`) |

### 🎵 Nhạc (cần vào kênh voice trước)
Vào voice rồi dùng:
- `/play <bài>` — phát nhạc YouTube / SoundCloud / link trực tiếp
- `/queue`, `/nowplaying`, `/skip`, `/pause`, `/resume`
- `/volume <0-100>`, `/loop <off/track/queue/autoplay>`, `/shuffle`, `/stop`
- Lưu ý: YouTube hay chặn bot. Nếu lỗi, thêm `YOUTUBE_COOKIE` trong `.env` (xem `.env.example`), hoặc dùng link SoundCloud / mp3 trực tiếp (luôn chạy).

### 🎉 Giveaway (nút tham gia, tự quay, giữ được khi restart)
- `/giveaway start <giai> <thoigian> [nguoithang]` — VD thời gian: `30s`, `10m`, `2h`, `1d`
- Member nhấn nút **Tham gia** trên tin nhắn giveaway
- `/giveaway end <message_id>` — kết thúc sớm
- `/giveaway reroll <message_id>` — roll lại
- Dữ liệu lưu ở `data/giveaways.json`, restart bot vẫn tự quay đúng giờ.

### 🏆 Level / XP
- Chat để nhận XP (15–25 XP / 60s, chỉnh trong `.env`: `XP_MIN/MAX/COOLDOWN`)
- Lên level tự báo tin nhắn (tắt bằng `LEVEL_UP_MESSAGE=false`)
- `/rank [user]`, `/leaderboard`
- Dữ liệu lưu ở `data/levels.json`.

### 🎫 Ticket
1. Set (tùy chọn) trong `.env`: `TICKET_CATEGORY_ID` (category chứa ticket), `TICKET_STAFF_ROLE_ID` (role staff)
2. `/ticket setup` trong kênh #hỗ-trợ → bot gửi bảng **Tạo ticket**
3. Member nhấn nút → bot tạo kênh riêng `ticket-ten`
4. Staff nhấn **Nhận ticket**, xong nhấn **Đóng ticket** (hoặc `/ticket close`)

### 🛡️ Log chi tiết (cần `LOG_CHANNEL_ID`)
Tự log vào 1 kênh:
- Xóa / sửa tin nhắn (kèm nội dung trước–sau)
- Member vào / rời, vào–rời–chuyển voice
- Ban / unban, kick/timeout/clear, mở/đóng ticket, xóa từ cấm

## 📁 Cấu trúc

```
src/
  index.js            ← chạy bot, khởi tạo Player nhạc, tự load commands + events
  deploy-commands.js  ← đăng ký lệnh slash (npm run deploy)
  config.js           ← đọc .env
  keepAlive.js        ← webserver giữ online
  commands/
    utility/ moderation/ fun/
    music/play.js, skip.js, stop.js, queue.js, nowplaying.js, pause.js, resume.js, volume.js, loop.js, shuffle.js
    giveaway/giveaway.js
    level/rank.js, leaderboard.js
    ticket/ticket.js
  events/
    ready.js, interactionCreate.js (lệnh + nút),
    messageCreate.js (lọc từ cấm + XP),
    messageDelete.js, messageUpdate.js, voiceStateUpdate.js,
    guildMemberAdd.js, guildMemberRemove.js, guildBanAdd.js, guildBanRemove.js
  utils/
    embeds.js, logger.js, levels.js, giveaways.js, tickets.js
data/                 ← levels.json, giveaways.json, tickets.json (tự tạo)
```

## 🚀 Cài đặt

### 1. Tạo bot
1. https://discord.com/developers/applications → New Application
2. Tab **Bot** → Reset Token → copy token
3. Bật intent: `SERVER MEMBERS`, `MESSAGE CONTENT`
4. **OAuth2 → URL Generator**: scopes `bot` + `applications.commands`, quyền `Administrator` (test) → mời bot
5. Lấy `CLIENT_ID` (General Information) và `GUILD_ID` (chuột phải server → Copy ID, cần bật Developer Mode)

### 2. Chạy
```bash
npm install
copy .env.example .env
# dán DISCORD_TOKEN, CLIENT_ID, GUILD_ID (+ LOG_CHANNEL_ID, YOUTUBE_COOKIE nếu có)
npm run deploy
npm start
```

### 3. Bật nhạc voice
- Trong Developer Portal không cần thêm gì, chỉ cần bot có quyền Connect/Speak trong kênh voice.
- Trên VPS Linux cài ffmpeg hệ thống nếu `ffmpeg-static` lỗi: `sudo apt install ffmpeg`.
- Deploy Render/Railway: start command `node src/index.js`.

## 🌙 Chạy 24/24
- **Railway/Render**: push GitHub → deploy, thêm biến môi trường như `.env`, `KEEP_ALIVE=true`. Xóa `GUILD_ID` để lệnh hiện global (~1h).
- **VPS + PM2**: `pm2 start ecosystem.config.js` → `pm2 save` → `pm2 startup`
- **Docker**: `docker build -t discord-bot .` → `docker run -d --restart always --env-file .env -p 3000:3000 discord-bot`
- **UptimeRobot**: ping `https://<app>/health` mỗi 5 phút.

## ➕ Thêm lệnh/event mới
- Lệnh: copy `src/commands/_mau.js.example` → `src/commands/<nhóm>/ten.js`, sửa, `npm run deploy`, restart.
- Event: tạo `src/events/ten.js` export `{ name, execute }`, restart là tự load.

## 🛟 Lỗi thường gặp
- **Lệnh không hiện:** chưa `npm run deploy`, thiếu scope `applications.commands` → mời lại. Lệnh global chờ ~1h, lúc dev để `GUILD_ID`.
- **Nhạc lỗi/No results:** YouTube chặn IP host free. Thêm `YOUTUBE_COOKIE`, hoặc dùng SoundCloud/link mp3.
- **Bot không vào voice:** thiếu quyền Connect/Speak, hoặc thiếu intent `GuildVoiceStates` (code đã bật sẵn).
- **`Used disallowed intents`:** bật Members + Message Content intent trên portal.
- **Không log:** chưa set `LOG_CHANNEL_ID`, bot không có quyền xem/gửi kênh log.
