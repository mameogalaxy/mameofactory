/* =========================================================
   STELLAR ANGLER 〜伝説のヌシを求めて〜
   game.js -- 横視点・わかりやすい釣りアクション
   投げる→ポチャン→ウキつんつん→合わせてヒット→
   魚が空中に飛び出す→巻き上げてキャラまで寄せてゲット！
   ========================================================= */
(() => {
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;

const WL = 372;        // 水面の高さ
const AX = 150;        // アングラーの立ち位置X
const FAR_X = 860;     // 魚が暴れる遠い位置
const NEAR_X = 300;    // 寄せきった位置
const PINCH  = 82;     // この値以上でピンチ（救済エレキがたまる）

const G = {
  state:'LOADING', t:0, planet:0, selCursor:0, unlocked:1,
  caught:[], planetProgress:[0,0,0,0,0], nushiDone:[false,false,false,false,false],
  shake:0, flash:0, flashCol:'255,255,255', msg:null, msgT:0, fade:1,
};
// 各惑星でヌシが現れるまでに釣る通常魚の数（惑星4はいきなりヌシ）
const QUOTA = [2,2,3,3,0];
function isNushiTime(){ return !G.nushiDone[G.planet] && G.planetProgress[G.planet] >= QUOTA[G.planet]; }

try{
  const s=JSON.parse(localStorage.getItem('stellar_angler')||'{}');
  if(s.unlocked) G.unlocked=s.unlocked;
  if(s.caught) G.caught=s.caught;
  if(s.planetProgress) G.planetProgress=s.planetProgress;
  if(s.nushiDone) G.nushiDone=s.nushiDone;
}catch(e){}
function save(){ try{ localStorage.setItem('stellar_angler', JSON.stringify({
  unlocked:G.unlocked, caught:G.caught, planetProgress:G.planetProgress, nushiDone:G.nushiDone })); }catch(e){} }
function toast(t,d=2.2){ G.msg=t; G.msgT=d; }
function flash(a=0.6,c='255,255,255'){ G.flash=a; G.flashCol=c; }

// ---------------- パーティクル ----------------
const parts=[];
function spawnP(x,y,o){ parts.push({x,y,vx:o.vx||0,vy:o.vy||0,life:o.life||1,max:o.life||1,r:o.r||3,c:o.c||'#fff',g:o.g||0,glow:o.glow}); }
function burst(x,y,n,o={}){ for(let i=0;i<n;i++){ const a=U.rand(0,U.TAU),s=U.rand(o.smin||1,o.smax||4);
  spawnP(x,y,{vx:Math.cos(a)*s,vy:Math.sin(a)*s-(o.up||0),life:U.rand(o.lmin||0.4,o.lmax||0.9),
  r:U.rand(o.rmin||2,o.rmax||5),c:o.c||'#fff',g:o.g||0,glow:o.glow}); } }
function updateP(dt){ for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt;
  if(p.life<=0){parts.splice(i,1);continue;} p.x+=p.vx*60*dt; p.y+=p.vy*60*dt; p.vy+=p.g*60*dt; } }
function drawP(){ for(const p of parts){ const a=U.clamp(p.life/p.max,0,1);
  ctx.globalAlpha=a; if(p.glow){ctx.shadowColor=p.c;ctx.shadowBlur=8;}
  ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,U.TAU); ctx.fill(); ctx.shadowBlur=0; }
  ctx.globalAlpha=1; }

// ---------------- シーン状態 ----------------
const S = {
  aimX:540, power:0,
  floatX:540, floatBob:0, lure:null, waitT:0, nibble:0,
  swimmers:[], biteFish:null, biteWindow:0,
  // ファイト
  fish:null, fishHP:0, fishMax:0, tension:0, progress:0,
  charge:0, eleki:0, pinch:false,
  mode:'run', modeT:0, koTimer:0, hitFx:0, elekiFx:0,
  fishX:FAR_X, fishY:WL-120, jumpT:0, jumpDur:1, jumpFrom:WL, jumpTo:WL-160,
  caughtData:null, catchAnim:0, resultAnim:0, clearAnim:0, endAnim:0,
};

function resetSwimmers(){
  S.swimmers.length=0;
  if(isNushiTime()){
    // ヌシ出現：1体だけ
    const d=nushiForPlanet(G.planet);
    S.swimmers.push({d, x:U.rand(AX+260,W-80), y:U.rand(WL+50,H-60), vx:U.rand(-1,1)*1.0, phase:0, state:'wander'});
    return;
  }
  const pool=normalFishForPlanet(G.planet);
  for(let i=0;i<5;i++){ const d=U.pick(pool);
    S.swimmers.push({d, x:U.rand(AX+220,W-60), y:U.rand(WL+40,H-50), vx:U.rand(-1,1)*1.2, phase:U.rand(0,6.28), state:'wander'}); }
}

let IN=null;
function uiConfirm(){ return IN.p.circle || IN.p.start || (IN.touch.active && IN.touch.tap); }
function touchMode(){ return IN.touch.active; }

// ---------------- ループ ----------------
let last=performance.now();
function loop(now){ const dt=Math.min(0.05,(now-last)/1000); last=now; G.t+=dt; IN=Input.poll(dt);
  update(dt); render(); requestAnimationFrame(loop); }
function update(dt){
  if(G.shake>0) G.shake=Math.max(0,G.shake-dt*60);
  if(G.flash>0) G.flash=Math.max(0,G.flash-dt*3);
  if(G.fade>0 && G.state!=='LOADING') G.fade=Math.max(0,G.fade-dt*1.6);
  if(G.msgT>0){ G.msgT-=dt; if(G.msgT<=0) G.msg=null; }
  updateP(dt);
  // プレイ中の「タイトルへ戻る」ボタン
  if(FISHING.includes(G.state) && IN.touch.active && IN.touch.tap && inRect(IN.touch.tapX,IN.touch.tapY,backBtnRect())){
    Sound.SE.back(); save(); G.state='TITLE'; G.fade=1; titleSel=0; return;
  }
  switch(G.state){
    case 'TITLE': updateTitle(dt); break;
    case 'SELECT': updateSelect(dt); break;
    case 'CAST': updateCast(dt); break;
    case 'FLY': updateFly(dt); break;
    case 'WAIT': updateWait(dt); break;
    case 'HOOK': updateHook(dt); break;
    case 'ESCAPE': updateEscape(dt); break;
    case 'FIGHT': updateFight(dt); break;
    case 'CATCH': updateCatch(dt); break;
    case 'RESULT': updateResult(dt); break;
    case 'CLEAR': updateClear(dt); break;
    case 'ENDING': updateEnding(dt); break;
  }
}

// ---------------- TITLE ----------------
let titleSel=0, titleCD=0;
function hasSave(){ return G.unlocked>1 || (G.caught&&G.caught.length>0) || G.planetProgress.some(x=>x>0) || G.nushiDone.some(x=>x); }
function titleButtons(){ return [
  {key:'continue', label:'つづきから', y:316, enabled:hasSave()},
  {key:'new',      label:'はじめから', y:382, enabled:true},
]; }
function confirmTitle(){
  Sound.ensure(); Sound.startBGM(); Sound.SE.select();
  if(titleSel===1){ G.unlocked=1; G.caught=[]; G.planetProgress=[0,0,0,0,0]; G.nushiDone=[false,false,false,false,false]; save(); G.selCursor=0; }
  G.state='SELECT'; G.fade=1; G.selCursor=Math.min(G.unlocked-1,G.selCursor);
}
function updateTitle(dt){
  if(titleCD>0) titleCD-=dt;
  const btns=titleButtons();
  if(!btns[0].enabled) titleSel=1;
  const up=(IN.LY<-0.5||IN.RY<-0.5), dn=(IN.LY>0.5||IN.RY>0.5);
  if((up||dn)&&titleCD<=0){ titleSel=up?0:1; if(!btns[0].enabled) titleSel=1; titleCD=0.2; Sound.SE.move(); }
  if(IN.touch.active && IN.touch.tap){
    for(let i=0;i<btns.length;i++){ const b=btns[i];
      if(Math.abs(IN.touch.tapX-W/2)<140 && Math.abs(IN.touch.tapY-b.y)<26){
        if(b.enabled){ titleSel=i; confirmTitle(); } else { Sound.SE.back(); toast('セーブデータがありません'); }
        return; } }
    return;
  }
  if(IN.p.circle||IN.p.start) confirmTitle();
}

