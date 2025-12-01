// src/components/ModuloLayout.jsx
"use client";

import React from "react";
import { getTheme } from "../theme.js";

/**
 * ModuloLayout
 * Marco visual común para todos los módulos
 *
 * Props:
 *  - logo: imagen del módulo
 *  - title: título principal
 *  - subtitle: texto pequeño opcional
 *  - variant: "trauma" | "preop" | "generales" | "ia" | "default"
 *  - children: contenido interno del módulo
 *  - footer: zona opcional para botones (continuar, pagar, etc.)
 */
export default function ModuloLayout({
  logo = null,
  title = "",
  subtitle = "",
  variant = "default",
  children,
  footer = null,
}) {
  const T = getTheme();

  // Color de borde según módulo
  const borderColor =
    variant === "trauma"
      ? T.primaryDark
      : variant === "preop"
      ? "#0d6efd"
      : variant === "generales"
      ? "#198754"
      : variant === "ia"
      ? "#6f42c1"
      : T.border;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 12px",
        background: T.bg ?? "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          background: T.surface ?? "#ffffff",
          borderRadius: 16,
          padding: "20px 24px",
          border: `2px solid ${borderColor ?? "#ddd"}`,
          boxShadow: T.shadowMd ?? "0 6px 24px rgba(0,0,0,0.15)",
        }}
      >

        {/* ===================== HEADER ===================== */}
        <div
          style={{
            display: "flex",
            alignItems: "center", // ← título y subtítulo al lado del logo
            gap: 16,
            marginBottom: 20,
            flexWrap: "nowrap", // ← evita que el título baje
          }}
        >
          {logo && (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                overflow: "hidden",
                background: T.surface,
                border: `1px solid ${T.border ?? "#ccc"}`,
                boxShadow: T.shadowSm ?? "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src={logo}
                alt="logo módulo"
                style={{
                  display: "block",
                  maxWidth: "90%",
                  maxHeight: "90%",
                  objectFit: "contain",
                }}
              />
            </div>
          )}

          {/* Texto al lado del logo */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2
              style={{
                margin: 0,
                padding: 0,
                fontSize: "clamp(18px, 2vw, 22px)",
                fontWeight: 700,
                color: T.primaryDark ?? "#002b55",
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>

            {subtitle && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: "clamp(12px, 1vw, 14px)",
                  color: T.textMuted ?? "#666",
                  lineHeight: 1.2,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {/* ================== FIN HEADER ===================== */}

        {/* Contenido del módulo */}
        <div>{children}</div>

        {/* Footer (botones) */}
        {footer && (
          <div style={{ marginTop: 24, paddingTop: 12 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
