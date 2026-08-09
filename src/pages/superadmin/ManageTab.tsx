import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getDoc,
  getDocs,
  doc,
  collection,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { db, INVITATIONS_COLLECTION_REF } from "../../lib/firebase";
import { useToast } from "../../hooks/useToast";
import { hashSetupToken } from "../../lib/setup-token";
import { generateInviteToken, generateSetupToken } from "../../lib/token-utils";
import { validateConfigForSave } from "../../lib/config-validation";
import { MAX_YEARS_AHEAD } from "../../lib/constants";

/** Subcolecciones duplicables entre invitaciones (copiar sección). */
const CLONABLE_SUBS = ["gallery", "audio", "configImages"] as const;

/**
 * ManageTab — Panel de GESTIÓN del superadmin para cualquier invitación:
 * editor global de configuración (JSON validado), traspaso de titularidad
 * (nuevo token), clonado, expiración manual, sello de verificación, notas
 * internas, previsualización y copia de secciones. Todas las escrituras van
 * con la sesión de superadmin (las reglas las permiten).
 */
const ManageTab = memo(function ManageTab() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [invitations, setInvitations] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  // Datos brutos del doc seleccionado (sanitizados para edición).
  const [docData, setDocData] = useState<Record<string, unknown> | null>(null);
  const [json, setJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);

  // ── F1-2 traspaso / F1-3 clonado ──
  const [newToken, setNewToken] = useState("");
  const [newSetupToken, setNewSetupToken] = useState("");
  const [working, setWorking] = useState(false);

  // ── F1-4 expiración / F1-7 sello / F1-8 notas ──
  const [manualExpiry, setManualExpiry] = useState("");
  const [verified, setVerified] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  // ── F1-6 duplicar sección ──
  const [copySource, setCopySource] = useState("");
  const [copySub, setCopySub] = useState<string>("gallery");
  const [copying, setCopying] = useState(false);

  const loadInvitations = useCallback(async () => {
    try {
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      const list = snap.docs.map((d) => ({
        id: d.id,
        name: `${String(d.data().firstName ?? "")} ${String(d.data().secondName ?? "")}`.trim() || d.id,
      }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setInvitations(list);
    } catch {
      addToast("error", t("errors.dataLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  /** Carga el doc seleccionado y rellena todos los campos del panel. */
  const loadInvitation = useCallback(async () => {
    if (!token) return;
    try {
      const snap = await getDoc(doc(INVITATIONS_COLLECTION_REF, token));
      if (!snap.exists()) {
        addToast("error", t("errors.invalidLink"));
        return;
      }
      const data = snap.data();
      setDocData(data);
      setJson(JSON.stringify(data, null, 2));
      setJsonError("");
      setManualExpiry(String(data.manualExpiry || ""));
      setVerified(String(data.verified) === "true");
      setAdminNotes(String(data.adminNotes || ""));
      setNewToken("");
      setNewSetupToken("");
    } catch {
      addToast("error", t("errors.dataLoadFailed"));
    }
  }, [token, addToast, t]);

  // Al cambiar de invitación se recarga (loadInvitation depende de token).
  useEffect(() => {
    void loadInvitation();
  }, [loadInvitation]);

  /** F1-1: guarda la configuración desde el editor JSON validado. */
  const handleSaveJson = useCallback(async () => {
    setJsonError("");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      setJsonError(t("errors.configSaved") === "errors.configSaved" ? "JSON inválido" : "JSON inválido");
      return;
    }
    const { sanitized, errorKey } = validateConfigForSave(parsed, true, new Date().getFullYear() + MAX_YEARS_AHEAD);
    if (errorKey) {
      setJsonError(t(errorKey));
      return;
    }
    setSaving(true);
    try {
      // Se conservan los campos de superadmin no incluidos en la validación.
      await setDoc(doc(INVITATIONS_COLLECTION_REF, token), {
        ...sanitized,
        verified: verified ? "true" : "false",
        adminNotes,
        manualExpiry,
      });
      addToast("success", t("errors.configSaved"));
      void loadInvitation();
    } catch {
      setJsonError(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }, [json, token, verified, adminNotes, manualExpiry, loadInvitation, addToast, t]);

  /** F1-2: traspaso de titularidad — genera un NUEVO token de setup y revoca
   *  los anteriores (solo quien conozca el nuevo token podrá administrar). */
  const handleTransfer = useCallback(async () => {
    if (!token) return;
    if (!window.confirm(t("manage.transferConfirm"))) return;
    setWorking(true);
    try {
      const newSetup = generateSetupToken();
      const hash = await hashSetupToken(newSetup);
      await setDoc(doc(db, "setupTokens", hash), { inviteToken: token, createdAt: new Date().toISOString() });
      // Revoca los tokens anteriores (hash → inviteToken) y los campos legacy.
      const oldSnap = await getDocs(query(collection(db, "setupTokens"), where("inviteToken", "==", token)));
      const batch = writeBatch(db);
      oldSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.update(doc(INVITATIONS_COLLECTION_REF, token), { _activeSetupToken: "", legacyToken: "" });
      await batch.commit();
      setNewSetupToken(newSetup);
      addToast("success", t("manage.transferDone"));
    } catch {
      addToast("error", t("errors.generic"));
    } finally {
      setWorking(false);
    }
  }, [token, addToast, t]);

  /** F1-3: clona la invitación a un token nuevo con la misma configuración. */
  const handleClone = useCallback(async () => {
    if (!token || !docData) return;
    if (!window.confirm(t("manage.cloneConfirm"))) return;
    setWorking(true);
    try {
      const newInviteToken = generateInviteToken();
      const newSetup = generateSetupToken();
      const hash = await hashSetupToken(newSetup);
      // Se copia la configuración pero NO el bankInfo (cifrado con el token
      // original) ni los campos de sesión/tokens.
      const { bankInfo: _b, activeSession: _s, sessionExpiresAt: _e, setupTokenHash: _h, ...clone } = docData;
      await setDoc(doc(INVITATIONS_COLLECTION_REF, newInviteToken), { ...clone, bankInfo: "", firstName: String(docData.firstName || "") || "Clone", secondName: String(docData.secondName || "") || "Copy" });
      await setDoc(doc(db, "setupTokens", hash), { inviteToken: newInviteToken, createdAt: new Date().toISOString() });
      setNewToken(newInviteToken);
      setNewSetupToken(newSetup);
      addToast("success", t("manage.cloneDone"));
      void loadInvitations();
    } catch {
      addToast("error", t("errors.generic"));
    } finally {
      setWorking(false);
    }
  }, [token, docData, loadInvitations, addToast, t]);

  /** F1-4: guarda la expiración manual. */
  const handleSaveExpiry = useCallback(async () => {
    try {
      await updateDoc(doc(INVITATIONS_COLLECTION_REF, token), { manualExpiry });
      addToast("success", t("errors.configSaved"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [token, manualExpiry, addToast, t]);

  /** F1-7 + F1-8: guarda sello + notas internas. */
  const handleSaveFlags = useCallback(async () => {
    try {
      await updateDoc(doc(INVITATIONS_COLLECTION_REF, token), {
        verified: verified ? "true" : "false",
        adminNotes,
      });
      addToast("success", t("errors.configSaved"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [token, verified, adminNotes, addToast, t]);

  /** F1-6: copia una subcolección (galería/audio/configImages) de otra invitación. */
  const handleCopySection = useCallback(async () => {
    if (!token || !copySource || copySource === token) return;
    if (!window.confirm(t("manage.copySectionConfirm"))) return;
    setCopying(true);
    try {
      const src = await getDocs(collection(db, "invitations", copySource, copySub));
      const batch = writeBatch(db);
      let count = 0;
      for (const d of src.docs) {
        batch.set(doc(collection(db, "invitations", token, copySub), d.id), d.data());
        count++;
        if (count === 400) {
          await batch.commit();
          break;
        }
      }
      if (count < 400) await batch.commit();
      addToast("success", t("manage.copySectionDone", { count }));
    } catch {
      addToast("error", t("errors.generic"));
    } finally {
      setCopying(false);
    }
  }, [token, copySource, copySub, addToast, t]);

  if (loading) {
    return (
      <p className="setup-subtitle" style={{ textAlign: "center" }}>
        {t("common.loading")}
      </p>
    );
  }

  const previewUrl = token ? `/${token}?preview=1` : "";

  return (
    <div className="admin-flex--col" style={{ height: "100%", minHeight: 0, gap: "0.75rem" }}>
      {/* Selector de invitación */}
      <label className="setup-label" htmlFor="manageToken">
        {t("manage.selectInvitation")}
      </label>
      <select
        id="manageToken"
        className="setup-input"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{ maxWidth: "100%" }}
      >
        <option value="">—</option>
        {invitations.map((inv) => (
          <option key={inv.id} value={inv.id}>
            {inv.name} ({inv.id})
          </option>
        ))}
      </select>

      {token && docData ? (
        <>
          {/* F1-1: editor global de configuración */}
          <div className="setup-background-panel">
            <p className="setup-label">{t("manage.globalEditor")}</p>
            <textarea
              className="setup-textarea"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={12}
              spellCheck={false}
              style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
              aria-label={t("manage.globalEditor")}
            />
            {jsonError ? (
              <p className="setup-error" role="alert">
                {jsonError}
              </p>
            ) : null}
            <div className="setup-actions">
              <button className="setup-button" type="button" onClick={handleSaveJson} disabled={saving}>
                {saving ? t("common.loading") : t("manage.saveConfig")}
              </button>
              <a className="setup-button setup-button--ghost" href={previewUrl} target="_blank" rel="noreferrer">
                {t("manage.preview")}
              </a>
            </div>
          </div>

          {/* F1-7 + F1-8: sello de verificación + notas internas */}
          <div className="setup-background-panel">
            <p className="setup-label">{t("manage.verification")}</p>
            <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                style={{ accentColor: "var(--setup-accent)" }}
              />
              <span>{t("manage.verifiedLabel")}</span>
            </label>
            <textarea
              className="setup-textarea"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder={t("manage.adminNotesPlaceholder")}
              aria-label={t("manage.adminNotesPlaceholder")}
            />
            <div className="setup-actions">
              <button className="setup-button" type="button" onClick={handleSaveFlags}>
                {t("manage.saveFlags")}
              </button>
            </div>
          </div>

          {/* F1-4: expiración manual */}
          <div className="setup-background-panel">
            <p className="setup-label">{t("manage.manualExpiry")}</p>
            <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="date"
                className="setup-input"
                value={manualExpiry}
                onChange={(e) => setManualExpiry(e.target.value)}
                aria-label={t("manage.manualExpiry")}
              />
              <button className="setup-button" type="button" onClick={handleSaveExpiry}>
                {t("manage.saveExpiry")}
              </button>
            </div>
          </div>

          {/* F1-2 + F1-3: traspaso y clonado */}
          <div className="setup-background-panel">
            <p className="setup-label">{t("manage.transferTitle")}</p>
            <p className="setup-help">{t("manage.transferHelp")}</p>
            <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="setup-button" type="button" onClick={handleTransfer} disabled={working}>
                {t("manage.transferButton")}
              </button>
              <button className="setup-button setup-button--ghost" type="button" onClick={handleClone} disabled={working}>
                {t("manage.cloneButton")}
              </button>
            </div>
            {newSetupToken ? (
              <div className="setup-token-card" style={{ marginTop: "0.5rem" }}>
                <p className="admin-text-mono" style={{ margin: 0 }}>
                  {newSetupToken}
                </p>
                {newToken ? (
                  <p className="setup-help" style={{ margin: "0.3rem 0 0" }}>
                    {t("manage.newTokenLabel")}:{" "}
                    <a href={`/${newToken}`} target="_blank" rel="noreferrer" className="admin-text-mono">
                      {newToken}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* F1-6: duplicar sección desde otra invitación */}
          <div className="setup-background-panel">
            <p className="setup-label">{t("manage.copySectionTitle")}</p>
            <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                className="setup-input"
                value={copySource}
                onChange={(e) => setCopySource(e.target.value)}
                aria-label={t("manage.copySectionFrom")}
                style={{ maxWidth: "100%" }}
              >
                <option value="">—</option>
                {invitations
                  .filter((inv) => inv.id !== token)
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.id})
                    </option>
                  ))}
              </select>
              <select
                className="setup-input"
                value={copySub}
                onChange={(e) => setCopySub(e.target.value)}
                aria-label={t("manage.copySectionSub")}
              >
                {CLONABLE_SUBS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="setup-button setup-button--ghost" type="button" onClick={handleCopySection} disabled={copying}>
                {copying ? t("common.loading") : t("manage.copySectionButton")}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="setup-help">{t("manage.selectHint")}</p>
      )}
    </div>
  );
});

export default ManageTab;
