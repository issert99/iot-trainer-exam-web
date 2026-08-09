import Link from "next/link";
import {
  IconLogs,
  IconOverview,
  IconQuestionBank,
  IconShieldScan,
  IconTrendUp,
  IconUsers,
} from "@/components/icons";

const metrics = [
  {
    label: "总用户数",
    value: "1,286",
    hint: "本月新增 12",
    tone: "up" as const,
    icon: IconUsers,
    tint: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "总考试数",
    value: "87",
    hint: "本周新增 3",
    tone: "up" as const,
    icon: IconOverview,
    tint: "bg-teal-50 text-teal-700",
  },
  {
    label: "题库总量",
    value: "1,456",
    hint: "本月新增 45",
    tone: "up" as const,
    icon: IconQuestionBank,
    tint: "bg-sky-50 text-sky-700",
  },
  {
    label: "今日在线",
    value: "342",
    hint: "峰值 512 · 14:30",
    tone: "info" as const,
    icon: IconUsers,
    tint: "bg-[var(--accent)]/8 text-[var(--accent)]",
  },
  {
    label: "待审核试卷",
    value: "2",
    hint: "超时 24h：1",
    tone: "warn" as const,
    icon: IconLogs,
    tint: "bg-amber-50 text-amber-700",
  },
  {
    label: "系统告警",
    value: "1",
    hint: "磁盘占用 82%",
    tone: "danger" as const,
    icon: IconShieldScan,
    tint: "bg-rose-50 text-rose-700",
  },
];

const healthItems = [
  { name: "API 服务", detail: "可用性 99.9%", value: 99.9, status: "ok" as const },
  { name: "数据库", detail: "延迟 12ms", value: 92, status: "ok" as const },
  { name: "判题沙箱", detail: "实例 4 / 8", value: 50, status: "ok" as const },
  { name: "文件存储", detail: "占用 82%", value: 82, status: "warn" as const },
  { name: "邮件服务", detail: "通道正常", value: 100, status: "ok" as const },
];

const activities = [
  {
    time: "10 分钟前",
    actor: "管理员",
    text: "导入了 45 名学生",
    tag: "用户",
  },
  {
    time: "1 小时前",
    actor: "王老师",
    text: "创建了期末考试",
    tag: "考试",
  },
  {
    time: "2 小时前",
    actor: "系统",
    text: "完成自动备份（1.2GB）",
    tag: "备份",
  },
  {
    time: "3 小时前",
    actor: "李老师",
    text: "完成试卷批改",
    tag: "阅卷",
  },
  {
    time: "5 小时前",
    actor: "管理员",
    text: "新增教师账号",
    tag: "用户",
  },
];

const chartPoints = [28, 36, 32, 48, 42, 55, 50, 68, 62, 74, 70, 82];

function toneClass(tone: "up" | "info" | "warn" | "danger") {
  if (tone === "up") return "text-emerald-600";
  if (tone === "info") return "text-[var(--accent)]";
  if (tone === "warn") return "text-amber-600";
  return "text-rose-600";
}

function buildSmoothPath(
  points: { x: number; y: number }[],
): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const cx = (current.x + next.x) / 2;
    d += ` C ${cx} ${current.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
}

function ExamTrendChart() {
  const width = 640;
  const height = 232;
  const padX = 8;
  const padY = 20;
  const max = Math.max(...chartPoints);
  const min = Math.min(...chartPoints);
  const coords = chartPoints.map((value, index) => {
    const x =
      padX + (index * (width - padX * 2)) / Math.max(chartPoints.length - 1, 1);
    const y =
      height -
      padY -
      ((value - min) / Math.max(max - min, 1)) * (height - padY * 2);
    return { x, y };
  });
  const line = buildSmoothPath(coords);
  const area = `${line} L ${width - padX} ${height - padY} L ${padX} ${height - padY} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[232px] w-full">
      <defs>
        <linearGradient id="examTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#147069" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#147069" stopOpacity="0.02" />
        </linearGradient>
        <filter id="examTrendGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#147069" floodOpacity="0.18" />
        </filter>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
        <line
          key={ratio}
          x1={padX}
          x2={width - padX}
          y1={padY + (height - padY * 2) * ratio}
          y2={padY + (height - padY * 2) * ratio}
          stroke="#e8eef0"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      ))}
      <path d={area} fill="url(#examTrendFill)" />
      <path
        d={line}
        fill="none"
        stroke="#147069"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#examTrendGlow)"
      />
      <circle cx={last.x} cy={last.y} r="6" fill="#147069" fillOpacity="0.18" />
      <circle
        cx={last.x}
        cy={last.y}
        r="4"
        fill="#147069"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}

