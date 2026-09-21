"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Bell, Settings, Check, Store, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { setActiveShop, signOutAction } from "@/server/actions/shop";

type Shop = { id: string; name: string; status: string; isActive: boolean };
type User = { name: string | null; email: string };

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

export function Topbar({ shops, user }: { shops: Shop[]; user: User }) {
  const [shopOpen, setShopOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const active = shops.find((s) => s.isActive) ?? shops[0];

  const shopRef = useOutsideClose<HTMLDivElement>(() => setShopOpen(false));
  const profileRef = useOutsideClose<HTMLDivElement>(() => setProfileOpen(false));

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-bg/80 px-6 backdrop-blur">
      {/* Shop selector */}
      <div className="relative" ref={shopRef}>
        <button
          onClick={() => setShopOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-2"
        >
          <Store className="h-4 w-4 text-primary" />
          <span className="font-medium text-ink">{active?.name ?? "No shop"}</span>
          {active && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  active.status === "connected" ? "bg-success" : "bg-subtle",
                )}
              />
              {active.status === "connected" ? "Connected" : "Disconnected"}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>

        {shopOpen && (
          <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--cf-shadow)]">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
              Your shops
            </p>
            {shops.map((shop) => (
              <form action={setActiveShop} key={shop.id}>
                <input type="hidden" name="shopId" value={shop.id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        shop.status === "connected" ? "bg-success" : "bg-subtle",
                      )}
                    />
                    <span className="text-ink">{shop.name}</span>
                  </span>
                  {shop.isActive && <Check className="h-4 w-4 text-primary" />}
                </button>
              </form>
            ))}
            <Link
              href="/settings"
              onClick={() => setShopOpen(false)}
              className="mt-1 block rounded-lg px-2.5 py-2 text-sm font-medium text-primary hover:bg-surface-2"
            >
              + Connect a shop
            </Link>
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1.5">
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>

        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-surface-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initials}
            </span>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--cf-shadow)]">
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium text-ink">{user.name ?? "Seller"}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <div className="my-1 border-t border-line" />
              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="block rounded-lg px-2.5 py-2 text-sm text-ink hover:bg-surface-2"
              >
                Settings
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-surface-2"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
