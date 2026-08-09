"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconBackup,
  IconLogs,
  IconLogout,
  IconOverview,
  IconRoles,
  IconSemester,
  IconSettings,
  IconUsers,
} from "@/components/icons";
import { clearSession, type PublicUser } from "@/lib/auth";

const navItems = [
  { href: "/admin", label: "系统概览", icon: IconOverview, exact: true },
  { href: "/admin/users", label: "用户与班级", icon: IconUsers },
  { href: "/admin/roles", label: "角色权限", icon: IconRoles },
  { href: "/admin/semesters", label: "学期管理", icon: IconSemester },
  { href: "/admin/logs", label: "操作日志", icon: IconLogs },
  { href: "/admin/settings", label: "系统设置", icon: IconSettings },
  { href: "/admin/backup", label: "数据备份", icon: IconBackup },
];

type AdminSidebarProps = {
  user: PublicUser;
};

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <aside className="relative flex h-dvh w-[260px] shrink-0 flex-col overflow-hidden text-white">
      <div className="absolute inset-0 bg-[linear-gradient(165deg,#0e2c29_0%,#13423d_42%,#0b2421_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_10%_0%,rgba(125,205,196,0.14),transparent_55%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(0,0,0,0.18),transparent)]" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="px-5 pt-7 pb-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-white font-display text-[18px] font-bold text-[var(--brand)] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.45)]">
              知
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[0.01em]">
                知测管理台
              </p>
              <p className="mt-0.5 text-[11px] tracking-[0.16em] text-white/35">
                ADMIN
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <p className="px-2 text-[11px] tracking-[0.14em] text-white/28">
            导航
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] transition",
                  active
                    ? "bg-white/12 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    : "text-white/52 hover:bg-white/[0.05] hover:text-white/90",
                ].join(" ")}
              >
                {active ? (
                  <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#7dcdc4]" />
                ) : null}
                <span
                  className={[
                    "flex size-8 items-center justify-center rounded-lg transition",
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "bg-white/4 text-white/55 group-hover:text-white/85",
                  ].join(" ")}
                >
                  <Icon size={16} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 p-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#2a6f68,#1a4f4a)] text-[13px] font-semibold text-[#c8f0ea] ring-1 ring-white/10">
                {(user.realName || user.username).slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {user.realName || "系统管理员"}
                </p>
                <p className="truncate text-[11px] text-white/38">
                  @{user.username}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex size-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-white"
                aria-label="退出登录"
                title="退出登录"
              >
                <IconLogout size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
