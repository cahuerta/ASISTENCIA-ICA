// src/screens/PantallaAvatar.jsx
// Asistente de voz de ICA: la medica dirige la consulta.
//
// 1. Anamnesis oral guiada (avatar/bancoPreguntas.js): zona, lado, edad, sexo,
//    banderas rojas (grave -> se detiene y deriva a urgencia) y preguntas abiertas.
//    Si no entiende, repregunta una vez; si vuelve a fallar, ofrece botones.
// 2. Puntos dolorosos en el esquema de la zona (mismos mappers de ICA).
// 3. /api/preview-informe (sin cambios en el backend) con la conversacion completa
//    en "consulta" + edad, sexo, zona, lado y puntos.
// 4. La medica dice el diagnostico presuntivo, el fundamento y los examenes.
// 5. "¿Quieres la orden?" -> formulario escrito (nombre, RUT, correo) ->
//    checklist de resonancia si corresponde -> /api/pdf-ia-orden (gratis por ahora).
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "../app.css";
import Avatar from "../avatar/Avatar.jsx";
import useVoz, { vozSoportada } from "../avatar/useVoz.js";
import useEscucha, { escuchaSoportada } from "../avatar/useEscucha.js";
import { PREGUNTAS, FRASES, SALUDO, ZONAS, esColumna } from "../avatar/bancoPreguntas.js";
import {
  interpretarZona, interpretarLado, interpretarEdad, interpretarSexo, interpretarSiNo,
  esRespuestaVacia, construirConsulta, leerInforme, vozResultado, incluyeResonancia,
  formatearRut, validarRut,
} from "../avatar/interpretar.js";
import GenericMapper from "../mappers/GenericMapper.jsx";
import { resolveZonaKey } from "../mappers/mapperRegistry.js";
import FormularioResonancia from "../components/FormularioResonancia.jsx";
import logoICA from "../assets/ica.jpg";

const BACKEND_BASE =
  import.meta?.env?.VITE_BACKEND_BASE || "https://asistencia-ica-backend.onrender.com";

const ZONAS_MAPPER = ["rodilla", "mano", "hombro", "codo", "cadera", "tobillo"];

// Mismo resumen de checklist que usa el modulo IA de ICA
const ETIQUETAS_RM = {
  marcapasos: "Marcapasos/DAI", coclear_o_neuro: "Implante coclear/neuroestimulador",
  clips_aneurisma: "Clips de aneurisma", valvula_cardiaca_metal: "Implante metálico intracraneal",
  fragmentos_metalicos: "Fragmentos metálicos/balas", protesis_placas_tornillos: "Prótesis/placas/tornillos",
  cirugia_reciente_3m: "Cirugía reciente (<3m) con implante", embarazo: "Embarazo o sospecha",
  claustrofobia: "Claustrofobia importante", peso_mayor_150: "Peso > 150 kg",
  no_permanece_inmovil: "Dificultad para inmovilidad", tatuajes_recientes: "Tatuajes/PMU < 6 semanas",
  piercings_no_removibles: "Piercings no removibles", bomba_insulina_u_otro: "Dispositivo externo activo",
  requiere_contraste: "Requiere contraste", erc_o_egfr_bajo: "Insuficiencia renal / eGFR < 30",
  alergia_gadolinio: "Alergia a gadolinio", reaccion_contrastes: "Reacción a contrastes previos",
  requiere_sedacion: "Requiere sedación", ayuno_6h: "Ayuno 6h (si sedación)",
};

function resumenRM(form = {}) {
  const marcadas = Object.keys(ETIQUETAS_RM).filter((k) => form[k] === true).map((k) => `• ${ETIQUETAS_RM[k]}`);
  const partes = [marcadas.length ? marcadas.join("\n") : "• Sin alertas marcadas en checklist."];
  const obs = (form.observaciones || "").trim();
  if (obs) partes.push(`Observaciones: ${obs}`);
  return partes.join("\n");
}

