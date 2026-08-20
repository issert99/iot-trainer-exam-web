import type { ExamAssuranceLevel } from '#/views/exam/bank/contracts';

import { computed, reactive } from 'vue';

import { integrityChecksum } from './integrity';

export type TenantIsolationMode =
  | 'dedicated-database'
  | 'private-deployment'
  | 'shared-rls';

export type TenantDefinition = {
  dataRegion: string;
  id: string;
  isolationMode: TenantIsolationMode;
  name: string;
  status: 'active' | 'suspended';
};

export type AuditOutcome = 'denied' | 'failure' | 'success';

export type AuditRecord = {
  action: string;
  actorId: string;
  chainHash: string;
  id: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  outcome: AuditOutcome;
  previousHash: string;
  resourceId: string;
  resourceType: string;
  tenantId: string;
};

export type ExamPermission =
  | 'attempt:submit'
  | 'exam:publish'
  | 'paper:seal'
  | 'plugin:manage'
  | 'score:finalize'
  | 'tenant:switch';

export const tenants: TenantDefinition[] = [
  {
    dataRegion: '华东教育云',
    id: 'tenant-demo-university',
    isolationMode: 'shared-rls',
    name: '知测示范大学',
    status: 'active',
  },
  {
    dataRegion: '校内数据中心',
    id: 'tenant-medical-university',
    isolationMode: 'dedicated-database',
    name: '医科联合大学',
    status: 'active',
  },
  {
    dataRegion: '客户本地',
    id: 'tenant-private-college',
    isolationMode: 'private-deployment',
    name: '工科实验学院',
    status: 'active',
  },
];

export const assuranceProfiles: Record<
  ExamAssuranceLevel,
  {
    auditRetention: string;
    code: ExamAssuranceLevel;
    controls: string[];
    label: string;
    requiresDualApproval: boolean;
    requiresMfa: boolean;
  }
> = {
  course: {
    auditRetention: '1 年',
    code: 'course',
    controls: ['基础审计', '自动保存', '教师发布'],
    label: '课程测验',
    requiresDualApproval: false,
    requiresMfa: false,
  },
  standard: {
    auditRetention: '5 年',
    code: 'standard',
    controls: ['双人复核', '冻结快照', '动态水印', '异常告警'],
    label: '校级考试',
    requiresDualApproval: true,
    requiresMfa: true,
  },
  'high-stakes': {
    auditRetention: '长期归档',
    code: 'high-stakes',
    controls: ['独立密钥', '双人封存', '设备绑定', '不可篡改审计', '人工仲裁'],
    label: '高风险考试',
    requiresDualApproval: true,
    requiresMfa: true,
  },
};

const TENANT_STORAGE_KEY = 'exam-platform:active-tenant';
const AUDIT_STORAGE_KEY = 'exam-platform:audit-chain';

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 浏览器禁用或空间不足时，内存状态仍可继续工作。
  }
}

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const storedTenantId = safeRead(
  TENANT_STORAGE_KEY,
  tenants[0]?.id ?? 'tenant-demo-university',
);

export const tenantContext = reactive({
  activeTenantId: tenants.some((item) => item.id === storedTenantId)
    ? storedTenantId
    : (tenants[0]?.id ?? 'tenant-demo-university'),
});

export const activeTenant = computed<TenantDefinition>(() => {
  const tenant =
    tenants.find((item) => item.id === tenantContext.activeTenantId) ??
    tenants[0];
  if (!tenant) throw new Error('平台未配置可用租户');
  return tenant;
});

const auditRecords = safeRead<AuditRecord[]>(AUDIT_STORAGE_KEY, []);

export const governanceState = reactive({
  auditRecords,
});

export function tenantStorageKey(scope: string, identity = 'default') {
  return `exam-platform:${tenantContext.activeTenantId}:${scope}:${identity}`;
}

export function assertTenantScope(resourceTenantId: string) {
  if (resourceTenantId !== tenantContext.activeTenantId) {
    throw new Error('当前租户无权访问该资源');
  }
}

export function canPerform(
  role: string,
  permission: ExamPermission,
  assuranceLevel: ExamAssuranceLevel = 'course',
) {
  if (role === 'admin') return true;
  if (role === 'student') return permission === 'attempt:submit';
  if (role !== 'teacher') return false;
  if (permission === 'attempt:submit') return true;
  if (permission === 'plugin:manage' || permission === 'tenant:switch') {
    return false;
  }
  if (
    assuranceLevel === 'high-stakes' &&
    (permission === 'exam:publish' || permission === 'paper:seal')
  ) {
    return false;
  }
  return true;
}

export function appendAudit(input: {
  action: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  outcome?: AuditOutcome;
  resourceId: string;
  resourceType: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? tenantContext.activeTenantId;
  const previousHash =
    governanceState.auditRecords.at(-1)?.chainHash ?? 'audit-genesis';
  const base = {
    action: input.action,
    actorId: input.actorId ?? 'local-prototype-user',
    id: uid('audit'),
    metadata: input.metadata ?? {},
    occurredAt: new Date().toISOString(),
    outcome: input.outcome ?? 'success',
    previousHash,
    resourceId: input.resourceId,
    resourceType: input.resourceType,
    tenantId,
  };
  const record: AuditRecord = {
    ...base,
    chainHash: integrityChecksum(base),
  };
  governanceState.auditRecords.push(record);
  if (governanceState.auditRecords.length > 500) {
    governanceState.auditRecords.splice(
      0,
      governanceState.auditRecords.length - 500,
    );
  }
  safeWrite(AUDIT_STORAGE_KEY, governanceState.auditRecords);
  return record;
}

export function verifyAuditChain(records = governanceState.auditRecords) {
  let previousHash = 'audit-genesis';
  for (const record of records) {
    const { chainHash, ...base } = record;
    if (record.previousHash !== previousHash) return false;
    if (integrityChecksum(base) !== chainHash) return false;
    previousHash = chainHash;
  }
  return true;
}

export function setActiveTenant(tenantId: string, actorId = 'local-admin') {
  const tenant = tenants.find(
    (item) => item.id === tenantId && item.status === 'active',
  );
  if (!tenant) throw new Error('租户不存在或已停用');
  const previousTenantId = tenantContext.activeTenantId;
  tenantContext.activeTenantId = tenant.id;
  safeWrite(TENANT_STORAGE_KEY, tenant.id);
  appendAudit({
    action: 'tenant.context.switched',
    actorId,
    metadata: { previousTenantId },
    resourceId: tenant.id,
    resourceType: 'tenant',
  });
}

export const productionSecurityBoundary = {
  audit: '服务端 WORM/对象锁与签名时间戳',
  encryption: 'AES-256-GCM 信封加密，主密钥由 KMS/HSM 托管',
  isolation: '数据库 RLS + tenant_id 强制策略，独立库租户使用独立凭据',
  localPrototype:
    '浏览器仅保存租户命名空间、完整性校验和短期恢复数据，不声称替代服务端加密',
  sandbox: '代码、SQL、文档预览与第三方插件在无网络一次性容器执行',
} as const;
