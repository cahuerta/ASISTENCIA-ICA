/**
 * useVoz.js
 * Voz de los asistentes + apertura de boca para el avatar.
 *
 * - hablar(texto, { alTerminarPronto }): Promise<boolean>. Se resuelve al terminar
 *   de hablar; true si efectivamente habló, false si el navegador no lo permitió
 *   (sin interacción previa con la página) o no hay voz disponible.
 *   alTerminarPronto(): se llama ~0,15 s ANTES de que termine el audio (para que el
 *   micrófono ya esté encendido cuando el asistente se calla).
 * - callar(): corta lo que se esté diciendo.
 * - desbloquear(): se llama en la primera interacción con la página (clic/tecla)
 *   para que el navegador permita hablar después.
 * - usarVoz("femenina" | "masculina"): Ica o Ipo, para lo próximo que se diga.
 * - boca: número 0..1 con la apertura actual de la boca.
 *
 * v4 VOZ NATURAL: el texto se manda al backend (POST /voz) y vuelve en audio con
 *   las voces chilenas de Azure (Ica: Catalina, Ipo: Lorenzo). Se pide el texto
 *   COMPLETO de una vez (no frase por frase): sin cortes entre oraciones. Solo si
 *   es muy largo se parte en bloques y el siguiente se pide mientras suena el actual.
 *   - Lo ya escuchado queda guardado en el navegador: no se vuelve a pedir.
 *   - La boca sigue el volumen real del audio (se mide al recibirlo).
 *   v6 PRECARGA: despertarVoz() despierta al backend (Render se duerme sin uso) y
 *   precargarVoces() pide de antemano las primeras frases (el saludo, las primeras
 *   preguntas): al tocar "Comenzar" ya están y suenan al tiro con la voz de Azure.
 *   FIN DEL AUDIO: no se depende solo del aviso "ended" del navegador (en algunos
 *   teléfonos llega tarde o no llega): se da por terminado al cumplirse su duración,
 *   o si el audio se detiene; la boca se cierra apenas deja de sonar.
 *   - RESPALDO: si el backend no responde a tiempo, da error o el plan gratis se
 *     agotó, se habla con la voz del navegador (como antes) y por un rato ni se
 *     intenta la voz natural, para no hacer esperar al paciente.
 *
 * Voz del navegador (respaldo, speechSynthesis): se lee FRASE POR FRASE porque en
 * Chrome las voces de Google se cortan a los ~15 s con textos largos. Se prefiere
 * voz femenina para Ica y masculina para Ipo; si no hay, se ajusta el tono. La
 * boca se abre en cada palabra (evento "boundary") o con una oscilación.
 */
import { useCallback, useEffect, useRef, useState } from "react";

// ---------- voz natural (backend) ----------
// import.meta.env sin "?.": Vite solo reemplaza la forma exacta al compilar
const BACKEND = import.meta.env.VITE_BACKEND_BASE || "https://asistencia-ica-backend.onrender.com";
const URL_VOZ = `${BACKEND}/voz`;
const ESPERA_AUDIO_MS = 4500;          // si el audio no llega en este tiempo, voz del navegador
const PAUSA_SIN_NATURAL_MS = 30000;    // tras una falla, este rato se habla directo con el navegador
const MAX_CARACTERES_AUDIO = 650;      // el backend acepta hasta 700
const MAX_AUDIOS_GUARDADOS = 40;
const VENTANA_BOCA_S = 0.04;           // la boca se mide en tramos de 40 ms
const AVISO_ANTES_MS = 150;            // alTerminarPronto: este tiempo antes del final del audio
const MARGEN_FIN_MS = 250;             // se da por terminado a su duración + este margen, aunque no avise
const ESPERA_PRECARGA_MS = 60000;      // la precarga espera lo que tarde el backend en despertar
const ESPERA_PRECARGADO_MS = 6000;     // hablar() espera hasta esto un audio que ya se está precargando
// Medio segundo de silencio para desbloquear el audio en el primer toque (iPhone)
const SILENCIO =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

