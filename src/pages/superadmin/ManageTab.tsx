import { memo, useCallback, useEffect, useRef, useState } from "react";
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
  orderBy,
  limit,
} from "firebase/firestore";
import { db, INVITATIONS_COLLECTION_REF } from "../../lib/firebase";
import { firestoreMillis } from "../../lib/safe-date";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../contexts/ConfirmContext";
import { hashSetupToken } from "../../lib/setup-token";
import { generateInviteToken, generateSetupToken } from "../../lib/token-utils";
import { validateConfigForSave } from "../../lib/config-validation";
import { MAX_YEARS_AHEAD } from "../../lib/constants";
import { downloadJson, downloadText } from "../../lib/file-utils";
import { buildInvitationIcs, diffInvitations } from "./manage-tab-helpers";
import { ToolboxPanel } from "./toolbox-panel";

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
  const { confirm } = useConfirm();

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
  // F3-2 estado / F3-5 etiquetas / F3-7 aforo / F3-8 firma digital.
  const [status, setStatus] = useState("active");
  const [tags, setTags] = useState("");
  const [rsvpCapacity, setRsvpCapacity] = useState("");
  const [rsvpSignatureEnabled, setRsvpSignatureEnabled] = useState(false);
  // F4-1 sesión activa / F4-8 registro de accesos / F4-3 preview devices.
  const [hasSession, setHasSession] = useState(false);
  const [accessLog, setAccessLog] = useState<Array<{ action: string; detail: string; ts: number }>>([]);
  const [deviceWidth, setDeviceWidth] = useState(400);
  // F4-4 QR.
  const [qrDataUrl, setQrDataUrl] = useState("");
  // F4-6 auto-respuesta en nombre del invitado.
  const [autoName, setAutoName] = useState("");
  const [autoAttendance, setAutoAttendance] = useState("yes");
  const [autoSaving, setAutoSaving] = useState(false);
  // Comparar invitaciones.
  const [cmpA, setCmpA] = useState("");
  const [cmpB, setCmpB] = useState("");
  const [cmpDiff, setCmpDiff] = useState<Array<{ key: string; a: string; b: string }>>([]);
  // Validador de configuración (simulación de reglas en cliente).
  const [validatorJson, setValidatorJson] = useState("");
  const [validatorResult, setValidatorResult] = useState<{ ok: boolean; msg: string } | null>(null);

  /** Compara dos invitaciones y muestra los campos con valores distintos. */
  const handleCompare = useCallback(async () => {
    if (!cmpA || !cmpB) return;
    try {
      const [sa, sb] = await Promise.all([
        getDoc(doc(INVITATIONS_COLLECTION_REF, cmpA)),
        getDoc(doc(INVITATIONS_COLLECTION_REF, cmpB)),
      ]);
      const da = sa.exists() ? sa.data() : {};
      const db = sb.exists() ? sb.data() : {};
      setCmpDiff(diffInvitations(da, db));
    } catch {
      addToast("error", t("errors.dataLoadFailed"));
    }
  }, [cmpA, cmpB, addToast, t]);

  /** Valida una configuración JSON contra la misma validación del guardado. */
  const handleValidate = useCallback(() => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(validatorJson || "{}");
    } catch {
      setValidatorResult({ ok: false, msg: t("manage.restoreInvalidJson") });
      return;
    }
    const { errorKey, sanitized } = validateConfigForSave(parsed, true, new Date().getFullYear() + MAX_YEARS_AHEAD);
    setValidatorResult(
      errorKey
        ? { ok: false, msg: t(errorKey) }
        : { ok: true, msg: t("manage.validatorOk") + ` (${Object.keys(sanitized).length} campos)` },
    );
  }, [validatorJson, t]);
  // F4-5: ref del iframe de previsualización (para modo presentación).
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

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
      setStatus(String(data.status || "active"));
      setTags(String(data.tags || ""));
      setRsvpCapacity(String(data.rsvpCapacity || ""));
      setRsvpSignatureEnabled(String(data.rsvpSignatureEnabled) === "true");
      setHasSession(data.activeSession != null);
      setNewToken("");
      setNewSetupToken("");
      // F4-8: registro de accesos de esta invitación (subcolección accessLog).
      try {
        const accessSnap = await getDocs(
          query(collection(db, "invitations", token, "accessLog"), orderBy("ts", "desc"), limit(8)),
        );
        setAccessLog(
          accessSnap.docs.map((d) => {
            const dd = d.data();
            const raw = dd.ts as { seconds?: unknown } | null | undefined;
            const ts = firestoreMillis(raw) ?? 0;
            return { action: String(dd.action || ""), detail: String(dd.detail || ""), ts };
          }),
        );
      } catch {
        setAccessLog([]);
      }
      // F4-4: QR de la URL pública de la invitación (lazy, como en ShareTab).
      try {
        const QRCode = (await import("qrcode")).default;
        const url = `${window.location.origin}/${token}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 160, margin: 1 });
        setQrDataUrl(dataUrl);
      } catch {
        setQrDataUrl("");
      }
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
    if (!(await confirm({ message: t("manage.transferConfirm") }))) return;
    setWorking(true);
    try {
      const newSetup = generateSetupToken();
      const hash = await hashSetupToken(newSetup);
      await setDoc(doc(db, "setupTokens", hash), { inviteToken: token, createdAt: new Date().toISOString() });
      // Revoca los tokens ANTERIORES (hash → inviteToken) y los campos legacy.
      // CRÍTICO: la consulta `where("inviteToken", "==", token)` también
      // devuelve el registro RECIÉN creado; se excluye explícitamente su hash
      // para no borrarlo (antes el token nuevo quedaba huérfano y el login
      // fallaba con "Token no válido").
      const oldSnap = await getDocs(query(collection(db, "setupTokens"), where("inviteToken", "==", token)));
      const batch = writeBatch(db);
      oldSnap.docs.forEach((d) => {
        if (d.id !== hash) batch.delete(d.ref);
      });
      batch.update(doc(INVITATIONS_COLLECTION_REF, token), { _activeSetupToken: "" });
      await batch.commit();
      setNewSetupToken(newSetup);
      addToast("success", t("manage.transferDone"));
    } catch {
      addToast("error", t("errors.generic"));
    } finally {
      setWorking(false);
    }
  }, [token, addToast, t, confirm]);

  /** F1-3: clona la invitación a un token nuevo con la misma configuración. */
  const handleClone = useCallback(async () => {
    if (!token || !docData) return;
    if (!(await confirm({ message: t("manage.cloneConfirm") }))) return;
    setWorking(true);
    try {
      const newInviteToken = generateInviteToken();
      const newSetup = generateSetupToken();
      const hash = await hashSetupToken(newSetup);
      // Se copia la configuración pero NO el bankInfo (cifrado con el token
      // original) ni los campos de sesión/tokens, incluidos los tokens LEGACY
      // (_activeSetupToken, legacyToken): sin esto el clon expondría la
      // credencial del padre en un documento público (riesgo de takeover).
      const {
        bankInfo: _b,
        activeSession: _s,
        sessionExpiresAt: _e,
        setupTokenHash: _h,
        _visits: _v,
        _activeSetupToken: _at,
        legacyToken: _lt,
        ...clone
      } = docData;
      await setDoc(doc(INVITATIONS_COLLECTION_REF, newInviteToken), {
        ...clone,
        bankInfo: "",
        firstName: String(docData.firstName || "") || "Clone",
        secondName: String(docData.secondName || "") || "Copy",
      });
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
  }, [token, docData, loadInvitations, addToast, t, confirm]);

  /** F1-4: guarda la expiración manual. */
  const handleSaveExpiry = useCallback(async () => {
    try {
      await updateDoc(doc(INVITATIONS_COLLECTION_REF, token), { manualExpiry });
      addToast("success", t("errors.configSaved"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [token, manualExpiry, addToast, t]);

  /** F1-7 + F1-8 + F3-2/5/7/8: guarda sello, notas, estado, etiquetas, aforo
   *  y firma digital. */
  const handleSaveFlags = useCallback(async () => {
    try {
      await updateDoc(doc(INVITATIONS_COLLECTION_REF, token), {
        verified: verified ? "true" : "false",
        adminNotes,
        status,
        tags,
        rsvpCapacity,
        rsvpSignatureEnabled: rsvpSignatureEnabled ? "true" : "false",
      });
      addToast("success", t("errors.configSaved"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [token, verified, adminNotes, status, tags, rsvpCapacity, rsvpSignatureEnabled, addToast, t]);

  /** F2-4: descarga el último backup ligero guardado en _backup/latest. */
  const handleDownloadBackup = useCallback(async () => {
    if (!token) return;
    try {
      const snap = await getDoc(doc(db, "invitations", token, "_backup", "latest"));
      if (!snap.exists()) {
        addToast("info", t("manage.noBackup"));
        return;
      }
      const raw = String(snap.data().data || "");
      const parsed = JSON.parse(raw);
      downloadJson(`${token}_backup.json`, parsed);
      addToast("success", t("manage.backupDownloaded"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [token, addToast, t]);

  /** F4-1: cierra la sesión activa de la invitación (revocación remota). */
  const handleKillSession = useCallback(async () => {
    if (!token) return;
    if (!(await confirm({ message: t("manage.killSessionConfirm") }))) return;
    try {
      await updateDoc(doc(INVITATIONS_COLLECTION_REF, token), { activeSession: null, sessionExpiresAt: null });
      setHasSession(false);
      addToast("success", t("manage.killSessionDone"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [token, addToast, t, confirm]);

  /** Pausa/reanuda la invitación: añade o quita el token de la lista bloqueada
   *  global (platform.blockedTokens), que la invitación pública ya respeta. */
  const handlePause = useCallback(async () => {
    if (!token) return;
    try {
      const snap = await getDoc(doc(db, "platform", "settings"));
      const data = (snap.exists() ? snap.data() : {}) as { blockedTokens?: string };
      const blocked = (data.blockedTokens || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const isBlocked = blocked.includes(token);
      const next = isBlocked ? blocked.filter((x) => x !== token) : [...blocked, token];
      await setDoc(doc(db, "platform", "settings"), { ...data, blockedTokens: next.join(",") }, { merge: true });
      addToast("success", t(isBlocked ? "manage.unpaused" : "manage.paused"));
    } catch {
      addToast("error", t("errors.generic"));
    }
  }, [token, addToast, t]);

  /** F4-5: abre la previsualización a pantalla completa (modo presentación). */
  const handlePresent = useCallback(() => {
    const frame = previewFrameRef.current;
    if (frame?.requestFullscreen) {
      void frame.requestFullscreen().catch(() => {});
    }
  }, []);

  /** Copia el enlace de la invitación (para compartir por WhatsApp). */
  const handleCopyLink = useCallback(async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${token}`);
      addToast("success", t("manage.linkCopied"));
    } catch {
      addToast("error", t("errors.clipboardCopyFailed"));
    }
  }, [token, addToast, t]);

  /** Genera un .ics con la fecha y el lugar de la boda (agenda). */
  const handleDownloadIcs = useCallback(() => {
    if (!token || !docData) return;
    const ics = buildInvitationIcs({
      token,
      weddingYear: docData.weddingYear,
      weddingMonth: docData.weddingMonth,
      weddingDay: docData.weddingDay,
      weddingPlace: docData.weddingPlace,
      firstName: docData.firstName,
      secondName: docData.secondName,
    });
    if (!ics) {
      addToast("info", t("manage.noWeddingDate"));
      return;
    }
    downloadText(`${token}.ics`, ics, "text/calendar;charset=utf-8");
    addToast("success", t("manage.icsDownloaded"));
  }, [token, docData, addToast, t]);

  /** F5-2 (F14): restaura un backup JSON subido (config) en esta invitación. */
  const handleRestoreBackup = useCallback(
    async (file: File | undefined) => {
      if (!file || !token) return;
      if (!(await confirm({ message: t("manage.restoreConfirm") }))) return;
      try {
        const text = await file.text();
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(text);
        } catch {
          addToast("error", t("manage.restoreInvalidJson"));
          return;
        }
        // Acepta { invitation: {...} } (formato de export) o la config directa.
        const config = (
          parsed.invitation && typeof parsed.invitation === "object" ? parsed.invitation : parsed
        ) as Record<string, unknown>;
        const { sanitized, errorKey } = validateConfigForSave(config, true, new Date().getFullYear() + MAX_YEARS_AHEAD);
        if (errorKey) {
          addToast("error", t(errorKey));
          return;
        }
        await setDoc(doc(INVITATIONS_COLLECTION_REF, token), sanitized, { merge: true });
        addToast("success", t("manage.restoreDone"));
        void loadInvitation();
      } catch {
        addToast("error", t("errors.generic"));
      }
    },
    [token, loadInvitation, addToast, t, confirm],
  );

  /** F4-6: registra una respuesta RSVP en nombre del invitado (auto-respuesta
   *  del superadmin cuando el invitado confirma por teléfono). */
  const handleAutoRespond = useCallback(async () => {
    if (!token || !autoName.trim()) return;
    setAutoSaving(true);
    try {
      const now = new Date();
      const id = `main_${autoName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}_${Date.now()}`;
      await setDoc(doc(db, "rsvpResponses", token, "responses", id), {
        rsvpType: "main",
        guestName: autoName.trim().slice(0, 120),
        attendance: autoAttendance === "yes" ? "yes" : "no",
        inviteToken: token,
        submittedAt: now,
        privacyConsent: true,
        privacyConsentAt: now,
        companions: 0,
        companionCount: 0,
        companionNames: [],
        companionMenus: [],
        companionAllergies: [],
        companionAllergiesOther: [],
        allergiesOther: "",
        mealChoice: "",
        dietaryInfo: "",
        guestNames: autoName.trim().slice(0, 120),
        attendees: [],
        // userAgent del superadmin (F2-8) + nota de que es una auto-respuesta.
        userAgent: `${navigator.userAgent.slice(0, 160)} [auto]`,
      });
      setAutoName("");
      addToast("success", t("manage.autoRespondDone"));
    } catch {
      addToast("error", t("errors.generic"));
    } finally {
      setAutoSaving(false);
    }
  }, [token, autoName, autoAttendance, addToast, t]);

  /** F1-6: copia una subcolección (galería/audio/configImages) de otra invitación. */
  const handleCopySection = useCallback(async () => {
    if (!token || !copySource || copySource === token) return;
    if (!(await confirm({ message: t("manage.copySectionConfirm") }))) return;
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
  }, [token, copySource, copySub, addToast, t, confirm]);

  const [sim, setSim] = useState("");

  if (loading) {
    return (
      <p className="setup-subtitle" style={{ textAlign: "center" }}>
        {t("common.loading")}
      </p>
    );
  }

  const previewUrl = token ? `/${token}?preview=1${sim ? `&sim=${sim}` : ""}` : "";

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
              <button className="setup-button setup-button--ghost" type="button" onClick={handleDownloadBackup}>
                {t("manage.downloadBackup")}
              </button>
              <label className="setup-button setup-button--ghost" style={{ cursor: "pointer", margin: 0 }}>
                {t("manage.restoreBackup")}
                <input
                  type="file"
                  accept="application/json,.json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    void handleRestoreBackup(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
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
            <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
              <label className="setup-label" style={{ margin: 0 }}>
                {t("manage.status")}
                <select
                  className="setup-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ marginLeft: "0.4rem" }}
                >
                  <option value="active">{t("manage.statusActive")}</option>
                  <option value="review">{t("manage.statusReview")}</option>
                  <option value="blocked">{t("manage.statusBlocked")}</option>
                </select>
              </label>
              <label className="setup-label" style={{ margin: 0 }}>
                {t("manage.tags")}
                <input
                  className="setup-input"
                  value={tags}
                  onChange={(e) => setTags(e.target.value.slice(0, 500))}
                  placeholder={t("manage.tagsPlaceholder")}
                  style={{ marginLeft: "0.4rem", maxWidth: "14rem" }}
                  aria-label={t("manage.tags")}
                />
              </label>
              <label className="setup-label" style={{ margin: 0 }}>
                {t("manage.rsvpCapacity")}
                <input
                  type="number"
                  min={0}
                  className="setup-input"
                  value={rsvpCapacity}
                  onChange={(e) => setRsvpCapacity(e.target.value.slice(0, 5))}
                  style={{ marginLeft: "0.4rem", width: "5rem" }}
                  aria-label={t("manage.rsvpCapacity")}
                />
              </label>
              <label className="setup-checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={rsvpSignatureEnabled}
                  onChange={(e) => setRsvpSignatureEnabled(e.target.checked)}
                  style={{ accentColor: "var(--setup-accent)" }}
                />
                <span>{t("manage.rsvpSignature")}</span>
              </label>
            </div>
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
              <button
                className="setup-button setup-button--ghost"
                type="button"
                onClick={handleClone}
                disabled={working}
              >
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

          {/* F4-1 + F4-8: sesión activa y registro de accesos */}
          <div className="setup-background-panel">
            <p className="setup-label">{t("manage.sessionTitle")}</p>
            <p className="setup-help" style={{ margin: "0 0 0.4rem" }}>
              {hasSession ? t("manage.sessionActiveLabel") : t("manage.sessionInactiveLabel")}
            </p>
            {hasSession ? (
              <button
                className="setup-button setup-button--danger setup-button--compact"
                type="button"
                onClick={handleKillSession}
              >
                {t("manage.killSession")}
              </button>
            ) : null}
            <button
              className="setup-button setup-button--ghost setup-button--compact"
              type="button"
              onClick={() => void handlePause()}
            >
              {t("manage.pause")}
            </button>
            {accessLog.length > 0 ? (
              <ul
                style={{
                  margin: "0.5rem 0 0",
                  paddingLeft: "1.2rem",
                  fontSize: "0.75rem",
                  color: "var(--setup-subtitle)",
                }}
              >
                {accessLog.map((a, i) => (
                  <li key={i} style={{ marginBottom: "0.15rem" }}>
                    <strong>{a.action}</strong> — {a.detail.slice(0, 60)}
                    {a.ts ? (
                      <span style={{ color: "var(--setup-muted)" }}> · {new Date(a.ts).toLocaleTimeString()}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="setup-help">{t("manage.noAccessLog")}</p>
            )}
          </div>

          {/* F4-3 + F4-4: previsualización con ancho de dispositivo + QR */}
          <div className="setup-background-panel">
            <p className="setup-label">{t("manage.devicePreview")}</p>
            <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <label className="setup-label" style={{ margin: 0 }}>
                {t("manage.deviceWidth")}
                <select
                  className="setup-input"
                  value={deviceWidth}
                  onChange={(e) => setDeviceWidth(Number(e.target.value))}
                  style={{ marginLeft: "0.4rem" }}
                >
                  <option value={360}>{t("manage.deviceMobile")}</option>
                  <option value={768}>{t("manage.deviceTablet")}</option>
                  <option value={1200}>{t("manage.deviceDesktop")}</option>
                </select>
              </label>
              {/* Simulación de estados del invitado (sin tocar datos reales) */}
              <select
                className="setup-input"
                value={sim}
                onChange={(e) => setSim(e.target.value)}
                aria-label={t("manage.simulate")}
                style={{ maxWidth: "14rem" }}
              >
                <option value="">{t("manage.simNone")}</option>
                <option value="responded">{t("manage.simResponded")}</option>
                <option value="expired">{t("manage.simExpired")}</option>
              </select>
            </div>
            <div
              style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginTop: "0.5rem", flexWrap: "wrap" }}
            >
              <div
                style={{
                  width: Math.min(deviceWidth, 900),
                  maxWidth: "100%",
                  border: "1px solid var(--setup-border)",
                  borderRadius: "0.6rem",
                  overflow: "hidden",
                }}
              >
                <iframe
                  ref={previewFrameRef}
                  src={previewUrl}
                  title={t("manage.devicePreview")}
                  style={{ width: "100%", height: "380px", border: 0, background: "#fff" }}
                  sandbox="allow-scripts allow-same-origin"
                  allowFullScreen
                />
                <div className="admin-flex" style={{ gap: "0.4rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                  <button className="setup-button setup-button--compact" type="button" onClick={handlePresent}>
                    {t("manage.presentMode")}
                  </button>
                  <a
                    className="setup-button setup-button--ghost setup-button--compact"
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("manage.assistMode")}
                  </a>
                </div>
              </div>
              {qrDataUrl ? (
                <div style={{ textAlign: "center" }}>
                  <img src={qrDataUrl} alt={t("manage.qrAlt")} width={140} height={140} />
                  <div className="admin-flex" style={{ gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <a
                      className="setup-button setup-button--compact"
                      href={qrDataUrl}
                      download={`${token}.png`}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {t("manage.qrDownload")}
                    </a>
                    <button
                      className="setup-button setup-button--compact"
                      type="button"
                      onClick={handleCopyLink}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {t("manage.copyLink")}
                    </button>
                    <button
                      className="setup-button setup-button--compact"
                      type="button"
                      onClick={handleDownloadIcs}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {t("manage.icsButton")}
                    </button>
                  </div>
                  <p className="setup-help" style={{ margin: 0, fontSize: "0.7rem" }}>
                    {t("manage.qrAlt")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* F4-6: auto-respuesta del superadmin */}
          <div className="setup-background-panel">
            <p className="setup-label">{t("manage.autoRespond")}</p>
            <div className="admin-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                className="setup-input"
                value={autoName}
                onChange={(e) => setAutoName(e.target.value)}
                placeholder={t("manage.autoRespondName")}
                maxLength={120}
                aria-label={t("manage.autoRespondName")}
              />
              <select
                className="setup-input"
                value={autoAttendance}
                onChange={(e) => setAutoAttendance(e.target.value)}
                aria-label={t("manage.autoRespondAttendance")}
              >
                <option value="yes">{t("rsvp.attendingAlone")}</option>
                <option value="no">{t("rsvp.notAttending")}</option>
              </select>
              <button
                className="setup-button setup-button--compact"
                type="button"
                onClick={handleAutoRespond}
                disabled={autoSaving || !autoName.trim()}
              >
                {autoSaving ? t("common.loading") : t("manage.autoRespondButton")}
              </button>
            </div>
          </div>

          {/* Comparar invitaciones + validador de configuración */}
          <ToolboxPanel
            invitations={invitations}
            cmpA={cmpA}
            cmpB={cmpB}
            onCmpA={setCmpA}
            onCmpB={setCmpB}
            cmpDiff={cmpDiff}
            onCompare={() => void handleCompare()}
            validatorJson={validatorJson}
            onValidatorJson={setValidatorJson}
            validatorResult={validatorResult}
            onValidate={handleValidate}
          />

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
              <button
                className="setup-button setup-button--ghost"
                type="button"
                onClick={handleCopySection}
                disabled={copying}
              >
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
