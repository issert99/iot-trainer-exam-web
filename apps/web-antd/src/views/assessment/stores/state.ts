import type {
  AuditRecord,
  JsonObject,
  SchoolAssessmentState,
} from '../domain/types';

import { reactive } from 'vue';

import { checksum, clone, uid } from '../domain/integrity';
import { createSeedState } from '../domain/seed';

const storageKey = 'school-assessment:prototype:v2';

function restoreState() {
  const seed = createSeedState();
  if (typeof window === 'undefined') return seed;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return seed;
  try {
    const parsed = JSON.parse(stored) as Partial<SchoolAssessmentState>;
    if (parsed.school?.id !== seed.school.id) return seed;
    return {
      ...seed,
      ...parsed,
      school: seed.school,
    };
  } catch {
    return seed;
  }
}

export const schoolAssessmentState = reactive(
  restoreState(),
) as unknown as SchoolAssessmentState;

export function persistSchoolState() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(clone(schoolAssessmentState)),
  );
}

export function resetSchoolPrototype() {
  Object.assign(schoolAssessmentState, createSeedState());
  persistSchoolState();
}

export function appendSchoolAudit(input: {
  action: string;
  actorId: string;
  metadata?: JsonObject;
  outcome?: AuditRecord['outcome'];
  resourceId: string;
  resourceType: string;
}) {
  const previous =
    schoolAssessmentState.auditRecords.at(-1)?.chainHash ?? 'GENESIS';
  const record: AuditRecord = {
    action: input.action,
    actorId: input.actorId,
    chainHash: '',
    id: uid('audit'),
    metadata: input.metadata ?? {},
    occurredAt: new Date().toISOString(),
    outcome: input.outcome ?? 'success',
    previousHash: previous,
    resourceId: input.resourceId,
    resourceType: input.resourceType,
  };
  record.chainHash = checksum({ ...record, chainHash: undefined });
  schoolAssessmentState.auditRecords.push(record);
  return record;
}

export function verifySchoolAuditChain() {
  return schoolAssessmentState.auditRecords.every((record, index, records) => {
    const previous = index === 0 ? 'GENESIS' : records[index - 1]?.chainHash;
    return record.previousHash === previous;
  });
}
