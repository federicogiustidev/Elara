/* ══════════════════════════════════════════
   QUANT FLOW FIELD — hero background
   Aesthetic: mathematical elegance for fintech AI
   ─ Particles drift along a slowly-rotating vector field
   ─ Dynamic proximity connections (asset correlation)
   ─ Signal bursts when particles "trade" data
   ─ Logarithmic spiral anchors (Fibonacci / Golden ratio)
   ─ Mouse exerts local gravity (portfolio rebalancing)
   ─ All opacity kept ultra-subtle on white bg
══════════════════════════════════════════ */
(()=>{
  const canvas = document.getElementById('neuralCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  const DPR = Math.min(devicePixelRatio, 2);
  const PURPLE   = [139, 92, 246];
  const INDIGO   = [99, 102, 241];
  const LAVENDER = [167, 139, 250];

  let W, H, particles=[], anchors=[], bursts=[], raf;
  let mouse = {x: -9999, y: -9999};
  let tick  = 0;
  let fieldAngle = 0; // slowly rotates the vector field

  /* ── Canvas sizing ── */
  function resize(){
    const el = canvas.parentElement;
    const rw = el.offsetWidth, rh = el.offsetHeight;
    W = canvas.width  = rw * DPR;
    H = canvas.height = rh * DPR;
    canvas.style.width  = rw + 'px';
    canvas.style.height = rh + 'px';
    build();
  }

  /* ── Vector field: layered sine waves, slowly rotating ── */
  function fieldVector(x, y, t){
    const nx = x / W, ny = y / H;
    // Two overlapping wave frequencies
    const angle =
      Math.sin(nx * 3.2 + t * 0.18) * Math.PI * 0.6 +
      Math.cos(ny * 2.8 - t * 0.12) * Math.PI * 0.4 +
      Math.sin((nx + ny) * 2.0 + t * 0.09) * Math.PI * 0.25;
    return { vx: Math.cos(angle), vy: Math.sin(angle) };
  }

  /* ── Build particles ── */
  function build(){
    particles = []; anchors = []; bursts = [];

    const count = W < 900 ? 55 : 90;
    const dpr = DPR;

    for(let i = 0; i < count; i++){
      const isAnchor = i < 12; // first N are "anchor" nodes — larger, slower
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: isAnchor ? (2.4 + Math.random() * 1.6) * dpr : (1 + Math.random() * 1.2) * dpr,
        speed: isAnchor ? 0.18 + Math.random() * 0.14 : 0.32 + Math.random() * 0.42,
        phase: Math.random() * Math.PI * 2,
        opacity: isAnchor ? 0.75 + Math.random() * 0.2 : 0.38 + Math.random() * 0.35,
        isAnchor,
        glow: 0,         // burst glow (decays)
        color: Math.random() < 0.65 ? PURPLE : (Math.random() < 0.5 ? INDIGO : LAVENDER),
      });
    }

    /* Golden-ratio spiral anchors for structure */
    const phi = (1 + Math.sqrt(5)) / 2;
    const spiralN = 7;
    const cx = W * 0.5, cy = H * 0.48;
    for(let i = 0; i < spiralN; i++){
      const theta = i * 2 * Math.PI / phi;
      const rad   = Math.sqrt(i / spiralN) * Math.min(W, H) * 0.38;
      anchors.push({
        x: cx + Math.cos(theta) * rad,
        y: cy + Math.sin(theta) * rad,
        r: (3.2 + i * 0.3) * DPR,
        phase: theta,
        glow: 0,
      });
    }
  }

  /* ── Spawn a burst at position ── */
  function spawnBurst(x, y, color){
    bursts.push({ x, y, r: 0, maxR: (14 + Math.random() * 18) * DPR, color, life: 1 });
  }

  /* ── rgba helper ── */
  function rgba([r,g,b], a){ return `rgba(${r},${g},${b},${Math.min(1,Math.max(0,a))})`; }

  /* ── Main draw ── */
  function draw(){
    ctx.clearRect(0, 0, W, H);
    tick++;
    fieldAngle += 0.004;

    const mx = mouse.x * DPR;
    const my = mouse.y * DPR;

    /* ── Move particles along vector field ── */
    particles.forEach(p => {
      const fv = fieldVector(p.x, p.y, fieldAngle);

      /* Mouse gravity: soft pull within 220px */
      const dx = mx - p.x, dy = my - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const influence = Math.max(0, 1 - dist / (220 * DPR));
      const gx = dx / (dist || 1) * influence * 0.4;
      const gy = dy / (dist || 1) * influence * 0.4;

      p.x += (fv.vx + gx) * p.speed * DPR * 0.5;
      p.y += (fv.vy + gy) * p.speed * DPR * 0.5;

      /* Wrap at edges with margin */
      const m = 40 * DPR;
      if(p.x < -m) p.x = W + m;
      if(p.x > W + m) p.x = -m;
      if(p.y < -m) p.y = H + m;
      if(p.y > H + m) p.y = -m;

      /* Decay glow */
      p.glow = Math.max(0, p.glow - 0.018);
    });

    /* ── Draw dynamic connections (proximity-based correlation) ── */
    const CONNECT_DIST = (W < 900 ? 110 : 150) * DPR;
    const all = [...particles, ...anchors];

    for(let i = 0; i < all.length; i++){
      for(let j = i + 1; j < all.length; j++){
        const a = all[i], b = all[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if(d > CONNECT_DIST) continue;

        const t  = 1 - d / CONNECT_DIST;
        // Gradient line: purple → indigo
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, rgba(a.color || PURPLE, t * 0.22));
        grad.addColorStop(0.5, rgba(INDIGO, t * 0.16));
        grad.addColorStop(1, rgba(b.color || LAVENDER, t * 0.22));

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = (0.7 + t * 1.4) * DPR;
        ctx.stroke();

        /* Occasionally spark a burst when particles are very close */
        if(t > 0.88 && Math.random() < 0.002){
          const mx2 = (a.x + b.x) / 2, my2 = (a.y + b.y) / 2;
          spawnBurst(mx2, my2, a.color || PURPLE);
          a.glow = 0.8; b.glow = 0.8;
        }
      }
    }

    /* ── Draw signal bursts ── */
    bursts.forEach((b, i) => {
      b.r += (b.maxR - b.r) * 0.09;
      b.life -= 0.028;
      if(b.life <= 0){ bursts.splice(i, 1); return; }

      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0,   rgba(b.color, b.life * 0.28));
      g.addColorStop(0.5, rgba(b.color, b.life * 0.10));
      g.addColorStop(1,   rgba(b.color, 0));
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });

    /* ── Draw golden-ratio anchor nodes ── */
    anchors.forEach(a => {
      a.glow = Math.max(0, a.glow - 0.012);
      const pulse = Math.sin(tick * 0.016 + a.phase) * 0.5 + 0.5;
      const baseOp = 0.55 + pulse * 0.30 + a.glow * 0.5;

      /* Outer halo */
      const haloR = a.r * (2.2 + pulse * 1.2 + a.glow * 3);
      const halo = ctx.createRadialGradient(a.x, a.y, a.r * 0.3, a.x, a.y, haloR);
      halo.addColorStop(0, rgba(PURPLE, baseOp * 0.18));
      halo.addColorStop(1, rgba(PURPLE, 0));
      ctx.beginPath();
      ctx.arc(a.x, a.y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      /* Core ring (hollow) */
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(PURPLE, baseOp * 0.9);
      ctx.lineWidth = 1.2 * DPR;
      ctx.stroke();

      /* Inner dot */
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = rgba(INDIGO, 1.0);
      ctx.fill();
    });

    /* ── Draw regular particles ── */
    particles.forEach(p => {
      const pulse = Math.sin(tick * 0.022 + p.phase) * 0.3 + 0.7;
      const op    = p.opacity * pulse + p.glow * 0.5;

      if(p.glow > 0.05){
        /* Glow halo on active particle */
        const hr = p.r * (3 + p.glow * 4);
        const h  = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hr);
        h.addColorStop(0, rgba(p.color, p.glow * 0.35));
        h.addColorStop(1, rgba(p.color, 0));
        ctx.beginPath();
        ctx.arc(p.x, p.y, hr, 0, Math.PI * 2);
        ctx.fillStyle = h;
        ctx.fill();
      }

      /* Solid core */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(p.color, op);
      ctx.fill();
    });

    /* ── Steady stream of micro bursts ── */
    if(bursts.length < 5 && tick % 80 === 0){
      const p = particles[Math.floor(Math.random() * particles.length)];
      if(p) spawnBurst(p.x, p.y, p.color);
    }

    raf = requestAnimationFrame(draw);
  }

  /* ── Init ── */
  resize();
  window.addEventListener('resize', ()=>{ cancelAnimationFrame(raf); resize(); draw(); });
  window.addEventListener('mousemove', e=>{ mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', ()=>{ mouse.x = -9999; mouse.y = -9999; });
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) cancelAnimationFrame(raf); else draw();
  });
  draw();
})();
const ds=document.createElement('style');
ds.textContent='@keyframes dot{0%,80%,100%{opacity:.2;transform:scale(.85)}40%{opacity:1;transform:scale(1.15)}}';
document.head.appendChild(ds);

