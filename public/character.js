// Персонаж по умолчанию: карикатура на политика в костюме, сидит в деревенском туалете с газетой.
// Рисуется, только если в config.json не задано своё фото/видео.
// Модель выбирается в config.json -> character.model: "erdogan" (по умолчанию) или "putin".
//
// Важно для анимации (app.js): id групп #head, #upper, #paper, #page, #legL, #legR, #legRCrossed, #shinR,
// #pupils, глаза eyes*, рты mouth*, брови brows*, слои faceGreen/faceRed.
// Центр головы — (540, 690) внутри сдвинутой на 150 группы, т.е. faceX 50%, faceY 44% кадра.

const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

// ---------- общая сцена: будка, фон, унитаз, ноги, тело, газета ----------
function sceneSvg(signText, headSvg, skin) {
  return `
<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5fb0f2"/><stop offset=".6" stop-color="#a9dafc"/><stop offset="1" stop-color="#e6f5ff"/>
    </linearGradient>
    <radialGradient id="sun" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#fff2a6"/><stop offset="1" stop-color="#fff2a6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8cc460"/><stop offset="1" stop-color="#5f9a3a"/></linearGradient>
    <linearGradient id="hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fae45"/><stop offset="1" stop-color="#3f7a26"/></linearGradient>
    <linearGradient id="plank" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5a3a1f"/><stop offset=".15" stop-color="#8a5d35"/><stop offset=".85" stop-color="#7b5230"/><stop offset="1" stop-color="#4d3119"/>
    </linearGradient>
    <radialGradient id="inside" cx=".5" cy=".42" r=".75">
      <stop offset="0" stop-color="#4a3421"/><stop offset=".6" stop-color="#2a1c10"/><stop offset="1" stop-color="#140d07"/>
    </radialGradient>
    <radialGradient id="bulbGlow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#ffe7a0" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="porcelain" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9c3cc"/><stop offset=".35" stop-color="#ffffff"/><stop offset=".7" stop-color="#eef2f5"/><stop offset="1" stop-color="#aab4bd"/>
    </linearGradient>
    <linearGradient id="suit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#141a26"/><stop offset=".3" stop-color="#27304a"/><stop offset=".55" stop-color="#2c3653"/><stop offset="1" stop-color="#121722"/>
    </linearGradient>
    <linearGradient id="sleeveL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#11161f"/><stop offset=".6" stop-color="#28314b"/><stop offset="1" stop-color="#1a2130"/></linearGradient>
    <linearGradient id="sleeveR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#0f141c"/><stop offset=".6" stop-color="#252e46"/><stop offset="1" stop-color="#1a2130"/></linearGradient>
    <linearGradient id="shirt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dfe3ea"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#d5dae2"/></linearGradient>
    <pattern id="tie" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="16" height="16" fill="#1d3a78"/><rect width="16" height="4" fill="#2f5bb0"/><circle cx="8" cy="11" r="1.6" fill="#9fb8ea"/>
    </pattern>
    <linearGradient id="paperG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ece4cf"/><stop offset=".46" stop-color="#f7f2e4"/><stop offset=".5" stop-color="#d8cfb7"/><stop offset=".54" stop-color="#f7f2e4"/><stop offset="1" stop-color="#e6ddc6"/>
    </linearGradient>
    <radialGradient id="handG" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="${skin.light}"/><stop offset="1" stop-color="${skin.dark}"/></radialGradient>
    <linearGradient id="legG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${skin.dark}"/><stop offset=".45" stop-color="${skin.light}"/><stop offset="1" stop-color="${skin.dark}"/></linearGradient>
    <pattern id="hearts" width="44" height="44" patternUnits="userSpaceOnUse">
      <rect width="44" height="44" fill="#f5f5fa"/>
      <path d="M22 30 L12 20 A6 6 0 0 1 22 13 A6 6 0 0 1 32 20Z" fill="#e0314b"/>
    </pattern>
    <linearGradient id="boxerShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient>
    <linearGradient id="shoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a42"/><stop offset=".4" stop-color="#101014"/><stop offset="1" stop-color="#050506"/></linearGradient>
  </defs>

  <!-- небо, солнце, облака -->
  <rect width="1080" height="1920" fill="url(#sky)"/>
  <circle cx="900" cy="190" r="170" fill="url(#sun)"/>
  <circle cx="900" cy="190" r="62" fill="#fff6c4"/>
  <g fill="#fff" opacity=".85">
    <ellipse cx="170" cy="230" rx="95" ry="34"/><ellipse cx="230" cy="210" rx="70" ry="40"/><ellipse cx="120" cy="215" rx="55" ry="28"/>
    <ellipse cx="640" cy="120" rx="80" ry="26"/><ellipse cx="690" cy="104" rx="55" ry="30"/>
  </g>

  <g transform="translate(0 150)">
  <!-- холмы, деревья, забор -->
  <path d="M0 1080 Q200 980 430 1040 T880 1010 T1080 1030 V1920 H0Z" fill="url(#hill1)"/>
  <g>
    <rect x="92" y="930" width="18" height="120" fill="#5a3b22"/>
    <circle cx="100" cy="900" r="62" fill="#3f7d2c"/><circle cx="60" cy="930" r="44" fill="#468a31"/><circle cx="142" cy="926" r="46" fill="#39722a"/><circle cx="92" cy="880" r="30" fill="#5aa13f"/>
    <rect x="968" y="940" width="16" height="110" fill="#5a3b22"/>
    <circle cx="976" cy="910" r="54" fill="#3f7d2c"/><circle cx="1010" cy="936" r="40" fill="#39722a"/><circle cx="944" cy="938" r="38" fill="#468a31"/><circle cx="966" cy="892" r="26" fill="#5aa13f"/>
  </g>
  <path d="M0 1180 Q300 1110 600 1170 T1080 1160 V1920 H0Z" fill="url(#hill2)"/>
  <g>
    <rect x="0" y="1218" width="1080" height="14" fill="#9b6f43"/><rect x="0" y="1270" width="1080" height="14" fill="#9b6f43"/>
    ${range(10, i => { const x = 18 + i * 118; return `<path d="M${x} 1330 V1196 L${x + 12} 1182 L${x + 24} 1196 V1330Z" fill="#b58555" stroke="#7a5431" stroke-width="3"/>`; })}
  </g>

  <!-- будка: доски, крыша из дранки, открытая дверь с месяцем -->
  <g>
    <polygon points="200,432 540,240 880,432" fill="#3d2513"/>
    ${range(8, i => { const y = 300 + i * 18; const half = (y - 240) * (340 / 192); return `<path d="M${540 - half} ${y + 14} L${540 + half} ${y + 14}" stroke="#2b190c" stroke-width="3"/>`; })}
    <polygon points="200,432 540,240 880,432 868,446 540,262 212,446" fill="#5a3a1f"/>
    ${range(10, i => { const x = 220 + i * 64; const tint = ['#7b5230', '#845835', '#71492a', '#80552f', '#76502c'][i % 5]; return `<rect x="${x}" y="408" width="64" height="1252" fill="url(#plank)"/><rect x="${x}" y="408" width="64" height="1252" fill="${tint}" opacity=".35"/><line x1="${x}" y1="408" x2="${x}" y2="1660" stroke="#2e1d0f" stroke-width="3"/><path d="M${x + 20} 520 q6 60 0 120 M${x + 40} 1300 q-6 70 0 140" stroke="#5a3a1f" stroke-width="2" fill="none" opacity=".6"/>`; })}
    <rect x="300" y="470" width="480" height="1150" rx="6" fill="url(#inside)"/>
    <rect x="300" y="470" width="480" height="1150" rx="6" fill="none" stroke="#2a190c" stroke-width="10"/>
    <!-- лампочка -->
    <line x1="540" y1="470" x2="540" y2="520" stroke="#111" stroke-width="3"/>
    <circle cx="540" cy="540" r="140" fill="url(#bulbGlow)"/>
    <circle cx="540" cy="532" r="13" fill="#fff4c2"/>
    <!-- открытая дверь -->
    <path d="M860 470 L1010 440 L1010 1690 L860 1660Z" fill="#6f4a2a" stroke="#3d2513" stroke-width="6"/>
    ${range(3, i => `<line x1="${860 + 50 * (i + 1)}" y1="${470 - 10 * (i + 1)}" x2="${860 + 50 * (i + 1)}" y2="${1660 + 10 * (i + 1)}" stroke="#4a3019" stroke-width="3"/>`)}
    <path d="M945 560 a30 30 0 1 0 22 50 a24 24 0 1 1 -22 -50Z" fill="#1c120a"/>
    <!-- вывеска -->
    <line x1="400" y1="318" x2="420" y2="290" stroke="#c9a46a" stroke-width="4"/><line x1="680" y1="318" x2="660" y2="290" stroke="#c9a46a" stroke-width="4"/>
    <rect x="330" y="300" width="420" height="104" rx="10" fill="#c2935f" stroke="#6b4424" stroke-width="7"/>
    <rect x="344" y="312" width="392" height="80" rx="6" fill="none" stroke="#9d7042" stroke-width="3"/>
    <circle cx="348" cy="318" r="5" fill="#3d2513"/><circle cx="732" cy="318" r="5" fill="#3d2513"/><circle cx="348" cy="386" r="5" fill="#3d2513"/><circle cx="732" cy="386" r="5" fill="#3d2513"/>
    <text x="540" y="372" font-size="58" font-family="'Noto Sans Armenian', Georgia, serif" text-anchor="middle" fill="#3b2413" font-weight="700">${signText}</text>
    <!-- туалетная бумага -->
    <rect x="684" y="566" width="96" height="9" rx="4" fill="#5a3a1f"/>
    <rect x="690" y="576" width="68" height="58" rx="10" fill="#f4f1e8"/>
    <rect x="690" y="576" width="68" height="58" rx="10" fill="none" stroke="#d6cfbe" stroke-width="2"/>
    <ellipse cx="758" cy="605" rx="11" ry="29" fill="#e6e0d2"/><ellipse cx="758" cy="605" rx="4" ry="10" fill="#9c8f78"/>
    <path d="M694 626 L694 700 Q712 708 730 700 L734 630Z" fill="#f4f1e8" stroke="#d6cfbe" stroke-width="2"/>
  </g>

  <!-- флажок, лучи от лампы, тень на полу, табуретка -->
  <g>
    <line x1="322" y1="500" x2="322" y2="600" stroke="#5a3a1f" stroke-width="4"/>
    <path d="M324 504 L420 512 L414 552 L324 560Z" fill="#e30a17"/>
    <circle cx="362" cy="532" r="15" fill="#fff"/><circle cx="367" cy="532" r="12" fill="#e30a17"/>
    <path d="M384 532 l-9 3 l5 -7 l0 9 l-5 -7Z" fill="#fff"/>
    <path d="M540 545 L330 1300 L750 1300Z" fill="#ffe7a0" opacity=".05"/>
    <ellipse cx="540" cy="1600" rx="230" ry="26" fill="#000" opacity=".35"/>
    <rect x="696" y="1478" width="80" height="14" rx="4" fill="#8a5d35"/>
    <path d="M704 1492 L700 1610 M768 1492 L772 1610 M712 1560 H760" stroke="#5a3a1f" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="736" cy="1476" rx="30" ry="6" fill="#d9c7a1"/>
  </g>

  <!-- унитаз -->
  <path d="M428 1296 C428 1400 440 1470 486 1500 H594 C640 1470 652 1400 652 1296Z" fill="url(#porcelain)" stroke="#9aa4ad" stroke-width="4"/>
  <path d="M466 1496 H614 L622 1556 H458Z" fill="url(#porcelain)" stroke="#9aa4ad" stroke-width="4"/>
  <ellipse cx="540" cy="1286" rx="212" ry="46" fill="url(#porcelain)" stroke="#9aa4ad" stroke-width="5"/>
  <ellipse cx="540" cy="1280" rx="186" ry="34" fill="none" stroke="#fff" stroke-width="5" opacity=".8"/>

  <!-- левая нога -->
  <g id="legL">
    <path d="M385 1235 Q378 1332 420 1352 H522 Q546 1320 540 1235Z" fill="url(#hearts)"/>
    <path d="M385 1235 Q378 1332 420 1352 H522 Q546 1320 540 1235Z" fill="url(#boxerShade)" stroke="#b9b9c6" stroke-width="3"/>
    <path d="M430 1362 L437 1484 H495 L502 1362Z" fill="url(#legG)"/>
    <ellipse cx="465" cy="1356" rx="58" ry="33" fill="url(#handG)"/>
    <path d="M442 1350 q22 -12 46 0" stroke="${skin.line}" stroke-width="3" fill="none" opacity=".7"/>
    ${range(6, i => `<path d="M${446 + (i % 3) * 14} ${1392 + i * 14} l6 -6" stroke="${skin.hair}" stroke-width="2"/>`)}
    <rect x="433" y="1466" width="66" height="30" rx="6" fill="#16161a"/>
    <path d="M396 1482 Q466 1452 534 1482 Q544 1512 526 1540 Q466 1556 404 1540 Q386 1512 396 1482Z" fill="#1d2230"/>
    <path d="M408 1498 Q466 1484 522 1500 M412 1520 Q466 1508 520 1522 M430 1486 q10 20 -4 44" stroke="#343b50" stroke-width="4" fill="none"/>
    <path d="M394 1556 Q400 1532 452 1534 Q512 1534 518 1560 Q516 1584 452 1586 Q396 1584 394 1556Z" fill="url(#shoe)"/>
    <ellipse cx="432" cy="1550" rx="22" ry="6" fill="#8a8a98" opacity=".7"/>
  </g>
  <!-- правая нога: обычная -->
  <g id="legR">
    <path d="M695 1235 Q702 1332 660 1352 H558 Q534 1320 540 1235Z" fill="url(#hearts)"/>
    <path d="M695 1235 Q702 1332 660 1352 H558 Q534 1320 540 1235Z" fill="url(#boxerShade)" stroke="#b9b9c6" stroke-width="3"/>
    <path d="M578 1362 L585 1484 H643 L650 1362Z" fill="url(#legG)"/>
    <ellipse cx="615" cy="1356" rx="58" ry="33" fill="url(#handG)"/>
    <path d="M592 1350 q22 -12 46 0" stroke="${skin.line}" stroke-width="3" fill="none" opacity=".7"/>
    ${range(6, i => `<path d="M${596 + (i % 3) * 14} ${1392 + i * 14} l6 -6" stroke="${skin.hair}" stroke-width="2"/>`)}
    <rect x="581" y="1466" width="66" height="30" rx="6" fill="#16161a"/>
    <path d="M546 1482 Q616 1452 684 1482 Q694 1512 676 1540 Q616 1556 554 1540 Q536 1512 546 1482Z" fill="#1d2230"/>
    <path d="M558 1498 Q616 1484 672 1500 M562 1520 Q616 1508 670 1522 M650 1486 q-10 20 4 44" stroke="#343b50" stroke-width="4" fill="none"/>
    <path d="M562 1560 Q568 1534 628 1534 Q680 1532 686 1556 Q684 1584 628 1586 Q564 1584 562 1560Z" fill="url(#shoe)"/>
    <ellipse cx="648" cy="1550" rx="22" ry="6" fill="#8a8a98" opacity=".7"/>
  </g>
  <!-- правая нога закинута на левую, ступня покачивается (CSS #shinR) -->
  <g id="legRCrossed" style="display:none">
    <path d="M700 1235 Q706 1300 660 1320 L470 1350 Q418 1342 428 1290 L540 1235Z" fill="url(#hearts)"/>
    <path d="M700 1235 Q706 1300 660 1320 L470 1350 Q418 1342 428 1290 L540 1235Z" fill="url(#boxerShade)" stroke="#b9b9c6" stroke-width="3"/>
    <g id="shinR">
      <path d="M392 1318 L352 1452 L404 1468 L452 1330Z" fill="url(#legG)"/>
      ${range(5, i => `<path d="M${392 - i * 6} ${1360 + i * 16} l6 -6" stroke="${skin.hair}" stroke-width="2"/>`)}
      <path d="M348 1444 L402 1462 L394 1486 L340 1468Z" fill="#16161a"/>
      <path d="M316 1450 Q380 1428 440 1464 Q440 1494 420 1512 Q364 1518 322 1494 Q304 1472 316 1450Z" fill="#1d2230"/>
      <path d="M330 1470 Q380 1460 426 1480" stroke="#343b50" stroke-width="4" fill="none"/>
      <path d="M290 1520 Q300 1498 352 1506 Q410 1514 412 1538 Q404 1558 348 1552 Q290 1546 290 1520Z" fill="url(#shoe)"/>
      <ellipse cx="324" cy="1514" rx="20" ry="5" fill="#8a8a98" opacity=".7" transform="rotate(10 324 1514)"/>
    </g>
    <ellipse cx="428" cy="1318" rx="50" ry="40" fill="url(#handG)"/>
  </g>

  <!-- верх тела: дышит (CSS-анимация #upper) -->
  <g id="upper">
  <!-- пиджак, рубашка, галстук, значок с флагом -->
  <path d="M392 884 C428 852 480 838 540 838 C600 838 652 852 688 884 C708 962 714 1100 708 1272 L372 1272 C366 1100 372 962 392 884Z" fill="url(#suit)"/>
  <path d="M496 842 L540 1004 L584 842 Q540 832 496 842Z" fill="url(#shirt)"/>
  <path d="M528 860 L552 860 L549 884 L531 884Z" fill="#1d3a78"/>
  <path d="M531 884 L549 884 L562 994 L540 1020 L518 994Z" fill="url(#tie)"/>
  <path d="M531 884 L549 884 L547 896 L533 896Z" fill="#000" opacity=".25"/>
  <path d="M497 842 L522 884 L540 858Z M583 842 L558 884 L540 858Z" fill="#fff" stroke="#c6ccd6" stroke-width="2"/>
  <path d="M497 844 C476 862 466 884 470 904 L492 908 L478 928 L536 1008 L541 998 L508 902Z" fill="#1c2336"/>
  <path d="M583 844 C604 862 614 884 610 904 L588 908 L602 928 L544 1008 L539 998 L572 902Z" fill="#1c2336"/>
  <path d="M470 904 L492 908 L478 928 M610 904 L588 908 L602 928" stroke="#3a4668" stroke-width="3" fill="none"/>
  <path d="M497 844 C476 862 466 884 470 904 M583 844 C604 862 614 884 610 904" stroke="#46557d" stroke-width="3" fill="none"/>
  <circle cx="592" cy="930" r="10" fill="#e30a17" stroke="#c9a24a" stroke-width="2"/>
  <circle cx="590" cy="930" r="5" fill="#fff"/><circle cx="592" cy="930" r="4" fill="#e30a17"/><circle cx="596" cy="930" r="1.6" fill="#fff"/>
  <path d="M608 976 L618 956 L628 970 L640 952 L652 976Z" fill="#f4f6fa" stroke="#c6ccd6" stroke-width="1.5"/>
  <path d="M600 977 H660" stroke="#0e121b" stroke-width="4"/>
  <path d="M430 1000 Q450 1060 440 1140 M650 1000 Q630 1060 640 1140" stroke="#0e121b" stroke-width="4" fill="none" opacity=".6"/>

  <!-- рукава -->
  <path d="M400 882 C356 924 326 1004 314 1094 L372 1116 C380 1034 402 962 434 916Z" fill="url(#sleeveL)"/>
  <path d="M680 882 C724 920 752 996 764 1066 L708 1086 C698 1014 678 952 646 916Z" fill="url(#sleeveR)"/>
  <path d="M350 980 q20 10 36 -2 M340 1030 q22 10 38 -4 M720 972 q-20 10 -36 -2 M734 1020 q-22 10 -38 -4" stroke="#0b0f16" stroke-width="3" fill="none" opacity=".7"/>

  <!-- газета: руки держат за края -->
  <g id="paper">
  <g transform="rotate(-6 540 1130)">
    <rect x="336" y="1036" width="420" height="230" fill="#000" opacity=".25"/>
    <rect x="330" y="1030" width="420" height="230" fill="url(#paperG)" stroke="#b9ad90" stroke-width="3"/>
    <text x="435" y="1066" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="700" text-anchor="middle" fill="#222">HABER</text>
    <rect x="352" y="1074" width="166" height="3" fill="#333"/>
    <rect x="352" y="1084" width="150" height="12" fill="#444"/>
    <rect x="352" y="1104" width="78" height="60" fill="#9a9a94"/><path d="M356 1160 L376 1128 L392 1146 L406 1122 L426 1160Z" fill="#6f6f6a"/>
    <g fill="#8e8672">
      ${range(6, i => `<rect x="438" y="${1106 + i * 10}" width="80" height="5"/>`)}
      ${range(8, i => `<rect x="352" y="${1172 + i * 10}" width="${i % 3 === 2 ? 110 : 166}" height="5"/>`)}
      <rect x="562" y="1046" width="170" height="14" fill="#444"/>
      ${range(4, i => `<rect x="562" y="${1070 + i * 10}" width="170" height="5"/>`)}
      <rect x="562" y="1116" width="170" height="70" fill="#a9a9a3"/>
      ${range(6, i => `<rect x="562" y="${1196 + i * 10}" width="${i % 2 ? 140 : 170}" height="5"/>`)}
    </g>
    <g id="page" style="opacity:0">
      <rect x="540" y="1030" width="210" height="230" fill="#f5efdf" stroke="#b9ad90" stroke-width="3"/>
      <g fill="#8e8672">${range(18, i => `<rect x="562" y="${1048 + i * 11}" width="${i % 4 === 3 ? 110 : 170}" height="5"/>`)}</g>
    </g>
  </g>
  <!-- манжеты и кисти -->
  <rect x="304" y="1094" width="72" height="24" rx="8" fill="url(#shirt)" transform="rotate(12 340 1106)"/>
  <rect x="706" y="1062" width="72" height="24" rx="8" fill="url(#shirt)" transform="rotate(-10 742 1074)"/>
  <path d="M300 1128 C292 1150 300 1182 330 1188 C352 1190 364 1172 362 1150 C360 1128 342 1114 320 1116Z" fill="url(#handG)"/>
  <path d="M342 1138 C362 1128 386 1132 390 1146 C388 1158 366 1160 348 1156Z" fill="url(#handG)" stroke="${skin.line}" stroke-width="2"/>
  <path d="M306 1150 q10 4 20 0 M308 1164 q10 4 20 0 M312 1177 q10 3 18 0" stroke="${skin.line}" stroke-width="2" fill="none"/>
  <path d="M780 1094 C788 1116 780 1150 750 1156 C728 1158 716 1140 718 1118 C720 1096 738 1082 760 1084Z" fill="url(#handG)"/>
  <path d="M738 1106 C718 1096 694 1100 690 1114 C692 1126 714 1128 732 1124Z" fill="url(#handG)" stroke="${skin.line}" stroke-width="2"/>
  <path d="M774 1118 q-10 4 -20 0 M772 1132 q-10 4 -20 0 M768 1145 q-10 3 -18 0" stroke="${skin.line}" stroke-width="2" fill="none"/>
  </g>

${headSvg}
  </g>

  <!-- стаканчик турецкого чая (тюльпан) на табуретке: в покое он из него пьёт -->
  <g id="teaGlass">
    <path d="M722 1418 Q716 1440 726 1452 Q720 1462 724 1472 H748 Q752 1462 746 1452 Q756 1440 750 1418Z" fill="#b5401f" opacity=".92"/>
    <path d="M722 1418 Q716 1440 726 1452 Q720 1462 724 1472 H748 Q752 1462 746 1452 Q756 1440 750 1418Z" fill="none" stroke="#fff" stroke-width="2.5" opacity=".8"/>
    <path d="M727 1424 Q724 1440 730 1450" stroke="#fff" stroke-width="3" opacity=".6" fill="none"/>
    <g class="steam" stroke="#fff" stroke-width="3" fill="none" opacity=".55">
      <path d="M730 1410 q-6 -10 0 -20 q6 -10 0 -20"/><path d="M742 1408 q6 -10 0 -20 q-6 -10 0 -20"/>
    </g>
  </g>

  <!-- рука с поднятым пальцем: «Ван минут!» -->
  <g id="fingerHand" style="opacity:0">
    <path d="M700 1060 C706 1010 712 980 716 950" stroke="url(#sleeveR)" stroke-width="64" stroke-linecap="round" fill="none"/>
    <rect x="684" y="920" width="66" height="22" rx="8" fill="url(#shirt)" transform="rotate(-8 717 931)"/>
    <path d="M690 918 C686 890 694 872 716 870 C738 868 748 884 746 906 C744 920 734 926 718 926 C704 926 692 924 690 918Z" fill="url(#handG)"/>
    <rect x="708" y="800" width="20" height="80" rx="10" fill="url(#handG)" stroke="${skin.line}" stroke-width="2"/>
    <path d="M712 830 h12 M712 852 h12" stroke="${skin.line}" stroke-width="2"/>
    <path d="M694 888 q-14 4 -12 18 q4 10 16 6" fill="url(#handG)" stroke="${skin.line}" stroke-width="2"/>
  </g>
  </g>
</svg>`;
}

