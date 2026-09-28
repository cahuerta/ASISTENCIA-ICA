/**
 * useEscucha.js
 * Reconocimiento de voz continuo del navegador (Web Speech API), español de Chile.
 *
 * - iniciar(): arranca la escucha (debe llamarse tras un toque del usuario).
 * - pausar():  detiene la escucha (se usa mientras el avatar habla, para que no se oiga a sí mismo).
 * - reanudar(): vuelve a escuchar.
 * - onFrase(texto): callback que recibe cada frase COMPLETA.
 *
 * Una frase se considera completa tras SILENCIO_MS sin resultados nuevos.
 * Mientras tanto, los trozos que el navegador va marcando como finales se
 * acumulan (Chrome, sobre todo en Android, marca como final cada trozo corto
 * y además repite el texto acumulado; aquí se evita duplicarlo).
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

const SILENCIO_MS = 3000;

const normalizar = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();

// Une dos trozos evitando duplicados cuando el navegador repite texto acumulado
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

export default function useEscucha({ onFrase, idioma = "es-CL" } = {}) {
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState("");
  const [error, setError] = useState(null);

  const recRef = useRef(null);
  const activaRef = useRef(false); // el usuario inició la sesión
  const pausadaRef = useRef(false); // pausada mientras el avatar habla
  const onFraseRef = useRef(onFrase);
  const reinicioRef = useRef(null);

  // Acumulación de la frase en curso
  const previoRef = useRef(""); // texto de sesiones de reconocimiento anteriores (tras cortes del navegador)
  const sesionFinalRef = useRef(""); // finales de la sesión actual
  const sesionParcialRef = useRef(""); // parcial de la sesión actual
  const ignorarHastaRef = useRef(0); // índice de resultados ya enviados en esta sesión
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
      // Marca como enviados los resultados de esta sesión
      if (recRef.current) ignorarHastaRef.current = Number.MAX_SAFE_INTEGER;
      enviarFrase();
    }, SILENCIO_MS);
  }, [enviarFrase]);

  const arrancar = useCallback(() => {
    const rec = recRef.current;
    if (!rec || !activaRef.current || pausadaRef.current) return;
    try {
      rec.start();
    } catch {
      // "already started": se ignora
    }
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) return undefined;

    const rec = new SpeechRecognition();
    rec.lang = idioma;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setEscuchando(true);
      ignorarHastaRef.current = 0;
      sesionFinalRef.current = "";
      sesionParcialRef.current = "";
    };

    rec.onresult = (evento) => {
      if (pausadaRef.current) return;

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
      if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
        activaRef.current = false;
        setError("Permiso de micrófono denegado. Actívalo en el navegador y recarga la página.");
      } else if (evento.error === "audio-capture") {
        setError("No se encontró un micrófono.");
      }
      // "no-speech", "aborted", "network": se ignoran y se reintenta en onend
    };

    rec.onend = () => {
      setEscuchando(false);
      // Conserva lo dicho en esta sesión para la frase en curso
      if (!pausadaRef.current) {
        previoRef.current = textoEnCurso();
      }
      sesionFinalRef.current = "";
      sesionParcialRef.current = "";

      if (activaRef.current && !pausadaRef.current) {
        clearTimeout(reinicioRef.current);
        reinicioRef.current = setTimeout(arrancar, 250);
      }
    };

    recRef.current = rec;

    return () => {
      activaRef.current = false;
      clearTimeout(reinicioRef.current);
      clearTimeout(silencioRef.current);
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        // sin acción
      }
      recRef.current = null;
    };
  }, [idioma, arrancar, programarEnvio]);

  const iniciar = useCallback(() => {
    setError(null);
    activaRef.current = true;
    pausadaRef.current = false;
    limpiarFrase();
    arrancar();
  }, [arrancar, limpiarFrase]);

  const pausar = useCallback(() => {
    pausadaRef.current = true;
    clearTimeout(reinicioRef.current);
    limpiarFrase();
    try {
      recRef.current?.abort();
    } catch {
      // sin acción
    }
  }, [limpiarFrase]);

  const reanudar = useCallback(() => {
    pausadaRef.current = false;
    limpiarFrase();
    clearTimeout(reinicioRef.current);
    reinicioRef.current = setTimeout(arrancar, 300);
  }, [arrancar, limpiarFrase]);

  return { escuchando, parcial, error, iniciar, pausar, reanudar };
}
