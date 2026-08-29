import type { InvitationConfig } from "../types";

/**
 * Resultado del cálculo de cambios de configuración para el guardado incremental.
 */
interface SetupChanges {
  /** Claves del formulario que difieren del estado persistido (auditoría + payload). */
  changed: string[];
  /** Campos que siempre viajan en el payload aunque no hayan cambiado (reglas/seguridad). */
  alwaysInclude: Set<string>;
  /** Payload incremental inicial: solo campos cambiados + alwaysInclude. */
  payload: Record<string, unknown>;
}

/**
 * Compara el candidato normalizado con el estado actual (no con los defaults)
 * y calcula qué campos cambian, cuáles se envían siempre y el payload incremental.
 *
 * Es la lógica pura del guardado del formulario de configuración, separada del
 * componente ConfigContext para poder testear el cálculo de diff y la whitelist
 * de campos obligatorios sin React ni Firestore (norma: testear hasta el límite).
 */
export function computeSetupChanges(
  candidate: InvitationConfig,
  baseForDiff: InvitationConfig,
  hasStoredConfig: boolean,
): SetupChanges {
  const changed: string[] = [];
  for (const key of Object.keys(candidate)) {
    const newVal = String(candidate[key as keyof InvitationConfig] ?? "");
    const oldVal = String((baseForDiff as Record<string, unknown>)[key] ?? "");
    if (newVal !== oldVal) {
      changed.push(key);
    }
  }

  const alwaysInclude = new Set<string>([
    "privacyConsent",
    "privacyConsentAt",
    "privacyPolicyVersion",
    "firstName",
    "secondName",
  ]);
  if (!hasStoredConfig) {
    alwaysInclude.add("createdAt");
    alwaysInclude.add("setupTokenHash");
  }

  const payload: Record<string, unknown> = {};
  for (const key of changed) {
    if (key in candidate) {
      payload[key] = (candidate as Record<string, unknown>)[key];
    }
  }
  for (const key of alwaysInclude) {
    if (!(key in payload) && key in candidate) {
      payload[key] = (candidate as Record<string, unknown>)[key];
    }
  }

  return { changed, alwaysInclude, payload };
}

/** Campos reservados a superadmin: el admin nunca puede modificarlos. */
export const SUPER_ADMIN_FIELDS = [
  "verified",
  "adminNotes",
  "manualExpiry",
  "status",
  "tags",
  "rsvpCapacity",
  "rsvpSignatureEnabled",
];
