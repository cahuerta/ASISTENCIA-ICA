/**
 * useVoz.js
 * Voz de los asistentes + apertura de boca para el avatar.
 *
 * - hablar(texto, { alTerminarPronto }): Promise<boolean>. Se resuelve al terminar
 *   de hablar; true si efectivamente habló, false si el navegador no lo permitió
 *   (sin interacción previa con la página) o no hay voz disponible.
 *   alTerminarPronto(): se llama ~0,3 s ANTES de que termine el audio (para que el
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
 *   v5: la PRIMERA oración se pide aparte (es corta, llega rápido y empieza a sonar
 *   antes); el resto se pide al mismo tiempo y sigue sin corte.
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
const URL_VOZ =
  `${import.meta.env.VITE_BACKEND_BASE || "https://asistencia-ica-backend.onrender.com"}/voz`;
const ESPERA_AUDIO_MS = 4500;          // si el audio no llega en este tiempo, voz del navegador
const PAUSA_SIN_NATURAL_MS = 30000;    // tras una falla, este rato se habla directo con el navegador
const MAX_CARACTERES_AUDIO = 650;      // el backend acepta hasta 700
const MAX_AUDIOS_GUARDADOS = 40;
const VENTANA_BOCA_S = 0.04;           // la boca se mide en tramos de 40 ms
const MIN_CARACTERES_PRIMERO = 40;     // el primer bloque: la primera oración (o las primeras, si es muy corta)
const AVISO_ANTES_MS = 300;            // alTerminarPronto: este tiempo antes del final del audio
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

// Bloques para pedir el audio: primero la primera oración (llega rápido y empieza a
// sonar antes) y después el resto, en bloques de hasta MAX_CARACTERES_AUDIO.
function dividirEnBloques(texto) {
  const frases = dividirEnFrases(texto);
  const bloques = [];
  let primero = "";
  while (frases.length && primero.length < MIN_CARACTERES_PRIMERO) {
    primero = primero ? `${primero} ${frases.shift()}` : frases.shift();
  }
  if (primero) bloques.push(primero);
  let actual = "";
  frases.forEach((f) => {
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
function pedirAudio(texto, genero) {
  const clave = `${genero}|${texto}`;
  const guardado = audiosGuardados.get(clave);
  if (guardado) return Promise.resolve(guardado);
  if (audiosEnCamino.has(clave)) return audiosEnCamino.get(clave);
  if (!audioSoportado || Date.now() < sinNaturalHasta) return Promise.resolve(null);

  const promesa = (async () => {
    const ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), ESPERA_AUDIO_MS);
    try {
      const r = await fetch(URL_VOZ, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, voz: genero }),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        // 400/413/422: solo este texto va por el navegador; el resto: pausa
        if (![400, 413, 422].includes(r.status)) sinNaturalHasta = Date.now() + PAUSA_SIN_NATURAL_MS;
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
      sinNaturalHasta = Date.now() + PAUSA_SIN_NATURAL_MS;
      return null;
    } finally {
      clearTimeout(reloj);
      audiosEnCamino.delete(clave);
    }
  })();
  audiosEnCamino.set(clave, promesa);
  return promesa;
}

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
      if (hablandoRef.current && entrada && a && !a.paused) {
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

      const programarAviso = () => {
        if (!avisar || aviso || listo || !Number.isFinite(a.duration)) return;
        const restante = (a.duration - a.currentTime) * 1000 - AVISO_ANTES_MS;
        aviso = setTimeout(() => { if (!listo) avisar(); }, Math.max(0, restante));
      };

      const terminar = (resultado) => {
        if (listo) return;
        listo = true;
        clearTimeout(seguro);
        clearTimeout(aviso);
        a.onended = null;
        a.onerror = null;
        a.onloadedmetadata = null;
        a.onplaying = null;
        if (cortarAudioRef.current === cortar) cortarAudioRef.current = null;
        if (entradaActualRef.current === entrada) entradaActualRef.current = null;
        resolve(turno !== turnoRef.current ? "cancelada" : resultado);
      };
      const cortar = () => { a.pause(); terminar("cancelada"); };
      cortarAudioRef.current = cortar;

      a.onended = () => terminar("ok");
      a.onerror = () => terminar("error");
      a.onloadedmetadata = () => {
        // Seguridad: si el navegador nunca avisa que terminó, se sigue igual
        if (Number.isFinite(a.duration)) {
          clearTimeout(seguro);
          seguro = setTimeout(() => terminar("ok"), a.duration * 1000 + 3000);
        }
      };
      a.onplaying = programarAviso;
      seguro = setTimeout(() => { a.pause(); terminar("error"); }, 60000);

      entradaActualRef.current = entrada;
      a.src = entrada.url;
      const p = a.play();
      const empezo = () => { if (!listo) marcarHablando(true); };
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
    // Los dos primeros bloques se piden juntos (la primera oración llega antes y
    // empieza a sonar); los siguientes, mientras suena el anterior
    const pedidos = bloques.slice(0, 2).map((b) => pedirAudio(b, genero));
    for (let i = 0; i < bloques.length; i += 1) {
      const entrada = await pedidos[i];
      if (turno !== turnoRef.current) break;
      if (i + 2 < bloques.length) pedidos[i + 2] = pedirAudio(bloques[i + 2], genero);

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
