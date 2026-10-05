/**
 * useVoz.js
 * Voz del navegador (speechSynthesis) + apertura de boca para el avatar.
 *
 * - hablar(texto): Promise<boolean>. Se resuelve al terminar de hablar; true si
 *   efectivamente habló, false si el navegador no lo permitió (sin interacción
 *   previa con la página) o no hay voz disponible.
 * - callar(): corta lo que se esté diciendo.
 * - desbloquear(): se llama en la primera interacción con la página (clic/tecla)
 *   para que el navegador permita hablar después.
 * - boca: número 0..1 con la apertura actual de la boca.
 *
 * El texto se lee FRASE POR FRASE: en Chrome las voces de Google se cortan a
 * los ~15 s si se les pasa un texto largo de una vez. Las frases se guardan en
 * una referencia mientras se dicen (Chrome puede descartar la frase si nada la
 * referencia y nunca avisar que terminó).
 *
 * v2 (Ipo): se prefieren voces masculinas y, si no hay, se baja el tono.
 *
 * La boca se abre en cada palabra (evento "boundary") y se cierra suavemente.
 * Si el navegador no emite eventos de palabra, se usa una oscilación de respaldo.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const PREFERENCIA_IDIOMA = ["es-CL", "es-419", "es-US", "es-MX", "es-AR", "es-ES", "es"];
// Ipo es hombre: se prefieren voces masculinas cuando el navegador las tiene
// (Edge: Lorenzo de Chile, Jorge, Álvaro; Windows: Pablo, Raúl; Apple: Diego,
// Jorge, Juan). Muchos Android traen una sola voz en español; en ese caso se
// usa la que haya, con el tono más grave (TONO).
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

const MAX_CARACTERES_FRASE = 180;
const ESPERA_INICIO_MS = 5000;      // si la primera frase no parte en este tiempo, se considera bloqueada
const PALABRAS_POR_SEG = 2.3;        // para el tiempo máximo de seguridad por frase

function elegirVoz(voces) {
  const espanol = voces.filter((v) => v.lang && v.lang.toLowerCase().startsWith("es"));
  if (!espanol.length) return null;

  const puntaje = (v) => {
    const idx = PREFERENCIA_IDIOMA.findIndex((p) => v.lang.toLowerCase().startsWith(p.toLowerCase()));
    let p = idx === -1 ? 0 : (PREFERENCIA_IDIOMA.length - idx) * 10;
    const nombre = v.name.toLowerCase();
    if (PISTAS_VOZ_MASCULINA.some((m) => nombre.includes(m))) p += 25;
    if (PISTAS_VOZ_FEMENINA.some((f) => nombre.includes(f))) p -= 5;
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

export const vozSoportada = typeof window !== "undefined" && "speechSynthesis" in window;

export default function useVoz() {
  const [hablando, setHablando] = useState(false);
  const [boca, setBoca] = useState(0);

  const vozRef = useRef(null);
  const nivelRef = useRef(0);
  const ultimoLimiteRef = useRef(0);
  const hablandoRef = useRef(false);
  const rafRef = useRef(null);
  const turnoRef = useRef(0);         // cada hablar()/callar() invalida lo anterior
  const fraseActualRef = useRef(null); // referencia viva de la frase que se está diciendo

  // Cargar voces (en Chrome llegan de forma asíncrona)
  useEffect(() => {
    if (!vozSoportada) return undefined;
    const cargar = () => {
      vozRef.current = elegirVoz(window.speechSynthesis.getVoices());
    };
    cargar();
    window.speechSynthesis.addEventListener("voiceschanged", cargar);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", cargar);
  }, []);

  // Animación de la boca
  useEffect(() => {
    const tick = (t) => {
      if (hablandoRef.current) {
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

  const marcarHablando = (valor) => {
    hablandoRef.current = valor;
    setHablando(valor);
  };

  // Dice UNA frase. Resuelve "ok" | "error" | "bloqueada" | "cancelada".
  const decirFrase = useCallback((frase, turno, esPrimera) => {
    return new Promise((resolve) => {
      let empezo = false;
      let listo = false;
      const u = new SpeechSynthesisUtterance(frase);
      fraseActualRef.current = u;

      if (!vozRef.current) vozRef.current = elegirVoz(window.speechSynthesis.getVoices());
      if (vozRef.current) {
        u.voice = vozRef.current;
        u.lang = vozRef.current.lang;
      } else {
        u.lang = "es-CL";
      }
      u.rate = 1;
      const masculina = vozRef.current
        && PISTAS_VOZ_MASCULINA.some((m) => vozRef.current.name.toLowerCase().includes(m));
      u.pitch = masculina ? TONO_VOZ_MASCULINA : TONO_SIN_VOZ_MASCULINA;

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
        // Seguridad: si Chrome nunca avisa que terminó, se sigue igual
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

  const hablar = useCallback(async (texto) => {
    if (!vozSoportada || !texto) return false;
    turnoRef.current += 1;
    const turno = turnoRef.current;

    // Solo se limpia la cola si había algo sonando (cancelar y hablar de inmediato
    // puede anular la primera frase en Chrome).
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      await new Promise((r) => setTimeout(r, 150));
    }

    const frases = dividirEnFrases(texto);
    let hablo = false;
    for (let i = 0; i < frases.length; i += 1) {
      if (turno !== turnoRef.current) break;
      const resultado = await decirFrase(frases[i], turno, i === 0);
      if (resultado === "ok") hablo = true;
      if (resultado === "bloqueada" || resultado === "cancelada") break;
    }

    if (turno === turnoRef.current) {
      fraseActualRef.current = null;
      marcarHablando(false);
    }
    return hablo;
  }, [decirFrase]);

  const callar = useCallback(() => {
    turnoRef.current += 1;
    if (vozSoportada) window.speechSynthesis.cancel();
    fraseActualRef.current = null;
    marcarHablando(false);
  }, []);

  // Se llama en la primera interacción con la página: una frase muda deja al
  // navegador autorizado para hablar después.
  const desbloquear = useCallback(() => {
    if (!vozSoportada) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }, []);

  return { hablar, callar, desbloquear, hablando, boca };
}
