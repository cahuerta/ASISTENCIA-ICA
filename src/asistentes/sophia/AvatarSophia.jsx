/**
 * sophia/AvatarSophia.jsx
 * Sophia, la investigadora: retrato plano con luces y sombras, mismo estilo que
 * Ica e Ipo. Pelo oscuro tomado en un moño (de laboratorio), lentes de marco fino,
 * bata blanca de laboratorio con lápices en el bolsillo y blusa lila. Fondo verde
 * azulado con moléculas, para que se distinga de Ica e Ipo (fondo azul), y la
 * insignia del logo ICA sobre el hombro derecho.
 *
 * Se mueve solo:
 *   - parpadea y respira (muy suave); los lentes no parpadean,
 *   - levanta las cejas al escuchar,
 *   - abre la boca con la voz (prop boca 0..1, la que entrega useVoz),
 *   - halo de estado (escuchando / pensando / hablando), puntos al pensar y
 *     ondas al hablar, con las mismas clases de comun/asistentes.css.
 *
 * Mismo tamaño que Ica e Ipo (viewBox 400 x 460): calza en la pantalla, en el
 * botón del widget y en la miniatura. Ids del SVG únicos por instancia (useId).
 *
 * Props: estado ("reposo" | "escuchando" | "pensando" | "hablando"), boca (0..1).
 */
import { useId } from "react";
import "../comun/asistentes.css";
import logoICA from "../../assets/ica.jpg";

// Respiración: el cuerpo y la cabeza suben y bajan apenas
const ESTILO = `
.sophia-respira { animation: sophia-respira 4.6s ease-in-out infinite; }
@keyframes sophia-respira { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
`;

// Moléculas del fondo: [cx, cy, radio]
const MOLECULAS = [[92, 118, 15], [312, 104, 12], [74, 236, 10], [328, 250, 13]];

function hexagono(cx, cy, r) {
  const puntos = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    puntos.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return puntos.join(" ");
}

