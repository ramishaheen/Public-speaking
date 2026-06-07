"use client";

import React from "react";
import Link from "next/link";

// App shell with brand + nav, used by dashboard/practice/admin pages.
export function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: "dashboard" | "practice" | "admin" | "neuroscience" | "skills";
}) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="group">
          <div className="terminal-text text-[11px] uppercase tracking-widest text-neon/70">
            C:\ETIHAD\SPEAKING_ROOM\
          </div>
          <div className="text-lg font-extrabold text-white">
            Etihad Speaking Room <span className="text-neon">AI Trainer</span>
          </div>
        </Link>
        <nav className="flex flex-wrap gap-2 terminal-text text-xs">
          <NavLink href="/dashboard" label="DASHBOARD" active={active === "dashboard"} />
          <NavLink href="/practice" label="PRACTICE_ROOM" active={active === "practice"} />
          <NavLink href="/neuroscience" label="NEUROSCIENCE" active={active === "neuroscience"} />
          <NavLink href="/skills" label="SKILLS_REPORT" active={active === "skills"} />
          <NavLink href="/admin" label="ADMIN" active={active === "admin"} />
          <NavLink href="/" label="RESTART" active={false} />
        </nav>
      </header>
      {children}
    </div>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg border px-3 py-1.5 transition-colors ${
        active
          ? "border-neon bg-neon/10 text-neon"
          : "border-steel bg-black/30 text-mist hover:border-neon/40 hover:text-neon"
      }`}
    >
      [{label}]
    </Link>
  );
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-white sm:text-2xl">{children}</h2>
      {sub && <p className="mt-1 text-sm text-mist">{sub}</p>}
    </div>
  );
}
