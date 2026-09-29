// Персонаж по умолчанию: мужик в деревенском туалете с газетой.
// Рисуется, только если в config.json не задано своё фото/видео.
// Центр головы — (540, 840) в координатах 1080x1920, т.е. faceX 50%, faceY 44%.
window.defaultCharacterSvg = (signText) => `
<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#d9f0ff"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6b4526"/><stop offset=".5" stop-color="#8a5a33"/><stop offset="1" stop-color="#5e3b20"/>
    </linearGradient>
    <pattern id="plaid" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#3b4a7a"/>
      <rect width="40" height="10" y="15" fill="#6d2433" opacity=".7"/>
      <rect width="10" height="40" x="15" fill="#6d2433" opacity=".7"/>
    </pattern>
  </defs>

  <rect width="1080" height="1920" fill="url(#sky)"/>
  <circle cx="900" cy="170" r="80" fill="#fff3a8"/>
  <g transform="translate(0 150)">
  <path d="M0 1150 Q270 1040 540 1120 T1080 1100 V1920 H0Z" fill="#79b44a"/>
  <path d="M0 1350 Q300 1280 600 1340 T1080 1330 V1920 H0Z" fill="#5f9a3a"/>
  <g stroke="#a47a4c" stroke-width="16">
    <line x1="0" y1="1230" x2="1080" y2="1230"/><line x1="0" y1="1290" x2="1080" y2="1290"/>
    ${[40,160,280,800,920,1040].map(x => `<line x1="${x}" y1="1190" x2="${x}" y2="1330"/>`).join('')}
  </g>

  <!-- будка -->
  <polygon points="180,420 540,230 900,420" fill="#4a2e18"/>
  <rect x="220" y="400" width="640" height="1260" fill="url(#wood)"/>
  <rect x="300" y="470" width="480" height="1150" fill="#24170d"/>
  <g stroke="#3b2413" stroke-width="6" opacity=".5">
    ${[260,820].map(x => `<line x1="${x}" y1="420" x2="${x}" y2="1650"/>`).join('')}
  </g>
  <rect x="330" y="290" width="420" height="110" rx="12" fill="#b08457" stroke="#5e3b20" stroke-width="8"/>
  <text x="540" y="365" font-size="58" font-family="'Noto Sans Armenian', Arial" text-anchor="middle" fill="#3b2413" font-weight="700">${signText}</text>
  <rect x="690" y="520" width="70" height="90" rx="10" fill="#f4f1ea"/><rect x="718" y="600" width="14" height="60" fill="#f4f1ea"/>

  <!-- ведро-унитаз -->
  <path d="M410 1340 H670 L650 1560 H430Z" fill="#8d949c" stroke="#5c6168" stroke-width="8"/>

  <!-- ноги, шорты -->
  <rect x="400" y="1250" width="130" height="150" rx="30" fill="url(#plaid)"/>
  <rect x="550" y="1250" width="130" height="150" rx="30" fill="url(#plaid)"/>
  <rect x="420" y="1390" width="80" height="170" rx="30" fill="#e0a882"/>
  <rect x="580" y="1390" width="80" height="170" rx="30" fill="#e0a882"/>
  <ellipse cx="455" cy="1570" rx="60" ry="24" fill="#3a2a22"/><ellipse cx="625" cy="1570" rx="60" ry="24" fill="#3a2a22"/>

  <!-- туловище в майке -->
  <path d="M420 860 Q540 820 660 860 L690 1270 H390Z" fill="#e0a882"/>
  <path d="M440 880 Q540 960 640 880 L670 1270 H410Z" fill="#f2f2f0"/>
  <path d="M455 880 L470 840 M625 880 L610 840" stroke="#f2f2f0" stroke-width="22"/>

  <!-- газета и руки -->
  <g transform="rotate(-6 540 1130)">
    <rect x="330" y="1030" width="420" height="230" fill="#efe8d6" stroke="#b9ad90" stroke-width="4"/>
    <line x1="540" y1="1030" x2="540" y2="1260" stroke="#b9ad90" stroke-width="4"/>
    <g fill="#8e8672">
      ${[1060,1090,1120,1150,1180,1210].map(y => `<rect x="355" y="${y}" width="160" height="10"/><rect x="565" y="${y}" width="160" height="10"/>`).join('')}
    </g>
    <rect x="365" y="1040" width="120" height="14" fill="#333"/>
  </g>
  <ellipse cx="330" cy="1140" rx="42" ry="36" fill="#e0a882"/>
  <ellipse cx="750" cy="1110" rx="42" ry="36" fill="#e0a882"/>
  <path d="M420 880 Q340 980 330 1110" stroke="#e0a882" stroke-width="70" fill="none" stroke-linecap="round"/>
  <path d="M660 880 Q740 960 750 1080" stroke="#e0a882" stroke-width="70" fill="none" stroke-linecap="round"/>

  <!-- голова -->
  <g id="head">
    <rect x="500" y="780" width="80" height="80" fill="#d89c75"/>
    <ellipse cx="425" cy="700" rx="26" ry="38" fill="#d89c75"/>
    <ellipse cx="655" cy="700" rx="26" ry="38" fill="#d89c75"/>
    <ellipse cx="540" cy="690" rx="120" ry="140" fill="#e3a987"/>
    <path d="M425 650 Q420 560 470 560 M655 650 Q660 560 610 560" stroke="#6d6a66" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="M470 560 Q540 540 610 560" stroke="#6d6a66" stroke-width="10" fill="none" opacity=".5"/>
    <g id="eyesOpen">
      <path d="M470 640 L520 632 M560 632 L610 640" stroke="#3a2e28" stroke-width="12" stroke-linecap="round"/>
      <ellipse cx="495" cy="672" rx="14" ry="10" fill="#2a2320"/><ellipse cx="585" cy="672" rx="14" ry="10" fill="#2a2320"/>
    </g>
    <g id="eyesHurt" style="display:none" stroke="#2a2320" stroke-width="10" stroke-linecap="round">
      <path d="M480 660 L510 684 M510 660 L480 684"/><path d="M570 660 L600 684 M600 660 L570 684"/>
    </g>
    <path d="M530 680 Q520 730 540 740 Q560 745 555 720" fill="#d18d68"/>
    <path d="M470 770 Q505 745 540 760 Q575 745 610 770 Q575 790 540 775 Q505 790 470 770Z" fill="#3a2e28"/>
    <path id="mouthIdle" d="M510 800 Q540 810 570 800" stroke="#7a3b30" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse id="mouthHurt" cx="540" cy="808" rx="26" ry="22" fill="#5a1a1a" style="display:none"/>
  </g>
  </g>
</svg>`;
