<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Col,
  DatePicker,
  Descriptions,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  message,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Tree,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteOrgRowApi,
  createOrgRowApi,
  deleteOrgRowApi,
  exportOrgTabApi,
  getOrgDetailApi,
  getOrgOptionsApi,
  getOrgTreeApi,
  importOrgTabApi,
  listOrgTabApi,
} from '#/api/core';

defineOptions({ name: 'ExamOrg' });

type TabKey =
  | 'classes'
  | 'colleges'
  | 'courses'
  | 'majors'
  | 'students'
  | 'teachers';
type ScopeType = 'all' | 'class' | 'college' | 'major';

type OrgOptions = {
  classes: Array<{ grade: string; id: string; major_id: string; name: string }>;
  colleges: Array<{ id: string; name: string }>;
  majors: Array<{ college_id: string; id: string; name: string }>;
  teachers: Array<{ college_id: string; id: string; name: string }>;
};

const activeTab = ref<TabKey>('colleges');
const selectedScopeType = ref<ScopeType>('all');
const selectedScopeId = ref('');
const selectedTreeKey = ref('all');
const treeData = ref<any[]>([]);
const expandedTreeKeys = ref<string[]>([]);
const currentFormValues = ref<Record<string, any>>({});

const detailOpen = ref(false);
const detailTitle = ref('');
const detailItems = ref<{ label: string; value: number | string }[]>([]);
const tabSwitching = ref(false);

const createOpen = ref(false);
const createSubmitting = ref(false);
const createForm = reactive<Record<string, any>>({
  code: '',
  name: '',
  shortName: '',
  description: '',
  username: '',
  phone: '',
  email: '',
  title: undefined as string | undefined,
  grade: undefined as string | undefined,
  credit: undefined as number | undefined,
  textbook: '',
  collegeId: undefined as string | undefined,
  majorId: undefined as string | undefined,
  classId: undefined as string | undefined,
  headTeacherId: undefined as string | undefined,
  idCardNo: '',
  householdLocation: '',
  householdAddress: '',
  graduateSchool: '',
  gaokaoScore: undefined as number | undefined,
  emergencyContact: '',
  emergencyPhone: '',
  education: undefined as string | undefined,
  degree: undefined as string | undefined,
  hireDate: undefined as string | undefined,
  department: '',
  semester: '',
  totalHours: undefined as number | undefined,
  theoryHours: undefined as number | undefined,
  practiceHours: undefined as number | undefined,
  examType: undefined as string | undefined,
  courseNature: undefined as string | undefined,
  offeringDepartment: '',
});
const options = ref<OrgOptions>({
  classes: [],
  colleges: [],
  majors: [],
  teachers: [],
});

const importInputRef = ref<HTMLInputElement | null>(null);

function getPopupContainer() {
  return document.body;
}

/** CSV 中文表头 → 英文字段（与导入模板一致） */
const IMPORT_HEADER_MAP: Record<TabKey, Record<string, string>> = {
  colleges: {
    学院代码: 'code',
    学院名称: 'name',
    学院简称: 'shortName',
    简介: 'description',
  },
  majors: {
    专业代码: 'code',
    专业名称: 'name',
    专业简称: 'shortName',
    学院ID: 'collegeId',
  },
  classes: {
    班级名称: 'name',
    年级: 'grade',
    专业ID: 'majorId',
    班主任ID: 'headTeacherId',
  },
  students: {
    学号: 'username',
    姓名: 'name',
    手机号: 'phone',
    邮箱: 'email',
    班级ID: 'classId',
    身份证号: 'idCardNo',
    户籍地: 'householdLocation',
    户籍地址: 'householdAddress',
    毕业中学: 'graduateSchool',
    高考成绩: 'gaokaoScore',
    紧急联系人: 'emergencyContact',
    紧急联系电话: 'emergencyPhone',
  },
  teachers: {
    工号: 'username',
    姓名: 'name',
    手机号: 'phone',
    邮箱: 'email',
    职称: 'title',
    学院ID: 'collegeId',
    学历: 'education',
    学位: 'degree',
    毕业院校: 'graduateSchool',
    户籍地: 'householdLocation',
    身份证号: 'idCardNo',
    入职日期: 'hireDate',
    所属部门: 'department',
  },
  courses: {
    课程代码: 'code',
    课程名称: 'name',
    学分: 'credit',
    专业ID: 'majorId',
    开课学期: 'semester',
    考核方式: 'examType',
    课程性质: 'courseNature',
    总学时: 'totalHours',
    理论学时: 'theoryHours',
    实践学时: 'practiceHours',
    开课单位: 'offeringDepartment',
    教材: 'textbook',
  },
};

