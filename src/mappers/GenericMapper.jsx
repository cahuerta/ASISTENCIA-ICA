// src/mappers/GenericMapper.jsx
"use client";
import React, { lazy, Suspense, useMemo } from "react";
import { getLoader } from "./mapperRegistry.js";

export default function GenericMapper({ mapperId, ...props }) {
  const loader = getLoader(mapperId);
  if (!loader) return null;

  const LazyComp = useMemo(() => lazy(loader), [loader]);
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Cargando…</div>}>
      <LazyComp {...props} />
    </Suspense>
  );
}
