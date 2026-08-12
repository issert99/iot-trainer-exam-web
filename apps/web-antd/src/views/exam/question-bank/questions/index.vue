<script lang="ts" setup>
import type { BuilderComponent } from '../mock';

import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QbCourseOption, QbQuestion, QbTemplate } from '#/api/core';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createQbQuestionApi,
  deleteQbQuestionApi,
  getQbQuestionApi,
  listQbCoursesApi,
  listQbQuestionsApi,
  listQbTemplatesApi,
  updateQbQuestionApi,
} from '#/api/core';

import QuestionBuilder from '../components/QuestionBuilder.vue';
import QuestionPreview from '../components/QuestionPreview.vue';

defineOptions({ name: 'QuestionList' });

function cloneComponents(list: unknown): BuilderComponent[] {
  try {
    return structuredClone(list || []) as BuilderComponent[];
  } catch {
    return [];
  }
}

const view = ref<'edit' | 'list'>('list');
const selectedId = ref<string>();
const saving = ref(false);
const previewOpen = ref(false);
const previewTitle = ref('');
const previewComponents = ref<BuilderComponent[]>([]);
const courseOptions = ref<Array<{ label: string; value: string }>>([]);
const templateOptions = ref<QbTemplate[]>([]);

const form = reactive({
  id: '',
  mode: 'template' as 'custom' | 'template',
  templateId: undefined as string | undefined,
  courseId: undefined as string | undefined,
  title: '',
  components: [] as BuilderComponent[],
});

const formOptions: VbenFormProps = {
  collapsed: false,
  showCollapseButton: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: '关键词',
      componentProps: { allowClear: true, placeholder: '题目标题' },
    },
    {
      component: 'Select',
      fieldName: 'courseId',
      label: '课程',
      componentProps: {
        allowClear: true,
        options: courseOptions,
        placeholder: '全部课程',
        showSearch: true,
        optionFilterProp: 'label',
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: {
        allowClear: true,
        options: [
          { label: '草稿', value: 'draft' },
          { label: '已发布', value: 'published' },
          { label: '已归档', value: 'archived' },
        ],
        placeholder: '全部状态',
      },
    },
  ],
};

