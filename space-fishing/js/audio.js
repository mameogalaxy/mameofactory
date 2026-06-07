/* =========================================================
   audio.js  -- BGM(mp3) ＋ WebAudio によるSE合成
   ========================================================= */
const Sound = (() => {
  let ctx = null;
  let masterSE = 0.35, bgmVol = 0.45;
  const bgm = document.getElementById('bgm');
  // リポジトリ同梱のスーファミ風BGM（無ければ無音で継続）
  const BGM_SRC = ['../supergame.mp3','../スーパーファミコン.mp3'];

  function ensure(){
    if(!ctx){
      try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
    }
    if(ctx && ctx.state==='suspended') ctx.resume();
  }

  function tone(freq, dur, type='sine', vol=1, slideTo=null){
    ensure(); if(!ctx) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.value=freq;
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo), ctx.currentTime+dur);
    g.gain.value=0.0001;
    g.gain.exponentialRampToValueAtTime(masterSE*vol, ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime+dur+0.02);
  }
  function noise(dur, vol=1, hp=800){
    ensure(); if(!ctx) return;
    const n=ctx.createBufferSource();
    const buf=ctx.createBuffer(1, ctx.sampleRate*dur, ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
    n.buffer=buf;
    const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp;
    const g=ctx.createGain();
    g.gain.value=masterSE*vol;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
    n.connect(f); f.connect(g); g.connect(ctx.destination);
    n.start(); n.stop(ctx.currentTime+dur);
  }

  const SE = {
    move:()=>tone(420,0.05,'square',0.25),
    select:()=>{ tone(660,0.07,'square',0.5); setTimeout(()=>tone(990,0.09,'square',0.5),60); },
    back:()=>tone(300,0.1,'square',0.4,180),
    cast:()=>{ tone(800,0.12,'sawtooth',0.4,200); noise(0.18,0.3,1200); },
    splash:()=>noise(0.25,0.35,500),
    bite:()=>{ tone(180,0.12,'square',0.6); setTimeout(()=>tone(120,0.18,'square',0.6),90); },
    reel:()=>tone(520,0.03,'square',0.18),
    charge:()=>tone(300,0.05,'sawtooth',0.2),
    attack:()=>{ tone(900,0.1,'square',0.5,300); noise(0.12,0.3,900); },
    eleki:()=>{                         // エレキアタック！
      ensure();
      tone(1400,0.05,'square',0.5,200);
      for(let i=0;i<6;i++) setTimeout(()=>noise(0.05,0.45,2000+Math.random()*3000), i*35);
      setTimeout(()=>tone(80,0.4,'sawtooth',0.5,40),120);
    },
    ko:()=>{ tone(660,0.1,'square',0.5); setTimeout(()=>tone(880,0.1,'square',0.5),90); setTimeout(()=>tone(1320,0.25,'square',0.5),180); },
    snap:()=>{ noise(0.2,0.5,300); tone(200,0.25,'sawtooth',0.5,50); },     // ライン切れ
    fanfare:()=>{ const n=[523,659,784,1047]; n.forEach((f,i)=>setTimeout(()=>tone(f,0.25,'square',0.5),i*120)); },
    warn:()=>tone(440,0.06,'square',0.4),
  };

  async function startBGM(){
    ensure();
    if(bgm.src) { try{ await bgm.play(); }catch(e){} return; }
    for(const s of BGM_SRC){
      bgm.src=s;
      try{ await bgm.play(); bgm.volume=bgmVol; return; }
      catch(e){ /* try next */ }
    }
  }
  function setBgm(on){ bgm.volume = on?bgmVol:0; }

  return { SE, startBGM, setBgm, ensure };
})();
