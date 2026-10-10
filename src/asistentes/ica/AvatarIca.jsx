/**
 * ica/AvatarIca.jsx
 * Ica, la recepcionista: retrato plano con luces y sombras, mismo estilo que
 * Ipo (ipo/AvatarIpo.jsx). Joven, melena castaña a los hombros con raya al
 * costado, aros de perla, delantal blanco con blusa azul ICA. Fondo azul ICA y
 * la insignia del logo ICA sobre el hombro izquierdo (Ipo la lleva al derecho:
 * juntos quedan hacia afuera).
 *
 * Se mueve solo:
 *   - parpadea y respira (muy suave),
 *   - levanta las cejas al escuchar,
 *   - abre la boca con la voz (prop boca 0..1, la que entrega useVoz),
 *   - halo de estado (escuchando / pensando / hablando), puntos al pensar y
 *     ondas al hablar, con las mismas clases de comun/asistentes.css.
 *
 * Mismo tamaño que antes (viewBox 400 x 460): calza en la pantalla, en el botón
 * del widget y en la miniatura sin tocar PantallaAsistentes.jsx.
 * Ids del SVG únicos por instancia (useId).
 *
 * Props: estado ("reposo" | "escuchando" | "pensando" | "hablando"), boca (0..1).
 */
import { useId } from "react";
import "../comun/asistentes.css";
import logoICA from "../../assets/ica.jpg";

// Respiración: el cuerpo y la cabeza suben y bajan apenas
const ESTILO = `
.ica-respira { animation: ica-respira 4.4s ease-in-out infinite; }
@keyframes ica-respira { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
`;