export default function AvatarSophia({ estado = "reposo", boca = 0 }) {
  const base = "sophia" + useId().replace(/[^a-zA-Z0-9]/g, "");
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
      aria-label={`Sophia, investigadora de ICA, ${estado}`}
    >
      <style>{ESTILO}</style>
      <g transform="translate(0 12)">
      <defs>
        <radialGradient id={id("fondo")} cx="50%" cy="38%" r="70%"><stop offset="0" stopColor="#7cc9bd"/><stop offset=".55" stopColor="#2f8f86"/><stop offset="1" stopColor="#14504d"/></radialGradient>
        <linearGradient id={id("gradHalo")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#14A39A"/><stop offset="1" stopColor="#7B6BD0"/></linearGradient>
        <radialGradient id={id("halo")} cx="50%" cy="40%" r="55%"><stop offset="0" stopColor="#ffffff" stopOpacity=".9"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
        {/* piel: luz desde arriba a la izquierda */}
        <radialGradient id={id("piel")} cx="42%" cy="36%" r="70%"><stop offset="0" stopColor="#f5d2b6"/><stop offset=".45" stopColor="#ebbb98"/><stop offset=".8" stopColor="#dca37f"/><stop offset="1" stopColor="#cb8f6d"/></radialGradient>
        <linearGradient id={id("cuello")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b5755a"/><stop offset=".35" stopColor="#d09272"/><stop offset="1" stopColor="#dda282"/></linearGradient>
        <linearGradient id={id("oreja")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#cd8e6d"/><stop offset="1" stopColor="#dfa685"/></linearGradient>
        <linearGradient id={id("pelo")} x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stopColor="#3a2722"/><stop offset=".5" stopColor="#24170f"/><stop offset="1" stopColor="#120b07"/></linearGradient>
        <radialGradient id={id("mono")} cx="45%" cy="40%" r="60%"><stop offset="0" stopColor="#4a332b"/><stop offset=".6" stopColor="#24170f"/><stop offset="1" stopColor="#0f0905"/></radialGradient>
        <linearGradient id={id("bata")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset="1" stopColor="#e3e9ee"/></linearGradient>
        <linearGradient id={id("blusa")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8f7fd4"/><stop offset="1" stopColor="#6656b0"/></linearGradient>
        <radialGradient id={id("iris")} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#7d9a6a"/><stop offset=".45" stopColor="#566f45"/><stop offset=".82" stopColor="#3a4c2e"/><stop offset="1" stopColor="#1b2414"/></radialGradient>
        <linearGradient id={id("labioSup")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b35d66"/><stop offset="1" stopColor="#954650"/></linearGradient>
        <linearGradient id={id("labioInf")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bf6a74"/><stop offset="1" stopColor="#d4878f"/></linearGradient>
        <linearGradient id={id("lente")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".22"/><stop offset=".5" stopColor="#ffffff" stopOpacity=".04"/><stop offset="1" stopColor="#bfe9ff" stopOpacity=".14"/></linearGradient>
        <filter id={id("b2")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id={id("b4")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
        <filter id={id("b7")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
        <clipPath id={id("insignia")}><circle cx="340" cy="346" r="40"/></clipPath>
        <filter id={id("sombraIns")} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0b2b28" floodOpacity=".45"/></filter>
        <clipPath id={id("circ")}><circle cx="200" cy="214" r="186"/></clipPath>
        <clipPath id={id("caraClip")}><path id={id("caraPath")} d="M200 106 C240 106 268 132 270 172 C272 202 265 226 253 244 C241 264 222 278 200 280 C178 278 159 264 147 244 C135 226 128 202 130 172 C132 132 160 106 200 106 Z"/></clipPath>
        <clipPath id={id("ojoI")}><path d="M157 189 C163 181 181 180 189 188 C182 194 164 195 157 189 Z"/></clipPath>
        <clipPath id={id("ojoD")}><path d="M243 189 C237 181 219 180 211 188 C218 194 236 195 243 189 Z"/></clipPath>
      </defs>

      {/* anillo fijo + halo que cambia según el estado (escucha, piensa, habla) */}
      <circle cx="200" cy="214" r="194" fill="none" stroke="#2fa39a" strokeWidth="4" opacity=".55"/>
      <circle className="avatar__halo" cx="200" cy="214" r="194" fill="none" stroke={u("gradHalo")} strokeWidth="6"/>
      <circle cx="200" cy="214" r="186" fill={u("fondo")}/>
      <circle cx="200" cy="200" r="120" fill={u("halo")} opacity=".18"/>

      <g clipPath={u("circ")}>
        {/* moléculas del laboratorio (fondo) */}
        <g fill="none" stroke="#ffffff" strokeWidth="2" opacity=".16">
          {MOLECULAS.map(([cx, cy, r], i) => <polygon key={i} points={hexagono(cx, cy, r)}/>)}
          <path d="M107 118 L128 128 M300 112 L284 126 M84 236 L98 222 M315 250 L298 238"/>
          <circle cx="132" cy="130" r="4" fill="#ffffff"/><circle cx="281" cy="128" r="3.5" fill="#ffffff"/>
          <circle cx="101" cy="219" r="3" fill="#ffffff"/><circle cx="295" cy="236" r="3.5" fill="#ffffff"/>
        </g>

      <g className="sophia-respira">
        {/* ===== CUERPO ===== */}
        {/* sombra del cuello sobre la bata */}
        <ellipse cx="200" cy="330" rx="70" ry="14" fill="#93a8b5" opacity=".45" filter={u("b7")}/>
        {/* bata de laboratorio */}
        <path d="M30 454 C34 382 82 336 154 318 L246 318 C318 336 366 382 370 454 Z" fill={u("bata")}/>
        {/* pliegues de la bata */}
        <path d="M84 454 C90 410 106 380 130 360" fill="none" stroke="#cdd7df" strokeWidth="3" opacity=".8" filter={u("b2")}/>
        <path d="M316 454 C310 410 294 380 270 360" fill="none" stroke="#cdd7df" strokeWidth="3" opacity=".8" filter={u("b2")}/>
        <path d="M58 420 C78 400 98 392 118 390" fill="none" stroke="#dde5ec" strokeWidth="2" opacity=".9"/>
        {/* cuello de la persona */}
        <path d="M174 256 C176 288 172 308 164 324 L236 324 C228 308 224 288 226 256 Z" fill={u("cuello")}/>
        <path d="M174 262 C186 290 214 290 226 262 L226 280 C214 302 186 302 174 280 Z" fill="#a4654a" opacity=".5" filter={u("b2")}/>
        <path d="M182 292 C186 304 192 314 196 322 M218 292 C214 304 208 314 204 322" fill="none" stroke="#c0805f" strokeWidth="2" opacity=".45" filter={u("b2")}/>
        {/* blusa lila con cuello */}
        <path d="M152 318 L200 392 L248 318 Z" fill={u("blusa")}/>
        <path d="M170 318 L200 362 L230 318 Z" fill="#d79c7d"/>
        <path d="M180 318 L200 348 L220 318 Z" fill="#c4886a" opacity=".35" filter={u("b2")}/>
        {/* cuello de la blusa */}
        <path d="M166 316 L200 364 L186 368 L158 326 Z" fill="#a597e2" stroke="#5c4ca3" strokeWidth="1.5"/>
        <path d="M234 316 L200 364 L214 368 L242 326 Z" fill="#a597e2" stroke="#5c4ca3" strokeWidth="1.5"/>
        <circle cx="200" cy="378" r="2.6" fill="#f3f0ff"/>
        {/* solapas de la bata (con muesca), con sombra */}
        <path d="M152 318 L204 404 L180 454 L118 454 L144 382 L130 346 L140 334 Z" fill="#93a8b5" opacity=".35" filter={u("b4")}/>
        <path d="M152 318 L200 400 L176 454 L122 454 L146 382 L132 348 L142 336 Z" fill="#fbfcfd" stroke="#d0d9e1" strokeWidth="1.5"/>
        <path d="M248 318 L196 404 L220 454 L282 454 L256 382 L270 346 L260 334 Z" fill="#93a8b5" opacity=".35" filter={u("b4")}/>
        <path d="M248 318 L200 400 L224 454 L278 454 L254 382 L268 348 L258 336 Z" fill="#fbfcfd" stroke="#d0d9e1" strokeWidth="1.5"/>
        <path d="M146 382 L132 348" stroke="#d0d9e1" strokeWidth="1.5"/><path d="M254 382 L268 348" stroke="#d0d9e1" strokeWidth="1.5"/>
        {/* bolsillo con lápices (lado izquierdo de la imagen) */}
        <path d="M112 360 L109 340" stroke="#2c5aa0" strokeWidth="4" strokeLinecap="round"/>
        <path d="M122 360 L123 336" stroke="#14A39A" strokeWidth="4" strokeLinecap="round"/>
        <path d="M123 336 L123 332" stroke="#c9d2da" strokeWidth="4" strokeLinecap="round"/>
        <path d="M100 354 L136 354 L134 384 L102 384 Z" fill="#f4f7f9" stroke="#cdd7df" strokeWidth="1.5"/>
        <path d="M100 354 L136 354" stroke="#b9c5cf" strokeWidth="2"/>

        {/* ===== CABEZA ===== */}
        {/* moño, detrás de la cabeza */}
        <ellipse cx="206" cy="84" rx="34" ry="28" fill={u("mono")}/>
        <path d="M180 82 C188 66 214 60 230 74" fill="none" stroke="#5a4036" strokeWidth="2.2" strokeLinecap="round" opacity=".7"/>
        <path d="M186 96 C198 88 216 88 228 96" fill="none" stroke="#0a0604" strokeWidth="2" opacity=".55"/>
        {/* orejas */}
        <path d="M133 188 C119 185 114 202 117 218 C120 234 130 240 138 235 C136 218 135 202 133 188 Z" fill={u("oreja")}/>
        <path d="M129 199 C122 205 122 218 129 227 C131 219 131 209 129 199 Z" fill="#b5775a" opacity=".55"/>
        <path d="M267 188 C281 185 286 202 283 218 C280 234 270 240 262 235 C264 218 265 202 267 188 Z" fill={u("oreja")}/>
        <path d="M271 199 C278 205 278 218 271 227 C269 219 269 209 271 199 Z" fill="#b5775a" opacity=".55"/>
        {/* aros pequeños dorados */}
        <circle cx="123" cy="236" r="3" fill="#e2b85c" stroke="#a9832f" strokeWidth=".8"/>
        <circle cx="277" cy="236" r="3" fill="#e2b85c" stroke="#a9832f" strokeWidth=".8"/>

        {/* cara */}
        <use href={"#" + id("caraPath")} fill={u("piel")}/>
        <g clipPath={u("caraClip")}>
          <path d="M126 150 C132 210 146 252 176 282 L120 300 Z" fill="#b4735a" opacity=".22" filter={u("b7")}/>
          <path d="M274 150 C268 210 254 252 224 282 L280 300 Z" fill="#b4735a" opacity=".28" filter={u("b7")}/>
          <ellipse cx="200" cy="140" rx="46" ry="24" fill="#f7d9c2" opacity=".5" filter={u("b7")}/>
          <ellipse cx="173" cy="186" rx="22" ry="12" fill="#c18163" opacity=".2" filter={u("b4")}/>
          <ellipse cx="227" cy="186" rx="22" ry="12" fill="#c18163" opacity=".2" filter={u("b4")}/>
          <ellipse cx="160" cy="214" rx="14" ry="8" fill="#f4d0b4" opacity=".55" filter={u("b4")}/>
          <ellipse cx="240" cy="214" rx="14" ry="8" fill="#f0c6a8" opacity=".4" filter={u("b4")}/>
          <ellipse cx="160" cy="230" rx="16" ry="10" fill="#ec8c88" opacity=".28" filter={u("b4")}/>
          <ellipse cx="240" cy="230" rx="16" ry="10" fill="#ec8c88" opacity=".28" filter={u("b4")}/>
          <path d="M206 186 C210 204 212 214 214 226 L208 228 C206 214 204 202 202 188 Z" fill="#bc7b5c" opacity=".55" filter={u("b2")}/>
          <ellipse cx="200" cy="264" rx="12" ry="3.5" fill="#b4735a" opacity=".3" filter={u("b2")}/>
          <ellipse cx="200" cy="278" rx="18" ry="6" fill="#f0c4a5" opacity=".45" filter={u("b4")}/>
        </g>

        {/* pelo tirado hacia atrás, raya al costado y un mechón suelto */}
        <path d="M132 204 C118 146 144 92 200 88 C256 85 288 132 270 204 C267 186 263 170 255 156 C240 140 214 128 184 124 C168 132 152 146 144 164 C138 177 135 190 132 204 Z" fill={u("pelo")}/>
        <path d="M176 92 C178 104 180 114 184 124" fill="none" stroke="#0a0604" strokeWidth="2.2" strokeLinecap="round" opacity=".6"/>
        <path d="M188 104 C214 102 244 114 260 138" fill="none" stroke="#7a5a4c" strokeWidth="9" strokeLinecap="round" opacity=".3" filter={u("b4")}/>
        <path d="M190 100 C218 100 244 112 258 132" fill="none" stroke="#5e4338" strokeWidth="2" strokeLinecap="round" opacity=".7"/>
        <path d="M172 100 C156 108 144 126 138 150" fill="none" stroke="#5e4338" strokeWidth="2" strokeLinecap="round" opacity=".6"/>
        <path d="M136 172 C130 190 132 210 138 226" fill="none" stroke="#24170f" strokeWidth="3.2" strokeLinecap="round"/>
        <g clipPath={u("caraClip")}><path d="M140 170 C150 146 176 130 210 130 C236 136 256 150 266 176 L266 160 C250 142 226 126 196 122 C170 126 148 146 138 166 Z" fill="#6e4535" opacity=".35" filter={u("b4")}/></g>

        {/* cejas finas */}
        <g className="avatar__ceja">
          <path d="M152 166 C158 157 174 153 189 158 C188 160 187 161 185 161 C173 157 162 160 154 167 Z" fill="#2a1a12"/>
          <path d="M248 166 C242 157 226 153 211 158 C212 160 213 161 215 161 C227 157 238 160 246 167 Z" fill="#2a1a12"/>
        </g>

        {/* ojos; blanco, iris y línea superior parpadean */}
        <g transform="translate(200 188) scale(1.05) translate(-200 -188)">
          <g className="avatar__ojos">
            <path d="M157 189 C163 181 181 180 189 188 C182 194 164 195 157 189 Z" fill="#f7f1ec"/>
            <g clipPath={u("ojoI")}>
              <circle cx="173" cy="187.5" r="7.6" fill={u("iris")}/>
              <circle cx="173" cy="187.5" r="7.6" fill="none" stroke="#141a0f" strokeWidth="1.2"/>
              <circle cx="173" cy="187.5" r="3.2" fill="#0a0d07"/>
              <path d="M157 186 C164 180 181 179 189 186 L189 184 C181 176 164 177 157 184 Z" fill="#6e5545" opacity=".35"/>
            </g>
            <circle cx="175.8" cy="185" r="1.8" fill="#ffffff"/>
            <circle cx="170.5" cy="190.5" r=".8" fill="#ffffff" opacity=".7"/>
            <path d="M155 189 C161 179 182 177 191 187" fill="none" stroke="#150d08" strokeWidth="2.8" strokeLinecap="round"/><path d="M156 188 C153 187 151 185 150 183" fill="none" stroke="#150d08" strokeWidth="1.5" strokeLinecap="round"/>

            <path d="M243 189 C237 181 219 180 211 188 C218 194 236 195 243 189 Z" fill="#f7f1ec"/>
            <g clipPath={u("ojoD")}>
              <circle cx="227" cy="187.5" r="7.6" fill={u("iris")}/>
              <circle cx="227" cy="187.5" r="7.6" fill="none" stroke="#141a0f" strokeWidth="1.2"/>
              <circle cx="227" cy="187.5" r="3.2" fill="#0a0d07"/>
              <path d="M243 186 C236 180 219 179 211 186 L211 184 C219 176 236 177 243 184 Z" fill="#6e5545" opacity=".35"/>
            </g>
            <circle cx="229.8" cy="185" r="1.8" fill="#ffffff"/>
            <circle cx="224.5" cy="190.5" r=".8" fill="#ffffff" opacity=".7"/>
            <path d="M245 189 C239 179 218 177 209 187" fill="none" stroke="#150d08" strokeWidth="2.8" strokeLinecap="round"/><path d="M244 188 C247 187 249 185 250 183" fill="none" stroke="#150d08" strokeWidth="1.5" strokeLinecap="round"/>
          </g>
          {/* pliegue y línea inferior (no parpadean) */}
          <path d="M158 180 C166 173 182 173 189 179" fill="none" stroke="#b5775a" strokeWidth="1.6" opacity=".6"/>
          <path d="M160 193 C167 196 179 196 186 192" fill="none" stroke="#c08667" strokeWidth="1.2" opacity=".4"/>
          <path d="M242 180 C234 173 218 173 211 179" fill="none" stroke="#b5775a" strokeWidth="1.6" opacity=".6"/>
          <path d="M240 193 C233 196 221 196 214 192" fill="none" stroke="#c08667" strokeWidth="1.2" opacity=".4"/>
        </g>

        {/* lentes de marco fino (no parpadean) */}
        <g>
          <rect x="148" y="171" width="50" height="34" rx="12" fill={u("lente")}/>
          <rect x="202" y="171" width="50" height="34" rx="12" fill={u("lente")}/>
          <rect x="148" y="171" width="50" height="34" rx="12" fill="none" stroke="#2b2f3a" strokeWidth="3"/>
          <rect x="202" y="171" width="50" height="34" rx="12" fill="none" stroke="#2b2f3a" strokeWidth="3"/>
          {/* puente y patillas */}
          <path d="M198 184 C199 180 201 180 202 184" fill="none" stroke="#2b2f3a" strokeWidth="2.6" strokeLinecap="round"/>
          <path d="M148 182 L134 188" stroke="#2b2f3a" strokeWidth="2.6" strokeLinecap="round"/>
          <path d="M252 182 L266 188" stroke="#2b2f3a" strokeWidth="2.6" strokeLinecap="round"/>
          {/* brillo en los cristales */}
          <path d="M156 177 L166 177 M157 182 L161 182" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity=".55"/>
          <path d="M210 177 L220 177 M211 182 L215 182" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity=".55"/>
        </g>

        {/* nariz */}
        <path d="M202 196 C203 205 204 212 205 218" fill="none" stroke="#c0805c" strokeWidth="1.6" opacity=".5"/>
        <ellipse cx="199" cy="219" rx="5" ry="6" fill="#f6d6c0" opacity=".6" filter={u("b2")}/>
        <ellipse cx="195" cy="225" rx="2.8" ry="1.6" fill="#864f3a" opacity=".75" filter={u("b2")}/>
        <ellipse cx="205" cy="225" rx="2.8" ry="1.6" fill="#864f3a" opacity=".75" filter={u("b2")}/>
        <path d="M190 220 C188 223 189 227 192 228" fill="none" stroke="#b07258" strokeWidth="1.8" strokeLinecap="round" opacity=".75"/>
        <path d="M210 220 C212 223 211 227 208 228" fill="none" stroke="#a5674c" strokeWidth="1.8" strokeLinecap="round" opacity=".8"/>
        <path d="M193 229 C196 231 204 231 207 229" fill="none" stroke="#c08667" strokeWidth="1.2" opacity=".5"/>
        <path d="M197 233 L196 242 M203 233 L204 242" stroke="#c0805c" strokeWidth="1.3" opacity=".45"/>

        {/* boca: sonrisa leve; se abre con la voz (boca 0..1) */}
        <g className="avatar__boca">
          {abre > 0 && (
            <>
              <path d={`M184 248 C191 ${250 + abre * 1.3} 209 ${250 + abre * 1.3} 216 248 C209 250 191 250 184 248 Z`} fill="#5a2228"/>
              <path d={`M189 248.6 C194 ${249.4 + dientes} 206 ${249.4 + dientes} 211 248.6 Z`} fill="#f6f1ec"/>
            </>
          )}
          <path d="M183 248 C189 243 195 243 200 245.5 C205 243 211 243 217 248 C210 251 190 251 183 248 Z" fill={u("labioSup")}/>
          <g transform={`translate(0 ${abre})`}>
            <path d="M184 248 C191 259 209 259 216 248 C210 252 190 252 184 248 Z" fill={u("labioInf")}/>
            <path d="M192 253.5 C196 255.5 204 255.5 208 253.5" fill="none" stroke="#eeb0b5" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
          </g>
          {abre === 0 && <path d="M183 248 C190 251 210 251 217 248" fill="none" stroke="#743239" strokeWidth="1.5" strokeLinecap="round"/>}
          <path d="M179 246 C181 248 182 249 184 249 M221 246 C219 248 218 249 216 249" stroke="#aa6b56" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".7"/>
        </g>
      </g>
      </g>

      {/* insignia ICA sobre el borde, a la altura del hombro */}
      <g filter={u("sombraIns")}>
        <circle cx="340" cy="346" r="45" fill="#ffffff"/>
        <circle cx="340" cy="346" r="40" fill="#191d20"/>
        <g clipPath={u("insignia")}><image href={logoICA} x="301" y="307" width="74" height="74"/></g>
        <circle cx="340" cy="346" r="40" fill="none" stroke="#2fa39a" strokeWidth="1.5"/>
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
        <g className="avatar__ondas" fill="none" stroke="#c9f2ea" strokeWidth="4" strokeLinecap="round">
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
