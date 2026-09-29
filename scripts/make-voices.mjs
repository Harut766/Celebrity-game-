// Озвучивает все фразы из config.json в mp3 и прописывает пути в поле "file".
//
//   npm run voices                         бесплатный нейро-голос Microsoft (нужен интернет)
//   npm run voices -- --engine mac         встроенный голос macOS (без интернета)
//   npm run voices -- --voice ru-RU-DmitryNeural --pitch -12Hz --rate -5%
//   npm run voices -- --dry                только показать, что будет озвучено
//   npm run voices -- --list               список голосов, которые говорят по-русски
//
// Уже озвученные фразы пропускаются. Если поменять текст фразы, у неё будет новый файл.
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { platform } from 'node:os';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = new URL('../config.json', import.meta.url);
const OUT_DIR = new URL('../public/media/voice/auto/', import.meta.url);
const WEB_DIR = 'media/voice/auto/';

const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split(/\s*--/).filter(Boolean).map(a => {
    const [k, ...v] = a.trim().split(/\s+/);
    return [k, v.length ? v.join(' ') : true];
  }),
);
const engine = args.engine || 'edge';
const voice = args.voice || (engine === 'mac' ? 'Yuri' : 'ru-RU-DmitryNeural');
const pitch = args.pitch || '-10Hz';
const rate = args.rate || '-5%';
const dry = Boolean(args.dry);

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

if (args.list) {
  if (engine === 'mac') {
    const out = execFileSync('say', ['-v', '?']).toString();
    console.log(out.split('\n').filter(l => /ru_RU/.test(l)).join('\n') || 'Русских голосов нет: Системные настройки → Универсальный доступ → Устный контент → Управление голосами');
  } else {
    const { MsEdgeTTS } = await import('msedge-tts');
    let voices;
    try { voices = await new MsEdgeTTS().getVoices(); }
    catch (e) { console.error(`Не удалось получить список голосов: ${e.message}`); process.exit(1); }
    const ru = voices.filter(v => v.Locale === 'ru-RU' || /Multilingual/.test(v.ShortName));
    console.log('Русские:');
    ru.filter(v => v.Locale === 'ru-RU').forEach(v => console.log(`  ${v.ShortName}  (${v.Gender === 'Male' ? 'мужской' : 'женский'})`));
    console.log('\nМногоязычные (говорят по-русски с лёгким акцентом):');
    ru.filter(v => v.Locale !== 'ru-RU').forEach(v => console.log(`  ${v.ShortName}  (${v.Gender === 'Male' ? 'мужской' : 'женский'})`));
  }
  process.exit(0);
}


// Все места в конфиге, где есть фразы: [ключ для имени файла, массив фраз]
function phraseLists() {
  const lists = [];
  for (const p of config.punishments || []) lists.push([p.id, p.phrases || []]);
  if (config.idle) {
    lists.push(['idle', config.idle.phrases || []]);
    for (const [mood, phrases] of Object.entries(config.idle.moods || {})) lists.push([`mood-${mood}`, phrases]);
  }
  return lists;
}

async function makeEdgeTts() {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Одна фраза = новое соединение: сервис Microsoft часто закрывает сокет между запросами.
  async function once(text, file) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = await tts.toStream(text, { pitch, rate });
      await new Promise((resolve, reject) => {
        const out = createWriteStream(file);
        audioStream.pipe(out);
        audioStream.on('error', reject);
        out.on('finish', resolve);
        out.on('error', reject);
      });
    } finally {
      try { tts.close(); } catch {}
    }
  }

  // Проверяем, что сервис вообще доступен (иначе сразу понятная ошибка)
  const probe = new MsEdgeTTS();
  await probe.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  try { probe.close(); } catch {}

  return async (text, file) => {
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await once(text, file);
        return;
      } catch (e) {
        lastError = e;
        try { unlinkSync(file); } catch {}
        await sleep(700 * attempt);
      }
    }
    throw lastError;
  };
}

function makeMacSay() {
  if (platform() !== 'darwin') throw new Error('--engine mac работает только на macOS');
  return async (text, file) => {
    const aiff = file.replace(/\.\w+$/, '.aiff');
    execFileSync('say', ['-v', voice, '-o', aiff, text]);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', aiff, file]);
    unlinkSync(aiff);
  };
}

const ext = engine === 'mac' ? 'm4a' : 'mp3';
let synth = null;
if (!dry) {
  try {
    synth = engine === 'mac' ? makeMacSay() : await makeEdgeTts();
  } catch (e) {
    console.error(`Не удалось запустить озвучку (${engine}): ${e.message}`);
    if (engine === 'edge') console.error('Проверьте интернет или используйте голос macOS: npm run voices -- --engine mac');
    process.exit(1);
  }
}
if (!dry) mkdirSync(OUT_DIR, { recursive: true });

let made = 0, skipped = 0, failed = 0;
for (const [key, phrases] of phraseLists()) {
  for (let i = 0; i < phrases.length; i++) {
    const ph = phrases[i];
    if (!ph.text) continue;
    // Файлы, которые пользователь положил сам (не из auto/), не трогаем
    if (ph.file && !ph.file.startsWith(WEB_DIR)) { skipped++; continue; }
    const hash = createHash('md5').update(`${engine}|${voice}|${pitch}|${rate}|${ph.text}`).digest('hex').slice(0, 6);
    const name = `${key}-${i + 1}-${hash}.${ext}`;
    const disk = new URL(name, OUT_DIR);
    if (ph.file === WEB_DIR + name && existsSync(disk)) { skipped++; continue; }
    if (dry) { console.log(`[dry] ${name}  «${ph.text}»`); continue; }
    try {
      await synth(ph.text, fileURLToPath(disk));
      ph.file = WEB_DIR + name;
      made++;
      console.log(`✓ ${name}  «${ph.text}»`);
    } catch (e) {
      failed++;
      console.error(`✗ «${ph.text}»: ${e.message}`);
    }
  }
}

if (!dry) writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
console.log(`\nГотово: озвучено ${made}, пропущено ${skipped}, ошибок ${failed}.`);
if (failed && engine === 'edge') console.log('Если нет интернета или сервис Microsoft недоступен, попробуйте: npm run voices -- --engine mac');
process.exit(failed ? 1 : 0);
