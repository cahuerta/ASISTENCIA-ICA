import React, { useMemo, useState } from 'react';

/* ===== Utilidades RUT (Chile) ===== */
function limpiarRut(str = '') {
  return String(str).replace(/[^0-9kK]/g, '').toUpperCase();
}
function partirRut(limpio) {
  // Retorna { cuerpo, dv } donde dv puede ser undefined si no viene aún
  const s = limpiarRut(limpio);
  if (!s) return { cuerpo: '', dv: undefined };
  if (s.length <= 1) return { cuerpo: s, dv: undefined };
  const cuerpo = s.slice(0, -1);
  const dv = s.slice(-1);
  return { cuerpo, dv };
}
function calcularDV(cuerpo = '') {
  // Algoritmo módulo 11
  let suma = 0, multa = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multa;
    multa = multa === 7 ? 2 : multa + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}
function formatearRut(cuerpo = '', dv) {
  // Inserta puntos de miles y guión
  if (!cuerpo) return '';
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dv ? `${cuerpoFmt}-${dv}` : cuerpoFmt;
}
function validarRut(str = '') {
  const s = limpiarRut(str);
  // Debe tener al menos 2 caracteres (cuerpo + dv)
  if (s.length < 2) return { valido: false, motivo: 'incompleto' };
  const { cuerpo, dv } = partirRut(s);
  if (!/^\d{1,8}$/.test(cuerpo)) return { valido: false, motivo: 'cuerpo inválido' };
  const dvOk = calcularDV(cuerpo);
  const valido = dv === dvOk;
  return { valido, motivo: valido ? '' : `DV incorrecto, debería ser ${dvOk}` };
}

/* ================================== */

function FormularioPaciente({ datos, onCambiarDato, onSubmit }) {
  const [rutMsg, setRutMsg] = useState('');
  const [rutValido, setRutValido] = useState(true);

  const rutLimpio = useMemo(() => limpiarRut(datos?.rut || ''), [datos?.rut]);
  const { cuerpo: cuerpoActual, dv: dvActual } = useMemo(() => partirRut(rutLimpio), [rutLimpio]);

  const handleRutChange = (e) => {
    // Permite escribir libre, pero limpiando caracteres no válidos
    let s = limpiarRut(e.target.value);

    // Limitar largo máximo (8 dígitos + 1 DV)
    if (s.length > 9) s = s.slice(0, 9);

    // Feedback mientras escribe: si ya tiene DV, validamos; si no, sugerimos DV
    const { cuerpo, dv } = partirRut(s);
    if (cuerpo && cuerpo.length >= 7) {
      const dvCalc = calcularDV(cuerpo);
      if (dv) {
        if (dv !== dvCalc) {
          setRutValido(false);
          setRutMsg(`DV esperado: ${dvCalc}. Se corregirá al salir del campo.`);
        } else {
          setRutValido(true);
          setRutMsg('RUT válido.');
        }
      } else {
        setRutValido(false);
        setRutMsg(`DV sugerido: ${dvCalc}`);
      }
    } else {
      setRutValido(true);
      setRutMsg('');
    }

    // No formateamos en vivo para no mover el cursor; guardamos "limpio"
    onCambiarDato('rut', s);
  };

  const handleRutBlur = () => {
    const s = limpiarRut(datos?.rut || '');
    if (!s) {
      setRutValido(false);
      setRutMsg('Ingrese un RUT.');
      return;
    }
    const { cuerpo, dv } = partirRut(s);

    // Si no hay cuerpo suficiente
    if (!/^\d{1,8}$/.test(cuerpo)) {
      setRutValido(false);
      setRutMsg('RUT incompleto.');
      return;
    }

    // Si no hay DV, lo calculamos; si está mal, lo corregimos
    const dvCalc = calcularDV(cuerpo);
    const dvFinal = dv ? dvCalc : dvCalc; // siempre normalizamos al correcto
    const rutFormateado = formatearRut(cuerpo, dvFinal);

    onCambiarDato('rut', rutFormateado);
    setRutValido(true);
    setRutMsg(dv && dv !== dvCalc ? 'DV corregido automáticamente.' : 'RUT formateado.');
  };

  const handleSubmit = (e) => {
    // Validamos RUT antes de pasar el submit al padre
    const v = validarRut(datos?.rut || '');
    if (!v.valido) {
      e.preventDefault();
      setRutValido(false);
      setRutMsg(v.motivo ? `RUT inválido: ${v.motivo}.` : 'RUT inválido.');
      return;
    }
    // Si está todo OK, dejamos que el padre maneje el submit
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
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
        style={{
          ...styles.input,
          borderColor: rutValido ? '#ccc' : '#d33',
          outline: rutValido ? 'none' : '1px solid #d33'
        }}
        type="text"
        value={datos.rut}
        onChange={handleRutChange}
        onBlur={handleRutBlur}
        placeholder="12.345.678-9"
        inputMode="text"
        autoComplete="off"
        required
        aria-invalid={!rutValido}
        aria-describedby="rut-help"
      />
      <div id="rut-help" style={{ ...styles.help, color: rutValido ? '#555' : '#d33' }}>
        {rutMsg}
      </div>

      <label style={styles.label}>Edad:</label>
      <input
        style={styles.input}
        type="number"
        min="10"
        max="110"
        value={datos.edad}
        onChange={(e) => onCambiarDato('edad', e.target.value)}
        required
      />

      {/* 👇 Género (no requerido para no bloquear otros módulos) */}
      <label style={styles.label}>Género:</label>
      <select
        style={styles.input}
        value={datos.genero || ''}
        onChange={(e) => onCambiarDato('genero', e.target.value)}
      >
        <option value="">Seleccione…</option>
        <option value="MASCULINO">MASCULINO</option>
        <option value="FEMENINO">FEMENINO</option>
      </select>

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
  help: {
    fontSize: 12,
    marginTop: 4,
    minHeight: 16,
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
