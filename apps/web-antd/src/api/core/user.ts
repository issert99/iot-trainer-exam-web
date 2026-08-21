import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

export type ExamUserRole = 'admin' | 'student' | 'teacher';

export type ExamPublicUser = {
  avatarUrl?: null | string;
  classId?: null | string;
  department?: null | string;
  email?: null | string;
  id: number | string;
  majorId?: null | string;
  phone?: null | string;
  realName: string;
  role: ExamUserRole | string;
  status?: string;
  title?: null | string;
  username: string;
};

export function normalizeExamRole(role: string): ExamUserRole {
  const value = String(role || '')
    .trim()
    .toLowerCase();
  if (
    value === 'admin' ||
    value === 'super' ||
    value === 'administrator' ||
    value.includes('admin')
  ) {
    return 'admin';
  }
  if (value === 'teacher' || value.includes('teach')) {
    return 'teacher';
  }
  return 'student';
}

export function mapExamUserToUserInfo(user: ExamPublicUser): UserInfo {
  const role = normalizeExamRole(String(user.role));
  return {
    avatar: user.avatarUrl || '',
    desc: [user.department, user.title].filter(Boolean).join(' · ') || '',
    homePath: '/assessment/dashboard',
    realName: user.realName,
    roles: [role],
    token: '',
    userId: String(user.id),
    username: user.username,
  };
}

/**
 * 获取用户信息（考试后端：GET /auth/me）
 */
export async function getUserInfoApi() {
  const user = await requestClient.get<ExamPublicUser>('/auth/me');
  return mapExamUserToUserInfo(user);
}
