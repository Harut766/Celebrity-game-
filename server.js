import express from 'express';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { giftToHits, normalizeTikTokGift, looksArmenian, createStreakTracker } from './src/punish.js';
import { createBattle, dragonSettings, avatarOf } from './src/dragon.js';
import { attachVoiceFiles } from './src/voices.js';
import { mountRace } from './src/race/routes.js';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const CONFIG_PATH = new URL('./config.json', import.meta.url);
const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));
const loadConfig = () => attachVoiceFiles(JSON.parse(readFileSync(CONFIG_PATH, 'utf8')), PUBLIC_DIR);

let config = loadConfig();
const username = process.argv[2] || process.env.TIKTOK_USERNAME || config.tiktokUsername;
const port = Number(process.env.PORT || config.port || 3000);
// Пока эфир не запущен, стучимся в TikTok всё реже: 30 с, 1 мин, 2 мин (не чаще)
const RECONNECT_MS = 30_000, RECONNECT_MAX_MS = 120_000;
let failures = 0;
const retryDelay = () => Math.min(RECONNECT_MAX_MS, RECONNECT_MS * 2 ** Math.max(0, failures - 1));
const inSec = ms => ms >= 60_000 ? `${ms / 60_000} мин` : `${ms / 1000} с`;

// Какая игра на главной странице: "race" (Гонка Наций), "dragon" (Давид против Вишапа) или "outhouse" (будка)
const isDragon = () => config.game === 'dragon';
const isRace = () => config.game === 'race';
const PAGES = { race: 'race/index.html', dragon: 'dragon/index.html', outhouse: 'index.html' };

// Только с этого компьютера: через туннель (cloudflared) панель и тесты недоступны
const isLocal = req => !req.headers['cf-connecting-ip'] && !req.headers['x-forwarded-for'];
const localOnly = (req, res, next) => isLocal(req) ? next() : res.status(403).send('Только с компьютера стримера');

const app = express();
app.use(express.json());
app.get('/', (_req, res) => {
  config = loadConfig();
  res.sendFile(join(PUBLIC_DIR, PAGES[config.game] || PAGES.outhouse));
});
app.get('/outhouse', (_req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
app.get('/dragon', (_req, res) => res.sendFile(join(PUBLIC_DIR, 'dragon/index.html')));
app.use(express.static(PUBLIC_DIR));

// Конфиг перечитывается на каждый запрос: цены можно менять без перезапуска.
app.get('/api/config', (_req, res) => {
  config = loadConfig();
  res.json(config);
});

// Тестовый подарок без эфира: POST /api/test {"coins": 30, "user": "Тест", "repeatCount": 2}
app.post('/api/test', (req, res) => {
  // Только с этого компьютера: через туннель (cloudflared и т.п.) тестовые удары запрещены
  if (!isLocal(req)) return res.status(403).json({ error: 'test only from localhost' });
  const { kind = 'gift', coins = 1, giftName = '', user = 'Тест', repeatCount = 1, count = 1 } = req.body || {};
  const who = { user, login: user, avatar: '' };
  if (kind === 'like') onLikes(who, Number(count) || 1);
  else if (kind === 'join') onJoin(who);
  else if (kind === 'follow' || kind === 'share') onSocial(who, kind);
  else {
    const hits = onGift({ coins: Number(coins), giftName, ...who, repeatCount: Number(repeatCount) }, { test: true });
    return res.json({ hits });
  }
  res.json({ ok: true });
});

// Иконки подарков TikTok (имя -> картинка и цена) для таблички цен. Пусто, пока не подключились к эфиру.
let giftIcons = {};
let giftIconsUnavailable = false;
app.get('/api/gifts', (_req, res) => res.json(giftIcons));

function extractGiftIcons(list) {
  const icons = {};
  for (const g of Array.isArray(list) ? list : []) {
    const url = g?.image?.url_list?.[0] || g?.image?.urlList?.[0] || g?.icon?.url_list?.[0];
    if (g?.name && url) icons[g.name.toLowerCase()] = { name: g.name, url, coins: g.diamond_count ?? g.diamondCount ?? 0 };
  }
  return icons;
}

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
let status = { connected: false, username, message: username ? 'Подключение…' : 'Режим теста (ник TikTok не указан)' };

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(data);
  }
}

// ---------- Гонка Наций ----------
const RACE = mountRace({
  app, broadcast, localOnly,
  getConfig: () => { config = loadConfig(); return config; },
  isActive: isRace,
  isLive: () => status.connected,
  dataDir: fileURLToPath(new URL('./data', import.meta.url)),
  publicDir: PUBLIC_DIR,
});

app.get('/api/race/status', localOnly, (_req, res) => res.json(status));

