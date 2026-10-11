// Рисунки для игры «Давид против Вишапа» (всё векторное, без файлов).
/* eslint-disable max-len */
(function () {
  // Случайные числа с зерном, чтобы звёзды и трава не прыгали при перезагрузке
  function seeded(seed) {
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  // ---------- Сцена: сумерки, Арагац, церковь, утёс дракона, поле боя ----------
  function sceneSvg() {
    const r = seeded(7);
    let stars = '';
    for (let i = 0; i < 90; i++) {
      const x = r() * 1080, y = r() * 760, s = r() * 2.2 + .6;
      stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="#fff" opacity="${(.25 + r() * .6).toFixed(2)}" class="${i % 5 ? '' : 'twinkle'}" style="animation-delay:${(r() * 4).toFixed(1)}s"/>`;
    }
    let grass = '';
    for (let i = 0; i < 140; i++) {
      const x = r() * 1080, y = 1300 + r() * 600, h = 10 + r() * 22 * (y / 1500);
      grass += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(r() * 6 - 3).toFixed(1)} ${(-h).toFixed(0)} ${(r() * 10 - 5).toFixed(1)} ${(-h * 1.3).toFixed(0)}" stroke="${r() < .5 ? '#2f3a22' : '#3d4a26'}" stroke-width="${(2 + r() * 2).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    }
    let rocks = '';
    for (let i = 0; i < 18; i++) {
      const x = r() * 1080, y = 1330 + r() * 560, w = 20 + r() * 50 * (y / 1500), h = w * (.4 + r() * .3);
      rocks += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${w.toFixed(0)}" ry="${h.toFixed(0)}" fill="#2a2524"/><ellipse cx="${(x - w * .2).toFixed(0)}" cy="${(y - h * .35).toFixed(0)}" rx="${(w * .6).toFixed(0)}" ry="${(h * .4).toFixed(0)}" fill="#3e3633"/>`;
    }
    return `
<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#070716"/><stop offset=".28" stop-color="#1b1440"/>
    <stop offset=".46" stop-color="#4a2150"/><stop offset=".58" stop-color="#9a3b45"/>
    <stop offset=".66" stop-color="#e2703a"/><stop offset=".7" stop-color="#f3a046"/>
  </linearGradient>
  <radialGradient id="moonGlow"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7b0" stop-opacity="0"/></radialGradient>
  <radialGradient id="moon" cx=".4" cy=".4"><stop offset="0" stop-color="#fffaf0"/><stop offset=".7" stop-color="#f6e2b8"/><stop offset="1" stop-color="#d9b98a"/></radialGradient>
  <linearGradient id="farMt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4a78"/><stop offset="1" stop-color="#3a2a52"/></linearGradient>
  <linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4f0"/><stop offset="1" stop-color="#e8b8c0"/></linearGradient>
  <linearGradient id="midHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2038"/><stop offset="1" stop-color="#1a1424"/></linearGradient>
  <linearGradient id="crag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a3a3a"/><stop offset=".5" stop-color="#2a2022"/><stop offset="1" stop-color="#140f12"/></linearGradient>
  <linearGradient id="cragRim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9a4a" stop-opacity=".0"/><stop offset=".4" stop-color="#ff9a4a" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2e26"/><stop offset=".25" stop-color="#2a221c"/><stop offset="1" stop-color="#0d0a08"/></linearGradient>
  <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3a046" stop-opacity="0"/><stop offset=".5" stop-color="#f6b070" stop-opacity=".35"/><stop offset="1" stop-color="#f3a046" stop-opacity="0"/></linearGradient>
  <radialGradient id="lava"><stop offset="0" stop-color="var(--glow, #ff7a1a)" stop-opacity=".9"/><stop offset="1" stop-color="var(--glow, #ff7a1a)" stop-opacity="0"/></radialGradient>
  <radialGradient id="window"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff9a3a" stop-opacity=".6"/></radialGradient>
  <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".15" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
</defs>
<rect width="1080" height="1920" fill="url(#sky)"/>
<g>${stars}</g>
<circle cx="830" cy="470" r="260" fill="url(#moonGlow)"/>
<circle cx="830" cy="470" r="105" fill="url(#moon)"/>
<g fill="#c9a77a" opacity=".35"><circle cx="800" cy="440" r="18"/><circle cx="858" cy="500" r="12"/><circle cx="845" cy="430" r="7"/><circle cx="790" cy="505" r="9"/></g>

<g class="clouds" opacity=".55">
  <g class="cloud c1"><ellipse cx="200" cy="610" rx="170" ry="26" fill="#6a3a5a"/><ellipse cx="260" cy="596" rx="90" ry="22" fill="#7a4462"/></g>
  <g class="cloud c2"><ellipse cx="760" cy="700" rx="200" ry="24" fill="#8a4a52"/><ellipse cx="700" cy="688" rx="100" ry="20" fill="#9a5258"/></g>
  <g class="cloud c3"><ellipse cx="420" cy="380" rx="150" ry="18" fill="#3a2a52"/></g>
</g>

<!-- Арагац: четыре вершины в снегу -->
<path d="M-20 1120 L120 1000 L190 1030 L300 905 L380 960 L450 880 L520 940 L610 870 L700 950 L780 920 L880 1000 L980 960 L1100 1040 L1100 1250 L-20 1250 Z" fill="url(#farMt)"/>
<path d="M300 905 L262 948 L285 944 L300 960 L318 940 L340 950 Z M450 880 L415 920 L438 915 L452 930 L470 912 L488 918 Z M610 870 L570 912 L596 906 L612 924 L630 905 L652 912 Z M780 920 L752 948 L772 944 L785 956 L800 942 L815 946 Z" fill="url(#snow)" opacity=".92"/>
<rect x="0" y="1080" width="1080" height="160" fill="url(#fog)"/>

<!-- Холм с армянской церковью -->
<path d="M-20 1250 L-20 1150 C 60 1120, 160 1110, 260 1150 C 330 1180, 380 1200, 420 1250 Z" fill="url(#midHill)"/>
<g transform="translate(70 1020)" fill="#140f1a">
  <rect x="20" y="90" width="120" height="58"/>
  <path d="M10 92 L80 62 L150 92 Z"/>
  <rect x="55" y="34" width="50" height="34"/>
  <path d="M50 36 L80 0 L110 36 Z"/>
  <rect x="78" y="-14" width="4" height="16"/><rect x="73" y="-9" width="14" height="4"/>
  <rect x="73" y="44" width="5" height="14" rx="2.5" fill="url(#window)"/><rect x="83" y="44" width="5" height="14" rx="2.5" fill="url(#window)"/>
  <rect x="40" y="108" width="8" height="20" rx="4" fill="url(#window)"/><rect x="112" y="108" width="8" height="20" rx="4" fill="url(#window)"/>
  <path d="M72 148 L72 124 Q80 114 88 124 L88 148 Z" fill="#ffb24a" opacity=".85"/>
</g>

<!-- Утёс Вишапа -->
<path d="M330 1300 C 360 1250, 400 1210, 440 1196 C 500 1176, 560 1168, 640 1166 C 720 1164, 800 1168, 880 1176 C 960 1186, 1040 1196, 1100 1210 L1100 1340 L330 1340 Z" fill="url(#crag)"/>
<path d="M440 1196 C 500 1176, 560 1168, 640 1166 C 720 1164, 800 1168, 880 1176" stroke="url(#cragRim)" stroke-width="5" fill="none"/>
<g class="lavaCracks" stroke="var(--glow, #ff7a1a)" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85">
  <path d="M560 1190 l20 30 l-12 26 l18 34"/><path d="M760 1185 l-14 28 l16 24 l-8 40"/><path d="M930 1200 l12 34 l-16 30"/>
</g>
<ellipse cx="580" cy="1240" rx="60" ry="30" fill="url(#lava)" opacity=".5"/><ellipse cx="770" cy="1236" rx="50" ry="26" fill="url(#lava)" opacity=".45"/>

<!-- Поле боя -->
<path d="M-20 1250 C 200 1230, 340 1270, 460 1300 C 640 1340, 860 1310, 1100 1290 L1100 1920 L-20 1920 Z" fill="url(#ground)"/>
<g opacity=".9">${rocks}</g>
<g>${grass}</g>

<!-- Хачкар -->
<g transform="translate(36 1380)">
  <path d="M0 150 L0 18 Q0 0 18 0 L74 0 Q92 0 92 18 L92 150 Z" fill="#6b5446"/>
  <path d="M0 150 L0 18 Q0 0 18 0 L74 0 Q92 0 92 18 L92 150 Z" fill="none" stroke="#3e2e26" stroke-width="4"/>
  <g fill="#4a382e"><rect x="40" y="20" width="12" height="96"/><rect x="18" y="44" width="56" height="12"/>
    <circle cx="46" cy="16" r="9"/><circle cx="14" cy="50" r="9"/><circle cx="78" cy="50" r="9"/><circle cx="46" cy="122" r="12"/></g>
  <path d="M8 140 h76" stroke="#3e2e26" stroke-width="3"/>
  <rect x="-10" y="148" width="112" height="16" rx="4" fill="#4e3e34"/>
</g>

<!-- Флаги армии -->
<g class="flag f1" transform="translate(960 1290)"><rect x="0" y="0" width="6" height="170" fill="#5a4030"/><g class="cloth"><rect x="6" y="4" width="84" height="18" fill="#d90012"/><rect x="6" y="22" width="84" height="18" fill="#0033a0"/><rect x="6" y="40" width="84" height="18" fill="#f2a800"/></g></g>
<g class="flag f2" transform="translate(150 1300)"><rect x="0" y="0" width="6" height="150" fill="#5a4030"/><g class="cloth"><rect x="6" y="4" width="70" height="15" fill="#d90012"/><rect x="6" y="19" width="70" height="15" fill="#0033a0"/><rect x="6" y="34" width="70" height="15" fill="#f2a800"/></g></g>

<rect width="1080" height="1920" fill="url(#vignette)"/>
</svg>`;
  }

  // ---------- Вишап ----------
  // Координаты в своей системе 1000×1000. Группы с id двигает game.js (голова, челюсть, крылья, хвост).
  function dragonSvg() {
    const spikes = (pts, size = 1) => pts.map(([x, y, a]) => {
      const s = 26 * size;
      return `<path d="M${-s * .5} 0 L0 ${-s * 1.5} L${s * .5} 0 Z" transform="translate(${x} ${y}) rotate(${a})"/>`;
    }).join('');
    const teethTop = [];
    for (let x = 130; x <= 330; x += 22) teethTop.push(`<path d="M${x} 344 l7 ${x < 200 ? 18 : 13} l7 ${x < 200 ? -18 : -13} Z"/>`);
    const teethBot = [];
    for (let x = 140; x <= 320; x += 24) teethBot.push(`<path d="M${x} 356 l7 ${x < 200 ? -15 : -11} l7 ${x < 200 ? 15 : 11} Z"/>`);
    const belly = [];
    for (let i = 0; i < 9; i++) belly.push(`<path d="M${478 + i * 4} ${606 + i * 26} q${50 + i * 9} ${14 + i} ${96 + i * 14} ${-4 + i * 2}" />`);
    const neckPlates = [];
    for (let i = 0; i < 7; i++) {
      const t = i / 6, x = 318 + t * 150, y = 375 + t * 215;
      neckPlates.push(`<path d="M${x - 6} ${y} q${24} ${-12} ${40} ${-30}"/>`);
    }
    return `
<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" overflow="visible">
<defs>
  <linearGradient id="dgBody" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" style="stop-color:var(--sc2)"/><stop offset="1" style="stop-color:var(--sc1)"/></linearGradient>
  <radialGradient id="dgShade" cx=".32" cy=".28" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
  <linearGradient id="dgBelly" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--bl1)"/><stop offset="1" style="stop-color:var(--bl2)"/></linearGradient>
  <linearGradient id="dgWing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--wg2)"/><stop offset="1" style="stop-color:var(--wg1)"/></linearGradient>
  <linearGradient id="dgWingFar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--wg1)"/><stop offset="1" stop-color="#000"/></linearGradient>
  <linearGradient id="dgHorn" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6e604a"/><stop offset=".6" stop-color="#d8cbaa"/><stop offset="1" stop-color="#fff6de"/></linearGradient>
  <radialGradient id="dgEye" cx=".45" cy=".45"><stop offset="0" stop-color="#fff"/><stop offset=".3" style="stop-color:var(--eye)"/><stop offset="1" style="stop-color:var(--glow)"/></radialGradient>
  <radialGradient id="dgEyeGlow"><stop offset="0" style="stop-color:var(--eye)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--glow)" stop-opacity="0"/></radialGradient>
  <radialGradient id="dgMouth" cx=".35" cy=".5"><stop offset="0" stop-color="#fff2a0"/><stop offset=".35" style="stop-color:var(--glow)"/><stop offset="1" stop-color="#3a0606"/></radialGradient>
  <pattern id="dgScales" width="28" height="22" patternUnits="userSpaceOnUse">
    <path d="M0 11 Q14 26 28 11 M-14 0 Q0 15 14 0 M14 0 Q28 15 42 0 M-14 22 Q0 37 14 22 M14 22 Q28 37 42 22" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2"/>
    <path d="M4 13 Q14 21 24 13" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/>
  </pattern>
</defs>
<g id="dAll">
  <!-- дальнее крыло -->
  <g id="dWingFar">
    <path d="M590 470 L545 270 L600 70 L505 30 Q505 110 440 140 Q475 205 410 250 Q460 310 425 370 Q505 390 530 470 Z" fill="url(#dgWingFar)" stroke="#120808" stroke-width="5" stroke-linejoin="round"/>
    <path d="M590 470 L545 270 L600 70 M545 270 L505 30 M545 270 L440 140 M545 270 L410 250 M545 270 L425 370" stroke="#1a0e0e" stroke-width="9" fill="none" stroke-linecap="round" opacity=".8"/>
  </g>
  <!-- хвост -->
  <g id="dTail">
    <path d="M800 640 C 900 680, 965 770, 955 860 C 945 940, 850 968, 740 962 C 680 958, 630 950, 590 940 L585 962 C 640 984, 720 994, 790 990 C 905 982, 1000 925, 992 828 C 985 735, 920 655, 830 600 Z" fill="url(#dgBody)" stroke="#0b1208" stroke-width="5"/>
    <path d="M800 640 C 900 680, 965 770, 955 860 C 945 940, 850 968, 740 962 C 680 958, 630 950, 590 940 L585 962 C 640 984, 720 994, 790 990 C 905 982, 1000 925, 992 828 C 985 735, 920 655, 830 600 Z" fill="url(#dgScales)"/>
    <path d="M598 950 L520 918 L548 952 L512 990 Z" fill="var(--sc1)" stroke="#0b1208" stroke-width="5" stroke-linejoin="round"/>
    <g fill="var(--spike)" stroke="#0b1208" stroke-width="3">${spikes([[880, 668, 40], [945, 740, 62], [975, 820, 85], [970, 900, 120], [915, 958, 150], [840, 980, 172], [760, 984, 180], [680, 976, 186]], .8)}</g>
  </g>
  <!-- дальняя задняя лапа -->
  <path d="M800 760 C 830 820, 850 860, 860 900 L900 905 C 890 860, 880 800, 850 740 Z" fill="var(--sc1)" stroke="#0b1208" stroke-width="5"/>
  <!-- спина: шипы -->
  <g fill="var(--spike)" stroke="#0b1208" stroke-width="3">${spikes([[640, 458, -8], [700, 462, 8], [760, 488, 22], [812, 530, 38], [850, 585, 55]], 1.1)}</g>
  <!-- туловище -->
  <g id="dBody">
    <path id="dTorso" d="M470 560 C 470 480, 560 440, 660 456 C 780 476, 860 556, 862 660 C 864 765, 785 828, 680 836 C 588 842, 500 800, 470 722 C 455 672, 455 612, 470 560 Z" fill="url(#dgBody)" stroke="#0b1208" stroke-width="6"/>
    <path d="M470 560 C 470 480, 560 440, 660 456 C 780 476, 860 556, 862 660 C 864 765, 785 828, 680 836 C 588 842, 500 800, 470 722 C 455 672, 455 612, 470 560 Z" fill="url(#dgScales)"/>
    <path d="M478 590 C 466 660, 488 750, 560 806 C 600 830, 660 838, 712 826 C 640 800, 570 740, 540 660 C 528 620, 520 590, 512 566 Z" fill="url(#dgBelly)" stroke="#3a2a10" stroke-width="4"/>
    <g stroke="#6a4a1a" stroke-width="4" fill="none" opacity=".7">${belly.join('')}</g>
    <path d="M470 560 C 470 480, 560 440, 660 456 C 780 476, 860 556, 862 660 C 864 765, 785 828, 680 836 C 588 842, 500 800, 470 722 C 455 672, 455 612, 470 560 Z" fill="url(#dgShade)"/>
    <g id="dWoundsBody" class="wounds" stroke="#4a0606" stroke-width="7" fill="none" stroke-linecap="round" opacity="0">
      <path d="M640 560 l60 70 M665 548 l60 70 M690 540 l56 66"/><path d="M760 680 l-40 50 M784 690 l-40 50" stroke="#7a0a0a"/>
    </g>
  </g>
  <!-- задняя лапа -->
  <g id="dLegHind">
    <path d="M690 700 C 668 780, 712 836, 742 862 L722 906 L828 906 C 826 872, 816 832, 834 782 C 864 718, 834 640, 760 642 C 726 646, 704 664, 690 700 Z" fill="url(#dgBody)" stroke="#0b1208" stroke-width="6"/>
    <path d="M690 700 C 668 780, 712 836, 742 862 L722 906 L828 906 C 826 872, 816 832, 834 782 C 864 718, 834 640, 760 642 C 726 646, 704 664, 690 700 Z" fill="url(#dgShade)"/>
    <g fill="#f2ead2" stroke="#2a2016" stroke-width="3"><path d="M720 906 q-18 4 -26 18 q16 -4 30 -6 Z"/><path d="M760 908 q-10 8 -12 22 q12 -8 24 -10 Z"/><path d="M800 908 q-4 10 -2 22 q10 -10 20 -12 Z"/></g>
  </g>
  <!-- шея и голова -->
  <g id="dNeckHead">
    <path id="dNeck" d="M300 362 C 330 430, 400 512, 480 616 L604 506 C 545 420, 460 330, 372 284 Z" fill="url(#dgBody)" stroke="#0b1208" stroke-width="6" stroke-linejoin="round"/>
    <path d="M300 362 C 330 430, 400 512, 480 616 L604 506 C 545 420, 460 330, 372 284 Z" fill="url(#dgScales)"/>
    <path d="M300 362 C 330 430, 400 512, 480 616 L520 584 C 450 500, 380 420, 350 352 Z" fill="url(#dgBelly)" stroke="#3a2a10" stroke-width="3"/>
    <g stroke="#6a4a1a" stroke-width="3.5" fill="none" opacity=".7">${neckPlates.join('')}</g>
    <g fill="var(--spike)" stroke="#0b1208" stroke-width="3">${spikes([[410, 300, -40], [462, 338, -30], [512, 384, -22], [560, 438, -14]], 1)}</g>
    <g id="dWoundsNeck" class="wounds" stroke="#4a0606" stroke-width="6" fill="none" stroke-linecap="round" opacity="0"><path d="M420 400 l50 40 M432 384 l50 40"/></g>
    <g id="dHead">
      <!-- рога -->
      <path d="M350 262 C 382 210, 440 172, 512 160 C 460 192, 412 232, 386 290 Z" fill="url(#dgHorn)" stroke="#2a2016" stroke-width="4"/>
      <path d="M322 252 C 340 205, 380 170, 430 150 C 395 185, 370 222, 360 268 Z" fill="url(#dgHorn)" stroke="#2a2016" stroke-width="4" opacity=".85"/>
      <g id="dMouth" opacity="0"><path d="M120 340 L360 340 L362 392 C 290 405, 200 400, 128 384 Z" fill="url(#dgMouth)"/></g>
      <!-- нижняя челюсть -->
      <g id="dJaw">
        <g fill="#f6f0dc" stroke="#3a3020" stroke-width="2">${teethBot.join('')}</g>
        <path d="M362 342 C 300 352, 230 354, 132 352 C 112 354, 110 372, 128 378 C 200 392, 285 398, 345 384 C 372 376, 380 352, 362 342 Z" fill="url(#dgBody)" stroke="#0b1208" stroke-width="5"/>
        <path d="M150 374 C 220 386, 290 390, 340 378" stroke="url(#dgBelly)" stroke-width="10" fill="none" opacity=".8"/>
        <g fill="var(--spike)" stroke="#0b1208" stroke-width="2.5">${spikes([[220, 390, 170], [270, 393, 175], [320, 386, 185]], .55)}</g>
        <circle id="mJaw" cx="140" cy="372" r="1" fill="none"/>
      </g>
      <!-- верхняя часть головы -->
      <path id="dSkull" d="M392 272 C 352 226, 280 222, 232 248 C 200 264, 160 284, 118 300 C 92 309, 86 330, 100 344 L212 346 C 262 346, 322 352, 364 342 C 400 332, 412 298, 392 272 Z" fill="url(#dgBody)" stroke="#0b1208" stroke-width="6" stroke-linejoin="round"/>
      <path d="M392 272 C 352 226, 280 222, 232 248 C 200 264, 160 284, 118 300 C 92 309, 86 330, 100 344 L212 346 C 262 346, 322 352, 364 342 C 400 332, 412 298, 392 272 Z" fill="url(#dgScales)"/>
      <path d="M392 272 C 352 226, 280 222, 232 248 C 200 264, 160 284, 118 300 C 92 309, 86 330, 100 344 L212 346 C 262 346, 322 352, 364 342 C 400 332, 412 298, 392 272 Z" fill="url(#dgShade)"/>
      <g fill="#f6f0dc" stroke="#3a3020" stroke-width="2">${teethTop.join('')}</g>
      <!-- щёки-шипы -->
      <g fill="var(--spike)" stroke="#0b1208" stroke-width="3">${spikes([[384, 320, 70], [376, 346, 95], [358, 300, 40]], .8)}</g>
      <!-- ноздри и дым -->
      <ellipse cx="114" cy="316" rx="9" ry="5" fill="#0b0606" transform="rotate(-20 114 316)"/>
      <ellipse cx="138" cy="306" rx="6" ry="3.5" fill="#0b0606" transform="rotate(-20 138 306)"/>
      <circle id="mNose" cx="108" cy="312" r="1" fill="none"/>
      <!-- глаз -->
      <ellipse cx="262" cy="282" rx="44" ry="30" fill="url(#dgEyeGlow)" class="eyeGlow"/>
      <g id="dEye">
        <ellipse cx="262" cy="282" rx="21" ry="13" fill="url(#dgEye)" stroke="#1a0a04" stroke-width="3" transform="rotate(-12 262 282)"/>
        <ellipse id="dPupil" cx="266" cy="282" rx="3.6" ry="11" fill="#0a0404" transform="rotate(-12 262 282)"/>
        <g id="dLid" style="transform-box:fill-box;transform-origin:center top"><ellipse cx="262" cy="282" rx="23" ry="15" fill="var(--sc1)" stroke="#0b1208" stroke-width="3" transform="rotate(-12 262 282)"/></g>
        <g id="dEyeX" opacity="0" stroke="#1a0a04" stroke-width="6" stroke-linecap="round"><path d="M248 270 l26 24 M274 270 l-26 24"/></g>
      </g>
      <!-- бровь -->
      <path id="dBrow" d="M222 270 C 244 250, 284 246, 312 260 L306 272 C 280 262, 252 264, 228 280 Z" fill="#0d140a" stroke="#0b1208" stroke-width="2"/>
      <g id="dWoundsHead" class="wounds" stroke="#4a0606" stroke-width="5" fill="none" stroke-linecap="round" opacity="0"><path d="M300 236 l30 40 M314 232 l30 40"/></g>
      <circle id="mMouth" cx="118" cy="352" r="1" fill="none"/>
      <circle id="mHead" cx="270" cy="300" r="1" fill="none"/>
    </g>
  </g>
  <!-- передняя лапа -->
  <g id="dLegFront">
    <path d="M498 640 C 452 680, 448 760, 478 820 C 484 850, 470 880, 440 900 L522 906 C 532 870, 544 830, 548 790 C 560 730, 572 690, 560 650 Z" fill="url(#dgBody)" stroke="#0b1208" stroke-width="6"/>
    <path d="M498 640 C 452 680, 448 760, 478 820 C 484 850, 470 880, 440 900 L522 906 C 532 870, 544 830, 548 790 C 560 730, 572 690, 560 650 Z" fill="url(#dgShade)"/>
    <g fill="#f2ead2" stroke="#2a2016" stroke-width="3"><path d="M444 902 q-20 2 -28 16 q16 -2 32 -4 Z"/><path d="M478 906 q-12 8 -14 22 q12 -8 26 -10 Z"/><path d="M512 906 q-4 10 -2 22 q10 -10 20 -12 Z"/></g>
  </g>
  <!-- ближнее крыло -->
  <g id="dWingNear">
    <path d="M640 470 L760 240 L880 110 L985 66 Q958 148 992 212 Q938 262 966 332 Q898 360 904 424 Q828 440 776 520 Z" fill="url(#dgWing)" stroke="#120808" stroke-width="6" stroke-linejoin="round"/>
    <path d="M640 470 L760 240 L880 110 L985 66 Q958 148 992 212 Q938 262 966 332 Q898 360 904 424 Q828 440 776 520 Z" fill="url(#dgShade)" opacity=".6"/>
    <path d="M640 470 L760 240 L880 110 M880 110 L985 66 M880 110 L992 212 M880 110 L966 332 M880 110 L904 424" stroke="#2a1010" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M640 470 L760 240 L880 110" stroke="var(--sc1)" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M876 112 l-8 -34 l22 26 Z" fill="#f2ead2" stroke="#2a2016" stroke-width="3"/>
    <g id="dWoundsWing" class="wounds" opacity="0" fill="#0b0606"><circle cx="930" cy="260" r="16"/><circle cx="860" cy="360" r="11"/><circle cx="820" cy="300" r="8"/></g>
  </g>
  <circle id="mChest" cx="540" cy="660" r="1" fill="none"/>
  <circle id="mBody" cx="700" cy="620" r="1" fill="none"/>
  <circle id="mWing" cx="860" cy="260" r="1" fill="none"/>
  <circle id="mNeck" cx="440" cy="460" r="1" fill="none"/>
</g>
</svg>`;
  }

  // ---------- Воин (тело; голова — аватарка зрителя, её рисует game.js) ----------
  const WARRIOR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" width="100" height="130">
  <path d="M30 40 C 18 70, 14 100, 10 124 L50 118 L90 124 C 86 100, 82 70, 70 40 Z" fill="#8a1a1a" stroke="#3a0a0a" stroke-width="3"/>
  <path d="M34 42 L66 42 L70 92 L30 92 Z" fill="#b08a4a" stroke="#4a3418" stroke-width="3"/>
  <path d="M36 52 h28 M35 62 h30 M34 72 h32 M33 82 h34" stroke="#6e5428" stroke-width="2.5"/>
  <rect x="30" y="88" width="40" height="8" fill="#4a3418"/>
  <rect x="36" y="96" width="11" height="26" fill="#3a2a1a"/><rect x="53" y="96" width="11" height="26" fill="#3a2a1a"/>
  <rect x="33" y="118" width="16" height="8" rx="3" fill="#1e140c"/><rect x="51" y="118" width="16" height="8" rx="3" fill="#1e140c"/>
  <path d="M84 6 L84 112" stroke="#6a4a2a" stroke-width="5" stroke-linecap="round"/>
  <path d="M84 0 L90 16 L78 16 Z" fill="#d8dce4" stroke="#5a5e66" stroke-width="2"/>
  <path d="M66 46 Q80 50 84 60" stroke="#b08a4a" stroke-width="9" fill="none" stroke-linecap="round"/>
  <circle cx="22" cy="68" r="21" fill="#7a1010" stroke="#c9a04a" stroke-width="4"/>
  <g transform="translate(22 68)" stroke="#f2c14a" stroke-width="3" fill="none" stroke-linecap="round">
    <path d="M0 0 C 6 -4, 8 -10, 4 -14"/><path d="M0 0 C 4 6, 10 8, 14 4"/><path d="M0 0 C -6 4, -8 10, -4 14"/><path d="M0 0 C -4 -6, -10 -8, -14 -4"/>
    <path d="M0 0 C 7 0, 11 -5, 10 -10" opacity=".7"/><path d="M0 0 C 0 7, 5 11, 10 10" opacity=".7"/><path d="M0 0 C -7 0, -11 5, -10 10" opacity=".7"/><path d="M0 0 C 0 -7, -5 -11, -10 -10" opacity=".7"/>
  </g>
</svg>`;

  // ---------- Всадник ----------
  function riderSvg({ hero = false } = {}) {
    const cape = hero ? '#d4a017' : '#8a1a1a';
    const armor = hero ? '#e8c35a' : '#9aa0aa';
    const horse = hero ? '#f4efe6' : '#5a3a22';
    const horseDark = hero ? '#c9bfae' : '#3a2414';
    const mane = hero ? '#f2d27a' : '#1e120a';
    const weapon = hero
      ? `<g transform="translate(212 40) rotate(-35)"><rect x="-6" y="-6" width="12" height="26" rx="3" fill="#6a4a1a"/><rect x="-18" y="-10" width="36" height="8" rx="3" fill="#e8c35a"/><path d="M-7 -10 L0 -150 L7 -10 Z" fill="#eaf6ff" stroke="#8ad8ff" stroke-width="3"/><path d="M0 -20 L-4 -60 L4 -80 L-3 -110 L2 -140" stroke="#5ab8ff" stroke-width="3" fill="none"/></g>`
      : `<path d="M150 112 L330 52" stroke="#6a4a2a" stroke-width="7" stroke-linecap="round"/><path d="M326 44 L352 44 L330 62 Z" fill="#d8dce4" stroke="#5a5e66" stroke-width="2"/><path d="M300 60 l10 -12 l6 16 z" fill="#d90012"/>`;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" width="360" height="260">
  ${hero ? '<ellipse cx="170" cy="140" rx="170" ry="120" fill="#ffe08a" opacity=".25"/>' : ''}
  <g class="legs" fill="${horseDark}" stroke="#1a0e06" stroke-width="3">
    <path d="M100 168 L76 230 L92 234 L116 176 Z"/><path d="M128 172 L132 240 L146 240 L144 172 Z"/>
    <path d="M222 166 L248 226 L262 220 L240 164 Z"/><path d="M200 170 L196 240 L210 242 L216 170 Z"/>
  </g>
  <path d="M80 118 C 60 108, 30 120, 18 150 C 34 140, 50 138, 62 142 C 50 156, 44 172, 46 188 C 60 166, 72 152, 92 146 Z" fill="${mane}" stroke="#1a0e06" stroke-width="3"/>
  <path d="M80 110 C 110 92, 200 92, 236 104 C 262 112, 268 150, 252 172 C 220 186, 120 190, 92 176 C 70 162, 66 126, 80 110 Z" fill="${horse}" stroke="#1a0e06" stroke-width="4"/>
  <path d="M236 108 C 254 84, 268 56, 276 34 C 290 30, 316 46, 330 64 C 334 74, 326 80, 316 78 L298 74 C 292 92, 276 116, 258 132 Z" fill="${horse}" stroke="#1a0e06" stroke-width="4"/>
  <path d="M262 36 C 250 54, 242 80, 232 104 L248 106 C 256 84, 264 62, 276 44 Z" fill="${mane}"/>
  <circle cx="300" cy="52" r="4" fill="#120a04"/>
  <path d="M276 34 L282 18 L290 36 Z" fill="${horse}" stroke="#1a0e06" stroke-width="3"/>
  <path d="M150 100 C 150 92, 190 92, 196 100 L192 120 L154 120 Z" fill="#7a1010" stroke="#3a0a0a" stroke-width="3"/>
  <path d="M146 92 C 110 80, 90 64, 70 40 C 110 52, 140 58, 160 66 Z" fill="${cape}" stroke="#3a0a0a" stroke-width="3" class="cape"/>
  <path d="M154 102 C 150 76, 160 50, 176 44 C 192 50, 200 76, 194 102 Z" fill="${armor}" stroke="#2a2a30" stroke-width="3"/>
  <path d="M168 102 L160 140 L174 142 L180 104 Z" fill="#3a2a1a"/>
  <path d="M190 58 Q206 54 212 40" stroke="${armor}" stroke-width="12" fill="none" stroke-linecap="round"/>
  ${weapon}
  <circle cx="176" cy="30" r="20" fill="#e8b890" stroke="#3a2010" stroke-width="3"/>
  <path d="M154 28 C 154 6, 198 6, 198 28 L198 22 L176 14 L154 22 Z" fill="${hero ? '#e8c35a' : '#8a8f99'}" stroke="#2a2a30" stroke-width="3"/>
  <path d="M176 6 L176 -6" stroke="${hero ? '#d90012' : '#7a1010'}" stroke-width="6" stroke-linecap="round"/>
  ${hero ? '<path d="M160 40 C 168 54, 184 54, 192 40 C 186 46, 166 46, 160 40 Z" fill="#3a2010"/>' : ''}
</svg>`;
  }

  const CROWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><path d="M8 70 L4 18 L32 42 L60 6 L88 42 L116 18 L112 70 Z" fill="#f6c84a" stroke="#8a5a10" stroke-width="5" stroke-linejoin="round"/><circle cx="60" cy="48" r="8" fill="#d90012"/><circle cx="30" cy="56" r="6" fill="#0033a0"/><circle cx="90" cy="56" r="6" fill="#0033a0"/><rect x="8" y="64" width="104" height="10" fill="#e0a830" stroke="#8a5a10" stroke-width="4"/></svg>`;

  // Цвета дракона по уровням: каждый новый — другой и страшнее
  const THEMES = [
    { name: 'Изумрудный', sc1: '#173f24', sc2: '#3f9a52', bl1: '#f0d488', bl2: '#a87a32', wg1: '#3a1010', wg2: '#b4473a', eye: '#ffe14a', glow: '#ff7a1a', spike: '#e8dcbc' },
    { name: 'Огненный', sc1: '#4a0e0e', sc2: '#c43a26', bl1: '#ffd27a', bl2: '#b8682a', wg1: '#1e1030', wg2: '#7a3a9a', eye: '#fff07a', glow: '#ff5a0a', spike: '#2a1a14' },
    { name: 'Теневой', sc1: '#1e1036', sc2: '#6c3fa8', bl1: '#d8b8f0', bl2: '#7a58a0', wg1: '#0a1022', wg2: '#3a5a9a', eye: '#8affea', glow: '#9a5cff', spike: '#c8c0e8' },
    { name: 'Ледяной', sc1: '#14304e', sc2: '#5aaedc', bl1: '#f0f8ff', bl2: '#8ab8d8', wg1: '#0e1e3a', wg2: '#4a8ac8', eye: '#e0fcff', glow: '#4ad8ff', spike: '#eaf6ff' },
    { name: 'Чёрный', sc1: '#0c0c0e', sc2: '#3a3a40', bl1: '#f2c45a', bl2: '#9a6a1a', wg1: '#2a0606', wg2: '#9a1a1a', eye: '#ff4a2a', glow: '#ff2a0a', spike: '#d4a640' },
  ];

  window.DragonArt = { sceneSvg, dragonSvg, WARRIOR_SVG, riderSvg, CROWN_SVG, THEMES };
})();