const gridOptions: VxeTableGridOptions<QbQuestion> = {
  columns: [
    { type: 'seq', title: '序号', width: 60 },
    { field: 'title', title: '题目', minWidth: 220 },
    { field: 'course_name', title: '课程', minWidth: 140 },
    {
      field: 'template_name',
      title: '来源',
      minWidth: 140,
      slots: { default: 'source' },
    },
    {
      field: 'components',
      title: '组件数',
      width: 90,
      formatter: ({ row }) =>
        String(Array.isArray(row.components) ? row.components.length : 0),
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    {
      field: 'action',
      title: '操作',
      width: 200,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  height: 'auto',
  pagerConfig: { pageSize: 20, pageSizes: [10, 20, 50] },
  proxyConfig: {
    ajax: {
      query: async ({ page }, values) => {
        return listQbQuestionsApi({
          keyword: values?.keyword || '',
          courseId: values?.courseId || '',
          status: values?.status || '',
          page: page.currentPage,
          pageSize: page.pageSize,
        });
      },
    },
  },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { refresh: true, search: true, zoom: true },
};

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

async function loadMeta() {
  try {
    const [courses, templatesPage] = await Promise.all([
      listQbCoursesApi(),
      listQbTemplatesApi({ page: 1, pageSize: 200 }),
    ]);
    courseOptions.value = (courses || []).map((item: QbCourseOption) => ({
      label: `${item.name}（${item.major_name}）`,
      value: item.id,
    }));
    templateOptions.value = templatesPage.items || [];
  } catch {
    message.error('课程/模板选项加载失败');
  }
}

async function openCreate() {
  form.id = '';
  form.mode = 'template';
  form.templateId = templateOptions.value[0]?.id;
  form.courseId = courseOptions.value[0]?.value;
  form.title = '';
  form.components = [];
  selectedId.value = undefined;
  applyTemplate();
  view.value = 'edit';
  await nextTick();
}

async function openEdit(row: QbQuestion) {
  form.id = row.id;
  form.mode = row.template_id ? 'template' : 'custom';
  form.templateId = row.template_id || undefined;
  form.courseId = row.course_id;
  form.title = row.title;
  form.components = cloneComponents(row.components);
  selectedId.value = form.components[0]?.id;
  view.value = 'edit';
  await nextTick();
}

function applyTemplate() {
  if (form.mode !== 'template' || !form.templateId) return;
  const tpl = templateOptions.value.find((item) => item.id === form.templateId);
  if (!tpl) return;
  form.components = cloneComponents(tpl.components);
  selectedId.value = form.components[0]?.id;
  if (!form.title.trim()) form.title = tpl.name;
}

function onModeChange() {
  if (form.mode === 'custom') {
    form.templateId = undefined;
    if (!form.id) {
      form.components = [];
      selectedId.value = undefined;
    }
  } else {
    if (!form.templateId) form.templateId = templateOptions.value[0]?.id;
    applyTemplate();
  }
}

async function saveQuestion() {
  if (!form.title.trim()) {
    message.warning('请填写题目标题');
    return;
  }
  if (!form.courseId) {
    message.warning('请选择课程');
    return;
  }
  if (form.components.length === 0) {
    message.warning('请先添加组件');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      title: form.title.trim(),
      courseId: form.courseId,
      templateId: form.mode === 'template' ? form.templateId : undefined,
      components: form.components,
      status: 'draft',
    };
    await (form.id
      ? updateQbQuestionApi(form.id, {
          ...payload,
          templateId: form.mode === 'template' ? form.templateId || null : null,
        })
      : createQbQuestionApi(payload));
    message.success('题目已保存');
    view.value = 'list';
    await nextTick();
    await gridApi.reload();
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeQuestion(row: QbQuestion) {
  try {
    await deleteQbQuestionApi(row.id);
    message.success('已删除');
    await gridApi.reload();
  } catch {
    message.error('删除失败');
  }
}

function openPreviewFromForm() {
  if (form.components.length === 0) {
    message.warning('请先填写题目内容后再预览');
    return;
  }
  previewTitle.value = form.title.trim() || '未命名题目';
  previewComponents.value = cloneComponents(form.components);
  previewOpen.value = true;
}

async function openPreviewFromRow(row: QbQuestion) {
  try {
    const detail = await getQbQuestionApi(row.id);
    previewTitle.value = detail.title || row.title;
    previewComponents.value = cloneComponents(detail.components);
    previewOpen.value = true;
  } catch {
    message.error('预览加载失败');
  }
}

function backToList() {
  view.value = 'list';
}

const editorTitle = computed(() => (form.id ? '编辑题目' : '新建题目'));

onMounted(async () => {
  await loadMeta();
});
</script>

<template>
  <Page auto-content-height content-class="h-full">
    <div v-show="view === 'list'" class="qb-pane">
      <Grid class="qb-grid" table-title="题目管理">
        <template #toolbar-tools>
          <Space>
            <Button type="primary" @click.stop="openCreate">新建题目</Button>
          </Space>
        </template>
        <template #source="{ row }">
          <Tag v-if="row.template_name" color="blue">
            模板：{{ row.template_name }}
          </Tag>
          <Tag v-else>自定义</Tag>
        </template>
        <template #status="{ row }">
          <Tag :color="row.status === 'published' ? 'success' : 'default'">
            {{
              row.status === 'published'
                ? '已发布'
                : row.status === 'archived'
                  ? '已归档'
                  : '草稿'
            }}
          </Tag>
        </template>
        <template #action="{ row }">
          <Space>
            <Button
              type="link"
              size="small"
              @click.stop="openPreviewFromRow(row)"
            >
              预览
            </Button>
            <Button type="link" size="small" @click.stop="openEdit(row)">
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              @click.stop="removeQuestion(row)"
            >
              删除
            </Button>
          </Space>
        </template>
      </Grid>
    </div>

    <div v-show="view === 'edit'" class="qb-pane qb-editor">
      <Card :bordered="false" class="qb-editor-card">
        <div class="qb-editor-bar">
          <Space>
            <Button @click="backToList">返回</Button>
            <Button @click="openPreviewFromForm">预览</Button>
            <Button type="primary" :loading="saving" @click="saveQuestion">
              保存题目
            </Button>
            <span class="qb-editor-title">{{ editorTitle }}</span>
          </Space>
        </div>
        <Form layout="vertical" class="qb-meta">
          <Form.Item label="创建方式">
            <Radio.Group
              v-model:value="form.mode"
              button-style="solid"
              @change="onModeChange"
            >
              <Radio.Button value="template">套用模板</Radio.Button>
              <Radio.Button value="custom">完全自定义</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item v-if="form.mode === 'template'" label="题型模板">
            <Select
              v-model:value="form.templateId"
              class="max-w-md"
              :options="
                templateOptions.map((t) => ({
                  label: t.name,
                  value: t.id,
                }))
              "
              @change="applyTemplate"
            />
          </Form.Item>
          <Form.Item label="所属课程" required>
            <Select
              v-model:value="form.courseId"
              class="max-w-md"
              :options="courseOptions"
              show-search
              option-filter-prop="label"
            />
          </Form.Item>
          <Form.Item label="题目标题" required>
            <Input v-model:value="form.title" class="max-w-lg" />
          </Form.Item>
        </Form>

        <!-- 套用模板：只填内容；完全自定义：才拼组件 -->
        <QuestionContentForm
          v-if="form.mode === 'template'"
          v-model:components="form.components"
        />
        <QuestionBuilder
          v-else
          v-model:components="form.components"
          v-model:selected-id="selectedId"
        />
      </Card>
    </div>

    <Modal
      v-model:open="previewOpen"
      centered
      title="题目预览"
      width="860px"
      :footer="null"
      destroy-on-close
      :body-style="{ maxHeight: '72vh', overflow: 'auto' }"
    >
      <QuestionPreview :title="previewTitle" :components="previewComponents" />
    </Modal>
  </Page>
</template>

<style scoped>
.qb-pane {
  height: 100%;
  min-height: 0;
}

.qb-grid {
  height: 100%;
}

.qb-editor {
  overflow: auto;
}

.qb-editor-card {
  min-height: 100%;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.qb-editor-bar {
  margin-bottom: 12px;
}

.qb-editor-title {
  margin-left: 4px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.qb-meta {
  max-width: 720px;
}
</style>
