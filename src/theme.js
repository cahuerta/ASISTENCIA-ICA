// src/theme.js (o donde lo tengas)
// Carga el JSON del tema (mismo directorio)
import raw from "./theme.json";

/**
 * Devuelve el tema mezclando defaults + lo que venga desde theme.json
 * Puedes seguir cambiando SOLO theme.json para ajustar colores finos.
 */
export function getTheme() {
  const fromJson = (raw && (raw.colors || raw)) || {};

  const defaults = {
    // ===== Paleta base TRAUMA / ICA =====
    // Azul clínico profundo (marca principal)
    primary: "#1E3A5F",      // antes: #0056A6
    primaryDark: "#14263C",  // tono más oscuro para headers / hover
    onPrimary: "#FFFFFF",

    // Acento azul un poco más vibrante (links, botones secundarios)
    accent: "#3F7FBF",
    accentAlpha: "rgba(31, 90, 145, 0.20)",

    // Fondos y superficies
    bg: "#F4F7FB",        // fondo general
    surface: "#FFFFFF",   // tarjetas / modales
    surfaceAlt: "#E9EDF5",
    border: "#D1D8E5",

    // Tipografía
    text: "#111827",       // casi negro, buena legibilidad
    textMuted: "#6B7280",  // subtítulos
    muted: "#4B5563",      // textos secundarios fuertes

    // Estados (por si los necesitas en la UI)
    danger: "#B91C1C",
    success: "#059669",
    warning: "#F59E0B",

    // Sombras
    shadowSm: "0 2px 8px rgba(15, 23, 42, 0.06)",
    shadowMd: "0 10px 30px rgba(15, 23, 42, 0.12)",

    // Fondo de modales
    overlay: "rgba(15, 23, 42, 0.45)",

    // Opcional: colores por módulo (si los quieres usar luego)
    trauma: "#1E3A5F",     // mismo azul clínico
    preop: "#2AA78C",      // verde quirúrgico
    generales: "#3F7FBF",  // azul más brillante
    ia: "#F59E0B",         // acento IA (naranjo)
  };

  return { ...defaults, ...fromJson };
}

export default getTheme;
