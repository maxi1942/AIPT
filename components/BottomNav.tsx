"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Coach",
    match: (p: string) => p === "/",
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    ),
  },
  {
    href: "/plan",
    label: "Plan",
    match: (p: string) =>
      p.startsWith("/plan") ||
      p.startsWith("/templates") ||
      p.startsWith("/profile"),
    icon: (
      <path d="M8 2v4M16 2v4M3.5 9h17M5 4h14a1.5 1.5 0 0 1 1.5 1.5v14A1.5 1.5 0 0 1 19 21H5a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 5 4Z" />
    ),
  },
  {
    href: "/activity",
    label: "Activity",
    match: (p: string) =>
      p.startsWith("/activity") ||
      p.startsWith("/history") ||
      p.startsWith("/workout"),
    icon: (
      <path d="M22 12h-3.5l-2.5 7-4-14-2.5 7H2" />
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    match: (p: string) => p.startsWith("/progress") || p.startsWith("/stats"),
    icon: <path d="M4 20v-6M10 20V8M16 20v-9M22 20v-4M2 20h20" />,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-zinc-200 bg-white/95 px-2 py-1.5 shadow-lg shadow-zinc-900/10 backdrop-blur">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 2.2 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
