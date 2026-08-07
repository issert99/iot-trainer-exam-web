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

/** 知测品牌标：知识书页与测评勾选 */
export function IconBrandMark({ className, size = 28 }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M3.6 5.8c3.05-.7 5.85-.05 8.4 2v11.1c-2.55-2.05-5.35-2.7-8.4-2V5.8Z"
        fill="currentColor"
        fillOpacity="0.13"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M20.4 5.8c-3.05-.7-5.85-.05-8.4 2v11.1c2.55-2.05 5.35-2.7 8.4-2V5.8Z"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.8v11.1"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="m14.4 12.5 1.55 1.55 3.15-3.35"
        stroke="var(--orange)"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.9 9h3.5M5.9 11.6h3.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeOpacity="0.62"
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
