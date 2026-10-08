/**
 * useEscucha.js
 * Reconocimiento de voz continuo del navegador (Web Speech API), español de Chile.
 *
 * - iniciar(): arranca la escucha (debe llamarse tras un toque del usuario).
 * - pausar():  detiene la escucha (se usa mientras el avatar habla, para que no se oiga a sí mismo).
 * - reanudar(): vuelve a escuchar.
 * - onFrase(texto): callback que recibe cada frase COMPLETA.
 *
 * Una frase se considera completa tras un silencio sin resultados nuevos:
 * SILENCIO_CORTO_MS si lo dicho es corto ("sí", "rodilla"): responde rápido;
 * SILENCIO_MS si viene contando algo largo (el relato): no se le corta al
 * tomar aire entre una idea y otra.
 * Mientras tanto, los trozos que el navegador va marcando como finales se
 * acumulan (Chrome, sobre todo en Android, marca como final cada trozo corto
 * y además repite el texto acumulado; aquí se evita duplicarlo).
 *
 * ANDROID (v2): antes se reutilizaba un solo reconocedor. En Chrome de Android,
 * al detenerlo con abort() a veces nunca avisa que terminó; el siguiente start()
 * fallaba con "already started", el error se ignoraba y la pantalla quedaba en
 * "Te escucho…" sin escuchar nada. Ahora:
 *  - cada vez que se vuelve a escuchar se crea un reconocedor NUEVO, y los
 *    eventos de reconocedores anteriores se ignoran;
 *  - un vigilante: si el navegador no confirma el inicio en VIGILANTE_MS, se
 *    descarta ese reconocedor y se crea otro;
 *  - los fallos ya no se callan: tras varios seguidos se informa el motivo real
 *    (con el código del navegador) en `error`, y la pantalla pasa a botones.
 *
 * El navegador corta la escucha continua cada cierto tiempo; se reinicia sola
 * mientras esté activa y no pausada, sin perder lo acumulado.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const escuchaSoportada = Boolean(SpeechRecognition);

// Silencio que marca el fin de una frase (corta / larga)
const SILENCIO_CORTO_MS = 700;
const SILENCIO_MS = 1100;
const PALABRAS_FRASE_CORTA = 3;
// Tiempo máximo para que el navegador confirme que empezó a escuchar
const VIGILANTE_MS = 2500;
// Espera antes de volver a escuchar cuando la asistente termina de hablar
const REANUDAR_MS = 120;
// Espera antes de reiniciar cuando el navegador corta la escucha
const REINICIO_MS = 200;
// Fallos seguidos (no inicia, error de inicio, cortes inmediatos) antes de avisar
const MAX_FALLOS = 4;
// Una sesión más corta que esto y sin resultados cuenta como fallo
const SESION_MINIMA_MS = 800;

const normalizar = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();

function unir(base, nuevo) {
  const b = base.trim();
  const n = nuevo.trim();
  if (!n) return b;
  if (!b) return n;
  const nb = normalizar(b);
  const nn = normalizar(n);
  if (nn.startsWith(nb)) return n; // el nuevo trae todo lo anterior + más
  if (nb.endsWith(nn) || nb.includes(nn)) return b; // repetido
  return `${b} ${n}`;
}

// Mensajes para el paciente según el código del navegador
function mensajeError(codigo) {
  switch (codigo) {
    case "not-allowed":
    case "service-not-allowed":
      return "El micrófono no tiene permiso. Actívalo en el navegador y recarga la página. Mientras tanto puedes responder con los botones.";
    case "audio-capture":
      return "No pude usar el micrófono (puede que otra app lo esté usando). Puedes responder con los botones.";
    case "network":
      return "El reconocimiento de voz necesita conexión a internet y no la encontró. Puedes responder con los botones.";
    case "language-not-supported":
      return "Este navegador no reconoce voz en español. Puedes responder con los botones.";
    default:
      return `No pude activar la escucha (código: ${codigo || "sin respuesta"}). Puedes responder con los botones.`;
  }
}

export default function useEscucha({ onFrase, idioma = "es-CL" } = {}) {
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState("");
  const [error, setError] = useState(null);

  const recRef = useRef(null);      // reconocedor vigente (los anteriores se ignoran)
  const activaRef = useRef(false);  // el usuario inició la sesión
  const pausadaRef = useRef(false); // pausada mientras el avatar habla
  const onFraseRef = useRef(onFrase);
  const reinicioRef = useRef(null);
  const vigilanteRef = useRef(null);
  const fallosRef = useRef(0);      // fallos seguidos
  const ultimoErrorRef = useRef(""); // último código de error del navegador

  const previoRef = useRef("");          // texto de sesiones anteriores (tras cortes del navegador)
  const sesionFinalRef = useRef("");     // finales de la sesión actual
  const sesionParcialRef = useRef("");   // parcial de la sesión actual
  const ignorarHastaRef = useRef(0);     // índice de resultados ya enviados en esta sesión
  const silencioRef = useRef(null);

  useEffect(() => {
    onFraseRef.current = onFrase;
  }, [onFrase]);

  const textoEnCurso = () =>
    unir(unir(previoRef.current, sesionFinalRef.current), sesionParcialRef.current);

  const limpiarFrase = useCallback(() => {
    clearTimeout(silencioRef.current);
    previoRef.current = "";
    sesionFinalRef.current = "";
    sesionParcialRef.current = "";
    setParcial("");
  }, []);

  const enviarFrase = useCallback(() => {
    const texto = textoEnCurso().trim();
    limpiarFrase();
    if (texto && !pausadaRef.current && onFraseRef.current) {
      onFraseRef.current(texto);
    }
  }, [limpiarFrase]);

  const programarEnvio = useCallback(() => {
    clearTimeout(silencioRef.current);
    silencioRef.current = setTimeout(() => {
      // Lo ya enviado no se vuelve a contar si la misma sesión sigue abierta
      ignorarHastaRef.current = Number.MAX_SAFE_INTEGER;
      enviarFrase();
    }, textoEnCurso().trim().split(/\s+/).length <= PALABRAS_FRASE_CORTA ? SILENCIO_CORTO_MS : SILENCIO_MS);
  }, [enviarFrase]);

  // Descarta el reconocedor vigente sin esperar a que el navegador avise
  const descartar = useCallback(() => {
    clearTimeout(vigilanteRef.current);
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch {
      // ya estaba detenido
    }
  }, []);

  // Demasiados fallos seguidos: se deja de intentar y se informa el motivo
  const rendirse = useCallback((codigo) => {
    activaRef.current = false;
    clearTimeout(reinicioRef.current);
    descartar();
    setEscuchando(false);
    setError(mensajeError(codigo));
  }, [descartar]);

  // arrancarRef evita dependencias circulares entre arrancar y los manejadores
  const arrancarRef = useRef(() => {});

  const programar = useCallback((ms) => {
    clearTimeout(reinicioRef.current);
    reinicioRef.current = setTimeout(() => arrancarRef.current(), ms);
  }, []);

  const fallo = useCallback((codigo) => {
    fallosRef.current += 1;
    if (codigo) ultimoErrorRef.current = codigo;
    if (fallosRef.current >= MAX_FALLOS) {
      rendirse(ultimoErrorRef.current);
      return;
    }
    // Espera creciente entre intentos: 300, 600, 900 ms
    programar(300 * fallosRef.current);
  }, [programar, rendirse]);

  const arrancar = useCallback(() => {
    if (!SpeechRecognition || !activaRef.current || pausadaRef.current) return;
    descartar();

    const rec = new SpeechRecognition();
    rec.lang = idioma;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    let inicio = 0;
    let conResultados = false;
    const vigente = () => recRef.current === rec;

    rec.onstart = () => {
      if (!vigente()) return;
      clearTimeout(vigilanteRef.current);
      inicio = Date.now();
      setEscuchando(true);
      ignorarHastaRef.current = 0;
      sesionFinalRef.current = "";
      sesionParcialRef.current = "";
    };

    rec.onresult = (evento) => {
      if (!vigente() || pausadaRef.current) return;
      conResultados = true;
      fallosRef.current = 0;

      // Resultados ya enviados en esta sesión (escritorio mantiene la lista completa)
      if (ignorarHastaRef.current === Number.MAX_SAFE_INTEGER) {
        ignorarHastaRef.current = evento.resultIndex;
      }

      let finales = "";
      let parciales = "";
      for (let i = ignorarHastaRef.current; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        const texto = resultado[0].transcript;
        if (resultado.isFinal) finales = unir(finales, texto);
        else parciales = unir(parciales, texto);
      }

      sesionFinalRef.current = finales;
      sesionParcialRef.current = parciales;
      setParcial(textoEnCurso());
      programarEnvio();
    };

    rec.onerror = (evento) => {
      if (!vigente()) return;
      const codigo = evento?.error || "";
      if (codigo === "not-allowed" || codigo === "service-not-allowed") {
        rendirse(codigo); // permiso: no tiene sentido reintentar
        return;
      }
      // "no-speech" y "aborted" son normales; el resto se recuerda para informarlo
      if (codigo && codigo !== "no-speech" && codigo !== "aborted") ultimoErrorRef.current = codigo;
    };

    rec.onend = () => {
      if (!vigente()) return;
      clearTimeout(vigilanteRef.current);
      recRef.current = null;
      setEscuchando(false);
      // Conserva lo dicho en esta sesión para la frase en curso
      if (!pausadaRef.current) previoRef.current = textoEnCurso();
      sesionFinalRef.current = "";
      sesionParcialRef.current = "";
      if (!activaRef.current || pausadaRef.current) return;

      // Terminó sin haber empezado, o se cortó al instante sin oír nada: fallo
      const corta = !inicio || (!conResultados && Date.now() - inicio < SESION_MINIMA_MS);
      if (corta) {
        fallo("");
      } else {
        fallosRef.current = 0; // la sesión funcionó: el navegador solo cortó por tiempo
        programar(REINICIO_MS);
      }
    };

    // Vigilante: si el navegador no confirma el inicio, se descarta y se reintenta
    clearTimeout(vigilanteRef.current);
    vigilanteRef.current = setTimeout(() => {
      if (!vigente() || inicio) return;
      descartar();
      fallo(ultimoErrorRef.current || "sin-inicio");
    }, VIGILANTE_MS);

    try {
      rec.start();
    } catch (e) {
      descartar();
      fallo(e?.name || "start");
    }
  }, [idioma, descartar, fallo, programar, programarEnvio, rendirse]);

  arrancarRef.current = arrancar;

  // Al desmontar
  useEffect(() => () => {
    activaRef.current = false;
    clearTimeout(reinicioRef.current);
    clearTimeout(silencioRef.current);
    descartar();
  }, [descartar]);

  const iniciar = useCallback(() => {
    setError(null);
    activaRef.current = true;
    pausadaRef.current = false;
    fallosRef.current = 0;
    ultimoErrorRef.current = "";
    limpiarFrase();
    // Se arranca dentro del toque del usuario (algunos navegadores lo exigen)
    arrancar();
  }, [arrancar, limpiarFrase]);

  const pausar = useCallback(() => {
    pausadaRef.current = true;
    clearTimeout(reinicioRef.current);
    limpiarFrase();
    descartar();
    setEscuchando(false);
  }, [descartar, limpiarFrase]);

  const reanudar = useCallback(() => {
    pausadaRef.current = false;
    limpiarFrase();
    programar(REANUDAR_MS);
  }, [limpiarFrase, programar]);

  return { escuchando, parcial, error, iniciar, pausar, reanudar };
}
