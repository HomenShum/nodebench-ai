'use client';

import { usePreloadedQuery } from "convex/react";
import { Preloaded } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import {
  User,
  Bell,
  Palette,
  Shield,
  Mail,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Key,
  Lock,
  Eye,
  EyeOff,
  Save,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface SettingsClientProps {
  preloadedUser: Preloaded<typeof api.domains.auth.auth.loggedInUser>;
}

export function SettingsClient({ preloadedUser }: SettingsClientProps) {
  const user = usePreloadedQuery(preloadedUser);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account preferences and security
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        {/* Profile Section */}
        <ProfileSection user={user} />

        {/* Notifications Section */}
        <NotificationsSection />

        {/* Appearance Section */}
        <AppearanceSection />

        {/* Security Section */}
        <SecuritySection user={user} />
      </div>
    </div>
  );
}

// ============================================================================
// Profile Section
// ============================================================================

function ProfileSection({ user }: { user: any }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  return (
    <SettingsSection
      icon={User}
      title="Profile"
      description="Your personal information and account details"
    >
      <div className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            {user?.image ? (
              <img
                src={user.image}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-emerald-600" />
            )}
          </div>
          <div>
            <button className="px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
              Change Avatar
            </button>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG or GIF. Max 2MB.
            </p>
          </div>
        </div>

        {/* Name Input */}
        <InputField
          label="Display Name"
          value={name}
          onChange={setName}
          placeholder="Enter your name"
          icon={User}
        />

        {/* Email Input */}
        <InputField
          label="Email Address"
          value={email}
          onChange={setEmail}
          placeholder="Enter your email"
          type="email"
          icon={Mail}
        />

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Timezone
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none">
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Central European Time (CET)</option>
              <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90" />
          </div>
        </div>

        <SaveButton />
      </div>
    </SettingsSection>
  );
}

// ============================================================================
// Notifications Section
// ============================================================================

function NotificationsSection() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [researchAlerts, setResearchAlerts] = useState(true);
  const [mentionNotifications, setMentionNotifications] = useState(true);

  return (
    <SettingsSection
      icon={Bell}
      title="Notifications"
      description="Control how and when you receive notifications"
    >
      <div className="space-y-4">
        <ToggleRow
          icon={Mail}
          label="Email Notifications"
          description="Receive important updates via email"
          checked={emailNotifications}
          onChange={setEmailNotifications}
        />

        <ToggleRow
          icon={Smartphone}
          label="Push Notifications"
          description="Get real-time notifications on your device"
          checked={pushNotifications}
          onChange={setPushNotifications}
        />

        <ToggleRow
          icon={Bell}
          label="Weekly Digest"
          description="Summary of your activity and insights"
          checked={weeklyDigest}
          onChange={setWeeklyDigest}
        />

        <ToggleRow
          icon={Bell}
          label="Research Alerts"
          description="Notifications for new research and signals"
          checked={researchAlerts}
          onChange={setResearchAlerts}
        />

        <ToggleRow
          icon={Bell}
          label="Mention Notifications"
          description="Get notified when someone mentions you"
          checked={mentionNotifications}
          onChange={setMentionNotifications}
        />

        <SaveButton />
      </div>
    </SettingsSection>
  );
}

// ============================================================================
// Appearance Section
// ============================================================================

function AppearanceSection() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [compactMode, setCompactMode] = useState(false);
  const [showAvatars, setShowAvatars] = useState(true);

  return (
    <SettingsSection
      icon={Palette}
      title="Appearance"
      description="Customize the look and feel of the application"
    >
      <div className="space-y-6">
        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            <ThemeButton
              icon={Sun}
              label="Light"
              active={theme === "light"}
              onClick={() => setTheme("light")}
            />
            <ThemeButton
              icon={Moon}
              label="Dark"
              active={theme === "dark"}
              onClick={() => setTheme("dark")}
            />
            <ThemeButton
              icon={Palette}
              label="System"
              active={theme === "system"}
              onClick={() => setTheme("system")}
            />
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-4">
          <ToggleRow
            icon={Palette}
            label="Compact Mode"
            description="Use a more condensed layout"
            checked={compactMode}
            onChange={setCompactMode}
          />

          <ToggleRow
            icon={User}
            label="Show Avatars"
            description="Display user avatars in lists and comments"
            checked={showAvatars}
            onChange={setShowAvatars}
          />
        </div>

        <SaveButton />
      </div>
    </SettingsSection>
  );
}

// ============================================================================
// Security Section
// ============================================================================

function SecuritySection({ user }: { user: any }) {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");

  return (
    <SettingsSection
      icon={Shield}
      title="Security"
      description="Manage your password and security settings"
    >
      <div className="space-y-6">
        {/* Password Change */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Change Password
          </label>
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Current password"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <ToggleRow
          icon={Shield}
          label="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
          checked={twoFactorEnabled}
          onChange={setTwoFactorEnabled}
        />

        {/* Session Timeout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Timeout
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="never">Never</option>
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Automatically log out after inactivity
          </p>
        </div>

        {/* Active Sessions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Active Sessions
            </label>
            <button className="text-sm text-red-600 hover:text-red-700 font-medium">
              Sign out all devices
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <SessionItem
              device="Chrome on Windows"
              location="New York, US"
              current
            />
            <SessionItem
              device="Safari on iPhone"
              location="New York, US"
            />
          </div>
        </div>

        <SaveButton />
      </div>
    </SettingsSection>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Icon className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: any;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: any;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        checked ? "bg-emerald-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ThemeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
        active
          ? "border-emerald-600 bg-emerald-50"
          : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      <Icon
        className={`w-6 h-6 ${active ? "text-emerald-600" : "text-gray-500"}`}
      />
      <span
        className={`text-sm font-medium ${active ? "text-emerald-600" : "text-gray-700"}`}
      >
        {label}
      </span>
    </button>
  );
}

function SessionItem({
  device,
  location,
  current = false,
}: {
  device: string;
  location: string;
  current?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <Smartphone className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {device}
            {current && (
              <span className="ml-2 text-xs text-emerald-600 font-normal">
                (Current)
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">{location}</p>
        </div>
      </div>
      {!current && (
        <button className="text-sm text-red-600 hover:text-red-700">
          Sign out
        </button>
      )}
    </div>
  );
}

function SaveButton() {
  return (
    <div className="flex justify-end pt-4 border-t border-gray-100">
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
        <Save className="w-4 h-4" />
        Save Changes
      </button>
    </div>
  );
}
