<script lang="ts" setup>
import type { TemplateDocument } from '../template-document';
import type { TemplateScopeType } from '../template-schema';

import type { QbTemplate } from '#/api/core';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tree,
} from 'ant-design-vue';

import {
  createQbTemplateApi,
  deleteQbTemplateApi,
  getOrgOptionsApi,
  listQbTemplatesApi,
  updateQbTemplateApi,
} from '#/api/core';

import EmptyQuestionTemplateEditor from '../components/EmptyQuestionTemplateEditor.vue';
import { createEmptyTemplateDocument } from '../template-document';
import {
  decodeTemplateDocument,
  encodeTemplateDocumentCompatible,
  templateSummary as summarizeTemplateDoc,
} from '../template-document.bridge';
import { formatTemplateScope, parseTemplateScope } from '../template-schema';

defineOptions({ name: 'QuestionTemplates' });

type OrgOptions = Awaited<ReturnType<typeof getOrgOptionsApi>>;
type TreeNode = {
  children?: TreeNode[];
  key: string;
  title: string;
};

const view = ref<'edit' | 'list'>('list');
const loading = ref(false);
const saving = ref(false);
const selectedTreeKey = ref('public');
const expandedTreeKeys = ref<string[]>(['organization-root']);
const keyword = ref('');
const templates = ref<QbTemplate[]>([]);
const orgOptions = ref<OrgOptions>({
  colleges: [],
  majors: [],
  classes: [],
  teachers: [],
});

const form = reactive<{
  description: string;
  document: TemplateDocument;
  id: string;
  name: string;
  scopeId: string;
  scopeType: TemplateScopeType;
}>({
  id: '',
  name: '',
  description: '',
  scopeType: 'public',
  scopeId: '',
  document: createEmptyTemplateDocument(),
});

const treeData = computed<TreeNode[]>(() => [
  {
    key: 'public',
    title: '公用模板',
  },
  {
    key: 'organization-root',
    title: '全部组织',
    children: orgOptions.value.colleges.map((college) => ({
      key: `college:${college.id}`,
      title: college.name,
      children: orgOptions.value.majors
        .filter((major) => major.college_id === college.id)
        .map((major) => ({
          key: `major:${major.id}`,
          title: major.name,
        })),
    })),
  },
]);

const scopeOptions = computed(() => [
  { label: '公用模板', value: 'public' },
  ...orgOptions.value.colleges.flatMap((college) => [
    {
      label: `学院：${college.name}`,
      value: `college:${college.id}`,
    },
    ...orgOptions.value.majors
      .filter((major) => major.college_id === college.id)
      .map((major) => ({
        label: `专业：${major.name}`,
        value: `major:${major.id}`,
      })),
  ]),
]);

const selectedNodeTitle = computed(() => {
  if (selectedTreeKey.value === 'public') return '公用模板';
  if (selectedTreeKey.value === 'organization-root') return '全部组织模板';
  const [type, id] = selectedTreeKey.value.split(':');
  if (type === 'college') {
    return (
      orgOptions.value.colleges.find((item) => item.id === id)?.name ||
      '学院模板'
    );
  }
  return (
    orgOptions.value.majors.find((item) => item.id === id)?.name || '专业模板'
  );
});

const filteredTemplates = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  return templates.value.filter((item) => {
    const matchesKeyword =
      !search ||
      item.name.toLowerCase().includes(search) ||
      String(item.description || '')
        .toLowerCase()
        .includes(search);
    if (!matchesKeyword) return false;
    const scope = parseTemplateScope(item.scope);
    if (selectedTreeKey.value === 'public') return scope.type === 'public';
    if (selectedTreeKey.value === 'organization-root') {
      return scope.type !== 'public';
    }
    const [type, id = ''] = selectedTreeKey.value.split(':');
    if (type === 'major') return scope.type === 'major' && scope.id === id;
    if (type === 'college') {
      const majorIds = orgOptions.value.majors
        .filter((major) => major.college_id === id)
        .map((major) => major.id);
      return (
        (scope.type === 'college' && scope.id === id) ||
        (scope.type === 'major' && majorIds.includes(scope.id))
      );
    }
    return true;
  });
});

async function loadData() {
  loading.value = true;
  try {
    const [options, result] = await Promise.all([
      getOrgOptionsApi(),
      listQbTemplatesApi({ page: 1, pageSize: 500 }),
    ]);
    orgOptions.value = options;
    templates.value = result.items || [];
    expandedTreeKeys.value = [
      'organization-root',
      ...options.colleges.map((item) => `college:${item.id}`),
    ];
  } catch {
    message.error('模板或组织数据加载失败');
  } finally {
    loading.value = false;
  }
}

