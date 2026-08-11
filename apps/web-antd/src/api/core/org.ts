import { requestClient } from '#/api/request';

export type OrgTab = 'classes' | 'courses' | 'majors' | 'students' | 'teachers';

export async function getOrgTreeApi() {
  return requestClient.get<any[]>('/org/tree');
}

export async function listOrgTabApi(tab: OrgTab, params: Record<string, any>) {
  return requestClient.get<any[]>(`/org/${tab}`, { params });
}

export async function getOrgDetailApi(tab: OrgTab, id: string) {
  return requestClient.get<any>(`/org/${tab}/${id}/detail`);
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

export async function importOrgTabApi(tab: OrgTab) {
  return requestClient.post(`/org/import/${tab}`, {});
}

export async function exportOrgTabApi(
  tab: OrgTab,
  params: Record<string, any>,
) {
  return requestClient.get<any[]>(`/org/export/${tab}`, { params });
}
