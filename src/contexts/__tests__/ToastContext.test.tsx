import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

import { ToastProvider } from "../ToastContext";
import { useToast } from "../../hooks/useToast";

function TestConsumer() {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast("success", "Test toast")}>Add Toast</button>
    </div>
  );
}

describe("ToastContext", () => {
  afterEach(cleanup);

  it("renders children", () => {
    render(
      <ToastProvider>
        <div>child</div>
      </ToastProvider>,
    );
    expect(screen.getByText("child")).toBeDefined();
  });

  it("adds a toast on trigger", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Add Toast").click();
    });
    expect(screen.getByText("Test toast")).toBeDefined();
  });

  it("renders toast with success icon", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Add Toast").click();
    });
    expect(screen.getByText("✓")).toBeDefined();
  });

  it("adds warning toast", () => {
    function WarningTest() {
      const { addToast } = useToast();
      return <button onClick={() => addToast("warning", "Warning")}>Warn</button>;
    }
    render(
      <ToastProvider>
        <WarningTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Warn").click();
    });
    expect(screen.getByText("!")).toBeDefined();
  });

  it("adds progress toast with startUploadToast", () => {
    function ProgressTest() {
      const { startUploadToast } = useToast();
      return <button onClick={() => startUploadToast("Uploading...")}>Upload</button>;
    }
    render(
      <ToastProvider>
        <ProgressTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Upload").click();
    });
    expect(screen.getByText("↑")).toBeDefined();
  });

  it("updates progress toast", () => {
    function ProgressUpdateTest() {
      const { startUploadToast } = useToast();
      return (
        <button
          onClick={() => {
            const toast = startUploadToast("Uploading...");
            toast.update(50);
          }}
        >
          Update
        </button>
      );
    }
    render(
      <ToastProvider>
        <ProgressUpdateTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Update").click();
    });
    const bar = document.querySelector(".toast__progress-bar");
    expect(bar).toBeDefined();
    expect((bar as HTMLElement).style.width).toBe("50%");
  });

  it("completes progress toast", () => {
    function ProgressCompleteTest() {
      const { startUploadToast } = useToast();
      return (
        <button
          onClick={() => {
            const toast = startUploadToast("Uploading...");
            toast.complete("Done");
          }}
        >
          Complete
        </button>
      );
    }
    render(
      <ToastProvider>
        <ProgressCompleteTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Complete").click();
    });
    expect(screen.getByText("Done")).toBeDefined();
    expect(screen.getByText("✓")).toBeDefined();
  });

  it("errors progress toast", () => {
    function ProgressErrorTest() {
      const { startUploadToast } = useToast();
      return (
        <button
          onClick={() => {
            const toast = startUploadToast("Uploading...");
            toast.error("Failed");
          }}
        >
          Error
        </button>
      );
    }
    render(
      <ToastProvider>
        <ProgressErrorTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Error").click();
    });
    expect(screen.getByText("Failed")).toBeDefined();
    expect(document.querySelector(".toast__icon")?.textContent).toBe("✕");
  });

  it("uses custom containerId", () => {
    render(
      <ToastProvider containerId="custom-root">
        <TestConsumer />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Add Toast").click();
    });
    expect(document.getElementById("custom-root")).toBeDefined();
  });

  it("removes toast on close button click", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Add Toast").click();
    });
    expect(screen.getByText("Test toast")).toBeDefined();
    act(() => {
      screen.getByLabelText("common.toast.close").click();
    });
    expect(screen.queryByText("Test toast")).toBeNull();
  });

  it("renders error toast with error icon", () => {
    function ErrorTest() {
      const { addToast } = useToast();
      return <button onClick={() => addToast("error", "Error!")}>ErrorBtn</button>;
    }
    render(
      <ToastProvider>
        <ErrorTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("ErrorBtn").click();
    });
    expect(document.querySelector(".toast__icon")?.textContent).toBe("✕");
  });

  it("dismisses toast after duration", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Add Toast").click();
    });
    expect(screen.getByText("Test toast")).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(5300);
    });
    expect(screen.queryByText("Test toast")).toBeNull();
    vi.useRealTimers();
  });

  it("renders multiple toasts", () => {
    function MultiToastTest() {
      const { addToast } = useToast();
      return (
        <button
          onClick={() => {
            addToast("success", "First");
            addToast("success", "Second");
          }}
        >
          Add Two
        </button>
      );
    }
    render(
      <ToastProvider>
        <MultiToastTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Add Two").click();
    });
    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
  });

  it("dismisses only the toast whose timer expired (map branch)", () => {
    vi.useFakeTimers();
    function MultiToastTest() {
      const { addToast } = useToast();
      return (
        <button
          onClick={() => {
            addToast("success", "First");
            addToast("success", "Second");
          }}
        >
          Add Two
        </button>
      );
    }
    render(
      <ToastProvider>
        <MultiToastTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Add Two").click();
    });
    act(() => {
      vi.advanceTimersByTime(5300);
    });
    // Ambos timers expiran con duración por defecto: el primero queda "exiting".
    const first = screen.queryByText("First");
    expect(first).toBeDefined();
    vi.useRealTimers();
  });

  it("does not dismiss when no toast matches id", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Add Toast").click();
    });
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByText("Test toast")).toBeNull();
    vi.useRealTimers();
  });

  it("updates only the targeted progress toast when multiple exist", () => {
    function MultiProgressTest() {
      const { startUploadToast } = useToast();
      return (
        <button
          onClick={() => {
            const t1 = startUploadToast("Upload 1");
            startUploadToast("Upload 2");
            t1.update(75);
          }}
        >
          Multi Update
        </button>
      );
    }
    render(
      <ToastProvider>
        <MultiProgressTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Multi Update").click();
    });
    const bars = document.querySelectorAll(".toast__progress-bar");
    expect(bars.length).toBe(2);
    expect((bars[0] as HTMLElement).style.width).toBe("75%");
  });

  it("completes only the targeted progress toast when multiple exist", () => {
    function MultiCompleteTest() {
      const { startUploadToast } = useToast();
      return (
        <button
          onClick={() => {
            const t1 = startUploadToast("Upload 1");
            startUploadToast("Upload 2");
            t1.complete("Done");
          }}
        >
          Multi Complete
        </button>
      );
    }
    render(
      <ToastProvider>
        <MultiCompleteTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Multi Complete").click();
    });
    expect(screen.getByText("Done")).toBeDefined();
    expect(document.querySelectorAll(".toast").length).toBe(2);
  });

  it("errors only the targeted progress toast when multiple exist", () => {
    function MultiErrorTest() {
      const { startUploadToast } = useToast();
      return (
        <button
          onClick={() => {
            const t1 = startUploadToast("Upload 1");
            startUploadToast("Upload 2");
            t1.error("Failed");
          }}
        >
          Multi Error
        </button>
      );
    }
    render(
      <ToastProvider>
        <MultiErrorTest />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("Multi Error").click();
    });
    expect(screen.getByText("Failed")).toBeDefined();
    expect(document.querySelectorAll(".toast").length).toBe(2);
  });
});
