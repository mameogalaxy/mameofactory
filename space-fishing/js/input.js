/* =========================================================
   input.js  -- 統合入力
   ・スマホ：画面を直接さわる「シームレスなタッチ操作」（ボタン無し）
   ・PC：キーボード
   ・ゲームパッド（DualShock2 想定の二本スティック）
   ========================================================= */
const Input = (() => {
  const keys = {};
  window.addEventListener('keydown', e=>{
    keys[e.code]=true;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ keys[e.code]=false; });

  let pad=null, padConnected=false;
  window.addEventListener('gamepadconnected', e=>{ pad=e.gamepad.index; padConnected=true; });
  window.addEventListener('gamepaddisconnected', ()=>{ padConnected=false; });
  const DEAD=0.18, dz=v=>Math.abs(v)<DEAD?0:v;

  // ----- タッチ（ポインタ）ジェスチャー -----
  const T = {
    down:false, justDown:false, justUp:false,
    x:0, y:0,            // キャンバス座標(0..960,0..600)
    dx:0, dy:0,          // このフレームの移動量
    speed:0,             // 移動の速さ
    moved:0,             // 押してからの総移動量
    gx:0, gy:0,          // ジェスチャー累積移動（down→up）
    swipeX:0, swipeY:0,  // up時のスワイプ量
    tap:false, tapX:0, tapY:0,
    active:false,        // タッチ環境で実際に触れた事があるか
    holdT:0,             // 押し続けている時間
  };
  let canvas=null, frameDX=0, frameDY=0, lastX=0, lastY=0;
  let pendDown=false, pendUp=false, pendUpMoved=0, pendGX=0, pendGY=0;

  function toCanvas(cx,cy){
    if(!canvas) return {x:cx,y:cy};
    const r=canvas.getBoundingClientRect();
    return { x:(cx-r.left)/r.width*960, y:(cy-r.top)/r.height*600 };
  }
  function onDown(cx,cy){
    const p=toCanvas(cx,cy);
    T.down=true; pendDown=true; T.active=true;
    T.x=p.x; T.y=p.y; lastX=p.x; lastY=p.y;
    T.moved=0; pendGX=0; pendGY=0;
    if(window.Sound&&Sound.ensure) Sound.ensure();
  }
  function onMove(cx,cy){
    if(!T.down) return;
    const p=toCanvas(cx,cy);
    const ddx=p.x-lastX, ddy=p.y-lastY;
    frameDX+=ddx; frameDY+=ddy;
    pendGX+=ddx; pendGY+=ddy;
    T.moved+=Math.hypot(ddx,ddy);
    T.x=p.x; T.y=p.y; lastX=p.x; lastY=p.y;
  }
  function onUp(){
    if(!T.down) return;
    T.down=false; pendUp=true; pendUpMoved=T.moved;
  }
  function bind(){
    canvas=document.getElementById('game');
    const tgt=canvas||window;
    const opt={passive:false};
    // Pointer Events（モバイル/マウス両対応）
    tgt.addEventListener('pointerdown', e=>{ onDown(e.clientX,e.clientY); e.preventDefault(); }, opt);
    window.addEventListener('pointermove', e=>{ onMove(e.clientX,e.clientY); }, opt);
    window.addEventListener('pointerup', e=>{ onUp(); }, opt);
    window.addEventListener('pointercancel', e=>{ onUp(); }, opt);
    // ページスクロール抑止
    document.addEventListener('touchmove', e=>{ if(T.active) e.preventDefault(); }, opt);
    if('ontouchstart' in window || (navigator.maxTouchPoints||0)>0)
      document.body.classList.add('touch-on');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();

  const prev={};
  const state={
    LX:0,LY:0,RX:0,RY:0,
    cross:false,circle:false,square:false,triangle:false,l1:false,r1:false,start:false,
    p:{cross:false,circle:false,square:false,triangle:false,l1:false,r1:false,start:false},
    usingPad:false, touch:T,
  };

  function poll(dt=0.016){
    let gp=(padConnected&&navigator.getGamepads)?navigator.getGamepads()[pad]:null;
    let LX=0,LY=0,RX=0,RY=0,cross=false,circle=false,square=false,triangle=false,l1=false,r1=false,start=false,padActive=false;
    if(gp){
      LX=dz(gp.axes[0]||0); LY=dz(gp.axes[1]||0); RX=dz(gp.axes[2]||0); RY=dz(gp.axes[3]||0);
      const B=gp.buttons;
      cross=!!(B[0]&&B[0].pressed); circle=!!(B[1]&&B[1].pressed);
      square=!!(B[2]&&B[2].pressed); triangle=!!(B[3]&&B[3].pressed);
      l1=!!(B[4]&&B[4].pressed); r1=!!(B[5]&&B[5].pressed); start=!!(B[9]&&B[9].pressed);
      if(Math.abs(LX)+Math.abs(LY)+Math.abs(RX)+Math.abs(RY)>0.05||cross||circle||square||triangle) padActive=true;
    }
    let kLX=0,kLY=0,kRX=0,kRY=0;
    if(keys['KeyA'])kLX-=1; if(keys['KeyD'])kLX+=1; if(keys['KeyW'])kLY-=1; if(keys['KeyS'])kLY+=1;
    if(keys['ArrowLeft']){ kLX-=1; kRX-=1; }
    if(keys['ArrowRight']){ kLX+=1; kRX+=1; }
    if(keys['ArrowUp']){ kLY-=1; kRY-=1; }
    if(keys['ArrowDown']){ kLY+=1; kRY+=1; }

    state.LX=LX||kLX; state.LY=LY||kLY; state.RX=RX||kRX; state.RY=RY||kRY;
    state.circle  =circle  ||keys['Space'];
    state.triangle=triangle||keys['KeyE'];
    state.cross   =cross   ||keys['KeyZ'];
    state.square  =square  ||keys['KeyX'];
    state.l1=l1||keys['KeyQ']; state.r1=r1||keys['KeyR']; state.start=start||keys['Enter'];
    for(const k of ['cross','circle','square','triangle','l1','r1','start']){
      state.p[k]=state[k]&&!prev[k]; prev[k]=state[k];
    }
    state.usingPad=padActive||padConnected;

    // --- タッチのフレーム集計 ---
    T.justDown=pendDown; pendDown=false;
    T.justUp=pendUp;
    T.dx=frameDX; T.dy=frameDY; T.speed=Math.hypot(frameDX,frameDY)/Math.max(dt,0.001)/60;
    frameDX=0; frameDY=0;
    T.tap=false;
    if(pendUp){
      T.swipeX=pendGX; T.swipeY=pendGY;
      if(pendUpMoved<14){ T.tap=true; T.tapX=T.x; T.tapY=T.y; }
      pendUp=false;
    }
    T.gx=pendGX; T.gy=pendGY;
    if(T.down) T.holdT+=dt; else T.holdT=0;

    return state;
  }

  // 右スティック回転（リール回し検出）
  let lastAng=null, spin=0;
  function reelSpin(rx,ry){
    const mag=Math.hypot(rx,ry);
    if(mag<0.4){ lastAng=null; spin*=0.85; return spin; }
    const ang=Math.atan2(ry,rx);
    if(lastAng!==null){ let d=((ang-lastAng+Math.PI)%U.TAU)-Math.PI; spin=spin*0.6+Math.abs(d)*0.4*10; }
    lastAng=ang; return spin;
  }

  return { poll, reelSpin, get connected(){return padConnected;}, touch:T };
})();
