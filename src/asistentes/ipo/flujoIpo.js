/**
 * ipo/flujoIpo.js
 * Lo que hace Ipo, el asistente de dolor y examenes.
 *
 * MENU (entrando directo a la app): dolor | examenes generales | examenes para
 *    cirugia. Ipo no busca horas: si el paciente la pide, se lo pasa a Ica. Si viene
 *    de Ica, no hay menu: Ica le pasa el paciente con la zona y el lado
 *    (recibirDolorDeIca: confirma "Ica me conto que te duele la rodilla derecha,
 *    ¿es asi?") o directo a los examenes.
 *
 * DOLOR:
 * 1. Anamnesis oral guiada (bancoPreguntas.js): zona, lado, edad, sexo, banderas
 *    rojas por zona (grave -> se detiene y deriva a urgencia) y preguntas abiertas.
 * 2. Puntos dolorosos en el esquema de la zona (mismos mappers de ICA). Si dijo
 *    solo "espalda", marca en el dibujo posterior si es cervical, dorsal o lumbar.
 * 3. /ia-trauma (modulo de trauma del backend) con la conversacion completa en
 *    "consulta" + edad, sexo, zona, lado y puntos: devuelve 1 diagnostico y 1
 *    examen del catalogo estandarizado de la zona (con fallback si la IA falla).
 * 4. Dice el diagnostico presuntivo, el fundamento y el examen.
 * 5. "¿Te hago la orden de examenes, o te busco hora con el especialista?"
 *    orden | hora | ambas | ninguna. Orden: formulario (nombre, RUT, correo) ->
 *    checklist de resonancia si corresponde -> /api/pdf-ia-orden. Para la hora,
 *    Ipo busca el especialista de la zona (/resolver-derivacion), lo recomienda y
 *    se lo pasa a Ica, que abre su agenda (devolverAIca). Solo orden: al final
 *    recomienda al especialista y ofrece hora.
 *
 * EXAMENES GENERALES / PREOPERATORIO (mismos endpoints que los modulos de ICA):
 *    edad, sexo, (cirugia y lado), enfermedades por grupos con botones abajo,
 *    alergias y otras -> /ia-generales o /ia-preop -> dice los examenes ->
 *    "¿quieres la orden?" -> datos -> /guardar-datos-generales|preop -> /pdf-generales|preop.
 *
 * crearFlujoIpo(api, f): api = herramientas de la pantalla (decir, preguntar,
 * estados y referencias); f = funciones de todos (f.abrirAgenda, f.flujoHora,
 * f.recibirDeIpo). Devuelve las funciones de Ipo.
 */
import { MENU, ACCION_FINAL, SALUDO, FRASES, TRASPASO_IPO } from "./textosIpo.js";
import { PREGUNTAS, esColumna, GRUPOS_COMORBILIDAD, PREGUNTAS_EXTRA, CIRUGIAS } from "./bancoPreguntas.js";
import { TIPO_EXAMEN } from "../comun/textosComunes.js";
import {
  esRespuestaVacia, construirConsulta, vozResultado, incluyeResonancia,
  interpretarMedico, nombreEnVoz, vozExamenes, zonaEnVoz,
} from "../comun/interpretar.js";
import { cargarMedicos } from "../comun/agenda.js";
import { resolveZonaKey } from "../../mappers/mapperRegistry.js";

// import.meta.env sin "?.": Vite solo reemplaza la forma exacta al compilar
// (con "?." las variables VITE_ nunca se aplicaban y siempre quedaba el valor por defecto)
export const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_BASE || "https://asistencia-ica-backend.onrender.com";

export const ZONAS_MAPPER = ["rodilla", "mano", "hombro", "codo", "cadera", "tobillo"];

// Endpoints de cada tipo de orden (los mismos de los modulos de ICA)
export const ORDEN = {
  trauma: { pdf: (id) => `/api/pdf-ia-orden/${id}`, archivo: "orden_examenes_ICA.pdf" },
  generales: { pdf: (id) => `/pdf-generales/${id}`, archivo: "orden_examenes_generales_ICA.pdf" },
  preop: { pdf: (id) => `/pdf-preop/${id}`, archivo: "orden_preoperatoria_ICA.pdf" },
};

