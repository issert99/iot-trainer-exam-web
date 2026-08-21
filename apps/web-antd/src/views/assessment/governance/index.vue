<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  appendSchoolAudit,
  persistSchoolState,
  resetSchoolPrototype,
  schoolAssessmentState,
  verifySchoolAuditChain,
} from '../stores/state';

defineOptions({ name: 'AssessmentGovernance' });

const activeTab = ref('school');
const settingTabs = [
  { key: 'school', label: '学校信息' },
  { key: 'permissions', label: '角色权限' },
  { key: 'audit', label: '审计日志' },
  { key: 'standards', label: '字典与开放标准' },
];

const schoolForm = reactive({
  academicYear: schoolAssessmentState.school.academicYear,
  code: schoolAssessmentState.school.code,
  name: schoolAssessmentState.school.name,
  semester: schoolAssessmentState.school.semester,
});

const rolePermissionRows = [
  {
    analytics: '管理',
    exams: '管理',
    items: '管理',
    key: 'system-admin',
    papers: '管理',
    role: '系统管理员',
    scoring: '管理',
    settings: '管理',
    teaching: '管理',
  },
  {
    analytics: '查看',
    exams: '管理',
    items: '查看',
    key: 'academic-admin',
    papers: '查看',
    role: '教务管理员',
    scoring: '查看',
    settings: '—',
    teaching: '管理',
  },
  {
    analytics: '查看',
    exams: '查看',
    items: '编辑',
    key: 'author',
    papers: '参与',
    role: '命题教师',
    scoring: '参与',
    settings: '—',
    teaching: '查看',
  },
  {
    analytics: '查看',
    exams: '查看',
    items: '审核',
    key: 'reviewer',
    papers: '查看',
    role: '审核教师',
    scoring: '—',
    settings: '—',
    teaching: '查看',
  },
  {
    analytics: '查看',
    exams: '管理',
    items: '查看',
    key: 'exam-officer',
    papers: '管理',
    role: '考务人员',
    scoring: '查看',
    settings: '—',
    teaching: '查看',
  },
  {
    analytics: '查看',
    exams: '查看',
    items: '查看',
    key: 'marker',
    papers: '查看',
    role: '阅卷教师',
    scoring: '处理',
    settings: '—',
    teaching: '查看',
  },
  {
    analytics: '分析',
    exams: '查看',
    items: '查看',
    key: 'analyst',
    papers: '查看',
    role: '质量分析员',
    scoring: '查看',
    settings: '—',
    teaching: '查看',
  },
  {
    analytics: '—',
    exams: '参加',
    items: '—',
    key: 'student',
    papers: '—',
    role: '学生',
    scoring: '查看本人',
    settings: '—',
    teaching: '—',
  },
];

const dictionaryGroups = [
  {
    code: '题目状态',
    values: [
      '草稿',
      '待审核',
      '已批准',
      '已发布',
      '已退回',
      '已暂停',
      '已归档',
    ],
  },
  {
    code: '试卷状态',
    values: ['草稿', '校样中', '待审批', '已封存', '已归档'],
  },
  {
    code: '考试状态',
    values: ['草稿', '已排期', '就绪', '进行中', '阅卷中', '待发布', '已发布'],
  },
  {
    code: '交付方式',
    values: ['在线机考', '纸笔考试', '实践考试'],
  },
];

const openStandards = [
  {
    code: 'QTI 3.0.1',
    description: '题目、交互与试卷结构交换',
    name: '问题与测试互操作规范',
    status: '已支持基础导出',
  },
  {
    code: 'LTI 1.3',
    description: '学习平台与外部工具接入边界',
    name: '学习工具互操作规范',
    status: '接口预留',
  },
  {
    code: 'OneRoster 1.2',
    description: '课程、班级与学生名单交换',
    name: '教学名册交换规范',
    status: '规划中',
  },
  {
    code: 'xAPI 1.0.3',
    description: '学习活动与考试事件描述',
    name: '学习活动经验规范',
    status: '规划中',
  },
];

