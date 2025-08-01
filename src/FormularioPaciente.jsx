import React, { useState, useEffect } from "react";

function FormularioPaciente({ dolorSeleccionado, ladoSeleccionado }) {
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [edad, setEdad] = useState("");
  const [dolor, setDolor] = useState("");
  const [lado, setLado] = useState("");
  const [textoVistaPrevia, setTextoVistaPrevia] = useState("");
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [datosPDF, setDatosPDF] = useState({});

  // Cuando cambia la selección del esquema, actualizamos dolor y lado en el formulario
  useEffect(() => {
    if (dolorSeleccionado) setDolor(dolorSeleccionado);
    if (ladoSeleccionado) setLado(ladoSeleccionado);
  }, [dolorSeleccionado, ladoSeleccionado]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!nombre || !rut || !edad || !dolor || !lado) {
      alert("Por favor complete todos los campos.");
      return;
    }

    const texto = 
      `Nombre: ${nombre}\n` +
      `RUT: ${rut}\n` +
      `Edad: ${edad} años\n` +
      `Dolor en: ${dolor} ${lado}`;

    setTextoVistaPrevia(texto);
    setMostrarVistaPrevia(true);

    setDatosPDF({
      nombre,
      edad,
      motivo: `Dolor de ${dolor} ${lado}`,
      lado
    });
  };

  const handleDescargarPDF = async () => {
    try {
      const res = await fetch("https://asistencia-ica-backend.onrender.com/generar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosPDF),
      });

      if (!res.ok) throw new Error("Error al generar el PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orden_resonancia.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("No se pudo generar el PDF.");
      console.error(error);
    }
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={{ color: "#0072CE" }}>Asistente Virtual para Pacientes</h1>

        <label style={styles.label}>Nombre completo:</label>
        <input
          style={styles.input}
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <label style={styles.label}>RUT:</label>
        <input
          style={styles.input}
          type="text"
          value={rut}
          placeholder="12.345.678-9"
          onChange={(e) => setRut(e.target.value)}
          required
        />

        <label style={styles.label}>Edad:</label>
        <input
          style={styles.input}
          type="number"
          min="18"
          max="110"
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
          required
        />

        <label style={styles.label}>Dolor (Rodilla o Cadera):</label>
        <select
          style={styles.input}
          value={dolor}
          onChange={(e) => setDolor(e.target.value)}
          required
        >
          <option value="">Seleccione...</option>
          <option value="Rodilla">Rodilla</option>
          <option value="Cadera">Cadera</option>
        </select>

        <label style={styles.label}>Lado:</label>
        <select
          style={styles.input}
          value={lado}
          onChange={(e) => setLado(e.target.value)}
          required
        >
          <option value="">Seleccione...</option>
          <option value="Derecha">Derecha</option>
          <option value="Izquierda">Izquierda</option>
        </select>

        <button style={styles.button} type="submit">
          Generar Informe
        </button>
      </form>

      {mostrarVistaPrevia && (
        <div style={styles.previewContainer}>
          <pre style={styles.preview}>{textoVistaPrevia}</pre>
          <button style={styles.downloadButton} onClick={handleDescargarPDF}>
            Descargar PDF
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  form: {
    background: "white",
    padding: 30,
    borderRadius: 10,
    boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
  },
  label: {
    display: "block",
    marginTop: 15,
    fontWeight: "bold",
    color: "#333",
    textAlign: "left",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    marginTop: 5,
    border: "1px solid #ccc",
    borderRadius: 5,
    boxSizing: "border-box",
    fontSize: 14,
  },
  button: {
    marginTop: 25,
    background: "#0072CE",
    color: "white",
    border: "none",
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    cursor: "pointer",
    width: "100%",
    transition: "background 0.3s ease",
  },
  previewContainer: {
    marginTop: 30,
    maxWidth: 400,
    textAlign: "left",
  },
  preview: {
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 10,
    padding: 20,
    whiteSpace: "pre-wrap",
  },
  downloadButton: {
    display: "block",
    marginTop: 15,
    background: "#0072CE",
    color: "white",
    padding: 12,
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer",
    width: "100%",
  },
};

export default FormularioPaciente;
