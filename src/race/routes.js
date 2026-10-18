// «Гонка Наций» на сервере: настройки, тик симуляции, рассылка на экран, панель стримера и симулятор.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRace } from './engine.js';
import { createStore } from './store.js';
import { tierFor, sortedTiers } from './tiers.js';

const TICK_MS = 50;      // физика 20 раз в секунду
const STATE_EVERY = 2;   // состояние на экран 10 раз в секунду

// Что можно менять из панели (остальное — в config.json)
const EDITABLE = ['roundSec', 'finalSec', 'finalMultiplier', 'autoNextRound', 'baseSpeed', 'likesPerDash', 'tts', 'volume', 'dragon', 'tiers', 'photoFinish'];

function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base?.[k] && typeof base[k] === 'object' ? merge(base[k], v) : v;
  }
  return out;
}

export function mountRace({ app, broadcast, getConfig, isActive, isLive, localOnly, dataDir, publicDir }) {
  const store = createStore(dataDir);
  let overrides = store.loadSettings();
  let S = null, sJson = '';
  const iconsFile = join(dataDir, 'race-gift-icons.json');
  let icons = {};
  try { icons = JSON.parse(readFileSync(iconsFile, 'utf8')); } catch {}

  function recompute() {
    const next = merge(getConfig().race || {}, overrides);
    next.tiers = sortedTiers(next.tiers);
    const json = JSON.stringify(next);
    if (json !== sJson) { sJson = json; S = next; broadcast({ type: 'race:view', data: view() }); }
  }
  // Что видит экран (без стоп-слов)
  const view = () => {
    const { moderation, ...rest } = S;
    return { ...rest, icons };
  };
  recompute();
  setInterval(recompute, 2000);

  const race = createRace({
    getSettings: () => S,
    emit: (type, data) => broadcast({ type, data }),
    store,
    isLive,
  });

  // ---------- тик ----------
  let last = Date.now(), n = 0, peopleAt = 0;
  setInterval(() => {
    const now = Date.now();
    const dt = Math.min(.2, (now - last) / 1000);
    last = now;
    if (!isActive()) return;
    race.tick(dt);
    if (++n % STATE_EVERY === 0) broadcast({ type: 'race:state', data: race.snapshot() });
    if (race.peopleChanged() || now - peopleAt > 3000) { peopleAt = now; broadcast({ type: 'race:people', data: race.people() }); }
  }, TICK_MS);

  // ---------- события TikTok (и симулятора) ----------
  // Картинка подарка запоминается для его уровня — табличка цен показывает настоящие подарки
  function learnIcon(g) {
    if (!g.giftImage || g.sim) return;
    const tier = tierFor(S.tiers, g.coins);
    if (!tier || icons[tier.id]?.image === g.giftImage) return;
    icons[tier.id] = { image: g.giftImage, name: g.giftName || '', coins: g.coins };
    try { writeFileSync(iconsFile, JSON.stringify(icons)); } catch {}
    broadcast({ type: 'race:view', data: view() });
  }
  const handlers = {
    gift(g) {
      learnIcon(g);
      race.gift(g);
      console.log(`[гонка] ${g.user}${g.login && g.login !== g.user ? ` (@${g.login})` : ''}: ${g.giftName || 'подарок'} ${g.coins} мон. → ${tierFor(S.tiers, g.coins)?.name}${g.sim ? ' (тест)' : ''}`);
    },
    likes: (p, count) => race.likes(p, count),
    follow: p => race.follow(p),
    share: p => race.share(p),
    join: p => race.join(p),
    chat: p => race.chat(p),
  };

  // ---------- страницы и панель ----------
  app.get('/race', (_req, res) => res.sendFile(join(publicDir, 'race/index.html')));
  app.get('/panel', localOnly, (_req, res) => res.sendFile(join(publicDir, 'race/panel.html')));
  app.get('/api/race/view', (_req, res) => res.json(view()));
  app.get('/api/race/panel', localOnly, (_req, res) => res.json({
    settings: S, overrides, snapshot: race.snapshot(), people: race.people(), gifts: store.recentGifts(),
    teams: race.teamsCount(), pending: race.pendingCount(), active: isActive(),
  }));
  app.post('/api/race/control', localOnly, (req, res) => {
    const a = req.body?.action;
    if (a === 'start') race.start();
    else if (a === 'pause') race.pause();
    else if (a === 'reset') race.reset();
    else if (a === 'resetDay') store.resetDay();
    else return res.status(400).json({ error: 'unknown action' });
    res.json({ ok: true, snapshot: race.snapshot() });
  });
  app.post('/api/race/settings', localOnly, (req, res) => {
    for (const k of EDITABLE) if (req.body && k in req.body) overrides[k] = req.body[k];
    if (req.body?.resetAll) overrides = {};
    store.saveSettings(overrides);
    recompute();
    res.json({ ok: true, settings: S });
  });

  // Симулятор: всё как от настоящего TikTok, но с пометкой «тест»
  let simId = 0;
  function simulate(b) {
    const user = String(b.user || 'Тест').slice(0, 40);
    const p = { user, login: `sim_${user}`, avatar: '', sim: true };
    if (b.country && b.kind !== 'chat') handlers.chat({ ...p, comment: b.country });
    switch (b.kind) {
      case 'gift': {
        const coins = Math.max(1, Number(b.coins) || 1);
        handlers.gift({ ...p, coins, giftName: b.giftName || `Тест ${coins}`, giftImage: '', msgId: `sim${++simId}` });
        break;
      }
      case 'like': handlers.likes(p, Number(b.count) || 15); break;
      case 'chat': handlers.chat({ ...p, comment: String(b.text || '') }); break;
      case 'follow': handlers.follow(p); break;
      case 'share': handlers.share(p); break;
      case 'join': handlers.join(p); break;
      default: return false;
    }
    return true;
  }
  app.post('/api/race/sim', localOnly, (req, res) => res.json({ ok: simulate(req.body || {}) }));
  // Стресс-тест: 50 подарков за 10 секунд
  app.post('/api/race/stress', localOnly, (req, res) => {
    const total = Number(req.body?.count) || 50, sec = Number(req.body?.sec) || 10;
    const ids = S.countries.map(c => c.id);
    const prices = [1, 1, 1, 1, 5, 5, 10, 10, 30, 99, 100, 299, 500, 1000];
    for (let i = 0; i < total; i++) {
      setTimeout(() => simulate({ kind: 'gift', user: `Стресс${i % 17}`, country: ids[i % ids.length], coins: prices[i % prices.length] }), i * sec * 1000 / total);
    }
    res.json({ ok: true, total });
  });

  return { handlers, race, store };
}