/** 导入模板示例行（请替换为真实 ID / 数据） */
const IMPORT_TEMPLATE_SAMPLES: Record<TabKey, Record<string, string>> = {
  colleges: {
    学院代码: 'DEMO',
    学院名称: '示例学院',
    学院简称: '示例',
    简介: '',
  },
  majors: {
    专业代码: 'DEMO01',
    专业名称: '示例专业',
    专业简称: '示例',
    学院ID: '请填写学院UUID',
  },
  classes: {
    班级名称: '示例2401',
    年级: '2024',
    专业ID: '请填写专业UUID',
    班主任ID: '',
  },
  students: {
    学号: '20249999',
    姓名: '张三',
    手机号: '13800138000',
    邮箱: '20249999@stu.edu.cn',
    班级ID: '请填写班级UUID',
    身份证号: '',
    户籍地: '湖南长沙',
    户籍地址: '',
    毕业中学: '',
    高考成绩: '580',
    紧急联系人: '',
    紧急联系电话: '',
  },
  teachers: {
    工号: 'T2099999',
    姓名: '李老师',
    手机号: '13900139000',
    邮箱: 't2099999@univ.edu.cn',
    职称: '讲师',
    学院ID: '请填写学院UUID',
    学历: '硕士',
    学位: '硕士',
    毕业院校: '湖南大学',
    户籍地: '',
    身份证号: '',
    入职日期: '2020-09-01',
    所属部门: '',
  },
  courses: {
    课程代码: 'DEMO101',
    课程名称: '示例课程',
    学分: '3',
    专业ID: '请填写专业UUID',
    开课学期: '1',
    考核方式: 'exam',
    课程性质: 'required',
    总学时: '48',
    理论学时: '32',
    实践学时: '16',
    开课单位: '信息工程学院',
    教材: '《示例教材》',
  },
};

/** 导出 CSV 列：英文字段 + 中文表头 */
const EXPORT_COLUMNS: Record<
  TabKey,
  Array<{ altKeys?: string[]; key: string; label: string }>
> = {
  colleges: [
    { key: 'code', label: '学院代码' },
    { key: 'name', label: '学院名称' },
    { key: 'short_name', label: '学院简称', altKeys: ['shortName'] },
  ],
  majors: [
    { key: 'code', label: '专业代码' },
    { key: 'name', label: '专业名称' },
    { key: 'collegeId', label: '学院ID', altKeys: ['college_id'] },
  ],
  classes: [
    { key: 'name', label: '班级名称' },
    { key: 'grade', label: '年级' },
    { key: 'majorId', label: '专业ID', altKeys: ['major_id'] },
  ],
  students: [
    { key: 'username', label: '学号' },
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'classId', label: '班级ID', altKeys: ['class_id'] },
  ],
  teachers: [
    { key: 'username', label: '工号' },
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'title', label: '职称' },
    { key: 'collegeId', label: '学院ID', altKeys: ['college_id'] },
  ],
  courses: [
    { key: 'code', label: '课程代码' },
    { key: 'name', label: '课程名称' },
    { key: 'credit', label: '学分' },
    { key: 'majorId', label: '专业ID', altKeys: ['major_id'] },
    { key: 'textbook', label: '教材' },
  ],
};

const ALL_TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'colleges', label: '学院列表' },
  { key: 'majors', label: '专业列表' },
  { key: 'classes', label: '行政班' },
  { key: 'students', label: '学生名单' },
  { key: 'teachers', label: '教师名册' },
  { key: 'courses', label: '课程列表' },
];

/** 按组织树层级展示相关 tab（老师挂学院、课程挂专业，不直接绑行政班） */
function getTabsByScope(
  scope: ScopeType,
): Array<{ key: TabKey; label: string }> {
  if (scope === 'class') {
    // 行政班只直接关联学生（班主任在班级详情里看）
    return ALL_TABS.filter((tab) => tab.key === 'students');
  }
  if (scope === 'major') {
    // 专业下看行政班、学生、本专业课程；教师归学院，在学院/全校查看
    return ALL_TABS.filter((tab) =>
      ['classes', 'courses', 'students'].includes(tab.key),
    );
  }
  if (scope === 'college') {
    return ALL_TABS.filter((tab) =>
      ['classes', 'courses', 'majors', 'students', 'teachers'].includes(
        tab.key,
      ),
    );
  }
  // 全部组织：含学院列表
  return ALL_TABS;
}