export function OverviewPage() {
  return (
    <div className="admin-enter px-6 py-7 sm:px-8 lg:px-10 xl:px-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium tracking-[0.14em] text-[var(--accent)]">
            DASHBOARD
          </p>
          <h1 className="mt-1.5 font-display text-[1.85rem] font-bold tracking-tight text-[var(--ink)]">
            系统概览
          </h1>
          <p className="mt-2 text-[13.5px] text-[var(--ink-soft)]">
            平台运行状态与核心指标
            <span className="mx-2 text-[var(--ink-faint)]">·</span>
            数据更新于 10 秒前
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white/80 px-3.5 py-2 shadow-[0_8px_20px_-16px_rgba(18,42,48,0.35)] backdrop-blur">
          <span className="status-dot size-2 rounded-full bg-emerald-500" />
          <span className="text-[12.5px] font-medium text-[var(--ink)]">
            运行正常
          </span>
          <span className="text-[12px] text-[var(--ink-faint)]">实时监控中</span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((item, index) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className={`admin-card admin-card-d${index + 1} group rounded-2xl border border-[var(--line)] bg-white/90 p-4 shadow-[0_14px_36px_-28px_rgba(18,42,48,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(18,42,48,0.45)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12.5px] text-[var(--ink-faint)]">{item.label}</p>
                <span
                  className={[
                    "flex size-8 items-center justify-center rounded-lg",
                    item.tint,
                  ].join(" ")}
                >
                  <Icon size={15} />
                </span>
              </div>
              <p className="mt-3 font-display text-[1.85rem] leading-none font-bold tracking-tight text-[var(--ink)]">
                {item.value}
              </p>
              <p
                className={[
                  "mt-3 flex items-center gap-1 text-[12px]",
                  toneClass(item.tone),
                ].join(" ")}
              >
                {item.tone === "up" ? <IconTrendUp size={12} /> : null}
                {item.hint}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <article className="admin-card admin-card-d3 overflow-hidden rounded-2xl border border-[var(--line)] bg-white/95 shadow-[0_14px_36px_-28px_rgba(18,42,48,0.55)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--ink)]">
                近 30 天考试趋势
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--ink-faint)]">
                按日统计开考场次
              </p>
            </div>
            <div className="rounded-lg bg-[var(--fill)] px-2.5 py-1 text-[12px] text-[var(--ink-soft)]">
              场次 / 日
            </div>
          </div>
          <div className="px-4 pt-3 pb-2">
            <ExamTrendChart />
            <div className="mt-1 flex items-center justify-between px-1 text-[12px] text-[var(--ink-faint)]">
              <span>7 月</span>
              <span>8 月</span>
              <span className="font-medium text-[var(--accent)]">今天</span>
            </div>
          </div>
          <p className="border-t border-[var(--line)] bg-[var(--fill)]/60 px-5 py-3.5 text-[13px] leading-6 text-[var(--ink-soft)]">
            考试高峰期：期末周（6 月 / 12 月），当前处于正常水平。
          </p>
        </article>

        <article className="admin-card admin-card-d4 rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_14px_36px_-28px_rgba(18,42,48,0.55)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">
              系统健康状态
            </h2>
            <span className="text-[12px] text-[var(--ink-faint)]">5 项监测</span>
          </div>
          <ul className="space-y-3">
            {healthItems.map((item) => (
              <li key={item.name} className="rounded-xl bg-[var(--fill)]/80 px-3.5 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={[
                        "size-2 rounded-full",
                        item.status === "ok" ? "bg-emerald-500" : "bg-amber-500 status-dot",
                      ].join(" ")}
                    />
                    <span className="text-[13.5px] font-medium text-[var(--ink)]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[12px] text-[var(--ink-soft)]">
                    {item.detail}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className={[
                      "h-full rounded-full transition-all",
                      item.status === "ok" ? "bg-[var(--accent)]" : "bg-amber-500",
                    ].join(" ")}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-[linear-gradient(135deg,#fffbeb_0%,#fff7ed_100%)] px-3.5 py-3 text-[12.5px] leading-5 text-amber-800">
            磁盘使用率 82%，建议在 7 天内清理历史判题日志或扩容。
          </div>
        </article>
      </section>

      <section className="admin-card admin-card-d5 mt-4 rounded-2xl border border-[var(--line)] bg-white/95 shadow-[0_14px_36px_-28px_rgba(18,42,48,0.55)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">
              近期活动日志
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--ink-faint)]">
              最近平台关键与系统事件
            </p>
          </div>
          <Link
            href="/admin/logs"
            className="text-[13px] font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
          >
            查看全部日志 →
          </Link>
        </div>
        <ul className="divide-y divide-[var(--line)] px-2">
          {activities.map((item) => (
            <li
              key={item.time + item.text}
              className="flex items-start gap-3 px-3 py-3.5 transition hover:bg-[var(--fill)]/70"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--fill)] text-[12px] font-semibold text-[var(--accent)]">
                {item.actor.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] text-[var(--ink)]">
                  <span className="font-medium">{item.actor}</span>
                  <span className="text-[var(--ink-soft)]"> {item.text}</span>
                </p>
                <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--ink-faint)]">
                  <span>{item.time}</span>
                  <span className="text-[var(--line)]">|</span>
                  <span className="rounded-md bg-[var(--fill)] px-1.5 py-0.5 text-[11px] text-[var(--ink-soft)]">
                    {item.tag}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
