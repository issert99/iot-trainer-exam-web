<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Descriptions,
  message,
  Modal,
  Space,
  Tabs,
  Tag,
  Tree,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteOrgRowApi,
  deleteOrgRowApi,
  exportOrgTabApi,
  getOrgDetailApi,
  getOrgTreeApi,
  importOrgTabApi,
  listOrgTabApi,
} from '#/api/core';

defineOptions({ name: 'ExamOrg' });

type TabKey = 'classes' | 'courses' | 'majors' | 'students' | 'teachers';
type ScopeType = 'all' | 'class' | 'college' | 'major';

const activeTab = ref<TabKey>('majors');
const selectedScopeType = ref<ScopeType>('all');
const selectedScopeId = ref('');
const selectedTreeKey = ref('all');
const treeData = ref<any[]>([]);
const expandedTreeKeys = ref<string[]>([]);
const currentFormValues = ref<Record<string, any>>({});

const detailOpen = ref(false);
const detailTitle = ref('');
const detailItems = ref<{ label: string; value: number | string }[]>([]);

const visibleTabs = [
  { key: 'majors', label: '专业列表' },
  { key: 'classes', label: '行政班' },
  { key: 'students', label: '学生名单' },
  { key: 'teachers', label: '教师名册' },
  { key: 'courses', label: '课程列表' },
];

const gridTitle = computed(() => {
  const map: Record<TabKey, string> = {
    majors: '专业列表',
    classes: '行政班列表',
    students: '学生名单',
    teachers: '教师名册',
    courses: '课程列表',
  };
  return `组织人员 · ${map[activeTab.value]}`;
});

const statusColor = (status: string) => {
  if (status === 'active') return 'success';
  if (status === 'locked') return 'error';
  return 'default';
};

function getFormOptionsByTab(tab: TabKey): VbenFormProps {
  const base = {
    collapsed: false,
    showCollapseButton: false,
    submitOnChange: true,
  };
  if (tab === 'students') {
    return {
      ...base,
      schema: [
        {
          component: 'Input',
          fieldName: 'keyword',
          label: '关键词',
          componentProps: {
            allowClear: true,
            placeholder: '姓名/学号/身份证/手机号/户籍地',
          },
        },
        {
          component: 'Select',
          fieldName: 'grade',
          label: '年级',
          componentProps: {
            allowClear: true,
            options: [
              { label: '2024级', value: '2024' },
              { label: '2023级', value: '2023' },
            ],
          },
        },
        {
          component: 'Select',
          fieldName: 'status',
          label: '状态',
          componentProps: {
            allowClear: true,
            options: [
              { label: '正常', value: 'active' },
              { label: '禁用', value: 'inactive' },
              { label: '锁定', value: 'locked' },
            ],
          },
        },
      ],
    };
  }
  if (tab === 'teachers') {
    return {
      ...base,
      schema: [
        {
          component: 'Input',
          fieldName: 'keyword',
          label: '关键词',
          componentProps: {
            allowClear: true,
            placeholder: '姓名/工号/身份证/手机号/学历',
          },
        },
        {
          component: 'Select',
          fieldName: 'title',
          label: '职称',
          componentProps: {
            allowClear: true,
            options: [
              { label: '讲师', value: '讲师' },
              { label: '副教授', value: '副教授' },
              { label: '助教', value: '助教' },
            ],
          },
        },
        {
          component: 'Select',
          fieldName: 'status',
          label: '状态',
          componentProps: {
            allowClear: true,
            options: [
              { label: '在岗', value: 'active' },
              { label: '停用', value: 'inactive' },
            ],
          },
        },
      ],
    };
  }
  if (tab === 'courses') {
    return {
      ...base,
      schema: [
        {
          component: 'Input',
          fieldName: 'keyword',
          label: '关键词',
          componentProps: {
            allowClear: true,
            placeholder: '课程代码/课程名称/教材/开课单位',
          },
        },
        {
          component: 'Select',
          fieldName: 'courseNature',
          label: '课程性质',
          componentProps: {
            allowClear: true,
            options: [
              { label: '必修', value: 'required' },
              { label: '选修', value: 'elective' },
            ],
          },
        },
        {
          component: 'Select',
          fieldName: 'examType',
          label: '考核方式',
          componentProps: {
            allowClear: true,
            options: [
              { label: '考试', value: 'exam' },
              { label: '考查', value: 'assessment' },
            ],
          },
        },
      ],
    };
  }
  if (tab === 'classes') {
    return {
      ...base,
      schema: [
        {
          component: 'Input',
          fieldName: 'keyword',
          label: '关键词',
          componentProps: { allowClear: true, placeholder: '班级名/专业名' },
        },
        {
          component: 'Select',
          fieldName: 'grade',
          label: '年级',
          componentProps: {
            allowClear: true,
            options: [
              { label: '2024级', value: '2024' },
              { label: '2023级', value: '2023' },
            ],
          },
        },
      ],
    };
  }
  return {
    ...base,
    schema: [
      {
        component: 'Input',
        fieldName: 'keyword',
        label: '关键词',
        componentProps: {
          allowClear: true,
          placeholder: '专业代码/专业名称/学院',
        },
      },
    ],
  };
}

