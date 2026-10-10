/**
 * ipo/AvatarIpo.jsx
 * Ipo, el asistente de dolor y exámenes: retrato plano con luces y sombras
 * (pelo corto unido a las patillas, delantal blanco, pijama clínico y
 * estetoscopio), fondo azul ICA y la insignia del logo ICA sobre el hombro,
 * tipo noticiero.
 *
 * Se mueve solo:
 *   - parpadea y respira (muy suave),
 *   - levanta las cejas al escuchar,
 *   - abre la boca con la voz (prop boca 0..1, la que entrega useVoz),
 *   - halo de estado (escuchando / pensando / hablando), puntos al pensar y
 *     ondas al hablar, con las mismas clases de comun/asistentes.css.
 *
 * Mismo tamaño que antes (viewBox 400 x 460), así calza en la pantalla, en el
 * botón del widget y en la miniatura sin tocar PantallaAsistentes.jsx.
 * Los ids del SVG son únicos por instancia (useId): dos Ipo en la misma página
 * no se pisan los degradados.
 *
 * Props: estado ("reposo" | "escuchando" | "pensando" | "hablando"), boca (0..1).
 */
import { useId } from "react";
import "../comun/asistentes.css";
import logoICA from "../../assets/ica.jpg";

// Respiración: el cuerpo y la cabeza suben y bajan apenas
const ESTILO = `
.ipo-respira { animation: ipo-respira 4.6s ease-in-out infinite; }
@keyframes ipo-respira { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
`;

