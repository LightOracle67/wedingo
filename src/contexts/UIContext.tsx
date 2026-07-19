import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import LegalModal from "../components/LegalModal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UIContext = createContext<any>(null);

export function UIProvider({ children }: any) {
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessageType, setAdminMessageType] = useState("success");
  const [legalModal, setLegalModal] = useState("");
  const [locationMapError, setLocationMapError] = useState("");
  const [locationMapLoading, setLocationMapLoading] = useState(false);
  const [locationMapTarget, setLocationMapTarget] = useState<any>(null);
  const locationMapContainerRef = useRef<any>(null);
  const location = useLocation();

  useEffect(() => {
    setSaveMessage("");
    setSaveError("");
    setAdminMessage("");
  }, [location.pathname]);

  const uiValue = useMemo(() => ({
    legalModal, setLegalModal,
    saveMessage, setSaveMessage,
    saveError, setSaveError,
    adminMessage, setAdminMessage,
    adminMessageType, setAdminMessageType,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
  }), [
    legalModal, setLegalModal,
    saveMessage, setSaveMessage,
    saveError, setSaveError,
    adminMessage, setAdminMessage,
    adminMessageType, setAdminMessageType,
    locationMapContainerRef, locationMapError, setLocationMapError,
    locationMapLoading, setLocationMapLoading, locationMapTarget, setLocationMapTarget,
  ]);

  return (
    <UIContext.Provider value={uiValue}>
      {legalModal && <LegalModal section={legalModal} onClose={() => setLegalModal("")} />}
      {children}
    </UIContext.Provider>
  );
}

export function useAppUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useAppUI debe usarse dentro de AppProvider");
  return ctx;
}
