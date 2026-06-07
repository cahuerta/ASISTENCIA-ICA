"use client";
import React, { useState, useEffect, useRef } from "react";
import "./app.css";

const BACKEND_BASE =
  import.meta?.env?.VITE_BACKEND_BASE||
  "https://asistencia-ica-backend.onrender.com";

const ICA_API =
  import.meta?.env?.VITE_ICA_API_URL ||
  "https://services.icarticular.cl";

import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaDos from "./screens/PantallaDos.jsx";
import PantallaTres from "./screens/PantallaTres.jsx";
import PagoOkBanner from "./components/PagoOkBanner.jsx";

/**
 * APP con 3 pantallas
 * + GEO silencioso al inicio (GPS → IP → DEFAULT)
 */

// ── Calcula edad desde fecha_nacimiento ──────────────────────
function _calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return undefined;
  try {
    const hoy    = new Date();
    const nacido = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacido.getFullYear();
    const m  = hoy.getMonth() - nacido.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacido.getDate())) edad--;
    return edad > 0 ? edad : undefined;
  } catch { return undefined; }
}

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

  const fallbackIP = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/geo-ping`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

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

  // ← Si viene de reserva con geo en URL, usarla directamente sin pedir GPS
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("origen") === "reserva" && q.get("geo")) {
      const geoFromURL = JSON.parse(decodeURIComponent(q.get("geo")));
      sessionStorage.setItem("geo", JSON.stringify(geoFromURL));
      console.log("💾 GEO desde URL (reserva):", geoFromURL);
      return;
    }
  } catch {}

  if ("geolocation" in navigator) {
    timeoutId = setTimeout(() => {
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
     LEER origen=reserva DESDE URL
     ====================================================== */
  const _origenReserva = (() => {
    try {
      const q      = getQuery();
      const origen = q.get("origen") || "";
      const rut    = q.get("rut")    || "";
      return { esReserva: origen === "reserva", rut };
    } catch {
      return { esReserva: false, rut: "" };
    }
  })();

  /* ======================================================
     STATE INICIAL
     ====================================================== */
  const initPantalla = () => {
    try {
      const q = getQuery();
      if (q.get("origen") === "reserva") return "dos";
      if (q.get("pago") === "ok") return "dos";
      return sessionStorage.getItem("pantalla") || "uno";
    } catch {
      return "uno";
    }
  };

  const [pantalla, setPantalla]           = useState(initPantalla);
  const [fichaLista, setFichaLista]       = useState(!_origenReserva.esReserva);
  const [datosPaciente, setDatosPaciente] = useState(() => {
    try {
      if (_origenReserva.esReserva && _origenReserva.rut) {
        return { rut: _origenReserva.rut, origen: "reserva" };
      }
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
      if (_origenReserva.esReserva) return "trauma";
      return sessionStorage.getItem("modulo") || "trauma";
    } catch {
      return "trauma";
    }
  });

  const handledReturnRef = useRef(false);

  /* ======================================================
     CARGAR FICHA ADMIN DESDE ICA — esperar antes de renderizar
     ====================================================== */
  useEffect(() => {
    if (!_origenReserva.esReserva || !_origenReserva.rut) return;

    async function cargarFichaAdmin() {
      try {
        const res = await fetch(
          `${ICA_API}/api/fichas/admin/${_origenReserva.rut}`,
          { headers: { "X-Internal-User": "public_web" } }
        );
        if (res.ok) {
          const admin = await res.json();
          const nombre = [
            admin.nombre,
            admin.apellido_paterno,
            admin.apellido_materno
          ].filter(Boolean).join(" ");

          const datos = {
            rut:    admin.rut,
            nombre,
            edad:   _calcularEdad(admin.fecha_nacimiento),
            genero: admin.sexo   || undefined,
            email:  admin.email  || undefined,  // ← NUEVO
            origen: "reserva",
          };

          setDatosPaciente(datos);
          sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));
          sessionStorage.setItem("origen", "reserva");
          sessionStorage.setItem("modulo", "trauma");
          console.log("💾 Ficha admin cargada desde ICA:", datos);
        }
      } catch (e) {
        console.warn("⚠️ No se pudo cargar ficha admin desde ICA:", e);
      } finally {
        setFichaLista(true);
      }
    }

    cargarFichaAdmin();
  }, []);

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

    const q             = getQuery();
    const pago          = q.get("pago");
    const idFromURL     = q.get("idPago") || "";
    const moduloFromURL = q.get("modulo") || "";
    const origenFromURL = q.get("origen") || "";

    if (origenFromURL === "reserva") {
      handledReturnRef.current = true;
      return;
    }

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

  // ← Esperar ficha antes de renderizar PantallaDos
  if (!fichaLista) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100svh" }}>
        <p style={{ color: "#475569", fontSize: 15 }}>Cargando…</p>
      </div>
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
        autoModulo={_origenReserva.esReserva ? "trauma" : null}
      />
    </>
  );
      }
            
