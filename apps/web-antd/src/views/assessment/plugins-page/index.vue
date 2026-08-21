<script lang="ts" setup>
import type {
  InteractionTemplateRevision,
  PluginPackage,
  PluginStatus,
} from '../domain/types';

import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Input,
  InputNumber,
  message,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Upload,
} from 'ant-design-vue';

import { getPlugin, listPlugins } from '../plugins/registry';
import {
  loadInteractionTemplate,
  runPluginTests,
  setPluginStatus,
} from '../stores/interaction-designer';
import { schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentPlugins' });

const router = useRouter();
const keyword = ref('');
const sourceFilter = ref('');
const statusFilter = ref('');
const selectedPluginId = ref('');
const detailOpen = ref(false);
const detailTab = ref('overview');

const demo = reactive({
  choice: 'B',
  essay: '',
  fillA: '栈',
  fillB: '队列',
  numeric: 248,
});

const sourceLabels: Record<PluginPackage['packageKind'], string> = {
  'built-in': '平台内置',
  'school-developed': '校内开发',
  vendor: '认证供应商',
};

const sourceColors: Record<PluginPackage['packageKind'], string> = {
  'built-in': 'blue',
  'school-developed': 'cyan',
  vendor: 'purple',
};

const statusLabels: Record<PluginStatus, string> = {
  deprecated: '已弃用',
  disabled: '已停用',
  draft: '草稿',
  enabled: '已启用',
  testing: '测试中',
};

const sandboxLabels: Record<PluginPackage['sandbox'], string> = {
  'isolated-service': '隔离服务',
  none: '主应用组件',
  'signed-iframe': '签名 iframe',
};

const plugins = computed(() => listPlugins());
const packageById = computed(
  () =>
    new Map(
      schoolAssessmentState.pluginPackages.map((pluginPackage) => [
        pluginPackage.id,
        pluginPackage,
      ]),
    ),
);

const libraryEntries = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase();
  return plugins.value
    .map((plugin) => ({
      package: packageById.value.get(plugin.manifest.id),
      plugin,
    }))
    .filter((entry) => {
      if (!entry.package) return false;
      if (
        sourceFilter.value &&
        entry.package.packageKind !== sourceFilter.value
      ) {
        return false;
      }
      if (statusFilter.value && entry.package.status !== statusFilter.value) {
        return false;
      }
      if (!query) return true;
      return `${entry.plugin.manifest.title} ${entry.plugin.manifest.description} ${entry.plugin.manifest.id}`
        .toLocaleLowerCase()
        .includes(query);
    });
});

const selectedPlugin = computed(() =>
  selectedPluginId.value ? getPlugin(selectedPluginId.value) : undefined,
);
const selectedPackage = computed(() =>
  selectedPluginId.value
    ? packageById.value.get(selectedPluginId.value)
    : undefined,
);

const enabledCount = computed(
  () =>
    schoolAssessmentState.pluginPackages.filter(
      (plugin) => plugin.status === 'enabled',
    ).length,
);
const sandboxCount = computed(
  () =>
    schoolAssessmentState.pluginPackages.filter(
      (plugin) => plugin.sandbox !== 'none',
    ).length,
);
const passingTests = computed(() =>
  schoolAssessmentState.pluginPackages.reduce(
    (total, plugin) => total + plugin.testSummary.passed,
    0,
  ),
);

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '测试中', value: 'testing' },
  { label: '已启用', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
  { label: '已弃用', value: 'deprecated' },
];

function statusColor(status: PluginStatus) {
  const colors: Record<PluginStatus, string> = {
    deprecated: 'default',
    disabled: 'error',
    draft: 'default',
    enabled: 'success',
    testing: 'processing',
  };
  return colors[status];
}

function openPlugin(id: string) {
  selectedPluginId.value = id;
  detailTab.value = 'overview';
  detailOpen.value = true;
}

