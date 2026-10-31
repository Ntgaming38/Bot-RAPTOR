function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CSS = `:root{--bg:#f6f6f7;--card:#fff;--border:#e3e4e8;--ink:#1c1f26;--mut:#6d7280;--pri:#d63d20;--pri-d:#b93218;--gold:#e9c33c;--side:#0c1322;--side2:#1a2438;--sideink:#c6cdd9}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif}
.wrap{max-width:1240px;margin:0 auto;padding:22px}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;margin:16px 0;box-shadow:0 1px 2px rgba(16,20,30,.04)}
h1{font-family:'Outfit','Inter',sans-serif;font-size:24px;margin:8px 0 4px}h2{font-family:'Outfit','Inter',sans-serif;font-size:18px;margin:18px 0 8px;color:var(--ink)}h3{font-family:'Outfit','Inter',sans-serif;font-size:15px;margin:16px 0 6px}
.mut{color:var(--mut)}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
label{display:block;font-size:13px;font-weight:600;color:#4a4f5a;margin:12px 0 4px}
input,select,textarea{width:100%;background:#fff;color:var(--ink);border:1px solid var(--border);border-radius:10px;padding:9px 11px;font-size:14px;font-family:inherit}
input:focus,select:focus,textarea:focus{outline:2px solid #f3b8a9;border-color:var(--pri)}
textarea{min-height:120px;resize:vertical}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}@media(max-width:700px){.grid{grid-template-columns:1fr}}
button{background:var(--pri);color:#fff;border:0;border-radius:10px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;margin:14px 8px 0 0}
button:hover{background:var(--pri-d)}
button.ghost{background:#fff;color:var(--ink);border:1px solid var(--border)}button.ghost:hover{background:#f0f0f2}button:disabled{opacity:.5}
a{color:var(--pri)}.tabs{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}.tab{padding:8px 14px;border-radius:999px;background:#eef0f3;cursor:pointer;font-weight:500}.tab.on{background:var(--pri);color:#fff}
.layout{display:flex;gap:18px;align-items:flex-start;position:relative}
.ambient{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(720px 480px at 6% -6%,rgba(214,61,32,.10),transparent 62%),radial-gradient(680px 520px at 16% 108%,rgba(233,195,60,.12),transparent 60%),radial-gradient(760px 560px at 100% 100%,rgba(74,222,128,.07),transparent 60%)}
.sidewrap{position:sticky;top:16px;z-index:6;width:240px;flex:0 0 240px;transition:width .18s ease,flex-basis .18s ease}
.side{position:relative;width:100%;height:100%;background:linear-gradient(165deg,rgba(38,40,48,.90),rgba(13,14,19,.88) 55%,rgba(20,22,28,.90));-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);border:1px solid rgba(20,20,30,.35);border-radius:24px;box-shadow:0 24px 60px rgba(10,10,25,.35),inset 0 1px 0 rgba(255,255,255,.14);padding:14px 12px;display:flex;flex-direction:column;gap:3px;max-height:calc(100vh - 32px);overflow-y:auto;overflow-x:hidden}
.side .brand{display:flex;align-items:center;gap:10px;padding:2px 6px 12px;border-bottom:1px solid rgba(255,255,255,.10);margin-bottom:8px}
.side .blogo-img{width:38px;height:38px;border-radius:11px;object-fit:cover;flex:0 0 38px;box-shadow:0 4px 14px rgba(214,61,32,.45)}
.side .brand b{font-family:'Outfit';color:#fff;font-size:17px;letter-spacing:.06em;display:block;line-height:1.1}
.side .brand small{color:#8a94a8;font-size:11px}
.achip{display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);border-radius:16px;padding:7px 10px;margin:0 2px 10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.achip img,.achip .afb{width:40px;height:40px;border-radius:50%;flex:0 0 40px;object-fit:cover;border:2px solid rgba(233,195,60,.75);background:#fff}
.achip .afb{display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--pri);background:#ffe9e4}
.achip .anm{color:#fff;font-weight:600;font-size:14px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.achip .asub{color:#9aa3b2;font-size:11px}
.nav{display:flex;align-items:center;gap:10px;height:38px;padding:0 12px;border-radius:12px;cursor:pointer;color:#c6cdd9;font-size:14px;font-weight:500;border:1px solid transparent;white-space:nowrap}
.nav .nic{font-size:15px;width:20px;text-align:center;flex:0 0 20px}
.nav:hover{background:rgba(255,255,255,.05);color:#fff}
.nav.on{background:linear-gradient(120deg,rgba(255,255,255,.16),rgba(255,255,255,.07));border-color:rgba(255,255,255,.18);box-shadow:0 8px 22px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.20);color:#fff;font-weight:600}
.nav.on .nic{filter:drop-shadow(0 0 6px rgba(233,195,60,.9))}
.side .logout{margin-top:auto;display:flex;align-items:center;gap:10px;height:42px;padding:0 12px;border-radius:12px;border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.12);color:#fca5a5;font-weight:600;font-size:14px;text-decoration:none;white-space:nowrap}
.side .logout:hover{background:rgba(239,68,68,.22);color:#fecaca}
.side .backlink{display:flex;align-items:center;gap:10px;height:38px;padding:0 12px;border-radius:12px;color:#c6cdd9;font-size:14px;text-decoration:none;white-space:nowrap}
.side .backlink:hover{background:rgba(255,255,255,.05);color:#fff}
#rail-btn{position:absolute;top:24px;right:-13px;width:26px;height:26px;border-radius:50%;background:linear-gradient(165deg,rgba(38,40,48,.92),rgba(13,14,19,.9));border:1px solid rgba(255,255,255,.25);color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:0;padding:0;z-index:5;box-shadow:0 6px 16px rgba(0,0,0,.4)}
#rail-btn:hover{background:#1a2438}
.layout.rail .sidewrap{width:78px;flex-basis:78px}
.layout.rail .side{padding:14px 10px}
.layout.rail .side .brand{justify-content:center;padding-bottom:12px}
.layout.rail .side .brand .btxt,.layout.rail .achip .atxt,.layout.rail .nav .nlb,.layout.rail .side .logout .nlb,.layout.rail .side .backlink .nlb{display:none}
.layout.rail .achip{justify-content:center;border-color:transparent;background:transparent;box-shadow:none;padding:4px 0}
.layout.rail .nav,.layout.rail .side .logout,.layout.rail .side .backlink{justify-content:center;padding:0}
.mbar{display:none}
.scrim{display:none}
@media(max-width:900px){.mbar{display:flex;align-items:center;gap:10px;position:sticky;top:10px;z-index:40;background:linear-gradient(165deg,rgba(38,40,48,.92),rgba(13,14,19,.9));border:1px solid rgba(20,20,30,.35);border-radius:18px;padding:9px 12px;margin-bottom:14px;box-shadow:0 16px 40px rgba(10,10,25,.35)}
.mbar img{width:32px;height:32px;border-radius:9px;object-fit:cover}
.mbar b{font-family:'Outfit';color:#fff;letter-spacing:.06em;font-size:15px}
.mbar button{margin:0 0 0 auto;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);width:38px;height:38px;border-radius:11px;font-size:16px;padding:0}
.layout{display:block}
.sidewrap{position:fixed;top:12px;bottom:12px;left:12px;width:264px;flex:none;z-index:60;transform:translateX(-115%);transition:transform .22s ease}
.sidewrap.open{transform:none}
.side{height:100%;max-height:none}
#rail-btn{display:none}
.scrim{display:none;position:fixed;inset:0;background:rgba(10,10,20,.45);z-index:55}
.scrim.on{display:block}
.layout.rail .sidewrap{width:264px;flex:none}
.layout.rail .side{padding:14px 12px}
.layout.rail .side .brand{justify-content:flex-start}
.layout.rail .side .brand .btxt,.layout.rail .achip .atxt,.layout.rail .nav .nlb,.layout.rail .side .logout .nlb,.layout.rail .side .backlink .nlb{display:block}
.layout.rail .achip{justify-content:flex-start;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);box-shadow:inset 0 1px 0 rgba(255,255,255,.12);padding:7px 10px}
.layout.rail .nav,.layout.rail .side .logout,.layout.rail .side .backlink{justify-content:flex-start;padding:0 12px}
.layout.rail .side .logout{padding:0 12px}}
main{flex:1;min-width:0}main .card:first-child{margin-top:0}

.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0}.stat{background:#f4f5f7;border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center}.stat b{font-family:'Outfit';font-size:24px;display:block}.stat span{font-size:12px;color:var(--mut)}
select[multiple]{min-height:96px}.chk{display:flex;gap:8px;align-items:center;margin:8px 0;font-size:14px}.chk input{width:auto}
.pv{background:#1e1f22;color:#e6e8ec;border:1px solid #262b36;border-radius:10px;padding:12px;margin-top:4px}.pv small{color:#9aa3b2}.pv-embed{background:#2b2d31;border-radius:8px;padding:12px 14px;border-left:4px solid #ff4d9d;margin-top:8px;overflow:hidden}.pv-title{font-weight:700;margin-bottom:6px}.pv-desc{font-size:14px;white-space:pre-wrap;word-break:break-word}.pv-thumb{float:right;width:72px;height:72px;border-radius:8px;margin-left:10px;background:#17181c}.pv-img{width:100%;border-radius:8px;margin-top:10px}
.srv{display:flex;gap:12px;align-items:center;padding:12px;background:#fff;border:1px solid var(--border);border-radius:12px;margin:10px 0;text-decoration:none;color:inherit}.srv:hover{border-color:var(--gold)}
.srv img{width:44px;height:44px;border-radius:50%;background:#eef0f3}.badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:#eef0f3;color:#4a4f5a}.badge.ok{background:#e2f5ea;color:#12703d}.badge.no{background:#fdeaea;color:#a52a14}
#toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--side);color:#fff;border:1px solid var(--side2);padding:10px 18px;border-radius:10px;display:none;z-index:99;box-shadow:0 8px 24px rgba(0,0,0,.25)}
/* ===== Nền glass cho dashboard (chỉ trang app qua body.glass-app; landing độc lập) ===== */
body.glass-app{background-color:#0b0e17;background-image:radial-gradient(900px 620px at 8% -10%,rgba(214,61,32,.30),transparent 60%),radial-gradient(820px 560px at 96% 0%,rgba(233,195,60,.15),transparent 55%),radial-gradient(920px 720px at 50% 118%,rgba(70,90,220,.20),transparent 62%),linear-gradient(160deg,#121524,#0b0e17 55%,#100b14);background-attachment:fixed;color:#e9edf5}
.glass-app .ambient{background:radial-gradient(720px 480px at 6% -6%,rgba(214,61,32,.18),transparent 62%),radial-gradient(680px 520px at 16% 108%,rgba(233,195,60,.15),transparent 60%),radial-gradient(760px 560px at 100% 100%,rgba(74,222,128,.10),transparent 60%)}
.glass-app .card{background:linear-gradient(165deg,rgba(255,255,255,.09),rgba(255,255,255,.035));-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);border:1px solid rgba(255,255,255,.13);box-shadow:0 18px 44px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.10);color:#e9edf5}
.glass-app h1,.glass-app h2,.glass-app h3{color:#fff}
.glass-app label{color:#c3cad8}
.glass-app .mut{color:#98a1b3}
.glass-app input,.glass-app select,.glass-app textarea{background:rgba(9,11,19,.55);border-color:rgba(255,255,255,.16);color:#f2f5fa}
.glass-app input::placeholder,.glass-app textarea::placeholder{color:#7d8698}
.glass-app input:focus,.glass-app select:focus,.glass-app textarea:focus{outline:2px solid rgba(214,61,32,.55);border-color:var(--pri)}
.glass-app select option{background:#141826;color:#eef1f7}
.glass-app button.ghost{background:rgba(255,255,255,.07);color:#eef1f7;border-color:rgba(255,255,255,.18)}
.glass-app button.ghost:hover{background:rgba(255,255,255,.14)}
.glass-app code{background:rgba(255,255,255,.10);color:#ffd97a}
.glass-app .tab{background:rgba(255,255,255,.08);color:#dbe1ec}
.glass-app .tab.on{background:var(--pri);color:#fff}
.glass-app .badge{background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.16);color:#dbe1ec}
.glass-app .chip{background:rgba(255,255,255,.08);color:#e6ebf4}
.glass-app .note{color:#8b96ab}
.glass-app #errbox{background:rgba(90,18,10,.88)!important;border-color:rgba(255,140,120,.5)!important;color:#ffd9d2!important}

/* ===== Revenue glass v2: cửa sổ kính nổi + cầu sáng aurora — nền "Kính băng xanh" (mẫu D, chủ bot chọn 2026-10-31) ===== */
body.glass-app{background-color:#060d18;background-image:radial-gradient(1000px 700px at 88% -10%,rgba(56,150,255,.42),transparent 60%),radial-gradient(880px 640px at -10% 25%,rgba(34,211,238,.30),transparent 58%),radial-gradient(980px 780px at 50% 120%,rgba(99,102,241,.32),transparent 62%),linear-gradient(160deg,#0a1524,#050910 72%)}
.glass-app .ambient::before,.glass-app .ambient::after{content:"";position:absolute;border-radius:50%;filter:blur(50px);opacity:.8;pointer-events:none}
.glass-app .ambient::before{width:520px;height:520px;top:-260px;left:38%;background:radial-gradient(circle at 35% 35%,#bfe3ff,#2f7fe0 55%,rgba(47,127,224,0) 75%)}
.glass-app .ambient::after{width:560px;height:560px;bottom:-300px;left:-160px;opacity:.75;background:radial-gradient(circle at 40% 40%,#a5f3fc,#0e9db8 55%,rgba(14,157,184,0) 75%)}
.glass-app .layout,.glass-app .win{background:linear-gradient(150deg,rgba(255,255,255,.10),rgba(255,255,255,.03) 55%,rgba(255,255,255,.06));-webkit-backdrop-filter:blur(26px) saturate(160%);backdrop-filter:blur(26px) saturate(160%);border:1px solid rgba(255,255,255,.15);border-radius:28px;box-shadow:0 30px 80px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.16);padding:0;gap:0}
.glass-app .sidewrap{top:40px}
.glass-app .side{background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:0;border-right:1px solid rgba(255,255,255,.07);border-radius:28px 0 0 28px;box-shadow:none;padding:18px 14px;max-height:calc(100vh - 80px)}
.glass-app .side .brand{border-bottom:0;margin-bottom:2px;padding:0 6px 14px}
.glass-app .glabel{font-size:10.5px;letter-spacing:.13em;color:#6f7789;font-weight:700;padding:14px 12px 5px}
.glass-app .nav{height:36px;border-radius:10px;font-size:13.5px;color:#9aa3b8;padding:0 11px}
.glass-app .nav:hover{background:rgba(255,255,255,.05);color:#e8ecf4}
.glass-app .nav.on{background:linear-gradient(120deg,#c81e2b,#f43f5e);border-color:rgba(255,120,130,.35);color:#fff;box-shadow:0 8px 22px -6px rgba(244,63,78,.55)}
.glass-app .nav.on .nic{filter:drop-shadow(0 0 6px rgba(255,140,150,.95))}
.glass-app .nav .nic{display:inline-flex;align-items:center}
.glass-app .nav .nic svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.glass-app a.nav{text-decoration:none}
.glass-app .layout.rail .glabel{display:none}
.glass-app .achip{margin:10px 0 0;border:0;border-top:1px solid rgba(255,255,255,.07);border-radius:0;background:transparent;box-shadow:none;padding:13px 6px 2px}
.glass-app .achip img,.glass-app .achip .afb{width:34px;height:34px;flex:0 0 34px;border-color:rgba(244,63,78,.55)}
.glass-app .achip .anm{font-size:13px}
.glass-app .lo-ic{margin-left:auto;width:30px;height:30px;flex:0 0 30px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:rgba(239,68,68,.13);border:1px solid rgba(239,68,68,.32);text-decoration:none;font-size:13px}
.glass-app .lo-ic:hover{background:rgba(239,68,68,.25)}
.glass-app .layout.rail .lo-ic{display:none}
.glass-app .layout.rail .achip{justify-content:center;padding:13px 0 2px}
.mainwrap{flex:1;min-width:0;display:flex;flex-direction:column}
.glass-app .topbar{display:flex;align-items:center;gap:12px;padding:16px 22px;border-bottom:1px solid rgba(255,255,255,.07)}
.glass-app .search{flex:1;display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:0 12px;height:40px}
.glass-app .search input{flex:1;background:transparent;border:0;padding:0;height:38px;color:#eef1f7;width:auto}
.glass-app .search input:focus{outline:none}
.glass-app .search kbd{font-family:inherit;font-size:11px;color:#8b93a7;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:2px 6px}
.glass-app .gchip{font-size:12px;color:#aeb6c6;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:999px;padding:7px 12px;white-space:nowrap}
.glass-app .btn-violet{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(120deg,#c81e2b,#f43f5e);color:#fff;font-weight:600;font-size:13.5px;border-radius:11px;padding:10px 16px;text-decoration:none;white-space:nowrap;box-shadow:0 8px 22px rgba(244,63,78,.35)}
.glass-app .btn-violet:hover{background:linear-gradient(120deg,#e53240,#ff5c6c);color:#fff}
.glass-app main{padding:6px 22px 18px}
.glass-app .pagehead h1{font-size:25px;margin:12px 0 2px}
.glass-app .pagehead p{margin:0;color:#8b93a7;font-size:13.5px}
.glass-app .card{background:linear-gradient(165deg,rgba(255,255,255,.10),rgba(255,255,255,.04));-webkit-backdrop-filter:blur(20px) saturate(155%);backdrop-filter:blur(20px) saturate(155%);border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 16px 38px rgba(0,0,0,.3)}
.glass-app input,.glass-app select,.glass-app textarea{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.09)}
.glass-app button{background:linear-gradient(120deg,#c81e2b,#f43f5e)}
.glass-app button:hover{background:linear-gradient(120deg,#e53240,#ff5c6c)}
.glass-app .sw{background:linear-gradient(120deg,#c81e2b,#f43f5e)}
.glass-app .trow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;font-size:14px;color:#dbe2ef}
.glass-app .trow:last-child{border-bottom:0}
.glass-app .tsw{width:42px;height:23px;border-radius:99px;background:rgba(255,255,255,.14);position:relative;flex:0 0 42px;transition:.2s}
.glass-app .tsw::after{content:'';position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#cfd6e4;transition:.2s}
.glass-app .tsw.on{background:linear-gradient(120deg,#c81e2b,#f43f5e)}
.glass-app .tsw.on::after{left:22px;background:#fff}
.glass-app .afeed{display:flex;flex-direction:column}
.glass-app .ait{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.glass-app .ait:last-child{border-bottom:0}
.glass-app .aic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:0 0 30px;background:rgba(255,255,255,.07)}
.glass-app .aic svg{width:16px;height:16px;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.glass-app .ait p{margin:0;font-size:13.5px;color:#dbe2ef;line-height:1.45}
.glass-app .ait time{display:block;font-size:11.5px;color:#8b93a7;margin-top:1px}
.glass-app .eprev{border-left:4px solid #e0322d;background:rgba(255,255,255,.045);border-radius:8px;padding:12px 14px;min-height:60px}
.glass-app .eprev h4{margin:0 0 4px;font-size:15px;color:#fff}
.glass-app .eprev p{margin:0;font-size:13.5px;color:#c9d2e2;white-space:pre-wrap}
.glass-app .eprev .eimg{max-width:100%;border-radius:8px;margin-top:8px}
.glass-app .eprev .eft{font-size:11.5px;color:#8b93a7;margin-top:8px}
.glass-app .win .win-pad{padding:20px 24px 24px}
.glass-app .topbar .logo{display:flex;align-items:center;gap:10px;font-family:'Outfit';font-weight:800;font-size:17px;color:#fff;text-decoration:none;white-space:nowrap}
.glass-app .topbar .logo img{width:34px;height:34px;border-radius:9px;object-fit:cover}
.glass-app .srv{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:#eef1f7;border-radius:14px;padding:13px 15px}
.glass-app .srv:hover{background:rgba(255,255,255,.09);border-color:rgba(244,63,78,.45)}
.glass-app .srv img{background:rgba(255,255,255,.08)}
.glass-app .srv b{color:#fff}
.glass-app .srv .badge.ok{background:rgba(29,157,87,.20);color:#5eeaa0;border:1px solid rgba(29,157,87,.40)}
.glass-app .srv .badge.no{background:rgba(233,195,60,.14);color:var(--gold);border:1px solid rgba(233,195,60,.40)}
.glass-app .stat{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:16px;text-align:left;padding:16px}
.glass-app .stat .sic{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
.glass-app .stat .sic svg{width:19px;height:19px;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.glass-app .stat .s1{background:rgba(244,63,78,.16)}.glass-app .stat .s1 svg{stroke:#ff8a94}
.glass-app .stat .s2{background:rgba(56,150,255,.14)}.glass-app .stat .s2 svg{stroke:#6db3ff}
.glass-app .stat .s3{background:rgba(63,185,112,.14)}.glass-app .stat .s3 svg{stroke:#5ed598}
.glass-app .stat .s4{background:rgba(245,176,65,.15)}.glass-app .stat .s4 svg{stroke:#ffc65c}
.glass-app .stat .s5{background:rgba(240,110,180,.13)}.glass-app .stat .s5 svg{stroke:#ff8ac2}
.glass-app .stat b{color:#fff}
.glass-app .stat span{color:#98a1b3}
.glass-app .pbadges{display:flex;flex-wrap:wrap;gap:8px}
.glass-app .pbdg{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:999px;padding:6px 12px;font-size:13px;color:#d5dae6}
.glass-app .pbdg::before{content:"";width:7px;height:7px;border-radius:50%;background:#3fb970;box-shadow:0 0 8px #3fb970}
.glass-app .pbdg.off{color:#6d7688}.glass-app .pbdg.off::before{background:#565f73;box-shadow:none}
.glass-app .ovgrid{display:grid;grid-template-columns:1fr 330px;gap:16px;align-items:start}
.glass-app .ovcol{display:flex;flex-direction:column;gap:16px;min-width:0}
.glass-app .kv{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed rgba(255,255,255,.07);font-size:14px}
.glass-app .kv:last-child{border-bottom:0}.glass-app .kv span{color:#98a1b3}.glass-app .kv b{font-weight:600;color:#eef1f7;text-align:right}
.glass-app .odot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#3fb970;box-shadow:0 0 10px #3fb970;margin-right:7px}
.glass-app .xpr{display:flex;align-items:center;gap:11px;padding:7px 0}
.glass-app .xpr img,.glass-app .xpr .xfb{width:34px;height:34px;border-radius:50%;flex:0 0 34px;object-fit:cover}
.glass-app .xpr .xfb{display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;background:linear-gradient(135deg,#e02635,#ff8a5c)}
.glass-app .xpr .xw{flex:1;min-width:0}
.glass-app .xpr .xw b{font-size:14px;display:flex;justify-content:space-between;gap:8px;color:#eef1f7}
.glass-app .xpr .xw b em{font-style:normal;color:#ff8a94;font-size:12.5px;white-space:nowrap}
.glass-app .xpr .xbar{height:6px;border-radius:99px;background:rgba(255,255,255,.08);margin-top:5px;overflow:hidden}
.glass-app .xpr .xbar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#c81e2b,#ff8a5c)}
@media(max-width:1100px){.glass-app .ovgrid{grid-template-columns:1fr}}
.glass-app #ov-body .statgrid{grid-template-columns:repeat(5,1fr)}
@media(max-width:760px){.glass-app #ov-body .statgrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:900px){.glass-app .layout,.glass-app .win{border-radius:22px}.glass-app .side{background:linear-gradient(165deg,rgba(38,40,48,.94),rgba(13,14,19,.92) 55%,rgba(20,22,28,.94));border:1px solid rgba(255,255,255,.14);border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.5);max-height:none}.glass-app .topbar{flex-wrap:wrap;padding:14px 16px}.glass-app main{padding:4px 14px 14px}.glass-app .gchip{display:none}.glass-app .win .win-pad{padding:16px}}
`;

