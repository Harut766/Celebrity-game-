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

// ---------- мимика ----------
// Все части лица — группы в SVG (character.js). Выражение = какие глаза, рот и доп. слои показать.
const FACE_PARTS = [
  'eyesOpen', 'eyesBlink', 'eyesHappy', 'eyesWink', 'eyesDown', 'eyesHurt', 'eyesWide', 'eyesUp', 'eyesSquint', 'eyesDizzy', 'eyesCry',
  'mouthIdle', 'mouthSmirk', 'mouthLaugh', 'mouthYawn', 'mouthFrown', 'mouthHurt', 'mouthO', 'mouthTalk', 'mouthGrit', 'mouthWobble', 'mouthDisgust',
  'browsNormal', 'browsUp', 'browsSad', 'browsPinch', 'browsAngry', 'faceGreen', 'faceRed',
];
// brows — отдельный слой бровей (у модели Путина брови нарисованы внутри глаз, там браузер просто не найдёт эти id)
const EXPRESSIONS = {
  neutral:   { eyes: 'eyesOpen',   mouth: 'mouthIdle' },
  smirk:     { eyes: 'eyesOpen',   mouth: 'mouthSmirk',  brows: 'browsPinch' },
  sip:       { eyes: 'eyesBlink',  mouth: 'mouthO',      brows: 'browsUp' },
  reading:   { eyes: 'eyesDown',   mouth: 'mouthIdle' },
  laugh:     { eyes: 'eyesHappy',  mouth: 'mouthLaugh',  brows: 'browsUp' },
  wink:      { eyes: 'eyesWink',   mouth: 'mouthSmirk',  brows: 'browsUp' },
  yawn:      { eyes: 'eyesBlink',  mouth: 'mouthYawn',   brows: 'browsUp' },
  grumpy:    { eyes: 'eyesOpen',   mouth: 'mouthFrown',  brows: 'browsAngry' },
  suspicious:{ eyes: 'eyesSquint', mouth: 'mouthFrown',  brows: 'browsPinch' },
  surprised: { eyes: 'eyesWide',   mouth: 'mouthO',      brows: 'browsUp' },
  lookUp:    { eyes: 'eyesUp',     mouth: 'mouthO',      brows: 'browsUp' },
  dodge:     { eyes: 'eyesSquint', mouth: 'mouthGrit',   brows: 'browsPinch' },
  hurt:      { eyes: 'eyesHurt',   mouth: 'mouthHurt',   brows: 'browsPinch', extra: ['faceRed'] },
  angry:     { eyes: 'eyesOpen',   mouth: 'mouthGrit',   brows: 'browsAngry', extra: ['faceRed'] },
  dizzy:     { eyes: 'eyesDizzy',  mouth: 'mouthWobble', brows: 'browsSad' },
  cry:       { eyes: 'eyesCry',    mouth: 'mouthWobble', brows: 'browsSad' },
  disgust:   { eyes: 'eyesSquint', mouth: 'mouthDisgust', brows: 'browsPinch', extra: ['faceGreen'] },
};
let expr = EXPRESSIONS.neutral;
let talkOpen = false;
let blinking = false;

function renderFace() {
  const eyes = blinking && expr.eyes === 'eyesOpen' ? 'eyesBlink' : expr.eyes;
  // брови по умолчанию — обычные
  const brows = expr.brows || 'browsNormal';
  const on = new Set([eyes, brows, talkOpen ? 'mouthTalk' : expr.mouth, ...(expr.extra || [])]);
  for (const id of FACE_PARTS) {
    const n = document.getElementById(id);
    if (n) n.style.display = on.has(id) ? '' : 'none';
  }
}
function setFace(name) {
  expr = EXPRESSIONS[name] || EXPRESSIONS.neutral;
  renderFace();
}

// Тряска всего персонажа от удара.
function shake() {
  for (const el of [$('charSvg'), $('charImage'), $('idleVideo'), face]) {
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }
}

// Движение головы: кадры {r: градусы, x, y: в % ширины сцены}. Пятна на лице двигаются вместе с головой.
function headMove(frames, duration, easing = 'ease-in-out') {
  const svgUnit = 1080 / 100; // 1% ширины сцены в единицах SVG
  const head = document.getElementById('head');
  const f = (k) => ({ r: 0, x: 0, y: 0, ...k });
  const anims = [face.animate(frames.map(k => { k = f(k); return { transform: `translate(${k.x * U}px, ${k.y * U}px) rotate(${k.r}deg) translate(-50%, -50%)` }; }), { duration, easing })];
  if (head) anims.push(head.animate(frames.map(k => { k = f(k); return { transform: `translate(${k.x * svgUnit}px, ${k.y * svgUnit}px) rotate(${k.r}deg)` }; }), { duration, easing }));
  return Promise.all(anims.map(a => a.finished));
}

