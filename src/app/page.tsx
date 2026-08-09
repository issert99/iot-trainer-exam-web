"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  ROLE_LABEL,
  type PublicUser,
} from "@/lib/auth";

export default function HomePage() {
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
    setUser(stored);
    setReady(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!ready || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f4f6f7] text-[14px] text-[var(--ink-soft)]">
        加载中…
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f4f6f7] px-6 py-16">
      <div className="mx-auto w-full max-w-[520px] rounded-[22px] border border-[#e8ecef] bg-white p-8 shadow-[0_16px_40px_-20px_rgba(18,42,48,0.18)]">
        <p className="text-[13px] font-medium tracking-[0.08em] text-[var(--accent)]">
          知测 · 已登录
        </p>
        <h1 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-[var(--ink)]">
          你好，{user.realName || user.username}
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[var(--ink-soft)]">
          当前身份：{ROLE_LABEL[user.role]}（{user.username}）
        </p>

        <dl className="mt-8 space-y-3 rounded-xl bg-[var(--fill)] px-4 py-4 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ink-faint)]">账号状态</dt>
            <dd className="font-medium text-[var(--ink)]">{user.status}</dd>
          </div>
          {user.department ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-faint)]">院系 / 部门</dt>
              <dd className="font-medium text-[var(--ink)]">{user.department}</dd>
            </div>
          ) : null}
          {user.title ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink-faint)]">职称</dt>
              <dd className="font-medium text-[var(--ink)]">{user.title}</dd>
            </div>
          ) : null}
        </dl>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 h-11 w-full rounded-xl border border-[var(--line)] text-[14px] font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          退出登录
        </button>
      </div>
    </main>
  );
}
