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
import { AppContext } from "./useApp";
import { useConfirm } from "./ConfirmContext";

function AppMerger({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const config = useConfig();
  const auth = useAuth();
  const rsvp = useRsvpContext();
  const ui = useAppUI();
  // Confirmación accesible (modal con focus-trap). El ConfirmProvider envuelve
  // AppProvider (v2.113) para que este flujo de guardado use el modal en vez
  // del window.confirm nativo (inaccesible).
  const { confirm } = useConfirm();

  const handleSaveSetup = useCallback(
    async (event: React.FormEvent) => {
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
          config.formData?.menuTextoDishes !== config.config?.menuTextoDishes ||
          config.formData?.menuCarneDishes !== config.config?.menuCarneDishes ||
          config.formData?.menuPescadoDishes !== config.config?.menuPescadoDishes ||
          config.formData?.menuVeganoDishes !== config.config?.menuVeganoDishes;

        if (hasMenuChanges && !(await confirm({ message: t("settings.menuChangeConfirm", { count: rsvpCount }) }))) {
          return;
        }
      }
      await config.handleSaveSetup(event);
    },
    [config, auth, rsvp, ui, t, confirm],
  );

  const value = useMemo(() => {
    return {
      ...config,
      ...auth,
      ...rsvp,
      ...ui,
      handleSaveSetup,
    };
  }, [config, auth, rsvp, ui, handleSaveSetup]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <ConfigProvider>
        <AuthProvider>
          <RsvpProvider>
            <AppMerger>{children}</AppMerger>
          </RsvpProvider>
        </AuthProvider>
      </ConfigProvider>
    </UIProvider>
  );
}
