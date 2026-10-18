// Что «Гонка Наций» хранит на диске (папка data/, в git не попадает):
//   race-day.json        победы стран и донатеры за сегодня (переживают перезапуск)
//   race-teams.json      кто за какую страну (на всю трансляцию, 6 часов)
//   race-settings.json   настройки, изменённые в панели стримера
//   gifts-ГГГГ-ММ-ДД.csv лог всех подарков — чтобы поблагодарить людей после эфира
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const today = () => new Date().toLocaleDateString('sv-SE'); // ГГГГ-ММ-ДД по местному времени
const TEAMS_TTL = 6 * 3600_000;

export function createStore(dir) {
  mkdirSync(dir, { recursive: true });
  const file = name => join(dir, name);
  const read = (name, fallback) => { try { return JSON.parse(readFileSync(file(name), 'utf8')); } catch { return fallback; } };
  const timers = {};
  const write = (name, data) => {
    clearTimeout(timers[name]);
    timers[name] = setTimeout(() => { try { writeFileSync(file(name), JSON.stringify(data, null, 1)); } catch {} }, 500);
  };

  let day = read('race-day.json', null);
  const dayNow = () => {
    if (!day || day.date !== today()) day = { date: today(), wins: {}, donors: {}, rounds: 0 };
    return day;
  };
  const recent = [];

  // Последние подарки из сегодняшнего лога (для панели после перезапуска)
  try {
    const lines = readFileSync(file(`gifts-${today()}.csv`), 'utf8').trim().split('\n').slice(1).slice(-200);
    for (const l of lines) {
      const [time, user, login, gift, coins, country, tier, sim] = l.split(';');
      recent.push({ time, user, login, gift, coins: +coins, country, tier, sim: sim === '1' });
    }
  } catch {}

  const csv = v => String(v ?? '').replace(/[;\n\r]/g, ' ');

  return {
    wins: () => ({ ...dayNow().wins }),
    addWin(country) {
      const d = dayNow();
      d.wins[country] = (d.wins[country] || 0) + 1;
      d.rounds++;
      write('race-day.json', d);
      return { ...d.wins };
    },
    addDonor(v, coins) {
      const d = dayNow();
      const row = d.donors[v.key] || { name: v.name, avatar: '', coins: 0 };
      row.name = v.name; row.avatar = v.avatar || row.avatar; row.coins += coins;
      d.donors[v.key] = row;
      write('race-day.json', d);
    },
    topDay: n => Object.values(dayNow().donors).sort((a, b) => b.coins - a.coins).slice(0, n),
    resetDay() { day = null; write('race-day.json', dayNow()); },

    logGift(g) {
      const row = { time: new Date().toLocaleTimeString('ru-RU'), user: g.user, login: g.login, gift: g.giftName, coins: g.coins, country: g.country, tier: g.tier, sim: g.sim };
      recent.push(row);
      if (recent.length > 300) recent.shift();
      const name = file(`gifts-${today()}.csv`);
      try {
        if (!existsSync(name)) appendFileSync(name, 'время;ник;логин;подарок;монеты;страна;эффект;тест\n');
        appendFileSync(name, [row.time, row.user, row.login, row.gift, row.coins, row.country, row.tier, row.sim ? 1 : 0].map(csv).join(';') + '\n');
      } catch {}
      return row;
    },
    recentGifts: () => recent.slice(-200),

    saveTeams(teams) { write('race-teams.json', { savedAt: Date.now(), teams: Object.fromEntries(teams) }); },
    loadTeams() {
      const t = read('race-teams.json', null);
      return t && Date.now() - t.savedAt < TEAMS_TTL ? t.teams : {};
    },

    loadSettings: () => read('race-settings.json', {}),
    saveSettings(s) { writeFileSync(file('race-settings.json'), JSON.stringify(s, null, 1)); },
  };
}