/* ══════════════════════════════════════════
   PAGE LOADER + ENTRANCE ANIMATIONS
══════════════════════════════════════════ */
function counter(el,target,prefix,suffix,dec,dur){
  const isFloat=dec>0;
  let s=null;
  (function step(ts){
    if(!s)s=ts;
    const p=Math.min((ts-s)/dur,1);
    const ease=p===1?1:1-Math.pow(2,-10*p);
    const v=target*ease;
    el.textContent=(prefix||'')+(isFloat?v.toFixed(dec):Math.round(v))+(suffix||'');
    if(p<1)requestAnimationFrame(step);
  })(performance.now());
}

(()=>{
  const loader=document.getElementById('pageLoader');
  const bar=document.getElementById('loaderBar');
  if(!loader||!bar)return;

  /* Fake progress bar */
  let w=0;
  const fill=setInterval(()=>{
    w=Math.min(w+(Math.random()*18+6),92);
    bar.style.width=w+'%';
    if(w>=92)clearInterval(fill);
  },80);

  /* On load: complete bar → fade loader → stagger hero elements */
  window.addEventListener('load',()=>{
    clearInterval(fill);
    bar.style.width='100%';
    bar.style.transition='width .25s ease';

    setTimeout(()=>{
      loader.classList.add('done');
      runHeroEntrance();
    },380);
  });

  /* Fallback if load fires before script */
  if(document.readyState==='complete'){
    clearInterval(fill);bar.style.width='100%';
    setTimeout(()=>{loader.classList.add('done');runHeroEntrance();},200);
  }
})();

function runHeroEntrance(){
  /* Trigger word-by-word headline reveal */
  const headline=document.getElementById('hero-h1');
  if(headline) requestAnimationFrame(()=>headline.classList.add('in'));

  /* Animate sparkline path */
  const spk=document.getElementById('spkPath');
  if(spk){
    spk.style.transition='stroke-dashoffset 1.8s cubic-bezier(.4,0,.2,1) 1s';
    spk.style.strokeDashoffset='0';
  }

  /* Stagger all a-up / a-right elements */
  document.querySelectorAll('.a-up,.a-right,.a-fade').forEach(el=>{
    requestAnimationFrame(()=>el.classList.add('in'));
  });

  /* Hero card counters after card appears */
  setTimeout(()=>{
    const c1=document.getElementById('hc1');
    const c2=document.getElementById('hc2');
    const c3=document.getElementById('hc3');
    const c4=document.getElementById('hc4');
    if(c1)counter(c1,487.4,'€','K',1,1400);
    setTimeout(()=>{if(c2)counter(c2,24.3,'','%',1,1100);},120);
    setTimeout(()=>{if(c3)counter(c3,1.87,'','',2,1100);},240);
    setTimeout(()=>{if(c4)counter(c4,23,'','',0,900);},360);
  },700);
}

/* ── NAV — static, no scroll needed ── */

/* ── SCROLL REVEAL ── */
(()=>{
  const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('vis');}),{threshold:.1,rootMargin:'0px 0px -50px 0px'});
  document.querySelectorAll('.reveal').forEach(el=>o.observe(el));
})();

/* ── STATS BAR COUNTERS ── */
const sObs=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting&&!e.target.dataset.done){
    e.target.dataset.done='1';
    counter(e.target,+e.target.dataset.t,e.target.dataset.p||'',e.target.dataset.s||'',0,1800);
  }
}),{threshold:.5});
document.querySelectorAll('.sbar-num').forEach(el=>sObs.observe(el));

/* ── CHART ANIMATION ── */
(()=>{
  const cw=document.getElementById('chartWrap');if(!cw)return;
  new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){cw.classList.add('animated');es[0].target._obs&&es[0].target._obs.unobserve(cw);}
  }),{threshold:.4}).observe(cw);
})();

/* ── AI CHAT ── */
const chatData={
  it:{
    risk:{u:"Sto prendendo troppo rischio?",a:"Ho analizzato il tuo portafoglio:\n\n• 68% in azioni (vs 55% target profilo moderato)\n• Volatilità: 18.2% annua · Beta: 1.34\n\nVerdetto: stai prendendo ~20% più rischio del previsto. Negli ultimi 6 mesi hai avuto 3 drawdown >7%.\n\nSuggerisco di spostare €12.400 da azioni growth a bond governativi → volatilità scende al 14.8%.\n\nVuoi che simuli l'impatto?"},
    div:{u:"Il portafoglio è diversificato?",a:"Analisi correlazione:\n\n• Tech: 47% (⚠️ troppo alto) · Finanza: 18% · Healthcare: 12%\n• 5 ETF con 63% di overlap (Apple, Microsoft, NVIDIA)\n• Asset si muovono insieme nel 78% dei ribassi\n\nAggiungi: Real Estate 8-10%, Commodities 5%, Asia EM 7%.\nSharpe ratio: 1.12 → 1.58."},
    tax:{u:"Come ottimizzare le tasse?",a:"3 opportunità concrete:\n\n1. Tax-Loss Harvesting ora: €4.200 minusvalenze latenti → risparmio ~€1.092\n\n2. Timing vendite Q1 2026: €18.500 gain su Apple → sposta tassazione al 2027\n\n3. Compensazione: 4 posizioni in perdita per compensare €6.300 di gain\n\nRisparmio totale stimato: €2.847"},
    crypto:{u:"Quanto crypto dovrei avere?",a:"Profilo moderato, orizzonte 8 anni:\n\nAllocazione consigliata: 3-5%\nAttualmente: 1.2% (€5.800)\n\nSuggerisco:\n• Porta a 4% gradualmente → €19.200 totale\n• 70% BTC / 25% ETH / 5% altri\n• DCA €450/mese per 6 mesi · Mai >7%\n\n+2.3% volatilità · +0.8% rendimento atteso"}
  },
  en:{
    risk:{u:"Am I taking too much risk?",a:"Portfolio analysis:\n\n• 68% equities (vs 55% target moderate profile)\n• Volatility: 18.2% yr · Beta: 1.34\n\nVerdict: ~20% more risk than suggested. 3 drawdowns >7% in 6 months.\n\nRecommend moving €12,400 from growth to gov bonds → volatility ~14.8%.\n\nWant me to simulate the impact?"},
    div:{u:"Is my portfolio diversified?",a:"Correlation analysis:\n\n• Tech: 47% (⚠️ too high) · Financials: 18% · Healthcare: 12%\n• 5 ETFs with 63% overlap (Apple, MSFT, NVIDIA)\n• Move together in 78% of drawdowns\n\nAdd: Real Estate 8-10%, Commodities 5%, Asia EM 7%.\nSharpe: 1.12 → 1.58."},
    tax:{u:"How to optimize taxes?",a:"3 actionable opportunities:\n\n1. Tax-Loss Harvesting now: €4,200 unrealized losses → save ~€1,092\n\n2. Timing Q1 2026: €18,500 gains on Apple → shift tax to 2027\n\n3. Offsetting: 4 losing positions offset €6,300 realized gains\n\nEstimated total savings: €2,847"},
    crypto:{u:"How much crypto should I hold?",a:"Moderate profile, 8-year horizon:\n\nSuggested: 3-5% · Currently: 1.2% (€5,800)\n\nRecommendation:\n• Move to 4% gradually → €19,200 total\n• 70% BTC / 25% ETH / 5% others\n• DCA €450/mo for 6 months · Never >7%\n\n+2.3% volatility · +0.8% expected return"}
  }
};
let lang=localStorage.getItem('elara_lang')||'it';

