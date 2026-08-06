"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Home",
    icon: (
      <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1H9.5v-6h5v6H17.5a1 1 0 0 0 1-1V9.5" />
    ),
  },
  {
    href: "/templates",
    label: "Workouts",
    icon: (
      <path d="M2 12h2m16 0h2M6 8v8M18 8v8M9 6.5v11M15 6.5v11M9 12h6" />
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: (
      <path d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />
    ),
  },
  {
    href: "/stats",
    label: "Stats",
    icon: <path d="M4 20V14M10 20V8M16 20v-9M22 20H2M22 20v-5" />,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.5 0-7 1.8-7 4v2h14v-2c0-2.2-3.5-4-7-4Z" />
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-5xl items-stretch justify-around">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                active
                  ? "text-emerald-600"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
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
