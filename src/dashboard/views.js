function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CSS = `*{box-sizing:border-box}body{margin:0;background:#0f1115;color:#e6e8ec;font-family:system-ui,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:24px}
.card{background:#171a21;border:1px solid #262b36;border-radius:12px;padding:20px;margin:16px 0}
h1{font-size:22px;margin:8px 0 4px}h2{font-size:17px;margin:18px 0 8px;color:#b9c0cc}
.mut{color:#9aa3b2}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
label{display:block;font-size:13px;color:#9aa3b2;margin:12px 0 4px}
input,select,textarea{width:100%;background:#0f1115;color:#e6e8ec;border:1px solid #2c3340;border-radius:8px;padding:9px 10px;font-size:14px}
textarea{min-height:120px;resize:vertical;font-family:inherit}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}@media(max-width:700px){.grid{grid-template-columns:1fr}}
button{background:#5865f2;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:14px;cursor:pointer;margin:14px 8px 0 0}
button.ghost{background:#262b36}button:disabled{opacity:.5}
a{color:#8b9cf9}.tabs{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}.tab{padding:8px 14px;border-radius:8px;background:#262b36;cursor:pointer}.tab.on{background:#5865f2;color:#fff}
.srv{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #262b36;border-radius:10px;margin:10px 0;text-decoration:none;color:inherit}
.srv img{width:44px;height:44px;border-radius:50%;background:#262b36}.badge{font-size:11px;padding:2px 8px;border-radius:20px;background:#2c3340}.badge.ok{background:#1d4d2b;color:#7de2a8}.badge.no{background:#5a2b2b;color:#f2a3a3}
#toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#222836;border:1px solid #334;padding:10px 18px;border-radius:10px;display:none}`;

function shell(title, body, extra = '') {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — RAPTOR Dashboard</title><style>${CSS}</style></head><body><div class="wrap">${body}<div id="toast"></div></div><script>function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',3000)}</script>${extra}</body></html>`;
}

function login() {
  return shell('Đăng nhập', `<div class="card"><h1>🤖 RAPTOR Dashboard</h1><p class="mut">Đăng nhập bằng Discord để tùy chỉnh bot trên các server bạn quản lý.</p><a href="/dashboard/login"><button>Đăng nhập bằng Discord</button></a></div>`);
}

function home(user) {
  return shell('Chọn server', `<div class="row"><h1>👋 ${esc(user.username)}</h1><span style="flex:1"></span><a href="/dashboard/logout" class="mut">Đăng xuất</a></div><p class="mut">Chọn server để tùy chỉnh (chỉ hiện server bạn có quyền quản lý).</p><div id="list"><p class="mut">Đang tải...</p></div>`, `<script>
fetch('/dashboard/api/me').then(r=>r.json()).then(d=>{
  const el=document.getElementById('list');
  if(!d.guilds.length){el.innerHTML='<p class=mut>Không có server nào.</p>';return}
  el.innerHTML=d.guilds.map(g=>{
    const icon=g.icon?('https://cdn.discordapp.com/icons/'+g.id+'/'+g.icon+'.png'):'';
    const b=g.bot?'<span class=badge ok>bot đã vào</span>':'<span class=badge no>chưa mời bot</span>';
    return '<a class=srv href="/dashboard/'+g.id+'">'+(icon?'<img src="'+icon+'">':'<img>')+'<span><b>'+g.name.replace(/</g,'&lt;')+'</b><br>'+b+'</span></a>';
  }).join('');
}).catch(()=>toast('Lỗi tải server'));
</script>`);
}

