/**
 * ica/AvatarIca.jsx
 * Ica, la recepcionista de la pagina principal: mujer de pelo largo, blusa azul
 * de ICA con cuello blanco, aros y credencial ICA. Ojos, boca y animaciones
 * vienen de comun/AvatarBase.jsx.
 */
import AvatarBase from "../comun/AvatarBase.jsx";

const C = {
  navy: "#0B2F6E",
  azul: "#1A5FB4",
  turquesa: "#14A39A",
  piel: "#F2CBAA",
  pielSombra: "#E2AF8B",
  bocaInterior: "#6E2533",
  halo1: "#1E3A5F",
  halo2: "#3F7FBF",
  fondo1: "#EEF3FA",
  fondo2: "#E6EEF8",
  pelo: "#5B3A29",
  peloBrillo: "#7A5240",
  blusa: "#1E3A5F",
  blusaSombra: "#16304F",
  cuello: "#FFFFFF",
  aro: "#3F7FBF",
  labio: "#C8616E",
  mejilla: 0.35,
  ondas: "#3F7FBF",
};

export default function AvatarIca({ estado, boca }) {
  return (
    <AvatarBase id="ica" nombre="Ica, recepción de ICA" C={C}
      Cuerpo={CuerpoIca} Cabeza={CabezaIca} aros pestanas estado={estado} boca={boca} />
  );
}

function CuerpoIca({ C }) {
  return (
    <>
      {/* Pelo largo (parte trasera) */}
      <path
        d="M116 205 C108 118 160 90 200 90 C244 90 294 116 286 205 C292 262 298 330 288 372 C266 386 134 386 112 372 C102 330 108 262 116 205 Z"
        fill={C.pelo}
      />

      {/* Cuello */}
      <path d="M178 270 L222 270 L226 334 L174 334 Z" fill={C.pielSombra} />

      {/* Blusa azul ICA */}
      <path d="M64 470 C70 396 116 344 200 336 C284 344 330 396 336 470 Z" fill={C.blusa} />
      <path d="M200 340 L200 470" stroke={C.blusaSombra} strokeWidth="3" />
      {/* Escote */}
      <path d="M180 334 L200 366 L220 334 Z" fill={C.pielSombra} />
      {/* Cuello blanco */}
      <path d="M172 330 L200 366 L184 378 L160 342 Z" fill={C.cuello} />
      <path d="M228 330 L200 366 L216 378 L240 342 Z" fill={C.cuello} />
      {/* Botones */}
      <circle cx="200" cy="396" r="3.5" fill={C.cuello} />
      <circle cx="200" cy="424" r="3.5" fill={C.cuello} />

      {/* Credencial ICA */}
      <rect x="252" y="388" width="50" height="28" rx="5" fill="#FFFFFF" stroke={C.aro} strokeWidth="2" />
      <text x="277" y="408" textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif" fill={C.blusa}>
        ICA
      </text>
    </>
  );
}

function CabezaIca({ C }) {
  return (
    <>
      {/* Cara */}
      <ellipse cx="200" cy="200" rx="70" ry="84" fill={C.piel} />

      {/* Flequillo hacia el lado */}
      <path
        d="M128 196 C122 132 164 106 204 108 C242 110 278 134 272 196 C266 168 254 148 236 138 C214 150 176 158 150 156 C138 166 132 180 128 196 Z"
        fill={C.pelo}
      />
      <path d="M150 128 C172 114 206 112 232 122" fill="none" stroke={C.peloBrillo} strokeWidth="4" strokeLinecap="round" />

      {/* Cejas finas */}
      <path className="avatar__ceja" d="M156 178 C166 171 180 171 188 175" fill="none" stroke={C.pelo} strokeWidth="3.5" strokeLinecap="round" />
      <path className="avatar__ceja" d="M212 175 C220 171 234 171 244 178" fill="none" stroke={C.pelo} strokeWidth="3.5" strokeLinecap="round" />
    </>
  );
}
