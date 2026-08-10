import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

export type ExamUserRole = 'admin' | 'student' | 'teacher';

export type ExamPublicUser = {
  avatarUrl: null | string;
  classId: null | string;
  department: null | string;
  email: null | string;
  id: string;
  majorId: null | string;
  phone: null | string;
  realName: string;
  role: ExamUserRole;
  status: string;
  title: null | string;
  username: string;
};

function mapExamUserToUserInfo(user: ExamPublicUser): UserInfo {
  const isAdmin = user.role === 'admin';
  return {
    avatar: user.avatarUrl || '',
    desc: [user.department, user.title].filter(Boolean).join(' · ') || '',
    homePath: isAdmin ? '/analytics' : '/workspace',
    realName: user.realName,
    roles: [user.role],
    token: '',
    userId: user.id,
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
