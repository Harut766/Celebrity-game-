// Оверлей: получает удары по WebSocket, ставит их в очередь и проигрывает по одному.
const $ = id => document.getElementById(id);
const stage = $('stage');
const fx = $('fx');
const face = $('face');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const isTest = new URLSearchParams(location.search).has('test');

let config = null;
let byId = {};
const queue = [];
let playing = false;

// ---------- размеры ----------
let U = 5.4; // 1% ширины сцены в px
function resize() {
  U = stage.clientWidth / 100;
  stage.style.setProperty('--u', U + 'px');
}
window.addEventListener('resize', resize);

function facePoint() {
  const c = config.character;
  return { x: stage.clientWidth * c.faceX / 100, y: stage.clientHeight * c.faceY / 100 };
}

// ---------- звук (синтез, без файлов) ----------
let audio = null;
function ac() {
  if (!audio) { try { audio = new AudioContext(); } catch { return null; } }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}
function noise(duration, freq, gain = .5) {
  const a = ac(); if (!a) return;
  const buf = a.createBuffer(1, a.sampleRate * duration, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
function tone(from, to, duration, type = 'sine', gain = .4) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(); o.type = type;
  const g = a.createGain();
  o.frequency.setValueAtTime(from, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(to, a.currentTime + duration);
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, a.currentTime + duration);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + duration);
}
const sfx = {
  whoosh: () => noise(.25, 1800, .15),
  splat: () => { noise(.3, 900, .7); tone(220, 60, .2, 'sine', .3); },
  crunch: () => { noise(.4, 2500, .6); tone(160, 40, .3, 'square', .15); },
  bonk: () => { tone(420, 90, .35, 'triangle', .6); noise(.15, 3000, .3); },
  glug: () => { for (let i = 0; i < 6; i++) setTimeout(() => tone(rand(90, 160), 50, .18, 'sine', .4), i * 120); noise(1.2, 500, .4); },
};

// ---------- примитивы анимации ----------
function spawn(cls, html, x, y, sizeU, parent = fx) {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  el.style.fontSize = sizeU * U + 'px';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  parent.appendChild(el);
  return el;
}