// Реакция: выражение лица + реплика голосом, потом снова спокойное лицо.
async function react(p, exprName, { quiet = false, hold = 900 } = {}) {
  setFace(exprName);
  if (quiet) await sleep(hold);
  else await say(armenianTwist(p));
  setFace('neutral');
}

// Если кинул зритель с армянской фамилией — с шансом говорит особую обиженную фразу
let currentHit = null;
let combo = 0, lastHitAt = 0;
function armenianTwist(p) {
  const a = config.armenian;
  if (currentHit?.armenian && a?.phrases?.length && Math.random() <= (a.chance ?? .7)) return { ...p, phrases: a.phrases };
  // Подарки идут подряд — умоляет пощадить
  const c = config.combo;
  if (combo >= (c?.from ?? 3) && c?.phrases?.length && Math.random() < (c.chance ?? .5)) return { ...p, phrases: c.phrases };
  return p;
}

// ---------- голос ----------
// Реплика: свой аудиофайл (phrases[].file) или встроенная озвучка браузера по тексту.
let speech = null;
// Проигрывание mp3 через Web Audio — тем же путём, что и звуки ударов/газеты
// (в браузере LIVE Studio <audio> бывает заблокирован, а Web Audio работает).
const clipCache = new Map();
async function playClip(url, volume = 1) {
  const a = ac();
  if (!a) throw new Error('нет Web Audio');
  if (!clipCache.has(url)) {
    clipCache.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error(`файл не найден (${r.status})`);
      return r.arrayBuffer();
    }).then(b => a.decodeAudioData(b)).catch(e => { clipCache.delete(url); throw e; }));
  }
  const buffer = await clipCache.get(url);
  const src = a.createBufferSource();
  const g = a.createGain(); g.gain.value = volume;
  src.buffer = buffer;
  src.connect(g).connect(a.destination);
  return { src, done: new Promise(res => { src.onended = res; src.start(); }) };
}

// Сообщения об ошибках звука — в Терминал игры (каждое один раз)
const reported = new Set();
function report(text) {
  if (reported.has(text)) return;
  reported.add(text);
  try { ws?.readyState === 1 && ws.send(JSON.stringify({ type: 'log', text })); } catch {}
}

function stopSpeech() {
  if (!speech) return;
  clearInterval(speech.lips); clearTimeout(speech.timer);
  speech.audio?.pause();
  try { speech.clip?.stop(); } catch {}
  if (speech.tts) window.speechSynthesis?.cancel();
  speech.bubble.remove();
  talkOpen = false; renderFace();
  speech.resolve();
  speech = null;
}

function pickRuVoice() {
  const list = window.speechSynthesis?.getVoices() || [];
  const want = config.voice?.ttsVoice;
  return list.find(v => want && v.name.includes(want))
    || list.find(v => v.lang?.toLowerCase().startsWith('ru') && /male|pavel|dmitr|maxim|yuri/i.test(v.name))
    || list.find(v => v.lang?.toLowerCase().startsWith('ru'))
    || null;
}

function say(p) {
  const phrases = p.phrases || [];
  if (!phrases.length || config.voice?.enabled === false) return sleep(900);
  stopSpeech();
  const line = phrases[Math.floor(Math.random() * phrases.length)];
  const v = config.voice || {};

  return new Promise(resolve => {
    const t = facePoint();
    const bubble = document.createElement('div');
    bubble.className = 'speech';
    bubble.textContent = line.text || '';
    bubble.style.left = t.x + 16 * U + 'px';
    bubble.style.top = t.y - 17 * U + 'px';
    if (line.text) stage.appendChild(bubble);

    // "Губы": рот открывается/закрывается, пока идёт реплика
    const lips = setInterval(() => { talkOpen = !talkOpen; renderFace(); }, 130);
    speech = { bubble, lips, resolve };
    // Реакция длится не меньше, чем нужно, чтобы прочитать облачко (даже если голоса нет)
    const minMs = 900 + 55 * (line.text || '').length;
    const started = performance.now();
    const finish = () => {
      const wait = Math.max(350, minMs - (performance.now() - started));
      setTimeout(() => { if (speech && speech.bubble === bubble) stopSpeech(); }, wait);
    };
    speech.timer = setTimeout(finish, 9000);

    if (line.file) {
      const mine = speech;
      playClip(line.file, v.volume ?? 1)
        .then(({ src, done }) => { if (speech === mine) mine.clip = src; else src.stop(); return done; })
        .then(finish)
        .catch(err => {
          report(`голос: не удалось через Web Audio ${line.file}: ${err.message}`);
          // запасной путь — обычный <audio>
          const audio = new Audio(line.file);
          audio.volume = v.volume ?? 1;
          mine.audio = audio;
          audio.onended = finish;
          audio.onerror = () => { report(`голос: файл не загружается ${line.file}`); finish(); };
          audio.play().catch(e => { report(`голос: браузер запретил звук (${e.name})`); finish(); });
        });
    } else if (v.tts !== false && window.speechSynthesis && line.text) {
      report(`голос: для фразы «${line.text}» нет mp3 — запустите npm run voices`);
      const u = new SpeechSynthesisUtterance(line.text);
      u.lang = 'ru-RU';
      const voice = pickRuVoice();
      if (voice) u.voice = voice;
      u.rate = v.rate ?? 1;
      u.pitch = v.pitch ?? .8;
      u.volume = v.volume ?? 1;
      u.onend = u.onerror = finish;
      speech.tts = true;
      window.speechSynthesis.speak(u);
    } else {
      finish();
    }
  });
}


