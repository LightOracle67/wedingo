import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockGetDocs = vi.fn<() => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown>; ref?: { id?: string } }> }>>();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn(() => Promise.resolve());
const mockUpdateDoc = vi.fn(() => Promise.resolve());
const mockDoc = vi.fn(() => "doc-ref");
const mockWriteBatch = vi.fn(() => ({ set: vi.fn(), delete: vi.fn(), update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) }));
const mockQuery = vi.fn(() => "query-ref");
const mockCollection = vi.fn(() => "collection-ref");
const mockHashSetupToken = vi.fn((t: string) => Promise.resolve(`hash-${t}`));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("firebase/firestore", () => ({
  getDocs: () => mockGetDocs(),
  getDoc: (_args: unknown[]) => mockGetDoc(),
  doc: (_args: unknown[]) => mockDoc(),
  setDoc: (_args: unknown[]) => mockSetDoc(),
  updateDoc: (_args: unknown[]) => mockUpdateDoc(),
  writeBatch: (_args: unknown[]) => mockWriteBatch(),
  collection: (_args: unknown[]) => mockCollection(),
  query: (_args: unknown[]) => mockQuery(),
  where: vi.fn(() => "where-ref"),
}));

vi.mock("../../../lib/firebase", () => ({ db: "db-mock", INVITATIONS_COLLECTION_REF: "inv-ref" }));
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock("../../../lib/setup-token", () => ({
  hashSetupToken: (...args: Parameters<typeof mockHashSetupToken>) => mockHashSetupToken(...args),
}));
vi.mock("../../../lib/token-utils", () => ({
  generateInviteToken: () => "AbCdEf1234",
  generateSetupToken: () => "NEW-TOKEN-ABC-1234",
}));
const mockValidate = vi.hoisted(() =>
  vi.fn(() => ({ sanitized: { firstName: "A", secondName: "B" }, hiddenSet: new Set(), errorKey: "" })),
);
vi.mock("../../../lib/config-validation", () => ({
  validateConfigForSave: () => mockValidate(),
}));

import ManageTab from "../ManageTab";

const baseInvitation = {
  id: "AbCdEf1234",
  data: () => ({
    firstName: "John",
    secondName: "Jane",
    verified: "false",
    adminNotes: "",
    manualExpiry: "",
    // Sesión activa futura: habilita el botón de kill-session.
    activeSession: { seconds: Math.floor(Date.now() / 1000) + 3600 },
    sessionExpiresAt: { seconds: Math.floor(Date.now() / 1000) + 3600 },
  }),
};

