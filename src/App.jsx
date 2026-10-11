"use client";
import React, { useState, useEffect, useRef } from "react";
import "./app.css";

const BACKEND_BASE =
  import.meta?.env?.VITE_BACKEND_BASE||
  "https://asistencia-ica-backend.onrender.com";


import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaAsistentes from "./asistentes/comun/PantallaAsistentes.jsx";
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
     LINK DEL CORREO DE CONFIRMACIÓN DE RESERVA
     ?origen=reserva&c=<código cifrado>: el código (lo emite la ficha) prueba
     quién es el paciente, sin RUT ni nombre en la dirección (Ley 21.719). Con él
     el backend trae sus datos desde la ficha (no se le preguntan) y, al emitir la
     orden, el prediagnóstico queda grabado en su ficha. Links antiguos con
     ?rut=: no se confía en el RUT de la dirección (el paciente llena sus datos).
     ====================================================== */
  const _origenReserva = (() => {
    try {
      const q      = getQuery();
      const origen = q.get("origen") || "";
      const codigo = q.get("c")      || "";
      return { esReserva: origen === "reserva", codigo };
    } catch {
      return { esReserva: false, codigo: "" };
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
      // Sin estado previo: la asistente de voz es la entrada principal
      return sessionStorage.getItem("pantalla") || "avatar";
    } catch {
      return "avatar";
    }
  };

  const [pantalla, setPantalla]           = useState(initPantalla);
  const [fichaLista, setFichaLista]       = useState(!_origenReserva.esReserva);
  const [datosPaciente, setDatosPaciente] = useState(() => {
    try {
      if (_origenReserva.esReserva && _origenReserva.codigo) {
        return { origen: "reserva", codigo: _origenReserva.codigo };
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
     DATOS DEL PACIENTE DESDE EL CÓDIGO DEL CORREO — esperar antes de renderizar
     ====================================================== */
  useEffect(() => {
    if (!_origenReserva.esReserva || !_origenReserva.codigo) return;

    // El código sale de la barra de direcciones (no queda en el historial)
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("c");
      window.history.replaceState(null, "", url.toString());
    } catch {}

    async function cargarPaciente() {
      try {
        const res = await fetch(`${BACKEND_BASE}/paciente-verificado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo: _origenReserva.codigo }),
        });
        if (res.ok) {
          const d = await res.json();
          const datos = {
            rut:    d.rut,
            nombre: d.nombre,
            edad:   d.edad || undefined,
            genero: d.genero || undefined,
            email:  d.email || undefined,
            origen: "reserva",
            codigo: d.codigo,   // para grabar el prediagnóstico en su ficha
          };
          setDatosPaciente(datos);
          sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));
          sessionStorage.setItem("origen", "reserva");
          sessionStorage.setItem("modulo", "trauma");
        } else {
          // Link vencido o sin ficha: sigue sin datos (el paciente los escribe)
          setDatosPaciente(null);
        }
      } catch (e) {
        console.warn("No se pudieron traer los datos del paciente:", e);
        setDatosPaciente(null);
      } finally {
        setFichaLista(true);
      }
    }

    cargarPaciente();
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
  if (pantalla === "avatar") {
    return <PantallaAsistentes onUsarFormulario={() => setPantalla("uno")} />;
  }

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