// ---------- жизнь в покое ----------
// Пока никто не дарит: моргает, водит глазами, читает и листает газету, закидывает ногу на ногу,
// смеётся/злится/зевает над газетой и периодически что-то говорит.
let hitToken = 0;     // растёт при каждом ударе — прерывает начатые "покойные" действия
let idleBusy = false;
const isIdle = () => !playing && !speech && !idleBusy;

function lookAt(x, y) {
  const pupils = document.getElementById('pupils');
  if (pupils) pupils.style.transform = `translate(${x}px, ${y}px)`;
}

function blinkLoop() {
  setTimeout(async () => {
    blinking = true; renderFace();
    await sleep(120);
    blinking = false; renderFace();
    if (Math.random() < .2) { await sleep(160); blinking = true; renderFace(); await sleep(110); blinking = false; renderFace(); }
    blinkLoop();
  }, rand(2200, 5500));
}

function eyesLoop() {
  setTimeout(() => {
    if (isIdle() && expr === EXPRESSIONS.neutral) lookAt(rand(-6, 6), rand(-2, 3));
    eyesLoop();
  }, rand(1200, 3500));
}

const rustle = () => noise(.3, 4500, .12);

function paperMove(frames, duration) {
  const paper = document.getElementById('paper');
  if (!paper) return Promise.resolve();
  return paper.animate(frames.map(([y, r = 0]) => ({ transform: `translateY(${y}px) rotate(${r}deg)` })), { duration, easing: 'ease-in-out' }).finished;
}

async function flipPage() {
  const page = document.getElementById('page');
  if (!page) return;
  rustle();
  page.style.opacity = '1';
  await page.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }], { duration: 600, easing: 'ease-in-out' }).finished;
  page.style.opacity = '0';
}

let legsCrossed = false;
async function toggleLegs() {
  const normal = document.getElementById('legR');
  const crossed = document.getElementById('legRCrossed');
  if (!normal || !crossed) return;
  legsCrossed = !legsCrossed;
  const hide = legsCrossed ? normal : crossed;
  const show = legsCrossed ? crossed : normal;
  await headMove([{}, { y: -1 }, {}], 450);
  hide.style.display = 'none';
  show.style.display = '';
  show.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
}

// Реплика настроения из config.idle.moods (с шансом, чтобы не болтал без остановки)
async function moodLine(mood, chance = .6) {
  const phrases = config.idle?.moods?.[mood];
  if (phrases?.length && Math.random() < chance) await say({ phrases });
  else await sleep(1400);
}

const idleActions = [
  // читает: взгляд в газету, кивает по строчкам
  async function read(still) {
    setFace('reading');
    await headMove([{}, { y: .6 }, { r: -2, y: .7 }, { r: 2, y: .7 }, { y: .6 }], 2600);
    if (still()) await flipPage();
  },
  // вычитал что-то удивительное
  async function surprised(still) {
    setFace('reading');
    await headMove([{}, { y: .7 }, { y: .7 }], 1400);
    if (!still()) return;
    setFace('surprised'); rustle();
    paperMove([[0], [-12, -3], [-12, -3], [0]], 1600);
    await headMove([{ y: .7 }, { y: -1.2 }, { y: -1.2 }, {}], 900);
    if (still()) await moodLine('surprised');
  },
  // смеётся над газетой, плечи трясутся
  async function laugh(still) {
    setFace('reading');
    await sleep(900);
    if (!still()) return;
    setFace('laugh');
    const shake = [{}, { y: -.5 }, {}, { y: -.5 }, {}, { y: -.5 }, {}, { y: -.5 }, {}];
    paperMove([[0], [-4], [0], [-4], [0], [-4], [0]], 1400);
    await Promise.all([headMove(shake, 1400), moodLine('laugh', .8)]);
  },
  // злится на статью
  async function grumpy(still) {
    setFace('reading');
    await sleep(1000);
    if (!still()) return;
    setFace('grumpy'); rustle();
    paperMove([[0, 0], [0, -3], [0, 3], [0, -2], [0, 0]], 700);
    await headMove([{}, { r: -5 }, { r: 5 }, {}], 700);
    if (still()) await moodLine('grumpy');
  },
  // зевает
  async function yawn(still) {
    setFace('yawn');
    await headMove([{}, { r: -6, y: -1 }, { r: -6, y: -1 }, {}], 1800);
    if (still()) await moodLine('yawn', .5);
  },
  // опускает газету, подмигивает зрителям
  async function wink(still) {
    lookAt(0, 0); rustle();
    const down = paperMove([[0], [40], [40], [40], [0]], 2600);
    await sleep(500);
    if (!still()) return;
    setFace('wink');
    await moodLine('wink', .7);
    await down;
  },
  // подозрительно косится в камеру
  async function suspicious(still) {
    lookAt(-5, 0);
    setFace('suspicious');
    await headMove([{}, { r: 6, x: .8 }, { r: 6, x: .8 }, {}], 1800);
    if (still()) await moodLine('suspicious');
  },
  // оглядывается
  async function lookAround() {
    const side = Math.random() < .5 ? -1 : 1;
    lookAt(side * 6, 0);
    await headMove([{}, { r: side * 7, x: side * .6 }, { r: side * 7, x: side * .6 }, { r: -side * 5, x: -side * .4 }, {}], 2600);
  },
  // закидывает ногу на ногу / ставит обратно
  async function legs() { await toggleLegs(); },
  // перелистывает страницу
  async function flip() { setFace('reading'); await flipPage(); await sleep(500); },
  drinkTea,
  oneMinute,
];

