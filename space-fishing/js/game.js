/* =========================================================
   STELLAR ANGLER 〜伝説のヌシを求めて〜
   game.js -- メインループ／状態機械／擬似3D釣りファイト
   操作: スマホ=画面を直接さわるシームレスタッチ / PC=キーボード / ゲームパッド
   （外部アセット不使用・すべて手続き生成）
   ========================================================= */
(() => {
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const cam = { x:0, y:1.6, f:540, horizon:0.44 };

const G = {
  state:'LOADING', t:0, planet:0, selCursor:0, unlocked:1,
  caught:[], planetProgress:[0,0,0,0,0],
  shake:0, flash:0, flashCol:'255,255,255', msg:null, msgT:0, fade:1,
};
const TARGET = [3,3,3,3,1];

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
function flash(a=0.6, col='255,255,255'){ G.flash=a; G.flashCol=col; }

// ---------------- パーティクル ----------------
const parts=[];
function spawnP(x,y,o){ parts.push({x,y,vx:o.vx||0,vy:o.vy||0,life:o.life||1,max:o.life||1,
  r:o.r||3,c:o.c||'#fff',g:o.g||0,glow:o.glow}); }
function burst(x,y,n,o={}){ for(let i=0;i<n;i++){ const a=U.rand(0,U.TAU),s=U.rand(o.smin||1,o.smax||4);
  spawnP(x,y,{vx:Math.cos(a)*s,vy:Math.sin(a)*s-(o.up||0),life:U.rand(o.lmin||0.4,o.lmax||0.9),
  r:U.rand(o.rmin||2,o.rmax||5),c:o.c||'#fff',g:o.g||0,glow:o.glow}); } }
function updateP(dt){ for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt;
  if(p.life<=0){parts.splice(i,1);continue;} p.x+=p.vx*60*dt; p.y+=p.vy*60*dt; p.vy+=p.g*60*dt; } }
function drawP(){ for(const p of parts){ const a=U.clamp(p.life/p.max,0,1);
  ctx.globalAlpha=a; if(p.glow){ctx.shadowColor=p.c;ctx.shadowBlur=8;}
  ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,U.TAU); ctx.fill(); ctx.shadowBlur=0; }
  ctx.globalAlpha=1; }

// ---------------- 釣りシーン状態 ----------------
const Scene = {
  aimX:0, aimZ:9, power:0,
  lureX:0, lureZ:9, lureBob:0, casting:0, waitT:0,
  swimmers:[], biteFish:null, biteWindow:0, nibble:0,
  fish:null, fishHP:0, fishMax:0, tension:0, progress:0,
  rodPower:0, eleki:0, pinch:false,
  fishMode:'run', modeT:0, pullX:0, koTimer:0, hitFx:0, elekiFx:0, lateral:0,
  caughtData:null, catchAnim:0, resultAnim:0, clearAnim:0, endAnim:0,
};
function resetSceneForPlanet(){
  Scene.swimmers.length=0;
  const pool=fishForPlanet(G.planet);
  const n=G.planet===4?1:5;
  for(let i=0;i<n;i++) Scene.swimmers.push(makeSwimmer(U.pick(pool)));
}
function makeSwimmer(d){
  return { d, x:U.rand(-6,6), z:U.rand(6,15), depth:U.rand(0.3,1.4),
    vx:U.rand(-0.6,0.6), phase:U.rand(0,6.28), state:'wander' };
}

let IN=null;
function uiConfirm(){ return IN.p.circle || IN.p.start || (IN.touch.active && IN.touch.tap); }

// ---------------- メインループ ----------------
let last=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  G.t+=dt; IN=Input.poll(dt);
  update(dt); render();
  requestAnimationFrame(loop);
}
function update(dt){
  if(G.shake>0) G.shake=Math.max(0,G.shake-dt*60);
  if(G.flash>0) G.flash=Math.max(0,G.flash-dt*3);
  if(G.fade>0 && G.state!=='LOADING') G.fade=Math.max(0,G.fade-dt*1.6);
  if(G.msgT>0){ G.msgT-=dt; if(G.msgT<=0) G.msg=null; }
  updateP(dt);
  switch(G.state){
    case 'TITLE': updateTitle(); break;
    case 'SELECT': updateSelect(dt); break;
    case 'CAST': updateCast(dt); break;
    case 'WAIT': updateWait(dt); break;
    case 'HOOK': updateHook(dt); break;
    case 'FIGHT': updateFight(dt); break;
    case 'CATCH': updateCatch(dt); break;
    case 'RESULT': updateResult(dt); break;
    case 'CLEAR': updateClear(dt); break;
    case 'ENDING': updateEnding(dt); break;
  }
}

// ---------------- TITLE ----------------
function updateTitle(){
  if(uiConfirm() || IN.p.cross){
    Sound.ensure(); Sound.startBGM(); Sound.SE.select();
    G.state='SELECT'; G.fade=1; G.selCursor=Math.min(G.unlocked-1,G.selCursor);
  }
}