function setStatus(patch) {
  status = { ...status, ...patch };
  broadcast({ type: 'status', status });
  console.log(`[status] ${status.message}`);
}

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  console.log(`[оверлей] подключился (открыто окон: ${wss.clients.size})`);
  ws.on('close', () => console.log(`[оверлей] отключился (открыто окон: ${wss.clients.size})`));
  ws.send(JSON.stringify({ type: 'status', status }));
  ws.send(JSON.stringify({ type: 'leaders', leaders: leaders() }));
  ws.send(JSON.stringify({ type: 'battle', state: battle.state(), leaders: battle.leaders() }));
  if (isRace()) ws.send(JSON.stringify({ type: 'race:people', data: RACE.race.people() }));
  // Оверлей сообщает о проблемах со звуком — показываем их здесь
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'log' && typeof msg.text === 'string') console.log(`[оверлей] ${msg.text.slice(0, 300)}`);
      if (msg.type === 'fps') RACE.setFps(msg.fps);
    } catch {}
  });
});

// Главные обидчики эфира (с момента запуска игры; тестовые удары не считаются)
const tally = new Map();
const leaders = () => [...tally.values()].sort((a, b) => b.coins - a.coins || b.hits - a.hits).slice(0, 3);

function handleGift(gift, { test = false } = {}) {
  config = loadConfig();
  const hits = giftToHits(config, gift);
  const armenian = config.armenian?.enabled !== false && looksArmenian(config, gift.user, gift.login);
  for (const hit of hits) hit.armenian = armenian;
  console.log(`[gift] ${gift.user}: ${gift.giftName || '?'}${gift.giftId ? ` (id ${gift.giftId})` : ''} (${gift.coins} мон.) x${gift.repeatCount} -> ${hits[0]?.punishmentId ?? 'ничего'} x${hits.length}${hits[0]?.armenian ? ' (армянин!)' : ''}`);
  for (const hit of hits) broadcast({ type: 'hit', hit });
  if (!test && hits.length) {
    const key = gift.login || gift.user;
    const row = tally.get(key) || { user: gift.user, coins: 0, hits: 0 };
    row.coins += (gift.coins || 1) * (gift.repeatCount || 1);
    row.hits += hits.length;
    tally.set(key, row);
    broadcast({ type: 'leaders', leaders: leaders() });
  }
  return hits;
}

// ---------- Давид против Вишапа ----------
// Бой сохраняется в файл: после перезапуска сервера (в течение 3 часов) дракон и топ продолжаются
const BATTLE_FILE = new URL('./battle-state.json', import.meta.url);
let saved = null;
try {
  saved = JSON.parse(readFileSync(BATTLE_FILE, 'utf8'));
  if (Date.now() - (saved.savedAt || 0) > 3 * 3600_000) saved = null;
  else console.log(`[бой] продолжаем: Вишап ${saved.level}-го уровня, жизнь ${saved.hp}/${saved.maxHp}`);
} catch {}
const battle = createBattle(() => dragonSettings(config), { saved });
let saveTimer = null;
function saveBattle() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { writeFileSync(BATTLE_FILE, JSON.stringify(battle.save())); } catch (e) { console.log(`[бой] не удалось сохранить: ${e.message}`); }
  }, 2000);
}
const fmtUser = p => p.user + (p.login && p.login !== p.user ? ` (@${p.login})` : '');

function onGift(gift, opts) {
  config = loadConfig();
  if (!isDragon()) return handleGift(gift, opts).length;
  const ev = battle.gift({ user: gift.user, login: gift.login, avatar: gift.avatar }, gift);
  if (!ev) return 0;
  console.log(`[gift] ${fmtUser(gift)}: ${gift.giftName || '?'}${gift.giftId ? ` (id ${gift.giftId})` : ''} (${gift.coins} мон.) x${gift.repeatCount} -> ${ev.attackId}, урон ${ev.damage}${ev.crit ? ' КРИТ' : ''}, у дракона ${ev.hpAfter}/${ev.maxHp}${ev.killed ? ` — ПОВЕРЖЕН! Герой: ${gift.user}` : ''}`);
  broadcast({ type: 'attack', attack: ev });
  broadcast({ type: 'leaders', leaders: battle.leaders(), dragon: true });
  saveBattle();
  return ev.count;
}

// Лайки не пишем каждый — только сводку раз в 30 секунд
let likesTotal = 0;
setInterval(() => { if (likesTotal) console.log(`[лайки] за 30 с: ${likesTotal}`); likesTotal = 0; }, 30_000);

function onLikes(p, count) {
  if (!isDragon()) return;
  likesTotal += count;
  const ev = battle.likes(p, count);
  broadcast({ type: 'likes', likes: ev });
  if (ev.dealt) { broadcast({ type: 'leaders', leaders: battle.leaders(), dragon: true }); saveBattle(); }
}

function onSocial(p, kind) {
  if (!isDragon()) return;
  console.log(`[${kind}] ${fmtUser(p)}`);
  broadcast({ type: 'social', social: battle.social(p, kind) });
  broadcast({ type: 'leaders', leaders: battle.leaders(), dragon: true });
  saveBattle();
}

function onJoin(p) {
  if (isDragon()) broadcast({ type: 'join', join: p });
}

setInterval(() => {
  if (!isDragon()) return;
  const ev = battle.tick(5000);
  if (ev) { broadcast({ type: 'heal', heal: ev }); saveBattle(); }
}, 5000);

