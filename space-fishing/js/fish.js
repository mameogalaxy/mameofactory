/* =========================================================
   fish.js  -- 宇宙魚データ＆描画
   ========================================================= */

function fishNoise(data,i,a=0,b=1){
  let h=2166136261;
  const s=(data.id||data.name||'fish')+':'+i;
  for(let n=0;n<s.length;n++){ h^=s.charCodeAt(n); h=Math.imul(h,16777619); }
  const v=((h>>>0)%10000)/10000;
  return a+(b-a)*v;
}

function fillBodyGradient(ctx,data,h){
  const grad=ctx.createLinearGradient(0,-h,0,h);
  grad.addColorStop(0,data.c1);
  grad.addColorStop(0.55,data.mid||data.c1);
  grad.addColorStop(1,data.c2);
  ctx.fillStyle=grad;
}

function drawTail(ctx,data,bodyW,bodyH,type,t){
  const flop=Math.sin(t*8)*0.16;
  const fin=data.fin||data.c2;
  ctx.save();
  ctx.translate(-bodyW*0.58,0);
  ctx.rotate(flop);
  ctx.fillStyle=fin;
  if(type==='ribbon'){
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.moveTo(0,(i-1)*7);
      ctx.bezierCurveTo(-34,-28+i*22,-58,-20+i*12,-76,-34+i*34);
      ctx.bezierCurveTo(-54,-8+i*12,-32,5+i*8,0,(i-1)*7);
      ctx.fill();
    }
  }else if(type==='crescent'){
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(-40,-46,-66,-18);
    ctx.quadraticCurveTo(-28,-8,-22,0);
    ctx.quadraticCurveTo(-30,10,-66,20);
    ctx.quadraticCurveTo(-40,46,0,0);
    ctx.fill();
  }else if(type==='whip'){
    ctx.strokeStyle=fin; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(-32,5,-48,18,-76,Math.sin(t*5)*18);
    ctx.stroke();
  }else if(type==='fork'){
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(-38,-20-data.tail*7);
    ctx.lineTo(-24,0);
    ctx.lineTo(-38,20+data.tail*7);
    ctx.closePath();
    ctx.fill();
  }else{
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(-34,-24-data.tail*6);
    ctx.lineTo(-18,0);
    ctx.lineTo(-34,24+data.tail*6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPattern(ctx,data,bodyW,bodyH){
  ctx.save();
  ctx.globalAlpha=0.48;
  ctx.fillStyle=data.mark||data.c2;
  if(data.pattern==='stripe'){
    for(let i=-2;i<=2;i++){
      ctx.save(); ctx.translate(i*bodyW*0.16,0); ctx.rotate(-0.2);
      ctx.beginPath(); ctx.ellipse(0,0,3.5,bodyH*0.86,0,0,U.TAU); ctx.fill();
      ctx.restore();
    }
  }else if(data.pattern==='spot'){
    for(let i=0;i<7;i++){
      ctx.beginPath();
      ctx.arc(fishNoise(data,i,-bodyW*0.28,bodyW*0.24),fishNoise(data,i+31,-bodyH*0.55,bodyH*0.55),fishNoise(data,i+61,2.2,4.2),0,U.TAU);
      ctx.fill();
    }
  }else if(data.pattern==='bolt'){
    ctx.strokeStyle=data.mark||'#fff27a'; ctx.lineWidth=4; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(-bodyW*0.25,-bodyH*0.35); ctx.lineTo(-4,-3); ctx.lineTo(-18,0); ctx.lineTo(bodyW*0.25,bodyH*0.38); ctx.stroke();
  }else if(data.pattern==='rings'){
    ctx.strokeStyle=data.mark||data.c2; ctx.lineWidth=2;
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.ellipse(-bodyW*0.25+i*bodyW*0.16,0,7+i*1.5,bodyH*0.72,0,0,U.TAU); ctx.stroke(); }
  }
  ctx.restore();
}

function drawEyeAndMouth(ctx,data,bodyW,bodyH,angry=false){
  const eyeX=bodyW*0.36, eyeY=-bodyH*0.25, eyeR=angry?8:7;
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(eyeX,eyeY,eyeR,0,U.TAU); ctx.fill();
  ctx.fillStyle=angry?'#ff284f':'#111'; ctx.beginPath(); ctx.arc(eyeX+2,eyeY,eyeR*0.48,0,U.TAU); ctx.fill();
  if(angry){ ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(eyeX-8,eyeY-9); ctx.lineTo(eyeX+8,eyeY-4); ctx.stroke(); }
  ctx.strokeStyle=data.mouth||data.c2; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(bodyW*0.5,bodyH*0.05); ctx.lineTo(bodyW*0.42,bodyH*0.22); ctx.stroke();
  if(data.boss||data.teeth){
    ctx.fillStyle='#fff';
    for(let i=0;i<5;i++){ ctx.beginPath(); ctx.moveTo(bodyW*0.5-i*5,bodyH*0.08); ctx.lineTo(bodyW*0.46-i*5,bodyH*0.24); ctx.lineTo(bodyW*0.42-i*5,bodyH*0.08); ctx.fill(); }
  }
}

const FishAssetImages = {};

function loadFishAssets(){
  return Promise.all(FISH_DB.map(d=>{
    const src=d.asset||`assets/fish/${d.id}.png`;
    return loadImage(src).then(img=>{ if(img) FishAssetImages[d.id]=img; });
  }));
}

function drawFishAsset(ctx,data,t,opt){
  const img=FishAssetImages[data.id];
  if(!img) return false;
  const w=data.assetW||180, h=data.assetH||120;
  if(opt.glow!==false){
    const g=ctx.createRadialGradient(0,0,6,0,0,w*0.52);
    g.addColorStop(0,data.glow||'rgba(120,220,255,.35)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,w*0.52,0,U.TAU); ctx.fill();
  }
  ctx.drawImage(img,-w/2,-h/2,w,h);
  const phase=data.phase||1;
  if(phase>1){
    ctx.strokeStyle=phase===2?'rgba(255,215,80,.92)':'rgba(255,80,100,.95)';
    ctx.lineWidth=2; ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=10;
    for(let i=0;i<4;i++){
      ctx.beginPath();
      ctx.arc(-w*0.18+i*w*0.12,0,h*(0.34+i*0.04),-0.9,0.9);
      ctx.stroke();
    }
    ctx.shadowBlur=0;
  }
  return true;
}

// 共通の宇宙魚スプライト描画（procedural）。
// x,y=中心  s=スケール  dir=向き(1右/-1左)  t=時刻  data=魚定義
function drawSpaceFish(ctx, x, y, s, dir, t, data, opt={}){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(dir*s, s);
  if(opt.asset!==false && drawFishAsset(ctx,data,t,opt)){ ctx.restore(); return; }
  const shape=data.shape||'torpedo';
  const bodyW=(data.bodyW||60), bodyH=(data.bodyH||30)*(data.fat||1);
  const fin=data.fin||data.c2;
  const phase=data.phase||1;

  // 発光オーラ
  if(opt.glow!==false){
    const g=ctx.createRadialGradient(0,0,4,0,0,bodyW*(data.boss?1.45:1.05));
    g.addColorStop(0, data.glow||'rgba(120,220,255,.35)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(0,0,bodyW*(data.boss?1.45:1.05),0,U.TAU); ctx.fill();
  }

  const tailType=data.tailType || (shape==='ray'||shape==='voidray'?'whip':shape==='comet'?'ribbon':shape==='whale'?'crescent':'fork');
  if(shape!=='eel'&&shape!=='leviathan') drawTail(ctx,data,bodyW,bodyH,tailType,t);

  // 影
  ctx.fillStyle='rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.ellipse(-4,bodyH*0.7,bodyW*0.48,bodyH*0.18,0,0,U.TAU); ctx.fill();

  fillBodyGradient(ctx,data,bodyH);
  if(shape==='ray'||shape==='voidray'){
    const wing=shape==='voidray'?1.35:1;
    ctx.beginPath();
    ctx.moveTo(bodyW*0.48,0);
    ctx.quadraticCurveTo(0,-bodyH*2.1*wing,-bodyW*0.7,-bodyH*0.22);
    ctx.quadraticCurveTo(-bodyW*0.25,0,-bodyW*0.7,bodyH*0.22);
    ctx.quadraticCurveTo(0,bodyH*2.1*wing,bodyW*0.48,0);
    ctx.fill();
    if(shape==='voidray'){
      ctx.fillStyle=fin;
      ctx.beginPath(); ctx.moveTo(bodyW*0.26,-bodyH*0.48); ctx.lineTo(bodyW*0.55,-bodyH*0.95); ctx.lineTo(bodyW*0.42,-bodyH*0.1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bodyW*0.26, bodyH*0.48); ctx.lineTo(bodyW*0.55, bodyH*0.95); ctx.lineTo(bodyW*0.42, bodyH*0.1); ctx.fill();
    }
  }else if(shape==='eel'||shape==='leviathan'){
    const segs=shape==='leviathan'?7:5;
    for(let i=segs-1;i>=0;i--){
      const k=i/(segs-1);
      const sx=bodyW*(0.42-k*0.9);
      const sy=Math.sin(t*3+i*0.8)*bodyH*(shape==='leviathan'?0.55:0.34);
      const r=bodyH*(shape==='leviathan'?(1.05-k*0.42):(0.72-k*0.22));
      fillBodyGradient(ctx,data,r);
      ctx.beginPath(); ctx.ellipse(sx,sy,r*1.45,r,0,0,U.TAU); ctx.fill();
      if(i>0){
        ctx.strokeStyle=fin; ctx.lineWidth=2.5; ctx.globalAlpha=0.45;
        ctx.beginPath(); ctx.moveTo(sx,sy-r*0.8); ctx.lineTo(sx-10,sy-r*1.25); ctx.stroke();
        ctx.globalAlpha=1;
      }
    }
    drawTail(ctx,data,bodyW*0.85,bodyH,shape==='leviathan'?'crescent':'ribbon',t);
  }else if(shape==='pike'){
    ctx.beginPath();
    ctx.moveTo(bodyW*0.72,0);
    ctx.quadraticCurveTo(bodyW*0.24,-bodyH*0.92,-bodyW*0.48,-bodyH*0.45);
    ctx.quadraticCurveTo(-bodyW*0.68,0,-bodyW*0.48,bodyH*0.45);
    ctx.quadraticCurveTo(bodyW*0.24,bodyH*0.92,bodyW*0.72,0);
    ctx.fill();
  }else if(shape==='jaw'){
    ctx.beginPath();
    ctx.ellipse(-bodyW*0.12,0,bodyW*0.44,bodyH*1.02,0,0,U.TAU);
    ctx.fill();
    fillBodyGradient(ctx,data,bodyH*1.15);
    ctx.beginPath();
    ctx.ellipse(bodyW*0.3,bodyH*0.1,bodyW*0.34,bodyH*1.12,0,0,U.TAU);
    ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(bodyW*0.42,bodyH*0.36,bodyW*0.24,bodyH*0.26,0,0,U.TAU); ctx.fill();
  }else if(shape==='whale'){
    ctx.beginPath();
    ctx.ellipse(-bodyW*0.08,0,bodyW*0.62,bodyH*1.12,0,0,U.TAU);
    ctx.fill();
    ctx.fillStyle=fin;
    ctx.beginPath(); ctx.ellipse(-bodyW*0.08,bodyH*0.72,bodyW*0.28,bodyH*0.22,-0.35,0,U.TAU); ctx.fill();
  }else{
    ctx.beginPath();
    ctx.ellipse(0,0,bodyW*0.55,bodyH,0,0,U.TAU);
    ctx.fill();
  }

  if(!['ray','voidray','eel','leviathan'].includes(shape)){
    // 背びれ
    ctx.fillStyle=fin;
    ctx.beginPath();
    ctx.moveTo(-bodyW*0.16,-bodyH*0.7);
    ctx.lineTo(bodyW*0.08,-bodyH-12-data.spike*8);
    ctx.lineTo(bodyW*0.28,-bodyH*0.55);
    ctx.closePath(); ctx.fill();
  }
  if(shape==='bass'||shape==='magmaBoss'||shape==='stormBoss'){
    ctx.fillStyle=fin;
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(-bodyW*0.28+i*13,-bodyH*0.7); ctx.lineTo(-bodyW*0.2+i*13,-bodyH*(1.15+data.spike*0.2)); ctx.lineTo(-bodyW*0.08+i*13,-bodyH*0.68); ctx.fill(); }
  }

  drawPattern(ctx,data,bodyW,bodyH);

  if(data.boss){
    ctx.strokeStyle=data.bossLine||'#ffd34d'; ctx.lineWidth=3; ctx.globalAlpha=0.8;
    ctx.beginPath(); ctx.ellipse(0,0,bodyW*0.62,bodyH*1.08,0,0,U.TAU); ctx.stroke(); ctx.globalAlpha=1;
  }
  if(phase>1){
    ctx.strokeStyle=phase===2?'rgba(255,215,80,.95)':'rgba(255,80,100,.95)';
    ctx.lineWidth=2; ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=8;
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(-bodyW*0.18+i*bodyW*0.18,0,bodyH*(1.25+i*0.08),-0.9,0.9); ctx.stroke(); }
    ctx.shadowBlur=0;
  }

  ctx.fillStyle='rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.ellipse(6,bodyH*0.35,bodyW*0.32,bodyH*0.3,0,0,U.TAU); ctx.fill();

  drawEyeAndMouth(ctx,data,bodyW,bodyH,data.boss||phase>1||shape==='jaw');

  if(data.antenna){
    ctx.strokeStyle=fin; ctx.lineWidth=2; ctx.lineCap='round';
    for(let i=-1;i<=1;i+=2){
      ctx.beginPath();
      ctx.moveTo(bodyW*0.28,-bodyH*0.42);
      ctx.quadraticCurveTo(bodyW*0.48,bodyH*i*0.2,bodyW*0.72,bodyH*i*0.58);
      ctx.stroke();
      ctx.fillStyle=fin; ctx.beginPath(); ctx.arc(bodyW*0.72,bodyH*i*0.58,3.5,0,U.TAU); ctx.fill();
    }
  }

  ctx.restore();
}

/* 種族カタログ。planet:対応惑星index。tier=レア度 */
const FISH_DB = [
  // --- 惑星0: ネオン水星（入門） ---
  {id:'guppstar', asset:'assets/fish/guppstar.png', shape:'guppy', temper:'darty', name:'グッピスター', planet:0, tier:1, hp:60, power:0.7, speed:1.0, size:0.7,
   c1:'#7fe3ff', c2:'#2b8fd6', fin:'#bff', glow:'rgba(120,220,255,.4)', tail:0.5, spike:0.3, pattern:'spot', fat:0.9},
  {id:'cometcod', asset:'assets/fish/cometcod.png', shape:'comet', tailType:'ribbon', temper:'steady', name:'コメットコッド', planet:0, tier:1, hp:90, power:1.0, speed:1.2, size:0.9,
   c1:'#aef', c2:'#3a7', fin:'#cf9', glow:'rgba(150,255,180,.4)', tail:0.6, spike:0.5, pattern:'stripe', fat:1.0},

  // --- 惑星1: 溶岩のヴァルカン ---
  {id:'magmaray', asset:'assets/fish/magmaray.png', shape:'ray', temper:'aggro', name:'マグマレイ', planet:1, tier:2, hp:140, power:1.4, speed:1.1, size:1.0,
   c1:'#ffb24d', c2:'#d63a1a', fin:'#ffd', glow:'rgba(255,140,40,.5)', tail:0.8, spike:0.7, pattern:'stripe', fat:1.1},
  {id:'pyrobass', asset:'assets/fish/pyrobass.png', shape:'bass', temper:'aggro', name:'パイロバス', planet:1, tier:2, hp:180, power:1.7, speed:1.3, size:1.1,
   c1:'#ff7a3d', c2:'#a01010', fin:'#fc6', glow:'rgba(255,90,30,.5)', tail:0.7, spike:0.9, pattern:'spot', fat:1.2},

  // --- 惑星2: 氷結のグラシエ ---
  {id:'frostpike', asset:'assets/fish/frostpike.png', shape:'pike', temper:'jumper', name:'フロストパイク', planet:2, tier:2, hp:160, power:1.5, speed:1.5, size:1.05,
   c1:'#dffaff', c2:'#5aa6e0', fin:'#fff', glow:'rgba(180,235,255,.5)', tail:0.9, spike:1.0, pattern:'stripe', fat:0.85},
  {id:'aurorel', asset:'assets/fish/aurorel.png', shape:'eel', tailType:'ribbon', antenna:true, temper:'steady', name:'オーロレル', planet:2, tier:3, hp:230, power:1.9, speed:1.4, size:1.2,
   c1:'#c8ffe6', c2:'#7a5cff', fin:'#dff', glow:'rgba(150,255,220,.55)', tail:1.0, spike:0.8, pattern:'spot', fat:1.0},

  // --- 惑星3: 雷雲のテンペスト ---
  {id:'volttuna', asset:'assets/fish/volttuna.png', shape:'tuna', temper:'aggro', name:'ヴォルトツナ', planet:3, tier:3, hp:280, power:2.2, speed:1.6, size:1.3,
   c1:'#fff27a', c2:'#caa11a', fin:'#ffd', glow:'rgba(255,240,120,.6)', tail:1.0, spike:1.1, pattern:'bolt', fat:1.1},
  {id:'thunjaw', asset:'assets/fish/thunjaw.png', shape:'jaw', teeth:true, temper:'heavy', name:'サンダージョー', planet:3, tier:4, hp:360, power:2.6, speed:1.7, size:1.45,
   c1:'#b6f', c2:'#516', fin:'#ddf', glow:'rgba(180,120,255,.6)', tail:1.2, spike:1.3, pattern:'spot', fat:1.25},

  // --- 惑星4: 銀河の最果て（通常魚も強い） ---
  {id:'starwhal', asset:'assets/fish/starwhal.png', shape:'whale', tailType:'crescent', temper:'heavy', name:'スターホエール', planet:4, tier:4, hp:420, power:2.4, speed:1.3, size:1.5,
   c1:'#9be8ff', c2:'#274a9a', fin:'#ffd34d', glow:'rgba(150,210,255,.6)', tail:1.2, spike:0.9, pattern:'rings', fat:1.4},
  {id:'voidray', asset:'assets/fish/voidray.png', shape:'voidray', temper:'wild', name:'ヴォイドレイ', planet:4, tier:4, hp:500, power:2.8, speed:1.6, size:1.6,
   c1:'#c8a0ff', c2:'#2a1060', fin:'#ffd34d', glow:'rgba(200,150,255,.65)', tail:1.3, spike:1.2, pattern:'stripe', fat:1.3},

  // --- 伝説のヌシ（最終ボス：惑星4 銀河の最果て） ---
  {id:'NUSHI', asset:'assets/fish/NUSHI.png', assetW:220, assetH:145, shape:'leviathan', tailType:'crescent', antenna:true, temper:'wild', name:'伝説のヌシ・レヴィアコス', planet:4, tier:5, boss:true,
   hp:900, power:3.2, speed:1.4, size:2.2,
   c1:'#9be8ff', c2:'#1b2b8a', fin:'#ffd34d', glow:'rgba(255,215,80,.7)', tail:1.4, spike:1.5, pattern:'stripe', fat:1.4},

  // --- 各惑星のヌシ（その星のボス） ---
  {id:'nushi0', asset:'assets/fish/nushi0.png', assetW:190, assetH:128, shape:'aquaBoss', antenna:true, temper:'steady', name:'ネオンの主・アクアレックス', planet:0, tier:3, boss:true,
   hp:300, power:1.4, speed:1.2, size:1.6,
   c1:'#7fe3ff', c2:'#1560a6', fin:'#ffd34d', glow:'rgba(120,220,255,.6)', tail:1.0, spike:0.8, pattern:'spot', fat:1.3},
  {id:'nushi1', asset:'assets/fish/nushi1.png', assetW:190, assetH:132, shape:'magmaBoss', teeth:true, temper:'heavy', name:'溶岩の主・イグニフレア', planet:1, tier:4, boss:true,
   hp:460, power:1.9, speed:1.3, size:1.75,
   c1:'#ffb24d', c2:'#8a1505', fin:'#ffd34d', glow:'rgba(255,120,40,.65)', tail:1.1, spike:1.1, pattern:'stripe', fat:1.35},
  {id:'nushi2', asset:'assets/fish/nushi2.png', assetW:190, assetH:128, shape:'iceBoss', tailType:'crescent', temper:'jumper', name:'氷結の主・グレイシオン', planet:2, tier:4, boss:true,
   hp:600, power:2.2, speed:1.5, size:1.85,
   c1:'#dffaff', c2:'#2a6ec0', fin:'#ffd34d', glow:'rgba(180,235,255,.65)', tail:1.2, spike:1.2, pattern:'spot', fat:1.2},
  {id:'nushi3', asset:'assets/fish/nushi3.png', assetW:190, assetH:132, shape:'stormBoss', teeth:true, temper:'aggro', name:'雷雲の主・ライジンガ', planet:3, tier:5, boss:true,
   hp:760, power:2.6, speed:1.6, size:1.95,
   c1:'#fff27a', c2:'#3a1a6e', fin:'#ffd34d', glow:'rgba(255,240,120,.7)', tail:1.3, spike:1.4, pattern:'bolt', fat:1.3},
];

function fishForPlanet(p){ return FISH_DB.filter(f=>f.planet===p); }
function normalFishForPlanet(p){ return FISH_DB.filter(f=>f.planet===p && !f.boss); }
function nushiForPlanet(p){ return FISH_DB.find(f=>f.planet===p && f.boss); }
function getNushi(){ return FISH_DB.find(f=>f.id==='NUSHI'); }