export default function AvatarIpo({ estado = "reposo", boca = 0 }) {
  const base = "ipo" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n) => `${base}-${n}`;
  const u = (n) => `url(#${id(n)})`;

  // Apertura de la boca: el labio inferior baja hasta 9 px
  const apertura = Math.max(0, Math.min(1, Number(boca) || 0));
  const abre = apertura > 0.04 ? Math.round(apertura * 9 * 10) / 10 : 0;
  const dientes = Math.min(3, abre * 0.4);

  return (
    <svg
      className={`avatar avatar--${estado}`}
      viewBox="0 0 400 460"
      role="img"
      aria-label={`Ipo, asistente virtual de ICA, ${estado}`}
    >
      <style>{ESTILO}</style>
      <g transform="translate(0 12)">
            <defs>
        <radialGradient id={id("fondo")} cx="50%" cy="38%" r="70%"><stop offset="0" stopColor="#6f9cc8"/><stop offset=".55" stopColor="#3a679a"/><stop offset="1" stopColor="#1c3c66"/></radialGradient>
        <linearGradient id={id("gradHalo")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1A5FB4"/><stop offset="1" stopColor="#14A39A"/></linearGradient>
        <radialGradient id={id("halo")} cx="50%" cy="40%" r="55%"><stop offset="0" stopColor="#ffffff" stopOpacity=".9"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
        {/* piel: luz desde arriba a la izquierda */}
        <radialGradient id={id("piel")} cx="42%" cy="36%" r="70%"><stop offset="0" stopColor="#f3cdb0"/><stop offset=".45" stopColor="#e8b593"/><stop offset=".8" stopColor="#d89c79"/><stop offset="1" stopColor="#c88a68"/></radialGradient>
        <linearGradient id={id("cuello")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9785a"/><stop offset=".35" stopColor="#d39674"/><stop offset="1" stopColor="#e0a685"/></linearGradient>
        <linearGradient id={id("oreja")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d0916f"/><stop offset="1" stopColor="#e2a988"/></linearGradient>
        <linearGradient id={id("pelo")} x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stopColor="#4a372c"/><stop offset=".5" stopColor="#2e221b"/><stop offset="1" stopColor="#1a130f"/></linearGradient>
        <linearGradient id={id("bata")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset="1" stopColor="#e2e8ef"/></linearGradient>
        <linearGradient id={id("pij")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12a097"/><stop offset="1" stopColor="#0b7a73"/></linearGradient>
        <radialGradient id={id("iris")} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#a07850"/><stop offset=".45" stopColor="#6e4c30"/><stop offset=".82" stopColor="#4a3220"/><stop offset="1" stopColor="#1f150d"/></radialGradient>
        <linearGradient id={id("labioSup")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a95f56"/><stop offset="1" stopColor="#8e4b45"/></linearGradient>
        <linearGradient id={id("labioInf")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9706a"/><stop offset="1" stopColor="#c9857c"/></linearGradient>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef2f6"/><stop offset=".5" stopColor="#9aa6b3"/><stop offset="1" stopColor="#5d6a78"/></linearGradient>
        <filter id={id("b2")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id={id("b4")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
        <filter id={id("b7")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
        <clipPath id={id("insignia")}><circle cx="340" cy="346" r="40"/></clipPath>
        <filter id={id("sombraIns")} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0b1e38" floodOpacity=".45"/></filter>
        <clipPath id={id("circ")}><circle cx="200" cy="214" r="186"/></clipPath>
        <clipPath id={id("caraClip")}><path id={id("caraPath")} d="M200 100 C243 100 272 128 274 172 C276 202 271 226 263 244 C252 268 230 287 200 289 C170 287 148 268 137 244 C129 226 124 202 126 172 C128 128 157 100 200 100 Z"/></clipPath>
        <clipPath id={id("ojoI")}><path d="M157 189 C163 181 181 180 189 188 C182 194 164 195 157 189 Z"/></clipPath>
        <clipPath id={id("ojoD")}><path d="M243 189 C237 181 219 180 211 188 C218 194 236 195 243 189 Z"/></clipPath>
      </defs>

      {/* anillo fijo + halo que cambia según el estado (escucha, piensa, habla) */}
      <circle cx="200" cy="214" r="194" fill="none" stroke="#3f7fbf" strokeWidth="4" opacity=".55"/>
      <circle className="avatar__halo" cx="200" cy="214" r="194" fill="none" stroke={u("gradHalo")} strokeWidth="6"/>
      <circle cx="200" cy="214" r="186" fill={u("fondo")}/>
      <circle cx="200" cy="200" r="120" fill={u("halo")} opacity=".18"/>

      <g clipPath={u("circ")}>
      <g className="ipo-respira">
        {/* ===== CUERPO ===== */}
        {/* sombra del cuello sobre la bata */}
        <ellipse cx="200" cy="330" rx="70" ry="14" fill="#9fb0c3" opacity=".45" filter={u("b7")}/>
        {/* bata */}
        <path d="M34 454 C38 384 84 338 154 320 L246 320 C316 338 362 384 366 454 Z" fill={u("bata")}/>
        {/* pliegues de la bata */}
        <path d="M86 454 C92 410 108 380 132 360" fill="none" stroke="#cfd8e2" strokeWidth="3" opacity=".8" filter={u("b2")}/>
        <path d="M314 454 C308 410 292 380 268 360" fill="none" stroke="#cfd8e2" strokeWidth="3" opacity=".8" filter={u("b2")}/>
        <path d="M60 420 C80 400 100 392 120 390" fill="none" stroke="#dfe6ee" strokeWidth="2" opacity=".9"/>
        {/* cuello de la persona */}
        <path d="M168 258 C170 288 166 308 158 324 L242 324 C234 308 230 288 232 258 Z" fill={u("cuello")}/>
        <path d="M168 262 C182 292 218 292 232 262 L232 280 C218 304 182 304 168 280 Z" fill="#a8684b" opacity=".5" filter={u("b2")}/>
        {/* esternocleidomastoideo sugerido */}
        <path d="M176 290 C182 304 190 314 196 322 M224 290 C218 304 210 314 204 322" fill="none" stroke="#c48262" strokeWidth="2" opacity=".45" filter={u("b2")}/>
        {/* pijama en V */}
        <path d="M154 320 L200 388 L246 320 Z" fill={u("pij")}/>
        <path d="M170 320 L200 364 L230 320 Z" fill="#dda182"/>
        <path d="M170 320 L200 364 L230 320" fill="none" stroke="#08645e" strokeWidth="2.5"/>
        <path d="M180 320 L200 350 L220 320 Z" fill="#c98b6b" opacity=".35" filter={u("b2")}/>
        {/* solapas con sombra */}
        <path d="M154 320 L204 404 L180 454 L120 454 L146 382 L132 338 Z" fill="#9fb0c3" opacity=".35" filter={u("b4")}/>
        <path d="M154 320 L200 400 L176 454 L124 454 L148 382 L134 340 Z" fill="#fbfcfd" stroke="#d2dae3" strokeWidth="1.5"/>
        <path d="M246 320 L196 404 L220 454 L280 454 L254 382 L268 338 Z" fill="#9fb0c3" opacity=".35" filter={u("b4")}/>
        <path d="M246 320 L200 400 L224 454 L276 454 L252 382 L266 340 Z" fill="#fbfcfd" stroke="#d2dae3" strokeWidth="1.5"/>
        <path d="M148 382 L134 340" stroke="#d2dae3" strokeWidth="1.5"/><path d="M252 382 L266 340" stroke="#d2dae3" strokeWidth="1.5"/>
        {/* estetoscopio */}
        <path d="M164 326 C136 362 142 406 180 420" fill="none" stroke="#1d2833" strokeWidth="5.5" strokeLinecap="round"/>
        <path d="M236 326 C264 362 258 406 220 420" fill="none" stroke="#1d2833" strokeWidth="5.5" strokeLinecap="round"/>
        <path d="M166 330 C142 364 148 402 178 414" fill="none" stroke="#56636f" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
        <path d="M180 420 C190 425 210 425 220 420" fill="none" stroke="#1d2833" strokeWidth="5.5" strokeLinecap="round"/>
        <circle cx="200" cy="430" r="12" fill={u("metal")} stroke="#2b3742" strokeWidth="2.5"/>
        <circle cx="200" cy="430" r="6" fill="#c9d2dc" stroke="#7d8996" strokeWidth="1"/>
        {/* ===== CABEZA ===== */}
        {/* orejas */}
        <path d="M130 186 C114 182 108 202 112 220 C116 238 128 244 136 238 C134 220 132 202 130 186 Z" fill={u("oreja")}/>
        <path d="M126 198 C118 204 118 220 126 230 C128 222 128 210 126 198 Z" fill="#b97a5a" opacity=".55"/>
        <path d="M270 186 C286 182 292 202 288 220 C284 238 272 244 264 238 C266 220 268 202 270 186 Z" fill={u("oreja")}/>
        <path d="M274 198 C282 204 282 220 274 230 C272 222 272 210 274 198 Z" fill="#b97a5a" opacity=".55"/>

        {/* cara */}
        <use href={"#" + id("caraPath")} fill={u("piel")}/>
        <g clipPath={u("caraClip")}>
          {/* planos de luz y sombra */}
          <path d="M126 150 C132 210 146 252 176 282 L120 300 Z" fill="#b8775a" opacity=".35" filter={u("b7")}/>
          <path d="M274 150 C268 210 254 252 224 282 L280 300 Z" fill="#b8775a" opacity=".42" filter={u("b7")}/>
          <ellipse cx="200" cy="140" rx="46" ry="24" fill="#f8dbc4" opacity=".5" filter={u("b7")}/>
          {/* cuencas de los ojos */}
          <ellipse cx="173" cy="186" rx="22" ry="12" fill="#c58565" opacity=".35" filter={u("b4")}/>
          <ellipse cx="227" cy="186" rx="22" ry="12" fill="#c58565" opacity=".35" filter={u("b4")}/>
          {/* pómulos con luz */}
          <ellipse cx="160" cy="214" rx="14" ry="8" fill="#f6d3b8" opacity=".55" filter={u("b4")}/>
          <ellipse cx="240" cy="214" rx="14" ry="8" fill="#f2c9ac" opacity=".4" filter={u("b4")}/>
          {/* rubor */}
          <ellipse cx="160" cy="228" rx="16" ry="10" fill="#de8a78" opacity=".22" filter={u("b4")}/>
          <ellipse cx="240" cy="228" rx="16" ry="10" fill="#de8a78" opacity=".22" filter={u("b4")}/>
          {/* sombra lateral de la nariz */}
          <path d="M206 186 C210 204 212 214 214 226 L208 228 C206 214 204 202 202 188 Z" fill="#c07e5e" opacity=".55" filter={u("b2")}/>
          {/* surcos nasolabiales suaves */}
          <path d="M184 232 C178 240 176 248 178 258" fill="none" stroke="#bf7f60" strokeWidth="2.5" opacity=".35" filter={u("b2")}/>
          <path d="M216 232 C222 240 224 248 222 258" fill="none" stroke="#bf7f60" strokeWidth="2.5" opacity=".4" filter={u("b2")}/>
          {/* barba incipiente (muy sutil) */}
          <path d="M140 236 C150 266 174 284 200 286 C226 284 250 266 260 236 C256 262 232 280 200 282 C168 280 144 262 140 236 Z" fill="#4e3a2e" opacity=".14" filter={u("b2")}/>
          <ellipse cx="200" cy="272" rx="24" ry="10" fill="#4e3a2e" opacity=".1" filter={u("b4")}/>
          <path d="M182 244 C192 240 208 240 218 244 C210 246 190 246 182 244 Z" fill="#4e3a2e" opacity=".12" filter={u("b2")}/>
          {/* sombra bajo el labio y mentón */}
          <ellipse cx="200" cy="266" rx="14" ry="4" fill="#b8775a" opacity=".45" filter={u("b2")}/>
          <ellipse cx="200" cy="278" rx="18" ry="6" fill="#f2c7a8" opacity=".45" filter={u("b4")}/>
        </g>

        {/* pelo: masa principal, con las patillas unidas */}
        <path d="M130 206 C126 198 123 188 122 176 C112 118 152 80 206 80 C258 80 294 116 278 176 C277 188 274 198 270 206 C267 200 266 192 266 182 C267 166 268 152 264 140 C256 128 240 122 224 124 C206 126 190 132 172 130 C158 128 148 124 140 132 C133 144 133 164 134 182 C134 192 133 200 130 206 Z" fill={u("pelo")}/>
        {/* mechones y brillo */}
        <path d="M140 132 C150 110 176 96 204 94 C232 92 256 102 270 122" fill="none" stroke="#6b5040" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
        <path d="M158 112 C178 100 206 96 230 102" fill="none" stroke="#8a6a55" strokeWidth="2" strokeLinecap="round" opacity=".55"/>
        <path d="M172 130 C186 118 204 114 224 116" fill="none" stroke="#120c09" strokeWidth="2" opacity=".55"/>
        <path d="M224 124 C238 110 256 112 266 126" fill="none" stroke="#120c09" strokeWidth="2" opacity=".5"/>
        <path d="M150 126 C160 120 170 122 176 128" fill="none" stroke="#57402f" strokeWidth="2" strokeLinecap="round" opacity=".6"/>
        {/* línea de nacimiento difuminada */}
        <path d="M140 132 C156 126 166 130 176 131 C192 133 206 126 224 124 C240 122 256 128 264 140" fill="none" stroke="#3a2b22" strokeWidth="5" opacity=".35" filter={u("b2")}/>

        {/* cejas con pelitos */}
        <g className="avatar__ceja">
        <path d="M151 167 C160 156 176 154 190 158 C191 162 190 164 188 165 C176 162 164 164 155 171 Z" fill="#2a1e17"/>
        <path d="M249 167 C240 156 224 154 210 158 C209 162 210 164 212 165 C224 162 236 164 245 171 Z" fill="#2a1e17"/>
        <path d="M158 164 l6 -4 M166 161 l6 -3 M174 159 l6 -2 M234 159 l-6 -2 M242 161 l-6 -3" stroke="#4d382b" strokeWidth="1.2" strokeLinecap="round" opacity=".8"/>
        </g>

        {/* ojos (parpadean) */}
        <g className="avatar__ojos">
          <path d="M157 189 C163 181 181 180 189 188 C182 194 164 195 157 189 Z" fill="#f7f1ec"/>
          <g clipPath={u("ojoI")}>
            <circle cx="173" cy="187.5" r="7.2" fill={u("iris")}/>
            <circle cx="173" cy="187.5" r="7.2" fill="none" stroke="#1b120b" strokeWidth="1.2"/>
            <circle cx="173" cy="187.5" r="3.1" fill="#0d0805"/>
            <path d="M157 186 C164 180 181 179 189 186 L189 184 C181 176 164 177 157 184 Z" fill="#8a5e47" opacity=".35"/>
          </g>
          <circle cx="175.8" cy="185" r="1.8" fill="#ffffff"/>
          <circle cx="170.5" cy="190.5" r=".8" fill="#ffffff" opacity=".7"/>
          <path d="M155 189 C161 179 182 177 191 187" fill="none" stroke="#21170f" strokeWidth="2.6" strokeLinecap="round"/>

          <path d="M243 189 C237 181 219 180 211 188 C218 194 236 195 243 189 Z" fill="#f7f1ec"/>
          <g clipPath={u("ojoD")}>
            <circle cx="227" cy="187.5" r="7.2" fill={u("iris")}/>
            <circle cx="227" cy="187.5" r="7.2" fill="none" stroke="#1b120b" strokeWidth="1.2"/>
            <circle cx="227" cy="187.5" r="3.1" fill="#0d0805"/>
            <path d="M243 186 C236 180 219 179 211 186 L211 184 C219 176 236 177 243 184 Z" fill="#8a5e47" opacity=".35"/>
          </g>
          <circle cx="229.8" cy="185" r="1.8" fill="#ffffff"/>
          <circle cx="224.5" cy="190.5" r=".8" fill="#ffffff" opacity=".7"/>
          <path d="M245 189 C239 179 218 177 209 187" fill="none" stroke="#21170f" strokeWidth="2.6" strokeLinecap="round"/>
        </g>
        {/* pliegue y línea inferior de los ojos (no parpadean) */}
          <path d="M158 180 C166 173 182 173 189 179" fill="none" stroke="#b97a5a" strokeWidth="1.6" opacity=".6"/>
          <path d="M160 193 C167 196 179 196 186 192" fill="none" stroke="#c48a69" strokeWidth="1.3" opacity=".8"/>
          <path d="M242 180 C234 173 218 173 211 179" fill="none" stroke="#b97a5a" strokeWidth="1.6" opacity=".6"/>
          <path d="M240 193 C233 196 221 196 214 192" fill="none" stroke="#c48a69" strokeWidth="1.3" opacity=".8"/>

        {/* nariz */}
        <path d="M203 188 C205 202 207 214 208 222" fill="none" stroke="#c4835f" strokeWidth="1.6" opacity=".5"/>
        <ellipse cx="199" cy="219" rx="5" ry="6" fill="#f8d9c2" opacity=".6" filter={u("b2")}/>
        <ellipse cx="193.5" cy="228" rx="3.6" ry="2" fill="#8a523c" opacity=".75" filter={u("b2")}/>
        <ellipse cx="206.5" cy="228" rx="3.6" ry="2" fill="#8a523c" opacity=".75" filter={u("b2")}/>
        <path d="M187 222 C184 226 186 230 190 231" fill="none" stroke="#b5765a" strokeWidth="1.8" strokeLinecap="round" opacity=".75"/>
        <path d="M213 222 C216 226 214 230 210 231" fill="none" stroke="#a96a4e" strokeWidth="1.8" strokeLinecap="round" opacity=".8"/>
        <path d="M192 231 C196 233 204 233 208 231" fill="none" stroke="#c48a69" strokeWidth="1.2" opacity=".5"/>
        {/* surco del labio superior */}
        <path d="M197 233 L196 242 M203 233 L204 242" stroke="#c4835f" strokeWidth="1.3" opacity=".45"/>

        {/* boca: sonrisa amable; se abre con la voz (boca 0..1) */}
        <g className="avatar__boca">
          {abre > 0 && (
            <>
              <path d={`M181 248 C190 ${250 + abre * 1.3} 210 ${250 + abre * 1.3} 219 248 C210 250 190 250 181 248 Z`} fill="#5a2228"/>
              <path d={`M188 248.6 C194 ${249.4 + dientes} 206 ${249.4 + dientes} 212 248.6 Z`} fill="#f4efe9"/>
            </>
          )}
          <path d="M180 248 C188 244 195 244 200 246 C205 244 212 244 220 248 C212 251 188 251 180 248 Z" fill={u("labioSup")}/>
          <g transform={`translate(0 ${abre})`}>
            <path d="M181 248 C190 259 210 259 219 248 C210 252 190 252 181 248 Z" fill={u("labioInf")}/>
            <path d="M191 254 C196 256 204 256 209 254" fill="none" stroke="#e3a9a0" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
          </g>
          {abre === 0 && <path d="M180 248 C190 251 210 251 220 248" fill="none" stroke="#6e3631" strokeWidth="1.6" strokeLinecap="round"/>}
          <path d="M176 246 C178 248 179 249 181 249 M224 246 C222 248 221 249 219 249" stroke="#a96b50" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".8"/>
        </g>
      </g>
      </g>
      {/* insignia ICA sobre el borde, a la altura del hombro */}
      <g filter={u("sombraIns")}>
        <circle cx="340" cy="346" r="45" fill="#ffffff"/>
        <circle cx="340" cy="346" r="40" fill="#191d20"/>
        <g clipPath={u("insignia")}><image href={logoICA} x="301" y="307" width="74" height="74"/></g>
        <circle cx="340" cy="346" r="40" fill="none" stroke="#3f7fbf" strokeWidth="1.5"/>
      </g>

      {/* Indicador: pensando */}
      {estado === "pensando" && (
        <g className="avatar__pensando">
          <circle cx="296" cy="74" r="7" fill="#ffffff" />
          <circle cx="318" cy="74" r="7" fill="#ffffff" />
          <circle cx="340" cy="74" r="7" fill="#ffffff" />
        </g>
      )}

      {/* Indicador: hablando */}
      {estado === "hablando" && (
        <g className="avatar__ondas" fill="none" stroke="#bfe6ff" strokeWidth="4" strokeLinecap="round">
          <path d="M316 176 C324 186 324 202 316 212" />
          <path d="M332 164 C346 182 346 206 332 224" />
          <path d="M84 176 C76 186 76 202 84 212" />
          <path d="M68 164 C54 182 54 206 68 224" />
        </g>
      )}
      </g>
    </svg>
  );
          }
            
