import type { ExamPublicUser } from './user';

import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录身份（与考试后端角色一致） */
  export type LoginRole = 'admin' | 'student' | 'teacher';

  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    role?: LoginRole;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    clientType?: string;
    expiresIn?: string;
    tokenType?: string;
    user?: ExamPublicUser;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录（考试后端：POST /auth/login）
 */
export async function loginApi(data: AuthApi.LoginParams) {
  // 后端 DTO 不接受 role，身份仅前端选择并在登录后校验
  return requestClient.post<AuthApi.LoginResult>('/auth/login', {
    username: data.username,
    password: data.password,
    clientType: 'web',
  });
}

/**
 * 刷新accessToken（考试后端暂无此接口，已关闭 enableRefreshToken）
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录（考试后端若无此接口，由 store 吞掉错误）
 */
export async function logoutApi() {
  return baseRequestClient.post('/auth/logout', {
    withCredentials: true,
  });
}

/**
 * 获取用户权限码（前端模式按角色派生，不请求后端）
 */
export async function getAccessCodesApi() {
  return [] as string[];
}
