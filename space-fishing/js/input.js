/* =========================================================
   input.js  -- デュアルアナログ（ゲームパッド）＋キーボード統合入力
   DualShock 2 を意識した二本スティック前提の操作系。
   ========================================================= */
const Input = (() => {
  const keys = {};
  window.addEventListener('keydown', e=>{
    keys[e.code]=true;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ keys[e.code]=false; });

  let pad = null;
  let padConnected = false;
  window.addEventListener('gamepadconnected', e=>{ pad=e.gamepad.index; padConnected=true; });
  window.addEventListener('gamepaddisconnected', ()=>{ padConnected=false; });

  const DEAD = 0.18;
  const dz = v => Math.abs(v) < DEAD ? 0 : v;

  // ボタンのエッジ検出用
  const prev = {};
  const state = {
    LX:0, LY:0, RX:0, RY:0,            // 左右スティック
    cross:false, circle:false, square:false, triangle:false,
    l1:false, r1:false, start:false,
    // 前フレームから「今押された」フラグ
    p:{ cross:false, circle:false, square:false, triangle:false, l1:false, r1:false, start:false },
    usingPad:false,
  };

  function poll(){
    // --- ゲームパッド ---
    let gp = null;
    if(padConnected && navigator.getGamepads){
      gp = navigator.getGamepads()[pad];
    }
    let LX=0,LY=0,RX=0,RY=0;
    let cross=false,circle=false,square=false,triangle=false,l1=false,r1=false,start=false;
    let padActive=false;

    if(gp){
      LX=dz(gp.axes[0]||0); LY=dz(gp.axes[1]||0);
      RX=dz(gp.axes[2]||0); RY=dz(gp.axes[3]||0);
      const B=gp.buttons;
      cross   = !!(B[0]&&B[0].pressed);
      circle  = !!(B[1]&&B[1].pressed);
      square  = !!(B[2]&&B[2].pressed);
      triangle= !!(B[3]&&B[3].pressed);
      l1      = !!(B[4]&&B[4].pressed);
      r1      = !!(B[5]&&B[5].pressed);
      start   = !!(B[9]&&B[9].pressed);
      if(Math.abs(LX)+Math.abs(LY)+Math.abs(RX)+Math.abs(RY)>0.05 ||
         cross||circle||square||triangle) padActive=true;
    }

    // --- キーボード（フォールバック / 併用） ---
    let kLX=0,kLY=0,kRX=0,kRY=0;
    if(keys['KeyA'])kLX-=1; if(keys['KeyD'])kLX+=1;
    if(keys['KeyW'])kLY-=1; if(keys['KeyS'])kLY+=1;
    if(keys['ArrowLeft'])kRX-=1; if(keys['ArrowRight'])kRX+=1;
    if(keys['ArrowUp'])kRY-=1; if(keys['ArrowDown'])kRY+=1;

    state.LX = LX || kLX;
    state.LY = LY || kLY;
    state.RX = RX || kRX;
    state.RY = RY || kRY;
    state.circle   = circle   || keys['Space'];
    state.triangle = triangle || keys['KeyE'];
    state.cross    = cross    || keys['KeyZ'];
    state.square   = square   || keys['KeyX'];
    state.l1       = l1       || keys['KeyQ'];
    state.r1       = r1       || keys['KeyR'];
    state.start    = start    || keys['Enter'];

    // エッジ検出
    for(const k of ['cross','circle','square','triangle','l1','r1','start']){
      state.p[k] = state[k] && !prev[k];
      prev[k] = state[k];
    }
    state.usingPad = padActive || padConnected;
    return state;
  }

  // 右スティックの回転速度（リール回し検出）。連続呼び出し前提。
  let lastAng = null, spin = 0;
  function reelSpin(rx, ry){
    const mag = Math.hypot(rx,ry);
    if(mag < 0.4){ lastAng=null; spin*=0.85; return spin; }
    const ang = Math.atan2(ry,rx);
    if(lastAng!==null){
      let d = ((ang-lastAng+Math.PI)%U.TAU)-Math.PI;
      spin = spin*0.6 + Math.abs(d)*0.4*10;
    }
    lastAng = ang;
    return spin;
  }

  return { poll, reelSpin, get connected(){return padConnected;} };
})();