// Ubicacion que ICA guarda al abrir (GPS -> IP), la misma que usa el resto de ICA
function leerGeo() {
  try {
    const g = JSON.parse(sessionStorage.getItem("geo") || "null");
    return g && typeof g === "object" ? g : null;
  } catch {
    return null;
  }
}

// Mismo resumen de checklist que usa el modulo IA de ICA
const ETIQUETAS_RM = {
  marcapasos: "Marcapasos/DAI", coclear_o_neuro: "Implante coclear/neuroestimulador",
  clips_aneurisma: "Clips de aneurisma", valvula_cardiaca_metal: "Implante metálico intracraneal",
  fragmentos_metalicos: "Fragmentos metálicos/balas", protesis_placas_tornillos: "Prótesis/placas/tornillos",
  cirugia_reciente_3m: "Cirugía reciente (<3m) con implante", embarazo: "Embarazo o sospecha",
  claustrofobia: "Claustrofobia importante", peso_mayor_150: "Peso > 150 kg",
  no_permanece_inmovil: "Dificultad para inmovilidad", tatuajes_recientes: "Tatuajes/PMU < 6 semanas",
  piercings_no_removibles: "Piercings no removibles", bomba_insulina_u_otro: "Dispositivo externo activo",
  requiere_contraste: "Requiere contraste", erc_o_egfr_bajo: "Insuficiencia renal / eGFR < 30",
  alergia_gadolinio: "Alergia a gadolinio", reaccion_contrastes: "Reacción a contrastes previos",
  requiere_sedacion: "Requiere sedación", ayuno_6h: "Ayuno 6h (si sedación)",
};

function resumenRM(form = {}) {
  const marcadas = Object.keys(ETIQUETAS_RM).filter((k) => form[k] === true).map((k) => `• ${ETIQUETAS_RM[k]}`);
  const partes = [marcadas.length ? marcadas.join("\n") : "• Sin alertas marcadas en checklist."];
  const obs = (form.observaciones || "").trim();
  if (obs) partes.push(`Observaciones: ${obs}`);
  return partes.join("\n");
}

// Borra puntos de sesiones anteriores guardados por los mappers
export function limpiarPuntosPrevios() {
  try {
    Object.keys(sessionStorage).forEach((k) => {
      if (ZONAS_MAPPER.some((z) => k.startsWith(`${z}_`) || k.startsWith(`${z}:`)) || k === "resonanciaJSON") {
        sessionStorage.removeItem(k);
      }
    });
  } catch {}
}

