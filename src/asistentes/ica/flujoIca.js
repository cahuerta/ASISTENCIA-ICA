/**
 * ica/flujoIca.js
 * Lo que hace Ica, la recepcionista de la pagina principal (burbuja en
 * www.icarticular.cl, o app.icarticular.cl/?asistente=ica):
 *
 *  - Hora con un medico: la busca ella (comun/agenda.js). Si no sabe con quien,
 *    le pregunta donde le duele y se lo pasa a Ipo.
 *  - Dolor: pregunta solo la zona y el lado y se lo pasa a Ipo, que confirma
 *    ("Ica me conto que te duele la rodilla derecha, ¿es asi?") y sigue la consulta.
 *  - Examenes generales o preoperatorio: se lo pasa a Ipo directo a ese modulo.
 *  - Cuando Ipo termina, o hay que reservar la hora que Ipo recomendo, Ipo se lo
 *    devuelve (recibirDeIpo) y ella sigue: abre la agenda o pregunta "¿algo mas?".
 *
 * El traspaso es en la misma pantalla (api.pasarA cambia dibujo, nombre y voz):
 * no viaja nada por internet.
 *
 * crearFlujoIca(api, f): api = herramientas de la pantalla; f = funciones de todos
 * (f.flujoHora, f.recibirDolorDeIca, f.recibirExamenesDeIca). Devuelve las de Ica.
 */
import { MENU_ICA, TRASPASO_ICA } from "./textosIca.js";
import { TIPO_EXAMEN } from "../comun/textosComunes.js";
import { PREGUNTAS, esColumna } from "../ipo/bancoPreguntas.js";

export function crearFlujoIca(api, f) {
  const {
    decir, preguntarCerrada, pasarA, elegirModulo, nuevoFlujo,
    setFase, setProgreso, setResumen, setEntendido,
    ctxRef, desdeIcaRef,
  } = api;

  // ---------- menu de Ica ----------
  const menuIca = async (sesion, cual = "inicio") => {
    const texto = cual === "otraVez" ? MENU_ICA.otraVez : cual === "volver" ? MENU_ICA.volver : MENU_ICA.texto;
    setFase("conversacion");
    setProgreso(0);
    setResumen(false);
    let { valor } = await preguntarCerrada(sesion, "menu", texto, MENU_ICA.repregunta, true);
    setEntendido("");
    nuevoFlujo();
    if (valor === "examenes") {
      ({ valor } = await preguntarCerrada(sesion, "tipoExamen", TIPO_EXAMEN.texto, TIPO_EXAMEN.repregunta, true));
      setEntendido("");
    }
    elegirModulo(valor === "dolor" ? "trauma" : valor);
    if (valor === "hora") return f.flujoHora(sesion);
    if (valor === "generales" || valor === "preop") return pasarAIpoExamenes(sesion, valor);
    return icaDolor(sesion);
  };

  // ---------- dolor: zona y lado, y se lo pasa a Ipo ----------
  const icaDolor = async (sesion) => {
    const ctx = ctxRef.current;
    elegirModulo("trauma");
    if (!ctx.zona) {
      const pZona = PREGUNTAS.find((p) => p.id === "zona");
      ctx.zona = (await preguntarCerrada(sesion, "zona", TRASPASO_ICA.zona, pZona.repregunta)).valor;
    }
    // "espalda" sin segmento: Ipo lo precisa en el dibujo; la columna no tiene lado
    if (ctx.zona !== "Espalda" && !esColumna(ctx.zona) && !ctx.lado) {
      const pLado = PREGUNTAS.find((p) => p.id === "lado");
      ctx.lado = (await preguntarCerrada(sesion, "lado", pLado.texto, pLado.repregunta)).valor;
    }
    setEntendido("");
    await decir(sesion, TRASPASO_ICA.aDolor);
    await pasarA(sesion, "ipo");
    desdeIcaRef.current = true;
    return f.recibirDolorDeIca(sesion);
  };

  // ---------- examenes generales o preoperatorio: a Ipo directo ----------
  const pasarAIpoExamenes = async (sesion, tipo) => {
    await decir(sesion, TRASPASO_ICA.aExamenes(tipo));
    await pasarA(sesion, "ipo");
    desdeIcaRef.current = true;
    return f.recibirExamenesDeIca(sesion, tipo);
  };

  // ---------- Ipo se lo devuelve ----------
  const recibirDeIpo = async (sesion) => {
    await pasarA(sesion, "ica");
    await decir(sesion, TRASPASO_ICA.vuelve);
  };

  return { menuIca, icaDolor, recibirDeIpo };
}
