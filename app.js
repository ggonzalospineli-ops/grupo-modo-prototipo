const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Revelado por scroll: títulos palabra por palabra, bloques con fundido y grupos escalonados
const splitWords = el => {
  let i = 0;
  const walk = node => [...node.childNodes].forEach(child => {
    if (child.nodeType === 3) {
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const w = document.createElement('span'); w.className = 'w';
        const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++); wi.textContent = part;
        w.append(wi); frag.append(w);
      });
      child.replaceWith(frag);
    } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
  });
  walk(el);
  el.classList.add('split');
};
const mark = (selector, type = '', delay = 0) => document.querySelectorAll(selector).forEach(el => {
  el.dataset.reveal = type; if (delay) el.style.setProperty('--d', delay + 's');
});
const stagger = (selector, step = .09, type = '') => document.querySelectorAll(selector).forEach(el => {
  const index = [...el.parentElement.children].filter(c => c.matches(selector)).indexOf(el);
  el.dataset.reveal = type; el.style.setProperty('--d', (index * step).toFixed(2) + 's');
});

document.querySelectorAll('main h1, main h2').forEach(h => { splitWords(h); h.dataset.reveal = ''; });
mark('.kicker', 'fade');
mark('.hero-copy > p:not(.kicker), .intro-bottom p, .section-top > p, .fleet-copy > p:not(.kicker), .coverage-copy > p:not(.kicker), .contact-intro > p:not(.kicker)', '', .15);
mark('.hero-actions, .under-link, .intro-tag, .contact-intro > span', '', .3);
mark('.hero-scene, .cov-card', 'zoom', .1);
mark('.fleet-photo', 'clip');
stagger('.hero-stats > span', .12);
stagger('.journey-step', .1);
stagger('.impact article', .08);
stagger('.coverage-stats > div', .1);
stagger('.partner', .12);
stagger('.contact form > *', .06);
document.querySelectorAll('.hero-stats, .intro-bottom, .journey-footer, .coverage-stats').forEach(el => { el.dataset.line = ''; });

const hero = document.querySelector('.hero');
hero.querySelector('.kicker').style.setProperty('--d', '0s');
hero.querySelector('h1').style.setProperty('--d', '.15s');
hero.querySelector('.hero-copy > p:not(.kicker)').style.setProperty('--d', '.55s');
hero.querySelector('.hero-actions').style.setProperty('--d', '.7s');
hero.querySelector('.hero-scene').style.setProperty('--d', '.35s');
hero.querySelectorAll('.hero-stats > span').forEach((s, i) => s.style.setProperty('--d', (.85 + i * .12) + 's'));

const revealTargets = document.querySelectorAll('[data-reveal], [data-line]');
if (reduceMotion || !('IntersectionObserver' in window)) revealTargets.forEach(el => el.classList.add('in'));
else {
  const revealer = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target }) => {
    if (isIntersecting) { revealer.reveal(target); revealer.unobserve(target); }
  }), { threshold: .12, rootMargin: '0px 0px -8% 0px' });
  // un elemento recortado con clip-path no cuenta como visible: se observa su contenedor
  const watched = new Map();
  revealTargets.forEach(el => {
    const node = el.dataset.reveal === 'clip' ? el.parentElement : el;
    watched.set(node, [...(watched.get(node) || []), el]);
    revealer.observe(node);
  });
  revealer.reveal = node => (watched.get(node) || [node]).forEach(el => el.classList.add('in'));
}

// Barra de progreso y navegación: se esconde al bajar, vuelve al subir, marca la sección actual
const progress = document.querySelector('.scroll-progress');
const nav = document.querySelector('.nav');
const navLinks = [...document.querySelectorAll('.nav nav a')];
let lastY = scrollY, ticking = false;
const onScroll = () => {
  const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  nav.classList.toggle('scrolled', y > 40);
  if (y > 300 && y > lastY + 4) nav.classList.add('hidden');
  else if (y < lastY - 4 || y <= 300) nav.classList.remove('hidden');
  lastY = y;
  let current = null;
  navLinks.forEach(a => { const sec = document.querySelector(a.getAttribute('href')); if (sec && sec.getBoundingClientRect().top < innerHeight * .4) current = a; });
  navLinks.forEach(a => a.classList.toggle('current', a === current));
  ticking = false;
};
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

// Recorrido del proceso: el paquete avanza etapa por etapa
const journey = document.querySelector('.journey');
const steps = [...document.querySelectorAll('.journey-step')];
const parcel = document.querySelector('.journey-parcel');
const line = document.querySelector('.journey-line');
const fill = line.querySelector('b');
const toggle = document.querySelector('.journey-toggle');
let current = 0, timer = null, playing = !reduceMotion;

const centerOf = step => { const dot = step.querySelector('span'); return step.offsetLeft + dot.offsetLeft + dot.offsetWidth / 2; };
function layout() {
  const first = centerOf(steps[0]), last = centerOf(steps[steps.length - 1]);
  line.style.left = first + 'px'; line.style.width = (last - first) + 'px';
  line.style.top = (steps[0].offsetTop + steps[0].querySelector('span').offsetTop + 27) + 'px';
  render();
}
function render() {
  steps.forEach((step, i) => { step.classList.toggle('active', i === current); step.classList.toggle('done', i < current); });
  parcel.style.left = centerOf(steps[current]) + 'px';
  fill.style.width = (centerOf(steps[current]) - centerOf(steps[0])) + 'px';
}
function go(i) { current = (i + steps.length) % steps.length; render(); }
function play() { clearInterval(timer); timer = setInterval(() => go(current + 1), 3000); playing = true; toggle.textContent = '❚❚ Pausar'; toggle.setAttribute('aria-pressed', 'false'); }
function pause() { clearInterval(timer); playing = false; toggle.textContent = '▶ Reanudar'; toggle.setAttribute('aria-pressed', 'true'); }

