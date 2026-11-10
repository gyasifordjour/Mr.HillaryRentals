// Illustrative fallback artwork used until real farm photos / video are supplied.
// All scenes use a 1600x900 viewBox so they scale like a cover-fitted image.

export const GRASS_Y = 330;

function bladePath(base: number, amp: number, step: number, phase: number) {
  let d = `M0,900 L0,${base}`;
  let i = 0;
  for (let x = 0; x <= 1600; x += step) {
    const wave = Math.sin(x * 0.011 + phase) * amp + Math.sin(x * 0.037 + phase * 2) * amp * 0.5;
    const spike = i % 2 === 0 ? -24 : 10;
    d += ` L${x},${(base + wave + spike).toFixed(1)}`;
    i++;
  }
  return `${d} L1600,900 Z`;
}

const FAR_GRASS = bladePath(GRASS_Y + 26, 14, 16, 1.2);
const NEAR_GRASS = bladePath(GRASS_Y + 70, 18, 22, 0.4);
const FRONT_GRASS = bladePath(GRASS_Y + 8, 12, 14, 2.6);

export function Pig({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="8" cy="49" rx="77" ry="15" fill="#604c3e" opacity=".2" />
      <path d="M-56 12c-15-6-21-19-14-31 6-10 18-12 30-7" fill="none" stroke="#d98982" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="72" ry="43" fill="url(#pigBody)" />
      <ellipse cx="-5" cy="15" rx="58" ry="22" fill="#d98780" opacity=".28" />
      <path d="M48-22c8-13 22-20 36-13 7 4 10 14 7 23-8-7-17-7-27-1z" fill="#dc8e87" />
      <path d="M57-28c7-8 17-11 24-7-4 4-9 7-15 11z" fill="#f3c3ba" />
      <ellipse cx="67" cy="-4" rx="31" ry="27" fill="#f0aaa2" />
      <ellipse cx="94" cy="2" rx="15" ry="12" fill="#d77e77" />
      <ellipse cx="90" cy="2" rx="2.1" ry="3" fill="#844a46" />
      <ellipse cx="99" cy="2" rx="2.1" ry="3" fill="#844a46" />
      <circle cx="68" cy="-15" r="3.3" fill="#3c302b" />
      <circle cx="69" cy="-16" r="1" fill="#fff" opacity=".8" />
      <path d="M-42 30v28a8 8 0 0 0 16 0V34M24 33v25a8 8 0 0 0 16 0V29" fill="#d9867e" />
      <path d="M-44 58h18M22 58h18" stroke="#985e58" strokeWidth="3" strokeLinecap="round" />
      <path d="M-25-24c15-12 37-15 53-8" fill="none" stroke="#ffd0c7" strokeWidth="4" opacity=".48" strokeLinecap="round" />
    </g>
  );
}

