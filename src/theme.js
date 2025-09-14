// Carga el JSON del tema (debe estar en el mismo directorio)
import raw from "./theme.json";

/**
 * Devuelve el tema mezclando defaults + lo que venga desde theme.json
 * Puedes editar theme.json para cambiar colores sin tocar el código.
 */
export function getTheme() {
  const fromJson = (raw && (raw.colors || raw)) || {};

  const defaults = {
    primary: "#0B4A8F",        // azul ICA
    primaryDark: "#063466",
    accent: "#2DD4BF",
    accentAlpha: "rgba(45,212,191,0.35)",
    bg: "#F3F6FB",
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#475569",
    border: "#E5E7EB",
    muted: "#6B7280",
    shadowSm: "0 1px 2px rgba(0,0,0,.06)",
    shadowMd: "0 6px 20px rgba(0,0,0,.12)",
  };

  return { ...defaults, ...fromJson };
}

/**
 * Pequeño helper para concatenar classNames opcionales.
 * (Lo usamos en App.jsx; si no lo quisieras, puedes quitar className allí.)
 */
export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}
