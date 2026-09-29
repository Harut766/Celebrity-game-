// Персонаж по умолчанию: карикатура на политика в костюме, сидит в деревенском туалете с газетой.
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

  <!-- брюки костюма, туфли -->
  <rect x="400" y="1250" width="130" height="160" rx="26" fill="#23262e"/>
  <rect x="550" y="1250" width="130" height="160" rx="26" fill="#23262e"/>
  <rect x="425" y="1390" width="75" height="165" rx="20" fill="#1c1f26"/>
  <rect x="580" y="1390" width="75" height="165" rx="20" fill="#1c1f26"/>
  <ellipse cx="455" cy="1570" rx="62" ry="24" fill="#0f0f12"/><ellipse cx="625" cy="1570" rx="62" ry="24" fill="#0f0f12"/>
  <ellipse cx="440" cy="1562" rx="20" ry="6" fill="#4a4a55"/><ellipse cx="610" cy="1562" rx="20" ry="6" fill="#4a4a55"/>

  <!-- пиджак, рубашка, галстук -->
  <path d="M410 870 Q540 830 670 870 L700 1275 H380Z" fill="#2b2f3a"/>
  <path d="M495 850 L540 990 L585 850 Q540 840 495 850Z" fill="#f4f4f6"/>
  <path d="M528 870 L552 870 L560 900 L548 1010 L540 1025 L532 1010 L520 900Z" fill="#7a1f2b"/>
  <path d="M528 870 L552 870 L547 895 L533 895Z" fill="#5e1520"/>
  <path d="M495 850 L470 870 L520 1000 Z M585 850 L610 870 L560 1000 Z" fill="#20232c"/>
  <circle cx="620" cy="945" r="7" fill="#c9a24a"/>

  <!-- газета и руки -->
  <g transform="rotate(-6 540 1130)">
    <rect x="330" y="1030" width="420" height="230" fill="#efe8d6" stroke="#b9ad90" stroke-width="4"/>
    <line x1="540" y1="1030" x2="540" y2="1260" stroke="#b9ad90" stroke-width="4"/>
    <g fill="#8e8672">
      ${[1060,1090,1120,1150,1180,1210].map(y => `<rect x="355" y="${y}" width="160" height="10"/><rect x="565" y="${y}" width="160" height="10"/>`).join('')}
    </g>
    <rect x="365" y="1040" width="120" height="14" fill="#333"/>
  </g>
  <path d="M420 885 Q345 985 335 1100" stroke="#2b2f3a" stroke-width="78" fill="none" stroke-linecap="round"/>
  <path d="M660 885 Q735 965 745 1070" stroke="#2b2f3a" stroke-width="78" fill="none" stroke-linecap="round"/>
  <rect x="300" y="1100" width="70" height="22" rx="8" fill="#f4f4f6" transform="rotate(10 335 1111)"/>
  <rect x="712" y="1068" width="70" height="22" rx="8" fill="#f4f4f6" transform="rotate(-8 747 1079)"/>
  <ellipse cx="330" cy="1145" rx="40" ry="34" fill="#f0c4a8"/>
  <ellipse cx="750" cy="1112" rx="40" ry="34" fill="#f0c4a8"/>

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
      <circle cx="493" cy="681" r="7" fill="#6a8fb0"/><circle cx="587" cy="681" r="7" fill="#6a8fb0"/>
      <circle cx="493" cy="681" r="3" fill="#1b1b1b"/><circle cx="587" cy="681" r="3" fill="#1b1b1b"/>
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
  </g>
  </g>
</svg>`;
