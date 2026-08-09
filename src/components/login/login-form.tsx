"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  IconAdmin,
  IconArrowRight,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconStudent,
  IconTeacher,
  IconUser,
} from "@/components/icons";
import { ApiError } from "@/lib/api";
import {
  loginRequest,
  ROLE_LABEL,
  saveSession,
  type UserRole,
} from "@/lib/auth";

const roles = [
  { key: "student" as const, label: "学生", icon: IconStudent },
  { key: "teacher" as const, label: "教师", icon: IconTeacher },
  { key: "admin" as const, label: "管理", icon: IconAdmin },
];

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("student");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = account.trim();

    if (username.length < 2) {
      setError("请输入有效的学号 / 工号");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginRequest({
        username,
        password,
        clientType: "web",
      });

      if (result.user.role !== role) {
        setError(
          `该账号身份为「${ROLE_LABEL[result.user.role]}」，请切换到对应身份后登录`,
        );
        return;
      }

      saveSession(result, remember);
      router.replace(result.user.role === "admin" ? "/admin" : "/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "登录失败，请稍后重试";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div
        className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--fill)] p-1"
        role="tablist"
        aria-label="登录身份"
      >
        {roles.map((item) => {
          const active = role === item.key;
          const RoleIcon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={loading}
              onClick={() => {
                setRole(item.key);
                setError("");
              }}
              className={[
                "flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-[13px] transition disabled:opacity-60",
                active
                  ? "bg-white font-semibold text-[var(--accent)] shadow-[0_1px_2px_rgba(23,33,43,0.07)]"
                  : "text-[var(--ink-faint)] hover:text-[var(--ink-soft)]",
              ].join(" ")}
            >
              <RoleIcon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      <label className="mt-1 block space-y-2">
        <span className="text-[13px] font-medium text-[var(--ink-soft)]">账号</span>
        <div className="group flex h-11 items-center gap-2.5 rounded-xl border border-[var(--line)] bg-white px-3.5 transition focus-within:border-[var(--accent)] focus-within:ring-[3px] focus-within:ring-[var(--accent)]/12">
          <IconUser
            size={16}
            className="shrink-0 text-[var(--ink-faint)] transition group-focus-within:text-[var(--accent)]"
          />
          <input
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            placeholder="请输入学号 / 工号"
            autoComplete="username"
            disabled={loading}
          />
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-[13px] font-medium text-[var(--ink-soft)]">密码</span>
        <div className="group flex h-11 items-center gap-2.5 rounded-xl border border-[var(--line)] bg-white px-3.5 transition focus-within:border-[var(--accent)] focus-within:ring-[3px] focus-within:ring-[var(--accent)]/12">
          <IconLock
            size={16}
            className="shrink-0 text-[var(--ink-faint)] transition group-focus-within:text-[var(--accent)]"
          />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            placeholder="请输入密码"
            autoComplete="current-password"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--ink-faint)] transition hover:bg-black/4 hover:text-[var(--ink)]"
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            disabled={loading}
          >
            {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between pt-0.5 text-[13px]">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[var(--ink-soft)]">
          <span className="relative flex size-4 items-center justify-center">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={loading}
            />
            <span
              className={[
                "flex size-4 items-center justify-center rounded-[4px] border transition",
                remember
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-white",
              ].join(" ")}
            >
              {remember ? <IconCheck size={10} /> : null}
            </span>
          </span>
          记住我
        </label>
        <Link
          href="#"
          className="text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
        >
          忘记密码？
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] leading-5 text-red-600"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="group mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(20,112,105,0.65)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "登录中…" : "进入考试空间"}
        {!loading ? (
          <IconArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-0.5"
          />
        ) : null}
      </button>

      <p className="pt-1 text-center text-[13px] text-[var(--ink-faint)]">
        还没有账号？{" "}
        <Link
          href="#"
          className="font-medium text-[var(--ink)] transition hover:text-[var(--accent)]"
        >
          立即注册
        </Link>
      </p>
    </form>
  );
}
