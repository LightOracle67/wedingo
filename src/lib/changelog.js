export const CHANGELOG = [
  {
    version: "2.1.26",
    date: "2026-07-15",
    changes: [
      "Traducciones reales para a11y/music/print/sectionOrder/langSwitcher en fr/de/pt/it/nl",
      "Mensajes de invitación en fr/de/pt en la sección Compartir",
      "25 keys faltantes añadidas a los 83 locales (common, gallery, public, csv, langGroups)",
      "manualChunks para firebase y leaflet en vite.config.js",
      "Import estático de getDoc en PanelTab.jsx (eliminado dynamic import redundante)",
      "Verificado TTL de sessionExpiresAt (24h, controlado por Firestore rules)",
      "Bump de versión a 2.1.26",
    ],
  },
  {
    version: "2.1.24",
    date: "2026-07-13",
    changes: [
      "61 keys muertas eliminadas de es.json/en.json y propagadas a 84 locales",
      "Keys messages.msg0-msg23 eliminadas (residuo de implementación anterior)",
    ],
  },
  {
    version: "2.1.23",
    date: "2026-07-13",
    changes: [
      "Contraste insuficiente corregido en 4 temas claros",
      "Navegación por teclado en galería (flechas + tabIndex + aria-label)",
      "aria-live en estados de error/vacío/no-encontrado de PublicInvitation",
    ],
  },
  {
    version: "2.1.22",
    date: "2026-07-13",
    changes: [
      "i18n migrado a i18next-resources-to-backend con import() dinámico",
      "Chunk principal reducido de 3.5 MB a 465 KB (-87%)",
    ],
  },
];
