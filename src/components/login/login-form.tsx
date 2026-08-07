"use client";

import Link from "next/link";
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

type Role = "student" | "teacher" | "admin";

const roles: {
  key: Role;
  label: string;
  icon: typeof IconStudent;
}[] = [
  { key: "student", label: "学生", icon: IconStudent },
  { key: "teacher", label: "教师", icon: IconTeacher },
  { key: "admin", label: "管理员", icon: IconAdmin },
];

export function LoginForm() {
  const [role, setRole] = useState<Role>("student");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div
        className="grid grid-cols-3 rounded-xl bg-[#f0f4f9] p-1"
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
              onClick={() => setRole(item.key)}
              className={[
                "relative flex h-11 items-center justify-center gap-2 rounded-lg text-sm transition duration-200",
                active
                  ? "bg-surface text-accent shadow-[0_2px_8px_rgba(16,29,50,0.08)]"
                  : "text-mute hover:text-ink",
              ].join(" ")}
            >
              <span
                className={[
                  "flex size-7 items-center justify-center rounded-md transition",
                  active ? "bg-accent-soft" : "bg-transparent",
                ].join(" ")}
              >
                <RoleIcon size={17} />
              </span>
              <span className="font-medium">{item.label}</span>
              {active ? (
                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-orange" />
              ) : null}
            </button>
          );
        })}
      </div>

      <label className="block space-y-2.5">
        <span className="text-[13px] font-semibold text-ink-soft">账号</span>
        <div className="group flex items-center gap-3 rounded-xl border border-line bg-[#fbfcfe] px-3.5 transition focus-within:border-accent focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--focus)]">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent transition group-focus-within:bg-accent group-focus-within:text-white">
            <IconUser size={17} />
          </span>
          <input
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            className="h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-mute/65"
            placeholder="请输入学号 / 工号"
            autoComplete="username"
          />
        </div>
      </label>

      <label className="block space-y-2.5">
        <span className="text-[13px] font-semibold text-ink-soft">密码</span>
        <div className="group flex items-center gap-3 rounded-xl border border-line bg-[#fbfcfe] px-3.5 transition focus-within:border-accent focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--focus)]">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent transition group-focus-within:bg-accent group-focus-within:text-white">
            <IconLock size={17} />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-mute/65"
            placeholder="请输入密码"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="flex size-8 items-center justify-center rounded-lg text-mute transition hover:bg-accent-soft hover:text-accent"
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
          >
            {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-ink-soft">
          <span className="relative inline-flex size-5 items-center justify-center">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
            />
            <span
              className={[
                "flex size-[18px] items-center justify-center rounded-[4px] border transition",
                remember
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface",
              ].join(" ")}
            >
              {remember ? <IconCheck size={12} /> : null}
            </span>
          </span>
          记住我
        </label>
        <Link href="#" className="text-accent transition hover:opacity-80">
          忘记密码？
        </Link>
      </div>

      <button
        type="submit"
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold tracking-[0.08em] text-white shadow-[0_10px_22px_rgba(23,74,139,0.22)] transition hover:-translate-y-0.5 hover:bg-accent-deep hover:shadow-[0_14px_28px_rgba(23,74,139,0.26)]"
      >
        验证身份并登录
        <IconArrowRight
          size={16}
          className="transition-transform group-hover:translate-x-1"
        />
      </button>

      <p className="text-center text-sm text-mute">
        还没有账号？{" "}
        <Link href="#" className="font-medium text-accent hover:opacity-80">
          立即注册
        </Link>
      </p>
    </form>
  );
}
