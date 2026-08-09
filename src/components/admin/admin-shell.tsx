"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAccessToken, getStoredUser, type PublicUser } from "@/lib/auth";

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();
    if (!token || !stored) {
      router.replace("/login");
      return;
    }
    if (stored.role !== "admin") {
      router.replace("/");
      return;
    }
    setUser(stored);
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [ready]);

  if (!ready || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--admin-bg)] text-[14px] text-[var(--ink-soft)]">
        加载中…
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--admin-bg)]">
      <AdminSidebar user={user} />
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="admin-mesh pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(20,112,105,0.07),transparent)]" />
        <div className="admin-scroll relative h-full overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
