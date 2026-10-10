import express from 'express';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { giftToHits, normalizeTikTokGift, looksArmenian, createStreakTracker } from './src/punish.js';
import { attachVoiceFiles } from './src/voices.js';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = new URL('./config.json', import.meta.url);
const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));
const loadConfig = () => attachVoiceFiles(JSON.parse(readFileSync(CONFIG_PATH, 'utf8')), PUBLIC_DIR);

let config = loadConfig();
const username = process.argv[2] || process.env.TIKTOK_USERNAME || config.tiktokUsername;
const port = Number(process.env.PORT || config.port || 3000);
const RECONNECT_MS = 30_000;

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Конфиг перечитывается на каждый запрос: цены можно менять без перезапуска.
app.get('/api/config', (_req, res) => {
  config = loadConfig();
  res.json(config);
});

// Тестовый подарок без эфира: POST /api/test {"coins": 30, "user": "Тест", "repeatCount": 2}
app.post('/api/test', (req, res) => {
  // Только с этого компьютера: через туннель (cloudflared и т.п.) тестовые удары запрещены
  if (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']) return res.status(403).json({ error: 'test only from localhost' });
  const { coins = 1, giftName = '', user = 'Тест', repeatCount = 1 } = req.body || {};
  const hits = handleGift({ coins: Number(coins), giftName, user, login: user, repeatCount: Number(repeatCount) });
  res.json({ hits: hits.length });
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

function setStatus(patch) {
  status = { ...status, ...patch };
  broadcast({ type: 'status', status });
  console.log(`[status] ${status.message}`);
}

wss.on('connection', ws => ws.send(JSON.stringify({ type: 'status', status })));

function handleGift(gift) {
  config = loadConfig();
  const hits = giftToHits(config, gift);
  const armenian = config.armenian?.enabled !== false && looksArmenian(config, gift.user, gift.login);
  for (const hit of hits) hit.armenian = armenian;
  console.log(`[gift] ${gift.user}: ${gift.giftName || '?'}${gift.giftId ? ` (id ${gift.giftId})` : ''} (${gift.coins} мон.) x${gift.repeatCount} -> ${hits[0]?.punishmentId ?? 'ничего'} x${hits.length}${hits[0]?.armenian ? ' (армянин!)' : ''}`);
  for (const hit of hits) broadcast({ type: 'hit', hit });
  return hits;
}

function connectTikTok() {
  const connection = new TikTokLiveConnection(username, {
    signApiKey: process.env.EULER_API_KEY || undefined,
    processInitialData: false,
  });

  const newGifts = createStreakTracker();
  connection.on(WebcastEvent.GIFT, data => {
    const count = newGifts(data);
    if (!count) return;
    handleGift({ ...normalizeTikTokGift(data), repeatCount: count });
  });

  let retry = null;
  const scheduleRetry = () => {
    if (retry) return;
    retry = setTimeout(() => { retry = null; connectTikTok(); }, RECONNECT_MS);
  };

  connection.on(ControlEvent.DISCONNECTED, () => {
    setStatus({ connected: false, message: `Отключено от @${username}, переподключение через 30 с` });
    scheduleRetry();
  });

  connection.connect()
    .then(state => {
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
      setStatus({ connected: false, message: `Не удалось подключиться к @${username}: ${err.message}. Повтор через 30 с` });
      scheduleRetry();
    });
}

server.listen(port, () => {
  console.log(`Оверлей:      http://localhost:${port}/`);
  console.log(`Тест-панель:  http://localhost:${port}/?test=1`);
  if (username) connectTikTok();
  else console.log('Ник TikTok не указан: работает только тест-панель. Запуск: npm start -- <ник>');
});
