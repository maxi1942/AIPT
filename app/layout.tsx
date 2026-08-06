import type { Metadata } from "next";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIPT — AI Personal Trainer",
  description:
    "Design workouts, log sets live, and get AI coaching grounded in your training history.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex h-12 max-w-5xl items-center px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white">
                A
              </span>
              <span>
                AIPT
                <span className="ml-2 hidden text-xs font-normal text-zinc-500 sm:inline">
                  AI Personal Trainer
                </span>
              </span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
