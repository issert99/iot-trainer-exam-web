<script lang="ts" setup>
import type { JsonObject, JsonValue, PluginPackage } from '../../domain/types';

import { computed, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Empty,
  message,
  Progress,
  Select,
  Space,
  Tabs,
  Tag,
} from 'ant-design-vue';

import AuthoringHost from '../../components/AuthoringHost.vue';
import SandboxHost from '../../components/SandboxHost.vue';
import { getPlugin, listPlugins } from '../../plugins/registry';
import { runPluginTests } from '../../stores/interaction-designer';
import { schoolAssessmentState } from '../../stores/state';

defineOptions({ name: 'AssessmentInteractionLab' });

type LabLogEntry = {
  level: 'info' | 'success' | 'warning';
  message: string;
  time: string;
};

type LabTestCase = {
  description: string;
  id: string;
  name: string;
  status: 'failed' | 'passed' | 'pending' | 'running';
};

type RuntimeStatus = 'booting' | 'ready' | 'running' | 'success' | 'warning';

const route = useRoute();
const requestedPluginId =
  typeof route.query.plugin === 'string' &&
  listPlugins().some((plugin) => plugin.manifest.id === route.query.plugin)
    ? route.query.plugin
    : 'professional.programming';
const selectedPluginId = ref(requestedPluginId);
const config = ref<JsonObject>({});
const response = shallowRef<JsonValue>(null);
const logs = ref<LabLogEntry[]>([]);
const testCases = ref<LabTestCase[]>([]);
const runToken = ref(0);
const activeOutputTab = ref('response');
const runtimeStatus = ref<RuntimeStatus>('ready');
const runningTests = ref(false);

const plugins = computed(() => listPlugins());
const selectedPlugin = computed(() => getPlugin(selectedPluginId.value));
const selectedPackage = computed(() =>
  schoolAssessmentState.pluginPackages.find(
    (plugin) => plugin.id === selectedPluginId.value,
  ),
);

const pluginOptions = computed(() =>
  plugins.value.map((plugin) => ({
    label: `${plugin.manifest.title} · ${plugin.manifest.version}`,
    value: plugin.manifest.id,
  })),
);

const configJson = computed(() => JSON.stringify(config.value, null, 2));
const responseJson = computed(() =>
  response.value === null
    ? '// 点击“运行当前配置”后查看 ResponseEnvelope'
    : JSON.stringify(
        {
          pluginId: selectedPluginId.value,
          sandbox: selectedPlugin.value.manifest.sandbox,
          value: response.value,
        },
        null,
        2,
      ),
);

const statusMeta = computed(() => {
  const map: Record<
    RuntimeStatus,
    { color: string; label: string; percent: number }
  > = {
    booting: { color: 'processing', label: '建立边界', percent: 18 },
    ready: { color: 'default', label: '等待运行', percent: 0 },
    running: { color: 'processing', label: '沙箱运行中', percent: 62 },
    success: { color: 'success', label: '运行成功', percent: 100 },
    warning: { color: 'warning', label: '需要检查', percent: 100 },
  };
  return map[runtimeStatus.value];
});

const sourceLabels: Record<PluginPackage['packageKind'], string> = {
  'built-in': '平台内置',
  'school-developed': '校内开发',
  vendor: '供应商',
};

const statusLabels: Record<PluginPackage['status'], string> = {
  deprecated: '已弃用',
  disabled: '已停用',
  draft: '草稿',
  enabled: '已启用',
  testing: '测试中',
};

const quickScenes = [
  {
    color: '#38bdf8',
    description: '一次性无网络容器与测试用例',
    glyph: '</>',
    id: 'professional.programming',
    title: '编程沙箱',
  },
  {
    color: '#22d3ee',
    description: '签名工具、尺寸约束与作品引用',
    glyph: '◇',
    id: 'professional.cad',
    title: 'CAD 工作台',
  },
  {
    color: '#a78bfa',
    description: 'DICOM 序列与结构化区域标注',
    glyph: '◉',
    id: 'professional.medical-imaging',
    title: '医学影像',
  },
];

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function cloneConfig(value: JsonObject) {
  return structuredClone(value);
}