document.querySelectorAll('.qpill').forEach(pill=>{
  pill.addEventListener('click',function(){
    const d=chatData[lang]?.[this.dataset.q]||chatData.it[this.dataset.q];
    if(!d)return;
    const msgs=document.getElementById('chatMsgs');
    // user
    const u=document.createElement('div');
    u.style.cssText='display:flex;justify-content:flex-end;margin-bottom:1.2rem;';
    u.innerHTML=`<div style="background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;padding:.8rem 1.2rem;border-radius:16px 4px 16px 16px;font-size:.9rem;line-height:1.6;max-width:75%;font-weight:500;">${d.u}</div>`;
    msgs.appendChild(u);msgs.scrollTop=msgs.scrollHeight;
    // typing
    const tp=document.createElement('div');
    tp.style.cssText='display:flex;gap:.6rem;align-items:flex-start;margin-bottom:1.2rem;';
    tp.innerHTML=`<div style="width:36px;height:36px;border-radius:8px;background:#f0ebff;padding:3px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><img src="data:image/png;base64,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OmGMRzSv64UvXNXz7nfPK73sZaxRlMroKE04sopgcxWXCdtVgRPnxhYQPXZquTywOIo0RWRJU5XgKmErxrgbL7ro0f96xzvqY4ODyMZAsyuZE1ZOWDmeCXGhMaJZtrL75JPPWPhv/1bm+fN9MjYGVlWV+Tfpq0MEtoto5El/9rtAf8MojU5K11rPKQTAzRXunIikEVHvAYXCgy8vFIYWFgqcek8O0ZOqivdciaKor7d367++8507b770UqCmtU7TVmdCCtGMqAwXiwu7X/7ylZ1vfevMyrHHWl8qORkcBDSGWnFmswuoGNxduSGSlES2HhtF604olTRCxAYiqQg653whjiP2fuS7H/3o4z/81894UG+IjfudR39y5ISVvz1IZIxIlk0pLFp01sLPfnZx1/HH60CtpiZYBUvzSGNwRcfd7VpaNa5WxLZ7QUh/Z2/43f3PAXctFUVFxEQVnEjS4dyW/draNhxbKm3dhwi9MTYRccSskiQxFgqmDDB++9VX9/3bu941umXtWmJrxYfFHADMqrvqRh3xggWLul71quVdZ589JT7wQPDMGYyNAWSZUWOC5qw1UhmuAiUAQiID+zBvOrlY7F8YRaauCgLQ5EvPbdba7Rs2bPrv972v986f/AQJCYAQ1DerhDlywsrxe0RaRKpekJlecNw//dOBL3jXu7of9r64bnS04JmBicSqChmjBCCtaENDiCSoaiQQWqhbtSKvp689CTYtgRUguDc0nSFaTgat1FEQbRrsYFykOjTL2s0HW7vpkFJpaC6RA2ZuqJIGohASKZaiyAwOD/d+61/+ZccP//3fRbxnUyyqd04mkZTlSmVm2wknLO78i7+Y13byyW00a5aTLMu0VgvurIGsw2B1lkVqjGNEk2UZZsy1uaobTozj3oPiWBEAUlUGANE0BY7jOCLKbrr88se/9v73j+9cv57YWhXvUQXCbGCeBuaEleP3BqExgCKiouUXn/KK+e/+13+dXli5sufmwcFZD2dZ+440jcYASg1VYQBgxMQCMAYr4oxCZIHwdPmhqioR4KRaFYQxiFC8915BhBwiOwD2AKlRdUWAwVlR1LcsjrfuF0V9i61NK9Zy4j2noQYl2miAWGtKUcQI4H75ox9t/frHPz6+cfXDRExevbQEqda0t08rHXbY/PZTTpnXduKJ7WblSiJEL0kC0mgE7RlR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" style="width:30px;height:auto;max-width:none;display:block;" alt="Elara"/></div><div style="background:#f4f4f4;border-radius:4px 14px 14px 14px;padding:.9rem 1.1rem;"><span style="display:flex;gap:4px;"><span style="width:6px;height:6px;background:#c4b5fd;border-radius:50%;animation:dot .9s .0s infinite;display:inline-block;"></span><span style="width:6px;height:6px;background:#c4b5fd;border-radius:50%;animation:dot .9s .2s infinite;display:inline-block;"></span><span style="width:6px;height:6px;background:#c4b5fd;border-radius:50%;animation:dot .9s .4s infinite;display:inline-block;"></span></span></div>`;
    msgs.appendChild(tp);msgs.scrollTop=msgs.scrollHeight;
    setTimeout(()=>{
      tp.remove();
      const ai=document.createElement('div');
      ai.style.cssText='display:flex;gap:.6rem;align-items:flex-start;margin-bottom:1.2rem;';
      ai.innerHTML=`<div style="width:36px;height:36px;border-radius:8px;background:#f0ebff;padding:3px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><img src="data:image/png;base64,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OmGMRzSv64UvXNXz7nfPK73sZaxRlMroKE04sopgcxWXCdtVgRPnxhYQPXZquTywOIo0RWRJU5XgKmErxrgbL7ro0f96xzvqY4ODyMZAsyuZE1ZOWDmeCXGhMaJZtrL75JPPWPhv/1bm+fN9MjYGVlWV+Tfpq0MEtoto5El/9rtAf8MojU5K11rPKQTAzRXunIikEVHvAYXCgy8vFIYWFgqcek8O0ZOqivdciaKor7d367++8507b770UqCmtU7TVmdCCtGMqAwXiwu7X/7ylZ1vfevMyrHHWl8qORkcBDSGWnFmswuoGNxduSGSlES2HhtF604olTRCxAYiqQg653whjiP2fuS7H/3o4z/81894UG+IjfudR39y5ISVvz1IZIxIlk0pLFp01sLPfnZx1/HH60CtpiZYBUvzSGNwRcfd7VpaNa5WxLZ7QUh/Z2/43f3PAXctFUVFxEQVnEjS4dyW/draNhxbKm3dhwi9MTYRccSskiQxFgqmDDB++9VX9/3bu941umXtWmJrxYfFHADMqrvqRh3xggWLul71quVdZ589JT7wQPDMGYyNAWSZUWOC5qw1UhmuAiUAQiID+zBvOrlY7F8YRaauCgLQ5EvPbdba7Rs2bPrv972v986f/AQJCYAQ1DerhDlywsrxe0RaRKpekJlecNw//dOBL3jXu7of9r64bnS04JmBicSqChmjBCCtaENDiCSoaiQQWqhbtSKvp689CTYtgRUguDc0nSFaTgat1FEQbRrsYFykOjTL2s0HW7vpkFJpaC6RA2ZuqJIGohASKZaiyAwOD/d+61/+ZccP//3fRbxnUyyqd04mkZTlSmVm2wknLO78i7+Y13byyW00a5aTLMu0VgvurIGsw2B1lkVqjGNEk2UZZsy1uaobTozj3oPiWBEAUlUGANE0BY7jOCLKbrr88se/9v73j+9cv57YWhXvUQXCbGCeBuaEleP3BqExgCKiouUXn/KK+e/+13+dXli5sufmwcFZD2dZ+440jcYASg1VYQBgxMQCMAYr4oxCZIHwdPmhqioR4KRaFYQxiFC8915BhBwiOwD2AKlRdUWAwVlR1LcsjrfuF0V9i61NK9Zy4j2noQYl2miAWGtKUcQI4H75ox9t/frHPz6+cfXDRExevbQEqda0t08rHXbY/PZTTpnXduKJ7WblSiJEL0kC0mgE7RlR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" style="width:30px;height:auto;max-width:none;display:block;" alt="Elara"/></div><div style="background:#f4f4f4;border-radius:4px 14px 14px 14px;padding:.9rem 1.2rem;max-width:80%;"><p style="margin:0;font-size:.88rem;color:#0a0a0a;line-height:1.75;white-space:pre-wrap;">${d.a}</p></div>`;
      msgs.appendChild(ai);msgs.scrollTo({top:msgs.scrollHeight,behavior:'smooth'});
    },1500);
  });
});