function switchPluginStatus(value: unknown) {
  if (!selectedPackage.value) return;
  const status = String(value) as PluginStatus;
  try {
    setPluginStatus(selectedPackage.value.id, status);
    message.success(`插件状态已切换为“${statusLabels[status]}”`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态切换失败');
  }
}

function runSelectedTests() {
  if (!selectedPackage.value) return;
  const summary = runPluginTests(selectedPackage.value.id);
  message.success(
    `测试完成：${summary.passed} 项通过，${summary.failed} 项失败`,
  );
}

function exportManifest() {
  const payload = plugins.value.map((plugin) => plugin.manifest);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'assessment-plugin-registry.json';
  anchor.click();
  URL.revokeObjectURL(url);
  message.success('已导出插件注册表');
}

function beforeUpload() {
  return false;
}

function beforePluginPackageUpload(file: File) {
  message.success(`${file.name} 已作为草稿包进入静态检查队列`);
  return false;
}

function capabilityEntries(pluginPackage: PluginPackage) {
  const labels: Record<keyof PluginPackage['capabilities'], string> = {
    accessibility: '无障碍',
    authoring: '命题配置',
    automaticScoring: '自动评分',
    online: '机考',
    practical: '实践',
    print: '纸面',
  };
  return Object.entries(pluginPackage.capabilities).map(([key, enabled]) => ({
    enabled,
    key,
    label: labels[key as keyof PluginPackage['capabilities']],
  }));
}

function channelLabel(channel: string) {
  return (
    {
      online: '机考',
      practical: '实践考试',
      print: '纸笔考试',
    }[channel] ?? channel
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function openDesigner(template?: InteractionTemplateRevision) {
  if (template) loadInteractionTemplate(template.id);
  void router.push('/assessment/interactions/designer');
}

function openLab() {
  void router.push({
    path: '/assessment/interactions/lab',
    query: selectedPluginId.value
      ? { plugin: selectedPluginId.value }
      : undefined,
  });
}

function templateGlyph(type: string) {
  const glyphs: Record<string, string> = {
    number: '#',
    rating: '★',
    'single-choice': '◉',
    textarea: '¶',
  };
  return glyphs[type] ?? '□';
}
</script>

<template>
  <Page>
    <div class="plugins-page">
      <section class="library-hero">
        <div class="hero-copy">
          <div class="hero-eyebrow">
            <span>INTERACTION SDK</span>
            教师无代码 + 技术插件
          </div>
          <h1>可视化交互库</h1>
          <p>
            教师从真实交互预览中选型，技术人员通过版本化清单接入专业工具；命题、作答、评分与纸面能力在一处可见。
          </p>
          <Space wrap>
            <Button type="primary" size="large" @click="openDesigner()">
              打开无代码设计器
            </Button>
            <Button ghost size="large" @click="openLab">
              进入插件实验室
            </Button>
            <Upload
              accept=".zip,.json"
              :before-upload="beforePluginPackageUpload"
              :show-upload-list="false"
            >
              <Button ghost size="large">导入插件包</Button>
            </Upload>
          </Space>
        </div>
        <div class="hero-metrics">
          <article>
            <strong>{{ plugins.length }}</strong>
            <span>已注册交互</span>
          </article>
          <article>
            <strong>{{ enabledCount }}</strong>
            <span>正式启用</span>
          </article>
          <article>
            <strong>{{ sandboxCount }}</strong>
            <span>沙箱插件</span>
          </article>
          <article>
            <strong>{{ passingTests }}</strong>
            <span>合约测试通过</span>
          </article>
        </div>
      </section>

      <Alert
        type="info"
        show-icon
        message="同一套语义契约覆盖命题、机考、实践、纸面与评分"
        description="插件卡片展示真实交互缩略演示；冻结试卷只引用 pluginId、语义版本与配置快照，专业实现可以独立升级。"
      />

      <section class="section-heading">
        <div>
          <Tag color="blue">交互资源</Tag>
          <h2>选择一个作答体验</h2>
          <p>基础控件可直接使用，专业工具必须在声明的沙箱边界中运行。</p>
        </div>
        <Space wrap class="library-filters">
          <Input
            v-model:value="keyword"
            allow-clear
            placeholder="搜索名称、能力或 ID"
            style="width: 230px"
          />
          <Select
            v-model:value="sourceFilter"
            allow-clear
            placeholder="全部来源"
            style="width: 140px"
            :options="[
              { label: '平台内置', value: 'built-in' },
              { label: '校内开发', value: 'school-developed' },
              { label: '认证供应商', value: 'vendor' },
            ]"
          />
          <Select
            v-model:value="statusFilter"
            allow-clear
            placeholder="全部状态"
            style="width: 130px"
            :options="statusOptions"
          />
          <Button @click="exportManifest">导出清单</Button>
        </Space>
      </section>

      <Row v-if="libraryEntries.length > 0" :gutter="[14, 14]">
        <Col
          v-for="entry in libraryEntries"
          :key="entry.plugin.manifest.id"
          :xs="24"
          :md="12"
          :xl="8"
          :xxl="6"
        >
          <Card
            hoverable
            :bordered="false"
            class="plugin-card"
            @click="openPlugin(entry.plugin.manifest.id)"
          >
            <div
              class="plugin-demo"
              :class="`demo-${entry.plugin.manifest.id.replaceAll('.', '-')}`"
              @click.stop
            >
              <div class="demo-bar">
                <span>
                  {{ entry.plugin.manifest.title }}
                </span>
                <i>LIVE PREVIEW</i>
              </div>

              <div
                v-if="entry.plugin.manifest.id === 'core.choice'"
                class="choice-demo"
              >
                <p>以下哪个结构符合“后进先出”？</p>
                <Radio.Group v-model:value="demo.choice">
                  <Radio value="A">队列</Radio>
                  <Radio value="B">栈</Radio>
                  <Radio value="C">图</Radio>
                </Radio.Group>
              </div>

              <div
                v-else-if="entry.plugin.manifest.id === 'core.fill'"
                class="fill-demo"
              >
                <p>后进先出称为</p>
                <Input v-model:value="demo.fillA" size="small" />
                <p>先进先出称为</p>
                <Input v-model:value="demo.fillB" size="small" />
              </div>

              <div
                v-else-if="entry.plugin.manifest.id === 'core.numeric'"
                class="numeric-demo"
              >
                <span class="formula">σ = F / A</span>
                <div>
                  <InputNumber v-model:value="demo.numeric" size="small" />
                  <b>MPa</b>
                </div>
                <small>允许误差 ± 2</small>
              </div>

              <div
                v-else-if="entry.plugin.manifest.id === 'core.essay'"
                class="essay-demo"
              >
                <p>请从观点与证据两个维度说明：</p>
                <Input.TextArea
                  v-model:value="demo.essay"
                  :rows="3"
                  placeholder="输入分析..."
                />
                <span>0 / 500</span>
              </div>

              <div
                v-else-if="entry.plugin.manifest.id === 'core.file'"
                class="file-demo"
              >
                <Upload :before-upload="beforeUpload" :show-upload-list="false">
                  <div class="drop-zone">
                    <b>⇧</b>
                    <span>拖放作品或点击选择</span>
                    <small>PDF · 最大 20 MB</small>
                  </div>
                </Upload>
              </div>

              <div
                v-else-if="entry.plugin.manifest.id === 'core.rubric'"
                class="rubric-demo"
              >
                <div><span>操作规范</span><i></i><i></i><i class="on"></i></div>
                <div><span>结果准确</span><i></i><i class="on"></i><i></i></div>
                <div><span>证据完整</span><i></i><i></i><i class="on"></i></div>
              </div>

              <div
                v-else-if="
                  entry.plugin.manifest.id === 'professional.programming'
                "
                class="code-demo"
              >
                <div class="code-lines">
                  <span><i>1</i><b>class</b> MinStack {</span>
                  <span><i>2</i>&nbsp; push(value: number) {</span>
                  <span><i>3</i>&nbsp;&nbsp; this.stack.push(value);</span>
                  <span><i>4</i>&nbsp; }</span>
                  <span><i>5</i>}</span>
                </div>
                <div class="code-tests">
                  <span v-for="index in 5" :key="index">✓ T{{ index }}</span>
                </div>
              </div>

              <div
                v-else-if="entry.plugin.manifest.id === 'professional.cad'"
                class="cad-demo"
              >
                <div class="cad-axis">X Y Z</div>
                <div class="cad-shape"><i></i><i></i><i></i></div>
                <span>120.00 mm</span>
              </div>

              <div
                v-else-if="
                  entry.plugin.manifest.id === 'professional.medical-imaging'
                "
                class="medical-demo"
              >
                <div class="scan">
                  <i class="left-lung"></i>
                  <i class="right-lung"></i>
                  <b></b>
                </div>
                <span>SE 42 / 86 · W1500 L-600</span>
              </div>

              <div
                v-else-if="entry.plugin.manifest.id === 'professional.oral'"
                class="oral-demo"
              >
                <div class="mic">●</div>
                <div class="wave">
                  <i
                    v-for="index in 18"
                    :key="index"
                    :style="{ height: `${8 + ((index * 7) % 25)}px` }"
                  ></i>
                </div>
                <span>01:24</span>
              </div>

              <div v-else class="no-code-demo">
                <div>
                  <span>计算应力</span>
                  <b>248.00 MPa</b>
                </div>
                <div>
                  <span>强度判断</span>
                  <i>● 安全</i><i>○ 临界</i>
                </div>
                <div>
                  <span>说明依据</span>
                  <em></em><em></em>
                </div>
              </div>
            </div>

            <div class="plugin-card-heading">
              <div>
                <h3>{{ entry.plugin.manifest.title }}</h3>
                <code>{{ entry.plugin.manifest.id }}</code>
              </div>
              <Tag
                v-if="entry.package"
                :color="statusColor(entry.package.status)"
              >
                {{ statusLabels[entry.package.status] }}
              </Tag>
            </div>
            <p class="plugin-description">
              {{ entry.plugin.manifest.description }}
            </p>

            <Space v-if="entry.package" wrap class="plugin-tags">
              <Tag :color="sourceColors[entry.package.packageKind]">
                {{ sourceLabels[entry.package.packageKind] }}
              </Tag>
              <Tag
                :color="entry.package.sandbox === 'none' ? 'default' : 'orange'"
              >
                {{ sandboxLabels[entry.package.sandbox] }}
              </Tag>
              <Tag>{{ entry.plugin.manifest.scoring }}</Tag>
            </Space>

            <div v-if="entry.package" class="capability-row">
              <span
                v-for="capability in capabilityEntries(entry.package)"
                :key="capability.key"
                :class="{ disabled: !capability.enabled }"
              >
                <i>{{ capability.enabled ? '✓' : '×' }}</i>
                {{ capability.label }}
              </span>
            </div>

            <footer v-if="entry.package">
              <span>
                v{{ entry.package.version }} ·
                {{ entry.package.testSummary.passed }} tests
              </span>
              <Button
                type="link"
                size="small"
                @click.stop="openPlugin(entry.plugin.manifest.id)"
              >
                查看契约 →
              </Button>
            </footer>
          </Card>
        </Col>
      </Row>
      <Empty v-else description="没有符合筛选条件的交互插件" />

      <section class="template-section">
        <div class="section-heading">
          <div>
            <Tag color="cyan">教师模板</Tag>
            <h2>无代码复合交互</h2>
            <p>把基础控件、评分规则和纸面替代组合为可版本化模板。</p>
          </div>
          <Button type="primary" @click="openDesigner()">新建设计</Button>
        </div>

        <Row :gutter="[14, 14]">
          <Col
            v-for="template in schoolAssessmentState.interactionTemplates"
            :key="template.id"
            :xs="24"
            :lg="12"
          >
            <Card :bordered="false" class="template-card">
              <div class="template-preview">
                <div class="template-toolbar">
                  <span>4 列画布</span>
                  <Tag
                    :color="template.status === 'enabled' ? 'success' : 'blue'"
                  >
                    {{ template.status }}
                  </Tag>
                </div>
                <div class="template-canvas">
                  <div
                    v-for="control in template.controls"
                    :key="control.id"
                    :class="`width-${control.width}`"
                  >
                    <i>{{ templateGlyph(control.type) }}</i>
                    <span>{{ control.label }}</span>
                    <small>
                      {{ Math.round(control.scoreWeight * 100) }}%
                    </small>
                  </div>
                </div>
              </div>
              <div class="template-info">
                <div>
                  <Tag color="blue">r{{ template.revision }}</Tag>
                  <Tag>{{ template.paperFallback.mode }}</Tag>
                </div>
                <h3>{{ template.name }}</h3>
                <p>{{ template.description }}</p>
                <div class="template-stats">
                  <span>
                    <strong>{{ template.controls.length }}</strong> 个控件
                  </span>
                  <span>
                    <strong>{{ template.scoreRules.length }}</strong> 条规则
                  </span>
                  <span>
                    <strong>{{ template.paperFallback.answerLines }}</strong>
                    行纸面区
                  </span>
                </div>
                <Button block @click="openDesigner(template)">
                  在设计器中打开
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </section>
    </div>

    <Drawer
      v-model:open="detailOpen"
      width="720"
      title="插件 SDK 契约"
      class="plugin-drawer"
    >
      <template v-if="selectedPlugin && selectedPackage">
        <div class="drawer-identity">
          <div class="drawer-logo">
            {{ selectedPlugin.manifest.title.slice(0, 1) }}
          </div>
          <div>
            <Space wrap>
              <Tag :color="sourceColors[selectedPackage.packageKind]">
                {{ sourceLabels[selectedPackage.packageKind] }}
              </Tag>
              <Tag :color="statusColor(selectedPackage.status)">
                {{ statusLabels[selectedPackage.status] }}
              </Tag>
            </Space>
            <h2>{{ selectedPlugin.manifest.title }}</h2>
            <code>{{ selectedPlugin.manifest.id }}</code>
          </div>
        </div>

        <div class="drawer-status-control">
          <div>
            <strong>运行状态</strong>
            <span>状态变更会写入学校审计记录</span>
          </div>
          <Select
            :value="selectedPackage.status"
            :options="statusOptions"
            style="width: 140px"
            @update:value="switchPluginStatus"
          />
        </div>

        <Tabs v-model:active-key="detailTab">
          <Tabs.TabPane key="overview" tab="能力概览">
            <Alert
              type="info"
              show-icon
              :message="selectedPlugin.manifest.description"
              class="mb-4"
            />
            <Descriptions bordered :column="1" size="small">
              <Descriptions.Item label="清单版本">
                {{ selectedPlugin.manifest.version }}
              </Descriptions.Item>
              <Descriptions.Item label="安装版本">
                {{ selectedPackage.version }}
              </Descriptions.Item>
              <Descriptions.Item label="评分边界">
                {{ selectedPlugin.manifest.scoring }}
              </Descriptions.Item>
              <Descriptions.Item label="沙箱边界">
                {{ selectedPlugin.manifest.sandbox }}
              </Descriptions.Item>
              <Descriptions.Item label="QTI 映射">
                {{
                  selectedPlugin.manifest.qtiInteraction ||
                  'portable-custom-interaction'
                }}
              </Descriptions.Item>
            </Descriptions>

            <h3 class="drawer-subtitle">能力声明</h3>
            <div class="drawer-capabilities">
              <span
                v-for="capability in capabilityEntries(selectedPackage)"
                :key="capability.key"
                :class="{ disabled: !capability.enabled }"
              >
                <i>{{ capability.enabled ? '✓' : '×' }}</i>
                {{ capability.label }}
              </span>
            </div>

            <h3 class="drawer-subtitle">命题字段</h3>
            <div class="field-list">
              <article
                v-for="field in selectedPlugin.manifest.authoringFields"
                :key="field.key"
              >
                <div>
                  <strong>{{ field.label }}</strong>
                  <code>config.{{ field.key }}</code>
                </div>
                <Tag>{{ field.type }}</Tag>
                <Tag :color="field.required ? 'red' : 'default'">
                  {{ field.required ? '必填' : '可选' }}
                </Tag>
              </article>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key="schema" tab="Schema">
            <h3 class="drawer-subtitle">configSchema</h3>
            <div class="schema-panel">
              <div>
                <span>application/schema+json</span>
                <Tag color="green">valid</Tag>
              </div>
              <pre>{{
                JSON.stringify(selectedPlugin.manifest.configSchema, null, 2)
              }}</pre>
            </div>
            <h3 class="drawer-subtitle">responseSchema</h3>
            <div class="schema-panel">
              <div>
                <span>ResponseEnvelope.value</span>
                <Tag color="blue">
                  {{ selectedPlugin.manifest.responseSchema.type }}
                </Tag>
              </div>
              <pre>{{
                JSON.stringify(selectedPlugin.manifest.responseSchema, null, 2)
              }}</pre>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key="channels" tab="渠道与版本">
            <h3 class="drawer-subtitle">交付渠道</h3>
            <div class="channel-list">
              <article
                v-for="(channel, key) in selectedPlugin.manifest.channels"
                :key="key"
              >
                <div>
                  <i>{{
                    key === 'online' ? '▣' : key === 'print' ? '▤' : '◎'
                  }}</i>
                  <span>
                    <strong>{{ channelLabel(String(key)) }}</strong>
                    <small>{{ channel?.renderer }}</small>
                  </span>
                </div>
                <Tag
                  :color="
                    channel?.mode === 'native'
                      ? 'success'
                      : channel?.mode === 'unsupported'
                        ? 'error'
                        : 'warning'
                  "
                >
                  {{ channel?.mode }}
                </Tag>
              </article>
            </div>

            <h3 class="drawer-subtitle">版本与迁移</h3>
            <Descriptions bordered :column="1" size="small">
              <Descriptions.Item label="Manifest">
                {{ selectedPlugin.manifest.version }}
              </Descriptions.Item>
              <Descriptions.Item label="Package">
                {{ selectedPackage.version }}
              </Descriptions.Item>
              <Descriptions.Item label="迁移脚本">
                {{
                  selectedPlugin.manifest.migrations.join('、') ||
                  '当前版本无需迁移'
                }}
              </Descriptions.Item>
            </Descriptions>
          </Tabs.TabPane>

          <Tabs.TabPane key="tests" tab="测试">
            <div class="test-overview">
              <article>
                <strong>{{ selectedPackage.testSummary.passed }}</strong>
                <span>通过</span>
              </article>
              <article>
                <strong>{{ selectedPackage.testSummary.failed }}</strong>
                <span>失败</span>
              </article>
              <article>
                <strong>
                  {{
                    selectedPlugin.manifest.testCases.length ||
                    selectedPackage.testSummary.passed +
                      selectedPackage.testSummary.failed
                  }}
                </strong>
                <span>用例</span>
              </article>
            </div>
            <Progress
              :percent="
                Math.round(
                  (selectedPackage.testSummary.passed /
                    Math.max(
                      1,
                      selectedPackage.testSummary.passed +
                        selectedPackage.testSummary.failed,
                    )) *
                    100,
                )
              "
              :status="
                selectedPackage.testSummary.failed ? 'exception' : 'success'
              "
            />
            <p class="last-test">
              最近运行：{{ formatDate(selectedPackage.testSummary.lastRunAt) }}
            </p>
            <div class="test-contract-list">
              <article>
                <i>✓</i>
                <div>
                  <strong>Manifest 与 Schema 校验</strong>
                  <span>字段、语义版本和渠道呈现器完整</span>
                </div>
              </article>
              <article>
                <i>✓</i>
                <div>
                  <strong>响应序列化与评分契约</strong>
                  <span>响应不包含运行时私有状态</span>
                </div>
              </article>
              <article>
                <i>✓</i>
                <div>
                  <strong>沙箱与无障碍基线</strong>
                  <span>边界策略、键盘操作与替代内容检查</span>
                </div>
              </article>
            </div>
            <Space class="drawer-actions">
              <Button @click="openLab">在实验室中打开</Button>
              <Button type="primary" @click="runSelectedTests">
                立即运行测试
              </Button>
            </Space>
          </Tabs.TabPane>
        </Tabs>
      </template>
    </Drawer>
  </Page>
</template>

<style scoped>
.plugins-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.library-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 440px;
  gap: 40px;
  align-items: center;
  min-height: 260px;
  padding: 36px 40px;
  overflow: hidden;
  color: #eff6ff;
  background:
    radial-gradient(circle at 82% 22%, rgb(56 189 248 / 32%), transparent 25%),
    radial-gradient(circle at 12% 90%, rgb(99 102 241 / 28%), transparent 25%),
    linear-gradient(125deg, #07182d, #123d66 62%, #142b53);
  border-radius: 18px;
  box-shadow: 0 18px 48px rgb(15 23 42 / 16%);
}

.hero-eyebrow {
  display: flex;
  gap: 9px;
  align-items: center;
  font-size: 10px;
  color: #7dd3fc;
  letter-spacing: 0.1em;
}

.hero-eyebrow span {
  padding: 4px 8px;
  font-weight: 700;
  color: #082f49;
  background: #67e8f9;
  border-radius: 5px;
}

.hero-copy h1 {
  margin: 13px 0 8px;
  font-size: 31px;
  color: inherit;
}

.hero-copy p {
  max-width: 720px;
  margin: 0 0 22px;
  line-height: 1.8;
  color: #a8c4db;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.hero-metrics article {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 18px;
  background: rgb(2 6 23 / 23%);
  border: 1px solid rgb(125 211 252 / 15%);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.hero-metrics strong {
  font-size: 27px;
  color: #fff;
}

.hero-metrics span {
  font-size: 10px;
  color: #93c5d8;
}

.section-heading {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 4px;
}

.section-heading h2 {
  margin: 8px 0 4px;
  font-size: 21px;
}

.section-heading p {
  margin: 0;
  color: hsl(var(--foreground) / 52%);
}

.plugin-card {
  height: 100%;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
}

.plugin-card :deep(.ant-card-body) {
  padding: 0;
}

.plugin-demo {
  position: relative;
  height: 180px;
  padding: 42px 18px 16px;
  overflow: hidden;
  background: hsl(var(--accent) / 38%);
  border-bottom: 1px solid hsl(var(--border));
}

.demo-bar {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 31px;
  padding: 0 11px;
  font-size: 9px;
  color: hsl(var(--foreground) / 48%);
  background: hsl(var(--background) / 72%);
  border-bottom: 1px solid hsl(var(--border));
}

.demo-bar i {
  font-size: 8px;
  font-style: normal;
  color: #0ea5e9;
  letter-spacing: 0.08em;
}

.choice-demo,
.fill-demo,
.numeric-demo,
.essay-demo {
  height: 100%;
}

.choice-demo p,
.fill-demo p,
.essay-demo p {
  margin: 0 0 9px;
  font-size: 11px;
  color: hsl(var(--foreground) / 68%);
}

.choice-demo :deep(.ant-radio-wrapper) {
  margin-inline-end: 14px;
  font-size: 11px;
}

.fill-demo {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-content: center;
  align-items: center;
}

.fill-demo p {
  margin: 0;
}

.numeric-demo {
  display: flex;
  flex-direction: column;
  gap: 9px;
  justify-content: center;
}

.numeric-demo .formula {
  font:
    italic 18px Georgia,
    serif;
  color: #2563eb;
}

.numeric-demo > div {
  display: flex;
  gap: 8px;
  align-items: center;
}

.numeric-demo :deep(.ant-input-number) {
  width: 150px;
}

.numeric-demo b,
.numeric-demo small {
  font-size: 10px;
  color: hsl(var(--foreground) / 55%);
}

.essay-demo {
  position: relative;
}

.essay-demo > span {
  position: absolute;
  right: 7px;
  bottom: 6px;
  font-size: 8px;
  color: hsl(var(--foreground) / 40%);
}

.file-demo,
.file-demo :deep(.ant-upload-wrapper),
.file-demo :deep(.ant-upload) {
  display: block;
  height: 100%;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: hsl(var(--foreground) / 55%);
  background: rgb(59 130 246 / 5%);
  border: 1px dashed #60a5fa;
  border-radius: 9px;
}

.drop-zone b {
  font-size: 22px;
  color: #3b82f6;
}

.drop-zone span {
  font-size: 10px;
}

.drop-zone small {
  font-size: 8px;
}

.rubric-demo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  height: 100%;
}

.rubric-demo > div {
  display: grid;
  grid-template-columns: 1fr repeat(3, 20px);
  gap: 8px;
  align-items: center;
  padding: 7px 9px;
  font-size: 9px;
  background: hsl(var(--background) / 70%);
  border-radius: 6px;
}

.rubric-demo i {
  width: 11px;
  height: 11px;
  margin: auto;
  border: 1px solid #94a3b8;
  border-radius: 50%;
}

.rubric-demo i.on {
  background: #3b82f6;
  border-color: #3b82f6;
  box-shadow: inset 0 0 0 2px #fff;
}

.code-demo {
  display: grid;
  grid-template-columns: 1fr 70px;
  height: 100%;
  overflow: hidden;
  color: #cbd5e1;
  background: #07111f;
  border: 1px solid #1e293b;
  border-radius: 8px;
}

.code-lines {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  font:
    8px Consolas,
    monospace;
}

.code-lines span {
  white-space: nowrap;
}

.code-lines i {
  display: inline-block;
  width: 14px;
  font-style: normal;
  color: #475569;
}

.code-lines b {
  font-weight: 400;
  color: #c084fc;
}

.code-tests {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 8px;
  font:
    7px Consolas,
    monospace;
  color: #86efac;
  background: #0b1628;
}

.code-tests span {
  padding: 3px;
  background: rgb(22 101 52 / 35%);
  border-radius: 3px;
}

.cad-demo {
  position: relative;
  height: 100%;
  overflow: hidden;
  background:
    linear-gradient(rgb(56 189 248 / 10%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(56 189 248 / 10%) 1px, transparent 1px), #071b2d;
  background-size: 18px 18px;
  border-radius: 8px;
  perspective: 500px;
}

.cad-axis {
  position: absolute;
  right: 8px;
  bottom: 7px;
  font:
    7px Consolas,
    monospace;
  color: #67e8f9;
}

.cad-shape {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130px;
  height: 70px;
  transform: translate(-50%, -50%) rotateX(58deg) rotateZ(-25deg);
}

.cad-shape i {
  position: absolute;
  border: 1px solid #67e8f9;
  box-shadow: inset 0 0 15px rgb(34 211 238 / 15%);
}

.cad-shape i:first-child {
  inset: 25px 0 0;
  border-radius: 8px;
}

.cad-shape i:nth-child(2) {
  top: 0;
  left: 37px;
  width: 58px;
  height: 55px;
  border-radius: 50% 50% 7px 7px;
}

.cad-shape i:last-child {
  top: 16px;
  left: 57px;
  width: 18px;
  height: 18px;
  background: #071b2d;
  border-radius: 50%;
}

.cad-demo > span {
  position: absolute;
  bottom: 8px;
  left: 9px;
  padding: 2px 5px;
  font:
    7px Consolas,
    monospace;
  color: #fef08a;
  border: 1px solid rgb(250 204 21 / 35%);
}

.medical-demo {
  position: relative;
  display: grid;
  place-items: center;
  height: 100%;
  background: #020617;
  border-radius: 8px;
}

.scan {
  position: relative;
  width: 115px;
  height: 115px;
  background: radial-gradient(
    circle,
    #9ca3af 0 47%,
    #4b5563 48% 51%,
    transparent 52%
  );
  border-radius: 50%;
}

.scan i {
  position: absolute;
  top: 26px;
  width: 35px;
  height: 62px;
  background: #080d19;
  border: 1px solid #6b7280;
  border-radius: 50%;
}

.left-lung {
  left: 20px;
}

.right-lung {
  right: 20px;
}

.scan b {
  position: absolute;
  top: 39px;
  right: 27px;
  width: 15px;
  height: 13px;
  border: 1px solid #22d3ee;
  border-radius: 50%;
  box-shadow: 0 0 6px #22d3ee;
}

.medical-demo > span {
  position: absolute;
  right: 7px;
  bottom: 6px;
  font:
    7px Consolas,
    monospace;
  color: #94a3b8;
}

.oral-demo {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 10px;
  align-items: center;
  height: 100%;
}

.mic {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  color: #ef4444;
  background: rgb(239 68 68 / 10%);
  border: 1px solid rgb(239 68 68 / 20%);
  border-radius: 50%;
}

.wave {
  display: flex;
  gap: 3px;
  align-items: center;
  height: 48px;
}

.wave i {
  width: 3px;
  background: linear-gradient(#06b6d4, #3b82f6);
  border-radius: 2px;
}

.oral-demo > span {
  font:
    9px Consolas,
    monospace;
  color: hsl(var(--foreground) / 48%);
}

.no-code-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  height: 100%;
}

.no-code-demo > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  font-size: 8px;
  background: hsl(var(--background) / 78%);
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.no-code-demo > div:last-child {
  grid-column: 1 / -1;
}

.no-code-demo span {
  color: hsl(var(--foreground) / 48%);
}

.no-code-demo b {
  font-size: 11px;
  color: #2563eb;
}

.no-code-demo i {
  font-style: normal;
}

.no-code-demo em {
  height: 1px;
  background: hsl(var(--border));
}

.plugin-card-heading,
.plugin-description,
.plugin-tags,
.capability-row,
.plugin-card > :deep(.ant-card-body) > footer {
  margin-right: 16px;
  margin-left: 16px;
}

.plugin-card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-top: 14px;
}

.plugin-card-heading h3 {
  margin: 0 0 3px;
  font-size: 15px;
}

.plugin-card-heading code {
  font-size: 9px;
  color: hsl(var(--foreground) / 42%);
}

.plugin-description {
  height: 40px;
  margin-top: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.7;
  color: hsl(var(--foreground) / 57%);
}

.plugin-tags {
  min-height: 24px;
}

.capability-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 0;
  margin-top: 10px;
  border-top: 1px solid hsl(var(--border));
}

.capability-row span,
.drawer-capabilities span {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  font-size: 9px;
  color: hsl(var(--foreground) / 62%);
}

.capability-row i,
.drawer-capabilities i {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  font-size: 8px;
  font-style: normal;
  color: #16a34a;
  background: rgb(34 197 94 / 10%);
  border-radius: 50%;
}

.capability-row span.disabled,
.drawer-capabilities span.disabled {
  color: hsl(var(--foreground) / 30%);
}

.capability-row span.disabled i,
.drawer-capabilities span.disabled i {
  color: #94a3b8;
  background: hsl(var(--accent));
}

.plugin-card > :deep(.ant-card-body) > footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  font-size: 9px;
  color: hsl(var(--foreground) / 42%);
  border-top: 1px solid hsl(var(--border));
}