/** Beat 1: a layered dawn landscape and a detailed pig house on the horizon. */
export function SceneExterior() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="extSky" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#8fa8a7" />
          <stop offset=".48" stopColor="#d0d5c9" />
          <stop offset=".79" stopColor="#f3d9ae" />
          <stop offset="1" stopColor="#f6e8ce" />
        </linearGradient>
        <radialGradient id="extSun">
          <stop stopColor="#fff5d8" stopOpacity=".96" />
          <stop offset=".3" stopColor="#ffe7bd" stopOpacity=".55" />
          <stop offset="1" stopColor="#f8d7a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="extHill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#788d78" />
          <stop offset="1" stopColor="#536f58" />
        </linearGradient>
        <linearGradient id="extGround" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#78965f" />
          <stop offset=".55" stopColor="#557b48" />
          <stop offset="1" stopColor="#304e38" />
        </linearGradient>
        <linearGradient id="extWall" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f2e9d8" />
          <stop offset="1" stopColor="#c8bda7" />
        </linearGradient>
        <linearGradient id="extRoof" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#80644f" />
          <stop offset="1" stopColor="#463c34" />
        </linearGradient>
        <linearGradient id="extPath" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#c9ae82" />
          <stop offset="1" stopColor="#887655" />
        </linearGradient>
        <filter id="extShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <pattern id="extRoofLines" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M4 0v28M18 0v28" stroke="#d6b995" strokeOpacity=".22" strokeWidth="3" />
        </pattern>
        <pattern id="extFieldRows" width="150" height="100" patternUnits="userSpaceOnUse" patternTransform="skewX(-22)">
          <path d="M0 0v100" stroke="#b3bf75" strokeOpacity=".25" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="1600" height="900" fill="url(#extSky)" />
      <circle cx="1195" cy="294" r="310" fill="url(#extSun)" />
      <circle cx="1195" cy="294" r="48" fill="#fff0d0" opacity=".68" />
      <path d="M80 200c40-34 91-34 130-4 44-28 91-7 106 25H55c4-10 13-17 25-21zm1032-75c29-25 64-24 91-2 31-20 66-6 76 18h-229c4-7 13-13 24-16z" fill="#f8f2e6" opacity=".32" />
      <path d="M0 386Q195 279 385 355t385-18q187-82 369 6t461 4v202H0z" fill="#a5b1a0" opacity=".66" />
      <path d="M0 428q250-92 477-10t442-14q267-82 681 18v159H0z" fill="url(#extHill)" />
      <path d="M0 514q253-57 474 13t461-7q267-72 665 21v160H0z" fill="#6d895e" />
      <path d="M0 548q365-61 722 32t878-17v337H0z" fill="url(#extGround)" />
      <path d="M0 548q365-61 722 32t878-17v337H0z" fill="url(#extFieldRows)" opacity=".8" />
      <path d="M640 900q112-208 220-315 67-67 147-81 85 12 149 81 110 112 218 315z" fill="url(#extPath)" opacity=".62" />

      <ellipse cx="800" cy="405" rx="440" ry="45" fill="#34473a" opacity=".25" filter="url(#extShadow)" />
      <g>
        <path d="M429 253 800 131l371 122v34H429z" fill="url(#extRoof)" />
        <path d="M451 252 800 146l349 106v19H451z" fill="url(#extRoofLines)" />
        <path d="m429 253 371-122 371 122-19 18-352-111-352 111z" fill="#96785f" />
        <rect x="467" y="263" width="666" height="178" rx="3" fill="url(#extWall)" />
        <rect x="467" y="263" width="666" height="18" fill="#fff6e6" opacity=".48" />
        <path d="M485 285h630M485 427h630" stroke="#a99b84" strokeOpacity=".43" strokeWidth="4" />
        <path d="M502 285v141m73-141v141m73-141v141m73-141v141m73-141v141m73-141v141m73-141v141m73-141v141m73-141v141m73-141v141" stroke="#b6a991" strokeOpacity=".25" strokeWidth="2" />
        <rect x="744" y="321" width="112" height="120" fill="#343a34" />
        <rect x="758" y="335" width="84" height="106" fill="#697062" />
        <path d="M758 335h84v106h-84z" fill="#f1d7ac" opacity=".17" />
        <path d="M800 335v106" stroke="#d6c6a9" strokeOpacity=".45" strokeWidth="3" />
        {[526, 617, 973, 1064].map((x) => (
          <g key={x}>
            <rect x={x} y="309" width="54" height="54" rx="3" fill="#8ca3a0" stroke="#f3e8d3" strokeWidth="9" />
            <path d={`M${x + 27} 313v46M${x + 4} 336h46`} stroke="#e8e0cf" strokeWidth="3" opacity=".8" />
            <path d={`M${x + 4} 313h46v18h-46z`} fill="#fff0d1" opacity=".18" />
          </g>
        ))}
        <rect x="430" y="433" width="740" height="14" fill="#806b54" />
        <path d="M443 447h710" stroke="#f3e4c9" strokeOpacity=".5" strokeWidth="5" />
        <path d="M476 444v26m54-26v26m54-26v26m54-26v26m54-26v26m54-26v26m54-26v26m54-26v26m54-26v26m54-26v26m54-26v26m54-26v26" stroke="#51493e" strokeWidth="5" opacity=".8" />
      </g>

      <path d="M0 682q250-101 454-19m-440 72q274-124 502-27m-486 78q294-131 527-41m1055-155q-174-62-328-20m342 88q-197-77-364-20m387 102q-227-86-404-25" fill="none" stroke="#c1cc7d" strokeOpacity=".32" strokeWidth="8" />
      <g fill="#e2bb70" opacity=".65">
        <circle cx="160" cy="600" r="4" /><circle cx="197" cy="618" r="3" /><circle cx="1340" cy="632" r="4" />
        <circle cx="1381" cy="659" r="3" /><circle cx="356" cy="705" r="3" /><circle cx="1231" cy="710" r="4" />
      </g>
      <rect width="1600" height="900" fill="url(#extSky)" opacity=".08" />
      <path d="M0 0h1600v900H0z" fill="none" stroke="#273d37" strokeOpacity=".12" strokeWidth="50" />
    </svg>
  );
}