// Borra puntos de sesiones anteriores guardados por los mappers
function limpiarPuntosPrevios() {
  try {
    Object.keys(sessionStorage).forEach((k) => {
      if (ZONAS_MAPPER.some((z) => k.startsWith(`${z}_`) || k.startsWith(`${z}:`)) || k === "resonanciaJSON") {
        sessionStorage.removeItem(k);
      }
    });
  } catch {}
}

async function postJSON(ruta, cuerpo) {
  const res = await fetch(`${BACKEND_BASE}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

class Interrumpido extends Error {}

export default function PantallaAvatar({ onUsarFormulario }) {
  const [fase, setFase] = useState("inicio");
  // inicio | conversacion | puntos | analizando | resultado | datos | resonancia | generando | lista | urgencia | fin | error
  const [pregunta, setPregunta] = useState(null);   // { texto, tipo, respaldo }
  const [entendido, setEntendido] = useState("");
  const [progreso, setProgreso] = useState(0);
  const [informe, setInforme] = useState(null);
  const [ordenUrl, setOrdenUrl] = useState("");
  const [conCorreo, setConCorreo] = useState(false);
  const [error, setError] = useState("");
  const [textoLibre, setTextoLibre] = useState("");
  const [edadEscrita, setEdadEscrita] = useState("");
  const [esperando, setEsperando] = useState(false); // esperando respuesta del paciente

  const { hablar, callar, desbloquear, hablando, boca } = useVoz();

  const sesionRef = useRef(0);            // cada "Comenzar" invalida la conversacion anterior
  const esperaRef = useRef(null);         // resolver de la respuesta que se espera
  const puntosRef = useRef(null);         // resolver del esquema de puntos
  const ctxRef = useRef({});
  const registroRef = useRef([]);
  const idPagoRef = useRef("");
  const avisoRef = useRef(false);
  const escuchaRef = useRef(null);
  const conCorreoRef = useRef(false);

  // ---------- escucha: cada frase completa resuelve la respuesta pendiente ----------
  const alEscuchar = useCallback((texto) => {
    const resolver = esperaRef.current;
    if (!resolver) return;
    esperaRef.current = null;
    setEsperando(false);
    escuchaRef.current?.pausar();
    resolver({ texto });
  }, []);

  const escucha = useEscucha({ onFrase: alEscuchar });
  escuchaRef.current = escucha;

  useEffect(() => () => {
    sesionRef.current += 1;
    callar();
  }, [callar]);

  useEffect(() => () => { if (ordenUrl) URL.revokeObjectURL(ordenUrl); }, [ordenUrl]);

  // ---------- utilidades del flujo ----------
  const vigente = (sesion) => {
    if (sesion !== sesionRef.current) throw new Interrumpido();
  };

  const decir = async (sesion, texto) => {
    vigente(sesion);
    escuchaRef.current?.pausar();
    await hablar(texto);
    vigente(sesion);
  };

  // Respuesta por voz o por el respaldo en pantalla (botones / texto)
  const esperarRespuesta = (sesion) =>
    new Promise((resolve) => {
      esperaRef.current = resolve;
      setEsperando(true);
      if (escuchaSoportada) escuchaRef.current?.reanudar();
    }).then((r) => {
      vigente(sesion);
      return r;
    });

  const responderEnPantalla = (valor) => {
    const resolver = esperaRef.current;
    if (!resolver) return;
    esperaRef.current = null;
    setEsperando(false);
    escuchaRef.current?.pausar();
    resolver({ valor, texto: String(valor) });
  };

  const INTERPRETES = {
    zona: interpretarZona,
    lado: interpretarLado,
    edad: interpretarEdad,
    sexo: interpretarSexo,
    sino: interpretarSiNo,
  };

  const OPCIONES = {
    zona: ZONAS.map((z) => ({ etiqueta: z, valor: z })),
    lado: [{ etiqueta: "Derecho", valor: "Derecha" }, { etiqueta: "Izquierdo", valor: "Izquierda" }],
    sexo: [{ etiqueta: "Hombre", valor: "Masculino" }, { etiqueta: "Mujer", valor: "Femenino" }],
    sino: [{ etiqueta: "Sí", valor: true }, { etiqueta: "No", valor: false }],
  };

  const MOSTRAR = {
    zona: (v) => v,
    lado: (v) => (v === "Derecha" ? "Lado derecho" : "Lado izquierdo"),
    edad: (v) => `${v} años`,
    sexo: (v) => (v === "Masculino" ? "Hombre" : "Mujer"),
    sino: (v) => (v ? "Sí" : "No"),
  };

  // Pregunta cerrada: voz -> si no entiende repregunta -> si falla de nuevo, botones
  const preguntarCerrada = async (sesion, tipo, texto, repregunta) => {
    let intentos = 0;
    let dicho = texto;
    for (;;) {
      const respaldo = !escuchaSoportada || intentos >= 2;
      setPregunta({ texto, tipo, respaldo });
      setEntendido("");
      if (dicho) await decir(sesion, dicho);
      const r = await esperarRespuesta(sesion);
      const valor = r.valor !== undefined ? r.valor : INTERPRETES[tipo](r.texto);
      if (valor !== null && valor !== undefined) {
        setEntendido(MOSTRAR[tipo](valor));
        return { valor, texto: r.texto };
      }
      intentos += 1;
      setEntendido(r.texto ? `No entendí: "${r.texto}"` : "");
      dicho = intentos === 1 ? repregunta : intentos === 2 ? "Puedes tocar tu respuesta en la pantalla." : null;
    }
  };

  const preguntarAbierta = async (sesion, texto) => {
    setPregunta({ texto, tipo: "abierta", respaldo: !escuchaSoportada });
    setEntendido("");
    setTextoLibre("");
    await decir(sesion, texto);
    const r = await esperarRespuesta(sesion);
    setEntendido(r.texto);
    return r.texto;
  };

  // ---------- puntos dolorosos ----------
  const esperarPuntos = (sesion) =>
    new Promise((resolve) => {
      puntosRef.current = resolve;
    }).then((r) => {
      vigente(sesion);
      return r;
    });

  const terminarPuntos = (resultado) => {
    const resolver = puntosRef.current;
    if (!resolver) return;
    puntosRef.current = null;
    resolver(resultado);
  };

  useEffect(() => {
    if (fase !== "puntos") return undefined;
    const volver = () => terminarPuntos(null);
    const eventos = ZONAS_MAPPER.map((z) => `${z}:volver`).concat("mapper:volver");
    eventos.forEach((e) => window.addEventListener(e, volver));
    return () => eventos.forEach((e) => window.removeEventListener(e, volver));
  }, [fase]);

  // ---------- flujo principal ----------
  const conversar = async (sesion) => {
    const ctx = ctxRef.current;
    const registro = registroRef.current;
    const aplicables = () => PREGUNTAS.filter((p) => !p.aplica || p.aplica(ctx));

    setFase("conversacion");
    await decir(sesion, SALUDO);

    for (const p of PREGUNTAS) {
      if (p.aplica && !p.aplica(ctx)) continue;
      setProgreso(Math.round((aplicables().indexOf(p) / (aplicables().length + 1)) * 100));
      const texto = (p.textoSegun && p.textoSegun(ctx)) || p.texto;

      if (p.tipo === "abierta") {
        const resp = await preguntarAbierta(sesion, texto);
        if (p.opcional && esRespuestaVacia(resp)) continue;
        registro.push({ id: p.id, tipo: "abierta", resumen: p.resumen, pregunta: texto, respuesta: resp });
        continue;
      }

      const { valor, texto: dicho } = await preguntarCerrada(sesion, p.tipo, texto, p.repregunta);
      if (["zona", "lado", "edad", "sexo"].includes(p.tipo)) ctx[p.id] = valor;
      if (p.tipo === "sino") {
        registro.push({ id: p.id, bandera: p.bandera, resumen: p.resumen, pregunta: texto, respuesta: dicho, valor });
        if (valor === true && p.bandera === "grave") {
          setFase("urgencia");
          setPregunta(null);
          await decir(sesion, FRASES.urgencia);
          return;
        }
        if (valor === true && p.bandera === "aviso") avisoRef.current = true;
      }
    }
    setProgreso(100);

    // ---------- puntos dolorosos ----------
    let marcadores;
    const mapperId = resolveZonaKey(ctx.zona);
    if (mapperId && !esColumna(ctx.zona)) {
      setPregunta(null);
      setFase("puntos");
      await decir(sesion, FRASES.puntos);
      const r = await esperarPuntos(sesion);
      const porVista = r && Object.values(r).find((v) => v && typeof v === "object" && v.porVista)?.porVista;
      if (porVista) marcadores = { [mapperId]: porVista };
      else if (r?.puntosSeleccionados?.length) marcadores = { [mapperId]: { puntos: r.puntosSeleccionados } };
    }

    await analizar(sesion, marcadores);
  };

  const analizar = async (sesion, marcadores) => {
    const ctx = ctxRef.current;
    setPregunta(null);
    setFase("analizando");
    setError("");
    await decir(sesion, FRASES.analizando);

    idPagoRef.current = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let resultado;
    try {
      const r = await postJSON("/api/preview-informe", {
        idPago: idPagoRef.current,
        consulta: construirConsulta(ctx, registroRef.current),
        edad: ctx.edad,
        genero: ctx.sexo,
        dolor: ctx.zona,
        lado: ctx.lado || "",
        marcadores: marcadores || undefined,
      });
      if (!r.ok) throw new Error(r.error || "Sin respuesta");
      resultado = leerInforme(r.respuesta, r.examenes);
      if (!resultado.examenes.length && !resultado.diagnosticos.length) throw new Error("Informe vacío");
    } catch (e) {
      vigente(sesion);
      setError("No se pudo generar el prediagnóstico.");
      setFase("error");
      await decir(sesion, FRASES.errorAnalisis);
      return;
    }
    vigente(sesion);
    setInforme({ ...resultado, marcadores });
    setFase("resultado");

    const voz = [avisoRef.current ? FRASES.avisoColumna : "", vozResultado(resultado), FRASES.cierre]
      .filter(Boolean)
      .join(" ");
    await decir(sesion, voz);

    const { valor } = await preguntarCerrada(sesion, "sino", FRASES.preguntarOrden, FRASES.repreguntarOrden);
    setPregunta(null);
    if (!valor) {
      setFase("fin");
      await decir(sesion, FRASES.sinOrden);
      return;
    }
    setFase("datos");
    await decir(sesion, FRASES.pedirDatos);
  };

  const comenzar = async () => {
    sesionRef.current += 1;
    const sesion = sesionRef.current;
    callar();
    desbloquear();
    limpiarPuntosPrevios();
    ctxRef.current = {};
    registroRef.current = [];
    avisoRef.current = false;
    esperaRef.current = null;
    setEsperando(false);
    puntosRef.current = null;
    setInforme(null);
    setOrdenUrl("");
    setError("");
    setProgreso(0);
    if (escuchaSoportada) {
      escucha.iniciar(); // pide permiso de microfono
      escucha.pausar();
    }
    try {
      await conversar(sesion);
    } catch (e) {
      if (!(e instanceof Interrumpido)) {
        console.error(e);
        setError("Ocurrió un problema. Intenta de nuevo.");
        setFase("error");
      }
    }
  };

  const reintentarAnalisis = async () => {
    const sesion = sesionRef.current;
    try {
      await analizar(sesion, informe?.marcadores);
    } catch (e) {
      if (!(e instanceof Interrumpido)) setFase("error");
    }
  };

  // ---------- orden ----------
  const generarOrden = async () => {
    const sesion = sesionRef.current;
    setFase("generando");
    setError("");
    try {
      const res = await fetch(`${BACKEND_BASE}/api/pdf-ia-orden/${idPagoRef.current}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      if (sesion !== sesionRef.current) return;
      setOrdenUrl(URL.createObjectURL(blob));
      setFase("lista");
      await hablar(conCorreoRef.current ? FRASES.ordenListaCorreo : FRASES.ordenLista);
    } catch {
      setError("No se pudo generar la orden. Intenta de nuevo.");
      setFase("datos");
    }
  };

  const enviarDatos = async (datos) => {
    setError("");
    try {
      await postJSON("/api/guardar-datos-ia", {
        idPago: idPagoRef.current,
        datosPaciente: { nombre: datos.nombre, rut: datos.rut, email: datos.email || undefined },
      });
    } catch {
      setError("No se pudieron guardar tus datos. Intenta de nuevo.");
      return;
    }
    conCorreoRef.current = Boolean(datos.email);
    setConCorreo(Boolean(datos.email));
    if (incluyeResonancia(informe?.examenes)) {
      setFase("resonancia");
      await hablar(FRASES.resonancia);
      return;
    }
    await generarOrden();
  };

  const guardarResonancia = async (form) => {
    setError("");
    try {
      await postJSON("/api/guardar-datos-ia", {
        idPago: idPagoRef.current,
        resonanciaChecklist: form,
        resonanciaResumenTexto: resumenRM(form),
      });
    } catch {
      setError("No se pudo guardar el checklist. Intenta de nuevo.");
      return;
    }
    await generarOrden();
  };

  // ---------- render ----------
  const estadoAvatar = hablando ? "hablando" : fase === "analizando" || fase === "generando" ? "pensando"
    : esperando && escucha.escuchando ? "escuchando" : "reposo";

  const soportado = vozSoportada;
  const enCurso = fase !== "inicio";
  const avatarGrande = ["inicio", "conversacion", "urgencia", "fin", "analizando"].includes(fase);

  return (
    <div className="app" style={S.pagina}>
      <header style={S.cabecera}>
        <img src={logoICA} alt="ICA" style={S.logo} />
        <div>
          <p style={S.marca}>Instituto de Cirugía Articular</p>
          <p style={S.sub}>Asistente de consulta</p>
        </div>
      </header>

      <main style={S.main}>
        <div style={{ ...S.avatar, ...(avatarGrande ? {} : S.avatarChico) }}>
          <Avatar estado={estadoAvatar} boca={boca} />
        </div>

        {enCurso && fase === "conversacion" && (
          <div style={S.barra}><div style={{ ...S.barraLlena, width: `${progreso}%` }} /></div>
        )}

        {/* ---------- INICIO ---------- */}
        {fase === "inicio" && (
          <section style={S.tarjetaCentro}>
            <h1 style={S.titulo}>Hola, soy tu asistente médica</h1>
            <p style={S.texto}>
              Te haré algunas preguntas por voz, como en una consulta, para orientarte y, si lo necesitas,
              entregarte una orden de exámenes.
            </p>
            {!soportado && (
              <p style={S.aviso}>Tu navegador no permite voz. Igual puedes responder tocando o escribiendo.</p>
            )}
            <button type="button" style={S.btnPrimario} onClick={comenzar}>Comenzar</button>
            <button type="button" style={S.enlace} onClick={onUsarFormulario}>Prefiero usar el formulario</button>
            <p style={S.legal}>Orientación preliminar. No reemplaza la evaluación presencial con un especialista.</p>
          </section>
        )}

        {/* ---------- CONVERSACION ---------- */}
        {fase === "conversacion" && pregunta && (
          <section style={S.tarjeta}>
            <p style={S.preguntaTexto}>{pregunta.texto}</p>

            {escuchaSoportada && esperando && (
              <p style={S.escuchando}>
                {escucha.parcial ? <em>{escucha.parcial}</em> : "Te escucho…"}
              </p>
            )}
            {entendido && <p style={S.entendido}>{entendido}</p>}

            {/* Respaldo: botones para preguntas cerradas */}
            {pregunta.respaldo && OPCIONES[pregunta.tipo] && (
              <div style={S.opciones}>
                {OPCIONES[pregunta.tipo].map((o) => (
                  <button key={String(o.valor)} type="button" style={S.opcion} onClick={() => responderEnPantalla(o.valor)}>
                    {o.etiqueta}
                  </button>
                ))}
              </div>
            )}
            {pregunta.respaldo && pregunta.tipo === "edad" && (
              <form
                style={S.filaEscribir}
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(edadEscrita);
                  if (Number.isInteger(n) && n > 0 && n <= 110) { responderEnPantalla(n); setEdadEscrita(""); }
                }}
              >
                <input style={S.input} inputMode="numeric" placeholder="Edad" value={edadEscrita}
                  onChange={(e) => setEdadEscrita(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                <button type="submit" style={S.btnSecundario}>Listo</button>
              </form>
            )}

            {/* Respaldo: escribir en vez de hablar (preguntas abiertas) */}
            {pregunta.tipo === "abierta" && (
              <form
                style={S.escribir}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (textoLibre.trim()) { responderEnPantalla(textoLibre.trim()); setTextoLibre(""); }
                }}
              >
                <textarea style={S.textarea} rows={2} placeholder="O escribe tu respuesta aquí"
                  value={textoLibre} onChange={(e) => setTextoLibre(e.target.value)} />
                <button type="submit" style={S.btnSecundario} disabled={!textoLibre.trim()}>Enviar</button>
              </form>
            )}
          </section>
        )}

        {/* ---------- PUNTOS DOLOROSOS ---------- */}
        {fase === "puntos" && (
          <section style={S.tarjeta}>
            <p style={S.preguntaTexto}>Marca dónde te duele y toca guardar.</p>
            <GenericMapper
              mapperId={resolveZonaKey(ctxRef.current.zona)}
              ladoInicial={(ctxRef.current.lado || "derecha").toLowerCase()}
              vistaInicial="frente"
              onSave={(r) => terminarPuntos(r)}
              onVolver={() => terminarPuntos(null)}
            />
            <button type="button" style={S.enlace} onClick={() => terminarPuntos(null)}>Omitir este paso</button>
          </section>
        )}

        {fase === "analizando" && <p style={S.estado}>Revisando tu información…</p>}

        {/* ---------- URGENCIA ---------- */}
        {fase === "urgencia" && (
          <section style={{ ...S.tarjetaCentro, ...S.tarjetaAlerta }}>
            <h2 style={S.tituloAlerta}>Necesitas evaluación médica pronto</h2>
            <p style={S.texto}>{FRASES.urgencia}</p>
            <button type="button" style={S.btnSecundario} onClick={comenzar}>Volver a empezar</button>
          </section>
        )}

        {/* ---------- RESULTADO (y pregunta por la orden) ---------- */}
        {informe && ["resultado", "datos", "resonancia", "generando", "lista", "fin"].includes(fase) && (
          <section style={S.tarjeta}>
            {informe.diagnosticos.length > 0 && (
              <>
                <p style={S.rotulo}>Diagnóstico presuntivo</p>
                <ul style={S.lista}>{informe.diagnosticos.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </>
            )}
            {informe.explicacion && (
              <>
                <p style={S.rotulo}>Fundamento</p>
                <p style={S.texto}>{informe.explicacion}</p>
              </>
            )}
            {informe.examenes.length > 0 && (
              <>
                <p style={S.rotulo}>Exámenes propuestos</p>
                <ul style={S.lista}>{informe.examenes.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </>
            )}
            <p style={S.legal}>{FRASES.cierre}</p>

            {fase === "resultado" && pregunta && (
              <>
                <p style={S.preguntaTexto}>{pregunta.texto}</p>
                {escuchaSoportada && esperando && (
                  <p style={S.escuchando}>{escucha.parcial ? <em>{escucha.parcial}</em> : "Te escucho…"}</p>
                )}
                <div style={S.opciones}>
                  <button type="button" style={S.opcion} onClick={() => responderEnPantalla(true)}>Sí, quiero la orden</button>
                  <button type="button" style={S.opcion} onClick={() => responderEnPantalla(false)}>No, gracias</button>
                </div>
              </>
            )}
          </section>
        )}

        {fase === "datos" && <FormularioDatos onEnviar={enviarDatos} />}

        {fase === "resonancia" && (
          <section style={S.tarjeta}>
            <FormularioResonancia initial={{}} onSave={(form) => guardarResonancia(form)} onCancel={() => setFase("datos")} />
          </section>
        )}

        {fase === "generando" && <p style={S.estado}>Generando tu orden…</p>}

        {fase === "lista" && ordenUrl && (
          <section style={S.tarjetaCentro}>
            <a href={ordenUrl} download="orden_examenes_ICA.pdf" style={S.btnPrimario}>Descargar orden</a>
            {conCorreo && <p style={S.texto}>También te la enviamos por correo.</p>}
          </section>
        )}

        {error && <p style={S.error}>{error}</p>}
        {fase === "error" && (
          <div style={S.opciones}>
            {informe === null && ctxRef.current.zona && (
              <button type="button" style={S.btnSecundario} onClick={reintentarAnalisis}>Reintentar</button>
            )}
            <button type="button" style={S.btnSecundario} onClick={comenzar}>Volver a empezar</button>
          </div>
        )}

        {["fin", "lista"].includes(fase) && (
          <button type="button" style={S.enlace} onClick={comenzar}>Nueva consulta</button>
        )}
      </main>
    </div>
  );
}

