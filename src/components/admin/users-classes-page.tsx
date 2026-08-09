"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconUpload,
} from "@/components/icons";
import {
  MOCK_CLASSES,
  MOCK_USERS,
  USER_STATS,
  type AdminClassCard,
  type AdminUserRow,
} from "@/lib/admin-users-mock";
import { ROLE_LABEL, type UserRole, type UserStatus } from "@/lib/auth";

type TabKey = "users" | "classes";

const PAGE_SIZE = 8;

const STATUS_MAP: Record<
  UserStatus,
  { label: string; dot: string; text: string }
> = {
  active: {
    label: "正常",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  inactive: {
    label: "已禁用",
    dot: "bg-zinc-400",
    text: "text-zinc-500",
  },
  locked: {
    label: "已锁定",
    dot: "bg-rose-500",
    text: "text-rose-600",
  },
};

export function UsersClassesPage() {
  const [tab, setTab] = useState<TabKey>("users");
  const [toast, setToast] = useState("");
  const [classes, setClasses] = useState(MOCK_CLASSES);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function handleCreateClass() {
    const next = classes.length + 1;
    setClasses((prev) => [
      ...prev,
      {
        id: `c-new-${next}`,
        name: `新建班级 ${next}`,
        studentCount: 0,
        teacherName: "待指定",
      },
    ]);
    showToast("已创建班级（本地示意）");
    setTab("classes");
  }

  return (
    <div className="admin-enter min-h-full">
      {toast ? (
        <div className="fixed top-5 right-5 z-50 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-[13px] text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="border-b border-[var(--line)] bg-white/70 px-6 pt-7 backdrop-blur-sm sm:px-8 lg:px-10 xl:px-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[2rem] font-bold tracking-tight text-[var(--ink)]">
              用户与班级
            </h1>
            <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
              账号目录与教学组织
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "users" ? (
              <>
                <GhostButton onClick={() => showToast("批量导入功能即将接入")}>
                  <IconUpload size={15} />
                  导入学生
                </GhostButton>
                <PrimaryButton onClick={() => showToast("新建用户功能即将接入")}>
                  <IconPlus size={15} />
                  新建用户
                </PrimaryButton>
              </>
            ) : (
              <PrimaryButton onClick={handleCreateClass}>
                <IconPlus size={15} />
                新建班级
              </PrimaryButton>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-6">
          {(
            [
              { key: "users", label: "用户", count: USER_STATS.total },
              { key: "classes", label: "班级", count: classes.length },
            ] as const
          ).map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={[
                  "-mb-px border-b-2 pb-3 text-[14px] transition",
                  active
                    ? "border-[var(--accent)] font-semibold text-[var(--ink)]"
                    : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink-soft)]",
                ].join(" ")}
              >
                {item.label}
                <span
                  className={[
                    "ml-2 text-[12px]",
                    active ? "text-[var(--accent)]" : "text-[var(--ink-faint)]",
                  ].join(" ")}
                >
                  {item.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 lg:px-10 xl:px-12">
        {tab === "users" ? (
          <UsersPanel onToast={showToast} />
        ) : (
          <ClassesPanel
            classes={classes}
            onCreate={handleCreateClass}
            onToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

function UsersPanel({ onToast }: { onToast: (message: string) => void }) {
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [klass, setKlass] = useState("all");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const classOptions = useMemo(
    () => Array.from(new Set(MOCK_USERS.map((item) => item.org))),
    [],
  );

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return MOCK_USERS.filter((user) => {
      const hitKeyword =
        !q ||
        user.realName.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q);
      const hitRole = role === "all" || user.role === role;
      const hitClass = klass === "all" || user.org === klass;
      const hitStatus = status === "all" || user.status === status;
      return hitKeyword && hitRole && hitClass && hitStatus;
    });
  }, [keyword, role, klass, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));

  function toggleAllPage() {
    if (allPageSelected) {
      setSelected((prev) =>
        prev.filter((id) => !pageRows.some((row) => row.id === id)),
      );
      return;
    }
    setSelected((prev) => [
      ...new Set([...prev, ...pageRows.map((row) => row.id)]),
    ]);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white lg:grid-cols-4 lg:divide-y-0">
        {[
          ["总用户", USER_STATS.total],
          ["学生", USER_STATS.students],
          ["教师", USER_STATS.teachers],
          ["今日活跃", USER_STATS.activeToday],
        ].map(([label, value]) => (
          <div key={String(label)} className="px-5 py-4">
            <p className="text-[12px] text-[var(--ink-faint)]">{label}</p>
            <p className="mt-1.5 font-display text-[1.6rem] font-bold tracking-tight text-[var(--ink)]">
              {Number(value).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 lg:flex-row lg:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-[var(--fill)] px-3">
            <IconSearch size={15} className="text-[var(--ink-faint)]" />
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="搜索姓名、学号或工号"
              className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[var(--ink-faint)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <ChipSelect
              value={role}
              onChange={(value) => {
                setRole(value as "all" | UserRole);
                setPage(1);
              }}
              options={[
                ["all", "角色"],
                ["student", "学生"],
                ["teacher", "教师"],
                ["admin", "管理"],
              ]}
            />
            <ChipSelect
              value={klass}
              onChange={(value) => {
                setKlass(value);
                setPage(1);
              }}
              options={[
                ["all", "班级"],
                ...classOptions.map((name) => [name, name] as const),
              ]}
            />
            <ChipSelect
              value={status}
              onChange={(value) => {
                setStatus(value as "all" | UserStatus);
                setPage(1);
              }}
              options={[
                ["all", "状态"],
                ["active", "正常"],
                ["inactive", "已禁用"],
                ["locked", "已锁定"],
              ]}
            />
          </div>
        </div>

        <div className="hidden grid-cols-[40px_1.4fr_0.7fr_1fr_0.9fr_0.7fr_120px] gap-2 border-b border-[var(--line)] px-4 py-2.5 text-[11px] tracking-[0.04em] text-[var(--ink-faint)] uppercase md:grid">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={toggleAllPage}
              className="size-3.5 accent-[var(--accent)]"
              aria-label="全选当前页"
            />
          </label>
          <span>用户</span>
          <span>角色</span>
          <span>组织</span>
          <span>最近登录</span>
          <span>状态</span>
          <span className="text-right">操作</span>
        </div>

        <ul>
          {pageRows.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              checked={selected.includes(user.id)}
              onToggle={() =>
                setSelected((prev) =>
                  prev.includes(user.id)
                    ? prev.filter((id) => id !== user.id)
                    : [...prev, user.id],
                )
              }
              onAction={onToast}
            />
          ))}
          {pageRows.length === 0 ? (
            <li className="px-4 py-16 text-center text-[13.5px] text-[var(--ink-faint)]">
              没有符合条件的用户
            </li>
          ) : null}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3">
          <p className="text-[12.5px] text-[var(--ink-faint)]">
            {filtered.length} 条结果
            {selected.length > 0 ? ` · 已选 ${selected.length}` : ""}
          </p>
          <div className="flex items-center gap-1">
            <IconBtn
              disabled={currentPage <= 1}
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              label="上一页"
            >
              <IconChevronLeft size={14} />
            </IconBtn>
            <span className="min-w-16 text-center text-[12.5px] text-[var(--ink-soft)]">
              {currentPage} / {totalPages}
            </span>
            <IconBtn
              disabled={currentPage >= totalPages}
              onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
              label="下一页"
            >
              <IconChevronRight size={14} />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassesPanel({
  classes,
  onCreate,
  onToast,
}: {
  classes: AdminClassCard[];
  onCreate: () => void;
  onToast: (message: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {classes.map((item) => (
        <article
          key={item.id}
          className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:border-[var(--accent)]/35"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[1.35rem] font-bold tracking-tight text-[var(--ink)]">
                {item.name}
              </h3>
              <span className="rounded-md bg-[var(--fill)] px-2 py-1 text-[11px] font-medium text-[var(--ink-soft)]">
                {item.studentCount} 人
              </span>
            </div>
            <p className="mt-3 text-[13px] text-[var(--ink-soft)]">
              班主任 · {item.teacherName}
            </p>
          </div>
          <div className="mt-6 flex items-center gap-4 border-t border-[var(--line)] pt-4 text-[13px]">
            <button
              type="button"
              onClick={() => onToast(`查看 ${item.name}（示意）`)}
              className="font-medium text-[var(--accent)] hover:opacity-80"
            >
              查看
            </button>
            <button
              type="button"
              onClick={() => onToast(`编辑 ${item.name}（示意）`)}
              className="text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => onToast(`管理 ${item.name} 成员（示意）`)}
              className="text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              成员
            </button>
          </div>
        </article>
      ))}

      <button
        type="button"
        onClick={onCreate}
        className="flex min-h-[168px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--ink)]/15 bg-transparent text-[var(--ink-faint)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <IconPlus size={20} />
        <span className="mt-2 text-[13px] font-medium">新建班级</span>
      </button>
    </div>
  );
}

function UserRow({
  user,
  checked,
  onToggle,
  onAction,
}: {
  user: AdminUserRow;
  checked: boolean;
  onToggle: () => void;
  onAction: (message: string) => void;
}) {
  const status = STATUS_MAP[user.status];

  return (
    <li className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--fill)]/40">
      <div className="grid grid-cols-1 items-center gap-3 px-4 py-3.5 md:grid-cols-[40px_1.4fr_0.7fr_1fr_0.9fr_0.7fr_120px] md:gap-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="size-3.5 accent-[var(--accent)]"
            aria-label={`选择 ${user.realName}`}
          />
        </label>

        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[12px] font-semibold text-white">
            {user.realName.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-[var(--ink)]">
              {user.realName}
            </p>
            <p className="truncate font-mono text-[12px] text-[var(--ink-faint)]">
              {user.username}
            </p>
          </div>
        </div>

        <p className="text-[13px] text-[var(--ink-soft)] md:px-0">
          <span className="md:hidden text-[var(--ink-faint)]">角色 · </span>
          {ROLE_LABEL[user.role]}
        </p>
        <p className="text-[13px] text-[var(--ink-soft)]">
          <span className="md:hidden text-[var(--ink-faint)]">组织 · </span>
          {user.org}
        </p>
        <p className="text-[13px] text-[var(--ink-soft)]">
          <span className="md:hidden text-[var(--ink-faint)]">登录 · </span>
          {user.lastLogin}
        </p>
        <p className={`inline-flex items-center gap-1.5 text-[13px] ${status.text}`}>
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </p>

        <div className="flex items-center justify-start gap-3 text-[12.5px] md:justify-end">
          <button
            type="button"
            onClick={() => onAction(`编辑 ${user.realName}（示意）`)}
            className="font-medium text-[var(--accent)] hover:opacity-80"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() =>
              onAction(
                user.status === "active"
                  ? `已重置 ${user.realName} 的密码（示意）`
                  : `已启用 ${user.realName}（示意）`,
              )
            }
            className="text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            {user.status === "active" ? "重置" : "启用"}
          </button>
        </div>
      </div>
    </li>
  );
}

function ChipSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-lg border-0 bg-[var(--fill)] px-3 text-[13px] text-[var(--ink-soft)] outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-hover)]"
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3.5 text-[13px] font-medium text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
    >
      {children}
    </button>
  );
}

function IconBtn({
  children,
  disabled,
  onClick,
  label,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md text-[var(--ink-soft)] transition hover:bg-[var(--fill)] hover:text-[var(--ink)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
