// src/components/exitApp.js
export async function exitApp({ confirmFirst = true } = {}) {
  try {
    if (confirmFirst) {
      const ok = window.confirm(
        "Se borrarán TODOS los datos (incluido el JSON del paciente) y la app se cerrará. ¿Continuar?"
      );
      if (!ok) return;
    }

    // Limpia storages
    try { sessionStorage.clear(); } catch {}
    try { localStorage.clear(); } catch {}

    // Borra Cache Storage (PWA)
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {}

    // Desregistra service workers (si hay)
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}

    // Borra IndexedDB (cuando el navegador lo permite)
    try {
      if (window.indexedDB && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        await Promise.all(
          (dbs || []).map((db) =>
            db?.name
              ? new Promise((res) => {
                  const req = indexedDB.deleteDatabase(db.name);
                  req.onsuccess = req.onerror = req.onblocked = () => res();
                })
              : Promise.resolve()
          )
        );
      }
    } catch {}

    // Limpia la URL
    try {
      const u = new URL(window.location.href);
      ["pago", "idPago", "modulo"].forEach((k) => u.searchParams.delete(k));
      window.history.replaceState({}, "", u.pathname);
    } catch {}

    // Cerrar/Salir (best-effort)
    try { window.open("", "_self"); window.close(); } catch {}
    try { window.location.replace("about:blank"); } catch { window.location.href = "about:blank"; }
  } catch {}
}