.template-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 3px;
}

.template-card {
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
}

.template-card :deep(.ant-card-body) {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) 1fr;
  min-height: 250px;
  padding: 0;
}

.template-preview {
  padding: 16px;
  background:
    radial-gradient(circle at 80% 10%, rgb(59 130 246 / 8%), transparent 28%),
    hsl(var(--accent) / 35%);
  border-right: 1px solid hsl(var(--border));
}

.template-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 11px;
  font-size: 9px;
  color: hsl(var(--foreground) / 46%);
}

.template-canvas {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}

.template-canvas > div {
  display: grid;
  grid-template-columns: 25px 1fr auto;
  grid-column: span 4;
  gap: 7px;
  align-items: center;
  padding: 9px;
  background: hsl(var(--background) / 85%);
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.template-canvas > div.width-1 {
  grid-column: span 1;
}

.template-canvas > div.width-2 {
  grid-column: span 2;
}

.template-canvas > div.width-3 {
  grid-column: span 3;
}

.template-canvas i {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  font-style: normal;
  color: #2563eb;
  background: rgb(37 99 235 / 9%);
  border-radius: 6px;
}

.template-canvas span {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 9px;
  white-space: nowrap;
}

.template-canvas small {
  font-size: 7px;
  color: hsl(var(--foreground) / 36%);
}

.template-info {
  padding: 20px;
}

.template-info h3 {
  margin: 11px 0 7px;
  font-size: 16px;
}

.template-info p {
  min-height: 44px;
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: hsl(var(--foreground) / 52%);
}

.template-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin: 14px 0;
}

