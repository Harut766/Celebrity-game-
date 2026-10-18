// Фильтр ников: оскорбления, политика, война — такие ники на экран не выводятся,
// а зрители не попадают в топы и капитаны (но их подарки и лайки всё равно двигают машину).
import { fold } from './countries.js';

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

function normalize(text) {
  return fold(text).replace(/[013457@$]/g, ch => LEET[ch] || ch);
}

export function createModerator(mod = {}) {
  const subs = (mod.stopSubstrings || []).map(normalize).filter(Boolean);
  const words = new Set((mod.stopWords || []).map(normalize).filter(Boolean));
  const hideName = mod.hideName || 'Зритель';

  /** true, если текст можно показывать */
  function isClean(text) {
    const n = normalize(text);
    // Слитно, без разделителей и повторов: «п.у.т.и.н», «puuutin»
    const squashed = n.replace(/[^\p{L}]+/gu, '');
    const dedup = squashed.replace(/(\p{L})\1+/gu, '$1');
    if (subs.some(s => squashed.includes(s) || dedup.includes(s))) return false;
    return !n.split(/[^\p{L}\p{N}]+/u).some(w => w && words.has(w));
  }

  /** Ник для экрана: без управляющих символов и «зальго», не длиннее 18 знаков. */
  function cleanName(name) {
    const s = String(name || '').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\p{M}{2,}/gu, '').trim();
    return [...s].slice(0, 18).join('') || hideName;
  }

  /** Как показывать зрителя: { name, avatar, hidden } */
  function viewer(user, login) {
    const ok = isClean(user) && isClean(login);
    return ok ? { name: cleanName(user), hidden: false } : { name: hideName, hidden: true };
  }

  return { isClean, cleanName, viewer, hideName };
}
