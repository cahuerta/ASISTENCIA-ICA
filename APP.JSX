import { useState } from "react";

function App() {
  const [formData, setFormData] = useState({
    nombre: "",
    edad: "",
    antecedentes: "",
    alergias: "",
    descripcionDolor: "",
  });

  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPdfUrl(null);

    const response = await fetch("https://asistencia-ica-backend1.onrender.com/generar-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-xl p-6 rounded-2xl w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">Asistente Paciente ICA</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="nombre" placeholder="Nombre" onChange={handleChange} className="w-full p-2 border rounded" required />
          <input name="edad" placeholder="Edad" type="number" onChange={handleChange} className="w-full p-2 border rounded" required />
          <input name="antecedentes" placeholder="Antecedentes" onChange={handleChange} className="w-full p-2 border rounded" />
          <input name="alergias" placeholder="Alergias" onChange={handleChange} className="w-full p-2 border rounded" />
          <textarea name="descripcionDolor" placeholder="Describe tu dolor (rodilla, cadera, etc.)" onChange={handleChange} className="w-full p-2 border rounded" required />

          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">
            {loading ? "Generando..." : "Generar Orden"}
          </button>
        </form>

        {pdfUrl && (
          <div className="mt-4 text-center">
            <a href={pdfUrl} download="orden.pdf" className="text-blue-700 underline">
              Descargar Orden en PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
