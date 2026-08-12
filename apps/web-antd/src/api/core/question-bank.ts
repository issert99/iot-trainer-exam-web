import { requestClient } from '#/api/request';

export type QbComponent = {
  children?: QbComponent[];
  config: Record<string, any>;
  id: string;
  judgeMode: 'auto' | 'manual' | 'none';
  label: string;
  score: number;
  type: string;
};

export type QbTemplate = {
  component_count?: number;
  components: QbComponent[];
  description?: string;
  id: string;
  name: string;
  scope?: string;
  type?: string;
  updated_at: string;
};

export type QbQuestion = {
  components: QbComponent[];
  course_id: string;
  course_name: string;
  difficulty?: number;
  id: string;
  score?: number;
  status: 'archived' | 'draft' | 'published';
  template_id?: null | string;
  template_name?: null | string;
  title: string;
  type?: string;
  updated_at: string;
};

export type QbCourseOption = {
  id: string;
  major_id: string;
  major_name: string;
  name: string;
};

export type PageResult<T> = {
  items: T[];
  total: number;
};

function normalizePage<T>(data: any): PageResult<T> {
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total || 0),
  };
}

export async function listQbCoursesApi() {
  return requestClient.get<QbCourseOption[]>('/question-bank/courses');
}

export async function listQbTemplatesApi(params: Record<string, any>) {
  const data = await requestClient.get<any>('/question-bank/templates', {
    params,
  });
  return normalizePage<QbTemplate>(data);
}

export async function getQbTemplateApi(id: string) {
  return requestClient.get<QbTemplate>(`/question-bank/templates/${id}`);
}

export async function createQbTemplateApi(data: {
  components: QbComponent[];
  description?: string;
  name: string;
  scope?: string;
}) {
  return requestClient.post<QbTemplate>('/question-bank/templates', data);
}

export async function updateQbTemplateApi(
  id: string,
  data: {
    components: QbComponent[];
    description?: string;
    name: string;
    scope?: string;
  },
) {
  return requestClient.put<QbTemplate>(`/question-bank/templates/${id}`, data);
}

export async function deleteQbTemplateApi(id: string) {
  return requestClient.delete(`/question-bank/templates/${id}`);
}

export async function listQbQuestionsApi(params: Record<string, any>) {
  const data = await requestClient.get<any>('/question-bank/questions', {
    params,
  });
  return normalizePage<QbQuestion>(data);
}

export async function getQbQuestionApi(id: string) {
  return requestClient.get<QbQuestion>(`/question-bank/questions/${id}`);
}

export async function createQbQuestionApi(data: {
  bankType?: string;
  components: QbComponent[];
  courseId: string;
  difficulty?: number;
  status?: string;
  templateId?: string;
  title: string;
}) {
  return requestClient.post<QbQuestion>('/question-bank/questions', data);
}

export async function updateQbQuestionApi(
  id: string,
  data: {
    bankType?: string;
    components: QbComponent[];
    courseId: string;
    difficulty?: number;
    status?: string;
    templateId?: null | string;
    title: string;
  },
) {
  return requestClient.put<QbQuestion>(`/question-bank/questions/${id}`, data);
}

export async function deleteQbQuestionApi(id: string) {
  return requestClient.delete(`/question-bank/questions/${id}`);
}

export async function batchDeleteQbQuestionsApi(ids: string[]) {
  return requestClient.post('/question-bank/questions/batch-delete', { ids });
}
