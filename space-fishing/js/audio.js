/* =========================================================
   audio.js  -- WebAudio による効果音＆合成BGM（外部ファイル不使用）
   ========================================================= */
const Sound = (() => {
  let ctx=null, master=null;
  let seVol=0.32, bgmOn=true;

  function ensure(){
    if(!ctx){
      try{
        ctx=new (window.AudioContext||window.webkitAudioContext)();
        master=ctx.createGain(); master.gain.value=1; master.connect(ctx.destination);
      }catch(e){}
    }
    if(ctx&&ctx.state==='suspended') ctx.resume();
  }

  function env(node,vol,dur){
    const g=ctx.createGain();
    g.gain.value=0.0001;
    g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
    node.connect(g); g.connect(master);
    return g;
  }
  function tone(freq,dur,type='sine',vol=1,slideTo=null){
    ensure(); if(!ctx) return;
    const o=ctx.createOscillator(); o.type=type; o.frequency.value=freq;
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo),ctx.currentTime+dur);
    env(o,seVol*vol,dur); o.start(); o.stop(ctx.currentTime+dur+0.02);
  }
  function noise(dur,vol=1,hp=800){
    ensure(); if(!ctx) return;
    const n=ctx.createBufferSource();
    const buf=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    n.buffer=buf;
    const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp;
    const g=ctx.createGain(); g.gain.value=seVol*vol;
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+dur);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(); n.stop(ctx.currentTime+dur);
  }

  const SE={
    move:()=>tone(440,0.05,'square',0.22),
    select:()=>{ tone(660,0.07,'square',0.45); setTimeout(()=>tone(990,0.1,'square',0.45),60); },
    back:()=>tone(300,0.1,'square',0.4,180),
    cast:()=>{ tone(820,0.12,'sawtooth',0.4,200); noise(0.18,0.28,1200); },
    splash:()=>noise(0.22,0.32,500),
    bite:()=>{ tone(180,0.12,'square',0.55); setTimeout(()=>tone(120,0.18,'square',0.55),90); },
    reel:()=>tone(520,0.03,'square',0.15),
    attack:()=>{ tone(900,0.1,'square',0.5,300); noise(0.12,0.3,900); },
    eleki:()=>{ ensure(); tone(1500,0.05,'square',0.5,200);
      for(let i=0;i<7;i++) setTimeout(()=>noise(0.05,0.4,2000+Math.random()*3000),i*32);
      setTimeout(()=>tone(80,0.4,'sawtooth',0.5,40),120); },
    ko:()=>{ [660,880,1320].forEach((f,i)=>setTimeout(()=>tone(f,0.13,'square',0.5),i*90)); },
    snap:()=>{ noise(0.2,0.5,300); tone(200,0.25,'sawtooth',0.5,50); },
    fanfare:()=>{ [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>tone(f,0.22,'square',0.5),i*110)); },
    warn:()=>tone(440,0.06,'square',0.35),
  };

  // ---------- 合成BGM（チップチューン・ループ）----------
  let musicTimer=null, step=0;
  // I–V–vi–IV 進行（C / G / Am / F）、各コード4ステップのアルペジオ
  const C=261.63,E=329.63,G=392,A=440,F=349.23,D=293.66,Bb=466.16,c5=523.25;
  const lead=[
    C,E,G,c5,   D,G,466.16,587.33,   A,C,E,A,   F,A,c5,A
  ];
  const bass=[130.81,0,98,0, 98,0,73.42,0, 110,0,82.41,0, 87.31,0,65.41,0];
  function musicStep(){
    if(!ctx) return;
    const ln=lead[step%lead.length];
    const o=ctx.createOscillator(); o.type='square'; o.frequency.value=ln;
    const g=ctx.createGain(); g.gain.value=0.0001;
    const v=bgmOn?0.06:0.0001;
    g.gain.exponentialRampToValueAtTime(v,ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.22);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime+0.25);
    const bn=bass[step%bass.length];
    if(bn>0){
      const b=ctx.createOscillator(); b.type='triangle'; b.frequency.value=bn;
      const bg=ctx.createGain(); bg.gain.value=0.0001;
      const bv=bgmOn?0.09:0.0001;
      bg.gain.exponentialRampToValueAtTime(bv,ctx.currentTime+0.01);
      bg.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.34);
      b.connect(bg); bg.connect(master); b.start(); b.stop(ctx.currentTime+0.36);
    }
    if(step%2===1 && bgmOn){ // 軽いハイハット
      const n=ctx.createBufferSource();
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.05,ctx.sampleRate);
      const d=buf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      n.buffer=buf; const fl=ctx.createBiquadFilter(); fl.type='highpass'; fl.frequency.value=6000;
      const ng=ctx.createGain(); ng.gain.value=0.025; ng.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.05);
      n.connect(fl); fl.connect(ng); ng.connect(master); n.start(); n.stop(ctx.currentTime+0.05);
    }
    step++;
  }
  function startBGM(){ ensure(); if(!ctx||musicTimer) return; step=0; musicTimer=setInterval(musicStep,200); }
  function setBgm(on){ bgmOn=on; }

  return { SE, startBGM, setBgm, ensure };
})();
