import { createContext, useContext, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { UIProvider, useAppUI } from "./UIContext";
import { ConfigProvider, useConfig } from "./ConfigContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { RsvpProvider, useRsvpContext } from "./RsvpContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AppContext = createContext<any>(null);

function AppMerger({ children }: any) {
  const { t } = useTranslation();
  const config = useConfig();
  const auth = useAuth();
  const rsvp = useRsvpContext();
  const ui = useAppUI();

  const handleSaveSetup = useCallback(async (event: any) => {
    event.preventDefault();
    ui.setSaveError("");
    ui.setSaveMessage("");
    if (!config.hasStoredConfig && !auth.isTokenVerified && !auth.setupToken) {
      ui.setSaveError(t("errors.verifyTokenFirst"));
      return;
    }
    await config.handleSaveSetup(event);
  }, [config, auth, ui, t]);

  const value = useMemo(() => ({
    ...config,
    ...auth,
    ...rsvp,
    ...ui,
    handleSaveSetup,
  }), [config, auth, rsvp, ui, handleSaveSetup]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: any) {
  return (
    <UIProvider>
      <ConfigProvider>
        <AuthProvider>
          <RsvpProvider>
            <AppMerger>
              {children}
            </AppMerger>
          </RsvpProvider>
        </AuthProvider>
      </ConfigProvider>
    </UIProvider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider");
  return context;
}
