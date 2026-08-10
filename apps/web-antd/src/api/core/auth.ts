import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    clientType?: string;
    expiresIn?: string;
    tokenType?: string;
    user?: Record<string, unknown>;
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