// ---------------- SELECT ----------------
let selCD=0;
function updateSelect(dt){
  if(selCD>0) selCD-=dt;
  if(IN.p.cross){ Sound.SE.back(); G.state='TITLE'; G.fade=1; return; }
  if(IN.LX>0.5||IN.p.r1) moveSel(1);
  if(IN.LX<-0.5||IN.p.l1) moveSel(-1);
  // タッチ：スワイプで切替・タップで決定
  if(IN.touch.active && IN.touch.justUp){
    if(IN.touch.swipeX<-50){ moveSel(1); }
    else if(IN.touch.swipeX>50){ moveSel(-1); }
    else if(IN.touch.tap){
      if(IN.touch.tapX<W*0.22) moveSel(-1);
      else if(IN.touch.tapX>W*0.78) moveSel(1);
      else enterPlanet();
    }
  }
  if(IN.p.circle||IN.p.start) enterPlanet();
}
function moveSel(d){
  if(selCD>0) return; selCD=0.16;
  G.selCursor=U.clamp(G.selCursor+d,0,PLANETS.length-1); Sound.SE.move();
}
function enterPlanet(){
  if(G.selCursor>=G.unlocked){ Sound.SE.back(); toast('この惑星はまだロックされている…'); return; }
  Sound.SE.select(); G.planet=G.selCursor; resetSceneForPlanet();
  Scene.aimX=0; Scene.aimZ=9; Scene.power=0; G.state='CAST'; G.fade=1;
  toast(touchMode()? PLANETS[G.planet].name+'に到着！ 海面をなぞって狙い、指を離してキャスト'
                   : PLANETS[G.planet].name+'に到着！ 左スティックで狙って○でキャスト', 3.0);
}
function touchMode(){ return IN.touch.active; }

// ---------------- CAST ----------------
function updateCast(dt){
  if(IN.p.cross){ Sound.SE.back(); G.state='SELECT'; G.fade=1; return; }
  if(IN.touch.active){
    if(IN.touch.down){
      Scene.aimX=U.clamp((IN.touch.x/W*2-1)*7,-7,7);
      const wy=U.clamp((IN.touch.y-H*cam.horizon)/(H-H*cam.horizon),0,1);
      Scene.aimZ=U.clamp(U.lerp(16,5,wy),5,16);
      Scene.power=U.clamp(Scene.power+dt*1.8,0,1);
    } else if(IN.touch.justUp){
      doCast();
    }
  } else {
    Scene.aimX=U.clamp(Scene.aimX+IN.LX*dt*7,-7,7);
    Scene.aimZ=U.clamp(Scene.aimZ-IN.LY*dt*7,5,16);
    if(IN.circle) Scene.power=U.clamp(Scene.power+dt*1.6,0,1);
    if(!IN.circle && Scene.power>0.02) doCast();
  }
  updateSwimmers(dt,false);
}
function doCast(){
  Sound.SE.cast();
  Scene.lureX=Scene.aimX; Scene.lureZ=Scene.aimZ; Scene.casting=0; Scene.power=0;
  G.state='WAIT'; Scene.waitT=0; Scene.biteFish=null; Scene.nibble=0;
  const p=project(Scene.lureX,0,Scene.lureZ,cam,W,H);
  setTimeout(()=>{ Sound.SE.splash(); burst(p.x,p.y,12,{c:'#bff',smax:3,up:1,lmax:0.6,rmax:3}); },280);
}

// ---------------- WAIT ----------------
function updateWait(dt){
  Scene.casting=Math.min(1,Scene.casting+dt*2.2); Scene.lureBob+=dt; Scene.waitT+=dt;
  if(IN.p.cross || (IN.touch.active && IN.touch.tap)){ Sound.SE.back(); G.state='CAST'; return; }
  updateSwimmers(dt,true);
  let best=null,bd=99;
  for(const s of Scene.swimmers){ const d=U.dist(s.x,s.z,Scene.lureX,Scene.lureZ);
    if(s.state==='approach'&&d<bd){bd=d;best=s;} }
  if(best&&bd<0.6){
    Scene.nibble+=dt; if(Math.random()<0.04) Sound.SE.reel();
    if(Scene.nibble>U.rand(0.6,1.4)) triggerBite(best);
  }else Scene.nibble=Math.max(0,Scene.nibble-dt);
}
function triggerBite(s){ Sound.SE.bite(); Scene.biteFish=s; Scene.biteWindow=1.0; G.shake=6; G.state='HOOK'; }
function updateSwimmers(dt,lure){
  for(const s of Scene.swimmers){ s.phase+=dt;
    if(lure){
      const d=U.dist(s.x,s.z,Scene.lureX,Scene.lureZ);
      if(s.state==='wander'&&d<5&&Math.random()<0.012*s.d.speed) s.state='approach';
      if(s.state==='approach'){
        const dx=Scene.lureX-s.x,dz=Scene.lureZ-s.z,m=Math.hypot(dx,dz)||1;
        s.x+=dx/m*dt*1.4*s.d.speed; s.z+=dz/m*dt*1.4*s.d.speed;
        if(Math.random()<0.004) s.state='wander';
      }else{ s.x+=s.vx*dt; s.z+=Math.sin(s.phase*0.6)*dt*0.4; }
    }else{ s.x+=s.vx*dt; s.z+=Math.sin(s.phase*0.5)*dt*0.5; }
    if(s.x>7){s.x=7;s.vx*=-1;} if(s.x<-7){s.x=-7;s.vx*=-1;}
    if(s.z>16)s.z=16; if(s.z<5)s.z=5;
  }
}

// ---------------- HOOK ----------------
function updateHook(dt){
  Scene.biteWindow-=dt;
  if(uiConfirm()){ startFight(Scene.biteFish); return; }
  if(Scene.biteWindow<=0){ Sound.SE.back(); toast('逃げられた…！ もう一度ねらおう');
    Scene.biteFish.state='wander'; G.state='CAST'; }
}

