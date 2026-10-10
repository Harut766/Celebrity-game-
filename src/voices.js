// Где лежит озвучка фраз. Пути НЕ хранятся в config.json (его сбрасывает обновление),
// а в public/media/voice/auto/manifest.json, который создаёт `npm run voices`.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const WEB_DIR = 'media/voice/auto/';
export const DEFAULT_VOICE = { engine: 'edge', voice: 'it-IT-GiuseppeMultilingualNeural', pitch: '-10Hz', rate: '-5%' };

/** Все места в конфиге, где есть фразы: [ключ для имени файла, массив фраз] */
export function phraseLists(config) {
  const lists = [];
  for (const p of config.punishments || []) lists.push([p.id, p.phrases || []]);
  if (config.idle) {
    lists.push(['idle', config.idle.phrases || []]);
    for (const [mood, phrases] of Object.entries(config.idle.moods || {})) lists.push([`mood-${mood}`, phrases]);
  }
  if (config.armenian?.phrases) lists.push(['armenian', config.armenian.phrases]);
  return lists;
}

export function voiceFileName(key, index, text, { engine, voice, pitch, rate } = DEFAULT_VOICE) {
  const hash = createHash('md5').update(`${engine}|${voice}|${pitch}|${rate}|${text}`).digest('hex').slice(0, 6);
  return `${key}-${index + 1}-${hash}.${engine === 'mac' ? 'm4a' : 'mp3'}`;
}

/** Подставляет в фразы пути к уже озвученным файлам (из manifest.json, иначе по имени голоса по умолчанию). */
export function attachVoiceFiles(config, publicDir) {
  const autoDir = join(publicDir, WEB_DIR);
  let manifest = {};
  try { manifest = JSON.parse(readFileSync(join(autoDir, 'manifest.json'), 'utf8')); } catch {}
  for (const [key, phrases] of phraseLists(config)) {
    phrases.forEach((ph, i) => {
      if (!ph?.text || ph.file) return;
      const fromManifest = manifest[ph.text];
      if (fromManifest && existsSync(join(publicDir, fromManifest))) { ph.file = fromManifest; return; }
      const guess = voiceFileName(key, i, ph.text);
      if (existsSync(join(autoDir, guess))) ph.file = WEB_DIR + guess;
    });
  }
  return config;
}