// Бросок по дуге из-за края кадра в лицо.
async function throwAt(emoji, sizeU, { arc = 30, duration = 650 } = {}) {
  const t = facePoint();
  const fromLeft = Math.random() < .5;
  const s = { x: fromLeft ? -10 * U : stage.clientWidth + 10 * U, y: stage.clientHeight * rand(.55, .8) };
  const el = spawn('proj', emoji, 0, 0, sizeU);
  const frames = [];
  const spin = (fromLeft ? 1 : -1) * rand(360, 720);
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    const x = s.x + (t.x - s.x) * k;
    const y = s.y + (t.y - s.y) * k - Math.sin(Math.PI * k) * arc * U;
    frames.push({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${spin * k}deg) scale(${.6 + .6 * k})` });
  }
  sfx.whoosh();
  await el.animate(frames, { duration, easing: 'linear' }).finished;
  el.remove();
}

// Осколки/брызги разлетаются от точки и падают вниз.
function burst(emojis, count, sizeU, { spread = 30, fall = 60, duration = 1100 } = {}) {
  const t = facePoint();
  for (let i = 0; i < count; i++) {
    const e = emojis[i % emojis.length];
    const el = spawn('particle', e, 0, 0, sizeU * rand(.5, 1));
    const dx = rand(-spread, spread) * U;
    const up = rand(5, 20) * U;
    const dy = fall * U;
    el.animate([
      { transform: `translate(${t.x}px, ${t.y}px) translate(-50%,-50%) rotate(0)`, opacity: 1 },
      { transform: `translate(${t.x + dx * .5}px, ${t.y - up}px) translate(-50%,-50%) rotate(${rand(-180, 180)}deg)`, opacity: 1, offset: .3 },
      { transform: `translate(${t.x + dx}px, ${t.y + dy}px) translate(-50%,-50%) rotate(${rand(-540, 540)}deg)`, opacity: 0 },
    ], { duration: duration * rand(.8, 1.2), easing: 'cubic-bezier(.3,.1,.7,1)' }).finished.then(() => el.remove());
  }
}

// Случайная клякса в SVG.
function blobPath(r, spikes = 9, jitter = .35) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rr = r * (i % 2 ? rand(1 - jitter, 1) : rand(.55, .8));
    pts.push([50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr]);
  }
  return 'M' + pts.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L') + 'Z';
}

// Пятно на лице (остаётся на несколько секунд). dx/dy/size — в % ширины сцены.
function stain(svgInner, { dx = 0, dy = 0, sizeU = 18, rot = rand(0, 360), life = 8000, drip = 0 } = {}) {
  const el = document.createElement('div');
  el.className = 'stain';
  const w = sizeU * U;
  Object.assign(el.style, {
    width: w + 'px', height: w + 'px',
    left: `calc(50% + ${dx * U - w / 2}px)`, top: `calc(50% + ${dy * U - w / 2}px)`,
  });
  el.innerHTML = `<svg viewBox="0 0 100 100" style="transform: rotate(${rot}deg)">${svgInner}</svg>`;
  face.appendChild(el);
  el.animate([{ transform: 'scale(.3)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 220 });
  if (drip) el.animate([{ translate: '0 0' }, { translate: `0 ${drip * U}px` }], { duration: life, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => { el.classList.add('fade'); setTimeout(() => el.remove(), 2100); }, life);
}

function floatText(text, color = '#fff', sizeU = 9) {
  const t = facePoint();
  const el = spawn('float', `<b style="color:${color};-webkit-text-stroke:${U * .5}px #000;font-family:Impact,Arial Black,sans-serif">${text}</b>`, 0, 0, sizeU);
  el.animate([
    { transform: `translate(${t.x}px, ${t.y - 10 * U}px) translate(-50%,-50%) scale(.3) rotate(-10deg)`, opacity: 0 },
    { transform: `translate(${t.x}px, ${t.y - 18 * U}px) translate(-50%,-50%) scale(1.2) rotate(-6deg)`, opacity: 1, offset: .25 },
    { transform: `translate(${t.x}px, ${t.y - 26 * U}px) translate(-50%,-50%) scale(1) rotate(-4deg)`, opacity: 0 },
  ], { duration: 1200, easing: 'ease-out' }).finished.then(() => el.remove());
}

// Реакция персонажа: тряска + зажмуренные глаза.
function hurt(ms = 900) {
  for (const el of [$('charSvg'), $('charImage'), $('idleVideo'), face]) {
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }
  const show = (id, v) => { const n = document.getElementById(id); if (n) n.style.display = v ? '' : 'none'; };
  show('eyesOpen', false); show('eyesHurt', true); show('mouthIdle', false); show('mouthHurt', true);
  clearTimeout(hurt.t);
  hurt.t = setTimeout(() => { show('eyesOpen', true); show('eyesHurt', false); show('mouthIdle', true); show('mouthHurt', false); }, ms);
}

// ---------- наказания ----------
const effects = {
  async egg() {
    await throwAt('🥚', 9, { arc: 25 });
    sfx.splat(); hurt();
    stain(`<path d="${blobPath(46)}" fill="#fffaf0" opacity=".95"/><circle cx="${rand(42, 58)}" cy="${rand(42, 58)}" r="17" fill="#ffc21a"/><circle cx="46" cy="44" r="5" fill="#fff6c8"/>`,
      { dx: rand(-3, 3), dy: rand(-7, -3), sizeU: 17, drip: 6 });
    burst(['🥚'], 3, 3, { spread: 15, fall: 40 });
    floatText('ШЛЁП!', '#ffe14d', 8);
    await sleep(500);
  },

  async tomato() {
    await throwAt('🍅', 10, { arc: 28 });
    sfx.splat(); hurt();
    stain(`<path d="${blobPath(48, 11, .45)}" fill="#d9261c" opacity=".92"/><g fill="#ffd9a0">${Array.from({ length: 6 }, () => `<ellipse cx="${rand(30, 70)}" cy="${rand(30, 70)}" rx="3" ry="2"/>`).join('')}</g>`,
      { dx: rand(-4, 4), dy: rand(-2, 3), sizeU: 19, drip: 8 });
    burst(['🍅', '💦'], 5, 3.5, { spread: 20, fall: 45 });
    floatText('ПЛЯХ!', '#ff5a4a', 8);
    await sleep(500);
  },

  async watermelon() {
    await throwAt('🍉', 20, { arc: 20, duration: 800 });
    sfx.crunch(); hurt(1400);
    stain(`<path d="${blobPath(49, 13, .5)}" fill="#e2323f" opacity=".9"/><g fill="#1b1b1b">${Array.from({ length: 9 }, () => `<ellipse cx="${rand(25, 75)}" cy="${rand(25, 75)}" rx="2.2" ry="3.5" transform="rotate(${rand(0, 180)} 50 50)"/>`).join('')}</g>`,
      { dy: 0, sizeU: 26, drip: 10, life: 9000 });
    stain(`<path d="${blobPath(45, 8, .5)}" fill="#c9202e" opacity=".85"/>`, { dy: 22, dx: rand(-6, 6), sizeU: 20, life: 9000 });
    burst(['🍉', '🍉', '💦'], 10, 7, { spread: 35, fall: 70, duration: 1300 });
    floatText('ХРЯСЬ!', '#ff4d6d', 10);
    await sleep(900);
  },

  async brick() {
    const t = facePoint();
    const el = spawn('proj', '🧱', 0, 0, 15);
    sfx.whoosh();
    await el.animate([
      { transform: `translate(${t.x}px, ${-20 * U}px) translate(-50%,-50%) rotate(-20deg)` },
      { transform: `translate(${t.x}px, ${t.y - 10 * U}px) translate(-50%,-50%) rotate(15deg)` },
    ], { duration: 550, easing: 'cubic-bezier(.5,0,1,1)' }).finished;
    sfx.bonk(); hurt(1800);
    floatText('БАМ!', '#ffb02e', 11);
    const side = Math.random() < .5 ? -1 : 1;
    el.animate([
      { transform: `translate(${t.x}px, ${t.y - 10 * U}px) translate(-50%,-50%) rotate(15deg)` },
      { transform: `translate(${t.x + side * 25 * U}px, ${t.y - 25 * U}px) translate(-50%,-50%) rotate(${side * 200}deg)`, offset: .35 },
      { transform: `translate(${t.x + side * 45 * U}px, ${stage.clientHeight + 20 * U}px) translate(-50%,-50%) rotate(${side * 500}deg)` },
    ], { duration: 1100, easing: 'ease-in' }).finished.then(() => el.remove());
    // шишка
    stain(`<ellipse cx="50" cy="50" rx="30" ry="24" fill="#e0785e"/><ellipse cx="44" cy="44" rx="10" ry="7" fill="#ffb49e"/>`,
      { dy: -11, dx: rand(-4, 4), sizeU: 10, rot: 0, life: 9000 });
    // звёздочки вокруг головы
    const stars = ['⭐', '💫', '⭐', '💫'].map(s => spawn('particle', s, 0, 0, 5));
    const start = performance.now();
    await new Promise(done => {
      (function orbit(now) {
        const k = (now - start) / 1600;
        stars.forEach((s, i) => {
          const a = k * Math.PI * 4 + (i / stars.length) * Math.PI * 2;
          s.style.transform = `translate(${t.x + Math.cos(a) * 16 * U}px, ${t.y - 16 * U + Math.sin(a) * 4 * U}px) translate(-50%,-50%)`;
          s.style.opacity = String(Math.min(1, 3 * (1 - k)));
        });
        if (k < 1) requestAnimationFrame(orbit); else { stars.forEach(s => s.remove()); done(); }
      })(start);
    });
  },

  async poop() {
    const t = facePoint();
    const bucket = spawn('proj', '🪣', 0, 0, 18);
    const top = t.y - 30 * U;
    await bucket.animate([
      { transform: `translate(${t.x}px, ${-20 * U}px) translate(-50%,-50%) rotate(0)` },
      { transform: `translate(${t.x}px, ${top}px) translate(-50%,-50%) rotate(0)` },
    ], { duration: 500, easing: 'ease-out' }).finished;
    bucket.style.transform = `translate(${t.x}px, ${top}px) translate(-50%,-50%) rotate(0)`;
    await bucket.animate([
      { transform: `translate(${t.x}px, ${top}px) translate(-50%,-50%) rotate(0)` },
      { transform: `translate(${t.x}px, ${top}px) translate(-50%,-50%) rotate(160deg)` },
    ], { duration: 400, easing: 'ease-in', fill: 'forwards' }).finished;
    sfx.glug();
    // поток
    const stream = document.createElement('div');
    Object.assign(stream.style, {
      position: 'absolute', left: t.x - 6 * U + 'px', top: top + 'px', width: 12 * U + 'px', height: '0px',
      background: 'linear-gradient(90deg,#4a2c10,#7a4a1c,#4a2c10)', borderRadius: 6 * U + 'px',
    });
    fx.appendChild(stream);
    await stream.animate([{ height: '0px' }, { height: 45 * U + 'px' }], { duration: 350, fill: 'forwards' }).finished;
    hurt(2500);
    stain(`<path d="M5 45 Q10 5 50 8 Q90 5 95 45 L95 60 Q88 90 80 62 Q72 95 62 60 Q55 85 48 62 Q40 98 30 62 Q20 88 14 60 Q8 75 5 60Z" fill="#6b3f17" opacity=".96"/><path d="M25 25 Q50 12 75 25" stroke="#8d5a2b" stroke-width="5" fill="none"/>`,
      { dy: -8, sizeU: 30, rot: 0, drip: 12, life: 10000 });
    stain(`<path d="${blobPath(46, 10, .5)}" fill="#6b3f17" opacity=".9"/>`, { dy: 26, dx: rand(-5, 5), sizeU: 24, life: 10000 });
    burst(['💩', '💩', '🟤'], 12, 6, { spread: 30, fall: 55, duration: 1300 });
    floatText('ФУУУ!', '#b4ff5a', 10);
    await sleep(900);
    stream.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).finished.then(() => stream.remove());
    bucket.animate([{ opacity: 1 }, { opacity: 0, translate: `0 ${-30 * U}px` }], { duration: 500 }).finished.then(() => bucket.remove());
    // мухи
    for (let i = 0; i < 3; i++) {
      const fly = spawn('particle', '🪰', 0, 0, 3.5);
      const kf = Array.from({ length: 8 }, () => ({ transform: `translate(${t.x + rand(-18, 18) * U}px, ${t.y + rand(-22, 5) * U}px)` }));
      fly.animate(kf, { duration: 5000, iterations: 1, easing: 'ease-in-out' }).finished.then(() => fly.remove());
    }
    await sleep(600);
  },
};

async function playEffect(p) {
  if (p.video) return playVideo(p.video);
  if (p.combo) {
    for (const id of p.combo) {
      const sub = byId[id];
      if (sub) await playEffect(sub);
      await sleep(250);
    }
    return;
  }
  const run = effects[p.id] || effects.egg;
  return run();
}

function playVideo(src) {
  const v = $('punishVideo');
  return new Promise(resolve => {
    const done = () => { clearTimeout(timer); v.hidden = true; v.onended = v.onerror = null; resolve(); };
    const timer = setTimeout(done, 20000);
    v.onended = v.onerror = done;
    v.src = src; v.hidden = false;
    v.play().catch(() => { v.muted = true; v.play().catch(done); });
  });
}

// ---------- очередь ----------
function enqueue(hit) {
  if (queue.length >= (config.maxQueue || 50)) return;
  queue.push(hit);
  updateQueue();
  if (!playing) playNext();
}

function updateQueue() {
  const q = $('queue');
  q.hidden = queue.length === 0;
  q.textContent = `В очереди: ${queue.length}`;
}

async function playNext() {
  const hit = queue.shift();
  updateQueue();
  if (!hit) { playing = false; $('banner').hidden = true; return; }
  playing = true;
  const p = byId[hit.punishmentId];
  if (p) {
    showBanner(hit, p);
    highlight(p.id);
    try { await playEffect(p); } catch (e) { console.error(e); }
    await sleep(250);
  }
  playNext();
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function showBanner(hit, p) {
  const b = $('banner');
  const n = hit.total > 1 ? ` ${hit.index}/${hit.total}` : '';
  b.innerHTML = `<b>${esc(hit.user)}</b> → ${p.emoji} ${esc(p.title)}${n}`;
  b.hidden = false;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
}

function highlight(id) {
  document.querySelectorAll('#legendList li').forEach(li => {
    li.classList.toggle('active', li.dataset.id === id);
    if (li.dataset.id === id) { li.style.animation = 'none'; void li.offsetWidth; li.style.animation = ''; }
  });
}

// ---------- инициализация ----------
function renderScene() {
  const c = config.character;
  $('legendTitle').textContent = c.name || '';
  if (c.idleVideo) {
    const v = $('idleVideo'); v.src = c.idleVideo; v.hidden = false; v.play().catch(() => {});
    $('charSvg').innerHTML = '';
  } else if (c.image) {
    $('charImage').src = c.image; $('charImage').hidden = false;
    $('charSvg').innerHTML = '';
  } else {
    $('charSvg').innerHTML = window.defaultCharacterSvg(esc(c.name || ''));
  }
  face.style.left = c.faceX + '%';
  face.style.top = c.faceY + '%';

  const list = [...config.punishments].sort((a, b) => a.price - b.price);
  $('legendList').innerHTML = list.map(p => `
    <li data-id="${esc(p.id)}">
      <span class="em">${p.emoji}</span>
      <span class="ttl">${esc(p.title)}<small>${esc(p.titleArm || '')}</small></span>
      <span class="price">${p.price} 🪙</span>
    </li>`).join('');

  if (isTest) {
    $('testPanel').hidden = false;
    $('testButtons').innerHTML = list.map(p => `<button data-coins="${p.price}">${p.emoji} ${p.price}</button>`).join('');
  }
}

$('testButtons').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  ac();
  fetch('/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coins: Number(btn.dataset.coins), user: 'Тест', repeatCount: Number($('testRepeat').value) || 1 }),
  });
});

function connectWs() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'hit') enqueue(msg.hit);
    if (msg.type === 'status') {
      $('status').textContent = msg.status.message;
      $('status').className = msg.status.connected ? 'ok' : '';
    }
  };
  ws.onclose = () => { $('status').textContent = 'Нет связи с сервером, переподключение…'; setTimeout(connectWs, 2000); };
}

(async function init() {
  config = await (await fetch('/api/config')).json();
  byId = Object.fromEntries(config.punishments.map(p => [p.id, p]));
  resize();
  renderScene();
  connectWs();
})();