function getPreferredTab(scope: ScopeType): TabKey {
  if (scope === 'class') return 'students';
  if (scope === 'major') return 'classes';
  if (scope === 'college') return 'majors';
  return 'colleges';
}

const visibleTabs = computed(() => getTabsByScope(selectedScopeType.value));

const gridTitle = computed(() => {
  const map: Record<TabKey, string> = {
    colleges: '学院列表',
    majors: '专业列表',
    classes: '行政班列表',
    students: '学生名单',
    teachers: '教师名册',
    courses: '课程列表',
  };
  return `组织人员 · ${map[activeTab.value]}`;
});

const createModalTitle = computed(() => {
  const map: Record<TabKey, string> = {
    colleges: '新建学院',
    majors: '新建专业',
    classes: '新建行政班',
    students: '新建学生',
    teachers: '新建教师',
    courses: '新建课程',
  };
  return map[activeTab.value];
});

const collegeSelectOptions = computed(() =>
  options.value.colleges.map((item) => ({ label: item.name, value: item.id })),
);

const majorSelectOptions = computed(() =>
  options.value.majors.map((item) => ({ label: item.name, value: item.id })),
);

const classSelectOptions = computed(() =>
  options.value.classes.map((item) => ({
    label: `${item.name}${item.grade ? `（${item.grade}）` : ''}`,
    value: item.id,
  })),
);

const teacherSelectOptions = computed(() =>
  options.value.teachers.map((item) => ({ label: item.name, value: item.id })),
);

const statusColor = (status: string) => {
  if (status === 'active') return 'success';
  if (status === 'locked') return 'error';
  return 'default';
};