// ---------- новые мемные действия ----------
async function drinkTea(still) {
  const glass = document.getElementById('teaGlass');
  if (!glass) return;
  lookAt(5, 3); setFace('smirk'); rustle();
  const paper = paperMove([[0], [34], [34], [34], [34], [0]], 3800);
  await sleep(500);
  if (!still()) return;
  const lift = 'translate(-190px, -615px)';
  const anim = glass.animate([
    { transform: 'translate(0, 0) rotate(0deg)' },
    { transform: `${lift} rotate(-8deg)`, offset: .3 },
    { transform: `${lift} rotate(-40deg)`, offset: .55 },
    { transform: `${lift} rotate(-8deg)`, offset: .75 },
    { transform: 'translate(0, 0) rotate(0deg)' },
  ], { duration: 2800, easing: 'ease-in-out' });
  setTimeout(() => { if (still()) { setFace('sip'); noise(.5, 1200, .12); } }, 900);
  setTimeout(() => { if (still()) setFace('smirk'); }, 1900);
  await anim.finished;
  await paper;
  if (still()) await moodLine('tea', .8);
}

async function oneMinute(still) {
  const hand = document.getElementById('fingerHand');
  if (!hand) return;
  lookAt(0, 0); setFace('grumpy');
  hand.style.opacity = '1';
  const wag = hand.animate([
    { transform: 'translateY(170px)', opacity: 0 },
    { transform: 'translateY(0) rotate(0deg)', opacity: 1, offset: .2 },
    { transform: 'rotate(-12deg)', offset: .35 }, { transform: 'rotate(12deg)', offset: .5 },
    { transform: 'rotate(-12deg)', offset: .65 }, { transform: 'rotate(0deg)', offset: .8 },
    { transform: 'translateY(170px)', opacity: 0 },
  ], { duration: 3600, easing: 'ease-in-out' }).finished;
  headMove([{}, { r: -5 }, { r: 5 }, { r: -5 }, {}], 1600);
  await Promise.all([wag, still() ? moodLine('oneMinute', 1) : null]);
  hand.style.opacity = '0';
}

