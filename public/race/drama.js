// Драма «Гонки Наций»: дракон Вишап, фотофиниш, обгоны, подсказки, салют победителю.
(function () {
  const R = window.Race, F = window.RaceFx;
  const { ctx, rand, clamp, esc, flagImg, countryById, carRect } = R;
  const $ = id => document.getElementById(id);

  // ---------- Вишап (рисунок из игры с драконом) ----------
  // Перекрашиваем SVG в конкретные цвета и рисуем 4 кадра: крылья вверх/середина/вниз и пасть открыта
  const frames = {};
  (function buildDragon() {
    const art = window.DragonArt;
    if (!art) return;
    const theme = art.THEMES[0];
    const base = art.dragonSvg()
      .replace(/var\(--(\w+)(?:,[^)]*)?\)/g, (_, k) => theme[k] || '#ff7a1a')
      .replace('<svg ', '<svg width="600" height="600" ')
      .replace('<g id="dLid"', '<g id="dLid" opacity="0"');
    const make = (wing, jaw = 0) => base
      .replace('<g id="dWingNear">', `<g id="dWingNear" transform="rotate(${wing} 640 470)">`)
      .replace('<g id="dWingFar">', `<g id="dWingFar" transform="rotate(${-wing * .8} 590 470)">`)
      .replace('<g id="dJaw">', `<g id="dJaw" transform="rotate(${-jaw} 362 345)">`)
      .replace('<g id="dMouth" opacity="0">', `<g id="dMouth" opacity="${jaw ? 1 : 0}">`);
    const load = svg => { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); return i; };
    frames.up = load(make(-18)); frames.mid = load(make(0)); frames.down = load(make(14)); frames.fire = load(make(-6, 24));
  })();

  const SIZE = 420;
  let flight = null; // { target, t, fireAt, blocked, done }

  function warn(fx) {
    F.banner(`<div class="big">🐉 ВИШАП ЛЕТИТ!</div><div class="sub">к лидеру ${fx.target ? flagImg(fx.target, 54, 36) : ''} · спасёт 🛡️ Щит от 10🪙</div>`, { color: '#ff7a1a', ms: (fx.sec || 3) * 1000 - 300, priority: 4 });
    F.sound('dragonWarn');
    warnUntil = performance.now() + (fx.sec || 3) * 1000;
    warnTarget = fx.target;
  }
  let warnUntil = 0, warnTarget = null;
  function fly(fx) {
    flight = { target: fx.target, t: 0, struck: false };
    F.sound('dragonFly');
  }
  function strike(fx) {
    if (!flight) flight = { target: fx.target, t: 1.2, struck: false };
    flight.struck = true;
    flight.blocked = fx.blocked;
    const r = carRect(fx.target);
    if (!r) return;
    if (fx.blocked) {
      F.burst(r.x + r.w / 2, r.mid, 26, { colors: ['#bff0ff', '#fff'] });
      F.emitOver({ type: 'ring', x: r.x + r.w / 2, y: r.mid, life: .6, size: 150, color: '#bff0ff' });
      F.sound('block');
    } else {
      F.explosion(r.x + r.w / 2, r.mid, 1.3);
      F.shake(true);
      F.sound('dragonFire');
    }
  }

  function drawDragon(dt) {
    // Мигающая рамка вокруг дорожки лидера, пока дракон летит к нему
    if (performance.now() < warnUntil && warnTarget) {
      const r = carRect(warnTarget);
      if (r) {
        ctx.save();
        ctx.globalAlpha = .5 + .5 * Math.sin(performance.now() / 90);
        ctx.strokeStyle = '#ff5a1a'; ctx.lineWidth = 6;
        ctx.strokeRect(R.START_X + 4, r.mid - R.LANE_H / 2 + 4, R.FINISH_X - R.START_X - 8, R.LANE_H - 8);
        ctx.restore();
      }
    }
    if (!flight) return;
    flight.t += dt;
    const t = flight.t;
    const r = carRect(flight.target);
    if (!r || t > 3) { flight = null; return; }
    // Подлёт справа сверху → зависает над машиной → улетает влево
    // зависает справа от машины, чуть выше — чтобы не уходить под шапку
    const hx = clamp(r.front + 190, 420, 880), hy = Math.max(560, r.mid - 110);
    let x, y;
    if (t < 1.1) { const k = R.ease.out(t / 1.1); x = 1300 + (hx - 1300) * k; y = 120 + (hy - 120) * k; }
    else if (t < 1.8) { x = hx + Math.sin(t * 6) * 6; y = hy + Math.sin(t * 9) * 8; }
    else { const k = (t - 1.8) / 1.2; x = hx - 1500 * k * k; y = hy - 500 * k; }
    const breathing = t > 1.1 && t < 1.8;
    const flap = Math.sin(t * 14);
    const img = breathing ? frames.fire : flap > .35 ? frames.up : flap < -.35 ? frames.down : frames.mid;
    // Тень на трассе
    ctx.save();
    ctx.globalAlpha = .35; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, r.mid + 30, 150, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (img?.complete) ctx.drawImage(img, x - SIZE / 2, y - SIZE / 2, SIZE, SIZE);
    // Огонь из пасти к машине
    if (breathing) {
      const mx = x - SIZE / 2 + SIZE * .118, my = y - SIZE / 2 + SIZE * .355;
      for (let i = 0; i < 9; i++) {
        const tx = r.x + r.w * rand(.2, .9), ty = r.mid + rand(-20, 20);
        const dx = tx - mx, dy = ty - my, d = Math.hypot(dx, dy), v = rand(900, 1300);
        F.emitOver({ type: 'fire', x: mx, y: my, vx: dx / d * v, vy: dy / d * v, life: d / v, size: rand(30, 60), color: i % 3 ? '#ff6a1a' : '#ffd23a', drag: .1 });
      }
    }
  }
  R.hooks.over.push((g, dt) => drawDragon(dt));

  // ---------- Фотофиниш: камера приближает финиш ----------
  function photo(fx) {
    const a = carRect(fx.a), b = carRect(fx.b);
    if (!a || !b) return;
    R.camera.set({ zoom: 1.55, x: R.FINISH_X - 150, y: (a.mid + b.mid) / 2, sec: (fx.sec || 3) + .6 });
    F.banner(`<div class="big">📸 ФОТОФИНИШ!</div><div class="sub">${flagImg(fx.a, 54, 36)} против ${flagImg(fx.b, 54, 36)}</div>`, { color: '#ffffff', ms: 2200, priority: 6 });
    F.sound('photo');
  }

  // ---------- Обгон лидера: вспышка ----------
  let leader = null;
  R.hooks.over.push(() => {
    const st = R.state;
    if (!st || st.phase !== 'running') { leader = null; return; }
    const first = [...R.cars.values()].sort((a, b) => b.disp - a.disp)[0]?.id;
    if (leader && first && first !== leader) {
      const r = carRect(first);
      if (r) { F.burst(r.front, r.mid, 24, { colors: countryById(first)?.colors || ['#fff'] }); F.emitOver({ type: 'ring', x: r.x + r.w / 2, y: r.mid, life: .5, size: 120, color: '#ffd45a' }); }
      F.sound('overtake');
    }
    leader = first;
  });

  // ---------- Победа: салют в цветах флага ----------
  function finish(f) {
    const colors = countryById(f.winner)?.colors || ['#ffd45a'];
    F.sound('win');
    F.confetti(540, 1150, colors, 160, 1.3);
    for (let i = 0; i < 9; i++) setTimeout(() => F.firework(rand(140, 940), rand(420, 900), colors), 200 + i * 650);
  }

  // ---------- Подсказки: внизу всегда, в строке комментатора — когда давно не было подарков ----------
  let hintIdx = 0, lastSay = performance.now();
  const say = $('say');
  new MutationObserver(() => { if (!say.querySelector('.hint')) lastSay = performance.now(); }).observe(say, { childList: true });
  setInterval(() => {
    const hints = R.view?.hints || [];
    if (!hints.length) return;
    const h = hints[hintIdx++ % hints.length];
    const el = $('hint');
    el.style.opacity = 0;
    setTimeout(() => { el.textContent = h; el.style.opacity = 1; }, 400);
    if (R.state?.idle && performance.now() - lastSay > 6000) R.sayLine(esc(h), 'hint');
  }, 6000);

  Object.assign(R.fxHandlers, { dragonWarn: warn, dragonFly: fly, dragonStrike: strike, photo });
  window.RaceDrama = { finish };
})();
