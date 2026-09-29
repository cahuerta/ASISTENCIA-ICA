/**
 * bancoPreguntas.js
 * Banco de preguntas de la anamnesis guiada por la asistente de voz.
 * Editable: cambiar textos, agregar o quitar preguntas no requiere tocar la logica.
 *
 * Tipos:
 *  - "zona"     -> region del dolor (valores exactos del formulario de ICA)
 *  - "lado"     -> Derecha / Izquierda
 *  - "edad"     -> numero
 *  - "sexo"     -> Masculino / Femenino
 *  - "sino"     -> si / no (banderas rojas)
 *  - "abierta"  -> se guarda textual y va completa al backend
 *
 * Campos opcionales:
 *  - aplica(ctx): la pregunta solo se hace si devuelve true (ctx = respuestas hasta ahora)
 *  - bandera: "grave" (si responde SI -> se detiene y deriva) | "aviso" (continua con aviso)
 *  - resumen: como se escribe la respuesta en la consulta enviada al backend
 *  - opcional: en abiertas, si responde "no"/"nada" se omite
 *
 * Ademas del dolor (PREGUNTAS), aqui estan el menu inicial, las enfermedades
 * previas por grupos (examenes generales y preoperatorios), los tipos de
 * cirugia y las frases de cada flujo.
 */

export const ZONAS = [
  "Rodilla", "Cadera", "Hombro", "Codo", "Mano", "Tobillo",
  "Columna lumbar", "Columna cervical", "Columna dorsal",
];

export const esColumna = (zona) => String(zona || "").toLowerCase().startsWith("columna");
const esExtremidadInferior = (zona) => ["Rodilla", "Cadera", "Tobillo"].includes(zona);

// ---------------- Menu inicial ----------------
export const MENU = {
  texto:
    "Hola, soy la asistente del Instituto de Cirugía Articular. ¿En qué te ayudo? Puedes decirme si tienes un dolor, " +
    "si necesitas exámenes generales, exámenes antes de una cirugía, o si quieres hora con un traumatólogo.",
  repregunta: "Perdón, no te entendí. ¿Tienes un dolor, necesitas exámenes generales, exámenes para una cirugía, o quieres hora con un traumatólogo?",
  opciones: [
    { etiqueta: "Tengo un dolor", valor: "dolor" },
    { etiqueta: "Exámenes generales", valor: "generales" },
    { etiqueta: "Exámenes para una cirugía", valor: "preop" },
    { etiqueta: "Hora con traumatólogo", valor: "derivacion" },
  ],
};

// Inicio del flujo de dolor (antes era el saludo)
export const SALUDO =
  "Muy bien. Te voy a hacer algunas preguntas, como en una consulta, para orientarte y, si lo necesitas, " +
  "entregarte una orden de exámenes. Responde hablando con naturalidad.";

// ---------------- Enfermedades previas (generales y preoperatorio) ----------------
// Claves iguales a las del formulario de comorbilidades de ICA (FormularioComorbilidades):
// el backend (ia-generales / ia-preop) las lee tal cual.
export const GRUPOS_COMORBILIDAD = [
  {
    id: "g_metabolico",
    texto: "¿Tienes presión alta, diabetes o colesterol alto?",
    items: [
      { key: "hta", etiqueta: "Presión alta" },
      { key: "dm2", etiqueta: "Diabetes" },
      { key: "dislipidemia", etiqueta: "Colesterol alto" },
    ],
  },
  {
    id: "g_habitos",
    texto: "¿Tienes sobrepeso importante, fumas, o tienes asma o EPOC?",
    items: [
      { key: "obesidad", etiqueta: "Sobrepeso u obesidad" },
      { key: "tabaquismo", etiqueta: "Fumo" },
      { key: "epoc_asma", etiqueta: "Asma o EPOC" },
    ],
  },
  {
    id: "g_organos",
    texto: "¿Tienes alguna enfermedad del corazón, de los riñones o de la tiroides?",
    items: [
      { key: "cardiopatia", etiqueta: "Corazón" },
      { key: "erc", etiqueta: "Riñones" },
      { key: "hipotiroidismo", etiqueta: "Tiroides" },
    ],
  },
  {
    id: "g_farmacos",
    texto: "¿Tomas anticoagulantes o aspirina todos los días, o tienes artritis reumatoide u otra enfermedad autoinmune?",
    items: [
      { key: "anticoagulantes", etiqueta: "Anticoagulantes o aspirina" },
      { key: "artritis_reumatoide", etiqueta: "Artritis reumatoide o autoinmune" },
    ],
  },
];

