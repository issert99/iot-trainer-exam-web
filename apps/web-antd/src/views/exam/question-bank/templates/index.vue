<script lang="ts" setup>
import type { TemplateDefinition, TemplateScopeType } from '../template-schema';

import type { QbTemplate } from '#/api/core';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tree,
} from 'ant-design-vue';

import {
  createQbTemplateApi,
  deleteQbTemplateApi,
  getOrgOptionsApi,
  listQbTemplatesApi,
  updateQbTemplateApi,
} from '#/api/core';

import TemplateDesigner from '../components/TemplateDesigner.vue';
import {
  createEmptyTemplateDefinition,
  decodeTemplateDefinition,
  encodeTemplateDefinition,
  formatTemplateScope,
  parseTemplateScope,
  STRUCTURE_OPTIONS,
} from '../template-schema';

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
  definition: TemplateDefinition;
  description: string;
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
  definition: createEmptyTemplateDefinition(),
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
  form.definition = createEmptyTemplateDefinition();
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
  form.definition = decodeTemplateDefinition(row.components);
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
  if (form.definition.responseTypes.length === 0) {
    message.warning('请至少选择一种作答方式');
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
      components: encodeTemplateDefinition(form.definition),
    };
    await (form.id
      ? updateQbTemplateApi(form.id, payload)
      : createQbTemplateApi(payload));
    message.success('模板规则已保存');
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
  const definition = decodeTemplateDefinition(row.components);
  const structure =
    STRUCTURE_OPTIONS.find((item) => item.value === definition.structure)
      ?.label || '自定义结构';
  return {
    definition,
    structure,
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
  <Page auto-content-height content-class="h-full">
    <div v-if="view === 'list'" class="tpl-library">
      <Card class="tpl-tree-card" :bordered="false">
        <div class="tpl-tree-title">模板归属</div>
        <Tree
          v-model:expanded-keys="expandedTreeKeys"
          :selected-keys="[selectedTreeKey]"
          :tree-data="treeData"
          block-node
          @select="onTreeSelect"
        />
      </Card>

      <Card class="tpl-list-card" :bordered="false">
        <div class="tpl-list-head">
          <div>
            <h2>{{ selectedNodeTitle }}</h2>
            <p>模板只定义结构、允许的作答方式和规则，不保存具体题干与答案。</p>
          </div>
          <Space>
            <Input
              v-model:value="keyword"
              allow-clear
              placeholder="搜索模板"
              style="width: 220px"
            />
            <Button type="primary" @click="openCreate">
              <template #icon>
                <IconifyIcon icon="lucide:plus" />
              </template>
              新建模板
            </Button>
          </Space>
        </div>

        <Spin :spinning="loading">
          <div v-if="filteredTemplates.length > 0" class="tpl-grid">
            <article
              v-for="row in filteredTemplates"
              :key="row.id"
              class="tpl-card"
            >
              <div class="tpl-card-head">
                <span class="tpl-card-icon">
                  <IconifyIcon icon="lucide:layout-template" />
                </span>
                <div class="tpl-card-title">
                  <strong>{{ row.name }}</strong>
                  <span>{{ row.description || '暂无说明' }}</span>
                </div>
              </div>
              <div class="tpl-tags">
                <Tag color="blue">{{ templateSummary(row).structure }}</Tag>
                <Tag>{{ scopeLabel(row.scope) }}</Tag>
                <Tag v-if="templateSummary(row).definition.stimulus.enabled">
                  共享材料
                </Tag>
                <Tag
                  v-if="templateSummary(row).definition.subQuestions.enabled"
                >
                  多小题
                </Tag>
                <Tag v-if="templateSummary(row).definition.optionPool.enabled">
                  共享选项池
                </Tag>
              </div>
              <div class="tpl-card-actions">
                <span>{{ row.updated_at || '' }}</span>
                <Space>
                  <Button type="link" size="small" @click="openEdit(row)">
                    编辑规则
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    @click="removeTemplate(row)"
                  >
                    删除
                  </Button>
                </Space>
              </div>
            </article>
          </div>
          <Empty v-else description="当前节点暂无模板" />
        </Spin>
      </Card>
    </div>

    <div v-else class="tpl-editor">
      <div class="tpl-editor-head">
        <div>
          <h2>{{ form.id ? '编辑模板规则' : '新建模板规则' }}</h2>
          <p>这里定义以后创建题目时允许出现的结构和规则，不填写具体题目。</p>
        </div>
        <Space>
          <Button @click="backToList">返回</Button>
          <Button type="primary" :loading="saving" @click="saveTemplate">
            保存模板
          </Button>
        </Space>
      </div>

      <Card class="tpl-meta-card" :bordered="false">
        <Form layout="vertical">
          <div class="tpl-meta-grid">
            <Form.Item label="模板名称" required>
              <Input
                v-model:value="form.name"
                placeholder="例如：共享选项完形填空"
              />
            </Form.Item>
            <Form.Item label="保存位置" required>
              <Select
                :value="formatTemplateScope(form.scopeType, form.scopeId)"
                :options="scopeOptions"
                show-search
                option-filter-prop="label"
                @update:value="onScopeChange"
              />
            </Form.Item>
          </div>
          <Form.Item label="用途说明">
            <Input
              v-model:value="form.description"
              placeholder="说明这个模板适合创建什么样的题目"
            />
          </Form.Item>
        </Form>
      </Card>

      <TemplateDesigner v-model="form.definition" />
    </div>
  </Page>
</template>

<style scoped>
.tpl-library {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.tpl-tree-card,
.tpl-list-card,
.tpl-meta-card {
  border: 1px solid hsl(var(--border));
}

.tpl-tree-card {
  overflow: auto;
}

.tpl-tree-title {
  padding-bottom: 12px;
  margin-bottom: 12px;
  font-weight: 600;
  border-bottom: 1px solid hsl(var(--border));
}

.tpl-list-card {
  min-width: 0;
  overflow: auto;
}

.tpl-list-head,
.tpl-editor-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.tpl-list-head h2,
.tpl-editor-head h2 {
  margin: 0;
  font-size: 18px;
}

.tpl-list-head p,
.tpl-editor-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(240px, 1fr));
  gap: 14px;
}

.tpl-card {
  display: flex;
  flex-direction: column;
  min-height: 180px;
  padding: 16px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.tpl-card-head {
  display: flex;
  gap: 12px;
}

.tpl-card-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
  border-radius: 8px;
}

.tpl-card-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tpl-card-title span {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.tpl-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
}

.tpl-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: auto;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  border-top: 1px solid hsl(var(--border));
}

.tpl-editor {
  height: 100%;
  padding-bottom: 24px;
  overflow: auto;
}

.tpl-meta-card {
  margin-bottom: 16px;
}

.tpl-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 1200px) {
  .tpl-grid {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }
}

@media (max-width: 800px) {
  .tpl-library,
  .tpl-meta-grid {
    grid-template-columns: 1fr;
  }

  .tpl-grid {
    grid-template-columns: 1fr;
  }
}
</style>
