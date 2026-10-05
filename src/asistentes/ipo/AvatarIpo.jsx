/**
 * ipo/AvatarIpo.jsx
 * Ipo, el asistente de dolor y examenes: hombre de pelo corto con patillas,
 * delantal blanco, estetoscopio y credencial H. Ojos, boca y animaciones vienen
 * de comun/AvatarBase.jsx.
 */
import AvatarBase from "../comun/AvatarBase.jsx";

const C = {
  navy: "#0B2F6E",
  azul: "#1A5FB4",
  turquesa: "#14A39A",
  piel: "#F2CBAA",
  pielSombra: "#E2AF8B",
  bocaInterior: "#6E2533",
  halo1: "#1A5FB4",
  halo2: "#14A39A",
  fondo1: "#EAF2FB",
  fondo2: "#E3F5F3",
  pelo: "#2E241F",
  peloBrillo: "#4E3D33",
  labio: "#B06A5E",
  mejilla: 0.18,
  ondas: "#14A39A",
};

export default function AvatarIpo({ estado, boca }) {
  return (
    <AvatarBase id="ipo" nombre="Ipo, asistente virtual de ICA" C={C}
      Cuerpo={CuerpoIpo} Cabeza={CabezaIpo} estado={estado} boca={boca} />
  );
}

function CuerpoIpo({ C }) {
  return (
    <>
      {/* Cuello */}
      <path d="M172 266 L228 266 L232 330 L168 330 Z" fill={C.pielSombra} />

      {/* Uniforme (pijama clínico) */}
      <path d="M110 360 C140 330 170 318 200 318 C230 318 260 330 290 360 L300 470 L100 470 Z" fill={C.turquesa} />
      <path d="M176 318 L200 356 L224 318 Z" fill={C.pielSombra} />

      {/* Bata blanca */}
      <path d="M60 470 C64 400 92 352 150 330 L176 320 L196 470 Z" fill="#FFFFFF" stroke="#DDE5EF" strokeWidth="2" />
      <path d="M340 470 C336 400 308 352 250 330 L224 320 L204 470 Z" fill="#FFFFFF" stroke="#DDE5EF" strokeWidth="2" />
      {/* Solapas */}
      <path d="M176 320 L160 372 L186 392 Z" fill="#DDE5EF" />
      <path d="M224 320 L240 372 L214 392 Z" fill="#DDE5EF" />

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
    </>
  );
}

function CabezaIpo({ C }) {
  return (
    <>
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
    </>
  );
}
