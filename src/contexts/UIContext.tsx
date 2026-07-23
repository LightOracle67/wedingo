import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import LegalModal from "../components/LegalModal";
import { UIContext } from "./useAppUI";

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessageType, setAdminMessageType] = useState("success");
  const [legalModal, setLegalModal] = useState("");
  const [locationMapError, setLocationMapError] = useState("");
  const [locationMapLoading, setLocationMapLoading] = useState(false);
  const [locationMapTarget, setLocationMapTarget] = useState<{ latitude: number; longitude: number; label: string } | null>(null);
  const locationMapContainerRef = useRef<HTMLDivElement | null>(null);
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


