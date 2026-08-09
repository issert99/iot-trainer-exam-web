/** 左侧深色品牌区：渐变 + IoT 节点线稿 */
export function LoginBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(150deg,#115c55_0%,#147069_44%,#0d433e_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_58%_at_12%_12%,rgba(255,255,255,0.11),transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_90%_90%,rgba(0,0,0,0.2),transparent_55%)]" />
      <div className="absolute inset-y-0 right-0 w-px bg-white/8" />

      <svg
        className="absolute right-[-8%] bottom-[-6%] h-[76%] w-[76%] text-white"
        viewBox="0 0 480 420"
        fill="none"
      >
        <path
          d="M64 286C108 214 162 172 232 152C304 132 352 92 396 38"
          stroke="currentColor"
          strokeOpacity="0.11"
          strokeWidth="1.2"
        />
        <path
          d="M36 176C98 156 152 198 204 242C256 286 324 306 428 272"
          stroke="currentColor"
          strokeOpacity="0.09"
          strokeWidth="1.2"
        />
        <path
          d="M86 74C138 118 178 192 212 254C246 316 294 356 364 376"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1.2"
        />
        <path
          d="M232 152L204 242M232 152L364 376M204 242L428 272"
          stroke="currentColor"
          strokeOpacity="0.055"
          strokeWidth="1"
        />

        <circle cx="232" cy="152" r="20" stroke="currentColor" strokeOpacity="0.12" />
        <circle cx="204" cy="242" r="15" stroke="currentColor" strokeOpacity="0.09" />
        <circle cx="364" cy="376" r="13" stroke="currentColor" strokeOpacity="0.08" />

        <circle className="net-node" cx="232" cy="152" r="4" fill="currentColor" fillOpacity="0.65" />
        <circle className="net-node net-node-d1" cx="204" cy="242" r="3.2" fill="currentColor" fillOpacity="0.5" />
        <circle className="net-node net-node-d2" cx="364" cy="376" r="3.2" fill="currentColor" fillOpacity="0.45" />
        <circle cx="396" cy="38" r="2.2" fill="currentColor" fillOpacity="0.24" />
        <circle cx="86" cy="74" r="2.2" fill="currentColor" fillOpacity="0.18" />
        <circle cx="428" cy="272" r="2.2" fill="currentColor" fillOpacity="0.2" />
      </svg>
    </div>
  );
}