// Зверьё во дворе (рисунки)
const CAT_SVG = `<svg viewBox="0 0 120 80" width="100%"><g class="bob">
  <path d="M22 52 Q10 34 6 16" stroke="#e08a2e" stroke-width="8" fill="none" stroke-linecap="round"/>
  <rect x="30" y="58" width="8" height="18" rx="3" fill="#e5892f"/><rect x="42" y="58" width="8" height="18" rx="3" fill="#f09a3a"/>
  <rect x="68" y="58" width="8" height="18" rx="3" fill="#e5892f"/><rect x="80" y="58" width="8" height="18" rx="3" fill="#f09a3a"/>
  <ellipse cx="56" cy="52" rx="34" ry="16" fill="#f09a3a"/>
  <path d="M38 42 q4 8 0 18 M52 38 q4 10 0 22 M66 38 q4 10 0 22" stroke="#c96f1c" stroke-width="3" fill="none"/>
  <circle cx="93" cy="38" r="16" fill="#f09a3a"/>
  <path d="M81 28 L84 10 L93 23Z M97 23 L105 10 L108 30Z" fill="#f09a3a"/><path d="M84 25 L86 16 L90 23Z" fill="#ffb8c0"/>
  <ellipse cx="89" cy="36" rx="2.6" ry="3.6" fill="#2a2a1a"/><ellipse cx="100" cy="36" rx="2.6" ry="3.6" fill="#2a2a1a"/>
  <path d="M95 42 l-3 -2 h6z" fill="#ff8fa0"/>
  <path d="M100 44 h14 M100 46 l13 4 M88 44 h-12 M88 46 l-11 4" stroke="#6b4a2c" stroke-width="1.2"/>
</g></svg>`;
const PIGEON_SVG = `<svg viewBox="0 0 100 60" width="100%">
  <path d="M70 30 L96 22 L92 38Z" fill="#6f7680"/>
  <ellipse cx="50" cy="32" rx="28" ry="15" fill="#8d95a0"/>
  <path d="M30 26 Q38 20 46 28" stroke="#5aa39a" stroke-width="5" fill="none"/>
  <circle cx="24" cy="24" r="11" fill="#7b838d"/><circle cx="21" cy="22" r="2.2" fill="#e85d2a"/><circle cx="21" cy="22" r="1" fill="#111"/>
  <path d="M13 24 L5 27 L13 28Z" fill="#e8b04a"/>
  <path class="flap" d="M40 28 Q55 0 78 8 Q66 22 56 30Z" fill="#a7aeb8"/>
</svg>`;
const CHICKEN_SVG = `<svg viewBox="0 0 90 90" width="100%"><g class="bob">
  <path d="M38 70 L34 88 M52 70 L56 88" stroke="#e8a33a" stroke-width="4"/>
  <path d="M8 40 Q2 24 16 22 Q12 34 22 40Z" fill="#e9e3d6"/>
  <ellipse cx="44" cy="52" rx="28" ry="22" fill="#fbf8f0"/>
  <path d="M30 50 Q44 40 56 52" stroke="#e2dccb" stroke-width="4" fill="none"/>
  <circle cx="68" cy="30" r="12" fill="#fbf8f0"/>
  <path d="M62 18 q2 -8 6 -2 q3 -8 6 0 q4 -6 5 3Z" fill="#e0312a"/>
  <path d="M79 30 L88 33 L79 36Z" fill="#e8a33a"/><path d="M74 38 q2 8 -2 10 q-4 -4 -1 -10Z" fill="#e0312a"/>
  <circle cx="71" cy="28" r="2" fill="#111"/>
</g></svg>`;

function spawnCritter(svg, widthU) {
  const el = document.createElement('div');
  el.className = 'critter';
  el.innerHTML = svg;
  el.style.width = widthU * U + 'px';
  $('critters').appendChild(el);
  return el;
}

async function catVisit(still) {
  const W = stage.clientWidth, H = stage.clientHeight, y = H * .96 - 15 * U;
  const cat = spawnCritter(CAT_SVG, 22);
  await cat.animate([{ transform: `translate(${-18 * U}px, ${y}px)` }, { transform: `translate(${18 * U}px, ${y}px)` }],
    { duration: 3000, fill: 'forwards' }).finished;
  cat.querySelector('.bob')?.classList.remove('bob');
  lookAt(-6, 4); setFace('smirk');
  headMove([{}, { r: -6, y: .5 }, { r: -6, y: .5 }, {}], 2400);
  if (still()) await moodLine('cat', .9);
  cat.querySelector('g')?.classList.add('bob');
  await cat.animate([{ transform: `translate(${18 * U}px, ${y}px)` }, { transform: `translate(${W + 18 * U}px, ${y}px)` }],
    { duration: 4500, fill: 'forwards' }).finished;
  cat.remove();
}

async function pigeonDrop(still) {
  const W = stage.clientWidth, H = stage.clientHeight, y = H * .17, t = facePoint();
  const bird = spawnCritter(PIGEON_SVG, 12);
  setFace('lookUp'); lookAt(4, -3);
  const fly = bird.animate([{ transform: `translate(${W + 12 * U}px, ${y}px)` }, { transform: `translate(${-16 * U}px, ${y - 6 * U}px)` }],
    { duration: 3600, easing: 'linear' });
  fly.finished.then(() => bird.remove());
  await sleep(1650);
  if (!still()) return;
  const drop = spawn('particle', '<svg viewBox="0 0 10 12" width="100%"><path d="M5 0 Q10 7 5 12 Q0 7 5 0Z" fill="#f2f2ea"/></svg>', 0, 0, 1);
  drop.style.width = 2 * U + 'px';
  await drop.animate([{ transform: `translate(${t.x}px, ${y + 4 * U}px)` }, { transform: `translate(${t.x}px, ${t.y - 15 * U}px)` }],
    { duration: 450, easing: 'ease-in' }).finished;
  drop.remove();
  noise(.2, 1500, .3); shake(); setFace('hurt');
  stain(`<path d="${blobPath(40, 8, .5)}" fill="#f4f4ee"/><circle cx="52" cy="48" r="9" fill="#cfcfc6"/>`, { dy: -14, dx: rand(-2, 2), sizeU: 9, drip: 3, life: 9000 });
  await sleep(500);
  setFace('disgust');
  headMove([{}, { r: -6 }, { r: 6 }, { r: -4 }, {}], 900);
  if (still()) await moodLine('pigeon', .95);
}

