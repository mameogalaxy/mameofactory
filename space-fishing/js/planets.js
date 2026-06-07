/* =========================================================
   planets.js  -- 惑星データ＆背景描画
   ========================================================= */
const PLANETS = [
  { id:0, name:'ネオン水星', sub:'AQUA NEONIS', diff:'★', locked:false,
    sky:['#0b1a3a','#123a6e'], sea:['#0d4a7a','#0a2a52'], accent:'#39e0ff',
    haze:'rgba(60,180,255,.12)', moons:[{c:'#7ef',r:34,x:0.2,y:0.22}] },
  { id:1, name:'溶岩のヴァルカン', sub:'VULCAN PYRA', diff:'★★', locked:true,
    sky:['#2a0b06','#6e2410'], sea:['#7a2a0d','#3a0f04'], accent:'#ff7a3d',
    haze:'rgba(255,120,40,.14)', moons:[{c:'#ffb24d',r:46,x:0.78,y:0.2}] },
  { id:2, name:'氷結のグラシエ', sub:'GLACIE FROST', diff:'★★★', locked:true,
    sky:['#0a1d2e','#2a6e8e','#dff'], sea:['#2a6e9a','#0d3a5a'], accent:'#cdf',
    haze:'rgba(200,240,255,.16)', moons:[{c:'#fff',r:40,x:0.25,y:0.18},{c:'#bdf',r:18,x:0.6,y:0.12}] },
  { id:3, name:'雷雲のテンペスト', sub:'TEMPESTA VOLT', diff:'★★★★', locked:true,
    sky:['#16062a','#3a1a6e'], sea:['#2a1a5a','#0d0630'], accent:'#c9f',
    haze:'rgba(180,120,255,.16)', moons:[{c:'#fe7',r:50,x:0.8,y:0.24}], storm:true },
  { id:4, name:'銀河の最果て', sub:'GALAXY\'S END', diff:'☆ NUSHI', locked:true,
    sky:['#05010f','#1a0a3a'], sea:['#10063a','#03010f'], accent:'#ffd34d',
    haze:'rgba(255,215,80,.14)', moons:[{c:'#ffd34d',r:60,x:0.5,y:0.16}], boss:true },
];

// 星空（各惑星共通の宇宙背景）
const STARS = [];
for(let i=0;i<180;i++){
  STARS.push({ x:Math.random(), y:Math.random()*0.72, r:Math.random()*1.6+0.3, tw:Math.random()*U.TAU });
}
// 星雲（ふわっとした色の雲）
const NEBULA = [];
for(let i=0;i<5;i++){
  NEBULA.push({ x:Math.random(), y:Math.random()*0.5, r:120+Math.random()*160, drift:Math.random()*U.TAU });
}

function drawSkyAndSpace(ctx, W, H, planet, t){
  // 空グラデ
  const g=ctx.createLinearGradient(0,0,0,H*0.72);
  const cols=planet.sky;
  cols.forEach((c,i)=>g.addColorStop(i/(cols.length-1), c));
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // 星雲
  ctx.globalCompositeOperation='lighter';
  for(const n of NEBULA){
    const nx=(n.x*W + Math.sin(t*0.05+n.drift)*30);
    const ny=n.y*H;
    const ng=ctx.createRadialGradient(nx,ny,10,nx,ny,n.r);
    ng.addColorStop(0, planet.haze);
    ng.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(nx,ny,n.r,0,U.TAU); ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';

  // 星
  for(const s of STARS){
    const tw=0.5+0.5*Math.sin(t*2+s.tw);
    ctx.globalAlpha=tw;
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, U.TAU); ctx.fill();
  }
  ctx.globalAlpha=1;

  // 月・惑星
  for(const m of planet.moons){
    const mx=m.x*W, my=m.y*H;
    const mg=ctx.createRadialGradient(mx-m.r*0.3,my-m.r*0.3,m.r*0.1, mx,my,m.r);
    mg.addColorStop(0,'#fff'); mg.addColorStop(0.4,m.c); mg.addColorStop(1,'rgba(0,0,0,.4)');
    ctx.fillStyle=mg;
    ctx.beginPath(); ctx.arc(mx,my,m.r,0,U.TAU); ctx.fill();
  }

  // 雷雲演出
  if(planet.storm && Math.random()<0.012){
    ctx.fillStyle='rgba(220,200,255,.5)';
    ctx.fillRect(0,0,W,H*0.72);
  }
  // 銀河の渦
  if(planet.boss){
    ctx.save();
    ctx.translate(W*0.5,H*0.22);
    ctx.globalAlpha=0.5;
    for(let i=0;i<3;i++){
      ctx.rotate(t*0.05+i*2);
      const gg=ctx.createRadialGradient(0,0,10,0,0,200);
      gg.addColorStop(0,'rgba(255,215,80,.25)');
      gg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gg;
      ctx.beginPath(); ctx.ellipse(0,0,200,60,0,0,U.TAU); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha=1;
  }
}