function onTreeSelect(keys: Array<number | string>) {
  selectedTreeKey.value = String(keys[0] || selectedTreeKey.value);
}

function resetFormScope() {
  if (selectedTreeKey.value === 'public') {
    form.scopeType = 'public';
    form.scopeId = '';
    return;
  }
  const [type, id = ''] = selectedTreeKey.value.split(':');
  if (type === 'college' || type === 'major') {
    form.scopeType = type;
    form.scopeId = id;
    return;
  }
  form.scopeType = 'public';
  form.scopeId = '';
}

async function openCreate() {
  if (selectedTreeKey.value === 'organization-root') {
    message.info('请先选择具体学院或专业，再创建组织模板');
    return;
  }
  form.id = '';
  form.name = '';
  form.description = '';
  form.document = createEmptyTemplateDocument();
  resetFormScope();
  view.value = 'edit';
  await nextTick();
}

async function openEdit(row: QbTemplate) {
  const scope = parseTemplateScope(row.scope);
  form.id = row.id;
  form.name = row.name;
  form.description = row.description || '';
  form.scopeType = scope.type;
  form.scopeId = scope.id;
  form.document = decodeTemplateDocument(row.components);
  view.value = 'edit';
  await nextTick();
}

function onScopeChange(value: unknown) {
  const scope = parseTemplateScope(String(value || 'public'));
  form.scopeType = scope.type;
  form.scopeId = scope.id;
}