// ---------------- FIGHT ----------------
function startFight(s){
  const d=s.d; Scene.fish=d; Scene.fishMax=d.hp; Scene.fishHP=d.hp;
  Scene.tension=20; Scene.progress=0; Scene.rodPower=0; Scene.eleki=0; Scene.pinch=false;
  Scene.fishMode='run'; Scene.modeT=U.rand(1.2,2.2); Scene.pullX=U.pick([-1,1]);
  Scene.koTimer=0; Scene.hitFx=0; Scene.elekiFx=0; Scene.lateral=0;
  const i=Scene.swimmers.indexOf(s); if(i>=0)Scene.swimmers.splice(i,1);
  G.state='FIGHT'; Sound.SE.bite();
  toast('ヒット！ '+d.name+'！ '+(touchMode()?'画面をなぞって巻け！':'右スティックで巻け！'),2.4);
}
function doRodAttack(){
  const F=Scene; if(F.rodPower<100||F.fishHP<=0) return false;
  const dmg=F.fishMax*0.14+30; F.fishHP-=dmg; F.rodPower=0; F.tension=Math.max(0,F.tension-12);
  F.hitFx=0.4; F.modeT=Math.min(F.modeT,0.3); F.fishMode='tire'; G.shake=8; Sound.SE.attack();
  hitParticles('#ffd34d'); toast('ロッドパワーアタック！'); return true;
}
function doEleki(){
  const F=Scene; if(F.eleki<100||F.fishHP<=0) return false;
  const dmg=F.fishMax*0.34+60; F.fishHP-=dmg; F.eleki=0; F.tension=18;
  F.elekiFx=0.7; F.modeT=1.4; F.fishMode='tire'; G.shake=18; flash(0.7,'180,230,255'); Sound.SE.eleki();
  hitParticles('#9cf',26); toast('⚡エレキアタック炸裂！⚡',2.0); return true;
}
function hitParticles(c,n=16){
  const pos=fishScreen();
  burst(pos.x,pos.y,n,{c,smax:6,lmax:0.8,rmax:6,glow:true});
}
function updateFight(dt){
  const F=Scene, d=F.fish, koed=F.fishHP<=0;
  F.modeT-=dt;
  if(!koed&&F.modeT<=0){
    if(F.fishMode==='run'){ F.fishMode='tire'; F.modeT=U.rand(1.0,1.8)*(1+(1-F.fishHP/F.fishMax)); }
    else{ F.fishMode='run'; F.modeT=U.rand(0.9,1.8)*(F.fishHP/F.fishMax+0.4); F.pullX=U.pick([-1,1]); Sound.SE.warn(); }
  }
  F.lateral=U.lerp(F.lateral, koed?0:(F.fishMode==='run'?F.pullX:0), dt*3);

  // --- 入力を reelAmt / leanX / strike に正規化 ---
  let reelAmt=0, leanX=0, strike=false;
  if(IN.touch.active){
    if(IN.touch.down){ reelAmt=U.clamp(IN.touch.speed*0.18,0,2.6); leanX=U.clamp(IN.touch.dx/12,-1,1); }
    if(IN.touch.tap) strike=true;
  }else{
    const spin=Input.reelSpin(IN.RX,IN.RY);
    const keyReel=(IN.RY<-0.3||IN.RX!==0)&&!IN.usingPad?1:0;
    const reeling=spin>0.6||keyReel>0;
    reelAmt=reeling?(IN.usingPad?Math.min(2.4,spin):1.6):0;
    leanX=IN.LX;
    if(IN.p.circle&&doRodAttack()){} if(IN.p.triangle&&doEleki()){}
  }
  const reeling=reelAmt>0.05;
  const counter=-Math.sign(F.pullX)*leanX;
  const goodWork=!koed&&F.fishMode==='run'&&counter>0.3;

  if(!koed){
    if(F.fishMode==='run'){
      F.tension += dt*(8+reelAmt*18)*d.power;
      if(goodWork){ F.tension-=dt*22*counter; F.rodPower+=dt*40*counter; }
      else if(counter<-0.3){ F.tension+=dt*14; }
      F.progress += reelAmt*dt*4;
    }else{
      F.tension += dt*(reelAmt*5-6);
      F.progress += reelAmt*dt*14; F.rodPower+=dt*8;
    }
    if(reeling&&Math.random()<0.3) Sound.SE.reel();
  }else{
    F.tension=U.lerp(F.tension,10,dt*2); F.progress+=(reelAmt+1.2)*dt*22;
  }
  F.tension-=dt*3; F.tension=U.clamp(F.tension,0,100);
  F.rodPower=U.clamp(F.rodPower,0,100); F.progress=U.clamp(F.progress,0,100);

  const wasPinch=F.pinch; F.pinch=F.tension>=78&&!koed;
  F.eleki=U.clamp(F.eleki+dt*(F.pinch?55:6),0,100);
  if(F.pinch&&!wasPinch) Sound.SE.warn();

  if(F.tension>=100){ Sound.SE.snap(); G.shake=14; flash(0.5,'255,80,80');
    toast('ライン破断…！ '+d.name+'に逃げられた',2.6); G.state='CAST'; return; }

  // タッチのタップ＝ストライク（エレキ優先→ロッド）
  if(strike){ if(!doEleki()) doRodAttack(); }

  if(F.hitFx>0) F.hitFx-=dt; if(F.elekiFx>0) F.elekiFx-=dt;

  if(F.fishHP<=0&&F.koTimer===0){ F.fishHP=0; F.koTimer=0.001; Sound.SE.ko(); flash(0.5);
    toast('KO！ そのまま巻き上げろ！',2.0); }
  if(F.koTimer>0) F.koTimer+=dt;

  // ファイト中の水しぶき
  if(!koed&&F.fishMode==='run'&&Math.random()<0.4){
    const p=fishScreen(); burst(p.x,p.y,3,{c:'rgba(255,255,255,.7)',smax:3,up:1.5,lmax:0.5,rmax:3,g:0.06});
  }
  if(F.progress>=100) landFish();
}
function fishScreen(){
  const F=Scene, koed=F.fishHP<=0, prog=F.progress/100;
  const z=U.lerp(11,2.5,prog), lat=F.lateral*3*(1-prog*0.6);
  const splash=F.fishMode==='run'&&!koed;
  const yW=koed?0.3:(splash?0.1+Math.abs(Math.sin(G.t*9))*0.4:-0.2);
  return project(lat,yW,z,cam,W,H);
}
function landFish(){
  const d=Scene.fish; const base=30+d.size*60; const cm=Math.round(base*U.rand(0.7,1.5));
  Scene.caughtData={id:d.id,name:d.name,cm,tier:d.tier,boss:!!d.boss,t:Date.now()};
  G.caught.push(Scene.caughtData); G.planetProgress[G.planet]++; save();
  Sound.SE.fanfare(); flash(0.6);
  const p=fishScreen(); burst(p.x,p.y,30,{c:'#ffd34d',smax:7,up:2,lmax:1.1,rmax:6,glow:true,g:0.04});
  G.state='CATCH'; Scene.catchAnim=0;
}

