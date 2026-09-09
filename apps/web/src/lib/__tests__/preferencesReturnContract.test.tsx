import React from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ConvexProvider, ConvexReactClient, type Watch, type WatchQueryOptions } from "convex/react";
import { getFunctionName, type ArgsAndOptions, type FunctionReference, type FunctionReturnType } from "convex/server";
import { convexTest } from "convex-test";
import { api } from "@convex/_generated/api";
import schema from "@convex/schema";
import type { Id } from "@convex/_generated/dataModel";
import { getApi, useOptionalQuery } from "../convexApi";
import { SettingsModal } from "@/layouts/settings/SettingsModal";
import { MeHome } from "@/features/me/views/MeHome";
import { HomeLanding } from "@/features/home/views/HomeLanding";

// Only unrelated providers/panels are held. The actual controls, SDK hooks,
// QueriesObserver and optional-query adapter remain mounted.
vi.mock("@convex-dev/auth/react", () => ({ useAuthActions: () => ({ signOut: vi.fn() }) }));
vi.mock("@/layouts/settings/WebMcpSettingsPanel", () => ({ WebMcpSettingsPanel: () => null }));
vi.mock("@/features/admin/components/ApiUsageDisplay", () => ({ ApiUsageDisplay: () => null }));
vi.mock("@/features/agents/components/NotificationActivityPanel", () => ({ NotificationActivityPanel: () => null }));
vi.mock("@/features/chat/components/AgentResilienceConnector", () => ({ AgentResilienceConnector: () => null }));
vi.mock("@/layouts/settings/ThemeCustomizer", () => ({ ThemeCustomizer: () => null }));
vi.mock("@/features/product/lib/useProductBootstrap", () => ({ useProductBootstrap: () => undefined }));
vi.mock("@/features/product/lib/productIdentity", () => ({ getAnonymousProductSessionId: () => "preferences-fixture" }));

const modules = {
  "_generated/server.js": () => import("@convex/_generated/server"),
  "domains/product/me.ts": () => import("@convex/domains/product/me"),
  "domains/auth/userPreferences.ts": () => import("@convex/domains/auth/userPreferences"),
  "domains/operations/personaChangeTracking.ts": () => import("@convex/domains/operations/personaChangeTracking"),
};
const prefs = api.domains.auth.userPreferences;
const me = api.domains.product.me;
const clients: ConvexReactClient[] = [];
beforeEach(async () => {
  localStorage.clear(); await getApi();
  // Scope these DOM controls to the existing reduced-motion branch. The
  // normal-motion SheetContent slot failure is retained separately, not fixed here.
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ ...original(query), matches: query === "(prefers-reduced-motion: reduce)" }));
});
afterEach(async () => { cleanup(); await Promise.all(clients.splice(0).map((client) => client.close())); vi.restoreAllMocks(); });

async function owner() {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", { name: "Local preference viewer" }));
  return { t, userId, viewer: t.withIdentity({ subject: userId }) };
}

