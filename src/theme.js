// src/theme.js
import raw from "./theme.json";

const defaults = {
  primary: "#0072CE",
  primaryHover: "#0B64B3",
  accent: "#00B3B8",
  bg: "#f0f4f8",
  surface: "#ffffff",
  textPrimary: "#0A0A0A",
  textMuted: "#667085",
  border: "#E5E7EB",
};

export function getTheme() {
  return { ...defaults, ...(raw || {}) };
}
