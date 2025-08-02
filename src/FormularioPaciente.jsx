import React from 'react';

function FormularioPaciente({ datos, onCambiarDato, onSubmit }) {
  return (
    <form onSubmit={onSubmit} style={styles.form}>
      <h1 style={styles.title}>Asistente Virtual para Pacientes</h1>

      <label style={styles.label}>Nombre completo:</label>
      <input
        style={styles.input}
        type="text"
        value={datos.nombre}
        onChange={(e) => onCambiarDato('nombre', e.target.value)}
        required
      />

      <label style={styles.label}>RUT:</label>
      <input
        style={styles.input}
        type="text"
        value={datos.rut}
        onChange={(e) => onCambiarDato('rut', e.target.value)}
        placeholder="12.345.678-9"
        required
      />

      <label style={styles.label}>Edad:</label>
      <input
        style={styles.input}
        type="number"
        min="18"
        max="110"
        value={datos.edad}
        onChange={(e) => onCambiarDato('edad', e.target.value)}
        required
      />

      <label style={styles.label}>Dolor:</label>
      <select
        style={styles.input}
        value={datos.dolor}
        onChange={(e) => onCambiarDato('dolor', e.target.value)}
        required
      >
        <option value="">Seleccione...</option>
        <option value="Rodilla">Rodilla</option>
        <option value="Cadera">Cadera</option>
        <option value="Columna lumbar">Columna lumbar</option>
      </select>

      <label style={styles.label}>Lado:</label>
      <select
        style={styles.input}
        value={datos.lado}
        onChange={(e) => onCambiarDato('lado', e.target.value)}
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
  );
}

const styles = {
  form: {
    backgroundColor: 'white',
    padding: '30px 40px',
    borderRadius: '10px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    width: '100%',
    boxSizing: 'border-box',
  },
  title: {
    marginBottom: '20px',
    color: '#0072CE',
    textAlign: 'center',
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
    boxSizing: 'border-box',
    fontSize: '14px',
  },
  button: {
    marginTop: '25px',
    backgroundColor: '#0072CE',
    color: 'white',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.3s ease',
  },
};

export default FormularioPaciente;
