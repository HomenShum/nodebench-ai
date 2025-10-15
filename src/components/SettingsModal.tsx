import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  X,
  Settings as SettingsIcon,
  Shield,
  BarChart2,
  Key,
  ArrowUpRight,
  CheckCircle,
  Eye,
  EyeOff,
  Trash2,
  User,
  Mail,
  Calendar,
  Link,
  Zap,
  MessageSquare,
  Github,
  Slack,
  Webhook,
} from "lucide-react";
import { ApiUsageDisplay } from "./ApiUsageDisplay";

type SettingsTab =
  | "profile"
  | "account"
  | "usage"
  | "integrations"
  | "billing"
  | "reminders"
  | "preferences";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
};

const PROVIDERS: string[] = [
  "openai",
  "gemini",
  // Development integrations
  "github_access_token",
  "github_webhook_secret",
];

export function SettingsModal({ isOpen, onClose, initialTab }: Props) {
  const [active, setActive] = useState<SettingsTab>(initialTab ?? "usage");

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, "save" | "delete" | null>>({});
  const [billingBusy, setBillingBusy] = useState(false);

  // Keep the active tab in sync with caller preference when opening
  useEffect(() => {
    if (isOpen) {
      setActive(initialTab ?? "usage");
    }
  }, [isOpen, initialTab]);

  const keyStatuses = useQuery(api.apiKeys.listApiKeyStatuses, {
    providers: PROVIDERS,
  });

  // Auth state to gate saving/deleting keys and show hints
  const user = useQuery(api.auth.loggedInUser);

  // Usage (daily + 14-day series) per provider
  const dailyOpenAI = useQuery(api.usage.getDailyUsagePublic, { provider: "openai" });
  const dailyGemini = useQuery(api.usage.getDailyUsagePublic, { provider: "gemini" });
  const seriesOpenAI = useQuery(api.usage.getUsageSeries, { provider: "openai", days: 14 });
  const seriesGemini = useQuery(api.usage.getUsageSeries, { provider: "gemini", days: 14 });

  // Billing
  const subscription = useQuery(api.billing.getSubscription);

  const saveEncryptedApiKey = useMutation(api.apiKeys.saveEncryptedApiKeyPublic);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);
  const createPolarCheckout = useAction(api.billing.createPolarCheckout);
  
  // Calendar UI prefs (timezone)
  const calendarPrefs = useQuery(api.userPreferences.getCalendarUiPrefs, {});
  const _saveTimeZone = useMutation(api.userPreferences.setTimeZonePreference);
  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone as string | undefined;
    } catch {
      return undefined;
    }
  }, []);
  const [_tzSearch, _setTzSearch] = useState("");
  const tzList: string[] = useMemo(() => {
    try {
      const anyIntl: any = Intl as any;
      if (typeof anyIntl.supportedValuesOf === "function") {
        const vals = anyIntl.supportedValuesOf("timeZone");
        if (Array.isArray(vals) && vals.length > 0) return vals as string[];
      }
    } catch (error) {
      // Fallback for browsers that don't support Intl.supportedValuesOf
      console.warn("Failed to get supported time zones from Intl API:", error);
    }
    return [
      "UTC",
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Kolkata",
      "Australia/Sydney",
    ];
  }, []);
  const _groupedTimeZones = useMemo(() => {
    const q = _tzSearch.trim().toLowerCase();
    const groups: Record<string, string[]> = {};
    for (const tz of tzList) {
      if (q && !tz.toLowerCase().includes(q)) continue;
      const region = tz.includes("/") ? tz.split("/")[0] : "Other";
      if (!groups[region]) groups[region] = [];
      groups[region].push(tz);
    }
    for (const k of Object.keys(groups)) groups[k].sort();
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tzList, _tzSearch]);
  const [selectedTz, setSelectedTz] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (selectedTz === undefined && calendarPrefs !== undefined) {
      setSelectedTz(calendarPrefs?.timeZone ?? browserTz ?? "UTC");
    }
  }, [calendarPrefs, browserTz, selectedTz]);
  
  // User preferences (for reminders)
  const userPreferences = useQuery(api.userPreferences.getUserPreferences);
  const updateUserPreferences = useMutation(api.userPreferences.updateUserPreferences);
  const updateUngroupedSectionName = useMutation(api.userPreferences.updateUngroupedSectionName);
  const updateUngroupedExpandedState = useMutation(api.userPreferences.updateUngroupedExpandedState);
  const setPlannerViewPrefs = useMutation(api.userPreferences.setPlannerViewPrefs);
  const setPlannerMode = useMutation(api.userPreferences.setPlannerMode);
  const upsertCalendarHubSizePct = useMutation(api.userPreferences.upsertCalendarHubSizePct);
  // OSS Stats integration
  const githubOwner = useQuery(api.ossStats.getGithubOwner, { owner: "get-convex" });
  const npmOrg = useQuery(api.ossStats.getNpmOrg, { name: "convex-dev" });
  const syncOssStats = useAction(api.ossStats.syncDefault);
  const syncOssStatsWithUserToken = useAction(api.ossStats.syncPreferUserToken);
  const ghEncryptedKey = useQuery(api.apiKeys.getEncryptedApiKeyPublic, { provider: "github_access_token" });
  const [syncingStats, setSyncingStats] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [savingSectionName, setSavingSectionName] = useState(false);
  const [savingPlannerPrefs, setSavingPlannerPrefs] = useState(false);
  const [savingCalendarSize, setSavingCalendarSize] = useState(false);
  const [showGithubConfig, setShowGithubConfig] = useState(false);
  
  // Account & Security
  const sessions = useQuery(api.account.listSessions);
  const linkedAccounts = useQuery(api.account.listLinkedAccounts);
  const signOutOtherSessions = useAction(api.account.signOutOtherSessions);
  const signOutSession = useMutation(api.account.signOutSession);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [signingOutSessionId, setSigningOutSessionId] = useState<string | null>(null);
  
  // Lazy-generate a client-only passphrase and keep it in localStorage
  const getPassphrase = (): string => {
    try {
      let p = localStorage.getItem("nodebench:e2e:passphrase");
      if (!p) {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        p = btoa(bin);
        localStorage.setItem("nodebench:e2e:passphrase", p);
      }
      return p;
    } catch (error) {
      // Fallback (less secure) if localStorage or crypto not available
      console.warn("Failed to generate secure passphrase, using fallback:", error);
      return "nodebench-default-passphrase";
    }
  };

  const handleUpgrade = async () => {
    if (user === null) {
      toast.error("Please sign in to upgrade");
      return;
    }
    if (subscription && subscription.status === "active") {
      toast.success("You already have Supporter access");
      return;
    }
    try {
      setBillingBusy(true);
      const origin = window.location.origin;
      // Polar requires {CHECKOUT_ID} token in the success URL
      const successUrl = `${origin}/?billing=success&checkout_id={CHECKOUT_ID}`;
      const { url } = await createPolarCheckout({ successUrl });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start checkout");
    } finally {
      setBillingBusy(false);
    }
  };
  
  // Dynamic import to avoid bundling issues during SSR/build tools
  const encryptClient = async (plaintext: string): Promise<string> => {
    const { encryptToString } = await import("../lib/e2eCrypto");
    const passphrase = getPassphrase();
    return await encryptToString(plaintext, passphrase);
  };
  const decryptClient = async (ciphertext: string): Promise<string> => {
    const { decryptFromString } = await import("../lib/e2eCrypto");
    const passphrase = getPassphrase();
    return await decryptFromString(ciphertext, passphrase);
  };

  const planLabel = subscription
    ? subscription.status === "active" ? "Supporter" : "Free"
    : "Loading…";

  const providerStatus = useMemo(() => {
    const map: Record<string, { hasKey: boolean; createdAt?: number }> = {};
    (keyStatuses ?? []).forEach((k) => (map[k.provider] = { hasKey: k.hasKey, createdAt: k.createdAt }));
    return map;
  }, [keyStatuses]);

  if (!isOpen) return null;

  const navItems: Array<{ id: SettingsTab; label: string }> = [
    { id: "profile", label: "Profile" },
    { id: "account", label: "Account & Security" },
    { id: "preferences", label: "Preferences" },
    { id: "usage", label: "Usage & API" },
    { id: "integrations", label: "Integrations" },
    { id: "billing", label: "Billing" },
    { id: "reminders", label: "Reminders" },
  ];

  const handleSaveKey = async (provider: string) => {
    const value = keyInputs[provider]?.trim();
    if (!value) {
      toast.error("Enter an API key first");
      return;
    }
    if (user === null) {
      toast.error("Please sign in to save API keys");
      return;
    }
    try {
      setBusy((p) => ({ ...p, [provider]: "save" }));
      const encrypted = await encryptClient(value);
      await saveEncryptedApiKey({ provider, encryptedApiKey: encrypted });
      toast.success(`${provider} key saved`);
      setKeyInputs((p) => ({ ...p, [provider]: "" }));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save key");
    } finally {
      setBusy((p) => ({ ...p, [provider]: null }));
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (user === null) {
      toast.error("Please sign in to remove API keys");
      return;
    }
    try {
      setBusy((p) => ({ ...p, [provider]: "delete" }));
      await deleteApiKey({ provider });
      toast.success(`${provider} key removed`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove key");
    } finally {
      setBusy((p) => ({ ...p, [provider]: null }));
    }
  };

  const UsageCard = ({
    title,
    daily,
    series,
  }: {
    title: string;
    daily: { count: number; limit: number; date: string } | undefined;
    series: Array<{ date: string; count: number; limit: number }> | undefined;
  }) => {
    const pct = Math.min(100, Math.round(((daily?.count ?? 0) / Math.max(1, daily?.limit ?? 1)) * 100));
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BarChart2 className="h-4 w-4" />
            <span>{title}</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">{daily ? daily.date : "Loading..."}</span>
        </div>
        <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded">
          <div className="h-2 rounded bg-[var(--accent-primary)]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-[var(--text-secondary)]">
          {daily ? (
            <>{daily.count} / {daily.limit} requests today</>
          ) : (
            <>Loading usage…</>
          )}
        </div>
        {series && series.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] text-[var(--text-secondary)] mb-1">Last 14 days</div>
            <div className="flex items-end gap-1 h-16">
              {series.map((d) => {
                const ratio = (d.count ?? 0) / Math.max(1, d.limit ?? 1);
                const h = Math.max(2, Math.min(60, Math.round(ratio * 60)));
                return (
                  <div key={d.date} className="w-2 bg-[var(--bg-tertiary)] rounded" title={`${d.date}: ${d.count}/${d.limit}`}>
                    <div className="w-2 bg-[var(--accent-primary)] rounded" style={{ height: h }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ApiKeyItem = ({ provider, label }: { provider: string; label: string }) => {
    const hasKey = providerStatus[provider]?.hasKey;
    const isShown = showKeys[provider] ?? false;
    const isBusy = Boolean(busy[provider]);
    const linkedAt = providerStatus[provider]?.createdAt;
    const inputEmpty = !(keyInputs[provider]?.trim());
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Key className="h-4 w-4" />
          <span className="text-sm font-semibold">{label} API Key</span>
          {hasKey && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
              <CheckCircle className="h-3 w-3" />
              Linked
            </span>
          )}
          {hasKey && linkedAt && (
            <span className="ml-1 text-[11px] text-[var(--text-secondary)]">on {new Date(linkedAt).toLocaleDateString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type={isShown ? "text" : "password"}
            className="flex-1 px-2 py-1 text-sm rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]"
            placeholder={`Enter ${label} API key`}
            value={keyInputs[provider] ?? ""}
            onChange={(e) => setKeyInputs((p) => ({ ...p, [provider]: e.target.value }))}
          />
          <button
            className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
            onClick={() => setShowKeys((p) => ({ ...p, [provider]: !isShown }))}
            title={isShown ? "Hide" : "Show"}
            disabled={isBusy}
          >
            {isShown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            className="px-2 py-1 text-xs rounded bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => { void handleSaveKey(provider); }}
            disabled={isBusy || user === null || inputEmpty}
          >
            {busy[provider] === "save" ? "Saving..." : "Save"}
          </button>
          {hasKey && (
            <button
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-red-600 disabled:opacity-50"
              onClick={() => { void handleDeleteKey(provider); }}
              title="Remove saved key"
              disabled={isBusy || user === null}
            >
              {busy[provider] === "delete" ? (
                <span>Removing...</span>
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
        <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Keys are stored encrypted client-side using a passphrase on this device (v2 format).
        </div>
        <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
          If you lose the passphrase, re-enter your key. Never share keys publicly.
        </div>
        {user === null && (
          <div className="mt-2 text-[11px] text-[var(--text-secondary)]">Sign in to save or remove API keys.</div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[900px] max-w-[95vw] max-h-[85vh] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SettingsIcon className="h-4 w-4" />
            Settings Hub
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex">
          {/* Left Nav */}
          <div className="w-56 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full text-left px-2 py-2 rounded text-sm mb-1 transition-colors ${
                  active === item.id
                    ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Content */}
          <div className="flex-1 p-4 overflow-auto">
            {active === "usage" ? (
              <div className="space-y-4">
                {/* Plan */}
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Current Plan</div>
                      <div className="text-xs text-[var(--text-secondary)]">{planLabel}</div>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--accent-primary)] text-white text-xs hover:opacity-90 disabled:opacity-50"
                      onClick={() => { void handleUpgrade(); }}
                      disabled={billingBusy || user === null || !subscription || subscription.status === "active"}
                      title={user === null ? "Sign in to upgrade" : undefined}
                    >
                      {subscription?.status === "active" ? (
                        <>Supporter active</>
                      ) : (
                        <>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          {billingBusy ? "Redirecting…" : "Upgrade for $1"}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Usage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <UsageCard title="OpenAI Daily Usage" daily={dailyOpenAI} series={seriesOpenAI ?? []} />
                  <UsageCard title="Gemini Daily Usage" daily={dailyGemini} series={seriesGemini ?? []} />
                </div>

                {/* API Keys */}
                <div className="space-y-3">
                  <div className="text-sm font-semibold">API Keys</div>
                  <ApiKeyItem provider="openai" label="OpenAI" />
                  <ApiKeyItem provider="gemini" label="Gemini" />
                </div>

                {/* API Usage Tracking */}
                <ApiUsageDisplay />
              </div>
            ) : active === "billing" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Supporter Plan</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Status: {subscription ? subscription.status : "Loading…"}
                      </div>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[var(--accent-primary)] text-white text-xs hover:opacity-90 disabled:opacity-50"
                      onClick={() => { void handleUpgrade(); }}
                      disabled={billingBusy || user === null || !subscription || subscription.status === "active"}
                      title={user === null ? "Sign in to upgrade" : undefined}
                    >
                      {subscription?.status === "active" ? (
                        <>Supporter active</>
                      ) : (
                        <>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          {billingBusy ? "Redirecting…" : "Upgrade for $1"}
                        </>
                      )}
                    </button>
                  </div>
                  <ul className="mt-3 text-xs text-[var(--text-secondary)] list-disc pl-5 space-y-1">
                    <li>Free tier: 5 requests/day total</li>
                    <li>Supporter: 50 requests/day total</li>
                    <li>One-time $1 purchase unlocks Supporter benefits</li>
                  </ul>
                  {user === null && (
                    <div className="mt-2 text-[11px]">Sign in to upgrade your account.</div>
                  )}
                </div>
              </div>
            ) : active === "reminders" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                  <div className="text-sm font-semibold mb-2">Reminder Banner</div>
                  <div className="text-xs text-[var(--text-secondary)] mb-3">
                    Control the banner that reminds you to link your AI API keys (OpenAI or Gemini). You can hide it permanently or keep it enabled until you link a key.
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">Enable AI key reminder banner</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">When enabled, a banner appears if no API keys are linked.</div>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!(userPreferences?.linkReminderOptOut ?? false)}
                        onChange={(e) => {
                          if (user === null) {
                            toast.error("Please sign in to change preferences");
                            return;
                          }
                          setSavingReminder(true);
                          const enabled = e.target.checked;
                          void updateUserPreferences({ linkReminderOptOut: !enabled })
                            .then(() => {
                              toast.success("Reminder preference updated");
                            })
                            .catch((err: any) => {
                              toast.error(err?.message ?? "Failed to update preferences");
                            })
                            .finally(() => {
                              setSavingReminder(false);
                            });
                        }}
                        disabled={savingReminder}
                      />
                      <div className="w-10 h-5 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--accent-primary)] transition-colors">
                        <div className="w-4 h-4 bg-white rounded-full shadow transform transition-transform translate-x-0 peer-checked:translate-x-5 m-0.5" />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : active === "preferences" ? (
              <div className="space-y-6">
                {/* Display & Organization */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Display & Organization</h3>
                  
                  {/* Ungrouped Section Name */}
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">Sidebar Section Name</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Current: "{userPreferences?.ungroupedSectionName ?? "Ungrouped Documents"}"
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-3">
                      Customize the name of the ungrouped documents section in the sidebar.
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 px-2 py-1 text-sm rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                        placeholder="Enter section name"
                        defaultValue={userPreferences?.ungroupedSectionName ?? "Ungrouped Documents"}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value && value !== userPreferences?.ungroupedSectionName) {
                              setSavingSectionName(true);
                              void updateUngroupedSectionName({ sectionName: value })
                                .then(() => toast.success("Section name updated"))
                                .catch((err: any) => toast.error(err?.message ?? "Failed to update section name"))
                                .finally(() => setSavingSectionName(false));
                            }
                          }
                        }}
                      />
                      <button
                        className="px-2 py-1 text-xs rounded bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const value = input.value.trim();
                          if (value && value !== userPreferences?.ungroupedSectionName) {
                            setSavingSectionName(true);
                            void updateUngroupedSectionName({ sectionName: value })
                              .then(() => toast.success("Section name updated"))
                              .catch((err: any) => toast.error(err?.message ?? "Failed to update section name"))
                              .finally(() => setSavingSectionName(false));
                          }
                        }}
                        disabled={savingSectionName || user === null}
                      >
                        {savingSectionName ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  {/* Ungrouped Section Expanded State */}
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">Expand Ungrouped Section by Default</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">Whether the ungrouped documents section should be expanded when you first open the app.</div>
                      </div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={userPreferences?.isUngroupedExpanded ?? true}
                          onChange={(e) => {
                            if (user === null) {
                              toast.error("Please sign in to change preferences");
                              return;
                            }
                            void updateUngroupedExpandedState({ isExpanded: e.target.checked })
                              .then(() => toast.success("Section expansion preference updated"))
                              .catch((err: any) => toast.error(err?.message ?? "Failed to update preference"));
                          }}
                          disabled={user === null}
                        />
                        <div className="w-10 h-5 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--accent-primary)] transition-colors">
                          <div className="w-4 h-4 bg-white rounded-full shadow transform transition-transform translate-x-0 peer-checked:translate-x-5 m-0.5" />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Calendar & Planner */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Calendar & Planner</h3>
                  
                  {/* Calendar Hub Size */}
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">Calendar Panel Size</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Current: {calendarPrefs?.calendarHubSizePct ?? 45}%
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-3">
                      Adjust the height of the calendar panel in the calendar view (20-80%).
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="20"
                        max="80"
                        step="5"
                        className="flex-1"
                        defaultValue={calendarPrefs?.calendarHubSizePct ?? 45}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setSavingCalendarSize(true);
                          void upsertCalendarHubSizePct({ pct: value })
                            .then(() => toast.success(`Calendar size set to ${value}%`))
                            .catch((err: any) => toast.error(err?.message ?? "Failed to update calendar size"))
                            .finally(() => setSavingCalendarSize(false));
                        }}
                        disabled={savingCalendarSize || user === null}
                      />
                      <span className="text-xs text-[var(--text-secondary)] w-8 text-center">
                        {savingCalendarSize ? "..." : `${calendarPrefs?.calendarHubSizePct ?? 45}%`}
                      </span>
                    </div>
                  </div>

                  {/* Planner Mode */}
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">Default Planner Mode</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Current: {calendarPrefs?.plannerMode === "calendar" ? "Calendar" : calendarPrefs?.plannerMode === "kanban" ? "Kanban" : "List"}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-3">
                      Choose your preferred view for the planner/calendar section.
                    </div>
                    <div className="flex gap-2">
                      {[
                        { value: "list" as const, label: "List" },
                        { value: "calendar" as const, label: "Calendar" },
                        { value: "kanban" as const, label: "Kanban" }
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          className={`px-3 py-1 text-xs rounded border ${
                            calendarPrefs?.plannerMode === value
                              ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]"
                              : "border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                          }`}
                          onClick={() => {
                            if (user === null) {
                              toast.error("Please sign in to change preferences");
                              return;
                            }
                            void setPlannerMode({ mode: value })
                              .then(() => toast.success(`Planner mode set to ${label}`))
                              .catch((err: any) => toast.error(err?.message ?? "Failed to update planner mode"));
                          }}
                          disabled={user === null}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Planner Density & Agenda Mode */}
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">Planner Density & Agenda View</div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-3">
                      Configure the density of the planner and how today's agenda is displayed.
                    </div>
                    <div className="space-y-3">
                      {/* Planner Density */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Density</span>
                        <div className="flex gap-2">
                          {[
                            { value: "comfortable" as const, label: "Comfortable" },
                            { value: "compact" as const, label: "Compact" }
                          ].map(({ value, label }) => (
                            <button
                              key={value}
                              className={`px-3 py-1 text-xs rounded border ${
                                calendarPrefs?.plannerDensity === value
                                  ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]"
                                  : "border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                              }`}
                              onClick={() => {
                                if (user === null) {
                                  toast.error("Please sign in to change preferences");
                                  return;
                                }
                                setSavingPlannerPrefs(true);
                                void setPlannerViewPrefs({ density: value })
                                  .then(() => toast.success(`Density set to ${label}`))
                                  .catch((err: any) => toast.error(err?.message ?? "Failed to update density"))
                                  .finally(() => setSavingPlannerPrefs(false));
                              }}
                              disabled={savingPlannerPrefs || user === null}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Show Week in Agenda */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm">Show Week in Today's Agenda</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">Display upcoming events for the current week in today's agenda.</div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={calendarPrefs?.showWeekInAgenda ?? true}
                            onChange={(e) => {
                              if (user === null) {
                                toast.error("Please sign in to change preferences");
                                return;
                              }
                              setSavingPlannerPrefs(true);
                              void setPlannerViewPrefs({ showWeekInAgenda: e.target.checked })
                                .then(() => toast.success(`Week display ${e.target.checked ? "enabled" : "disabled"}`))
                                .catch((err: any) => toast.error(err?.message ?? "Failed to update preference"))
                                .finally(() => setSavingPlannerPrefs(false));
                            }}
                            disabled={savingPlannerPrefs || user === null}
                          />
                          <div className="w-10 h-5 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--accent-primary)] transition-colors">
                            <div className="w-4 h-4 bg-white rounded-full shadow transform transition-transform translate-x-0 peer-checked:translate-x-5 m-0.5" />
                          </div>
                        </label>
                      </div>

                      {/* Agenda Mode */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Agenda View</span>
                        <div className="flex gap-2">
                          {[
                            { value: "list" as const, label: "List" },
                            { value: "kanban" as const, label: "Kanban" }
                          ].map(({ value, label }) => (
                            <button
                              key={value}
                              className={`px-3 py-1 text-xs rounded border ${
                                calendarPrefs?.agendaMode === value
                                  ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]"
                                  : "border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                              }`}
                              onClick={() => {
                                if (user === null) {
                                  toast.error("Please sign in to change preferences");
                                  return;
                                }
                                setSavingPlannerPrefs(true);
                                void setPlannerViewPrefs({ agendaMode: value })
                                  .then(() => toast.success(`Agenda view set to ${label}`))
                                  .catch((err: any) => toast.error(err?.message ?? "Failed to update agenda mode"))
                                  .finally(() => setSavingPlannerPrefs(false));
                              }}
                              disabled={savingPlannerPrefs || user === null}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {user === null && (
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Sign in to save your preferences. Changes will be applied to your account.
                    </div>
                  </div>
                )}
              </div>
            ) : active === "profile" ? (
              <div className="space-y-6">
                {/* User Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">User Information</h3>
                  
                  {/* User Name & Email */}
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[var(--accent-primary)] rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{user?.name || "Anonymous User"}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {user?.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          ) : (
                            "No email provided"
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {user?._creationTime && (
                      <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <Calendar className="h-3 w-3" />
                        Member since {new Date(user._creationTime).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Account Status */}
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="text-sm font-semibold mb-2">Account Status</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Authentication</span>
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          {user ? "Signed In" : "Not Signed In"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Plan</span>
                        <span className="flex items-center gap-1">
                          {subscription?.status === "active" ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Supporter
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)]">Free</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Time Zone</span>
                        <span className="font-mono text-xs">
                          {selectedTz ?? browserTz ?? "UTC"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Account Actions</h3>
                  
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="text-sm font-semibold mb-3">Data Management</div>
                    <div className="space-y-3">
                      <button
                        className="w-full text-left px-3 py-2 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-sm transition-colors"
                        onClick={() => {
                          toast.info("Data export feature coming soon");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4" />
                          Export Account Data
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          Download a copy of your data in JSON format
                        </div>
                      </button>
                      
                      <button
                        className="w-full text-left px-3 py-2 rounded border border-red-500/20 hover:bg-red-500/10 text-sm transition-colors"
                        onClick={() => {
                          toast.error("Account deletion must be requested through customer support");
                        }}
                      >
                        <div className="flex items-center gap-2 text-red-600">
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                          Permanently delete your account and all data
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {user === null && (
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Sign in to view and manage your profile information.
                    </div>
                  </div>
                )}
              </div>
            ) : active === "integrations" ? (
              <div className="space-y-6">
                {/* AI Services */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Services</h3>
                  
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="text-sm font-semibold mb-3">Connected AI Providers</div>
                    <div className="space-y-3">
                      {/* OpenAI Integration */}
                      <div className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <Zap className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">OpenAI</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              GPT-5, GPT-5 Mini, Embeddings
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            providerStatus["openai"]?.hasKey
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            <CheckCircle className="h-3 w-3" />
                            {providerStatus["openai"]?.hasKey ? "Connected" : "Not Connected"}
                          </span>
                          <button
                            className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                            onClick={() => setActive("usage")}
                          >
                            Configure
                          </button>
                        </div>
                      </div>

                      {/* Gemini Integration */}
                      <div className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Zap className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Google Gemini</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              Gemini 1.5, Gemini 2.0, Vision
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            providerStatus["gemini"]?.hasKey
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            <CheckCircle className="h-3 w-3" />
                            {providerStatus["gemini"]?.hasKey ? "Connected" : "Not Connected"}
                          </span>
                          <button
                            className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                            onClick={() => setActive("usage")}
                          >
                            Configure
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Communication Platforms */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Communication Platforms</h3>
                  
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="text-sm font-semibold mb-3">Connected Services</div>
                    <div className="space-y-3">
                      {/* Slack Integration */}
                      <div className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <Slack className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Slack</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              Messages, notifications, bot integration
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                            <Link className="h-3 w-3" />
                            Coming Soon
                          </span>
                        </div>
                      </div>

                      {/* Discord Integration */}
                      <div className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Discord</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              Channels, messages, webhooks
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                            <Link className="h-3 w-3" />
                            Coming Soon
                          </span>
                        </div>
                      </div>

                      {/* Email Integration */}
                      <div className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Email</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              Send notifications and automated responses
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Configured
                          </span>
                          <button
                            className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                            onClick={() => {
                              toast.info("Email configuration available in AI Chat settings");
                            }}
                          >
                            Configure
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Development & Productivity */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Development & Productivity</h3>
                  
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                    <div className="text-sm font-semibold mb-3">Connected Tools</div>
                    <div className="space-y-3">
                      {/* GitHub OSS Stats Integration */}
                      <div className="p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                              <Github className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold">GitHub OSS Stats</div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                {githubOwner ? (
                                  <>
                                    ⭐ {githubOwner.starCount?.toLocaleString() || 0} stars • 
                                    📦 {githubOwner.dependentCount?.toLocaleString() || 0} dependents
                                  </>
                                ) : (
                                  "Real-time GitHub statistics"
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                              githubOwner ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              <CheckCircle className="h-3 w-3" />
                              {githubOwner ? "Active" : "Loading..."}
                            </span>
                            <button
                              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                              onClick={() => {
                                if (user === null) {
                                  toast.error("Please sign in to sync stats");
                                  return;
                                }
                                setSyncingStats(true);
                                const run = async () => {
                                  try {
                                    const enc = ghEncryptedKey?.encryptedApiKey;
                                    if (enc) {
                                      const token = await decryptClient(enc);
                                      await syncOssStatsWithUserToken({ token });
                                    } else {
                                      await syncOssStats();
                                    }
                                    toast.success("OSS stats synced successfully");
                                  } catch (error: any) {
                                    toast.error(error?.message ?? "Failed to sync stats");
                                  } finally {
                                    setSyncingStats(false);
                                  }
                                };
                                void run();
                              }}
                              disabled={syncingStats || user === null}
                            >
                              {syncingStats ? "Syncing..." : "Sync"}
                            </button>
                            <button
                              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                              onClick={() => setShowGithubConfig((v) => !v)}
                              disabled={user === null}
                              title={user === null ? "Sign in to configure" : undefined}
                            >
                              {showGithubConfig ? "Hide" : "Configure"}
                            </button>
                          </div>
                        </div>
                        {showGithubConfig && (
                          <div className="mt-3 space-y-3">
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              Provide credentials for higher rate limits or private orgs. Values are stored client-side encrypted and saved to your account.
                            </div>
                            <ApiKeyItem provider="github_access_token" label="GitHub Access Token" />
                            <ApiKeyItem provider="github_webhook_secret" label="GitHub Webhook Secret" />
                          </div>
                        )}
                      </div>

                      {/* NPM OSS Stats Integration */}
                      <div className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <Zap className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">NPM Download Stats</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              {npmOrg ? (
                                <>
                                  📥 {(npmOrg.downloadCount || 0).toLocaleString()} downloads
                                </>
                              ) : (
                                "Package download statistics"
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            npmOrg ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            <CheckCircle className="h-3 w-3" />
                            {npmOrg ? "Active" : "Loading..."}
                          </span>
                          <button
                            className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                            onClick={() => {
                              toast.info("NPM stats sync with GitHub sync");
                            }}
                          >
                            View
                          </button>
                        </div>
                      </div>

                      {/* Webhook Integration */}
                      <div className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                            <Webhook className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Webhooks</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              Custom integrations and automation
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                            <Link className="h-3 w-3" />
                            Coming Soon
                          </span>
                        </div>
                      </div>

                      {/* MCP Integration */}
                      <div className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                            <Zap className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">MCP Server</div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              Model Context Protocol for tool integration
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                          <button
                            className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                            onClick={() => {
                              toast.info("MCP configuration available in advanced settings");
                            }}
                          >
                            Configure
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integration Status Summary */}
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                  <div className="text-sm font-semibold mb-3">Integration Status</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">2</div>
                      <div className="text-xs text-[var(--text-secondary)]">Active</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">5</div>
                      <div className="text-xs text-[var(--text-secondary)]">Coming Soon</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">1</div>
                      <div className="text-xs text-[var(--text-secondary)]">Configured</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">0</div>
                      <div className="text-xs text-[var(--text-secondary)]">Disconnected</div>
                    </div>
                  </div>
                </div>
              </div>

            ) : active === "account" ? (
              <div className="space-y-4">
                {/* Active Sessions */}
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Active Sessions
                    </div>
                    <button
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-xs disabled:opacity-50"
                      onClick={() => {
                        if (user === null) {
                          toast.error("Please sign in");
                          return;
                        }
                        setSigningOutOthers(true);
                        void signOutOtherSessions({})
                          .then(() => toast.success("Other sessions signed out"))
                          .catch((e: any) => toast.error(e?.message ?? "Failed to sign out sessions"))
                          .finally(() => setSigningOutOthers(false));
                      }}
                      disabled={user === null || signingOutOthers || !((sessions ?? []).some((s) => !s.isCurrent))}
                      title={user === null ? "Sign in" : undefined}
                    >
                      {signingOutOthers ? "Signing out…" : "Sign out other sessions"}
                    </button>
                  </div>
                  {sessions === undefined ? (
                    <div className="text-xs text-[var(--text-secondary)]">Loading sessions…</div>
                  ) : (sessions.length === 0 ? (
                    <div className="text-xs text-[var(--text-secondary)]">No sessions found.</div>
                  ) : (
                    <div className="space-y-2">
                      {sessions
                        .slice()
                        .sort((a, b) => b._creationTime - a._creationTime)
                        .map((s) => {
                          const created = new Date(s._creationTime).toLocaleString();
                          const expires = new Date(s.expirationTime).toLocaleString();
                          return (
                            <div key={s._id} className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                              <div className="text-xs">
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5" />
                                  <span className="font-medium">{s.isCurrent ? "This device" : "Session"}</span>
                                  {s.isCurrent && (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700">Current</span>
                                  )}
                                </div>
                                <div className="mt-1 text-[11px] text-[var(--text-secondary)]">Started: {created}</div>
                                <div className="text-[11px] text-[var(--text-secondary)]">Expires: {expires}</div>
                              </div>
                              {!s.isCurrent && (
                                <button
                                  className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-red-600 disabled:opacity-50"
                                  onClick={() => {
                                    if (user === null) {
                                      toast.error("Please sign in");
                                      return;
                                    }
                                    setSigningOutSessionId(s._id);
                                    void signOutSession({ sessionId: s._id })
                                      .then(() => toast.success("Session signed out"))
                                      .catch((e: any) => toast.error(e?.message ?? "Failed to sign out session"))
                                      .finally(() => setSigningOutSessionId(null));
                                  }}
                                  disabled={user === null || signingOutSessionId === s._id}
                                >
                                  {signingOutSessionId === s._id ? "Signing out…" : "Sign out"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>

                {/* Linked Accounts */}
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Linked Accounts
                  </div>
                  {linkedAccounts === undefined ? (
                    <div className="text-xs text-[var(--text-secondary)]">Loading accounts…</div>
                  ) : (linkedAccounts.length === 0 ? (
                    <div className="text-xs text-[var(--text-secondary)]">No linked accounts.</div>
                  ) : (
                    <div className="space-y-2">
                      {linkedAccounts.map((a) => (
                        <div key={a._id} className="flex items-center justify-between p-3 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                          <div className="text-xs">
                            <div className="font-medium">{a.provider}</div>
                            <div className="text-[11px] text-[var(--text-secondary)]">ID: {a.providerAccountId}</div>
                          </div>
                          {/* Future: unlink button */}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 text-sm text-[var(--text-secondary)]">
                This section will be available soon.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
