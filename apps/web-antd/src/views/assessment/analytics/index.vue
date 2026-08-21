<script lang="ts" setup>
import type { ScoreRecord } from '../domain/types';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Statistic,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import { schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentAnalytics' });

const minimumAnalysisSample = 30;
const activeTab = ref('items');

const analysisTabs = [
  { key: 'items', label: '题目质量' },
  { key: 'papers', label: '试卷质量' },
  { key: 'courses', label: '课程达成' },
  { key: 'majors', label: '专业 / 班级' },
  { key: 'plugins', label: '插件质量' },
];

const channelLabels: Record<string, string> = {
  online: '在线机考',
  practical: '实践考试',
  print: '纸笔考试',
};
const pluginStatusLabels: Record<string, string> = {
  deprecated: '已弃用',
  disabled: '已停用',
  draft: '草稿',
  enabled: '已启用',
  testing: '测试中',
};

function rateOf(records: ScoreRecord[]) {
  const maximum = records.reduce((total, record) => total + record.maxScore, 0);
  if (maximum <= 0) return null;
  const awarded = records.reduce(
    (total, record) => total + record.awardedScore,
    0,
  );
  return Math.round((awarded / maximum) * 100);
}

function uniqueAttemptCount(records: ScoreRecord[]) {
  return new Set(records.map((record) => record.attemptId)).size;
}

function sampleConclusion(sampleCount: number) {
  if (sampleCount === 0) return '暂无作答';
  if (sampleCount < minimumAnalysisSample) return '小样本，仅供观察';
  return '达到基础分析门槛';
}

function pluginName(pluginId: string) {
  return (
    schoolAssessmentState.pluginPackages.find(
      (plugin) => plugin.id === pluginId,
    )?.name ?? pluginId
  );
}

const overallScoreRate = computed(
  () => rateOf(schoolAssessmentState.scoreRecords) ?? 0,
);
const scoredAttemptCount = computed(() =>
  uniqueAttemptCount(schoolAssessmentState.scoreRecords),
);
const pendingManualCount = computed(
  () =>
    schoolAssessmentState.scoreRecords.filter(
      (record) => record.method !== 'automatic' && record.status !== 'final',
    ).length,
);
const isSmallSample = computed(
  () => scoredAttemptCount.value < minimumAnalysisSample,
);

const itemRows = computed(() =>
  schoolAssessmentState.itemRevisions.map((item) => {
    const records = schoolAssessmentState.scoreRecords.filter(
      (record) => record.itemRevisionId === item.id,
    );
    const sampleCount = uniqueAttemptCount(records);
    return {
      conclusion: sampleConclusion(sampleCount),
      designDifficulty: item.metadata.difficulty,
      id: item.id,
      plugin: pluginName(item.interaction.pluginId),
      rate: rateOf(records),
      sampleCount,
      title: item.title,
    };
  }),
);

const paperRows = computed(() =>
  schoolAssessmentState.forms.map((form) => {
    const attempts = schoolAssessmentState.attempts.filter(
      (attempt) => attempt.testFormRevisionId === form.id,
    );
    const attemptIds = new Set(attempts.map((attempt) => attempt.id));
    const records = schoolAssessmentState.scoreRecords.filter((record) =>
      attemptIds.has(record.attemptId),
    );
    const sampleCount = uniqueAttemptCount(records);
    return {
      blockingCount: form.compatibility.filter((issue) => issue.blocking)
        .length,
      channels: form.channels
        .map((channel) => channelLabels[channel])
        .join('、'),
      conclusion: sampleConclusion(sampleCount),
      id: form.id,
      itemCount: form.sections.reduce(
        (total, section) => total + section.items.length,
        0,
      ),
      name: form.name,
      rate: rateOf(records),
      sampleCount,
      totalScore: form.totalScore,
    };
  }),
);

const courseRows = computed(() =>
  schoolAssessmentState.courses.map((course) => {
    const items = schoolAssessmentState.itemRevisions.filter(
      (item) => item.metadata.ownership.primaryCourseId === course.id,
    );
    const itemIds = new Set(items.map((item) => item.id));
    const records = schoolAssessmentState.scoreRecords.filter((record) =>
      itemIds.has(record.itemRevisionId),
    );
    const sampleCount = uniqueAttemptCount(records);
    return {
      code: course.code,
      id: course.id,
      itemCount: items.length,
      name: course.name,
      publishedCount: items.filter((item) => item.status === 'published')
        .length,
      rate: rateOf(records),
      sampleCount,
    };
  }),
);

const majorRows = computed(() => {
  const publishedTotal = Math.max(
    1,
    schoolAssessmentState.itemRevisions.filter(
      (item) => item.status === 'published',
    ).length,
  );
  return schoolAssessmentState.majors.map((major) => {
    const applicableItems = schoolAssessmentState.itemRevisions.filter((item) =>
      item.metadata.applicability.majorIds.includes(major.id),
    );
    const publishedItems = applicableItems.filter(
      (item) => item.status === 'published',
    );
    const curriculumPlans = schoolAssessmentState.curriculumPlans.filter(
      (plan) => plan.majorId === major.id,
    );
    const plannedCourseIds = new Set(
      curriculumPlans.flatMap((plan) => plan.courseIds),
    );
    const applicableCourseCount = schoolAssessmentState.courses.filter(
      (course) =>
        course.applicableMajorIds.includes(major.id) ||
        plannedCourseIds.has(course.id),
    ).length;
    return {
      classStatus: '未接入班级归属',
      code: major.code,
      courseCount: applicableCourseCount,
      id: major.id,
      itemCount: applicableItems.length,
      name: major.name,
      planCount: curriculumPlans.length,
      publishedCoverage: Math.round(
        (publishedItems.length / publishedTotal) * 100,
      ),
    };
  });
});

const pluginRows = computed(() =>
  schoolAssessmentState.pluginPackages.map((plugin) => {
    const items = schoolAssessmentState.itemRevisions.filter(
      (item) => item.interaction.pluginId === plugin.id,
    );
    const itemIds = new Set(items.map((item) => item.id));
    const records = schoolAssessmentState.scoreRecords.filter((record) =>
      itemIds.has(record.itemRevisionId),
    );
    const testTotal = plugin.testSummary.passed + plugin.testSummary.failed;
    const supportedChannels = [
      plugin.capabilities.online,
      plugin.capabilities.print,
      plugin.capabilities.practical,
    ].filter(Boolean).length;
    return {
      failed: plugin.testSummary.failed,
      id: plugin.id,
      itemCount: items.length,
      name: plugin.name,
      scoreRate: rateOf(records),
      scoreSamples: uniqueAttemptCount(records),
      status: pluginStatusLabels[plugin.status] ?? plugin.status,
      supportedChannels,
      testRate:
        testTotal === 0
          ? 0
          : Math.round((plugin.testSummary.passed / testTotal) * 100),
      version: plugin.version,
    };
  }),
);

const paperBlockingCount = computed(() =>
  paperRows.value.reduce((total, paper) => total + paper.blockingCount, 0),
);
const coursesWithScores = computed(
  () => courseRows.value.filter((course) => course.rate !== null).length,
);
const failedPluginTestCount = computed(() =>
  pluginRows.value.reduce((total, plugin) => total + plugin.failed, 0),
);
</script>

<template>
  <Page>
    <div class="analytics-page">
      <section class="heading">
        <div>
          <Tag color="cyan">基于现有演示数据实时汇总</Tag>
          <h1>考试质量分析</h1>
          <p>从题目、试卷、课程、专业与交互插件五个维度查看基础质量信号。</p>
        </div>
      </section>

      <Row :gutter="[16, 16]">
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="答卷样本"
              :value="scoredAttemptCount"
              suffix="份"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="评分记录"
              :value="schoolAssessmentState.scoreRecords.length"
              suffix="条"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="当前得分率"
              :value="overallScoreRate"
              suffix="%"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="待人工完成"
              :value="pendingManualCount"
              suffix="题"
            />
          </Card>
        </Col>
      </Row>

      <Alert
        show-icon
        :type="isSmallSample ? 'warning' : 'info'"
        :message="
          isSmallSample
            ? `当前仅 ${scoredAttemptCount} 份有效答卷，属于小样本`
            : '当前样本达到基础统计门槛'
        "
        description="页面只汇总现有作答与评分记录。小样本得分率仅用于流程观察，不据此评价教师、课程或学生；项目反应理论（IRT）参数、信度和区分度均未计算。"
      />

      <Card :bordered="false">
        <Tabs v-model:active-key="activeTab" :items="analysisTabs" />

        <template v-if="activeTab === 'items'">
          <div class="section-intro">
            <div>
              <h2>题目质量</h2>
              <p>
                按题目实际评分记录计算观察得分率，命题难度仅表示教师预设等级。
              </p>
            </div>
            <Tag color="orange">
              分析门槛：{{ minimumAnalysisSample }} 份答卷
            </Tag>
          </div>
          <Table
            row-key="id"
            :data-source="itemRows"
            :pagination="{ pageSize: 8 }"
            :scroll="{ x: 900 }"
            :columns="[
              { title: '题目', dataIndex: 'title', width: 260 },
              { title: '交互插件', dataIndex: 'plugin', width: 150 },
              {
                title: '命题难度',
                dataIndex: 'designDifficulty',
                width: 100,
              },
              { title: '作答样本', dataIndex: 'sampleCount', width: 100 },
              { title: '观察得分率', key: 'rate', width: 130 },
              { title: '统计结论', key: 'conclusion', width: 170 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'rate'">
                <Tag v-if="record.rate !== null" color="blue">
                  {{ record.rate }}%
                </Tag>
                <Tag v-else>暂无数据</Tag>
              </template>
              <template v-else-if="column.key === 'conclusion'">
                <Tag
                  :color="
                    record.sampleCount >= minimumAnalysisSample
                      ? 'success'
                      : 'warning'
                  "
                >
                  {{ record.conclusion }}
                </Tag>
              </template>
            </template>
          </Table>
        </template>

        <template v-else-if="activeTab === 'papers'">
          <div class="metric-strip">
            <article>
              <span>试卷版本</span>
              <strong>{{ paperRows.length }}</strong>
            </article>
            <article>
              <span>已封存</span>
              <strong>
                {{
                  schoolAssessmentState.forms.filter(
                    (form) => form.status === 'sealed',
                  ).length
                }}
              </strong>
            </article>
            <article>
              <span>兼容性阻断</span>
              <strong>{{ paperBlockingCount }}</strong>
            </article>
          </div>
          <Table
            row-key="id"
            :data-source="paperRows"
            :pagination="false"
            :scroll="{ x: 980 }"
            :columns="[
              { title: '试卷', dataIndex: 'name', width: 280 },
              { title: '交付方式', dataIndex: 'channels', width: 180 },
              { title: '题量', dataIndex: 'itemCount', width: 80 },
              { title: '总分', dataIndex: 'totalScore', width: 80 },
              { title: '答卷样本', dataIndex: 'sampleCount', width: 100 },
              { title: '观察得分率', key: 'rate', width: 130 },
              { title: '质量提示', dataIndex: 'conclusion', width: 180 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'rate'">
                <Tag v-if="record.rate !== null" color="blue">
                  {{ record.rate }}%
                </Tag>
                <Tag v-else>暂无数据</Tag>
              </template>
            </template>
          </Table>
        </template>

        <template v-else-if="activeTab === 'courses'">
          <Alert
            class="mb-4"
            type="info"
            show-icon
            :message="`已有 ${coursesWithScores} 门课程产生评分记录`"
            description="课程达成度按课程所属题目的已获分与满分计算；当前未按课程目标分解，不能替代正式达成度评价。"
          />
          <Table
            row-key="id"
            :data-source="courseRows"
            :pagination="false"
            :scroll="{ x: 850 }"
            :columns="[
              { title: '课程', dataIndex: 'name', width: 220 },
              { title: '课程代码', dataIndex: 'code', width: 130 },
              { title: '题目版本', dataIndex: 'itemCount', width: 100 },
              { title: '已发布', dataIndex: 'publishedCount', width: 90 },
              { title: '答卷样本', dataIndex: 'sampleCount', width: 100 },
              { title: '基础达成度', key: 'rate', width: 240 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'rate'">
                <Progress
                  v-if="record.rate !== null"
                  :percent="record.rate"
                  size="small"
                  :status="
                    record.sampleCount < minimumAnalysisSample
                      ? 'normal'
                      : 'success'
                  "
                />
                <Tag v-else>暂无评分数据</Tag>
              </template>
            </template>
          </Table>
        </template>

        <template v-else-if="activeTab === 'majors'">
          <Alert
            class="mb-4"
            type="warning"
            show-icon
            message="当前演示数据没有考生专业与班级归属"
            description="因此只展示培养方案、课程与题目覆盖，不生成专业或班级成绩排名，避免把适用范围误当作学生归属。"
          />
          <Table
            row-key="id"
            :data-source="majorRows"
            :pagination="false"
            :scroll="{ x: 900 }"
            :columns="[
              { title: '专业', dataIndex: 'name', width: 220 },
              { title: '专业代码', dataIndex: 'code', width: 130 },
              { title: '培养方案', dataIndex: 'planCount', width: 100 },
              { title: '关联课程', dataIndex: 'courseCount', width: 100 },
              { title: '适用题目', dataIndex: 'itemCount', width: 100 },
              { title: '已发布题库覆盖', key: 'coverage', width: 180 },
              { title: '班级数据', dataIndex: 'classStatus', width: 150 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'coverage'">
                <Progress :percent="record.publishedCoverage" size="small" />
              </template>
            </template>
          </Table>
        </template>

        <template v-else>
          <div class="metric-strip">
            <article>
              <span>插件包</span>
              <strong>{{ pluginRows.length }}</strong>
            </article>
            <article>
              <span>关联题目</span>
              <strong>{{ schoolAssessmentState.itemRevisions.length }}</strong>
            </article>
            <article>
              <span>测试失败项</span>
              <strong>{{ failedPluginTestCount }}</strong>
            </article>
          </div>
          <Table
            row-key="id"
            :data-source="pluginRows"
            :pagination="{ pageSize: 8 }"
            :scroll="{ x: 980 }"
            :columns="[
              { title: '插件', dataIndex: 'name', width: 200 },
              { title: '版本', dataIndex: 'version', width: 100 },
              { title: '状态', key: 'status', width: 100 },
              {
                title: '支持交付方式',
                dataIndex: 'supportedChannels',
                width: 130,
              },
              { title: '关联题目', dataIndex: 'itemCount', width: 100 },
              { title: '测试通过率', key: 'testRate', width: 200 },
              { title: '实际得分率', key: 'scoreRate', width: 130 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <Tag :color="record.failed > 0 ? 'warning' : 'success'">
                  {{ record.status }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'testRate'">
                <Progress
                  :percent="record.testRate"
                  size="small"
                  :status="record.failed > 0 ? 'exception' : 'success'"
                />
              </template>
              <template v-else-if="column.key === 'scoreRate'">
                <Tag v-if="record.scoreRate !== null" color="blue">
                  {{ record.scoreRate }}% · {{ record.scoreSamples }} 份
                </Tag>
                <Tag v-else>暂无作答</Tag>
              </template>
            </template>
          </Table>
        </template>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.analytics-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.heading h1 {
  margin: 8px 0 4px;
  font-size: 26px;
}

.heading p,
.section-intro p {
  margin: 0;
  color: hsl(var(--foreground) / 60%);
}

.section-intro {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-intro h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.metric-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric-strip article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: hsl(var(--muted) / 30%);
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.metric-strip span {
  color: hsl(var(--foreground) / 58%);
}

.metric-strip strong {
  font-size: 22px;
}

@media (max-width: 700px) {
  .section-intro {
    flex-direction: column;
    align-items: flex-start;
  }

  .metric-strip {
    grid-template-columns: 1fr;
  }
}
</style>