function fallbackTests(id: string): LabTestCase[] {
  const common = [
    {
      description: 'configSchema 必填字段与数据类型校验',
      id: `${id}-schema`,
      name: '配置契约校验',
      status: 'pending' as const,
    },
    {
      description: '运行边界、来源签名与权限最小化检查',
      id: `${id}-boundary`,
      name: '沙箱边界检查',
      status: 'pending' as const,
    },
  ];
  if (id === 'professional.programming') {
    return [
      ...common,
      {
        description: 'TypeScript 编译、8 个断言与 2 秒超时',
        id: `${id}-judge`,
        name: '代码判题基线',
        status: 'pending',
      },
      {
        description: '网络访问、子进程与越权文件读取必须被拒绝',
        id: `${id}-deny`,
        name: '恶意代码阻断',
        status: 'pending',
      },
    ];
  }
  if (id === 'professional.cad') {
    return [
      ...common,
      {
        description: 'STEP 文件解析与 12 项尺寸约束检查',
        id: `${id}-geometry`,
        name: '几何约束回归',
        status: 'pending',
      },
    ];
  }
  if (id === 'professional.medical-imaging') {
    return [
      ...common,
      {
        description: '窗宽窗位、切片号和标注坐标可重复还原',
        id: `${id}-annotation`,
        name: '影像标注回放',
        status: 'pending',
      },
    ];
  }
  return [
    ...common,
    {
      description: '响应可序列化并符合 responseSchema',
      id: `${id}-response`,
      name: '响应封装检查',
      status: 'pending',
    },
  ];
}

function resetPlugin() {
  const plugin = selectedPlugin.value;
  config.value = cloneConfig(plugin.createDefaultConfig());
  response.value = null;
  runtimeStatus.value = 'ready';
  logs.value = [
    {
      level: 'info',
      message: `已载入 ${plugin.manifest.id}@${plugin.manifest.version}`,
      time: now(),
    },
  ];
  testCases.value =
    plugin.manifest.testCases.length > 0
      ? plugin.manifest.testCases.map((testCase, index) => ({
          description: `期望得分 ${testCase.expectedScore}，响应将按清单契约执行`,
          id: `${plugin.manifest.id}-manifest-${index}`,
          name: testCase.name,
          status: 'pending',
        }))
      : fallbackTests(plugin.manifest.id);
}

function selectScene(id: string) {
  selectedPluginId.value = id;
}

function runCurrentConfig() {
  if (selectedPackage.value?.status === 'disabled') {
    message.warning('该插件已停用，请先在交互库中切换状态');
    return;
  }
  response.value = null;
  logs.value = [
    {
      level: 'info',
      message: '命题配置已冻结为本次运行快照',
      time: now(),
    },
  ];
  activeOutputTab.value = 'logs';
  runToken.value += 1;
}

function handleLog(entry: LabLogEntry) {
  logs.value.push(entry);
}

function handleResponse(value: JsonValue) {
  response.value = value;
  activeOutputTab.value = 'response';
  message.success('沙箱已返回结构化响应');
}

