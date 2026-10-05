/**
 * comun/AvatarBase.jsx
 * Lo comun a los dibujos de los asistentes: circulo, halo segun estado (escucha,
 * piensa, habla), ojos que parpadean, nariz, mejillas y boca que se mueve al
 * hablar. Cada asistente pone su cuerpo, su cabeza (pelo, cara, cejas) y sus
 * colores: ica/AvatarIca.jsx, ipo/AvatarIpo.jsx.
 *
 * Props: id (unico por asistente), nombre (para lectores de pantalla), C (colores),
 * Cuerpo y Cabeza (componentes SVG que reciben C), aros, pestanas,
 * estado ("reposo" | "escuchando" | "pensando" | "hablando"), boca (0..1).
 */
import "./asistentes.css";

export default function AvatarBase({ id: clave, nombre, C, Cuerpo, Cabeza, aros = false, pestanas = false, estado = "reposo", boca = 0 }) {
  const apertura = Math.max(0, Math.min(1, boca));
  const bocaRy = 1.2 + apertura * 11;
  const bocaRx = 13 + apertura * 3;
  // ids propios por asistente (dos avatares en la misma página no se pisan)
  const id = (n) => `${n}-${clave}`;

  return (
    <svg
      className={`avatar avatar--${estado}`}
      viewBox="0 0 400 460"
      role="img"
      aria-label={`${nombre}, ${estado}`}
    >
      <defs>
        <linearGradient id={id("gradHalo")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C.halo1} />
          <stop offset="100%" stopColor={C.halo2} />
        </linearGradient>
        <linearGradient id={id("gradFondo")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.fondo1} />
          <stop offset="100%" stopColor={C.fondo2} />
        </linearGradient>
        <clipPath id={id("recorte")}>
          <circle cx="200" cy="215" r="178" />
        </clipPath>
      </defs>

      {/* Halo de estado */}
      <circle className="avatar__halo" cx="200" cy="215" r="188" fill="none" stroke={`url(#${id("gradHalo")})`} strokeWidth="6" />
      <circle cx="200" cy="215" r="178" fill={`url(#${id("gradFondo")})`} />

      <g clipPath={`url(#${id("recorte")})`}>
      <g transform="translate(40 14) scale(0.8)">
        <Cuerpo C={C} />

        {/* Orejas */}
        <ellipse cx="129" cy="210" rx="11" ry="17" fill={C.pielSombra} />
        <ellipse cx="271" cy="210" rx="11" ry="17" fill={C.pielSombra} />
        {aros && (
          <>
            <circle cx="129" cy="229" r="4" fill={C.aro} />
            <circle cx="271" cy="229" r="4" fill={C.aro} />
          </>
        )}

        <Cabeza C={C} />

        {/* Ojos (parpadean con CSS) */}
        <g className="avatar__ojos">
          <ellipse cx="172" cy="197" rx="10" ry="8" fill="#FFFFFF" />
          <ellipse cx="228" cy="197" rx="10" ry="8" fill="#FFFFFF" />
          <circle className="avatar__pupila" cx="172" cy="198" r="5.5" fill={C.navy} />
          <circle className="avatar__pupila" cx="228" cy="198" r="5.5" fill={C.navy} />
          <circle cx="174" cy="196" r="1.6" fill="#FFFFFF" />
          <circle cx="230" cy="196" r="1.6" fill="#FFFFFF" />
        </g>
        {/* Párpados (con pestañas, más marcados) */}
        <path d="M162 191 C168 187 178 187 183 190" fill="none" stroke={C.pelo} strokeWidth={pestanas ? 2.8 : 1.5} strokeLinecap="round" />
        <path d="M217 190 C222 187 232 187 238 191" fill="none" stroke={C.pelo} strokeWidth={pestanas ? 2.8 : 1.5} strokeLinecap="round" />

        {/* Nariz */}
        <path d="M200 208 C197 220 194 226 199 229 C202 230 205 229 207 227" fill="none" stroke={C.pielSombra} strokeWidth="3" strokeLinecap="round" />

        {/* Mejillas */}
        <ellipse cx="160" cy="229" rx="12" ry="7" fill="#F09A9A" opacity={C.mejilla} />
        <ellipse cx="240" cy="229" rx="12" ry="7" fill="#F09A9A" opacity={C.mejilla} />

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
          <circle cx="300" cy="88" r="7" fill={C.halo1} />
          <circle cx="322" cy="88" r="7" fill={C.halo1} />
          <circle cx="344" cy="88" r="7" fill={C.halo1} />
        </g>
      )}

      {/* Indicador: hablando */}
      {estado === "hablando" && (
        <g className="avatar__ondas" fill="none" stroke={C.ondas} strokeWidth="4" strokeLinecap="round">
          <path d="M318 196 C326 206 326 222 318 232" />
          <path d="M334 184 C348 202 348 226 334 244" />
          <path d="M82 196 C74 206 74 222 82 232" />
          <path d="M66 184 C52 202 52 226 66 244" />
        </g>
      )}
    </svg>
  );
}