describe("ManageTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockResolvedValue({ docs: [baseInvitation] });
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => baseInvitation.data() });
  });

  it("renders the invitation selector after loading", async () => {
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByText("John Jane (AbCdEf1234)")).toBeInTheDocument());
  });

  it("loads the invitation and shows the global editor", async () => {
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    await vi.waitFor(() => expect(screen.getByLabelText("manage.globalEditor")).toBeInTheDocument());
  });

  it("saves the config from the JSON editor", async () => {
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    const editor = await screen.findByLabelText("manage.globalEditor");
    fireEvent.change(editor, { target: { value: '{"firstName":"A","secondName":"B"}' } });
    fireEvent.click(screen.getByText("manage.saveConfig"));
    await vi.waitFor(() => expect(mockSetDoc).toHaveBeenCalled());
  });

  it("transfers ownership generating a new token", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    const button = await screen.findByText("manage.transferButton");
    fireEvent.click(button);
    // La transferencia escribe el nuevo setupTokens/{hash} con el nuevo token.
    await vi.waitFor(() => expect(mockSetDoc).toHaveBeenCalled());
    expect(mockHashSetupToken).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("transfer keeps the NEW token record (no borra el recién creado)", async () => {
    // El token nuevo se crea con hash "hash-NEW-TOKEN-ABC-1234"; la consulta de
    // revocación devuelve ESE registro + un antiguo: solo debe borrarse el antiguo.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockGetDocs.mockResolvedValue({
      docs: [
        baseInvitation,
        { id: "hash-NEW-TOKEN-ABC-1234", data: () => ({}), ref: { id: "hash-NEW-TOKEN-ABC-1234" } },
        { id: "hash-oldtoken", data: () => ({}), ref: { id: "hash-oldtoken" } },
      ],
    });
    const deletes: string[] = [];
    const mockBatch = {
      set: vi.fn(),
      delete: vi.fn((ref: { id?: string }) => void deletes.push(ref?.id ?? String(ref))),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockWriteBatch.mockReturnValue(mockBatch);
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    const button = await screen.findByText("manage.transferButton");
    fireEvent.click(button);
    await vi.waitFor(() => expect(mockBatch.commit).toHaveBeenCalled());
    // Solo se revoca el token antiguo; el NUEVO se conserva.
    expect(deletes).toContain("hash-oldtoken");
    expect(deletes).not.toContain("hash-NEW-TOKEN-ABC-1234");
    confirmSpy.mockRestore();
  });

  it("validates a config JSON (validador de reglas en cliente)", async () => {
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    const editor = await screen.findByLabelText("manage.validatorTitle");
    fireEvent.change(editor, { target: { value: '{"firstName":"A","secondName":"B"}' } });
    fireEvent.click(screen.getByText("manage.validatorButton"));
    await vi.waitFor(() => expect(screen.getByText(/manage.validatorOk/)).toBeInTheDocument());
  });

  it("flags an invalid config JSON in the validator", async () => {
    // validateConfigForSave se mockea para que falle en este caso concreto.
    mockValidate.mockReturnValueOnce({ sanitized: { firstName: "", secondName: "" }, hiddenSet: new Set(), errorKey: "errors.firstNameRequired" });
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    const editor = await screen.findByLabelText("manage.validatorTitle");
    fireEvent.change(editor, { target: { value: '{}' } });
    fireEvent.click(screen.getByText("manage.validatorButton"));
    await vi.waitFor(() => expect(screen.getByText("errors.firstNameRequired")).toBeInTheDocument());
  });

  it("compares two invitations and lists differences", async () => {
    mockGetDocs.mockResolvedValue({ docs: [baseInvitation] });
    mockGetDoc.mockImplementation((_ref: unknown) =>
      Promise.resolve(
        _ref === "cmpA"
          ? { exists: () => true, data: () => ({ firstName: "A", theme: "golden" }) }
          : { exists: () => true, data: () => ({ firstName: "B", theme: "golden" }) },
      ),
    );
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    await vi.waitFor(() => expect(screen.getByLabelText("manage.compareA")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.compareA"), { target: { value: "cmpA" } });
    fireEvent.change(screen.getByLabelText("manage.compareB"), { target: { value: "cmpB" } });
    fireEvent.click(screen.getByText("manage.compareButton"));
    await vi.waitFor(() => expect(screen.getByText(/firstName/)).toBeInTheDocument());
  });

  it("clona una invitación (nuevo token) tras confirmar", async () => {
    window.confirm = vi.fn(() => true);
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    await vi.waitFor(() => expect(screen.getByText("manage.cloneButton")).toBeInTheDocument());
    fireEvent.click(screen.getByText("manage.cloneButton"));
    // Clona la invitación y crea el setup token: 2 setDoc.
    await vi.waitFor(() => expect(mockSetDoc).toHaveBeenCalledTimes(2));
  });

  it("no clona si el administrador cancela la confirmación", async () => {
    window.confirm = vi.fn(() => false);
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    await vi.waitFor(() => expect(screen.getByText("manage.cloneButton")).toBeInTheDocument());
    fireEvent.click(screen.getByText("manage.cloneButton"));
    await new Promise((r) => setTimeout(r, 30));
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("guarda las flags de verificación, etiquetas y aforo", async () => {
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    await vi.waitFor(() => expect(screen.getByText("manage.saveFlags")).toBeInTheDocument());
    fireEvent.click(screen.getByText("manage.saveFlags"));
    await vi.waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
  });

  it("guarda la expiración manual", async () => {
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    await vi.waitFor(() => expect(screen.getByText("manage.saveExpiry")).toBeInTheDocument());
    fireEvent.click(screen.getByText("manage.saveExpiry"));
    await vi.waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
  });

  it("cierra la sesión activa de la invitación (kill session)", async () => {
    window.confirm = vi.fn(() => true);
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    await vi.waitFor(() => expect(screen.getByText("manage.killSession")).toBeInTheDocument());
    fireEvent.click(screen.getByText("manage.killSession"));
    await vi.waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
  });

  it("pausa la invitación añadiéndola a los tokens bloqueados", async () => {
    render(<ManageTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("manage.selectInvitation")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("manage.selectInvitation"), { target: { value: "AbCdEf1234" } });
    await vi.waitFor(() => expect(screen.getByText("manage.pause")).toBeInTheDocument());
    fireEvent.click(screen.getByText("manage.pause"));
    await vi.waitFor(() => expect(mockSetDoc).toHaveBeenCalled());
  });
});
