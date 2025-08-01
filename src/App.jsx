import React, { useState } from 'react';

function App() {
  const [formulario, setFormulario] = useState({
    nombre: '',
    rut: '',
    edad: '',
    dolor: '',
    lado: '',
  });

  const [textoOrden, setTextoOrden] = useState('');
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const handleChange = (e) => {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const texto = 
      `Nombre: ${formulario.nombre}\n` +
      `RUT: ${formulario.rut}\n` +
      `Edad: ${formulario.edad} años\n` +
      `Dolor en: ${formulario.dolor} ${formulario.lado}`;

    setTextoOrden(texto);
    setMostrarPreview(true);
  };

  const handleDescargar = async () => {
    const datos = {
      nombre: formulario.nombre,
      edad: formulario.edad,
      motivo: `Dolor de ${formulario.dolor} ${formulario.lado}`,
    };

    try {
      const res = await fetch("https://asistencia-ica-backend.onrender.com/generar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "orden_resonancia.pdf";
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert("No se pudo generar el PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>Asistente Virtual para Pacientes</h1>

        <label style={styles.label}>Nombre completo:</label>
        <input
          type="text"
          name="nombre"
          value={formulario.nombre}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <label style={styles.label}>RUT:</label>
        <input
          type="text"
          name="rut"
          value={formulario.rut}
          onChange={handleChange}
          placeholder="12.345.678-9"
          required
          style={styles.input}
        />

        <label style={styles.label}>Edad:</label>
        <input
          type="number"
          name="edad"
          value={formulario.edad}
          onChange={handleChange}
          min="18"
          max="110"
          required
          style={styles.input}
        />

        <label style={styles.label}>Dolor (Rodilla o Cadera):</label>
        <select
          name="dolor"
          value={formulario.dolor}
          onChange={handleChange}
          required
          style={styles.input}
        >
          <option value="">Seleccione...</option>
          <option value="Rodilla">Rodilla</option>
          <option value="Cadera">Cadera</option>
        </select>

        <label style={styles.label}>Lado:</label>
        <select
          name="lado"
          value={formulario.lado}
          onChange={handleChange}
          required
          style={styles.input}
        >
          <option value="">Seleccione...</option>
          <option value="Derecha">Derecha</option>
          <option value="Izquierda">Izquierda</option>
        </select>

        <button type="submit" style={styles.button}>
          Generar Informe
        </button>
      </form>

      {mostrarPreview && (
        <div style={styles.preview}>
          <pre>{textoOrden}</pre>
          <button onClick={handleDescargar} style={styles.button}>
            Descargar PDF
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: '#f0f4f8',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
  },
  form: {
    background: 'white',
    padding: '30px 40px',
    borderRadius: '10px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    width: '350px',
    textAlign: 'center',
  },
  title: {
    marginBottom: '20px',
    color: '#0072CE',
  },
  label: {
    display: 'block',
    marginTop: '15px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    marginTop: '5px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  button: {
    marginTop: '25px',
    background: '#0072CE',
    color: 'white',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
  },
  preview: {
    marginTop: '30px',
    background: 'white',
    border: '1px solid #ccc',
    borderR