steps.forEach((step, i) => {
  step.addEventListener('click', () => { pause(); go(i); });
  step.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pause(); go(i); } });
});
toggle.addEventListener('click', () => playing ? pause() : play());
window.addEventListener('resize', layout);
document.fonts?.ready.then(layout);
layout();
if (!playing) pause();

// Solo avanza mientras la sección está en pantalla
new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) clearInterval(timer);
  else if (playing) play();
}, { threshold: .3 }).observe(journey);

// Hero: cada paquete que llega a un comercio dispara el aviso de entrega
const toast = document.querySelector('.scene-toast');
const toastPlace = document.querySelector('#toast-place');
const places = ['Almacén de barrio', 'Kiosco', 'Autoservicio', 'Despensa', 'Maxikiosco', 'Supermercado chino'];
let placeIdx = 0;
const deliver = () => {
  toastPlace.textContent = places[placeIdx++ % places.length];
  toast.classList.remove('pop'); void toast.offsetWidth; toast.classList.add('pop');
};
if (toast && !reduceMotion) document.querySelectorAll('.parcel-fly').forEach(p => {
  const schedule = () => setTimeout(deliver, 2180);
  p.addEventListener('animationstart', schedule);
  p.addEventListener('animationiteration', schedule);
});

// Cobertura: partidos clickeables, filtros y ruta desde el hub
const cov = document.querySelector('.cov-map');
if (cov) {
  const zonesEls = [...cov.querySelectorAll('.cov-zone')];
  const info = document.querySelector('.cov-info');
  const route = cov.querySelector('#cov-route');
  const van = cov.querySelector('.cov-van');
  const hub = cov.querySelector('.cov-hub').transform.baseVal[0].matrix;
  const filterEls = [...document.querySelectorAll('[data-filter]')];
  let vanAnim = null;

  const showZone = zone => {
    zonesEls.forEach(z => z.classList.toggle('sel', z === zone));
    const { name, loc, km, cx, cy } = zone.dataset;
    const isCaba = zone.dataset.zone === 'caba';
    info.innerHTML = `<span class="cov-badge ${zone.dataset.zone}">${isCaba ? 'CABA' : 'GBA SUR'} · COBERTURA ACTIVA</span><h3>${name}</h3><p>${loc}</p><div class="cov-km"><b>${km} km</b><span>desde el hub de Avellaneda</span></div>`;
    info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
    const mx = (hub.e + +cx) / 2, my = Math.min(hub.f, +cy) - 40;
    route.setAttribute('d', `M${hub.e} ${hub.f} Q${mx} ${my} ${cx} ${cy}`);
    vanAnim?.cancel();
    if (!reduceMotion && route.getTotalLength) {
      const len = route.getTotalLength();
      const frames = Array.from({ length: 31 }, (_, i) => { const p = route.getPointAtLength(len * i / 30); return { cx: p.x, cy: p.y }; });
      van.setAttribute('cx', cx); van.setAttribute('cy', cy);
      let i = 0;
      const id = setInterval(() => { const f = frames[i++ % 31]; van.setAttribute('cx', f.cx); van.setAttribute('cy', f.cy); }, 45);
      vanAnim = { id, cancel: () => clearInterval(id) };
    } else { van.setAttribute('cx', cx); van.setAttribute('cy', cy); }
  };
  const setFilter = f => {
    cov.classList.toggle('filtering', f !== 'all');
    zonesEls.forEach(z => z.classList.toggle('match', f === 'all' || z.dataset.zone === f));
    filterEls.forEach(el => el.classList.toggle('on', el.dataset.filter === f));
  };

  zonesEls.forEach(z => {
    z.addEventListener('click', () => showZone(z));
    z.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) showZone(z); });
    z.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showZone(z); } });
  });
  filterEls.forEach(el => {
    const run = () => {
      const f = el.dataset.filter, already = el.classList.contains('on') && f !== 'all';
      setFilter(already ? 'all' : f);
      if (!already && f !== 'all') showZone(zonesEls.find(z => z.dataset.zone === f));
    };
    el.addEventListener('click', run);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); } });
  });
  setFilter('all');
}

// Cifras: contador que sube al entrar en pantalla
const counters = [...document.querySelectorAll('[data-count]')];
const fmt = n => '+' + Math.round(n).toLocaleString('es-AR');
if (!reduceMotion && counters.length) {
  const io = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target }) => {
    if (!isIntersecting) return;
    io.unobserve(target);
    const end = +target.dataset.count, t0 = performance.now();
    const tick = now => { const p = Math.min((now - t0) / 1400, 1); target.textContent = fmt(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: .6 });
  counters.forEach(el => io.observe(el));
}

const form = document.querySelector('#contact-form');
form?.addEventListener('submit', event => { event.preventDefault(); document.querySelector('#form-status').textContent = 'Gracias. Tu consulta quedó lista para ser enviada por el canal comercial.'; });
document.querySelector('#year').textContent = new Date().getFullYear();
