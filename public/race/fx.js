// Эффекты «Гонки Наций»: каждый подарок — видимая реакция с ником, у каждого уровня своя анимация.
(function () {
  const R = window.Race;
  const A = () => window.RaceAudio;
  const { ctx, rand, pick, clamp, esc, fmt, flagImg, avaHtml, countryById, carRect, drawAvatar, hexA } = R;
  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2;
  const sound = (name, opts) => { try { A().play(name, opts); } catch {} };

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
  const MAX = 1600;
  function emit(layer, p) { if (under.length + over.length < MAX) layer.push({ age: 0, g: 0, drag: 0, rot: 0, vr: 0, ...p }); }
  const U = p => emit(under, p), O = p => emit(over, p);

  function burst(x, y, n, { colors = ['#ffd45a', '#fff'], speed = 500, life = .6, size = 4, g = 600 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(.3, 1) * speed;
      O({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.5, 1) * life, size, color: pick(colors), g, drag: 1.8 });
    }
  }
  function explosion(x, y, scale = 1) {
    for (let i = 0; i < 22 * scale; i++) {
      const a = rand(0, TAU), v = rand(60, 360) * scale;
      O({ type: 'fire', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rand(.35, .8), size: rand(30, 64) * scale, color: i % 3 ? '#ff6a1a' : '#ffd23a', drag: 2.6 });
    }
    for (let i = 0; i < 10 * scale; i++) U({ type: 'smoke', x: x + rand(-20, 20), y: y + rand(-14, 14), vx: rand(-60, 30), vy: rand(-70, -20), life: rand(.9, 1.6), size: rand(18, 34) * scale, drag: 1 });
    O({ type: 'ring', x, y, life: .45, size: 120 * scale, color: '#ffe0a0' });
    burst(x, y, 16 * scale, { speed: 800 * scale });
  }
  function confetti(x, y, colors, n = 80, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * .95, -Math.PI * .05) , v = rand(400, 1100) * spread;
      O({ type: 'confetti', x: x + rand(-40, 40), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(2.2, 3.4), size: rand(10, 18), g: 800, drag: 1.3, rot: rand(0, TAU), vr: rand(-12, 12), color: pick(colors) });
    }
  }
  function firework(x, y, colors) {
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, v = rand(240, 420);
      O({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1, 1.5), size: 4, color: pick(colors), g: 240, drag: 1.5 });
    }
    sound('firework');
  }

  // Пламя нитро за машиной
  const trails = new Map(); // страна → { until, kind }
  function trail(id, sec, kind = 'nitro') {
    const t = trails.get(id);
    trails.set(id, { until: performance.now() + sec * 1000, kind: t && t.until > performance.now() && rank(t.kind) > rank(kind) ? t.kind : kind });
  }
  const rank = k => ({ nitro: 1, turbo: 2, super: 3, legend: 4 }[k] || 0);
  const TRAIL = {
    nitro: { colors: ['#ff8a1a', '#ffd23a'], n: 2, size: 22 },
    turbo: { colors: ['#4ad8ff', '#bff4ff', '#ffffff'], n: 4, size: 30 },
    super: { colors: ['#ff4a8a', '#ffd23a', '#ff8a1a'], n: 5, size: 34 },
    legend: { colors: ['#ffd45a', '#fff3b0', '#ff9a1a'], n: 6, size: 40 },
  };

  // ---------- карточки «ник + подарок» над машиной ----------
  const cards = [];
  const images = new Map();
  function img(url) {
    if (!url) return null;
    if (!images.has(url)) { const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = url; images.set(url, i); }
    const i = images.get(url);
    return i.complete && i.naturalWidth ? i : null;
  }
  function card(country, fx, label, color = '#ffd45a') {
    const busy = cards.filter(c => c.country === country && c.age < c.life).length;
    cards.push({ country, name: fx.name, avatar: fx.avatar, giftImage: fx.giftImage, coins: fx.coins, label, color, age: 0, life: busy > 3 ? 1.4 : 2.4, slot: busy });
  }
  function drawCards(dt) {
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i];
      c.age += dt;
      if (c.age >= c.life) { cards.splice(i, 1); continue; }
      const r = carRect(c.country);
      if (!r) continue;
      const k = c.age / c.life;
      const pop = c.age < .18 ? ease(c.age / .18) : 1;
      const alpha = k > .8 ? (1 - k) / .2 : 1;
      const x = clamp(r.front - 70, 230, 820);
      const y = r.y - 18 - c.slot * 10 - k * 46;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y); ctx.scale(pop, pop);
      ctx.font = '900 26px Arial';
      const text = `${c.name}`;
      const label = c.label;
      const tw = Math.max(ctx.measureText(text).width, (ctx.font = '800 22px Arial', ctx.measureText(label).width));
      const w = 58 + tw + (c.giftImage ? 50 : 0) + 22, h = 56;
      ctx.fillStyle = 'rgba(8,10,24,.9)';
      roundRect(-w / 2, -h / 2, w, h, 28); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = c.color; ctx.stroke();
      drawAvatar({ name: c.name, avatar: c.avatar }, -w / 2 + 28, 0, 22, c.color, 2.5);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '900 26px Arial'; ctx.fillStyle = '#fff'; ctx.fillText(text, -w / 2 + 58, -11);
      ctx.font = '800 22px Arial'; ctx.fillStyle = c.color; ctx.fillText(label, -w / 2 + 58, 14);
      const gi = img(c.giftImage);
      if (gi) ctx.drawImage(gi, w / 2 - 54, -22, 44, 44);
      ctx.restore();
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  const ease = t => 1 - (1 - t) ** 3 * (1 - 2.2 * t * (1 - t));

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
      const sx = a.front, sy = a.y + 10, ex = b.x + b.w * .55, ey = b.mid;
      const k = rk.t, arc = Math.abs(sy - ey) * .3 + 140;
      const x = sx + (ex - sx) * k, y = sy + (ey - sy) * k - arc * 4 * k * (1 - k);
      const k2 = Math.min(1, k + .02);
      const x2 = sx + (ex - sx) * k2, y2 = sy + (ey - sy) * k2 - arc * 4 * k2 * (1 - k2);
      const ang = Math.atan2(y2 - y, x2 - x);
      U({ type: 'fire', x, y, vx: -Math.cos(ang) * 120 + rand(-30, 30), vy: -Math.sin(ang) * 120 + rand(-30, 30), life: .35, size: rk.big ? 34 : 24, color: rk.color, drag: 2 });
      U({ type: 'smoke', x, y, vx: rand(-20, 20), vy: rand(-30, 0), life: .9, size: 10, drag: 1, light: true });
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      const s = rk.big ? 1.4 : 1;
      ctx.scale(s, s);
      ctx.fillStyle = '#e8ecf4'; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(10, -8); ctx.lineTo(-18, -8); ctx.lineTo(-18, 8); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rk.color; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(14, -8); ctx.lineTo(14, 8); ctx.fill();
      ctx.fillStyle = '#c22'; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-26, -16); ctx.lineTo(-10, -8); ctx.fill(); ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-26, 16); ctx.lineTo(-10, 8); ctx.fill();
      ctx.drawImage(glow('#ffb03a'), -46, -16, 32, 32);
      ctx.restore();
    }
  }

  // ---------- щиты, буксы, дым ----------
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
        for (let i = 0; i < spec.n; i++) U({ type: 'fire', x: r.x + 4, y: r.y + 46 + rand(-6, 6), vx: rand(-420, -220), vy: rand(-30, 30), life: rand(.18, .32), size: spec.size * rand(.7, 1.1), color: pick(spec.colors), drag: 1 });
        if (tr.kind !== 'nitro') O({ type: 'line', x: r.x - rand(0, 160), y: r.y + rand(4, r.h), vx: -900, vy: 0, life: .18, size: rand(40, 90), color: 'rgba(255,255,255,.5)' });
      }
      if (c.back || c.stun) { if (Math.random() < .5) U({ type: 'smoke', x: r.x + rand(10, r.w - 10), y: r.y + 20, vx: rand(-40, 40), vy: rand(-80, -30), life: rand(.6, 1), size: rand(10, 20), drag: 1 }); }
      if (c.shield > 0) {
        const pulse = .55 + .15 * Math.sin(t * 6);
        ctx.save();
        ctx.translate(r.x + r.w / 2, r.mid);
        const gr = ctx.createRadialGradient(0, 0, 20, 0, 0, 104);
        gr.addColorStop(0, 'rgba(90,200,255,0)'); gr.addColorStop(.75, `rgba(90,200,255,${.18 * pulse})`); gr.addColorStop(1, `rgba(170,235,255,${.75 * pulse})`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, 104, 52, 0, 0, TAU); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = `rgba(200,245,255,${.9 * pulse})`; ctx.stroke();
        ctx.font = '900 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#dff6ff'; ctx.strokeStyle = '#003a5a'; ctx.lineWidth = 4;
        const label = `🛡️${Math.ceil(c.shield)}`;
        ctx.strokeText(label, 70, -38); ctx.fillText(label, 70, -38);
        ctx.restore();
      }
      if (c.spin) {
        ctx.save(); ctx.translate(r.x + r.w / 2, r.y - 6);
        for (let i = 0; i < 4; i++) {
          const a = t * 6 + i * TAU / 4;
          ctx.fillStyle = '#ffe94a'; R.ctx.font = '26px Arial';
          ctx.fillText('★', Math.cos(a) * 46 - 8, Math.sin(a) * 12);
        }
        ctx.restore();
        if (Math.random() < .3) U({ type: 'smoke', x: r.x + rand(0, r.w), y: r.y + r.h - 6, vx: rand(-60, 60), vy: rand(-40, -10), life: .8, size: 16, drag: 1, light: true });
      }
    }
  }

  // ---------- отрисовка частиц ----------
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
        ctx.globalAlpha = 1 - f; ctx.font = `${p.size}px Arial`; ctx.textAlign = 'center'; ctx.fillText('❤️', p.x, p.y);
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

  // ---------- объявления (по очереди, не перекрывают друг друга) ----------
  const bannerQueue = [];
  let bannerBusy = false;
  function banner(html, { color = '#ffd45a', ms = 2200, priority = 1 } = {}) {
    if (bannerQueue.length >= 4) {
      const i = bannerQueue.findIndex(b => b.priority < priority);
      if (i < 0) return;
      bannerQueue.splice(i, 1);
    }
    bannerQueue.push({ html, color, ms, priority });
    bannerQueue.sort((a, b) => b.priority - a.priority);
    if (!bannerBusy) nextBanner();
  }
  async function nextBanner() {
    while (!$('legend').hidden) await R.sleep(200); // во время «Легенды» объявления ждут
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
  const flagName = id => { const c = countryById(id); return c ? `${flagImg(id, 66, 44)} ${esc(c.name)}` : ''; };
  const who = fx => `${avaHtml(fx)} ${esc(fx.name)}`;
  function shake(big) { const s = R.stage; s.classList.remove('shake', 'bigShake'); void s.offsetWidth; s.classList.add(big ? 'bigShake' : 'shake'); }
  function popPrice(tier) {
    const li = document.querySelector(`#prices li[data-tier="${tier}"]`);
    if (li) { li.classList.remove('pop'); void li.offsetWidth; li.classList.add('pop'); }
  }
  const colorsOf = id => countryById(id)?.colors || ['#fff'];
  const giftLabel = fx => `${fx.icon || ''} ${fx.title || ''}${fx.final ? ' ×2' : ''}`;

  // ---------- эффекты по уровням ----------
  const H = R.fxHandlers;
  H.nitro = fx => { card(fx.country, fx, giftLabel(fx), '#ffb03a'); trail(fx.country, 1.6, 'nitro'); popPrice('nitro'); sound('nitro'); const r = carRect(fx.country); if (r) burst(r.x, r.mid, 8, { colors: ['#ffb03a', '#fff'] }); };
  H.turbo = fx => { card(fx.country, fx, giftLabel(fx), '#4ad8ff'); trail(fx.country, 2.6, 'turbo'); popPrice('turbo'); sound('turbo'); const r = carRect(fx.country); if (r) { O({ type: 'ring', x: r.x + r.w / 2, y: r.mid, life: .4, size: 110, color: '#9ff0ff' }); burst(r.front, r.mid, 14, { colors: ['#4ad8ff', '#fff'] }); } };
  H.shield = fx => { card(fx.country, fx, giftLabel(fx), '#7ad8ff'); popPrice('shield'); sound('shield'); trail(fx.country, 1, 'nitro'); const r = carRect(fx.country); if (r) O({ type: 'ring', x: r.x + r.w / 2, y: r.mid, life: .6, size: 130, color: '#bff0ff' }); };
  H.rocket = fx => {
    card(fx.country, fx, giftLabel(fx), '#ff6a4a'); popPrice('rocket'); trail(fx.country, 1.2, 'nitro');
    (fx.targets || []).forEach(t => launch(fx.country, t));
  };
  H.super = fx => {
    card(fx.country, fx, giftLabel(fx), '#ff4a8a'); popPrice('super'); trail(fx.country, 3, 'super');
    (fx.targets || []).forEach((t, i) => setTimeout(() => launch(fx.country, t, { color: '#ff3a8a', big: true }), i * 120));
    banner(`<div class="big">💥 СУПЕР-АТАКА</div><div class="sub">${who(fx)} → ${(fx.targets || []).map(t => flagImg(t, 54, 36)).join(' ')}</div>`, { color: '#ff4a8a', ms: 1800, priority: 3 });
  };
  H.chaos = fx => {
    card(fx.country, fx, giftLabel(fx), '#c07aff'); popPrice('chaos'); trail(fx.country, 2.5, 'super'); shake(true); sound('chaos');
    for (const t of fx.targets || []) { const r = carRect(t); if (r) burst(r.x + r.w / 2, r.mid, 20, { colors: ['#c07aff', '#ffe94a', '#fff'] }); }
    banner(`<div class="big">🌪️ ХАОС!</div><div class="sub">${who(fx)} · соперники буксуют ${fx.sec || 5} сек</div>`, { color: '#c07aff', ms: 2600, priority: 4 });
  };
  H.legend = fx => { popPrice('legend'); legend(fx); };
  H.hit = fx => {
    const r = carRect(fx.target);
    if (!r) return;
    if (fx.blocked) {
      O({ type: 'ring', x: r.x + r.w / 2, y: r.mid, life: .5, size: 120, color: '#bff0ff' });
      burst(r.x + r.w / 2, r.mid, 18, { colors: ['#bff0ff', '#fff'] });
      sound('block');
      banner(`<div class="big">🛡️ ЩИТ СПАС!</div><div class="sub">команда ${flagName(fx.target)} не пострадала</div>`, { color: '#7ad8ff', ms: 1500, priority: 2 });
      return;
    }
    explosion(r.x + r.w * .55, r.mid, fx.tier === 'super' ? 1.4 : 1);
    sound('explosion');
    shake(fx.tier === 'super');
    banner(`<div class="big">💥 ПОПАДАНИЕ!</div><div class="sub">команда ${flagName(fx.target)} отброшена · Ответите? 🚀 от 30🪙</div>`, { color: '#ff5a4a', ms: 2000, priority: 3 });
  };
  H.likes = fx => { trail(fx.country, .9, 'nitro'); const r = carRect(fx.country); if (r) for (let i = 0; i < 6; i++) O({ type: 'heart', x: r.x + rand(0, r.w), y: r.y, vx: rand(-40, 40), vy: rand(-160, -90), life: 1, size: 26, drag: 0 }); sound('like'); };
  H.follow = fx => { card(fx.country, fx, '➕ Подписка · щит команде', '#7ad8ff'); sound('shield'); };
  H.share = fx => { card(fx.country, fx, '🔁 Репост · рывок', '#9aff7a'); trail(fx.country, 1.2, 'nitro'); sound('nitro'); };
  H.join = fx => { card(fx.country, fx, `в команде ${countryById(fx.country)?.name || ''}!`, '#9aff7a'); sound('join'); };
  H.arrive = fx => { card(fx.country, fx, 'на старте!', '#cfd6ff'); };
  H.hello = fx => { hello(fx); };
  H.rescue = fx => banner(`<div class="big">${esc(fx.name)} спасает ${flagImg(fx.country, 66, 44)}!</div><div class="sub">подарок ушёл последнему месту</div>`, { color: '#9aff7a', ms: 1800, priority: 2 });
  H.queued = fx => card(fx.country, { ...fx, title: '' }, '⏳ сработает на старте', '#cfd6ff');
  H.wait = fx => card(fx.country, fx, `${fx.icon} ${fx.title} · в очереди`, '#cfd6ff');
  H.start = () => { sound('start'); };
  H.final = fx => { banner(`<div class="big">🔥 ФИНАЛ ×${fx.multiplier || 2}</div><div class="sub">Все эффекты удваиваются!</div>`, { color: '#ffb21a', ms: 2600, priority: 5 }); sound('final'); };

  // Озвучка «Спасибо, Nar, за ракету!» (включается в панели)
  const THANKS = { nitro: 'нитро', turbo: 'турбо', shield: 'щит', rocket: 'ракету', super: 'супер-атаку', chaos: 'хаос', legend: 'легенду' };
  for (const id of Object.keys(THANKS)) {
    const inner = H[id];
    H[id] = fx => { inner(fx); if (R.view?.tts && fx.name) try { A().thank(fx.name, THANKS[id]); } catch {} };
  }

  // Выхлоп и линии скорости — машины «живые» даже без подарков
  R.hooks.under.push(() => {
    const st = R.state;
    if (!st || st.phase !== 'running') return;
    for (const c of st.cars) {
      const r = carRect(c.id);
      if (!r) continue;
      if (Math.random() < .25) U({ type: 'smoke', x: r.x + 2, y: r.y + 50, vx: rand(-90, -40), vy: rand(-20, 0), life: .7, size: 6, drag: 1.2, light: true });
      if ((r.car.speed || 0) > 40 && Math.random() < .5) O({ type: 'line', x: r.x - rand(10, 120), y: r.y + rand(10, r.h - 10), vx: -700, vy: 0, life: .15, size: rand(30, 70), color: 'rgba(255,255,255,.35)' });
    }
  });

  let helloAt = 0;
  function hello(fx) {
    if (performance.now() - helloAt < 4000) return;
    helloAt = performance.now();
    const el = $('hint');
    el.innerHTML = `👋 ${esc(fx.name)}, напиши флаг своей страны!`;
  }

  // ---------- Легенда: кино на весь экран ----------
  let legendBusy = Promise.resolve();
  function legend(fx) {
    legendBusy = legendBusy.then(async () => {
      const el = $('legend');
      const c = countryById(fx.country);
      el.innerHTML = `<div class="rays"></div><div class="tag">👑 ЛЕГЕНДА 👑</div>
        ${fx.avatar ? `<img class="ava" src="${esc(fx.avatar)}" referrerpolicy="no-referrer" alt="">` : `<div class="ava" style="background:#7a4a10">${esc([...fx.name][0] || '?')}</div>`}
        <div class="nm">${esc(fx.name)}</div>
        <div class="what">${fx.giftImage ? `<img class="gift" src="${esc(fx.giftImage)}" referrerpolicy="no-referrer" alt="">` : ''}${fx.coins ? `${fmt(fx.coins)}🪙` : ''} за ${c ? flagImg(c.id, 66, 44) + ' ' + esc(c.name) : ''}</div>`;
      el.hidden = false;
      sound('legend');
      confetti(540, 1200, colorsOf(fx.country), 140, 1.2);
      for (let i = 0; i < 5; i++) setTimeout(() => firework(rand(160, 920), rand(500, 900), colorsOf(fx.country)), 600 + i * 800);
      await R.sleep(((fx.sec || 6) - .2) * 1000);
      el.hidden = true;
      trail(fx.country, 4, 'legend');
      shake(true);
    });
  }

  window.RaceFx = { banner, confetti, firework, explosion, burst, trail, card, shake, emitOver: O, emitUnder: U, glow, sound };
})();
