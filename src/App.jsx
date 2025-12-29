"use client";
import React, { useState, useEffect, useRef } from "react";
import "./app.css";

const BACKEND_BASE =
  import.meta?.env?.VITE_BACKEND_URL ||
  "https://asistencia-ica-backend.onrender.com";

import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaDos from "./screens/PantallaDos.jsx";
import PantallaTres from "./screens/PantallaTres.jsx";
import PagoOkBanner from "./components/PagoOkBanner.jsx";

/**
 * APP con 3 pantallas
 * + GEO silencioso al inicio (GPS → IP → DEFAULT)
 */

export default function App() {
  /* ======================================================
     GEO INICIAL (GPS → IP → DEFAULT)
     ====================================================== */
  useEffect(() => {
    let timeoutId;

   const enviarGeo = async (geo) => {
  try {
    const res = await fetch(`${BACKEND_BASE}/geo-ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geo }),
    });

    const data = await res.json();

    // 🔎 LOG CLAVE
    console.log("📥 GEO recibido (POST /geo-ping):", data);

    if (data?.geo) {
      sessionStorage.setItem("geo", JSON.stringify(data.geo));
      console.log(
        "💾 GEO guardado en sessionStorage:",
        sessionStorage.getItem("geo")
      );
    } else {
      console.warn("⚠️ Backend respondió sin geo:", data);
    }
  } catch (e) {
    console.error("❌ Error enviando GEO (POST):", e);
  }
};
🔹 Modifica fallbackIP así:
js
Copiar código
const fallbackIP = async () => {
  try {
    const res = await fetch(`${BACKEND_BASE}/geo-ping`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();

    // 🔎 LOG CLAVE
    console.log("📥 GEO recibido (GET /geo-ping):", data);

    if (data?.geo) {
      sessionStorage.setItem("geo", JSON.stringify(data.geo));
      console.log(
        "💾 GEO guardado en sessionStorage:",
        sessionStorage.getItem("geo")
      );
    } else {
      console.warn("⚠️ Backend respondió sin geo (IP):", data);
    }
  } catch (e) {
    console.error("❌ Error enviando GEO (GET):", e);
  }
};


    if (data?.geo) {
      sessionStorage.setItem("geo", JSON.stringify(data.geo));
    }
  } catch {}
};

    const fallbackIP = async () => {
  try {
    const res = await fetch(`${BACKEND_BASE}/geo-ping`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.geo) {
      sessionStorage.setItem("geo", JSON.stringify(data.geo));
    }
  } catch {}
};

    // Intento GPS
    if ("geolocation" in navigator) {
      timeoutId = setTimeout(() => {
        // si el usuario no responde → fallback IP
        fallbackIP();
      }, 8000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeoutId);
          enviarGeo({
            source: "gps",
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => {
          clearTimeout(timeoutId);
          fallbackIP();
        },
        {
          enableHighAccuracy: false,
          timeout: 7000,
          maximumAge: 60000,
        }
      );
    } else {
      fallbackIP();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  /* ======================================================
     HELPERS
     ====================================================== */
  const getQuery = () => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams("");
    }
  };

  const resetAppHard = async () => {
    try {
      const maxId = setTimeout(() => {}, 0);
      for (let i = 0; i <= maxId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
    } catch {}

    try {
      sessionStorage.clear();
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

    try {
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  /* ======================================================
     STATE INICIAL
     ====================================================== */
  const initPantalla = () => {
    try {
      const q = getQuery();
      if (q.get("pago") === "ok") return "dos";
      return sessionStorage.getItem("pantalla") || "uno";
    } catch {
      return "uno";
    }
  };

  const [pantalla, setPantalla] = useState(initPantalla);
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

  /* ======================================================
     PERSISTIR PANTALLA
     ====================================================== */
  useEffect(() => {
    try {
      sessionStorage.setItem("pantalla", pantalla);
    } catch {}
  }, [pantalla]);

  /* ======================================================
     RETORNO DE PAGO
     ====================================================== */
  useEffect(() => {
    if (handledReturnRef.current) return;

    const q = getQuery();
    const pago = q.get("pago");
    const idFromURL = q.get("idPago") || "";
    const moduloFromURL = q.get("modulo") || "";

    if (idFromURL) {
      try {
        sessionStorage.setItem("idPago", idFromURL);
      } catch {}
      setIdPago(idFromURL);
    }

    if (moduloFromURL) {
      try {
        sessionStorage.setItem("modulo", moduloFromURL);
      } catch {}
      setModuloActual(moduloFromURL);
    }

    if (pago === "ok") {
      setPagoOk(true);
      setPantalla("dos");
      handledReturnRef.current = true;
      return;
    }

    if (pago && pago !== "ok") {
      handledReturnRef.current = true;
      resetAppHard();
      return;
    }

    const hayRestosPrevios = (() => {
      try {
        return [
          "idPago",
          "trauma_ia_examenes",
          "trauma_ia_diagnostico",
        ].some((k) => sessionStorage.getItem(k));
      } catch {
        return false;
      }
    })();

    if (hayRestosPrevios) {
      handledReturnRef.current = true;
      resetAppHard();
    }
  }, []);

  /* ======================================================
     NAVEGACIÓN
     ====================================================== */
  const irPantallaDos = (datos) => {
    if (datos) {
      setDatosPaciente(datos);
      try {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));
      } catch {}
    }
    setPantalla("dos");
  };

  const irPantallaTres = (datos) => {
    if (datos) {
      setDatosPaciente(datos);
      try {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));
      } catch {}
    }
    setPantalla("tres");
  };

  const handleVolverDesdePago = () => {
    try {
      const savedModulo = sessionStorage.getItem("modulo");
      if (savedModulo) setModuloActual(savedModulo);
    } catch {}
    setPantalla("dos");
  };

  /* ======================================================
     RENDER
     ====================================================== */
  if (pantalla === "uno") {
    return <PantallaUno onIrPantallaDos={irPantallaDos} />;
  }

  if (pantalla === "tres") {
    return (
      <PantallaTres
        datosPaciente={datosPaciente}
        onVolver={handleVolverDesdePago}
      />
    );
  }

  const moduloFromURL = (() => {
    try {
      return getQuery().get("modulo") || "";
    } catch {
      return "";
    }
  })();

  const shouldShowBanner =
    pagoOk &&
    Boolean(idPago) &&
    (moduloFromURL ? moduloFromURL === moduloActual : true);

  return (
    <>
      {shouldShowBanner && <PagoOkBanner />}
      <PantallaDos
        initialDatos={datosPaciente}
        pagoOk={pagoOk}
        idPago={idPago}
        moduloActual={moduloActual}
        onIrPantallaTres={irPantallaTres}
        onReset={resetAppHard}
      />
    </>
  );
}
