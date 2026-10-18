// Единый набор иконок эффектов (круглый значок своего цвета + белый знак с тёмной обводкой)
// и рисунки примерных подарков TikTok для прайса. Когда приходит настоящий подарок, его картинка из TikTok
// заменяет рисунок автоматически.
(function () {
  const TIER = {
    nitro: { color: ['#ffb347', '#ff6a00'], glyph: '<path d="M50 12C58 30 76 38 73 60 71 78 59 87 50 87 39 87 27 78 27 60 27 47 36 41 40 32 43 44 47 48 50 51 53 40 51 26 50 12Z" fill="#fff"/><path d="M50 50C55 58 62 63 60 72 58 80 54 82 50 82 45 82 41 79 40 72 39 64 46 60 50 50Z" fill="#ffcf4a"/>' },
    turbo: { color: ['#7ee8ff', '#0aa2e8'], glyph: '<path d="M57 10 26 56H46L39 90 74 41H54L63 10Z" fill="#fff"/>' },
    shield: { color: ['#8fb4ff', '#2457e6'], glyph: '<path d="M50 11 81 23 79 52C77 71 65 83 50 89 35 83 23 71 21 52L19 23Z" fill="#fff"/><path d="M36 51 47 62 66 39" fill="none" stroke="#2457e6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' },
    rocket: { color: ['#ff8a7a', '#e01e1e'], glyph: '<path d="M78 16C83 15 85 17 84 22 80 40 67 56 52 64L36 48C44 33 60 20 78 16Z" fill="#fff"/><circle cx="64" cy="36" r="7" fill="#e01e1e"/><path d="M36 48 22 50 32 38 44 36ZM52 64 50 78 62 68 64 56Z" fill="#fff"/><path d="M38 58C30 60 24 70 20 82 32 78 42 72 44 64Z" fill="#ffcf4a"/>' },
    super: { color: ['#ff8af0', '#c4119e'], glyph: '<path d="M50 8 58 32 82 22 70 44 94 52 70 60 82 80 58 70 50 94 42 70 18 80 30 60 6 52 30 44 18 22 42 32Z" fill="#fff"/><circle cx="50" cy="52" r="13" fill="#ffcf4a"/>' },
    chaos: { color: ['#c7a2ff', '#6a28e8'], glyph: '<g fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"><path d="M18 22H82"/><path d="M26 38H74"/><path d="M34 54H66"/><path d="M42 70H60"/><path d="M48 84H54"/></g>' },
    legend: { color: ['#ffe27a', '#e09a00'], glyph: '<path d="M14 72 10 28 34 48 50 16 66 48 90 28 86 72Z" fill="#fff"/><rect x="14" y="74" width="72" height="12" rx="4" fill="#fff"/><circle cx="50" cy="56" r="7" fill="#e01e1e"/><circle cx="30" cy="62" r="5" fill="#2457e6"/><circle cx="70" cy="62" r="5" fill="#2457e6"/>' },
  };
  function tierSvg(id) {
    const t = TIER[id] || TIER.nitro;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs><radialGradient id="g${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${t.color[0]}"/><stop offset="1" stop-color="${t.color[1]}"/></radialGradient>
      <filter id="s${id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".55"/></filter></defs>
      <circle cx="50" cy="50" r="47" fill="url(#g${id})" stroke="#10121f" stroke-width="5"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
      <g filter="url(#s${id})" transform="translate(50 52) scale(.78) translate(-50 -50)">${t.glyph}</g></svg>`;
  }

  // Примерные подарки TikTok (стилизованные рисунки)
  const GIFT = {
    rose: `<path d="M50 52 50 92" stroke="#2e8b3a" stroke-width="6"/><path d="M50 74C38 66 26 70 22 80 34 84 44 80 50 74ZM50 66C62 58 74 60 80 70 68 76 58 72 50 66Z" fill="#3fbf4f"/>
      <path d="M50 54C30 54 22 40 26 26 34 32 38 24 50 16 62 24 66 32 74 26 78 40 70 54 50 54Z" fill="#e8173a"/><path d="M50 46C40 44 36 34 40 26 46 30 50 26 54 30 60 26 62 36 58 42 56 46 50 46Z" fill="#ff5470"/><path d="M44 32C48 36 54 36 56 30" stroke="#a80d26" stroke-width="3" fill="none"/>`,
    'finger heart': `<path d="M50 86C30 72 18 60 18 44 18 32 28 24 38 24 44 24 48 28 50 32 52 28 56 24 62 24 72 24 82 32 82 44 82 60 70 72 50 86Z" fill="#ff3d7f"/><path d="M50 78C36 68 28 58 28 46 28 38 34 34 40 34" stroke="#ffb0cb" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    perfume: `<rect x="40" y="10" width="20" height="14" rx="3" fill="#f2c14a"/><rect x="45" y="22" width="10" height="10" fill="#d9a630"/><path d="M26 40C26 34 32 30 38 30H62C68 30 74 34 74 40V80C74 86 68 90 62 90H38C32 90 26 86 26 80Z" fill="#ff8ac8"/><path d="M32 44H68V80C68 83 65 85 62 85H38C35 85 32 83 32 80Z" fill="#ff5aa8"/><rect x="36" y="36" width="8" height="40" rx="4" fill="#ffd0ea"/>`,
    doughnut: `<circle cx="50" cy="52" r="38" fill="#d9954a"/><path d="M14 50C14 30 30 16 50 16 70 16 86 30 86 50 82 46 78 52 72 50 66 48 62 54 56 52 50 50 46 56 40 54 34 52 30 56 24 52 20 50 16 54 14 50Z" fill="#ff7ab8"/><circle cx="50" cy="50" r="12" fill="#5a3a20"/><g stroke-width="4" stroke-linecap="round"><path d="M30 30 34 34" stroke="#fff"/><path d="M62 26 66 24" stroke="#4ad8ff"/><path d="M72 38 74 42" stroke="#ffe14a"/><path d="M40 22 44 22" stroke="#7aff6a"/><path d="M26 42 28 46" stroke="#4ad8ff"/></g>`,
    'hand heart': `<path d="M50 84C28 70 16 58 16 42 16 30 26 22 36 22 42 22 47 26 50 30 53 26 58 22 64 22 74 22 84 30 84 42 84 58 72 70 50 84Z" fill="#ff2d55"/><path d="M14 64C10 52 14 40 22 36L30 62C24 66 18 68 14 64ZM86 64C90 52 86 40 78 36L70 62C76 66 82 68 86 64Z" fill="#ffc9a0" stroke="#d68a5a" stroke-width="2"/>`,
    'money gun': `<g transform="rotate(-12 50 50)"><rect x="16" y="40" width="58" height="22" rx="6" fill="#2fbf5a"/><rect x="70" y="44" width="14" height="10" rx="3" fill="#1f8a40"/><path d="M28 60H44L40 84H26Z" fill="#1f8a40"/><circle cx="34" cy="51" r="5" fill="#fff"/></g>
      <g><rect x="58" y="10" width="28" height="15" rx="2" fill="#7ee08a" stroke="#2e8b3a" stroke-width="2" transform="rotate(14 72 17)"/><rect x="70" y="26" width="24" height="13" rx="2" fill="#7ee08a" stroke="#2e8b3a" stroke-width="2" transform="rotate(-10 82 32)"/><text x="72" y="21" font-size="10" font-weight="900" fill="#2e8b3a" transform="rotate(14 72 17)">$</text></g>`,
    galaxy: `<circle cx="50" cy="50" r="40" fill="#1a0f4a"/><path d="M50 50C50 36 64 30 74 38 84 46 78 64 62 66 44 68 30 54 34 38 38 22 58 14 74 22" fill="none" stroke="#c07aff" stroke-width="6" stroke-linecap="round"/><path d="M50 50C50 62 38 68 28 60 20 54 24 40 36 38" fill="none" stroke="#4ad8ff" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="50" r="7" fill="#fff"/><g fill="#fff"><circle cx="24" cy="26" r="2"/><circle cx="78" cy="74" r="2.5"/><circle cx="70" cy="18" r="1.6"/><circle cx="20" cy="70" r="1.8"/></g>`,
    gift: `<rect x="16" y="40" width="68" height="46" rx="6" fill="#ff4a6a"/><rect x="12" y="30" width="76" height="16" rx="4" fill="#ff7a8e"/><rect x="45" y="30" width="10" height="56" fill="#ffd45a"/><path d="M50 30C40 14 24 18 30 28 34 32 44 30 50 30 56 30 66 32 70 28 76 18 60 14 50 30Z" fill="#ffd45a"/>`,
  };
  function giftSvg(name) {
    const art = GIFT[String(name || '').toLowerCase()] || GIFT.gift;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><filter id="d" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".5"/></filter></defs><g filter="url(#d)">${art}</g></svg>`;
  }
  const url = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const cache = new Map();
  function img(key, svg) {
    if (!cache.has(key)) { const i = new Image(); i.src = url(svg); cache.set(key, i); }
    return cache.get(key);
  }
  window.RaceIcons = {
    tierUrl: id => url(tierSvg(id)),
    giftUrl: name => url(giftSvg(name)),
    tierImg: id => img('t' + id, tierSvg(id)),
    tierColor: id => (TIER[id] || TIER.nitro).color[1],
  };
})();