function control(viewer: Awaited<ReturnType<typeof owner>>["viewer"]) {
  const client = new ConvexReactClient("http://127.0.0.1:1", { unsavedChangesWarning: false });
  clients.push(client);
  const active = new Map<() => void, string>();
  const values = new Map<string, unknown>();
  const key = (ref: FunctionReference<"query">, args: unknown) => `${getFunctionName(ref)}:${JSON.stringify(args ?? {})}`;
  vi.spyOn(client, "watchQuery").mockImplementation(<Query extends FunctionReference<"query">>(ref: Query, ...rest: ArgsAndOptions<Query, WatchQueryOptions>): Watch<FunctionReturnType<Query>> => {
    const address = key(ref, rest[0]);
    return {
      onUpdate: (listener) => { active.set(listener, address); return () => { active.delete(listener); }; },
      localQueryResult: () => { const value = values.get(address); if (value instanceof Error) throw value; return value as FunctionReturnType<Query> | undefined; },
      journal: () => undefined,
    };
  });
  const publish = (ref: FunctionReference<"query">, args: unknown, result: unknown) => {
    const address = key(ref, args); values.set(address, result);
    for (const [listener, watching] of active) if (watching === address) listener();
  };
  const actions = vi.spyOn(client, "action").mockImplementation(async () => { throw new Error("Provider actions are outside this fixture"); });
  const mutations = vi.spyOn(client, "mutation").mockImplementation(async (ref, ...argsAndOptions) => {
    const [args] = argsAndOptions;
    if (getFunctionName(ref) !== getFunctionName(prefs.updateUserPreferences)) throw new Error("Unexpected mutation in preference controls");
    const result = await viewer.mutation(prefs.updateUserPreferences, args);
    publish(prefs.getUserPreferences, {}, await viewer.query(prefs.getUserPreferences, {}));
    return result as never;
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => <ConvexProvider client={client}>{children}</ConvexProvider>;
  return { client, active, publish, wrapper, actions, mutations };
}
function assertCalendar(gmail: boolean, gcal: boolean, mode: "auto" | "propose") {
  expect(screen.getByRole("checkbox", { name: "Gmail" })).toHaveAttribute("aria-checked", String(gmail));
  expect(screen.getByRole("checkbox", { name: "Google Calendar" })).toHaveAttribute("aria-checked", String(gcal));
  expect(screen.getByRole("button", { name: mode === "auto" ? "Auto-add" : "Propose first" }).className).toContain("bg-blue-600");
}
class QueryBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { return this.state.error ? <div role="alert">{this.state.error.message}</div> : this.props.children; }
}
function LocationReadback() {
  const location = useLocation();
  return <output data-testid="location-readback">{location.pathname + location.search}</output>;
}

describe("a person reopens calendar settings after saving", () => {
  it("shows saved false/false/auto in the actual controls and completes a native control save", async () => {
    const { viewer } = await owner();
    await viewer.mutation(prefs.updateUserPreferences, { gmailIngestEnabled: false, gcalSyncEnabled: false, calendarAutoAddMode: "auto" });
    const c = control(viewer);
    render(<SettingsModal isOpen onClose={() => {}} initialTab="connections" />, { wrapper: c.wrapper });
    assertCalendar(true, true, "propose"); // Existing loading defaults are intentional.
    const returned = await viewer.query(prefs.getUserPreferences, {});
    await act(async () => { c.publish(prefs.getUserPreferences, {}, returned); });
    console.info("PREFERENCE_UI_OBSERVATION", JSON.stringify({ returned, gmail: screen.getByRole("checkbox", { name: "Gmail" }).getAttribute("aria-checked"), gcal: screen.getByRole("checkbox", { name: "Google Calendar" }).getAttribute("aria-checked"), autoSelected: screen.getByRole("button", { name: "Auto-add" }).className.includes("bg-blue-600") }));
    assertCalendar(false, false, "auto");
    fireEvent.click(screen.getByRole("checkbox", { name: "Gmail" }));
    await waitFor(() => assertCalendar(true, false, "auto"));
    fireEvent.click(screen.getByRole("button", { name: "Propose first" }));
    await waitFor(() => assertCalendar(true, false, "propose"));
    expect(await viewer.query(prefs.getUserPreferences, {})).toMatchObject({ gmailIngestEnabled: true, gcalSyncEnabled: false, calendarAutoAddMode: "propose" });
    expect(c.mutations).toHaveBeenCalledTimes(2);
    expect(c.actions).not.toHaveBeenCalled();
  });

  it("retains existing empty defaults, accepts actual optional-row defaults, and surfaces a query failure", async () => {
    const { t, viewer, userId } = await owner(); const c = control(viewer);
    render(<QueryBoundary><SettingsModal isOpen onClose={() => {}} initialTab="connections" /></QueryBoundary>, { wrapper: c.wrapper });
    for (const result of [await t.query(prefs.getUserPreferences, {}), await viewer.query(prefs.getUserPreferences, {})]) {
      await act(async () => { c.publish(prefs.getUserPreferences, {}, result); }); assertCalendar(true, true, "propose");
    }
    await t.run((ctx) => ctx.db.insert("userPreferences", { userId, createdAt: 1, updatedAt: 1 }));
    await act(async () => { c.publish(prefs.getUserPreferences, {}, await viewer.query(prefs.getUserPreferences, {})); });
    assertCalendar(true, true, "propose");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => { c.publish(prefs.getUserPreferences, {}, new Error("Preference read unavailable")); });
    expect(screen.getByRole("alert")).toHaveTextContent("Preference read unavailable");
    expect(c.active.size).toBe(0); expect(c.actions).not.toHaveBeenCalled();
  });

  it("keeps two viewers isolated across twenty real saved updates and subscription/unmount cycles", async () => {
    const a = await owner(); const b = await owner(); const ca = control(a.viewer); const cb = control(b.viewer);
    for (let cycle = 0; cycle < 20; cycle++) {
      const enabled = cycle % 2 === 0;
      await Promise.all([a.viewer.mutation(prefs.updateUserPreferences, { gmailIngestEnabled: enabled, calendarAutoAddMode: enabled ? "auto" : "propose" }), b.viewer.mutation(prefs.updateUserPreferences, { gmailIngestEnabled: !enabled, calendarAutoAddMode: enabled ? "propose" : "auto" })]);
      const left = renderHook(() => useOptionalQuery(prefs.getUserPreferences), { wrapper: ca.wrapper });
      const right = renderHook(() => useOptionalQuery(prefs.getUserPreferences), { wrapper: cb.wrapper });
      await act(async () => { ca.publish(prefs.getUserPreferences, {}, await a.viewer.query(prefs.getUserPreferences, {})); cb.publish(prefs.getUserPreferences, {}, await b.viewer.query(prefs.getUserPreferences, {})); });
      expect(left.result.current).toMatchObject({ gmailIngestEnabled: enabled, calendarAutoAddMode: enabled ? "auto" : "propose" });
      expect(right.result.current).toMatchObject({ gmailIngestEnabled: !enabled, calendarAutoAddMode: enabled ? "propose" : "auto" });
      expect(ca.active.size).toBe(1); expect(cb.active.size).toBe(1);
      left.unmount(); right.unmount(); expect(ca.active.size).toBe(0); expect(cb.active.size).toBe(0);
    }
    expect(ca.actions).not.toHaveBeenCalled(); expect(cb.actions).not.toHaveBeenCalled();
  });
});

