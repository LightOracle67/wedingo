export interface RsvpFormData {
  guestName: string;
  attendance: string;
  companions: number;
  guestNames: string;
  menuHeadcounts: Record<string, number>;
  dietarySelection: string[];
  dietaryOther: string;
  privacyConsent: boolean;
  healthConsent: boolean;
  birthDate: string;
  parentalConsent: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRsvpForm(
  form: RsvpFormData,
  t: (key: string) => string,
  menuEnabled: boolean,
  hasStructuredMenu: boolean,
  _totalGuests: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!form.guestName.trim()) {
    errors.push({ field: "guestName", message: t("rsvp.validation.nameRequired") });
  }

  if (form.attendance === "yes") {
    const companions = form.companions || 0;
    const guestNamesCount = form.guestNames.split(",").filter((n) => n.trim()).length;

    if (companions > 0 && !form.guestNames.trim()) {
      errors.push({ field: "guestNames", message: t("rsvp.validation.guestNamesRequired") });
    }

    if (guestNamesCount > companions) {
      errors.push({ field: "guestNames", message: t("rsvp.validation.guestNamesExceed") });
    }

    if (hasStructuredMenu) {
      const hcs = form.menuHeadcounts || {};
      const sum = Object.values(hcs).reduce((a: any, b: any) => a + (b || 0), 0);
      if (sum === 0) {
        errors.push({ field: "menuHeadcounts", message: t("rsvp.validation.menuRequired") });
      }
      if (sum > companions) {
        errors.push({ field: "menuHeadcounts", message: t("rsvp.validation.headcountExceed") });
      }
    }
  }

  if (form.attendance === "yes" && menuEnabled && form.dietarySelection.length === 0 && !form.dietaryOther.trim()) {
  }

  if (!form.privacyConsent) {
    errors.push({ field: "privacyConsent", message: t("rsvp.validation.privacyRequired") });
  }

  if (!form.birthDate) {
    errors.push({ field: "birthDate", message: t("rsvp.validation.birthDateRequired") });
  }

  return errors;
}