// ---------------- SELECT ----------------
let selCD=0;
function updateSelect(dt){
  if(selCD>0) selCD-=dt;
  if(IN.p.cross){ Sound.SE.back(); G.state='TITLE'; G.fade=1; return; }
  if(IN.LX>0.5||IN.p.r1) moveSel(1);
  if(IN.LX<-0.5||IN.p.l1) moveSel(-1);
  if(IN.touch.active && IN.touch.justUp){
    if(IN.touch.swipeX<-50) moveSel(1);
    else if(IN.touch.swipeX>50) moveSel(-1);
    else if(IN.touch.tap){ if(IN.touch.tapX<W*0.22) moveSel(-1); else if(IN.touch.tapX>W*0.78) moveSel(1); else enterPlanet(); }
  }
  if(IN.p.circle||IN.p.start) enterPlanet();
}
function moveSel(d){ if(selCD>0) return; selCD=0.16; G.selCursor=U.clamp(G.selCursor+d,0,PLANETS.length-1); Sound.SE.move(); }
function enterPlanet(){
  if(G.selCursor>=G.unlocked){ Sound.SE.back(); toast('この惑星はまだロックされている…'); return; }
  Sound.SE.select(); G.planet=G.selCursor; resetSwimmers();
  resetCast(); G.state='CAST'; G.fade=1;
  if(isNushiTime()) toast('✦ この星のヌシ「'+nushiForPlanet(G.planet).name+'」が潜んでいる…！',3.4);
  else toast(PLANETS[G.planet].name+'に到着！ '+(touchMode()?'長押しでパワーをためて離すと投げる':'○長押しでパワー、離して投げる'),3.0);
}
function resetCast(){ S.power=0.08; S.powerDir=1; S.charging=false; S.aimX=AX+200; }

// ---------------- CAST（ゲージが左右に振れ、離した所で止まる。MAX付近でレア/大型/ヌシ）----------------
function castPreviewX(){ return U.lerp(AX+200, W-70, S.power); }
function updateCast(dt){
  if(IN.p.cross){ Sound.SE.back(); G.state='SELECT'; G.fade=1; return; }
  const holding = IN.touch.active ? IN.touch.down : IN.circle;
  if(holding){
    // ゲージは常に上下（左右）に振れる。押しっぱでMAXにはならない＝離すタイミングがコツ（速め）
    S.power += S.powerDir*dt*1.75;
    if(S.power>=1){ S.power=1; S.powerDir=-1; }
    if(S.power<=0.08){ S.power=0.08; S.powerDir=1; }
    S.charging=true;
  }else if(S.charging){
    doCast();
  }
}
function doCast(){
  Sound.SE.cast();
  S.charging=false;
  S.castPower=S.power;
  // MAX付近=パーフェクト（狭い）。パーフェクトは必ず何か釣れる
  S.goodCast = S.power>=0.95 ? 2 : (S.power>=0.8 ? 1 : 0);
  S.guaranteeBite = (S.goodCast===2);
  S.floatX=castPreviewX();
  const hand=handPos();
  S.lure={x:hand.x,y:hand.y, t:0, dur:0.5, fromX:hand.x, fromY:hand.y, toX:S.floatX, toY:WL};
  if(S.goodCast){ Sound.SE.select(); flash(0.3,'255,240,180');
    toast(S.goodCast===2?'✦ パーフェクトキャスト！ 必ず食いつく…！':'ナイスキャスト！',2.0); }
  G.state='FLY';
}
// キャスト品質で釣れる魚を決める（MAX付近＝レア/大型）。ヌシは規定数を釣るまで出ない
function pickCastFish(species){
  const q=S.castPower||0, planet=G.planet;
  if(isNushiTime()) return species;                       // 既にヌシ狙い
  const pool=normalFishForPlanet(planet).slice().sort((a,b)=>a.tier-b.tier);
  if(q>=0.95) return pool[pool.length-1];                 // パーフェクト＝最高レア
  if(q>=0.8 && Math.random()<0.7) return pool[pool.length-1];
  return species;
}
function updateFly(dt){
  const L=S.lure; L.t+=dt;
  const k=U.clamp(L.t/L.dur,0,1);
  L.x=U.lerp(L.fromX,L.toX,k);
  L.y=U.lerp(L.fromY,L.toY,k) - Math.sin(k*Math.PI)*150;   // 放物線
  if(k>=1){ Sound.SE.splash(); burst(S.floatX,WL,16,{c:'#bff',smax:4,up:2,lmax:0.6,rmax:4,g:0.06});
    G.state='WAIT'; S.waitT=0; S.nibble=0; S.biteFish=null; S.floatBob=0;
    // 魚が居なくならないよう補充（バラした魚で枯渇するバグ対策）
    if(isNushiTime()){ if(S.swimmers.length===0) resetSwimmers(); }
    else if(S.swimmers.length<2) resetSwimmers();
    if(S.guaranteeBite){
      // パーフェクトキャスト：必ず1匹が食いつくようにロックして寄せる
      if(S.swimmers.length===0) resetSwimmers();
      let near=S.swimmers[0], bd=1e9;
      for(const s of S.swimmers){ const d=Math.abs(s.x-S.floatX); if(d<bd){bd=d;near=s;} }
      if(near){ near.state='approach'; near.locked=true; near.x=S.floatX+U.rand(-120,120); near.y=WL+U.rand(40,90); }
    }
  }
}

// ---------------- WAIT（つんつん→アタリ）----------------
function updateWait(dt){
  // 竿を入れ直してウキの位置を変える（投げ直し）
  if(IN.p.cross || (IN.touch.active && IN.touch.tap)){ Sound.SE.cast(); G.state='CAST'; resetCast(); toast('竿を上げた。もう一度ねらおう',1.4); return; }
  S.waitT+=dt; S.floatBob+=dt;
  updateSwimmers(dt,true);
  let best=null,bd=999;
  for(const s of S.swimmers){ if(s.state==='approach'){ const d=Math.abs(s.x-S.floatX)+Math.abs((s.y)-(WL+30)); if(d<bd){bd=d;best=s;} } }
  if(best && Math.abs(best.x-S.floatX)<46){
    S.nibble+=dt;
    if(S.nibble>U.rand(0.5,1.0)) triggerBite(best);
  }else S.nibble=Math.max(0,S.nibble-dt*0.6);
}
// あつ森風：前アタリ(ピクッ)を数回→本アタリ(ガクッ)。本アタリだけ合わせる。魚で難度差
function makeBiteSeq(d){
  const fakes={darty:1,steady:1,jumper:2,aggro:2,heavy:2,wild:3}[d.temper] ?? 1;
  const realWin={darty:0.42,steady:0.6,jumper:0.5,aggro:0.46,heavy:0.72,wild:0.38}[d.temper] ?? 0.55;
  const seq=[{k:'gap',t:U.rand(0.3,0.6)}];
  for(let i=0;i<fakes;i++){ seq.push({k:'fake',t:U.rand(0.18,0.32)}); seq.push({k:'gap',t:U.rand(0.45,0.9)}); }
  seq.push({k:'real',t:realWin});
  seq.push({k:'end',t:0.5});
  return seq;
}
function hookPhase(){ return (S.biteSeq&&S.biteSeq[S.seqI])?S.biteSeq[S.seqI].k:'gap'; }
function phaseSound(){ const k=hookPhase(); if(k==='fake') Sound.SE.reel(); else if(k==='real'){ Sound.SE.bite(); G.shake=6; } }
function triggerBite(s){
  s.d=pickCastFish(s.d); S.guaranteeBite=false; S.biteFish=s;
  S.biteSeq=makeBiteSeq(s.d); S.seqI=0; S.seqT=0; G.state='HOOK'; phaseSound();
}
function biteMiss(msg){ if(S.biteFish){ S.biteFish.state='wander'; S.biteFish.locked=false; }
  startEscape(S.biteFish.d, S.floatX, WL-6, msg); }
