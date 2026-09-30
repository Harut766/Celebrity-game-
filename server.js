import express from 'express';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { giftToHits, isFinalGiftEvent, normalizeTikTokGift, looksArmenian } from './src/punish.js';

const CONFIG_PATH = new URL('./config.json', import.meta.url);
const loadConfig = () => JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

let config = loadConfig();
const username = process.argv[2] || process.env.TIKTOK_USERNAME || config.tiktokUsername;
const port = Number(process.env.PORT || config.port || 3000);
const RECONNECT_MS = 30_000;

const app = express();
app.use(express.json());
app.use(express.static(new URL('./public', import.meta.url).pathname));

// Конфиг перечитывается на каждый запрос: цены можно менять без перезапуска.
app.get('/api/config', (_req, res) => {
  config = loadConfig();
  res.json(config);
});

// Тестовый подарок без эфира: POST /api/test {"coins": 30, "user": "Тест", "repeatCount": 2}
app.post('/api/test', (req, res) => {
  const { coins = 1, giftName = '', user = 'Тест', repeatCount = 1 } = req.body || {};
  const hits = handleGift({ coins: Number(coins), giftName, user, login: user, repeatCount: Number(repeatCount) });
  res.json({ hits: hits.length });
});

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
  console.log(`[gift] ${gift.user}: ${gift.giftName || '?'} (${gift.coins} мон.) x${gift.repeatCount} -> ${hits[0]?.punishmentId ?? 'ничего'} x${hits.length}${hits[0]?.armenian ? ' (армянин!)' : ''}`);
  for (const hit of hits) broadcast({ type: 'hit', hit });
  return hits;
}

function connectTikTok() {
  const connection = new TikTokLiveConnection(username, {
    signApiKey: process.env.EULER_API_KEY || undefined,
    processInitialData: false,
  });

  connection.on(WebcastEvent.GIFT, data => {
    if (!isFinalGiftEvent(data)) return;
    handleGift(normalizeTikTokGift(data));
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
    .then(state => setStatus({ connected: true, message: `Подключено к эфиру @${username} (room ${state.roomId})` }))
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
