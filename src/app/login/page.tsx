import type { Metadata } from "next";
import { LoginBackground } from "@/components/login/login-background";
import { LoginForm } from "@/components/login/login-form";
import { LoginRedirect } from "@/components/login/login-redirect";

export const metadata: Metadata = {
  title: "登录 · 知测",
  description: "多专业智能在线考试平台登录",
};

export default function LoginPage() {
  return (
    <main className="min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(430px,0.9fr)]">
      <LoginRedirect />
      <section className="relative flex min-h-[46vh] flex-col justify-between overflow-hidden px-8 py-9 text-white sm:px-12 lg:min-h-0 lg:px-16 lg:py-12 xl:px-20">
        <LoginBackground />

        <header className="intro relative z-10 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-white font-display text-[18px] font-bold leading-none text-[var(--brand)] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]">
            知
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-[0.02em]">知测</p>
            <p className="mt-0.5 text-[10px] tracking-[0.18em] text-white/38">
              ZHICE EXAM
            </p>
          </div>
        </header>

        <div className="intro intro-d1 relative z-10 my-14 max-w-[460px] lg:my-0">
          <p className="mb-4 text-[13px] font-medium tracking-[0.12em] text-[#9edad3]">
            多专业智能考试平台
          </p>
          <h1 className="font-display text-[clamp(3.2rem,6.5vw,5rem)] leading-[1] font-bold tracking-[-0.03em]">
            知测
          </h1>
          <p className="mt-6 max-w-[300px] text-[15px] leading-7 text-white/66">
            面向多专业场景的在线考试平台，让每一次作答都有公平、稳定的回应。
          </p>

          <div className="intro intro-d2 mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/48">
            <span>组卷出题</span>
            <span className="text-white/20">·</span>
            <span>在线作答</span>
            <span className="text-white/20">·</span>
            <span>成绩核验</span>
          </div>
        </div>

        <footer className="intro intro-d3 relative z-10 hidden items-center gap-3 text-[13px] text-white/36 lg:flex">
          <span className="h-px w-8 bg-white/20" />
          物联网实训箱 · 考试子系统
        </footer>
      </section>

      <section className="relative flex items-center justify-center bg-[#f4f6f7] px-6 py-14 sm:px-10 lg:px-14">
        <div className="intro intro-d1 w-full max-w-[400px] rounded-[22px] border border-[#e8ecef] bg-white p-7 shadow-[0_16px_40px_-20px_rgba(18,42,48,0.22)] sm:p-8">
          <div className="mb-7">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-[var(--ink)]">
              欢迎回来
            </h2>
            <p className="mt-1.5 text-[14px] leading-6 text-[var(--ink-soft)]">
              使用学号 / 工号登录，进入考试空间
            </p>
          </div>

          <LoginForm />

          <p className="mt-7 border-t border-[var(--line)] pt-5 text-center text-[12px] leading-5 text-[var(--ink-faint)]">
            统一身份认证 · 信息仅用于考试核验
          </p>
        </div>
      </section>
    </main>
  );
}