// ---------------- CATCH/RESULT/CLEAR/ENDING ----------------
function updateCatch(dt){ Scene.catchAnim+=dt; if(Scene.catchAnim>0.8&&uiConfirm()){ G.state='RESULT'; Scene.resultAnim=0; } }
function updateResult(dt){
  Scene.resultAnim+=dt;
  if(Scene.resultAnim>0.5&&uiConfirm()){
    const need=TARGET[G.planet];
    if(G.planetProgress[G.planet]>=need){
      if(Scene.caughtData.boss){ G.state='ENDING'; Scene.endAnim=0; Sound.SE.fanfare(); return; }
      if(G.unlocked<G.planet+2){ G.unlocked=Math.min(PLANETS.length,G.planet+2); save(); }
      G.state='CLEAR'; Scene.clearAnim=0; Sound.SE.fanfare();
    }else{ G.state='CAST'; Scene.aimX=0; Scene.aimZ=9; Scene.power=0;
      if(Scene.swimmers.length<2) resetSceneForPlanet(); }
  }
}
function updateClear(dt){ Scene.clearAnim+=dt; if(Scene.clearAnim>1&&uiConfirm()){ Sound.SE.select();
  G.state='SELECT'; G.fade=1; G.selCursor=Math.min(G.unlocked-1,G.planet+1); } }
function updateEnding(dt){ Scene.endAnim+=dt; if(Scene.endAnim>3&&uiConfirm()){ Sound.SE.select(); G.state='SELECT'; G.fade=1; } }

// ===================================================================
//  RENDER
// ===================================================================
function render(){
  ctx.save();
  if(G.shake>0) ctx.translate(U.rand(-G.shake,G.shake),U.rand(-G.shake,G.shake));
  const planet=PLANETS[(G.state==='SELECT')?G.selCursor:G.planet];

  if(G.state==='LOADING'){ ctx.restore(); return; }
  if(G.state==='TITLE'){ renderTitle(); drawP(); ctx.restore(); drawOverlayFx(); return; }
  if(G.state==='SELECT'){ renderSelect(); drawP(); ctx.restore(); drawOverlayFx(); return; }

  drawSkyAndSpace(ctx,W,H,planet,G.t);
  drawSea(planet);
  drawAngler(planet);

  if(G.state==='CAST') renderCast(planet);
  if(G.state==='WAIT'||G.state==='HOOK') renderWaitScene();
  if(G.state==='FIGHT'||G.state==='CATCH') renderFight();
  drawP();

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
  drawOverlayFx();
}
function drawOverlayFx(){
  if(G.flash>0){ ctx.fillStyle=`rgba(${G.flashCol},${G.flash})`; ctx.fillRect(0,0,W,H); }
  if(G.fade>0){ ctx.fillStyle=`rgba(0,0,0,${G.fade})`; ctx.fillRect(0,0,W,H); }
}

// ---- 海面（強化版）----
function drawSea(planet){
  const seaY=H*cam.horizon;
  const g=ctx.createLinearGradient(0,seaY,0,H);
  g.addColorStop(0,planet.sea[0]); g.addColorStop(0.5,planet.sea[1]); g.addColorStop(1,'#02020a');
  ctx.fillStyle=g; ctx.fillRect(0,seaY,W,H-seaY);
  // 水平線グロー
  const hg=ctx.createLinearGradient(0,seaY-20,0,seaY+30);
  hg.addColorStop(0,'rgba(0,0,0,0)'); hg.addColorStop(0.5,planet.haze); hg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=hg; ctx.fillRect(0,seaY-20,W,50);
  // 波ライン
  ctx.strokeStyle='rgba(255,255,255,.09)';
  for(let i=1;i<28;i++){
    const z=4+i*0.7; const p=project(0,0,z,cam,W,H); const yy=p.y; if(yy<seaY) continue;
    ctx.lineWidth=Math.max(0.5,p.s*0.4); ctx.beginPath();
    for(let xx=0;xx<=W;xx+=24){ const wy=yy+Math.sin(G.t*1.5+xx*0.02+i)*p.s*0.5; xx===0?ctx.moveTo(xx,wy):ctx.lineTo(xx,wy); }
    ctx.stroke();
  }
  // きらめき（スペキュラ）
  ctx.fillStyle='rgba(255,255,255,.5)';
  for(let i=0;i<24;i++){
    const sx=(Math.sin(i*12.9+G.t*0.6)*0.5+0.5)*W;
    const zz=4+((i*1.7)%18); const p=project(0,0,zz,cam,W,H);
    if(p.y<seaY) continue;
    const tw=Math.max(0,Math.sin(G.t*3+i));
    ctx.globalAlpha=tw*0.5; ctx.fillRect(sx,p.y,2*p.s+1,1.5);
  }
  ctx.globalAlpha=1;
}

