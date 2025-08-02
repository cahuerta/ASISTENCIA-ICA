import React, { useState } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx'; // Preview con formato receta

function App() {
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: '',
    rut: '',
    edad: '',
    dolor: '',
    lado: '',
  });
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMostrarVistaPrevia(true);
  };

  const handleDescargarPDF = async () => {
    try {
      const res = await fetch('https://asistencia-ica-backend.onrender.com/generar-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: datosPaciente.nombre,
          rut: datosPaciente.rut,
          edad: datosPaciente.edad,
          dolor: datosPaciente.dolor,
          lado: datosPaciente.lado,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al generar el PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orden_resonancia.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('No se pudo generar el PDF.');
      console.error(error);
    }
  };

  const onSeleccionZona = (zona) => {
    if (zona === 'rodillaIzquierda') {
      setDatosPaciente({ ...datosPaciente, dolor: 'Rodilla', lado: 'Izquierda' });
    } else if (zona === 'rodillaDerecha') {
      setDatosPaciente({ ...datosPaciente, dolor: 'Rodilla', lado: 'Derecha' });
    } else if (zona === 'caderaIzquierda') {
      setDatosPaciente({ ...datosPaciente, dolor: 'Cadera', lado: 'Izquierda' });
    } else if (zona === 'caderaDerecha') {
      setDatosPaciente({ ...datosPaciente, dolor: 'Cadera', lado: 'Derecha' });
    } else if (zona === 'columnaLumbar') {
      setDatosPaciente({ ...dat
