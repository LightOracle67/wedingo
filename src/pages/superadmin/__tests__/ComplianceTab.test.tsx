import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es" } }),
}));

import ComplianceTab from "../ComplianceTab";

describe("ComplianceTab", () => {
  it("renders title", () => {
    render(<ComplianceTab />);
    expect(screen.getByText("compliance.title")).toBeDefined();
  });

  it("renders updated text", () => {
    render(<ComplianceTab />);
    expect(screen.getByText("compliance.updated")).toBeDefined();
  });

  it("renders table headers", () => {
    render(<ComplianceTab />);
    expect(screen.getByText("compliance.tableActivity")).toBeDefined();
    expect(screen.getByText("compliance.tableData")).toBeDefined();
    expect(screen.getByText("compliance.tableLegalBasis")).toBeDefined();
    expect(screen.getByText("compliance.tablePurpose")).toBeDefined();
    expect(screen.getByText("compliance.tableRetention")).toBeDefined();
    expect(screen.getByText("compliance.tableRecipients")).toBeDefined();
  });

  it("renders all 5 compliance rows", () => {
    render(<ComplianceTab />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`compliance.row${i}Activity`)).toBeDefined();
      expect(screen.getByText(`compliance.row${i}Data`)).toBeDefined();
      expect(screen.getByText(`compliance.row${i}Basis`)).toBeDefined();
      expect(screen.getByText(`compliance.row${i}Purpose`)).toBeDefined();
      expect(screen.getByText(`compliance.row${i}Retention`)).toBeDefined();
      expect(screen.getByText(`compliance.row${i}Recipients`)).toBeDefined();
    }
  });

  it("renders international data section", () => {
    render(<ComplianceTab />);
    expect(screen.getByText("compliance.internationalTitle")).toBeDefined();
    expect(screen.getByText("compliance.internationalText")).toBeDefined();
    expect(screen.getByText("compliance.scc")).toBeDefined();
    expect(screen.getByText("compliance.dpf")).toBeDefined();
  });

  it("renders security measures section", () => {
    render(<ComplianceTab />);
    expect(screen.getByText("compliance.measuresTitle")).toBeDefined();
    expect(screen.getByText("compliance.measureEncryption")).toBeDefined();
    expect(screen.getByText("compliance.measureTls")).toBeDefined();
    expect(screen.getByText("compliance.measureFirestore")).toBeDefined();
    expect(screen.getByText("compliance.measureStorage")).toBeDefined();
    expect(screen.getByText("compliance.measureRetention")).toBeDefined();
    expect(screen.getByText("compliance.measureSuperadmin")).toBeDefined();
  });

  it("renders the legal templates section", () => {
    render(<ComplianceTab />);
    expect(screen.getByText("compliance.templatesTitle")).toBeDefined();
    // Al menos una plantilla de país con su contenido se muestra.
    expect(screen.getAllByText(/compliance\.template/).length).toBeGreaterThan(0);
  });
});