// ---- 釣り人（手続き生成の宇宙アングラー）----
function drawAngler(planet){
  const bx=W*0.5, by=H-40;
  let rodTipX=W*0.5, rodTipY=H*cam.horizon+10;
  if(G.state==='WAIT'||G.state==='HOOK'){ const p=project(Scene.lureX,0,Scene.lureZ,cam,W,H); rodTipX=p.x; rodTipY=p.y; }
  else if(G.state==='FIGHT'||G.state==='CATCH'){ const p=fishScreen(); rodTipX=p.x; rodTipY=p.y; }
  else if(G.state==='CAST'){ const p=project(Scene.aimX,0,Scene.aimZ,cam,W,H); rodTipX=p.x; rodTipY=p.y; }

  // ライン
  if(G.state!=='SELECT'&&G.state!=='TITLE'){
    const tension=G.state==='FIGHT'?Scene.tension/100:0.1;
    ctx.strokeStyle=tension>0.78?'rgba(255,80,80,.9)':'rgba(255,255,255,.7)';
    ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(bx-46,by-150);
    const sag=(1-tension)*40, mx=(bx-46+rodTipX)/2, my=(by-150+rodTipY)/2+sag;
    ctx.quadraticCurveTo(mx,my,rodTipX,rodTipY); ctx.stroke();
  }
  // 竿
  ctx.strokeStyle='#d9c7a0'; ctx.lineWidth=6; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(bx-86,by+8); ctx.lineTo(bx-46,by-150); ctx.stroke();
  ctx.strokeStyle='#3a342a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(bx-86,by+8); ctx.lineTo(bx-46,by-150); ctx.stroke();

  // アングラー本体（後ろ姿のスペーススーツ）
  const ax=bx-40, ay=by-6, bob=Math.sin(G.t*2)*2;
  ctx.save(); ctx.translate(ax,ay+bob);
  // 体
  const bg=ctx.createLinearGradient(0,-40,0,40);
  bg.addColorStop(0,'#e9eef5'); bg.addColorStop(1,'#aeb8c6');
  ctx.fillStyle=bg; roundRect(ctx,-26,-18,52,56,16); ctx.fill();
  // バックパック
  ctx.fillStyle='#7d8896'; roundRect(ctx,-20,-12,40,34,10); ctx.fill();
  ctx.fillStyle=planet.accent; ctx.globalAlpha=0.8; roundRect(ctx,-12,-6,24,10,4); ctx.fill(); ctx.globalAlpha=1;
  // ヘルメット
  const hg=ctx.createRadialGradient(-8,-46,4,0,-40,30);
  hg.addColorStop(0,'#fff'); hg.addColorStop(1,'#c3ccd8');
  ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-40,26,0,U.TAU); ctx.fill();
  // バイザー
  const vg=ctx.createLinearGradient(0,-58,0,-24);
  vg.addColorStop(0,planet.accent); vg.addColorStop(1,'#0a1730');
  ctx.fillStyle=vg; ctx.beginPath(); ctx.ellipse(0,-40,17,15,0,0,U.TAU); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-6,-46,5,3,-0.5,0,U.TAU); ctx.fill();
  // 腕（竿側）
  ctx.strokeStyle='#cfd7e2'; ctx.lineWidth=10; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(10,-6); ctx.lineTo(40,-18); ctx.stroke();
  ctx.restore();
}

// ---- CAST ----
function renderCast(planet){
  const p=project(Scene.aimX,0,Scene.aimZ,cam,W,H);
  const r=18*p.s+8;
  // 軌道
  ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.setLineDash([6,6]); ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(W*0.5-46,H-190);
  ctx.quadraticCurveTo((W*0.5+p.x)/2,(H-190+p.y)/2-120,p.x,p.y); ctx.stroke(); ctx.setLineDash([]);
  // 照準
  ctx.strokeStyle=planet.accent; ctx.lineWidth=2; ctx.globalAlpha=0.95;
  ctx.beginPath(); ctx.arc(p.x,p.y,r,0,U.TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(p.x,p.y,r*0.5,0,U.TAU); ctx.stroke();
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){ ctx.beginPath();
    ctx.moveTo(p.x+Math.cos(a)*(r-6),p.y+Math.sin(a)*(r-6));
    ctx.lineTo(p.x+Math.cos(a)*(r+6),p.y+Math.sin(a)*(r+6)); ctx.stroke(); }
  // パワーリング
  if(Scene.power>0.01){ ctx.strokeStyle='#ffd34d'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(p.x,p.y,r+10,-Math.PI/2,-Math.PI/2+U.TAU*Scene.power); ctx.stroke(); }
  ctx.globalAlpha=1;
  drawSwimmers(true);
}

// ---- WAIT/HOOK ----
function renderWaitScene(){
  drawSwimmers(true);
  const p=project(Scene.lureX,0,Scene.lureZ,cam,W,H); const bob=Math.sin(Scene.lureBob*3)*2;
  ctx.strokeStyle='rgba(255,255,255,.4)'; const rr=(Scene.lureBob*30)%30; ctx.lineWidth=1; ctx.globalAlpha=1-rr/30;
  ctx.beginPath(); ctx.ellipse(p.x,p.y+bob,rr*p.s*0.4+4,rr*p.s*0.2+2,0,0,U.TAU); ctx.stroke(); ctx.globalAlpha=1;
  ctx.fillStyle='#ff5252'; ctx.beginPath(); ctx.ellipse(p.x,p.y-6*p.s+bob,5*p.s+2,7*p.s+2,0,0,U.TAU); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(p.x,p.y-9*p.s+bob,5*p.s+2,3*p.s+1,0,0,U.TAU); ctx.fill();
  if(G.state==='HOOK'){ const s=1+Math.sin(G.t*20)*0.12; ctx.font=`bold ${44*s}px sans-serif`;
    ctx.fillStyle='#ffea00'; ctx.textAlign='center'; ctx.shadowColor='#fa0'; ctx.shadowBlur=16;
    ctx.fillText('！',p.x,p.y-44); ctx.shadowBlur=0; ctx.textAlign='left'; }
}
function drawSwimmers(){
  const list=[...Scene.swimmers].sort((a,b)=>b.z-a.z);
  for(const s of list){ const p=project(s.x,-0.4*s.depth,s.z,cam,W,H); if(p.y<H*cam.horizon) continue;
    const dir=s.vx>=0?1:-1; ctx.globalAlpha=U.clamp(0.85-s.depth*0.3,0.3,0.9);
    drawSpaceFish(ctx,p.x,p.y,p.s*0.5*s.d.size,dir,G.t+s.phase,s.d,{glow:s.state==='approach'}); ctx.globalAlpha=1; }
}