const auditRecords = computed(() =>
  schoolAssessmentState.auditRecords.toReversed(),
);
const auditChainIntact = computed(() => verifySchoolAuditChain());

const actionLabels: Record<string, string> = {
  'attempt.started': '开始作答',
  'attempt.submitted': '提交答卷',
  'exam.created': '创建考试',
  'exam.in-progress': '考试开始',
  'exam.published': '发布成绩',
  'interaction-template.enabled': '启用交互模板',
  'interaction-template.saved': '保存交互模板',
  'item.created': '创建题目',
  'item.published': '发布题目',
  'item.revision-created': '创建题目版本',
  'item.review-approve': '审核通过题目',
  'item.review-reject': '退回题目',
  'item.review-submitted': '提交题目审核',
  'item.suspended': '暂停题目',
  'paper.assembled': '完成组卷',
  'paper.sealed': '封存试卷',
  'plugin.disabled': '停用插件',
  'plugin.enabled': '启用插件',
  'plugin.testing': '插件进入测试',
  'result.published': '发布成绩',
  'score.finalized': '完成成绩复核',
  'score.first-marked': '完成一评',
  'score.second-marked': '完成二评',
  'settings.school-updated': '更新学校信息',
};
const resourceLabels: Record<string, string> = {
  attempt: '答卷',
  'exam-event': '考试场次',
  'interaction-template': '交互模板',
  'item-revision': '题目版本',
  'plugin-package': '交互插件',
  school: '学校设置',
  'score-record': '评分记录',
  'test-form': '试卷版本',
};

function permissionColor(value: string) {
  if (value === '—') return 'default';
  if (['参加', '查看', '查看本人'].includes(value)) return 'blue';
  if (['参与', '处理', '编辑'].includes(value)) return 'cyan';
  if (['分析', '审核'].includes(value)) return 'purple';
  return 'green';
}

