import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { UIProvider } from "./UIContext";
import { useAppUI, useUIMessages } from "./useAppUI";
import { ConfigProvider } from "./ConfigContext";
import { useConfig, useFormData } from "./useConfig";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import { RsvpProvider } from "./RsvpContext";
import { useRsvpContext } from "./useRsvpContext";
import { AppContext } from "./useApp";
import { useConfirm } from "./ConfirmContext";

function AppMerger({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const config = useConfig();
  // formData (borrador del editor) se lee de su contexto separado (v2.185):
  // el value principal de ConfigContext ya no cambia por cada tecla, así que
  // los demás consumidores se quedan quietos. AppMerger solo re-renderiza
  // cuando cambia el borrador (necesario: el guardado compara menú vs config).
  const { formData: draft } = useFormData();
  const auth = useAuth();
  const rsvp = useRsvpContext();
  const uiRare = useAppUI();
  const ui = useUIMessages();
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
          draft.menuEnabled !== config.config.menuEnabled ||
          draft.menuTextoDishes !== config.config.menuTextoDishes ||
          draft.menuCarneDishes !== config.config.menuCarneDishes ||
          draft.menuPescadoDishes !== config.config.menuPescadoDishes ||
          draft.menuVeganoDishes !== config.config.menuVeganoDishes;

        if (hasMenuChanges && !(await confirm({ message: t("settings.menuChangeConfirm", { count: rsvpCount }) }))) {
          return;
        }
      }
      await config.handleSaveSetup(event);
    },
    // draft (borrador) participa en el diff de menú: debe estar en deps para
    // que el closure no use un borrador obsoleto al confirmar el cambio.
    [config, auth, rsvp, ui, t, confirm, draft],
  );

  const value = useMemo(() => {
    return {
      ...config,
      ...auth,
      ...rsvp,
      ...uiRare,
      ...ui,
      handleSaveSetup,
    };
  }, [config, auth, rsvp, uiRare, ui, handleSaveSetup]);

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
