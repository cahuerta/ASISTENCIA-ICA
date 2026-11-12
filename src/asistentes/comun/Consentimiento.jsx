// src/asistentes/comun/Consentimiento.jsx
// Consentimiento para usar los asistentes de voz (Ica, Ipo y Sophia), antes de la
// primera pregunta. El texto vigente y su versión vienen de la ficha (mismo sistema
// de firmas que los contratos: Superadmin → Contratos → "asistentes"). Al aceptar se
// registra la versión, la fecha, la IP y un id al azar del equipo; el equipo recuerda
// la versión aceptada y no vuelve a preguntar hasta que el texto cambie.
import { useEffect, useState } from "react";

const FICHA_API = import.meta.env.VITE_FICHA_API || "https://services.icarticular.cl";
const CLAVE = "hipokratia_consentimiento_asistentes";
const CLAVE_EQUIPO = "hipokratia_equipo";

const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

function idEquipo() {
  let id = leer(CLAVE_EQUIPO);
  if (!id) {
    id = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`).replace(/[^A-Za-z0-9-]/g, "");
    guardar(CLAVE_EQUIPO, id);
  }
  return id;
}

/** Texto vigente; null si no se pudo leer. */
export async function consentimientoVigente() {
  const r = await fetch(`${FICHA_API}/api/contratos/publico/asistentes`);
  if (!r.ok) throw new Error(`Error ${r.status}`);
  return r.json();
}

/** true si este equipo aceptó alguna vez (sin preguntar al servidor: sirve para partir dentro del toque). */
export const aceptadoEnEsteEquipo = () => !!leer(CLAVE);

/** true si este equipo ya aceptó la versión vigente. */
export const yaAceptado = (c) => !!c && leer(CLAVE) === `${c.version}:${c.hash}`;

function negritas(t) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p);
}

export default function Consentimiento({ onAceptar, onCancelar }) {
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cargar = () => {
    setError("");
    consentimientoVigente().then(setC).catch(() => setError("No pude cargar el consentimiento. Revisa tu conexión."));
  };
  useEffect(cargar, []);

  // Ya aceptado en este equipo (versión vigente): sigue sin preguntar
  useEffect(() => { if (yaAceptado(c)) onAceptar(); }, [c]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se parte de inmediato (dentro del toque: así el navegador deja usar micrófono y voz)
  // y el registro se envía en segundo plano, con reintentos.
  const aceptar = () => {
    const datos = JSON.stringify({ version: c.version, hash: c.hash, dispositivo: idEquipo() });
    guardar(CLAVE, `${c.version}:${c.hash}`);
    setEnviando(true);
    onAceptar();
    const enviar = (intento) =>
      fetch(`${FICHA_API}/api/contratos/publico/asistentes/aceptar`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: datos,
      }).then((r) => { if (!r.ok && r.status >= 500) throw new Error(); })
        .catch(() => { if (intento < 3) setTimeout(() => enviar(intento + 1), 3000 * intento); });
    enviar(1);
  };

  return (
    <div style={E.fondo}>
      <div role="dialog" aria-label="Consentimiento" style={E.caja}>
        <div style={E.cabeza}>
          <p style={E.titulo}>{c?.titulo || "Consentimiento"}</p>
          {c && <p style={E.version}>Versión {c.version}</p>}
        </div>
        <div style={E.cuerpo}>
          {!c && !error && <p style={E.suave}>Cargando…</p>}
          {c && c.texto.split(/\n\s*\n|\n(?=\d+\. )/).map((b, i) => (
            <p key={i} style={E.parrafo}>{negritas(b.trim())}</p>
          ))}
        </div>
        <div style={E.pie}>
          {c && (
            <label style={E.check}>
              <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
              Leí y acepto. Doy mi consentimiento para que se traten mis datos de salud como se explica.
            </label>
          )}
          {error && (
            <p style={E.error}>
              {error} {!c && <button type="button" style={E.enlace} onClick={cargar}>Reintentar</button>}
            </p>
          )}
          <div style={E.botones}>
            <button type="button" style={E.secundario} onClick={onCancelar}>Ahora no</button>
            <button type="button" style={{ ...E.primario, opacity: acepto && c ? 1 : 0.5 }}
              disabled={!acepto || !c || enviando} onClick={aceptar}>
              {enviando ? "Registrando…" : "Aceptar y comenzar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const E = {
  fondo: { position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "grid", placeItems: "center", zIndex: 4000, padding: 12 },
  caja: { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", color: "#0f172a" },
  cabeza: { padding: "14px 18px", borderBottom: "1px solid #e2e8f0" },
  titulo: { margin: 0, fontSize: 17, fontWeight: 800, color: "#1B3B8C" },
  version: { margin: "2px 0 0", fontSize: 12, color: "#64748b" },
  cuerpo: { padding: "12px 18px", overflowY: "auto", fontSize: 14, lineHeight: 1.5, flex: 1 },
  parrafo: { margin: "0 0 10px" },
  suave: { color: "#94a3b8" },
  pie: { padding: "12px 18px", borderTop: "1px solid #e2e8f0", display: "grid", gap: 10 },
  check: { display: "flex", gap: 8, fontSize: 14, fontWeight: 600, alignItems: "flex-start", cursor: "pointer" },
  error: { margin: 0, color: "#dc2626", fontSize: 13 },
  enlace: { background: "none", border: "none", color: "#1B3B8C", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: 13 },
  botones: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  primario: { padding: "11px 18px", borderRadius: 10, border: "none", background: "#1B3B8C", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  secundario: { padding: "11px 18px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, fontSize: 15, cursor: "pointer" },
};
