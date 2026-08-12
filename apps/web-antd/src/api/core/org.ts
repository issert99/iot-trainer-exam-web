import { requestClient } from '#/api/request';

export type OrgTab =
  | 'classes'
  | 'colleges'
  | 'courses'
  | 'majors'
  | 'students'
  | 'teachers';

export async function getOrgTreeApi() {
  return requestClient.get<any[]>('/org/tree');
}

export async function getOrgOptionsApi() {
  return requestClient.get<{
    classes: Array<{
      grade: string;
      id: string;
      major_id: string;
      name: string;
    }>;
    colleges: Array<{ id: string; name: string }>;
    majors: Array<{ college_id: string; id: string; name: string }>;
    teachers: Array<{ college_id: string; id: string; name: string }>;
  }>('/org/options');
}

export async function listOrgTabApi(tab: OrgTab, params: Record<string, any>) {
  return requestClient.get<any>(`/org/${tab}`, { params });
}

export async function getOrgDetailApi(tab: OrgTab, id: string) {
  return requestClient.get<{ items: Array<{ label: string; value: string }> }>(
    `/org/${tab}/${id}/detail`,
  );
}

export async function createOrgRowApi(tab: OrgTab, data: Record<string, any>) {
  return requestClient.post(`/org/create/${tab}`, data);
}

export async function deleteOrgRowApi(tab: OrgTab, id: string) {
  return requestClient.delete(`/org/${tab}/${id}`);
}

export async function batchDeleteOrgRowApi(tab: OrgTab, ids: string[]) {
  return requestClient.post(`/org/batch-delete/${tab}`, { ids });
}

export async function addOrgNodeApi(data: {
  code?: string;
  name: string;
  parentId?: string;
  parentType: 'all' | 'college' | 'major';
}) {
  return requestClient.post('/org/node', data);
}

export async function deleteOrgNodeApi(
  type: 'class' | 'college' | 'major',
  id: string,
) {
  return requestClient.delete(`/org/node/${type}/${id}`);
}

export async function importOrgTabApi(
  tab: OrgTab,
  rows: Record<string, any>[],
) {
  return requestClient.post<{
    errors: string[];
    failed: number;
    success: number;
  }>(`/org/import/${tab}`, { rows });
}

export async function exportOrgTabApi(
  tab: OrgTab,
  params: Record<string, any>,
) {
  return requestClient.get<any>(`/org/export/${tab}`, { params });
}
