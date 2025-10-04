// src/App.jsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import "./app.css";

import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaDos from "./screens/PantallaDos.jsx";

/**
 * APP con 2 pantallas:
 * - PantallaUno: ingreso de datos básicos
 * - PantallaDos: módulos y previews (Preop / Generales / IA / Trauma)
 *
 * Reglas clave:
 * - Si volvemos del pago con ?pago=ok, vamos directo a PantallaDos y dejamos
 *   que el módulo correspondiente detecte el pago y habilite descargas.
 * - Si volvemos del pago con ?pago=cancelado|error|rechazado (o cualquier valor ≠ "ok"),
 *   limpiamos todo y reiniciamos en PantallaUno.
 * - Mantenemos `datosPacienteJSON` y `modulo` en sessionStorage para que los módulos
 *   sepan qué mostrar y puedan restaurar estado.
 */

export default function App() {
  // ===== Helpers =====
  const getQuery = () => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams("");
    }
  };

  const resetAppHard = async () => {
    try {
      // Detener timers
      const maxId = setTimeout(() => {}, 0);
      for (let i = 0; i <= maxId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
    } catch {}

    try {
      sessionStorage.clear();
    } catch {}
    try {
      localStorage.clear();
    } catch {}

    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {}

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}

    // URL limpia (sin ?pago=...)
    let cleanUrl = window.location.href;
    try {
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      cleanUrl = url.toString();
      window.history.replaceState(null, "", cleanUrl);
    } catch {}

    // Recarga dura
    try {
      window.location.replace(cleanUrl);
    } catch {
      window.location.reload();
    }
  };

  // ===== Pantalla inicial =====
  const initPantalla = () => {
    try {
      const q = getQuery();
      if (q.get("pago") === "ok") return "dos";
      const saved = sessionStorage.getItem("pantalla");
      return saved || "uno";
    } catch {
      return "uno";
    }
  };

  // ===== State =====
  const [pantalla, setPantalla] = useState(initPantalla); // "uno" | "dos"
  const [datosPaciente, setDatosPaciente] = useState(() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [pagoOk, setPagoOk] = useState(false);
  const [idPago, setIdPago] = useState(() => {
    try {
      return sessionStorage.getItem("idPago") || "";
    } catch {
      return "";
    }
  });
  const [moduloActual, setModuloActual] = useState(() => {
    try {
      return sessionStorage.getItem("modulo") || "trauma";
    } catch {
      return "trauma";
    }
  });

  const handledReturnRef = useRef(false);

  // ===== Persistir pantalla =====
  useEffect(() => {
    try {
      sessionStorage.setItem("pantalla", pantalla);
    } catch {}
  }, [pantalla]);

  // ===== Procesar retorno de pago (OK o NO OK) =====
  useEffect(() => {
    if (handledReturnRef.current) return;

    const q = getQuery();
    const pago = q.get("pago");
    const idFromURL = q.get("idPago") || "";
    const moduloFromURL = q.get("modulo") || "";

    // Si hay idPago en URL, persistirlo (los módulos lo usan para descargar)
    if (idFromURL) {
      try {
        sessionStorage.setItem("idPago", idFromURL);
      } catch {}
      setIdPago(idFromURL);
    }

    // Si viene el módulo en la URL lo respetamos; si no, usamos lo que ya estaba
    if (moduloFromURL) {
      try {
        sessionStorage.setItem("modulo", moduloFromURL);
      } catch {}
      setModuloActual(moduloFromURL);
    } else {
      try {
        const savedModulo = sessionStorage.getItem("modulo");
        if (savedModulo) setModuloActual(savedModulo);
      } catch {}
    }

    if (pago === "ok") {
      setPagoOk(true);
      setPantalla("dos");
      handledReturnRef.current = true;
      // No limpiamos los parámetros aquí: los módulos leen ?pago=ok para habilitar descargas.
      return;
    }

    // Si venimos con ?pago distinto de "ok", reiniciar completamente
    if (pago && pago !== "ok") {
      handledReturnRef.current = true;
      resetAppHard();
    }
  }, []);

  // ===== Hidratar datos si estamos en PantallaDos y no hay estado =====
  useEffect(() => {
    if (pantalla === "dos" && !datosPaciente) {
      try {
        const raw = sessionStorage.getItem("datosPacienteJSON");
        if (raw) setDatosPaciente(JSON.parse(raw));
      } catch {}
    }
  }, [pantalla, datosPaciente]);

  // ===== Navegación básica =====
  const irPantallaDos = (datos) => {
    let next = datos;
    if (!next) {
      try {
        const raw = sessionStorage.getItem("datosPacienteJSON");
        next = raw ? JSON.parse(raw) : null;
      } catch {
        next = null;
      }
    }
    if (next) {
      setDatosPaciente(next);
      try {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next));
      } catch {}
    }
    setPantalla("dos");
  };

  // Compatibilidad: algunas implementaciones antiguas llamaban a "irPantallaTres".
  // Lo preservamos como NO-OP que deja todo en PantallaDos.
  const irPantallaTres = (datos) => {
    if (datos) {
      setDatosPaciente(datos);
      try {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));
      } catch {}
    }
    setPantalla("dos");
  };

  // ===== Render =====
  if (pantalla === "uno") {
    return <PantallaUno onIrPantallaDos={irPantallaDos} />;
  }

  // pantalla === "dos"
  return (
    <PantallaDos
      initialDatos={datosPaciente}
      // Props informativas para coordinar la UI de módulos dentro de PantallaDos:
      pagoOk={pagoOk}
      idPago={idPago}
      moduloActual={moduloActual}
      onIrPantallaTres={irPantallaTres} // compat
      onReset={resetAppHard}
    />
  );
}
