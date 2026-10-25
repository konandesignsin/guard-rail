"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/app/components/logo";
import { ThemeToggle } from "@/app/components/theme-toggle";

interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: SidebarNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/scans",
    label: "Scans",
    icon: (
      <svg className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    icon: (
      <svg className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100svh] w-full items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
          Loading...
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeItem = navItems.find((item) => isActivePath(pathname, item.href));

  return (
    <div className="flex h-[100svh] w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] md:flex-row">
      {/* Desktop sidebar (collapsible) */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 md:flex ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-[var(--border)] ${
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {sidebarCollapsed ? <Logo variant="mark" size="sm" /> : <Logo variant="full" size="sm" />}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d={sidebarCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"}
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Dashboard">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[var(--surface-hover)] font-medium text-[var(--fg)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-[var(--border)] p-3 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          {sidebarCollapsed ? (
            <UserButton />
          ) : (
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[var(--fg)]">Account</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Top bar: compact on mobile, breadcrumbs on desktop */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 md:hidden">
              <Logo variant="mark" size="sm" href={null} />
            </span>
            <nav className="hidden items-center gap-2 text-sm md:flex" aria-label="Breadcrumb">
              <span className="text-[var(--muted)]">Dashboard</span>
              <span className="text-[var(--muted-subtle)]">/</span>
              <span className="font-medium text-[var(--fg)]">{activeItem?.label ?? "Overview"}</span>
            </nav>
            <span className="truncate text-sm font-medium text-[var(--fg)] md:hidden">
              {activeItem?.label ?? "Overview"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <ThemeToggle />
            <span className="md:hidden">
              <UserButton />
            </span>
          </div>
        </header>

        <main className="min-h-0 h-full flex-1 overflow-hidden">{children}</main>

        {/* Mobile bottom tab bar */}
        <nav
          aria-label="Dashboard"
          className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <ul className="flex items-stretch">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href} className="min-w-0 flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium leading-none transition-colors ${
                      active ? "text-[var(--fg)]" : "text-[var(--muted)]"
                    }`}
                  >
                    <span
                      className={`flex h-6 items-center justify-center ${
                        active ? "text-[var(--squiggle-red)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
