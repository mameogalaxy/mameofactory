/* =========================================================
   STELLAR ANGLER 〜伝説のヌシを求めて〜
   game.js -- メインゲームループ／状態機械／擬似3D釣りファイト
   ========================================================= */
(() => {
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;

const cam = { x:0, y:1.6, f:540, horizon:0.44 };

// ------- グローバル状態 -------
const G = {
  state:'LOADING',
  t:0,            // 経過時間
  planet:0,       // 現在の惑星index
  selCursor:0,    // 惑星選択カーソル
  unlocked:1,     // 解放済み惑星数
  caught:[],      // 釣った魚 {id,name,cm,tier}
  planetProgress:[0,0,0,0,0], // 各惑星で釣った数
  shake:0,
  flash:0,
  assets:{},
  msg:null, msgT:0,
};
const TARGET = [3,3,3,3,1]; // 各惑星のクリア条件（最後はヌシ1匹）

// localStorage 復元
try{
  const s=JSON.parse(localStorage.getItem('stellar_angler')||'{}');
  if(s.unlocked) G.unlocked=s.unlocked;
  if(s.caught) G.caught=s.caught;
  if(s.planetProgress) G.planetProgress=s.planetProgress;
}catch(e){}
function save(){
  try{ localStorage.setItem('stellar_angler', JSON.stringify({
    unlocked:G.unlocked, caught:G.caught, planetProgress:G.planetProgress })); }catch(e){}
}

function toast(text, dur=2.2){ G.msg=text; G.msgT=dur; }

// ===================================================================
//  釣りシーン用ステート
// ===================================================================
const Scene = {
  // 照準
  aimX:0, aimZ:9, power:0,
  // ルアー
  lureX:0, lureZ:9, lureBob:0, casting:0, castFrom:null,
  // 泳いでいる魚たち（待ち時間用）
  swimmers:[],
  // バイト
  biteFish:null, biteWindow:0, nibble:0,
  // ファイト
  fish:null, fishHP:0, fishMax:0, tension:0, progress:0,
  rodPower:0, eleki:0, pinch:false,
  fishMode:'run', modeT:0, pullX:0, koTimer:0, hitFx:0, elekiFx:0,
  lateral:0,        // 魚の左右位置（演出）
  caughtData:null,
};

function resetSceneForPlanet(){
  Scene.swimmers.length=0;
  const pool=fishForPlanet(G.planet);
  const n = G.planet===4 ? 1 : 5;
  for(let i=0;i<n;i++){
    const d=U.pick(pool);
    Scene.swimmers.push(makeSwimmer(d));
  }
}
function makeSwimmer(d){
  return { d, x:U.rand(-6,6), z:U.rand(6,15), depth:U.rand(0.3,1.4),
    vx:U.rand(-0.6,0.6), phase:U.rand(0,6.28), interest:0, state:'wander', tgt:0 };
}

// ===================================================================
//  入力ヘルパ
// ===================================================================
let IN = null;
function pressedConfirm(){ return IN.p.circle || IN.p.start; }

// ===================================================================
//  メインループ
// ===================================================================
let last=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  G.t+=dt;
  IN = Input.poll();
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt){
  if(G.shake>0) G.shake=Math.max(0,G.shake-dt*60);
  if(G.flash>0) G.flash=Math.max(0,G.flash-dt*3);
  if(G.msgT>0){ G.msgT-=dt; if(G.msgT<=0) G.msg=null; }

  switch(G.state){
    case 'TITLE':   updateTitle(dt); break;
    case 'SELECT':  updateSelect(dt); break;
    case 'CAST':    updateCast(dt); break;
    case 'WAIT':    updateWait(dt); break;
    case 'HOOK':    updateHook(dt); break;
    case 'FIGHT':   updateFight(dt); break;
    case 'CATCH':   updateCatch(dt); break;
    case 'RESULT':  updateResult(dt); break;
    case 'CLEAR':   updateClear(dt); break;
    case 'ENDING':  updateEnding(dt); break;
  }
}

// ===================================================================
//  TITLE
// ===================================================================
function updateTitle(dt){
  if(pressedConfirm() || IN.p.cross){
    Sound.ensure(); Sound.startBGM(); Sound.SE.select();
    G.state='SELECT'; G.selCursor=Math.min(G.unlocked-1, G.selCursor);
  }
}

// ===================================================================
//  SELECT（惑星選択：宇宙を飛び回る）
// ===================================================================
let selAnim=0;
function updateSelect(dt){
  selAnim+=dt;
  if(IN.p.cross){ Sound.SE.back(); G.state='TITLE'; return; }
  if(IN.LX>0.5||IN.p.r1){ moveSel(1); }
  if(IN.LX<-0.5||IN.p.l1){ moveSel(-1); }
  if(pressedConfirm()){
    if(G.selCursor>=G.unlocked){ Sound.SE.back(); toast('この惑星はまだロックされている…'); return; }
    Sound.SE.select();
    G.planet=G.selCursor;
    enterPlanet();
  }
}
let selCD=0;
function moveSel(d){
  if(selCD>0) return; selCD=1;
  G.selCursor=U.clamp(G.selCursor+d,0,PLANETS.length-1);
  Sound.SE.move();
  setTimeout(()=>selCD=0,160);
}

function enterPlanet(){
  resetSceneForPlanet();
  Scene.aimX=0; Scene.aimZ=9; Scene.power=0;
  G.state='CAST';
  toast(PLANETS[G.planet].name+' に到着！ 左スティックで狙って ○ でキャスト',2.6);
}

// ===================================================================
//  CAST（照準＆キャスト）
// ===================================================================
function updateCast(dt){
  if(IN.p.cross){ Sound.SE.back(); G.state='SELECT'; return; }
  // 照準移動
  Scene.aimX = U.clamp(Scene.aimX + IN.LX*dt*7, -7, 7);
  Scene.aimZ = U.clamp(Scene.aimZ - IN.LY*dt*7, 5, 16);
  // パワー溜め（○長押しで遠投アシスト＝演出）
  if(IN.circle){ Scene.power=U.clamp(Scene.power+dt*1.6,0,1); }
  // キャスト（○を離した瞬間に、溜めたパワーで投げる）
  if(!IN.circle && Scene.power>0.02){
    doCast();
  }

  // 待機中の魚も泳がせておく
  updateSwimmers(dt, false);
}
function doCast(){
  Sound.SE.cast();
  Scene.lureX=Scene.aimX; Scene.lureZ=Scene.aimZ;
  Scene.castFrom={x:0,y:0.2,z:1.4};
  Scene.casting=0; Scene.power=0;
  G.state='WAIT'; Scene.waitT=0; Scene.biteFish=null; Scene.nibble=0;
}

// ===================================================================
//  WAIT（アタリ待ち）
// ===================================================================
function updateWait(dt){
  Scene.casting=Math.min(1,Scene.casting+dt*2.2);
  Scene.lureBob+=dt;
  if(IN.p.cross){ Sound.SE.back(); G.state='CAST'; return; }   // 回収して投げ直し
  Scene.waitT+=dt;
  updateSwimmers(dt, true);

  // 一番ルアーに興味を持った魚を探す
  let best=null,bd=99;
  for(const s of Scene.swimmers){
    const d=U.dist(s.x,s.z,Scene.lureX,Scene.lureZ);
    if(s.state==='approach' && d<bd){bd=d;best=s;}
  }
  if(best && bd<0.6){
    // ニブル → やがてバイト
    Scene.nibble+=dt;
    if(Math.random()<0.04) Sound.SE.reel();
    if(Scene.nibble>U.rand(0.6,1.4)){
      triggerBite(best);
    }
  }else{
    Scene.nibble=Math.max(0,Scene.nibble-dt);
  }
}
function triggerBite(s){
  Sound.SE.bite();
  Scene.biteFish=s;
  Scene.biteWindow=1.0;       // フッキング受付
  G.shake=6;
  G.state='HOOK';
}

// 待機中の魚AI
function updateSwimmers(dt, lureActive){
  for(const s of Scene.swimmers){
    s.phase+=dt;
    if(lureActive){
      const d=U.dist(s.x,s.z,Scene.lureX,Scene.lureZ);
      if(s.state==='wander' && d<5 && Math.random()<0.012*s.d.speed){ s.state='approach'; }
      if(s.state==='approach'){
        const dx=Scene.lureX-s.x, dz=Scene.lureZ-s.z, m=Math.hypot(dx,dz)||1;
        s.x+=dx/m*dt*1.4*s.d.speed; s.z+=dz/m*dt*1.4*s.d.speed;
        if(Math.random()<0.004) s.state='wander';
      }else{
        s.x+=s.vx*dt; s.z+=Math.sin(s.phase*0.6)*dt*0.4;
      }
    }else{
      s.x+=s.vx*dt; s.z+=Math.sin(s.phase*0.5)*dt*0.5;
    }
    if(s.x>7){s.x=7;s.vx*=-1;} if(s.x<-7){s.x=-7;s.vx*=-1;}
    if(s.z>16)s.z=16; if(s.z<5)s.z=5;
  }
}

// ===================================================================
//  HOOK（フッキング）
// ===================================================================
function updateHook(dt){
  Scene.biteWindow-=dt;
  if(pressedConfirm()){
    // フッキング成功 → ファイト開始
    startFight(Scene.biteFish);
    return;
  }
  if(Scene.biteWindow<=0){
    // バラシ
    Sound.SE.back();
    toast('逃げられた…！ もう一度ねらおう');
    Scene.biteFish.state='wander';
    G.state='CAST';
  }
}

// ===================================================================
//  FIGHT（ファイト：本編）
// ===================================================================
function startFight(s){
  const d=s.d;
  Scene.fish=d;
  Scene.fishMax=d.hp; Scene.fishHP=d.hp;
  Scene.tension=20; Scene.progress=0;
  Scene.rodPower=0; Scene.eleki=0; Scene.pinch=false;
  Scene.fishMode='run'; Scene.modeT=U.rand(1.2,2.2);
  Scene.pullX=U.pick([-1,1]); Scene.koTimer=0; Scene.hitFx=0; Scene.elekiFx=0;
  Scene.lateral=0;
  // 待機魚から除去
  const i=Scene.swimmers.indexOf(s); if(i>=0)Scene.swimmers.splice(i,1);
  G.state='FIGHT';
  Sound.SE.bite();
  toast('ヒット！ '+d.name+'！ 右スティックで巻け！',2.4);
}

function updateFight(dt){
  const F=Scene;
  const d=F.fish;
  const koed = F.fishHP<=0;

  // ---- 魚の挙動サイクル ----
  F.modeT-=dt;
  if(!koed && F.modeT<=0){
    if(F.fishMode==='run'){
      F.fishMode='tire'; F.modeT=U.rand(1.0,1.8)*(1+(1-F.fishHP/F.fishMax));
    }else{
      F.fishMode='run';  F.modeT=U.rand(0.9,1.8)*(F.fishHP/F.fishMax+0.4);
      F.pullX=U.pick([-1,1]); Sound.SE.warn();
    }
  }
  // 横移動演出
  const tgtLat = koed?0:(F.fishMode==='run'?F.pullX:0);
  F.lateral=U.lerp(F.lateral, tgtLat, dt*3);

  // ---- リール（右スティック回転 or 方向キー）----
  let spin = Input.reelSpin(IN.RX, IN.RY);
  const keyReel = (IN.RY<-0.3||IN.RX!==0) && !IN.usingPad ? 1 : 0;
  const reeling = spin>0.6 || keyReel>0;
  const reelAmt = reeling ? (IN.usingPad? Math.min(2.4,spin) : 1.6) : 0;

  // ---- ロッドワーク（左スティックで魚の引きに逆らう）----
  const counter = -Math.sign(F.pullX) * IN.LX;   // 引きと逆向き=正
  const goodWork = !koed && F.fishMode==='run' && counter>0.3;

  if(!koed){
    if(F.fishMode==='run'){
      // ランニング中：放っておくとテンション上昇。巻くと急上昇。
      F.tension += dt*(8 + reelAmt*18) * d.power;
      if(goodWork){ F.tension -= dt*22*counter; F.rodPower += dt*40*counter; }
      else if(counter<-0.3){ F.tension += dt*14; }   // 同調すると悪化
      F.progress += reelAmt*dt*4;   // ラン中はほぼ進まない
    }else{
      // 休み（弱り）中：安全に巻ける。チャンス。
      F.tension += dt*(reelAmt*5 - 6);
      F.progress += reelAmt*dt*14;
      F.rodPower += dt*8;
    }
    if(reeling && Math.random()<0.3) Sound.SE.reel();
  }else{
    // KO中：自由に巻いて寄せる
    F.tension = U.lerp(F.tension,10,dt*2);
    F.progress += (reelAmt+1.2)*dt*22;
  }

  // テンション自然減衰＆クランプ
  F.tension -= dt*3;
  F.tension = U.clamp(F.tension,0,100);
  F.rodPower = U.clamp(F.rodPower,0,100);
  F.progress = U.clamp(F.progress,0,100);

  // ---- ピンチ判定（テンション高＝ライン切れ寸前）----
  const wasPinch=F.pinch;
  F.pinch = F.tension>=78 && !koed;
  if(F.pinch){
    F.eleki = U.clamp(F.eleki + dt*55, 0, 100);   // ピンチ時はエレキ急速チャージ
    if(!wasPinch) Sound.SE.warn();
    if(Math.random()<0.25) Sound.SE.warn();
  }else{
    F.eleki = U.clamp(F.eleki + dt*6, 0, 100);     // 平時もじわじわ
  }

  // ---- ライン切れ（敗北）----
  if(F.tension>=100){
    Sound.SE.snap(); G.shake=14; G.flash=0.5;
    toast('ライン破断…！ '+d.name+'に逃げられた',2.6);
    G.state='CAST';
    return;
  }

  // ---- ○：ロッドパワーアタック ----
  if(IN.p.circle && F.rodPower>=100 && !koed){
    const dmg = F.fishMax*0.14 + 30;
    F.fishHP -= dmg; F.rodPower=0; F.tension=Math.max(0,F.tension-12);
    F.hitFx=0.4; F.modeT=Math.min(F.modeT,0.3); F.fishMode='tire';
    G.shake=8; Sound.SE.attack();
    toast('ロッドパワーアタック！');
  }

  // ---- △：エレキアタック（大ダメージ／ピンチ脱出）----
  if(IN.p.triangle && F.eleki>=100 && !koed){
    const dmg = F.fishMax*0.34 + 60;
    F.fishHP -= dmg; F.eleki=0; F.tension=18;
    F.elekiFx=0.7; F.modeT=1.4; F.fishMode='tire';
    G.shake=18; G.flash=0.7; Sound.SE.eleki();
    toast('⚡エレキアタック炸裂！⚡',2.0);
  }

  if(F.hitFx>0) F.hitFx-=dt;
  if(F.elekiFx>0) F.elekiFx-=dt;

  // ---- KO 判定 ----
  if(F.fishHP<=0 && F.koTimer===0){
    F.fishHP=0; F.koTimer=0.001; Sound.SE.ko(); G.flash=0.5;
    toast('KO！ そのまま巻き上げろ！',2.0);
  }
  if(F.koTimer>0) F.koTimer+=dt;

  // ---- ランディング（取り込み）----
  if(F.progress>=100){
    landFish();
  }
}

function landFish(){
  const d=Scene.fish;
  // サイズ抽選（cm）
  const base = 30 + d.size*60;
  const cm = Math.round(base * U.rand(0.7,1.5));
  const rec = {id:d.id,name:d.name,cm,tier:d.tier,boss:!!d.boss,t:Date.now()};
  Scene.caughtData=rec;
  G.caught.push(rec);
  G.planetProgress[G.planet]++;
  save();
  Sound.SE.fanfare();
  G.flash=0.6;
  G.state='CATCH'; Scene.catchAnim=0;
}

// ===================================================================
//  CATCH（釣り上げ演出）
// ===================================================================
function updateCatch(dt){
  Scene.catchAnim=(Scene.catchAnim||0)+dt;
  if(Scene.catchAnim>0.8 && pressedConfirm()){
    G.state='RESULT'; Scene.resultAnim=0;
  }
}

// ===================================================================
//  RESULT（結果→クリア判定）
// ===================================================================
function updateResult(dt){
  Scene.resultAnim=(Scene.resultAnim||0)+dt;
  if(Scene.resultAnim>0.5 && pressedConfirm()){
    const need=TARGET[G.planet];
    if(G.planetProgress[G.planet]>=need){
      if(Scene.caughtData.boss){ G.state='ENDING'; Scene.endAnim=0; Sound.SE.fanfare(); return; }
      // 次の惑星を解放
      if(G.unlocked < G.planet+2){ G.unlocked=Math.min(PLANETS.length, G.planet+2); save(); }
      G.state='CLEAR'; Scene.clearAnim=0; Sound.SE.fanfare();
    }else{
      // 続けて釣る
      G.state='CAST';
      Scene.aimX=0; Scene.aimZ=9; Scene.power=0;
      if(Scene.swimmers.length<2) resetSceneForPlanet();
    }
  }
}

// ===================================================================
//  CLEAR（惑星クリア）
// ===================================================================
function updateClear(dt){
  Scene.clearAnim=(Scene.clearAnim||0)+dt;
  if(Scene.clearAnim>1 && pressedConfirm()){
    Sound.SE.select();
    G.state='SELECT';
    G.selCursor=Math.min(G.unlocked-1, G.planet+1);
  }
}

// ===================================================================
//  ENDING
// ===================================================================
function updateEnding(dt){
  Scene.endAnim=(Scene.endAnim||0)+dt;
  if(Scene.endAnim>3 && pressedConfirm()){
    Sound.SE.select();
    G.state='SELECT';
  }
}

// ===================================================================
//  RENDER
// ===================================================================
function render(){
  ctx.save();
  if(G.shake>0){ ctx.translate(U.rand(-G.shake,G.shake),U.rand(-G.shake,G.shake)); }

  const planet = PLANETS[(G.state==='SELECT')?G.selCursor:G.planet];

  if(G.state==='LOADING'){ ctx.restore(); return; }
  if(G.state==='TITLE'){ renderTitle(); ctx.restore(); drawFlash(); return; }
  if(G.state==='SELECT'){ renderSelect(); ctx.restore(); drawFlash(); return; }

  // --- 釣りシーン共通背景 ---
  drawSkyAndSpace(ctx, W, H, planet, G.t);
  drawSea(planet);
  drawAngler();

  // 状態別オブジェクト
  if(G.state==='CAST') renderCast();
  if(G.state==='WAIT'||G.state==='HOOK') renderWaitScene(planet);
  if(G.state==='FIGHT') renderFight(planet);
  if(G.state==='CATCH') renderFight(planet);

  // HUD
  drawTopHUD(planet);
  if(G.state==='CAST') drawCastHUD();
  if(G.state==='WAIT') drawWaitHUD();
  if(G.state==='HOOK') drawHookHUD();
  if(G.state==='FIGHT') drawFightHUD();
  if(G.state==='CATCH') drawCatchHUD();
  if(G.state==='RESULT') drawResult();
  if(G.state==='CLEAR') drawClear();
  if(G.state==='ENDING') drawEnding();

  drawToast();
  ctx.restore();
  drawFlash();
}

function drawFlash(){
  if(G.flash>0){
    ctx.fillStyle=`rgba(255,255,255,${G.flash})`;
    ctx.fillRect(0,0,W,H);
  }
}

// ---- 海面 ----
function drawSea(planet){
  const seaY=H*cam.horizon;
  const g=ctx.createLinearGradient(0,seaY,0,H);
  g.addColorStop(0, planet.sea[0]);
  g.addColorStop(1, planet.sea[1]);
  ctx.fillStyle=g; ctx.fillRect(0,seaY,W,H-seaY);
  // 反射ヘイズ
  ctx.fillStyle=planet.haze; ctx.fillRect(0,seaY,W,40);
  // 波ライン（遠近）
  ctx.strokeStyle='rgba(255,255,255,.10)';
  for(let i=1;i<26;i++){
    const z=4+i*0.7;
    const p=project(0,0,z,cam,W,H);
    const yy=p.y;
    if(yy<seaY) continue;
    ctx.lineWidth=Math.max(0.5,p.s*0.4);
    ctx.beginPath();
    for(let xx=0;xx<=W;xx+=24){
      const wy=yy+Math.sin(G.t*1.5 + xx*0.02 + i)*p.s*0.5;
      xx===0?ctx.moveTo(xx,wy):ctx.lineTo(xx,wy);
    }
    ctx.stroke();
  }
  // 光の筋
  ctx.fillStyle=planet.accent;
  ctx.globalAlpha=0.06;
  ctx.beginPath(); ctx.moveTo(W*0.5,seaY); ctx.lineTo(W*0.5+120,H); ctx.lineTo(W*0.5-120,H); ctx.fill();
  ctx.globalAlpha=1;
}

// ---- 釣り人（まめお）と竿 ----
function drawAngler(){
  const bx=W*0.5, by=H-40;
  // 竿（手前から海面へ）
  let rodTipX=W*0.5, rodTipY=H*cam.horizon+10;
  let lure=null;
  if(G.state==='WAIT'||G.state==='HOOK'){
    const p=project(Scene.lureX,0,Scene.lureZ,cam,W,H);
    rodTipX=p.x; rodTipY=p.y; lure=p;
  }else if(G.state==='FIGHT'||G.state==='CATCH'){
    const lat=Scene.lateral*3*(1-Scene.progress/100);
    const p=project(lat,0.2,U.lerp(11,2.5,Scene.progress/100),cam,W,H);
    rodTipX=p.x; rodTipY=p.y; lure=p;
  }else if(G.state==='CAST'){
    const p=project(Scene.aimX,0,Scene.aimZ,cam,W,H);
    rodTipX=p.x; rodTipY=p.y;
  }

  // ライン
  if(G.state!=='SELECT'&&G.state!=='TITLE'){
    const tension = G.state==='FIGHT'?Scene.tension/100:0.1;
    ctx.strokeStyle = tension>0.78?'rgba(255,80,80,.9)':'rgba(255,255,255,.7)';
    ctx.lineWidth=1.4;
    ctx.beginPath();
    ctx.moveTo(bx-50, by-160);
    // たわみ
    const sag=(1-tension)*40;
    const mx=(bx-50+rodTipX)/2, my=(by-160+rodTipY)/2+sag;
    ctx.quadraticCurveTo(mx,my,rodTipX,rodTipY);
    ctx.stroke();
  }

  // 竿本体
  ctx.strokeStyle='#caa'; ctx.lineWidth=6; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(bx-90,by+10); ctx.lineTo(bx-50,by-160); ctx.stroke();
  ctx.strokeStyle='#544'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(bx-90,by+10); ctx.lineTo(bx-50,by-160); ctx.stroke();

  // まめお（豆マスコット）
  const img=G.assets.bean;
  const bw=110, bh=110, baseY=by-bw*0.5+18;
  const bob=Math.sin(G.t*2)*3;
  if(img){
    ctx.drawImage(img, bx-bw*0.5-30, baseY-bh*0.5+bob, bw, bh);
  }else{
    // フォールバック：緑の豆
    ctx.fillStyle='#5ec24a';
    ctx.beginPath(); ctx.ellipse(bx-30, baseY+bob, 36,46,0,0,U.TAU); ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.arc(bx-44,baseY-6+bob,6,0,U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(bx-20,baseY-6+bob,6,0,U.TAU); ctx.fill();
  }
}

// ---- CAST：照準 ----
function renderCast(){
  const p=project(Scene.aimX,0,Scene.aimZ,cam,W,H);
  const r=18*p.s+8;
  ctx.strokeStyle=PLANETS[G.planet].accent; ctx.lineWidth=2;
  ctx.globalAlpha=0.9;
  ctx.beginPath(); ctx.arc(p.x,p.y,r,0,U.TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(p.x,p.y,r*0.5,0,U.TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x-r-6,p.y); ctx.lineTo(p.x-r+6,p.y);
  ctx.moveTo(p.x+r-6,p.y); ctx.lineTo(p.x+r+6,p.y);
  ctx.moveTo(p.x,p.y-r-6); ctx.lineTo(p.x,p.y-r+6);
  ctx.moveTo(p.x,p.y+r-6); ctx.lineTo(p.x,p.y+r+6); ctx.stroke();
  ctx.globalAlpha=1;
  // 海中で泳ぐ魚（うっすら）
  drawSwimmers(true);
}

// ---- WAIT/HOOK：ルアーと魚 ----
function renderWaitScene(planet){
  drawSwimmers(true);
  // ルアー
  const p=project(Scene.lureX,0,Scene.lureZ,cam,W,H);
  const bob=Math.sin(Scene.lureBob*3)*2;
  // 波紋
  ctx.strokeStyle='rgba(255,255,255,.4)';
  const rr=(Scene.lureBob*30)%30;
  ctx.lineWidth=1; ctx.globalAlpha=1-rr/30;
  ctx.beginPath(); ctx.ellipse(p.x,p.y+bob, rr*p.s*0.4+4, rr*p.s*0.2+2,0,0,U.TAU); ctx.stroke();
  ctx.globalAlpha=1;
  // ウキ
  ctx.fillStyle='#ff5252';
  ctx.beginPath(); ctx.ellipse(p.x,p.y-6*p.s+bob, 5*p.s+2,7*p.s+2,0,0,U.TAU); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.ellipse(p.x,p.y-9*p.s+bob, 5*p.s+2,3*p.s+1,0,0,U.TAU); ctx.fill();

  if(G.state==='HOOK'){
    // ビックリマーク
    const s=1+Math.sin(G.t*20)*0.1;
    ctx.font=`bold ${40*s}px sans-serif`;
    ctx.fillStyle='#ffea00'; ctx.textAlign='center';
    ctx.fillText('！', p.x, p.y-40);
    ctx.textAlign='left';
  }
}

// 海中の魚シルエット
function drawSwimmers(active){
  // 奥の魚から描く
  const list=[...Scene.swimmers].sort((a,b)=>b.z-a.z);
  for(const s of list){
    const p=project(s.x, -0.4*s.depth, s.z, cam, W,H);
    if(p.y<H*cam.horizon) continue;
    const dir = s.vx>=0?1:-1;
    ctx.globalAlpha=U.clamp(0.85 - s.depth*0.3, 0.3, 0.9);
    drawSpaceFish(ctx, p.x, p.y, p.s*0.5*s.d.size, dir, G.t+s.phase, s.d, {glow:s.state==='approach'});
    ctx.globalAlpha=1;
  }
}

// ---- FIGHT：暴れる魚 ----
function renderFight(planet){
  const F=Scene;
  const koed=F.fishHP<=0;
  const prog=F.progress/100;
  const z=U.lerp(11,2.5,prog);
  const lat=F.lateral*3*(1-prog*0.6);
  const splash=F.fishMode==='run'&&!koed;
  const yWorld = koed?0.3:(splash?0.1+Math.abs(Math.sin(G.t*9))*0.4:-0.2);
  const p=project(lat,yWorld,z,cam,W,H);
  const dir = F.lateral>=0?-1:1;

  // 水しぶき
  if(splash && Math.random()<0.6){
    for(let i=0;i<4;i++){
      ctx.fillStyle='rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.arc(p.x+U.rand(-30,30),p.y+U.rand(-20,5),U.rand(1,4),0,U.TAU); ctx.fill();
    }
  }

  // エレキ演出（稲妻）
  if(F.elekiFx>0){
    ctx.strokeStyle=`rgba(180,230,255,${F.elekiFx})`;
    ctx.lineWidth=3;
    for(let i=0;i<6;i++){
      ctx.beginPath();
      let lx=p.x,ly=p.y-60;
      ctx.moveTo(lx,ly);
      for(let j=0;j<6;j++){ lx+=U.rand(-20,20); ly+=14; ctx.lineTo(lx,ly); }
      ctx.stroke();
    }
  }

  ctx.save();
  if(F.hitFx>0){ ctx.translate(U.rand(-6,6),U.rand(-6,6)); }
  const flashHit = F.hitFx>0 || F.elekiFx>0;
  drawSpaceFish(ctx, p.x, p.y, p.s*1.1*F.fish.size, dir, G.t*1.5, F.fish, {glow:true});
  if(flashHit){
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=Math.max(F.hitFx,F.elekiFx);
    drawSpaceFish(ctx, p.x, p.y, p.s*1.1*F.fish.size, dir, G.t*1.5, {...F.fish,c1:'#fff',c2:'#fff',fin:'#fff'}, {glow:false});
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
  }
  if(koed){
    // KO 目をぐるぐる
    ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif'; ctx.textAlign='center';
    ctx.fillText('×  ×', p.x, p.y-p.s*30);
    ctx.textAlign='left';
  }
  ctx.restore();
}

// ===================================================================
//  HUD描画
// ===================================================================
function drawTopHUD(planet){
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.fillRect(0,0,W,38);
  ctx.fillStyle=planet.accent;
  ctx.font='bold 18px sans-serif'; ctx.textAlign='left';
  ctx.fillText('🪐 '+planet.name, 14, 25);
  // 進捗
  const need=TARGET[G.planet!==undefined?G.planet:0];
  ctx.fillStyle='#fff'; ctx.textAlign='right';
  ctx.font='bold 15px sans-serif';
  if(!planet.boss)
    ctx.fillText(`釣果 ${G.planetProgress[G.planet]} / ${need}`, W-14, 24);
  else
    ctx.fillText(`ヌシ討伐戦`, W-14, 24);
  ctx.textAlign='left';
}

function bar(x,y,w,h,val,col,label,bg='rgba(255,255,255,.15)'){
  roundRect(ctx,x,y,w,h,h/2); ctx.fillStyle=bg; ctx.fill();
  roundRect(ctx,x,y,w*U.clamp(val,0,1),h,h/2); ctx.fillStyle=col; ctx.fill();
  if(label){ ctx.fillStyle='#fff'; ctx.font='bold 11px sans-serif'; ctx.textAlign='left';
    ctx.fillText(label, x, y-4); }
}

function drawCastHUD(){
  // パワーゲージ
  if(Scene.power>0.01){
    bar(W*0.5-100, H-60, 200, 14, Scene.power, '#ffd34d', 'CAST POWER');
  }
  hudHint('左スティック:狙う   ○(長押し→離す):キャスト   ×:戻る');
}
function drawWaitHUD(){
  if(Scene.nibble>0.05){
    bar(W*0.5-90, 52, 180, 10, Scene.nibble/1.4, '#ff8', 'NIBBLE…');
  }
  hudHint('アタリを待て…  ×:回収して投げ直し');
}
function drawHookHUD(){
  const s=1+Math.sin(G.t*18)*0.06;
  ctx.fillStyle='#ffea00'; ctx.font=`bold ${30*s}px sans-serif`; ctx.textAlign='center';
  ctx.fillText('▶ ○ でフッキング！ ◀', W*0.5, 70);
  ctx.textAlign='left';
}

function drawFightHUD(){
  const F=Scene;
  // 魚HP（上）
  bar(W*0.5-160, 48, 320, 16, F.fishHP/F.fishMax, '#7fff8a', `${F.fish.name}  STAMINA`);
  // テンション（左縦）
  const tx=24, ty=120, th=240;
  roundRect(ctx,tx,ty,16,th,8); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fill();
  const tv=F.tension/100;
  const tcol = tv>0.78?'#ff3b3b':(tv>0.55?'#ffb13b':'#3bff7a');
  roundRect(ctx,tx,ty+th*(1-tv),16,th*tv,8); ctx.fillStyle=tcol; ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
  ctx.fillText('TENSION', tx+8, ty-8);
  // 危険ライン
  ctx.strokeStyle='#ff3b3b'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(tx-2,ty+th*0.22); ctx.lineTo(tx+18,ty+th*0.22); ctx.stroke();
  ctx.textAlign='left';

  // ロッドパワー
  bar(W*0.5-160, H-78, 320, 14, F.rodPower/100, F.rodPower>=100?'#ffd34d':'#7fd', 'ROD POWER');
  if(F.rodPower>=100){ pulse('○ アタック！', W*0.5+170, H-72, '#ffd34d'); }

  // エレキ
  bar(W*0.5-160, H-52, 320, 14, F.eleki/100, F.eleki>=100?'#9cf':'#56a', 'ELEKI ⚡');
  if(F.eleki>=100){ pulse('△ エレキアタック！', W*0.5+170, H-46, '#9cf'); }

  // 取り込み距離
  bar(W*0.5-160, H-26, 320, 12, F.progress/100, '#fff', 'LANDING');

  // ピンチ警告
  if(F.pinch){
    const a=0.4+0.3*Math.sin(G.t*14);
    ctx.fillStyle=`rgba(255,40,40,${a})`;
    ctx.fillRect(0,0,W,8); ctx.fillRect(0,H-8,W,8);
    ctx.fillStyle='#ff5252'; ctx.font='bold 26px sans-serif'; ctx.textAlign='center';
    ctx.fillText('PINCH! △でエレキ反撃!', W*0.5, 96);
    ctx.textAlign='left';
  }

  hudHint('右スティック回す:巻く   左スティック:引きに逆らう   ○:ロッド攻撃   △:エレキ');
}

function pulse(text,x,y,col){
  const s=1+Math.sin(G.t*12)*0.12;
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  ctx.fillStyle=col; ctx.font='bold 14px sans-serif'; ctx.textAlign='left';
  ctx.fillText(text,0,0); ctx.restore(); ctx.textAlign='left';
}

function hudHint(text){
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.fillRect(0,H-18,W,18);
  ctx.fillStyle='#bcd'; ctx.font='12px sans-serif'; ctx.textAlign='center';
  ctx.fillText(text, W*0.5, H-5);
  ctx.textAlign='left';
}

// ---- CATCH 演出 ----
function drawCatchHUD(){
  const a=U.clamp(Scene.catchAnim*2,0,1);
  ctx.fillStyle=`rgba(0,0,0,${0.4*a})`; ctx.fillRect(0,0,W,H);
  const y=H*0.4 - (1-U.ease(a))*60;
  ctx.fillStyle='#ffd34d'; ctx.font='bold 44px sans-serif'; ctx.textAlign='center';
  ctx.fillText('🎣 GET! 🎣', W*0.5, y);
  ctx.fillStyle='#fff'; ctx.font='bold 26px sans-serif';
  ctx.fillText(Scene.fish.name, W*0.5, y+44);
  if(Scene.catchAnim>0.8){
    ctx.fillStyle='#9fd'; ctx.font='16px sans-serif';
    ctx.fillText('○ で確認', W*0.5, H*0.4+120);
  }
  ctx.textAlign='left';
}

// ---- RESULT ----
function drawResult(){
  ctx.fillStyle='rgba(3,3,18,.85)'; ctx.fillRect(0,0,W,H);
  const d=Scene.caughtData;
  ctx.textAlign='center';
  ctx.fillStyle='#ffd34d'; ctx.font='bold 30px sans-serif';
  ctx.fillText('CATCH RESULT', W*0.5, 90);
  // 魚プレビュー
  drawSpaceFish(ctx, W*0.5, 230, 2.2, 1, G.t*1.2, Scene.fish, {glow:true});
  ctx.fillStyle='#fff'; ctx.font='bold 28px sans-serif';
  ctx.fillText(d.name, W*0.5, 330);
  ctx.fillStyle='#9fd'; ctx.font='bold 40px sans-serif';
  ctx.fillText(d.cm+' cm', W*0.5, 385);
  ctx.fillStyle='#ffd34d'; ctx.font='18px sans-serif';
  ctx.fillText('レア度 '+'★'.repeat(d.tier), W*0.5, 420);
  // 図鑑数
  ctx.fillStyle='#aab'; ctx.font='14px sans-serif';
  const uniq=new Set(G.caught.map(c=>c.id)).size;
  ctx.fillText(`図鑑コンプ: ${uniq} / ${FISH_DB.length} 種   総釣果: ${G.caught.length} 匹`, W*0.5, 460);

  const need=TARGET[G.planet];
  if(G.planetProgress[G.planet]>=need)
    pulseCenter('○ で結果へ', H-70, '#ffd34d');
  else
    pulseCenter('○ で続けて釣る', H-70, '#9fd');
  ctx.textAlign='left';
}
function pulseCenter(text,y,col){
  const s=1+Math.sin(G.t*8)*0.06;
  ctx.save(); ctx.translate(W*0.5,y); ctx.scale(s,s);
  ctx.fillStyle=col; ctx.font='bold 20px sans-serif'; ctx.textAlign='center';
  ctx.fillText(text,0,0); ctx.restore();
}

// ---- CLEAR ----
function drawClear(){
  ctx.fillStyle='rgba(3,10,30,.88)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  const a=U.ease(U.clamp(Scene.clearAnim,0,1));
  ctx.fillStyle='#ffd34d'; ctx.font=`bold ${48*a}px sans-serif`;
  ctx.fillText('PLANET CLEAR!', W*0.5, H*0.4);
  ctx.fillStyle='#fff'; ctx.font='20px sans-serif';
  ctx.fillText(PLANETS[G.planet].name+' 制覇！', W*0.5, H*0.4+44);
  if(G.unlocked>G.planet+1 && G.planet+1<PLANETS.length){
    ctx.fillStyle='#9cf'; ctx.font='bold 18px sans-serif';
    ctx.fillText('▶ 新たな惑星「'+PLANETS[G.planet+1].name+'」が解放された！', W*0.5, H*0.4+84);
  }
  if(Scene.clearAnim>1) pulseCenter('○ で宇宙マップへ', H-70, '#ffd34d');
  ctx.textAlign='left';
}

// ---- ENDING ----
function drawEnding(){
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
  drawSkyAndSpace(ctx,W,H,PLANETS[4],G.t);
  ctx.textAlign='center';
  const a=U.clamp(Scene.endAnim/2,0,1);
  ctx.globalAlpha=a;
  drawSpaceFish(ctx, W*0.5, H*0.35, 3.2, 1, G.t, getNushi(), {glow:true});
  ctx.fillStyle='#ffd34d'; ctx.font='bold 40px sans-serif';
  ctx.fillText('伝説のヌシを釣り上げた！', W*0.5, H*0.6);
  ctx.fillStyle='#fff'; ctx.font='20px sans-serif';
  ctx.fillText('レヴィアコスは銀河の海へと還っていった——', W*0.5, H*0.6+40);
  ctx.fillStyle='#9fd'; ctx.font='16px sans-serif';
  ctx.fillText('★ STELLAR ANGLER  COMPLETE ★', W*0.5, H*0.6+80);
  ctx.globalAlpha=1;
  if(Scene.endAnim>3) pulseCenter('○ でタイトルへ', H-50, '#ffd34d');
  ctx.textAlign='left';
}

// ===================================================================
//  TITLE / SELECT 描画
// ===================================================================
function renderTitle(){
  drawSkyAndSpace(ctx,W,H,PLANETS[0],G.t);
  // 太陽
  const sun=G.assets.sun;
  if(sun){ const ss=120+Math.sin(G.t)*4; ctx.drawImage(sun, W*0.78-ss/2, H*0.18, ss,ss); }
  // タイトルロゴ
  ctx.textAlign='center';
  ctx.save();
  ctx.translate(W*0.5,H*0.34);
  const bob=Math.sin(G.t*1.5)*4;
  ctx.fillStyle='#39e0ff'; ctx.font='bold 64px sans-serif';
  ctx.shadowColor='#39e0ff'; ctx.shadowBlur=24;
  ctx.fillText('STELLAR ANGLER', 0, bob);
  ctx.shadowBlur=0;
  ctx.fillStyle='#ffd34d'; ctx.font='bold 26px "Hiragino Maru Gothic Pro",sans-serif';
  ctx.fillText('〜 伝説のヌシを求めて 〜', 0, 44+bob);
  ctx.restore();

  // まめお＆魚デモ
  drawSpaceFish(ctx, W*0.28, H*0.62+Math.sin(G.t*2)*8, 1.4, 1, G.t*1.5, FISH_DB[6], {glow:true});
  const bean=G.assets.bean;
  if(bean) ctx.drawImage(bean, W*0.62, H*0.55, 130,130);

  const blink=Math.sin(G.t*4)>0;
  if(blink){
    ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif';
    ctx.fillText('PRESS ○ / SPACE TO START', W*0.5, H*0.86);
  }
  ctx.fillStyle='#7f9'; ctx.font='13px sans-serif';
  ctx.fillText('DualShock2 デュアルアナログ対応 ── 左:狙い/竿さばき  右:リール', W*0.5, H*0.93);
  ctx.textAlign='left';
}

function renderSelect(){
  const planet=PLANETS[G.selCursor];
  drawSkyAndSpace(ctx,W,H,planet,G.t);
  ctx.textAlign='center';
  ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif';
  ctx.fillText('▼ 惑星をえらべ ▼', W*0.5, 50);

  // 中央に現在惑星を大きく
  const cx=W*0.5, cy=H*0.46;
  const locked = G.selCursor>=G.unlocked;
  const r=90+Math.sin(G.t*1.5)*4;
  const g=ctx.createRadialGradient(cx-30,cy-30,20,cx,cy,r);
  g.addColorStop(0, locked?'#333':planet.sea[0]);
  g.addColorStop(0.7, locked?'#222':planet.sky[planet.sky.length-1]);
  g.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle=g;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,U.TAU); ctx.fill();
  ctx.strokeStyle=planet.accent; ctx.lineWidth=3; ctx.globalAlpha=locked?0.3:1;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,U.TAU); ctx.stroke();
  ctx.globalAlpha=1;
  // リング
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(0.5+Math.sin(G.t*0.3)*0.1);
  ctx.scale(1,0.32); ctx.strokeStyle=planet.accent; ctx.globalAlpha=0.5; ctx.lineWidth=4;
  ctx.beginPath(); ctx.arc(0,0,r+24,0,U.TAU); ctx.stroke(); ctx.restore(); ctx.globalAlpha=1;

  if(locked){
    ctx.fillStyle='#fff'; ctx.font='bold 40px sans-serif';
    ctx.fillText('🔒', cx, cy+14);
  }

  // 名前・難易度
  ctx.fillStyle=planet.accent; ctx.font='bold 30px sans-serif';
  ctx.fillText(planet.name, cx, cy+r+50);
  ctx.fillStyle='#aab'; ctx.font='15px sans-serif';
  ctx.fillText(planet.sub+'   難易度 '+planet.diff, cx, cy+r+74);
  if(!locked){
    ctx.fillStyle='#9fd'; ctx.font='14px sans-serif';
    ctx.fillText(`釣果 ${G.planetProgress[G.selCursor]} / ${TARGET[G.selCursor]}`, cx, cy+r+98);
  }

  // インジケータ
  for(let i=0;i<PLANETS.length;i++){
    const dx=cx-(PLANETS.length-1)*14 + i*28;
    ctx.beginPath(); ctx.arc(dx, H-46, 7, 0, U.TAU);
    ctx.fillStyle = i===G.selCursor?'#fff':(i<G.unlocked?'#6ad':'#444');
    ctx.fill();
  }
  ctx.fillStyle='#789'; ctx.font='13px sans-serif';
  ctx.fillText('← 左スティック →   ○:出発   ×:タイトル', W*0.5, H-18);
  ctx.textAlign='left';
}

// ===================================================================
//  トースト
// ===================================================================
function drawToast(){
  if(!G.msg) return;
  const a=U.clamp(G.msgT*2,0,1);
  ctx.globalAlpha=a;
  ctx.font='bold 17px sans-serif'; ctx.textAlign='center';
  const w=ctx.measureText(G.msg).width+40;
  roundRect(ctx, W*0.5-w/2, H*0.16, w, 36, 18);
  ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fill();
  ctx.fillStyle='#ffe98a';
  ctx.fillText(G.msg, W*0.5, H*0.16+24);
  ctx.textAlign='left'; ctx.globalAlpha=1;
}

// ===================================================================
//  起動
// ===================================================================
async function boot(){
  const lb=document.getElementById('loadbar');
  lb.style.width='30%';
  const [bean,sun] = await Promise.all([
    loadImage('../'+encodeURIComponent('Google_AI_Studio_2025-09-27T03_42_22.144Z-removebg-preview.png'))
      .then(i=>i||loadImage('../IMG_2992.png')),
    loadImage('../touka.png'),
  ]);
  G.assets.bean=bean; G.assets.sun=sun;
  lb.style.width='100%';
  setTimeout(()=>{
    document.getElementById('loading').classList.add('hidden');
    G.state='TITLE';
  },300);
  requestAnimationFrame(loop);
}
boot();

})();