// ---------- voz del navegador (respaldo) ----------
const PREFERENCIA_IDIOMA = ["es-CL", "es-419", "es-US", "es-MX", "es-AR", "es-ES", "es"];
// Edge: Lorenzo de Chile, Jorge, Álvaro; Windows: Pablo, Raúl; Apple: Diego, Jorge,
// Juan. Muchos Android traen una sola voz en español: se usa la que haya y se
// ajusta el tono.
const PISTAS_VOZ_MASCULINA = [
  "lorenzo", "jorge", "alvaro", "álvaro", "pablo", "raul", "raúl", "diego",
  "juan", "carlos", "enrique", "gonzalo", "tomas", "tomás", "male", "hombre",
];
const PISTAS_VOZ_FEMENINA = [
  "paulina", "francisca", "mónica", "monica", "helena", "sabina", "laura",
  "lucia", "lucía", "elvira", "dalia", "camila", "catalina", "female", "mujer",
];
const TONO_VOZ_MASCULINA = 0.95;
const TONO_SIN_VOZ_MASCULINA = 0.8; // voz femenina o desconocida: más grave
const TONO_FEMENINA = 1.05;

const MAX_CARACTERES_FRASE = 180;
const ESPERA_INICIO_MS = 5000;      // si la primera frase no parte en este tiempo, se considera bloqueada
const PALABRAS_POR_SEG = 2.3;        // para el tiempo máximo de seguridad por frase

const synthSoportado = typeof window !== "undefined" && "speechSynthesis" in window;
const audioSoportado = typeof window !== "undefined" && typeof window.Audio !== "undefined"
  && typeof fetch !== "undefined";
export const vozSoportada = synthSoportado || audioSoportado;

function elegirVoz(voces, genero = "masculina") {
  const preferidas = genero === "femenina" ? PISTAS_VOZ_FEMENINA : PISTAS_VOZ_MASCULINA;
  const evitar = genero === "femenina" ? PISTAS_VOZ_MASCULINA : PISTAS_VOZ_FEMENINA;
  const espanol = voces.filter((v) => v.lang && v.lang.toLowerCase().startsWith("es"));
  if (!espanol.length) return null;

  const puntaje = (v) => {
    const idx = PREFERENCIA_IDIOMA.findIndex((p) => v.lang.toLowerCase().startsWith(p.toLowerCase()));
    let p = idx === -1 ? 0 : (PREFERENCIA_IDIOMA.length - idx) * 10;
    const nombre = v.name.toLowerCase();
    if (preferidas.some((m) => nombre.includes(m))) p += 25;
    if (evitar.some((f) => nombre.includes(f))) p -= 5;
    if (nombre.includes("google") || nombre.includes("natural") || nombre.includes("online")) p += 8;
    return p;
  };

  return [...espanol].sort((a, b) => puntaje(b) - puntaje(a))[0];
}

// Divide en frases; las frases muy largas se parten en comas o espacios.
export function dividirEnFrases(texto) {
  const frases = (texto || "").match(/[^.!?¿¡]+[.!?]*|[¿¡][^?!]*[?!]?/g) || [];
  const resultado = [];
  frases.forEach((f) => {
    let resto = f.trim();
    while (resto.length > MAX_CARACTERES_FRASE) {
      let corte = resto.lastIndexOf(",", MAX_CARACTERES_FRASE);
      if (corte < MAX_CARACTERES_FRASE * 0.4) corte = resto.lastIndexOf(" ", MAX_CARACTERES_FRASE);
      if (corte <= 0) corte = MAX_CARACTERES_FRASE;
      resultado.push(resto.slice(0, corte + 1).trim());
      resto = resto.slice(corte + 1).trim();
    }
    if (resto) resultado.push(resto);
  });
  return resultado.filter((f) => /[\p{L}\p{N}]/u.test(f));
}

// Junta frases en bloques de hasta MAX_CARACTERES_AUDIO (casi siempre queda uno solo:
// una sola petición por frase, para no gastar de más del plan de Azure)
function dividirEnBloques(texto) {
  const bloques = [];
  let actual = "";
  dividirEnFrases(texto).forEach((f) => {
    if (actual && actual.length + 1 + f.length > MAX_CARACTERES_AUDIO) {
      bloques.push(actual);
      actual = f;
    } else {
      actual = actual ? `${actual} ${f}` : f;
    }
  });
  if (actual) bloques.push(actual);
  return bloques;
}