export const PREGUNTAS_EXTRA = {
  cual: "¿Cuál o cuáles? Puedes decírmelo o marcarlos abajo.",
  alergias: "¿Eres alérgico a algún medicamento o alimento?",
  alergiasCual: "¿A qué eres alérgico?",
  otras: "¿Tienes alguna otra enfermedad importante que deba saber?",
};

// ---------------- Cirugias (preoperatorio) ----------------
// Mismos nombres que FormularioTipoCirugia de ICA (van tal cual a la orden)
export const CIRUGIAS = [
  { etiqueta: "Prótesis de cadera", valor: "ARTROPLASTIA TOTAL DE CADERA (ATC)", zona: "Cadera" },
  { etiqueta: "Artroscopia de cadera", valor: "ARTROSCOPIA DE CADERA", zona: "Cadera" },
  { etiqueta: "Osteotomía de cadera", valor: "OSTEOTOMÍA DE CADERA", zona: "Cadera" },
  { etiqueta: "Prótesis de rodilla", valor: "ARTROPLASTIA TOTAL DE RODILLA (ATR)", zona: "Rodilla" },
  { etiqueta: "Artroscopia de rodilla", valor: "ARTROSCOPIA DE RODILLA", zona: "Rodilla" },
  { etiqueta: "Osteotomía de rodilla", valor: "OSTEOTOMÍA DE RODILLA", zona: "Rodilla" },
  { etiqueta: "Cirugía menor de partes blandas", valor: "CIRUGÍA MENOR DE PARTES BLANDAS", zona: null },
  { etiqueta: "Otra", valor: "OTRA", zona: null },
];

export const PREGUNTAS = [
  // ---------------- Ubicacion y datos basicos ----------------
  {
    id: "zona",
    tipo: "zona",
    texto: "Para empezar, ¿en qué parte del cuerpo tienes el dolor?",
    repregunta: "Perdón, no te entendí. ¿Es la rodilla, la cadera, el hombro, el codo, la mano, el tobillo o la espalda?",
  },
  {
    id: "lado",
    tipo: "lado",
    texto: "¿Es el lado derecho o el izquierdo?",
    repregunta: "¿Me repites de qué lado? Si son los dos, dime cuál te duele más.",
    aplica: (ctx) => !esColumna(ctx.zona),
  },
  {
    id: "edad",
    tipo: "edad",
    texto: "¿Qué edad tienes?",
    repregunta: "¿Me repites tu edad en años?",
  },
  {
    id: "sexo",
    tipo: "sexo",
    texto: "¿Eres hombre o mujer?",
    repregunta: "Perdón, ¿eres hombre o mujer?",
  },

  // ---------------- Banderas rojas ----------------
  {
    id: "alarma_infeccion",
    tipo: "sino",
    bandera: "grave",
    texto: "¿Has tenido fiebre, o la zona está roja, caliente e hinchada?",
    repregunta: "Responde sí o no, por favor: ¿fiebre, o la zona roja, caliente e hinchada?",
    resumen: "fiebre o zona roja, caliente e hinchada",
  },
  {
    id: "alarma_neurologica",
    tipo: "sino",
    bandera: "grave",
    texto: "¿Has perdido fuerza en un brazo o pierna, o tienes adormecimiento que va avanzando?",
    textoSegun: (ctx) =>
      ctx.zona === "Columna lumbar"
        ? "¿Has perdido fuerza en una pierna, tienes adormecimiento que va avanzando, o dificultad para orinar o adormecimiento entre las piernas?"
        : null,
    repregunta: "Responde sí o no, por favor: ¿pérdida de fuerza o adormecimiento que va avanzando?",
    resumen: "pérdida de fuerza o adormecimiento progresivo",
  },
  {
    id: "alarma_trauma_vascular",
    tipo: "sino",
    bandera: "grave",
    texto: "¿Tuviste un golpe fuerte y ves una deformidad, o la mano o el pie están fríos, pálidos o morados?",
    textoSegun: (ctx) =>
      esExtremidadInferior(ctx.zona)
        ? "¿Tuviste un golpe fuerte y no puedes apoyar el pie o caminar, ves una deformidad, o el pie está frío, pálido o morado?"
        : null,
    repregunta: "Responde sí o no, por favor: ¿golpe con deformidad, o la mano o el pie fríos o morados?",
    resumen: "trauma con deformidad, imposibilidad de apoyo o compromiso vascular",
  },
  {
    id: "alarma_columna",
    tipo: "sino",
    bandera: "aviso",
    texto: "¿Te duele de noche aunque estés en reposo, has bajado de peso sin explicación, o has tenido cáncer?",
    repregunta: "Responde sí o no, por favor: ¿dolor nocturno en reposo, baja de peso o antecedente de cáncer?",
    aplica: (ctx) => esColumna(ctx.zona),
    resumen: "dolor nocturno en reposo, baja de peso o antecedente oncológico",
  },

  // ---------------- Anamnesis abierta ----------------
  {
    id: "caracteristicas",
    tipo: "abierta",
    texto: "Cuéntame cómo es tu dolor: dónde lo sientes exactamente, cómo es, y qué cosas lo empeoran.",
    resumen: "Características del dolor",
  },
  {
    id: "evolucion",
    tipo: "abierta",
    texto: "¿Desde cuándo te duele, y cómo empezó? Por ejemplo, con un golpe, una torcedura, un esfuerzo, o sin causa clara.",
    resumen: "Tiempo de evolución e inicio",
  },
  {
    id: "asociados",
    tipo: "abierta",
    texto: "¿Has notado hinchazón, que la articulación se trabe o falle, chasquidos, hormigueo o rigidez?",
    resumen: "Síntomas asociados",
  },
  {
    id: "tratamientos",
    tipo: "abierta",
    texto: "¿Qué has hecho hasta ahora? Por ejemplo remedios, kinesiología, infiltraciones o alguna cirugía.",
    resumen: "Tratamientos previos",
  },
  {
    id: "adicional",
    tipo: "abierta",
    opcional: true,
    texto: "Por último, ¿quieres agregar algo más que creas importante?",
    resumen: "Información adicional",
  },
];