// ---- FIGHT ----
function renderFight(){
  const F=Scene, koed=F.fishHP<=0, p=fishScreen();
  const dir=F.lateral>=0?-1:1;
  if(F.elekiFx>0){ ctx.strokeStyle=`rgba(180,230,255,${F.elekiFx})`; ctx.lineWidth=3; ctx.shadowColor='#9cf'; ctx.shadowBlur=12;
    for(let i=0;i<6;i++){ ctx.beginPath(); let lx=p.x,ly=p.y-60; ctx.moveTo(lx,ly);
      for(let j=0;j<6;j++){ lx+=U.rand(-20,20); ly+=14; ctx.lineTo(lx,ly); } ctx.stroke(); } ctx.shadowBlur=0; }
  ctx.save(); if(F.hitFx>0) ctx.translate(U.rand(-6,6),U.rand(-6,6));
  drawSpaceFish(ctx,p.x,p.y,p.s*1.1*F.fish.size,dir,G.t*1.5,F.fish,{glow:true});
  const fl=Math.max(F.hitFx,F.elekiFx);
  if(fl>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=fl;
    drawSpaceFish(ctx,p.x,p.y,p.s*1.1*F.fish.size,dir,G.t*1.5,{...F.fish,c1:'#fff',c2:'#fff',fin:'#fff'},{glow:false});
    ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
  if(koed){ ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif'; ctx.textAlign='center';
    ctx.fillText('×  ×',p.x,p.y-p.s*30); ctx.textAlign='left'; }
  ctx.restore();
}

// ===================================================================
//  HUD
// ===================================================================
function drawTopHUD(planet){
  ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(0,0,W,38);
  ctx.fillStyle=planet.accent; ctx.font='bold 18px sans-serif'; ctx.textAlign='left';
  ctx.fillText('🪐 '+planet.name,14,25);
  const need=TARGET[G.planet];
  ctx.fillStyle='#fff'; ctx.textAlign='right'; ctx.font='bold 15px sans-serif';
  ctx.fillText(planet.boss?'ヌシ討伐戦':`釣果 ${G.planetProgress[G.planet]} / ${need}`,W-14,24);
  ctx.textAlign='left';
}
function bar(x,y,w,h,val,col,label,bg='rgba(255,255,255,.15)'){
  roundRect(ctx,x,y,w,h,h/2); ctx.fillStyle=bg; ctx.fill();
  roundRect(ctx,x,y,w*U.clamp(val,0,1),h,h/2); ctx.fillStyle=col; ctx.fill();
  if(label){ ctx.fillStyle='#fff'; ctx.font='bold 11px sans-serif'; ctx.textAlign='left'; ctx.fillText(label,x,y-4); }
}
function drawCastHUD(){ hudHint('海面をなぞって狙い、指を離してキャスト','左スティック:狙う ○:キャスト'); }
function drawWaitHUD(){
  if(Scene.nibble>0.05) bar(W*0.5-90,52,180,10,Scene.nibble/1.4,'#ff8','NIBBLE…');
  hudHint('アタリを待て…（タップで投げ直し）','アタリを待て… ×:投げ直し');
}
function drawHookHUD(){
  const s=1+Math.sin(G.t*18)*0.08; ctx.fillStyle='#ffea00'; ctx.font=`bold ${30*s}px sans-serif`; ctx.textAlign='center';
  ctx.shadowColor='#fa0'; ctx.shadowBlur=14;
  ctx.fillText(touchMode()?'▶ タップでフッキング！ ◀':'▶ ○ でフッキング！ ◀',W*0.5,72); ctx.shadowBlur=0; ctx.textAlign='left';
}
function drawFightHUD(){
  const F=Scene;
  bar(W*0.5-160,48,320,16,F.fishHP/F.fishMax,'#7fff8a',`${F.fish.name}  STAMINA`);
  const tx=24,ty=120,th=240;
  roundRect(ctx,tx,ty,16,th,8); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fill();
  const tv=F.tension/100, tcol=tv>0.78?'#ff3b3b':(tv>0.55?'#ffb13b':'#3bff7a');
  roundRect(ctx,tx,ty+th*(1-tv),16,th*tv,8); ctx.fillStyle=tcol; ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center'; ctx.fillText('TENSION',tx+8,ty-8);
  ctx.strokeStyle='#ff3b3b'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(tx-2,ty+th*0.22); ctx.lineTo(tx+18,ty+th*0.22); ctx.stroke();
  ctx.textAlign='left';
  bar(W*0.5-160,H-78,320,14,F.rodPower/100,F.rodPower>=100?'#ffd34d':'#7fd','ROD POWER');
  if(F.rodPower>=100) pulse(touchMode()?'タップで攻撃!':'○ アタック!',W*0.5+170,H-72,'#ffd34d');
  bar(W*0.5-160,H-52,320,14,F.eleki/100,F.eleki>=100?'#9cf':'#56a','ELEKI ⚡');
  if(F.eleki>=100) pulse(touchMode()?'タップでエレキ!':'△ エレキ!',W*0.5+170,H-46,'#9cf');
  bar(W*0.5-160,H-26,320,12,F.progress/100,'#fff','LANDING');
  if(F.pinch){ const a=0.4+0.3*Math.sin(G.t*14); ctx.fillStyle=`rgba(255,40,40,${a})`;
    ctx.fillRect(0,0,W,8); ctx.fillRect(0,H-8,W,8);
    ctx.fillStyle='#ff5252'; ctx.font='bold 24px sans-serif'; ctx.textAlign='center';
    ctx.fillText(touchMode()?'PINCH! エレキ満タンでタップ!':'PINCH! △でエレキ反撃!',W*0.5,96); ctx.textAlign='left'; }
  hudHint('画面をなぞる:巻く＆引きに逆らう／タップ:攻撃・エレキ','右:巻く 左:竿さばき ○:攻撃 △:エレキ');
}
function pulse(text,x,y,col){ const s=1+Math.sin(G.t*12)*0.12; ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  ctx.fillStyle=col; ctx.font='bold 14px sans-serif'; ctx.textAlign='left'; ctx.fillText(text,0,0); ctx.restore(); ctx.textAlign='left'; }
function hudHint(touchText,padText){
  const text=touchMode()?touchText:padText;
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillRect(0,H-20,W,20);
  ctx.fillStyle='#bcd'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText(text,W*0.5,H-6); ctx.textAlign='left';
}
function drawCatchHUD(){
  const a=U.clamp(Scene.catchAnim*2,0,1); ctx.fillStyle=`rgba(0,0,0,${0.4*a})`; ctx.fillRect(0,0,W,H);
  const y=H*0.4-(1-U.ease(a))*60;
  ctx.fillStyle='#ffd34d'; ctx.font='bold 44px sans-serif'; ctx.textAlign='center'; ctx.shadowColor='#ffd34d'; ctx.shadowBlur=20;
  ctx.fillText('🎣 GET! 🎣',W*0.5,y); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='bold 26px sans-serif'; ctx.fillText(Scene.fish.name,W*0.5,y+44);
  if(Scene.catchAnim>0.8){ ctx.fillStyle='#9fd'; ctx.font='16px sans-serif';
    ctx.fillText(touchMode()?'タップで確認':'○ で確認',W*0.5,H*0.4+120); } ctx.textAlign='left';
}
function drawResult(){
  ctx.fillStyle='rgba(3,3,18,.85)'; ctx.fillRect(0,0,W,H); const d=Scene.caughtData; ctx.textAlign='center';
  ctx.fillStyle='#ffd34d'; ctx.font='bold 30px sans-serif'; ctx.fillText('CATCH RESULT',W*0.5,90);
  drawSpaceFish(ctx,W*0.5,230,2.2,1,G.t*1.2,Scene.fish,{glow:true});
  ctx.fillStyle='#fff'; ctx.font='bold 28px sans-serif'; ctx.fillText(d.name,W*0.5,330);
  ctx.fillStyle='#9fd'; ctx.font='bold 40px sans-serif'; ctx.fillText(d.cm+' cm',W*0.5,385);
  ctx.fillStyle='#ffd34d'; ctx.font='18px sans-serif'; ctx.fillText('レア度 '+'★'.repeat(d.tier),W*0.5,420);
  ctx.fillStyle='#aab'; ctx.font='14px sans-serif';
  const uniq=new Set(G.caught.map(c=>c.id)).size;
  ctx.fillText(`図鑑 ${uniq} / ${FISH_DB.length} 種   総釣果 ${G.caught.length} 匹`,W*0.5,460);
  pulseCenter((G.planetProgress[G.planet]>=TARGET[G.planet]?(touchMode()?'タップで結果へ':'○ で結果へ'):(touchMode()?'タップで続ける':'○ で続けて釣る')),H-70,'#ffd34d');
  ctx.textAlign='left';
}
function pulseCenter(text,y,col){ const s=1+Math.sin(G.t*8)*0.06; ctx.save(); ctx.translate(W*0.5,y); ctx.scale(s,s);
  ctx.fillStyle=col; ctx.font='bold 20px sans-serif'; ctx.textAlign='center'; ctx.fillText(text,0,0); ctx.restore(); }
function drawClear(){
  ctx.fillStyle='rgba(3,10,30,.88)'; ctx.fillRect(0,0,W,H); ctx.textAlign='center';
  const a=U.ease(U.clamp(Scene.clearAnim,0,1));
  ctx.fillStyle='#ffd34d'; ctx.font=`bold ${48*a}px sans-serif`; ctx.shadowColor='#ffd34d'; ctx.shadowBlur=20;
  ctx.fillText('PLANET CLEAR!',W*0.5,H*0.4); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='20px sans-serif'; ctx.fillText(PLANETS[G.planet].name+' 制覇！',W*0.5,H*0.4+44);
  if(G.unlocked>G.planet+1&&G.planet+1<PLANETS.length){ ctx.fillStyle='#9cf'; ctx.font='bold 18px sans-serif';
    ctx.fillText('▶ 新たな惑星「'+PLANETS[G.planet+1].name+'」が解放された！',W*0.5,H*0.4+84); }
  if(Scene.clearAnim>1) pulseCenter(touchMode()?'タップで宇宙マップへ':'○ で宇宙マップへ',H-70,'#ffd34d'); ctx.textAlign='left';
}
function drawEnding(){
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H); drawSkyAndSpace(ctx,W,H,PLANETS[4],G.t); ctx.textAlign='center';
  const a=U.clamp(Scene.endAnim/2,0,1); ctx.globalAlpha=a;
  drawSpaceFish(ctx,W*0.5,H*0.35,3.2,1,G.t,getNushi(),{glow:true});
  ctx.fillStyle='#ffd34d'; ctx.font='bold 38px sans-serif'; ctx.fillText('伝説のヌシを釣り上げた！',W*0.5,H*0.6);
  ctx.fillStyle='#fff'; ctx.font='20px sans-serif'; ctx.fillText('レヴィアコスは銀河の海へと還っていった——',W*0.5,H*0.6+40);
  ctx.fillStyle='#9fd'; ctx.font='16px sans-serif'; ctx.fillText('★ STELLAR ANGLER  COMPLETE ★',W*0.5,H*0.6+80);
  ctx.globalAlpha=1; if(Scene.endAnim>3) pulseCenter(touchMode()?'タップでタイトルへ':'○ でタイトルへ',H-50,'#ffd34d'); ctx.textAlign='left';
}

