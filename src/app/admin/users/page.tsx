import type { Metadata } from "next";
import { UsersClassesPage } from "@/components/admin/users-classes-page";

export const metadata: Metadata = {
  title: "用户与班级 · 知测管理台",
  description: "管理学生、教师账号与班级组织关系",
};

export default function AdminUsersRoute() {
  return <UsersClassesPage />;
}