export const FRASES = {
  // ---- generales y preoperatorio ----
  inicioGenerales:
    "Perfecto. Para proponerte exámenes generales te haré unas preguntas sobre tu salud. Puedes responder hablando o tocando los botones.",
  inicioPreop:
    "Perfecto. Para tus exámenes antes de la cirugía te haré unas preguntas. Puedes responder hablando o tocando los botones.",
  cirugia: "¿Qué cirugía te van a hacer?",
  repreguntaCirugia: "¿Me repites qué cirugía? Por ejemplo, prótesis de cadera o artroscopia de rodilla. También puedes tocarla abajo.",
  cirugiaOtra: "¿Cómo se llama la cirugía?",
  ladoCirugia: "¿Es del lado derecho o del izquierdo?",
  enfermedades: "Ahora te preguntaré por algunas enfermedades.",
  analizandoExamenes: "Gracias. Estoy preparando tu propuesta de exámenes, dame un momento.",
  errorExamenes: "Tuve un problema para preparar tus exámenes. Intenta de nuevo en un momento.",
  // ---- derivacion ----
  derivacionZona: "Claro. ¿En qué parte del cuerpo es tu problema? Así te recomiendo al especialista que corresponde.",
  buscandoEspecialista: "Déjame ver qué especialista te corresponde.",
  derivacionError: "No pude buscar el especialista en este momento. Puedes agendar en icarticular punto ce ele.",

  puntos: "Ahora muéstrame en el dibujo dónde te duele. Marca los puntos y luego toca guardar.",
  analizando: "Gracias. Estoy revisando todo lo que me contaste, dame un momento.",
  urgencia:
    "Por lo que me cuentas, es importante que te evalúe un médico pronto. Te recomiendo acudir a un servicio de urgencia. " +
    "No es conveniente esperar una orden de exámenes en este caso.",
  avisoColumna:
    "Como me contaste que tienes dolor nocturno, baja de peso o antecedente de cáncer, te recomiendo que te evalúe un especialista pronto.",
  preguntarOrden: "¿Quieres que te entregue la orden de exámenes?",
  repreguntarOrden: "Responde sí o no, por favor: ¿quieres la orden de exámenes?",
  sinOrden: "Está bien. Si cambias de opinión, puedes volver a empezar cuando quieras. Cuídate.",
  pedirDatos: "Perfecto. Para emitir la orden, completa tus datos en la pantalla.",
  resonancia: "Como incluye una resonancia, antes de emitir la orden responde unas preguntas de seguridad en la pantalla.",
  ordenLista: "Listo. Tu orden de exámenes está lista para descargar.",
  ordenListaCorreo: "Listo. Tu orden está lista para descargar, y también te la enviamos por correo.",
  cierre: "Recuerda que esto es una orientación y no reemplaza la evaluación presencial con un especialista.",
  errorAnalisis: "Tuve un problema para revisar tu información. Intenta de nuevo en un momento.",
};
