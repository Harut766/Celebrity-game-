// Эффекты «Гонки Наций» (2D-слой поверх 3D): каждый подарок — карточка с ником над машиной,
// крупное объявление по центру трассы и своя анимация уровня.
(function () {
  const R = window.Race;
  const I = window.RaceIcons;
  const A = () => window.RaceAudio;
  const { ctx, rand, pick, clamp, esc, fmt, flagImg, avaHtml, iconHtml, countryById, carRect, drawAvatar, FONT, COIN } = R;
  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2;
  const sound = name => { try { A().play(name); } catch {} };

  // ---------- частицы ----------
  const glowCache = new Map();
  function glow(color) {
    if (glowCache.has(color)) return glowCache.get(color);
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  }
  const under = [], over = [];
  const MAX = 1800;
  function emit(layer, p) { if (under.length + over.length < MAX) layer.push({ age: 0, g: 0, drag: 0, rot: 0, vr: 0, ...p }); }
  const U = p => emit(under, p), O = p => emit(over, p);

  function burst(x, y, n, { colors = ['#ffd23a', '#fff'], speed = 520, life = .6, size = 4, g = 600 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(.3, 1) * speed;
      O({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.5, 1) * life, size, color: pick(colors), g, drag: 1.8 });
    }
  }
  function explosion(x, y, scale = 1) {
    for (let i = 0; i < 24 * scale; i++) {
      const a = rand(0, TAU), v = rand(60, 380) * scale;
      O({ type: 'fire', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rand(.35, .8), size: rand(36, 76) * scale, color: i % 3 ? '#ff6a1a' : '#ffd23a', drag: 2.6 });
    }
    for (let i = 0; i < 12 * scale; i++) U({ type: 'smoke', x: x + rand(-24, 24), y: y + rand(-14, 14), vx: rand(-60, 30), vy: rand(-80, -20), life: rand(.9, 1.6), size: rand(20, 38) * scale, drag: 1 });
    O({ type: 'ring', x, y, life: .45, size: 140 * scale, color: '#ffe0a0' });
    burst(x, y, 18 * scale, { speed: 820 * scale });
  }
  function confetti(x, y, colors, n = 80, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * .95, -Math.PI * .05), v = rand(400, 1150) * spread;
      O({ type: 'confetti', x: x + rand(-40, 40), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(2.2, 3.4), size: rand(12, 20), g: 800, drag: 1.3, rot: rand(0, TAU), vr: rand(-12, 12), color: pick(colors) });
    }
  }
  function firework(x, y, colors) {
    for (let i = 0; i < 52; i++) {
      const a = i / 52 * TAU, v = rand(260, 440);
      O({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1, 1.5), size: 5, color: pick(colors), g: 240, drag: 1.5 });
    }
    sound('firework');
  }

  // ---------- пламя нитро из выхлопа ----------
  const trails = new Map();
  const rank = k => ({ nitro: 1, turbo: 2, super: 3, legend: 4 }[k] || 0);
  function trail(id, sec, kind = 'nitro') {
    const t = trails.get(id), now = performance.now();
    trails.set(id, { until: Math.max(now + sec * 1000, t?.until || 0), kind: t && t.until > now && rank(t.kind) > rank(kind) ? t.kind : kind });
  }
  const TRAIL = {
    nitro: { colors: ['#ff8a1a', '#ffd23a'], n: 3, size: 30 },
    turbo: { colors: ['#4ad8ff', '#bff4ff', '#ffffff'], n: 5, size: 38 },
    super: { colors: ['#ff4ad0', '#ffd23a', '#ff8a1a'], n: 6, size: 42 },
    legend: { colors: ['#ffd23a', '#fff3b0', '#ff9a1a'], n: 7, size: 48 },
  };

  // ---------- карточки «аватар + ник + эффект» над машиной (текст ≥ 36px) ----------
  const cards = [];
  const images = new Map();
  function img(url) {
    if (!url) return null;
    if (!images.has(url)) { const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = url; images.set(url, i); }
    const i = images.get(url);
    return i.complete && i.naturalWidth ? i : null;
  }
  function card(country, fx, label, color = '#ffd23a', tier = null) {
    const busy = cards.filter(c => c.country === country).length;
    const used = new Set(cards.filter(c => c.country === country).map(c => c.slot));
    let slot = 0; while (used.has(slot) && slot < 2) slot++;
    cards.push({ country, name: fx.name, avatar: fx.avatar, giftImage: fx.giftImage, label, color, tier, age: 0, life: busy > 2 ? 1.4 : 2.4, slot });
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function outlined(text, x, y, color) {
    ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function drawCards(dt) {
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i];
      c.age += dt;
      if (c.age >= c.life) { cards.splice(i, 1); continue; }
      const r = carRect(c.country);
      if (!r) continue;
      const k = c.age / c.life;
      const pop = c.age < .18 ? 1 - (1 - c.age / .18) ** 3 : 1;
      ctx.save();
      ctx.globalAlpha = k > .8 ? (1 - k) / .2 : 1;
      ctx.font = `36px ${FONT}`;
      const name = [...c.name].slice(0, 12).join('');
      const tw = Math.max(ctx.measureText(name).width, ctx.measureText(c.label).width);
      const icon = c.tier ? 48 : 0, gift = img(c.giftImage) ? 56 : 0;
      const w = 74 + tw + (icon ? icon + 10 : 0) + (gift ? gift + 8 : 0) + 24, h = 92;
      const x = clamp(r.cx + 40 + c.slot * 60, R.LABEL_W + w / 2 + 6, 1070 - w / 2), y = r.y - 30 - c.slot * 98 - k * 40;
      ctx.translate(x, y); ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(6,8,22,.93)'; roundRect(-w / 2, -h / 2, w, h, 26); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = c.color; ctx.stroke();
      drawAvatar({ name: c.name, avatar: c.avatar }, -w / 2 + 40, 0, 30, c.color, 3);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      outlined(name, -w / 2 + 78, -19, '#fff');
      outlined(c.label, -w / 2 + 78, 23, c.color);
      let rx = w / 2 - 12;
      if (gift) { ctx.drawImage(img(c.giftImage), rx - gift, -gift / 2, gift, gift); rx -= gift + 8; }
      if (icon) { const ti = I.tierImg(c.tier); if (ti.complete) ctx.drawImage(ti, rx - icon, -icon / 2, icon, icon); }
      ctx.restore();
    }
  }

  // ---------- ракеты ----------
  const rockets = [];
  function launch(from, to, { color = '#ff5a3a', dur = .8, big = false } = {}) {
    rockets.push({ from, to, t: 0, dur, color, big });
    sound(big ? 'superLaunch' : 'rocket');
  }
  function drawRockets(dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const rk = rockets[i];
      rk.t += dt / rk.dur;
      const a = carRect(rk.from), b = carRect(rk.to);
      if (!a || !b || rk.t >= 1) { rockets.splice(i, 1); continue; }
      const sx = a.front, sy = a.y + 10, ex = b.cx, ey = b.mid;
      const k = rk.t, arc = Math.abs(sy - ey) * .3 + 160;
      const pos = q => ({ x: sx + (ex - sx) * q, y: sy + (ey - sy) * q - arc * 4 * q * (1 - q) });
      const p = pos(k), p2 = pos(Math.min(1, k + .02));
      const ang = Math.atan2(p2.y - p.y, p2.x - p.x);
      U({ type: 'fire', x: p.x, y: p.y, vx: -Math.cos(ang) * 120 + rand(-30, 30), vy: -Math.sin(ang) * 120 + rand(-30, 30), life: .35, size: rk.big ? 40 : 30, color: rk.color, drag: 2 });
      U({ type: 'smoke', x: p.x, y: p.y, vx: rand(-20, 20), vy: rand(-30, 0), life: .9, size: 12, drag: 1, light: true });
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); const s = rk.big ? 1.7 : 1.3; ctx.scale(s, s);
      ctx.fillStyle = '#eef1f6'; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(10, -8); ctx.lineTo(-18, -8); ctx.lineTo(-18, 8); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rk.color; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(14, -8); ctx.lineTo(14, 8); ctx.fill();
      ctx.fillStyle = '#c22'; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-27, -17); ctx.lineTo(-10, -8); ctx.fill(); ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-27, 17); ctx.lineTo(-10, 8); ctx.fill();
      ctx.drawImage(glow('#ffb03a'), -48, -16, 32, 32);
      ctx.restore();
    }
  }

  // ---------- состояния машин: пламя, щит, занос, дым ----------
  const shieldIcon = I.tierImg('shield');
  function drawCarStates(now) {
    const st = R.state;
    if (!st) return;
    const t = now / 1000;
    for (const c of st.cars) {
      const r = carRect(c.id);
      if (!r) continue;
      const tr = trails.get(c.id);
      if (tr && tr.until > now) {
        const spec = TRAIL[tr.kind] || TRAIL.nitro;
        for (let i = 0; i < spec.n; i++) U({ type: 'fire', x: r.exX, y: r.exY + rand(-5, 5), vx: rand(-520, -280), vy: rand(-30, 30), life: rand(.16, .3), size: spec.size * rand(.7, 1.1), color: pick(spec.colors), drag: 1 });
        O({ type: 'line', x: r.x - rand(0, 200), y: r.y + rand(8, r.h - 8), vx: -1000, vy: 0, life: .16, size: rand(50, 110), color: 'rgba(255,255,255,.55)' });
      } else if (st.phase === 'running' && Math.random() < .3) {
        U({ type: 'smoke', x: r.exX, y: r.exY, vx: rand(-90, -40), vy: rand(-20, 0), life: .7, size: 7, drag: 1.2, light: true });
      }
      if (c.back || c.stun) { if (Math.random() < .6) U({ type: 'smoke', x: r.cx + rand(-40, 40), y: r.y + 20, vx: rand(-40, 40), vy: rand(-90, -30), life: rand(.6, 1), size: rand(12, 22), drag: 1 }); }
      if (c.shield > 0) {
        const pulse = .6 + .15 * Math.sin(t * 6);
        ctx.save();
        ctx.translate(r.cx, r.mid);
        const rx = r.w * .62, ry = r.h * .95;
        const gr = ctx.createRadialGradient(0, 0, 20, 0, 0, rx);
        gr.addColorStop(0, 'rgba(90,200,255,0)'); gr.addColorStop(.75, `rgba(90,200,255,${.16 * pulse})`); gr.addColorStop(1, `rgba(170,235,255,${.7 * pulse})`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = `rgba(200,245,255,${.95 * pulse})`; ctx.stroke();
        if (shieldIcon.complete) ctx.drawImage(shieldIcon, rx - 30, -ry - 6, 44, 44);
        ctx.font = `36px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        outlined(String(Math.ceil(c.shield)), rx + 18, -ry + 16, '#dff6ff');
        ctx.restore();
      }
      if (c.spin && Math.random() < .5) U({ type: 'smoke', x: r.cx + rand(-r.w / 2, r.w / 2), y: r.mid + r.h * .3, vx: rand(-70, 70), vy: rand(-40, -10), life: .8, size: 18, drag: 1, light: true });
    }
  }

  // ---------- частицы ----------
  function step(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) { list.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy = p.vy * k + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  }
  const heart = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ff3d7f'; g.beginPath(); g.moveTo(32, 56); g.bezierCurveTo(4, 36, 4, 10, 22, 10); g.bezierCurveTo(28, 10, 32, 16, 32, 20); g.bezierCurveTo(32, 16, 36, 10, 42, 10); g.bezierCurveTo(60, 10, 60, 36, 32, 56); g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); return c; })();
  function draw(list) {
    for (const p of list) {
      const f = p.age / p.life;
      if (p.type === 'smoke') {
        ctx.globalAlpha = (1 - f) * (p.light ? .3 : .5);
        ctx.fillStyle = p.light ? '#d8d8e0' : '#2a2626';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + f * 1.6), 0, TAU); ctx.fill();
      } else if (p.type === 'confetti') {
        ctx.globalAlpha = Math.min(1, (1 - f) * 3);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 1.7));
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
      } else if (p.type === 'heart') {
        ctx.globalAlpha = 1 - f; ctx.drawImage(heart, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of list) {
      const f = p.age / p.life;
      if (p.type === 'fire') {
        const s = p.size * (1 + f * .7);
        ctx.globalAlpha = (1 - f) * .9;
        ctx.drawImage(glow(f < .2 ? '#fff0a0' : p.color), p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.type === 'spark') {
        ctx.globalAlpha = 1 - f; ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); ctx.stroke();
      } else if (p.type === 'ring') {
        ctx.globalAlpha = 1 - f; ctx.strokeStyle = p.color; ctx.lineWidth = 10 * (1 - f) + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - (1 - f) ** 3), 0, TAU); ctx.stroke();
      } else if (p.type === 'line') {
        ctx.globalAlpha = 1 - f; ctx.strokeStyle = p.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.size, p.y); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  R.hooks.under.push((g, dt, now) => { drawCarStates(now); step(under, dt); draw(under); });
  R.hooks.over.push((g, dt) => { drawRockets(dt); step(over, dt); draw(over); drawCards(dt); });

  // ---------- крупные объявления по центру трассы (по очереди, не перекрывают друг друга) ----------
  const bannerQueue = [];
  let bannerBusy = false;
  function banner(html, { color = '#ffd23a', ms = 2000, priority = 1 } = {}) {
    // мелкие подарки при наплыве не ждут — их и так видно карточкой над машиной
    if (priority <= 1 && bannerQueue.length >= 2) return;
    if (bannerQueue.length >= 5) {
      const i = bannerQueue.findIndex(b => b.priority < priority);
      if (i < 0) return;
      bannerQueue.splice(i, 1);
    }
    bannerQueue.push({ html, color, ms, priority });
    bannerQueue.sort((a, b) => b.priority - a.priority);
    if (!bannerBusy) nextBanner();
  }
  async function nextBanner() {
    while (!$('legend').hidden) await R.sleep(200);
    const b = bannerQueue.shift();
    if (!b) { bannerBusy = false; return; }
    bannerBusy = true;
    const el = document.createElement('div');
    el.className = 'banner';
    el.style.setProperty('--bc', b.color);
    el.innerHTML = b.html;
    $('banners').appendChild(el);
    await R.sleep(bannerQueue.length > 1 ? b.ms * .6 : b.ms);
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
    await R.sleep(360);
    nextBanner();
  }
  const short = name => esc([...String(name || '')].slice(0, 12).join(''));
  const flagName = id => { const c = countryById(id); return c ? `${flagImg(id, 66, 44)} ${esc(c.name)}` : ''; };
  function shake(big) { const s = R.stage; s.classList.remove('shake', 'bigShake'); void s.offsetWidth; s.classList.add(big ? 'bigShake' : 'shake'); }
  function popPrice(tier) {
    const li = document.querySelector(`#prices li[data-tier="${tier}"]`);
    if (li) { li.classList.remove('pop'); void li.offsetWidth; li.classList.add('pop'); }
  }
  const colorsOf = id => countryById(id)?.colors || ['#fff'];
  const TITLE = { nitro: 'НИТРО', turbo: 'ТУРБО', shield: 'ЩИТ', rocket: 'РАКЕТА', super: 'СУПЕР-АТАКА', chaos: 'ХАОС', legend: 'ЛЕГЕНДА' };
  const label = fx => `${(fx.title || '').toUpperCase()}${fx.final ? ' ×2' : ''}`;
  // «Nar → РАКЕТА по 🇷🇺» / «Nar → НИТРО для 🇦🇲»
  function giftBanner(fx, { targets = null, priority = 1, ms = 1700 } = {}) {
    const color = I.tierColor(fx.tier || fx.kind);
    const what = targets?.length
      ? `${TITLE[fx.tier]} по ${targets.map(t => flagImg(t, 66, 44)).join(' ')}`
      : `${TITLE[fx.tier]} для ${flagImg(fx.country, 66, 44)}`;
    banner(`<div class="big">${avaHtml(fx)}<span>${short(fx.name)}</span>${fx.giftImage ? `<img class="gift" src="${esc(fx.giftImage)}" referrerpolicy="no-referrer" alt="">` : ''}</div>
      <div class="sub">→ ${iconHtml(fx.tier)} ${what}${fx.final ? ' ×2' : ''}</div>`, { color, priority, ms });
  }

  // ---------- эффекты по уровням ----------
  const H = R.fxHandlers;
  const tierCard = (fx, color) => card(fx.country, fx, label(fx), color, fx.tier);
  H.nitro = fx => { tierCard(fx, '#ffb347'); trail(fx.country, 1.6, 'nitro'); popPrice('nitro'); sound('nitro'); giftBanner(fx); const r = carRect(fx.country); if (r) burst(r.exX, r.exY, 10, { colors: ['#ffb03a', '#fff'] }); };
  H.turbo = fx => { tierCard(fx, '#4ad8ff'); trail(fx.country, 2.6, 'turbo'); popPrice('turbo'); sound('turbo'); giftBanner(fx); const r = carRect(fx.country); if (r) { O({ type: 'ring', x: r.cx, y: r.mid, life: .4, size: 130, color: '#9ff0ff' }); burst(r.front, r.mid, 16, { colors: ['#4ad8ff', '#fff'] }); } };
  H.shield = fx => { tierCard(fx, '#8fb4ff'); popPrice('shield'); sound('shield'); trail(fx.country, 1, 'nitro'); giftBanner(fx, { priority: 2 }); const r = carRect(fx.country); if (r) O({ type: 'ring', x: r.cx, y: r.mid, life: .6, size: 150, color: '#bff0ff' }); };
  H.rocket = fx => {
    tierCard(fx, '#ff6a5a'); popPrice('rocket'); trail(fx.country, 1.2, 'nitro');
    giftBanner(fx, { targets: fx.targets, priority: 3 });
    (fx.targets || []).forEach(t => launch(fx.country, t));
  };
  H.super = fx => {
    tierCard(fx, '#ff6af0'); popPrice('super'); trail(fx.country, 3, 'super');
    giftBanner(fx, { targets: fx.targets, priority: 4, ms: 2000 });
    (fx.targets || []).forEach((t, i) => setTimeout(() => launch(fx.country, t, { color: '#ff3ad0', big: true }), i * 120));
  };
  H.chaos = fx => {
    tierCard(fx, '#b48aff'); popPrice('chaos'); trail(fx.country, 2.5, 'super'); shake(true); sound('chaos');
    for (const t of fx.targets || []) { const r = carRect(t); if (r) burst(r.cx, r.mid, 22, { colors: ['#b48aff', '#ffe94a', '#fff'] }); }
    giftBanner(fx, { targets: fx.targets, priority: 4, ms: 2400 });
  };
  H.legend = fx => { popPrice('legend'); legend(fx); };
  H.hit = fx => {
    const r = carRect(fx.target);
    if (!r) return;
    if (fx.blocked) {
      O({ type: 'ring', x: r.cx, y: r.mid, life: .5, size: 140, color: '#bff0ff' });
      burst(r.cx, r.mid, 20, { colors: ['#bff0ff', '#fff'] });
      sound('block');
      banner(`<div class="big">${iconHtml('shield')} ЩИТ СПАС!</div><div class="sub">${flagName(fx.target)}</div>`, { color: '#8fb4ff', ms: 1400, priority: 2 });
      return;
    }
    explosion(r.cx, r.mid, fx.tier === 'super' ? 1.4 : 1);
    sound('explosion');
    shake(fx.tier === 'super');
    banner(`<div class="big">${iconHtml('rocket')} ПОПАДАНИЕ!</div><div class="sub">${flagName(fx.target)} · ОТВЕТИТЕ?</div>`, { color: '#ff5a4a', ms: 1800, priority: 3 });
  };
  H.likeBonus = fx => { trail(fx.country, 2, 'turbo'); card(fx.country, { name: 'ЛАЙКИ', avatar: '' }, 'РЫВОК КОМАНДЫ!', '#ff6a9a', 'nitro'); sound('turbo'); };
  H.likes = fx => { trail(fx.country, .9, 'nitro'); const r = carRect(fx.country); if (r) for (let i = 0; i < 6; i++) O({ type: 'heart', x: r.cx + rand(-r.w / 2, r.w / 2), y: r.y, vx: rand(-40, 40), vy: rand(-170, -90), life: 1, size: 40, drag: 0 }); sound('like'); };
  H.follow = fx => { card(fx.country, fx, 'ПОДПИСКА · ЩИТ', '#8fb4ff', 'shield'); sound('shield'); };
  H.share = fx => { card(fx.country, fx, 'РЕПОСТ · РЫВОК', '#9aff7a', 'nitro'); trail(fx.country, 1.2, 'nitro'); sound('nitro'); };
  H.join = fx => { card(fx.country, fx, `ЗА ${(countryById(fx.country)?.name || '').toUpperCase()}!`, '#9aff7a'); sound('join'); };
  H.arrive = fx => { card(fx.country, fx, 'НА СТАРТЕ!', '#cfd6ff'); };
  H.hello = () => {};
  H.rescue = fx => banner(`<div class="big">${avaHtml(fx)}<span>${short(fx.name)}</span></div><div class="sub">спасает ${flagName(fx.country)}!</div>`, { color: '#9aff7a', ms: 1700, priority: 2 });
  H.queued = fx => card(fx.country, fx, 'СРАБОТАЕТ НА СТАРТЕ', '#cfd6ff');
  H.wait = fx => card(fx.country, fx, `${label(fx)} · В ОЧЕРЕДИ`, '#cfd6ff', fx.tier);
  H.start = () => sound('start');
  H.final = fx => { banner(`<div class="big">${iconHtml('nitro')} ФИНАЛ ×${fx.multiplier || 2}</div><div class="sub">Все эффекты удваиваются!</div>`, { color: '#ffb21a', ms: 2600, priority: 5 }); sound('final'); };

  // Озвучка «Спасибо, Nar, за ракету!» (включается в панели)
  const THANKS = { nitro: 'нитро', turbo: 'турбо', shield: 'щит', rocket: 'ракету', super: 'супер-атаку', chaos: 'хаос', legend: 'легенду' };
  for (const id of Object.keys(THANKS)) {
    const inner = H[id];
    H[id] = fx => { inner(fx); if (R.view?.tts && fx.name) try { A().thank(fx.name, THANKS[id]); } catch {} };
  }

  // ---------- Легенда: кино на весь экран ----------
  let legendBusy = Promise.resolve();
  function legend(fx) {
    legendBusy = legendBusy.then(async () => {
      const el = $('legend');
      const c = countryById(fx.country);
      el.innerHTML = `<div class="rays"></div><div class="tag">${iconHtml('legend')} ЛЕГЕНДА ${iconHtml('legend')}</div>
        ${avaHtml(fx)}
        <div class="nm">${esc(fx.name)}</div>
        <div class="what">${fx.giftImage ? `<img class="gift" src="${esc(fx.giftImage)}" referrerpolicy="no-referrer" alt="">` : ''}${fx.coins ? `${fmt(fx.coins)}${COIN}` : ''} за ${c ? `${flagImg(c.id, 96, 64)} ${esc(c.name)}` : ''}</div>`;
      el.hidden = false;
      sound('legend');
      confetti(540, 1200, colorsOf(fx.country), 150, 1.25);
      for (let i = 0; i < 5; i++) setTimeout(() => firework(rand(160, 920), rand(500, 900), colorsOf(fx.country)), 600 + i * 800);
      await R.sleep(((fx.sec || 6) - .2) * 1000);
      el.hidden = true;
      trail(fx.country, 4, 'legend');
      shake(true);
    });
  }

  window.RaceFx = { banner, confetti, firework, explosion, burst, trail, card, shake, emitOver: O, emitUnder: U, glow, sound, outlined };
})();
