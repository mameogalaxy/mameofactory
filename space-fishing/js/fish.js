/* =========================================================
   fish.js  -- 宇宙魚データ＆描画
   ========================================================= */

// 共通の宇宙魚スプライト描画（procedural）。
// x,y=中心  s=スケール  dir=向き(1右/-1左)  t=時刻  data=魚定義
function drawSpaceFish(ctx, x, y, s, dir, t, data, opt={}){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(dir*s, s);
  const flop = Math.sin(t*8)*0.12;      // 尾びれの揺れ
  const bodyW = 60, bodyH = 30*(data.fat||1);

  // 発光オーラ
  if(opt.glow!==false){
    const g=ctx.createRadialGradient(0,0,4,0,0,bodyW);
    g.addColorStop(0, data.glow||'rgba(120,220,255,.35)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(0,0,bodyW,0,U.TAU); ctx.fill();
  }

  // 尾びれ
  ctx.save();
  ctx.translate(-bodyW*0.55,0);
  ctx.rotate(flop);
  ctx.fillStyle=data.fin||data.c2;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(-34,-22-data.tail*6);
  ctx.lineTo(-22,0);
  ctx.lineTo(-34, 22+data.tail*6);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // 背びれ
  ctx.fillStyle=data.fin||data.c2;
  ctx.beginPath();
  ctx.moveTo(-10,-bodyH*0.7);
  ctx.lineTo(10,-bodyH-14-data.spike*8);
  ctx.lineTo(20,-bodyH*0.6);
  ctx.closePath(); ctx.fill();

  // 胴体
  const grad=ctx.createLinearGradient(0,-bodyH,0,bodyH);
  grad.addColorStop(0, data.c1);
  grad.addColorStop(1, data.c2);
  ctx.fillStyle=grad;
  ctx.beginPath();
  ctx.ellipse(0,0,bodyW*0.55,bodyH,0,0,U.TAU);
  ctx.fill();

  // 模様（種類で変化）
  ctx.globalAlpha=0.5;
  ctx.fillStyle=data.c2;
  if(data.pattern==='stripe'){
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.ellipse(i*12,0,3,bodyH*0.9,0,0,U.TAU); ctx.fill(); }
  }else if(data.pattern==='spot'){
    for(let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(U.rand(-20,20),U.rand(-bodyH*0.6,bodyH*0.6),3,0,U.TAU); ctx.fill(); }
  }
  ctx.globalAlpha=1;

  // 腹のハイライト
  ctx.fillStyle='rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.ellipse(6,bodyH*0.35,bodyW*0.32,bodyH*0.3,0,0,U.TAU); ctx.fill();

  // 目
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(bodyW*0.34,-bodyH*0.25,7,0,U.TAU); ctx.fill();
  ctx.fillStyle='#111';
  ctx.beginPath(); ctx.arc(bodyW*0.36,-bodyH*0.25,3.5,0,U.TAU); ctx.fill();

  // 口（ヌシは凶悪な歯）
  ctx.strokeStyle=data.c2; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(bodyW*0.5,bodyH*0.05); ctx.lineTo(bodyW*0.42,bodyH*0.22); ctx.stroke();
  if(data.boss){
    ctx.fillStyle='#fff';
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(bodyW*0.5-i*5,bodyH*0.08); ctx.lineTo(bodyW*0.46-i*5,bodyH*0.2); ctx.lineTo(bodyW*0.42-i*5,bodyH*0.08); ctx.fill(); }
  }

  ctx.restore();
}

