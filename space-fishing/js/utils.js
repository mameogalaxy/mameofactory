/* =========================================================
   utils.js  -- 共通ユーティリティ
   ========================================================= */
const U = {
  clamp:(v,a,b)=>v<a?a:(v>b?b:v),
  lerp:(a,b,t)=>a+(b-a)*t,
  rand:(a=1,b=null)=>{ if(b===null){b=a;a=0;} return a+Math.random()*(b-a); },
  randInt:(a,b)=>Math.floor(U.rand(a,b+1)),
  pick:(arr)=>arr[Math.floor(Math.random()*arr.length)],
  dist:(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by),
  TAU:Math.PI*2,
  deg:(d)=>d*Math.PI/180,
  // angle helpers
  angLerp:(a,b,t)=>{ let d=((b-a+Math.PI)%U.TAU)-Math.PI; return a+d*t; },
  smooth:(t)=>t*t*(3-2*t),
  ease:(t)=>1-Math.pow(1-t,3),
};

/* 簡易擬似3D投影：カメラは原点、+Z前方を見る。
   world(x,y,z) -> screen(sx,sy,scale)  */
function project(x,y,z,cam,W,H){
  z = Math.max(0.05, z);
  const f = cam.f;                       // 焦点距離
  const sx = W*0.5 + (x - cam.x) / z * f;
  const sy = H*cam.horizon - (y - cam.y) / z * f;
  return { x:sx, y:sy, s:f/z };
}

/* 値ノイズ（波・揺らぎ用） */
function wave(t, seed=0){
  return Math.sin(t*1.3+seed)*0.6 + Math.sin(t*2.7+seed*1.7)*0.3 + Math.sin(t*0.7+seed*0.3)*0.1;
}

/* 角丸矩形 */
function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

/* 画像プリロード（失敗してもnullで継続） */
function loadImage(src){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>res(img);
    img.onerror=()=>res(null);
    img.src=src;
  });
}