function shell(title, body, extra = '') {
  const build = (process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7);
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — RAPTOR Dashboard</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet"><style>${CSS}</style></head><body class="glass-app"><div class="wrap">${body}<div id="toast"></div><div id="errbox" style="display:none;position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#fdeaea;border:1px solid #e5a49c;color:#7a1f10;padding:10px 18px;border-radius:10px;max-width:90%;z-index:99"></div><div class="mut" style="text-align:center;margin:20px 0;font-size:12px">build ${esc(build)}</div></div><script>function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',6000)}window.addEventListener('error',function(e){const b=document.getElementById('errbox');if(b){b.style.display='block';b.textContent='Lỗi trang: '+(e.message||e.error)}});</script>${extra}</body></html>`;
}

let cmdCount = 52;
function setCmdCount(n) { if (Number.isFinite(n) && n > 0) cmdCount = n; }
function landing(inviteUrl) {
  const invite = inviteUrl || '/dashboard/login';
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RAPTOR — Bot Discord đa năng</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0b0e17; --card:rgba(255,255,255,.06); --border:rgba(255,255,255,.13); --ink:#eef1f7; --mut:#98a1b3;
  --primary:#d63d20; --primary-dark:#b93218; --gold:#ff7a59; --gold-soft:rgba(255,122,89,.16);
  --navy:#0c1322; --navy2:#131f38; --ok:#1d9d57;
  --radius:12px;
}
*{box-sizing:border-box}
body{margin:0;font-family:'Inter',system-ui,sans-serif;color:var(--ink);background-color:#0b0e17;background-image:radial-gradient(900px 620px at 8% -10%,rgba(214,61,32,.30),transparent 60%),radial-gradient(820px 560px at 96% 0%,rgba(255,110,64,.14),transparent 55%),radial-gradient(920px 720px at 50% 118%,rgba(214,32,39,.18),transparent 62%),linear-gradient(160deg,#121524,#0b0e17 55%,#100b14);background-attachment:fixed}
h1,h2,h3{font-family:'Outfit','Inter',sans-serif;margin:0}
a{text-decoration:none;color:inherit}
.btn{display:inline-block;background:linear-gradient(120deg,#c81e2b,#f43f5e);color:#fff;font-weight:600;padding:13px 26px;border-radius:var(--radius);border:0;cursor:pointer;font-size:15px}
.btn:hover{background:linear-gradient(120deg,#a8161f,#d92c3f)}
.btn.light{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.22);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.btn.gold{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.22);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.btn.blurple{background:#5865f2;color:#fff}
.wrap{max-width:1140px;margin:0 auto;padding:0 20px}
/* ===== Navbar ===== */
header{position:sticky;top:0;z-index:20;background:rgba(12,19,34,.92);backdrop-filter:blur(8px);color:#dbe1ec}
.navbar{display:flex;align-items:center;gap:26px;height:64px}
.logo{display:flex;align-items:center;gap:10px;font-family:'Outfit';font-weight:800;font-size:20px;color:#fff}
.logo .ic{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#f0662a);display:flex;align-items:center;justify-content:center;font-size:19px}.logo .ic-img{width:36px;height:36px;border-radius:10px;object-fit:cover}
.navbar nav{display:flex;gap:22px;font-weight:500;font-size:14.5px}
.navbar nav a:hover{color:var(--gold)}
.navbar .sp{flex:1}
.lang{font-size:13px;color:#9aa5ba;border:1px solid #2a3852;padding:6px 10px;border-radius:8px}
.btn-login{background:linear-gradient(120deg,#c81e2b,#f43f5e);color:#fff;font-weight:700;padding:9px 18px;border-radius:9px;font-size:14px}
/* ===== Hero ===== */
.hero{background:radial-gradient(1000px 480px at 75% -10%,rgba(39,64,110,.55) 0%,transparent 60%),linear-gradient(180deg,rgba(12,19,34,.55),rgba(19,31,56,.25));color:#e8ecf4;overflow:hidden}
.hero-in{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center;padding:72px 0 84px}
.badge{display:inline-block;background:rgba(233,195,60,.14);border:1px solid rgba(233,195,60,.45);color:var(--gold);font-size:13px;font-weight:600;padding:5px 12px;border-radius:999px;margin-bottom:18px}
.hero h1{font-size:46px;line-height:1.12;font-weight:800;color:#fff}
.hero h1 .hl{background:linear-gradient(92deg,#f43f5e,#ff8a5c);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p{font-size:17px;color:#aeb8ca;line-height:1.6;margin:18px 0 28px;max-width:520px}
.hero .cta{display:flex;gap:12px;flex-wrap:wrap}
.hero .note{margin-top:16px;font-size:13px;color:#7e8aa0}
/* Thẻ mock Discord */
.stage{position:relative;min-height:340px}
.mock{position:absolute;background:#1e2432;border:1px solid #2e3850;border-radius:14px;box-shadow:0 24px 50px rgba(0,0,0,.45);padding:16px;color:#d5dae4}
.mock .mhead{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.mav{width:36px;height:36px;border-radius:50%;flex:0 0 36px}
.mname{font-weight:700;color:#fff;font-size:14px}
.mname .bot{font-size:10px;background:var(--primary);color:#fff;border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:2px}
.mtime{color:#7e8aa0;font-size:11px;font-weight:400;margin-left:6px}
.embed{border-left:4px solid var(--gold);background:#171c29;border-radius:8px;padding:12px 14px}
.embed b{color:#fff;display:block;margin-bottom:4px}
.embed span{font-size:13.5px;color:#aeb8ca;line-height:1.5}
.mock.welcome{width:88%;left:0;top:6px;transform:rotate(-1.5deg)}
.mock.level{width:64%;right:0;bottom:0;transform:rotate(1.2deg)}
.lvlbar{height:10px;background:#0f141f;border-radius:99px;overflow:hidden;margin-top:8px}
.lvlbar i{display:block;height:100%;width:72%;background:linear-gradient(90deg,var(--gold),#f0662a)}
/* ===== Stats ===== */
.stats{background:rgba(255,255,255,.04);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.10)}
.stats-in{display:grid;grid-template-columns:repeat(4,1fr);text-align:center;padding:26px 0}
.stats b{font-family:'Outfit';font-size:28px;display:block}
.stats span{color:var(--mut);font-size:13.5px}
/* ===== Features ===== */
.features{padding:74px 0 10px}
.features .head{text-align:center;max-width:640px;margin:0 auto 46px}
.features .head h2{font-size:32px;margin-bottom:10px}
.features .head p{color:var(--mut);font-size:16px;line-height:1.6}
.feat{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;margin-bottom:74px}
.feat.rev .vis{order:2}
.feat .tag{color:var(--primary);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.8px}
.feat h3{font-size:27px;margin:8px 0 10px}
.feat p{color:var(--mut);font-size:15.5px;line-height:1.65;margin:0}
.vis{background:linear-gradient(165deg,rgba(255,255,255,.09),rgba(255,255,255,.035));-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);border:1px solid rgba(255,255,255,.13);border-radius:16px;box-shadow:0 18px 44px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.10);padding:20px}
.vis .embed{border-left-color:var(--primary);background:rgba(9,11,19,.5)}
.vis .embed span{color:#5b6270}
.vis .mname{color:var(--ink)}
.vis .mtime{color:#9aa0ad}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.chip{background:rgba(255,255,255,.09);color:#e6ebf4;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:500}
.chip.g{background:var(--gold-soft);color:var(--gold)}
.tgl{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #eef0f2;font-size:14.5px}
.tgl:last-child{border:0}
.sw{margin-left:auto;width:40px;height:22px;border-radius:99px;background:var(--primary);position:relative;flex:0 0 40px}
.sw:before{content:"";position:absolute;width:16px;height:16px;background:#fff;border-radius:50%;top:3px;right:3px}
.sw.off{background:#d6d8de}.sw.off:before{right:auto;left:3px}
/* ===== CTA cuối ===== */
.cta-band{background:linear-gradient(135deg,rgba(12,19,34,.85),rgba(19,31,56,.75));border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-radius:20px;color:#fff;text-align:center;padding:52px 24px;margin:6px 0 70px}
.cta-band h2{font-size:30px;margin-bottom:10px}
.cta-band p{color:#aeb8ca;margin:0 0 24px}
footer{border-top:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);color:var(--mut);font-size:13.5px}
.foot-in{display:flex;gap:20px;align-items:center;padding:22px 0;flex-wrap:wrap}
@media(max-width:900px){
  .navbar nav{display:none}
  .hero-in{grid-template-columns:1fr;padding:48px 0 60px}
  .hero h1{font-size:32px}
  .lang{display:none}
  .stage{min-height:0;margin-top:6px;display:flex;flex-direction:column;gap:12px}
  .mock{position:relative;width:100%;left:auto;right:auto;top:auto;bottom:auto;transform:none}
  .stats-in{grid-template-columns:1fr 1fr;gap:18px}
  .feat{grid-template-columns:1fr;gap:20px;margin-bottom:52px}
  .feat.rev .vis{order:0}
}
</style>
</head>
<body>

<header>
  <div class="wrap navbar">
    <a class="logo" href="#"><img class="ic-img" src="/dashboard/logo.jpg" alt="RAPTOR"> RAPTOR</a>
    <nav>
      <a href="#features">Tính năng</a>
      <a href="#">Lệnh</a>
      <a href="#">Máy chủ hỗ trợ</a>
      <a href="#">Cộng đồng</a>
    </nav>
    <span class="sp"></span>
    <span class="lang">🌐 Tiếng Việt</span>
    <a class="btn-login" href="/dashboard/login">Đăng nhập</a>
  </div>
</header>

<section class="hero">
  <div class="wrap hero-in">
    <div>
      <span class="badge">✨ Mới: Hệ thống Ticket chuyên nghiệp</span>
      <h1>Xây dựng một server Discord <span class="hl">chuyên nghiệp!</span></h1>
      <p>Một bot toàn năng cho mọi việc — chào mừng thành viên, ticket hỗ trợ, cấp độ, giveaway, nhạc và kiểm duyệt — tất cả tùy chỉnh ngay trên dashboard, không cần gõ lệnh cấu hình.</p>
      <div class="cta">
        <a class="btn" href="__INVITE__" target="_blank" rel="noopener">➕ Thêm vào Discord</a>
        <a class="btn gold" href="/dashboard">Mở Dashboard</a>
      </div>
      <p class="note">Miễn phí · Không cần thẻ · Cài đặt trong 1 phút</p>
    </div>
    <div class="stage">
      <div class="mock welcome">
        <div class="mhead"><div class="mav" style="background:linear-gradient(135deg,#d63d20,#f0662a)"></div><div class="mname">RAPTOR<span class="bot">BOT</span><span class="mtime">hôm nay lúc 09:41</span></div></div>
        <div class="embed"><b>👋 Chào mừng @Nguyễn Trọng Thủy!</b><span>Chào mừng bạn đến với <b style="display:inline;color:#fff">RAPTOR Community</b> — bạn là thành viên thứ 1.248. Đọc #nội-quy và chọn role ở #chọn-role nhé!</span></div>
      </div>
      <div class="mock level">
        <div class="mhead"><div class="mav" style="background:linear-gradient(135deg,#e02635,#ff8a5c)"></div><div class="mname">khoa.pro<span class="mtime">Cấp 24</span></div></div>
        <div style="font-size:13px;color:#aeb8ca">XP: 18.420 / 25.500</div>
        <div class="lvlbar"><i></i></div>
      </div>
    </div>
  </div>
</section>

<section class="stats">
  <div class="wrap stats-in">
    <div><b>24/7</b><span>Online không nghỉ</span></div>
    <div><b>__CMDCOUNT__+</b><span>Lệnh sẵn dùng</span></div>
    <div><b>14</b><span>Module tùy chỉnh</span></div>
    <div><b>100%</b><span>Miễn phí</span></div>
  </div>
</section>

<section class="features wrap" id="features">
  <div class="head">
    <h2>Tính năng nổi bật</h2>
    <p>Mọi thứ một server cần để vận hành chuyên nghiệp — bật tắt và chỉnh sửa từng module ngay trên dashboard.</p>
  </div>

  <div class="feat">
    <div class="vis">
      <div class="mhead"><div class="mav" style="background:linear-gradient(135deg,#d63d20,#f0662a)"></div><div class="mname">RAPTOR<span class="mtime">tin nhắn chào</span></div></div>
      <div class="embed"><b>👋 Xin chào thành viên mới!</b><span>Thẻ chào có tên + avatar của từng người, nền tùy đổi — giống cách ProBot làm, nhưng là của server bạn.</span></div>
      <div class="chips"><span class="chip g">Ảnh nền tùy chỉnh</span><span class="chip">Biến {user} {count}</span><span class="chip">Kênh riêng</span></div>
    </div>
    <div>
      <div class="tag">Tin nhắn chào mừng</div>
      <h3>Đón thành viên mới một cách cá tính</h3>
      <p>Thiết lập chào mừng với hình ảnh, tên và ảnh hồ sơ của người dùng, kèm tin nhắn tạm biệt khi ai đó rời server. Tất cả chỉnh trong vài cú bấm trên dashboard.</p>
    </div>
  </div>

  <div class="feat rev">
    <div class="vis">
      <div class="tgl">🎫 Tạo ticket bằng nút bấm <span class="sw"></span></div>
      <div class="tgl">⭐ Đánh giá sao sau hỗ trợ <span class="sw"></span></div>
      <div class="tgl">🕐 Tự đóng ticket không hoạt động <span class="sw off"></span></div>
      <div class="tgl">📄 Transcript lưu trữ <span class="sw"></span></div>
    </div>
    <div>
      <div class="tag">Hệ thống Ticket</div>
      <h3>Hỗ trợ thành viên như một đội ngũ thật</h3>
      <p>Panel ticket bằng nút bấm, phân loại theo nhu cầu, nhân viên nhận hỗ trợ, chấm sao sau khi đóng và bản ghi đầy đủ — thay cho cảnh @tag nhau lộn xộn trong kênh chat.</p>
    </div>
  </div>

  <div class="feat">
    <div class="vis">
      <div class="mhead"><div class="mav" style="background:linear-gradient(135deg,#e02635,#ff8a5c)"></div><div class="mname">BXH tuần này<span class="mtime">Leveling</span></div></div>
      <div class="tgl">🥇 @khoa.pro — Cấp 24 <b style="margin-left:auto">18.420 XP</b></div>
      <div class="tgl">🥈 @linh.xinh — Cấp 21 <b style="margin-left:auto">15.975 XP</b></div>
      <div class="tgl">🥉 @tuan.dev — Cấp 19 <b style="margin-left:auto">13.260 XP</b></div>
    </div>
    <div>
      <div class="tag">Hệ thống cấp độ</div>
      <h3>Thưởng nóng cho thành viên năng động nhất</h3>
      <p>XP theo mức hoạt động, thông báo lên cấp, bảng xếp hạng riêng cho từng server. Thành viên có lý do quay lại mỗi ngày, server không bao giờ "chết".</p>
    </div>
  </div>

  <div class="feat rev">
    <div class="vis">
      <div class="chips" style="margin-top:0">
        <span class="chip">🛡️ Ban / Kick / Timeout</span><span class="chip">🤖 AutoMod lọc từ cấm</span>
        <span class="chip">🎵 Nhạc YouTube / SoundCloud</span><span class="chip g">🎉 Giveaway</span>
        <span class="chip">🎭 Bảng chọn role</span><span class="chip">📝 Log kiểu ProBot</span>
      </div>
    </div>
    <div>
      <div class="tag">Và nhiều hơn nữa</div>
      <h3>Kiểm duyệt, nhạc, giveaway — đủ cả</h3>
      <p>Kiểm duyệt có kiểm tra thứ bậc role, AutoMod chống spam, phát nhạc trong kênh thoại, giveaway tự chọn người thắng và nhật ký hoạt động chi tiết cho admin.</p>
    </div>
  </div>

  <div class="cta-band">
    <h2>Sẵn sàng nâng cấp server của bạn?</h2>
    <p>Thêm RAPTOR vào Discord và mở dashboard để tùy chỉnh ngay.</p>
    <a class="btn" href="__INVITE__" target="_blank" rel="noopener">➕ Thêm vào Discord</a>
    <a class="btn gold" href="/dashboard" style="margin-left:10px">Mở Dashboard</a>
  </div>
</section>

<footer>
  <div class="wrap foot-in">
    <a class="logo" href="#" style="color:var(--ink)"><img class="ic-img" src="/dashboard/logo.jpg" alt="RAPTOR"> RAPTOR</a>
    <span>Bot Discord đa năng — chào mừng, ticket, cấp độ, nhạc & kiểm duyệt.</span>
    <span style="flex:1"></span>
    <a href="#features">Tính năng</a><a href="#">Lệnh</a><a href="#">Hỗ trợ</a>
  </div>
</footer>
</body>
</html>
`.replaceAll('__INVITE__', invite).replaceAll('__CMDCOUNT__', String(cmdCount));
}

function login() {
  return landing(null);
}

function home(user) {
  return shell('Chọn server', `<div class="win"><div class="topbar"><a class="logo" href="/dashboard" style="color:#fff"><img class="ic-img" src="/dashboard/logo.jpg" alt="RAPTOR"> RAPTOR</a><div class="search"><span>🔍</span><input id="guild-search" placeholder="Tìm server..."></div><span class="gchip">👋 ${esc(user.username)}</span><a class="btn-violet" href="/dashboard/logout">Đăng xuất</a></div><div class="win-pad"><div class="row"><h1>Chọn server</h1></div><p class="mut">Chọn server để tùy chỉnh (chỉ hiện server bạn có quyền quản lý).</p><div id="list"><p class="mut">Đang tải...</p></div>`, `</div></div><script>document.getElementById('guild-search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('#list > *').forEach(c=>{c.style.display=(!q||c.textContent.toLowerCase().includes(q))?'':'none'})});</script><script>
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

function guild(gid, user) {
  const uname = user?.username || 'RAPTOR';
  const uav = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : '';
  return shell('Tùy chỉnh server', `<div class="ambient"></div><div class="mbar"><img src="/dashboard/logo.jpg" alt="RAPTOR"><b>RAPTOR</b><span style="color:#8a94a8;font-size:12px">Dashboard</span><button id="mbar-btn" aria-label="Mở menu">☰</button></div><div class="layout" id="layout"><div class="scrim" id="scrim"></div><div class="sidewrap" id="sidewrap"><aside class="side" id="side"><div class="brand"><img class="blogo-img" src="/dashboard/logo.jpg" alt="RAPTOR"><span class="btxt"><b>RAPTOR <span style="color:#ff5c6c;font-weight:600">BOT</span></b><small>Dashboard</small></span></div><div class="glabel">TỔNG QUAN</div><div class="nav on" id="t-ov" title="Overview"><span class="nic"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg></span><span class="nlb">Overview</span></div><div class="glabel">QUẢN TRỊ</div><div class="nav" id="t-mod" title="Moderation"><span class="nic"><svg viewBox="0 0 24 24"><path d="M12 3l7 2.8v5.4c0 4.4-2.9 7.4-7 9.3-4.1-1.9-7-4.9-7-9.3V5.8z"/><path d="M9 11.6l2.2 2.2L15.4 9.6"/></svg></span><span class="nlb">Moderation</span></div><div class="nav" id="t-am" title="AutoMod"><span class="nic"><svg viewBox="0 0 24 24"><rect x="4.5" y="8" width="15" height="11" rx="2.4"/><path d="M12 8V4.5M12 4.5h.01"/><circle cx="9" cy="13.5" r=".6"/><circle cx="15" cy="13.5" r=".6"/><path d="M9.5 16.8h5"/></svg></span><span class="nlb">AutoMod</span></div><div class="nav" id="t-o" title="Logs"><span class="nic"><svg viewBox="0 0 24 24"><path d="M6 3.5h9L19.5 8v12.5h-13.5z"/><path d="M14.5 3.5v5h5M9 12.5h6M9 16h6"/></svg></span><span class="nlb">Logs</span></div><div class="glabel">CỘNG ĐỒNG</div><div class="nav" id="t-w" title="Welcome"><span class="nic"><svg viewBox="0 0 24 24"><path d="M16 20v-1.6c0-2-1.8-3.4-4.5-3.4S7 16.4 7 18.4V20"/><circle cx="11.5" cy="8" r="3.4"/><path d="M18.5 5.5v4M16.5 7.5h4"/></svg></span><span class="nlb">Welcome</span></div><div class="nav" id="t-g" title="Goodbye"><span class="nic"><svg viewBox="0 0 24 24"><path d="M9 20H6.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2H9M16 16.5L20.5 12 16 7.5M20.3 12H9.5"/></svg></span><span class="nlb">Goodbye</span></div><div class="nav" id="t-x" title="Leveling"><span class="nic"><svg viewBox="0 0 24 24"><path d="M8 20.5h8M12 17v3.5M6.5 4h11v4.5a5.5 5.5 0 0 1-11 0z"/><path d="M6.5 6H4a2.5 2.5 0 0 0 2.6 4.4M17.5 6H20A2.5 2.5 0 0 1 17.4 10.4"/></svg></span><span class="nlb">Leveling</span></div><div class="nav" id="t-v" title="Giveaway"><span class="nic"><svg viewBox="0 0 24 24"><rect x="3.5" y="8" width="17" height="4"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8S9.6 8 8.2 6.9A2.3 2.3 0 0 1 10.4 3C12 3.6 12 8 12 8zm0 0s2.4 0 3.8-1.1A2.3 2.3 0 0 0 13.6 3C12 3.6 12 8 12 8z"/></svg></span><span class="nlb">Giveaway</span></div><div class="nav" id="t-voice" title="Kênh voice tạm"><span class="nic"><svg viewBox="0 0 24 24"><path d="M4 10v4h3l5 4.5v-13L7 10H4z"/><path d="M15.5 9.5a4 4 0 0 1 0 5M18 7a7.5 7.5 0 0 1 0 10"/></svg></span><span class="nlb">Voice tạm</span></div><div class="nav" id="t-shop" title="Shop credits"><span class="nic"><svg viewBox="0 0 24 24"><path d="M4 7.5h16l-1.4 11a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7z"/><path d="M8 10V6.5a4 4 0 0 1 8 0V10"/></svg></span><span class="nlb">Shop</span></div><div class="nav" id="t-ai" title="AI Chat"><span class="nic"><svg viewBox="0 0 24 24"><path d="M4 6.5C4 5.1 5.1 4 6.5 4h11C18.9 4 20 5.1 20 6.5v7c0 1.4-1.1 2.5-2.5 2.5H13l-3.6 3.6c-.5.5-1.4.1-1.4-.6V16H6.5C5.1 16 4 14.9 4 13.5z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/></svg></span><span class="nlb">AI Chat</span></div><div class="glabel">CÔNG CỤ</div><div class="nav" id="t-t" title="Ticket"><span class="nic"><svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v2a2.6 2.6 0 0 0 0 5.2v2A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.7v-2a2.6 2.6 0 0 0 0-5.2z"/><path d="M13.5 7v1.8M13.5 11.2v1.6M13.5 15.4V17"/></svg></span><span class="nlb">Ticket</span></div><div class="nav" id="t-r" title="Roles"><span class="nic"><svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M16 5.6a3.2 3.2 0 0 1 0 5.9M17.8 15.3c1.5.7 2.4 2 2.7 4.2"/></svg></span><span class="nlb">Roles</span></div><div class="nav" id="t-u" title="Music"><span class="nic"><svg viewBox="0 0 24 24"><path d="M9.5 18.2V6l10-2v11.8"/><circle cx="6.8" cy="18.2" r="2.7"/><circle cx="16.8" cy="15.8" r="2.7"/></svg></span><span class="nlb">Music</span></div><div class="nav" id="t-embed" title="Trình tạo Embed"><span class="nic"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.2"/><path d="M3.5 10h17M7 15h4"/></svg></span><span class="nlb">Embed</span></div><div class="glabel">HỆ THỐNG</div><div class="nav" id="t-s" title="Server Stats"><span class="nic"><svg viewBox="0 0 24 24"><path d="M4 20V10.5M10 20V4.5M16 20v-8M21 20H3.5"/></svg></span><span class="nlb">Server Stats</span></div><div class="nav" id="t-cmd" title="Commands"><span class="nic"><svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.4"/><path d="M7 9.5l3 2.7-3 2.7M12.5 15.5H17"/></svg></span><span class="nlb">Commands</span></div><div class="nav" id="t-set" title="Settings"><span class="nic"><svg viewBox="0 0 24 24"><path d="M5 7h9M18 7h1M5 12h3M12 12h7M5 17h11M20 17h-1"/><circle cx="16" cy="7" r="2.1"/><circle cx="10" cy="12" r="2.1"/><circle cx="18" cy="17" r="2.1"/></svg></span><span class="nlb">Settings</span></div><a class="nav" href="/dashboard" title="Tất cả server"><span class="nic"><svg viewBox="0 0 24 24"><path d="M4 11.2L12 4l8 7.2M6.2 9.8V20h11.6V9.8"/></svg></span><span class="nlb">Tất cả server</span></a><div style="flex:1"></div><div class="achip">${uav ? `<img src="${esc(uav)}" alt="">` : `<span class="afb">${esc(uname.slice(0, 1).toUpperCase())}</span>`}<span class="atxt"><span class="anm">${esc(uname)}</span><br><span class="asub">Đã đăng nhập Discord</span></span><a class="lo-ic" href="/dashboard/logout" title="Đăng xuất"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff8a94" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h3.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H14M10 8l-4 4 4 4M6 12h10"/></svg></a></div></aside><button id="rail-btn" title="Thu gọn / mở rộng sidebar">❮</button></div><div class="mainwrap"><div class="topbar"><div class="search"><span style="display:inline-flex"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b93a7" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16.6 16.6"/></svg></span><input id="nav-search" placeholder="Tìm mục cài đặt..."><kbd>Ctrl K</kbd></div><span class="gchip" id="srv-chip">Server ${esc(gid)}</span><a class="btn-violet" href="https://discord.com/app" target="_blank" rel="noopener">+ Mở Discord</a></div><main id="main"><div class="pagehead"><h1>Tùy chỉnh server</h1><p>Quản lý mọi module của RAPTOR — thay đổi áp dụng ngay cho bot.</p></div>
<div id="p-w" class="card"><h2>Welcome (giống BotGhost)</h2>
<div class="grid"><div><label>Kênh gửi welcome</label><select id="w-channel"></select></div><div><label>Tiêu đề (VD: By RAPTOR)</label><input id="w-title" placeholder="Để trống = theo tên server"></div>
<div><label>Kênh chọn role ✅</label><select id="w-role"></select></div><div><label>Kênh luật</label><select id="w-rules"></select></div>
<div><label>Kênh thông báo 🔊</label><select id="w-ann"></select></div><div><label>Kênh chat 💬</label><select id="w-chat"></select></div>
<div><label>Ảnh góc phải (link gif/png)</label><input id="w-image" placeholder="Để trống = logo RAPTOR"></div><div><label>Màu viền</label><input id="w-color" type="color" value="#ff4d9d" style="height:40px;padding:2px"></div>
<div><label>Ảnh gạch ngang dưới embed (trống = cầu vồng mặc định)</label><input id="w-banner" placeholder="https://..."></div><div><label>Gạch cầu vồng 🌈</label><select id="w-rainbow"><option value="1">Bật</option><option value="0">Tắt</option></select></div>
<div><label>Reaction (cách nhau dấu phẩy)</label><input id="w-reactions" placeholder="🔥,✅"></div><div><label>Role tự gắn khi join</label><select id="w-autorole"></select></div></div>
<div><label>Soạn nội dung (trống = mẫu mặc định; biến {member} {tag} {server} {count} {role} {rules} {announce} {chat})</label><textarea id="w-desc" placeholder="➔ Chào mừng {member} đã tham gia {server}..."></textarea></div>
<div class="grid"><div><label>Ảnh card chào mừng tự vẽ</label><select id="w-card"><option value="1">Bật</option><option value="0">Tắt</option></select></div><div><label>Gửi tin chào qua DM nữa</label><select id="w-dm"><option value="0">Tắt</option><option value="1">Bật</option></select></div></div>
<div><label>Role cấp khi bấm nút đồng ý luật (trống = không có nút)</label><select id="w-accept"></select></div>
<div><label>Nút link dưới tin chào (<span id="w-bcount">0</span>/4 — chữ + link https)</label><div id="w-btns"></div></div>
<div class="grid"><div><label>Chữ nút mới</label><input id="w-btn-label" maxlength="80"></div><div><label>Link https</label><input id="w-btn-url" placeholder="https://..."></div></div>
<div><button class="ghost" id="w-btn-add" style="margin-top:0">+ Thêm nút</button></div>
<button id="w-save">Lưu</button><button class="ghost" id="w-test">Gửi thử vào kênh welcome</button>
<div><label>Xem trước (tự cập nhật khi sửa)</label><div class="pv" id="w-pv"></div></div></div>
<div id="p-l" class="card" style="display:none"><h2>Leaderboard (BXH riêng)</h2>
<div class="grid"><div><label>Kênh đăng BXH</label><select id="l-channel"></select></div><div><label>Top mấy</label><input id="l-limit" type="number" min="3" max="25" value="10"></div></div>
<button id="l-save">Lưu</button><button class="ghost" id="l-refresh">Cập nhật ngay</button><p class="mut">Bot tự sửa tin BXH mỗi 10 phút.</p></div>
<div id="p-x" class="card" style="display:none"><h2>Level / XP</h2>
<div><label>Hệ thống level</label><select id="x-on"><option value="1">Bật</option><option value="0">Tắt cả XP</option></select></div>
<div class="grid"><div><label>XP mỗi tin (tối thiểu)</label><input id="x-min" type="number" min="1" max="100" value="15"></div><div><label>XP mỗi tin (tối đa)</label><input id="x-max" type="number" min="1" max="100" value="25"></div>
<div><label>Chống spam: mỗi bao nhiêu giây mới tính XP</label><input id="x-cd" type="number" min="0" max="3600" value="60"></div><div><label>Thông báo khi lên level</label><select id="x-msg"><option value="1">Bật</option><option value="0">Tắt</option></select></div>
<div><label>XP thoại</label><select id="x-vc-on"><option value="1">Bật</option><option value="0">Tắt</option></select></div><div><label>XP mỗi phút ở kênh voice</label><input id="x-vc-xp" type="number" min="0" max="1000" value="10"></div></div>
<h3>Role thưởng theo cấp (kiểu ProBot)</h3><p class="mut">Đạt mốc level thì tự nhận role. Tối đa 25 mốc.</p><div id="x-roles"></div>
<div class="row"><input id="x-role-lv" type="number" min="1" max="999" placeholder="Level" style="max-width:110px"><select id="x-role-role" style="flex:1"></select><button class="ghost" id="x-role-add" style="margin:0">Thêm mốc</button></div>
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
<div class="grid"><div><label>Chế độ đóng</label><select id="k-mode"><option value="delete">Xóa kênh</option><option value="archive">Lưu trữ (mở lại được)</option></select></div><div><label>Category lưu trữ</label><select id="k-arch"></select></div></div>
<div class="grid"><div><label>Tự đóng khi im lặng (giờ, 0 = tắt)</label><input id="k-auto" type="number" min="0" max="720" value="0"></div><div><label>Priority mặc định</label><select id="k-prio"><option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🔴 High</option><option value="urgent">⛔ Urgent</option></select></div></div>
<div><label>Blacklist chặn tạo ticket (<span id="k-blcount">0</span>)</label><div id="k-bl"></div></div>
<div class="grid"><div><label>ID user cần chặn</label><input id="k-bl-id" placeholder="123..."></div><div><label>Lý do</label><input id="k-bl-why" maxlength="300"></div></div>
<div><button class="ghost" id="k-bladd" style="margin-top:0">+ Chặn</button> <button class="ghost" id="k-stats">📊 Xem thống kê</button></div>
<div id="k-statsout" class="mut"></div>
<div><label>Các loại ticket (<span id="k-count">0</span>/10)</label><div id="k-types"></div></div>
<div class="grid"><div><label>Tên loại mới</label><input id="k-add-label" maxlength="25"></div><div><label>Mô tả ngắn</label><input id="k-add-desc" maxlength="100"></div></div>
<div class="grid"><div><label>Emoji</label><input id="k-add-emoji" maxlength="50" placeholder="🎫"></div><div><label>&nbsp;</label><button class="ghost" id="k-add" style="margin-top:0">+ Thêm loại</button></div></div>
<button id="k-save">Lưu</button><p class="mut">Áp dụng cho ticket mở mới và bảng panel gửi mới (dùng <b>/ticket setup</b> trong Discord).</p>
<div><label>Xem trước bảng panel</label><div class="pv" id="k-pv"></div></div></div>
<div id="p-a" class="card" style="display:none"><h2>Bảng thông báo (ticker)</h2>
<div><label>Kênh đăng bảng</label><select id="a-channel"></select></div>
<div><label>Tiêu đề</label><input id="a-title" placeholder="📢 THÔNG BÁO"></div>
<div><label>Nội dung (biến {server} {members} — nhiều tin thì tách nhau bằng 1 dòng --- )</label><textarea id="a-text" placeholder="Server sẽ bảo trì lúc 22:00&#10;---&#10;Nhớ đọc luật trước khi chat"></textarea></div>
<div><label>Xoay tin mỗi mấy phút (0 = tĩnh, chỉ hiện tin đầu)</label><input id="a-min" type="number" min="0" max="1440" value="0"></div>
<div><label>Màu viền</label><input id="a-color" type="color" value="#5865f2" style="height:40px;padding:2px"></div>
<button id="a-save">Lưu</button><button class="ghost" id="a-test">Đăng ngay</button>
<div><label>Xem trước (tin đầu)</label><div class="pv" id="a-pv"></div></div></div>
<div id="p-s" class="card" style="display:none"><h2>Trạng thái server</h2>
<p class="mut">Bảng embed tự sửa tin 24/24 trong kênh text: tổng thành viên · đang online · offline · số bot · đang voice.</p>
<div><label>Kênh text chứa bảng (để trống = chưa bật)</label><select id="s-board-ch"></select></div>
<div><label>Chu kỳ cập nhật (giây, 30–3600; mặc định 60)</label><input id="s-board-int" type="number" min="30" max="3600" step="10"></div>
<div id="s-board-state" class="mut" style="margin:8px 0"></div>
<button class="ghost" id="s-board-post">📌 Đăng / cập nhật bảng ngay</button><button class="ghost" id="s-board-off">Tắt bảng (xóa tin)</button><p class="mut">Bảng hiển thị: tổng thành viên · đang online · offline · số bot · đang voice. Tin bị xóa thì bot tự đăng lại. Người ẩn trạng thái (invisible) tính là offline.</p></div>
<div id="p-r" class="card" style="display:none"><h2>Role theo link mời</h2>
<p class="mut">Thành viên vào server bằng link mời nào thì tự nhận role tương ứng. Xem số lượt mời bằng lệnh <b>/invites</b>.</p>
<label class="chk"><input type="checkbox" id="inv-on"> Bật role theo link mời</label>
<div id="inv-rules"></div>
<button class="ghost" id="inv-add">+ Thêm quy tắc</button>
<div><label>Các link mời hiện có của server</label><div id="inv-list" class="mut">Đang tải...</div></div>
<div><label>Top người mời</label><div id="inv-stats" class="mut">Chưa có dữ liệu.</div></div>
<button id="inv-save">Lưu role theo link mời</button>
<hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:22px 0">
<h2>Bảng chọn role</h2>
<div><label>Bảng đang sửa</label><select id="r-board"></select></div>
<div class="grid"><div><label>Tên bảng mới (VD: Game, Màu sắc)</label><input id="r-new" maxlength="50"></div><div><label>&nbsp;</label><button id="r-create" style="margin-top:0">+ Tạo bảng</button></div></div>
<div id="r-import-wrap" style="display:none"><button class="ghost" id="r-import">Nhập bảng đơn cũ (/roles) thành board mới</button></div>
<div><label>Kênh đặt bảng</label><select id="r-channel"></select></div>
<div class="grid"><div><label>Tiêu đề</label><input id="r-title" placeholder="🎮 CHỌN ROLE"></div><div><label>Dòng hướng dẫn (biến {roles} {server} {members})</label><input id="r-desc" placeholder="Bấm nút bên dưới để nhận / bỏ role"></div></div>
<div class="grid"><div><label>Dòng chân (footer)</label><input id="r-footer" maxlength="100"></div><div><label>Ảnh góc phải (trống = icon server)</label><input id="r-thumb" placeholder="https://..."></div></div>
<div class="grid"><div><label>Chữ trong menu chọn</label><input id="r-ph" maxlength="150" placeholder="Nhận hoặc Xóa vai trò đã chọn..!"></div><div><label>Gạch cầu vồng dưới bảng</label><select id="r-rainbow"><option value="1">Bật</option><option value="0">Tắt</option></select></div></div>
<div class="grid"><div><label>Dòng chân (footer)</label><input id="r-footer" maxlength="100"></div><div><label>Ảnh góc phải (trống = icon server)</label><input id="r-thumb" placeholder="https://..."></div></div>
<div class="grid"><div><label>Chữ trong menu chọn</label><input id="r-ph" maxlength="150" placeholder="Nhận hoặc Xóa vai trò đã chọn..!"></div><div><label>Gạch cầu vồng dưới bảng</label><select id="r-rainbow"><option value="1">Bật</option><option value="0">Tắt</option></select></div></div>
<div class="grid"><div><label>Kiểu hiển thị</label><select id="r-display"><option value="buttons">Nút bấm</option><option value="select">Menu chọn</option><option value="reactions">Thả reaction</option></select></div><div><label>Role verify bắt buộc (trống = không cần)</label><select id="r-req"></select></div></div>
<div class="grid"><div><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="r-excl" style="width:auto"> Chọn 1 bỏ các role khác (exclusive)</label></div><div><label>Tối đa mấy role/người (0 = không giới hạn)</label><input id="r-max" type="number" min="0" max="25" value="0"></div></div>
<div><label>Cấp role tạm thời (tự gỡ khi hết hạn)</label></div>
<div class="grid"><div><label>User ID</label><input id="r-tmp-user" placeholder="123..."></div><div><label>Role</label><select id="r-tmp-role"></select></div></div>
<div class="grid"><div><label>Thời gian (VD: 30m, 2h, 1d)</label><input id="r-tmp-dur" placeholder="2h"></div><div><label>&nbsp;</label><button class="ghost" id="r-tmp-add" style="margin-top:0">Cấp tạm</button></div></div>
<div id="r-tmp-list" class="mut"></div>
<div><label>Role trong bảng (<span id="r-count">0</span>/25)</label><div id="r-items"></div></div>
<div class="grid"><div><label>Thêm role</label><select id="r-add-role"></select></div><div><label>Chữ trên nút (trống = tên role)</label><input id="r-add-label" maxlength="80"></div></div>
<div><label>Emoji trên nút (VD: 🎮, trống = không có)</label><input id="r-add-emoji" maxlength="50"></div>
<button class="ghost" id="r-add">+ Thêm vào danh sách</button><br>
<button id="r-save">Lưu + vẽ bảng</button><button class="ghost" id="r-del">Xóa bảng này</button><p class="mut">Member bấm nút để nhận, bấm lại để bỏ. Bot phải có quyền Manage Roles và role bot nằm trên các role này.</p></div>
<div id="p-g" class="card" style="display:none"><h2>Tin nhắn tạm biệt</h2>
<div><label id="lb-g">Kênh gửi tin tạm biệt</label><select id="g-channel"></select></div>
<div><label>Tiêu đề</label><input id="g-title" placeholder="👋 Tạm biệt"></div>
<div><label>Nội dung (biến {user} {tag} {server} {members})</label><textarea id="g-text" placeholder="👋 {user} vừa rời {server}. Hẹn gặp lại!"></textarea></div>
<div><label>Ảnh (trống = avatar người rời)</label><input id="g-image" placeholder="https://..."></div>
<div><label>Màu viền</label><input id="g-color" type="color" value="#ed4245" style="height:40px;padding:2px"></div>
<button id="g-save">Lưu</button><button class="ghost" id="g-test">Gửi thử</button>
<div><label>Xem trước</label><div class="pv" id="g-pv"></div></div></div>
<div id="p-o" class="card" style="display:none"><h2>Log kiểu ProBot</h2>
<div><label>Kênh nhận log</label><select id="o-channel"></select></div>
<div><label>Không thấy kênh? Dán ID kênh (chuột phải kênh → Sao chép ID)</label><input id="o-logid" placeholder="123..."></div>
<div><label>Bật/tắt từng loại</label><div id="o-types" class="grid"></div></div>
<button id="o-save">Lưu</button><p class="mut">Log nào tắt thì bot bỏ qua luôn, khỏi spam.</p></div>
<div id="p-u" class="card" style="display:none"><h2>Nhạc đang phát</h2>
<div id="u-state"><p class="mut">Đang tải...</p></div>
<div class="row"><button id="u-pause">⏸ Tạm dừng</button><button id="u-resume">▶ Tiếp tục</button><button id="u-skip">⏭ Skip</button><button class="ghost" id="u-stop">⏹ Dừng + xóa chờ</button></div>
<div class="grid"><div><label>Âm lượng (0–100)</label><input id="u-vol" type="number" min="0" max="100"></div><div><label>&nbsp;</label><button id="u-volset" style="margin-top:0">Đặt volume</button></div></div>
<div><label>Volume mặc định khi bắt đầu phát (trống = 100)</label><input id="u-defvol" type="number" min="0" max="100" placeholder="100"></div>
<p class="mut">Tự làm mới mỗi 10 giây. Thêm bài mới thì dùng lệnh <b>/play</b> trong Discord.</p></div>
<div id="p-ai" class="card" style="display:none"><h2>AI Chat — trò chuyện với RAPTOR</h2>
<p class="mut">Member tag <b>@RAPTOR</b> hoặc chat trong kênh riêng là bot trả lời bằng AI (Gemini miễn phí). API key đặt ở Environment của Botkeep (biến <b>AI_API_KEY</b>), không nhập tại đây.</p>
<label class="chk"><input type="checkbox" id="ai-on"> Bật AI Chat</label>
<div id="ai-keystate" class="mut" style="margin:8px 0"></div>
<div><label>Kênh chat riêng (để trống = chỉ trả lời khi được tag)</label><select id="ai-channel"></select></div>
<div><label>Model (để trống = mặc định của hệ thống)</label><input id="ai-model" placeholder="gemini-2.5-flash"></div>
<div><label>Tính cách của bot (để trống = mặc định)</label><textarea id="ai-persona" rows="4" maxlength="1000" placeholder="Bạn là RAPTOR, trợ lý AI thân thiện trong server Discord..."></textarea></div>
<button id="ai-save">Lưu AI Chat</button></div>
<div id="p-v" class="card" style="display:none"><h2>Giveaway mặc định</h2>
<div><label>Kênh đăng giveaway mặc định</label><select id="v-channel"></select></div>
<div class="grid"><div><label>Số người thắng mặc định</label><input id="v-winners" type="number" min="1" max="20" value="1"></div><div><label>Thời gian mặc định (VD: 10m, 1h, 1d)</label><input id="v-duration" value="10m"></div></div>
<button id="v-save">Lưu</button><p class="mut">Lệnh <b>/giveaway start</b> chỉ cần ghi giải thưởng, còn lại lấy mặc định ở đây.</p></div>
<div id="p-ov"><div class="ovgrid"><div class="ovcol"><div class="card"><h2>Tổng quan</h2><div id="ov-body"><p class="mut">Đang tải...</p></div><div class="row" id="ov-links"></div></div><div class="card"><h2>Hoạt động gần đây</h2><div id="ov-activity"><p class="mut">Đang tải...</p></div></div></div><div class="ovcol"><div class="card"><h2>Trạng thái bot</h2><div id="ov-status"><p class="mut">Đang tải...</p></div><button class="ghost" id="ov-restart" type="button" style="margin-top:12px">Khởi động lại bot</button><p class="mut" style="margin-top:6px">Bot tắt trong vài giây rồi được Botkeep tự chạy lại. Hàng đợi nhạc đã lưu sẽ tự khôi phục.</p></div><div class="card"><h2>Bật / tắt nhanh</h2><div id="ov-toggles"><p class="mut">Đang tải...</p></div></div><div class="card"><h2>Top cấp độ</h2><div id="ov-top"><p class="mut">Đang tải...</p></div></div></div></div></div>
<div id="p-mod" class="card" style="display:none"><h2>Moderation — thao tác nhanh</h2>
<div class="grid"><div><label>Hành động</label><select id="md-act"><option value="warn">⚠️ Warn</option><option value="timeout">⏳ Timeout</option><option value="kick">👢 Kick</option><option value="ban">🔨 Ban</option><option value="unban">♻️ Unban (dùng ID)</option></select></div><div><label>User ID</label><input id="md-user" placeholder="123..."></div></div>
<div class="grid"><div><label>Lý do</label><input id="md-reason" maxlength="400" placeholder="Không có lý do"></div><div><label>Số phút (chỉ timeout)</label><input id="md-mins" type="number" min="1" max="40320" value="10"></div></div>
<button id="md-go">Thực hiện</button>
<div><label>Tra warns của user</label></div>
<div class="grid"><div><label>User ID</label><input id="md-wuser" placeholder="123..."></div><div><label>&nbsp;</label><button class="ghost" id="md-wgo" style="margin-top:0">Xem warns</button></div></div>
<div id="md-warns" class="mut"></div></div>
<div id="p-am" class="card" style="display:none"><h2>AutoMod — lọc tự động</h2>
<label class="chk"><input type="checkbox" id="am-words" checked> Lọc từ cấm (danh sách ở trang Kiểm duyệt)</label>
<label class="chk"><input type="checkbox" id="am-invites"> Chặn link invite Discord</label>
<label class="chk"><input type="checkbox" id="am-links"> Chặn mọi link http(s)</label>
<label class="chk"><input type="checkbox" id="am-spam"> Chống spam (nhắn quá nhanh)</label>
<label class="chk"><input type="checkbox" id="am-caps"> Chặn viết hoa quá mức (CAPS)</label>
<label class="chk"><input type="checkbox" id="am-mentions"> Chặn tag quá nhiều người</label>
<label class="chk"><input type="checkbox" id="am-whole"> Từ cấm phải khớp nguyên từ (tránh bắt nhầm chữ dính nhau)</label>
<div class="grid"><div><label>Spam: tối đa mấy tin</label><input id="am-count" type="number" min="2" max="20" value="5"></div><div><label>Spam: trong mấy giây</label><input id="am-secs" type="number" min="2" max="60" value="5"></div></div>
<div class="grid"><div><label>CAPS: % chữ hoa tối thiểu</label><input id="am-caps-pct" type="number" min="30" max="100" value="70"></div><div><label>CAPS: tin dài ít nhất (ký tự)</label><input id="am-caps-len" type="number" min="4" max="200" value="10"></div></div>
<div class="grid"><div><label>Tag tối đa mấy người / tin</label><input id="am-mention-count" type="number" min="2" max="50" value="5"></div><div><label>Timeout mấy phút (khi phạt timeout)</label><input id="am-mins" type="number" min="1" max="40320" value="10"></div></div>
<h3>Hình phạt riêng theo loại vi phạm</h3>
<div class="grid">
<div><label>Từ cấm</label><select id="am-act-words"><option value="delete">Chỉ xóa tin</option><option value="warn">Xóa + warn</option><option value="timeout">Xóa + timeout</option></select></div>
<div><label>Invite</label><select id="am-act-invites"><option value="delete">Chỉ xóa tin</option><option value="warn">Xóa + warn</option><option value="timeout">Xóa + timeout</option></select></div>
<div><label>Link</label><select id="am-act-links"><option value="delete">Chỉ xóa tin</option><option value="warn">Xóa + warn</option><option value="timeout">Xóa + timeout</option></select></div>
<div><label>Spam</label><select id="am-act-spam"><option value="delete">Chỉ xóa tin</option><option value="warn">Xóa + warn</option><option value="timeout">Xóa + timeout</option></select></div>
<div><label>CAPS</label><select id="am-act-caps"><option value="delete">Chỉ xóa tin</option><option value="warn">Xóa + warn</option><option value="timeout">Xóa + timeout</option></select></div>
<div><label>Tag nhiều</label><select id="am-act-mentions"><option value="delete">Chỉ xóa tin</option><option value="warn">Xóa + warn</option><option value="timeout">Xóa + timeout</option></select></div></div>
<div class="grid"><div><label>URL được phép (mỗi dòng 1 mẫu, VD youtube.com)</label><textarea id="am-url-wl" rows="3"></textarea></div><div><label>URL bị chặn (mỗi dòng 1 mẫu)</label><textarea id="am-url-bl" rows="3"></textarea></div></div>
<div class="grid"><div><label>Kênh chỉ đăng ảnh/video</label><select id="am-imgch" multiple></select></div><div><label>Kênh chỉ đăng link YouTube</label><select id="am-ytch" multiple></select></div></div>
<div class="grid"><div><label>Kênh bỏ qua (giữ Ctrl để chọn nhiều)</label><select id="am-xch" multiple></select></div><div><label>Role bỏ qua</label><select id="am-xr" multiple></select></div></div>
<h3>🛡️ Anti-Raid</h3>
<label class="chk"><input type="checkbox" id="ar-on"> Bật Anti-Raid (xử lý loạt tài khoản mới vào ồ ạt)</label>
<div class="grid"><div><label>Tuổi tài khoản bị nghi ngờ</label><select id="ar-age"><option value="7">≤ 1 tuần</option><option value="30">≤ 1 tháng</option><option value="90">≤ 3 tháng</option><option value="0">Mọi tuổi</option></select></div><div><label>Số người vào để kích hoạt</label><input id="ar-count" type="number" min="3" max="100" value="5"></div></div>
<div class="grid"><div><label>Trong vòng mấy giây</label><input id="ar-secs" type="number" min="5" max="600" value="30"></div><div><label>Hành động</label><select id="ar-act"><option value="timeout">Timeout</option><option value="kick">Kick</option><option value="ban">Ban</option></select></div></div>
<div class="grid"><div><label>Timeout mấy phút (nếu chọn Timeout)</label><input id="ar-mins" type="number" min="1" max="40320" value="60"></div></div>
<button id="am-save">Lưu</button></div>
<div id="p-cmd" class="card" style="display:none"><h2>Lệnh bật/tắt</h2><p class="mut">Tắt lệnh nào thì member gõ sẽ bị từ chối (vẫn nhìn thấy lệnh trong list).</p><div id="cmd-list"></div><button id="cmd-save">Lưu</button></div>
<div id="p-voice" class="card" style="display:none"><h2>Kênh voice tạm — kiểu VoiceMaster</h2>
<p class="mut">Chọn 1 kênh voice làm <b>kênh tạo phòng</b>: thành viên nào vào kênh đó sẽ được bot tạo 1 phòng voice riêng rồi kéo sang, kèm bảng điều khiển ngay trong phòng (khóa phòng, đổi tên, giới hạn người, cho phép/đá người, nhận phòng khi chủ rời). Phòng tự xóa khi mọi người rời hết.</p>
<label class="chk"><input type="checkbox" id="tv-on"> Bật kênh voice tạm</label>
<div class="grid"><div><label>Kênh tạo phòng (vào kênh này = tạo phòng)</label><select id="tv-gen"></select></div><div><label>Chuyên mục chứa phòng tạm</label><select id="tv-cat"></select></div></div>
<div class="grid"><div><label>Mẫu tên phòng ({user} = tên người tạo)</label><input id="tv-name" placeholder="🎧 Phòng của {user}"></div><div><label>Giới hạn người mặc định (0 = không giới hạn)</label><input id="tv-limit" type="number" min="0" max="99" value="0"></div></div>
<div style="max-width:280px"><label>Số phòng tối đa mỗi người tạo cùng lúc</label><input id="tv-max" type="number" min="1" max="10" value="1"></div>
<button id="tv-save" type="button">Lưu cấu hình voice tạm</button></div>
<div id="p-shop" class="card" style="display:none"><h2>Shop — đổi credits lấy role</h2>
<p class="mut">Thành viên xem hàng bằng <b>/shop list</b> và mua bằng <b>/shop buy</b>. Credits kiếm được qua <b>/credits daily</b>, rep và hoạt động trong server.</p>
<div id="shop-items"></div>
<button class="ghost" id="shop-add">+ Thêm mặt hàng</button><br>
<button id="shop-save">Lưu cửa hàng</button>
<hr style="border:0;border-top:1px solid var(--line);margin:22px 0">
<h3>Hộp gacha — mở hộp ngẫu nhiên bằng credits</h3>
<p class="mut">Thành viên gõ <b>/gacha open</b> để mở hộp. Đặt giá mở, thêm các phần quà và trọng số (số càng lớn càng dễ trúng; tỉ lệ % tự chia theo trọng số). Quà có thể kèm role được gán tự động.</p>
<div style="max-width:260px"><label>Giá mở 1 hộp (credits)</label><input id="gc-cost" type="number" min="1" value="100"></div>
<div id="gc-prizes" style="margin-top:10px"></div>
<button class="ghost" id="gc-add" type="button">+ Thêm phần quà</button><br>
<button id="gc-save" type="button">Lưu hộp gacha</button></div>
<div id="p-embed" class="card" style="display:none"><h2>Trình tạo Embed</h2>
<p class="mut">Soạn tin nhắn embed đẹp như thông báo sự kiện rồi gửi thẳng vào kênh — có xem trước trực tiếp và lưu mẫu dùng lại.</p>
<div class="grid"><div><label>Kênh gửi</label><select id="e-ch"></select></div><div><label>Màu viền</label><input id="e-color" type="color" value="#e0322d" style="height:40px;padding:2px"></div></div>
<div><label>Tiêu đề</label><input id="e-title" maxlength="256" placeholder="🎉 Sự kiện cuối tuần"></div>
<div><label>Nội dung</label><textarea id="e-desc" rows="5" maxlength="4000" placeholder="Mô tả chi tiết..."></textarea></div>
<div class="grid"><div><label>Ảnh lớn (URL)</label><input id="e-image" placeholder="https://..."></div><div><label>Ảnh nhỏ góc phải (URL)</label><input id="e-thumb" placeholder="https://..."></div></div>
<div class="grid"><div><label>Dòng cuối (footer)</label><input id="e-footer" maxlength="200"></div><div><label>Chữ trên nút bấm (trống = không có nút)</label><input id="e-btnlabel" maxlength="80"></div></div>
<div><label>Link của nút bấm</label><input id="e-btnurl" placeholder="https://..."></div>
<div><label>Xem trước</label><div class="eprev" id="e-pv"></div></div>
<div class="grid"><div><label>Mẫu đã lưu</label><select id="e-tpl"></select></div><div><label>Tên mẫu mới</label><input id="e-tplname" maxlength="60" placeholder="VD: Thông báo sự kiện"></div></div>
<button id="e-send">Gửi embed</button><button class="ghost" id="e-savetpl">Lưu thành mẫu</button><button class="ghost" id="e-deltpl">Xóa mẫu đang chọn</button></div>
<div id="p-set" class="card" style="display:none"><h2>Cài đặt chung</h2>
<div class="grid"><div><label>Ngôn ngữ</label><select id="s-lang"><option value="vi">Tiếng Việt</option><option value="en">English (đang dịch dần)</option></select></div><div><label>Prefix (dự trữ — bot hiện dùng lệnh slash)</label><input id="s-prefix" maxlength="5" value="!"></div></div>
<h3>⭐ Starboard</h3>
<label class="chk"><input type="checkbox" id="sb-on"> Bật Starboard (tin đạt đủ sao sẽ đăng vào kênh nổi bật)</label>
<div class="grid"><div><label>Kênh starboard</label><select id="sb-ch"></select></div><div><label>Emoji tính sao</label><input id="sb-emoji" maxlength="10" value="⭐"></div></div>
<div class="grid"><div><label>Số sao tối thiểu</label><input id="sb-th" type="number" min="1" max="50" value="3"></div></div>
<div><label>Múi giờ hiển thị ngày giờ</label><select id="s-tz"><option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option><option value="Asia/Tokyo">Nhật Bản (GMT+9)</option><option value="Asia/Bangkok">Bangkok (GMT+7)</option><option value="Asia/Singapore">Singapore (GMT+8)</option><option value="UTC">UTC</option><option value="America/New_York">New York</option><option value="Europe/London">London</option></select></div>
<button id="set-save">Lưu</button>
<hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:22px 0">
<h3>Sao lưu cấu hình server</h3>
<p class="mut">Xuất toàn bộ cài đặt (chung, chào mừng, tạm biệt, bảng xếp hạng, nhật ký, shop, link mời, mẫu embed) thành 1 file JSON. Nhập lại để khôi phục hoặc chép sang server khác — thao tác nhập sẽ ghi đè cài đặt hiện tại của các mục có trong file.</p>
<button class="ghost" id="cfg-export" type="button">⬇ Xuất cấu hình (.json)</button>
<input type="file" id="cfg-file" accept=".json,application/json" style="display:block;margin-top:12px">
<button class="ghost" id="cfg-import" type="button">⬆ Nhập cấu hình từ file đã chọn</button>
<hr style="border:0;border-top:1px solid var(--line);margin:22px 0">
<h3>Thông báo video TikTok mới</h3>
<p class="mut">Bot kiểm tra mỗi 10 phút — có video mới là đăng vào kênh đã chọn kèm đường link. Nguồn mặc định là kênh TikTok <b>@phimhayplus38</b> qua RSSHub (dịch vụ trung gian, đôi lúc chập chờn thì bot tự thử lại lần sau, không ảnh hưởng các tính năng khác).</p>
<label class="chk"><input type="checkbox" id="sf-on"> Bật thông báo video mới</label>
<div class="grid"><div><label>Kênh đăng thông báo</label><select id="sf-ch"></select></div><div><label>Đường dẫn nguồn tin (RSS)</label><input id="sf-url" placeholder="https://rsshub.app/tiktok/user/phimhayplus38"></div></div>
<button class="ghost" id="sf-save" type="button">Lưu thông báo video</button>
<hr style="border:0;border-top:1px solid var(--line);margin:22px 0">
<h3>Lọc link lừa đảo</h3>
<p class="mut">Tự xóa tin nhắn chứa link giả mạo Discord / Steam / Nitro (kiểu dliscord.com, discord-nitro.xyz...) và cảnh cáo người gửi. Người có quyền Quản lý tin nhắn được miễn. Domain hợp lệ như discord.com, youtube.com không bao giờ bị chặn.</p>
<label class="chk"><input type="checkbox" id="scf-on"> Bật lọc link lừa đảo</label>
<div><label>Domain chặn thêm (mỗi dòng 1 domain)</label><textarea id="scf-domains" rows="3" placeholder="vidu-lua-dao.com"></textarea></div>
<button class="ghost" id="scf-save" type="button">Lưu bộ lọc link</button></div></main></div></div>`, `<script>
const G='${esc(gid)}';
const $=id=>document.getElementById(id);
try{const L=document.getElementById('layout'),SD=document.getElementById('sidewrap'),RB=document.getElementById('rail-btn'),SC=document.getElementById('scrim');if(localStorage.getItem('raptor-rail')==='1'){L.classList.add('rail');RB.textContent='❯'}RB.onclick=()=>{const on=L.classList.toggle('rail');RB.textContent=on?'❯':'❮';localStorage.setItem('raptor-rail',on?'1':'0')};const closeSide=()=>{SD.classList.remove('open');SC.classList.remove('on')};document.getElementById('mbar-btn').onclick=()=>{SD.classList.add('open');SC.classList.add('on')};SC.onclick=closeSide;document.querySelectorAll('.side .nav').forEach(n=>n.addEventListener('click',()=>{if(window.innerWidth<=900)closeSide()}));}catch(e){}
try{const NS=document.getElementById('nav-search');const navs=[...document.querySelectorAll('.side .nav')];const glabels=[...document.querySelectorAll('.side .glabel')];NS.addEventListener('input',()=>{const q=NS.value.trim().toLowerCase();navs.forEach(n=>{n.style.display=(!q||n.textContent.toLowerCase().includes(q))?'':'none'});glabels.forEach(g=>{let el=g.nextElementSibling,any=false;while(el&&!el.classList.contains('glabel')&&!el.classList.contains('achip')){if(el.classList.contains('nav')&&el.style.display!=='none')any=true;el=el.nextElementSibling}g.style.display=any?'':'none'})});NS.addEventListener('keydown',e=>{if(e.key==='Enter'){const f=navs.find(n=>n.style.display!=='none'&&n.id);if(f)f.click()}});document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();NS.focus()}});}catch(e){}
document.getElementById('t-ov').onclick=e=>{t('t-ov',['p-ov'])};
document.getElementById('t-mod').onclick=e=>{t('t-mod',['p-mod','p-m'])};
document.getElementById('t-am').onclick=e=>{t('t-am',['p-am'])};
document.getElementById('t-o').onclick=e=>{t('t-o',['p-o'])};
document.getElementById('t-w').onclick=e=>{t('t-w',['p-w'])};
document.getElementById('t-g').onclick=e=>{t('t-g',['p-g'])};
document.getElementById('t-x').onclick=e=>{t('t-x',['p-x','p-l'])};
document.getElementById('t-v').onclick=e=>{t('t-v',['p-v'])};
document.getElementById('t-voice').onclick=e=>{t('t-voice',['p-voice']);loadVoice()};
document.getElementById('t-t').onclick=e=>{t('t-t',['p-t'])};
document.getElementById('t-r').onclick=e=>{t('t-r',['p-r'])};
document.getElementById('t-u').onclick=e=>{t('t-u',['p-u']);loadMusic()};
document.getElementById('t-s').onclick=e=>{t('t-s',['p-s','p-a'])};
document.getElementById('t-cmd').onclick=e=>{t('t-cmd',['p-cmd']);loadCmds()};
document.getElementById('t-shop').onclick=e=>{t('t-shop',['p-shop']);loadShop()};
document.getElementById('t-ai').onclick=e=>{t('t-ai',['p-ai'])};
document.getElementById('t-embed').onclick=e=>{t('t-embed',['p-embed']);loadEmbedPanel()};
document.getElementById('t-set').onclick=e=>{t('t-set',['p-set']);loadMiscSettings()};
t('t-ov',['p-ov']);
function t(tab,pages){if(!Array.isArray(pages))pages=[pages];document.querySelectorAll('.nav').forEach(x=>x.classList.remove('on'));document.getElementById(tab).classList.add('on');['p-ov','p-mod','p-am','p-w','p-l','p-x','p-m','p-t','p-a','p-s','p-r','p-g','p-o','p-u','p-v','p-cmd','p-set','p-shop','p-embed','p-voice','p-ai'].forEach(p=>document.getElementById(p).style.display='none');pages.forEach(p=>document.getElementById(p).style.display='block')}
function opt(sel,list,cur,allowEmpty){const s=$(sel);s.innerHTML=(allowEmpty?'<option value="">— không dùng —</option>':'')+list.map(o=>'<option value="'+o.id+'"'+(o.lock?' disabled':'')+'>'+o.name.replace(/</g,'&lt;')+(o.lock?' 🔒':'')+'</option>').join('');if(cur)s.value=cur;mkSearch(s)}
let META=null;
async function api(m,url,body){const r=await fetch(url,{method:m,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=null}if(d===null)throw new Error('Phiên đăng nhập đã hết hạn — hãy tải lại trang và đăng nhập lại');if(!r.ok)throw new Error(d.error||('Lỗi '+r.status));return d}
(async()=>{
  try{
    META=await api('GET','/dashboard/api/guilds/'+G+'/meta');
    GNAME=META.guild?.name||'server';CHMAP={};
    for(const c of (META.channels||[]).concat(META.categories||[]))CHMAP[c.id]=c.name;
    try{document.getElementById('lb-g').textContent='Kênh gửi tin tạm biệt (tìm thấy '+(META.channels||[]).length+' kênh)'}catch(e){}
    const chs=META.channels, txt=[{id:'',name:'— không dùng —'}].concat(chs);CHS=txt;
    const fill=(id,v)=>opt(id,txt,v,true);
    const [w,l]=await Promise.all([api('GET','/dashboard/api/guilds/'+G+'/welcome'),api('GET','/dashboard/api/guilds/'+G+'/leaderboard')]);
    fill('w-channel',w.channelId);$('w-title').value=w.title||'';fill('w-role',w.roleChannelId);fill('w-rules',w.rulesChannelId);fill('w-ann',w.announceChannelId);fill('w-chat',w.chatChannelId);
    $('w-image').value=w.imageUrl||'';if(w.color)$('w-color').value=w.color;$('w-reactions').value=(w.reactions||[]).join(',');
    $('w-banner').value=w.bannerUrl||'';$('w-rainbow').value=w.bannerRainbow===false?'0':'1';$('w-desc').value=w.welcomeText||'';
    $('w-card').value=w.cardEnabled===false?'0':'1';$('w-dm').value=w.dmEnabled?'1':'0';
    opt('w-accept',[{id:'',name:'— không có nút —'}].concat(META.roles),w.acceptRoleId,true);
    WBTS=(w.welcomeButtons||[]).map(b=>({label:b.label||'',url:b.url||''}));renderWBtns();
    opt('w-autorole',[{id:'',name:'— không dùng —'}].concat(META.roles),w.autoRoleId,true);
    opt('l-channel',txt,l.channelId,true);$('l-limit').value=l.limit||10;
    const st=await api('GET','/dashboard/api/guilds/'+G+'/settings');
    $('x-min').value=st.xpMin??15;$('x-max').value=st.xpMax??25;$('x-cd').value=st.xpCooldownSec??60;$('x-msg').value=st.levelUpMessage===false?'0':'1';$('x-on').value=st.levelEnabled===false?'0':'1';
    $('x-vc-on').value=st.voiceXpEnabled===false?'0':'1';$('x-vc-xp').value=st.voiceXpPerMin??10;LROLES=(st.levelRoles||[]).map(r=>({level:r.level,roleId:r.roleId}));opt('x-role-role',META.roles);renderLroles();
    $('m-words').value=(st.bannedWords||'');opt('m-log',txt,st.logChannelId,true);
    opt('k-cat',[{id:'',name:'— tạo ở đầu server —'}].concat(META.categories||[]),st.ticketCategoryId,true);
    opt('k-staff',[{id:'',name:'— chỉ admin + chủ ticket —'}].concat(META.roles),st.ticketStaffRoleId,true);
    $('k-img').value=st.ticketPanelImageUrl||'';
    $('k-title').value=st.panelTitle||'';$('k-desc').value=st.panelDescription||'';
    $('k-claim').value=st.showClaim===false?'0':'1';$('k-trans').value=st.showTranscript===false?'0':'1';
    $('k-rate').value=st.showRating===false?'0':'1';$('k-delay').value=st.closeDelaySec??5;
    $('k-mode').value=st.closeMode==='archive'?'archive':'delete';
    opt('k-arch',[{id:'',name:'— chưa đặt —'}].concat(META.categories||[]),st.archiveCategoryId,true);
    $('k-auto').value=st.autoCloseHours||0;$('k-prio').value=st.defaultPriority||'medium';
    KTYPES=(st.ticketTypes||[]).map(t=>({label:t.label||'',description:t.description||'',emoji:t.emoji||''}));renderTypes();
    try{
      const bl=await api('GET','/dashboard/api/guilds/'+G+'/tickets/blacklist');
      $('k-blcount').textContent=bl.length;
      $('k-bl').innerHTML=bl.length?bl.map(e=>'<div class=row style="padding:6px 0;border-bottom:1px solid #e8eaee"><span style="flex:1">&lt;@'+e.userId+'&gt; <span class=mut>'+String(e.reason||'').replace(/</g,'&lt;')+'</span></span><button class=ghost data-u="'+e.userId+'" style="margin:0;padding:4px 10px">Gỡ</button></div>').join(''):'<p class=mut>Trống.</p>';
      document.querySelectorAll('#k-bl button').forEach(b=>b.onclick=async()=>{await api('DELETE','/dashboard/api/guilds/'+G+'/tickets/blacklist/'+b.dataset.u);toast('Đã gỡ chặn');document.getElementById('t-t').click()});
    }catch(e){}
    KTYPES=(st.ticketTypes||[]).map(t=>({label:t.label||'',description:t.description||'',emoji:t.emoji||''}));renderTypes();
    opt('v-channel',txt,st.giveawayChannelId,true);$('v-winners').value=st.giveawayWinners||1;$('v-duration').value=st.giveawayDuration||'10m';
    if(document.getElementById('u-defvol'))$('u-defvol').value=st.musicDefaultVolume??'';
    const an=await api('GET','/dashboard/api/guilds/'+G+'/announce');
    opt('a-channel',txt,an.channelId,true);$('a-title').value=an.title||'';$('a-text').value=an.text||'';$('a-min').value=an.intervalMin||0;if(an.color)$('a-color').value=an.color;if(an.color)$('a-color').value=an.color;
    const ss=await api('GET','/dashboard/api/guilds/'+G+'/stats');
    opt('s-board-ch',[{id:'',name:'— chưa bật —'}].concat(txt),ss.boardChannelId,true);$('s-board-int').value=ss.boardIntervalSec||60;$('s-board-state').textContent=ss.boardChannelId?('Đang bật · chu kỳ '+(ss.boardIntervalSec||60)+' giây'+(ss.boardMessageId?' · đã có tin bảng':' · chưa đăng tin')):'Đang tắt — chọn kênh rồi bấm Đăng.';
    const rp=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');
    RBOARDS=rp||[];RBID=RBOARDS.length?String(RBOARDS[0].id||RBOARDS[0]._id):'';
    // Bảng đơn cũ còn dữ liệu mà chưa có board nào → hiện nút nhập
    try{
      const legacy=await api('GET','/dashboard/api/guilds/'+G+'/roles');
      if(!RBOARDS.length&&(legacy.items||[]).length)document.getElementById('r-import-wrap').style.display='block';
    }catch(e){}
    opt('r-add-role',META.roles);renderBoards();await loadBoard();
    const aic=await api('GET','/dashboard/api/guilds/'+G+'/aichat');
    $('ai-on').checked=!!aic.enabled;opt('ai-channel',[{id:'',name:'— chỉ khi được tag —'}].concat(txt),aic.channelId,true);$('ai-model').value=(st.aiChatCfg&&st.aiChatCfg.model)||'';$('ai-persona').value=(st.aiChatCfg&&st.aiChatCfg.persona)||'';$('ai-keystate').textContent=aic.keySet?'✅ Đã có API key trong Environment — bot sẵn sàng trả lời.':'❌ Chưa có API key (AI_API_KEY) trong Botkeep Environment — bot chưa trả lời được.';
    loadInvites().catch(()=>{});
    const gb=await api('GET','/dashboard/api/guilds/'+G+'/goodbye');
    opt('g-channel',txt,gb.channelId,true);$('g-title').value=gb.title||'';$('g-text').value=gb.text||'';$('g-image').value=gb.imageUrl||'';if(gb.color)$('g-color').value=gb.color;
    const lg=await api('GET','/dashboard/api/guilds/'+G+'/logs');
    opt('o-channel',txt,lg.channelId,true);
    $('o-types').innerHTML=lg.types.map(([k,l])=>'<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-k="'+k+'" style="width:auto"'+(lg.toggles[k]!==false?' checked':'')+'> '+l.replace(/</g,'&lt;')+'</label>').join('');
    $('s-lang').value=st.language||'vi';$('s-prefix').value=st.prefix||'!';if(st.timezone)$('s-tz').value=st.timezone;
    const sb=st.starboard||{};$('sb-on').checked=!!sb.enabled;opt('sb-ch',txt,sb.channelId,true);$('sb-emoji').value=sb.emoji||'⭐';$('sb-th').value=sb.threshold||3;
    const am=st.automod||{};
    $('am-words').checked=am.words!==false;$('am-invites').checked=!!am.invites;$('am-links').checked=!!am.links;$('am-spam').checked=!!am.spam;
    $('am-caps').checked=!!am.caps;$('am-mentions').checked=!!am.mentions;$('am-whole').checked=!!am.wholeWord;
    $('am-count').value=am.spamCount||5;$('am-secs').value=am.spamSecs||5;$('am-mins').value=am.timeoutMin||10;
    $('am-caps-pct').value=am.capsPercent||70;$('am-caps-len').value=am.capsMinLen||10;$('am-mention-count').value=am.mentionCount||5;
    for(const r of ['words','invites','links','spam','caps','mentions'])$('am-act-'+r).value=(am.actions&&am.actions[r])||am.action||'delete';
    $('am-url-wl').value=(am.urlWhitelist||[]).join('\\n');$('am-url-bl').value=(am.urlBlacklist||[]).join('\\n');
    optMulti('am-imgch',txt,am.onlyImageChannels||[]);optMulti('am-ytch',txt,am.onlyYoutubeChannels||[]);
    optMulti('am-xch',txt,am.exemptChannels||[]);optMulti('am-xr',META.roles,am.exemptRoles||[]);
    const ar=st.antiraid||{};$('ar-on').checked=!!ar.enabled;$('ar-age').value=String(ar.ageDays??7);$('ar-count').value=ar.count||5;$('ar-secs').value=ar.windowSecs||30;$('ar-act').value=ar.action||'timeout';$('ar-mins').value=ar.timeoutMin||60;
    loadOv();
    pvWelcome();pvGoodbye();pvAnnounce();pvTicket();
  }catch(e){toast('Lỗi tải: '+e.message+' (bot phải đã vào server và bạn là admin)')}
})();
$('w-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/welcome',{channelId:$('w-channel').value||null,title:$('w-title').value||null,roleChannelId:$('w-role').value||null,rulesChannelId:$('w-rules').value||null,announceChannelId:$('w-ann').value||null,chatChannelId:$('w-chat').value||null,imageUrl:$('w-image').value||null,color:$('w-color').value||null,reactions:$('w-reactions').value,autoRoleId:$('w-autorole').value||null,bannerUrl:$('w-banner').value||null,bannerRainbow:$('w-rainbow').value==='1',welcomeText:$('w-desc').value||null,cardEnabled:$('w-card').value==='1',dmEnabled:$('w-dm').value==='1',acceptRoleId:$('w-accept').value||null,welcomeButtons:WBTS});toast('Đã lưu welcome')}catch(e){toast('Lỗi: '+e.message)}};
$('w-test').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/welcome/test');toast('Đã gửi thử! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh trước)')}};
$('l-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/leaderboard',{channelId:$('l-channel').value||null,limit:parseInt($('l-limit').value||'10',10)});toast('Đã lưu leaderboard')}catch(e){toast('Lỗi: '+e.message)}};
$('l-refresh').onclick=async()=>{try{await api('POST','/dashboard/api/guilds/'+G+'/leaderboard/refresh');toast('Đã cập nhật BXH')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh trước)')}};
function curSettings(){return{xpMin:parseInt($('x-min').value||'15',10),xpMax:parseInt($('x-max').value||'25',10),xpCooldownSec:parseInt($('x-cd').value||'60',10),levelUpMessage:$('x-msg').value==='1',levelEnabled:$('x-on').value==='1',voiceXpEnabled:$('x-vc-on').value==='1',voiceXpPerMin:parseInt($('x-vc-xp').value||'10',10),levelRoles:LROLES,bannedWords:$('m-words').value,logChannelId:$('m-log').value||null,ticketCategoryId:$('k-cat').value||null,ticketStaffRoleId:$('k-staff').value||null,ticketPanelImageUrl:$('k-img').value||null,panelTitle:$('k-title').value||null,panelDescription:$('k-desc').value||null,showClaim:$('k-claim').value==='1',showTranscript:$('k-trans').value==='1',showRating:$('k-rate').value==='1',closeDelaySec:parseInt($('k-delay').value||'5',10),closeMode:$('k-mode').value,archiveCategoryId:$('k-arch').value||null,autoCloseHours:parseInt($('k-auto').value||'0',10),defaultPriority:$('k-prio').value,ticketTypes:KTYPES,giveawayChannelId:$('v-channel').value||null,giveawayWinners:parseInt($('v-winners').value||'1',10),giveawayDuration:$('v-duration').value||null,musicDefaultVolume:$('u-defvol').value===''||$('u-defvol').value===null?null:parseInt($('u-defvol').value,10)}}
$('x-save').onclick=$('m-save').onclick=$('k-save').onclick=$('v-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/settings',curSettings());toast('Đã lưu')}catch(e){toast('Lỗi: '+e.message)}};
$('a-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/announce',{channelId:$('a-channel').value||null,title:$('a-title').value||null,text:$('a-text').value,intervalMin:parseInt($('a-min').value||'0',10),color:$('a-color').value||null});toast('Đã lưu bảng tin')}catch(e){toast('Lỗi: '+e.message)}};
$('a-test').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/announce/test');toast('Đã đăng bảng! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh + nội dung trước)')}};
$('s-board-post').onclick=async()=>{try{const ch=$('s-board-ch').value;if(!ch){toast('Hãy chọn kênh text chứa bảng trước');return}let iv=parseInt($('s-board-int').value,10);if(!(iv>=30))iv=60;if(iv>3600)iv=3600;await api('PUT','/dashboard/api/guilds/'+G+'/stats',{boardChannelId:ch,boardIntervalSec:iv});const d=await api('POST','/dashboard/api/guilds/'+G+'/stats/board/post');$('s-board-state').textContent='Đang bật · chu kỳ '+iv+' giây · đã có tin bảng';toast('Đã đăng bảng trạng thái')}catch(e){toast('Lỗi: '+e.message)}};
$('s-board-off').onclick=async()=>{try{await api('POST','/dashboard/api/guilds/'+G+'/stats/board/off');$('s-board-state').textContent='Đang tắt';toast('Đã tắt bảng trạng thái')}catch(e){toast('Lỗi: '+e.message)}};
$('ai-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/aichat',{enabled:$('ai-on').checked,channelId:$('ai-channel').value||null,model:$('ai-model').value||null,persona:$('ai-persona').value||null});toast('Đã lưu AI Chat')}catch(e){toast('Lỗi: '+e.message)}};
let RITEMS=[];let RBOARDS=[];let RBID='';let CHS=[{id:'',name:'— không dùng —'}];
let KTYPES=[];
let LROLES=[];
function renderLroles(){$('x-roles').innerHTML=LROLES.length?LROLES.slice().sort((a,b)=>a.level-b.level).map((r)=>{const i=LROLES.indexOf(r);return '<div class=row style="padding:6px 0;border-bottom:1px solid #e8eaee"><span style="flex:1">Level <b>'+r.level+'</b> → <b>'+rName(r.roleId).replace(/</g,'&lt;')+'</b></span><button class=ghost data-n="'+i+'" style="margin:0;padding:4px 10px">Xóa</button></div>'}).join(''):'<p class=mut>Chưa có mốc nào.</p>';document.querySelectorAll('#x-roles button').forEach(b=>b.onclick=()=>{LROLES.splice(parseInt(b.dataset.n,10),1);renderLroles()})}
let WBTS=[];
function renderWBtns(){$('w-bcount').textContent=WBTS.length;$('w-btns').innerHTML=WBTS.length?WBTS.map((b,n)=>'<div class=row style="padding:6px 0;border-bottom:1px solid #e8eaee"><span style="flex:1">'+(n+1)+'. <b>'+String(b.label||'').replace(/</g,'&lt;')+'</b> <span class=mut>'+String(b.url||'').replace(/</g,'&lt;')+'</span></span><button class=ghost data-n="'+n+'" style="margin:0;padding:4px 10px">Xóa</button></div>').join(''):'<p class=mut>Chưa có nút nào.</p>';document.querySelectorAll('#w-btns button').forEach(x=>x.onclick=()=>{WBTS.splice(parseInt(x.dataset.n,10),1);renderWBtns()})}
$('w-btn-add').onclick=()=>{const l=$('w-btn-label').value.trim(),u=$('w-btn-url').value.trim();if(!l||!/^https?:\\/\\//i.test(u))return toast('Nhập chữ + link https');if(WBTS.length>=4)return toast('Tối đa 4 nút');WBTS.push({label:l.slice(0,80),url:u});$('w-btn-label').value='';$('w-btn-url').value='';renderWBtns()};
function renderTypes(){$('k-count').textContent=KTYPES.length;$('k-types').innerHTML=KTYPES.length?KTYPES.map((t,n)=>'<div class=row style="padding:6px 0;border-bottom:1px solid #e8eaee"><span style="flex:1">'+(n+1)+'. '+(t.emoji||'')+' <b>'+String(t.label||'').replace(/</g,'&lt;')+'</b> <span class=mut>'+String(t.description||'').replace(/</g,'&lt;')+'</span></span><button class=ghost data-n="'+n+'" style="margin:0;padding:4px 10px">Xóa</button></div>').join(''):'<p class=mut>Trống = dùng 4 loại mặc định.</p>';document.querySelectorAll('#k-types button').forEach(b=>b.onclick=()=>{KTYPES.splice(parseInt(b.dataset.n,10),1);renderTypes()})}
$('x-role-add').onclick=()=>{const lv=parseInt($('x-role-lv').value||'0',10),rid=$('x-role-role').value;if(!lv||lv<1)return toast('Nhập level hợp lệ');if(!rid)return toast('Chọn role đã');if(LROLES.length>=25)return toast('Tối đa 25 mốc');if(LROLES.some(r=>r.level===lv))return toast('Đã có mốc level này');LROLES.push({level:lv,roleId:rid});$('x-role-lv').value='';renderLroles()};
$('k-add').onclick=()=>{const l=$('k-add-label').value.trim();if(!l)return toast('Nhập tên loại');if(KTYPES.length>=10)return toast('Tối đa 10 loại');KTYPES.push({label:l.slice(0,25),description:$('k-add-desc').value.slice(0,100),emoji:$('k-add-emoji').value||'🎫'});$('k-add-label').value='';$('k-add-desc').value='';$('k-add-emoji').value='';renderTypes()};
$('k-bladd').onclick=async()=>{const id=$('k-bl-id').value.trim();if(!id)return toast('Nhập ID user');try{await api('POST','/dashboard/api/guilds/'+G+'/tickets/blacklist',{userId:id,reason:$('k-bl-why').value});$('k-bl-id').value='';$('k-bl-why').value='';toast('Đã chặn');document.getElementById('t-t').click()}catch(e){toast('Lỗi: '+e.message)}};
$('k-stats').onclick=async()=>{try{const s=await api('GET','/dashboard/api/guilds/'+G+'/tickets/stats');$('k-statsout').innerHTML='Đang mở: <b>'+s.open+'</b> • Đã đóng: <b>'+s.closedTotal+'</b> • TB: '+(s.avgMin!==null?'~'+s.avgMin+' phút':'?')+' • Đánh giá: '+(s.ratingAvg?s.ratingAvg+'⭐ ('+s.ratingCount+')':'chưa có')+'<br>Theo loại: '+Object.entries(s.byType).map(([k,v])=>k+': <b>'+v+'</b>').join(' • ')+'<br>Top staff:<br>'+(s.staff.map(x=>'• <b>'+String(x.tag).replace(/</g,'&lt;')+'</b> — nhận '+x.claimed+', đóng '+x.closed).join('<br>')||'—')}catch(e){toast('Lỗi: '+e.message)}};
function rName(id){const r=(META.roles||[]).find(x=>x.id===id);return r?r.name:id}
function renderBoards(){opt('r-board',RBOARDS.map(b=>({id:String(b.id||b._id),name:b.name+' ('+(b.itemCount||0)+')'})),RBID)}
async function loadBoard(){if(!RBID){$('r-channel').value='';$('r-title').value='';$('r-desc').value='';RITEMS=[];renderItems();return}try{const b=await api('GET','/dashboard/api/guilds/'+G+'/roleboards/'+RBID);opt('r-channel',CHS,b.channelId,true);$('r-title').value=b.title||'';$('r-desc').value=b.description||'';RITEMS=(b.items||[]).map(i=>({roleId:i.roleId,label:i.label||'',emoji:i.emoji||''}));renderItems();$('r-display').value=b.display||'buttons';opt('r-req',[{id:'',name:'— không cần —'}].concat(META.roles),b.requiredRoleId,true);$('r-excl').checked=!!b.exclusive;$('r-max').value=b.maxPicks||0;$('r-footer').value=b.footer||'';$('r-thumb').value=b.thumbnailUrl||'';$('r-ph').value=b.placeholder||'';$('r-rainbow').value=b.rainbowBar===false?'0':'1';opt('r-tmp-role',META.roles);loadTmp()}catch(e){toast('Lỗi tải bảng: '+e.message)}}
async function loadTmp(){try{const l=await api('GET','/dashboard/api/guilds/'+G+'/temproles');$('r-tmp-list').innerHTML=l.length?l.map(e=>'<div class=row style="padding:6px 0;border-bottom:1px solid #e8eaee"><span style="flex:1">&lt;@'+e.userId+'&gt; — <b>'+rName(e.roleId).replace(/</g,'&lt;')+'</b> <span class=mut>hết hạn <t:'+Math.floor(e.expiresAt/1000)+':R></span></span><button class=ghost data-u="'+e.userId+'" data-r="'+e.roleId+'" style="margin:0;padding:4px 10px">Gỡ</button></div>').join(''):'<p class=mut>Không có role tạm nào.</p>';document.querySelectorAll('#r-tmp-list button').forEach(x=>x.onclick=async()=>{await api('DELETE','/dashboard/api/guilds/'+G+'/temproles?userId='+x.dataset.u+'&roleId='+x.dataset.r);loadTmp()})}catch(e){}}
function renderItems(){$('r-count').textContent=RITEMS.length;$('r-items').innerHTML=RITEMS.length?RITEMS.map((i,n)=>'<div class=row style="padding:6px 0;border-bottom:1px solid #e8eaee"><span style="flex:1">'+(n+1)+'. <b>'+rName(i.roleId).replace(/</g,'&lt;')+'</b> '+(i.emoji||'')+' — nút: <b>'+(i.label||rName(i.roleId)).replace(/</g,'&lt;')+'</b></span><button class=ghost data-n="'+n+'" style="margin:0;padding:4px 10px">Xóa</button></div>').join(''):'<p class=mut>Chưa có role nào.</p>';document.querySelectorAll('#r-items button').forEach(b=>b.onclick=()=>{RITEMS.splice(parseInt(b.dataset.n,10),1);renderItems()})}
$('r-add').onclick=()=>{const id=$('r-add-role').value;if(!id)return toast('Chọn role đã');if(RITEMS.some(i=>i.roleId===id))return toast('Role đã có trong bảng');if(RITEMS.length>=25)return toast('Tối đa 25 role');RITEMS.push({roleId:id,label:$('r-add-label').value||rName(id),emoji:$('r-add-emoji').value||''});$('r-add-label').value='';$('r-add-emoji').value='';renderItems()};
$('r-save').onclick=async()=>{if(!RBID)return toast('Tạo/chọn bảng trước');try{await api('PUT','/dashboard/api/guilds/'+G+'/roleboards/'+RBID,{channelId:$('r-channel').value||null,title:$('r-title').value||null,description:$('r-desc').value||null,display:$('r-display').value,exclusive:$('r-excl').checked,maxPicks:parseInt($('r-max').value||'0',10),requiredRoleId:$('r-req').value||null,footer:$('r-footer').value||null,thumbnailUrl:$('r-thumb').value||null,placeholder:$('r-ph').value||null,rainbowBar:$('r-rainbow').value==='1',items:RITEMS});const d=await api('POST','/dashboard/api/guilds/'+G+'/roleboards/'+RBID+'/refresh');const l=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');RBOARDS=l;renderBoards();toast('Đã vẽ bảng! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần chọn kênh + ít nhất 1 role)')}};
$('r-tmp-add').onclick=async()=>{try{await api('POST','/dashboard/api/guilds/'+G+'/temproles',{userId:$('r-tmp-user').value.trim(),roleId:$('r-tmp-role').value,duration:$('r-tmp-dur').value});$('r-tmp-user').value='';$('r-tmp-dur').value='';toast('Đã cấp role tạm');loadTmp()}catch(e){toast('Lỗi: '+e.message+' (kiểm tra ID user, quyền bot, thời gian VD: 2h)')}};
$('r-board').onchange=()=>{RBID=$('r-board').value;loadBoard()};
$('r-create').onclick=async()=>{const name=$('r-new').value.trim();if(!name)return toast('Nhập tên bảng');try{const d=await api('POST','/dashboard/api/guilds/'+G+'/roleboards',{name});const l=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');RBOARDS=l;RBID=String(d.board.id);renderBoards();$('r-new').value='';await loadBoard();toast('Đã tạo bảng '+name)}catch(e){toast('Lỗi: '+e.message)}};
$('r-import').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/roleboards/import',{});const l=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');RBOARDS=l;RBID=String(d.id);document.getElementById('r-import-wrap').style.display='none';renderBoards();await loadBoard();toast('Đã nhập bảng cũ')}catch(e){toast('Lỗi: '+e.message)}};
$('r-del').onclick=async()=>{if(!RBID)return;if(!confirm('Xóa bảng này? Tin nhắn bảng cũng bị xóa.'))return;try{await api('DELETE','/dashboard/api/guilds/'+G+'/roleboards/'+RBID);const l=await api('GET','/dashboard/api/guilds/'+G+'/roleboards');RBOARDS=l;RBID=RBOARDS.length?String(RBOARDS[0].id||RBOARDS[0]._id):'';renderBoards();await loadBoard();toast('Đã xóa bảng')}catch(e){toast('Lỗi: '+e.message)}};
$('g-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/goodbye',{channelId:$('g-channel').value||null,title:$('g-title').value||null,text:$('g-text').value,imageUrl:$('g-image').value||null,color:$('g-color').value||null});toast('Đã lưu tin tạm biệt')}catch(e){toast('Lỗi: '+e.message)}};
$('g-test').onclick=async()=>{try{const d=await api('POST','/dashboard/api/guilds/'+G+'/goodbye/test');toast('Đã gửi thử! Mở Discord xem');if(d.url)window.open(d.url,'_blank')}catch(e){toast('Lỗi: '+e.message+' (cần setup kênh trước)')}};
$('o-save').onclick=async()=>{try{const tg={};document.querySelectorAll('#o-types input').forEach(c=>tg[c.dataset.k]=c.checked);const id=$('o-logid').value.trim()||$('o-channel').value||null;await api('PUT','/dashboard/api/guilds/'+G+'/logs',{channelId:id,toggles:tg});if($('o-logid').value.trim())$('o-logid').value='';toast('Đã lưu cấu hình log')}catch(e){toast('Lỗi: '+e.message)}};
function optMulti(sel,list,cur){const s=$(sel);const set=new Set(cur||[]);s.innerHTML=list.map(o=>'<option value="'+o.id+'"'+(set.has(o.id)?' selected':'')+'>'+o.name.replace(/</g,'&lt;')+'</option>').join('');mkSearch(s)}
let GNAME='server', CHMAP={};
function escH(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mdLite(s){
  let out=escH(s);
  out=out.replace(/<#(\\d+)>/g,(m,id)=>'#'+escH(CHMAP[id]||'kênh'));
  out=out.replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>');
  return out.replace(/\\n/g,'<br>');
}
function pvEmbed(el,title,desc,color,thumb,imgNote){
  document.getElementById(el).innerHTML='<small>Xem trước kiểu Discord</small><div class="pv-embed" style="border-left-color:'+escH(color||'#ff4d9d')+'">'+(thumb?'<img class="pv-thumb" src="'+escH(thumb)+'">':'')+'<div class="pv-title">'+mdLite(title||'(không tiêu đề)')+'</div><div class="pv-desc">'+mdLite(desc||'(trống)')+'</div>'+(imgNote?'<div><small>'+escH(imgNote)+'</small></div>':'')+'<div style="clear:both"></div></div>';
}
function sampleVars(extra){return Object.assign({member:'@Bạn',mention:'@Bạn',user:'@Bạn',username:'Bạn',tag:'Bạn#0000',server:'**'+GNAME+'**',count:'**186th**',membercount:'**186**',created:'01/01/2024'},extra||{})}
function fillVars(t,vars){let out=String(t||'');for(const k of Object.keys(vars))out=out.split('{'+k+'}').join(vars[k]);return out}
function chName(id,fb){return id?'<#'+id+'>':fb}
function pvWelcome(){
  const v=sampleVars({role:chName($('w-role').value,'**role-sever**'),rules:chName($('w-rules').value,'**rule-discord**'),announce:chName($('w-ann').value,'**thông-báo**'),chat:chName($('w-chat').value,'**chat-chung**')});
  const t=$('w-desc').value||'➔ Chào mừng {member} đã tham gia {server}.\\n➔ Bạn là người thứ : {count}';
  pvEmbed('w-pv',$('w-title').value||('By '+GNAME),fillVars(t,v),$('w-color').value,null,($('w-banner').value||($('w-rainbow').value==='1'))?'🖼️ Có ảnh dưới embed':'');
}
function pvGoodbye(){
  const v=sampleVars({});
  pvEmbed('g-pv',$('g-title').value||'👋 Tạm biệt Bạn',fillVars($('g-text').value||'👋 {user} vừa rời {server}. Hẹn gặp lại!',v),$('g-color').value,null,'');
}
function pvAnnounce(){
  const v=sampleVars({members:'186'});
  const first=($('a-text').value||'').split(/\\r?\\n---\\r?\\n/)[0];
  pvEmbed('a-pv',$('a-title').value||'📢 THÔNG BÁO',fillVars(first,v),$('a-color').value,null,'');
}
function pvTicket(){
  pvEmbed('k-pv',$('k-title').value||'🎫 Bạn cần hỗ trợ - hãy mở ticket!',$('k-desc').value||'(mẫu mặc định của bot)',null,null,'');
}
['w-title','w-desc','w-color','w-role','w-rules','w-ann','w-chat'].forEach(id=>document.getElementById(id).addEventListener('input',pvWelcome));
['g-title','g-text','g-color'].forEach(id=>document.getElementById(id).addEventListener('input',pvGoodbye));
['a-title','a-text','a-color'].forEach(id=>document.getElementById(id).addEventListener('input',pvAnnounce));
['k-title','k-desc'].forEach(id=>document.getElementById(id).addEventListener('input',pvTicket));
function selVals(sel){return Array.from($(sel).selectedOptions).map(o=>o.value)}
function mkSearch(s){
  if(!s)return;
  if(s._filter){s._all=Array.from(s.options);applyFilter(s);return}
  const inp=document.createElement('input');inp.placeholder='🔍 Gõ tên để lọc list bên dưới...';inp.title='Gõ để lọc, rồi click chọn 1 dòng trong list';inp.style.marginBottom='4px';
  inp.addEventListener('input',()=>applyFilter(s));
  s.parentNode.insertBefore(inp,s);s._filter=inp;s._all=Array.from(s.options);applyFilter(s);
}
function applyFilter(s){
  const inp=s._filter;if(!inp)return;
  const q=inp.value.toLowerCase();
  const all=s._all||Array.from(s.options);s._all=all;
  const keepSet=new Set();
  if(s.multiple){for(const o of Array.from(s.selectedOptions))keepSet.add(o.value)}
  else{try{if(s.value)keepSet.add(s.value)}catch(e){}}
  s.innerHTML='';
  for(const o of all){if(!q||o.text.toLowerCase().indexOf(q)>=0)s.appendChild(o)}
  for(const o of Array.from(s.options)){if(keepSet.has(o.value))o.selected=true}
  if(!s.multiple){try{const vs=Array.from(keepSet);if(vs.length&&[...s.options].some(o=>o.value===vs[0]))s.value=vs[0]}catch(e){}}
}
const X=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const roleOpts=sel=>'<option value="">— Chọn role —</option>'+(META.roles||[]).map(r=>'<option value="'+r.id+'"'+(String(r.id)===String(sel)?' selected':'')+'>'+X(r.name)+'</option>').join('');
// ===== Role theo link mời =====
function addInvRule(code,roleId){const div=document.createElement('div');div.className='inv-rule';div.innerHTML='<div class="grid"><div><label>Mã link mời (phần sau discord.gg/)</label><input class="inv-code" value="'+X(code||'')+'" placeholder="abc123"></div><div><label>Role được nhận</label><select class="inv-role">'+roleOpts(roleId||'')+'</select></div></div><button class="ghost inv-del" type="button">Xóa quy tắc</button>';div.querySelector('.inv-del').onclick=()=>div.remove();$('inv-rules').appendChild(div)}
async function loadInvites(){try{const d=await api('GET','/dashboard/api/guilds/'+G+'/invites');$('inv-on').checked=!!(d.cfg&&d.cfg.enabled);$('inv-rules').innerHTML='';((d.cfg&&d.cfg.rules)||[]).forEach(r=>addInvRule(r.code,r.roleId));$('inv-list').innerHTML=(d.invites&&d.invites.length)?d.invites.map(i=>'<div>discord.gg/<b>'+X(i.code)+'</b> — '+(i.uses||0)+' lượt dùng'+(i.inviter?' · tạo bởi '+X(i.inviter):'')+'</div>').join(''):'Chưa đọc được link mời nào (bot cần quyền Quản lý server để xem link mời).';$('inv-stats').innerHTML=(d.stats&&d.stats.length)?d.stats.map(s=>'<div><b>'+X(s.name)+'</b> — '+s.total+' lượt mời</div>').join(''):'Chưa có dữ liệu.'}catch(e){}}
$('inv-add').onclick=()=>addInvRule('','');
$('inv-save').onclick=async()=>{const rules=[...document.querySelectorAll('.inv-rule')].map(r=>({code:r.querySelector('.inv-code').value.trim(),roleId:r.querySelector('.inv-role').value})).filter(r=>r.code&&r.roleId);try{await api('PUT','/dashboard/api/guilds/'+G+'/invites',{enabled:$('inv-on').checked,rules});toast('Đã lưu role theo link mời ('+rules.length+' quy tắc)')}catch(e){toast('Lỗi: '+e.message)}};
// ===== Shop credits =====
function addShopItem(it){it=it||{};const div=document.createElement('div');div.className='shop-item';div.innerHTML='<div class="grid"><div><label>Mã mặt hàng (dùng trong /shop buy)</label><input class="sh-id" value="'+X(it.id||'')+'" placeholder="vip1"></div><div><label>Tên hiển thị</label><input class="sh-name" value="'+X(it.name||'')+'" placeholder="Role VIP"></div></div><div class="grid"><div><label>Giá (credits)</label><input class="sh-price" type="number" min="1" value="'+(it.price||100)+'"></div><div><label>Role nhận được</label><select class="sh-role">'+roleOpts(it.roleId||'')+'</select></div></div><div><label>Mô tả (tuỳ chọn)</label><input class="sh-desc" value="'+X(it.desc||'')+'"></div><button class="ghost sh-del" type="button">Xóa mặt hàng</button><hr style="border:0;border-top:1px solid rgba(255,255,255,.06);margin:14px 0">';div.querySelector('.sh-del').onclick=()=>div.remove();$('shop-items').appendChild(div)}
async function loadShop(){try{const d=await api('GET','/dashboard/api/guilds/'+G+'/shop');const box=$('shop-items');box.innerHTML='';(d.items||[]).forEach(addShopItem);if(!(d.items||[]).length)box.innerHTML='<p class="mut">Chưa có mặt hàng nào — bấm “+ Thêm mặt hàng” để bắt đầu.</p>'}catch(e){}loadGacha().catch(()=>{})}
$('shop-add').onclick=()=>{const b=$('shop-items');if(b.querySelector('.mut'))b.innerHTML='';addShopItem({})};
$('shop-save').onclick=async()=>{const items=[...document.querySelectorAll('.shop-item')].map(r=>({id:r.querySelector('.sh-id').value.trim(),name:r.querySelector('.sh-name').value.trim(),price:parseInt(r.querySelector('.sh-price').value||'0',10),roleId:r.querySelector('.sh-role').value||null,desc:r.querySelector('.sh-desc').value.trim()})).filter(x=>x.name);try{await api('PUT','/dashboard/api/guilds/'+G+'/shop',{items});toast('Đã lưu cửa hàng ('+items.length+' mặt hàng)')}catch(e){toast('Lỗi: '+e.message)}};
// ===== Trình tạo Embed =====
let ETPL=[];
function embedFormData(){return{title:$('e-title').value,description:$('e-desc').value,color:$('e-color').value,image:$('e-image').value,thumbnail:$('e-thumb').value,footer:$('e-footer').value,btnLabel:$('e-btnlabel').value,btnUrl:$('e-btnurl').value}}
function embedFill(d){d=d||{};$('e-title').value=d.title||'';$('e-desc').value=d.description||'';$('e-color').value=/^#[0-9a-fA-F]{6}$/.test(d.color||'')?d.color:'#e0322d';$('e-image').value=d.image||'';$('e-thumb').value=d.thumbnail||'';$('e-footer').value=d.footer||'';$('e-btnlabel').value=d.btnLabel||'';$('e-btnurl').value=d.btnUrl||'';embedPreview()}
function embedPreview(){const d=embedFormData();const pv=$('e-pv');if(!pv)return;pv.style.borderLeftColor=d.color||'#e0322d';pv.innerHTML=(d.title?'<h4>'+X(d.title)+'</h4>':'')+(d.description?'<p>'+X(d.description)+'</p>':'')+(d.image?'<img class="eimg" src="'+X(d.image)+'">':'')+(!d.title&&!d.description&&!d.image?'<p>Xem trước sẽ hiện ở đây…</p>':'')+(d.footer?'<div class="eft">'+X(d.footer)+'</div>':'')+(d.btnLabel&&d.btnUrl?'<div style="margin-top:10px"><span class="pbdg">'+X(d.btnLabel)+'</span></div>':'')}
function renderTpl(){$('e-tpl').innerHTML=ETPL.length?ETPL.map((t,i)=>'<option value="'+i+'">'+X(t.name)+'</option>').join(''):'<option value="">— Chưa có mẫu —</option>'}
async function loadEmbedPanel(){try{opt('e-ch',(META.channels||[]).filter(c=>c.type===0||c.type===5),null,true)}catch(e){}embedPreview();try{const d=await api('GET','/dashboard/api/guilds/'+G+'/embed/templates');ETPL=d.templates||[];renderTpl()}catch(e){}}
['e-title','e-desc','e-color','e-image','e-thumb','e-footer','e-btnlabel','e-btnurl'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',embedPreview)});
$('e-tpl').onchange=()=>{const t=ETPL[parseInt($('e-tpl').value,10)];if(t)embedFill(t.data)};
$('e-savetpl').onclick=async()=>{const name=$('e-tplname').value.trim();if(!name)return toast('Nhập tên mẫu trước');try{const d=await api('POST','/dashboard/api/guilds/'+G+'/embed/templates',{name,data:embedFormData()});ETPL=d.templates||ETPL;renderTpl();$('e-tplname').value='';toast('Đã lưu mẫu')}catch(e){toast('Lỗi: '+e.message)}};
$('e-deltpl').onclick=async()=>{const t=ETPL[parseInt($('e-tpl').value,10)];if(!t)return toast('Chưa có mẫu để xóa');if(!confirm('Xóa mẫu này?'))return;try{const d=await api('POST','/dashboard/api/guilds/'+G+'/embed/templates/delete',{name:t.name});ETPL=d.templates||[];renderTpl();toast('Đã xóa mẫu')}catch(e){toast('Lỗi: '+e.message)}};
$('e-send').onclick=async()=>{const ch=$('e-ch').value;if(!ch)return toast('Chọn kênh gửi trước');try{await api('POST','/dashboard/api/guilds/'+G+'/embed/send',{channelId:ch,embed:embedFormData()});toast('Đã gửi embed vào kênh đã chọn')}catch(e){toast('Lỗi: '+e.message)}};
// ===== Sao lưu cấu hình =====
$('cfg-export').onclick=async()=>{try{const r=await fetch('/dashboard/api/guilds/'+G+'/config/export');if(!r.ok)throw new Error('HTTP '+r.status);const blob=await r.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='raptor-config-'+G+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Đã tải file cấu hình')}catch(e){toast('Lỗi xuất: '+e.message)}};
/* ===== Voice tạm (kiểu VoiceMaster) ===== */
async function loadVoice(){try{const d=await api('GET','/dashboard/api/guilds/'+G+'/tempvoice');$('tv-on').checked=!!d.enabled;opt('tv-gen',[{id:'',name:'— chọn kênh voice —'}].concat(META.voice||[]),d.generatorId,true);opt('tv-cat',[{id:'',name:'— cùng chuyên mục với kênh tạo phòng —'}].concat(META.categories||[]),d.categoryId,true);$('tv-name').value=d.nameTpl||'🎧 Phòng của {user}';$('tv-limit').value=d.defaultLimit||0;$('tv-max').value=d.maxPerUser||1}catch(e){}}
$('tv-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/tempvoice',{enabled:$('tv-on').checked,generatorId:$('tv-gen').value||null,categoryId:$('tv-cat').value||null,nameTpl:$('tv-name').value.trim(),defaultLimit:parseInt($('tv-limit').value,10)||0,maxPerUser:Math.max(1,parseInt($('tv-max').value,10)||1)});toast('Đã lưu cấu hình voice tạm')}catch(e){toast('Lỗi khi lưu: '+e.message)}};
/* ===== Đợt 3: hộp gacha + thông báo video + lọc link lừa đảo + nút restart ===== */
function addGachaPrize(p){p=p||{};const div=document.createElement('div');div.className='gc-prize';div.innerHTML='<div class="grid"><div><label>Tên phần quà</label><input class="gc-name" placeholder="VD: Role VIP 7 ngày" value="'+X(p.name||'')+'"></div><div><label>Role tặng kèm (tùy chọn)</label><select class="gc-role">'+roleOpts(p.roleId||'')+'</select></div><div><label>Trọng số (số càng lớn càng dễ trúng)</label><input class="gc-weight" type="number" min="1" max="1000" value="'+(p.weight||10)+'"></div></div><button class="ghost gc-del" type="button">Xóa phần quà</button>';div.querySelector('.gc-del').onclick=()=>div.remove();$('gc-prizes').appendChild(div)}
async function loadGacha(){try{const d=await api('GET','/dashboard/api/guilds/'+G+'/gacha');$('gc-cost').value=d.cost||100;const box=$('gc-prizes');box.innerHTML='';(d.prizes||[]).forEach(addGachaPrize);if(!(d.prizes||[]).length)box.innerHTML='<p class="mut">Chưa có phần quà nào — bấm “+ Thêm phần quà” để bắt đầu.</p>'}catch(e){}}
$('gc-add').onclick=()=>{const b=$('gc-prizes');if(b.querySelector('.mut'))b.innerHTML='';addGachaPrize({})};
$('gc-save').onclick=async()=>{try{const prizes=[...document.querySelectorAll('.gc-prize')].map(d=>({name:d.querySelector('.gc-name').value.trim(),roleId:d.querySelector('.gc-role').value||null,weight:Math.max(1,parseInt(d.querySelector('.gc-weight').value,10)||10)})).filter(p=>p.name);await api('PUT','/dashboard/api/guilds/'+G+'/gacha',{cost:Math.max(1,parseInt($('gc-cost').value,10)||100),prizes});toast('Đã lưu hộp gacha ('+prizes.length+' phần quà)')}catch(e){toast('Lỗi khi lưu: '+e.message)}};
async function loadSocialFeed(){try{const d=await api('GET','/dashboard/api/guilds/'+G+'/socialfeed');$('sf-on').checked=!!d.enabled;$('sf-url').value=d.feedUrl||'';opt('sf-ch',textCh,d.channelId,true)}catch(e){}}
async function loadScam(){try{const d=await api('GET','/dashboard/api/guilds/'+G+'/scamfilter');$('scf-on').checked=d.enabled!==false;$('scf-domains').value=(d.extraDomains||[]).join(String.fromCharCode(10))}catch(e){}}
function loadMiscSettings(){loadSocialFeed().catch(()=>{});loadScam().catch(()=>{})}
$('sf-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/socialfeed',{enabled:$('sf-on').checked,feedUrl:$('sf-url').value.trim(),channelId:$('sf-ch').value||null});toast('Đã lưu thông báo video mới')}catch(e){toast('Lỗi khi lưu: '+e.message)}};
$('scf-save').onclick=async()=>{try{const domains=$('scf-domains').value.split(String.fromCharCode(10)).map(s=>s.trim()).filter(Boolean);await api('PUT','/dashboard/api/guilds/'+G+'/scamfilter',{enabled:$('scf-on').checked,extraDomains:domains});toast('Đã lưu bộ lọc link lừa đảo')}catch(e){toast('Lỗi khi lưu: '+e.message)}};
$('ov-restart').onclick=async()=>{if(!confirm('Khởi động lại bot ngay? Bot sẽ offline khoảng vài chục giây rồi tự chạy lại.'))return;const d=await api('POST','/dashboard/api/guilds/'+G+'/bot/restart',{});toast(d.ok?'Đã gửi yêu cầu — bot sẽ khởi động lại trong giây lát':'Lỗi: '+(d.error||'?'))};
$('cfg-import').onclick=async()=>{const f=$('cfg-file').files&&$('cfg-file').files[0];if(!f)return toast('Chọn file .json đã xuất trước');if(!confirm('Nhập cấu hình sẽ GHI ĐÈ cài đặt hiện tại của các mục có trong file. Tiếp tục?'))return;try{const data=JSON.parse(await f.text());const d=await api('POST','/dashboard/api/guilds/'+G+'/config/import',{data});toast('Đã nhập xong: '+((d.done||[]).join(', ')||'—'))}catch(e){toast('Lỗi nhập: '+e.message)}};
async function loadOv(){const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));try{const d=await api('GET','/dashboard/api/guilds/'+G+'/overview');const IC={m:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M16 5.6a3.2 3.2 0 0 1 0 5.9M17.8 15.3c1.5.7 2.4 2 2.7 4.2"/></svg>',c:'<svg viewBox="0 0 24 24"><path d="M4 6.5C4 5.1 5.1 4 6.5 4h11C18.9 4 20 5.1 20 6.5v7c0 1.4-1.1 2.5-2.5 2.5H13l-3.6 3.6c-.5.5-1.4.1-1.4-.6V16H6.5C5.1 16 4 14.9 4 13.5z"/></svg>',r:'<svg viewBox="0 0 24 24"><path d="M12 3l7 2.8v5.4c0 4.4-2.9 7.4-7 9.3-4.1-1.9-7-4.9-7-9.3V5.8z"/></svg>',t:'<svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v2a2.6 2.6 0 0 0 0 5.2v2A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.7v-2a2.6 2.6 0 0 0 0-5.2z"/></svg>',b:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.4"/><path d="M3.5 10h17M7 15h4"/></svg>'};const st=(ic,cls,n,l)=>'<div class=stat><div class="sic '+cls+'">'+ic+'</div><b>'+n+'</b><span>'+l+'</span></div>';$('ov-body').innerHTML='<div class=statgrid>'+st(IC.m,'s1',d.members,'thành viên')+st(IC.c,'s2',d.channels,'kênh')+st(IC.r,'s3',d.roles,'role')+st(IC.t,'s4',d.openTickets,'ticket mở')+st(IC.b,'s5',d.boards,'bảng role')+'</div>'+(d.botPerms?'<p style="margin:16px 0 9px;font-weight:600;color:#eef1f7">Quyền của bot trong server</p><div class=pbadges>'+Object.entries(d.botPerms).map(([k,v])=>'<span class="pbdg'+(v?'':' off')+'">'+E(k)+(v?'':' (chưa có)')+'</span>').join('')+'</div>':'');if(d.guild&&d.guild.name){const c=$('srv-chip');if(c)c.textContent=d.guild.name}if(d.bot){const ms=d.bot.uptime||0,dd=Math.floor(ms/864e5),hh=Math.floor(ms%864e5/36e5),mm=Math.floor(ms%36e5/6e4);const up=dd>0?dd+' ngày '+String(hh).padStart(2,'0')+' giờ':(hh>0?hh+' giờ '+String(mm).padStart(2,'0')+' phút':mm+' phút');$('ov-status').innerHTML='<div class=kv><span>Trạng thái</span><b><span class=odot></span>Online</b></div><div class=kv><span>Bot</span><b>'+E(d.bot.tag||'—')+'</b></div><div class=kv><span>Uptime</span><b>'+up+'</b></div><div class=kv><span>Độ trễ (ping)</span><b>'+(d.bot.ping>=0?d.bot.ping+' ms':'—')+'</b></div><div class=kv><span>RAM tiến trình</span><b>'+d.bot.memMB+' MB</b></div><div class=kv><span>Đang phục vụ</span><b>'+d.bot.guilds+' server</b></div>'}if(d.top){$('ov-top').innerHTML=d.top.length?d.top.map(u=>'<div class=xpr>'+(u.avatar?'<img src="'+E(u.avatar)+'" alt="">':'<span class=xfb>'+E((u.name||'?').slice(0,1).toUpperCase())+'</span>')+'<div class=xw><b><span>'+E(u.name)+'</span><em>Cấp '+u.level+'</em></b><div class=xbar><i style="width:'+(u.pct||0)+'%"></i></div></div></div>').join(''):'<p class=mut>Chưa có dữ liệu XP.</p>'}const go=[['t-w','Welcome'],['t-mod','Moderation'],['t-v','Giveaway'],['t-t','Ticket'],['t-o','Logs']];$('ov-links').innerHTML=go.map(([t,l])=>'<button class=ghost data-t="'+t+'">'+l+'</button>').join('');document.querySelectorAll('#ov-links button').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.t).click());if(d.toggles){const T=d.toggles;const rows=[['leveling','Leveling — XP khi chat'],['voicexp','XP thoại — khi ở kênh voice'],['starboard','Starboard — tin nổi bật'],['antiraid','Anti-raid — chặn acc mới vào ồ ạt']];$('ov-toggles').innerHTML=rows.map(([k,l])=>'<label class=trow><span>'+l+'</span><span class="tsw'+(T[k]?' on':'')+'" data-k="'+k+'"></span></label>').join('');document.querySelectorAll('#ov-toggles .tsw').forEach(s=>s.onclick=async()=>{const k=s.dataset.k;const v=!s.classList.contains('on');s.classList.toggle('on',v);try{await api('POST','/dashboard/api/guilds/'+G+'/overview/toggles',{key:k,value:v});toast('Đã '+(v?'bật':'tắt')+' — áp dụng ngay cho bot')}catch(e){s.classList.toggle('on',!v);toast('Lỗi: '+e.message)}})}if(d.activity){const GLYPH={join:'<svg viewBox="0 0 24 24" stroke="#3fb969"><path d="M16 20v-1.6c0-2-1.8-3.4-4.5-3.4S7 16.4 7 18.4V20"/><circle cx="11.5" cy="8" r="3.4"/><path d="M18.5 5.5v4M16.5 7.5h4"/></svg>',leave:'<svg viewBox="0 0 24 24" stroke="#f07167"><path d="M9 20H6.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2H9M16 16.5L20.5 12 16 7.5M20.3 12H9.5"/></svg>',level:'<svg viewBox="0 0 24 24" stroke="#ffb02e"><path d="M8 20.5h8M12 17v3.5M6.5 4h11v4.5a5.5 5.5 0 0 1-11 0z"/><path d="M6.5 6H4a2.5 2.5 0 0 0 2.6 4.4M17.5 6H20A2.5 2.5 0 0 1 17.4 10.4"/></svg>',ticket:'<svg viewBox="0 0 24 24" stroke="#58a6ff"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v2a2.6 2.6 0 0 0 0 5.2v2A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.7v-2a2.6 2.6 0 0 0 0-5.2z"/></svg>',giveaway:'<svg viewBox="0 0 24 24" stroke="#f778ba"><rect x="3.5" y="8" width="17" height="4"/><path d="M5 12v8.5h14V12M12 8v12.5"/></svg>'};const DF=(ts)=>{const s=Math.max(0,((Date.now()-ts)/1000)|0);if(s<60)return'vừa xong';if(s<3600)return((s/60)|0)+' phút trước';if(s<86400)return((s/3600)|0)+' giờ trước';return((s/86400)|0)+' ngày trước'};$('ov-activity').innerHTML=d.activity.length?'<div class=afeed>'+d.activity.map(a=>'<div class=ait><span class=aic>'+(GLYPH[a.type]||GLYPH.join)+'</span><div><p>'+E(a.text)+'</p><time>'+DF(a.ts)+'</time></div></div>').join('')+'</div>':'<p class=mut>Chưa có hoạt động nào được ghi — sự kiện mới (vào/rời server, lên cấp, mở/đóng ticket, giveaway, mua shop...) sẽ hiện ở đây.</p>'}}catch(e){$('ov-body').innerHTML='<p class=mut>Lỗi tải.</p>'}}
$('md-go').onclick=async()=>{try{await api('POST','/dashboard/api/guilds/'+G+'/mod',{action:$('md-act').value,userId:$('md-user').value.trim(),reason:$('md-reason').value,minutes:parseInt($('md-mins').value||'10',10)});$('md-user').value='';toast('Đã thực hiện')}catch(e){toast('Lỗi: '+e.message+' (kiểm tra ID, quyền bot)')}};
$('md-wgo').onclick=async()=>{try{const l=await api('GET','/dashboard/api/guilds/'+G+'/warns?userId='+encodeURIComponent($('md-wuser').value.trim()));$('md-warns').innerHTML=l.length?l.map((w,i)=>'<b>'+(i+1)+'.</b> '+String(w.reason||'').replace(/</g,'&lt;')+' <span class=mut>— '+(w.byTag||'').replace(/</g,'&lt;')+'</span>').join('<br>'):'Chưa có warn nào.'}catch(e){toast('Lỗi: '+e.message)}};
$('am-save').onclick=async()=>{try{const lines=id=>$(id).value.split(/\\n/).map(x=>x.trim()).filter(Boolean);await api('PUT','/dashboard/api/guilds/'+G+'/settings',{automod:{words:$('am-words').checked,wholeWord:$('am-whole').checked,invites:$('am-invites').checked,links:$('am-links').checked,spam:$('am-spam').checked,spamCount:parseInt($('am-count').value||'5',10),spamSecs:parseInt($('am-secs').value||'5',10),caps:$('am-caps').checked,capsPercent:parseInt($('am-caps-pct').value||'70',10),capsMinLen:parseInt($('am-caps-len').value||'10',10),mentions:$('am-mentions').checked,mentionCount:parseInt($('am-mention-count').value||'5',10),actions:{words:$('am-act-words').value,invites:$('am-act-invites').value,links:$('am-act-links').value,spam:$('am-act-spam').value,caps:$('am-act-caps').value,mentions:$('am-act-mentions').value},timeoutMin:parseInt($('am-mins').value||'10',10),urlWhitelist:lines('am-url-wl'),urlBlacklist:lines('am-url-bl'),onlyImageChannels:selVals('am-imgch'),onlyYoutubeChannels:selVals('am-ytch'),exemptChannels:selVals('am-xch'),exemptRoles:selVals('am-xr')},antiraid:{enabled:$('ar-on').checked,ageDays:parseInt($('ar-age').value||'7',10),count:parseInt($('ar-count').value||'5',10),windowSecs:parseInt($('ar-secs').value||'30',10),action:$('ar-act').value,timeoutMin:parseInt($('ar-mins').value||'60',10)}});toast('Đã lưu AutoMod + Anti-Raid (áp dụng ngay)')}catch(e){toast('Lỗi: '+e.message)}};
async function loadCmds(){try{const l=await api('GET','/dashboard/api/guilds/'+G+'/commands');let g='';$('cmd-list').innerHTML=l.map(c=>(c.group!==g?'<h2>'+(g=c.group).toUpperCase()+'</h2>':'')+'<label class=chk><input type=checkbox data-n="'+c.name+'"'+(c.enabled?' checked':'')+'> <b>/'+c.name+'</b> <span class=mut>'+String(c.description||'').replace(/</g,'&lt;')+'</span></label>').join('')}catch(e){$('cmd-list').innerHTML='<p class=mut>Lỗi tải.</p>'}}
$('cmd-save').onclick=async()=>{try{const off=[];document.querySelectorAll('#cmd-list input').forEach(c=>{if(!c.checked)off.push(c.dataset.n)});await api('PUT','/dashboard/api/guilds/'+G+'/commands',{disabled:off});toast('Đã lưu (áp dụng ngay lệnh tiếp theo)')}catch(e){toast('Lỗi: '+e.message)}};
$('set-save').onclick=async()=>{try{await api('PUT','/dashboard/api/guilds/'+G+'/settings',{language:$('s-lang').value,timezone:$('s-tz').value,prefix:$('s-prefix').value||'!',starboard:{enabled:$('sb-on').checked,channelId:$('sb-ch').value||null,emoji:$('sb-emoji').value||'⭐',threshold:parseInt($('sb-th').value||'3',10)}});toast('Đã lưu')}catch(e){toast('Lỗi: '+e.message)}};
async function loadMusic(){try{const m=await api('GET','/dashboard/api/guilds/'+G+'/music');const el=$('u-state');if(!m.playing){el.innerHTML='<p class=mut>Không có gì đang phát.</p>';return}el.innerHTML='<p>🔊 <b>'+(m.voice||'voice').replace(/</g,'&lt;')+'</b> '+(m.paused?'⏸ đang dừng':'▶ đang phát')+' • Volume '+(m.volume??'?')+'</p><p><b>'+(m.current.title||'').replace(/</g,'&lt;')+'</b> — '+(m.current.author||'').replace(/</g,'&lt;')+'</p>'+(m.queueCount?'<p class=mut>Hàng chờ ('+m.queueCount+'):<br>'+m.queue.map((t,i)=>(i+1)+'. '+String(t.title||'').replace(/</g,'&lt;')).join('<br>')+'</p>':'')}catch(e){$('u-state').innerHTML='<p class=mut>Lỗi tải.</p>'}}
async function mAct(a,body){try{await api('POST','/dashboard/api/guilds/'+G+'/music/'+a,body||{});await loadMusic()}catch(e){toast('Lỗi: '+e.message)}}
$('u-pause').onclick=()=>mAct('pause');$('u-resume').onclick=()=>mAct('resume');$('u-skip').onclick=()=>mAct('skip');$('u-stop').onclick=()=>mAct('stop');
$('u-volset').onclick=()=>mAct('volume',{volume:parseInt($('u-vol').value||'50',10)});
setInterval(()=>{if(document.getElementById('p-u').style.display!=='none')loadMusic()},10000);
</script>`);
}

module.exports = { login, home, guild, landing, setCmdCount };