.template-stats span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  font-size: 8px;
  color: hsl(var(--foreground) / 44%);
  background: hsl(var(--accent) / 35%);
  border-radius: 7px;
}

.template-stats strong {
  font-size: 13px;
  color: hsl(var(--foreground));
}

.drawer-identity {
  display: flex;
  gap: 13px;
  align-items: center;
  padding-bottom: 16px;
}

.drawer-logo {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  font-size: 19px;
  color: #fff;
  background: linear-gradient(145deg, #2563eb, #06b6d4);
  border-radius: 13px;
}

.drawer-identity h2 {
  margin: 5px 0 0;
  font-size: 19px;
}

.drawer-identity code {
  font-size: 10px;
  color: hsl(var(--foreground) / 42%);
}

.drawer-status-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 10px;
  background: hsl(var(--accent) / 40%);
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.drawer-status-control > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-status-control strong {
  font-size: 11px;
}

.drawer-status-control span {
  font-size: 9px;
  color: hsl(var(--foreground) / 44%);
}

.drawer-subtitle {
  margin: 20px 0 10px;
  font-size: 13px;
}

.drawer-capabilities {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}

.drawer-capabilities span {
  padding: 9px;
  background: hsl(var(--accent) / 34%);
  border-radius: 7px;
}

.field-list,
.channel-list,
.test-contract-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field-list article {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 7px;
  align-items: center;
  padding: 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.field-list article > div {
  display: flex;
  flex-direction: column;
}

.field-list strong {
  font-size: 11px;
}

.field-list code {
  font-size: 9px;
  color: hsl(var(--foreground) / 40%);
}

.schema-panel {
  overflow: hidden;
  color: #cbd5e1;
  background: #07111f;
  border-radius: 9px;
}

.schema-panel > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 11px;
  font-size: 9px;
  background: #101b2d;
  border-bottom: 1px solid #1e293b;
}

.schema-panel pre {
  max-height: 310px;
  padding: 13px;
  margin: 0;
  overflow: auto;
  font:
    10px/1.7 Consolas,
    monospace;
  white-space: pre-wrap;
}

.channel-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.channel-list article > div {
  display: flex;
  gap: 10px;
  align-items: center;
}

.channel-list article i {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  font-style: normal;
  color: #2563eb;
  background: rgb(37 99 235 / 9%);
  border-radius: 7px;
}

.channel-list article span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.channel-list strong {
  font-size: 11px;
}

.channel-list small {
  font:
    8px Consolas,
    monospace;
  color: hsl(var(--foreground) / 40%);
}

.test-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.test-overview article {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 13px;
  background: hsl(var(--accent) / 40%);
  border-radius: 8px;
}

.test-overview strong {
  font-size: 21px;
}

.test-overview span {
  font-size: 9px;
  color: hsl(var(--foreground) / 45%);
}

.last-test {
  font-size: 10px;
  color: hsl(var(--foreground) / 45%);
}

.test-contract-list article {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.test-contract-list i {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  font-style: normal;
  color: #16a34a;
  background: rgb(34 197 94 / 10%);
  border-radius: 50%;
}

.test-contract-list article > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.test-contract-list strong {
  font-size: 11px;
}

.test-contract-list span {
  font-size: 9px;
  color: hsl(var(--foreground) / 43%);
}

.drawer-actions {
  justify-content: flex-end;
  width: 100%;
  margin-top: 18px;
}

@media (max-width: 1100px) {
  .library-hero {
    grid-template-columns: 1fr;
  }

  .hero-metrics {
    grid-template-columns: repeat(4, 1fr);
  }

  .section-heading {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 700px) {
  .library-hero {
    padding: 26px 22px;
  }

  .hero-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .library-filters,
  .library-filters :deep(.ant-input-affix-wrapper),
  .library-filters :deep(.ant-select) {
    width: 100% !important;
  }

  .template-card :deep(.ant-card-body) {
    grid-template-columns: 1fr;
  }

  .template-preview {
    border-right: 0;
    border-bottom: 1px solid hsl(var(--border));
  }
}
</style>
