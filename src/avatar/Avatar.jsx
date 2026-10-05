/**
 * Avatar.jsx
 * Ipo, el asistente virtual de ICA, en SVG.
 *
 * v2: antes era una médica; ahora es Ipo (masculino): pelo corto con
 * patillas, cara de mandíbula más marcada, cejas más gruesas, sin aros.
 * Cada asistente tendrá su propio aspecto y nombre (Ica en la página
 * principal, Ipo para dolor y exámenes) para que se note el traspaso.
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
  pelo: "#2E241F",
  peloBrillo: "#4E3D33",
  bata: "#FFFFFF",
  bataSombra: "#DDE5EF",
  labio: "#B06A5E",
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
      aria-label={`Ipo, asistente virtual de ICA, ${estado}`}
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
        {/* Cuello */}
        <path d="M172 266 L228 266 L232 330 L168 330 Z" fill={C.pielSombra} />

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

      {/* Cara (mandíbula más marcada) */}
      <path
        d="M130 190 C130 140 160 116 200 116 C240 116 270 140 270 190 C270 234 260 260 238 276 C224 286 212 289 200 289 C188 289 176 286 162 276 C140 260 130 234 130 190 Z"
        fill={C.piel}
      />

      {/* Pelo corto */}
      <path
        d="M126 198 C118 130 160 100 202 100 C246 100 286 128 274 198 C271 178 267 164 259 153 C238 140 216 134 196 136 C172 138 152 146 141 159 C134 170 130 182 126 198 Z"
        fill={C.pelo}
      />
      <path d="M176 112 C204 104 238 110 258 128" fill="none" stroke={C.peloBrillo} strokeWidth="4" strokeLinecap="round" />
      {/* Patillas */}
      <path d="M127 186 L137 184 L137 214 L131 214 Z" fill={C.pelo} />
      <path d="M273 186 L263 184 L263 214 L269 214 Z" fill={C.pelo} />

      {/* Cejas */}
      <path className="avatar__ceja" d="M154 177 C165 171 179 171 190 174" fill="none" stroke={C.pelo} strokeWidth="5.5" strokeLinecap="round" />
      <path className="avatar__ceja" d="M210 174 C221 171 235 171 246 177" fill="none" stroke={C.pelo} strokeWidth="5.5" strokeLinecap="round" />

      {/* Ojos (parpadean con CSS) */}
      <g className="avatar__ojos">
        <ellipse cx="172" cy="197" rx="10" ry="8" fill="#FFFFFF" />
        <ellipse cx="228" cy="197" rx="10" ry="8" fill="#FFFFFF" />
        <circle className="avatar__pupila" cx="172" cy="198" r="5.5" fill={C.navy} />
        <circle className="avatar__pupila" cx="228" cy="198" r="5.5" fill={C.navy} />
        <circle cx="174" cy="196" r="1.6" fill="#FFFFFF" />
        <circle cx="230" cy="196" r="1.6" fill="#FFFFFF" />
      </g>
      <path d="M162 191 C168 187 178 187 183 190" fill="none" stroke={C.pelo} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M217 190 C222 187 232 187 238 191" fill="none" stroke={C.pelo} strokeWidth="1.5" strokeLinecap="round" />

      {/* Nariz */}
      <path d="M200 208 C197 220 194 226 199 229 C202 230 205 229 207 227" fill="none" stroke={C.pielSombra} strokeWidth="3" strokeLinecap="round" />

      {/* Mejillas */}
      <ellipse cx="160" cy="230" rx="12" ry="7" fill="#E79A8A" opacity="0.18" />
      <ellipse cx="240" cy="230" rx="12" ry="7" fill="#E79A8A" opacity="0.18" />

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
