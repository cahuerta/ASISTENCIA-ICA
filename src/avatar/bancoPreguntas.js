/**
 * bancoPreguntas.js
 * Banco de preguntas de la anamnesis guiada por Ipo, el asistente de voz.
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
 * cirugia, la pregunta final (orden / hora / ambas) y las frases de cada flujo
 * (incluida la reserva de hora en la agenda de la ficha clinica).
 */

export const ZONAS = [
  "Rodilla", "Cadera", "Hombro", "Codo", "Mano", "Tobillo",
  "Columna lumbar", "Columna cervical", "Columna dorsal",
];

export const esColumna = (zona) => String(zona || "").toLowerCase().startsWith("columna");

// ---------------- Menu inicial ----------------
export const MENU = {
  texto:
    "Hola, soy Ipo, el asistente virtual del Instituto de Cirugía Articular. ¿En qué te ayudo? Puedo buscarte hora con un médico, " +
    "ayudarte si tienes un dolor, o prepararte exámenes.",
  // Cuando vuelve al menu despues de terminar algo
  otraVez: "¿En qué te ayudo? Puedo buscarte hora con un médico, ayudarte si tienes un dolor, o prepararte exámenes.",
  // Cuando vuelve desde la agenda sin reservar
  volver: "Aquí estoy. ¿En qué te ayudo? Puedo buscarte hora con un médico, ayudarte si tienes un dolor, o prepararte exámenes.",
  repregunta: "Perdón, no te entendí. ¿Quieres hora con un médico, tienes un dolor, o necesitas exámenes?",
  opciones: [
    { etiqueta: "Hora con un médico", valor: "hora" },
    { etiqueta: "Tengo un dolor", valor: "dolor" },
    { etiqueta: "Exámenes generales", valor: "generales" },
    { etiqueta: "Exámenes para una cirugía", valor: "preop" },
  ],
};

// Si dijo solo "examenes", se pregunta cuales
export const TIPO_EXAMEN = {
  texto: "¿Necesitas exámenes generales, o exámenes antes de una cirugía?",
  repregunta: "¿Son exámenes generales, o para una cirugía?",
  opciones: [
    { etiqueta: "Exámenes generales", valor: "generales" },
    { etiqueta: "Exámenes para una cirugía", valor: "preop" },
  ],
};

