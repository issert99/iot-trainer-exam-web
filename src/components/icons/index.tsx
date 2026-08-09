import type { ReactNode } from "react";

type IconProps = {
  className?: string;
  size?: number;
};

function Svg({
  size = 20,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** 知测品牌标：答卷核验 */
export function IconBrandMark({ className, size = 28 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M7.2 8.4h9.6M7.2 12h6.4"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="m7.5 16.4 2.6 2.5 6.6-6.8"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconUser({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle
        cx="12"
        cy="8"
        r="3.35"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.4 18.9c.7-3.15 2.95-4.75 6.6-4.75s5.9 1.6 6.6 4.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconLock({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M8.2 10.4V8.1a3.8 3.8 0 0 1 7.6 0v2.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="5.4"
        y="10.4"
        width="13.2"
        height="9.2"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="14.7" r="1.15" fill="currentColor" />
      <path
        d="M12 15.85v1.35"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconEye({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M2.9 12s3.35-5.7 9.1-5.7 9.1 5.7 9.1 5.7-3.35 5.7-9.1 5.7S2.9 12 2.9 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.55"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </Svg>
  );
}

export function IconEyeOff({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M3.6 4.2 19.8 19.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.7 9.85A2.7 2.7 0 0 0 12 15.2c.75 0 1.43-.28 1.96-.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 7.45C5.15 8.85 3.7 12 3.7 12s3.35 5.7 9.1 5.7c1.45 0 2.75-.38 3.9-.98M10.85 6.55c.38-.08.76-.12 1.15-.12 5.75 0 9.1 5.7 9.1 5.7a14.5 14.5 0 0 1-2.5 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconStudent({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M3.2 9.8 12 5.1l8.8 4.7L12 14.5 3.2 9.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.8 11.7v4.25c1.65 1.25 3.4 1.9 5.2 1.9s3.55-.65 5.2-1.9V11.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.8 10.05v5.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="20.8" cy="16.3" r="1" fill="currentColor" />
    </Svg>
  );
}

export function IconTeacher({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect
        x="3.7"
        y="4.6"
        width="16.6"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8.2 18.9h7.6M12 15.6v3.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7.4 8.7h5.2M7.4 11.4H11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="15.9"
        cy="10"
        r="1.55"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </Svg>
  );
}

export function IconAdmin({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M12 3.3 18.9 6v4.7c0 4.2-2.85 7.4-6.9 8.6-4.05-1.2-6.9-4.4-6.9-8.6V6L12 3.3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.05 12 11.1 14.05 15.2 9.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconCheck({ className, size = 14 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M5 12.2 9.4 16.4 19 7.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconQuestionBank({ className, size = 22 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M7.1 4.3h7.9L18.6 8v11.3a1.4 1.4 0 0 1-1.4 1.4H7.1A1.8 1.8 0 0 1 5.3 18.9V6.1A1.8 1.8 0 0 1 7.1 4.3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15 4.35V8.05h3.55"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.9 12.2h5.7M8.9 15.4h3.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8.9" cy="9.35" r="1.05" fill="currentColor" />
      <path
        d="m15.2 15.1 1.2 1.2 2.25-2.45"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconCodeJudge({ className, size = 22 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect
        x="4.2"
        y="4.8"
        width="15.6"
        height="14.4"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8.3 10 6.4 12l1.9 2M15.7 10l1.9 2-1.9 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.95 9.2 11.05 14.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconShieldScan({ className, size = 22 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M12 3.4 18.8 6.15v4.85c0 4.25-2.85 7.5-6.8 8.7-3.95-1.2-6.8-4.45-6.8-8.7V6.15L12 3.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="11.35"
        r="2.35"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 13.7v2.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconArrowRight({ className, size = 18 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M4.8 12h13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13 7.2 17.8 12 13 16.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconOverview({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.3" y="3.5" width="7.2" height="7.2" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3.5" y="13.3" width="7.2" height="7.2" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.3" y="13.3" width="7.2" height="7.2" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  );
}

export function IconUsers({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="9" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.8 18c.6-2.6 2.5-3.9 5.2-3.9s4.6 1.3 5.2 3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16.2" cy="8.4" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.2 14.2c1.9.2 3.3 1.2 3.9 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconRoles({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M8.2 10.5V8.3a3.8 3.8 0 0 1 7.6 0v2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="5.5" y="10.5" width="13" height="8.5" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  );
}

export function IconSemester({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 9.5h16M9 3.8v3.2M15 3.8v3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.2 13.2h3.2M8.2 16.2h7.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconLogs({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M7 4.2h7.2L17.8 8v11a1.6 1.6 0 0 1-1.6 1.6H7A1.8 1.8 0 0 1 5.2 18.8V6A1.8 1.8 0 0 1 7 4.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14.2 4.3V8h3.5M8.4 12h7M8.4 15.2h4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSettings({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3.6v2.1M12 18.3v2.1M3.6 12h2.1M18.3 12h2.1M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconBackup({ className, size = 20 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <ellipse cx="12" cy="6.5" rx="6.8" ry="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.2 6.5v5.2c0 1.3 3 2.4 6.8 2.4s6.8-1.1 6.8-2.4V6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.2 11.7v5.2c0 1.3 3 2.4 6.8 2.4s6.8-1.1 6.8-2.4v-5.2" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  );
}

export function IconTrendUp({ className, size = 14 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 15 10.5 8.5 13.5 11.5 20 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 5H20v5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconLogout({ className, size = 18 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M10 4.5H7.2A2.2 2.2 0 0 0 5 6.7v10.6A2.2 2.2 0 0 0 7.2 19.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 8.5 18 12l-4 3.5M18 12H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSearch({ className, size = 18 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.8 15.8 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconPlus({ className, size = 18 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function IconUpload({ className, size = 18 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 15.5V5.8M8.2 9l3.8-3.8L15.8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 16.2V18a1.6 1.6 0 0 0 1.6 1.6h10.8A1.6 1.6 0 0 0 19 18v-1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconChevronLeft({ className, size = 16 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M14 5 8 12l6 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconChevronRight({ className, size = 16 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M10 5l6 7-6 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
