import type { Metadata } from "next";
import { IconBrandMark } from "@/components/icons";
import { AmbientMotion } from "@/components/login/ambient-motion";
import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = {
  title: "登录 · 知测",
  description: "多专业智能在线考试平台登录",
};

const features = [
  { index: "01", title: "九大题型", caption: "全场景覆盖" },
  { index: "02", title: "编程判题", caption: "毫秒级反馈" },
  { index: "03", title: "智能监考", caption: "全过程守护" },
];

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0b2f5d] text-white lg:h-dvh">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#09274e_0%,#123f76_48%,#174a82_100%)]" />
      <AmbientMotion />

      <div className="relative flex min-h-dvh flex-col lg:h-full lg:flex-row">
        <section className="relative min-h-[330px] overflow-hidden lg:min-h-0 lg:w-[58%]">
          <div className="relative z-10 flex h-full flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-[clamp(2.5rem,5vw,5rem)] lg:py-10">
            <header className="fade-up flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="brand-emblem relative flex size-12 items-center justify-center text-white">
                  <span className="brand-emblem-ring absolute inset-0 rounded-[14px] border border-white/18" />
                  <span className="absolute inset-[5px] rounded-[10px] bg-white/[0.09]" />
                  <span className="absolute top-0 right-0 size-2.5 border-t-2 border-r-2 border-orange" />
                  <IconBrandMark size={25} className="relative" />
                </span>
                <div className="flex items-stretch gap-3">
                  <span className="w-px bg-white/18" />
                  <div>
                    <p className="text-[17px] font-semibold tracking-[0.22em]">
                      知测
                    </p>
                    <p className="mt-0.5 font-latin text-[9px] font-medium tracking-[0.24em] text-white/42">
                      ZHICE
                    </p>
                  </div>
                </div>
              </div>
              <p className="hidden text-[11px] tracking-[0.12em] text-white/42 sm:block">
                多专业在线考试与智能评测
              </p>
            </header>

            <div className="flex flex-1 items-center py-9 lg:py-0">
              <div className="fade-up fade-up-d1 relative z-10 max-w-[620px]">
                <div className="inline-flex items-center gap-2 border-l-2 border-orange pl-3 text-xs font-medium tracking-[0.12em] text-white/66">
                  多专业智能考试平台
                </div>
                <h1 className="mt-5 font-display text-[clamp(2.25rem,5.1vw,4.75rem)] leading-[1.12] font-bold tracking-[-0.04em]">
                  专注每一次作答
                  <br />
                  <span className="text-white/58">见证每一份成长</span>
                </h1>
                <p className="mt-6 max-w-lg text-[15px] leading-7 text-white/64 sm:text-base sm:leading-8">
                  面向理工、医学、人文与艺术等专业场景，
                  <br className="hidden sm:block" />
                  提供稳定、公平、可信的一站式在线考试体验。
                </p>

                <div className="capability-rail relative mt-10 grid max-w-[590px] grid-cols-3 border-t border-white/14">
                  {features.map((item) => (
                    <div
                      key={item.index}
                      className="group relative border-r border-white/10 px-3 pt-5 first:pl-0 last:border-r-0 last:pr-0 sm:px-4"
                    >
                      <span className="absolute -top-[4px] left-0 size-[7px] rounded-full border-2 border-[#16477d] bg-orange transition group-hover:scale-150" />
                      <div className="flex items-baseline gap-2">
                        <span className="font-latin text-[9px] font-bold tracking-[0.1em] text-orange">
                          {item.index}
                        </span>
                        <span className="text-sm font-semibold tracking-[0.04em] text-white/86">
                          {item.title}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] tracking-[0.08em] text-white/35">
                        {item.caption}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <footer className="fade-up hidden items-center justify-between text-[11px] tracking-[0.12em] text-white/35 lg:flex">
              <span>物联网实训箱 · 考试子系统</span>
              <span>公平 · 稳定 · 可信</span>
            </footer>
          </div>
        </section>

        <section className="relative flex flex-1 items-center justify-center px-5 py-8 [--ticket-cut-bg:#16477d] sm:px-9 lg:w-[42%] lg:px-[clamp(2rem,4vw,4.5rem)]">
          <div className="fade-up fade-up-d2 w-full max-w-[460px]">
            <div className="relative overflow-hidden rounded-[24px] border border-white bg-surface shadow-[0_28px_80px_rgba(22,47,82,0.14)]">
              <div className="absolute inset-x-0 top-0 z-10 h-1 bg-accent">
                <span className="block h-full w-16 bg-orange" />
              </div>
              <div className="relative flex items-start justify-between bg-[#f9fbfe] px-7 py-6 sm:px-8">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-orange">
                    考试通行证
                  </p>
                  <h2 className="mt-2 font-display text-[1.8rem] font-bold tracking-tight">
                    身份核验
                  </h2>
                  <p className="mt-1.5 text-sm text-mute">
                    登录后进入你的专属考试空间
                  </p>
                </div>
                <div className="relative flex size-12 items-center justify-center rounded-[14px] bg-accent text-white shadow-[0_8px_18px_rgba(23,74,139,0.2)]">
                  <div className="absolute inset-1 rounded-[10px] border border-white/15" />
                  <IconBrandMark size={25} />
                </div>
              </div>

              <div className="ticket-cut px-7 sm:px-8">
                <div className="ticket-dashes" />
              </div>

              <div className="px-7 py-6 sm:px-8 sm:py-7">
                <LoginForm />
              </div>

              <div className="ticket-cut px-7 sm:px-8">
                <div className="ticket-dashes" />
              </div>

              <div className="flex items-center justify-between bg-[#f9fbfe] px-7 py-4 sm:px-8">
                <p className="text-[11px] font-medium text-ink-soft">
                  平台统一身份认证
                </p>
                <p className="text-[10px] text-mute">
                  账号信息仅用于考试身份核验
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-mute">
              © {new Date().getFullYear()} 知测 · 安全考试服务
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
