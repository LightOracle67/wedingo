/** Datos de un acompañante en edición (docId opcional si ya existía). */
export interface EditingCompanion {
  /** Id del doc del acompañante si ya existía; si no, se crea al guardar. */
  docId?: string | undefined;
  name: string;
  menu: string;
  allergies: string[];
  other: string;
}

/** Estado del cuadro de edición/alta manual de un invitado del panel. */
export interface EditingState {
  id?: string;
  /** Ids de docs de acompañantes existentes (para borrar los que se quitan). */
  companionDocIds: string[];
  name: string;
  attendance: "yes" | "no";
  notes: string;
  mealChoice: string;
  allergySelection: string[];
  allergyOther: string;
  transportMode: string;
  transportChoice: string;
  companions: EditingCompanion[];
}