function updateSwimmers(dt,lure){
  for(const s of S.swimmers){ s.phase+=dt;
    if(lure && s.state!=='approach' && Math.abs(s.x-S.floatX)<260 && Math.random()<0.015*s.d.speed) s.state='approach';
    if(s.state==='approach'){
      const tx=S.floatX, ty=WL+34, dx=tx-s.x, dy=ty-s.y, m=Math.hypot(dx,dy)||1;
      s.x+=dx/m*dt*90*s.d.speed; s.y+=dy/m*dt*90*s.d.speed;
      if(!s.locked && Math.random()<0.004) s.state='wander';   // ロック中(パーフェクト)は逃げない
    }else{
      s.x+=s.vx*40*dt; s.y+=Math.sin(s.phase)*12*dt;
    }
    if(s.x>W-40){s.x=W-40;s.vx=-Math.abs(s.vx);} if(s.x<AX+160){s.x=AX+160;s.vx=Math.abs(s.vx);}
    if(s.y<WL+30){s.y=WL+30;} if(s.y>H-40){s.y=H-40;}
  }
}

// ---------------- HOOK（前アタリ→本アタリ。本アタリで合わせる）----------------
function updateHook(dt){
  const k=hookPhase();
  if(uiConfirm()){                       // 合わせた
    if(k==='real') startFight(S.biteFish);
    else biteMiss('はやい！');           // 前アタリ/空合わせ＝バラシ
    return;
  }
  S.seqT+=dt;
  if(S.seqT>=S.biteSeq[S.seqI].t){
    S.seqI++; S.seqT=0;
    if(!S.biteSeq[S.seqI] || S.biteSeq[S.seqI].k==='end'){ biteMiss('のがした…'); return; }
    phaseSound();
  }
}

// ---------------- ESCAPE（バレた／逃走モーション）----------------
function startEscape(d,x,y,msg){
  S.esc={ d, x, y, vx:U.rand(9,13)*(x>W*0.6?-1:1), vy:-7.5, t:0, dur:1.1, trail:[], msg, dir:(x>W*0.6?1:-1) };
  G.state='ESCAPE'; Sound.SE.miss(); G.shake=5;
  burst(x,WL,12,{c:'#bff',smax:4,up:2,lmax:0.5,rmax:4,g:0.06});
}
function updateEscape(dt){
  const e=S.esc; e.t+=dt;
  e.trail.push({x:e.x,y:e.y}); if(e.trail.length>7) e.trail.shift();
  e.x+=e.vx*60*dt; e.y+=e.vy*60*dt; e.vy+=20*dt;
  if(e.y>=WL && e.vy>0 && e.t<0.5){ Sound.SE.splash(); burst(e.x,WL,8,{c:'#bff',smax:3,up:1,lmax:0.4,rmax:3,g:0.06}); e.y=WL; e.vy*=-0.4; }
  if(e.t>=e.dur){ G.state='CAST'; resetCast(); }
}
function drawEscape(){
  const e=S.esc;
  // 残像（スピード感）
  for(let i=0;i<e.trail.length;i++){ const tr=e.trail[i]; ctx.globalAlpha=(i/e.trail.length)*0.35;
    drawSpaceFish(ctx,tr.x,tr.y,1.4*e.d.size,e.dir,G.t,e.d,{glow:false}); }
  ctx.globalAlpha=1;
  drawSpaceFish(ctx,e.x,e.y,1.5*e.d.size,e.dir,G.t*2,e.d,{glow:true});
  // バレた！
  const a=U.clamp(1-e.t/e.dur*0.6,0,1); ctx.globalAlpha=a;
  ctx.fillStyle='#ff6b6b'; ctx.font='bold 40px sans-serif'; ctx.textAlign='center'; ctx.shadowColor='#000'; ctx.shadowBlur=8;
  ctx.fillText(e.msg, W/2, 150); ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.textAlign='left';
}