function getColumnsByTab(tab: TabKey): VxeTableGridOptions<any>['columns'] {
  const action = {
    field: 'action',
    title: '操作',
    fixed: 'right',
    width: 180,
    slots: { default: 'action' },
  } as const;
  if (tab === 'students')
    return [
      { type: 'checkbox', width: 50 },
      { type: 'seq', title: '序号', width: 60 },
      { field: 'username', title: '学号', minWidth: 120 },
      { field: 'name', title: '姓名', minWidth: 100 },
      { field: 'class_name', title: '行政班', minWidth: 120 },
      { field: 'phone', title: '手机号', minWidth: 120 },
      { field: 'household_location', title: '户籍地', minWidth: 140 },
      { field: 'gaokao_score', title: '高考成绩', minWidth: 90 },
      {
        field: 'status',
        title: '状态',
        minWidth: 90,
        slots: { default: 'status' },
      },
      action,
    ];
  if (tab === 'teachers')
    return [
      { type: 'checkbox', width: 50 },
      { type: 'seq', title: '序号', width: 60 },
      { field: 'username', title: '工号', minWidth: 120 },
      { field: 'name', title: '姓名', minWidth: 100 },
      { field: 'title', title: '职称', minWidth: 90 },
      { field: 'education', title: '学历', minWidth: 90 },
      { field: 'phone', title: '手机号', minWidth: 120 },
      { field: 'graduate_school', title: '毕业院校', minWidth: 150 },
      {
        field: 'status',
        title: '状态',
        minWidth: 90,
        slots: { default: 'status' },
      },
      action,
    ];
  if (tab === 'courses')
    return [
      { type: 'checkbox', width: 50 },
      { type: 'seq', title: '序号', width: 60 },
      { field: 'code', title: '课程代码', minWidth: 120 },
      { field: 'name', title: '课程名称', minWidth: 160 },
      {
        field: 'course_nature',
        title: '课程性质',
        minWidth: 90,
        slots: { default: 'nature' },
      },
      {
        field: 'exam_type',
        title: '考核方式',
        minWidth: 90,
        slots: { default: 'examType' },
      },
      { field: 'credit', title: '学分', minWidth: 70 },
      { field: 'total_hours', title: '总学时', minWidth: 90 },
      { field: 'offering_department', title: '开课单位', minWidth: 130 },
      action,
    ];
  if (tab === 'classes')
    return [
      { type: 'checkbox', width: 50 },
      { type: 'seq', title: '序号', width: 60 },
      { field: 'name', title: '行政班', minWidth: 130 },
      { field: 'grade', title: '年级', minWidth: 80 },
      { field: 'major_name', title: '专业', minWidth: 130 },
      { field: 'student_count', title: '学生数', minWidth: 80 },
      { field: 'head_teacher_name', title: '班主任', minWidth: 100 },
      action,
    ];
  return [
    { type: 'checkbox', width: 50 },
    { type: 'seq', title: '序号', width: 60 },
    { field: 'code', title: '专业代码', minWidth: 120 },
    { field: 'name', title: '专业名称', minWidth: 160 },
    { field: 'college_name', title: '所属学院', minWidth: 130 },
    { field: 'class_count', title: '行政班', minWidth: 80 },
    { field: 'course_count', title: '课程数', minWidth: 80 },
    action,
  ];
}

const gridOptions: VxeTableGridOptions<any> = {
  checkboxConfig: { highlight: true, reserve: true, checkField: 'checked' },
  columns: getColumnsByTab(activeTab.value),
  height: 'auto',
  pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50] },
  rowConfig: { keyField: 'id' },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        currentFormValues.value = formValues ?? {};
        const list = await listOrgTabApi(activeTab.value, {
          ...formValues,
          scopeType: selectedScopeType.value,
          scopeId: selectedScopeId.value,
        });
        const start = (page.currentPage - 1) * page.pageSize;
        return {
          items: list.slice(start, start + page.pageSize),
          total: list.length,
        };
      },
    },
  },
  toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
};

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: getFormOptionsByTab(activeTab.value),
  gridOptions,
});

async function loadTree() {
  try {
    const remoteTree = await getOrgTreeApi();
    treeData.value = Array.isArray(remoteTree) ? remoteTree : [];
    expandedTreeKeys.value = getAllTreeKeys(treeData.value);
  } catch {
    treeData.value = [];
    message.error('组织树加载失败，请检查后端接口');
  }
}

function getAllTreeKeys(nodes: any[]): string[] {
  return nodes.flatMap((node) => [
    String(node.key),
    ...getAllTreeKeys(Array.isArray(node.children) ? node.children : []),
  ]);
}