/* ══════════════════════════════════════════
   TESTIMONIALS CAROUSEL
══════════════════════════════════════════ */
(()=>{
  const track    = document.getElementById('testiTrack');
  const viewport = document.getElementById('testiViewport');
  const prevBtn  = document.getElementById('carr-prev');
  const nextBtn  = document.getElementById('carr-next');
  const countEl  = document.getElementById('testiCount');
  const barEl    = document.getElementById('testiBar');
  const dotsWrap = document.getElementById('testiDots');
  if(!track||!viewport) return;

  const cards   = track.querySelectorAll('.tquote');
  const total   = cards.length;
  const visible = ()=> window.innerWidth<=768 ? 1 : 2;
  let   current = 0;
  let   dragging=false, startX=0, startScroll=0;

  /* Build dots */
  const pages = ()=> Math.ceil(total / visible());
  function buildDots(){
    dotsWrap.innerHTML='';
    const p=pages();
    for(let i=0;i<p;i++){
      const d=document.createElement('button');
      d.className='tdot'+(i===Math.floor(current/visible())?' active':'');
      d.setAttribute('aria-label','Pagina '+(i+1));
      d.addEventListener('click',()=>goTo(i*visible()));
      dotsWrap.appendChild(d);
    }
  }

  function getCardWidth(){
    if(!cards[0]) return 0;
    const style=window.getComputedStyle(track);
    const gap=parseFloat(style.gap)||24;
    return cards[0].offsetWidth+gap;
  }

  function update(){
    const cw=getCardWidth();
    track.style.transform=`translateX(-${current*cw}px)`;

    const idx=current+1;
    const padded=n=>String(n).padStart(2,'0');
    countEl.textContent=`${padded(idx)} / ${padded(total)}`;
    barEl.style.width=`${(idx/total)*100}%`;

    prevBtn.classList.toggle('disabled', current===0);
    nextBtn.classList.toggle('disabled', current>=total-visible());

    /* Dots */
    const page=Math.floor(current/visible());
    dotsWrap.querySelectorAll('.tdot').forEach((d,i)=>d.classList.toggle('active',i===page));
  }

  function goTo(idx){
    current=Math.max(0,Math.min(idx, total-visible()));
    update();
  }

  prevBtn.addEventListener('click',()=>goTo(current-visible()));
  nextBtn.addEventListener('click',()=>goTo(current+visible()));

  /* Keyboard */
  viewport.setAttribute('tabindex','0');
  viewport.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft') goTo(current-visible());
    if(e.key==='ArrowRight') goTo(current+visible());
  });

  /* Drag / swipe */
  viewport.addEventListener('mousedown',e=>{
    dragging=true; startX=e.pageX;
    startScroll=current*getCardWidth();
    track.style.transition='none';
  });
  window.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const dx=startX-e.pageX;
    track.style.transform=`translateX(-${startScroll+dx}px)`;
  });
  window.addEventListener('mouseup',e=>{
    if(!dragging)return; dragging=false;
    track.style.transition='transform .55s cubic-bezier(.4,0,.2,1)';
    const dx=startX-e.pageX;
    if(Math.abs(dx)>60) goTo(dx>0 ? current+visible() : current-visible());
    else update();
  });
  viewport.addEventListener('touchstart',e=>{startX=e.touches[0].pageX;},{ passive:true });
  viewport.addEventListener('touchend',e=>{
    const dx=startX-e.changedTouches[0].pageX;
    if(Math.abs(dx)>50) goTo(dx>0 ? current+visible() : current-visible());
  },{ passive:true });

  /* Auto-play every 5s, pause on hover */
  let autoTimer=setInterval(()=>{
    if(current>=total-visible()) goTo(0); else goTo(current+visible());
  },5000);
  viewport.addEventListener('mouseenter',()=>clearInterval(autoTimer));
  viewport.addEventListener('mouseleave',()=>{
    autoTimer=setInterval(()=>{
      if(current>=total-visible()) goTo(0); else goTo(current+visible());
    },5000);
  });

  window.addEventListener('resize',()=>{ buildDots(); update(); });
  buildDots(); update();
})();

/* ══════════════════════════════════════════
   MORPHING BUTTON CLICK
══════════════════════════════════════════ */
(()=>{
  function morphBtn(btn, onSuccess){
    if(btn.classList.contains('morphing')||btn.classList.contains('success')) return;

    // Lock current width before animating
    const rect = btn.getBoundingClientRect();
    btn.style.width = rect.width + 'px';

    // Force repaint then trigger morph
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        btn.classList.add('morphing');
      });
    });

    // After animation: call success callback (form submit, redirect, etc.)
    setTimeout(()=>{
      btn.classList.remove('morphing');
      btn.classList.add('success');
      if(onSuccess) onSuccess();
    }, 650);
  }

  // Hero "Accedi alla beta privata" — just scroll, no circle morph
  const heroBtn = document.getElementById('hero-btn1');
  if(heroBtn){
    heroBtn.addEventListener('click', e=>{
      e.preventDefault();
      document.getElementById('cta')?.scrollIntoView({behavior:'smooth'});
    });
  }

  // CTA "Unisciti alla waitlist" — submit form to Supabase
  const ctaForm = document.getElementById('ctaForm');
  const ctaBtn  = document.getElementById('ctaBtn');
  const ctaEmail = document.getElementById('ctaEmail');

  const supabaseUrl = "https://frwixxrpkcurwfvdjflp.supabase.co";
  const supabaseAnonKey = "sb_publishable_6ZE_rY9TT-EDHuyAsCeMZQ_J1PCMgzt";

  let supabaseClientPromise = null;

  function getSupabaseClient() {
    if (!supabaseClientPromise) {
      supabaseClientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm")
        .then(({ createClient }) => createClient(supabaseUrl, supabaseAnonKey));
    }

    return supabaseClientPromise;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  if (ctaForm && ctaBtn && ctaEmail) {
    ctaForm.addEventListener('submit', async e => {
      e.preventDefault();

      const lang = localStorage.getItem('elara_lang') || 'it';
      const email = ctaEmail.value.trim().toLowerCase();

      if (!email || !isValidEmail(email)) {
        showToast(
          lang === 'it'
            ? 'Inserisci una email valida.'
            : 'Enter a valid email.'
        );
        return;
      }

      ctaBtn.disabled = true;

      try {
        const supabase = await getSupabaseClient();

        const { error } = await supabase
          .from('waitlist')
          .insert([
            {
              email: email,
              source: 'elarafin.com'
            }
          ]);

        if (error) {
          console.error(error);

          if (error.code === '23505') {
            showToast(
              lang === 'it'
                ? 'Sei già nella waitlist.'
                : 'You are already on the waitlist.'
            );
          } else {
            showToast(
              lang === 'it'
                ? 'Errore durante l’iscrizione. Riprova.'
                : 'Something went wrong. Try again.'
            );
          }

          ctaBtn.disabled = false;
          return;
        }

        morphBtn(ctaBtn, () => {
          setTimeout(() => {
            showToast(
              lang === 'it'
                ? '✓ Perfetto, sei nella waitlist!'
                : '✓ You joined the waitlist!'
            );

            ctaForm.reset();

            setTimeout(() => {
              ctaBtn.classList.remove('success');
              ctaBtn.style.width = '';
              ctaBtn.disabled = false;
            }, 2000);
          }, 400);
        });

      } catch (err) {
        console.error(err);

        showToast(
          lang === 'it'
            ? 'Errore di connessione. Riprova.'
            : 'Connection error. Try again.'
        );

        ctaBtn.disabled = false;
      }
    });
  }

  // Toast notification
  function showToast(msg){
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);
      background:#0a0a0a;color:#fff;
      padding:.9rem 2rem;border-radius:50px;
      font-size:.95rem;font-weight:700;font-family:inherit;
      box-shadow:0 16px 48px rgba(0,0,0,.25);
      opacity:0;transition:all .4s cubic-bezier(.22,.61,.36,1);
      z-index:9999;white-space:nowrap;
    `;
    document.body.appendChild(t);
    requestAnimationFrame(()=> requestAnimationFrame(()=>{
      t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';
    }));
    setTimeout(()=>{
      t.style.opacity='0';t.style.transform='translateX(-50%) translateY(20px)';
      setTimeout(()=>t.remove(), 400);
    }, 3500);
  }
})();
(()=>{
  const el=document.getElementById('ctaTypewriter');
  if(!el)return;
  const phrasesIT=["Dalla passione\nall'impatto","Dal dato\nalla decisione","Dal caos\nalla chiarezza"];
  const phrasesEN=["From passion\nto impact","From data\nto decision","From chaos\nto clarity"];
  const get=()=>(localStorage.getItem('elara_lang')||'it')==='it'?phrasesIT:phrasesEN;
  let pi=0,ci=0,del=false,started=false;
  const T=55,D=28,PE=2200,PS=500;
  function render(t){el.innerHTML=t.replace(/\n/g,'<br>');}
  function tick(){
    const p=get(),full=p[pi];
    if(!del){ci++;render(full.slice(0,ci));if(ci===full.length){del=true;setTimeout(tick,PE);return;}setTimeout(tick,T+Math.random()*25);}
    else{ci--;render(full.slice(0,ci));if(ci===0){del=false;pi=(pi+1)%p.length;setTimeout(tick,PS);return;}setTimeout(tick,D);}
  }
  const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&!started){started=true;setTimeout(tick,350);obs.disconnect();}}),{threshold:.3});
  const sec=document.getElementById('cta');if(sec)obs.observe(sec);
})();

document.getElementById('ctaForm').addEventListener('submit',function(e){
  e.preventDefault();
  const email=document.getElementById('ctaEmail').value;
  alert(lang==='en'?`Thanks! Added to waitlist: ${email}`:`Grazie! Aggiunto alla lista d'attesa: ${email}`);
  this.reset();
});