export default function AvatarIca({ estado = "reposo", boca = 0 }) {
  const base = "ica" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n) => `${base}-${n}`;
  const u = (n) => `url(#${id(n)})`;

  // Apertura de la boca: el labio inferior baja hasta 8 px
  const apertura = Math.max(0, Math.min(1, Number(boca) || 0));
  const abre = apertura > 0.04 ? Math.round(apertura * 8 * 10) / 10 : 0;
  const dientes = Math.min(3, abre * 0.4);

  return (
    <svg
      className={`avatar avatar--${estado}`}
      viewBox="0 0 400 460"
      role="img"
      aria-label={`Ica, recepción de ICA, ${estado}`}
    >
      <style>{ESTILO}</style>
      <g transform="translate(0 12)">
            <defs>
        <radialGradient id={id("fondo")} cx="50%" cy="38%" r="70%"><stop offset="0" stopColor="#6f9cc8"/><stop offset=".55" stopColor="#3a679a"/><stop offset="1" stopColor="#1c3c66"/></radialGradient>
        <linearGradient id={id("gradHalo")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1A5FB4"/><stop offset="1" stopColor="#14A39A"/></linearGradient>
        <radialGradient id={id("halo")} cx="50%" cy="40%" r="55%"><stop offset="0" stopColor="#ffffff" stopOpacity=".9"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
        {/* piel: luz desde arriba a la izquierda */}
        <radialGradient id={id("piel")} cx="42%" cy="36%" r="70%"><stop offset="0" stopColor="#f7d6bd"/><stop offset=".45" stopColor="#eec0a0"/><stop offset=".8" stopColor="#e0a886"/><stop offset="1" stopColor="#d09474"/></radialGradient>
        <linearGradient id={id("cuello")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9785a"/><stop offset=".35" stopColor="#d39674"/><stop offset="1" stopColor="#e0a685"/></linearGradient>
        <linearGradient id={id("oreja")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d0916f"/><stop offset="1" stopColor="#e2a988"/></linearGradient>
        <linearGradient id={id("pelo")} x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stopColor="#704a33"/><stop offset=".5" stopColor="#4b2c1d"/><stop offset="1" stopColor="#2c1a11"/></linearGradient>
        <linearGradient id={id("bata")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset="1" stopColor="#e2e8ef"/></linearGradient>
        <linearGradient id={id("pij")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f62a0"/><stop offset="1" stopColor="#1d4577"/></linearGradient>
        <radialGradient id={id("iris")} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#a07850"/><stop offset=".45" stopColor="#6e4c30"/><stop offset=".82" stopColor="#4a3220"/><stop offset="1" stopColor="#1f150d"/></radialGradient>
        <linearGradient id={id("labioSup")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9606a"/><stop offset="1" stopColor="#9c4a55"/></linearGradient>
        <linearGradient id={id("labioInf")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c46d78"/><stop offset="1" stopColor="#d88a92"/></linearGradient>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef2f6"/><stop offset=".5" stopColor="#9aa6b3"/><stop offset="1" stopColor="#5d6a78"/></linearGradient>
        <filter id={id("b2")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id={id("b4")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
        <filter id={id("b7")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
        <clipPath id={id("insignia")}><circle cx="60" cy="346" r="40"/></clipPath>
        <filter id={id("sombraIns")} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0b1e38" floodOpacity=".45"/></filter>
        <clipPath id={id("circ")}><circle cx="200" cy="214" r="186"/></clipPath>
        <clipPath id={id("caraClip")}><path id={id("caraPath")} d="M200 106 C240 106 268 132 270 172 C272 202 265 226 253 244 C241 264 222 278 200 280 C178 278 159 264 147 244 C135 226 128 202 130 172 C132 132 160 106 200 106 Z"/></clipPath>
        <clipPath id={id("ojoI")}><path d="M157 189 C163 181 181 180 189 188 C182 194 164 195 157 189 Z"/></clipPath>
        <clipPath id={id("ojoD")}><path d="M243 189 C237 181 219 180 211 188 C218 194 236 195 243 189 Z"/></clipPath>
      </defs>

      {/* anillo fijo + halo que cambia según el estado (escucha, piensa, habla) */}
      <circle cx="200" cy="214" r="194" fill="none" stroke="#3f7fbf" strokeWidth="4" opacity=".55"/>
      <circle className="avatar__halo" cx="200" cy="214" r="194" fill="none" stroke={u("gradHalo")} strokeWidth="6"/>
      <circle cx="200" cy="214" r="186" fill={u("fondo")}/>
      <circle cx="200" cy="200" r="120" fill={u("halo")} opacity=".18"/>

      <g clipPath={u("circ")}>
      <g className="ica-respira">
        {/* ===== CUERPO ===== */}
        {/* sombra del cuello sobre la bata */}
        <ellipse cx="200" cy="330" rx="70" ry="14" fill="#9fb0c3" opacity=".45" filter={u("b7")}/>
        {/* bata */}
        <path d="M34 454 C38 384 84 338 154 320 L246 320 C316 338 362 384 366 454 Z" fill={u("bata")}/>
        {/* pliegues de la bata */}
        <path d="M86 454 C92 410 108 380 132 360" fill="none" stroke="#cfd8e2" strokeWidth="3" opacity=".8" filter={u("b2")}/>
        <path d="M314 454 C308 410 292 380 268 360" fill="none" stroke="#cfd8e2" strokeWidth="3" opacity=".8" filter={u("b2")}/>
        <path d="M60 420 C80 400 100 392 120 390" fill="none" stroke="#dfe6ee" strokeWidth="2" opacity=".9"/>
        {/* melena por detrás, a los hombros */}
        <path d="M124 170 C112 98 156 66 206 66 C260 66 298 102 282 172 C280 222 286 262 302 298 C294 318 268 320 254 306 C246 314 240 320 236 324 L164 324 C160 320 154 314 146 306 C132 320 106 318 98 298 C114 262 120 222 124 170 Z" fill={u("pelo")}/>
        <path d="M110 296 C120 268 126 236 128 206 M290 296 C280 268 274 236 272 206" fill="none" stroke="#86593f" strokeWidth="2.5" opacity=".45"/>
        <path d="M104 300 C112 308 126 312 140 306 M296 300 C288 308 274 312 260 306" fill="none" stroke="#2a170e" strokeWidth="2" opacity=".5"/>
        <ellipse cx="200" cy="280" rx="44" ry="40" fill="#1a0e08" opacity=".45" filter={u("b7")}/>
        {/* cuello de la persona */}
        <path d="M174 256 C176 288 172 308 164 324 L236 324 C228 308 224 288 226 256 Z" fill={u("cuello")}/>
        <path d="M174 262 C186 290 214 290 226 262 L226 280 C214 302 186 302 174 280 Z" fill="#a8684b" opacity=".5" filter={u("b2")}/>
        {/* esternocleidomastoideo sugerido */}
        <path d="M182 292 C186 304 192 314 196 322 M218 292 C214 304 208 314 204 322" fill="none" stroke="#c48262" strokeWidth="2" opacity=".45" filter={u("b2")}/>
        {/* pijama en V */}
        <path d="M154 320 L200 388 L246 320 Z" fill={u("pij")}/>
        <path d="M170 320 L200 364 L230 320 Z" fill="#dda182"/>
        <path d="M170 320 L200 364 L230 320" fill="none" stroke="#163a66" strokeWidth="2.5"/>
        <path d="M180 320 L200 350 L220 320 Z" fill="#c98b6b" opacity=".35" filter={u("b2")}/>
        {/* solapas con sombra */}
        <path d="M154 320 L204 404 L180 454 L120 454 L146 382 L132 338 Z" fill="#9fb0c3" opacity=".35" filter={u("b4")}/>
        <path d="M154 320 L200 400 L176 454 L124 454 L148 382 L134 340 Z" fill="#fbfcfd" stroke="#d2dae3" strokeWidth="1.5"/>
        <path d="M246 320 L196 404 L220 454 L280 454 L254 382 L268 338 Z" fill="#9fb0c3" opacity=".35" filter={u("b4")}/>
        <path d="M246 320 L200 400 L224 454 L276 454 L252 382 L266 340 Z" fill="#fbfcfd" stroke="#d2dae3" strokeWidth="1.5"/>
        <path d="M148 382 L134 340" stroke="#d2dae3" strokeWidth="1.5"/><path d="M252 382 L266 340" stroke="#d2dae3" strokeWidth="1.5"/>
        {/* ===== CABEZA ===== */}
        {/* orejas */}
        <path d="M133 188 C119 185 114 202 117 218 C120 234 130 240 138 235 C136 218 135 202 133 188 Z" fill={u("oreja")}/>
        <path d="M129 199 C122 205 122 218 129 227 C131 219 131 209 129 199 Z" fill="#b97a5a" opacity=".55"/>
        <path d="M267 188 C281 185 286 202 283 218 C280 234 270 240 262 235 C264 218 265 202 267 188 Z" fill={u("oreja")}/>
        <path d="M271 199 C278 205 278 218 271 227 C269 219 269 209 271 199 Z" fill="#b97a5a" opacity=".55"/>

        <circle cx="123" cy="238" r="3.6" fill="#f4f1ec" stroke="#cfc6bb" strokeWidth=".8"/><circle cx="122" cy="237" r="1.1" fill="#fff"/>
        <circle cx="277" cy="238" r="3.6" fill="#f4f1ec" stroke="#cfc6bb" strokeWidth=".8"/><circle cx="276" cy="237" r="1.1" fill="#fff"/>

        {/* cara */}
        <use href={"#" + id("caraPath")} fill={u("piel")}/>
        <g clipPath={u("caraClip")}>
          {/* planos de luz y sombra */}
          <path d="M126 150 C132 210 146 252 176 282 L120 300 Z" fill="#b8775a" opacity=".22" filter={u("b7")}/>
          <path d="M274 150 C268 210 254 252 224 282 L280 300 Z" fill="#b8775a" opacity=".28" filter={u("b7")}/>
          <ellipse cx="200" cy="140" rx="46" ry="24" fill="#f8dbc4" opacity=".5" filter={u("b7")}/>
          {/* cuencas de los ojos */}
          <ellipse cx="173" cy="186" rx="22" ry="12" fill="#c58565" opacity=".2" filter={u("b4")}/>
          <ellipse cx="227" cy="186" rx="22" ry="12" fill="#c58565" opacity=".2" filter={u("b4")}/>
          {/* pómulos con luz */}
          <ellipse cx="160" cy="214" rx="14" ry="8" fill="#f6d3b8" opacity=".55" filter={u("b4")}/>
          <ellipse cx="240" cy="214" rx="14" ry="8" fill="#f2c9ac" opacity=".4" filter={u("b4")}/>
          {/* rubor */}
          <ellipse cx="160" cy="228" rx="16" ry="10" fill="#f08f8c" opacity=".34" filter={u("b4")}/>
          <ellipse cx="240" cy="228" rx="16" ry="10" fill="#f08f8c" opacity=".34" filter={u("b4")}/>
          {/* sombra lateral de la nariz */}
          <path d="M206 186 C210 204 212 214 214 226 L208 228 C206 214 204 202 202 188 Z" fill="#c07e5e" opacity=".55" filter={u("b2")}/>
          {/* sombra bajo el labio y mentón */}
          <ellipse cx="200" cy="264" rx="12" ry="3.5" fill="#b8775a" opacity=".3" filter={u("b2")}/>
          <ellipse cx="200" cy="278" rx="18" ry="6" fill="#f2c7a8" opacity=".45" filter={u("b4")}/>
        </g>

        {/* pelo: raya al costado, volumen arriba, metido detrás de las orejas */}
        <path d="M132 204 C116 142 144 84 200 80 C258 77 292 128 272 204 C268 184 264 168 254 154 C238 140 212 128 182 122 C166 132 150 146 142 164 C137 176 134 190 132 204 Z" fill={u("pelo")}/>
        <path d="M182 122 C210 128 238 140 254 154 C262 162 266 172 268 182" fill="none" stroke="#2a170e" strokeWidth="2" opacity=".45"/>
        <path d="M180 84 C181 98 182 110 182 122" fill="none" stroke="#2a170e" strokeWidth="2.2" strokeLinecap="round" opacity=".6"/>
        <path d="M188 100 C214 98 246 110 262 136" fill="none" stroke="#c08d68" strokeWidth="11" strokeLinecap="round" opacity=".38" filter={u("b4")}/>
        <path d="M190 96 C218 96 244 108 258 128" fill="none" stroke="#a3735a" strokeWidth="2" strokeLinecap="round" opacity=".6"/>
        <path d="M196 110 C224 112 248 126 262 150" fill="none" stroke="#8d5f45" strokeWidth="1.6" strokeLinecap="round" opacity=".55"/>
        <path d="M174 96 C158 104 146 122 140 146" fill="none" stroke="#a3735a" strokeWidth="2" strokeLinecap="round" opacity=".55"/>
        <g clipPath={u("caraClip")}><path d="M140 170 C150 146 176 128 210 128 C236 134 256 148 266 176 L266 160 C250 140 226 124 196 120 C170 124 148 144 138 166 Z" fill="#8a5034" opacity=".35" filter={u("b4")}/></g>
        {/* cejas finas y arqueadas */}
        <g className="avatar__ceja">
        <path d="M154 171 C160 161 175 157 190 162 C189 164 188 165 186 165 C174 161 163 164 156 172 Z" fill="#3e2619"/>
        <path d="M246 171 C240 161 225 157 210 162 C211 164 212 165 214 165 C226 161 237 164 244 172 Z" fill="#3e2619"/>
        </g>

        {/* ojos (un poco más grandes); blanco, iris y línea superior parpadean */}
        <g transform="translate(200 188) scale(1.1) translate(-200 -188)">
          <g className="avatar__ojos">
            <path d="M157 189 C163 181 181 180 189 188 C182 194 164 195 157 189 Z" fill="#f7f1ec"/>
            <g clipPath={u("ojoI")}>
              <circle cx="173" cy="187.5" r="7.8" fill={u("iris")}/>
              <circle cx="173" cy="187.5" r="7.8" fill="none" stroke="#1b120b" strokeWidth="1.2"/>
              <circle cx="173" cy="187.5" r="3.3" fill="#0d0805"/>
              <path d="M157 186 C164 180 181 179 189 186 L189 184 C181 176 164 177 157 184 Z" fill="#8a5e47" opacity=".35"/>
            </g>
            <circle cx="175.8" cy="185" r="1.8" fill="#ffffff"/>
            <circle cx="170.5" cy="190.5" r=".8" fill="#ffffff" opacity=".7"/>
            <path d="M155 189 C161 179 182 177 191 187" fill="none" stroke="#1a100a" strokeWidth="3" strokeLinecap="round"/><path d="M156 188 C153 187 151 185 150 183" fill="none" stroke="#1a100a" strokeWidth="1.6" strokeLinecap="round"/>
  
            <path d="M243 189 C237 181 219 180 211 188 C218 194 236 195 243 189 Z" fill="#f7f1ec"/>
            <g clipPath={u("ojoD")}>
              <circle cx="227" cy="187.5" r="7.8" fill={u("iris")}/>
              <circle cx="227" cy="187.5" r="7.8" fill="none" stroke="#1b120b" strokeWidth="1.2"/>
              <circle cx="227" cy="187.5" r="3.3" fill="#0d0805"/>
              <path d="M243 186 C236 180 219 179 211 186 L211 184 C219 176 236 177 243 184 Z" fill="#8a5e47" opacity=".35"/>
            </g>
            <circle cx="229.8" cy="185" r="1.8" fill="#ffffff"/>
            <circle cx="224.5" cy="190.5" r=".8" fill="#ffffff" opacity=".7"/>
            <path d="M245 189 C239 179 218 177 209 187" fill="none" stroke="#1a100a" strokeWidth="3" strokeLinecap="round"/><path d="M244 188 C247 187 249 185 250 183" fill="none" stroke="#1a100a" strokeWidth="1.6" strokeLinecap="round"/>
          </g>
          {/* pliegue y línea inferior (no parpadean) */}
          <path d="M158 180 C166 173 182 173 189 179" fill="none" stroke="#b97a5a" strokeWidth="1.6" opacity=".6"/>
          <path d="M160 193 C167 196 179 196 186 192" fill="none" stroke="#c48a69" strokeWidth="1.2" opacity=".4"/>
          <path d="M242 180 C234 173 218 173 211 179" fill="none" stroke="#b97a5a" strokeWidth="1.6" opacity=".6"/>
          <path d="M240 193 C233 196 221 196 214 192" fill="none" stroke="#c48a69" strokeWidth="1.2" opacity=".4"/>
        </g>

        {/* nariz */}
        <path d="M202 194 C203 204 204 212 205 218" fill="none" stroke="#c4835f" strokeWidth="1.6" opacity=".5"/>
        <ellipse cx="199" cy="219" rx="5" ry="6" fill="#f8d9c2" opacity=".6" filter={u("b2")}/>
        <ellipse cx="195" cy="225" rx="2.8" ry="1.6" fill="#8a523c" opacity=".75" filter={u("b2")}/>
        <ellipse cx="205" cy="225" rx="2.8" ry="1.6" fill="#8a523c" opacity=".75" filter={u("b2")}/>
        <path d="M190 220 C188 223 189 227 192 228" fill="none" stroke="#b5765a" strokeWidth="1.8" strokeLinecap="round" opacity=".75"/>
        <path d="M210 220 C212 223 211 227 208 228" fill="none" stroke="#a96a4e" strokeWidth="1.8" strokeLinecap="round" opacity=".8"/>
        <path d="M193 229 C196 231 204 231 207 229" fill="none" stroke="#c48a69" strokeWidth="1.2" opacity=".5"/>
        {/* surco del labio superior */}
        <path d="M197 233 L196 242 M203 233 L204 242" stroke="#c4835f" strokeWidth="1.3" opacity=".45"/>

        {/* boca: sonrisa amable; se abre con la voz (boca 0..1) */}
        <g className="avatar__boca">
          {abre > 0 && (
            <>
              <path d={`M184 248 C191 ${250 + abre * 1.3} 209 ${250 + abre * 1.3} 216 248 C209 250 191 250 184 248 Z`} fill="#5a2228"/>
              <path d={`M189 248.6 C194 ${249.4 + dientes} 206 ${249.4 + dientes} 211 248.6 Z`} fill="#f6f1ec"/>
            </>
          )}
          <path d="M183 248 C189 243 195 243 200 245.5 C205 243 211 243 217 248 C210 251 190 251 183 248 Z" fill={u("labioSup")}/>
          <g transform={`translate(0 ${abre})`}>
            <path d="M184 248 C191 260 209 260 216 248 C210 252 190 252 184 248 Z" fill={u("labioInf")}/>
            <path d="M192 254 C196 256 204 256 208 254" fill="none" stroke="#f0b4b8" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
          </g>
          {abre === 0 && <path d="M183 248 C190 251 210 251 217 248" fill="none" stroke="#7a3640" strokeWidth="1.5" strokeLinecap="round"/>}
          <path d="M179 246 C181 248 182 249 184 249 M221 246 C219 248 218 249 216 249" stroke="#b06f5a" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".7"/>
        </g>
      </g>
      </g>
      {/* insignia ICA sobre el borde, a la altura del hombro */}
      <g filter={u("sombraIns")}>
        <circle cx="60" cy="346" r="45" fill="#ffffff"/>
        <circle cx="60" cy="346" r="40" fill="#191d20"/>
        <g clipPath={u("insignia")}><image href={logoICA} x="21" y="307" width="74" height="74"/></g>
        <circle cx="60" cy="346" r="40" fill="none" stroke="#3f7fbf" strokeWidth="1.5"/>
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