function refreshByTabChange() {
  gridApi.setGridOptions({ columns: getColumnsByTab(activeTab.value) });
  gridApi.formApi.setState(getFormOptionsByTab(activeTab.value));
  gridApi.reload();
}

function onTabChange(key: number | string) {
  activeTab.value = String(key) as TabKey;
  refreshByTabChange();
}

function onTreeSelect(keys: (number | string)[]) {
  const raw = String(keys[0] || 'all');
  selectedTreeKey.value = raw;
  if (raw === 'all') {
    selectedScopeType.value = 'all';
    selectedScopeId.value = '';
  } else {
    const [type, id = ''] = raw.split(':');
    selectedScopeType.value = type as ScopeType;
    selectedScopeId.value = id;
  }
  gridApi.reload();
}

async function handleDelete(row: { id: string }) {
  await deleteOrgRowApi(activeTab.value, row.id);
  message.success('删除成功');
  gridApi.reload();
  await loadTree();
}

async function handleBatchDelete() {
  const checked = (await gridApi.grid?.getCheckboxRecords?.()) || [];
  const ids = checked.map((x: any) => x.id).filter(Boolean);
  if (ids.length === 0) {
    message.warning('请先勾选要删除的数据');
    return;
  }
  await batchDeleteOrgRowApi(activeTab.value, ids);
  message.success(`已批量删除 ${ids.length} 条`);
  gridApi.reload();
  await loadTree();
}

async function handleImport() {
  await importOrgTabApi(activeTab.value);
  message.success('导入功能已就绪');
}

async function handleExport() {
  const list = await exportOrgTabApi(activeTab.value, {
    ...currentFormValues.value,
    scopeType: selectedScopeType.value,
    scopeId: selectedScopeId.value,
  });
  message.success(`已导出 ${list.length} 条`);
}

async function showDetail(row: Record<string, any>) {
  const detail = await getOrgDetailApi(activeTab.value, row.id);
  detailTitle.value = `${row.name || row.code || '详情'} · 明细`;
  detailItems.value = Object.keys(detail || {}).map((k) => ({
    label: k,
    value: String((detail as any)[k] ?? ''),
  }));
  detailOpen.value = true;
}

onMounted(async () => {
  await loadTree();
});
</script>

<template>
  <Page auto-content-height content-class="h-full">
    <div class="org-layout">
      <div class="org-tree-pane">
        <Tree
          class="org-tree"
          v-model:expanded-keys="expandedTreeKeys"
          :selected-keys="[selectedTreeKey]"
          :tree-data="treeData"
          @select="onTreeSelect"
        />
      </div>
      <div class="org-main">
        <Tabs
          v-model:active-key="activeTab"
          class="org-tabs"
          @change="onTabChange"
        >
          <Tabs.TabPane
            v-for="tab in visibleTabs"
            :key="tab.key"
            :tab="tab.label"
          />
        </Tabs>
        <Grid :table-title="gridTitle" class="org-grid">
          <template #toolbar-tools>
            <Space>
              <Button danger @click="handleBatchDelete">批量删除</Button>
              <Button @click="handleImport">导入</Button>
              <Button @click="handleExport">导出</Button>
            </Space>
          </template>
          <template #status="{ row }">
            <Tag :color="statusColor(row.status)">
              {{
                row.status === 'active'
                  ? activeTab === 'teachers'
                    ? '在岗'
                    : '正常'
                  : row.status === 'locked'
                    ? '锁定'
                    : '禁用'
              }}
            </Tag>
          </template>
          <template #nature="{ row }">
            <Tag :color="row.course_nature === 'required' ? 'blue' : 'default'">
              {{ row.course_nature === 'required' ? '必修' : '选修' }}
            </Tag>
          </template>
          <template #examType="{ row }">
            <Tag :color="row.exam_type === 'exam' ? 'processing' : 'gold'">
              {{ row.exam_type === 'exam' ? '考试' : '考查' }}
            </Tag>
          </template>
          <template #action="{ row }">
            <Space>
              <Button type="link" size="small" @click="showDetail(row)">
                详情
              </Button>
              <Button
                type="link"
                danger
                size="small"
                @click="handleDelete(row)"
              >
                删除
              </Button>
            </Space>
          </template>
        </Grid>
      </div>
    </div>

    <Modal
      v-model:open="detailOpen"
      :title="detailTitle"
      width="860px"
      footer=""
    >
      <Descriptions :column="2" bordered size="small">
        <Descriptions.Item
          v-for="item in detailItems"
          :key="item.label"
          :label="item.label"
        >
          {{ item.value }}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  </Page>
</template>

<style scoped>
.org-layout {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.org-tree-pane {
  display: flex;
  flex-direction: column;
  width: 272px;
  height: 100%;
  padding: 8px;
  overflow: auto;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.org-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.org-tabs {
  margin-bottom: 2px;
}

.org-grid {
  flex: 1;
  min-height: 0;
}
</style>
