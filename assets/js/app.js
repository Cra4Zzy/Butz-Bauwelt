(() => {
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  
  // reveal on scroll (small, chill animation)
  const revealEls = $$('[data-reveal]');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18 });
    revealEls.forEach(el => io.observe(el));
  }

// active nav
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('.nav a, .mobileInner a').forEach(a => {
    if ((a.getAttribute('href') || '').toLowerCase() === path) a.classList.add('active');
  });

  // mobile
  const burger = $('[data-burger]');
  const mobile = $('[data-mobile]');
  if (burger && mobile) {
    burger.addEventListener('click', () => {
      const open = mobile.dataset.open === 'true';
      mobile.dataset.open = String(!open);
      mobile.style.display = open ? 'none' : 'block';
      burger.setAttribute('aria-expanded', String(!open));
    });
  }

  // Configurator (wizard)
  const calc = $('#calc');
  if (!calc) return;

  const PRICING = {
    basePerM2: { basic: 2500, standard: 3000, premium: 3550 },
    typeMod:   { efh: 0.00, dh: -0.03, bw: 0.02 },
    roofMod:   { sattel: 0.00, walm: 0.03, pult: 0.015, flach: 0.01 },
    energyMod: { basis: 0.00, effizient: 0.03, top: 0.06 },
    extras: {
      basement: { none: 0, teil: 680, voll: 920 }, // per m2
      garage: { none: 0, single: 19000, double: 29500 }
    }
  };

  const state = {
    step: 0,
    type: 'efh',
    roof: 'sattel',
    area: 140,
    spec: 'standard',
    energy: 'basis',
    basement: 'none',
    basementArea: 80,
    garage: 'none'
  };

  const steps = $$('.stepCard', calc);
  const progress = $('[data-progress]', calc);
  let __prevTotal = null;

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(n);
  const roundNice = (n) => Math.round(n / 1000) * 1000;

  // smooth number animation for totals
  const animateNumber = (el, from, to, ms=520) => {
    if (!el) return;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      const v = from + (to - from) * ease(p);
      el.textContent = fmt(v);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  function calcTotal(){
    const base = state.area * (PRICING.basePerM2[state.spec] || 0);
    const modsPct = (PRICING.typeMod[state.type] || 0) + (PRICING.roofMod[state.roof] || 0) + (PRICING.energyMod[state.energy] || 0);
    const mods = base * modsPct;

    let basementCost = 0;
    if (state.basement !== 'none') {
      const per = PRICING.extras.basement[state.basement] || 0;
      basementCost = state.basementArea * per;
    }

    const garageCost = PRICING.extras.garage[state.garage] || 0;

    return {
      base, modsPct, mods, basementCost, garageCost,
      total: roundNice(base + mods + basementCost + garageCost)
    };
  }

  function render(){
    steps.forEach((s, i) => s.classList.toggle('active', i === state.step));
    if (progress) progress.style.width = `${Math.round(((state.step+1)/steps.length)*100)}%`;

    // highlight chosen buttons
    $$('.choices', calc).forEach(group => {
      const key = group.dataset.key;
      if (!key) return;
      $$('.choice', group).forEach(btn => btn.classList.toggle('selected', btn.dataset.value === String(state[key])));
    });

    // sliders
    const area = $('#area');
    const areaOut = $('#areaOut');
    if (area) area.value = String(state.area);
    if (areaOut) areaOut.textContent = String(state.area);

    const bArea = $('#bArea');
    const bAreaOut = $('#bAreaOut');
    if (bArea) bArea.value = String(state.basementArea);
    if (bAreaOut) bAreaOut.textContent = String(state.basementArea);

    // basement area visibility
    const bBox = $('#basementAreaBox');
    if (bBox) bBox.hidden = (state.basement === 'none');

    // summary
    const r = calcTotal();
    const sum = {
      sumType: ({efh:'Einfamilienhaus', dh:'Doppelhaus', bw:'Bungalow'})[state.type],
      sumRoof: ({sattel:'Satteldach', walm:'Walmdach', pult:'Pultdach', flach:'Flachdach'})[state.roof],
      sumArea: `${state.area} qm`,
      sumSpec: ({basic:'Einfach', standard:'Standard', premium:'Gehoben'})[state.spec],
      sumEnergy: ({basis:'Basis', effizient:'Effizient', top:'Premium'})[state.energy],
      sumBasement: state.basement === 'none' ? '–' : `${({teil:'Teil', voll:'Voll'})[state.basement]} · ${state.basementArea} qm`,
      sumGarage: state.garage === 'none' ? '–' : (state.garage === 'single' ? 'Einzel' : 'Doppel'),
      sumTotal: fmt(r.total),
      sumMods: `${Math.round(r.modsPct*100)}%`
    };
    Object.keys(sum).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = sum[id];
    });

    // mini summary (always visible)
    const miniMap = {
      miniType: sum.sumType,
      miniRoof: sum.sumRoof,
      miniArea: sum.sumArea,
      miniSpec: sum.sumSpec
    };
    Object.keys(miniMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = miniMap[id];
    });

    // animate totals (main + mini)
    const totalEl = document.getElementById('sumTotal');
    const miniTotalEl = document.getElementById('miniTotalValue');
    const newTotal = r.total;

    if (__prevTotal === null) {
      if (totalEl) totalEl.textContent = fmt(newTotal);
      if (miniTotalEl) miniTotalEl.textContent = fmt(newTotal);
      __prevTotal = newTotal;
    } else if (__prevTotal !== newTotal) {
      animateNumber(totalEl, __prevTotal, newTotal, 520);
      animateNumber(miniTotalEl, __prevTotal, newTotal, 520);
      __prevTotal = newTotal;
    }

    const hiddenTotal = $('#calc_total');
    const hiddenSummary = $('#calc_summary');
    if (hiddenTotal) hiddenTotal.value = String(r.total);
    if (hiddenSummary) hiddenSummary.value = JSON.stringify({ ...state, ...r });
  }

  // events
  $$('.choice', calc).forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.choices');
      const key = group?.dataset.key;
      if (!key) return;
      state[key] = btn.dataset.value;
      render();
    });
  });

  const area = $('#area');
  area?.addEventListener('input', () => { state.area = Number(area.value || 0); render(); });

  const bArea = $('#bArea');
  bArea?.addEventListener('input', () => { state.basementArea = Number(bArea.value || 0); render(); });

  const next = $('[data-next]', calc);
  const prev = $('[data-prev]', calc);
  const jump = (n) => {
    state.step = Math.max(0, Math.min(steps.length-1, n));
    render();
    // keep calculator in view (account for sticky header)
    const header = document.querySelector('.header');
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const y = calc.getBoundingClientRect().top + window.pageYOffset - headerH - 14;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  next?.addEventListener('click', () => jump(state.step + 1));
  prev?.addEventListener('click', () => jump(state.step - 1));

  render();
})();