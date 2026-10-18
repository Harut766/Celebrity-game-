// «Гонка Наций» — экран для TikTok LIVE. Гонку считает сервер; здесь сеть, HUD и 2D-слой эффектов.
// 3D-трассу и машины рисует scene3d.js (Three.js).
(function () {
  const $ = id => document.getElementById(id);
  const { drawFlag, flagUrl } = window.RaceArt;
  const I = window.RaceIcons;
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const stage = $('stage'), canvas = $('fx2d'), ctx = canvas.getContext('2d');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ease = { out: t => 1 - (1 - t) ** 3, inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2 };
  const FONT = '"Russo One", "Arial Black", Arial, sans-serif';

  // ---------- компоновка 1080×1920 ----------
  // 0–200 полоса TikTok (ник, зрители) — только декор; 200–335 шапка; 338–386 комментатор;
  // 390–1188 трасса (6 × 133); 1196–1384 прайс; 1392–1560 «как играть»; ниже — зона чата (декор).
  const LANE_TOP = 390, LANE_H = 133, LABEL_W = 206, START_X = 222, FINISH_X = 900;
  const laneY = i => LANE_TOP + i * LANE_H;
  const laneMid = i => laneY(i) + LANE_H / 2;

  let view = null, state = null;
  let people = { captains: {}, members: {}, counts: {}, topRound: [], topDay: [], wins: {} };
  const countries = () => view?.countries || [];
  const countryById = id => countries().find(c => c.id === id);
  const laneOf = id => countries().findIndex(c => c.id === id);

  // ---------- масштаб под окно ----------
  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.setProperty('--fit', `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`);
    stage.style.transform = 'var(--fit)';
  }
  addEventListener('resize', fit);
  fit();

  // ---------- аватарки ----------
  const avatars = new Map();
  function avatarImg(url) {
    if (!url) return null;
    if (!avatars.has(url)) { const img = new Image(); img.referrerPolicy = 'no-referrer'; img.src = url; avatars.set(url, img); }
    const img = avatars.get(url);
    return img.complete && img.naturalWidth ? img : null;
  }
  const letterColor = name => `hsl(${[...String(name || '?')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 11)} 55% 42%)`;
  function drawAvatar(p, x, y, r, ring = '#fff', ringW = 3) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.closePath();
    ctx.save(); ctx.clip();
    const img = avatarImg(p?.avatar);
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else {
      ctx.fillStyle = letterColor(p?.name); ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#fff'; ctx.font = `${Math.round(r * 1.05)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText([...(p?.name || '?')][0]?.toUpperCase() || '?', x, y + 2);
    }
    ctx.restore();
    ctx.lineWidth = ringW; ctx.strokeStyle = ring; ctx.stroke();
    ctx.restore();
  }
  const flagImg = (id, w = 54, h = 36) => `<img class="flag" src="${flagUrl(id, w, h)}" width="${w}" height="${h}" alt="">`;
  const avaHtml = (p, cls = 'ava') => p?.avatar
    ? `<img class="${cls}" src="${esc(p.avatar)}" referrerpolicy="no-referrer" alt="">`
    : `<span class="${cls} letter" style="background:${letterColor(p?.name)}">${esc([...(p?.name || '?')][0]?.toUpperCase() || '?')}</span>`;
  const iconHtml = (tier, cls = 'tic') => `<img class="${cls}" src="${I.tierUrl(tier)}" alt="">`;
  const COIN = '<svg class="coin" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#ffc21a" stroke="#8a5a00" stroke-width="3"/><circle cx="20" cy="20" r="11" fill="none" stroke="#fff3b0" stroke-width="3"/></svg>';
  const fmt = n => Math.round(n).toLocaleString('ru-RU');

  // ---------- машины: плавное движение между пакетами с сервера ----------
  const cars = new Map();
  function syncCars(now) {
    for (const c of state.cars) {
      let car = cars.get(c.id);
      if (!car) { car = { id: c.id, disp: c.pos, speed: 0 }; cars.set(c.id, car); }
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
    }
  }
  const carRect = id => window.Race3D?.carRect(id) || null;

  // ---------- метки дорожек: флаг, место, игроки, шкала лайков ----------
  const laneEls = [];
  function buildLanes() {
    const box = $('lanes');
    box.innerHTML = '';
    laneEls.length = 0;
    countries().forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'lane';
      el.style.top = laneY(i) + 'px';
      el.style.height = LANE_H + 'px';
      el.innerHTML = `<div class="place">${i + 1}</div><img class="lflag" src="${flagUrl(c.id, 84, 56)}" alt="">
        <div class="code">${esc(c.id.toUpperCase())}</div><div class="cnt"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.5" fill="#fff"/><path d="M3 22c0-5 4-8 9-8s9 3 9 8z" fill="#fff"/></svg><span>0</span></div>
        <div class="likes"><i></i></div>`;
      box.appendChild(el);
      laneEls.push({ id: c.id, el, place: el.querySelector('.place'), cnt: el.querySelector('.cnt span'), like: el.querySelector('.likes i'), last: {} });
    });
  }
  function renderLanes() {
    const ranking = [...cars.values()].sort((a, b) => b.disp - a.disp).map(c => c.id);
    for (const l of laneEls) {
      const place = ranking.indexOf(l.id) + 1, cnt = people.counts?.[l.id] || 0, like = Math.round((cars.get(l.id)?.like || 0) * 100);
      if (l.last.place !== place) { l.place.textContent = place || ''; l.place.className = `place p${place}`; l.last.place = place; }
      if (l.last.cnt !== cnt) { l.cnt.textContent = cnt; l.last.cnt = cnt; }
      if (l.last.like !== like) { l.like.style.width = like + '%'; l.last.like = like; }
    }
  }

  // ---------- шапка, топ-3, прайс ----------
  const timerText = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let hudKey = '';
  function renderHud() {
    if (!state) return;
    const timer = state.phase === 'finished' ? '0:00' : timerText(Math.ceil(state.timeLeft));
    const key = [timer, state.final, state.phase, state.paused, state.round].join('|');
    if (key === hudKey) return;
    hudKey = key;
    $('timer').textContent = timer;
    $('timer').classList.toggle('low', state.phase === 'running' && state.timeLeft <= 10);
    $('final').hidden = !(state.final && state.phase === 'running');
    $('round').textContent = `РАУНД ${state.round}${state.paused ? ' · ПАУЗА' : ''}`;
  }
  let topsKey = '';
  function renderTops() {
    const key = JSON.stringify(people.topRound);
    if (key === topsKey) return;
    topsKey = key;
    const list = people.topRound || [];
    $('top3').innerHTML = list.length
      ? list.map((d, i) => `<span class="chip r${i + 1}">${avaHtml(d)}<b>${fmt(d.coins)}</b>${COIN}</span>`).join('')
      : '<span class="empty">Топ: будь первым!</span>';
  }
  function giftPicture(t) {
    const name = (t.gift?.name || '').toLowerCase();
    return t.gift?.image || view.icons?.['@' + name] || I.giftUrl(name);
  }
  function renderPrices() {
    const tiers = view?.tiers || [];
    const tile = t => `<li data-tier="${esc(t.id)}" style="--tc:${I.tierColor(t.id)}">
        <div class="pic"><img class="gift" src="${esc(giftPicture(t))}" referrerpolicy="no-referrer" alt="">${iconHtml(t.id, 'badge')}</div>
        <div class="txt"><div class="nm">${esc(t.name.toUpperCase())}</div><div class="pr">${fmt(t.min)}${t.min < 1000 ? '+' : ''}${COIN}</div></div></li>`;
    $('prices').innerHTML = `<ul class="row r1">${tiers.slice(0, 4).map(tile).join('')}</ul><ul class="row r2">${tiers.slice(4).map(tile).join('')}</ul>`;
  }
  function renderHowto() {
    const chips = countries().map(c => `<span class="cc">${flagImg(c.id, 46, 31)}${esc(c.id.toUpperCase())}</span>`).join('');
    $('howto').innerHTML = `<div class="tab">КАК ИГРАТЬ</div>
      <div class="ln"><b>1</b><span>В чат:</span>${chips}</div>
      <div class="ln"><b>2</b><span>Лайки толкают твою машину</span></div>
      <div class="ln"><b>3</b><span>Подарки: нитро, щиты, ракеты</span></div>`;
  }

  // ---------- строка комментатора ----------
  function fillVars(text, vars = {}) {
    return esc(text).replace(/\{(a|b|n)\}/g, (_, k) => {
      if (k === 'n') return esc(vars.n || '');
      const c = countryById(vars[k]);
      return c ? `${flagImg(c.id, 48, 32)} ${esc(c.name)}` : '';
    });
  }
  // Длинная фраза ужимается, но не мельче 36px
  function sayLine(html, cls = '') {
    $('say').innerHTML = `<span class="line ${cls}">${html}</span>`;
    const el = $('say').firstChild;
    for (let size = 38; size > 36 && el.scrollWidth > el.clientWidth; size--) el.style.fontSize = size - 1 + 'px';
    if (el.scrollWidth > el.clientWidth) el.style.letterSpacing = '-1px';
  }

  // ---------- камера (фотофиниш) ----------
  const camera = {
    zoom: 1, x: W / 2, y: H / 2, target: null,
    set({ zoom, x, y, sec }) { this.target = { zoom, x, y, until: performance.now() + sec * 1000 }; },
    update(dt, now) {
      const t = this.target && now < this.target.until ? this.target : { zoom: 1, x: this.x, y: this.y };
      const k = Math.min(1, dt * 4);
      this.zoom += (t.zoom - this.zoom) * k; this.x += (t.x - this.x) * k; this.y += (t.y - this.y) * k;
      return this;
    },
  };

  // ---------- светофор как в F1 ----------
  function renderLights() {
    const el = $('lights');
    if (state.phase !== 'countdown') { if (!el.classList.contains('go')) el.hidden = true; return; }
    const n = Math.ceil(state.countdown);
    const red = clamp(6 - n, 0, 3);
    if (el.hidden || el.dataset.red !== String(red)) {
      if (!el.hidden && red > Number(el.dataset.red || 0)) try { window.RaceAudio.play('count'); } catch {}
      el.hidden = false; el.className = ''; el.dataset.red = red;
      el.innerHTML = `<div class="gantry">${[0, 1, 2, 3].map(i => `<i class="${i < red ? 'red' : ''}"></i>`).join('')}</div><div class="cap">${red < 3 ? 'ПРИГОТОВИЛИСЬ' : 'ВНИМАНИЕ'}</div>`;
    }
  }
  function showGo() {
    const el = $('lights');
    el.hidden = false; el.className = 'go'; el.dataset.red = '';
    el.innerHTML = `<div class="gantry">${'<i class="green"></i>'.repeat(4)}</div><div class="cap">СТАРТ!</div>`;
    try { window.RaceAudio.play('go'); } catch {}
    setTimeout(() => { el.hidden = true; el.className = ''; }, 1300);
  }

  // ---------- победа ----------
  function showWinner(f) {
    const c = countryById(f.winner);
    if (!c) return;
    const hero = f.hero;
    const wins = Object.entries(f.wins || {}).sort((a, b) => b[1] - a[1]);
    $('winner').innerHTML = `<div class="card"><img class="flagBig" src="${flagUrl(c.id, 330, 220)}" alt="">
      <div class="t1">ПОБЕДА!</div><div class="t2">${esc(c.name)}</div>
      ${hero ? `<div class="hero"><span class="lbl">Герой раунда</span>${avaHtml(hero)}<b>${esc(hero.name)}</b><span>${fmt(hero.coins)}${COIN}</span></div>` : ''}
      ${wins.length ? `<div class="wins">Побед за день: ${wins.map(([id, n]) => `${flagImg(id, 54, 36)} ${n}`).join(' ')}</div>` : ''}</div>`;
    $('winner').hidden = false;
    sayLine(`Победа: ${flagImg(c.id, 48, 32)} ${esc(c.name)}!`);
    window.RaceDrama?.finish(f);
  }

  // ---------- главный цикл ----------
  const hooks = { under: [], over: [] };
  const fxHandlers = {};
  function onFx(fx) { (fxHandlers[fx.kind] || (() => {}))(fx); }
  let lastT = performance.now(), fps = { n: 0, t: performance.now(), value: 60 };
  function frame(now) {
    try { step(now); } catch (e) { report(`ошибка в кадре: ${e.message}`); }
    requestAnimationFrame(frame);
  }
  function step(now) {
    const dt = Math.min(.05, (now - lastT) / 1000);
    lastT = now;
    fps.n++;
    if (now - fps.t > 2000) { fps.value = Math.round(fps.n * 1000 / (now - fps.t)); fps.n = 0; fps.t = now; if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'fps', fps: fps.value })); }
    if (!view || !state) return;
    updateCars(dt, now);
    camera.update(dt, now);
    window.Race3D?.update(dt, now);
    ctx.clearRect(0, 0, W, H);
    hooks.under.forEach(h => h(ctx, dt, now));
    hooks.over.forEach(h => h(ctx, dt, now));
    if (camera.zoom > 1.01) {
      const v = ctx.createRadialGradient(W / 2, 790, 220, W / 2, 790, 900);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${(camera.zoom - 1) * .8})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    renderLanes();
    renderHud();
    renderLights();
  }

  // ---------- связь с сервером ----------
  let ws = null, lastMsgAt = Date.now();
  const unsent = [], reported = new Set();
  function report(text) { if (reported.has(text)) return; reported.add(text); unsent.push(text); flush(); }
  function flush() { while (unsent.length && ws?.readyState === 1) ws.send(JSON.stringify({ type: 'log', text: unsent.shift() })); }
  addEventListener('error', e => report(`ошибка: ${e.message} (${String(e.filename).split('/').pop()}:${e.lineno})`));

  function applyView(d) {
    const countriesChanged = JSON.stringify(view?.countries) !== JSON.stringify(d.countries);
    view = d;
    if (countriesChanged) { buildLanes(); renderHowto(); }
    renderPrices();
    try { window.RaceAudio.setVolume(d.volume); } catch {}
  }
  function onMessage(msg) {
    const d = msg.data;
    switch (msg.type) {
      case 'race:state': {
        const prevPhase = state?.phase;
        state = d;
        syncCars(performance.now());
        if (prevPhase === 'countdown' && d.phase === 'running') showGo();
        if (prevPhase === 'finished' && d.phase !== 'finished') $('winner').hidden = true;
        try { window.RaceAudio.music(d.phase === 'running' && !d.paused, d.final ? (d.timeLeft <= 10 ? 2 : 1) : 0); } catch {}
        break;
      }
      case 'race:people': people = d; renderTops(); break;
      case 'race:view': applyView(d); break;
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

  window.Race = {
    fxHandlers, onFx, hooks, camera, carRect, avatarImg, drawFlag, sayLine, fillVars, ctx, cars, countryById, laneOf, laneMid, laneY,
    drawAvatar, avaHtml, flagImg, iconHtml, esc, fmt, rand, pick, clamp, sleep, ease, report, FONT, COIN,
    get view() { return view; }, get state() { return state; }, get people() { return people; },
    stage, W, H, LANE_H, LANE_TOP, START_X, FINISH_X, LABEL_W,
  };

  (async function init() {
    try { applyView(await (await fetch('/api/race/view')).json()); } catch {}
    connect();
    requestAnimationFrame(frame);
    // Шрифт Russo One загружен — перерисовать надписи на текстурах 3D-сцены
    document.fonts?.load(`48px ${FONT}`).then(() => {
      const go = () => window.Race3D?.onFonts();
      if (window.Race3D) go(); else addEventListener('race3d', go, { once: true });
    });
  })();
})();
