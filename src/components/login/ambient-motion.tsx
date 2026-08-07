export function AmbientMotion() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-[24%] -left-[8%] size-[680px] rounded-full bg-[#3477bd]/25 blur-[90px]" />
      <div className="ambient-blob absolute right-[-14%] bottom-[-30%] size-[720px] rounded-full bg-[#2b69a8]/24 blur-[110px]" />
      <div className="ambient-blob ambient-blob-delay absolute top-[12%] right-[18%] size-[320px] rounded-full bg-[#76a9df]/10 blur-[80px]" />

      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 1600 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="ambient-stroke" x1="0" y1="0" x2="1600" y2="0">
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="0.28" stopColor="white" stopOpacity="0.12" />
            <stop offset="0.68" stopColor="#A9D1F5" stopOpacity="0.22" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ambient-fill" x1="220" y1="50" x2="1320" y2="870">
            <stop stopColor="white" stopOpacity="0.055" />
            <stop offset="0.55" stopColor="#8ABBE8" stopOpacity="0.018" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M-180 710C180 455 380 790 690 530s530-410 1090-165"
          stroke="url(#ambient-stroke)"
          strokeWidth="1.2"
          className="ambient-line"
        />
        <path
          d="M-200 775C180 510 410 850 735 575s560-405 1085-135"
          stroke="url(#ambient-stroke)"
          strokeWidth="0.8"
          opacity="0.65"
          className="ambient-line ambient-line-delay"
        />
        <path
          d="M-160 620C165 400 340 710 645 470s560-390 1115-205"
          stroke="url(#ambient-stroke)"
          strokeWidth="0.8"
          opacity="0.5"
          className="ambient-line ambient-line-slow"
        />

        <path
          d="M410-100c165 210 75 360 290 470s420 75 620 285 290 330 500 355H710c30-245-115-315-245-465S260 180 410-100Z"
          fill="url(#ambient-fill)"
          className="ambient-ribbon"
        />
      </svg>
    </div>
  );
}
