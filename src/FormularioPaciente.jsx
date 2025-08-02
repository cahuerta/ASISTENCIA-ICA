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

      <label style={styles.label}>Dolor (Rodilla, Cadera o Columna lumbar):</label>
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
        required={datos.dolor !== 'Columna lumbar'}
        disabled={datos.dolor === 'Columna lumbar'}
      >
        <option value="">Seleccione...</option>
        <option value="Derecha">Derecha</option>
        <option value="Izquierda">Izquierda</option>
      </select>

      <button style={styles.button} type="submit">Generar Informe</button>
    </form>
  );
}

const styles = {
  form: {
    backgroundColor: 'white',
    padding: '30px 40px',
    borderRadius: '10px',
    boxShadow: '0 8p
