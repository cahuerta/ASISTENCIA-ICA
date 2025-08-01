import React, { useState } from "react";

const puntosDolor = [
  { id: "cadera_derecha", cx: 140, cy: 220, label: "Cadera Derecha", dolor: "Cadera", lado: "Derecha" },
  { id: "cadera_izquierda", cx: 60, cy: 220, label: "Cadera Izquierda", dolor: "Cadera", lado: "Izquierda" },
  { id: "rodilla_derecha", cx: 140, cy: 320, label: "Rodilla Derecha", dolor: "Rodilla", lado: "Derecha" },
  { id: "rodilla_izquierda", cx: 60, cy: 320, label: "Rodilla Izquierda", dolor: "Rodilla", lado: "Izquierda" },
  // Puedes agregar más puntos aquí
];

function EsquemaHumanoSVG({ onSeleccionar }) {
  const [seleccionado, setSeleccionado] = useState(null);

  const manejarClick = (punto) => {
    setSeleccionado(punto.id);
    if (onSeleccionar) {
      onSeleccionar({ dolor: punto.dolor, lado: punto.lado });
    }
  };

  return (
    <div style={{ textAlign: "center", userSelect: "none" }}>
      <h2>Seleccione el lugar del dolor</h2>
      <svg
        width="200"
        height="400"
        viewBox="0 0 200 400"
        style={{ border: "1px solid #ccc", background: "#f9f9f9", borderRadius: 8 }}
      >
        {/* Dibujo básico simplificado */}
        <rect x="80" y="40" width="40" height="100" fill="#ccc" /> {/* torso */}
        <circle cx="100" cy="20" r="20" fill="#ccc" /> {/* cabeza */}
        <rect x="40" y="40" width="30" height="100" fill="#bbb" /> {/* brazo izquierdo */}
        <rect x="130" y="40" width="30" height="100" fill="#bbb" /> {/* brazo derecho */}
        <rect x="80" y="140" width="20" height="100" fill="#999" /> {/* pierna izquierda */}
        <rect x="100" y="140" width="20" height="100" fill="#999" /> {/* pierna derecha */}

        {/* Puntos dolorosos */}
        {puntosDolor.map(({ id, cx, cy, label }) => (
          <circle
            key={id}
            cx={cx}
            cy={cy}
            r={15}
            fill={seleccionado === id ? "red" : "lightgray"}
            stroke="black"
            strokeWidth={1}
            cursor="pointer"
            onClick={() => manejarClick({ id, label, dolor: puntosDolor.find(p => p.id === id).dolor, lado: puntosDolor.find(p => p.id === id).lado })}
          />
        ))}

        {/* Etiqueta del punto seleccionado */}
        {seleccionado && (
          <text
            x="100"
            y="380"
            textAnchor="middle"
            fontSize="14"
            fill="black"
            fontWeight="bold"
          >
            {puntosDolor.find((p) => p.id === seleccionado)?.label}
          </text>
        )}
      </svg>
    </div>
  );
}

export default EsquemaHumanoSVG;
