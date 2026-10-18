// Запуск одной командой: игра + туннель для TikTok LIVE Studio.
//   npm run live -- ВАШ_НИК_TIKTOK
// Печатает адрес, который нужно вставить в LIVE Studio (Add source → Link), и адрес панели.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const nick = process.argv[2] || '';
const kids = [];
const stop = () => { for (const k of kids) try { k.kill(); } catch {} process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const game = spawn(process.execPath, ['server.js', ...(nick ? [nick] : [])], { cwd: root, stdio: 'inherit' });
kids.push(game);
game.on('exit', code => { console.log(`Игра остановилась (код ${code}).`); stop(); });

const local = existsSync(`${root}/cloudflared`) ? `${root}/cloudflared` : 'cloudflared';
const tunnel = spawn(local, ['tunnel', '--url', 'http://localhost:3000'], { cwd: root });
kids.push(tunnel);
let shown = false;
const watch = buf => {
  const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!m || shown) return;
  shown = true;
  const line = '═'.repeat(64);
  console.log(`\n${line}\n  Адрес для TikTok LIVE Studio (Add source → Link, 1080×1920):\n\n     ${m[0]}\n\n  Панель стримера (только на этом компьютере): http://localhost:3000/panel\n${line}\n`);
};
tunnel.stdout.on('data', watch);
tunnel.stderr.on('data', watch);
tunnel.on('error', () => {
  console.log('\nТуннель cloudflared не найден. Игра работает: http://localhost:3000/');
  console.log('Скачайте cloudflared в папку игры (см. README) или добавьте в LIVE Studio окно браузера через захват окна.\n');
});
tunnel.on('exit', code => { if (code) console.log(`Туннель остановился (код ${code}). Перезапустите: npm run live -- ${nick}`); });