// ---------------- FIGHT ----------------
// 性格(temper)→暴れ方パラメータ: rr=run頻度 rd=run長さ jh=跳躍高 da=横ダート w=重さ
function beh(d){
  const M={
    darty :{rr:1.35,rd:0.65,jh:0.85,da:1.6,w:0.7},
    steady:{rr:1.0, rd:1.0, jh:1.0, da:0.8,w:1.0},
    aggro :{rr:1.3, rd:1.2, jh:1.15,da:1.1,w:1.1},
    jumper:{rr:1.1, rd:0.85,jh:1.7, da:0.9,w:0.9},
    heavy :{rr:0.75,rd:1.45,jh:1.25,da:0.5,w:1.55},
    wild  :{rr:1.25,rd:1.3, jh:1.7, da:1.5,w:1.5},
  };
  return M[d.temper]||M.steady;
}
function startFight(s){
  const d=s.d; S.fish=d; S.fishMax=d.hp; S.fishHP=d.hp; S.beh=beh(d);
  S.tension=18; S.progress=0; S.charge=0; S.eleki=0; S.pinch=false;
  S.mode='run'; S.modeT=U.rand(1.0,1.8)*S.beh.rd; S.koTimer=0; S.hitFx=0; S.elekiFx=0;
  S.fishX=FAR_X; S.fishY=WL-30; setJump(true);
  const i=S.swimmers.indexOf(s); if(i>=0)S.swimmers.splice(i,1);
  G.state='FIGHT'; Sound.SE.bite(); flash(0.4);
  burst(FAR_X,WL,20,{c:'#bff',smax:5,up:3,lmax:0.7,rmax:5,g:0.05});
  toast('ヒット！ '+d.name+'！ '+(touchMode()?'なぞって巻け！ おとなしい時がチャンス':'方向キーで巻け！'),2.6);
}
function setJump(big){
  const B=S.beh||{jh:1};
  S.jumpT=0; S.jumpDur=big?U.rand(0.7,1.1):U.rand(0.5,0.8);
  S.jumpFrom=S.fishY; S.jumpTo=big? WL-U.rand(150,240)*B.jh : WL-U.rand(20,70);
}
function doAttack(){
  if(S.charge<100||S.fishHP<=0) return false;
  const dmg=S.fishMax*0.16+28; S.fishHP-=dmg; S.charge=0;
  const escaped=S.tension>=PINCH; S.tension=escaped?38:Math.max(0,S.tension-24);
  S.eleki=U.clamp(S.eleki+56,0,100);   // こうげき成功でエレキが大きくたまる
  S.mode='tire'; S.modeT=Math.max(S.modeT,1.0); S.hitFx=0.4; G.shake=8; Sound.SE.attack();
  burst(S.fishX,S.fishY,16,{c:'#ffd34d',smax:6,lmax:0.8,rmax:6,glow:true}); toast(escaped?'こうげきでピンチ脱出！':'こうげき！');
  return true;
}
function doEleki(){
  if(S.eleki<100||S.fishHP<=0) return false;
  const dmg=S.fishMax*0.36+55; S.fishHP-=dmg; S.eleki=0; S.tension=16;
  S.mode='tire'; S.modeT=1.6; S.elekiFx=0.7; G.shake=18; flash(0.7,'180,230,255'); Sound.SE.eleki();
  burst(S.fishX,S.fishY,26,{c:'#9cf',smax:7,lmax:0.9,rmax:7,glow:true}); toast('⚡エレキアタック！⚡',2.0);
  return true;
}
function updateFight(dt){
  const koed=S.fishHP<=0;
  const B=S.beh||beh(S.fish);
  // 暴れサイクル（性格で頻度・長さが変化）
  S.modeT-=dt;
  if(!koed && S.modeT<=0){
    if(S.mode==='run'){ S.mode='tire'; S.modeT=U.rand(1.8,2.9)*(1+(1-S.fishHP/S.fishMax))/B.rr; setJump(false); }
    else{ S.mode='run'; S.modeT=U.rand(0.8,1.5)*B.rd*(S.fishHP/S.fishMax+0.4); setJump(true); Sound.SE.warn(); }
  }
  // 入力 → reel / strike
  let reelAmt=0, strike=false;
  if(IN.touch.active){ if(IN.touch.down) reelAmt=U.clamp(0.7+IN.touch.speed*0.26,0,2.8); if(IN.touch.tap) strike=true; }
  else{ const keyReel=(IN.RY<-0.3||IN.RX!==0||IN.circle&&false)?1:0; const spin=Input.reelSpin(IN.RX,IN.RY);
    reelAmt=(spin>0.6)?Math.min(2.2,spin):(keyReel?1.5:0);
    if(IN.p.square&&doAttack()){} if(IN.p.triangle&&doEleki()){} if(IN.p.circle){ if(!doEleki())doAttack(); } }
  const reeling=reelAmt>0.05;

  if(!koed){
    let ten;
    if(S.mode==='run'){
      // 暴れ中：常にじわじわ上がる。巻くと急上昇＆逆に出される（手を止めて耐える）
      ten = 3.4*(0.7+S.fish.power*0.25)*(0.9+0.2*B.w);
      if(reeling){ ten += reelAmt*14; S.progress=Math.max(0,S.progress-reelAmt*dt*3); if(Math.random()<0.2)Sound.SE.warn(); }
    }else{
      // おとなしい時：テンションは上がらない（暴れてる時だけ上がる）。巻けば寄る／止めれば回復
      if(reeling){ ten = -2; S.progress+=reelAmt*dt*16/B.w; S.eleki+=reelAmt*dt*14; S.charge+=dt*30; if(Math.random()<0.3)Sound.SE.reel(); }
      else ten = -8;     // 手を止めると回復（赤からの立て直しが可能）
    }
    // ピンチ中はテンション上昇がゆるやかになり、立て直す猶予ができる
    if(S.tension>=PINCH && ten>0) ten*=0.4;
    S.tension += dt*ten;
  }else{
    S.tension=U.lerp(S.tension,8,dt*2); S.progress += reelAmt*dt*30;  // KO後も巻かないと寄らない
  }
  S.tension=U.clamp(S.tension,0,100);

  const wasPinch=S.pinch; S.pinch=S.tension>=PINCH&&!koed;
  // ピンチ中は「救済エレキ」が自動でぐんぐんたまる → こうげき/エレキ成功でピンチ脱出
  if(S.pinch){ S.eleki+=dt*42; S.charge+=dt*30; }
  if(S.pinch&&!wasPinch){ Sound.SE.warn(); toast('ピンチ！ エレキをためて反撃で脱出！',1.8); }

  S.charge=U.clamp(S.charge,0,100); S.progress=U.clamp(S.progress,0,100); S.eleki=U.clamp(S.eleki,0,100);

  if(S.tension>=100){ Sound.SE.snap(); G.shake=14; flash(0.5,'255,80,80');
    startEscape(S.fish, S.fishX, S.fishY, 'ラインが切れた！'); return; }

  if(strike){ if(!doEleki()) doAttack(); }
  if(S.hitFx>0)S.hitFx-=dt; if(S.elekiFx>0)S.elekiFx-=dt;

  if(S.fishHP<=0 && S.koTimer===0){ S.fishHP=0; S.koTimer=0.001; Sound.SE.ko(); flash(0.5); toast('ダウン！ 巻き上げろ！',1.8); }
  if(S.koTimer>0) S.koTimer+=dt;

  // 位置：progressで左（キャラ側）へ寄る。ジャンプで上下。暴れ中は性格に応じて左右にダート。
  const wig=(!koed&&S.mode==='run')?Math.sin(G.t*(6+B.rr*3))*22*B.da:0;
  S.fishX=U.lerp(FAR_X,NEAR_X,S.progress/100)+wig;
  S.jumpT+=dt; const jk=U.clamp(S.jumpT/S.jumpDur,0,1);
  const arc=Math.sin(jk*Math.PI);
  const prevY=S.fishY;
  if(koed){ S.fishY=U.lerp(S.fishY, WL-18, dt*3); }
  else{ S.fishY=U.lerp(S.jumpFrom,S.jumpTo,jk) - (S.mode==='run'?arc*40:arc*10); if(jk>=1) setJump(S.mode==='run'); }
  if((prevY<WL)!==(S.fishY<WL)){ Sound.SE.splash(); burst(S.fishX,WL,12,{c:'#bff',smax:4,up:S.fishY<WL?2:1,lmax:0.5,rmax:4,g:0.06}); }
  if(!koed && S.mode==='run' && Math.random()<0.3) burst(S.fishX+U.rand(-20,20),S.fishY+U.rand(-10,10),2,{c:'rgba(255,255,255,.7)',smax:2,lmax:0.4,rmax:3,g:0.05});

  if(S.progress>=100) landFish();
}
function landFish(){
  const d=S.fish; const sizeBonus=1+((S.castPower||0)>=0.75?0.25*S.castPower:0); // 良いキャストほど大型
  const cm=Math.round((30+d.size*60)*U.rand(0.7,1.5)*sizeBonus);
  S.caughtData={id:d.id,name:d.name,cm,tier:d.tier,boss:!!d.boss,t:Date.now()};
  G.caught.push(S.caughtData);
  if(!d.boss) G.planetProgress[G.planet]++;   // ヌシ出現は通常魚の釣果数で進む
  save();
  Sound.SE.fanfare(); flash(0.6);
  burst(NEAR_X,WL-60,30,{c:'#ffd34d',smax:7,up:3,lmax:1.1,rmax:6,glow:true,g:0.04});
  G.state='CATCH'; S.catchAnim=0;
}

// ---------------- CATCH/RESULT/CLEAR/ENDING ----------------
function updateCatch(dt){ S.catchAnim+=dt; if(S.catchAnim>0.8&&uiConfirm()){ G.state='RESULT'; S.resultAnim=0; } }
function updateResult(dt){ S.resultAnim+=dt;
  if(S.resultAnim>0.5&&uiConfirm()){
    if(S.caughtData.boss){
      G.nushiDone[G.planet]=true; save();
      if(S.caughtData.id==='NUSHI'){ G.state='ENDING'; S.endAnim=0; Sound.SE.fanfare(); return; }
      if(G.unlocked<G.planet+2){ G.unlocked=Math.min(PLANETS.length,G.planet+2); save(); }
      G.state='CLEAR'; S.clearAnim=0; Sound.SE.fanfare();
    }else{
      // 通常魚：続けて釣る（規定数に達していれば次の投擲でヌシ出現）
      G.state='CAST'; resetCast(); resetSwimmers();
      if(isNushiTime()) toast('✦ ヌシ「'+nushiForPlanet(G.planet).name+'」が現れた…！',3.2);
    }
  }
}
function updateClear(dt){ S.clearAnim+=dt; if(S.clearAnim>1&&uiConfirm()){ Sound.SE.select(); G.state='SELECT'; G.fade=1; G.selCursor=Math.min(G.unlocked-1,G.planet+1); } }
function updateEnding(dt){ S.endAnim+=dt; if(S.endAnim>3&&uiConfirm()){ Sound.SE.select(); G.state='SELECT'; G.fade=1; } }

// ===================================================================
//  描画
// ===================================================================
const FISHING=['CAST','FLY','WAIT','HOOK','FIGHT','ESCAPE'];
function inRect(px,py,r){ return px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h; }
function backBtnRect(){ return {x:10,y:46,w:104,h:32}; }
function drawBackButton(){
  const r=backBtnRect(); roundRect(ctx,r.x,r.y,r.w,r.h,8); ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1.5; roundRect(ctx,r.x,r.y,r.w,r.h,8); ctx.stroke();
  ctx.fillStyle='#cfe'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.fillText('≡ タイトル',r.x+r.w/2,r.y+21); ctx.textAlign='left';
}
function handPos(){ return {x:AX+38, y:WL-86}; }
function rodTip(){ const bend=(G.state==='FIGHT')?S.tension/100*18:0; return {x:AX+150, y:WL-176+bend}; }