function guild(gid) {
  return shell('Tùy chỉnh server', `<a href="/dashboard" class="mut">← Tất cả server</a><h1>⚙️ Tùy chỉnh</h1><div class="tabs"><div class="tab on" id="t-w">Welcome</div><div class="tab" id="t-l">Leaderboard</div><div class="tab" id="t-x">Level</div><div class="tab" id="t-m">Kiểm duyệt</div><div class="tab" id="t-t">Ticket</div><div class="tab" id="t-a">Thông báo</div><div class="tab" id="t-s">Trạng thái</div><div class="tab" id="t-r">Role</div><div class="tab" id="t-g">Goodbye</div><div class="tab" id="t-o">Logs</div><div class="tab" id="t-u">Music</div><div class="tab" id="t-v">Giveaway</div></div>
<div id="p-w" class="card"><h2>Welcome (giống BotGhost)</h2>
<div class="grid"><div><label>Kênh gửi welcome</label><select id="w-channel"></select></div><div><label>Tiêu đề (VD: By RAPTOR)</label><input id="w-title" placeholder="Để trống = theo tên server"></div>
<div><label>Kênh chọn role ✅</label><select id="w-role"></select></div><div><label>Kênh luật</label><select id="w-rules"></select></div>
<div><label>Kênh thông báo 🔊</label><select id="w-ann"></select></div><div><label>Kênh chat 💬</label><select id="w-chat"></select></div>
<div><label>Ảnh góc phải (link gif/png)</label><input id="w-image" placeholder="Để trống = icon server"></div><div><label>Màu viền</label><input id="w-color" type="color" value="#ff4d9d" style="height:40px;padding:2px"></div>
<div><label>Ảnh gạch ngang dưới embed (trống = cầu vồng mặc định)</label><input id="w-banner" placeholder="https://..."></div><div><label>Gạch cầu vồng 🌈</label><select id="w-rainbow"><option value="1">Bật</option><option value="0">Tắt</option></select></div>
<div><label>Reaction (cách nhau dấu phẩy)</label><input id="w-reactions" placeholder="🔥,✅"></div><div><label>Role tự gắn khi join</label><select id="w-autorole"></select></div></div>
<div><label>Soạn nội dung (trống = mẫu mặc định; biến {member} {tag} {server} {count} {role} {rules} {announce} {chat})</label><textarea id="w-desc" placeholder="➔ Chào mừng {member} đã tham gia {server}..."></textarea></div>
<button id="w-save">Lưu</button><button class="ghost" id="w-test">Gửi thử vào kênh welcome</button></div>
<div id="p-l" class="card" style="display:none"><h2>Leaderboard (BXH riêng)</h2>
<div class="grid"><div><label>Kênh đăng BXH</label><select id="l-channel"></select></div><div><label>Top mấy</label><input id="l-limit" type="number" min="3" max="25" value="10"></div></div>
<button id="l-save">Lưu</button><button class="ghost" id="l-refresh">Cập nhật ngay</button><p class="mut">Bot tự sửa tin BXH mỗi 10 phút.</p></div>
<div id="p-x" class="card" style="display:none"><h2>Level / XP</h2>
<div class="grid"><div><label>XP mỗi tin (tối thiểu)</label><input id="x-min" type="number" min="1" max="100" value="15"></div><div><label>XP mỗi tin (tối đa)</label><input id="x-max" type="number" min="1" max="100" value="25"></div>
<div><label>Chống spam: mỗi bao nhiêu giây mới tính XP</label><input id="x-cd" type="number" min="0" max="3600" value="60"></div><div><label>Thông báo khi lên level</label><select id="x-msg"><option value="1">Bật</option><option value="0">Tắt</option></select></div></div>
<button id="x-save">Lưu</button></div>
<div id="p-m" class="card" style="display:none"><h2>Kiểm duyệt & Log</h2>
<div><label>Từ cấm (cách nhau dấu phẩy) — bot tự xóa tin chứa từ này</label><input id="m-words" placeholder="vd: dm, cc, xxx"></div>
<div><label>Kênh log (xóa/sửa tin, vào/ra, voice, ticket...)</label><select id="m-log"></select></div>
<button id="m-save">Lưu</button></div>
<div id="p-t" class="card" style="display:none"><h2>Ticket (chi tiết)</h2>
<div class="grid"><div><label>Category chứa kênh ticket</label><select id="k-cat"></select></div><div><label>Role staff (xem mọi ticket)</label><select id="k-staff"></select></div></div>
<div><label>Ảnh panel Mở Ticket (link ảnh)</label><input id="k-img" placeholder="Để trống = không có ảnh"></div>
<div><label>Tiêu đề bảng panel</label><input id="k-title" placeholder="🎫 Bạn cần hỗ trợ - hãy mở ticket!"></div>
<div><label>Nội dung bảng panel</label><textarea id="k-desc" placeholder="Để trống = mẫu mặc định"></textarea></div>
<div class="grid"><div><label>Nút Nhận ticket</label><select id="k-claim"><option value="1">Hiện</option><option value="0">Ẩn</option></select></div><div><label>Nút Lịch sử</label><select id="k-trans"><option value="1">Hiện</option><option value="0">Ẩn</option></select></div></div>
<div class="grid"><div><label>Đánh giá sao khi đóng</label><select id="k-rate"><option value="1">Bật</option><option value="0">Tắt</option></select></div><div><label>Tự xóa kênh sau khi đóng (giây, 0–600)</label><input id="k-delay" type="number" min="0" max="600" value="5"></div></div>
<div><label>Các loại ticket (<span id="k-count">0</span>/10)</label><div id="k-types"></div></div>
<div class="grid"><div><label>Tên loại mới</label><input id="k-add-label" maxlength="25"></div><div><label>Mô tả ngắn</label><input id="k-add-desc" maxlength="100"></div></div>
<div class="grid"><div><label>Emoji</label><input id="k-add-emoji" maxlength="50" placeholder="🎫"></div><div><label>&nbsp;</label><button class="ghost" id="k-add" style="margin-top:0">+ Thêm loại</button></div></div>
<button id="k-save">Lưu</button><p class="mut">Áp dụng cho ticket mở mới và bảng panel gửi mới (dùng <b>/ticket setup</b> trong Discord).</p></div>
<div id="p-a" class="card" style="display:none"><h2>Bảng thông báo (ticker)</h2>
<div><label>Kênh đăng bảng</label><select id="a-channel"></select></div>
<div><label>Tiêu đề</label><input id="a-title" placeholder="📢 THÔNG BÁO"></div>
<div><label>Nội dung (biến {server} {members} — nhiều tin thì tách nhau bằng 1 dòng --- )</label><textarea id="a-text" placeholder="Server sẽ bảo trì lúc 22:00&#10;---&#10;Nhớ đọc luật trước khi chat"></textarea></div>
<div><label>Xoay tin mỗi mấy phút (0 = tĩnh, chỉ hiện tin đầu)</label><input id="a-min" type="number" min="0" max="1440" value="0"></div>
<div><label>Màu viền</label><input id="a-color" type="color" value="#5865f2" style="height:40px;padding:2px"></div>
<button id="a-save">Lưu</button><button class="ghost" id="a-test">Đăng ngay</button></div>
<div id="p-s" class="card" style="display:none"><h2>Trạng thái server</h2>
<div><label>Kênh voice làm bảng trạng thái (để trống = chưa bật)</label><select id="s-voice"></select></div>
<div><label>Mẫu tên kênh (biến {members} {online} {voice} {server})</label><input id="s-tpl" placeholder="🟢 ONLINE • 👥 {members} MEMBERS • 🎮 {voice} ONLINE"></div>
<div><label>Mẫu tên 5 kênh riêng — biến {n} là con số (VD: 👥・Tổng: {n})</label></div>
<div class="grid"><div><label>All Members</label><input id="s-n-all"></div><div><label>Members</label><input id="s-n-members"></div>
<div><label>Bots</label><input id="s-n-bots"></div><div><label>Channels</label><input id="s-n-channels"></div>
<div><label>Roles</label><input id="s-n-roles"></div></div>
<button id="s-save">Lưu</button><button class="ghost" id="s-refresh">Cập nhật ngay</button><button class="ghost" id="s-multi">Dựng 5 kênh kiểu mẫu</button><p class="mut">Chế độ 1 kênh: tự đổi tên mỗi 15 phút. Chế độ 5 kênh: All Members / Members / Bots / Channels / Roles riêng. Muốn đếm {online} thì bật <b>Presence Intent</b> trong Developer Portal.</p></div>
<div id="p-r" class="card" style="display:none"><h2>Bảng chọn role</h2>
<div><label>Bảng đang sửa</label><select id="r-board"></select></div>
<div class="grid"><div><label>Tên bảng mới (VD: Game, Màu sắc)</label><input id="r-new" maxlength="50"></div><div><label>&nbsp;</label><button id="r-create" style="margin-top:0">+ Tạo bảng</button></div></div>
<div id="r-import-wrap" style="display:none"><button class="ghost" id="r-import">Nhập bảng đơn cũ (/roles) thành board mới</button></div>
<div><label>Kênh đặt bảng</label><select id="r-channel"></select></div>
<div class="grid"><div><label>Tiêu đề</label><input id="r-title" placeholder="🎮 CHỌN ROLE"></div><div><label>Dòng hướng dẫn</label><input id="r-desc" placeholder="Bấm nút bên dưới để nhận / bỏ role"></div></div>
<div><label>Role trong bảng (<span id="r-count">0</span>/25)</label><div id="r-items"></div></div>
<div class="grid"><div><label>Thêm role</label><select id="r-add-role"></select></div><div><label>Chữ trên nút (trống = tên role)</label><input id="r-add-label" maxlength="80"></div></div>
<div><label>Emoji trên nút (VD: 🎮, trống = không có)</label><input id="r-add-emoji" maxlength="50"></div>
<button class="ghost" id="r-add">+ Thêm vào danh sách</button><br>
<button id="r-save">Lưu + vẽ bảng</button><button class="ghost" id="r-del">Xóa bảng này</button><p class="mut">Member bấm nút để nhận, bấm lại để bỏ. Bot phải có quyền Manage Roles và role bot nằm trên các role này.</p></div>
<div id="p-g" class="card" style="display:none"><h2>Tin nhắn tạm biệt</h2>
<div><label>Kênh gửi tin tạm biệt</label><select id="g-channel"></select></div>
<div><label>Tiêu đề</label><input id="g-title" placeholder="👋 Tạm biệt"></div>
<div><label>Nội dung (biến {user} {tag} {server} {members})</label><textarea id="g-text" placeholder="👋 {user} vừa rời {server}. Hẹn gặp lại!"></textarea></div>
<div><label>Ảnh (trống = avatar người rời)</label><input id="g-image" placeholder="https://..."></div>
<div><label>Màu viền</label><input id="g-color" type="color" value="#ed4245" style="height:40px;padding:2px"></div>
<button id="g-save">Lưu</button></div>
<div id="p-o" class="card" style="display:none"><h2>Log kiểu ProBot</h2>
<div><label>Kênh nhận log</label><select id="o-channel"></select></div>
<div><label>Bật/tắt từng loại</label><div id="o-types" class="grid"></div></div>
<button id="o-save">Lưu</button><p class="mut">Log nào tắt thì bot bỏ qua luôn, khỏi spam.</p></div>
<div id="p-u" class="card" style="display:none"><h2>Nhạc đang phát</h2>
<div id="u-state"><p class="mut">Đang tải...</p></div>
<div class="row"><button id="u-pause">⏸ Tạm dừng</button><button id="u-resume">▶ Tiếp tục</button><button id="u-skip">⏭ Skip</button><button class="ghost" id="u-stop">⏹ Dừng + xóa chờ</button></div>
<div class="grid"><div><label>Âm lượng (0–100)</label><input id="u-vol" type="number" min="0" max="100"></div><div><label>&nbsp;</label><button id="u-volset" style="margin-top:0">Đặt volume</button></div></div>
<div><label>Volume mặc định khi bắt đầu phát (trống = 100)</label><input id="u-defvol" type="number" min="0" max="100" placeholder="100"></div>
<p class="mut">Tự làm mới mỗi 10 giây. Thêm bài mới thì dùng lệnh <b>/play</b> trong Discord.</p></div>
<div id="p-v" class="card" style="display:none"><h2>Giveaway mặc định</h2>
<div><label>Kênh đăng giveaway mặc định</label><select id="v-channel"></select></div>
<div class="grid"><div><label>Số người thắng mặc định</label><input id="v-winners" type="number" min="1" max="20" value="1"></div><div><label>Thời gian mặc định (VD: 10m, 1h, 1d)</label><input id="v-duration" value="10m"></div></div>
<button id="v-save">Lưu</button><p class="mut">Lệnh <b>/giveaway start</b> chỉ cần ghi giải thưởng, còn lại lấy mặc định ở đây.</p></div>`, `<script>
const G='${esc(gid)}';
const $=id=>document.getElementById(id);
document.getElementById('t-w').onclick=e=>{t('t-w','p-w')};document.getElementById('t-l').onclick=e=>{t('t-l','p-l')};
document.getElementById('t-x').onclick=e=>{t('t-x','p-x')};document.getElementById('t-m').onclick=e=>{t('t-m','p-m')};document.getElementById('t-t').onclick=e=>{t('t-t','p-t')};
document.getElementById('t-a').onclick=e=>{t('t-a','p-a')};document.getElementById('t-s').onclick=e=>{t('t-s','p-s')};document.getElementById('t-r').onclick=e=>{t('t-r','p-r')};document.getElementById('t-g').onclick=e=>{t('t-g','p-g')};document.getElementById('t-o').onclick=e=>{t('t-o','p-o')};document.getElementById('t-u').onclick=e=>{t('t-u','p-u');loadMusic()};document.getElementById('t-v').onclick=e=>{t('t-v','p-v')};
function t(tab,page){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));document.getElementById(tab).classList.add('on');['p-w','p-l','p-x','p-m','p-t','p-a','p-s','p-r','p-g','p-o','p-u','p-v'].forEach(p=>document.getElementById(p).style.display='none');document.getElementById(page).style.display='block'}
function opt(sel,list,cur,allowEmpty){const s=$(sel);s.innerHTML=(allowEmpty?'<option value="">— không dùng —</option>':'')+list.map(o=>'<option value="'+o.id+'">'+o.name.replace(/</g,'&lt;')+'</option>').join('');if(cur)s.value=cur}
let META=null;
async function api(m,url,body){const r=await fetch(url,{method:m,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('Lỗi '+r.status));return d}
(async()=>{
  try{
    META=await api('GET','/dashboard/api/guilds/'+G+'/meta');
    const chs=META.channels, txt=[{id:'',name:'— không dùng —'}].concat(chs);CHS=txt;
    const fill=(id,v)=>opt(id,txt,v,true);
    const [w,l]=await Promise.all([api('GET','/dashboard/api/guilds/'+G+'/welcome'),api('GET','/dashboard/api/guilds/'+G+'/leaderboard')]);
    fill('w-channel',w.channelId);$('w-title').value=w.title||'';fill('w-role',w.roleChannelId);fill('w-rules',w.rulesChannelId);fill('w-ann',w.announceChannelId);fill('w-chat',w.chatChannelId);
    $('w-image').value=w.imageUrl||'';if(w.color)$('w-color').value=w.color;$('w-reactions').value=(w.reactions||[]).join(',');
    $('w-banner').value=w.bannerUrl||'';$('w-rainbow').value=w.bannerRainbow===false?'0':'1';$('w-desc').value=w.welcomeText||'';
    opt('w-autorole',[{id:'',name:'— không dùng —'}].concat(META.roles),w.autoRoleId,true);
    opt('l-channel',txt,l.channelId,true);$('l-limit').value=l.limit||10;
    const st=await api('GET','/dashboard/api/guilds/'+G+'/settings');
    $('x-min').value=st.xpMin??15;$('x-max').value=st.xpMax??25;$('x-cd').value=st.xpCooldownSec??60;$('x-msg').value=st.levelUpMessage===false?'0':'1';
    $('m-words').value=(st.bannedWords||'');opt('m-log',txt,st.logChannelId,true);
    opt('k-cat',[{id:'',name:'— tạo ở đầu server —'}].concat(META.categories||[]),st.ticketCategoryId,true);
    opt('k-staff',[{id:'',name:'— chỉ admin + chủ ticket —'}].concat(META.roles),st.ticketStaffRoleId,true);
    $('k-img').value=st.ticketPanelImageUrl||'';
    $('k-title').value=st.panelTitle||'';$('k-desc').value=st.panelDescription||'';
    $('k-claim').value=st.showClaim===false?'0':'1';$('k-trans').value=st.showTranscript===false?'0':'1';
    $('k-rate').value=st.showRating===false?'0':'1';$('k-delay').value=st.closeDelaySec??5;
    KTYPES=(st.ticketTypes||[]).map(t=>({label:t.label||'',description:t.description||'',emoji:t.emoji||''}));renderTypes();
    KTYPES=(st.ticketTypes||[]).map(t=>({label:t.label||'',description:t.description||'',emoji:t.emoji||''}));renderTypes();
    opt('v-channel',txt,st.giveawayChannelId,true);$('v-winners').value=st.giveawayWinners||1;$('v-duration').value=st.giveawayDuration||'10m';
    if(document.getElementById('u-defvol'))$('u-defvol').value=st.musicDefaultVolume??'';
    const an=await api('GET','/dashboard/api/guilds/'+G+'/announce');
    opt('a-channel',txt,an.channelId,true);$('a-title').value=an.title||'';$('a-text').value=an.text||'';$('a-min').value=an.intervalMin||0;if(an.color)$('a-color').value=an.color;if(an.color)$('a-color').value=an.color;
    const ss=await api('GET','/dashboard/api/guilds/'+G+'/stats');
    opt('s-voice',[{id:'',name:'— chưa bật —'}].concat(META.voice||[]),ss.voiceChannelId,true);$('s-tpl').value=ss.template||'';
    const dmn={all:'🔊 All Members: {n}',members:'🔊 Members: {n}',bots:'🔊 Bots: {n}',channels:'🔊 Channels: {n}',roles:'🔊 Roles: {n}',...(ss.multiNames||{})};
    $('s-n-all').value=dmn.all||'';$('s-n-members').value=dmn.members||'';$('s-n-bots').value=dmn.bots||'';$('s-n-channels').value=dmn.channels||'';$('s-n-roles').value=dmn.roles||'';
    const rp=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');
    RBOARDS=rp||[];RBID=RBOARDS.length?String(RBOARDS[0].id||RBOARDS[0]._id):'';
    // Bảng đơn cũ còn dữ liệu mà chưa có board nào → hiện nút nhập
    try{
      const legacy=await api('GET','/dashboard/api/guilds/'+G+'/roles');
      if(!RBOARDS.length&&(legacy.items||[]).length)document.getElementById('r-import-wrap').style.display='block';
    }catch(e){}
    opt('r-add-role',META.roles);renderBoards();await loadBoard();
    const gb=await api('GET','/dashboard/api/guilds/'+G+'/goodbye');
    opt('g-channel',txt,gb.channelId,true);$('g-title').value=gb.title||'';$('g-text').value=gb.text||'';$('g-image').value=gb.imageUrl||'';if(gb.color)$('g-color').value=gb.color;
    const lg=await api('GET','/dashboard/api/guilds/'+G+'/logs');
    opt('o-channel',txt,lg.channelId,true);
    $('o-types').innerHTML=lg.types.map(([k,l])=>'<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-k="'+k+'" style="width:auto"'+(lg.toggles[k]!==false?' checked':'')+'> '+l.replace(/</g,'&lt;')+'</label>').join('');
  }catch(e){toast('Lỗi tải: '+e.message+' (bot phải đã vào server và bạn là admin)')}
})();
$('w-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/welcome',{channelId:$('w-channel').value||null,title:$('w-title').value||null,roleChannelId:$('w-role').value||null,rulesChannelId:$('w-rules').value||null,announceChannelId:$('w-ann').value||null,chatChannelId:$('w-chat').value||null,imageUrl:$('w-image').value||null,color:$('w-color').value||null,reactions:$('w-reactions').value,autoRoleId:$('w-autorole').value||null,bannerUrl:$('w-banner').value||null,bannerRainbow:$('w-rainbow').value==='1',welcomeText:$('w-desc').value||null});toast('Đã lưu welcome')}catch(e){toast('Lỗi: '+e.message)}};
$('w-test').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/welcome/test');toast('Đã gửi thử! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh trước)')}};
$('l-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/leaderboard',{channelId:$('l-channel').value||null,limit:parseInt($('l-limit').value||'10',10)});toast('Đã lưu leaderboard')}catch(e){toast('Lỗi: '+e.message)}};
$('l-refresh').onclick=async()=>{try{await api('POST','/dashboard/api/guilds/'+G+'/leaderboard/refresh');toast('Đã cập nhật BXH')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh trước)')}};
function curSettings(){return{xpMin:parseInt($('x-min').value||'15',10),xpMax:parseInt($('x-max').value||'25',10),xpCooldownSec:parseInt($('x-cd').value||'60',10),levelUpMessage:$('x-msg').value==='1',bannedWords:$('m-words').value,logChannelId:$('m-log').value||null,ticketCategoryId:$('k-cat').value||null,ticketStaffRoleId:$('k-staff').value||null,ticketPanelImageUrl:$('k-img').value||null,panelTitle:$('k-title').value||null,panelDescription:$('k-desc').value||null,showClaim:$('k-claim').value==='1',showTranscript:$('k-trans').value==='1',showRating:$('k-rate').value==='1',closeDelaySec:parseInt($('k-delay').value||'5',10),ticketTypes:KTYPES,giveawayChannelId:$('v-channel').value||null,giveawayWinners:parseInt($('v-winners').value||'1',10),giveawayDuration:$('v-duration').value||null,musicDefaultVolume:$('u-defvol').value===''||$('u-defvol').value===null?null:parseInt($('u-defvol').value,10)}}
$('x-save').onclick=$('m-save').onclick=$('k-save').onclick=$('v-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/settings',curSettings());toast('Đã lưu')}catch(e){toast('Lỗi: '+e.message)}};
$('a-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/announce',{channelId:$('a-channel').value||null,title:$('a-title').value||null,text:$('a-text').value,intervalMin:parseInt($('a-min').value||'0',10),color:$('a-color').value||null});toast('Đã lưu bảng tin')}catch(e){toast('Lỗi: '+e.message)}};
$('a-test').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/announce/test');toast('Đã đăng bảng! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh + nội dung trước)')}};
$('s-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/stats',{voiceChannelId:$('s-voice').value||null,template:$('s-tpl').value||null,multiNames:{all:$('s-n-all').value||null,members:$('s-n-members').value||null,bots:$('s-n-bots').value||null,channels:$('s-n-channels').value||null,roles:$('s-n-roles').value||null}});toast('Đã lưu trạng thái')}catch(e){toast('Lỗi: '+e.message)}};
$('s-refresh').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/stats/refresh');toast('Đã cập nhật: '+d.name)}catch(e){toast('Lỗi: '+e.message+' (cần setup trước)')}};
$('s-multi').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/stats/setup-multi',{});toast('Đã dựng 5 kênh: '+d.line)}catch(e){toast('Lỗi: '+e.message+' (bot cần quyền Manage Channels)')}};
let RITEMS=[];let RBOARDS=[];let RBID='';let CHS=[{id:'',name:'— không dùng —'}];
let KTYPES=[];
function renderTypes(){$('k-count').textContent=KTYPES.length;$('k-types').innerHTML=KTYPES.length?KTYPES.map((t,n)=>'<div class=row style="padding:6px 0;border-bottom:1px solid #222"><span style="flex:1">'+(n+1)+'. '+(t.emoji||'')+' <b>'+String(t.label||'').replace(/</g,'&lt;')+'</b> <span class=mut>'+String(t.description||'').replace(/</g,'&lt;')+'</span></span><button class=ghost data-n="'+n+'" style="margin:0;padding:4px 10px">Xóa</button></div>').join(''):'<p class=mut>Trống = dùng 4 loại mặc định.</p>';document.querySelectorAll('#k-types button').forEach(b=>b.onclick=()=>{KTYPES.splice(parseInt(b.dataset.n,10),1);renderTypes()})}
$('k-add').onclick=()=>{const l=$('k-add-label').value.trim();if(!l)return toast('Nhập tên loại');if(KTYPES.length>=10)return toast('Tối đa 10 loại');KTYPES.push({label:l.slice(0,25),description:$('k-add-desc').value.slice(0,100),emoji:$('k-add-emoji').value||'🎫'});$('k-add-label').value='';$('k-add-desc').value='';$('k-add-emoji').value='';renderTypes()};
function rName(id){const r=(META.roles||[]).find(x=>x.id===id);return r?r.name:id}
function renderBoards(){opt('r-board',RBOARDS.map(b=>({id:String(b.id||b._id),name:b.name+' ('+(b.itemCount||0)+')'})),RBID)}
async function loadBoard(){if(!RBID){$('r-channel').value='';$('r-title').value='';$('r-desc').value='';RITEMS=[];renderItems();return}try{const b=await api('GET','/dashboard/api/guilds/'+G+'/roleboards/'+RBID);opt('r-channel',CHS,b.channelId,true);$('r-title').value=b.title||'';$('r-desc').value=b.description||'';RITEMS=(b.items||[]).map(i=>({roleId:i.roleId,label:i.label||'',emoji:i.emoji||''}));renderItems()}catch(e){toast('Lỗi tải bảng: '+e.message)}}
function renderItems(){$('r-count').textContent=RITEMS.length;$('r-items').innerHTML=RITEMS.length?RITEMS.map((i,n)=>'<div class=row style="padding:6px 0;border-bottom:1px solid #222"><span style="flex:1">'+(n+1)+'. <b>'+rName(i.roleId).replace(/</g,'&lt;')+'</b> '+(i.emoji||'')+' — nút: <b>'+(i.label||rName(i.roleId)).replace(/</g,'&lt;')+'</b></span><button class=ghost data-n="'+n+'" style="margin:0;padding:4px 10px">Xóa</button></div>').join(''):'<p class=mut>Chưa có role nào.</p>';document.querySelectorAll('#r-items button').forEach(b=>b.onclick=()=>{RITEMS.splice(parseInt(b.dataset.n,10),1);renderItems()})}
$('r-add').onclick=()=>{const id=$('r-add-role').value;if(!id)return toast('Chọn role đã');if(RITEMS.some(i=>i.roleId===id))return toast('Role đã có trong bảng');if(RITEMS.length>=25)return toast('Tối đa 25 role');RITEMS.push({roleId:id,label:$('r-add-label').value||rName(id),emoji:$('r-add-emoji').value||''});$('r-add-label').value='';$('r-add-emoji').value='';renderItems()};
$('r-save').onclick=async()=>{if(!RBID)return toast('Tạo/chọn bảng trước');try{await api('PUT','/dashboard/api/guilds/'+G+'/roleboards/'+RBID,{channelId:$('r-channel').value||null,title:$('r-title').value||null,description:$('r-desc').value||null,items:RITEMS});const d=await api('POST','/dashboard/api/guilds/'+G+'/roleboards/'+RBID+'/refresh');const l=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');RBOARDS=l;renderBoards();toast('Đã vẽ bảng! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần chọn kênh + ít nhất 1 role)')}};
$('r-board').onchange=()=>{RBID=$('r-board').value;loadBoard()};
$('r-create').onclick=async()=>{const name=$('r-new').value.trim();if(!name)return toast('Nhập tên bảng');try{const d=await api('POST','/dashboard/api/guilds/'+G+'/roleboards',{name});const l=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');RBOARDS=l;RBID=String(d.board.id);renderBoards();$('r-new').value='';await loadBoard();toast('Đã tạo bảng '+name)}catch(e){toast('Lỗi: '+e.message)}};
$('r-import').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/roleboards/import',{});const l=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');RBOARDS=l;RBID=String(d.id);document.getElementById('r-import-wrap').style.display='none';renderBoards();await loadBoard();toast('Đã nhập bảng cũ')}catch(e){toast('Lỗi: '+e.message)}};
$('r-del').onclick=async()=>{if(!RBID)return;if(!confirm('Xóa bảng này? Tin nhắn bảng cũng bị xóa.'))return;try{await api('DELETE','/dashboard/api/guilds/'+G+'/roleboards/'+RBID);const l=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');RBOARDS=l;RBID=RBOARDS.length?String(RBOARDS[0].id||RBOARDS[0]._id):'';renderBoards();await loadBoard();toast('Đã xóa bảng')}catch(e){toast('Lỗi: '+e.message)}};
$('g-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/goodbye',{channelId:$('g-channel').value||null,title:$('g-title').value||null,text:$('g-text').value,imageUrl:$('g-image').value||null,color:$('g-color').value||null});toast('Đã lưu tin tạm biệt')}catch(e){toast('Lỗi: '+e.message)}};
$('o-save').onclick=async()=>{try{const tg={};document.querySelectorAll('#o-types input').forEach(c=>tg[c.dataset.k]=c.checked);await api('PUT','/dashboard/api/guilds/'+G+'/logs',{channelId:$('o-channel').value||null,toggles:tg});toast('Đã lưu cấu hình log')}catch(e){toast('Lỗi: '+e.message)}};
async function loadMusic(){try{const m=await api('GET','/dashboard/api/guilds/'+G+'/music');const el=$('u-state');if(!m.playing){el.innerHTML='<p class=mut>Không có gì đang phát.</p>';return}el.innerHTML='<p>🔊 <b>'+(m.voice||'voice').replace(/</g,'&lt;')+'</b> '+(m.paused?'⏸ đang dừng':'▶ đang phát')+' • Volume '+(m.volume??'?')+'</p><p><b>'+(m.current.title||'').replace(/</g,'&lt;')+'</b> — '+(m.current.author||'').replace(/</g,'&lt;')+'</p>'+(m.queueCount?'<p class=mut>Hàng chờ ('+m.queueCount+'):<br>'+m.queue.map((t,i)=>(i+1)+'. '+String(t.title||'').replace(/</g,'&lt;')).join('<br>')+'</p>':'')}catch(e){$('u-state').innerHTML='<p class=mut>Lỗi tải.</p>'}}
async function mAct(a,body){try{await api('POST','/dashboard/api/guilds/'+G+'/music/'+a,body||{});await loadMusic()}catch(e){toast('Lỗi: '+e.message)}}
$('u-pause').onclick=()=>mAct('pause');$('u-resume').onclick=()=>mAct('resume');$('u-skip').onclick=()=>mAct('skip');$('u-stop').onclick=()=>mAct('stop');
$('u-volset').onclick=()=>mAct('volume',{volume:parseInt($('u-vol').value||'50',10)});
setInterval(()=>{if(document.getElementById('p-u').style.display!=='none')loadMusic()},10000);
</script>`);
}

module.exports = { login, home, guild };
