<script lang="ts" setup>
import type { JsonValue, TestFormRevision } from '../domain/types';
import type { PublicationArtifactKind } from '../render/print';

import { computed, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  message,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import BlueprintDesigner from '../components/BlueprintDesigner.vue';
import InteractionHost from '../components/InteractionHost.vue';
import ItemStem from '../components/ItemStem.vue';
import PaperBasket from '../components/PaperBasket.vue';
import PaperStudio from '../components/PaperStudio.vue';
import { getPlugin } from '../plugins/registry';
import {
  createPublicationPackage,
  openPrintArtifact,
  renderPrintDocument,
} from '../render/print';
import { downloadQtiTest } from '../render/qti';
import { setFormStatus } from '../stores/paper';
import { schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentPapers' });

type PublicationView = {
  artifactNames: string[];
  blockingIssues: string[];
  checksum: string;
  generatedAt: string;
  mode: '安全 Mock' | '标准渲染器';
};

const activeTab = ref('blueprint');
const selectedFormId = ref(schoolAssessmentState.forms[0]?.id ?? '');
const previewMode = ref<'online' | 'print'>('online');
const previewResponses = reactive<Record<string, JsonValue>>({});

const selectedForm = computed(() =>
  schoolAssessmentState.forms.find((form) => form.id === selectedFormId.value),
);

const formOptions = computed(() =>
  schoolAssessmentState.forms.map((form) => ({
    label: `${form.name} · ${statusLabel(form.status)}`,
    value: form.id,
  })),
);

const draftCount = computed(
  () =>
    schoolAssessmentState.forms.filter((form) => form.status === 'draft')
      .length,
);

const sealedCount = computed(
  () =>
    schoolAssessmentState.forms.filter((form) => form.status === 'sealed')
      .length,
);

const blockingCount = computed(() =>
  schoolAssessmentState.forms.reduce(
    (total, form) =>
      total + form.compatibility.filter((issue) => issue.blocking).length,
    0,
  ),
);

const printPreview = computed(() => {
  const form = selectedForm.value;
  if (!form) return { fallback: false, html: '', reason: '' };
  try {
    return {
      fallback: false,
      html: renderPrintDocument(form, 'question'),
      reason: '',
    };
  } catch (error) {
    return {
      fallback: true,
      html: buildMockPrintDocument(form, 'question'),
      reason: error instanceof Error ? error.message : '旧版打印渲染器不兼容',
    };
  }
});

const publication = computed<PublicationView | undefined>(() => {
  const form = selectedForm.value;
  if (!form) return undefined;
  try {
    const packageData = createPublicationPackage(form);
    return {
      artifactNames: packageData.artifacts.map((artifact) => artifact.fileName),
      blockingIssues: packageData.blockingIssues,
      checksum: packageData.checksum,
      generatedAt: packageData.generatedAt,
      mode: '标准渲染器',
    };
  } catch {
    return {
      artifactNames: [
        `${form.name}-试题册.html`,
        `${form.name}-答题册.html`,
        `${form.name}-答案与评分细则.html`,
      ],
      blockingIssues: form.compatibility
        .filter((issue) => issue.blocking)
        .map((issue) => issue.message),
      checksum: `${form.checksum}-mock-publication`,
      generatedAt: new Date().toISOString(),
      mode: '安全 Mock',
    };
  }
});

const approvalStep = computed(() => {
  const status = selectedForm.value?.status;
  if (status === 'sealed' || status === 'archived') return 3;
  if (status === 'under-approval') return 2;
  if (status === 'proofing') return 1;
  return 0;
});

const approvalSteps = [
  { description: '章节、题序与分值可编辑', title: '草稿' },
  { description: '在线与纸质双渠道复核', title: '校样' },
  { description: '命题人与教务双人审批', title: '审批' },
  { description: '校验值冻结，可生成出版包', title: '封存' },
];

function statusLabel(status: TestFormRevision['status']) {
  return (
    {
      archived: '已归档',
      draft: '草稿',
      proofing: '校样中',
      sealed: '已封存',
      'under-approval': '审批中',
    }[status] ?? status
  );
}

function statusColor(status: TestFormRevision['status']) {
  return (
    {
      archived: 'default',
      draft: 'blue',
      proofing: 'orange',
      sealed: 'success',
      'under-approval': 'purple',
    }[status] ?? 'default'
  );
}

function channelLabel(channel: string) {
  return (
    {
      online: '在线',
      practical: '实践',
      print: '纸质',
    }[channel] ?? channel
  );
}

function nextStatus(status: TestFormRevision['status']) {
  if (status === 'draft') return 'proofing';
  if (status === 'proofing') return 'under-approval';
  if (status === 'under-approval') return 'sealed';
  return undefined;
}

function nextActionLabel(status: TestFormRevision['status']) {
  if (status === 'draft') return '提交校样';
  if (status === 'proofing') return '提交审批';
  if (status === 'under-approval') return '批准并封存';
  return '';
}

function asForm(value: unknown) {
  return value as TestFormRevision;
}

function hasBlocking(value: unknown) {
  return asForm(value).compatibility.some((issue) => issue.blocking);
}

function blockingIssueCount(value: unknown) {
  return asForm(value).compatibility.filter((issue) => issue.blocking).length;
}

function selectForm(value: unknown, tab?: string) {
  const form = asForm(value);
  selectedFormId.value = form.id;
  if (tab) activeTab.value = tab;
}

function handleFormCreated(formId: string) {
  selectedFormId.value = formId;
  activeTab.value = 'studio';
}

function advanceStatus(value: unknown) {
  const form = asForm(value);
  const targetStatus = nextStatus(form.status);
  if (!targetStatus) return;
  try {
    setFormStatus(form.id, targetStatus);
    selectedFormId.value = form.id;
    message.success(`试卷已推进至“${statusLabel(targetStatus)}”`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态推进失败');
  }
}

function questionNumber(sectionIndex: number, itemIndex: number) {
  const form = selectedForm.value;
  if (!form) return itemIndex + 1;
  return (
    form.sections
      .slice(0, sectionIndex)
      .reduce((total, section) => total + section.items.length, 0) +
    itemIndex +
    1
  );
}

function previewValue(itemId: string, pluginId: string) {
  if (previewResponses[itemId] === undefined) {
    const item = selectedForm.value?.sections
      .flatMap((section) => section.items)
      .find((entry) => entry.itemRevision.id === itemId)?.itemRevision;
    if (item) {
      try {
        previewResponses[itemId] = getPlugin(pluginId).createInitialValue(item);
      } catch {
        previewResponses[itemId] = '';
      }
    }
  }
  return previewResponses[itemId] ?? '';
}

function updatePreview(itemId: string, value: JsonValue) {
  previewResponses[itemId] = value;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function artifactTitle(kind: PublicationArtifactKind) {
  if (kind === 'answer-key') return '答案与评分细则';
  if (kind === 'answer-sheet') return '答题册';
  return '试题册';
}

function buildMockPrintDocument(
  form: TestFormRevision,
  kind: PublicationArtifactKind,
) {
  let itemIndex = 0;
  const sections = form.sections
    .map(
      (section) => `<section>
        <h2>${escapeHtml(section.name)}</h2>
        ${section.items
                .map((entry) => {
                  itemIndex += 1;
                  const stem = entry.itemRevision.stem.blocks
                    .map((block) =>
                      String(block.data.text ?? block.data.source ?? ''),
                    )
                    .join(' ');
                  const answerArea =
                    kind === 'answer-key'
                      ? '<p class="answer">评分依据：按题目冻结版本与评分策略执行。</p>'
                      : '<div class="answer-lines"></div>';
                  return `<article>
              <h3>${itemIndex}. ${escapeHtml(
                                  kind === 'answer-sheet'
                                    ? entry.itemRevision.title
                                    : stem,
                                )} <small>（${entry.score} 分）</small></h3>
              ${answerArea}
            </article>`;
                })
                .join('')}
      </section>`,
    )
    .join('');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(`${form.name}-${artifactTitle(kind)}`)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; color: #111827; background: #e5e7eb; font-family: SimSun, serif; }
    main { width: min(210mm, 100%); min-height: 297mm; padding: 18mm; margin: auto; background: #fff; box-shadow: 0 2px 14px rgb(0 0 0 / 12%); }
    header { padding-bottom: 16px; text-align: center; border-bottom: 2px solid #111827; }
    header h1 { margin: 8px 0; font-size: 22px; }
    section { margin-top: 24px; }
    section h2 { font-size: 18px; }
    article { margin: 16px 0; break-inside: avoid; }
    article h3 { font-size: 15px; font-weight: 400; line-height: 1.7; }
    small { font-weight: 400; }
    .answer-lines { height: 72px; background: repeating-linear-gradient(transparent 0 23px, #9ca3af 24px); }
    .answer { padding: 10px; background: #f3f4f6; }
    @media print { body { padding: 0; background: #fff; } main { width: auto; min-height: auto; padding: 0; box-shadow: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p>${escapeHtml(schoolAssessmentState.school.name)}</p>
      <h1>${escapeHtml(form.name)} · ${artifactTitle(kind)}</h1>
      <p>${form.durationMinutes} 分钟 · 满分 ${form.totalScore} 分 · ${escapeHtml(form.checksum)}</p>
    </header>
    ${sections}
  </main>
</body>
</html>`;
}

function openMockArtifact(
  form: TestFormRevision,
  kind: PublicationArtifactKind,
) {
  const html = buildMockPrintDocument(form, kind);
  const url = URL.createObjectURL(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
  );
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return Boolean(popup);
}

function openArtifact(kind: PublicationArtifactKind) {
  const form = selectedForm.value;
  if (!form) return;
  let opened: boolean;
  let fallback = false;
  try {
    opened = openPrintArtifact(form, kind);
  } catch {
    fallback = true;
    opened = openMockArtifact(form, kind);
  }
  let resultMessage = '浏览器拦截了校样窗口';
  if (opened) {
    resultMessage = fallback
      ? '旧渲染器不兼容，已打开安全 Mock 校样'
      : '已打开独立分页校样';
  }
  message[opened ? 'success' : 'warning'](resultMessage);
}

function downloadText(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildMockQti(form: TestFormRevision) {
  const itemRefs = form.sections
    .flatMap((section) => section.items)
    .map(
      (entry) =>
        `<qti-assessment-item-ref identifier="ref-${escapeHtml(entry.itemRevision.id)}" href="items/${escapeHtml(entry.itemRevision.id)}.xml" />`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="${escapeHtml(form.id)}" title="${escapeHtml(form.name)}">
${itemRefs}
</qti-assessment-test>`;
}

function exportQti() {
  const form = selectedForm.value;
  if (!form) return;
  try {
    const result = downloadQtiTest(form);
    message.success(
      `已生成 ${result.profile}，包含 ${result.warnings.length} 条扩展提示`,
    );
  } catch {
    downloadText(
      buildMockQti(form),
      `${form.name}-QTI-3.0.1-mock.xml`,
      'application/xml;charset=utf-8',
    );
    message.warning('旧 QTI 适配器不兼容，已导出安全 Mock 测试清单');
  }
}

function downloadPublicationPackage() {
  const form = selectedForm.value;
  if (!form) return;
  let payload: unknown;
  let fallback = false;
  try {
    payload = createPublicationPackage(form);
  } catch {
    fallback = true;
    payload = {
      artifacts: (
        ['question', 'answer-sheet', 'answer-key'] as PublicationArtifactKind[]
      ).map((kind) => ({
        fileName: `${form.name}-${artifactTitle(kind)}.html`,
        html: buildMockPrintDocument(form, kind),
        kind,
      })),
      blockingIssues: form.compatibility
        .filter((issue) => issue.blocking)
        .map((issue) => issue.message),
      formChecksum: form.checksum,
      generatedAt: new Date().toISOString(),
      manifestVersion: 'mock-1.0',
      testFormRevisionId: form.id,
    };
  }
  downloadText(
    JSON.stringify(payload, null, 2),
    `${form.name}-出版包${fallback ? '-mock' : ''}.json`,
    'application/json;charset=utf-8',
  );
  message[fallback ? 'warning' : 'success'](
    fallback ? '已生成安全 Mock 出版包' : '出版包与校验清单已生成',
  );
}
</script>

<template>
  <Page>
    <div class="papers-page">
      <section class="hero">
        <div>
          <Tag color="cyan">单校命题与出版</Tag>
          <h1>试卷中心</h1>
          <p>
            从蓝图配额、全校选题、智能编排到双渠道校样、审批封存的一体化工作台。
          </p>
        </div>
        <div class="hero-statistics">
          <Statistic
            title="试卷版本"
            :value="schoolAssessmentState.forms.length"
            suffix="份"
          />
          <Statistic title="待编辑" :value="draftCount" suffix="份" />
          <Statistic title="已封存" :value="sealedCount" suffix="份" />
          <Statistic
            title="渠道阻断"
            :value="blockingCount"
            suffix="项"
            :value-style="{ color: blockingCount > 0 ? '#ffccc7' : '#b7eb8f' }"
          />
        </div>
      </section>

      <Card :bordered="false" class="workflow-tabs">
        <Tabs
          v-model:active-key="activeTab"
          :items="[
            { key: 'blueprint', label: '1 蓝图规则' },
            { key: 'basket', label: '2 手工选题' },
            { key: 'studio', label: '3 组卷工作室' },
            { key: 'proof', label: '4 双渠道校样' },
            { key: 'publish', label: '5 审批与出版' },
          ]"
        />
      </Card>

      <BlueprintDesigner
        v-if="activeTab === 'blueprint'"
        @form-created="handleFormCreated"
      />

      <PaperBasket
        v-else-if="activeTab === 'basket'"
        @form-created="handleFormCreated"
      />

      <PaperStudio
        v-else-if="activeTab === 'studio'"
        v-model:selected-form-id="selectedFormId"
      />

      <template v-else-if="activeTab === 'proof'">
        <Card :bordered="false" class="proof-toolbar">
          <div>
            <Tag color="orange">Proofing</Tag>
            <h2>在线 / 纸质双渠道校样</h2>
            <p>同一冻结题目语义分别由交互运行时和分页出版视图呈现。</p>
          </div>
          <Space wrap>
            <Select
              v-model:value="selectedFormId"
              style="min-width: 320px"
              :options="formOptions"
              placeholder="选择校样试卷"
            />
            <Tag v-if="selectedForm" :color="statusColor(selectedForm.status)">
              {{ statusLabel(selectedForm.status) }}
            </Tag>
            <Radio.Group v-model:value="previewMode" button-style="solid">
              <Radio.Button value="online">在线机考</Radio.Button>
              <Radio.Button value="print">纸质分页</Radio.Button>
            </Radio.Group>
            <Button
              v-if="selectedForm?.status === 'draft'"
              type="primary"
              @click="advanceStatus(selectedForm)"
            >
              完成编排，提交校样
            </Button>
          </Space>
        </Card>

        <template v-if="selectedForm">
          <Alert
            v-if="selectedForm.compatibility.length === 0"
            show-icon
            type="success"
            message="双渠道兼容检查通过"
            description="当前题目在所选交付渠道中均具备可用呈现。"
          />
          <div v-else class="issue-grid">
            <Alert
              v-for="issue in selectedForm.compatibility"
              :key="`${issue.itemRevisionId}-${issue.channel}-${issue.code}`"
              show-icon
              :type="issue.blocking ? 'error' : 'warning'"
              :message="`${channelLabel(issue.channel)} · ${issue.message}`"
              :description="`${issue.code} · ${issue.itemRevisionId}${issue.blocking ? ' · 阻断封存' : ' · 需人工确认等价呈现'}`"
            />
          </div>

          <Alert
            v-if="previewMode === 'print' && printPreview.fallback"
            show-icon
            type="warning"
            message="已启用安全 Mock 出版预览"
            :description="`旧打印渲染器不可用：${printPreview.reason}`"
          />

          <Card :bordered="false" class="preview-card">
            <div v-if="previewMode === 'online'" class="online-preview">
              <header>
                <Tag color="blue">机考运行时校样</Tag>
                <h2>{{ selectedForm.name }}</h2>
                <p>
                  {{ selectedForm.durationMinutes }} 分钟 ·
                  {{ selectedForm.totalScore }} 分 ·
                  {{ selectedForm.channels.map(channelLabel).join(' / ') }}
                </p>
              </header>
              <section
                v-for="(section, sectionIndex) in selectedForm.sections"
                :key="section.id"
                class="online-section"
              >
                <div class="online-section-heading">
                  <h3>{{ section.name }}</h3>
                  <Tag>
                    {{
                      section.items.reduce(
                        (total, entry) => total + entry.score,
                        0,
                      )
                    }}
                    分
                  </Tag>
                </div>
                <Card
                  v-for="(entry, itemIndex) in section.items"
                  :key="entry.itemRevision.id"
                  size="small"
                  class="online-item"
                >
                  <h4>
                    {{ questionNumber(sectionIndex, itemIndex) }}.
                    {{ entry.itemRevision.title }}
                    <small>（{{ entry.score }} 分）</small>
                  </h4>
                  <ItemStem :document="entry.itemRevision.stem" />
                  <div class="interaction-proof">
                    <InteractionHost
                      disabled
                      :item="entry.itemRevision"
                      :model-value="
                        previewValue(
                          entry.itemRevision.id,
                          entry.itemRevision.interaction.pluginId,
                        )
                      "
                      @update:model-value="
                        updatePreview(entry.itemRevision.id, $event)
                      "
                    />
                  </div>
                </Card>
              </section>
            </div>

            <iframe
              v-else
              title="纸质分页试卷校样"
              class="print-frame"
              sandbox="allow-same-origin allow-modals"
              :srcdoc="printPreview.html"
            ></iframe>
          </Card>
        </template>
        <Card v-else :bordered="false">
          <Empty description="请先创建或选择一份试卷" />
        </Card>
      </template>

      <template v-else>
        <div class="publication-layout">
          <Card :bordered="false" title="试卷版本与审批状态">
            <Table
              row-key="id"
              size="middle"
              :scroll="{ x: 900 }"
              :data-source="schoolAssessmentState.forms"
              :pagination="{ pageSize: 6, showSizeChanger: false }"
              :columns="[
                { title: '试卷', dataIndex: 'name', width: 300 },
                { title: '卷别', dataIndex: 'variant', width: 80 },
                { title: '总分', dataIndex: 'totalScore', width: 80 },
                { title: '状态', key: 'status', width: 100 },
                { title: 'Compatibility', key: 'compatibility', width: 150 },
                { title: '操作', key: 'action', fixed: 'right', width: 210 },
              ]"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <Tag :color="statusColor(record.status)">
                    {{ statusLabel(record.status) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'compatibility'">
                  <Tag :color="hasBlocking(record) ? 'error' : 'success'">
                    {{
                      hasBlocking(record)
                        ? `${blockingIssueCount(record)} 项阻断`
                        : '允许封存'
                    }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'action'">
                  <Button size="small" type="link" @click="selectForm(record)">
                    查看
                  </Button>
                  <Button
                    v-if="nextStatus(record.status)"
                    size="small"
                    type="link"
                    :disabled="
                      record.status === 'under-approval' && hasBlocking(record)
                    "
                    @click="advanceStatus(record)"
                  >
                    {{ nextActionLabel(record.status) }}
                  </Button>
                  <Button
                    v-if="record.status === 'draft'"
                    size="small"
                    type="link"
                    @click="selectForm(record, 'studio')"
                  >
                    编辑
                  </Button>
                </template>
              </template>
            </Table>
          </Card>

          <Card v-if="selectedForm" :bordered="false" title="审批与冻结证据">
            <Steps
              responsive
              size="small"
              :current="approvalStep"
              :items="approvalSteps"
            />
            <Descriptions
              class="approval-details"
              bordered
              :column="1"
              size="small"
            >
              <Descriptions.Item label="当前版本">
                {{ selectedForm.id }}
              </Descriptions.Item>
              <Descriptions.Item label="内容校验值">
                <code>{{ selectedForm.checksum }}</code>
              </Descriptions.Item>
              <Descriptions.Item label="创建人">
                {{ selectedForm.createdBy }}
              </Descriptions.Item>
              <Descriptions.Item label="交付渠道">
                <Tag
                  v-for="channel in selectedForm.channels"
                  :key="channel"
                  color="blue"
                >
                  {{ channelLabel(channel) }}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Alert
              v-if="hasBlocking(selectedForm)"
              class="approval-alert"
              show-icon
              type="error"
              message="存在渠道阻断，审批完成后仍不能封存"
              description="返回双渠道校样查看具体题目，并替换不支持目标渠道的交互。"
            />

            <Button
              v-if="nextStatus(selectedForm.status)"
              block
              class="advance-button"
              type="primary"
              :disabled="
                selectedForm.status === 'under-approval' &&
                hasBlocking(selectedForm)
              "
              @click="advanceStatus(selectedForm)"
            >
              {{ nextActionLabel(selectedForm.status) }}
            </Button>
          </Card>
        </div>

        <Card
          v-if="selectedForm"
          :bordered="false"
          class="publication-card"
          title="冻结出版包"
        >
          <Row :gutter="[16, 16]">
            <Col :xs="24" :lg="9">
              <Descriptions bordered :column="1" size="small">
                <Descriptions.Item label="出版模式">
                  <Tag
                    :color="
                      publication?.mode === '标准渲染器' ? 'success' : 'warning'
                    "
                  >
                    {{ publication?.mode }}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="出版包校验值">
                  <code>{{ publication?.checksum }}</code>
                </Descriptions.Item>
                <Descriptions.Item label="生成时间">
                  {{ publication?.generatedAt }}
                </Descriptions.Item>
                <Descriptions.Item label="制品数量">
                  {{ publication?.artifactNames.length || 0 }}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col :xs="24" :lg="15">
              <div class="artifact-list">
                <article
                  v-for="artifact in publication?.artifactNames"
                  :key="artifact"
                >
                  <span>HTML</span>
                  <div>
                    <strong>{{ artifact }}</strong>
                    <small>携带试卷版本与内容校验值</small>
                  </div>
                </article>
              </div>
              <Space wrap class="artifact-actions">
                <Button @click="openArtifact('question')">试题册校样</Button>
                <Button @click="openArtifact('answer-sheet')">
                  答题册校样
                </Button>
                <Button @click="openArtifact('answer-key')">
                  答案与评分细则
                </Button>
                <Button @click="exportQti">导出 QTI 3.0.1</Button>
                <Button
                  type="primary"
                  :disabled="
                    selectedForm.status !== 'sealed' ||
                    hasBlocking(selectedForm)
                  "
                  @click="downloadPublicationPackage"
                >
                  下载封存出版包
                </Button>
              </Space>
              <Alert
                v-if="selectedForm.status !== 'sealed'"
                class="package-alert"
                type="info"
                show-icon
                message="完成校样与审批后开放出版包下载"
              />
            </Col>
          </Row>
        </Card>
      </template>
    </div>
  </Page>
</template>

<style scoped>
.papers-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero {
  display: flex;
  gap: 30px;
  align-items: center;
  justify-content: space-between;
  padding: 28px 30px;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 90% 10%, rgb(34 211 238 / 35%), transparent 34%),
    linear-gradient(125deg, #102a43, #164e63 60%, #155e75);
  border-radius: 16px;
}

.hero h1 {
  margin: 9px 0 5px;
  font-size: 27px;
  color: inherit;
}

.hero p {
  max-width: 680px;
  margin: 0;
  line-height: 1.7;
  opacity: 0.78;
}

.hero-statistics {
  display: grid;
  grid-template-columns: repeat(4, minmax(90px, 1fr));
  gap: 10px;
  min-width: 440px;
  padding: 16px;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.hero-statistics :deep(.ant-statistic-title),
.hero-statistics :deep(.ant-statistic-content) {
  color: #fff;
}

.hero-statistics :deep(.ant-statistic-content) {
  font-size: 21px;
}

.workflow-tabs :deep(.ant-card-body) {
  padding: 0 22px;
}

.workflow-tabs :deep(.ant-tabs-nav) {
  margin: 0;
}

.proof-toolbar {
  margin-bottom: 0;
}

.proof-toolbar :deep(.ant-card-body) {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.proof-toolbar h2 {
  margin: 7px 0 3px;
  font-size: 20px;
}

.proof-toolbar p {
  margin: 0;
  color: hsl(var(--foreground) / 55%);
}

.issue-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.preview-card {
  min-height: 640px;
}

.preview-card :deep(.ant-card-body) {
  padding: 0;
}

.online-preview {
  max-width: 960px;
  padding: 30px;
  margin: 0 auto;
  background: hsl(var(--background));
}

.online-preview > header {
  padding-bottom: 22px;
  margin-bottom: 22px;
  text-align: center;
  border-bottom: 1px solid hsl(var(--border));
}

.online-preview > header h2 {
  margin: 10px 0 5px;
}

.online-section {
  margin-top: 26px;
}

.online-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.online-item {
  margin-bottom: 12px;
}

.online-item h4 {
  margin: 0 0 10px;
}

.online-item small {
  font-weight: 400;
  color: hsl(var(--foreground) / 55%);
}

.interaction-proof {
  padding: 14px;
  margin-top: 14px;
  background: hsl(var(--accent) / 32%);
  border-radius: 8px;
}

.print-frame {
  width: 100%;
  min-height: 800px;
  background: #eef1f4;
  border: 0;
}

.publication-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(350px, 0.55fr);
  gap: 16px;
  align-items: start;
}

.approval-details {
  margin-top: 22px;
}

.approval-details code,
.publication-card code {
  overflow-wrap: anywhere;
}

.approval-alert,
.advance-button,
.package-alert {
  margin-top: 16px;
}

.artifact-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.artifact-list article {
  display: flex;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  background: hsl(var(--accent) / 40%);
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.artifact-list article > span {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #0e7490;
  border-radius: 8px;
}

.artifact-list article > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.artifact-list strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-list small {
  margin-top: 4px;
  color: hsl(var(--foreground) / 50%);
}

.artifact-actions {
  margin-top: 16px;
}

@media (max-width: 1200px) {
  .hero {
    align-items: flex-start;
  }

  .hero-statistics {
    grid-template-columns: repeat(2, 1fr);
    min-width: 360px;
  }

  .publication-layout {
    grid-template-columns: 1fr;
  }

  .artifact-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .hero,
  .proof-toolbar :deep(.ant-card-body) {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-statistics {
    width: 100%;
    min-width: 0;
  }

  .issue-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 22px;
  }

  .hero-statistics {
    grid-template-columns: 1fr 1fr;
  }

  .proof-toolbar :deep(.ant-space),
  .proof-toolbar :deep(.ant-select) {
    width: 100%;
  }

  .online-preview {
    padding: 16px;
  }
}
</style>