function render(){
  ctx.save();
  if(G.shake>0) ctx.translate(U.rand(-G.shake,G.shake),U.rand(-G.shake,G.shake));
  const planet=PLANETS[(G.state==='SELECT')?G.selCursor:G.planet];
  if(G.state==='LOADING'){ ctx.restore(); return; }
  if(G.state==='TITLE'){ renderTitle(); drawP(); ctx.restore(); overlay(); return; }
  if(G.state==='SELECT'){ renderSelect(); drawP(); ctx.restore(); overlay(); return; }

  // 共通：宇宙背景＋水＋アングラー
  drawSkyAndSpace(ctx,W,H,planet,G.t);
  drawWater(planet);
  // ライン＆対象
  const tip=rodTip();
  let target=null;
  if(G.state==='FLY') target={x:S.lure.x,y:S.lure.y};
  else if(G.state==='WAIT'||G.state==='HOOK') target={x:S.floatX,y:WL-2+Math.sin(S.floatBob*4)*3};
  else if(G.state==='FIGHT') target={x:S.fishX,y:S.fishY};
  if(target){ const danger=G.state==='FIGHT'&&S.tension>0.8*100;
    ctx.strokeStyle=danger?'rgba(255,70,70,.95)':'rgba(255,255,255,.8)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(tip.x,tip.y);
    const sag=G.state==='FIGHT'? (1-S.tension/100)*40 : 24;
    ctx.quadraticCurveTo((tip.x+target.x)/2,(tip.y+target.y)/2+sag,target.x,target.y); ctx.stroke();
  }
  drawAngler(planet);
  // 状態別オブジェクト
  if(G.state==='CAST') drawAim(planet);
  if(G.state==='FLY') drawLure();
  if(G.state==='WAIT'||G.state==='HOOK'){ drawUnderwaterFish(); drawFloat(); }
  if(G.state==='FIGHT') drawFightFish();
  if(G.state==='ESCAPE') drawEscape();
  drawP();

  // HUD
  drawTop(planet);
  if(FISHING.includes(G.state)) drawBackButton();
  if(G.state==='CAST') hint('長押しでパワーをためて、離して投げる','○長押しでパワー→離して投げる');
  if(G.state==='WAIT') waitHint();
  if(G.state==='HOOK') hookHint();
  if(G.state==='FIGHT') fightHUD();
  if(G.state==='CATCH') catchHUD();
  if(G.state==='RESULT') resultScreen();
  if(G.state==='CLEAR') clearScreen();
  if(G.state==='ENDING') endingScreen();
  drawToast();
  ctx.restore();
  overlay();
}
function overlay(){ if(G.flash>0){ ctx.fillStyle=`rgba(${G.flashCol},${G.flash})`; ctx.fillRect(0,0,W,H);} if(G.fade>0){ ctx.fillStyle=`rgba(0,0,0,${G.fade})`; ctx.fillRect(0,0,W,H);} }

// ---- 水 ----
function drawWater(planet){
  const g=ctx.createLinearGradient(0,WL,0,H);
  g.addColorStop(0,planet.sea[0]); g.addColorStop(1,'#02030c');
  ctx.fillStyle=g; ctx.fillRect(0,WL,W,H-WL);
  // 水面の帯（明るく）
  ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(0,WL,W,4);
  // 波
  ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=2; ctx.beginPath();
  for(let x=0;x<=W;x+=16){ const y=WL+Math.sin(G.t*2+x*0.03)*3; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y); } ctx.stroke();
  // 水中の光条
  ctx.fillStyle=planet.accent; ctx.globalAlpha=0.06;
  for(let i=0;i<5;i++){ const x=((i*220+G.t*20)%(W+200))-100; ctx.beginPath();
    ctx.moveTo(x,WL); ctx.lineTo(x+60,H); ctx.lineTo(x+10,H); ctx.lineTo(x-30,WL); ctx.fill(); }
  ctx.globalAlpha=1;
  // きらめき
  ctx.fillStyle='rgba(255,255,255,.5)';
  for(let i=0;i<18;i++){ const x=(Math.sin(i*9.3+G.t)*0.5+0.5)*W; const a=Math.max(0,Math.sin(G.t*3+i));
    ctx.globalAlpha=a*0.5; ctx.fillRect(x,WL-1,3,2); } ctx.globalAlpha=1;
}

// ---- アングラー（手続き生成のスペース漁師）----
function drawAngler(planet){
  const x=AX, y=WL;
  // 足場（小惑星）
  ctx.fillStyle='#3a3550'; ctx.beginPath(); ctx.ellipse(x,y+34,70,26,0,0,U.TAU); ctx.fill();
  ctx.fillStyle='#4b4668'; ctx.beginPath(); ctx.ellipse(x,y+28,64,20,0,0,U.TAU); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.08)'; ctx.beginPath(); ctx.ellipse(x-16,y+24,22,8,0,0,U.TAU); ctx.fill();

  const bob=Math.sin(G.t*2)*2;
  ctx.save(); ctx.translate(x,y-30+bob);
  // 体
  const bg=ctx.createLinearGradient(0,-26,0,30); bg.addColorStop(0,'#eef2f8'); bg.addColorStop(1,'#aeb8c6');
  ctx.fillStyle=bg; roundRect(ctx,-24,-14,48,52,16); ctx.fill();
  ctx.fillStyle=planet.accent; ctx.globalAlpha=0.85; roundRect(ctx,-10,4,20,9,4); ctx.fill(); ctx.globalAlpha=1;
  // ヘルメット
  const hg=ctx.createRadialGradient(-8,-40,4,0,-34,28); hg.addColorStop(0,'#fff'); hg.addColorStop(1,'#c3ccd8');
  ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-34,24,0,U.TAU); ctx.fill();
  const vg=ctx.createLinearGradient(0,-50,0,-20); vg.addColorStop(0,planet.accent); vg.addColorStop(1,'#0a1730');
  ctx.fillStyle=vg; ctx.beginPath(); ctx.ellipse(2,-34,15,13,0,0,U.TAU); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-4,-40,5,3,-0.5,0,U.TAU); ctx.fill();
  // 腕（竿を持つ）
  ctx.strokeStyle='#cfd7e2'; ctx.lineWidth=10; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(10,2); ctx.lineTo(28,-12); ctx.stroke();
  ctx.restore();

  // 竿
  const hand=handPos(), tip=rodTip();
  ctx.strokeStyle='#e7d6ad'; ctx.lineWidth=6; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(hand.x-4,hand.y+6); ctx.lineTo(tip.x,tip.y); ctx.stroke();
  ctx.strokeStyle='#7a6a45'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(hand.x-4,hand.y+6); ctx.lineTo(tip.x,tip.y); ctx.stroke();
  // リール
  ctx.fillStyle='#444'; ctx.beginPath(); ctx.arc(hand.x+4,hand.y+10,6,0,U.TAU); ctx.fill();
}

