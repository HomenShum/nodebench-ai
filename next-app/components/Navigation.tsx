"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  FileText,
  Bot,
  Calendar,
  Map,
  Table2,
  Settings,
  BarChart3,
  Menu,
  X,
  BookOpen,
  User,
  LogIn,
  Mail,
  Sparkles,
  Layers,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/research", label: "Research", icon: Search },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/spreadsheets", label: "Spreadsheets", icon: Table2 },
  { href: "/email", label: "Email", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/analytics/hitl", label: "HITL Analytics", icon: BarChart3 },
  { href: "/analytics/components", label: "Components", icon: Layers },
  { href: "/analytics/recommendations", label: "Recommendations", icon: Sparkles },
  { href: "/onboarding", label: "Get Started", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/login", label: "Sign In", icon: LogIn },
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-foreground/10 z-50 flex items-center justify-between px-4">
        <span className="font-semibold text-lg">NodeBench AI</span>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-foreground/5 rounded-md transition-colors"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <nav
        className={`lg:hidden fixed top-14 left-0 right-0 bg-background border-b border-foreground/10 z-50 transform transition-transform duration-200 ${
          isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <ul className="py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    active
                      ? "bg-foreground/10 text-foreground font-medium"
                      : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-background border-r border-foreground/10 flex-col z-40">
        <div className="h-14 flex items-center px-4 border-b border-foreground/10">
          <span className="font-semibold text-lg">NodeBench AI</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                      active
                        ? "bg-foreground/10 text-foreground font-medium"
                        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-14" />
    </>
  );
}