/** Beat 2: a warm, dimensional entrance into the pig room. */
export function SceneDoorway() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="doorWall" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#a99a82" />
          <stop offset=".5" stopColor="#d5cbb7" />
          <stop offset="1" stopColor="#8e816e" />
        </linearGradient>
        <linearGradient id="doorFrame" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#594a3e" />
          <stop offset=".45" stopColor="#8c7054" />
          <stop offset="1" stopColor="#473c33" />
        </linearGradient>
        <linearGradient id="doorRoom" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#e9e4d7" />
          <stop offset=".62" stopColor="#c9c4b4" />
          <stop offset="1" stopColor="#9b9a8b" />
        </linearGradient>
        <linearGradient id="doorFloor" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#b6a887" />
          <stop offset="1" stopColor="#746a56" />
        </linearGradient>
        <radialGradient id="doorLight">
          <stop stopColor="#fff4d7" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff4d7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#doorWall)" />
      <path d="M0 0h1600v900H0z" fill="#564b3e" opacity=".13" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) => (
        <path key={i} d={`M${i * 82} 0v900`} stroke={i % 2 ? "#efe5d2" : "#665b4c"} strokeOpacity=".12" strokeWidth="3" />
      ))}
      <path d="M0 110h1600M0 748h1600" stroke="#554b3f" strokeOpacity=".36" strokeWidth="8" />
      <path d="M0 122h1600M0 756h1600" stroke="#e0d4bd" strokeOpacity=".4" strokeWidth="3" />
      <rect x="347" y="84" width="906" height="816" fill="url(#doorFrame)" />
      <rect x="389" y="125" width="822" height="775" fill="url(#doorRoom)" />
      <path d="M389 125h822v510H389z" fill="#e9e8dd" />
      <path d="M389 635h822v265H389z" fill="url(#doorFloor)" />
      <ellipse cx="800" cy="405" rx="440" ry="460" fill="url(#doorLight)" />
      <path d="M440 190h720v310H440z" fill="#c5d2ca" />
      <path d="M440 190h720v18H440z" fill="#f9f0de" opacity=".7" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <path key={i} d={`M${450 + i * 64} 211v277`} stroke="#9eaa9f" strokeOpacity=".5" strokeWidth="4" />
      ))}
      <path d="M440 288h720M440 382h720M440 476h720" stroke="#ede7d7" strokeWidth="8" />
      <path d="M389 638h822" stroke="#615748" strokeWidth="10" opacity=".62" />
      <path d="M800 638 516 900m284-262 284 262M562 638l-93 262m569-262 93 262" stroke="#665f50" strokeOpacity=".31" strokeWidth="5" />
      <path d="M800 644v256M618 644l-80 256m444-256 80 256" stroke="#eee3c9" strokeOpacity=".36" strokeWidth="3" />
      <rect x="347" y="84" width="42" height="816" fill="#443b33" opacity=".66" />
      <rect x="1211" y="84" width="42" height="816" fill="#3e3730" opacity=".7" />
      <path d="M347 84h906v42H347z" fill="#4a3e34" />
      <path d="M365 104h870" stroke="#bd9b70" strokeOpacity=".58" strokeWidth="5" />
      <circle cx="1157" cy="496" r="12" fill="#d7ae70" />
      <circle cx="1157" cy="496" r="5" fill="#65503d" />
      <path d="M0 814h1600v86H0z" fill="#51483c" opacity=".15" />
    </svg>
  );
}