function chickenLoop() {
  setTimeout(async () => {
    const W = stage.clientWidth, H = stage.clientHeight, y = H * .955 - 10 * U;
    const ch = spawnCritter(CHICKEN_SVG, 10);
    const left = Math.random() < .5;
    if (!left) ch.style.scale = '-1 1';
    const from = left ? -12 * U : W + 2 * U, to = left ? W + 2 * U : -12 * U;
    await ch.animate([{ transform: `translate(${from}px, ${y}px)` }, { transform: `translate(${(from + to) / 2}px, ${y}px)`, offset: .45 },
      { transform: `translate(${(from + to) / 2}px, ${y}px)`, offset: .6 }, { transform: `translate(${to}px, ${y}px)` }],
      { duration: 9000, easing: 'linear' }).finished;
    ch.remove();
    chickenLoop();
  }, rand(15000, 35000));
}

const ambientEvents = [catVisit, pigeonDrop];
function ambientLoop() {
  setTimeout(async () => {
    if (isIdle()) {
      idleBusy = true;
      const tok = hitToken;
      const still = () => tok === hitToken;
      try { await ambientEvents[Math.floor(Math.random() * ambientEvents.length)](still); } catch {}
      if (still()) { setFace('neutral'); lookAt(0, 0); }
      idleBusy = false;
    }
    ambientLoop();
  }, rand(25000, 50000));
}

function actionsLoop() {
  setTimeout(async () => {
    if (isIdle()) {
      idleBusy = true;
      const tok = hitToken;
      const still = () => tok === hitToken;
      try { await idleActions[Math.floor(Math.random() * idleActions.length)](still); } catch {}
      if (still()) { setFace('neutral'); lookAt(0, 0); }
      idleBusy = false;
    }
    actionsLoop();
  }, rand(2500, 6000));
}

function talkLoop() {
  const every = (config.idle?.talkEverySec ?? 20) * 1000;
  if (!every || !config.idle?.phrases?.length) return;
  setTimeout(async () => {
    if (isIdle()) {
      idleBusy = true;
      const tok = hitToken;
      lookAt(0, 0);
      setFace('smirk');
      await say({ phrases: config.idle.phrases });
      if (tok === hitToken) setFace('neutral');
      idleBusy = false;
    }
    talkLoop();
  }, rand(every * .7, every * 1.3));
}

function startIdle() {
  if (config.idle?.enabled === false || !document.getElementById('head')) return;
  blinkLoop(); eyesLoop(); actionsLoop(); talkLoop(); ambientLoop(); chickenLoop();
}