// ---- CAST 照準 ----
function drawAim(planet){
  const px=castPreviewX();
  // 着水予測リング（パワーで距離が決まる）
  ctx.strokeStyle=planet.accent; ctx.lineWidth=3;
  ctx.beginPath(); ctx.ellipse(px,WL, 26,10,0,0,U.TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(px,WL, 12,5,0,0,U.TAU); ctx.stroke();
  // 予測アーチ
  const hand=handPos();
  ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.setLineDash([7,7]); ctx.lineWidth=2; ctx.beginPath();
  for(let i=0;i<=20;i++){ const k=i/20; const x=U.lerp(hand.x,px,k); const y=U.lerp(hand.y,WL,k)-Math.sin(k*Math.PI)*150;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); } ctx.stroke(); ctx.setLineDash([]);
  // パワーメーター（左右に振れる。MAX付近のゴールド帯で離すとレア/大型/ヌシ）
  const bx=AX-30, by=WL+34, bw=200, bh=18;
  ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='left'; ctx.fillText('パワー：ゲージを見て離す！ 右端=大物のチャンス',bx,by-6);
  roundRect(ctx,bx,by,bw,bh,9); ctx.fillStyle='rgba(255,255,255,.16)'; ctx.fill();
  // MAXスイートゾーン（狭い＝難しい）
  roundRect(ctx,bx+bw*0.8,by,bw*0.15,bh,3); ctx.fillStyle='rgba(255,233,138,.4)'; ctx.fill();
  roundRect(ctx,bx+bw*0.95,by,bw*0.05,bh,3); ctx.fillStyle='rgba(255,211,77,.75)'; ctx.fill();
  // 現在値
  roundRect(ctx,bx,by,bw*S.power,bh,9); ctx.fillStyle=S.power>=0.95?'#ffd34d':(S.power>=0.8?'#ffe98a':'#7fd'); ctx.fill();
  // つまみ
  ctx.fillStyle='#fff'; ctx.fillRect(bx+bw*S.power-2,by-3,4,bh+6);
  ctx.textAlign='left';
}
function drawLure(){ ctx.fillStyle='#ff5252'; ctx.beginPath(); ctx.arc(S.lure.x,S.lure.y,6,0,U.TAU); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(S.lure.x,S.lure.y-2,6,Math.PI,0); ctx.fill(); }

// ---- 水中の魚シルエット ----
function drawUnderwaterFish(){
  for(const s of S.swimmers){ const dir=s.vx>=0?1:-1;
    ctx.globalAlpha=0.55; drawSpaceFish(ctx,s.x,s.y,0.9*s.d.size,dir,G.t+s.phase,s.d,{glow:s.state==='approach'}); ctx.globalAlpha=1; }
}
// ---- ウキ ----
function drawFloat(){
  const x=S.floatX; let dip=Math.sin(S.floatBob*4)*2; let label=null;
  if(G.state==='WAIT'){ if(S.nibble>0.05){ dip=Math.sin(G.t*22)*3*Math.min(1,S.nibble); } }
  else if(G.state==='HOOK'){
    const k=hookPhase();
    if(k==='fake'){ dip=7+Math.sin(G.t*34)*3; label='ピクッ'; }
    else if(k==='real'){ dip=30; label='！！'; }
    else dip=Math.sin(G.t*4)*2;
  }
  const y=WL+dip;
  // 波紋
  ctx.strokeStyle='rgba(255,255,255,.4)'; const rr=(S.floatBob*40)%34; ctx.globalAlpha=1-rr/34; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(x,WL, rr+6, (rr+6)*0.32,0,0,U.TAU); ctx.stroke(); ctx.globalAlpha=1;
  // 本体（赤白ウキ）：本アタリは深く沈む
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y-6,8,Math.PI,0); ctx.fill();
  ctx.fillStyle='#ff4040'; ctx.beginPath(); ctx.arc(x,y-6,8,0,Math.PI); ctx.fill();
  ctx.fillStyle='#ffcf2e'; ctx.beginPath(); ctx.arc(x,y-15,3,0,U.TAU); ctx.fill();
  // ラベル
  if(label==='ピクッ'){ ctx.fillStyle='#ffe98a'; ctx.font='bold 20px sans-serif'; ctx.textAlign='center'; ctx.fillText('ピクッ',x,WL-36); ctx.textAlign='left'; }
  else if(label==='！！'){ const s=1+Math.sin(G.t*24)*0.18; ctx.save(); ctx.translate(x,WL-46); ctx.scale(s,s);
    ctx.fillStyle='#ffea00'; ctx.font='bold 44px sans-serif'; ctx.textAlign='center'; ctx.shadowColor='#fa0'; ctx.shadowBlur=18;
    ctx.fillText('！',0,0); ctx.restore(); ctx.shadowBlur=0; ctx.textAlign='left'; }
}

