import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIPT — AI Personal Trainer",
  description:
    "Design workouts, log sets live, and get AI coaching grounded in your training history.",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/templates", label: "Workouts" },
  { href: "/history", label: "History" },
  { href: "/stats", label: "Stats" },
  { href: "/profile", label: "Profile" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-400 text-sm font-bold text-zinc-950">
                A
              </span>
              <span>
                AIPT
                <span className="ml-2 hidden text-xs font-normal text-zinc-400 sm:inline">
                  AI Personal Trainer
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