// ---------- formulario final (nombre, RUT, correo) ----------
function FormularioDatos({ onEnviar }) {
  const [datos, setDatos] = useState({ nombre: "", rut: "", email: "" });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: "" }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const err = {};
    if (datos.nombre.trim().length < 3) err.nombre = "Ingresa tu nombre completo";
    const errRut = validarRut(datos.rut);
    if (errRut) err.rut = errRut;
    if (datos.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email.trim())) err.email = "Correo inválido";
    setErrores(err);
    if (Object.keys(err).length) return;
    setEnviando(true);
    await onEnviar({ nombre: datos.nombre.trim(), rut: formatearRut(datos.rut), email: datos.email.trim() });
    setEnviando(false);
  };

  return (
    <form style={S.tarjeta} onSubmit={enviar} noValidate>
      <p style={S.preguntaTexto}>Datos para tu orden</p>
      <label style={S.campo}>
        <span>Nombre completo</span>
        <input style={S.input} value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} autoComplete="name" />
        {errores.nombre && <small style={S.errorCampo}>{errores.nombre}</small>}
      </label>
      <label style={S.campo}>
        <span>RUT</span>
        <input style={S.input} value={datos.rut} placeholder="12.345.678-9"
          onChange={(e) => cambiar("rut", e.target.value)}
          onBlur={() => datos.rut && cambiar("rut", formatearRut(datos.rut))} />
        {errores.rut && <small style={S.errorCampo}>{errores.rut}</small>}
      </label>
      <label style={S.campo}>
        <span>Correo (para recibir la orden)</span>
        <input style={S.input} type="email" value={datos.email} placeholder="Opcional"
          onChange={(e) => cambiar("email", e.target.value)} autoComplete="email" />
        {errores.email && <small style={S.errorCampo}>{errores.email}</small>}
      </label>
      <button type="submit" style={S.btnPrimario} disabled={enviando}>{enviando ? "Guardando…" : "Continuar"}</button>
    </form>
  );
}

