// Страны гонки и разбор сообщений чата: вступление в команду и «атака xx».

/** Убирает регистр и диакритику: «Türkiye» → «turkiye», «Ёлка» → «елка». */
export function fold(text) {
  // «й» не превращаем в «и», иначе «воин» и «войн» станут одним словом
  return String(text || '').toLowerCase().replace(/й/g, '\u0001').normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/\u0001/g, 'й').replace(/ё/g, 'е');
}

/** Флаг-эмодзи (две «буквы-индикатора») → код страны: 🇦🇲 → am */
function flagCodes(text) {
  const codes = [];
  for (const m of String(text || '').matchAll(/([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/gu)) {
    codes.push(String.fromCharCode(m[1].codePointAt(0) - 0x1F1E6 + 97, m[2].codePointAt(0) - 0x1F1E6 + 97));
  }
  return codes;
}

export function createCountryIndex(countries) {
  const byToken = new Map();
  for (const c of countries) {
    byToken.set(c.id, c.id);
    for (const a of c.aliases || []) byToken.set(fold(a), c.id);
  }
  const ids = new Set(countries.map(c => c.id));
  const tokens = text => fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  /** Страна по одному слову (код, название, флаг) или null */
  const byWord = word => {
    const flag = flagCodes(word).find(c => ids.has(c));
    return flag || byToken.get(fold(word).replace(/[^\p{L}\p{N}]+/gu, '')) || null;
  };

  return {
    byWord,
    /**
     * Разбор сообщения чата. Возвращает { join, attack } (коды стран или null).
     * Вступление: флаг страны в любом месте сообщения, или сообщение целиком из названий/кодов
     * («am», «Армения!», «kz kz»). Так «I am here» не запишет человека за Армению.
     * Атака: «атака xx» / «attack xx» / «ракета xx» в начале сообщения.
     */
    parseChat(text) {
      const raw = String(text || '').trim();
      const result = { join: null, attack: null };
      const attack = fold(raw).match(/^(?:атака|атакую|attack|ракета|rocket)\s+(\S+)/u);
      const attackTarget = attack && byWord(raw.split(/\s+/)[1] || attack[1]);
      if (attackTarget) { result.attack = attackTarget; return result; }
      const flag = flagCodes(raw).find(c => ids.has(c));
      if (flag) { result.join = flag; return result; }
      const words = tokens(raw);
      if (words.length && words.length <= 4) {
        const found = words.map(w => byToken.get(w));
        if (found.every(Boolean) && new Set(found).size === 1) result.join = found[0];
      }
      return result;
    },
  };
}