function permissionValue(record: Record<string, string>, key: unknown) {
  return record[String(key)] ?? '—';
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function shortChecksum(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function saveSchoolInfo() {
  const name = schoolForm.name.trim();
  const code = schoolForm.code.trim().toLocaleUpperCase();
  const academicYear = schoolForm.academicYear.trim();
  const semester = schoolForm.semester.trim();
  if (!name || !code || !academicYear || !semester) {
    message.warning('请完整填写学校信息');
    return;
  }
  Object.assign(schoolAssessmentState.school, {
    academicYear,
    code,
    name,
    semester,
  });
  Object.assign(schoolForm, schoolAssessmentState.school);
  appendSchoolAudit({
    action: 'settings.school-updated',
    actorId: 'system-admin',
    metadata: { academicYear, code, semester },
    resourceId: schoolAssessmentState.school.id,
    resourceType: 'school',
  });
  persistSchoolState();
  message.success('学校信息已保存到本地原型');
}

function resetPrototype() {
  resetSchoolPrototype();
  Object.assign(schoolForm, schoolAssessmentState.school);
  activeTab.value = 'school';
  message.success('演示数据已恢复为初始状态');
}
</script>

<template>
  <Page>
    <div class="settings-page">
      <section class="heading">
        <div>
          <Tag color="blue">单校管理</Tag>
          <h1>系统设置</h1>
          <p>维护学校基础信息、校内角色权限、审计日志、业务字典与开放标准。</p>
        </div>
        <Popconfirm
          title="确定重置演示数据吗？"
          description="本地原型中的所有操作记录和业务变更都将恢复。"
          ok-text="确认重置"
          cancel-text="取消"
          @confirm="resetPrototype"
        >
          <Button danger>重置原型数据</Button>
        </Popconfirm>
      </section>

      <Alert
        type="info"
        show-icon
        message="设置保存在当前浏览器"
        description="本页面用于验证单校配置流程，不调用远程接口；重置按钮可恢复初始演示数据。"
      />

      <Row :gutter="[16, 16]">
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="组织节点"
              :value="schoolAssessmentState.organizationNodes.length"
              suffix="个"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="课程"
              :value="schoolAssessmentState.courses.length"
              suffix="门"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="专业"
              :value="schoolAssessmentState.majors.length"
              suffix="个"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="审计记录"
              :value="schoolAssessmentState.auditRecords.length"
              suffix="条"
            />
          </Card>
        </Col>
      </Row>

      <Card :bordered="false">
        <Tabs v-model:active-key="activeTab" :items="settingTabs" />

        <template v-if="activeTab === 'school'">
          <Row :gutter="[16, 16]">
            <Col :xs="24" :lg="14">
              <Card title="学校基础信息" size="small">
                <Form layout="vertical">
                  <Row :gutter="16">
                    <Col :xs="24" :md="14">
                      <Form.Item label="学校名称" required>
                        <Input
                          v-model:value="schoolForm.name"
                          placeholder="请输入学校名称"
                        />
                      </Form.Item>
                    </Col>
                    <Col :xs="24" :md="10">
                      <Form.Item label="学校代码" required>
                        <Input
                          v-model:value="schoolForm.code"
                          placeholder="请输入学校代码"
                        />
                      </Form.Item>
                    </Col>
                    <Col :xs="24" :md="12">
                      <Form.Item label="当前学年" required>
                        <Input
                          v-model:value="schoolForm.academicYear"
                          placeholder="例如：2025-2026"
                        />
                      </Form.Item>
                    </Col>
                    <Col :xs="24" :md="12">
                      <Form.Item label="当前学期" required>
                        <Input
                          v-model:value="schoolForm.semester"
                          placeholder="例如：第二学期"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" @click="saveSchoolInfo">
                    保存学校信息
                  </Button>
                </Form>
              </Card>
            </Col>
            <Col :xs="24" :lg="10">
              <Card title="当前配置摘要" size="small">
                <Descriptions bordered :column="1" size="small">
                  <Descriptions.Item label="学校标识">
                    {{ schoolAssessmentState.school.id }}
                  </Descriptions.Item>
                  <Descriptions.Item label="学校名称">
                    {{ schoolAssessmentState.school.name }}
                  </Descriptions.Item>
                  <Descriptions.Item label="学年学期">
                    {{ schoolAssessmentState.school.academicYear }} ·
                    {{ schoolAssessmentState.school.semester }}
                  </Descriptions.Item>
                  <Descriptions.Item label="学院与教学单位">
                    {{
                      schoolAssessmentState.organizationNodes.filter(
                        (node) => node.type !== 'school',
                      ).length
                    }}
                    个
                  </Descriptions.Item>
                  <Descriptions.Item label="分类体系">
                    {{ schoolAssessmentState.taxonomySchemes.length }} 套
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        </template>

        <template v-else-if="activeTab === 'permissions'">
          <Alert
            class="mb-4"
            type="info"
            show-icon
            message="按岗位授予最小必要权限"
            description="矩阵用于展示校内职责边界；正式授权还需结合人员、组织范围和考试场次进行审批。"
          />
          <Table
            row-key="key"
            :data-source="rolePermissionRows"
            :pagination="false"
            :scroll="{ x: 1050 }"
            :columns="[
              {
                title: '校内角色',
                dataIndex: 'role',
                fixed: 'left',
                width: 130,
              },
              { title: '教学体系', key: 'teaching', width: 110 },
              { title: '题目中心', key: 'items', width: 110 },
              { title: '试卷中心', key: 'papers', width: 110 },
              { title: '考试中心', key: 'exams', width: 110 },
              { title: '评分中心', key: 'scoring', width: 110 },
              { title: '数据分析', key: 'analytics', width: 110 },
              { title: '系统设置', key: 'settings', width: 110 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template
                v-if="
                  [
                    'analytics',
                    'exams',
                    'items',
                    'papers',
                    'scoring',
                    'settings',
                    'teaching',
                  ].includes(String(column.key))
                "
              >
                <Tag
                  :color="permissionColor(permissionValue(record, column.key))"
                >
                  {{ permissionValue(record, column.key) }}
                </Tag>
              </template>
            </template>
          </Table>
        </template>

        <template v-else-if="activeTab === 'audit'">
          <Alert
            class="mb-4"
            show-icon
            :type="auditChainIntact ? 'success' : 'error'"
            :message="
              auditChainIntact ? '校内审计链顺序完整' : '审计链连续性异常'
            "
            description="校内操作按前序校验值串联；当前原型只验证记录顺序连续性，不等同于正式不可篡改存证。"
          />
          <Table
            row-key="id"
            :data-source="auditRecords"
            :pagination="{ pageSize: 10 }"
            :scroll="{ x: 1050 }"
            :columns="[
              { title: '时间', key: 'time', width: 180 },
              { title: '操作', key: 'action', width: 180 },
              { title: '操作者', dataIndex: 'actorId', width: 150 },
              { title: '资源', key: 'resource', width: 140 },
              { title: '结果', key: 'outcome', width: 90 },
              { title: '前序校验值', key: 'previousHash', width: 170 },
              { title: '本条校验值', key: 'chainHash', width: 170 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'time'">
                {{ formatTime(record.occurredAt) }}
              </template>
              <template v-else-if="column.key === 'action'">
                {{ actionLabels[record.action] || record.action }}
              </template>
              <template v-else-if="column.key === 'resource'">
                {{ resourceLabels[record.resourceType] || record.resourceType }}
              </template>
              <template v-else-if="column.key === 'outcome'">
                <Tag
                  :color="
                    record.outcome === 'success'
                      ? 'success'
                      : record.outcome === 'denied'
                        ? 'warning'
                        : 'error'
                  "
                >
                  {{
                    record.outcome === 'success'
                      ? '成功'
                      : record.outcome === 'denied'
                        ? '已拒绝'
                        : '失败'
                  }}
                </Tag>
              </template>
              <template
                v-else-if="
                  column.key === 'previousHash' || column.key === 'chainHash'
                "
              >
                <code :title="record[column.key]">
                  {{ shortChecksum(record[column.key]) }}
                </code>
              </template>
            </template>
          </Table>
        </template>

        <template v-else>
          <div class="standards-grid">
            <Card title="业务字典" size="small">
              <div class="dictionary-list">
                <article
                  v-for="dictionary in dictionaryGroups"
                  :key="dictionary.code"
                >
                  <strong>{{ dictionary.code }}</strong>
                  <Space wrap>
                    <Tag
                      v-for="value in dictionary.values"
                      :key="value"
                      color="blue"
                    >
                      {{ value }}
                    </Tag>
                  </Space>
                </article>
              </div>
            </Card>

            <Card title="开放标准" size="small">
              <div class="standard-list">
                <article v-for="standard in openStandards" :key="standard.code">
                  <div>
                    <strong>{{ standard.name }}</strong>
                    <p>{{ standard.description }}</p>
                  </div>
                  <div class="standard-status">
                    <Tag color="geekblue">{{ standard.code }}</Tag>
                    <Tag>{{ standard.status }}</Tag>
                  </div>
                </article>
              </div>
            </Card>
          </div>
          <Alert
            class="mt-4"
            type="info"
            show-icon
            message="开放标准作为系统边界"
            description="校内领域模型保留完整语义，对外交换时再映射为相应标准格式；当前页面不发起外部连接。"
          />
        </template>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.heading h1 {
  margin: 8px 0 4px;
  font-size: 26px;
}

.heading p,
.standard-list p {
  margin: 0;
  color: hsl(var(--foreground) / 60%);
}

.standards-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.dictionary-list,
.standard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dictionary-list article {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 14px;
  align-items: start;
  padding: 14px;
  background: hsl(var(--muted) / 28%);
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.standard-list article {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  border-bottom: 1px solid hsl(var(--border));
}

.standard-list article:last-child {
  border-bottom: 0;
}

.standard-list p {
  margin-top: 5px;
}

.standard-status {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

code {
  font-size: 12px;
  color: hsl(var(--foreground) / 72%);
}

@media (max-width: 900px) {
  .standards-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .dictionary-list article {
    grid-template-columns: 1fr;
  }

  .standard-list article {
    flex-direction: column;
    align-items: flex-start;
  }

  .standard-status {
    flex-direction: row;
    align-items: center;
  }
}
</style>
