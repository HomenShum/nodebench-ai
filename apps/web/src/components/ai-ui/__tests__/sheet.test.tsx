import React, { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sheet, SheetContent, SheetPortal, SheetTitle, SheetTrigger } from "../sheet";
import { DialogOverlay } from "@/shared/components/DialogOverlay";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setMotion(reduced: boolean) {
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation(query => ({ ...original(query), matches: query === "(prefers-reduced-motion: reduce)" && reduced }));
}

describe("a caller composes a sheet without losing its dialog controls", () => {
  it("forwards content props/ref into the child and keeps the default Close inside it", async () => {
    const user = userEvent.setup(); const ref = React.createRef<HTMLDivElement>();
    render(<Sheet><SheetTrigger>Open composed sheet</SheetTrigger><SheetPortal>
      <SheetContent asChild ref={ref} aria-label="Composed sheet" data-owner="caller" className="caller-content">
        <section><SheetTitle>Composed sheet</SheetTitle><label>Draft title<input /></label></section>
      </SheetContent>
    </SheetPortal></Sheet>);
    const trigger = screen.getByRole("button", { name: "Open composed sheet" }); await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Composed sheet" });
    expect(dialog.tagName).toBe("SECTION"); expect(ref.current).toBe(dialog);
    expect(dialog).toHaveAttribute("data-owner", "caller"); expect(dialog).toHaveClass("caller-content");
    expect(dialog).toContainElement(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("retains the automatic title and default Close for an ordinary sheet", async () => {
    const user = userEvent.setup();
    render(<Sheet><SheetTrigger>Open ordinary sheet</SheetTrigger><SheetPortal>
      <SheetContent aria-label="Ordinary sheet"><label>Note<input /></label></SheetContent>
    </SheetPortal></Sheet>);
    await user.click(screen.getByRole("button", { name: "Open ordinary sheet" }));
    expect(screen.getByRole("heading", { name: "Ordinary sheet" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe.each([false, true])("a person uses the real dialog with reduced motion=%s", reduced => {
  it.each(["Escape", "Close", "backdrop"] as const)("returns to the opener after %s conditionally unmounts the overlay", async method => {
    setMotion(reduced); const user = userEvent.setup(); const closed = vi.fn();
    function ConditionalCaller() {
      const [open, setOpen] = useState(false);
      const close = () => { closed(); setOpen(false); };
      return <><button onClick={() => setOpen(true)}>Open conditional dialog</button>
        {open && <DialogOverlay isOpen onClose={close} ariaLabel="Conditional dialog"><button onClick={close}>Close conditional dialog</button></DialogOverlay>}</>;
    }
    render(<ConditionalCaller />);
    const opener = screen.getByRole("button", { name: "Open conditional dialog" }); await user.click(opener);
    expect(screen.getByRole("button", { name: "Close conditional dialog" })).toHaveFocus();
    if (method === "Escape") await user.keyboard("{Escape}");
    else if (method === "Close") await user.click(screen.getByRole("button", { name: "Close conditional dialog" }));
    else { await new Promise(resolve => setTimeout(resolve, 0)); fireEvent.pointerDown(document.body, { pointerType: "mouse", button: 0 }); }
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(closed).toHaveBeenCalledTimes(1);
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
  });

  it("does not focus a removed opener when the caller changes while the dialog is open", async () => {
    setMotion(reduced); const user = userEvent.setup();
    function RemovedCaller() {
      const [open, setOpen] = useState(false); const [showOpener, setShowOpener] = useState(true);
      return <>{showOpener && <button onClick={() => setOpen(true)}>Open removable dialog</button>}
        {open && <DialogOverlay isOpen onClose={() => setOpen(false)} ariaLabel="Removed opener">
          <button onClick={() => setShowOpener(false)}>Remove opener</button><button onClick={() => setOpen(false)}>Close removed dialog</button>
        </DialogOverlay>}</>;
    }
    render(<RemovedCaller />); const opener = screen.getByRole("button", { name: "Open removable dialog" }); await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Remove opener" })); expect(opener.isConnected).toBe(false);
    await user.click(screen.getByRole("button", { name: "Close removed dialog" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).not.toHaveFocus(); expect(document.activeElement?.isConnected).toBe(true);
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
  });

  it.each([false, true])("respects closeOnEscape=%s without substituting the Radix boundary", async allowed => {
    setMotion(reduced); const onClose = vi.fn();
    render(<DialogOverlay isOpen onClose={onClose} ariaLabel="Escape contract" closeOnEscape={allowed}><button>Inside</button></DialogOverlay>);
    expect(screen.getByRole("dialog", { name: "Escape contract" })).toContainElement(document.activeElement as HTMLElement);
    fireEvent.keyDown(document.activeElement ?? document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it.each([false, true])("respects closeOnBackdrop=%s through an actual outside pointer event", async allowed => {
    setMotion(reduced); const onClose = vi.fn();
    render(<DialogOverlay isOpen onClose={onClose} ariaLabel="Backdrop contract" closeOnBackdrop={allowed}><button>Inside</button></DialogOverlay>);
    // Radix defers attaching its outside-pointer listener until the opening event completes.
    await waitFor(() => expect(document.body.style.pointerEvents).toBe("none"));
    await new Promise(resolve => setTimeout(resolve, 0));
    fireEvent.pointerDown(document.body, { pointerType: "mouse", button: 0 });
    expect(onClose).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it("honors autofocus opt-out and releases portals and scroll locks across twenty reopen cycles", async () => {
    setMotion(reduced); const user = userEvent.setup();
    function Reopen() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Open loop</button>
        <DialogOverlay isOpen={open} onClose={() => setOpen(false)} ariaLabel="Loop contract" autoFocus={false}>
          <button onClick={() => setOpen(false)}>Close loop</button>
        </DialogOverlay></>;
    }
    const view = render(<Reopen />);
    for (let cycle = 0; cycle < 20; cycle++) {
      await user.click(screen.getByRole("button", { name: "Open loop" }));
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Close loop" })).not.toHaveFocus();
      expect(document.body).toHaveAttribute("data-scroll-locked");
      await user.click(screen.getByRole("button", { name: "Close loop" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(document.body).not.toHaveAttribute("data-scroll-locked");
    }
    view.unmount(); expect(document.body.style.pointerEvents).not.toBe("none");
  });
});
