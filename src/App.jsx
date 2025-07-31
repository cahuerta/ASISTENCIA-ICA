import React, { useState } from 'react';

export default function App() {
  const [formData, setFormData] = useState({
    nombre: '',
    edad: '',
    motivo: '',
    enfermedades: '',
    alergias: ''
  });

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const response = await fetch("https://asistencia-ica-backend.onrender.com/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orden-examen.pdf";
    a.click();
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Asistente Virtual ICA</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre"
          onChange={handleChange}
          required
          className="w-full border rounded p-2"
        />
        <input
          type="number"
          name="edad"
          placeholder="Edad"
          onChange={handleChange}
          required
          className="w-full border rounded p-2"
        />
        <input
          type="text"
          name="motivo"
          placeholder="Motivo de consulta"
          onChange={handleChange}
          required
          className="w-full border rounded p-2"
        />
        <input
          type="text"
          name="enfermedades"
          placeholder="Enfermedades previas"
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
        <input
          type="text"
          name="alergias"
          placeholder="Alergias"
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generar Orden PDF
        </button>
      </form>
    </div>
  );
}
