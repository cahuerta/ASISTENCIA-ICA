import { useState } from 'react';

function App() {
  const [formData, setFormData] = useState({
    nombre: '',
    edad: '',
    descripcion: '',
  });

  const [submittedData, setSubmittedData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmittedData(formData);
    // Aquí puedes añadir lógica para enviar datos al backend
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>Formulario Paciente - Instituto Cirugía Articular</h2>
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
          Descripción libre:<br />
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={4}
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
        </label>
        <button type="submit" style={{ padding: '10px 20px' }}>Enviar</button>
      </form>

      {submittedData && (
        <div style={{ marginTop: 24, backgroundColor: '#f0f0f0', padding: 16, borderRadius: 6 }}>
          <h3>Datos enviados:</h3>
          <p><strong>Nombre:</strong> {submittedData.nombre}</p>
          <p><strong>Edad:</strong> {submittedData.edad}</p>
          <p><strong>Descripción:</strong> {submittedData.descripcion}</p>
        </div>
      )}
    </div>
  );
}

export default App;
