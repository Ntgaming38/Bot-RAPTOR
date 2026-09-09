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
a{color:#8b9cf9}.tabs{display:flex;gap:8px;margin:12px 0}.tab{padding:8px 14px;border-radius:8px;background:#262b36;cursor:pointer}.tab.on{background:#5865f2;color:#fff}
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
  return shell('Tùy chỉnh server', `<a href="/dashboard" class="mut">← Tất cả server</a><h1>⚙️ Tùy chỉnh</h1><div class="tabs"><div class="tab on" id="t-w">Welcome</div><div class="tab" id="t-l">Leaderboard</div><div class="tab" id="t-x">Level</div><div class="tab" id="t-m">Kiểm duyệt</div><div class="tab" id="t-t">Ticket</div><div class="tab" id="t-a">Thông báo</div><div class="tab" id="t-s">Trạng thái</div></div>
<div id="p-w" class="card"><h2>Welcome (giống BotGhost)</h2>
<div class="grid"><div><label>Kênh gửi welcome</label><select id="w-channel"></select></div><div><label>Tiêu đề (VD: By RAPTOR)</label><input id="w-title" placeholder="Để trống = theo tên server"></div>
<div><label>Kênh chọn role ✅</label><select id="w-role"></select></div><div><label>Kênh luật</label><select id="w-rules"></select></div>
<div><label>Kênh thông báo 🔊</label><select id="w-ann"></select></div><div><label>Kênh chat 💬</label><select id="w-chat"></select></div>
<div><label>Ảnh góc phải (link gif/png)</label><input id="w-image" placeholder="Để trống = icon server"></div><div><label>Màu viền</label><input id="w-color" type="color" value="#ff4d9d" style="height:40px;padding:2px"></div>
<div><label>Reaction (cách nhau dấu phẩy)</label><input id="w-reactions" placeholder="🔥,✅"></div><div><label>Role tự gắn khi join</label><select id="w-autorole"></select></div></div>
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
<div id="p-t" class="card" style="display:none"><h2>Ticket</h2>
<div class="grid"><div><label>Category chứa kênh ticket</label><select id="k-cat"></select></div><div><label>Role staff (xem mọi ticket)</label><select id="k-staff"></select></div></div>
<div><label>Ảnh panel Mở Ticket (link ảnh)</label><input id="k-img" placeholder="Để trống = không có ảnh"></div>
<button id="k-save">Lưu</button><p class="mut">Áp dụng cho ticket mở mới và bảng panel gửi mới (dùng <b>/ticket setup</b> trong Discord).</p></div>
<div id="p-a" class="card" style="display:none"><h2>Bảng thông báo (ticker)</h2>
<div><label>Kênh đăng bảng</label><select id="a-channel"></select></div>
<div><label>Tiêu đề</label><input id="a-title" placeholder="📢 THÔNG BÁO"></div>
<div><label>Nội dung (biến {server} {members} — nhiều tin thì tách nhau bằng 1 dòng --- )</label><textarea id="a-text" placeholder="Server sẽ bảo trì lúc 22:00&#10;---&#10;Nhớ đọc luật trước khi chat"></textarea></div>
<div><label>Xoay tin mỗi mấy phút (0 = tĩnh, chỉ hiện tin đầu)</label><input id="a-min" type="number" min="0" max="1440" value="0"></div>
<button id="a-save">Lưu</button><button class="ghost" id="a-test">Đăng ngay</button></div>
<div id="p-s" class="card" style="display:none"><h2>Trạng thái server</h2>
<div><label>Kênh voice làm bảng trạng thái (để trống = chưa bật)</label><select id="s-voice"></select></div>
<div><label>Mẫu tên kênh (biến {members} {online} {voice} {server})</label><input id="s-tpl" placeholder="🟢 ONLINE • 👥 {members} MEMBERS • 🎮 {voice} ONLINE"></div>
<button id="s-save">Lưu</button><button class="ghost" id="s-refresh">Cập nhật ngay</button><p class="mut">Tự đổi tên mỗi 15 phút (Discord giới hạn). Muốn đếm {online} thì bật <b>Presence Intent</b> trong Developer Portal.</p></div>`, `<script>
const G='${esc(gid)}';
const $=id=>document.getElementById(id);
document.getElementById('t-w').onclick=e=>{t('t-w','p-w')};document.getElementById('t-l').onclick=e=>{t('t-l','p-l')};
document.getElementById('t-x').onclick=e=>{t('t-x','p-x')};document.getElementById('t-m').onclick=e=>{t('t-m','p-m')};document.getElementById('t-t').onclick=e=>{t('t-t','p-t')};
document.getElementById('t-a').onclick=e=>{t('t-a','p-a')};document.getElementById('t-s').onclick=e=>{t('t-s','p-s')};
function t(tab,page){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));document.getElementById(tab).classList.add('on');['p-w','p-l','p-x','p-m','p-t','p-a','p-s'].forEach(p=>document.getElementById(p).style.display='none');document.getElementById(page).style.display='block'}
function opt(sel,list,cur,allowEmpty){const s=$(sel);s.innerHTML=(allowEmpty?'<option value="">— không dùng —</option>':'')+list.map(o=>'<option value="'+o.id+'">'+o.name.replace(/</g,'&lt;')+'</option>').join('');if(cur)s.value=cur}
let META=null;
async function api(m,url,body){const r=await fetch(url,{method:m,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('Lỗi '+r.status));return d}
(async()=>{
  try{
    META=await api('GET','/dashboard/api/guilds/'+G+'/meta');
    const chs=META.channels, txt=[{id:'',name:'— không dùng —'}].concat(chs);
    const fill=(id,v)=>opt(id,txt,v,true);
    const [w,l]=await Promise.all([api('GET','/dashboard/api/guilds/'+G+'/welcome'),api('GET','/dashboard/api/guilds/'+G+'/leaderboard')]);
    fill('w-channel',w.channelId);$('w-title').value=w.title||'';fill('w-role',w.roleChannelId);fill('w-rules',w.rulesChannelId);fill('w-ann',w.announceChannelId);fill('w-chat',w.chatChannelId);
    $('w-image').value=w.imageUrl||'';if(w.color)$('w-color').value=w.color;$('w-reactions').value=(w.reactions||[]).join(',');
    opt('w-autorole',[{id:'',name:'— không dùng —'}].concat(META.roles),w.autoRoleId,true);
    opt('l-channel',txt,l.channelId,true);$('l-limit').value=l.limit||10;
    const st=await api('GET','/dashboard/api/guilds/'+G+'/settings');
    $('x-min').value=st.xpMin??15;$('x-max').value=st.xpMax??25;$('x-cd').value=st.xpCooldownSec??60;$('x-msg').value=st.levelUpMessage===false?'0':'1';
    $('m-words').value=(st.bannedWords||'');opt('m-log',txt,st.logChannelId,true);
    opt('k-cat',[{id:'',name:'— tạo ở đầu server —'}].concat(META.categories||[]),st.ticketCategoryId,true);
    opt('k-staff',[{id:'',name:'— chỉ admin + chủ ticket —'}].concat(META.roles),st.ticketStaffRoleId,true);
    $('k-img').value=st.ticketPanelImageUrl||'';
    const an=await api('GET','/dashboard/api/guilds/'+G+'/announce');
    opt('a-channel',txt,an.channelId,true);$('a-title').value=an.title||'';$('a-text').value=an.text||'';$('a-min').value=an.intervalMin||0;
    const ss=await api('GET','/dashboard/api/guilds/'+G+'/stats');
    opt('s-voice',[{id:'',name:'— chưa bật —'}].concat(META.voice||[]),ss.voiceChannelId,true);$('s-tpl').value=ss.template||'';
  }catch(e){toast('Lỗi tải: '+e.message+' (bot phải đã vào server và bạn là admin)')}
})();
$('w-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/welcome',{channelId:$('w-channel').value||null,title:$('w-title').value||null,roleChannelId:$('w-role').value||null,rulesChannelId:$('w-rules').value||null,announceChannelId:$('w-ann').value||null,chatChannelId:$('w-chat').value||null,imageUrl:$('w-image').value||null,color:$('w-color').value||null,reactions:$('w-reactions').value,autoRoleId:$('w-autorole').value||null});toast('Đã lưu welcome')}catch(e){toast('Lỗi: '+e.message)}};
$('w-test').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/welcome/test');toast('Đã gửi thử! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh trước)')}};
$('l-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/leaderboard',{channelId:$('l-channel').value||null,limit:parseInt($('l-limit').value||'10',10)});toast('Đã lưu leaderboard')}catch(e){toast('Lỗi: '+e.message)}};
$('l-refresh').onclick=async()=>{try{await api('POST','/dashboard/api/guilds/'+G+'/leaderboard/refresh');toast('Đã cập nhật BXH')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh trước)')}};
function curSettings(){return{xpMin:parseInt($('x-min').value||'15',10),xpMax:parseInt($('x-max').value||'25',10),xpCooldownSec:parseInt($('x-cd').value||'60',10),levelUpMessage:$('x-msg').value==='1',bannedWords:$('m-words').value,logChannelId:$('m-log').value||null,ticketCategoryId:$('k-cat').value||null,ticketStaffRoleId:$('k-staff').value||null,ticketPanelImageUrl:$('k-img').value||null}}
$('x-save').onclick=$('m-save').onclick=$('k-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/settings',curSettings());toast('Đã lưu')}catch(e){toast('Lỗi: '+e.message)}};
$('a-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/announce',{channelId:$('a-channel').value||null,title:$('a-title').value||null,text:$('a-text').value,intervalMin:parseInt($('a-min').value||'0',10)});toast('Đã lưu bảng tin')}catch(e){toast('Lỗi: '+e.message)}};
$('a-test').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/announce/test');toast('Đã đăng bảng! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh + nội dung trước)')}};
$('s-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/stats',{voiceChannelId:$('s-voice').value||null,template:$('s-tpl').value||null});toast('Đã lưu trạng thái')}catch(e){toast('Lỗi: '+e.message)}};
$('s-refresh').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/stats/refresh');toast('Đã cập nhật: '+d.name)}catch(e){toast('Lỗi: '+e.message+' (cần chọn kênh voice trước)')}};
</script>`);
}

module.exports = { login, home, guild };