// ---------------- TITLE / SELECT ----------------
function renderTitle(){
  drawSkyAndSpace(ctx,W,H,PLANETS[0],G.t);
  // 手前を泳ぐ宇宙魚デモ
  drawSpaceFish(ctx,W*0.24+Math.sin(G.t*0.7)*30,H*0.66+Math.sin(G.t*2)*10,1.5,1,G.t*1.5,FISH_DB[6],{glow:true});
  drawSpaceFish(ctx,W*0.8+Math.cos(G.t*0.5)*20,H*0.72+Math.cos(G.t*1.6)*8,1.1,-1,G.t*1.2,FISH_DB[2],{glow:true});
  ctx.textAlign='center';
  ctx.save(); ctx.translate(W*0.5,H*0.34); const bob=Math.sin(G.t*1.5)*4;
  ctx.fillStyle='#39e0ff'; ctx.font='bold 64px sans-serif'; ctx.shadowColor='#39e0ff'; ctx.shadowBlur=26;
  ctx.fillText('STELLAR ANGLER',0,bob); ctx.shadowBlur=0;
  ctx.fillStyle='#ffd34d'; ctx.font='bold 26px "Hiragino Maru Gothic Pro",sans-serif';
  ctx.fillText('〜 伝説のヌシを求めて 〜',0,44+bob); ctx.restore();
  if(Math.sin(G.t*4)>0){ ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif';
    ctx.fillText(touchMode()?'TAP TO START':'PRESS ○ / SPACE TO START',W*0.5,H*0.84); }
  ctx.fillStyle='#7f9'; ctx.font='13px sans-serif';
  ctx.fillText(touchMode()?'指で画面をなぞって釣る シームレス・タッチ操作':'デュアルアナログ対応 ── 左:狙い/竿さばき  右:リール',W*0.5,H*0.92);
  ctx.textAlign='left';
}
function renderSelect(){
  const planet=PLANETS[G.selCursor]; drawSkyAndSpace(ctx,W,H,planet,G.t); ctx.textAlign='center';
  ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif'; ctx.fillText('▼ 惑星をえらべ ▼',W*0.5,50);
  const cx=W*0.5, cy=H*0.46, locked=G.selCursor>=G.unlocked, r=90+Math.sin(G.t*1.5)*4;
  const g=ctx.createRadialGradient(cx-30,cy-30,20,cx,cy,r);
  g.addColorStop(0,locked?'#333':planet.sea[0]); g.addColorStop(0.7,locked?'#222':planet.sky[planet.sky.length-1]); g.addColorStop(1,'rgba(0,0,0,.6)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,U.TAU); ctx.fill();
  ctx.strokeStyle=planet.accent; ctx.lineWidth=3; ctx.globalAlpha=locked?0.3:1; ctx.beginPath(); ctx.arc(cx,cy,r,0,U.TAU); ctx.stroke(); ctx.globalAlpha=1;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(0.5+Math.sin(G.t*0.3)*0.1); ctx.scale(1,0.32);
  ctx.strokeStyle=planet.accent; ctx.globalAlpha=0.5; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,r+24,0,U.TAU); ctx.stroke(); ctx.restore(); ctx.globalAlpha=1;
  if(locked){ ctx.fillStyle='#fff'; ctx.font='bold 40px sans-serif'; ctx.fillText('🔒',cx,cy+14); }
  ctx.fillStyle=planet.accent; ctx.font='bold 30px sans-serif'; ctx.fillText(planet.name,cx,cy+r+50);
  ctx.fillStyle='#aab'; ctx.font='15px sans-serif'; ctx.fillText(planet.sub+'   難易度 '+planet.diff,cx,cy+r+74);
  if(!locked){ ctx.fillStyle='#9fd'; ctx.font='14px sans-serif'; ctx.fillText(`釣果 ${G.planetProgress[G.selCursor]} / ${TARGET[G.selCursor]}`,cx,cy+r+98); }
  // 矢印
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='bold 40px sans-serif';
  ctx.fillText('‹',cx-r-50,cy+14); ctx.fillText('›',cx+r+50,cy+14);
  for(let i=0;i<PLANETS.length;i++){ const dx=cx-(PLANETS.length-1)*14+i*28; ctx.beginPath(); ctx.arc(dx,H-46,7,0,U.TAU);
    ctx.fillStyle=i===G.selCursor?'#fff':(i<G.unlocked?'#6ad':'#444'); ctx.fill(); }
  ctx.fillStyle='#789'; ctx.font='13px sans-serif';
  ctx.fillText(touchMode()?'スワイプで選択・中央タップで出発':'← 左スティック →   ○:出発   ×:タイトル',W*0.5,H-18); ctx.textAlign='left';
}

// ---------------- トースト ----------------
function drawToast(){
  if(!G.msg) return; const a=U.clamp(G.msgT*2,0,1); ctx.globalAlpha=a;
  ctx.font='bold 17px sans-serif'; ctx.textAlign='center'; const w=ctx.measureText(G.msg).width+40;
  roundRect(ctx,W*0.5-w/2,H*0.15,w,36,18); ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fill();
  ctx.fillStyle='#ffe98a'; ctx.fillText(G.msg,W*0.5,H*0.15+24); ctx.textAlign='left'; ctx.globalAlpha=1;
}

// ---------------- 起動 ----------------
function boot(){
  const lb=document.getElementById('loadbar'); if(lb) lb.style.width='100%';
  setTimeout(()=>{ const ld=document.getElementById('loading'); if(ld) ld.classList.add('hidden'); G.state='TITLE'; },300);
  requestAnimationFrame(loop);
}
boot();
})();