/* 種族カタログ。planet:対応惑星index。tier=レア度 */
const FISH_DB = [
  // --- 惑星0: ネオン水星（入門） ---
  {id:'guppstar', temper:'darty', name:'グッピスター', planet:0, tier:1, hp:60, power:0.7, speed:1.0, size:0.7,
   c1:'#7fe3ff', c2:'#2b8fd6', fin:'#bff', glow:'rgba(120,220,255,.4)', tail:0.5, spike:0.3, pattern:'spot', fat:0.9},
  {id:'cometcod', temper:'steady', name:'コメットコッド', planet:0, tier:1, hp:90, power:1.0, speed:1.2, size:0.9,
   c1:'#aef', c2:'#3a7', fin:'#cf9', glow:'rgba(150,255,180,.4)', tail:0.6, spike:0.5, pattern:'stripe', fat:1.0},

  // --- 惑星1: 溶岩のヴァルカン ---
  {id:'magmaray', temper:'aggro', name:'マグマレイ', planet:1, tier:2, hp:140, power:1.4, speed:1.1, size:1.0,
   c1:'#ffb24d', c2:'#d63a1a', fin:'#ffd', glow:'rgba(255,140,40,.5)', tail:0.8, spike:0.7, pattern:'stripe', fat:1.1},
  {id:'pyrobass', temper:'aggro', name:'パイロバス', planet:1, tier:2, hp:180, power:1.7, speed:1.3, size:1.1,
   c1:'#ff7a3d', c2:'#a01010', fin:'#fc6', glow:'rgba(255,90,30,.5)', tail:0.7, spike:0.9, pattern:'spot', fat:1.2},

  // --- 惑星2: 氷結のグラシエ ---
  {id:'frostpike', temper:'jumper', name:'フロストパイク', planet:2, tier:2, hp:160, power:1.5, speed:1.5, size:1.05,
   c1:'#dffaff', c2:'#5aa6e0', fin:'#fff', glow:'rgba(180,235,255,.5)', tail:0.9, spike:1.0, pattern:'stripe', fat:0.85},
  {id:'aurorel', temper:'steady', name:'オーロレル', planet:2, tier:3, hp:230, power:1.9, speed:1.4, size:1.2,
   c1:'#c8ffe6', c2:'#7a5cff', fin:'#dff', glow:'rgba(150,255,220,.55)', tail:1.0, spike:0.8, pattern:'spot', fat:1.0},

  // --- 惑星3: 雷雲のテンペスト ---
  {id:'volttuna', temper:'aggro', name:'ヴォルトツナ', planet:3, tier:3, hp:280, power:2.2, speed:1.6, size:1.3,
   c1:'#fff27a', c2:'#caa11a', fin:'#ffd', glow:'rgba(255,240,120,.6)', tail:1.0, spike:1.1, pattern:'stripe', fat:1.1},
  {id:'thunjaw', temper:'heavy', name:'サンダージョー', planet:3, tier:4, hp:360, power:2.6, speed:1.7, size:1.45,
   c1:'#b6f', c2:'#516', fin:'#ddf', glow:'rgba(180,120,255,.6)', tail:1.2, spike:1.3, pattern:'spot', fat:1.25},

  // --- 惑星4: 銀河の最果て（通常魚も強い） ---
  {id:'starwhal', temper:'heavy', name:'スターホエール', planet:4, tier:4, hp:420, power:2.4, speed:1.3, size:1.5,
   c1:'#9be8ff', c2:'#274a9a', fin:'#ffd34d', glow:'rgba(150,210,255,.6)', tail:1.2, spike:0.9, pattern:'spot', fat:1.4},
  {id:'voidray', temper:'wild', name:'ヴォイドレイ', planet:4, tier:4, hp:500, power:2.8, speed:1.6, size:1.6,
   c1:'#c8a0ff', c2:'#2a1060', fin:'#ffd34d', glow:'rgba(200,150,255,.65)', tail:1.3, spike:1.2, pattern:'stripe', fat:1.3},

  // --- 伝説のヌシ（最終ボス：惑星4 銀河の最果て） ---
  {id:'NUSHI', temper:'wild', name:'伝説のヌシ・レヴィアコス', planet:4, tier:5, boss:true,
   hp:900, power:3.2, speed:1.4, size:2.2,
   c1:'#9be8ff', c2:'#1b2b8a', fin:'#ffd34d', glow:'rgba(255,215,80,.7)', tail:1.4, spike:1.5, pattern:'stripe', fat:1.4},

  // --- 各惑星のヌシ（その星のボス） ---
  {id:'nushi0', temper:'steady', name:'ネオンの主・アクアレックス', planet:0, tier:3, boss:true,
   hp:300, power:1.4, speed:1.2, size:1.6,
   c1:'#7fe3ff', c2:'#1560a6', fin:'#ffd34d', glow:'rgba(120,220,255,.6)', tail:1.0, spike:0.8, pattern:'spot', fat:1.3},
  {id:'nushi1', temper:'heavy', name:'溶岩の主・イグニフレア', planet:1, tier:4, boss:true,
   hp:460, power:1.9, speed:1.3, size:1.75,
   c1:'#ffb24d', c2:'#8a1505', fin:'#ffd34d', glow:'rgba(255,120,40,.65)', tail:1.1, spike:1.1, pattern:'stripe', fat:1.35},
  {id:'nushi2', temper:'jumper', name:'氷結の主・グレイシオン', planet:2, tier:4, boss:true,
   hp:600, power:2.2, speed:1.5, size:1.85,
   c1:'#dffaff', c2:'#2a6ec0', fin:'#ffd34d', glow:'rgba(180,235,255,.65)', tail:1.2, spike:1.2, pattern:'spot', fat:1.2},
  {id:'nushi3', temper:'aggro', name:'雷雲の主・ライジンガ', planet:3, tier:5, boss:true,
   hp:760, power:2.6, speed:1.6, size:1.95,
   c1:'#fff27a', c2:'#3a1a6e', fin:'#ffd34d', glow:'rgba(255,240,120,.7)', tail:1.3, spike:1.4, pattern:'stripe', fat:1.3},
];

function fishForPlanet(p){ return FISH_DB.filter(f=>f.planet===p); }
function normalFishForPlanet(p){ return FISH_DB.filter(f=>f.planet===p && !f.boss); }
function nushiForPlanet(p){ return FISH_DB.find(f=>f.planet===p && f.boss); }
function getNushi(){ return FISH_DB.find(f=>f.id==='NUSHI'); }
