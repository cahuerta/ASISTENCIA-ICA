/**
 * comun/textosComunes.js
 * Frases que dice cualquiera de los asistentes (Ica o Ipo): que examenes necesita
 * (si dijo solo "examenes"), buscar hora con un medico en la agenda de la ficha
 * clinica, "¿algo mas?" y la despedida.
 */

// Si dijo solo "examenes", se pregunta cuales
export const TIPO_EXAMEN = {
  texto: "¿Necesitas exámenes generales, o exámenes antes de una cirugía?",
  repregunta: "¿Son exámenes generales, o para una cirugía?",
  opciones: [
    { etiqueta: "Exámenes generales", valor: "generales" },
    { etiqueta: "Exámenes para una cirugía", valor: "preop" },
  ],
};

export const FRASES_COMUNES = {
  // ---- hora con un medico ----
  queMedico: "¿Con qué médico quieres la hora? Dime su nombre. Si no sabes con quién, dime no sé, y te ayudo según tu dolor.",
  repreguntaMedico: "No encontré ese nombre. Dime el apellido del médico, o toca su nombre en la pantalla. Si no sabes con quién, dime no sé.",
  cualMedico: "Tengo más de un médico con ese nombre. ¿Con cuál quieres la hora?",
  repreguntaCualMedico: "¿Me dices cuál de ellos? También puedes tocarlo en la pantalla.",
  sinMedicos: "No pude cargar la lista de médicos, pero te muestro la agenda para que elijas.",
  // nombre ya viene para voz ("el doctor Jaime Espinoza"): "de el" -> "del"
  agendaMedico: (nombre) => `Perfecto, te muestro la agenda de ${nombre}. Elige el día y la hora que te acomode. Si quieres volver conmigo, dime volver.`.replace(" de el ", " del "),
  agendaZona: (zona) => `Te muestro los especialistas en ${zona} cerca de ti. Elige el día y la hora que te acomode. Si quieres volver conmigo, dime volver.`,
  agendaGeneral: "Te muestro la agenda. Elige médico, día y hora. Si quieres volver conmigo, dime volver.",
  recordatorioAgenda: "¿Ya tomaste una decisión, o prefieres volver?",
  seguirAgenda: "Perfecto, termina tu reserva en la pantalla. Aquí te espero.",
  horaReservada: (cuando, medico, telemedicina) =>
    `Listo, tu hora quedó reservada para el ${cuando}${medico ? ` con ${medico}` : ""}${telemedicina ? ", por telemedicina" : ""}. ` +
    "Te llegará la confirmación por correo.",
  algoMas: "¿Te ayudo en algo más?",
  repreguntaAlgoMas: "Responde sí o no, por favor: ¿te ayudo en algo más?",
  despedida: "Perfecto. Fue un gusto ayudarte, cuídate mucho.",
};
