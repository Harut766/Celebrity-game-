// «Гонка Наций» — экран для TikTok LIVE. Гонку считает сервер, здесь только картинка и звук.
(function () {
  const $ = id => document.getElementById(id);
  const { drawFlag, flagUrl, carSprite, drawWheel, CAR } = window.RaceArt;
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const stage = $('stage'), canvas = $('game'), ctx = canvas.getContext('2d');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ease = { out: t => 1 - (1 - t) ** 3, inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2 };

  // ---------- геометрия: всё важное в середине (сверху плашка ведущего, снизу чат TikTok) ----------
  const LANE_TOP = 404, LANE_H = 116, LABEL_W = 184, START_X = 196, FINISH_X = 932;
  const laneY = i => LANE_TOP + i * LANE_H;
  const laneMid = i => laneY(i) + LANE_H / 2;

  let view = null;          // настройки с сервера (страны, уровни, громкость…)
  let state = null;         // последнее состояние гонки
  let stateAt = 0;
  let people = { captains: {}, members: {}, counts: {}, topRound: [], topDay: [], wins: {} };
  const countries = () => view?.countries || [];
  const countryById = id => countries().find(c => c.id === id);
  const laneOf = id => countries().findIndex(c => c.id === id);

  // ---------- масштаб под окно ----------
  let fitScale = 1;
  function fit() {
    fitScale = Math.min(innerWidth / W, innerHeight / H);
    stage.style.setProperty('--fit', `translate(${(innerWidth - W * fitScale) / 2}px, ${(innerHeight - H * fitScale) / 2}px) scale(${fitScale})`);
    stage.style.transform = 'var(--fit)';
  }
  addEventListener('resize', fit);
  fit();

  // ---------- картинки ----------
  const sprites = new Map();
  const sprite = c => { if (!sprites.has(c.id)) sprites.set(c.id, carSprite(c)); return sprites.get(c.id); };
  const avatars = new Map();
  function avatarImg(url) {
    if (!url) return null;
    if (!avatars.has(url)) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = url;
      avatars.set(url, img);
    }
    const img = avatars.get(url);
    return img.complete && img.naturalWidth ? img : null;
  }
  const letterColor = name => `hsl(${[...String(name || '?')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 11)} 55% 45%)`;
  function drawAvatar(p, x, y, r, ring = '#fff', ringW = 3) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.closePath();
    ctx.save(); ctx.clip();
    const img = avatarImg(p?.avatar);
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else {
      ctx.fillStyle = letterColor(p?.name); ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(r * 1.1)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText([...(p?.name || '?')][0]?.toUpperCase() || '?', x, y + 1);
    }
    ctx.restore();
    ctx.lineWidth = ringW; ctx.strokeStyle = ring; ctx.stroke();
    ctx.restore();
  }
  const flagImg = (id, w = 44, h = 30) => `<img class="flag" src="${flagUrl(id, w, h)}" width="${w}" height="${h}" alt="">`;
  const avaHtml = (p, cls = 'ava') => p?.avatar
    ? `<img class="${cls}" src="${esc(p.avatar)}" referrerpolicy="no-referrer" alt="">`
    : `<span class="${cls}" style="background:${letterColor(p?.name)};display:inline-flex;align-items:center;justify-content:center;font-weight:900">${esc([...(p?.name || '?')][0]?.toUpperCase() || '?')}</span>`;
  const fmt = n => Math.round(n).toLocaleString('ru-RU');

  // ---------- фон трассы (рисуется один раз) ----------
  let bg = null;
  function buildBackground() {
    const n = countries().length;
    bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const g = bg.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#05060f'); sky.addColorStop(.2, '#141a3a'); sky.addColorStop(.55, '#0c0f22'); sky.addColorStop(1, '#05060c');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // прожекторы стадиона
    for (const x of [140, 540, 940]) {
      const l = g.createRadialGradient(x, 380, 10, x, 380, 420);
      l.addColorStop(0, 'rgba(160,190,255,.22)'); l.addColorStop(1, 'rgba(160,190,255,0)');
      g.fillStyle = l; g.fillRect(x - 420, 0, 840, 900);
    }
    const top = LANE_TOP - 8, bottom = laneY(n) + 8;
    // бортики
    g.fillStyle = '#1b1f33'; g.fillRect(0, top - 14, W, bottom - top + 28);
    for (let x = 0; x < W; x += 40) { g.fillStyle = (x / 40) % 2 ? '#d22' : '#eee'; g.fillRect(x, top - 14, 40, 8); g.fillRect(x, bottom + 6, 40, 8); }
    // асфальт с зерном
    for (let i = 0; i < n; i++) {
      const y = laneY(i);
      const a = g.createLinearGradient(0, y, 0, y + LANE_H);
      a.addColorStop(0, i % 2 ? '#2a2d36' : '#2f323c'); a.addColorStop(1, i % 2 ? '#23262e' : '#272a33');
      g.fillStyle = a; g.fillRect(0, y, W, LANE_H);
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(Math.random() * W, top + Math.random() * (bottom - top), 2, 2); }
    // разметка
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.setLineDash([34, 26]);
    for (let i = 1; i < n; i++) { g.beginPath(); g.moveTo(START_X, laneY(i)); g.lineTo(W, laneY(i)); g.stroke(); }
    g.setLineDash([]);
    // боксы с флагами
    const pit = g.createLinearGradient(0, 0, LABEL_W, 0);
    pit.addColorStop(0, '#0d1022'); pit.addColorStop(1, '#171b33');
    g.fillStyle = pit; g.fillRect(0, top, LABEL_W, bottom - top);
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 1; i < n; i++) g.fillRect(0, laneY(i) - 1, LABEL_W, 2);
    // старт
    g.fillStyle = '#fff'; g.fillRect(START_X - 3, top, 6, bottom - top);
    // финиш — шашечки
    const sq = 14;
    for (let y = top; y < bottom; y += sq) for (let k = 0; k < 2; k++) { g.fillStyle = ((y - top) / sq + k) % 2 ? '#111' : '#fff'; g.fillRect(FINISH_X + k * sq, y, sq, sq); }
    g.fillStyle = 'rgba(255,214,90,.9)'; g.font = '900 22px Arial'; g.save(); g.translate(FINISH_X + 48, (top + bottom) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('ФИНИШ', 0, 8); g.restore();
  }

  // ---------- машины: плавное движение между пакетами с сервера ----------
  const cars = new Map(); // id → { disp, target, vel, t, wheel, … }
  function carX(pos) {
    const len = state?.length || 1000;
    return START_X + CAR.w * .9 + clamp(pos / len, 0, 1.02) * (FINISH_X - START_X - CAR.w * .9);
  }
  function syncCars(now) {
    for (const c of state.cars) {
      let car = cars.get(c.id);
      if (!car) { car = { id: c.id, disp: c.pos, wheel: 0, glow: 0, lastPlace: 9 }; cars.set(c.id, car); }
      if (Math.abs(c.pos - car.disp) > 300) car.disp = c.pos;
      Object.assign(car, { target: c.pos, vel: c.vel, t: now, shield: c.shield, stun: c.stun, spin: c.spin, back: c.back, like: c.like });
    }
  }
  function updateCars(dt, now) {
    for (const car of cars.values()) {
      const pred = car.target + car.vel * Math.min(.25, (now - car.t) / 1000);
      const prev = car.disp;
      car.disp += (pred - car.disp) * Math.min(1, dt * 10);
      car.speed = (car.disp - prev) / Math.max(dt, .001);
      car.wheel += (car.disp - prev) * .18;
    }
  }

  // Где сейчас машина страны (для эффектов)
  function carRect(id) {
    const car = cars.get(id), lane = laneOf(id);
    if (!car || lane < 0) return null;
    const front = carX(car.disp);
    return { x: front - CAR.w, y: laneMid(lane) - CAR.h / 2 + 2, front, mid: laneMid(lane), w: CAR.w, h: CAR.h, car };
  }

  function drawCar(c, car, now) {
    const lane = laneOf(c.id);
    const front = carX(car.disp);
    const x = front - CAR.w, y = laneMid(lane) - CAR.h / 2 + 2;
    const t = now / 1000;
    ctx.save();
    // тряска при ударе, вращение при «хаосе»
    let rot = 0, dy = 0;
    if (car.spin) rot = Math.sin(t * 18) * .35;
    else if (car.stun || car.back) { rot = Math.sin(t * 40) * .06; dy = Math.sin(t * 50) * 2; }
    else dy = Math.sin(t * 9 + lane) * .8;
    ctx.translate(x + CAR.w / 2, y + CAR.h / 2 + dy);
    ctx.rotate(rot);
    ctx.translate(-CAR.w / 2, -CAR.h / 2);
    // антенна с флагом на крыше
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(30, 28); ctx.lineTo(24, -6); ctx.stroke();
    const wave = Math.sin(t * 8 + lane) * 3;
    ctx.save(); ctx.translate(24, -8); ctx.transform(1, wave * .02, 0, 1, 0, 0);
    drawFlag(ctx, c.id, -40, -2, 40, 26, { radius: 3, wave: Math.sin(t * 6) });
    ctx.restore();
    ctx.drawImage(sprite(c), 0, 0, CAR.w, CAR.h);
    for (const wx of CAR.wheels) drawWheel(ctx, wx, CAR.wheelY, CAR.wheelR, car.wheel);
    // капитан за рулём (топ-донатер страны в этом раунде)
    const cap = people.captains?.[c.id];
    if (cap) {
      drawAvatar(cap, CAR.cockpit.x + 8, CAR.cockpit.y + 2, 21, '#ffd45a', 4);
      drawCrown(CAR.cockpit.x + 8, CAR.cockpit.y - 24, 13);
    }
    ctx.restore();
    return { x, y, front };
  }
  function drawCrown(x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#ffd45a'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s, s * .6); ctx.lineTo(-s, -s * .3); ctx.lineTo(-s * .5, s * .1); ctx.lineTo(0, -s * .6); ctx.lineTo(s * .5, s * .1); ctx.lineTo(s, -s * .3); ctx.lineTo(s, s * .6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawLaneLabel(c, place, car) {
    const i = laneOf(c.id), y = laneY(i);
    drawFlag(ctx, c.id, 14, y + 14, 72, 48, { radius: 6 });
    // место
    const colors = ['#ffd45a', '#d8dde8', '#e0a070'];
    ctx.fillStyle = colors[place] || 'rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.arc(130, y + 38, 26, 0, TAU); ctx.fill();
    ctx.fillStyle = place < 3 ? '#1a1206' : '#fff'; ctx.font = '900 32px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(place + 1), 130, y + 40);
    // код страны и сколько в команде
    ctx.fillStyle = '#fff'; ctx.font = '900 22px Arial'; ctx.textAlign = 'left';
    ctx.fillText(c.id.toUpperCase(), 16, y + 84);
    ctx.fillStyle = '#b8c0e8'; ctx.font = '800 20px Arial';
    ctx.fillText(`👥${people.counts?.[c.id] || 0}`, 64, y + 84);
    // шкала лайков
    const bw = LABEL_W - 28, by = y + LANE_H - 14;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(14, by, bw, 7);
    ctx.fillStyle = c.colors?.[c.colors.length > 2 ? 2 : 1] || '#ff4a6a'; ctx.fillRect(14, by, bw * (car?.like || 0), 7);
  }

  // Аватарки команды бегут за машиной
  function drawMembers(c, pos) {
    const list = people.members?.[c.id] || [];
    const y = laneMid(laneOf(c.id)) + 6;
    list.slice(0, 4).forEach((m, k) => {
      const x = pos.x - 22 - k * 30;
      if (x < START_X + 12) return;
      ctx.globalAlpha = 1 - k * .18;
      drawAvatar(m, x, y + Math.sin(performance.now() / 160 + k) * 3, 14, 'rgba(255,255,255,.8)', 2);
    });
    ctx.globalAlpha = 1;
  }

  // ---------- шапка, топы, прайс ----------
  const timerText = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function renderHud() {
    if (!state) return;
    $('timer').textContent = timerText(Math.ceil(state.timeLeft));
    $('timer').classList.toggle('low', state.phase === 'running' && state.timeLeft <= 10);
    $('final').hidden = !(state.final && state.phase === 'running');
    const wins = Object.entries(people.wins || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    $('round').innerHTML = `Раунд ${state.round}` + (wins.length ? ` · побед: ${wins.map(([id, n]) => `${flagImg(id, 30, 20)} ${n}`).join(' ')}` : '') + (state.paused ? ' · ⏸ пауза' : '');
  }
  let topsKey = '';
  function renderTops() {
    const key = JSON.stringify([people.topRound, people.topDay]);
    if (key === topsKey) return;
    topsKey = key;
    const rows = list => list.length
      ? list.map((d, i) => `<li>${['🥇', '🥈', '🥉'][i]} ${avaHtml(d)} ${d.country ? flagImg(d.country, 24, 16) : ''}<span class="nm">${esc(d.name)}</span><span class="cn">${fmt(d.coins)}🪙</span></li>`).join('')
      : '<li class="empty">Будь первым!</li>';
    $('topRound').querySelector('ol').innerHTML = rows(people.topRound || []);
    $('topDay').querySelector('ol').innerHTML = rows(people.topDay || []);
  }
  function renderPrices() {
    const tiers = view?.tiers || [];
    $('prices').innerHTML = tiers.map((t, i) => {
      const icon = view.icons?.[t.id]?.image;
      const price = i < tiers.length - 1 && tiers[i + 1].min - 1 > t.min ? `${t.min}+` : `${t.min}`;
      return `<li data-tier="${esc(t.id)}" class="${t.min >= 500 ? 'hot' : ''}"><div class="ic">${icon ? `<img src="${esc(icon)}" referrerpolicy="no-referrer" alt="">` : ''}${esc(t.icon)}</div>
        <div class="nm">${esc(t.name)}</div><div class="pr">${price}🪙</div></li>`;
    }).join('');
  }

  // ---------- объявления ----------
  // Текст фраз — только шаблоны из конфига; {a}/{b} — флаг и название страны, {n} — ник (уже проверенный сервером)
  function fillVars(text, vars = {}) {
    return esc(text).replace(/\{(a|b|n)\}/g, (_, k) => {
      if (k === 'n') return esc(vars.n || '');
      const c = countryById(vars[k]);
      return c ? `${flagImg(c.id, 40, 27)} ${esc(c.name)}` : '';
    });
  }
  function sayLine(html, cls = '') {
    $('say').innerHTML = `<span class="line ${cls}">${html}</span>`;
  }

  // ---------- камера ----------
  const camera = {
    zoom: 1, x: W / 2, y: 750, target: null,
    set({ zoom, x, y, sec }) { this.target = { zoom, x, y, until: performance.now() + sec * 1000 }; },
    update(dt, now) {
      const t = this.target && now < this.target.until ? this.target : { zoom: 1, x: this.x, y: this.y };
      const k = Math.min(1, dt * 4);
      this.zoom += (t.zoom - this.zoom) * k; this.x += (t.x - this.x) * k; this.y += (t.y - this.y) * k;
      return this;
    },
  };

  // ---------- эффекты (fx.js) ----------
  const hooks = { under: [], over: [] };
  const fxHandlers = {};
  function onFx(fx) { (fxHandlers[fx.kind] || (() => {}))(fx); }

  // ---------- отсчёт и победа ----------
  let lastCount = -1;
  function renderCountdown() {
    const el = $('countdown');
    if (state.phase !== 'countdown' || state.paused) { if (!el.hidden && state.phase !== 'countdown') el.hidden = true; lastCount = -1; return; }
    const n = Math.ceil(state.countdown);
    if (n === lastCount || n <= 0) return;
    lastCount = n;
    el.hidden = false; el.className = '';
    el.innerHTML = `<span class="num">${n}</span>`;
    try { window.RaceAudio.play('count'); } catch {}
  }
  function showGo() {
    const el = $('countdown');
    el.hidden = false; el.className = 'go';
    el.innerHTML = '<span class="num">СТАРТ!</span>';
    try { window.RaceAudio.play('go'); } catch {}
    setTimeout(() => { el.hidden = true; }, 1100);
  }
  function showWinner(f) {
    const c = countryById(f.winner);
    if (!c) return;
    const hero = f.hero;
    const wins = Object.entries(f.wins || {}).sort((a, b) => b[1] - a[1]);
    $('winner').innerHTML = `<div class="card"><img class="flagBig" src="${flagUrl(c.id, 300, 200)}" alt="">
      <div class="t1">ПОБЕДА!</div><div class="t2">${esc(c.name)}</div>
      ${hero ? `<div class="hero">Герой раунда: ${avaHtml(hero)} <b>${esc(hero.name)}</b> · ${fmt(hero.coins)}🪙</div>` : ''}
      ${wins.length ? `<div class="wins">Побед за день: ${wins.map(([id, n]) => `${flagImg(id, 36, 24)} ${n}`).join(' ')}</div>` : ''}</div>`;
    $('winner').hidden = false;
    window.RaceDrama?.finish(f);
  }

  // ---------- главный цикл ----------
  let lastT = performance.now();
  function frame(now) {
    try { step(now); } catch (e) { report(`ошибка в кадре: ${e.message}`); }
    requestAnimationFrame(frame);
  }
  function step(now) {
    const dt = Math.min(.05, (now - lastT) / 1000);
    lastT = now;
    if (!view || !state) return;
    if (!bg) buildBackground();
    updateCars(dt, now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // Камера: на фотофинише приближает финиш
    const cam = camera.update(dt, now);
    if (cam.zoom > 1.001) ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.x * (1 - cam.zoom), cam.y * (1 - cam.zoom));
    ctx.drawImage(bg, 0, 0);
    const ranking = [...cars.values()].sort((a, b) => b.disp - a.disp).map(c => c.id);
    // подсветка дорожки лидера
    if (state.phase !== 'countdown' && ranking[0]) {
      const i = laneOf(ranking[0]);
      const glow = ctx.createLinearGradient(START_X, 0, FINISH_X, 0);
      const col = countryById(ranking[0])?.colors?.[0] || '#fff';
      glow.addColorStop(0, 'rgba(255,214,90,0)'); glow.addColorStop(1, hexA(col === '#FFFFFF' ? '#ffd45a' : col, .22));
      ctx.fillStyle = glow; ctx.fillRect(START_X, laneY(i) + 2, FINISH_X - START_X, LANE_H - 4);
    }
    hooks.under.forEach(h => h(ctx, dt, now));
    const positions = {};
    for (const c of countries()) {
      const car = cars.get(c.id);
      if (!car) continue;
      drawLaneLabel(c, ranking.indexOf(c.id), car);
      positions[c.id] = drawCar(c, car, now);
      drawMembers(c, positions[c.id]);
    }
    hooks.over.forEach(h => h(ctx, dt, now));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (cam.zoom > 1.001) {
      const v = ctx.createRadialGradient(W / 2, 750, 200, W / 2, 750, 900);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${(cam.zoom - 1) * .9})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    renderHud();
    renderCountdown();
  }
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // ---------- связь с сервером ----------
  let ws = null, lastMsgAt = Date.now();
  const unsent = [], reported = new Set();
  function report(text) {
    if (reported.has(text)) return;
    reported.add(text); unsent.push(text); flush();
  }
  function flush() { while (unsent.length && ws?.readyState === 1) ws.send(JSON.stringify({ type: 'log', text: unsent.shift() })); }
  addEventListener('error', e => report(`ошибка: ${e.message} (${String(e.filename).split('/').pop()}:${e.lineno})`));

  function onMessage(msg) {
    const d = msg.data;
    switch (msg.type) {
      case 'race:state': {
        const prevPhase = state?.phase;
        state = d; stateAt = performance.now();
        syncCars(stateAt);
        if (prevPhase === 'countdown' && d.phase === 'running') showGo();
        if (prevPhase === 'finished' && d.phase !== 'finished') $('winner').hidden = true;
        break;
      }
      case 'race:people': people = d; renderTops(); break;
      case 'race:view': view = d; bg = null; sprites.clear(); renderPrices(); break;
      case 'race:fx': onFx(d); break;
      case 'race:say': sayLine(fillVars(d.text, d.vars)); break;
      case 'race:finish': showWinner(d); break;
    }
  }
  function connect() {
    const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws = sock; lastMsgAt = Date.now();
    sock.onmessage = e => { if (ws !== sock) return; lastMsgAt = Date.now(); onMessage(JSON.parse(e.data)); };
    sock.onopen = () => flush();
    sock.onclose = () => { if (ws === sock) setTimeout(reconnect, 1500); };
  }
  function reconnect() { const old = ws; ws = null; try { old?.close(); } catch {} connect(); }
  // Туннель иногда рвёт соединение молча: сервер пишет 10 раз в секунду — 5 секунд тишины = переподключение
  setInterval(() => { if (ws && ws.readyState !== WebSocket.CLOSED && Date.now() - lastMsgAt > 5000) reconnect(); }, 2000);

  (async function init() {
    try { view = await (await fetch('/api/race/view')).json(); } catch {}
    if (view) renderPrices();
    connect();
    requestAnimationFrame(frame);
  })();

  window.Race = { fxHandlers, onFx, hooks, camera, carRect, avatarImg, drawFlag, CAR, LANE_TOP, sayLine, fillVars, ctx, cars, countryById, laneOf, laneMid, laneY, carX, drawAvatar, avaHtml, flagImg, esc, fmt, rand, pick, clamp, sleep, ease, hexA, report,
    get view() { return view; }, get state() { return state; }, get people() { return people; }, stage, W, H, LANE_H, START_X, FINISH_X };
})();