/* ── i18n ── */
const i18n={
  it:{
    toggle:'EN',
    navLinks:['Funzionalità','Tecnologia','Chi siamo','Sicurezza','Pricing'],navCta:'Inizia ora',
    heroBadge:'Ora in Beta Privata — Posti limitati',
    heroH1:'Il tuo copilota AI <em>finanziario</em>',
    heroSub:'Unifica il tuo patrimonio e ottimizzalo con modelli quantitativi, Machine Learning e AI — come un CFO istituzionale.',
    heroBtn1:'Unisciti alla waitlist',heroBtn2:'Guarda la demo →',
    ctaH2:"Dalla passione<br>all'impatto",
    ctaP:'Unisciti a migliaia di investitori che stanno già usando Elara per gestire il loro patrimonio in modo intelligente e data-driven.',
    ctaBtn:'Iscriviti alla waitlist',
    ctaNote:'✓ Nessuna carta richiesta · ✓ Cancella quando vuoi',
    footerCopy:'© 2026 Elara Technologies S.r.l. — Tutti i diritti riservati.',
    pills:['Sto prendendo troppo rischio?','Il portafoglio è diversificato?','Come ottimizzare le tasse?','Quanto crypto dovrei avere?']
  },
  en:{
    toggle:'IT',
    navLinks:['Features','Technology','Security','Pricing'],navCta:'Get started',
    heroBadge:'Now in Private Beta — Limited spots',
    heroH1:'Your AI <em>financial</em> copilot',
    heroSub:'Unify your wealth and optimize it with Quantitative Models, Machine Learning and AI.',
    heroBtn1:'Join the waitlist',heroBtn2:'Watch demo →',
    ctaH2:'From passion<br>to impact',
    ctaP:'Join thousands of investors already using Elara to manage wealth intelligently and data-driven.',
    ctaBtn:'Join the waitlist',
    ctaNote:'✓ No credit card required · ✓ Cancel anytime',
    footerCopy:'© 2026 Elara Technologies S.r.l. — All rights reserved.',
    pills:['Am I taking too much risk?','Is my portfolio diversified?','How to optimize taxes?','How much crypto should I hold?']
  }
};

function setLang(l){
  lang=l;localStorage.setItem('elara_lang',l);
  const t=i18n[l];
  document.querySelectorAll('#langBtn,#langBtnFooter').forEach(b=>{if(b)b.textContent=t.toggle;});
  const navAs=document.querySelectorAll('.nav-links a');
  t.navLinks.forEach((tx,i)=>{if(navAs[i])navAs[i].textContent=tx;});
  document.querySelectorAll('.btn-nav-cta').forEach(b=>{if(b)b.textContent=t.navCta;});
  document.getElementById('hero-badge-txt').textContent=t.heroBadge;
  const heroEl=document.getElementById('hero-h1');
  if(heroEl){
    const words=heroEl.querySelectorAll('.hw-inner');
    const wordsIT=['Il','tuo','copilota','AI','finanziario'];
    const wordsEN=['Your','AI','financial','','copilot'];
    if(l==='en'){
      // simpler: just rebuild
      heroEl.innerHTML=`
        <span class="hw"><span class="hw-inner">Your</span></span>
        <span class="hw"><span class="hw-inner">personal</span></span>
        <span class="hw"><span class="hw-inner">quant</span></span><br>
        <span class="hw hw-accent"><span class="hw-inner">CFO</span></span>`;
    } else {
      heroEl.innerHTML=`
        <span class="hw"><span class="hw-inner">Il</span></span>
        <span class="hw"><span class="hw-inner">tuo</span></span>
        <span class="hw"><span class="hw-inner">CFO</span></span>
        <span class="hw"><span class="hw-inner">personale</span></span><br>
        <span class="hw hw-accent"><span class="hw-inner">quantitativo</span></span>`;
    }
    requestAnimationFrame(()=>heroEl.classList.add('in'));
  }
  document.getElementById('hero-sub').textContent=t.heroSub;
  document.getElementById('hero-btn1').textContent=t.heroBtn1;
  document.getElementById('hero-btn2').textContent=t.heroBtn2;
  // CTA headline is handled by typewriter — do not overwrite it
  // const ctaH2=document.querySelector('.cta-final h2');if(ctaH2)ctaH2.innerHTML=t.ctaH2;
  const ctaP=document.querySelector('.cta-inner>p');if(ctaP)ctaP.textContent=t.ctaP;
  const ctaBtn=document.getElementById('ctaBtn');if(ctaBtn)ctaBtn.textContent=t.ctaBtn;
  const ctaNote=document.getElementById('ctaNote');if(ctaNote)ctaNote.textContent=t.ctaNote;
  const fCopy=document.getElementById('footerCopy');if(fCopy)fCopy.textContent=t.footerCopy;
  const pills=document.querySelectorAll('.qpill');
  t.pills.forEach((tx,i)=>{if(pills[i])pills[i].textContent=tx;});
}

setLang(localStorage.getItem('elara_lang')||'it');
document.querySelectorAll('#langBtn,#langBtnFooter').forEach(btn=>{
  btn.addEventListener('click',()=>setLang(lang==='it'?'en':'it'));
});

/* =========================================================
   NEXT SCRIPT BLOCK
========================================================= */