// ---- ファイトの魚（空中で暴れる）----
function drawFightFish(){
  const koed=S.fishHP<=0, x=S.fishX, y=S.fishY, dir=-1;
  const wild=(!koed&&S.mode==='run')?1:0.3;
  const tilt=Math.sin(G.t*7)*0.18*wild + (koed?0.9:0);
  const sc=2.2*S.fish.size;
  // エレキ満タンの合図
  if(S.eleki>=100&&!koed){ ctx.strokeStyle=`rgba(150,210,255,${0.5+0.4*Math.sin(G.t*20)})`; ctx.lineWidth=2; ctx.shadowColor='#9cf'; ctx.shadowBlur=10;
    for(let i=0;i<4;i++){ const a=G.t*3+i*1.6; ctx.beginPath(); let lx=x+Math.cos(a)*60,ly=y+Math.sin(a)*42;
      for(let j=0;j<4;j++){ lx+=U.rand(-12,12); ly+=U.rand(-12,12); j===0?ctx.moveTo(lx,ly):ctx.lineTo(lx,ly);} ctx.stroke(); } ctx.shadowBlur=0; }
  if(S.elekiFx>0){ ctx.strokeStyle=`rgba(180,230,255,${S.elekiFx})`; ctx.lineWidth=3; ctx.shadowColor='#9cf'; ctx.shadowBlur=12;
    for(let i=0;i<6;i++){ ctx.beginPath(); let lx=x,ly=y-70; ctx.moveTo(lx,ly); for(let j=0;j<6;j++){lx+=U.rand(-22,22);ly+=16;ctx.lineTo(lx,ly);} ctx.stroke(); } ctx.shadowBlur=0; }
  ctx.save(); ctx.translate(x,y); if(S.hitFx>0) ctx.translate(U.rand(-6,6),U.rand(-6,6)); ctx.rotate(tilt);
  drawSpaceFish(ctx,0,0,sc,dir,G.t*1.5,S.fish,{glow:true});
  const fl=Math.max(S.hitFx,S.elekiFx);
  if(fl>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=fl;
    drawSpaceFish(ctx,0,0,sc,dir,G.t*1.5,{...S.fish,c1:'#fff',c2:'#fff',fin:'#fff'},{glow:false});
    ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
  ctx.restore();
  if(koed){ ctx.fillStyle='#fff'; ctx.font='bold 20px sans-serif'; ctx.textAlign='center'; ctx.fillText('× ×',x,y-sc*22); ctx.textAlign='left'; }
}

// ===================================================================
//  HUD
// ===================================================================
function drawTop(planet){
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillRect(0,0,W,40);
  ctx.fillStyle=planet.accent; ctx.font='bold 18px sans-serif'; ctx.textAlign='left'; ctx.fillText('🪐 '+planet.name,14,26);
  ctx.fillStyle='#fff'; ctx.textAlign='right'; ctx.font='bold 15px sans-serif';
  let lab;
  if(G.nushiDone[G.planet]) lab='★ ヌシ討伐ずみ';
  else if(isNushiTime()) lab='✦ ヌシ出現中 ✦';
  else lab=`ヌシまで あと ${Math.max(0,QUOTA[G.planet]-G.planetProgress[G.planet])}匹`;
  ctx.fillText(lab,W-14,25); ctx.textAlign='left';
}
function bar(x,y,w,h,v,col,label){ roundRect(ctx,x,y,w,h,h/2); ctx.fillStyle='rgba(255,255,255,.16)'; ctx.fill();
  roundRect(ctx,x,y,w*U.clamp(v,0,1),h,h/2); ctx.fillStyle=col; ctx.fill();
  if(label){ ctx.fillStyle='#fff'; ctx.font='bold 12px sans-serif'; ctx.textAlign='left'; ctx.fillText(label,x,y-5); } }
function bigPrompt(text,col){ const s=1+Math.sin(G.t*10)*0.06; ctx.save(); ctx.translate(W/2,H-92); ctx.scale(s,s);
  ctx.font='bold 22px sans-serif'; const w=ctx.measureText(text).width+44;
  ctx.fillStyle='rgba(0,0,0,.5)'; roundRect(ctx,-w/2,-26,w,40,20); ctx.fill();
  ctx.fillStyle=col; ctx.textAlign='center'; ctx.fillText(text,0,2); ctx.restore(); ctx.textAlign='left'; }

function waitHint(){ ctx.fillStyle='#cde'; ctx.font='bold 18px sans-serif'; ctx.textAlign='center';
  ctx.fillText('アタリを待て…',W/2,110); ctx.textAlign='left';
  hint('ウキがしずんだら合図／タップで投げ直し','ウキがしずんだら合図／×で投げ直し'); }
function hookHint(){
  if(hookPhase()==='real') bigPrompt(touchMode()?'いま！タップで合わせろ！':'いま！ ○ で合わせろ！','#ffea00');
  else bigPrompt('前アタリ…ガクッ！まで待て','#bcd');
  hint('本アタリ（深く沈む！）で合わせる。早合わせはバラシ','本アタリ（深く沈む！）で○。早押しはバラシ');
}

function fightHUD(){
  // 魚の名前（スタミナゲージは表示しない）
  ctx.fillStyle='#fff'; ctx.font='bold 20px sans-serif'; ctx.textAlign='center';
  ctx.shadowColor='#000'; ctx.shadowBlur=6; ctx.fillText(S.fish.name, W/2, 64); ctx.shadowBlur=0; ctx.textAlign='left';
  // テンション（横・危険ゾーン付き）
  const tx=W/2-170,ty=82,tw=340,th=14;
  roundRect(ctx,tx,ty,tw,th,7); ctx.fillStyle='rgba(255,255,255,.16)'; ctx.fill();
  const tv=S.tension/100, tcol=tv>0.8?'#ff3b3b':(tv>0.6?'#ffb13b':'#3bff7a');
  roundRect(ctx,tx,ty,tw*tv,th,7); ctx.fillStyle=tcol; ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 12px sans-serif'; ctx.fillText('テンション（切れたらアウト）',tx,ty-5);
  ctx.fillStyle='#ff3b3b'; ctx.fillRect(tx+tw*0.8-1,ty-2,2,th+4);
  // こうげき／エレキ ゲージ（役割の違いを見せる）
  const cv=S.charge/100, ev=S.eleki/100;
  bar(W/2-170,H-66,165,10, cv, cv>=1?'#ffd34d':'#cfa030', 'こうげき'+(cv>=1?' READY!':''));
  bar(W/2+5,  H-66,165,10, ev, ev>=1?'#9cf':'#46618a', 'エレキ⚡'+(ev>=1?' READY!':'（成功でたまる）'));
  // 寄せ（LANDING）
  bar(W/2-170,H-44,340,12,S.progress/100,'#ffd34d','あと'+Math.max(0,Math.round(100-S.progress))+'%で GET');

  // 大きな状況プロンプト
  if(S.fishHP<=0) bigPrompt('ダウン！ 巻き上げろ！','#7fff8a');
  else if(S.pinch&&S.eleki>=100) bigPrompt(touchMode()?'⚡タップでエレキ反撃！':'⚡○でエレキ反撃！','#9cf');
  else if(S.pinch&&S.charge>=100) bigPrompt(touchMode()?'ピンチ！タップでこうげき！':'ピンチ！○でこうげき！','#ff6b6b');
  else if(S.pinch) bigPrompt('ピンチ！ 巻くのを止めて！','#ff6b6b');
  else if(S.charge>=100) bigPrompt(touchMode()?'タップでこうげき！':'○でこうげき！','#ffd34d');
  else if(S.mode==='run') bigPrompt('ひっぱられてる！ 巻くのを止めて！','#ffb13b');
  else bigPrompt(touchMode()?'いまだ！ なぞって巻け！':'いまだ！ 巻け！','#7fff8a');

  if(S.fishHP>0) drawReelGuide();
  hint('なぞってぐるぐる巻く／タップ=こうげき(or エレキ)','方向キー=巻く ○=こうげき/エレキ');
}
// 下部に「ぐるぐる巻く」モーションをオーバレイ表示
function drawReelGuide(){
  const cx=96, cy=H-138, r=26;
  const active=(S.mode!=='run');     // おとなしい時＝巻きどき
  ctx.save(); ctx.globalAlpha=active?0.95:0.4;
  // 円弧の矢印
  ctx.strokeStyle=active?'#7fff8a':'#9cf'; ctx.lineWidth=5; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(cx,cy,r,-0.4,Math.PI*1.5); ctx.stroke();
  // 矢じり（終点）
  const ea=Math.PI*1.5, ex=cx+Math.cos(ea)*r, ey=cy+Math.sin(ea)*r;
  ctx.fillStyle=active?'#7fff8a':'#9cf';
  ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex-10,ey-9); ctx.lineTo(ex+9,ey-10); ctx.closePath(); ctx.fill();
  // 周回する指（白丸）
  const ang=G.t*5; const dx=cx+Math.cos(ang)*r, dy=cy+Math.sin(ang)*r;
  ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(dx,dy,8,0,U.TAU); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
  ctx.fillText(touchMode()?'ぐるぐる巻く':'方向キーで巻く',cx,cy+r+18); ctx.textAlign='left';
  ctx.restore();
}
function catchHUD(){
  const a=U.clamp(S.catchAnim*2,0,1); ctx.fillStyle=`rgba(0,0,0,${0.35*a})`; ctx.fillRect(0,0,W,H);
  // キャラが掲げる魚
  const fx=AX+40, fy=WL-150-(1-U.ease(a))*40;
  drawSpaceFish(ctx,fx,fy,2.0*S.fish.size,-1,G.t,S.fish,{glow:true});
  ctx.fillStyle='#ffd34d'; ctx.font='bold 46px sans-serif'; ctx.textAlign='center'; ctx.shadowColor='#ffd34d'; ctx.shadowBlur=20;
  ctx.fillText('GET!',W/2,140); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.fillText(S.fish.name,W/2,176);
  if(S.catchAnim>0.8){ ctx.fillStyle='#9fd'; ctx.font='16px sans-serif'; ctx.fillText(touchMode()?'タップで確認':'○ で確認',W/2,H-40); }
  ctx.textAlign='left';
}
function hint(touchText,padText){ const t=touchMode()?touchText:padText;
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillRect(0,H-20,W,20);
  ctx.fillStyle='#bcd'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText(t,W/2,H-6); ctx.textAlign='left'; }

function resultScreen(){
  ctx.fillStyle='rgba(3,3,18,.86)'; ctx.fillRect(0,0,W,H); const d=S.caughtData; ctx.textAlign='center';
  ctx.fillStyle='#ffd34d'; ctx.font='bold 30px sans-serif'; ctx.fillText('つりあげた！',W/2,84);
  drawSpaceFish(ctx,W/2,220,2.4,1,G.t*1.2,S.fish,{glow:true});
  ctx.fillStyle='#fff'; ctx.font='bold 28px sans-serif'; ctx.fillText(d.name,W/2,316);
  ctx.fillStyle='#9fd'; ctx.font='bold 40px sans-serif'; ctx.fillText(d.cm+' cm',W/2,372);
  ctx.fillStyle='#ffd34d'; ctx.font='18px sans-serif'; ctx.fillText('レア度 '+'★'.repeat(d.tier),W/2,406);
  const uniq=new Set(G.caught.map(c=>c.id)).size; ctx.fillStyle='#aab'; ctx.font='14px sans-serif';
  ctx.fillText(`ずかん ${uniq} / ${FISH_DB.length}　総釣果 ${G.caught.length}`,W/2,442);
  pulseC((d.boss?'結果へ':'つづける'),H-60,'#ffd34d'); ctx.textAlign='left';
}
function pulseC(text,y,col){ const s=1+Math.sin(G.t*8)*0.06; ctx.save(); ctx.translate(W/2,y); ctx.scale(s,s);
  ctx.fillStyle=col; ctx.font='bold 20px sans-serif'; ctx.textAlign='center'; ctx.fillText((touchMode()?'タップで':'○ で')+text,0,0); ctx.restore(); }
