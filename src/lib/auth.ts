import { apiRequest } from "@/lib/api";

export type UserRole = "student" | "teacher" | "admin";
export type UserStatus = "active" | "inactive" | "locked";
export type ClientType = "web" | "app";

export type PublicUser = {
  id: string;
  username: string;
  realName: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  majorId: string | null;
  classId: string | null;
  department: string | null;
  title: string | null;
  status: UserStatus;
};

export type LoginResult = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  clientType: ClientType;
  user: PublicUser;
};

const TOKEN_KEY = "exam_access_token";
const USER_KEY = "exam_user";

function storage(remember: boolean): Storage {
  return remember ? window.localStorage : window.sessionStorage;
}

function clearBoth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem(TOKEN_KEY) ??
    window.sessionStorage.getItem(TOKEN_KEY)
  );
}

export function getStoredUser(): PublicUser | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem(USER_KEY) ??
    window.sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export function saveSession(result: LoginResult, remember: boolean) {
  clearBoth();
  const store = storage(remember);
  store.setItem(TOKEN_KEY, result.accessToken);
  store.setItem(USER_KEY, JSON.stringify(result.user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  clearBoth();
}

export async function loginRequest(input: {
  username: string;
  password: string;
  clientType?: ClientType;
}): Promise<LoginResult> {
  return apiRequest<LoginResult>("/auth/login", {
    method: "POST",
    body: {
      username: input.username,
      password: input.password,
      clientType: input.clientType ?? "web",
    },
  });
}

export async function fetchCurrentUser(token?: string | null) {
  return apiRequest<PublicUser>("/auth/me", {
    method: "GET",
    token: token ?? getAccessToken(),
  });
}

export const ROLE_LABEL: Record<UserRole, string> = {
  student: "学生",
  teacher: "教师",
  admin: "管理",
};