describe("an owner sees their stored research profile", () => {
  it("hydrates Me lens, roles and explicit false tone and retains migrated-profile defaults", async () => {
    const { viewer, t, userId } = await owner(); const c = control(viewer);
    await viewer.mutation(me.updateProfile, { preferredLens: "banker", rolesOfInterest: ["Analyst", "Operator"], preferences: { communicationStyle: "concise", evidenceStyle: "citation_heavy", avoidCorporateTone: false } });
    const args = { anonymousSessionId: "preferences-fixture" };
    c.publish(me.getMeSnapshot, args, await viewer.query(me.getMeSnapshot, args));
    const view = render(<MemoryRouter><MeHome /></MemoryRouter>, { wrapper: c.wrapper });
    await waitFor(() => expect(screen.getByDisplayValue("banker")).toHaveAttribute("id", "me-preferred-lens"));
    expect(screen.getByDisplayValue("Analyst, Operator")).toBeInTheDocument();
    expect(screen.getByDisplayValue("concise")).toBeInTheDocument();
    expect(screen.getByDisplayValue("citation_heavy")).toBeInTheDocument();
    expect(screen.getByLabelText(/avoid corporate/i)).not.toBeChecked();
    view.unmount();
    const profile = await t.run((ctx) => ctx.db.query("productProfileSummaries").withIndex("by_owner", (q) => q.eq("ownerKey", `user:${userId}`)).unique());
    await t.run((ctx) => ctx.db.patch(profile!._id, { preferences: { theme: "dark", legacy: "retained" } }));
    c.publish(me.getMeSnapshot, args, await viewer.query(me.getMeSnapshot, args));
    const migrated = render(<MemoryRouter><MeHome /></MemoryRouter>, { wrapper: c.wrapper });
    expect(within(screen.getByRole("radiogroup", { name: /communication style/i })).getByRole("radio", { name: "Balanced" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText(/avoid corporate/i)).not.toBeChecked(); migrated.unmount();
    c.publish(me.getMeSnapshot, args, await t.query(me.getMeSnapshot, {}));
    render(<MemoryRouter><MeHome /></MemoryRouter>, { wrapper: c.wrapper });
    expect(screen.getByDisplayValue("founder")).toBeInTheDocument();
    expect(c.actions).not.toHaveBeenCalled();
  });

  it("uses a saved Home lens while preserving an explicit URL query's chosen lens", async () => {
    const { viewer } = await owner(); const c = control(viewer);
    await viewer.mutation(me.updateProfile, { preferredLens: "legal" });
    c.publish(me.getMeSnapshot, { anonymousSessionId: "preferences-fixture" }, await viewer.query(me.getMeSnapshot, {}));
    const view = render(<MemoryRouter><HomeLanding /><LocationReadback /></MemoryRouter>, { wrapper: c.wrapper });
    await waitFor(() => expect(screen.getByText("legal")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Ask anything - a company, a market, a question..."), { target: { value: "fixture research" } });
    fireEvent.click(screen.getByRole("button", { name: "Open workspace" }));
    await waitFor(() => expect(screen.getByTestId("location-readback").textContent).toContain("lens=legal"));
    view.unmount();
    render(<MemoryRouter initialEntries={["/?q=fixture%20research&lens=student"]}><HomeLanding /><LocationReadback /></MemoryRouter>, { wrapper: c.wrapper });
    await waitFor(() => expect(screen.getByTestId("location-readback").textContent).toContain("lens=student"));
    expect(c.actions).not.toHaveBeenCalled();
  });
});

// Included by tsconfig.app.json; native Vitest alone is not compiler proof.
export function preferencesCompilerContracts(userId: Id<"users">) {
  const snapshot = useOptionalQuery(me.getMeSnapshot, {});
  type IsAny<T> = 0 extends (1 & T) ? true : false;
  const concrete: IsAny<NonNullable<NonNullable<typeof snapshot>["profile"]>> = false;
  if (snapshot?.profile) {
    const lens: "founder" | "investor" | "banker" | "ceo" | "legal" | "student" = snapshot.profile.preferredLens;
    const roles: string[] = snapshot.profile.rolesOfInterest;
    // @ts-expect-error no invented top-level profile field
    snapshot.profile.nonexistentPreference;
    // @ts-expect-error stored lens cannot be a new enum value
    const invalidLens: typeof lens = "invented";
    void [roles, invalidLens];
  }
  const result = useOptionalQuery(prefs.getUserPreferences);
  const enabled: boolean | undefined = result?.gmailIngestEnabled;
  const synced: boolean | undefined = result?.gcalSyncEnabled;
  const mode: "auto" | "propose" | undefined = result?.calendarAutoAddMode;
  // @ts-expect-error preferences cannot be queried for an arbitrary owner
  useOptionalQuery(prefs.getUserPreferences, { userId });
  // @ts-expect-error calendar flag is boolean
  const badFlag: NonNullable<typeof enabled> = "false";
  // @ts-expect-error unknown mode is not accepted
  const badMode: NonNullable<typeof mode> = "always";
  return [concrete, synced, badFlag, badMode];
}
