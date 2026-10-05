/**
 * comun/agenda.js
 * Buscar hora con un medico (la hace Ica, o Ipo si se entra directo a la app):
 * reconoce al medico por su nombre en la lista de profesionales de la ficha
 * clinica (/professionals publico); si hay varios pregunta cual; si no sabe con
 * quien, pasa al flujo de dolor. La agenda es la pagina de reservas de la ficha
 * (reservas.icarticular.cl?modo=asistente) dentro de un iframe: en la URL solo va
 * lo no personal (dr, zona, lat, lon); RUT, nombre y correo van por postMessage
 * (ver PantallaAsistentes.jsx). Boton y voz "volver"; a los 2 minutos sin
 * actividad pregunta "¿Ya tomaste una decision?"; al reservar confirma por voz.
 *
 * crearAgenda(api, f): api = herramientas de la pantalla (decir, preguntar,
 * estados y referencias); f = funciones de todos los asistentes (f.icaDolor,
 * f.dolorDesdeHora). Devuelve { flujoHora, abrirAgenda, volverDeAgenda }.
 */
import { FRASES_COMUNES } from "./textosComunes.js";
import { interpretarMedico, interpretarVolver, nombreEnVoz } from "./interpretar.js";

// Ficha clinica: lista de profesionales (backend) y pagina de reservas (iframe)
const FICHA_API = import.meta.env.VITE_FICHA_API || "https://services.icarticular.cl";
export const RESERVAS_URL = import.meta.env.VITE_RESERVAS_URL || "https://reservas.icarticular.cl";
export const RESERVAS_ORIGEN = new URL(RESERVAS_URL).origin;

// Sin actividad en la agenda este tiempo -> "¿Ya tomaste una decision?"
const RECORDATORIO_MS = 120000;

// Profesionales publicos de ICA en la ficha clinica: [{ id, name, specialty }]
export async function cargarMedicos() {
  try {
    const res = await fetch(`${FICHA_API}/professionals?public=true&scope=ica`);
    if (!res.ok) return [];
    const data = await res.json();
    const lista = Array.isArray(data) ? data : Array.isArray(data?.professionals) ? data.professionals : [];
    return lista
      .filter((p) => p && p.id && p.name)
      .map((p) => ({ id: String(p.id), name: String(p.name), specialty: String(p.specialty || "") }));
  } catch {
    return [];
  }
}

// Coordenadas para buscar especialistas cerca (sin pedir de nuevo si ya las negó).
// Redondeadas a ~1 km: solo sirven para saber la region.
function obtenerCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: Math.round(pos.coords.latitude * 100) / 100,
        lon: Math.round(pos.coords.longitude * 100) / 100,
      }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 },
    );
  });
}

// "2026-10-06" -> "martes 6 de octubre"
export function fechaEnVoz(fecha) {
  const d = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
}

// Solo se acepta una reserva con forma valida desde la pagina de reservas
export function leerReserva(d) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.date || "") || !/^\d{1,2}:\d{2}$/.test(d.time || "")) return null;
  return {
    date: d.date,
    time: d.time,
    professionalName: typeof d.professionalName === "string" ? d.professionalName.slice(0, 120) : "",
    tipo: d.modalidad === "telemedicina" ? "telemedicina" : "presencial",
  };
}