// ---------- audios guardados (compartidos mientras la página esté abierta) ----------
const audiosGuardados = new Map();   // "genero|texto" -> { url, env }
const audiosEnCamino = new Map();    // "genero|texto" -> Promise<entrada | null>
let sinNaturalHasta = 0;

function guardarAudio(clave, entrada) {
  audiosGuardados.set(clave, entrada);
  while (audiosGuardados.size > MAX_AUDIOS_GUARDADOS) {
    const [viejaClave, vieja] = audiosGuardados.entries().next().value;
    audiosGuardados.delete(viejaClave);
    URL.revokeObjectURL(vieja.url);
  }
}

// Volumen del audio en tramos de 40 ms (0..1), para mover la boca al ritmo real
async function medirVolumen(blob) {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Offline) return null;
  const ctx = new Offline(1, 1, 16000);
  const datosAudio = await blob.arrayBuffer();
  const buffer = await new Promise((ok, mal) => {
    const p = ctx.decodeAudioData(datosAudio, ok, mal); // Safari antiguo: solo callbacks
    if (p && typeof p.then === "function") p.then(ok, mal);
  });
  const muestras = buffer.getChannelData(0);
  const paso = Math.max(1, Math.floor(buffer.sampleRate * VENTANA_BOCA_S));
  const env = new Float32Array(Math.ceil(muestras.length / paso));
  let maximo = 0;
  for (let i = 0; i < env.length; i += 1) {
    let suma = 0;
    const fin = Math.min(muestras.length, (i + 1) * paso);
    for (let j = i * paso; j < fin; j += 1) suma += muestras[j] * muestras[j];
    env[i] = Math.sqrt(suma / Math.max(1, fin - i * paso));
    if (env[i] > maximo) maximo = env[i];
  }
  if (maximo > 0) for (let i = 0; i < env.length; i += 1) env[i] = Math.min(1, (env[i] / maximo) * 1.3);
  return env;
}

// Pide el audio al backend. null = usar la voz del navegador.
// precarga: espera lo que tarde el backend en despertar y, si falla, no deja la
// voz del navegador "castigada" (esa pausa es solo para fallas al hablar).
function pedirAudio(texto, genero, { precarga = false } = {}) {
  const clave = `${genero}|${texto}`;
  const guardado = audiosGuardados.get(clave);
  if (guardado) return Promise.resolve(guardado);
  if (audiosEnCamino.has(clave)) return audiosEnCamino.get(clave);
  if (!audioSoportado) return Promise.resolve(null);

  // Tras una falla al hablar, un rato directo con la voz del navegador
  if (!precarga && Date.now() < sinNaturalHasta) return Promise.resolve(null);

  const promesa = (async () => {
    const ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), precarga ? ESPERA_PRECARGA_MS : ESPERA_AUDIO_MS);
    try {
      const r = await fetch(URL_VOZ, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, voz: genero }),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        // 400/413/422: solo este texto va por el navegador; el resto: pausa
        if (!precarga && ![400, 413, 422].includes(r.status)) sinNaturalHasta = Date.now() + PAUSA_SIN_NATURAL_MS;
        return null;
      }
      const blob = await r.blob();
      if (!blob.size) return null;
      const entrada = { url: URL.createObjectURL(blob), env: null };
      medirVolumen(blob).then((env) => { entrada.env = env; }).catch(() => {});
      guardarAudio(clave, entrada);
      return entrada;
    } catch {
      // Sin red, servidor dormido o demoró demasiado
      if (!precarga) sinNaturalHasta = Date.now() + PAUSA_SIN_NATURAL_MS;
      return null;
    } finally {
      clearTimeout(reloj);
      audiosEnCamino.delete(clave);
    }
  })();
  audiosEnCamino.set(clave, promesa);
  return promesa;
}

// Despierta al backend (Render se duerme sin uso): se llama al abrir y al tocar "Comenzar"
export function despertarVoz() {
  if (typeof fetch === "undefined") return;
  fetch(`${BACKEND}/health`, { cache: "no-store" }).catch(() => {});
}

