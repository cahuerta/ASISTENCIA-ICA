/**
 * Avatar.jsx
 * Médica Hipokratia en SVG.
 *
 * Props:
 * - estado: "reposo" | "escuchando" | "pensando" | "hablando"
 * - boca:   0..1 apertura de la boca (viene de useVoz)
 */
import "./avatar.css";

const C = {
  navy: "#0B2F6E",
  azul: "#1A5FB4",
  turquesa: "#14A39A",
  turquesaClaro: "#7FD6CD",
  piel: "#F2CBAA",
  pielSombra: "#E2AF8B",
  pelo: "#3A2A22",
  peloBrillo: "#5A4033",
  bata: "#FFFFFF",
  bataSombra: "#DDE5EF",
  labio: "#C8616E",
  bocaInterior: "#6E2533",
};

export default function Avatar({ estado = "reposo", boca = 0 }) {
  const apertura = Math.max(0, Math.min(1, boca));
  const bocaRy = 1.2 + apertura * 11;
  const bocaRx = 13 + apertura * 3;

  return (
    <svg
      className={`avatar avatar--${estado}`}
      viewBox="0 0 400 460"
      role="img"
      aria-label={`Avatar médica Hipokratia, ${estado}`}
    >
      <defs>
        <linearGradient id="gradHalo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C.azul} />
          <stop offset="100%" stopColor={C.turquesa} />
        </linearGradient>
        <linearGradient id="gradFondo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAF2FB" />
          <stop offset="100%" stopColor="#E3F5F3" />
        </linearGradient>
        <clipPath id="recorte">
          <circle cx="200" cy="215" r="178" />
        </clipPath>
      </defs>

      {/* Halo de estado */}
      <circle className="avatar__halo" cx="200" cy="215" r="188" fill="none" stroke="url(#gradHalo)" strokeWidth="6" />
      <circle cx="200" cy="215" r="178" fill="url(#gradFondo)" />

      <g clipPath="url(#recorte)">
      <g transform="translate(40 14) scale(0.8)">
        {/* Pelo (parte trasera) */}
        <path
          d="M118 205 C110 120 160 92 200 92 C244 92 292 118 284 205 C290 260 294 320 282 352 C262 366 138 366 118 352 C106 320 110 260 118 205 Z"
          fill={C.pelo}
        />

        {/* Cuello */}
        <path d="M178 270 L222 270 L226 330 L174 330 Z" fill={C.pielSombra} />

        {/* Uniforme (pijama clínico) */}
        <path d="M110 360 C140 330 170 318 200 318 C230 318 260 330 290 360 L300 470 L100 470 Z" fill={C.turquesa} />
        <path d="M176 318 L200 356 L224 318 Z" fill={C.pielSombra} />

        {/* Bata blanca */}
        <path
          d="M60 470 C64 400 92 352 150 330 L176 320 L196 470 Z"
          fill={C.bata}
          stroke={C.bataSombra}
          strokeWidth="2"
        />
        <path
          d="M340 470 C336 400 308 352 250 330 L224 320 L204 470 Z"
          fill={C.bata}
          stroke={C.bataSombra}
          strokeWidth="2"
        />
        {/* Solapas */}
        <path d="M176 320 L160 372 L186 392 Z" fill={C.bataSombra} />
        <path d="M224 320 L240 372 L214 392 Z" fill={C.bataSombra} />

        {/* Estetoscopio */}
        <path
          d="M166 324 C150 360 150 392 170 410 M234 324 C250 360 250 392 230 410 M170 410 C182 424 218 424 230 410"
          fill="none"
          stroke={C.navy}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="200" cy="426" r="11" fill={C.azul} stroke={C.navy} strokeWidth="3" />
        <circle cx="200" cy="426" r="4" fill="#CFE0F5" />

        {/* Credencial Hipokratia */}
        <rect x="258" y="384" width="42" height="30" rx="5" fill="#FFFFFF" stroke={C.azul} strokeWidth="2" />
        <text x="279" y="405" textAnchor="middle" fontSize="18" fontWeight="700" fontFamily="Georgia, serif">
          <tspan fill={C.azul}>H</tspan>
        </text>
        <rect x="258" y="378" width="42" height="7" rx="3" fill={C.turquesa} />

      {/* Orejas */}
      <ellipse cx="129" cy="210" rx="11" ry="17" fill={C.pielSombra} />
      <ellipse cx="271" cy="210" rx="11" ry="17" fill={C.pielSombra} />
      <circle cx="129" cy="228" r="3.5" fill={C.turquesa} />
      <circle cx="271" cy="228" r="3.5" fill={C.turquesa} />

      {/* Cara */}
      <ellipse cx="200" cy="200" rx="70" ry="84" fill={C.piel} />

      {/* Pelo (flequillo) */}
      <path
        d="M128 196 C122 132 164 108 204 110 C240 112 276 134 272 196 C262 162 246 144 222 136 C206 152 170 164 142 170 C134 178 130 186 128 196 Z"
        fill={C.pelo}
      />
      <path d="M214 122 C236 124 256 138 262 160" fill="none" stroke={C.peloBrillo} strokeWidth="4" strokeLinecap="round" />

      {/* Cejas */}
      <path className="avatar__ceja" d="M156 178 C166 170 180 170 188 175" fill="none" stroke={C.pelo} strokeWidth="4" strokeLinecap="round" />
      <path className="avatar__ceja" d="M212 175 C220 170 234 170 244 178" fill="none" stroke={C.pelo} strokeWidth="4" strokeLinecap="round" />

      {/* Ojos (parpadean con CSS) */}
      <g className="avatar__ojos">
        <ellipse cx="172" cy="197" rx="10" ry="8" fill="#FFFFFF" />
        <ellipse cx="228" cy="197" rx="10" ry="8" fill="#FFFFFF" />
        <circle className="avatar__pupila" cx="172" cy="198" r="5.5" fill={C.navy} />
        <circle className="avatar__pupila" cx="228" cy="198" r="5.5" fill={C.navy} />
        <circle cx="174" cy="196" r="1.6" fill="#FFFFFF" />
        <circle cx="230" cy="196" r="1.6" fill="#FFFFFF" />
      </g>
      <path d="M161 191 C168 186 178 186 184 191" fill="none" stroke={C.pelo} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M216 191 C222 186 232 186 239 191" fill="none" stroke={C.pelo} strokeWidth="2.5" strokeLinecap="round" />

      {/* Nariz */}
      <path d="M200 208 C197 220 194 226 199 229 C202 230 205 229 207 227" fill="none" stroke={C.pielSombra} strokeWidth="3" strokeLinecap="round" />

      {/* Mejillas */}
      <ellipse cx="160" cy="228" rx="12" ry="7" fill="#F09A9A" opacity="0.35" />
      <ellipse cx="240" cy="228" rx="12" ry="7" fill="#F09A9A" opacity="0.35" />

      {/* Boca */}
      <g className="avatar__boca">
        {apertura > 0.04 ? (
          <>
            <ellipse cx="200" cy={250 + bocaRy * 0.35} rx={bocaRx} ry={bocaRy} fill={C.bocaInterior} />
            <rect x={200 - bocaRx * 0.6} y="247" width={bocaRx * 1.2} height={Math.min(4, bocaRy * 0.5)} rx="1.5" fill="#FFFFFF" />
            <path
              d={`M${200 - bocaRx - 2} 249 C${200 - bocaRx / 2} ${245} ${200 + bocaRx / 2} ${245} ${200 + bocaRx + 2} 249`}
              fill="none"
              stroke={C.labio}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ) : (
          <path d="M184 248 C192 256 208 256 216 248" fill="none" stroke={C.labio} strokeWidth="3.5" strokeLinecap="round" />
        )}
      </g>
      </g>
      </g>

      {/* Indicador: pensando */}
      {estado === "pensando" && (
        <g className="avatar__pensando">
          <circle cx="300" cy="88" r="7" fill={C.azul} />
          <circle cx="322" cy="88" r="7" fill={C.azul} />
          <circle cx="344" cy="88" r="7" fill={C.azul} />
        </g>
      )}

      {/* Indicador: hablando */}
      {estado === "hablando" && (
        <g className="avatar__ondas" fill="none" stroke={C.turquesa} strokeWidth="4" strokeLinecap="round">
          <path d="M318 196 C326 206 326 222 318 232" />
          <path d="M334 184 C348 202 348 226 334 244" />
          <path d="M82 196 C74 206 74 222 82 232" />
          <path d="M66 184 C52 202 52 226 66 244" />
        </g>
      )}
    </svg>
  );
}