function handleStatus(value: RuntimeStatus) {
  runtimeStatus.value = value;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runTests() {
  if (runningTests.value) return;
  const pluginId = selectedPluginId.value;
  runningTests.value = true;
  testCases.value.forEach((testCase) => {
    testCase.status = 'pending';
  });

  for (const [index, testCase] of testCases.value.entries()) {
    if (selectedPluginId.value !== pluginId) break;
    testCase.status = 'running';
    await delay(260);
    const shouldFail =
      selectedPackage.value?.status === 'draft' &&
      index === testCases.value.length - 1;
    testCase.status = shouldFail ? 'failed' : 'passed';
  }

  if (selectedPluginId.value === pluginId) {
    runPluginTests(pluginId);
    const failed = testCases.value.filter(
      (testCase) => testCase.status === 'failed',
    ).length;
    message[failed ? 'warning' : 'success'](
      failed ? `测试完成，${failed} 项待修复` : '全部测试通过',
    );
  }
  runningTests.value = false;
}

watch(selectedPluginId, resetPlugin, { immediate: true });
</script>

<template>
  <Page>
    <div class="lab-page">
      <section class="lab-hero">
        <div>
          <div class="hero-tag">
            <span>SDK</span>
            技术人员工作区
          </div>
          <h1>插件测试实验室</h1>
          <p>
            在不接触考试主流程的前提下，配置、运行并验证专业交互的沙箱边界与响应契约。
          </p>
        </div>
        <div class="hero-selector">
          <label>当前插件</label>
          <Select
            v-model:value="selectedPluginId"
            show-search
            :options="pluginOptions"
            option-filter-prop="label"
          />
          <Space wrap>
            <Tag :color="statusMeta.color">{{ statusMeta.label }}</Tag>
            <Tag v-if="selectedPackage">
              {{ sourceLabels[selectedPackage.packageKind] }}
            </Tag>
            <Tag color="purple">
              {{ selectedPlugin.manifest.sandbox }}
            </Tag>
          </Space>
        </div>
      </section>

      <div class="scene-switcher">
        <button
          v-for="scene in quickScenes"
          :key="scene.id"
          type="button"
          :class="{ active: selectedPluginId === scene.id }"
          @click="selectScene(scene.id)"
        >
          <span :style="{ color: scene.color }">{{ scene.glyph }}</span>
          <div>
            <strong>{{ scene.title }}</strong>
            <small>{{ scene.description }}</small>
          </div>
          <i>{{ selectedPluginId === scene.id ? '当前' : '打开' }}</i>
        </button>
      </div>

      <div class="lab-grid">
        <Card :bordered="false" class="config-card">
          <template #title>
            <div class="card-title">
              <span>01</span>
              <div>
                <strong>命题配置</strong>
                <small>由 manifest 自动生成</small>
              </div>
            </div>
          </template>
          <template #extra>
            <Tag v-if="selectedPackage">
              {{ statusLabels[selectedPackage.status] }}
            </Tag>
          </template>

          <Alert
            type="info"
            show-icon
            :message="selectedPlugin.manifest.title"
            :description="selectedPlugin.manifest.description"
            class="mb-4"
          />
          <AuthoringHost v-model="config" :manifest="selectedPlugin.manifest" />
          <details class="config-snapshot">
            <summary>查看本次配置 JSON</summary>
            <pre>{{ configJson }}</pre>
          </details>
        </Card>

        <Card :bordered="false" class="runtime-card">
          <template #title>
            <div class="card-title">
              <span>02</span>
              <div>
                <strong>隔离运行区</strong>
                <small>专业代码不会进入主应用进程</small>
              </div>
            </div>
          </template>
          <template #extra>
            <Space>
              <span class="runtime-state">
                <i :class="runtimeStatus"></i>{{ statusMeta.label }}
              </span>
              <Button
                type="primary"
                :loading="['booting', 'running'].includes(runtimeStatus)"
                @click="runCurrentConfig"
              >
                运行当前配置
              </Button>
            </Space>
          </template>

          <SandboxHost
            :config="config"
            :manifest="selectedPlugin.manifest"
            :run-token="runToken"
            @log="handleLog"
            @response="handleResponse"
            @status="handleStatus"
          />
        </Card>
      </div>

      <div class="lab-bottom-grid">
        <Card :bordered="false" class="output-card">
          <template #title>
            <div class="card-title">
              <span>03</span>
              <div>
                <strong>响应与运行日志</strong>
                <small>仅交换版本化 JSON Envelope</small>
              </div>
            </div>
          </template>

          <Tabs v-model:active-key="activeOutputTab">
            <Tabs.TabPane key="response" tab="响应 JSON">
              <div class="output-code">
                <div>
                  <span>ResponseEnvelope</span>
                  <Tag :color="response === null ? 'default' : 'success'">
                    {{ response === null ? 'waiting' : 'valid' }}
                  </Tag>
                </div>
                <pre>{{ responseJson }}</pre>
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane key="logs">
              <template #tab>
                运行日志 <Tag>{{ logs.length }}</Tag>
              </template>
              <div class="log-console">
                <p
                  v-for="(entry, index) in logs"
                  :key="`${entry.time}-${index}`"
                >
                  <time>{{ entry.time }}</time>
                  <Tag
                    :color="
                      entry.level === 'success'
                        ? 'success'
                        : entry.level === 'warning'
                          ? 'warning'
                          : 'blue'
                    "
                  >
                    {{ entry.level }}
                  </Tag>
                  <span>{{ entry.message }}</span>
                </p>
                <Empty
                  v-if="logs.length === 0"
                  :image="Empty.PRESENTED_IMAGE_SIMPLE"
                  description="暂无运行日志"
                />
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Card>

        <Card :bordered="false" class="tests-card">
          <template #title>
            <div class="card-title">
              <span>04</span>
              <div>
                <strong>SDK 合约测试</strong>
                <small>发布前必须通过基线测试</small>
              </div>
            </div>
          </template>
          <template #extra>
            <Button :loading="runningTests" @click="runTests">
              运行全部测试
            </Button>
          </template>

          <div v-if="selectedPackage" class="test-summary">
            <div>
              <strong>{{ selectedPackage.testSummary.passed }}</strong>
              <span>历史通过</span>
            </div>
            <div>
              <strong>{{ selectedPackage.testSummary.failed }}</strong>
              <span>历史失败</span>
            </div>
            <div>
              <strong>{{ testCases.length }}</strong>
              <span>本次用例</span>
            </div>
            <Progress
              :percent="
                Math.round(
                  (testCases.filter((testCase) => testCase.status === 'passed')
                    .length /
                    Math.max(1, testCases.length)) *
                    100,
                )
              "
              :show-info="false"
              size="small"
            />
          </div>

          <div class="test-list">
            <article v-for="testCase in testCases" :key="testCase.id">
              <span class="test-status" :class="testCase.status">
                {{
                  testCase.status === 'passed'
                    ? '✓'
                    : testCase.status === 'failed'
                      ? '×'
                      : testCase.status === 'running'
                        ? '…'
                        : '○'
                }}
              </span>
              <div>
                <strong>{{ testCase.name }}</strong>
                <p>{{ testCase.description }}</p>
              </div>
              <Tag
                :color="
                  testCase.status === 'passed'
                    ? 'success'
                    : testCase.status === 'failed'
                      ? 'error'
                      : testCase.status === 'running'
                        ? 'processing'
                        : 'default'
                "
              >
                {{
                  testCase.status === 'passed'
                    ? '通过'
                    : testCase.status === 'failed'
                      ? '失败'
                      : testCase.status === 'running'
                        ? '运行中'
                        : '待运行'
                }}
              </Tag>
            </article>
          </div>
        </Card>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.lab-page {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.lab-hero {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 32px;
  align-items: center;
  padding: 28px 30px;
  overflow: hidden;
  color: #e0f2fe;
  background:
    radial-gradient(circle at 10% 10%, rgb(14 165 233 / 24%), transparent 25%),
    radial-gradient(circle at 85% 90%, rgb(139 92 246 / 22%), transparent 28%),
    linear-gradient(125deg, #071827, #0c2943 65%, #18213b);
  border: 1px solid rgb(125 211 252 / 15%);
  border-radius: 16px;
}

.hero-tag {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: #7dd3fc;
  letter-spacing: 0.08em;
}

.hero-tag span {
  padding: 3px 7px;
  font-family: Consolas, monospace;
  color: #082f49;
  background: #67e8f9;
  border-radius: 4px;
}

.lab-hero h1 {
  margin: 11px 0 7px;
  font-size: 27px;
  color: inherit;
}

.lab-hero p {
  max-width: 680px;
  margin: 0;
  line-height: 1.7;
  color: #94a3b8;
}

.hero-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: rgb(2 6 23 / 30%);
  border: 1px solid rgb(125 211 252 / 13%);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.hero-selector label {
  font-size: 10px;
  color: #94a3b8;
}

.hero-selector :deep(.ant-select) {
  width: 100%;
}

.scene-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.scene-switcher button {
  display: grid;
  grid-template-columns: 46px 1fr auto;
  gap: 11px;
  align-items: center;
  min-width: 0;
  padding: 13px 15px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  transition: 140ms ease;
}

.scene-switcher button:hover,
.scene-switcher button.active {
  border-color: rgb(14 165 233 / 48%);
  box-shadow: 0 8px 22px rgb(14 165 233 / 9%);
  transform: translateY(-1px);
}

.scene-switcher button > span {
  display: grid;
  place-items: center;
  width: 46px;
  height: 42px;
  font:
    600 15px Consolas,
    monospace;
  background: hsl(var(--accent) / 55%);
  border-radius: 9px;
}

.scene-switcher button > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.scene-switcher strong {
  font-size: 12px;
}

.scene-switcher small {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  color: hsl(var(--foreground) / 46%);
  white-space: nowrap;
}

.scene-switcher i {
  font-size: 10px;
  font-style: normal;
  color: #0ea5e9;
}

.lab-grid {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.lab-grid > :deep(.ant-card),
.lab-bottom-grid > :deep(.ant-card) {
  border-radius: 14px;
}

.card-title {
  display: flex;
  gap: 9px;
  align-items: center;
}

.card-title > span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 9px;
  color: #0284c7;
  background: rgb(14 165 233 / 10%);
  border-radius: 7px;
}

.card-title > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.card-title strong {
  font-size: 13px;
}

.card-title small {
  font-size: 9px;
  font-weight: 400;
  color: hsl(var(--foreground) / 42%);
}

.config-card {
  height: 100%;
}

.config-card :deep(.ant-card-body) {
  max-height: 620px;
  overflow: auto;
}

.config-snapshot {
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.config-snapshot summary {
  padding: 9px 11px;
  font-size: 11px;
  cursor: pointer;
  background: hsl(var(--accent) / 38%);
}

.config-snapshot pre {
  max-height: 220px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font:
    10px/1.7 Consolas,
    monospace;
}

.runtime-state {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: hsl(var(--foreground) / 56%);
}

.runtime-state i {
  width: 7px;
  height: 7px;
  background: #94a3b8;
  border-radius: 50%;
}

.runtime-state i.booting,
.runtime-state i.running {
  background: #38bdf8;
  box-shadow: 0 0 0 4px rgb(56 189 248 / 12%);
}

.runtime-state i.success {
  background: #22c55e;
}

.lab-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.8fr);
  gap: 12px;
  align-items: stretch;
}

.output-code {
  overflow: hidden;
  color: #cbd5e1;
  background: #07111f;
  border-radius: 10px;
}

.output-code > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  font-size: 10px;
  background: #101b2d;
  border-bottom: 1px solid #1e293b;
}

.output-code pre {
  min-height: 245px;
  max-height: 370px;
  padding: 15px;
  margin: 0;
  overflow: auto;
  font:
    11px/1.7 Consolas,
    monospace;
  white-space: pre-wrap;
}

.log-console {
  min-height: 286px;
  max-height: 370px;
  padding: 10px 12px;
  overflow: auto;
  color: #cbd5e1;
  background: #07111f;
  border-radius: 10px;
}

.log-console p {
  display: grid;
  grid-template-columns: 64px 65px 1fr;
  gap: 7px;
  align-items: center;
  margin: 7px 0;
  font:
    10px/1.6 Consolas,
    monospace;
}

.log-console time {
  color: #64748b;
}

.test-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.test-summary > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px;
  background: hsl(var(--accent) / 35%);
  border-radius: 8px;
}

