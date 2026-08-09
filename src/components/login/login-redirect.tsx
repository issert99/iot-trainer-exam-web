"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAccessToken } from "@/lib/auth";

/** 已登录用户访问登录页时跳回首页 */
export function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/");
    }
  }, [router]);

  return null;
}