// Pide de antemano estas frases, una tras otra: [{ texto, genero }]
export async function precargarVoces(lista) {
  if (!audioSoportado) return;
  for (const { texto, genero } of lista) {
    for (const bloque of dividirEnBloques(texto)) {
      await pedirAudio(bloque, genero === "femenina" ? "femenina" : "masculina", { precarga: true });
    }
  }
}

// Espera una promesa como máximo ms; después, null
const conTope = (promesa, ms) => Promise.race([promesa, new Promise((r) => setTimeout(() => r(null), ms))]);

export default function useVoz() {
  const [hablando, setHablando] = useState(false);
  const [boca, setBoca] = useState(0);

  const vozRef = useRef(null);
  const generoRef = useRef("masculina");
  const nivelRef = useRef(0);
  const ultimoLimiteRef = useRef(0);
  const hablandoRef = useRef(false);
  const rafRef = useRef(null);
  const turnoRef = useRef(0);         // cada hablar()/callar() invalida lo anterior
  const fraseActualRef = useRef(null); // referencia viva de la frase que se está diciendo (navegador)
  const audioRef = useRef(null);       // un solo <audio>, desbloqueado en el primer toque
  const entradaActualRef = useRef(null); // audio natural que está sonando (para la boca)
  const cortarAudioRef = useRef(null);

  const obtenerAudio = () => {
    if (!audioRef.current && audioSoportado) {
      const a = new Audio();
      a.preload = "auto";
      a.setAttribute("playsinline", "");
      audioRef.current = a;
    }
    return audioRef.current;
  };

  // Cargar voces del navegador (en Chrome llegan de forma asíncrona)
  useEffect(() => {
    if (!synthSoportado) return undefined;
    const cargar = () => {
      vozRef.current = elegirVoz(window.speechSynthesis.getVoices(), generoRef.current);
    };
    cargar();
    window.speechSynthesis.addEventListener("voiceschanged", cargar);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", cargar);
  }, []);

  // Animación de la boca
  useEffect(() => {
    const tick = (t) => {
      const entrada = entradaActualRef.current;
      const a = audioRef.current;
      if (entrada && a && (a.paused || a.ended)) {
        // Voz natural que ya no suena: boca cerrándose (aunque falte darla por terminada)
        nivelRef.current *= 0.6;
      } else if (hablandoRef.current && entrada && a) {
        if (entrada.env) {
          // Voz natural: sigue el volumen real del audio
          const objetivo = entrada.env[Math.floor(a.currentTime / VENTANA_BOCA_S)] || 0;
          nivelRef.current = nivelRef.current * 0.45 + objetivo * 0.55;
        } else {
          const osc = 0.35 + 0.35 * Math.abs(Math.sin(t / 95)) * (0.6 + 0.4 * Math.sin(t / 37));
          nivelRef.current = Math.max(nivelRef.current * 0.8, osc);
        }
      } else if (hablandoRef.current) {
        const sinEventos = t - ultimoLimiteRef.current > 450;
        if (sinEventos) {
          const osc = 0.35 + 0.35 * Math.abs(Math.sin(t / 95)) * (0.6 + 0.4 * Math.sin(t / 37));
          nivelRef.current = Math.max(nivelRef.current * 0.8, osc);
        } else {
          nivelRef.current *= 0.86;
        }
      } else {
        nivelRef.current *= 0.7;
      }
      const redondeado = Math.round(nivelRef.current * 20) / 20;
      setBoca((prev) => (prev === redondeado ? prev : redondeado));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Al cerrar la pantalla, que no siga sonando
  useEffect(() => () => {
    cortarAudioRef.current?.();
    audioRef.current?.pause();
  }, []);

  const marcarHablando = (valor) => {
    hablandoRef.current = valor;
    setHablando(valor);
  };

  // ---------- voz natural: reproduce un audio. "ok" | "error" | "bloqueada" | "cancelada" ----------
  // avisar: solo en el último bloque, se llama AVISO_ANTES_MS antes del final
  const reproducir = useCallback((entrada, turno, avisar = null) => {
    return new Promise((resolve) => {
      const a = obtenerAudio();
      let listo = false;
      let seguro = null;
      let aviso = null;

      let fin = null;
      // Al empezar a sonar (y si se reanuda tras cargar): aviso previo y fin por duración
      const alSonar = () => {
        if (listo) return;
        if (!Number.isFinite(a.duration) || a.duration <= 0) return;
        const restanteMs = (a.duration - a.currentTime) * 1000;
        clearTimeout(fin);
        fin = setTimeout(() => { a.pause(); terminar("ok"); }, restanteMs + MARGEN_FIN_MS);
        if (avisar && !aviso) {
          aviso = setTimeout(() => { if (!listo) avisar(); }, Math.max(0, restanteMs - AVISO_ANTES_MS));
        }
      };

      const terminar = (resultado) => {
        if (listo) return;
        listo = true;
        clearTimeout(seguro);
        clearTimeout(aviso);
        clearTimeout(fin);
        a.onended = null;
        a.onerror = null;
        a.onloadedmetadata = null;
        a.onplaying = null;
        a.onpause = null;
        if (cortarAudioRef.current === cortar) cortarAudioRef.current = null;
        if (entradaActualRef.current === entrada) entradaActualRef.current = null;
        resolve(turno !== turnoRef.current ? "cancelada" : resultado);
      };
      const cortar = () => { a.pause(); terminar("cancelada"); };
      cortarAudioRef.current = cortar;

      a.onended = () => terminar("ok");
      a.onerror = () => terminar("error");
      a.onplaying = alSonar;
      a.onloadedmetadata = () => { if (!a.paused) alSonar(); };
      seguro = setTimeout(() => { a.pause(); terminar("ok"); }, 60000); // último recurso

      entradaActualRef.current = entrada;
      a.src = entrada.url;
      const p = a.play();
      const empezo = () => {
        if (listo) return;
        marcarHablando(true);
        alSonar();
        // Ya sonando: si el audio se detiene solo (el teléfono, el micrófono), terminó
        a.onpause = () => terminar("ok");
      };
      if (p && typeof p.then === "function") {
        p.then(empezo).catch((e) => terminar(e && e.name === "NotAllowedError" ? "bloqueada" : "error"));
      } else {
        empezo();
      }
    });
  }, []);

  // ---------- voz del navegador: dice UNA frase. "ok" | "error" | "bloqueada" | "cancelada" ----------
  const decirFrase = useCallback((frase, turno, esPrimera) => {
    return new Promise((resolve) => {
      let empezo = false;
      let listo = false;
      const u = new SpeechSynthesisUtterance(frase);
      fraseActualRef.current = u;

      if (!vozRef.current) vozRef.current = elegirVoz(window.speechSynthesis.getVoices(), generoRef.current);
      if (vozRef.current) {
        u.voice = vozRef.current;
        u.lang = vozRef.current.lang;
      } else {
        u.lang = "es-CL";
      }
      u.rate = 1;
      if (generoRef.current === "femenina") {
        u.pitch = TONO_FEMENINA;
      } else {
        const masculina = vozRef.current
          && PISTAS_VOZ_MASCULINA.some((m) => vozRef.current.name.toLowerCase().includes(m));
        u.pitch = masculina ? TONO_VOZ_MASCULINA : TONO_SIN_VOZ_MASCULINA;
      }

      const palabras = frase.split(/\s+/).length;
      const maximoMs = (palabras / PALABRAS_POR_SEG) * 1000 * 2 + 4000;
      let temporizador = null;

      const terminar = (resultado) => {
        if (listo) return;
        listo = true;
        clearTimeout(temporizador);
        resolve(turno !== turnoRef.current ? "cancelada" : resultado);
      };

      // Si no parte a tiempo: bloqueada (primera frase) o se salta (siguientes)
      temporizador = setTimeout(() => {
        if (!empezo) {
          window.speechSynthesis.cancel();
          terminar(esPrimera ? "bloqueada" : "error");
        }
      }, ESPERA_INICIO_MS);

      u.onstart = () => {
        empezo = true;
        clearTimeout(temporizador);
        temporizador = setTimeout(() => terminar("ok"), maximoMs);
        ultimoLimiteRef.current = 0;
        marcarHablando(true);
      };
      u.onboundary = (e) => {
        if (e.name && e.name !== "word") return;
        ultimoLimiteRef.current = performance.now();
        nivelRef.current = 0.75 + Math.random() * 0.25;
      };
      u.onend = () => terminar("ok");
      u.onerror = (e) => {
        if (e.error === "not-allowed") terminar("bloqueada");
        else if (e.error === "interrupted" || e.error === "canceled") terminar("cancelada");
        else terminar("error");
      };

      window.speechSynthesis.speak(u);
    });
  }, []);

  // Dice un texto con la voz del navegador, frase por frase
  const hablarNavegador = useCallback(async (texto, turno, esPrimero) => {
    if (!synthSoportado) return "error";
    // Solo se limpia la cola si había algo sonando (cancelar y hablar de inmediato
    // puede anular la primera frase en Chrome).
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      await new Promise((r) => setTimeout(r, 150));
    }
    const frases = dividirEnFrases(texto);
    let resultado = "error";
    for (let i = 0; i < frases.length; i += 1) {
      if (turno !== turnoRef.current) return "cancelada";
      const r = await decirFrase(frases[i], turno, esPrimero && i === 0);
      if (r === "ok") resultado = "ok";
      if (r === "bloqueada" || r === "cancelada") return r;
    }
    return resultado;
  }, [decirFrase]);

  const hablar = useCallback(async (texto, { alTerminarPronto = null } = {}) => {
    if (!vozSoportada || !texto) return false;
    turnoRef.current += 1;
    const turno = turnoRef.current;
    cortarAudioRef.current?.();
    const genero = generoRef.current;

    let avisado = false;
    const avisar = () => {
      if (avisado || turno !== turnoRef.current) return;
      avisado = true;
      if (alTerminarPronto) alTerminarPronto();
    };

    const bloques = dividirEnBloques(texto);
    let hablo = false;
    // El primer bloque se pide ya; el siguiente, mientras suena el actual
    const pedidos = [bloques.length ? pedirAudio(bloques[0], genero) : null];
    for (let i = 0; i < bloques.length; i += 1) {
      // Si ya se estaba precargando, se espera un poco más (no los 60 s de la precarga)
      const entrada = await conTope(pedidos[i], ESPERA_PRECARGADO_MS);
      if (turno !== turnoRef.current) break;
      if (i + 1 < bloques.length) pedidos[i + 1] = pedirAudio(bloques[i + 1], genero);

      const ultimo = i === bloques.length - 1;
      let resultado = entrada ? await reproducir(entrada, turno, ultimo ? avisar : null) : "error";
      // El audio natural no estaba o falló al sonar: voz del navegador
      if (resultado === "error" && turno === turnoRef.current) {
        resultado = await hablarNavegador(bloques[i], turno, i === 0 && !hablo);
      }
      if (resultado === "ok") hablo = true;
      if (resultado === "bloqueada" || resultado === "cancelada") break;
    }

    if (turno === turnoRef.current) {
      fraseActualRef.current = null;
      entradaActualRef.current = null;
      marcarHablando(false);
      avisar(); // si no se alcanzó a avisar antes (voz del navegador, audio muy corto)
    }
    return hablo;
  }, [reproducir, hablarNavegador]);

  const callar = useCallback(() => {
    turnoRef.current += 1;
    cortarAudioRef.current?.();
    if (synthSoportado) window.speechSynthesis.cancel();
    fraseActualRef.current = null;
    entradaActualRef.current = null;
    marcarHablando(false);
  }, []);

  // Se llama en la primera interacción con la página: un sonido mudo deja al
  // navegador autorizado para hablar después (voz natural y voz del navegador).
  const desbloquear = useCallback(() => {
    const a = obtenerAudio();
    if (a) {
      a.src = SILENCIO;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
    if (synthSoportado) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  }, []);

  // Cambia la voz (Ica: "femenina", Ipo: "masculina") para lo próximo que se diga
  const usarVoz = useCallback((genero) => {
    const g = genero === "femenina" ? "femenina" : "masculina";
    if (generoRef.current === g) return;
    generoRef.current = g;
    vozRef.current = synthSoportado ? elegirVoz(window.speechSynthesis.getVoices(), g) : null;
  }, []);

  return { hablar, callar, desbloquear, usarVoz, hablando, boca };
}