(function(){
  var T={
    it:{
      navLinks:['Funzionalità','Tecnologia','Sicurezza','Pricing'],
      navCta:'Inizia ora',
      heroSub:'Unifica il tuo patrimonio e ottimizzalo con Modelli Quantitativi e Intelligenza Artificiale.',
      heroBtn1:'Accedi alla beta privata',heroBtn2:'Guarda la demo →',
      heroCardLbl:'Portfolio overview — Aggiornato in tempo reale',heroLive:'Live',
      hkpiLbl:['Net worth totale','Performance YTD','Sharpe ratio','Asset allocati'],
      hkpiMeta:['+12.4% questo mese','+5.2% vs benchmark','Profilo ottimizzato','Ben diversificato'],
      hkpiAI:'Elara ha identificato <strong>3 opportunità di ottimizzazione</strong> nel tuo portafoglio — clicca per vedere i dettagli.',
      statsCat:['velocità','ottimizzazione','monitoraggio'],
      statsDesc:["Tempo risparmiato nell'analisi del patrimonio",'Miglioramento medio del Sharpe ratio','AI attiva in continuo sui tuoi asset'],
      visionLabel:'La nostra visione',
      visionH2:'Vogliamo rendere accessibile a tutti la gestione patrimoniale di livello istituzionale',
      visionP:'Algoritmi quantitativi, intelligenza artificiale e aggregazione dei dati: gli stessi strumenti usati dai grandi hedge fund, ora a disposizione di ogni investitore consapevole.',
      vcardH:['Unifichiamo il patrimonio','Ottimizziamo i rendimenti','Creiamo chiarezza'],
      vcardP:["Conti bancari, broker, immobili, veicoli: tutto in un'unica vista intelligente aggiornata in tempo reale.",'Modelli quantitativi che lavorano in continuo per massimizzare il rapporto rischio-rendimento del tuo portafoglio.','Dati complessi tradotti in insight azionabili: sai sempre dove sei, dove stai andando e cosa fare.'],
      servLabel:'Funzionalità',
      servH2:'Cosa fa Elara<br>per il tuo patrimonio',
      servP:"Dalla raccolta dati all'ottimizzazione automatica, Elara gestisce ogni aspetto del tuo patrimonio con algoritmi quantitativi e intelligenza artificiale.",
      scardH:['Ottimizzazione di portafoglio','Patrimonio unificato','Chat conversazionale'],
      scardP:['Algoritmi quantitativi che ribilanciano continuamente il tuo portafoglio per massimizzare il rapporto rischio-rendimento.',"Tutti i tuoi asset finanziari e beni fisici aggregati da banche, broker e conti personali in un'unica schermata.",'Chiedi qualsiasi cosa sul tuo patrimonio e ricevi risposte immediate basate sui tuoi dati reali.'],
      scardLi:[['Mean-Variance Optimization','Black-Litterman Model','Risk Parity & Sharpe Max'],['Aggregazione bancaria PSD2','Beni fisici e immobili','Dashboard real-time'],['Analisi del rischio istantanea','Tax-loss harvesting automatico','Simulazioni what-if']],
      demoLabel:'Demo interattiva',demoH2:'Parla con il tuo copilota finanziario',
      demoP:'Premi una domanda per vedere come Elara analizza il tuo portafoglio in tempo reale.',
      chatName:'Elara AI',chatStatus:'Online — Analisi attiva',
      chatInit:'Ciao! Sono Elara, il tuo copilota finanziario. Ho analizzato il tuo portafoglio. Cosa vuoi sapere?',
      chatPlaceholder:'Chiedimi qualcosa sul tuo patrimonio…',chatSend:'Invia →',
      pills:['Sto prendendo troppo rischio?','Il portafoglio è diversificato?','Come ottimizzare le tasse?','Quanto crypto dovrei avere?'],
      algoLabel:'Tecnologia',
      algoH2:'Algoritmi istituzionali<br>di livello internazionale',
      algoP:"Utilizziamo i metodi di ottimizzazione più avanzati del settore finanziario — gli stessi usati dai grandi hedge fund e dai gestori patrimoniali globali — resi accessibili attraverso un'interfaccia intuitiva.",
      algoCardH:['Mean-Variance Optimization','Black-Litterman Model','Risk Parity','Minimum Variance','Sharpe Ratio Maximization'],
      algoCardP:['La teoria classica di Markowitz: trade-off ottimale tra rischio e rendimento atteso, ricalcolato in continuo sui tuoi dati reali.',"Integrazione delle tue view personali di mercato con l'equilibrio globale degli asset. La tua opinione entra nel modello.",'Bilanciamento ottimale del contributo al rischio di ogni asset. Nessun titolo domina la volatilità complessiva.','Minimizzazione della volatilità complessiva mantenendo i rendimenti target. Più stabilità, meno sorprese.','Massimizzazione del rendimento per unità di rischio con vincoli personalizzabili. Il gold standard della gestione quantitativa.'],
      chartMetricLbl:['Performance YTD','Sharpe ratio','Rischio ridotto'],
      chartXLabel:'Ultimi 24 mesi →',
      capLabel:'AI in azione',
      capH2:"Modelli quantitativi<br>per l'ottimizzazione del patrimonio",
      capP:'La nostra AI lavora 24/7 per massimizzare i tuoi rendimenti e minimizzare i rischi.',
      capH:['Ottimizzazione di portafoglio','Patrimonio unificato','Chat conversazionale','Analisi predittiva','Insight intelligenti','Valutazione beni fisici'],
      capP2:['Algoritmi quantitativi che ribilanciano continuamente il tuo portafoglio per massimizzare il rapporto rischio-rendimento.',"Tutti i tuoi asset finanziari e beni fisici, aggregati da banche, conti personali e broker, riuniti in un'unica schermata.",'Chiedi qualsiasi cosa sul tuo patrimonio e ricevi risposte immediate basate sui tuoi dati reali e sul contesto di mercato.',"Simulazioni quantitative e scenari what-if per anticipare l'evoluzione del tuo patrimonio in diverse condizioni di mercato.",'Analisi statistiche sui dati del tuo patrimonio, tradotte in metriche chiare e coerenti con i tuoi obiettivi finanziari.','Stima automatica del valore di immobili, veicoli e oggetti di valore con aggiornamenti real-time nel tuo net worth.'],
      methodLabel:'come lavoriamo',methodH2:'Il nostro metodo',
      methodP:'Pragmatismo e orientamento al risultato. Combiniamo ricerca avanzata e applicazione pratica per affiancare i nostri utenti nel loro percorso di crescita patrimoniale.',
      stepH:['Aggregazione dei dati','Analisi quantitativa','Ottimizzazione del portafoglio','Monitoraggio continuo'],
      stepP:['Connettiamo in modo sicuro (read-only, PSD2) tutti i tuoi conti bancari, broker, conti deposito e beni fisici. Una sola fonte di verità per tutto il tuo patrimonio.','I nostri modelli calcolano esposizione al rischio, correlazione tra asset, Sharpe ratio e deviazione standard su tutti i tuoi investimenti in tempo reale.',"Mean-Variance, Black-Litterman, Risk Parity: l'AI sceglie l'algoritmo più adatto al tuo profilo e genera raccomandazioni di ribilanciamento concrete.",'Alert personalizzati, report mensili automatici, simulazioni what-if. Il sistema lavora 24/7 per tenerti aggiornato su ogni variazione rilevante.'],
      secLabel:'Sicurezza',secH2:'La tua sicurezza<br>è la nostra priorità',
      secP:'Standard di sicurezza bancari, conformità normativa completa e audit regolari da enti certificati indipendenti.',
      tcardH:['Crittografia End-to-End','Conformità Normativa','Read-Only Access'],
      tcardP:['Tutti i dati protetti con AES-256 in transito e a riposo. Credenziali mai memorizzate. Tokenizzazione avanzata per ogni connessione bancaria.','Pienamente conformi a PSD2, GDPR e ISO 27001. Audit di sicurezza trimestrali da enti indipendenti con penetration testing regolari.','Accesso esclusivamente in sola lettura. Non possiamo mai eseguire transazioni o movimentare fondi in alcun modo. Zero rischio di manipolazione.'],
      testiLabel:'Dicono di noi',testiH2:'Cosa dicono<br>i primi utenti',
      testiP:'Investitori reali che usano Elara per analizzare e ottimizzare il proprio patrimonio. Non suggerimenti generici — risultati concreti.',
      pricingLabel:'Pricing',pricingH2:'Scegli il piano<br>perfetto per te',
      pricingP:'Prezzi trasparenti, nessun costo nascosto. Annulla quando vuoi, nessun vincolo contrattuale.',
      planNm:['Starter','Pro','Enterprise'],planPrice:['Gratis','€29','Custom'],planPer:['per sempre','/mese','su misura'],
      planDesc:['Perfetto per iniziare a tracciare il tuo patrimonio e esplorare le funzionalità base.','Per investitori seri che vogliono ottimizzare e massimizzare i rendimenti.','Per family office, wealth manager e team che gestiscono patrimoni complessi.'],
      planBtn:['Inizia gratis','Inizia 14 giorni gratis','Contatta il team sales'],planBadge:'Più popolare',
      ctaLabel:'contattaci',ctaP:'Unisciti a migliaia di investitori che stanno già usando Elara per gestire il loro patrimonio in modo intelligente e data-driven.',
      ctaInput:'La tua email',ctaBtn:'Richiedi accesso beta',ctaNote:'✓ Nessuna carta richiesta   ·   ✓ Cancella quando vuoi',
      footerDesc:'Portfolio Intelligence & Net Worth Optimization. Il copilota finanziario intelligente per investitori moderni.',
      footerColH:['Prodotto','Risorse','Azienda','Legale'],
      footerColLinks:[['Funzionalità','Pricing','Integrazioni','Changelog','Roadmap'],['Documentazione','Blog','Guide','API Reference','Help Center'],['Chi siamo','Careers','Press Kit','Partner','Contatti'],['Privacy Policy','Termini di servizio','Cookie Policy','Conformità','Sicurezza']],
      footerCopy:'© 2026 Elara Technologies S.r.l. — Tutti i diritti riservati.',footerStatus:'Stato dei servizi',toggle:'EN',
      heroH1:'<span class="hw"><span class="hw-inner">Il</span></span><span class="hw"><span class="hw-inner">tuo</span></span><span class="hw"><span class="hw-inner">CFO</span></span><span class="hw"><span class="hw-inner">personale</span></span><br><span class="hw hw-accent"><span class="hw-inner">quantitativo</span></span>'
    },
    en:{
      navLinks:['Features','Technology','Security','Pricing'],
      navCta:'Get started',
      heroSub:'Unify your wealth and optimise it with Quantitative Models and Artificial Intelligence.',
      heroBtn1:'Join the private beta',heroBtn2:'Watch the demo →',
      heroCardLbl:'Portfolio overview — Updated in real time',heroLive:'Live',
      hkpiLbl:['Total net worth','YTD Performance','Sharpe ratio','Allocated assets'],
      hkpiMeta:['+12.4% this month','+5.2% vs benchmark','Optimised profile','Well diversified'],
      hkpiAI:'Elara has identified <strong>3 optimisation opportunities</strong> in your portfolio — click to see details.',
      statsCat:['speed','optimisation','monitoring'],
      statsDesc:['Time saved in wealth analysis','Average improvement in Sharpe ratio','AI continuously active on your assets'],
      visionLabel:'Our vision',
      visionH2:'We want to make institutional-grade wealth management accessible to everyone',
      visionP:'Quantitative algorithms, artificial intelligence and data aggregation: the same tools used by major hedge funds, now available to every informed investor.',
      vcardH:['We unify your wealth','We optimise returns','We create clarity'],
      vcardP:['Bank accounts, brokers, real estate, vehicles: everything in a single intelligent view updated in real time.','Quantitative models working continuously to maximise the risk-return ratio of your portfolio.','Complex data translated into actionable insights: you always know where you are, where you\'re going and what to do.'],
      servLabel:'Features',
      servH2:'What Elara does<br>for your wealth',
      servP:'From data collection to automatic optimisation, Elara manages every aspect of your wealth with quantitative algorithms and artificial intelligence.',
      scardH:['Portfolio optimisation','Unified wealth','Conversational chat'],
      scardP:['Quantitative algorithms that continuously rebalance your portfolio to maximise the risk-return ratio.','All your financial assets and physical assets aggregated from banks, brokers and personal accounts in a single screen.','Ask anything about your wealth and get immediate answers based on your real data.'],
      scardLi:[['Mean-Variance Optimization','Black-Litterman Model','Risk Parity & Sharpe Max'],['PSD2 bank aggregation','Physical & real estate assets','Real-time dashboard'],['Instant risk analysis','Automatic tax-loss harvesting','What-if simulations']],
      demoLabel:'Interactive demo',demoH2:'Talk to your financial copilot',
      demoP:'Press a question to see how Elara analyses your portfolio in real time.',
      chatName:'Elara AI',chatStatus:'Online — Active analysis',
      chatInit:"Hi! I'm Elara, your financial copilot. I've analysed your portfolio. What would you like to know?",
      chatPlaceholder:'Ask me anything about your wealth…',chatSend:'Send →',
      pills:['Am I taking too much risk?','Is my portfolio diversified?','How to optimise taxes?','How much crypto should I hold?'],
      algoLabel:'Technology',
      algoH2:'Institutional-grade<br>international algorithms',
      algoP:'We use the most advanced optimisation methods in the financial industry — the same used by major hedge funds and global wealth managers — made accessible through an intuitive interface.',
      algoCardH:['Mean-Variance Optimization','Black-Litterman Model','Risk Parity','Minimum Variance','Sharpe Ratio Maximization'],
      algoCardP:["Markowitz's classic theory: optimal trade-off between risk and expected return, recalculated continuously on your real data.","Integration of your personal market views with the global asset equilibrium. Your opinion enters the model.","Optimal balancing of each asset's risk contribution. No single security dominates overall volatility.",'Minimisation of overall volatility while maintaining target returns. More stability, fewer surprises.','Maximising return per unit of risk with customisable constraints. The gold standard of quantitative management.'],
      chartMetricLbl:['YTD Performance','Sharpe ratio','Risk reduced'],
      chartXLabel:'Last 24 months →',
      capLabel:'AI in action',
      capH2:'Quantitative models<br>for wealth optimisation',
      capP:'Our AI works 24/7 to maximise your returns and minimise risks.',
      capH:['Portfolio optimisation','Unified wealth','Conversational chat','Predictive analysis','Smart insights','Physical asset valuation'],
      capP2:['Quantitative algorithms that continuously rebalance your portfolio to maximise the risk-return ratio.','All your financial assets and physical goods, aggregated from banks, personal accounts and brokers, brought together in a single screen.','Ask anything about your wealth and get immediate answers based on your real data and market context.','Quantitative simulations and what-if scenarios to anticipate the evolution of your wealth under different market conditions.','Statistical analyses of your wealth data, translated into clear metrics consistent with your financial goals.','Automatic valuation of real estate, vehicles and valuables with real-time updates in your net worth.'],
      methodLabel:'how we work',methodH2:'Our method',
      methodP:'Pragmatism and results orientation. We combine advanced research and practical application to support our users in their wealth growth journey.',
      stepH:['Data aggregation','Quantitative analysis','Portfolio optimisation','Continuous monitoring'],
      stepP:['We securely connect (read-only, PSD2) all your bank accounts, brokers, deposit accounts and physical assets. A single source of truth for your entire wealth.','Our models calculate risk exposure, asset correlation, Sharpe ratio and standard deviation across all your investments in real time.','Mean-Variance, Black-Litterman, Risk Parity: the AI chooses the most suitable algorithm for your profile and generates concrete rebalancing recommendations.','Custom alerts, automatic monthly reports, what-if simulations. The system works 24/7 to keep you updated on every relevant change.'],
      secLabel:'Security',secH2:'Your security<br>is our priority',
      secP:'Bank-grade security standards, full regulatory compliance and regular audits by independent certified bodies.',
      tcardH:['End-to-End Encryption','Regulatory Compliance','Read-Only Access'],
      tcardP:['All data protected with AES-256 in transit and at rest. Credentials never stored. Advanced tokenisation for every bank connection.','Fully compliant with PSD2, GDPR and ISO 27001. Quarterly security audits by independent bodies with regular penetration testing.','Exclusively read-only access. We can never execute transactions or move funds in any way. Zero manipulation risk.'],
      testiLabel:'What they say',testiH2:'What the first<br>users say',
      testiP:'Real investors using Elara to analyse and optimise their wealth. No generic advice — concrete results.',
      pricingLabel:'Pricing',pricingH2:'Choose the plan<br>that\'s right for you',
      pricingP:'Transparent pricing, no hidden costs. Cancel anytime, no contractual obligations.',
      planNm:['Starter','Pro','Enterprise'],planPrice:['Free','€29','Custom'],planPer:['forever','/month','tailored'],
      planDesc:['Perfect to start tracking your wealth and explore the basic features.','For serious investors who want to optimise and maximise returns.','For family offices, wealth managers and teams managing complex portfolios.'],
      planBtn:['Start free','Start 14-day free trial','Contact sales team'],planBadge:'Most popular',
      ctaLabel:'contact us',ctaP:'Join thousands of investors already using Elara to manage their wealth intelligently and data-driven.',
      ctaInput:'Your email',ctaBtn:'Request beta access',ctaNote:'✓ No credit card required   ·   ✓ Cancel anytime',
      footerDesc:'Portfolio Intelligence & Net Worth Optimization. The intelligent financial copilot for modern investors.',
      footerColH:['Product','Resources','Company','Legal'],
      footerColLinks:[['Features','Pricing','Integrations','Changelog','Roadmap'],['Documentation','Blog','Guides','API Reference','Help Center'],['About us','Careers','Press Kit','Partners','Contact'],['Privacy Policy','Terms of Service','Cookie Policy','Compliance','Security']],
      footerCopy:'© 2026 Elara Technologies S.r.l. — All rights reserved.',footerStatus:'Service status',toggle:'IT',
      heroH1:'<span class="hw"><span class="hw-inner">Your</span></span><span class="hw"><span class="hw-inner">personal</span></span><span class="hw"><span class="hw-inner">quantitative</span></span><br><span class="hw hw-accent"><span class="hw-inner">CFO</span></span>'
    }
  };

  var _lang = localStorage.getItem('elara_lang')||'it';

  function _q(s,c){return (c||document).querySelector(s);}
  function _qq(s,c){return Array.from((c||document).querySelectorAll(s));}
  function _t(el,v){if(el)el.textContent=v;}
  function _h(el,v){if(el)el.innerHTML=v;}

  function setLang(l){
    _lang=l;
    localStorage.setItem('elara_lang',l);
    var t=T[l];

    // toggle buttons
    _qq('#langBtn,#langBtnFooter').forEach(function(b){_t(b,t.toggle);});

    // nav
    _qq('.nav-links a').forEach(function(a,i){if(t.navLinks[i])_t(a,t.navLinks[i]);});
    _qq('.btn-nav-cta').forEach(function(b){_t(b,t.navCta);});

    // hero headline
    var h1=_q('#hero-h1');
    if(h1){h1.innerHTML=t.heroH1;requestAnimationFrame(function(){h1.classList.add('in');});}

    // hero subtitle + buttons
    _t(_q('#hero-sub'),t.heroSub);
    var b1=_q('#hero-btn1');if(b1){var lbl=b1.querySelector('.btn-label');_t(lbl||b1,t.heroBtn1);}
    _t(_q('#hero-btn2'),t.heroBtn2);

    // hero card
    _qq('.hcard-lbl').forEach(function(e){_t(e,t.heroCardLbl);});
    _qq('.hcard-live').forEach(function(e){var dot=e.querySelector('.live-dot');e.innerHTML='';if(dot)e.appendChild(dot);e.appendChild(document.createTextNode(t.heroLive));});
    _qq('.hkpi-lbl').forEach(function(e,i){if(t.hkpiLbl[i])_t(e,t.hkpiLbl[i]);});
    _qq('.hkpi-meta').forEach(function(e,i){if(t.hkpiMeta[i])_t(e,t.hkpiMeta[i]);});
    _h(_q('.hcard-ai p'),t.hkpiAI);

    // stats
    _qq('.sbar-cat').forEach(function(e,i){if(t.statsCat[i])_t(e,t.statsCat[i]);});
    _qq('.sbar-desc').forEach(function(e,i){if(t.statsDesc[i])_t(e,t.statsDesc[i]);});

    // vision
    var vs=_q('.vision');
    if(vs){
      var vl=_qq('.label',vs);if(vl[0])_t(vl[0],t.visionLabel);
      _t(_q('.vision-copy h2',vs),t.visionH2);
      _t(_q('.vision-copy p',vs),t.visionP);
      _qq('.vcard',vs).forEach(function(c,i){_t(_q('h4',c),t.vcardH[i]);_t(_q('p',c),t.vcardP[i]);});
    }

    // services
    var ss=_q('#features');
    if(ss){
      var sl=_qq('.label',ss);if(sl[0])_t(sl[0],t.servLabel);
      _h(_q('.section-title-lg',ss),t.servH2);
      _t(_q('.services-hd p',ss),t.servP);
      _qq('.scard',ss).forEach(function(c,i){
        _t(_q('h3',c),t.scardH[i]);
        _t(_q('.scard > p',c),t.scardP[i]);
        _qq('.scard-list li',c).forEach(function(li,j){if(t.scardLi[i]&&t.scardLi[i][j])_t(li,t.scardLi[i][j]);});
      });
    }

    // ai demo
    var ds=_q('#ai-demo');
    if(ds){
      var dl=_qq('.label',ds);if(dl[0])_t(dl[0],t.demoLabel);
      _h(_q('.section-title-lg',ds),t.demoH2);
      _t(_q('.ai-demo-hd p',ds),t.demoP);
      _t(_q('.chat-hdr-name',ds),t.chatName);
      var cst=_q('.chat-hdr-status',ds);if(cst)cst.innerHTML='<span class="online-dot"></span>'+t.chatStatus;
      _t(_q('.ai-bubble-init p',ds),t.chatInit);
      var ci=_q('.chat-text-input',ds);if(ci)ci.placeholder=t.chatPlaceholder;
      _t(_q('.chat-send',ds),t.chatSend);
      _qq('.qpill',ds).forEach(function(p,i){if(t.pills[i])_t(p,t.pills[i]);});
    }

    // algo section
    var as=_q('#technology');
    if(as){
      var al=_qq('.label',as);if(al[0])_t(al[0],t.algoLabel);
      _h(_q('.section-title-lg',as),t.algoH2);
      _t(_q('.algo-left > p',as),t.algoP);
      _qq('.algo-card',as).forEach(function(c,i){_t(_q('h4',c),t.algoCardH[i]);_t(_q('p',c),t.algoCardP[i]);});
      _t(_q('.chart-x-label',as),t.chartXLabel);
      _qq('.cmetric-lbl',as).forEach(function(e,i){if(t.chartMetricLbl[i])_t(e,t.chartMetricLbl[i]);});
    }

    // capabilities
    var cs=_q('.capabilities');
    if(cs){
      var cl=_qq('.label',cs);if(cl[0])_t(cl[0],t.capLabel);
      _h(_q('.section-title-lg',cs),t.capH2);
      _t(_q('.capabilities-hd p',cs),t.capP);
      _qq('.cap-card',cs).forEach(function(c,i){_t(_q('h3',c),t.capH[i]);_t(_q('p',c),t.capP2[i]);});
    }

    // method
    var ms=_q('.method');
    if(ms){
      var ml=_qq('.label',ms);if(ml[0])_t(ml[0],t.methodLabel);
      _h(_q('.section-title-lg',ms),t.methodH2);
      _t(_q('.method-hd p',ms),t.methodP);
      _qq('.step',ms).forEach(function(s,i){_t(_q('h4',s),t.stepH[i]);_t(_q('.step-body p',s),t.stepP[i]);});
    }

    // security
    var sec=_q('#security');
    if(sec){
      var secl=_qq('.label',sec);if(secl[0])_t(secl[0],t.secLabel);
      _h(_q('.security-hd h2',sec),t.secH2);
      _t(_q('.security-hd p',sec),t.secP);
      _qq('.tcard',sec).forEach(function(c,i){_t(_q('h4',c),t.tcardH[i]);_t(_q('p',c),t.tcardP[i]);});
    }

    // testimonials
    var ts=_q('.testimonials');
    if(ts){
      var tl=_qq('.label',ts);if(tl[0])_t(tl[0],t.testiLabel);
      _h(_q('.section-title-lg',ts),t.testiH2);
      _t(_q('.testi-top p',ts),t.testiP);
    }

    // pricing
    var ps=_q('#pricing');
    if(ps){
      var pl=_qq('.label',ps);if(pl[0])_t(pl[0],t.pricingLabel);
      _h(_q('.section-title-lg',ps),t.pricingH2);
      _t(_q('.pricing-hd p',ps),t.pricingP);
      _qq('.pcard',ps).forEach(function(c,i){
        _t(_q('.pcard-nm',c),t.planNm[i]);
        _t(_q('.pcard-price',c),t.planPrice[i]);
        _t(_q('.pcard-per',c),t.planPer[i]);
        _t(_q('.pcard-desc',c),t.planDesc[i]);
        _t(_q('.pcard-btn',c),t.planBtn[i]);
        var badge=_q('.pbadge',c);if(badge)_t(badge,t.planBadge);
      });
    }

    // cta
    var cta=_q('#cta');
    if(cta){
      _t(_q('.cta-label',cta),t.ctaLabel);
      _t(_q('.cta-inner > p',cta),t.ctaP);
      var inp=_q('.cta-input',cta);if(inp)inp.placeholder=t.ctaInput;
      var cb=_q('#ctaBtn');if(cb){var cbl=cb.querySelector('.btn-label');_t(cbl||cb,t.ctaBtn);}
      _t(_q('#ctaNote'),t.ctaNote);
    }

    // footer
    var ft=_q('footer');
    if(ft){
      _t(_q('.fb-desc',ft),t.footerDesc);
      _qq('.fcol',ft).forEach(function(col,i){
        _t(_q('h5',col),t.footerColH[i]);
        _qq('a',col).forEach(function(a,j){if(t.footerColLinks[i]&&t.footerColLinks[i][j])_t(a,t.footerColLinks[i][j]);});
      });
      _t(_q('#footerCopy'),t.footerCopy);
      var sa=_q('.fbottom-right a',ft);if(sa)_t(sa,t.footerStatus);
    }
  }

  // replace broken lang button listeners
  _qq('#langBtn,#langBtnFooter').forEach(function(btn){
    var clone=btn.cloneNode(true);
    btn.parentNode.replaceChild(clone,btn);
    clone.addEventListener('click',function(){setLang(_lang==='it'?'en':'it');});
  });

  // apply on load
  setLang(_lang);

  // expose globally (chat still needs lang)
  window.__setLang=setLang;
  window.__getLang=function(){return _lang;};
})();
