import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { UIProvider } from "./UIContext";
import { useAppUI } from "./useAppUI";
import { ConfigProvider } from "./ConfigContext";
import { useConfig } from "./useConfig";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import { RsvpProvider } from "./RsvpContext";
import { useRsvpContext } from "./useRsvpContext";
import { AppContext, useApp } from "./useApp";

// Re-export para compatibilidad con imports existentes
// eslint-disable-next-line react(only-export-components)
export { useApp };

function AppMerger({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const config = useConfig();
  const auth = useAuth();
  const rsvp = useRsvpContext();
  const ui = useAppUI();

  const handleSaveSetup = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    ui.setSaveError("");
    ui.setSaveMessage("");
    if (!config.hasStoredConfig && !auth.isTokenVerified && !auth.setupToken) {
      ui.setSaveError(t("errors.verifyTokenFirst"));
      return;
    }
    const rsvpCount = (rsvp.rsvpEntries || []).filter((e: { attendance: string }) => e.attendance === "yes").length;
    if (rsvpCount > 0) {
      const hasMenuChanges =
        config.formData?.menuEnabled !== config.config?.menuEnabled ||
        config.formData?.menuCarne !== config.config?.menuCarne ||
        config.formData?.menuPescado !== config.config?.menuPescado ||
        config.formData?.menuVegano !== config.config?.menuVegano ||
        config.formData?.menuTexto !== config.config?.menuTexto;
      if (hasMenuChanges && !window.confirm(t("settings.menuChangeConfirm", { count: rsvpCount }))) {
        return;
      }
    }
    await config.handleSaveSetup(event);
  }, [config, auth, rsvp, ui, t]);

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

export function AppProvider({ children }: { children: React.ReactNode }) {
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