// Каждые 10 секунд: проверяем, живо ли соединение с оверлеем, и присылаем ему состояние боя.
// Через туннель (cloudflared) соединение иногда обрывается молча — так оверлей это заметит и переподключится.
setInterval(() => {
  for (const c of wss.clients) {
    if (c.isAlive === false) { c.terminate(); continue; }
    c.isAlive = false;
    try { c.ping(); } catch {}
  }
  if (isDragon()) broadcast({ type: 'battle', state: battle.state(), leaders: battle.leaders() });
}, 10_000);

const who = data => ({
  user: data.user?.nickname || data.user?.uniqueId || 'Аноним',
  login: data.user?.uniqueId || '',
  avatar: avatarOf(data.user),
});

// Одно и то же событие TikTok иногда приходит дважды (например, после переподключения) — отсеиваем по msgId
const seenMsgs = new Set();
function fresh(data) {
  const id = data?.common?.msgId || data?.msgId;
  if (!id) return true;
  if (seenMsgs.has(id)) return false;
  seenMsgs.add(id);
  if (seenMsgs.size > 5000) seenMsgs.delete(seenMsgs.values().next().value);
  return true;
}

// Картинка подарка из события; если её нет — запомненная раньше для этого giftId
const giftImages = new Map();
function giftImageOf(data) {
  const url = data.giftDetails?.giftImage?.url?.[0] || data.extendedGiftInfo?.image?.url_list?.[0] || data.giftPictureUrl || '';
  if (url && data.giftId) giftImages.set(data.giftId, url);
  return url || giftImages.get(data.giftId) || '';
}

function connectTikTok() {
  const connection = new TikTokLiveConnection(username, {
    signApiKey: process.env.EULER_API_KEY || undefined,
    processInitialData: false,
  });

  const newGifts = createStreakTracker();
  const R = RACE.handlers;
  connection.on(WebcastEvent.GIFT, data => {
    if (!fresh(data)) return;
    const count = newGifts(data);
    if (!count) return;
    const g = normalizeTikTokGift(data);
    if (isRace()) {
      // Монеты = цена подарка × сколько штук пришло в этом событии (серия считается по приросту)
      R.gift({ ...g, avatar: avatarOf(data.user), coins: (g.coins || 1) * count, giftImage: giftImageOf(data) });
      return;
    }
    onGift({ ...g, avatar: avatarOf(data.user), repeatCount: count });
  });
  connection.on(WebcastEvent.LIKE, data => fresh(data) && (isRace() ? R.likes(who(data), data.likeCount || 1) : onLikes(who(data), data.likeCount || 1)));
  connection.on(WebcastEvent.FOLLOW, data => fresh(data) && (isRace() ? R.follow(who(data)) : onSocial(who(data), 'follow')));
  connection.on(WebcastEvent.SHARE, data => fresh(data) && (isRace() ? R.share(who(data)) : onSocial(who(data), 'share')));
  connection.on(WebcastEvent.MEMBER, data => fresh(data) && (isRace() ? R.join(who(data)) : onJoin(who(data))));
  connection.on(WebcastEvent.CHAT, data => fresh(data) && (isRace() ? R.chat({ ...who(data), comment: data.comment || '' }) : onJoin(who(data))));

  let retry = null;
  const scheduleRetry = () => {
    if (retry) return;
    retry = setTimeout(() => { retry = null; connectTikTok(); }, retryDelay());
  };

  connection.on(ControlEvent.DISCONNECTED, () => {
    failures = 1;
    setStatus({ connected: false, message: `Отключено от @${username}, переподключение через ${inSec(retryDelay())}` });
    scheduleRetry();
  });

  connection.connect()
    .then(state => {
      failures = 0;
      setStatus({ connected: true, message: `Подключено к эфиру @${username} (room ${state.roomId})` });
      if (giftIconsUnavailable) return;
      connection.fetchAvailableGifts()
        .then(list => {
          giftIcons = extractGiftIcons(list);
          console.log(`[gifts] загружено иконок подарков: ${Object.keys(giftIcons).length}`);
          broadcast({ type: 'gifts', gifts: giftIcons });
        })
        .catch(err => {
          // Без платного ключа Euler Stream картинки подарков недоступны — табличка показывает эмодзи
          giftIconsUnavailable = true;
          console.log(/Business plan|plan/i.test(err.message)
            ? '[gifts] картинки подарков недоступны без платного ключа — в табличке будут эмодзи (это нормально)'
            : `[gifts] не удалось получить картинки подарков: ${err.message}`);
        });
    })
    .catch(err => {
      failures++;
      setStatus({ connected: false, message: `Не удалось подключиться к @${username}: ${err.message}. Повтор через ${inSec(retryDelay())}` });
      scheduleRetry();
    });
}

server.listen(port, () => {
  console.log(`Оверлей:      http://localhost:${port}/   (игра: ${config.game || 'outhouse'})`);
  if (isRace()) console.log(`Панель:       http://localhost:${port}/panel   (только на этом компьютере)`);
  else console.log(`Тест-панель:  http://localhost:${port}/?test=1`);
  if (username) connectTikTok();
  else console.log('Ник TikTok не указан: работает только тест-панель. Запуск: npm start -- <ник>');
});