// ---------- наказания ----------
// Каждое: предчувствие (лицо до удара) -> удар -> реакция + реплика.
const effects = {
  async egg(p, o) {
    setFace('surprised');
    headMove([{}, { r: -4, y: -1 }, { r: -4, y: -1 }], 650);
    await throwAt('🥚', 9, { arc: 25 });
    sfx.splat(); shake(); setFace('hurt');
    headMove([{ r: -4, y: -1 }, { r: 7, x: 1.5, y: 1 }, {}], 500, 'ease-out');
    stain(`<path d="${blobPath(46)}" fill="#fffaf0" opacity=".95"/><circle cx="${rand(42, 58)}" cy="${rand(42, 58)}" r="17" fill="#ffc21a"/><circle cx="46" cy="44" r="5" fill="#fff6c8"/>`,
      { dx: rand(-3, 3), dy: rand(-7, -3), sizeU: 17, drip: 6 });
    burst(['🥚'], 3, 3, { spread: 15, fall: 40 });
    floatText('ШЛЁП!', '#ffe14d', 8);
    await sleep(500);
    await react(p, 'angry', o);
  },

  async tomato(p, o) {
    // пытается увернуться
    setFace('dodge');
    headMove([{}, { r: -10, x: -3 }, { r: 8, x: 3 }, { r: -6, x: -2 }], 650);
    await throwAt('🍅', 10, { arc: 28 });
    sfx.splat(); shake(); setFace('hurt');
    stain(`<path d="${blobPath(48, 11, .45)}" fill="#d9261c" opacity=".92"/><g fill="#ffd9a0">${Array.from({ length: 6 }, () => `<ellipse cx="${rand(30, 70)}" cy="${rand(30, 70)}" rx="3" ry="2"/>`).join('')}</g>`,
      { dx: rand(-4, 4), dy: rand(-2, 3), sizeU: 19, drip: 8 });
    burst(['🍅', '💦'], 5, 3.5, { spread: 20, fall: 45 });
    floatText('ПЛЯХ!', '#ff5a4a', 8);
    await sleep(450);
    // мотает головой "нет-нет"
    setFace('angry');
    headMove([{}, { r: -8 }, { r: 8 }, { r: -8 }, { r: 8 }, {}], 900);
    await react(p, 'angry', o);
  },

  async watermelon(p, o) {
    setFace('surprised');
    headMove([{}, { r: 0, y: -2 }, { r: 0, y: -2 }], 800);
    await throwAt('🍉', 20, { arc: 20, duration: 800 });
    sfx.crunch(); shake(); setFace('hurt');
    headMove([{ y: -2 }, { r: -14, y: -4 }, { r: 5, y: 1 }, {}], 700, 'ease-out');
    stain(`<path d="${blobPath(49, 13, .5)}" fill="#e2323f" opacity=".9"/><g fill="#1b1b1b">${Array.from({ length: 9 }, () => `<ellipse cx="${rand(25, 75)}" cy="${rand(25, 75)}" rx="2.2" ry="3.5" transform="rotate(${rand(0, 180)} 50 50)"/>`).join('')}</g>`,
      { dy: 9, dx: rand(-3, 3), sizeU: 19, drip: 10, life: 9000 });
    stain(`<path d="${blobPath(45, 8, .5)}" fill="#c9202e" opacity=".85"/>`, { dy: 22, dx: rand(-6, 6), sizeU: 20, life: 9000 });
    burst(['🍉', '🍉', '💦'], 10, 7, { spread: 35, fall: 70, duration: 1300 });
    floatText('ХРЯСЬ!', '#ff4d6d', 10);
    await sleep(800);
    // плачет, плечи трясутся
    headMove([{}, { y: .6 }, {}, { y: .6 }, {}, { y: .6 }, {}], 1500);
    await react(p, 'cry', { ...o, hold: 1400 });
  },

  async brick(p, o) {
    const t = facePoint();
    setFace('lookUp');
    const el = spawn('proj', '🧱', 0, 0, 15);
    sfx.whoosh();
    await el.animate([
      { transform: `translate(${t.x}px, ${-20 * U}px) translate(-50%,-50%) rotate(-20deg)` },
      { transform: `translate(${t.x}px, ${t.y - 10 * U}px) translate(-50%,-50%) rotate(15deg)` },
    ], { duration: 550, easing: 'cubic-bezier(.5,0,1,1)' }).finished;
    sfx.bonk(); shake(); setFace('hurt');
    headMove([{}, { y: 2.5 }, {}], 300, 'ease-out');
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
    await sleep(250);
    // оглушён: глаза-спирали, голова ходит кругами, звёздочки
    setFace('dizzy');
    headMove([{}, { r: 9, x: 1 }, { r: 0, y: 1 }, { r: -9, x: -1 }, { r: 0, y: -.5 }, { r: 9, x: 1 }, {}], 1600);
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
    await react(p, 'dizzy', o);
  },

  async poop(p, o) {
    const t = facePoint();
    const bucket = spawn('proj', '🪣', 0, 0, 18);
    const top = t.y - 30 * U;
    setFace('lookUp');
    headMove([{}, { r: 0, y: -1.5 }, { r: 0, y: -1.5 }], 900);
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
    shake(); setFace('hurt');
    stain(`<path d="M5 45 Q10 5 50 8 Q90 5 95 45 L95 60 Q88 90 80 62 Q72 95 62 60 Q55 85 48 62 Q40 98 30 62 Q20 88 14 60 Q8 75 5 60Z" fill="#6b3f17" opacity=".96"/><path d="M25 25 Q50 12 75 25" stroke="#8d5a2b" stroke-width="5" fill="none"/>`,
      { dy: -17, sizeU: 29, rot: 0, drip: 4, life: 10000 });
    stain(`<path d="${blobPath(46, 10, .5)}" fill="#6b3f17" opacity=".9"/>`, { dy: 26, dx: rand(-5, 5), sizeU: 24, life: 10000 });
    burst(['💩', '💩', '🟤'], 12, 6, { spread: 30, fall: 55, duration: 1300 });
    floatText('ФУУУ!', '#b4ff5a', 10);
    await sleep(700);
    stream.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).finished.then(() => stream.remove());
    bucket.animate([{ opacity: 1 }, { opacity: 0, translate: `0 ${-30 * U}px` }], { duration: 500 }).finished.then(() => bucket.remove());
    // мухи
    for (let i = 0; i < 3; i++) {
      const fly = spawn('particle', '🪰', 0, 0, 3.5);
      const kf = Array.from({ length: 8 }, () => ({ transform: `translate(${t.x + rand(-18, 18) * U}px, ${t.y + rand(-22, 5) * U}px)` }));
      fly.animate(kf, { duration: 5000, iterations: 1, easing: 'ease-in-out' }).finished.then(() => fly.remove());
    }
    // противно: морщится и отряхивается
    setFace('disgust');
    headMove([{}, { r: -6, x: -1 }, { r: 6, x: 1 }, { r: -6, x: -1 }, { r: 6, x: 1 }, { r: -3 }, {}], 1000);
    await react(p, 'disgust', o);
  },
};