async function saveTemplate() {
  if (!form.name.trim()) {
    message.warning('请填写模板名称');
    return;
  }
  if (summarizeTemplateDoc(form.document).scoredCount === 0) {
    message.warning('请至少添加一处作答（挖空/选择题等）');
    return;
  }
  if (form.scopeType !== 'public' && !form.scopeId) {
    message.warning('请选择模板所属学院或专业');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      scope: formatTemplateScope(form.scopeType, form.scopeId),
      components: encodeTemplateDocumentCompatible(form.document),
    };
    await (form.id
      ? updateQbTemplateApi(form.id, payload)
      : createQbTemplateApi(payload));
    message.success('题目模板已保存');
    view.value = 'list';
    await loadData();
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

function removeTemplate(row: QbTemplate) {
  Modal.confirm({
    title: '删除模板',
    content: `确认删除「${row.name}」？已经按此模板创建的题目不会被删除。`,
    onOk: async () => {
      await deleteQbTemplateApi(row.id);
      message.success('已删除');
      await loadData();
    },
  });
}

function templateSummary(row: QbTemplate) {
  const doc = decodeTemplateDocument(row.components);
  return {
    structure: summarizeTemplateDoc(doc).label,
  };
}

function scopeLabel(scope?: string) {
  const parsed = parseTemplateScope(scope);
  if (parsed.type === 'public') return '公用';
  if (parsed.type === 'college') {
    return (
      orgOptions.value.colleges.find((item) => item.id === parsed.id)?.name ||
      '学院'
    );
  }
  return (
    orgOptions.value.majors.find((item) => item.id === parsed.id)?.name ||
    '专业'
  );
}

function backToList() {
  view.value = 'list';
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height content-class="h-full p-3">
    <div v-if="view === 'list'" class="tpl-library">
      <Card class="tpl-tree-card" :bordered="false">
        <Tree
          v-model:expanded-keys="expandedTreeKeys"
          :selected-keys="[selectedTreeKey]"
          :tree-data="treeData"
          block-node
          @select="onTreeSelect"
        />
      </Card>

      <section class="tpl-main">
        <header class="tpl-main-head">
          <div class="tpl-main-title">
            <h2>{{ selectedNodeTitle }}</h2>
            <p>管理可复用的空题模具，用于快速出题</p>
          </div>
          <div class="tpl-main-tools">
            <Input
              v-model:value="keyword"
              allow-clear
              placeholder="搜索模板"
              class="tpl-search"
            />
            <Button type="primary" @click="openCreate">
              <template #icon>
                <IconifyIcon icon="lucide:plus" />
              </template>
              新建模板
            </Button>
          </div>
        </header>

        <div class="tpl-main-body">
          <Spin :spinning="loading" class="tpl-spin">
            <div v-if="filteredTemplates.length > 0" class="tpl-grid">
              <article
                v-for="row in filteredTemplates"
                :key="row.id"
                class="tpl-card"
                @click="openEdit(row)"
              >
                <div class="tpl-card-top">
                  <span class="tpl-card-icon">
                    <IconifyIcon icon="lucide:layout-template" />
                  </span>
                  <div class="tpl-card-copy">
                    <strong>{{ row.name }}</strong>
                    <p>{{ row.description || '暂无说明' }}</p>
                  </div>
                </div>
                <div class="tpl-meta">
                  <span>{{ templateSummary(row).structure }}</span>
                  <span>{{ scopeLabel(row.scope) }}</span>
                </div>
                <div class="tpl-card-foot" @click.stop>
                  <time>{{ row.updated_at || '—' }}</time>
                  <div class="tpl-card-actions">
                    <button type="button" @click="openEdit(row)">编辑</button>
                    <button
                      type="button"
                      class="danger"
                      @click="removeTemplate(row)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="tpl-empty">
              <Empty description="当前归属下还没有模板">
                <Button type="primary" @click="openCreate">新建模板</Button>
              </Empty>
            </div>
          </Spin>
        </div>
      </section>
    </div>

    <div v-else class="tpl-editor">
      <header class="tpl-editor-head">
        <div>
          <h2>{{ form.id ? '编辑模板' : '新建模板' }}</h2>
          <p>中间是空题模具，点哪里改哪里</p>
        </div>
        <Space>
          <Button @click="backToList">返回</Button>
          <Button type="primary" :loading="saving" @click="saveTemplate">
            保存
          </Button>
        </Space>
      </header>

      <div class="tpl-name-row">
        <Input
          v-model:value="form.name"
          placeholder="模板名称"
          class="tpl-name-input"
        />
        <Select
          :value="formatTemplateScope(form.scopeType, form.scopeId)"
          :options="scopeOptions"
          show-search
          option-filter-prop="label"
          class="tpl-scope-select"
          @update:value="onScopeChange"
        />
      </div>

      <div class="tpl-editor-body">
        <EmptyQuestionTemplateEditor v-model="form.document" />
      </div>
    </div>
  </Page>
</template>

<style scoped>
.tpl-library {
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.tpl-tree-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.tpl-tree-card :deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: auto;
}

.tpl-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.tpl-main-head {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 14px;
  border-bottom: 1px solid hsl(var(--border));
}

.tpl-main-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  color: hsl(var(--foreground));
}

.tpl-main-title p {
  margin: 4px 0 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.tpl-main-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.tpl-search {
  width: 220px;
}

.tpl-main-body {
  flex: 1;
  min-height: 0;
  padding: 16px 18px 18px;
  overflow: auto;
  background: hsl(var(--card));
}

.tpl-spin {
  display: block;
  min-height: 240px;
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  align-content: start;
}

.tpl-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 156px;
  padding: 14px;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.tpl-card:hover {
  border-color: hsl(var(--primary) / 45%);
  box-shadow: 0 8px 20px hsl(var(--foreground) / 5%);
}

.tpl-card-top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.tpl-card-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  font-size: 17px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 9px;
}

.tpl-card-copy {
  min-width: 0;
}

.tpl-card-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 650;
  white-space: nowrap;
}

.tpl-card-copy p {
  display: -webkit-box;
  margin: 4px 0 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.45;
  color: hsl(var(--muted-foreground));
  -webkit-box-orient: vertical;
}

.tpl-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tpl-meta span {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--foreground) / 75%);
  background: hsl(var(--muted) / 45%);
  border-radius: 999px;
}

.tpl-card-foot {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: auto;
  border-top: 1px solid hsl(var(--border));
}

.tpl-card-foot time {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.tpl-card-actions {
  display: flex;
  gap: 4px;
}

.tpl-card-actions button {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--primary));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.tpl-card-actions button:hover {
  background: hsl(var(--primary) / 8%);
}

.tpl-card-actions button.danger {
  color: hsl(var(--destructive));
}

.tpl-card-actions button.danger:hover {
  background: hsl(var(--destructive) / 8%);
}

.tpl-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(380px, 100%);
  padding: 32px 16px;
  border: 1px dashed hsl(var(--border));
  border-radius: 10px;
}

.tpl-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 12px 14px 14px;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.tpl-editor-head {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid hsl(var(--border));
}

.tpl-editor-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.tpl-editor-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.tpl-name-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.tpl-name-input {
  flex: 1;
}

.tpl-scope-select {
  width: 220px;
}

.tpl-editor-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.tpl-editor-body :deep(.eq-root) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 960px) {
  .tpl-library {
    grid-template-rows: minmax(180px, 30%) 1fr;
    grid-template-columns: 1fr;
  }
}
</style>