// ---------- estilos (paleta de ICA) ----------
const PRIMARIO = "#1E3A5F";
const ACENTO = "#3F7FBF";
const S = {
  pagina: { minHeight: "100svh", background: "#F4F7FB", color: "#111827", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  cabecera: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#0E1115", color: "#fff" },
  logo: { width: 40, height: 40, objectFit: "cover", borderRadius: 8 },
  marca: { margin: 0, fontWeight: 700, fontSize: 15 },
  sub: { margin: 0, fontSize: 12, color: "#9CA3AF" },
  main: { maxWidth: 560, margin: "0 auto", padding: "16px 16px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 },
  avatar: { width: "min(62vw, 260px)", aspectRatio: "400 / 460", transition: "width 0.3s ease" },
  avatarChico: { width: "min(34vw, 140px)" },
  barra: { width: "100%", height: 6, background: "#D1D8E5", borderRadius: 4, overflow: "hidden" },
  barraLlena: { height: "100%", background: ACENTO, transition: "width 0.4s ease" },
  tarjeta: { width: "100%", boxSizing: "border-box", background: "#fff", border: "1px solid #D1D8E5", borderRadius: 16, padding: 18, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" },
  tarjetaCentro: { width: "100%", boxSizing: "border-box", background: "#fff", border: "1px solid #D1D8E5", borderRadius: 16, padding: 20, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  tarjetaAlerta: { borderColor: "#E5A3A3", background: "#FFF7F7" },
  titulo: { margin: 0, fontSize: 21, color: PRIMARIO },
  tituloAlerta: { margin: 0, fontSize: 19, color: "#9B2C2C" },
  texto: { margin: "4px 0", fontSize: 15, lineHeight: 1.5, color: "#374151" },
  preguntaTexto: { margin: "0 0 10px", fontSize: 18, fontWeight: 600, lineHeight: 1.35, color: PRIMARIO },
  escuchando: { margin: "6px 0", fontSize: 14, color: ACENTO },
  entendido: { margin: "6px 0", fontSize: 15, fontWeight: 600, color: "#065F46", background: "#ECFDF5", borderRadius: 8, padding: "6px 10px" },
  rotulo: { margin: "12px 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "#6B7280" },
  lista: { margin: "0 0 4px", paddingLeft: 20, lineHeight: 1.5 },
  opciones: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, justifyContent: "center" },
  opcion: { font: "inherit", fontSize: 15, padding: "10px 16px", borderRadius: 999, border: `1px solid ${ACENTO}`, background: "#fff", color: PRIMARIO, cursor: "pointer" },
  escribir: { display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end" },
  filaEscribir: { display: "flex", gap: 8, marginTop: 10 },
  textarea: { flex: 1, font: "inherit", fontSize: 15, padding: 10, borderRadius: 10, border: "1px solid #D1D8E5", resize: "vertical" },
  input: { font: "inherit", fontSize: 16, padding: "10px 12px", borderRadius: 10, border: "1px solid #D1D8E5", width: "100%", boxSizing: "border-box" },
  campo: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 },
  errorCampo: { color: "#B42318", fontWeight: 500 },
  btnPrimario: { font: "inherit", fontSize: 17, fontWeight: 700, color: "#fff", background: PRIMARIO, border: "none", borderRadius: 12, padding: "14px 28px", cursor: "pointer", textDecoration: "none", display: "inline-block", width: "100%", boxSizing: "border-box", textAlign: "center" },
  btnSecundario: { font: "inherit", fontSize: 15, fontWeight: 600, color: PRIMARIO, background: "#fff", border: `1px solid ${PRIMARIO}`, borderRadius: 10, padding: "10px 18px", cursor: "pointer" },
  enlace: { font: "inherit", fontSize: 14, color: ACENTO, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 6 },
  estado: { fontSize: 15, color: "#6B7280", margin: 0 },
  aviso: { margin: 0, fontSize: 14, color: "#92400E", background: "#FFFBEB", borderRadius: 8, padding: "8px 10px" },
  legal: { margin: "8px 0 0", fontSize: 12, color: "#6B7280" },
  error: { color: "#B42318", fontSize: 14, textAlign: "center", margin: 0 },
};