function getFormOptionsByTab(tab: TabKey): VbenFormProps {
  const base = {
    collapsed: false,
    showCollapseButton: false,
    // 关闭自动提交，避免切 tab 改 schema 时二次 reload 造成闪烁
    submitOnChange: false,
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
  if (tab === 'colleges') {
    return {
      ...base,
      schema: [
        {
          component: 'Input',
          fieldName: 'keyword',
          label: '关键词',
          componentProps: {
            allowClear: true,
            placeholder: '学院代码/名称/简称',
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
  if (tab === 'colleges')
    return [
      { type: 'checkbox', width: 50 },
      { type: 'seq', title: '序号', width: 60 },
      { field: 'code', title: '学院代码', minWidth: 120 },
      { field: 'name', title: '学院名称', minWidth: 160 },
      { field: 'short_name', title: '简称', minWidth: 100 },
      { field: 'major_count', title: '专业数', minWidth: 80 },
      { field: 'class_count', title: '行政班', minWidth: 80 },
      { field: 'teacher_count', title: '教师数', minWidth: 80 },
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
  pagerConfig: { pageSize: 20, pageSizes: [10, 20, 50] },
  rowConfig: { keyField: 'id' },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        currentFormValues.value = formValues ?? {};
        const result = await listOrgTabApi(activeTab.value, {
          ...formValues,
          scopeType: selectedScopeType.value,
          scopeId: selectedScopeId.value,
          page: page.currentPage,
          pageSize: page.pageSize,
        });
        if (Array.isArray(result)) {
          const start = (page.currentPage - 1) * page.pageSize;
          return {
            items: result.slice(start, start + page.pageSize),
            total: result.length,
          };
        }
        return {
          items: result?.items ?? [],
          total: result?.total ?? 0,
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

async function refreshByTabChange() {
  if (tabSwitching.value) return;
  tabSwitching.value = true;
  try {
    // 先切列配置，不清空已有行，避免白屏闪烁；再异步换搜索表单并加载
    gridApi.setGridOptions({
      columns: getColumnsByTab(activeTab.value),
    });
    await nextTick();
    const reloadPromise = gridApi.reload();
    // 表单 schema 切换放到下一帧，减少主线程阻塞感
    requestAnimationFrame(() => {
      void gridApi.formApi?.setState?.(getFormOptionsByTab(activeTab.value));
    });
    await reloadPromise;
  } finally {
    tabSwitching.value = false;
  }
}

function onTabChange(key: number | string) {
  const next = String(key) as TabKey;
  if (next === activeTab.value) return;
  activeTab.value = next;
  void refreshByTabChange();
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

  const tabs = getTabsByScope(selectedScopeType.value);
  const stillValid = tabs.some((tab) => tab.key === activeTab.value);
  if (!stillValid) {
    activeTab.value = getPreferredTab(selectedScopeType.value);
    void refreshByTabChange();
    return;
  }
  gridApi.reload();
}

function resetCreateForm() {
  createForm.code = '';
  createForm.name = '';
  createForm.shortName = '';
  createForm.description = '';
  createForm.username = '';
  createForm.phone = '';
  createForm.email = '';
  createForm.title = undefined;
  createForm.grade = undefined;
  createForm.credit = undefined;
  createForm.textbook = '';
  createForm.collegeId = undefined;
  createForm.majorId = undefined;
  createForm.classId = undefined;
  createForm.headTeacherId = undefined;
  createForm.idCardNo = '';
  createForm.householdLocation = '';
  createForm.householdAddress = '';
  createForm.graduateSchool = '';
  createForm.gaokaoScore = undefined;
  createForm.emergencyContact = '';
  createForm.emergencyPhone = '';
  createForm.education = undefined;
  createForm.degree = undefined;
  createForm.hireDate = undefined;
  createForm.department = '';
  createForm.semester = '';
  createForm.totalHours = undefined;
  createForm.theoryHours = undefined;
  createForm.practiceHours = undefined;
  createForm.examType = undefined;
  createForm.courseNature = undefined;
  createForm.offeringDepartment = '';
}

function applyScopePrefill() {
  const scope = selectedScopeType.value;
  const id = selectedScopeId.value;
  if (!id) return;

  switch (scope) {
    case 'class': {
      createForm.classId = id;
      const cls = options.value.classes.find((item) => item.id === id);
      if (cls?.major_id) {
        createForm.majorId = cls.major_id;
        const major = options.value.majors.find(
          (item) => item.id === cls.major_id,
        );
        if (major?.college_id) createForm.collegeId = major.college_id;
      }

      break;
    }
    case 'college': {
      createForm.collegeId = id;

      break;
    }
    case 'major': {
      createForm.majorId = id;
      const major = options.value.majors.find((item) => item.id === id);
      if (major?.college_id) createForm.collegeId = major.college_id;

      break;
    }
    // No default
  }
}

async function openCreateModal() {
  resetCreateForm();
  try {
    const remote = await getOrgOptionsApi();
    options.value = {
      classes: Array.isArray(remote?.classes) ? remote.classes : [],
      colleges: Array.isArray(remote?.colleges) ? remote.colleges : [],
      majors: Array.isArray(remote?.majors) ? remote.majors : [],
      teachers: Array.isArray(remote?.teachers) ? remote.teachers : [],
    };
  } catch {
    options.value = { classes: [], colleges: [], majors: [], teachers: [] };
    message.warning('选项数据加载失败，可稍后重试');
  }
  applyScopePrefill();
  createOpen.value = true;
}

function buildCreatePayload(): null | Record<string, any> {
  const tab = activeTab.value;
  if (tab === 'colleges') {
    if (!createForm.code?.trim() || !createForm.name?.trim()) {
      message.warning('请填写学院代码和名称');
      return null;
    }
    return {
      code: createForm.code.trim(),
      name: createForm.name.trim(),
      shortName: createForm.shortName?.trim() || '',
      description: createForm.description?.trim() || '',
    };
  }
  if (tab === 'majors') {
    if (
      !createForm.code?.trim() ||
      !createForm.name?.trim() ||
      !createForm.collegeId
    ) {
      message.warning('请填写专业代码、名称并选择学院');
      return null;
    }
    return {
      code: createForm.code.trim(),
      name: createForm.name.trim(),
      shortName: createForm.shortName?.trim() || '',
      collegeId: createForm.collegeId,
    };
  }
  if (tab === 'classes') {
    if (!createForm.name?.trim() || !createForm.grade || !createForm.majorId) {
      message.warning('请填写班级名称、年级并选择专业');
      return null;
    }
    return {
      name: createForm.name.trim(),
      grade: String(createForm.grade),
      majorId: createForm.majorId,
      headTeacherId: createForm.headTeacherId || undefined,
    };
  }
  if (tab === 'students') {
    if (
      !createForm.username?.trim() ||
      !createForm.name?.trim() ||
      !createForm.classId
    ) {
      message.warning('请填写学号、姓名并选择班级');
      return null;
    }
    return {
      username: createForm.username.trim(),
      name: createForm.name.trim(),
      phone: createForm.phone?.trim() || '',
      email: createForm.email?.trim() || '',
      classId: createForm.classId,
      idCardNo: createForm.idCardNo?.trim() || '',
      householdLocation: createForm.householdLocation?.trim() || '',
      householdAddress: createForm.householdAddress?.trim() || '',
      graduateSchool: createForm.graduateSchool?.trim() || '',
      gaokaoScore: createForm.gaokaoScore ?? undefined,
      emergencyContact: createForm.emergencyContact?.trim() || '',
      emergencyPhone: createForm.emergencyPhone?.trim() || '',
    };
  }
  if (tab === 'teachers') {
    if (
      !createForm.username?.trim() ||
      !createForm.name?.trim() ||
      !createForm.collegeId
    ) {
      message.warning('请填写工号、姓名并选择学院');
      return null;
    }
    return {
      username: createForm.username.trim(),
      name: createForm.name.trim(),
      phone: createForm.phone?.trim() || '',
      email: createForm.email?.trim() || '',
      title: createForm.title || '',
      collegeId: createForm.collegeId,
      education: createForm.education || '',
      degree: createForm.degree || '',
      graduateSchool: createForm.graduateSchool?.trim() || '',
      householdLocation: createForm.householdLocation?.trim() || '',
      idCardNo: createForm.idCardNo?.trim() || '',
      hireDate: createForm.hireDate || undefined,
      department: createForm.department?.trim() || '',
    };
  }
  // courses
  if (
    !createForm.code?.trim() ||
    !createForm.name?.trim() ||
    !createForm.majorId
  ) {
    message.warning('请填写课程代码、名称并选择专业');
    return null;
  }
  return {
    code: createForm.code.trim(),
    name: createForm.name.trim(),
    credit: createForm.credit ?? undefined,
    majorId: createForm.majorId,
    semester: createForm.semester?.trim() || '',
    examType: createForm.examType || undefined,
    courseNature: createForm.courseNature || undefined,
    totalHours: createForm.totalHours ?? undefined,
    theoryHours: createForm.theoryHours ?? undefined,
    practiceHours: createForm.practiceHours ?? undefined,
    offeringDepartment: createForm.offeringDepartment?.trim() || '',
    textbook: createForm.textbook?.trim() || '',
  };
}

async function handleCreateSubmit() {
  const payload = buildCreatePayload();
  if (!payload) return;
  createSubmitting.value = true;
  try {
    await createOrgRowApi(activeTab.value, payload);
    message.success('新建成功');
    createOpen.value = false;
    gridApi.reload();
    await loadTree();
  } catch {
    message.error('新建失败');
  } finally {
    createSubmitting.value = false;
  }
}

function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function pickRowValue(
  row: Record<string, any>,
  key: string,
  altKeys: string[] = [],
) {
  if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
    return row[key];
  }
  for (const alt of altKeys) {
    if (row[alt] !== null && row[alt] !== undefined && row[alt] !== '') {
      return row[alt];
    }
  }
  return '';
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleExport() {
  try {
    const result = await exportOrgTabApi(activeTab.value, {
      ...currentFormValues.value,
      scopeType: selectedScopeType.value,
      scopeId: selectedScopeId.value,
    });
    let rows: Record<string, any>[] = [];
    if (Array.isArray(result)) {
      rows = result;
    } else if (Array.isArray(result?.items)) {
      rows = result.items;
    }
    const columns = EXPORT_COLUMNS[activeTab.value];
    const header = columns.map((col) => escapeCsvCell(col.label)).join(',');
    const body = rows
      .map((row: Record<string, any>) =>
        columns
          .map((col) =>
            escapeCsvCell(pickRowValue(row, col.key, col.altKeys || [])),
          )
          .join(','),
      )
      .join('\n');
    downloadCsv(`org-${activeTab.value}.csv`, `${header}\n${body}`);
    message.success(`已导出 ${rows.length} 条`);
  } catch {
    message.error('导出失败');
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
      continue;
    }
    switch (ch) {
      case '\n': {
        row.push(current);
        current = '';
        if (row.some((cell) => cell.trim() !== '')) rows.push(row);
        row = [];

        break;
      }
      case '\r': {
        // ignore CR (CRLF handled by LF)

        break;
      }
      case '"': {
        inQuotes = true;

        break;
      }
      case ',': {
        row.push(current);
        current = '';

        break;
      }
      default: {
        current += ch;
      }
    }
  }
  row.push(current);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

function downloadImportTemplate() {
  const tab = activeTab.value;
  const headers = Object.keys(IMPORT_HEADER_MAP[tab]);
  const sample = IMPORT_TEMPLATE_SAMPLES[tab];
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
  const sampleLine = headers
    .map((h) => escapeCsvCell(sample[h] ?? ''))
    .join(',');
  const tipLine = headers
    .map((_h, index) =>
      escapeCsvCell(
        index === 0
          ? '说明：请删除本行与示例行后填写；学院ID/专业ID/班级ID可从对应列表「导出」中复制'
          : '',
      ),
    )
    .join(',');
  downloadCsv(
    `org-${tab}-导入模板.csv`,
    `${headerLine}\n${sampleLine}\n${tipLine}`,
  );
  message.success('模板已下载，请按表头填写后导入');
}

function triggerImport() {
  importInputRef.value?.click();
}

function onImportMenuClick(info: { key: number | string }) {
  if (String(info.key) === 'template') {
    downloadImportTemplate();
    return;
  }
  if (String(info.key) === 'file') {
    triggerImport();
  }
}

async function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  try {
    const text = await file.text();
    const table = parseCsv(text.replace(/^\uFEFF/, ''));
    if (table.length < 2) {
      message.warning('CSV 无有效数据行');
      return;
    }
    const headerRow = table[0];
    if (!headerRow) {
      message.warning('CSV 无有效表头');
      return;
    }
    const headers = headerRow.map((h) => h.trim());
    const keyMap = IMPORT_HEADER_MAP[activeTab.value];
    const mappedKeys = headers.map((h) => keyMap[h] || '');
    if (!mappedKeys.some(Boolean)) {
      message.warning('未识别到有效的中文表头，请检查 CSV 格式');
      return;
    }
    const rows = table
      .slice(1)
      .map((cells) => {
        const record: Record<string, any> = {};
        mappedKeys.forEach((key, idx) => {
          if (!key) return;
          const raw = (cells[idx] ?? '').trim();
          if (
            key === 'credit' ||
            key === 'gaokaoScore' ||
            key === 'totalHours' ||
            key === 'theoryHours' ||
            key === 'practiceHours'
          ) {
            record[key] = raw === '' ? undefined : Number(raw);
          } else {
            record[key] = raw;
          }
        });
        return record;
      })
      .filter((record) => {
        const values = Object.values(record).map((v) => String(v ?? ''));
        if (
          values.some((v) => v.startsWith('说明：') || v.includes('请填写'))
        ) {
          return false;
        }
        return values.some((v) => v.trim() !== '');
      });

    if (rows.length === 0) {
      message.warning('没有可导入的数据行（请删除模板说明行后填写）');
      return;
    }

    const result = await importOrgTabApi(activeTab.value, rows);
    const success = result?.success ?? 0;
    const failed = result?.failed ?? 0;
    if (failed > 0) {
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      message.warning(
        `导入完成：成功 ${success} 条，失败 ${failed} 条${
          errors.length > 0 ? `（${errors.slice(0, 3).join('；')}）` : ''
        }`,
      );
    } else {
      message.success(`导入成功 ${success} 条`);
    }
    gridApi.reload();
    await loadTree();
  } catch {
    message.error('导入失败');
  }
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

async function showDetail(row: Record<string, any>) {
  try {
    const detail = await getOrgDetailApi(activeTab.value, row.id);
    detailTitle.value = `${row.name || row.code || '详情'} · 明细`;
    detailItems.value = Array.isArray(detail?.items) ? detail.items : [];
    if (detailItems.value.length === 0) {
      detailItems.value = [{ label: '提示', value: '暂无详情数据' }];
    }
    detailOpen.value = true;
  } catch {
    message.error('详情加载失败');
  }
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
        <Tabs :active-key="activeTab" class="org-tabs" @change="onTabChange">
          <Tabs.TabPane
            v-for="tab in visibleTabs"
            :key="tab.key"
            :tab="tab.label"
          />
        </Tabs>
        <Grid :table-title="gridTitle" class="org-grid">
          <template #toolbar-tools>
            <Space>
              <Button type="primary" @click="openCreateModal">新建</Button>
              <Button danger @click="handleBatchDelete">批量删除</Button>
              <Dropdown
                :trigger="['click']"
                placement="bottomLeft"
                :get-popup-container="getPopupContainer"
              >
                <Button>导入</Button>
                <template #overlay>
                  <Menu @click="onImportMenuClick">
                    <Menu.Item key="template">下载模板</Menu.Item>
                    <Menu.Item key="file">选择文件导入</Menu.Item>
                  </Menu>
                </template>
              </Dropdown>
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

    <input
      ref="importInputRef"
      type="file"
      accept=".csv"
      class="org-import-input"
      @change="onImportFileChange"
    />

    <Modal
      v-model:open="detailOpen"
      centered
      :title="detailTitle"
      width="860px"
      footer=""
    >
      <Descriptions :column="2" bordered size="small">
        <Descriptions.Item
          v-for="(item, index) in detailItems"
          :key="`${item.label}-${index}`"
          :label="item.label"
        >
          {{ item.value }}
        </Descriptions.Item>
      </Descriptions>
    </Modal>

    <Modal
      v-model:open="createOpen"
      centered
      :title="createModalTitle"
      :confirm-loading="createSubmitting"
      width="780px"
      destroy-on-close
      @ok="handleCreateSubmit"
    >
      <Form layout="vertical" class="org-create-form">
        <template v-if="activeTab === 'colleges'">
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item label="学院代码" required>
                <Input
                  v-model:value="createForm.code"
                  placeholder="请输入学院代码"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="学院名称" required>
                <Input
                  v-model:value="createForm.name"
                  placeholder="请输入学院名称"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="简称">
                <Input
                  v-model:value="createForm.shortName"
                  placeholder="可选，默认取名称前缀"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="简介">
                <Input
                  v-model:value="createForm.description"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
          </Row>
        </template>

        <template v-else-if="activeTab === 'majors'">
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item label="专业代码" required>
                <Input
                  v-model:value="createForm.code"
                  placeholder="请输入专业代码"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="专业名称" required>
                <Input
                  v-model:value="createForm.name"
                  placeholder="请输入专业名称"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="简称">
                <Input
                  v-model:value="createForm.shortName"
                  placeholder="可选，默认取名称前缀"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="所属学院" required>
                <Select
                  v-model:value="createForm.collegeId"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  :options="collegeSelectOptions"
                  placeholder="请选择学院"
                />
              </Form.Item>
            </Col>
          </Row>
        </template>

        <template v-else-if="activeTab === 'classes'">
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item label="班级名称" required>
                <Input
                  v-model:value="createForm.name"
                  placeholder="请输入班级名称"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="年级" required>
                <Select
                  v-model:value="createForm.grade"
                  allow-clear
                  :options="[
                    { label: '2023级', value: '2023' },
                    { label: '2024级', value: '2024' },
                    { label: '2025级', value: '2025' },
                  ]"
                  placeholder="请选择年级"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="所属专业" required>
                <Select
                  v-model:value="createForm.majorId"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  :options="majorSelectOptions"
                  placeholder="请选择专业"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="班主任">
                <Select
                  v-model:value="createForm.headTeacherId"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  :options="teacherSelectOptions"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
          </Row>
        </template>

        <template v-else-if="activeTab === 'students'">
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item label="学号" required>
                <Input
                  v-model:value="createForm.username"
                  placeholder="请输入学号"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="姓名" required>
                <Input
                  v-model:value="createForm.name"
                  placeholder="请输入姓名"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="手机号">
                <Input
                  v-model:value="createForm.phone"
                  placeholder="请输入手机号"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="邮箱">
                <Input v-model:value="createForm.email" placeholder="可选" />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="行政班" required>
                <Select
                  v-model:value="createForm.classId"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  :options="classSelectOptions"
                  placeholder="请选择班级"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="身份证号">
                <Input v-model:value="createForm.idCardNo" placeholder="可选" />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="户籍地">
                <Input
                  v-model:value="createForm.householdLocation"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="户籍地址">
                <Input
                  v-model:value="createForm.householdAddress"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="毕业院校">
                <Input
                  v-model:value="createForm.graduateSchool"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="高考成绩">
                <InputNumber
                  v-model:value="createForm.gaokaoScore"
                  :min="0"
                  class="org-credit-input"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="紧急联系人">
                <Input
                  v-model:value="createForm.emergencyContact"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="紧急联系电话">
                <Input
                  v-model:value="createForm.emergencyPhone"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
          </Row>
        </template>

        <template v-else-if="activeTab === 'teachers'">
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item label="工号" required>
                <Input
                  v-model:value="createForm.username"
                  placeholder="请输入工号"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="姓名" required>
                <Input
                  v-model:value="createForm.name"
                  placeholder="请输入姓名"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="手机号">
                <Input
                  v-model:value="createForm.phone"
                  placeholder="请输入手机号"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="邮箱">
                <Input v-model:value="createForm.email" placeholder="可选" />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="职称">
                <Select
                  v-model:value="createForm.title"
                  allow-clear
                  :options="[
                    { label: '助教', value: '助教' },
                    { label: '讲师', value: '讲师' },
                    { label: '副教授', value: '副教授' },
                    { label: '教授', value: '教授' },
                  ]"
                  placeholder="请选择职称"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="所属学院" required>
                <Select
                  v-model:value="createForm.collegeId"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  :options="collegeSelectOptions"
                  placeholder="请选择学院"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="学历">
                <Select
                  v-model:value="createForm.education"
                  allow-clear
                  :options="[
                    { label: '本科', value: '本科' },
                    { label: '硕士', value: '硕士' },
                    { label: '博士', value: '博士' },
                  ]"
                  placeholder="请选择学历"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="学位">
                <Select
                  v-model:value="createForm.degree"
                  allow-clear
                  :options="[
                    { label: '学士', value: '学士' },
                    { label: '硕士', value: '硕士' },
                    { label: '博士', value: '博士' },
                  ]"
                  placeholder="请选择学位"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="毕业院校">
                <Input
                  v-model:value="createForm.graduateSchool"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="户籍地">
                <Input
                  v-model:value="createForm.householdLocation"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="身份证号">
                <Input v-model:value="createForm.idCardNo" placeholder="可选" />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="入职日期">
                <DatePicker
                  v-model:value="createForm.hireDate"
                  value-format="YYYY-MM-DD"
                  class="org-credit-input"
                  placeholder="请选择日期"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="所属部门">
                <Input
                  v-model:value="createForm.department"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
          </Row>
        </template>

        <template v-else>
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item label="课程代码" required>
                <Input
                  v-model:value="createForm.code"
                  placeholder="请输入课程代码"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="课程名称" required>
                <Input
                  v-model:value="createForm.name"
                  placeholder="请输入课程名称"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="学分">
                <InputNumber
                  v-model:value="createForm.credit"
                  :min="0"
                  :step="0.5"
                  class="org-credit-input"
                  placeholder="学分"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="所属专业" required>
                <Select
                  v-model:value="createForm.majorId"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  :options="majorSelectOptions"
                  placeholder="请选择专业"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="学期">
                <Input v-model:value="createForm.semester" placeholder="如 1" />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="考核方式">
                <Select
                  v-model:value="createForm.examType"
                  allow-clear
                  :options="[
                    { label: '考试', value: 'exam' },
                    { label: '考查', value: 'assessment' },
                  ]"
                  placeholder="请选择"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="课程性质">
                <Select
                  v-model:value="createForm.courseNature"
                  allow-clear
                  :options="[
                    { label: '必修', value: 'required' },
                    { label: '选修', value: 'elective' },
                  ]"
                  placeholder="请选择"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="总学时">
                <InputNumber
                  v-model:value="createForm.totalHours"
                  :min="0"
                  class="org-credit-input"
                  placeholder="总学时"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="理论学时">
                <InputNumber
                  v-model:value="createForm.theoryHours"
                  :min="0"
                  class="org-credit-input"
                  placeholder="理论学时"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="实践学时">
                <InputNumber
                  v-model:value="createForm.practiceHours"
                  :min="0"
                  class="org-credit-input"
                  placeholder="实践学时"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="开课单位">
                <Input
                  v-model:value="createForm.offeringDepartment"
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="教材">
                <Input
                  v-model:value="createForm.textbook"
                  placeholder="请输入教材"
                />
              </Form.Item>
            </Col>
          </Row>
        </template>
      </Form>
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

.org-tree {
  flex: 1;
  min-height: 0;
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

.org-import-input {
  display: none;
}

.org-create-form {
  margin-top: 8px;
}

.org-credit-input {
  width: 100%;
}
</style>