.test-summary strong {
  font-size: 17px;
}

.test-summary span {
  font-size: 9px;
  color: hsl(var(--foreground) / 45%);
}

.test-summary :deep(.ant-progress) {
  grid-column: 1 / -1;
  margin: 0;
}

.test-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-list article {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 9px;
  align-items: center;
  padding: 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 9px;
}

.test-status {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  color: #94a3b8;
  background: hsl(var(--accent) / 55%);
  border-radius: 50%;
}

.test-status.passed {
  color: #16a34a;
  background: rgb(34 197 94 / 10%);
}

.test-status.failed {
  color: #ef4444;
  background: rgb(239 68 68 / 10%);
}

.test-status.running {
  color: #0284c7;
  background: rgb(14 165 233 / 10%);
}

.test-list article > div {
  min-width: 0;
}

.test-list strong {
  font-size: 11px;
}

.test-list p {
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 9px;
  color: hsl(var(--foreground) / 45%);
  white-space: nowrap;
}

@media (max-width: 1150px) {
  .lab-grid,
  .lab-bottom-grid {
    grid-template-columns: 1fr;
  }

  .config-card :deep(.ant-card-body) {
    max-height: none;
  }
}

@media (max-width: 760px) {
  .lab-hero,
  .scene-switcher {
    grid-template-columns: 1fr;
  }

  .lab-hero {
    padding: 22px;
  }

  .scene-switcher {
    gap: 7px;
  }

  .runtime-card :deep(.ant-card-head-wrapper) {
    align-items: flex-start;
  }

  .runtime-card :deep(.ant-card-extra .ant-space) {
    flex-direction: column;
    align-items: flex-end;
  }
}
</style>
