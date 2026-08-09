type PlaceholderProps = {
  title: string;
  description: string;
};

export function AdminPlaceholder({ title, description }: PlaceholderProps) {
  return (
    <div className="admin-enter px-6 py-7 sm:px-8 lg:px-10 xl:px-12">
      <p className="text-[12px] font-medium tracking-[0.14em] text-[var(--accent)]">
        MODULE
      </p>
      <h1 className="mt-1.5 font-display text-[1.85rem] font-bold tracking-tight text-[var(--ink)]">
        {title}
      </h1>
      <p className="mt-2 text-[14px] text-[var(--ink-soft)]">{description}</p>
      <div className="mt-8 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white/90 text-center shadow-[0_14px_36px_-28px_rgba(18,42,48,0.45)]">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent)]/8 font-display text-[18px] font-bold text-[var(--accent)]">
          知
        </span>
        <p className="mt-4 text-[14px] font-medium text-[var(--ink)]">
          模块建设中
        </p>
        <p className="mt-1.5 text-[13px] text-[var(--ink-faint)]">
          稍后开放完整功能
        </p>
      </div>
    </div>
  );
}