function clearScreen(){
  ctx.fillStyle='rgba(3,10,30,.9)'; ctx.fillRect(0,0,W,H); ctx.textAlign='center';
  const a=U.ease(U.clamp(S.clearAnim,0,1));
  ctx.fillStyle='#ffd34d'; ctx.font=`bold ${46*a}px sans-serif`; ctx.shadowColor='#ffd34d'; ctx.shadowBlur=20; ctx.fillText('クリア！',W/2,H*0.4); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='20px sans-serif'; ctx.fillText(PLANETS[G.planet].name+' 制覇！',W/2,H*0.4+40);
  if(G.unlocked>G.planet+1&&G.planet+1<PLANETS.length){ ctx.fillStyle='#9cf'; ctx.font='bold 18px sans-serif';
    ctx.fillText('▶「'+PLANETS[G.planet+1].name+'」が解放された！',W/2,H*0.4+78); }
  if(S.clearAnim>1) pulseC('宇宙マップへ',H-60,'#ffd34d'); ctx.textAlign='left';
}
function endingScreen(){
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H); drawSkyAndSpace(ctx,W,H,PLANETS[4],G.t); ctx.textAlign='center';
  const a=U.clamp(S.endAnim/2,0,1); ctx.globalAlpha=a;
  drawSpaceFish(ctx,W/2,H*0.36,3.0,1,G.t,getNushi(),{glow:true});
  ctx.fillStyle='#ffd34d'; ctx.font='bold 36px sans-serif'; ctx.fillText('伝説のヌシを釣り上げた！',W/2,H*0.62);
  ctx.fillStyle='#fff'; ctx.font='18px sans-serif'; ctx.fillText('レヴィアコスは銀河の海へ還っていった——',W/2,H*0.62+36);
  ctx.fillStyle='#9fd'; ctx.font='16px sans-serif'; ctx.fillText('★ STELLAR ANGLER COMPLETE ★',W/2,H*0.62+72);
  ctx.globalAlpha=1; if(S.endAnim>3) pulseC('タイトルへ',H-44,'#ffd34d'); ctx.textAlign='left';
}

// ---------------- TITLE / SELECT ----------------
function renderTitle(){
  drawSkyAndSpace(ctx,W,H,PLANETS[0],G.t); drawWater(PLANETS[0]);
  drawAngler(PLANETS[0]);
  // 飛び跳ねる魚
  const fx=620+Math.sin(G.t*1.2)*40, fy=WL-120-Math.abs(Math.sin(G.t*1.2))*80;
  drawSpaceFish(ctx,fx,fy,2.0,-1,G.t*1.5,FISH_DB[1],{glow:true});
  ctx.textAlign='center';
  ctx.save(); ctx.translate(W/2,150); const bob=Math.sin(G.t*1.5)*4;
  ctx.fillStyle='#39e0ff'; ctx.font='bold 60px sans-serif'; ctx.shadowColor='#39e0ff'; ctx.shadowBlur=26; ctx.fillText('STELLAR ANGLER',0,bob); ctx.shadowBlur=0;
  ctx.fillStyle='#ffd34d'; ctx.font='bold 24px "Hiragino Maru Gothic Pro",sans-serif'; ctx.fillText('〜 伝説のヌシを求めて 〜',0,40+bob); ctx.restore();
  drawTitleButtons();
  ctx.fillStyle='#7f9'; ctx.font='13px sans-serif'; ctx.textAlign='center';
  ctx.fillText(touchMode()?'ボタンをタップ':'↑↓で選択 ○/SPACEで決定',W/2,H-26);
  ctx.textAlign='left';
}
function drawTitleButtons(){
  const btns=titleButtons();
  for(let i=0;i<btns.length;i++){ const b=btns[i], sel=(i===titleSel)&&b.enabled;
    const w=280,h=48,x=W/2-w/2,y=b.y-h/2;
    roundRect(ctx,x,y,w,h,12);
    ctx.fillStyle=!b.enabled?'rgba(70,70,82,.5)':(sel?'rgba(57,224,255,.92)':'rgba(255,255,255,.12)'); ctx.fill();
    if(sel){ ctx.lineWidth=3; ctx.strokeStyle='#fff'; roundRect(ctx,x,y,w,h,12); ctx.stroke(); }
    ctx.fillStyle=!b.enabled?'#8a8a96':(sel?'#03203a':'#fff'); ctx.font='bold 22px sans-serif'; ctx.textAlign='center';
    ctx.fillText(b.label,W/2,b.y+8);
  }
  ctx.textAlign='left';
}
function renderSelect(){
  const planet=PLANETS[G.selCursor]; drawSkyAndSpace(ctx,W,H,planet,G.t); ctx.textAlign='center';
  ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif'; ctx.fillText('▼ 惑星をえらべ ▼',W/2,54);
  const cx=W/2,cy=H*0.46,locked=G.selCursor>=G.unlocked,r=92+Math.sin(G.t*1.5)*4;
  const g=ctx.createRadialGradient(cx-30,cy-30,20,cx,cy,r);
  g.addColorStop(0,locked?'#333':planet.sea[0]); g.addColorStop(0.7,locked?'#222':planet.sky[planet.sky.length-1]); g.addColorStop(1,'rgba(0,0,0,.6)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,U.TAU); ctx.fill();
  ctx.strokeStyle=planet.accent; ctx.lineWidth=3; ctx.globalAlpha=locked?0.3:1; ctx.beginPath(); ctx.arc(cx,cy,r,0,U.TAU); ctx.stroke(); ctx.globalAlpha=1;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(0.5+Math.sin(G.t*0.3)*0.1); ctx.scale(1,0.32);
  ctx.strokeStyle=planet.accent; ctx.globalAlpha=0.5; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,r+24,0,U.TAU); ctx.stroke(); ctx.restore(); ctx.globalAlpha=1;
  if(locked){ ctx.fillStyle='#fff'; ctx.font='bold 40px sans-serif'; ctx.fillText('🔒',cx,cy+14); }
  ctx.fillStyle=planet.accent; ctx.font='bold 30px sans-serif'; ctx.fillText(planet.name,cx,cy+r+50);
  ctx.fillStyle='#aab'; ctx.font='15px sans-serif'; ctx.fillText(planet.sub+'  難易度 '+planet.diff,cx,cy+r+74);
  if(!locked){ ctx.fillStyle='#9fd'; ctx.font='14px sans-serif';
    const sc=G.selCursor;
    ctx.fillText(G.nushiDone[sc]?'★ ヌシ討伐ずみ':`ヌシまで ${Math.min(G.planetProgress[sc],QUOTA[sc])} / ${QUOTA[sc]}`,cx,cy+r+98); }
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='bold 40px sans-serif'; ctx.fillText('‹',cx-r-50,cy+14); ctx.fillText('›',cx+r+50,cy+14);
  for(let i=0;i<PLANETS.length;i++){ const dx=cx-(PLANETS.length-1)*14+i*28; ctx.beginPath(); ctx.arc(dx,H-46,7,0,U.TAU);
    ctx.fillStyle=i===G.selCursor?'#fff':(i<G.unlocked?'#6ad':'#444'); ctx.fill(); }
  ctx.fillStyle='#789'; ctx.font='13px sans-serif'; ctx.fillText(touchMode()?'スワイプで選択・中央タップで出発':'← → で選択 ○:出発 ×:タイトル',W/2,H-18); ctx.textAlign='left';
}

function drawToast(){ if(!G.msg) return; const a=U.clamp(G.msgT*2,0,1); ctx.globalAlpha=a;
  ctx.font='bold 17px sans-serif'; ctx.textAlign='center'; const w=ctx.measureText(G.msg).width+40;
  roundRect(ctx,W/2-w/2,52,w,34,17); ctx.fillStyle='rgba(0,0,0,.72)'; ctx.fill();
  ctx.fillStyle='#ffe98a'; ctx.fillText(G.msg,W/2,74); ctx.textAlign='left'; ctx.globalAlpha=1; }

function boot(){ const lb=document.getElementById('loadbar'); if(lb) lb.style.width='100%';
  setTimeout(()=>{ const ld=document.getElementById('loading'); if(ld) ld.classList.add('hidden'); G.state='TITLE'; },300);
  requestAnimationFrame(loop); }
boot();
})();
