/**
 * useTabs — Estado de pestañas sincronizado con la URL (hook compartido).
 *
 * Unifica el patrón que antes se duplicaba en AdminPage y SuperAdminPanel:
 *  - La pestaña activa se refleja en `?tab=<key>` (enlazable).
 *  - La URL es la ÚNICA fuente de verdad: el botón *atrás* del navegador
 *    vuelve a la pestaña anterior (antes el sync era solo en un sentido).
 *  - `select()` actualiza la pestaña y la URL (replace: sin historial extra).
 *  - El `tabPanelRef` enfoca el panel al cambiar de pestaña (WCAG 2.4.3):
 *    los usuarios de teclado saben que el contenido cambió.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

export function useTabs<T extends string>(validKeys: readonly T[], defaultKey: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as T | null;

  // Inicialización desde la URL (respeta enlaces con ?tab=...).
  const [activeTab, setActiveTab] = useState<T>(() =>
    validKeys.includes(tabParam as T) ? (tabParam as T) : defaultKey,
  );

  // URL → estado: permite el botón *atrás* y enlaces directos.
  useEffect(() => {
    const next = validKeys.includes(tabParam as T) ? (tabParam as T) : defaultKey;
    setActiveTab((prev) => (prev === next ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  // Ref al tabpanel: recibe el foco al cambiar de pestaña.
  const tabPanelRef = useRef<HTMLDivElement | null>(null);
  const prevTabRef = useRef<T>(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      tabPanelRef.current?.focus({ preventScroll: true });
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const select = useCallback(
    (key: T) => {
      setActiveTab(key);
      // Push (no replace): el botón *atrás* del navegador vuelve a la pestaña
      // anterior (antes el cambio de pestaña no era navegable).
      setSearchParams(key === defaultKey ? {} : { tab: key });
    },
    [defaultKey, setSearchParams],
  );

  return { activeTab, select, tabPanelRef };
}
