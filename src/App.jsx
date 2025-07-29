import { useState } from 'react';

function App() {
  const [formData, setFormData] = useState({
    nombre: '',
    edad: '',
    descripcion: '',
  });

  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('https://asistencia-ica-backend.onrender.com/api/ordenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Error en el servidor');
      }

      const data = await response.json();
      setSubmittedData(data);
    } catch (error) {
      alert('Error enviando datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>Formulario - Instituto de Cirugía Articular</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Nombre:<br />
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
        </label>
        <label>
          Edad:<br />
          <input
            type="number"
            name="edad"
            value={formData.edad}
            onChange={handleChange}
            required
            min="0"
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
        </label>
        <label>
          Descripción del dolor:<br />
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={4}
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
        </label>
        <button type="submit" style={{ padding: '10px 20px' }} disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {submittedData && submittedData.orden && (
        <div style={{ marginTop: 30, backgroundColor: '#eef', paddi
