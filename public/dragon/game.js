// «Давид против Вишапа» — оверлей для TikTok LIVE.
// Сервер считает урон и жизнь дракона, здесь — только зрелище: анимации, звук, голос.
(function () {
  const $ = id => document.getElementById(id);
  const { sceneSvg, dragonSvg, WARRIOR_SVG, riderSvg, CROWN_SVG, THEMES } = window.DragonArt;
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const stage = $('stage'), canvas = $('fx'), ctx = canvas.getContext('2d');
  const isTest = new URLSearchParams(location.search).has('test');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = n => Math.max(0, Math.round(n)).toLocaleString('ru-RU');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ease = { out: t => 1 - (1 - t) ** 3, inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2, in: t => t * t * t, lin: t => t };

  let config = null;
  let D = {};
  let giftIcons = {};

  // ---------- масштаб под окно ----------
  let fitScale = 1;
  function fit() {
    fitScale = Math.min(innerWidth / W, innerHeight / H);
    const x = (innerWidth - W * fitScale) / 2, y = (innerHeight - H * fitScale) / 2;
    stage.style.setProperty('--fit', `translate(${x}px, ${y}px) scale(${fitScale})`);
    stage.style.transform = 'var(--fit)';
  }
  addEventListener('resize', fit);

  function shake(big = false) {
    stage.classList.remove('shake', 'bigShake');
    void stage.offsetWidth;
    stage.classList.add(big ? 'bigShake' : 'shake');
  }
  function flash(color = '#fff', peak = .8, ms = 350) {
    const el = $('flash');
    el.style.background = color;
    el.animate([{ opacity: peak }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }

  // ---------- звук (синтез Web Audio) ----------
  let audio = null, master = null;
  function ac() {
    if (!audio) {
      try { audio = new AudioContext(); master = audio.createGain(); master.connect(audio.destination); } catch { return null; }
    }
    if (audio.state === 'suspended') audio.resume();
    master.gain.value = D.volume ?? 1;
    return audio;
  }
  const soundsOn = () => D.sounds !== false && ac();
  function noise(dur, { type = 'lowpass', freq = 1000, to = null, q = 1, gain = .5, attack = .005, delay = 0, curve = 2 } = {}) {
    if (!soundsOn()) return;
    const a = audio, t = a.currentTime + delay;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, curve);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    src.connect(f).connect(g).connect(master); src.start(t);
  }
  function tone(from, to, dur, { type = 'sine', gain = .4, delay = 0, attack = .005 } = {}) {
    if (!soundsOn()) return;
    const a = audio, t = a.currentTime + delay;
    const o = a.createOscillator(); o.type = type;
    const g = a.createGain();
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
  }
  function roarSound(dur = 1.6, pitch = 1, vol = .7) {
    if (!soundsOn()) return;
    const a = audio, t = a.currentTime;
    const out = a.createGain();
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + .15);
    out.gain.setValueAtTime(vol, t + dur * .6); out.gain.exponentialRampToValueAtTime(.001, t + dur);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 3;
    const am = a.createGain(); am.gain.value = .6;
    const lfo = a.createOscillator(); lfo.frequency.value = 31; const lg = a.createGain(); lg.gain.value = .4;
    lfo.connect(lg).connect(am.gain);
    am.connect(lp).connect(out).connect(master);
    for (const [mul, type] of [[1, 'sawtooth'], [1.49, 'sawtooth'], [.5, 'square']]) {
      const o = a.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(75 * pitch * mul, t);
      o.frequency.linearRampToValueAtTime(120 * pitch * mul, t + dur * .3);
      o.frequency.linearRampToValueAtTime(55 * pitch * mul, t + dur);
      o.connect(am); o.start(t); o.stop(t + dur + .1);
    }
    lfo.start(t); lfo.stop(t + dur + .1);
    noise(dur, { type: 'bandpass', freq: 500, to: 300, q: .8, gain: vol * .5, attack: .2, curve: .7 });
  }
  const sfx = {
    bow: () => noise(.18, { type: 'bandpass', freq: 3200, to: 1200, q: 2, gain: .25 }),
    thud: () => { tone(260, 80, .16, { type: 'triangle', gain: .35 }); noise(.12, { freq: 1600, gain: .25 }); },
    clang: () => { tone(1250, 900, .18, { type: 'square', gain: .08 }); tone(1870, 1500, .25, { gain: .1 }); noise(.15, { type: 'highpass', freq: 3000, gain: .2 }); },
    whoosh: () => noise(.5, { type: 'bandpass', freq: 400, to: 1400, q: 1, gain: .35, attack: .2, curve: 1 }),
    boom: (v = .9) => { noise(1.3, { freq: 900, to: 120, gain: v }); tone(110, 28, .8, { gain: v * .8 }); },
    gallop: n => { for (let i = 0; i < n; i++) for (const k of [0, .09, .16]) tone(520, 260, .05, { type: 'triangle', gain: .18, delay: i * .32 + k }); },
    thunder: () => { noise(.18, { type: 'highpass', freq: 1800, gain: .9 }); noise(2.8, { freq: 260, to: 80, gain: .9, attack: .05, curve: 1.2, delay: .05 }); },
    slash: () => noise(.35, { type: 'bandpass', freq: 5000, to: 900, q: 3, gain: .5 }),
    fire: (d = 2.6) => { noise(d, { type: 'bandpass', freq: 500, to: 1500, q: .7, gain: .7, attack: .3, curve: .6 }); noise(d, { freq: 200, gain: .6, attack: .2, curve: .8 }); },
    horn: () => { for (const [f, d] of [[147, 0], [220, .05]]) tone(f, f * .98, 1.6, { type: 'sawtooth', gain: .16, delay: d, attack: .15 }); },
    fanfare: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .3, { type: 'sawtooth', gain: .12, delay: i * .14 })); [523, 659, 784, 1046].forEach(f => tone(f, f * .995, 1.6, { type: 'triangle', gain: .12, delay: .6, attack: .02 })); },
    coin: () => tone(rand(1700, 2300), 2600, .09, { gain: .08 }),
    heal: () => [660, 880, 1100].forEach((f, i) => tone(f, f, .25, { gain: .12, delay: i * .1 })),
    heart: () => { tone(70, 40, .16, { gain: .6 }); tone(70, 40, .16, { gain: .45, delay: .2 }); },
    pop: () => tone(500, 900, .08, { type: 'triangle', gain: .12 }),
    crit: () => { tone(880, 1760, .25, { type: 'square', gain: .1 }); tone(1320, 2640, .3, { gain: .12, delay: .05 }); },
  };

  // ---------- голос (mp3 из npm run voices) ----------
  const clipCache = new Map();
  async function playClip(url, monster) {
    const a = ac();
    if (!a) throw new Error('нет Web Audio');
    if (!clipCache.has(url)) {
      clipCache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(`файл не найден (${r.status})`); return r.arrayBuffer(); })
        .then(b => a.decodeAudioData(b)).catch(e => { clipCache.delete(url); throw e; }));
    }
    const buffer = await clipCache.get(url);
    const src = a.createBufferSource();
    src.buffer = buffer;
    let tail = src;
    if (monster) {
      // Голос дракона: ниже, с хрипотцой и эхом
      src.playbackRate.value = .93;
      const shaper = a.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
      shaper.curve = curve;
      const low = a.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 220; low.gain.value = 6;
      src.connect(shaper).connect(low);
      const delay = a.createDelay(); delay.delayTime.value = .11;
      const fb = a.createGain(); fb.gain.value = .22;
      const wet = a.createGain(); wet.gain.value = .3;
      low.connect(delay).connect(fb).connect(delay);
      delay.connect(wet).connect(master);
      tail = low;
    }
    const g = a.createGain(); g.gain.value = 1.15;
    tail.connect(g).connect(master);
    return new Promise(res => { src.onended = res; src.start(); });
  }

  let ws = null;
  const reported = new Set();
  function report(text) {
    if (reported.has(text)) return;
    reported.add(text);
    try { ws?.readyState === 1 && ws.send(JSON.stringify({ type: 'log', text })); } catch {}
  }

  let speaking = null;
  function say(list, { force = false } = {}) {
    const phrases = D.phrases?.[list];
    if (!phrases?.length || (speaking && !force)) return Promise.resolve();
    const line = pick(phrases);
    const bubble = $('speech');
    const head = markerPos('mHead');
    bubble.textContent = line.text;
    bubble.hidden = false;
    bubble.style.left = clamp(head.x - 260, 20, 520) + 'px';
    bubble.style.top = clamp(head.y - 190, 470, 900) + 'px';
    bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
    const token = {};
    speaking = token;
    rig.talk = true;
    const minMs = 1100 + 55 * line.text.length;
    const started = performance.now();
    let voice;
    if (line.file) voice = playClip('/' + line.file, true).catch(e => report(`голос: ${line.file}: ${e.message}`));
    else {
      report(`голос: для фразы «${line.text}» нет mp3 — запустите npm run voices`);
      voice = new Promise(res => {
        if (!window.speechSynthesis) return res();
        const u = new SpeechSynthesisUtterance(line.text);
        u.lang = 'ru-RU'; u.pitch = .3; u.rate = .9;
        const v = speechSynthesis.getVoices().find(x => x.lang?.startsWith('ru'));
        if (v) u.voice = v;
        u.onend = u.onerror = res;
        speechSynthesis.speak(u);
        setTimeout(res, 9000);
      });
    }
    return voice.then(() => sleep(Math.max(300, minMs - (performance.now() - started)))).then(() => {
      if (speaking !== token) return;
      speaking = null;
      rig.talk = false;
      bubble.hidden = true;
    });
  }
  function announce(list) {
    const phrases = D.announcer?.[list];
    if (!phrases?.length) return Promise.resolve();
    const line = pick(phrases);
    if (!line.file) return Promise.resolve();
    return playClip('/' + line.file, false).catch(e => report(`голос диктора: ${line.file}: ${e.message}`));
  }

  // ---------- дракон ----------
  $('scene').innerHTML = sceneSvg();
  $('dragon').innerHTML = dragonSvg();
  const part = id => document.getElementById(id);
  const R = {
    all: part('dAll'), neckHead: part('dNeckHead'), head: part('dHead'), jaw: part('dJaw'), mouth: part('dMouth'),
    wingNear: part('dWingNear'), wingFar: part('dWingFar'), tail: part('dTail'), lid: part('dLid'), brow: part('dBrow'),
    eyeX: part('dEyeX'), pupil: part('dPupil'),
    wounds: [['dWoundsBody', .7], ['dWoundsNeck', .5], ['dWoundsHead', .35], ['dWoundsWing', .22]].map(([id, at]) => [part(id), at]),
  };
  const rig = {
    t: 0, head: 0, headTo: 0, jaw: 0, jawTo: 0, flinch: 0, shake: 0, wingSpeed: 1, wingAmp: 1,
    bodyY: 0, bodyRot: 0, opacity: 1, scale: 1, blink: 0, nextBlink: 2, angry: 0, dead: false, talk: false, lookTo: 0, nextLook: 4,
  };
  function rigUpdate(dt) {
    const r = rig;
    r.t += dt;
    if ((r.nextLook -= dt) <= 0) { r.lookTo = rand(-10, 8); r.nextLook = rand(2.5, 6); }
    const talkJaw = r.talk ? (Math.sin(r.t * 17) * .5 + .5) * 9 : 0;
    r.head += (r.headTo + r.lookTo * (r.headTo ? 0 : 1) + Math.sin(r.t * .9) * 2 - r.head) * Math.min(1, dt * 5);
    r.jaw += (Math.max(r.jawTo, talkJaw) - r.jaw) * Math.min(1, dt * 14);
    r.flinch *= Math.exp(-dt * 5);
    r.shake *= Math.exp(-dt * 7);
    const wing = Math.sin(r.t * 1.7 * r.wingSpeed) * 7 * r.wingAmp;
    const breath = Math.sin(r.t * 1.9) * .012;
    const sx = Math.sin(r.t * 70) * r.shake;
    R.all.setAttribute('transform',
      `translate(${sx.toFixed(2)} ${r.bodyY.toFixed(1)}) rotate(${r.bodyRot.toFixed(2)} 600 905) translate(600 905) scale(${r.scale.toFixed(3)} ${(r.scale * (1 + breath)).toFixed(4)}) translate(-600 -905)`);
    R.neckHead.setAttribute('transform', `rotate(${(Math.sin(r.t * .7) * 2 + r.flinch * .4).toFixed(2)} 540 560)`);
    R.head.setAttribute('transform', `rotate(${(r.head + r.flinch).toFixed(2)} 360 300)`);
    R.jaw.setAttribute('transform', `rotate(${(-r.jaw).toFixed(2)} 362 345)`);
    R.mouth.setAttribute('opacity', clamp(r.jaw / 12, 0, 1).toFixed(2));
    R.wingNear.setAttribute('transform', `rotate(${wing.toFixed(2)} 640 470)`);
    R.wingFar.setAttribute('transform', `rotate(${(-wing * .8).toFixed(2)} 590 470)`);
    R.tail.setAttribute('transform', `rotate(${(Math.sin(r.t * 1.1) * 3).toFixed(2)} 830 640)`);
    R.brow.setAttribute('transform', `rotate(${(-r.angry * 14).toFixed(2)} 265 266)`);
    if ((r.nextBlink -= dt) <= 0) { r.blink = 1; r.nextBlink = rand(2.5, 6); }
    if (r.blink > 0) r.blink = Math.max(0, r.blink - dt * 7);
    const lid = r.dead ? 0 : Math.sin(r.blink * Math.PI);
    R.lid.style.transform = `scaleY(${lid.toFixed(3)})`;
    R.eyeX.setAttribute('opacity', r.dead ? 1 : 0);
    R.pupil.setAttribute('opacity', r.dead ? 0 : 1);
    $('dragon').style.opacity = r.opacity;
  }

  // Точка внутри дракона (метки mHead, mChest…) в координатах сцены
  function markerPos(id) {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - s.left) / fitScale, y: (r.top + r.height / 2 - s.top) / fitScale };
  }
  const HIT_SPOTS = ['mChest', 'mBody', 'mBody', 'mNeck', 'mHead', 'mWing', 'mChest'];
  function hitPoint(id = pick(HIT_SPOTS), spread = 40) {
    const p = markerPos(id);
    return { x: p.x + rand(-spread, spread), y: p.y + rand(-spread, spread) };
  }

  function hurtDragon(power = 1) {
    rig.flinch = Math.min(18, rig.flinch + 5 * power);
    rig.shake = Math.min(14, rig.shake + 4 * power);
    rig.angry = 1;
    const el = $('dragon');
    el.classList.add('hurt');
    setTimeout(() => el.classList.remove('hurt'), 70 + 40 * power);
  }

  let themeIdx = 0;
  function applyTheme(level) {
    themeIdx = (level - 1) % THEMES.length;
    const t = THEMES[themeIdx];
    for (const k of ['sc1', 'sc2', 'bl1', 'bl2', 'wg1', 'wg2', 'eye', 'glow', 'spike']) stage.style.setProperty(`--${k}`, t[k]);
    rig.scale = 1 + Math.min(level - 1, 6) * .025;
  }

  // ---------- картинки для холста ----------
  function svgImage(svg) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return img;
  }
  const IMG = { warrior: svgImage(WARRIOR_SVG), knight: svgImage(riderSvg()), david: svgImage(riderSvg({ hero: true })) };

  const avatarCache = new Map();
  function avatar(p) {
    const key = p.avatar || `@${p.user}`;
    if (avatarCache.has(key)) return avatarCache.get(key);
    const entry = { img: null, color: `hsl(${[...(p.user || '?')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 60% 42%)`, letter: [...(p.user || '?').trim()][0]?.toUpperCase() || '?' };
    if (p.avatar) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => { entry.img = img; };
      img.src = p.avatar;
    }
    avatarCache.set(key, entry);
    return entry;
  }
  function drawAvatar(a, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.closePath(); ctx.clip();
    if (a.img) ctx.drawImage(a.img, x - r, y - r, r * 2, r * 2);
    else {
      ctx.fillStyle = a.color; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(r * 1.1)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.letter, x, y + r * .05);
    }
    ctx.restore();
  }
  function avatarHtml(p, cls = 'ava') {
    if (p.avatar) return `<img class="${cls}" src="${esc(p.avatar)}" referrerpolicy="no-referrer" alt="">`;
    const a = avatar(p);
    return `<div class="${cls}" style="background:${a.color}">${esc(a.letter)}</div>`;
  }

  // Светящиеся «спрайты» для огня и искр (кэш по цвету)
  const glowCache = new Map();
  function glow(color) {
    if (glowCache.has(color)) return glowCache.get(color);
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, '#fff'); grad.addColorStop(.25, color); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  }

  // ---------- частицы ----------
  const parts = [];
  function emit(p) { if (parts.length < 1400) parts.push({ age: 0, g: 0, drag: 0, rot: 0, vr: 0, ...p }); }
  function sparks(x, y, n, { color = '#ffd86a', speed = 600, life = .5, size = 3 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(.3, 1) * speed;
      emit({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.5, 1) * life, size, color, g: 900, drag: 1.5 });
    }
  }
  function explosion(x, y, scale = 1) {
    const fire = THEMES[themeIdx].glow;
    for (let i = 0; i < 26 * scale; i++) {
      const a = rand(0, TAU), v = rand(80, 420) * scale;
      emit({ type: 'fire', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rand(.4, .9), size: rand(30, 70) * scale, color: i % 3 ? fire : '#ffd23a', drag: 2.5 });
    }
    for (let i = 0; i < 10 * scale; i++) emit({ type: 'smoke', x: x + rand(-30, 30), y: y + rand(-30, 30), vx: rand(-60, 60), vy: rand(-120, -30), life: rand(1, 2), size: rand(30, 60) * scale, drag: 1 });
    for (let i = 0; i < 12 * scale; i++) emit({ type: 'debris', x, y, vx: rand(-500, 500), vy: rand(-700, -100), life: rand(.8, 1.4), size: rand(5, 12), g: 1600, rot: rand(0, TAU), vr: rand(-10, 10), color: '#3a2a22' });
    emit({ type: 'ring', x, y, life: .45, size: 160 * scale, color: '#ffe0a0' });
    sparks(x, y, 18 * scale, { speed: 900 * scale });
  }
  function bolt(x1, y1, x2, y2, { color = '#8ad8ff', width = 6, life = .35, branches = 3 } = {}) {
    const pts = [[x1, y1]];
    const n = 14;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([x1 + (x2 - x1) * t + rand(-45, 45), y1 + (y2 - y1) * t + rand(-12, 12)]);
    }
    pts.push([x2, y2]);
    emit({ type: 'bolt', pts, life, color, size: width });
    for (let b = 0; b < branches; b++) {
      const [bx, by] = pick(pts.slice(2, -2));
      const bp = [[bx, by]];
      for (let i = 1; i < 5; i++) bp.push([bx + rand(-30, 30) * i, by + rand(15, 40) * i]);
      emit({ type: 'bolt', pts: bp, life: life * .8, color, size: width * .5 });
    }
  }
  function confetti(x, y, n = 60) {
    const colors = ['#d90012', '#0033a0', '#f2a800', '#ffffff', '#ffd86a'];
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * .9, -Math.PI * .1), v = rand(400, 1100);
      emit({ type: 'confetti', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(2.2, 3.5), size: rand(10, 18), g: 700, drag: 1.4, rot: rand(0, TAU), vr: rand(-12, 12), color: pick(colors) });
    }
  }
  function coins(x, y, n = 80) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * .85, -Math.PI * .15), v = rand(500, 1300);
      emit({ type: 'coin', x: x + rand(-60, 60), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1.8, 3), size: rand(14, 22), g: 1500, drag: .3, rot: rand(0, TAU), vr: rand(6, 14) });
    }
  }
  function firework(x, y) {
    const color = pick(['#ffd86a', '#ff5a3a', '#5ab8ff', '#9aff6a', '#ff7ae0', '#ffffff']);
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * TAU, v = rand(260, 420);
      emit({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1, 1.5), size: 4, color, g: 260, drag: 1.6 });
    }
    noise(.6, { freq: 1400, gain: .35, delay: 0 });
  }

  const texts = [];
  function floatText(x, y, text, { color = '#fff', size = 46, life = 1.1, stroke = '#000' } = {}) {
    texts.push({ x, y, text, color, size, life, age: 0, stroke });
  }

  // ---------- воины (зрители) ----------
  const SLOTS = [];
  [[1400, .9, 7], [1510, 1.02, 7], [1628, 1.14, 6], [1752, 1.27, 6], [1880, 1.4, 5]].forEach(([y, s, n], row) => {
    for (let i = 0; i < n; i++) {
      const x = 80 + (i + .5) * (920 / n) + (row % 2 ? 30 : -12) + Math.sin(i * 7.3 + row) * 14;
      if (x < 160 && y < 1580) continue; // хачкар
      SLOTS.push({ x, y: y + Math.sin(i * 3.1) * 8, s, used: null });
    }
  });
  const warriors = new Map();
  const userKey = p => p.login || p.user;
  function ensureWarrior(p, { vip = false } = {}) {
    const key = userKey(p);
    let w = warriors.get(key);
    if (w && w.state !== 'flee') {
      if (p.avatar && !w.p.avatar) { w.p.avatar = p.avatar; w.ava = avatar(p); }
      if (vip) w.vip = true;
      return w;
    }
    const max = Math.min(D.maxWarriors || 40, SLOTS.length);
    let free = SLOTS.filter(s => !s.used);
    if (!free.length || warriors.size >= max) {
      const oldest = [...warriors.values()].filter(x => x.state !== 'flee').sort((a, b) => (a.vip - b.vip) || (a.seen - b.seen))[0];
      if (oldest) leave(oldest);
      free = SLOTS.filter(s => !s.used);
      if (!free.length) return null;
    }
    const slot = pick(free);
    w = { key, p: { ...p }, ava: avatar(p), slot, x: slot.x, y: slot.y, s: slot.s, pop: 0, hop: 0, alpha: 1, state: 'in', vip, phase: rand(0, TAU), seen: performance.now(), vx: 0 };
    slot.used = w;
    warriors.set(key, w);
    for (let i = 0; i < 6; i++) emit({ type: 'smoke', x: slot.x + rand(-30, 30), y: slot.y - 10, vx: rand(-60, 60), vy: rand(-60, -10), life: .7, size: 26 * slot.s, drag: 2 });
    sfx.pop();
    return w;
  }
  function leave(w, burned = false) {
    w.state = 'flee';
    w.vx = (w.x < W / 2 ? -1 : 1) * rand(380, 520);
    w.burned = burned;
    if (w.slot) w.slot.used = null;
    w.slot = null;
  }
  function handPos(w) { return { x: w.x + 34 * w.s, y: w.y - 100 * w.s }; }

  function updateWarriors(dt) {
    for (const w of warriors.values()) {
      if (w.state === 'in') { w.pop = Math.min(1, w.pop + dt * 4); if (w.pop >= 1) w.state = 'idle'; }
      if (w.hop > 0) w.hop = Math.max(0, w.hop - dt * 3);
      if (w.state === 'flee') {
        w.x += w.vx * dt; w.alpha -= dt * .7;
        if (w.burned && Math.random() < .5) emit({ type: 'smoke', x: w.x, y: w.y - 60 * w.s, vx: rand(-20, 20), vy: -80, life: .8, size: 20, drag: 1 });
        if (w.alpha <= 0 || w.x < -100 || w.x > W + 100) warriors.delete(w.key);
      }
    }
  }
  function drawWarriors(now) {
    const list = [...warriors.values()].sort((a, b) => a.y - b.y);
    for (const w of list) {
      const s = w.s * ease.out(w.pop);
      if (s <= .01) continue;
      const bob = Math.sin(now * 3 + w.phase) * 2 * s;
      const hop = -Math.sin(w.hop * Math.PI) * 22 * s;
      const run = w.state === 'flee' ? Math.abs(Math.sin(now * 18)) * -8 : 0;
      const x = w.x, y = w.y + bob + hop + run;
      ctx.globalAlpha = clamp(w.alpha, 0, 1);
      if (w.vip) ctx.drawImage(glow('rgba(255,200,80,.55)'), x - 80 * s, y - 170 * s, 160 * s, 160 * s);
      ctx.save();
      if (w.vx < 0) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
      if (w.burned) ctx.filter = 'brightness(.35)';
      ctx.drawImage(IMG.warrior, x - 50 * s, y - 130 * s, 100 * s, 130 * s);
      ctx.restore();
      const hx = x, hy = y - 110 * s, r = 25 * s;
      drawAvatar(w.ava, hx, hy, r);
      ctx.lineWidth = 4 * s; ctx.strokeStyle = w.vip ? '#ffd86a' : '#c9a04a';
      ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke();
      ctx.lineWidth = 8 * s; ctx.strokeStyle = w.vip ? '#e8c35a' : '#8a8f99';
      ctx.beginPath(); ctx.arc(hx, hy, r + 2 * s, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      ctx.fillStyle = w.vip ? '#d90012' : '#7a1010';
      ctx.beginPath(); ctx.moveTo(hx - 4 * s, hy - r - 4 * s); ctx.lineTo(hx, hy - r - 18 * s); ctx.lineTo(hx + 4 * s, hy - r - 4 * s); ctx.fill();
      const name = [...w.p.user].slice(0, 11).join('');
      ctx.font = `bold ${Math.round(15 + 5 * s)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(name, x, y + 4);
      ctx.fillStyle = w.vip ? '#ffd86a' : '#fff'; ctx.fillText(name, x, y + 4);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- снаряды и прочие движущиеся объекты ----------
  const ents = [];
  function addEnt(e) { ents.push(e); return e; }

  // Полёт по дуге: возвращает promise, который выполняется в момент попадания
  function flyArc({ from, to, dur, arc = 120, draw, trail, spin = 0 }) {
    return new Promise(resolve => {
      let t = 0, rot = 0;
      const pos = k => ({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - arc * 4 * k * (1 - k) });
      addEnt({
        update(dt) {
          t += dt / dur; rot += spin * dt;
          if (trail) { const p = pos(Math.min(t, 1)); trail(p.x, p.y); }
          if (t >= 1) { resolve(); return false; }
          return true;
        },
        draw() {
          const k = Math.min(t, 1), p = pos(k), q = pos(Math.min(1, k + .02));
          draw(p.x, p.y, spin ? rot : Math.atan2(q.y - p.y, q.x - p.x));
        },
      });
    });
  }
  function drawArrow(x, y, a, len = 64, color = '#c8a060') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = '#e8eef4'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.fill();
    ctx.fillStyle = '#d90012'; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-len - 10, -8); ctx.lineTo(-len + 8, 0); ctx.lineTo(-len - 10, 8); ctx.fill();
    ctx.restore();
  }
  function drawSpear(x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = '#eef2f8'; ctx.strokeStyle = '#6a6e76'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-4, -10); ctx.lineTo(-10, 0); ctx.lineTo(-4, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d90012'; ctx.fillRect(-16, -5, 6, 10);
    ctx.restore();
  }
  function drawBoulder(x, y, rot, r = 40) {
    ctx.drawImage(glow(THEMES[0].glow), x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const g = ctx.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r);
    g.addColorStop(0, '#9a7a6a'); g.addColorStop(1, '#3a2620');
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = r * (.85 + (i % 3) * .07); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff9a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * .4, -r * .2); ctx.lineTo(r * .1, r * .1); ctx.lineTo(r * .3, -r * .3); ctx.stroke();
    ctx.restore();
  }
  function drawTag(p, x, y, color = '#ffd86a') {
    const a = avatar(p);
    drawAvatar(a, x, y, 24);
    ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.stroke();
    ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(p.user, x, y + 28);
    ctx.fillStyle = color; ctx.fillText(p.user, x, y + 28);
  }

  // ---------- полоса жизни ----------
  const hp = { level: 1, cur: 1, max: 1, latest: null };
  function renderHp(flashBar = false) {
    const frac = clamp(hp.cur / hp.max, 0, 1);
    $('hpFill').style.width = (frac * 100).toFixed(2) + '%';
    $('hpGhost').style.width = (frac * 100).toFixed(2) + '%';
    $('hpText').textContent = `${fmt(hp.cur)} / ${fmt(hp.max)}`;
    $('dragonLevel').textContent = `УР. ${hp.level} · ${THEMES[themeIdx].name}`;
    $('hpFinish').style.left = ((D.likesFinishLimit ?? .1) * 100) + '%';
    if (flashBar) { const b = $('hpBar'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
    for (const [el, at] of R.wounds) el.setAttribute('opacity', frac < at ? .9 : 0);
    rig.wingAmp = frac < .25 ? .6 : 1;
    renderNote();
  }
  let lastHero = null;
  function renderNote() {
    const note = $('hpNote');
    const finish = hp.cur > 0 && hp.cur <= Math.ceil(hp.max * (D.likesFinishLimit ?? .1));
    note.classList.toggle('alert', finish);
    note.textContent = finish
      ? '🛡️ Лайками не добить! Добей подарком — стань Героем эфира!'
      : lastHero ? `👑 Последний герой: ${lastHero.user} · последний удар = корона` : '👑 Последний удар — Герой эфира';
  }
  function applyDamage(ev, share, last) {
    if (ev.level !== hp.level) return;
    hp.cur = last ? Math.min(hp.cur, ev.hpAfter) : Math.max(ev.hpAfter, hp.cur - share);
    renderHp(true);
  }
  function noteLatest(ev) {
    hp.latest = { level: ev.next?.level ?? ev.level, hp: ev.next?.hp ?? ev.hpAfter ?? ev.hp, max: ev.next?.maxHp ?? ev.maxHp };
  }

  // ---------- табличка подарков, топ, надписи ----------
  function attacks() { return [...(D.attacks || [])].sort((a, b) => a.price - b.price); }
  function renderHotbar() {
    $('dragonName').textContent = `🐉 ${D.nameArm || 'Վիշապ'} · ${D.name || 'Вишап'}`;
    $('hotbar').innerHTML = attacks().map(a => {
      const icon = (a.gifts || []).map(g => giftIcons[g.toLowerCase()]).find(Boolean);
      const gift = icon ? `<img src="${esc(icon.url)}" alt="">` : esc(a.giftEmoji || '🎁');
      return `<li data-id="${esc(a.id)}" class="${a.price >= 299 ? 'top' : ''}"><div class="gift">${gift}</div><span class="atk">${esc(a.emoji)}</span>
        <div class="name">${esc(a.title)}</div><div class="price">🪙${a.price}</div></li>`;
    }).join('');
  }
  function popHotbar(id) {
    const li = $('hotbar').querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!li) return;
    li.classList.remove('pop'); void li.offsetWidth; li.classList.add('pop');
  }
  function renderLeaders(list) {
    if (!list?.length) { $('leaders').innerHTML = ''; return; }
    $('leaders').innerHTML = `<h3>⚔️ Топ урона</h3>` + list.map((r, i) =>
      `<div class="row ${i === 0 ? 'first' : ''}">${avatarHtml(r)}<span class="nm">${['🥇', '🥈', '🥉'][i] || ''} ${esc(r.user)}</span><span class="dm">${fmt(r.damage)}</span></div>`).join('');
  }
  let bannerTimer = null;
  function banner(big, sub, p, color = '#ffd86a', ms = 3000) {
    const el = $('banner');
    el.style.setProperty('--bc', color);
    el.innerHTML = `<div class="big">${esc(big)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}${p ? `<div class="who">${avatarHtml(p)}<span>${esc(p.user)}</span></div>` : ''}`;
    el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { el.hidden = true; }, ms);
  }
  function toast(html) {
    const box = $('toasts');
    while (box.children.length >= 4) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = html;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }
  let hintIdx = 0;
  function rotateHint() {
    const hints = D.hints || [];
    if (!hints.length) return;
    const el = $('hint');
    el.style.opacity = 0;
    setTimeout(() => { el.textContent = hints[hintIdx++ % hints.length]; el.style.opacity = 1; }, 500);
  }

  // ---------- очередь зрелищ ----------
  // Мелкие удары летят параллельно, большие (Давид, метеоры, победа) — по одному.
  const queue = [];
  let pumping = false, inflight = 0, busy = false;
  function enqueue(task) {
    queue.push(task);
    // Если зрелищ накопилось слишком много — выбрасываем мелкие (урон уже засчитан на сервере)
    while (queue.length > 40) {
      const i = queue.findIndex(t => !t.blocking);
      if (i < 0) break;
      queue[i].skip?.();
      queue.splice(i, 1);
    }
    pump();
  }
  async function pump() {
    if (pumping) return;
    pumping = true;
    while (queue.length) {
      const task = queue.shift();
      if (task.blocking) {
        while (inflight > 0) await sleep(50);
        busy = true;
        try { await task.run(); } catch (e) { console.error(e); }
        busy = false;
      } else {
        inflight++;
        task.run().catch(console.error).finally(() => { inflight--; });
        await sleep(queue.length > 8 ? 120 : task.gap ?? 300);
      }
    }
    pumping = false;
  }
  const idle = () => !busy && !queue.length && inflight === 0;

  // ---------- удары ----------
  async function volley(ev, { draw, dur, arc, power, sound, hitSound, spot }) {
    const w = ensureWarrior(ev, { vip: ev.coins >= 30 });
    const n = Math.max(1, ev.count || 1);
    const share = ev.damage / n;
    const shots = [];
    for (let i = 0; i < n; i++) {
      if (w) w.hop = 1;
      const from = w ? handPos(w) : { x: rand(100, 980), y: 1700 };
      const to = hitPoint(spot);
      sound();
      shots.push(flyArc({ from, to, dur: dur * rand(.9, 1.1), arc, draw }).then(() => {
        hitSound();
        sparks(to.x, to.y, 10 + power * 6, { speed: 400 + power * 200 });
        hurtDragon(power);
        const last = i === n - 1;
        applyDamage(ev, share, last);
        floatText(to.x + rand(-20, 20), to.y - 30, `-${fmt(last && ev.crit ? ev.damage : share)}`, { color: '#ffe0a0', size: 40 + power * 8 });
        if (last && ev.crit) critText(to);
      }));
      await sleep(120);
    }
    await Promise.all(shots);
  }
  function critText(at) {
    sfx.crit();
    floatText(at.x, at.y - 110, 'КРИТ ×2!', { color: '#ffd23a', size: 74, life: 1.6, stroke: '#7a1a00' });
    sparks(at.x, at.y, 30, { color: '#fff3a0', speed: 900 });
  }

  const ATTACKS = {
    arrow: ev => volley(ev, { draw: (x, y, a) => drawArrow(x, y, a), dur: .7, arc: 160, power: .6, sound: sfx.bow, hitSound: sfx.thud }),
    spear: ev => volley(ev, { draw: drawSpear, dur: .8, arc: 120, power: 1, sound: sfx.whoosh, hitSound: sfx.clang }),
    async boulder(ev) {
      ensureWarrior(ev, { vip: true });
      const n = Math.max(1, ev.count);
      const share = ev.damage / n;
      const all = [];
      for (let i = 0; i < n; i++) {
        const to = hitPoint();
        const from = { x: -80, y: rand(1350, 1550) };
        sfx.whoosh();
        all.push(flyArc({
          from, to, dur: 1.15, arc: 520, spin: 5,
          draw: (x, y, r) => drawBoulder(x, y, r),
          trail: (x, y) => emit({ type: 'fire', x: x + rand(-14, 14), y: y + rand(-14, 14), vx: rand(-40, 40), vy: rand(-40, 40), life: .4, size: rand(26, 46), color: THEMES[themeIdx].glow, drag: 2 }),
        }).then(() => {
          explosion(to.x, to.y, 1);
          sfx.boom(.8);
          hurtDragon(2.2);
          shake();
          const last = i === n - 1;
          applyDamage(ev, share, last);
          floatText(to.x, to.y - 40, `-${fmt(last && ev.crit ? ev.damage : share)}`, { color: '#ffb36a', size: 60 });
          if (last && ev.crit) critText(to);
        }));
        await sleep(350);
      }
      await Promise.all(all);
      if (!ev.killed && Math.random() < .5) say('hit');
    },
    async knight(ev) {
      ensureWarrior(ev, { vip: true });
      announce('knight');
      toast(`${avatarHtml(ev)}<span>🐎 ${esc(ev.user)}: всадник в атаку!</span>`);
      const n = Math.max(1, Math.min(ev.count, 3));
      const share = ev.damage / n;
      const runs = [];
      for (let i = 0; i < n; i++) {
        runs.push(rideAndStrike({ img: IMG.knight, scale: 1, p: ev, y: 1560 + i * 40, onHit: to => {
          sfx.clang(); sfx.boom(.5);
          sparks(to.x, to.y, 40, { speed: 900 });
          hurtDragon(2.5); shake();
          const last = i === n - 1;
          applyDamage(ev, share, last);
          floatText(to.x, to.y - 40, `-${fmt(last && ev.crit ? ev.damage : share)}`, { color: '#ffd23a', size: 66 });
          if (last && ev.crit) critText(to);
        } }));
        await sleep(600);
      }
      await Promise.all(runs);
      if (!ev.killed && Math.random() < .6) say('hit');
    },
    async david(ev) {
      $('dim').className = 'on';
      rumbleSky(2.2);
      sfx.thunder();
      banner('⚡ ՍԱՍՈՒՆՑԻ ԴԱՎԻԹ ⚡', 'ДАВИД САСУНСКИЙ', ev, '#8ad8ff', 4200);
      ensureWarrior(ev, { vip: true });
      const voice = announce('david');
      await sleep(900);
      for (let i = 0; i < Math.max(1, Math.min(ev.count, 3)); i++) {
        const to = hitPoint('mNeck', 20);
        await rideAndStrike({
          img: IMG.david, scale: 1.5, p: ev, y: 1580, hero: true, leapTo: { x: to.x - 40, y: to.y - 120 },
          onHit: () => {
            const sky = { x: to.x + rand(-80, 80), y: -40 };
            bolt(sky.x, sky.y, to.x, to.y, { width: 10, life: .5, branches: 5 });
            bolt(sky.x + 40, sky.y, to.x + 30, to.y + 40, { width: 5, life: .4 });
            sfx.thunder(); sfx.slash(); sfx.boom(1);
            flash('#dff4ff', .9, 500);
            explosion(to.x, to.y, 1.6);
            sparks(to.x, to.y, 60, { color: '#bfe8ff', speed: 1200, life: .8 });
            hurtDragon(5); shake(true);
            rig.angry = 1;
            applyDamage(ev, ev.damage, true);
            floatText(to.x, to.y - 60, `-${fmt(ev.damage)}`, { color: '#bfe8ff', size: 110, life: 1.8, stroke: '#003a6a' });
            if (ev.crit) critText(to);
          },
        });
      }
      roarSound(1.8, .9);
      await Promise.race([voice, sleep(1500)]);
      $('dim').className = '';
      if (!ev.killed) { say('bigHit', { force: true }); await sleep(800); }
    },
    async meteor(ev) {
      $('dim').className = 'on red';
      banner('🌠 ԵՐԿՆԱՅԻՆ ԿՐԱԿ', 'НЕБЕСНЫЙ ОГОНЬ', ev, '#ff9a4a', 4200);
      ensureWarrior(ev, { vip: true });
      announce('meteor');
      sfx.thunder();
      rumbleSky(3);
      await sleep(700);
      const n = 14 + Math.min(ev.count - 1, 4) * 4;
      const share = ev.damage / n;
      const falls = [];
      for (let i = 0; i < n; i++) {
        const to = hitPoint(undefined, 90);
        const from = { x: to.x + rand(-500, 500), y: -100 };
        falls.push(flyArc({
          from, to, dur: rand(.7, 1), arc: 0,
          draw: (x, y) => { ctx.drawImage(glow('#ff6a1a'), x - 70, y - 70, 140, 140); ctx.drawImage(glow('#fff0b0'), x - 26, y - 26, 52, 52); },
          trail: (x, y) => emit({ type: 'fire', x, y, vx: rand(-30, 30), vy: rand(-80, -20), life: .5, size: rand(30, 50), color: '#ff5a0a', drag: 1 }),
        }).then(() => {
          explosion(to.x, to.y, 1.1);
          sfx.boom(.7);
          hurtDragon(1.5);
          applyDamage(ev, share, i === n - 1);
          floatText(to.x, to.y - 40, `-${fmt(share)}`, { color: '#ffb36a', size: 52 });
          if (i % 4 === 0) shake(true);
        }));
        await sleep(rand(110, 220));
      }
      await Promise.all(falls);
      if (ev.crit) critText(markerPos('mChest'));
      flash('#ffb070', .7, 600);
      roarSound(2, .8);
      $('dim').className = '';
      if (!ev.killed) { say('bigHit', { force: true }); await sleep(900); }
    },
  };

  function rumbleSky(sec) {
    const until = performance.now() + sec * 1000;
    const strike = () => {
      if (performance.now() > until) return;
      const x = rand(80, 1000);
      bolt(x, -20, x + rand(-150, 150), rand(500, 900), { width: 4, life: .25, branches: 2 });
      flash('#cfe6ff', .25, 200);
      setTimeout(strike, rand(250, 600));
    };
    strike();
  }

  // Всадник скачет по полю, прыгает на дракона и бьёт
  function rideAndStrike({ img, scale, p, y, hero = false, onHit, leapTo }) {
    return new Promise(resolve => {
      const w = 360 * scale, h = 260 * scale;
      const runTo = 220 + rand(-40, 60);
      const target = leapTo || hitPoint('mChest', 30);
      let phase = 'run', t = 0, x = -w, cy = y, rot = 0, alpha = 1;
      sfx.gallop(hero ? 4 : 3);
      addEnt({
        update(dt) {
          t += dt;
          if (phase === 'run') {
            const k = Math.min(1, t / (hero ? 1.1 : 1));
            x = -w + (runTo + w) * ease.out(k);
            cy = y - Math.abs(Math.sin(t * 14)) * 12;
            if (Math.random() < .5) emit({ type: 'smoke', x: x - w * .3, y: y + 4, vx: rand(-120, -40), vy: rand(-40, -10), life: .6, size: 24, drag: 2 });
            if (hero) emit({ type: 'spark', x: x + rand(-w * .3, w * .2), y: cy - rand(0, h * .6), vx: rand(-200, -60), vy: rand(-60, 60), life: .5, size: 3, color: '#ffe08a', drag: 1 });
            if (k >= 1) { phase = 'leap'; t = 0; sfx.whoosh(); }
          } else if (phase === 'leap') {
            const k = Math.min(1, t / (hero ? .75 : .6));
            const sx = runTo, sy = y;
            x = sx + (target.x - w * .35 - sx) * k;
            cy = sy + (target.y + h * .3 - sy) * k - 260 * 4 * k * (1 - k);
            rot = -25 * (1 - k) + 10 * k;
            if (hero) emit({ type: 'fire', x: x, y: cy - h * .4, vx: rand(-60, 60), vy: rand(20, 80), life: .5, size: 40, color: '#ffd86a', drag: 2 });
            if (k >= 1) { phase = 'fall'; t = 0; onHit(target); }
          } else {
            x -= 220 * dt; cy += 600 * t * dt * 3; rot -= 40 * dt; alpha -= dt * 1.8;
            if (alpha <= 0) { resolve(); return false; }
          }
          return true;
        },
        draw() {
          ctx.save();
          ctx.globalAlpha = clamp(alpha, 0, 1);
          ctx.translate(x, cy);
          ctx.rotate(rot * Math.PI / 180);
          if (hero) ctx.drawImage(glow('rgba(255,215,100,.8)'), -w * .7, -h * 1.1, w * 1.4, h * 1.4);
          ctx.drawImage(img, -w / 2, -h + 10, w, h);
          ctx.restore();
          ctx.globalAlpha = clamp(alpha, 0, 1);
          drawTag(p, x + 10 * scale, cy - h - 30, hero ? '#ffd86a' : '#fff');
          ctx.globalAlpha = 1;
        },
      });
    });
  }

  function runAttack(ev) {
    popHotbar(ev.attackId);
    return (ATTACKS[ev.attackId] || ATTACKS.arrow)(ev);
  }

  // ---------- победа и новый дракон ----------
  async function victory(ev) {
    hp.cur = 0; renderHp(true);
    rig.dead = true; rig.jawTo = 22; rig.headTo = 18;
    roarSound(2.4, .7, .9);
    say('death', { force: true });
    for (let i = 0; i < 6; i++) {
      const p = hitPoint(undefined, 120);
      explosion(p.x, p.y, 1.2); sfx.boom(.7); shake(true);
      await sleep(260);
    }
    flash('#fff', 1, 800);
    const center = markerPos('mChest');
    coins(center.x, center.y, 110);
    for (let i = 0; i < 20; i++) setTimeout(sfx.coin, i * 70);
    await tween(rig, { bodyY: 750, bodyRot: 16, opacity: 0 }, 1400, ease.in);
    lastHero = ev.hero;
    showHero(ev.hero);
    sfx.fanfare();
    confetti(540, 1300, 90);
    announce('hero');
    for (let i = 0; i < 7; i++) setTimeout(() => firework(rand(150, 930), rand(500, 1000)), 300 + i * 600);
    await sleep(5600);
    $('hero').hidden = true;

    // Новый дракон — сильнее
    const next = ev.next;
    hp.level = next.level; hp.max = next.maxHp;
    hp.cur = hp.latest && hp.latest.level === next.level ? Math.min(next.hp, hp.latest.hp) : next.hp;
    applyTheme(next.level);
    rig.dead = false; rig.jawTo = 0; rig.headTo = 0; rig.angry = 1;
    renderHp();
    banner(`УРОВЕНЬ ${next.level}`, `${THEMES[themeIdx].name} Вишап возвращается!`, null, THEMES[themeIdx].glow, 2600);
    announce('respawn');
    rig.bodyRot = 0;
    rig.bodyY = 700;
    const rise = tween(rig, { bodyY: 0, opacity: 1 }, 1300, ease.out);
    sfx.thunder();
    await rise;
    roarSound(2, .85, .9);
    rig.jawTo = 24; rig.headTo = 14;
    shake(true);
    await sleep(900);
    rig.jawTo = 0; rig.headTo = 0;
    await say('respawn', { force: true });
  }
  function showHero(h) {
    const el = $('hero');
    el.innerHTML = `<div class="rays"></div><div class="crown">${CROWN_SVG}</div>
      <div class="ava">${h.avatar ? `<img src="${esc(h.avatar)}" referrerpolicy="no-referrer" alt="">` : esc(avatar(h).letter)}</div>
      <div class="t1">ԵԹԵՐԻ ՀԵՐՈՍ</div><div class="t2">ГЕРОЙ ЭФИРА</div>
      <div class="nm">${esc(h.user)}</div><div class="t3">добил Вишапа ${h.level}-го уровня 🐉</div>`;
    if (!h.avatar) el.querySelector('.ava').style.background = avatar(h).color;
    el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  const tweens = [];
  function tween(obj, to, ms, fn = ease.inOut) {
    return new Promise(resolve => {
      const from = Object.fromEntries(Object.keys(to).map(k => [k, obj[k]]));
      tweens.push({ obj, from, to, ms, t: 0, fn, resolve });
    });
  }

  // ---------- огонь дракона ----------
  async function breatheFire() {
    const alive = [...warriors.values()].filter(w => w.state !== 'flee');
    if (busy || rig.dead) return;
    busy = true;
    try {
      say('fire', { force: true });
      rig.headTo = 14; rig.jawTo = 6;
      await sleep(900);
      roarSound(1, 1.1, .5);
      rig.jawTo = 26;
      sfx.fire(2.8);
      const fromLeft = Math.random() < .5;
      const x0 = fromLeft ? 120 : 1000, x1 = fromLeft ? 620 : 480;
      const start = performance.now(), dur = 2600;
      const burned = new Set();
      await new Promise(resolve => {
        addEnt({
          update() {
            const k = Math.min(1, (performance.now() - start) / dur);
            rig.headTo = -8 - 26 * Math.sin(k * Math.PI) * (fromLeft ? 1 : .6);
            const m = markerPos('mMouth');
            const tx = x0 + (x1 - x0) * k, ty = 1560 + Math.sin(k * 9) * 80;
            for (let i = 0; i < 9; i++) {
              const ax = tx + rand(-120, 120) - m.x, ay = ty + rand(-60, 60) - m.y;
              const d = Math.hypot(ax, ay), v = rand(1100, 1500);
              emit({ type: 'fire', x: m.x, y: m.y, vx: ax / d * v, vy: ay / d * v, life: d / v + rand(0, .3), size: rand(30, 70), color: i % 3 ? THEMES[themeIdx].glow : '#ffd23a', drag: .2, grow: 2.2 });
            }
            for (const w of alive) if (!burned.has(w) && Math.abs(w.x - tx) < 120 && k > .1) { burned.add(w); leave(w, true); }
            if (k >= 1) { resolve(); return false; }
            return true;
          },
          draw() {},
        });
      });
      rig.jawTo = 0; rig.headTo = 0;
      if (burned.size) toast(`<span>🔥 Вишап сжёг ${burned.size} воин${burned.size === 1 ? 'а' : 'ов'}! ❤️ Лайкайте — вернитесь в бой!</span>`);
      await sleep(600);
    } finally { busy = false; }
  }

  // Дракон сам дразнит зрителей и иногда жжёт армию
  function scheduleTaunt() {
    const [a, b] = D.tauntEverySec || [22, 40];
    setTimeout(() => {
      if (idle() && !rig.dead && !speaking) {
        if (Math.random() < .3) { roarSound(1.2, 1, .45); rig.jawTo = 20; setTimeout(() => { rig.jawTo = 0; }, 900); }
        say(hp.cur / hp.max < .25 && Math.random() < .5 ? 'low' : 'taunt');
      }
      scheduleTaunt();
    }, rand(a, b) * 1000);
  }
  function scheduleFire() {
    const [a, b] = D.fireEverySec || [40, 70];
    setTimeout(async () => {
      if (idle() && !speaking && [...warriors.values()].filter(w => w.state !== 'flee').length >= 3) await breatheFire();
      scheduleFire();
    }, rand(a, b) * 1000);
  }

  // ---------- события с сервера ----------
  let lastBlockedSay = 0;
  function onAttack(ev) {
    noteLatest(ev);
    const blocking = ev.killed || ev.attackId === 'david' || ev.attackId === 'meteor';
    enqueue({
      blocking,
      gap: ev.attackId === 'knight' ? 900 : ev.attackId === 'boulder' ? 500 : 250,
      skip: () => applyDamage(ev, ev.damage, true),
      run: async () => {
        await runAttack(ev);
        if (ev.killed) await victory(ev);
      },
    });
  }
  function onLikes(ev) {
    noteLatest(ev);
    const w = ensureWarrior(ev);
    if (!w) return;
    w.seen = performance.now();
    if (busy && rig.dead) return;
    w.hop = 1;
    if (ents.length > 60) { applyDamage(ev, ev.damage, true); return; }
    const to = hitPoint(undefined, 70);
    flyArc({ from: handPos(w), to, dur: .65, arc: 140, draw: (x, y, a) => drawArrow(x, y, a, 44, '#e8c890') }).then(() => {
      sparks(to.x, to.y, 5, { speed: 300 });
      if (ev.blocked) {
        floatText(to.x, to.y - 20, '🛡️', { size: 54 });
        if (performance.now() - lastBlockedSay > 25000 && idle()) { lastBlockedSay = performance.now(); say('likesBlocked'); }
      } else if (ev.damage) floatText(to.x, to.y - 20, `-${ev.damage}`, { color: '#ffc0c0', size: 30 });
      applyDamage(ev, ev.damage, true);
    });
  }
  function onSocial(ev) {
    noteLatest(ev);
    const w = ensureWarrior(ev, { vip: ev.kind === 'follow' });
    if (ev.kind === 'follow') {
      toast(`${avatarHtml(ev)}<span>➕ ${esc(ev.user)} вступил в армию! −${ev.damage}</span>`);
      if (w) sparks(w.x, w.y - 80, 30, { color: '#ffd86a', speed: 500 });
    } else {
      toast(`${avatarHtml(ev)}<span>🔁 ${esc(ev.user)} трубит в боевой рог!</span>`);
      sfx.horn();
      // Вся армия даёт залп
      [...warriors.values()].filter(x => x.state !== 'flee').slice(0, 14).forEach((x, i) => setTimeout(() => {
        x.hop = 1;
        const to = hitPoint(undefined, 80);
        flyArc({ from: handPos(x), to, dur: .7, arc: 160, draw: (px, py, a) => drawArrow(px, py, a, 50) }).then(() => sparks(to.x, to.y, 4));
      }, i * 60));
    }
    const at = markerPos('mChest');
    setTimeout(() => { applyDamage(ev, ev.damage, true); if (ev.damage) floatText(at.x, at.y, `-${ev.damage}`, { color: '#ffe0a0' }); }, 800);
  }
  function onJoin(p) {
    const existed = warriors.has(userKey(p));
    const w = ensureWarrior(p);
    if (w) w.seen = performance.now();
    if (!existed && w && $('toasts').children.length < 2) toast(`${avatarHtml(p)}<span>⚔️ ${esc(p.user)} в бою!</span>`);
  }
  function onHeal(ev) {
    noteLatest(ev);
    if (busy || ev.level !== hp.level) return;
    hp.cur = ev.hp;
    const bar = $('hpBar');
    bar.classList.add('heal');
    setTimeout(() => bar.classList.remove('heal'), 900);
    renderHp();
    sfx.heal();
    const p = markerPos('mChest');
    floatText(p.x, p.y, `+${fmt(ev.amount)}`, { color: '#8aff7a' });
    for (let i = 0; i < 8; i++) emit({ type: 'spark', x: p.x + rand(-120, 120), y: p.y + rand(-80, 80), vx: 0, vy: -120, life: 1, size: 4, color: '#8aff7a', drag: 0 });
    if (Math.random() < .3 && idle() && !speaking) say('heal');
  }
  function onBattle(msg) {
    const s = msg.state;
    if (busy || queue.length) return;
    hp.level = s.level; hp.max = s.maxHp; hp.cur = s.hp;
    lastHero = s.lastHero;
    applyTheme(s.level);
    renderHp();
    renderLeaders(msg.leaders);
  }

  // ---------- главный цикл ----------
  let lastT = performance.now(), emberT = 0, smokeT = 0, heartT = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000);
    lastT = now;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt * 1000;
      const k = tw.fn(Math.min(1, tw.t / tw.ms));
      for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * k;
      if (tw.t >= tw.ms) { tweens.splice(i, 1); tw.resolve(); }
    }
    rigUpdate(dt);
    updateWarriors(dt);

    // Угольки из лавы и дым из ноздрей
    if ((emberT -= dt) <= 0) {
      emberT = .12;
      emit({ type: 'ember', x: rand(450, 1050), y: rand(1180, 1300), vx: rand(-20, 20), vy: rand(-90, -40), life: rand(2, 4), size: rand(2, 4), color: THEMES[themeIdx].glow });
    }
    if ((smokeT -= dt) <= 0 && !rig.dead) {
      smokeT = rand(2.5, 4.5);
      const n = markerPos('mNose');
      for (let i = 0; i < 4; i++) emit({ type: 'smoke', x: n.x, y: n.y, vx: rand(-70, -20), vy: rand(-60, -20), life: rand(1, 1.8), size: rand(10, 18), drag: .8, light: true });
    }
    // Сердцебиение, когда дракон почти повержен
    if (hp.cur / hp.max < .25 && !rig.dead && (heartT -= dt) <= 0) { heartT = 1.1; sfx.heart(); }

    ctx.clearRect(0, 0, W, H);
    drawWarriors(now / 1000);
    for (let i = ents.length - 1; i >= 0; i--) if (ents[i].update(dt) === false) ents.splice(i, 1);
    for (const e of ents) e.draw();
    drawParticles(dt);
    drawTexts(dt);
    requestAnimationFrame(frame);
  }

  function drawParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy = p.vy * k + p.g * dt;
      p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
      p.rot += p.vr * dt;
    }
    // Сначала дым (обычное смешивание), потом свечение (сложение)
    for (const p of parts) {
      const f = p.age / p.life;
      if (p.type === 'smoke') {
        const s = p.size * (1 + f * 1.8);
        ctx.globalAlpha = (1 - f) * (p.light ? .35 : .5);
        ctx.fillStyle = p.light ? '#cfc6c0' : '#2a2422';
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
      } else if (p.type === 'debris') {
        ctx.globalAlpha = 1 - f;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .7); ctx.restore();
      } else if (p.type === 'confetti') {
        ctx.globalAlpha = Math.min(1, (1 - f) * 3);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 1.7)); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
      } else if (p.type === 'coin') {
        ctx.globalAlpha = Math.min(1, (1 - f) * 3);
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.abs(Math.cos(p.rot)) + .15, 1);
        ctx.fillStyle = '#f6c84a'; ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(-p.size * .25, -p.size * .25, p.size * .35, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const f = p.age / p.life;
      if (p.type === 'fire') {
        const s = p.size * (1 + f * (p.grow || .6));
        ctx.globalAlpha = (1 - f) * .85;
        ctx.drawImage(glow(f < .25 ? '#ffd23a' : p.color), p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.type === 'spark') {
        ctx.globalAlpha = 1 - f;
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); ctx.stroke();
      } else if (p.type === 'ember') {
        ctx.globalAlpha = Math.sin(f * Math.PI);
        ctx.drawImage(glow(p.color), p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
      } else if (p.type === 'ring') {
        ctx.globalAlpha = 1 - f;
        ctx.strokeStyle = p.color; ctx.lineWidth = 10 * (1 - f) + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * ease.out(f), 0, TAU); ctx.stroke();
      } else if (p.type === 'bolt') {
        ctx.globalAlpha = (1 - f) * (Math.random() < .3 ? .5 : 1);
        for (const [lw, color] of [[p.size * 3, p.color], [p.size, '#fff']]) {
          ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round';
          ctx.beginPath(); p.pts.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  function drawTexts(dt) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.age += dt;
      if (t.age >= t.life) { texts.splice(i, 1); continue; }
      const f = t.age / t.life;
      const pop = f < .15 ? .6 + f / .15 * .6 : 1.2 - Math.min(.2, (f - .15));
      ctx.globalAlpha = f > .7 ? (1 - f) / .3 : 1;
      ctx.font = `900 ${Math.round(t.size * pop)}px 'Arial Black', Arial`;
      const y = t.y - f * 90;
      ctx.lineWidth = Math.max(4, t.size / 7); ctx.strokeStyle = t.stroke; ctx.strokeText(t.text, t.x, y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- связь с сервером ----------
  function connectWs() {
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'attack') onAttack(msg.attack);
      else if (msg.type === 'likes') onLikes(msg.likes);
      else if (msg.type === 'social') onSocial(msg.social);
      else if (msg.type === 'join') onJoin(msg.join);
      else if (msg.type === 'heal') onHeal(msg.heal);
      else if (msg.type === 'battle') onBattle(msg);
      else if (msg.type === 'leaders' && msg.dragon) renderLeaders(msg.leaders);
      else if (msg.type === 'gifts') { giftIcons = msg.gifts || {}; renderHotbar(); }
      else if (msg.type === 'status') { $('status').textContent = msg.status.message; $('status').className = msg.status.connected ? 'ok' : ''; }
    };
    ws.onopen = () => refreshConfig();
    ws.onclose = () => { $('status').textContent = 'Нет связи с сервером, переподключение…'; setTimeout(connectWs, 2000); };
  }
  async function refreshConfig() {
    try {
      const fresh = await (await fetch('/api/config')).json();
      if (!fresh?.dragon) return;
      config = fresh; D = config.dragon;
      renderHotbar(); renderHp();
    } catch {}
  }

  // ---------- тест-панель (?test=1) ----------
  const TEST_NAMES = ['Арам', 'Гор', 'Ани', 'Давид', 'Нарек', 'Мариам', 'Тигран', 'Лилит', 'Ашот', 'Карен', 'Сона', 'Ваган'];
  function testUser() {
    const v = $('testUser').value.trim();
    return v && v !== '?' ? v : pick(TEST_NAMES);
  }
  function setupTest() {
    if (!isTest) return;
    $('testPanel').hidden = false;
    $('testButtons').innerHTML = attacks().map(a => `<button data-coins="${a.price}">${a.emoji} ${a.price}</button>`).join('');
    const post = body => fetch('/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    $('testButtons').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      ac();
      post({ coins: Number(b.dataset.coins), user: testUser(), repeatCount: Number($('testRepeat').value) || 1 });
    });
    $('testExtra').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      ac();
      if (b.dataset.local === 'fire') return breatheFire();
      if (b.dataset.local === 'taunt') return say('taunt', { force: true });
      post({ kind: b.dataset.kind, user: testUser(), count: 15 });
    });
  }
  // Браузеру нужен клик, чтобы включить звук (в LIVE Studio не нужно)
  addEventListener('pointerdown', () => ac(), { once: true });

  (async function init() {
    fit();
    config = await (await fetch('/api/config')).json();
    D = config.dragon || {};
    try { giftIcons = await (await fetch('/api/gifts')).json(); } catch {}
    applyTheme(1);
    renderHotbar();
    renderHp();
    rotateHint();
    setInterval(rotateHint, 4500);
    setupTest();
    connectWs();
    setInterval(refreshConfig, 60000);
    scheduleTaunt();
    scheduleFire();
    requestAnimationFrame(frame);
  })();
})();
