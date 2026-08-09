import type { Metadata } from "next";
import { OverviewPage } from "@/components/admin/overview-page";

export const metadata: Metadata = {
  title: "系统概览 · 知测管理台",
  description: "知测考试平台系统管理后台概览",
};

export default function AdminOverviewRoute() {
  return <OverviewPage />;
}
