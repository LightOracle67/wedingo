import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { UIContext, UIMessagesContext } from "./useAppUI";

// Lazy: el LegalModal (con el texto completo de la política) no debe entrar en
// el bundle inicial; se carga solo cuando se abre.
const LegalModal = lazy(() => import("../components/LegalModal"));

export function UIProvider({ children }: { children: React.ReactNode }) {
  // ── Mensajes frecuentes (contexto propio, v2.187) ──────────────────────
  // Antes TODO vivía en un único value: cada setSaveMessage del autosave
  // (cada ~1,5 s) o cada mensaje admin re-renderizaba a TODOS los
  // consumidores de useAppUI (AppShell, AdminPage, SetupForm, RsvpSection,
  // AuthProvider, ConfigProvider, RsvpProvider…).
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessageType, setAdminMessageType] = useState("success");

  // ── Estado de modales/mapa (cambia raramente) ──────────────────────────
  const [legalModal, setLegalModal] = useState("");
  const [cookiePrefsOpen, setCookiePrefsOpen] = useState(false);
  const [locationMapError, setLocationMapError] = useState("");
  const [locationMapLoading, setLocationMapLoading] = useState(false);
  const [locationMapTarget, setLocationMapTarget] = useState<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);
  const locationMapContainerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  useEffect(() => {
    setSaveMessage("");
    setSaveError("");
    setAdminMessage("");
  }, [location.pathname]);

  const uiValue = useMemo(
    () => ({
      legalModal,
      setLegalModal,
      cookiePrefsOpen,
      setCookiePrefsOpen,
      locationMapContainerRef,
      locationMapError,
      setLocationMapError,
      locationMapLoading,
      setLocationMapLoading,
      locationMapTarget,
      setLocationMapTarget,
    }),
    [
      legalModal,
      setLegalModal,
      cookiePrefsOpen,
      setCookiePrefsOpen,
      locationMapContainerRef,
      locationMapError,
      setLocationMapError,
      locationMapLoading,
      setLocationMapLoading,
      locationMapTarget,
      setLocationMapTarget,
    ],
  );

  const messagesValue = useMemo(
    () => ({
      saveMessage,
      setSaveMessage,
      saveError,
      setSaveError,
      adminMessage,
      setAdminMessage,
      adminMessageType,
      setAdminMessageType,
    }),
    [saveMessage, saveError, adminMessage, adminMessageType],
  );

  return (
    <UIContext.Provider value={uiValue}>
      <UIMessagesContext.Provider value={messagesValue}>
        {legalModal ? (
          <Suspense fallback={null}>
            <LegalModal section={legalModal} onClose={() => setLegalModal("")} />
          </Suspense>
        ) : null}
        {children}
      </UIMessagesContext.Provider>
    </UIContext.Provider>
  );
}