// Al final del flujo de dolor
export const ACCION_FINAL = {
  texto: "¿Te hago la orden de exámenes, o te busco hora con el especialista más adecuado?",
  repregunta: "¿Quieres la orden de exámenes, una hora con el especialista, o ambas?",
  opciones: [
    { etiqueta: "Orden de exámenes", valor: "orden" },
    { etiqueta: "Hora con especialista", valor: "hora" },
    { etiqueta: "Ambas", valor: "ambas" },
    { etiqueta: "No, gracias", valor: "ninguna" },
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

// Arma las preguntas de alarma de una zona: [bandera, texto, resumen, mensaje?]
function alarmas(zona, lista) {
  const slug = zona.toLowerCase().replace(/\s+/g, "_");
  return lista.map(([bandera, texto, resumen, mensaje], i) => ({
    id: `alarma_${slug}_${i + 1}`,
    tipo: "sino",
    bandera,
    texto,
    repregunta: `Responde sí o no, por favor: ${texto}`,
    resumen,
    mensaje,
    aplica: (ctx) => ctx.zona === zona,
  }));
}

export const PREGUNTAS = [
  // ---------------- Ubicacion y datos basicos ----------------
  {
    // "Espalda" se acepta: luego el paciente marca en el dibujo posterior si es
    // cervical, dorsal o lumbar (FRASES.nivelColumna)
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

  // ---------------- Banderas rojas POR SEGMENTO ----------------
  // Cada zona tiene sus propias alarmas (3 o 4 preguntas agrupadas).
  // grave -> se detiene y deriva a urgencia. aviso -> sigue, y al final
  // recomienda evaluacion pronta con el "mensaje" de la pregunta.
  ...alarmas("Columna lumbar", [
    ["grave", "¿Tienes dificultad para orinar, se te escapa la orina o las deposiciones, o sientes adormecida la zona entre las piernas?",
      "compromiso de esfínteres o anestesia en silla de montar"],
    ["grave", "¿Has perdido fuerza en una o en ambas piernas, y va empeorando?",
      "pérdida de fuerza progresiva en extremidades inferiores"],
    ["grave", "¿Tienes fiebre junto con el dolor de espalda, o tuviste una caída o un accidente fuerte?",
      "fiebre o trauma de alta energía"],
    ["aviso", "¿Te duele de noche aunque estés en reposo, has bajado de peso sin explicación, o has tenido cáncer?",
      "dolor nocturno en reposo, baja de peso o antecedente oncológico",
      "Como me contaste que tienes dolor nocturno, baja de peso o antecedente de cáncer, te recomiendo que te evalúe un especialista pronto."],
  ]),
  ...alarmas("Columna cervical", [
    ["grave", "¿Sientes torpeza en las manos, se te caen las cosas, o caminas inestable?",
      "torpeza de manos o marcha inestable"],
    ["grave", "¿Tuviste un accidente o un golpe fuerte reciente en la cabeza o el cuello?",
      "trauma cervical reciente"],
    ["grave", "¿Tienes fiebre junto con el dolor de cuello?", "fiebre con cervicalgia"],
    ["aviso", "¿Has tenido cáncer, o has bajado de peso sin explicación?",
      "antecedente oncológico o baja de peso",
      "Como me contaste que has tenido cáncer o bajado de peso, te recomiendo que te evalúe un especialista pronto."],
  ]),
  ...alarmas("Columna dorsal", [
    ["grave", "¿Tienes dolor en el pecho, falta de aire o sudoración junto con el dolor de espalda?",
      "dolor torácico, disnea o sudoración"],
    ["grave", "¿Tuviste un accidente o una caída fuerte, o tienes fiebre?", "trauma de alta energía o fiebre"],
    ["aviso", "¿Te duele de noche aunque estés en reposo, has bajado de peso sin explicación, o has tenido cáncer?",
      "dolor nocturno en reposo, baja de peso o antecedente oncológico",
      "Como me contaste que tienes dolor nocturno, baja de peso o antecedente de cáncer, te recomiendo que te evalúe un especialista pronto."],
  ]),
  ...alarmas("Hombro", [
    ["grave", "¿Tuviste un golpe o una caída y no puedes mover el brazo, o ves el hombro deformado?",
      "trauma con impotencia funcional o deformidad"],
    ["grave", "¿El dolor de hombro viene con dolor en el pecho, falta de aire o sudoración?",
      "dolor torácico, disnea o sudoración"],
    ["grave", "¿Tienes fiebre, o el hombro está rojo y caliente?", "fiebre o signos inflamatorios locales"],
    ["aviso", "¿Sientes hormigueo o debilidad en el brazo?", "parestesias o debilidad del brazo",
      "Como me contaste que sientes hormigueo o debilidad en el brazo, te recomiendo que te evalúe un especialista pronto."],
  ]),
  ...["Codo", "Mano"].flatMap((zona) => alarmas(zona, [
    ["grave", "¿Tuviste un golpe y ves una deformidad, o tienes una herida y algún dedo no se mueve?",
      "trauma con deformidad o herida con déficit de movilidad de dedos"],
    ["grave", "¿La mano está fría, pálida o morada, o tienes un dolor muy intenso después de un golpe o con un yeso puesto?",
      "compromiso vascular o dolor desproporcionado"],
    ["grave", "¿Te mordió un animal o una persona, o la zona está roja y caliente con fiebre?",
      "mordedura o signos de infección"],
    ["aviso", "¿Se te duermen los dedos en la noche?", "parestesias nocturnas de dedos",
      "Como me contaste que se te duermen los dedos en la noche, te recomiendo que te evalúe un especialista pronto."],
  ])),
  ...alarmas("Cadera", [
    ["grave", "¿Tuviste una caída y no puedes apoyar la pierna ni caminar?", "caída con imposibilidad de apoyo"],
    ["grave", "¿Tienes fiebre junto con el dolor de cadera?", "fiebre con coxalgia"],
    ["grave", "¿La pierna está hinchada, roja y dolorosa?", "extremidad inferior edematosa, eritematosa y dolorosa"],
    ["aviso", "¿El dolor en la ingle lleva meses sin mejorar?", "dolor inguinal persistente",
      "Como el dolor en la ingle no ha mejorado en meses, te recomiendo que te evalúe un especialista pronto."],
  ]),
  ...alarmas("Rodilla", [
    ["grave", "¿Tuviste un golpe o una torcedura y no puedes apoyar la pierna?", "trauma con imposibilidad de apoyo"],
    ["grave", "¿La rodilla está roja, caliente e hinchada, y tienes fiebre?", "rodilla inflamada con fiebre"],
    ["grave", "¿Tienes la pantorrilla hinchada y dolorosa?", "pantorrilla edematosa y dolorosa"],
    ["aviso", "¿La rodilla se traba y no puedes estirarla completamente?", "bloqueo articular",
      "Como me contaste que la rodilla se traba, te recomiendo que te evalúe un especialista pronto."],
  ]),
  ...alarmas("Tobillo", [
    ["grave", "Después de la torcedura o el golpe, ¿no puedes dar cuatro pasos, o ves una deformidad?",
      "imposibilidad de dar cuatro pasos o deformidad"],
    ["grave", "¿El pie está frío, pálido o morado, o tienes una herida profunda?",
      "compromiso vascular o herida profunda"],
    ["aviso", "¿Eres diabético y tienes el pie rojo, caliente o hinchado?", "pie diabético rojo, caliente o edematoso",
      "Como eres diabético y tienes el pie rojo, caliente o hinchado, te recomiendo que te evalúe un especialista pronto."],
  ]),

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
    // Articulaciones: hinchazon, bloqueo y chasquidos. El hormigueo y
    // adormecimiento se pregunta solo en columna, segun el segmento.
    texto: "¿Has notado hinchazón, que la articulación se trabe o se bloquee, o chasquidos?",
    textoSegun: (ctx) => {
      if (ctx.zona === "Columna cervical") return "¿Sientes hormigueo, adormecimiento o debilidad en los brazos o las manos?";
      if (ctx.zona === "Columna lumbar") return "¿Sientes hormigueo, adormecimiento o debilidad en las piernas o los pies?";
      if (ctx.zona === "Columna dorsal") return "¿Sientes hormigueo, adormecimiento o debilidad en el tronco o en las piernas?";
      return null;
    },
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
  // ---- hora con un medico ----
  queMedico: "¿Con qué médico quieres la hora? Dime su nombre. Si no sabes con quién, dime no sé, y te ayudo según tu dolor.",
  repreguntaMedico: "No encontré ese nombre. Dime el apellido del médico, o toca su nombre en la pantalla. Si no sabes con quién, dime no sé.",
  cualMedico: "Tengo más de un médico con ese nombre. ¿Con cuál quieres la hora?",
  repreguntaCualMedico: "¿Me dices cuál de ellos? También puedes tocarlo en la pantalla.",
  sinMedicos: "No pude cargar la lista de médicos, pero te muestro la agenda para que elijas.",
  ayudaDolor: "Te ayudo. Te haré unas preguntas sobre tu dolor, para buscarte el especialista más adecuado.",
  // nombre ya viene para voz ("el doctor Jaime Espinoza"): "de el" -> "del"
  agendaMedico: (nombre) => `Perfecto, te muestro la agenda de ${nombre}. Elige el día y la hora que te acomode. Si quieres volver conmigo, dime volver.`.replace(" de el ", " del "),
  agendaZona: (zona) => `Te muestro los especialistas en ${zona} cerca de ti. Elige el día y la hora que te acomode. Si quieres volver conmigo, dime volver.`,
  agendaGeneral: "Te muestro la agenda. Elige médico, día y hora. Si quieres volver conmigo, dime volver.",
  recordatorioAgenda: "¿Ya tomaste una decisión, o prefieres volver?",
  seguirAgenda: "Perfecto, termina tu reserva en la pantalla. Aquí te espero.",
  // si eligio solo la orden: especialista recomendado (el mismo que sale en la orden)
  recomendar: (medico, zona) =>
    `Te recomiendo que te evalúe ${medico}${zona ? `, especialista en ${zona}` : ""}. ¿Quieres que te busque hora?`,
  recomendarSinMedico: "¿Quieres que te busque hora con un especialista?",
  repreguntaRecomendar: "Responde sí o no, por favor: ¿quieres que te busque hora?",
  // espalda: cervical, dorsal o lumbar en el dibujo
  nivelColumna: "Muéstrame en el dibujo dónde te duele la espalda: en el cuello, en la parte media, o en la parte baja.",
  repreguntaNivelColumna: "¿Es en el cuello, en la parte media de la espalda, o en la parte baja? También puedes tocarlo en el dibujo.",
  horaReservada: (cuando, medico, telemedicina) =>
    `Listo, tu hora quedó reservada para el ${cuando}${medico ? ` con ${medico}` : ""}${telemedicina ? ", por telemedicina" : ""}. ` +
    "Te llegará la confirmación por correo.",
  ahoraHora: "Ahora te busco hora con el especialista.",
  algoMas: "¿Te ayudo en algo más?",
  repreguntaAlgoMas: "Responde sí o no, por favor: ¿te ayudo en algo más?",
  despedida: "Perfecto. Fue un gusto ayudarte, cuídate mucho.",

  puntos: "Ahora muéstrame en el dibujo dónde te duele. Marca los puntos y luego toca guardar.",
  analizando: "Gracias. Estoy revisando todo lo que me contaste, dame un momento.",
  urgencia:
    "Por lo que me cuentas, es importante que te evalúe un médico pronto. Te recomiendo acudir a un servicio de urgencia. " +
    "No es conveniente esperar una orden de exámenes en este caso.",
  preguntarOrden: "¿Quieres que te entregue la orden de exámenes?",
  repreguntarOrden: "Responde sí o no, por favor: ¿quieres la orden de exámenes?",
  sinOrden: "Está bien, sin problema.",
  pedirDatos: "Perfecto. Para emitir la orden, completa tus datos en la pantalla.",
  resonancia: "Como incluye una resonancia, antes de emitir la orden responde unas preguntas de seguridad en la pantalla.",
  ordenLista: "Listo. Tu orden de exámenes está lista para descargar.",
  ordenListaCorreo: "Listo. Tu orden está lista para descargar, y también te la enviamos por correo.",
  cierre: "Recuerda que esto es una orientación y no reemplaza la evaluación presencial con un especialista.",
  errorAnalisis: "Tuve un problema para revisar tu información. Intenta de nuevo en un momento.",
};
