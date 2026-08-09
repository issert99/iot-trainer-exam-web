"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAccessToken, getStoredUser } from "@/lib/auth";

/** 已登录用户访问登录页时跳转对应首页 */
export function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) return;
    const user = getStoredUser();
    router.replace(user?.role === "admin" ? "/admin" : "/");
  }, [router]);

  return null;
}
