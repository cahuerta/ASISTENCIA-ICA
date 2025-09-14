// Carga el JSON del tema (mismo directorio)
import raw from "./theme.json";

/**
 * Devuelve el tema mezclando defaults + lo que venga desde theme.json
 * Edita SOLO theme.json para cambiar colores.
 */
export function getTheme() {
  const fromJson = (raw && (raw.colors || raw)) || {};

  const defaults = {
    // Paleta ICA (coincide con tu theme.json)
    primary: "#0056A6",
    primaryDark: "#003B73",
    onPrimary: "#FFFFFF",

    accentAlpha: "rgba(0, 86, 166, 0.25)",

    bg: "#F3F5F8",
    surface: "#FFFFFF",
    border: "#D5DBE3",

    text: "#1F2937",
    textMuted: "#6B7280",

    muted: "#4B5563",

    shadowSm: "0 2px 10px rgba(0,0,0,0.08)",
    shadowMd: "0 6px 18px rgba(0,0,0,0.12)",

    overlay: "rgba(0,0,0,0.35)", // fondo de modales
  };

  return { ...defaults, ...fromJson };
}

export default getTheme;