async function postJSON(ruta, cuerpo) {
  const res = await fetch(`${BACKEND_BASE}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export function crearFlujoIpo(api, f) {
  const {
    vigente, decir, hablar, preguntarCerrada, preguntarAbierta, preguntarGrupo, esperarPuntos,
    elegirModulo, nuevoFlujo, getInforme,
    setFase, setPregunta, setEntendido, setProgreso, setResumen, setInforme, setError, setMarcadas,
    setOrdenUrl, setConCorreo,
    sesionRef, ctxRef, registroRef, idPagoRef, avisosRef, examenesRef, ordenRef, datosRef,
    conCorreoRef, moduloRef, personajeRef, desdeIcaRef,
  } = api;

  // ---------- menu de Ipo (entrando directo a la app) ----------
  const menuIpo = async (sesion, cual = "inicio") => {
    const texto = cual === "otraVez" ? MENU.otraVez : cual === "volver" ? MENU.volver : MENU.texto;
    setFase("conversacion");
    setProgreso(0);
    setResumen(false);
    let { valor } = await preguntarCerrada(sesion, "menu", texto, MENU.repregunta, true);
    setEntendido("");
    nuevoFlujo();
    if (valor === "examenes") {
      ({ valor } = await preguntarCerrada(sesion, "tipoExamen", TIPO_EXAMEN.texto, TIPO_EXAMEN.repregunta, true));
      setEntendido("");
    }
    elegirModulo(valor === "dolor" ? "trauma" : valor);
    // Pidio hora (por voz): la busca Ica
    if (valor === "hora") {
      await devolverAIca(sesion, "hora");
      return f.flujoHora(sesion);
    }
    if (valor === "generales" || valor === "preop") return flujoExamenes(sesion, valor);
    return conversar(sesion);
  };

  // Pidio hora sin saber con quien (entrando directo a la app): consulta de dolor
  const dolorDesdeHora = async (sesion) => {
    await decir(sesion, FRASES.ayudaDolor);
    return conversar(sesion, { sinSaludo: true });
  };

  // ---------- traspasos con Ica ----------
  // Ica (o el asistente de MiSalud) ya pregunto zona y lado: Ipo confirma y sigue
  const recibirDolorDeIca = async (sesion, { quien = "Ica" } = {}) => {
    const ctx = ctxRef.current;
    const donde = zonaEnVoz(ctx.zona, ctx.lado);
    const { valor } = await preguntarCerrada(
      sesion, "sino", TRASPASO_IPO.confirma(donde, quien), TRASPASO_IPO.repreguntaConfirma(donde), true,
    );
    setEntendido("");
    if (!valor) {
      delete ctx.zona;
      delete ctx.lado;
      await decir(sesion, TRASPASO_IPO.corrige);
      return conversar(sesion, { sinSaludo: true });
    }
    return conversar(sesion);
  };

  // Ica le pidio examenes generales o preoperatorio: directo a ese modulo
  const recibirExamenesDeIca = async (sesion, tipo) => {
    await decir(sesion, TRASPASO_IPO.examenes);
    return flujoExamenes(sesion, tipo);
  };

  // Le pasa el paciente a Ica.
  //  "hora": siempre (la hora la busca Ica), aunque haya entrado directo a Ipo.
  //  "fin":  solo si vino de Ica (si entro directo, Ipo se despide).
  const devolverAIca = async (sesion, motivo) => {
    if (personajeRef.current !== "ipo") return;
    const vinoDeIca = desdeIcaRef.current;
    if (motivo !== "hora" && !vinoDeIca) return;
    setPregunta(null);
    await decir(sesion, motivo !== "hora" ? TRASPASO_IPO.aIcaFin
      : vinoDeIca ? TRASPASO_IPO.aIcaHora : TRASPASO_IPO.aIcaHoraPrimera);
    desdeIcaRef.current = true;
    await f.recibirDeIpo(sesion, { primeraVez: !vinoDeIca });
  };

  // Especialista de la zona (el mismo que sale impreso en la orden) y, si esta en
  // la agenda de la ficha, su ficha para abrir su agenda. { doctor, medico } | {}
  const buscarEspecialista = async (sesion, zona) => {
    let doctor = null;
    try {
      const r = await postJSON("/resolver-derivacion", { dolor: zona, geo: leerGeo() || undefined });
      doctor = r?.doctor?.nombre ? r.doctor : null;
    } catch {
      // sin recomendacion: Ica muestra los especialistas de la zona
    }
    vigente(sesion);
    let medico = null;
    if (doctor) {
      const medicos = await cargarMedicos();
      vigente(sesion);
      medico = interpretarMedico(doctor.nombre, medicos)?.medico || null;
    }
    return { doctor, medico };
  };

  // Recomienda al especialista y se lo pasa a Ica, que abre su agenda
  const horaConEspecialista = async (sesion) => {
    const zona = ctxRef.current.zona;
    const { doctor, medico } = await buscarEspecialista(sesion, zona);
    if (doctor) await decir(sesion, TRASPASO_IPO.recomendarHora(nombreEnVoz(doctor.nombre), zonaEnVoz(zona, ctxRef.current.lado)));
    await devolverAIca(sesion, "hora");
    return f.abrirAgenda(sesion, medico ? { medico } : { zona });
  };

  const etiquetaComorb = (key) => {
    for (const g of GRUPOS_COMORBILIDAD) {
      const it = g.items.find((i) => i.key === key);
      if (it) return it.etiqueta;
    }
    return key;
  };

  // ---------- examenes generales / preoperatorio ----------
  const flujoExamenes = async (sesion, tipo) => {
    const ctx = ctxRef.current;
    const pasos = tipo === "preop" ? 10 : 8;
    let paso = 0;
    const avanzar = () => setProgreso(Math.round((++paso / pasos) * 100));

    setFase("conversacion");
    await decir(sesion, tipo === "preop" ? FRASES.inicioPreop : FRASES.inicioGenerales);

    let tipoCirugia = "";
    if (tipo === "preop") {
      const { valor } = await preguntarCerrada(sesion, "cirugia", FRASES.cirugia, FRASES.repreguntaCirugia, true);
      avanzar();
      const cir = CIRUGIAS.find((c) => c.valor === valor);
      if (valor === "OTRA") {
        tipoCirugia = String(await preguntarAbierta(sesion, FRASES.cirugiaOtra) || "").trim().toUpperCase();
      } else {
        tipoCirugia = valor;
      }
      if (cir?.zona) {
        ctx.zona = cir.zona;
        const { valor: lado } = await preguntarCerrada(sesion, "lado", FRASES.ladoCirugia, PREGUNTAS[1].repregunta, true);
        ctx.lado = lado;
      }
      avanzar();
    }

    const pEdad = PREGUNTAS.find((p) => p.id === "edad");
    const pSexo = PREGUNTAS.find((p) => p.id === "sexo");
    // Edad y sexo: solo si no vinieron ya (desde MiSalud)
    if (!ctx.edad) ctx.edad = (await preguntarCerrada(sesion, "edad", pEdad.texto, pEdad.repregunta)).valor;
    avanzar();
    if (!ctx.sexo) ctx.sexo = (await preguntarCerrada(sesion, "sexo", pSexo.texto, pSexo.repregunta, true)).valor;
    avanzar();

    // Enfermedades por grupos, botones abajo
    await decir(sesion, FRASES.enfermedades);
    const comorbilidades = {};
    GRUPOS_COMORBILIDAD.forEach((g) => g.items.forEach((i) => { comorbilidades[i.key] = false; }));
    const lista = [];
    setMarcadas([]);
    for (const grupo of GRUPOS_COMORBILIDAD) {
      const claves = await preguntarGrupo(sesion, grupo);
      claves.forEach((k) => { comorbilidades[k] = true; lista.push(etiquetaComorb(k)); });
      setMarcadas([...lista]);
      setEntendido(claves.length ? claves.map(etiquetaComorb).join(", ") : "Ninguna");
      avanzar();
    }

    // Alergias
    const rAl = await preguntarCerrada(sesion, "sino", PREGUNTAS_EXTRA.alergias, `Responde sí o no, por favor: ${PREGUNTAS_EXTRA.alergias}`, true);
    let alergiasDetalle = "";
    if (rAl.valor) {
      alergiasDetalle = String(await preguntarAbierta(sesion, PREGUNTAS_EXTRA.alergiasCual) || "").trim();
      lista.push(`Alergia: ${alergiasDetalle || "sí"}`);
      setMarcadas([...lista]);
    }
    avanzar();

    // Otras enfermedades (opcional)
    const otrasResp = await preguntarAbierta(sesion, PREGUNTAS_EXTRA.otras, true);
    const otras = esRespuestaVacia(otrasResp) ? "" : String(otrasResp || "").trim();
    if (otras) { lista.push(otras); setMarcadas([...lista]); }
    setProgreso(100);

    // Mismo formato que FormularioComorbilidades + "alergias" como lo lee el backend
    Object.assign(comorbilidades, {
      alergias_flag: Boolean(rAl.valor),
      alergias_detalle: alergiasDetalle,
      alergias: { tiene: Boolean(rAl.valor), detalle: alergiasDetalle },
      otras,
    });

    await analizarExamenes(sesion, tipo, comorbilidades, tipoCirugia);
  };

  const analizarExamenes = async (sesion, tipo, comorbilidades, tipoCirugia) => {
    const ctx = ctxRef.current;
    setPregunta(null);
    setFase("analizando");
    setError("");
    await decir(sesion, FRASES.analizandoExamenes);

    idPagoRef.current = `avatar-${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const genero = ctx.sexo === "Femenino" ? "Mujer" : "Hombre";
    let examenes = [];
    let informeIA = "";
    try {
      // El backend exige un nombre: el real se completa al pedir la orden
      const cuerpo = {
        idPago: idPagoRef.current,
        paciente: { nombre: "Paciente", edad: ctx.edad, genero, dolor: ctx.zona || "", lado: ctx.lado || "" },
        comorbilidades,
      };
      const r = tipo === "preop"
        ? await postJSON("/ia-preop", { ...cuerpo, tipoCirugia })
        : await postJSON("/ia-generales", cuerpo);
      if (!r.ok) throw new Error(r.error || "Sin respuesta");
      examenes = (Array.isArray(r.examenesIA) ? r.examenesIA : r.examenes || []).map((e) => String(e).trim()).filter(Boolean);
      informeIA = typeof r.informeIA === "string" ? r.informeIA : "";
      if (!examenes.length) throw new Error("Sin exámenes");
    } catch {
      vigente(sesion);
      setError("No se pudo preparar la propuesta de exámenes.");
      setFase("error");
      await decir(sesion, FRASES.errorExamenes);
      return;
    }
    vigente(sesion);
    examenesRef.current = { examenes, informeIA, comorbilidades, tipoCirugia };
    setInforme({ diagnosticos: [], explicacion: "", examenes, tipoCirugia });
    setFase("resultado");
    await decir(sesion, `${vozExamenes(examenes)} ${FRASES.cierre}`);
    await preguntarOrden(sesion);
  };

  const preguntarOrden = async (sesion) => {
    const { valor } = await preguntarCerrada(sesion, "sino", FRASES.preguntarOrden, FRASES.repreguntarOrden);
    setPregunta(null);
    if (valor) await pedirOrden(sesion);
    else await decir(sesion, FRASES.sinOrden);
    return api.algoMas(sesion);
  };

  // Formulario de datos -> (resonancia) -> PDF. Termina cuando la orden esta lista.
  const pedirOrden = async (sesion) => {
    const lista = new Promise((resolve) => { ordenRef.current = resolve; });
    const d = datosRef.current;
    if (d?.nombre && d?.rut) {
      // Ya tenemos sus datos (desde MiSalud): sin formulario; si falla, el formulario
      await decir(sesion, FRASES.ordenConTusDatos);
      setFase("generando");
      const ok = await enviarDatos(d);
      if (!ok) setFase("datos");
    } else {
      setFase("datos");
      await decir(sesion, FRASES.pedirDatos);
    }
    await lista;
    vigente(sesion);
  };

  // Final del flujo de dolor: orden | hora | ambas | ninguna
  const accionFinal = async (sesion) => {
    const { valor } = await preguntarCerrada(sesion, "accion", ACCION_FINAL.texto, ACCION_FINAL.repregunta, true);
    setPregunta(null);
    if (valor === "ninguna") {
      await decir(sesion, FRASES.sinOrden);
      return api.algoMas(sesion);
    }
    if (valor === "orden" || valor === "ambas") await pedirOrden(sesion);
    // La hora: Ipo recomienda al especialista y se lo pasa a Ica
    if (valor === "hora" || valor === "ambas") return horaConEspecialista(sesion);
    return recomendarEspecialista(sesion);
  };

  // Solo pidio la orden: recomienda al especialista (el mismo que sale impreso en
  // la orden) y ofrece buscarle hora con el
  const recomendarEspecialista = async (sesion) => {
    const zona = ctxRef.current.zona;
    const { doctor, medico } = await buscarEspecialista(sesion, zona);
    setFase("conversacion");
    setProgreso(0);
    setResumen(true);
    const texto = doctor
      ? FRASES.recomendar(nombreEnVoz(doctor.nombre), String(zona || "").toLowerCase())
      : FRASES.recomendarSinMedico;
    const { valor } = await preguntarCerrada(sesion, "sino", texto, FRASES.repreguntaRecomendar, true);
    setPregunta(null);
    if (!valor) return api.algoMas(sesion);
    // La hora se la busca Ica: la agenda del recomendado (si no esta, los de la zona)
    await devolverAIca(sesion, "hora");
    return f.abrirAgenda(sesion, medico ? { medico } : { zona });
  };

  // Dijo solo "espalda": marca en el dibujo posterior (o dice) cervical, dorsal o lumbar
  const elegirNivelColumna = async (sesion) => {
    const { valor } = await preguntarCerrada(
      sesion, "columna", FRASES.nivelColumna, FRASES.repreguntaNivelColumna, true,
    );
    return valor;
  };

  // ---------- flujo de dolor ----------
  // sinSaludo: viene de "no se con que medico" (ya se le explico)
  const conversar = async (sesion, { sinSaludo = false } = {}) => {
    const ctx = ctxRef.current;
    const registro = registroRef.current;
    const aplicables = () => PREGUNTAS.filter((p) => !p.aplica || p.aplica(ctx));

    setFase("conversacion");
    if (!sinSaludo) await decir(sesion, SALUDO);

    for (const p of PREGUNTAS) {
      if (p.aplica && !p.aplica(ctx)) continue;
      if (p.id === "zona" && ctx.zona) {
        // ya la dijo al pedir hora (o a Ica); si fue solo "espalda", se precisa en el dibujo
        if (ctx.zona === "Espalda") ctx.zona = await elegirNivelColumna(sesion);
        continue;
      }
      if (p.id === "lado" && ctx.lado) continue; // ya se lo dijo a Ica
      setProgreso(Math.round((aplicables().indexOf(p) / (aplicables().length + 1)) * 100));
      const texto = (p.textoSegun && p.textoSegun(ctx)) || p.texto;

      if (p.tipo === "abierta") {
        const resp = await preguntarAbierta(sesion, texto);
        if (p.opcional && esRespuestaVacia(resp)) continue;
        registro.push({ id: p.id, tipo: "abierta", resumen: p.resumen, pregunta: texto, respuesta: resp });
        continue;
      }

      const { valor, texto: dicho } = await preguntarCerrada(sesion, p.tipo, texto, p.repregunta);
      if (["zona", "lado", "edad", "sexo"].includes(p.tipo)) ctx[p.id] = valor;
      if (p.tipo === "zona" && valor === "Espalda") ctx.zona = await elegirNivelColumna(sesion);
      if (p.tipo === "sino") {
        registro.push({ id: p.id, bandera: p.bandera, resumen: p.resumen, pregunta: texto, respuesta: dicho, valor });
        if (valor === true && p.bandera === "grave") {
          setFase("urgencia");
          setPregunta(null);
          await decir(sesion, FRASES.urgencia);
          return;
        }
        if (valor === true && p.bandera === "aviso" && p.mensaje) avisosRef.current.push(p.mensaje);
      }
    }
    setProgreso(100);

    // ---------- puntos dolorosos ----------
    let marcadores;
    const mapperId = resolveZonaKey(ctx.zona);
    if (mapperId && !esColumna(ctx.zona)) {
      setPregunta(null);
      setFase("puntos");
      await decir(sesion, FRASES.puntos);
      const r = await esperarPuntos(sesion);
      const porVista = r && Object.values(r).find((v) => v && typeof v === "object" && v.porVista)?.porVista;
      if (porVista) marcadores = { [mapperId]: porVista };
      else if (r?.puntosSeleccionados?.length) marcadores = { [mapperId]: { puntos: r.puntosSeleccionados } };
    }

    await analizar(sesion, marcadores);
  };

  const analizar = async (sesion, marcadores) => {
    const ctx = ctxRef.current;
    setPregunta(null);
    setFase("analizando");
    setError("");
    await decir(sesion, FRASES.analizando);

    idPagoRef.current = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let resultado;
    try {
      // Modulo de trauma: 1 diagnostico + 1 examen del catalogo de la zona
      // (si la IA falla, el backend responde igual con su fallback por zona)
      const r = await postJSON("/ia-trauma", {
        idPago: idPagoRef.current,
        paciente: { edad: ctx.edad, genero: ctx.sexo, dolor: ctx.zona, lado: ctx.lado || "" },
        marcadores: marcadores || undefined,
        consulta: construirConsulta(ctx, registroRef.current),
      });
      if (!r.ok) throw new Error(r.error || "Sin respuesta");
      const examenes = (Array.isArray(r.examenes) ? r.examenes : []).map((e) => String(e).trim()).filter(Boolean).slice(0, 1);
      resultado = {
        diagnosticos: r.diagnostico ? [String(r.diagnostico).trim()] : [],
        explicacion: String(r.justificacion || "").trim(),
        examenes,
      };
      if (!resultado.examenes.length && !resultado.diagnosticos.length) throw new Error("Informe vacío");
    } catch (e) {
      vigente(sesion);
      setError("No se pudo generar el prediagnóstico.");
      setFase("error");
      await decir(sesion, FRASES.errorAnalisis);
      return;
    }
    vigente(sesion);
    setInforme({ ...resultado, marcadores, avisos: [...avisosRef.current] });
    setFase("resultado");

    const voz = [...avisosRef.current, vozResultado(resultado), FRASES.cierre]
      .filter(Boolean)
      .join(" ");
    await decir(sesion, voz);

    await accionFinal(sesion);
  };

  // ---------- orden ----------
  const generarOrden = async () => {
    const sesion = sesionRef.current;
    setFase("generando");
    setError("");
    try {
      const res = await fetch(`${BACKEND_BASE}${ORDEN[moduloRef.current].pdf(idPagoRef.current)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      if (sesion !== sesionRef.current) return false;
      setOrdenUrl(URL.createObjectURL(blob));
      setFase("lista");
      await hablar(conCorreoRef.current ? FRASES.ordenListaCorreo : FRASES.ordenLista);
      // el flujo sigue (hora con el especialista o "¿algo mas?")
      const listo = ordenRef.current;
      ordenRef.current = null;
      listo?.();
      return true;
    } catch {
      setError("No se pudo generar la orden. Intenta de nuevo.");
      setFase("datos");
      return false;
    }
  };

  // Devuelve true si la orden quedo lista (o falta solo el checklist de resonancia)
  const enviarDatos = async (datos) => {
    const informe = getInforme();
    setError("");
    datosRef.current = datos; // para prellenar la reserva si tambien pide hora
    const ctx = ctxRef.current;
    const geo = leerGeo() || undefined;
    try {
      if (moduloRef.current === "generales" || moduloRef.current === "preop") {
        const ex = examenesRef.current;
        await postJSON(moduloRef.current === "preop" ? "/guardar-datos-preop" : "/guardar-datos-generales", {
          idPago: idPagoRef.current,
          datosPaciente: {
            nombre: datos.nombre, rut: datos.rut, email: datos.email || undefined,
            edad: ctx.edad, genero: ctx.sexo === "Femenino" ? "Mujer" : "Hombre",
            dolor: ctx.zona || undefined, lado: ctx.lado || undefined, geo,
          },
          comorbilidades: ex.comorbilidades,
          tipoCirugia: ex.tipoCirugia || undefined,
          examenesIA: ex.examenes,
          informeIA: ex.informeIA || undefined,
        });
        conCorreoRef.current = Boolean(datos.email);
        setConCorreo(Boolean(datos.email));
        return generarOrden();
      }
      // geo: para que la orden imprima la derivacion al especialista de su zona
      await postJSON("/api/guardar-datos-ia", {
        idPago: idPagoRef.current,
        datosPaciente: { nombre: datos.nombre, rut: datos.rut, email: datos.email || undefined, geo },
      });
    } catch {
      setError("No se pudieron guardar tus datos. Intenta de nuevo.");
      return false;
    }
    conCorreoRef.current = Boolean(datos.email);
    setConCorreo(Boolean(datos.email));
    if (incluyeResonancia(informe?.examenes)) {
      setFase("resonancia");
      await hablar(FRASES.resonancia);
      return true; // la orden sale al guardar el checklist
    }
    return generarOrden();
  };

  const guardarResonancia = async (form) => {
    setError("");
    try {
      await postJSON("/api/guardar-datos-ia", {
        idPago: idPagoRef.current,
        resonanciaChecklist: form,
        resonanciaResumenTexto: resumenRM(form),
      });
    } catch {
      setError("No se pudo guardar el checklist. Intenta de nuevo.");
      return;
    }
    await generarOrden();
  };


  return {
    menuIpo, dolorDesdeHora, recibirDolorDeIca, recibirExamenesDeIca, devolverAIca,
    conversar, analizar, flujoExamenes, generarOrden, enviarDatos, guardarResonancia,
  };
}