async function playEffect(p, opts = {}) {
  if (p.video) return playVideo(p.video);
  if (p.combo) {
    for (const id of p.combo) {
      const sub = byId[id];
      if (sub) await playEffect(sub, { quiet: true, hold: 500 });
      await sleep(200);
    }
    await react(p, 'cry', opts);
    return;
  }
  const run = effects[p.id] || effects.egg;
  return run(p, opts);
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
    const now = Date.now();
    combo = now - lastHitAt < 8000 ? combo + 1 : 1;
    lastHitAt = now;
    if (combo >= (config.combo?.from ?? 3)) setTimeout(() => floatText(`КОМБО ×${combo}!`, '#ffec3d', 9), 900);
    currentHit = hit;
    hitToken++;
    lookAt(0, 0);
    highlight(p.id);
    try { await playEffect(p); } catch (e) { console.error(e); }
    await sleep(250);
    currentHit = null;
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

// ---------- табличка цен: иконка подарка → наказание (как в примере) ----------
let giftIcons = {};

function giftIconFor(p) {
  const byName = (p.gifts || []).map(n => giftIcons[n.toLowerCase()]).find(Boolean);
  if (byName) return byName;
  return Object.values(giftIcons).find(g => g.coins === p.price) || null;
}

function renderLegend() {
  const list = [...config.punishments].sort((a, b) => a.price - b.price);
  const lang = config.legend?.lang || 'both';
  $('legendList').innerHTML = list.map(p => {
    const g = giftIconFor(p);
    const icon = g ? `<img src="${esc(g.url)}" alt="">` : esc(p.giftEmoji || p.emoji);
    const main = lang === 'arm' ? (p.titleArm || p.title) : p.title;
    const sub = lang === 'both' ? p.titleArm || '' : '';
    return `
    <li data-id="${esc(p.id)}">
      <span class="gift">${icon}</span>
      <span class="arrow">→</span>
      <span class="em">${p.emoji}</span>
      <span class="ttl">${esc(main)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      ${config.legend?.showPrice === false ? '' : `<span class="price">${p.price}🪙</span>`}
    </li>`;
  }).join('');
}

// ---------- главные обидчики ----------
function renderLeaders(list) {
  const el = $('leaders');
  if (config.leaders?.enabled === false || !list?.length) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div class="t">${esc(config.leaders?.title || '👑 Главные обидчики')}</div>` +
    list.slice(0, 3).map((r, i) => `<div class="r"><span>${['🥇', '🥈', '🥉'][i]}</span><span class="n">${esc(r.user)}</span><span class="c">${r.coins}🪙</span></div>`).join('');
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
    $('charSvg').innerHTML = window.defaultCharacterSvg(esc(c.name || ''), c.model);
  }
  face.style.left = c.faceX + '%';
  face.style.top = c.faceY + '%';

  renderLegend();
  const list = [...config.punishments].sort((a, b) => a.price - b.price);

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
    body: JSON.stringify({ coins: Number(btn.dataset.coins), user: $('testUser').value || 'Тест', repeatCount: Number($('testRepeat').value) || 1 }),
  });
});

let ws = null;
function connectWs() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'hit') enqueue(msg.hit);
    if (msg.type === 'leaders') renderLeaders(msg.leaders);
    if (msg.type === 'gifts') { giftIcons = msg.gifts || {}; renderLegend(); }
    if (msg.type === 'status') {
      $('status').textContent = msg.status.message;
      $('status').className = msg.status.connected ? 'ok' : '';
    }
  };
  ws.onopen = () => refreshConfig();
  ws.onclose = () => { $('status').textContent = 'Нет связи с сервером, переподключение…'; setTimeout(connectWs, 2000); };
}

// Подтягиваем свежие настройки (фразы, пути к озвучке, цены) без перезагрузки страницы
async function refreshConfig() {
  try {
    const fresh = await (await fetch('/api/config')).json();
    if (!fresh?.punishments) return;
    config = fresh;
    byId = Object.fromEntries(config.punishments.map(p => [p.id, p]));
    renderLegend();
  } catch {}
}

(async function init() {
  config = await (await fetch('/api/config')).json();
  try { giftIcons = await (await fetch('/api/gifts')).json(); } catch {}
  byId = Object.fromEntries(config.punishments.map(p => [p.id, p]));
  resize();
  renderScene();
  startIdle();
  connectWs();
  setInterval(refreshConfig, 60000);
})();