export function crearAgenda(api, f) {
  const {
    vigente, decir, callar, preguntarCerrada, elegirModulo,
    setPregunta, setEntendido, setProgreso, setAgenda, setReserva, setFase, setEsperando,
    ctxRef, datosRef, prefillRef, pendienteRef, agendaRef, actividadRef, esperaRef, escuchaRef, vozOkRef, personajeRef,
  } = api;

  // ---------- hora con un medico ----------
  const flujoHora = async (sesion) => {
    const medicos = await cargarMedicos();
    vigente(sesion);
    if (!medicos.length) {
      await decir(sesion, FRASES_COMUNES.sinMedicos);
      return abrirAgenda(sesion, {});
    }
    const botones = [
      ...medicos.map((m) => ({ etiqueta: m.name, valor: { medico: m } })),
      { etiqueta: "No sé con quién", valor: { nosabe: true, zona: null } },
    ];
    let { valor } = await preguntarCerrada(
      sesion, "medico", FRASES_COMUNES.queMedico, FRASES_COMUNES.repreguntaMedico, false,
      (t) => interpretarMedico(t, medicos), botones,
    );
    if (valor.varios) {
      const lista = valor.varios;
      ({ valor } = await preguntarCerrada(
        sesion, "medico", FRASES_COMUNES.cualMedico, FRASES_COMUNES.repreguntaCualMedico, true,
        (t) => { const r = interpretarMedico(t, lista); return r?.medico ? r : null; },
        lista.map((m) => ({ etiqueta: m.name, valor: { medico: m } })),
      ));
    }
    if (valor.medico) return abrirAgenda(sesion, { medico: valor.medico });

    // No sabe con quien: flujo de dolor (si ya dijo la zona, no se repregunta).
    // Ica pregunta zona y lado y se lo pasa a Ipo; Ipo lo atiende directo.
    if (valor.zona) ctxRef.current.zona = valor.zona;
    elegirModulo("trauma");
    setEntendido("");
    if (personajeRef.current === "ica") return f.icaDolor(sesion);
    return f.dolorDesdeHora(sesion);
  };

  // ---------- agenda de la ficha clinica (iframe) ----------
  const esperarAgenda = (sesion) =>
    new Promise((resolve) => {
      let timer = null;
      const fin = (r) => {
        if (agendaRef.current !== fin) return;
        clearTimeout(timer);
        agendaRef.current = null;
        actividadRef.current = null;
        esperaRef.current = null;
        setEsperando(false);
        escuchaRef.current?.pausar();
        resolve(r);
      };
      const armar = () => {
        clearTimeout(timer);
        timer = setTimeout(() => fin({ recordatorio: true }), RECORDATORIO_MS);
      };
      agendaRef.current = fin;
      actividadRef.current = armar;
      esperaRef.current = fin; // voz y boton "volver"
      setEsperando(true);
      if (vozOkRef.current) escuchaRef.current?.reanudar();
      armar();
    }).then((r) => {
      vigente(sesion);
      return r;
    });

  // Boton "Volver con Ica/Ipo": funciona aunque este hablando
  const volverDeAgenda = () => {
    if (agendaRef.current) agendaRef.current({ valor: "volver", texto: "volver" });
    else {
      pendienteRef.current.volver = true;
      callar();
    }
  };

  const abrirAgenda = async (sesion, { medico = null, zona = null }) => {
    const q = new URLSearchParams({ modo: "asistente" });
    if (medico) q.set("dr", medico.id);
    else {
      if (zona) q.set("zona", zona);
      const coords = await obtenerCoords();
      vigente(sesion);
      if (coords) { q.set("lat", String(coords.lat)); q.set("lon", String(coords.lon)); }
    }
    // Datos personales solo por postMessage, nunca en la URL
    const d = datosRef.current;
    const sexo = ctxRef.current.sexo || "";
    prefillRef.current = d || sexo ? { rut: d?.rut || "", nombre: d?.nombre || "", email: d?.email || "", sexo } : null;
    pendienteRef.current = {};

    setPregunta(null);
    setEntendido("");
    setProgreso(0);
    setAgenda({ url: `${RESERVAS_URL}/?${q.toString()}` });
    setFase("agenda");
    await decir(sesion, medico ? FRASES_COMUNES.agendaMedico(nombreEnVoz(medico.name))
      : zona ? FRASES_COMUNES.agendaZona(zona.toLowerCase()) : FRASES_COMUNES.agendaGeneral);

    for (;;) {
      const p = pendienteRef.current;
      pendienteRef.current = {};
      const r = p.reservado ? { reservado: p.reservado } : p.volver ? { valor: "volver" } : await esperarAgenda(sesion);

      if (r.reservado) {
        setAgenda(null);
        setReserva(r.reservado);
        setFase("conversacion");
        await decir(sesion, FRASES_COMUNES.horaReservada(
          `${fechaEnVoz(r.reservado.date)} a las ${r.reservado.time}`,
          nombreEnVoz(r.reservado.professionalName),
          r.reservado.tipo === "telemedicina",
        ));
        return api.algoMas(sesion);
      }
      if (r.recordatorio) {
        await decir(sesion, FRASES_COMUNES.recordatorioAgenda);
        continue;
      }
      const accion = r.valor || interpretarVolver(r.texto);
      if (accion === "volver") {
        setAgenda(null);
        return api.menu(sesion, "volver");
      }
      if (accion === "seguir") await decir(sesion, FRASES_COMUNES.seguirAgenda);
      // cualquier otra frase se ignora: sigue escuchando
    }
  };

  return { flujoHora, abrirAgenda, volverDeAgenda };
}
