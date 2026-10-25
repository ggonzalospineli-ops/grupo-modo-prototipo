const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// Mapa de red: puntos de venta dentro de cada zona y estado en ruta
const svg = document.querySelector('.net-map');
const dots = document.querySelector('#pos-dots');
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
[['#zone-caba', 55], ['#zone-gba', 80]].forEach(([id, count]) => {
  const zone = document.querySelector(id), box = zone.getBBox();
  let placed = 0, tries = 0;
  while (placed < count && tries++ < 2000) {
    const x = box.x + rand() * box.width, y = box.y + rand() * box.height;
    const point = svg.createSVGPoint(); point.x = x; point.y = y;
    if (zone.isPointInFill && !zone.isPointInFill(point)) continue;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', '1.8');
    c.style.animationDelay = (rand() * 3.2).toFixed(2) + 's';
    dots.appendChild(c); placed++;
  }
});
if (reduceMotion) svg.pauseAnimations();

const statusText = document.querySelector('#map-status-text');
const phases = ['Ingreso de mercadería al hub', 'Preparación de pedidos', 'Salida de camionetas a CABA', 'Entregas en GBA Sur'];
let phase = 0;
if (!reduceMotion) setInterval(() => {
  statusText.style.opacity = 0;
  setTimeout(() => { phase = (phase + 1) % phases.length; statusText.textContent = phases[phase]; statusText.style.opacity = 1; }, 300);
}, 2600);

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
