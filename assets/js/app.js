(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const addReveal = (elements, step = 90, base = 0) => {
    elements
      .filter(Boolean)
      .forEach((el, index) => {
        if (el.dataset.revealBound === 'true') return;
        el.dataset.reveal = '';
        el.dataset.revealBound = 'true';
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', `${base + (index % 6) * step}ms`);
      });
  };

  // staged hero intro
  const hero = $('.hero');
  if (hero) {
    const heroItems = [
      ...$$('.heroCopy > *', hero),
      ...$$('.heroTop > .heroPanel', hero),
      ...$$('.heroStripe > .heroPanel', hero)
    ];

    heroItems.forEach((el, index) => {
      el.classList.add('heroIntro');
      el.style.setProperty('--hero-delay', `${80 + index * 85}ms`);
    });

    requestAnimationFrame(() => document.body.classList.add('page-loaded'));
  }

  // reveal groups across the site
  addReveal($$('.tile'), 95);
  addReveal($$('.feature'), 70);
  addReveal($$('.photo, .founder, .ctaStrip, .infoBlock, .infoItem, .accordion, .formCard, .sideCard, .legalCard, .legalBlock, .miniSum, .summary, .calc'), 85);
  addReveal($$('.split > div:last-child, .ctaCalc, .ctaCalc__media, .ctaStripIcon'), 80);

  const revealEls = $$('[data-reveal]');
  if (revealEls.length) {
    if (reduceMotion) {
      revealEls.forEach(el => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

      revealEls.forEach(el => io.observe(el));
    }
  }

  // active nav
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('.nav a, .mobileInner a').forEach(a => {
    if ((a.getAttribute('href') || '').toLowerCase() === path) a.classList.add('active');
  });

  // animated mobile menu
  const burger = $('[data-burger]');
  const mobile = $('[data-mobile]');

  if (burger && mobile) {
    const setMenuState = (open) => {
      mobile.dataset.open = String(open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');

      if (reduceMotion) {
        mobile.style.display = open ? 'block' : 'none';
        mobile.classList.toggle('is-open', open);
        return;
      }

      if (open) {
        mobile.classList.add('is-open');
        mobile.style.display = 'block';
        const endHeight = mobile.scrollHeight;
        const anim = mobile.animate(
          [
            { height: '0px', opacity: 0, transform: 'translateY(-8px)' },
            { height: `${endHeight}px`, opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
        );

        anim.onfinish = () => {
          mobile.style.height = '';
          mobile.style.opacity = '';
          mobile.style.transform = '';
        };
      } else {
        const startHeight = mobile.scrollHeight;
        const anim = mobile.animate(
          [
            { height: `${startHeight}px`, opacity: 1, transform: 'translateY(0)' },
            { height: '0px', opacity: 0, transform: 'translateY(-8px)' }
          ],
          { duration: 240, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }
        );

        anim.onfinish = () => {
          mobile.classList.remove('is-open');
          mobile.style.display = 'none';
          mobile.style.height = '';
          mobile.style.opacity = '';
          mobile.style.transform = '';
        };
      }
    };

    burger.addEventListener('click', () => {
      const open = mobile.dataset.open === 'true';
      setMenuState(!open);
    });

    $$('.mobileInner a', mobile).forEach(link => {
      link.addEventListener('click', () => {
        if (mobile.dataset.open === 'true') setMenuState(false);
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 980 && mobile.dataset.open === 'true') {
        mobile.dataset.open = 'false';
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Menü öffnen');
        mobile.classList.remove('is-open');
        mobile.style.display = 'none';
        mobile.style.height = '';
        mobile.style.opacity = '';
        mobile.style.transform = '';
      }
    });
  }

  // subtle hero parallax on scroll
  const heroMedia = $('.heroMedia');
  if (hero && heroMedia && !reduceMotion) {
    let ticking = false;

    const updateHeroParallax = () => {
      const rect = hero.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
      const shift = Math.max(-26, Math.min(26, progress * -18));
      hero.style.setProperty('--hero-shift', `${shift}px`);
      ticking = false;
    };

    const queueHero = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateHeroParallax);
      }
    };

    window.addEventListener('scroll', queueHero, { passive: true });
    window.addEventListener('resize', queueHero);
    queueHero();
  }

  // Configurator (wizard)
  const calc = $('#calc');
  if (!calc) return;

  const PRICING = {
    basePerM2: { basic: 2500, standard: 3000, premium: 3550 },
    typeMod: { efh: 0.00, dh: -0.03, bw: 0.02 },
    roofMod: { sattel: 0.00, walm: 0.03, pult: 0.015, flach: 0.01 },
    energyMod: { basis: 0.00, effizient: 0.03, top: 0.06 },
    extras: {
      basement: { none: 0, teil: 680, voll: 920 },
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
  let prevTotal = null;

  const fmt = (n) => new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(n);

  const roundNice = (n) => Math.round(n / 1000) * 1000;

  const animateNumber = (el, from, to, ms = 520) => {
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

  const calcTotal = () => {
    const base = state.area * (PRICING.basePerM2[state.spec] || 0);
    const modsPct =
      (PRICING.typeMod[state.type] || 0) +
      (PRICING.roofMod[state.roof] || 0) +
      (PRICING.energyMod[state.energy] || 0);
    const mods = base * modsPct;

    let basementCost = 0;
    if (state.basement !== 'none') {
      const per = PRICING.extras.basement[state.basement] || 0;
      basementCost = state.basementArea * per;
    }

    const garageCost = PRICING.extras.garage[state.garage] || 0;

    return {
      base,
      modsPct,
      mods,
      basementCost,
      garageCost,
      total: roundNice(base + mods + basementCost + garageCost)
    };
  };

  const render = () => {
    steps.forEach((step, index) => step.classList.toggle('active', index === state.step));
    if (progress) progress.style.width = `${Math.round(((state.step + 1) / steps.length) * 100)}%`;

    $$('.choices', calc).forEach(group => {
      const key = group.dataset.key;
      if (!key) return;
      $$('.choice', group).forEach(btn => btn.classList.toggle('selected', btn.dataset.value === String(state[key])));
    });

    const area = $('#area');
    const areaOut = $('#areaOut');
    if (area) area.value = String(state.area);
    if (areaOut) areaOut.textContent = String(state.area);

    const basementArea = $('#bArea');
    const basementAreaOut = $('#bAreaOut');
    if (basementArea) basementArea.value = String(state.basementArea);
    if (basementAreaOut) basementAreaOut.textContent = String(state.basementArea);

    const basementBox = $('#basementAreaBox');
    if (basementBox) basementBox.hidden = state.basement === 'none';

    const result = calcTotal();
    const summary = {
      sumType: ({ efh: 'Einfamilienhaus', dh: 'Doppelhaus', bw: 'Bungalow' })[state.type],
      sumRoof: ({ sattel: 'Satteldach', walm: 'Walmdach', pult: 'Pultdach', flach: 'Flachdach' })[state.roof],
      sumArea: `${state.area} qm`,
      sumSpec: ({ basic: 'Einfach', standard: 'Standard', premium: 'Gehoben' })[state.spec],
      sumEnergy: ({ basis: 'Basis', effizient: 'Effizient', top: 'Premium' })[state.energy],
      sumBasement: state.basement === 'none' ? '–' : `${({ teil: 'Teil', voll: 'Voll' })[state.basement]} · ${state.basementArea} qm`,
      sumGarage: state.garage === 'none' ? '–' : (state.garage === 'single' ? 'Einzel' : 'Doppel'),
      sumTotal: fmt(result.total),
      sumMods: `${Math.round(result.modsPct * 100)}%`
    };

    Object.keys(summary).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = summary[id];
    });

    const miniMap = {
      miniType: summary.sumType,
      miniRoof: summary.sumRoof,
      miniArea: summary.sumArea,
      miniSpec: summary.sumSpec
    };

    Object.keys(miniMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = miniMap[id];
    });

    const totalEl = document.getElementById('sumTotal');
    const miniTotalEl = document.getElementById('miniTotalValue');
    const newTotal = result.total;

    if (prevTotal === null) {
      if (totalEl) totalEl.textContent = fmt(newTotal);
      if (miniTotalEl) miniTotalEl.textContent = fmt(newTotal);
      prevTotal = newTotal;
    } else if (prevTotal !== newTotal) {
      animateNumber(totalEl, prevTotal, newTotal, 520);
      animateNumber(miniTotalEl, prevTotal, newTotal, 520);
      prevTotal = newTotal;
    }

    const hiddenTotal = $('#calc_total');
    const hiddenSummary = $('#calc_summary');
    if (hiddenTotal) hiddenTotal.value = String(result.total);
    if (hiddenSummary) hiddenSummary.value = JSON.stringify({ ...state, ...result });
  };

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
  area?.addEventListener('input', () => {
    state.area = Number(area.value || 0);
    render();
  });

  const basementArea = $('#bArea');
  basementArea?.addEventListener('input', () => {
    state.basementArea = Number(basementArea.value || 0);
    render();
  });

  const next = $('[data-next]', calc);
  const prev = $('[data-prev]', calc);

  const jump = (n) => {
    state.step = Math.max(0, Math.min(steps.length - 1, n));
    render();

    const header = document.querySelector('.header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const y = calc.getBoundingClientRect().top + window.pageYOffset - headerHeight - 14;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  next?.addEventListener('click', () => jump(state.step + 1));
  prev?.addEventListener('click', () => jump(state.step - 1));

  render();
})();