// ---------- голова: Эрдоган ----------
const E = {
  brow: '#4a4541', lid: '#5b3e2d', iris: '#3a2517', lip: '#9a5646', mouth: '#3a0f0f', crease: '#b77b58',
};
const eBrow = (l, r, w = 13) => `<path d="${l}" stroke="${E.brow}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${r}" stroke="${E.brow}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
const eAlmond = (cx, cy) => `<path d="M${cx - 22} ${cy + 2} Q${cx} ${cy - 11} ${cx + 22} ${cy} Q${cx} ${cy + 10} ${cx - 22} ${cy + 2}Z" fill="#fbf8f3"/>`;
const eIris = (cx, cy, r = 7.5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${E.iris}"/><circle cx="${cx}" cy="${cy}" r="${r * .45}" fill="#0c0806"/><circle cx="${cx - 2.5}" cy="${cy - 2.5}" r="2" fill="#fff"/>`;
const eLid = (cx, cy) => `<path d="M${cx - 24} ${cy + 1} Q${cx} ${cy - 14} ${cx + 24} ${cy - 1}" stroke="${E.lid}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${cx - 24} ${cy - 8} Q${cx} ${cy - 22} ${cx + 24} ${cy - 10}" stroke="${E.crease}" stroke-width="4" fill="none" opacity=".8"/>`;
const eClosed = (cx, cy, up = false) => `<path d="M${cx - 22} ${cy + 1} Q${cx} ${cy + (up ? -12 : 9)} ${cx + 22} ${cy}" stroke="${E.lid}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
const L = [495, 683], R = [585, 683];

const erdoganHead = `
  <!-- голова: карикатура на Эрдогана -->
  <g id="head">
    <defs>
      <radialGradient id="eSkin" cx=".46" cy=".42" r=".62">
        <stop offset="0" stop-color="#f0c29c"/><stop offset=".6" stop-color="#dea27a"/><stop offset="1" stop-color="#b9784f"/>
      </radialGradient>
      <linearGradient id="eNeck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a86a45"/><stop offset=".5" stop-color="#cf9169"/><stop offset="1" stop-color="#d89c73"/></linearGradient>
      <linearGradient id="eHair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f1ee"/><stop offset=".6" stop-color="#cfcfcb"/><stop offset="1" stop-color="#a5a5a1"/></linearGradient>
      <linearGradient id="eMust" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9c7c2"/><stop offset=".55" stop-color="#8e8b86"/><stop offset="1" stop-color="#6c6964"/></linearGradient>
      <linearGradient id="eNose" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c7875f"/><stop offset=".45" stop-color="#eab690"/><stop offset="1" stop-color="#c07f58"/></linearGradient>
    </defs>
    <!-- шея -->
    <path d="M504 786 L576 786 Q580 828 588 856 Q540 872 492 856 Q500 828 504 786Z" fill="url(#eNeck)"/>
    <path d="M500 842 Q540 856 580 842" stroke="#9c5e3a" stroke-width="3" fill="none" opacity=".5"/>
    <!-- волосы сзади/по бокам -->
    <path d="M422 690 C410 620 420 570 450 548 L468 640 Z M658 690 C670 620 660 570 630 548 L612 640Z" fill="#b9b9b5"/>
    <!-- уши -->
    <path d="M424 676 C404 660 396 690 402 716 C408 744 424 756 438 748 Z" fill="#d49870"/>
    <path d="M418 690 C410 700 412 722 424 734" stroke="#a8683f" stroke-width="4" fill="none"/>
    <path d="M656 676 C676 660 684 690 678 716 C672 744 656 756 642 748 Z" fill="#d49870"/>
    <path d="M662 690 C670 700 668 722 656 734" stroke="#a8683f" stroke-width="4" fill="none"/>
    <!-- лицо -->
    <path id="eFace" d="M540 540 C612 540 656 582 658 650 C660 704 650 748 628 788 C606 830 574 852 540 854 C506 852 474 830 452 788 C430 748 420 704 422 650 C424 582 468 540 540 540Z" fill="url(#eSkin)"/>
    <!-- тени: виски, глазницы, скулы, щёки -->
    <path d="M430 640 C436 700 446 744 470 780 C450 770 432 730 428 680Z M650 640 C644 700 634 744 610 780 C630 770 648 730 652 680Z" fill="#a8683f" opacity=".35"/>
    <ellipse cx="${L[0]}" cy="${L[1] - 4}" rx="34" ry="20" fill="#9c5e3a" opacity=".22"/>
    <ellipse cx="${R[0]}" cy="${R[1] - 4}" rx="34" ry="20" fill="#9c5e3a" opacity=".22"/>
    <path d="M462 736 Q476 764 500 770 M618 736 Q604 764 580 770" stroke="#b77b58" stroke-width="4" fill="none" opacity=".8"/>
    <!-- морщины на лбу -->
    <path d="M488 612 Q540 600 592 612 M494 628 Q540 618 586 628 M502 643 Q540 636 578 643" stroke="#bf835e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <!-- волосы: седые, густые, зачёсаны назад, залысины на висках -->
    <path d="M424 664 C416 602 438 556 478 537 C504 526 524 522 540 522 C556 522 576 526 602 537 C642 556 664 602 656 664 C650 642 646 624 638 608 C624 594 606 592 592 600 C578 586 560 582 540 584 C520 582 502 586 488 600 C474 592 456 594 442 608 C434 624 430 642 424 664Z" fill="url(#eHair)"/>
    <path d="M458 574 Q496 548 540 546 M540 546 Q584 548 622 574 M470 592 Q500 570 536 566 M544 566 Q580 570 610 592 M446 616 Q452 590 474 574 M634 616 Q628 590 606 574" stroke="#a9a9a4" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M490 556 Q520 542 552 544" stroke="#fff" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>
    <!-- мешки под глазами, гусиные лапки -->
    <path d="M476 700 Q495 710 514 700 M566 700 Q585 710 604 700" stroke="#b77b58" stroke-width="3" fill="none"/>
    <path d="M462 686 l-12 -4 M462 694 l-12 4 M618 686 l12 -4 M618 694 l12 4" stroke="#b77b58" stroke-width="2.5" stroke-linecap="round"/>

    <!-- глаза (переключаются из app.js) -->
    <g id="eyesOpen">
      ${eAlmond(...L)}${eAlmond(...R)}
      <g id="pupils">${eIris(L[0], L[1] - 1)}${eIris(R[0], R[1] - 1)}</g>
      ${eLid(...L)}${eLid(...R)}
    </g>
    <g id="eyesBlink" style="display:none">${eClosed(...L)}${eClosed(...R)}<path d="M471 676 Q495 664 519 674 M561 674 Q585 664 609 676" stroke="${E.crease}" stroke-width="4" fill="none"/></g>
    <g id="eyesHappy" style="display:none">${eClosed(L[0], L[1] + 2, true)}${eClosed(R[0], R[1] + 2, true)}</g>
    <g id="eyesWink" style="display:none">${eClosed(L[0], L[1] + 2, true)}${eAlmond(...R)}${eIris(R[0], R[1] - 1)}${eLid(...R)}</g>
    <g id="eyesDown" style="display:none">
      ${eAlmond(L[0], L[1] + 2)}${eAlmond(R[0], R[1] + 2)}${eIris(L[0], L[1] + 4, 6.5)}${eIris(R[0], R[1] + 4, 6.5)}
      <path d="M471 681 Q495 674 519 679 M561 679 Q585 674 609 681" stroke="${E.lid}" stroke-width="7" fill="none" stroke-linecap="round"/>
    </g>
    <g id="eyesHurt" style="display:none" stroke="#2a1a12" stroke-width="7" stroke-linecap="round">
      <path d="M481 671 L509 695 M509 671 L481 695"/><path d="M571 671 L599 695 M599 671 L571 695"/>
    </g>
    <g id="eyesWide" style="display:none">
      <circle cx="${L[0]}" cy="${L[1]}" r="16" fill="#fbf8f3" stroke="${E.lid}" stroke-width="3"/><circle cx="${R[0]}" cy="${R[1]}" r="16" fill="#fbf8f3" stroke="${E.lid}" stroke-width="3"/>
      ${eIris(L[0], L[1], 6)}${eIris(R[0], R[1], 6)}
    </g>
    <g id="eyesUp" style="display:none">
      <ellipse cx="${L[0]}" cy="${L[1]}" rx="17" ry="13" fill="#fbf8f3" stroke="${E.lid}" stroke-width="3"/><ellipse cx="${R[0]}" cy="${R[1]}" rx="17" ry="13" fill="#fbf8f3" stroke="${E.lid}" stroke-width="3"/>
      ${eIris(L[0], L[1] - 6, 6.5)}${eIris(R[0], R[1] - 6, 6.5)}
    </g>
    <g id="eyesSquint" style="display:none" stroke="${E.lid}" stroke-width="6" fill="none" stroke-linecap="round">
      <path d="M473 676 L515 685 L475 694"/><path d="M607 676 L565 685 L605 694"/>
    </g>
    <g id="eyesDizzy" style="display:none" stroke="#2a1a12" stroke-width="4.5" fill="none">
      <g class="spin"><path d="M${L[0]} ${L[1]} m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0"/></g>
      <g class="spin rev"><path d="M${R[0]} ${R[1]} m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0"/></g>
    </g>
    <g id="eyesCry" style="display:none">
      ${eClosed(...L)}${eClosed(...R)}
      <g fill="#6cc3ff" opacity=".9">
        <path class="tear" d="M478 694 q-8 14 0 18 q8 -4 0 -18Z"/><path class="tear t2" d="M602 694 q-8 14 0 18 q8 -4 0 -18Z"/>
        <path class="tear t3" d="M486 694 q-8 14 0 18 q8 -4 0 -18Z"/><path class="tear t4" d="M594 694 q-8 14 0 18 q8 -4 0 -18Z"/>
      </g>
    </g>

    <!-- брови: густые, тёмно-седые, внутренние концы приподняты, внешние опущены -->
    <g id="browsNormal">${eBrow('M462 664 Q486 646 520 650', 'M560 650 Q594 646 618 664')}</g>
    <g id="browsUp" style="display:none">${eBrow('M462 648 Q488 626 520 634', 'M560 634 Q592 626 618 648')}</g>
    <g id="browsSad" style="display:none">${eBrow('M462 664 Q490 656 520 640', 'M560 640 Q590 656 618 664')}</g>
    <g id="browsPinch" style="display:none">${eBrow('M462 660 Q490 654 522 660', 'M558 660 Q590 654 618 660')}</g>
    <g id="browsAngry" style="display:none">${eBrow('M462 648 Q492 652 522 668', 'M558 668 Q588 652 618 648', 14)}</g>

    <!-- крупный нос с горбинкой -->
    <path d="M528 690 C526 718 520 738 512 752 C506 766 518 776 530 771 C535 778 545 778 550 771 C562 776 574 766 568 752 C560 738 554 718 552 690Z" fill="url(#eNose)"/>
    <path d="M542 694 C544 720 546 740 548 752" stroke="#f6cfae" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="528" cy="766" rx="7" ry="4" fill="#6e3a22"/><ellipse cx="552" cy="766" rx="7" ry="4" fill="#6e3a22"/>
    <!-- носогубные складки -->
    <path d="M510 760 Q486 790 496 826 M570 760 Q594 790 584 826" stroke="#a8683f" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".85"/>

    <!-- рты (переключаются из app.js) -->
    <g id="mouthIdle"><path d="M514 808 Q540 816 566 808" stroke="${E.lip}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M522 816 Q540 824 558 816" stroke="#c98a68" stroke-width="3" fill="none"/></g>
    <path id="mouthSmirk" d="M512 810 Q544 818 572 798" stroke="${E.lip}" stroke-width="6" fill="none" stroke-linecap="round" style="display:none"/>
    <path id="mouthFrown" d="M512 818 Q540 800 568 818" stroke="${E.lip}" stroke-width="6" fill="none" stroke-linecap="round" style="display:none"/>
    <path id="mouthHurt" d="M516 800 Q540 794 564 800 Q566 830 540 834 Q514 830 516 800Z" fill="${E.mouth}" style="display:none"/>
    <g id="mouthLaugh" style="display:none"><path d="M506 798 Q540 806 574 798 Q570 840 540 842 Q510 840 506 798Z" fill="${E.mouth}"/><path d="M510 800 Q540 808 570 800 L568 810 Q540 816 512 810Z" fill="#fff"/><ellipse cx="540" cy="832" rx="16" ry="6" fill="#c24d5a"/></g>
    <ellipse id="mouthYawn" cx="540" cy="818" rx="19" ry="28" fill="${E.mouth}" style="display:none"/>
    <ellipse id="mouthO" cx="540" cy="812" rx="12" ry="16" fill="${E.mouth}" style="display:none"/>
    <ellipse id="mouthTalk" cx="540" cy="808" rx="19" ry="10" fill="${E.mouth}" style="display:none"/>
    <g id="mouthGrit" style="display:none"><rect x="512" y="798" width="56" height="20" rx="6" fill="#fff" stroke="${E.lip}" stroke-width="4"/><path d="M526 798 V818 M540 798 V818 M554 798 V818 M512 808 H568" stroke="#9a9a9a" stroke-width="2"/></g>
    <path id="mouthWobble" d="M512 812 Q521 802 530 812 T548 812 T568 812" stroke="${E.lip}" stroke-width="6" fill="none" stroke-linecap="round" style="display:none"/>
    <g id="mouthDisgust" style="display:none"><ellipse cx="546" cy="824" rx="11" ry="13" fill="#e06a8a"/><path d="M510 812 Q521 800 532 810 T556 810 T572 804" stroke="${E.lip}" stroke-width="7" fill="none" stroke-linecap="round"/></g>

    <!-- седые усы поверх верхней губы -->
    <path d="M480 792 C488 768 514 760 540 767 C566 760 592 768 600 792 C592 802 578 804 566 797 C556 804 548 802 540 799 C532 802 524 804 514 797 C502 804 488 802 480 792Z" fill="url(#eMust)"/>
    <path d="M492 788 Q512 774 534 776 M546 776 Q568 774 588 788 M500 794 q10 -8 22 -8 M580 794 q-10 -8 -22 -8" stroke="#d8d6d1" stroke-width="2.5" fill="none" opacity=".8"/>
    <!-- подбородок -->
    <path d="M520 840 Q540 848 560 840" stroke="#b77b58" stroke-width="3.5" fill="none"/>

    <!-- цветные слои для реакций -->
    <path id="faceGreen" d="M540 540 C612 540 656 582 658 650 C660 704 650 748 628 788 C606 830 574 852 540 854 C506 852 474 830 452 788 C430 748 420 704 422 650 C424 582 468 540 540 540Z" fill="#7bbf3a" opacity=".35" style="display:none"/>
    <path id="faceRed" d="M540 540 C612 540 656 582 658 650 C660 704 650 748 628 788 C606 830 574 852 540 854 C506 852 474 830 452 788 C430 748 420 704 422 650 C424 582 468 540 540 540Z" fill="#e8352a" opacity=".22" style="display:none"/>
  </g>`;

// ---------- голова: Путин (прежняя версия) ----------
const putinHead = `
  <!-- голова: карикатура (залысины, узкое лицо, прищур, тонкие губы) -->
  <g id="head">
    <path d="M505 790 L575 790 L585 860 L495 860Z" fill="#e3b196"/>
    <path d="M412 690 Q395 650 415 640 Q432 650 432 700 Q430 740 418 740 Q405 730 412 690Z" fill="#e8b89c"/>
    <path d="M668 690 Q685 650 665 640 Q648 650 648 700 Q650 740 662 740 Q675 730 668 690Z" fill="#e8b89c"/>
    <path d="M540 545 Q650 545 655 650 Q660 740 620 800 Q585 845 540 848 Q495 845 460 800 Q420 740 425 650 Q430 545 540 545Z" fill="#f0c4a8"/>
    <!-- залысины: редкие светлые волосы по бокам и на макушке -->
    <path d="M430 660 Q425 585 470 565" stroke="#b8a488" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M650 660 Q655 585 610 565" stroke="#b8a488" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M500 560 Q540 548 580 560" stroke="#c8b59a" stroke-width="7" fill="none" opacity=".6"/>
    <path d="M505 572 Q540 562 575 572" stroke="#c8b59a" stroke-width="5" fill="none" opacity=".45"/>
    <!-- высокий лоб, морщины -->
    <path d="M495 600 Q540 592 585 600" stroke="#d9a88c" stroke-width="3" fill="none"/>
    <path d="M505 615 Q540 609 575 615" stroke="#d9a88c" stroke-width="3" fill="none"/>
    <!-- скулы -->
    <path d="M462 720 Q480 745 500 740 M618 720 Q600 745 580 740" stroke="#dfa98c" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g id="eyesOpen">
      <path d="M470 655 Q492 648 515 656 M565 656 Q588 648 610 655" stroke="#a8906f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M472 682 Q493 670 514 682 Q493 690 472 682Z" fill="#fff"/>
      <path d="M566 682 Q587 670 608 682 Q587 690 566 682Z" fill="#fff"/>
      <g id="pupils">
        <circle cx="493" cy="681" r="7" fill="#6a8fb0"/><circle cx="587" cy="681" r="7" fill="#6a8fb0"/>
        <circle cx="493" cy="681" r="3" fill="#1b1b1b"/><circle cx="587" cy="681" r="3" fill="#1b1b1b"/>
      </g>
      <path d="M470 678 Q493 666 516 678 M564 678 Q587 666 610 678" stroke="#c99478" stroke-width="5" fill="none"/>
      <path d="M476 694 Q493 700 510 694 M570 694 Q587 700 604 694" stroke="#dba589" stroke-width="3" fill="none"/>
    </g>
    <g id="eyesHurt" style="display:none" stroke="#2a2320" stroke-width="9" stroke-linecap="round">
      <path d="M478 670 L508 692 M508 670 L478 692"/><path d="M572 670 L602 692 M602 670 L572 692"/>
    </g>
    <!-- прямой нос -->
    <path d="M540 690 L532 755 Q540 766 552 758" stroke="#d29a7e" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M520 760 Q528 770 538 764 M560 760 Q552 770 542 764" stroke="#c98f73" stroke-width="4" fill="none"/>
    <!-- носогубки -->
    <path d="M505 770 Q495 795 505 815 M575 770 Q585 795 575 815" stroke="#dca78b" stroke-width="4" fill="none"/>
    <!-- тонкие губы, лёгкая ухмылка -->
    <path id="mouthIdle" d="M512 800 Q540 806 572 796" stroke="#b56a5c" stroke-width="7" fill="none" stroke-linecap="round"/>
    <ellipse id="mouthHurt" cx="540" cy="805" rx="22" ry="18" fill="#5a1a1a" style="display:none"/>

    <!-- мимика: все группы скрыты, app.js включает нужные (setFace) -->
    <path id="faceGreen" d="M540 545 Q650 545 655 650 Q660 740 620 800 Q585 845 540 848 Q495 845 460 800 Q420 740 425 650 Q430 545 540 545Z" fill="#7bbf3a" opacity=".35" style="display:none"/>
    <path id="faceRed" d="M540 545 Q650 545 655 650 Q660 740 620 800 Q585 845 540 848 Q495 845 460 800 Q420 740 425 650 Q430 545 540 545Z" fill="#e8352a" opacity=".22" style="display:none"/>
    <g id="eyesBlink" style="display:none">
      <path d="M470 655 Q492 650 515 657 M565 657 Q588 650 610 655" stroke="#a8906f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M472 682 Q493 688 514 682 M566 682 Q587 688 608 682" stroke="#3a2e28" stroke-width="6" fill="none" stroke-linecap="round"/>
    </g>
    <g id="eyesHappy" style="display:none" stroke="#3a2e28" stroke-width="7" fill="none" stroke-linecap="round">
      <path d="M470 655 Q492 646 515 654 M565 654 Q588 646 610 655" stroke="#a8906f"/>
      <path d="M474 688 Q493 670 512 688"/><path d="M568 688 Q587 670 606 688"/>
    </g>
    <g id="eyesWink" style="display:none">
      <path d="M470 655 Q492 648 515 656 M565 650 Q588 640 610 650" stroke="#a8906f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M472 684 Q493 690 514 680" stroke="#3a2e28" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M566 682 Q587 670 608 682 Q587 690 566 682Z" fill="#fff"/>
      <circle cx="587" cy="681" r="7" fill="#6a8fb0"/><circle cx="587" cy="681" r="3" fill="#1b1b1b"/>
    </g>
    <g id="eyesDown" style="display:none">
      <path d="M470 660 Q492 655 515 662 M565 662 Q588 655 610 660" stroke="#a8906f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M472 684 Q493 678 514 684 Q493 691 472 684Z" fill="#fff"/>
      <path d="M566 684 Q587 678 608 684 Q587 691 566 684Z" fill="#fff"/>
      <circle cx="493" cy="687" r="5" fill="#1b1b1b"/><circle cx="587" cy="687" r="5" fill="#1b1b1b"/>
      <path d="M470 681 Q493 674 516 681 M564 681 Q587 674 610 681" stroke="#c99478" stroke-width="6" fill="none"/>
    </g>
    <path id="mouthLaugh" d="M505 792 Q540 800 575 792 Q570 830 540 832 Q510 830 505 792Z" fill="#4a1414" stroke="#b56a5c" stroke-width="4" style="display:none"/>
    <ellipse id="mouthYawn" cx="540" cy="812" rx="20" ry="30" fill="#4a1414" style="display:none"/>
    <path id="mouthFrown" d="M512 810 Q540 796 570 810" stroke="#b56a5c" stroke-width="7" fill="none" stroke-linecap="round" style="display:none"/>
    <path id="mouthSmirk" d="M512 802 Q545 808 574 788" stroke="#b56a5c" stroke-width="7" fill="none" stroke-linecap="round" style="display:none"/>
    <g id="eyesWide" style="display:none">
      <path d="M468 638 Q492 622 516 636 M564 636 Q588 622 612 638" stroke="#a8906f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="493" cy="680" r="16" fill="#fff"/><circle cx="587" cy="680" r="16" fill="#fff"/>
      <circle cx="493" cy="680" r="6" fill="#1b1b1b"/><circle cx="587" cy="680" r="6" fill="#1b1b1b"/>
    </g>
    <g id="eyesUp" style="display:none">
      <path d="M468 640 Q492 626 516 638 M564 638 Q588 626 612 640" stroke="#a8906f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="493" cy="680" rx="15" ry="13" fill="#fff"/><ellipse cx="587" cy="680" rx="15" ry="13" fill="#fff"/>
      <circle cx="493" cy="672" r="7" fill="#6a8fb0"/><circle cx="587" cy="672" r="7" fill="#6a8fb0"/>
      <circle cx="493" cy="671" r="3" fill="#1b1b1b"/><circle cx="587" cy="671" r="3" fill="#1b1b1b"/>
    </g>
    <g id="eyesSquint" style="display:none" stroke="#3a2e28" stroke-width="8" fill="none" stroke-linecap="round">
      <path d="M472 672 L512 684 L472 694"/><path d="M608 672 L568 684 L608 694"/>
    </g>
    <g id="eyesDizzy" style="display:none" stroke="#2a2320" stroke-width="5" fill="none">
      <g class="spin"><path d="M493 681 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0"/></g>
      <g class="spin rev"><path d="M587 681 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0"/></g>
    </g>
    <g id="eyesCry" style="display:none">
      <path d="M470 678 Q493 694 516 678 M564 678 Q587 694 610 678" stroke="#3a2e28" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M470 650 L514 660 M610 650 L566 660" stroke="#a8906f" stroke-width="7" stroke-linecap="round"/>
      <g fill="#6cc3ff" opacity=".9">
        <path class="tear" d="M478 694 q-8 14 0 18 q8 -4 0 -18Z"/>
        <path class="tear t2" d="M602 694 q-8 14 0 18 q8 -4 0 -18Z"/>
        <path class="tear t3" d="M486 694 q-8 14 0 18 q8 -4 0 -18Z"/>
        <path class="tear t4" d="M594 694 q-8 14 0 18 q8 -4 0 -18Z"/>
      </g>
    </g>
    <g id="browsAngry" style="display:none" stroke="#8a7560" stroke-width="10" stroke-linecap="round">
      <path d="M466 646 L516 668"/><path d="M614 646 L564 668"/>
    </g>
    <ellipse id="mouthO" cx="540" cy="806" rx="13" ry="17" fill="#4a1414" style="display:none"/>
    <ellipse id="mouthTalk" cx="540" cy="803" rx="20" ry="9" fill="#4a1414" style="display:none"/>
    <g id="mouthGrit" style="display:none">
      <rect x="510" y="792" width="60" height="22" rx="6" fill="#fff" stroke="#8a3b30" stroke-width="4"/>
      <path d="M525 792 V814 M540 792 V814 M555 792 V814 M510 803 H570" stroke="#9a9a9a" stroke-width="2"/>
    </g>
    <path id="mouthWobble" d="M510 806 Q520 796 530 806 T550 806 T570 806" stroke="#b56a5c" stroke-width="7" fill="none" stroke-linecap="round" style="display:none"/>
    <g id="mouthDisgust" style="display:none">
      <ellipse cx="545" cy="818" rx="12" ry="14" fill="#e06a8a"/>
      <path d="M508 808 Q520 796 532 806 T556 806 T574 800" stroke="#8a3b30" stroke-width="8" fill="none" stroke-linecap="round"/>
    </g>
    <path d="M522 830 Q540 838 558 830" stroke="#e0ad92" stroke-width="4" fill="none"/>
  </g>`;

window.defaultCharacterSvg = (signText, model = 'erdogan') => model === 'putin'
  ? sceneSvg(signText, putinHead, { light: '#f5cdb2', dark: '#dca386', line: '#c48e70', hair: '#b9876c' })
  : sceneSvg(signText, erdoganHead, { light: '#ecb892', dark: '#c3845c', line: '#a8683f', hair: '#7a5038' });