/** Beat 3: a bright, hygienic room with pens, a camera and pigs. */
export function SceneInterior() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="roomWall" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#e8e8dc" />
          <stop offset=".72" stopColor="#d4d7ca" />
          <stop offset="1" stopColor="#bbc1b3" />
        </linearGradient>
        <linearGradient id="roomFloor" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#b9b7a4" />
          <stop offset=".35" stopColor="#aaa792" />
          <stop offset="1" stopColor="#777968" />
        </linearGradient>
        <linearGradient id="roomWindow" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#b9d1ca" />
          <stop offset="1" stopColor="#f2e2bf" />
        </linearGradient>
        <linearGradient id="roomMetal" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#777f7b" />
          <stop offset=".45" stopColor="#c1c6bd" />
          <stop offset="1" stopColor="#59615d" />
        </linearGradient>
        <linearGradient id="pigBody" x1="0" y1="0" x2=".15" y2="1">
          <stop stopColor="#f5c2b9" />
          <stop offset=".58" stopColor="#e9a29a" />
          <stop offset="1" stopColor="#cf7772" />
        </linearGradient>
        <radialGradient id="roomSun">
          <stop stopColor="#fff4d3" stopOpacity=".8" />
          <stop offset="1" stopColor="#fff4d3" stopOpacity="0" />
        </radialGradient>
        <filter id="roomShadow" x="-30%" y="-40%" width="160%" height="200%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
        <pattern id="roomWallTiles" width="160" height="90" patternUnits="userSpaceOnUse">
          <path d="M0 0h160v90H0z" fill="none" stroke="#8f9b90" strokeOpacity=".2" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="1600" height="900" fill="url(#roomWall)" />
      <path d="M0 0h1600v520H0z" fill="url(#roomWallTiles)" />
      <path d="M0 0h1600v88H0z" fill="#f3f1e7" />
      <path d="M0 82h1600" stroke="#aab1a5" strokeWidth="6" />
      <path d="M120 0 800 115 1480 0" fill="#f3f2e9" opacity=".55" />
      <path d="M0 470h1600v430H0z" fill="url(#roomFloor)" />
      <path d="M0 470h1600" stroke="#747c71" strokeWidth="8" opacity=".65" />

      {[190, 604, 1018, 1432].map((x) => (
        <g key={x}>
          <rect x={x} y="135" width="235" height="132" rx="5" fill="#9d9e91" opacity=".4" />
          <rect x={x + 8} y="143" width="219" height="116" rx="2" fill="url(#roomWindow)" />
          <path d={`M${x + 116} 146v110M${x + 10} 201h215`} stroke="#e7e6d9" strokeWidth="8" />
          <path d={`M${x + 12} 151h210v37H${x + 12}z`} fill="#fff8e4" opacity=".3" />
          <path d={`M${x + 15} 261h205`} stroke="#7f8a80" strokeWidth="5" opacity=".55" />
        </g>
      ))}
      <circle cx="1240" cy="264" r="360" fill="url(#roomSun)" />
      <path d="M180 268v201m414-201v201m414-201v201m414-201v201" stroke="#a3a99e" strokeOpacity=".38" strokeWidth="8" />

      <path d="M0 496h1600v18H0z" fill="#626b65" />
      <path d="M0 536h1600v12H0z" fill="url(#roomMetal)" />
      <path d="M0 579h1600v10H0z" fill="#707973" />
      <path d="M0 493h1600M0 534h1600M0 577h1600" stroke="#edf0e9" strokeOpacity=".45" strokeWidth="3" />
      {Array.from({ length: 22 }, (_, i) => (
        <g key={i}>
          <path d={`M${i * 78 + 22} 488v113`} stroke="#56605a" strokeWidth="12" />
          <path d={`M${i * 78 + 18} 490v106`} stroke="#c6cbc2" strokeWidth="4" opacity=".75" />
        </g>
      ))}

      <path d="M0 468 1600 468M160 468 0 900m160 0 360-432m0 432 280-432m0 432 0-432m0 432-280-432m560 432L800 468m800 432-360-432" fill="none" stroke="#6e766c" strokeOpacity=".27" strokeWidth="4" />
      <path d="M800 468 608 900m192-432 192 432" stroke="#e0dac8" strokeOpacity=".32" strokeWidth="4" />
      <ellipse cx="800" cy="790" rx="560" ry="74" fill="#514c40" opacity=".18" filter="url(#roomShadow)" />

      <g>
        <path d="M90 711h250v76H90z" fill="#777d72" />
        <path d="M104 697h222v25H104z" fill="#c3c4b5" />
        <path d="M116 721h198v54H116z" fill="#858a7d" />
        <path d="M104 699h222" stroke="#edf0e2" strokeWidth="5" />
        <path d="M136 727v43m44-43v43m44-43v43m44-43v43" stroke="#bbc0b3" strokeWidth="4" opacity=".65" />
      </g>

      <Pig x={434} y={690} s={1.18} />
      <Pig x={1102} y={711} s={1.35} flip />
      <Pig x={770} y={790} s={1.02} />
      <path d="M0 829q240-30 470 6t443-2q350-33 687-1v68H0z" fill="#686e5f" opacity=".42" />
      <path d="M0 834h1600" stroke="#e0dfd0" strokeOpacity=".24" strokeWidth="3" />

      <path d="M796 0h8v84h-8z" fill="#747c77" />
      <path d="M800 80c-28 0-48 12-48 29v12h96v-12c0-17-20-29-48-29z" fill="#313a3a" />
      <ellipse cx="800" cy="112" rx="39" ry="12" fill="#1e2829" />
      <circle cx="800" cy="111" r="11" fill="#516b76" />
      <circle cx="800" cy="111" r="5" fill="#b9dff0" />
      <path d="M837 97h12v5h-12z" fill="#e8b44d" />
      <path d="M775 88q25-18 50 0" fill="none" stroke="#65716d" strokeWidth="4" />
      <rect width="1600" height="900" fill="#25342f" opacity=".035" />
    </svg>
  );
}

/** Foreground grass that sits in front of the bottom of the headline. */
export function ForegroundGrass() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d={FAR_GRASS} fill="#82a665" />
      <path d={FRONT_GRASS} fill="#648d4d" />
      <path d={NEAR_GRASS} fill="#3e6938" />
      <path d="M0 680q230-35 405 12t415-3q299-32 780-3v214H0z" fill="#315438" opacity=".28" />
    </svg>
  );
}
