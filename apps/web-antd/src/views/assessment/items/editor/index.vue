<script lang="ts" setup>
import type {
  AssessmentItemRevision,
  ContentDocument,
  ItemClassification,
  ItemMetadata,
  JsonObject,
  JsonValue,
} from '../../domain/types';

import { computed, reactive, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Progress,
  Select,
  Space,
  Steps,
  Tag,
} from 'ant-design-vue';

import ClassificationPicker from '../../components/ClassificationPicker.vue';
import ContentBlockEditor from '../../components/ContentBlockEditor.vue';
import InteractionHost from '../../components/InteractionHost.vue';
import ItemStem from '../../components/ItemStem.vue';
import { clone } from '../../domain/integrity';
import { getPlugin, scoreWithPlugin } from '../../plugins/registry';
import {
  createItemDraft,
  createItemRevision,
  getItemRevision,
  submitItemReview,
  updateItemDraft,
} from '../../stores/item-bank';
import { schoolAssessmentState } from '../../stores/state';

defineOptions({ name: 'AssessmentItemEditor' });

type CognitiveLevel = ItemClassification['cognitiveLevel'];
type Confidentiality = ItemMetadata['confidentiality'];
type ScoringMode = AssessmentItemRevision['scoring']['mode'];
type Visibility = ItemMetadata['ownership']['visibility'];

type EditorForm = {
  cognitiveLevel: CognitiveLevel;
  confidentiality: Confidentiality;
  difficulty: number;
  document: ContentDocument;
  estimatedSeconds: number;
  interactionConfigText: string;
  majorIds: string[];
  maxScore: number;
  pluginId: string;
  primaryCourseId: string;
  reusableCourseIds: string[];
  scoringMode: ScoringMode;
  source: string;
  tags: string[];
  taxonomyNodeIds: string[];
  templateRevisionId: string;
  title: string;
  visibility: Visibility;
};

const route = useRoute();
const router = useRouter();
const workingRevisionId = ref('');

const sourceId = computed(() => String(route.query.itemId ?? ''));
const sourceItem = computed(() => getItemRevision(sourceId.value));

const firstCourse = schoolAssessmentState.courses[0];
const firstPlugin =
  schoolAssessmentState.pluginPackages.find(
    (plugin) => plugin.status === 'enabled',
  ) ?? schoolAssessmentState.pluginPackages[0];
const firstTemplate = schoolAssessmentState.interactionTemplates.find(
  (template) => template.status === 'enabled',
);

function createEmptyDocument(): ContentDocument {
  return {
    blocks: [
      {
        data: { text: '' },
        id: `draft-block-${Date.now()}`,
        type: 'paragraph',
      },
    ],
    schemaVersion: '1.0',
  };
}

function defaultPluginConfig(pluginId: string) {
  try {
    return getPlugin(pluginId).createDefaultConfig();
  } catch {
    return {};
  }
}

const form = reactive<EditorForm>({
  cognitiveLevel: 'apply',
  confidentiality: 'internal',
  difficulty: 3,
  document: createEmptyDocument(),
  estimatedSeconds: 300,
  interactionConfigText: JSON.stringify(
    defaultPluginConfig(firstPlugin?.id ?? 'core.choice'),
    null,
    2,
  ),
  majorIds: firstCourse?.applicableMajorIds.slice(0, 1) ?? [],
  maxScore: 10,
  pluginId: firstPlugin?.id ?? 'core.choice',
  primaryCourseId: firstCourse?.id ?? '',
  reusableCourseIds: firstCourse?.id ? [firstCourse.id] : [],
  scoringMode: 'hybrid',
  source: '校内原创',
  tags: [],
  templateRevisionId: firstTemplate?.id ?? '',
  taxonomyNodeIds: [],
  title: '',
  visibility: 'school',
});

const pluginOptions = computed(() =>
  schoolAssessmentState.pluginPackages.map((plugin) => ({
    disabled: !['enabled', 'testing'].includes(plugin.status),
    label: `${plugin.name} · ${plugin.version}`,
    value: plugin.id,
  })),
);

const courseOptions = computed(() =>
  schoolAssessmentState.courses.map((course) => ({
    label: `${course.name} · ${course.code}`,
    value: course.id,
  })),
);

const majorOptions = computed(() =>
  schoolAssessmentState.majors.map((major) => ({
    label: major.name,
    value: major.id,
  })),
);

const reusableCourseOptions = computed(() =>
  schoolAssessmentState.courses.map((course) => ({
    label: course.name,
    value: course.id,
  })),
);

const tagOptions = computed(() => {
  const tags = new Set<string>();
  schoolAssessmentState.itemRevisions.forEach((item) =>
    item.classification.freeTags.forEach((tag) => tags.add(tag)),
  );
  return [...tags].map((tag) => ({ label: tag, value: tag }));
});

const cognitiveOptions: Array<{ label: string; value: CognitiveLevel }> = [
  { label: '记忆', value: 'remember' },
  { label: '理解', value: 'understand' },
  { label: '应用', value: 'apply' },
  { label: '分析', value: 'analyze' },
  { label: '评价', value: 'evaluate' },
  { label: '创造', value: 'create' },
];

const selectedPlugin = computed(() =>
  schoolAssessmentState.pluginPackages.find(
    (plugin) => plugin.id === form.pluginId,
  ),
);

const templateOptions = computed(() =>
  schoolAssessmentState.interactionTemplates
    .filter((template) => template.status === 'enabled')
    .map((template) => ({
      label: `${template.name} · r${template.revision}`,
      value: template.id,
    })),
);

const selectedTemplate = computed(() =>
  schoolAssessmentState.interactionTemplates.find(
    (template) => template.id === form.templateRevisionId,
  ),
);

const selectedCourse = computed(() =>
  schoolAssessmentState.courses.find(
    (course) => course.id === form.primaryCourseId,
  ),
);

const previewConfiguration = computed(() => {
  try {
    const parsed = JSON.parse(form.interactionConfigText) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : {};
  } catch {
    return {};
  }
});

const documentText = computed(() =>
  form.document.blocks
    .map((block) =>
      String(
        block.data.text ?? block.data.source ?? block.data.label ?? '',
      ).trim(),
    )
    .filter(Boolean)
    .join('\n\n'),
);

const completionChecks = computed(() => [
  Boolean(form.title.trim() && documentText.value),
  Boolean(form.pluginId && previewConfiguration.value),
  Boolean(form.primaryCourseId && form.majorIds.length > 0),
  form.taxonomyNodeIds.length > 0,
  Boolean(form.maxScore > 0 && form.estimatedSeconds > 0),
]);

const completionPercent = computed(
  () =>
    Math.round(
      (completionChecks.value.filter(Boolean).length /
        completionChecks.value.length) *
        100,
    ) || 0,
);

function outlineDescription(index: number) {
  if (index === 0) return form.title || '待填写';
  return completionChecks.value[index] ? '已配置' : '待完善';
}

const outlineItems = computed(() =>
  ['基础信息', '内容画布', '答题交互', '分类与适用', '评分与渠道'].map(
    (title, index) => ({
      description: outlineDescription(index),
      status: completionChecks.value[index] ? ('finish' as const) : undefined,
      title,
    }),
  ),
);

const channelTags = computed(() => {
  const capabilities = selectedPlugin.value?.capabilities;
  if (!capabilities) return [];
  return [
    { enabled: capabilities.online, label: '机考', value: 'online' },
    { enabled: capabilities.print, label: '纸笔', value: 'print' },
    { enabled: capabilities.practical, label: '实践', value: 'practical' },
  ];
});

const savedRevision = computed(() =>
  workingRevisionId.value
    ? getItemRevision(workingRevisionId.value)
    : undefined,
);

function loadSource(item: AssessmentItemRevision | undefined) {
  workingRevisionId.value = '';
  if (!item) {
    const course = schoolAssessmentState.courses[0];
    const plugin =
      schoolAssessmentState.pluginPackages.find(
        (entry) => entry.status === 'enabled',
      ) ?? schoolAssessmentState.pluginPackages[0];
    Object.assign(form, {
      cognitiveLevel: 'apply',
      confidentiality: 'internal',
      difficulty: 3,
      document: createEmptyDocument(),
      estimatedSeconds: 300,
      interactionConfigText: JSON.stringify(
        defaultPluginConfig(plugin?.id ?? 'core.choice'),
        null,
        2,
      ),
      majorIds: course?.applicableMajorIds.slice(0, 1) ?? [],
      maxScore: 10,
      pluginId: plugin?.id ?? 'core.choice',
      primaryCourseId: course?.id ?? '',
      reusableCourseIds: course?.id ? [course.id] : [],
      scoringMode: 'hybrid',
      source: '校内原创',
      tags: [],
      templateRevisionId:
        schoolAssessmentState.interactionTemplates.find(
          (template) => template.status === 'enabled',
        )?.id ?? '',
      taxonomyNodeIds: [],
      title: '',
      visibility: 'school',
    } satisfies EditorForm);
    return;
  }

  Object.assign(form, {
    cognitiveLevel: item.classification.cognitiveLevel,
    confidentiality: item.metadata.confidentiality,
    difficulty: item.metadata.difficulty,
    document: clone(item.stem),
    estimatedSeconds: item.metadata.estimatedSeconds,
    interactionConfigText: JSON.stringify(item.interaction.config, null, 2),
    majorIds: [...item.metadata.applicability.majorIds],
    maxScore: item.maxScore,
    pluginId: item.interaction.pluginId,
    primaryCourseId: item.metadata.ownership.primaryCourseId,
    reusableCourseIds: [...item.metadata.applicability.reusableCourseIds],
    scoringMode: item.scoring.mode,
    source: item.metadata.source,
    tags: [...item.classification.freeTags],
    templateRevisionId: item.interaction.templateRevisionId ?? '',
    taxonomyNodeIds: [...item.classification.taxonomyNodeIds],
    title: item.title,
    visibility: item.metadata.ownership.visibility,
  } satisfies EditorForm);
}

watch(sourceItem, loadSource, { immediate: true });

function changePlugin(value: unknown) {
  const pluginId = String(value);
  form.pluginId = pluginId;
  if (pluginId === 'builder.no-code' && !form.templateRevisionId) {
    form.templateRevisionId =
      schoolAssessmentState.interactionTemplates.find(
        (template) => template.status === 'enabled',
      )?.id ?? '';
  }
  const defaultConfig = defaultPluginConfig(pluginId);
  if (pluginId === 'builder.no-code' && form.templateRevisionId) {
    defaultConfig.templateRevisionId = form.templateRevisionId;
  }
  form.interactionConfigText = JSON.stringify(defaultConfig, null, 2);
  const plugin = schoolAssessmentState.pluginPackages.find(
    (entry) => entry.id === pluginId,
  );
  form.scoringMode = plugin?.capabilities.automaticScoring
    ? 'automatic'
    : 'human';
}

function changeTemplate(value: unknown) {
  form.templateRevisionId = String(value);
  form.scoringMode = 'hybrid';
  form.interactionConfigText = JSON.stringify(
    {
      ...previewConfiguration.value,
      templateRevisionId: form.templateRevisionId,
    },
    null,
    2,
  );
}

function changePrimaryCourse(value: unknown) {
  const courseId = String(value);
  form.primaryCourseId = courseId;
  const course = schoolAssessmentState.courses.find(
    (entry) => entry.id === courseId,
  );
  if (course) {
    form.majorIds = [...course.applicableMajorIds];
    form.reusableCourseIds = [
      ...new Set([course.id, ...form.reusableCourseIds]),
    ];
  }
}

function parseInteractionConfig() {
  const parsed = JSON.parse(form.interactionConfigText) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('交互配置必须是 JSON 对象');
  }
  return parsed as JsonObject;
}

function buildInteraction(config: JsonObject) {
  const templateRevisionId =
    form.pluginId === 'builder.no-code' ? form.templateRevisionId : undefined;
  if (form.pluginId === 'builder.no-code' && !templateRevisionId) {
    throw new Error('请选择已启用的无代码交互模板版本');
  }
  return {
    config:
      templateRevisionId === undefined
        ? config
        : { ...config, templateRevisionId },
    kind:
      templateRevisionId === undefined
        ? ('plugin' as const)
        : ('template' as const),
    pluginId: form.pluginId,
    pluginVersion: selectedPlugin.value?.version ?? '1.0.0',
    templateRevisionId,
  };
}

function buildClassification(): ItemClassification {
  return {
    cognitiveLevel: form.cognitiveLevel,
    freeTags: [...form.tags],
    taxonomyNodeIds: [...form.taxonomyNodeIds],
  };
}

function buildMetadata(): ItemMetadata {
  const source = savedRevision.value ?? sourceItem.value;
  const primaryCourse = selectedCourse.value;
  const majorRecords = schoolAssessmentState.majors.filter((major) =>
    form.majorIds.includes(major.id),
  );
  const curriculumPlanIds = schoolAssessmentState.curriculumPlans
    .filter((plan) => form.majorIds.includes(plan.majorId))
    .map((plan) => plan.id);
  const difficulty = Math.min(
    5,
    Math.max(1, Math.round(form.difficulty)),
  ) as ItemMetadata['difficulty'];

  return {
    applicability: {
      curriculumPlanIds,
      disciplineIds: [
        ...new Set(majorRecords.map((major) => major.disciplineId)),
      ],
      educationLevels: [
        ...new Set(
          majorRecords.map((major) =>
            major.degreeLevel === 'bachelor' ? '本科' : major.degreeLevel,
          ),
        ),
      ],
      gradeBands: source?.metadata.applicability.gradeBands.length
        ? [...source.metadata.applicability.gradeBands]
        : ['大一', '大二'],
      majorIds: [...form.majorIds],
      reusableCourseIds: [
        ...new Set([form.primaryCourseId, ...form.reusableCourseIds]),
      ],
    },
    confidentiality: form.confidentiality,
    difficulty,
    estimatedSeconds: Math.max(30, Math.round(form.estimatedSeconds)),
    ownership: {
      authorIds: source?.metadata.ownership.authorIds.length
        ? [...source.metadata.ownership.authorIds]
        : ['teacher-demo'],
      maintainerTeam: source?.metadata.ownership.maintainerTeam ?? '课程命题组',
      ownerOrgId:
        primaryCourse?.ownerOrgId ??
        source?.metadata.ownership.ownerOrgId ??
        schoolAssessmentState.school.id,
      primaryCourseId: form.primaryCourseId,
      visibility: form.visibility,
    },
    quality: source
      ? clone(source.metadata.quality)
      : {
          exposureCount: 0,
          sampleSize: 0,
          usageCount: 0,
        },
    source: form.source.trim() || '校内原创',
  };
}

const previewResponse = shallowRef<JsonValue>({});

watch(
  () => [form.pluginId, form.templateRevisionId],
  () => {
    previewResponse.value = {};
  },
);

const previewItem = computed<AssessmentItemRevision>(() => {
  const capabilities = selectedPlugin.value?.capabilities;
  const templateRevisionId =
    form.pluginId === 'builder.no-code'
      ? form.templateRevisionId || undefined
      : undefined;
  return {
    channelVariants: [
      {
        channel: 'online',
        mode: capabilities?.online ? 'native' : 'unsupported',
      },
      {
        channel: 'print',
        mode: capabilities?.print ? 'equivalent' : 'unsupported',
      },
      {
        channel: 'practical',
        mode: capabilities?.practical ? 'native' : 'unsupported',
      },
    ],
    checksum: 'live-preview',
    classification: buildClassification(),
    createdAt: new Date().toISOString(),
    createdBy: 'teacher-demo',
    familyId: sourceItem.value?.familyId ?? 'preview-family',
    id: 'live-preview@0',
    interaction: {
      config: {
        ...previewConfiguration.value,
        ...(templateRevisionId ? { templateRevisionId } : {}),
      },
      kind: templateRevisionId ? 'template' : 'plugin',
      pluginId: form.pluginId,
      pluginVersion: selectedPlugin.value?.version ?? '1.0.0',
      templateRevisionId,
    },
    language: 'zh-CN',
    maxScore: form.maxScore,
    metadata: buildMetadata(),
    revision: 0,
    scoring: {
      config: {},
      mode: form.scoringMode,
      policyVersion: 'preview',
    },
    status: 'draft',
    stem: form.document,
    title: form.title || '未命名题目',
  };
});

const previewResponseJson = computed(() =>
  JSON.stringify(previewResponse.value, null, 2),
);

const previewScoreResult = computed(() => {
  try {
    return scoreWithPlugin(
      previewItem.value,
      {
        pluginId: form.pluginId,
        value: previewResponse.value,
      },
      form.maxScore,
    );
  } catch {
    return {
      awardedScore: 0,
      evidence: ['交互配置尚未完成'],
      requiresHumanReview: true,
    };
  }
});

function validateDraft() {
  if (!form.title.trim()) throw new Error('请填写题目标题');
  if (!documentText.value) throw new Error('请填写至少一个内容块');
  if (!form.primaryCourseId) throw new Error('请选择主课程');
  if (form.majorIds.length === 0) throw new Error('请选择适用专业');
  if (form.maxScore <= 0) throw new Error('分值必须大于 0');
  return parseInteractionConfig();
}

function saveDraft(showSuccess = true) {
  try {
    const interactionConfig = validateDraft();
    const patch = {
      classification: buildClassification(),
      document: form.document,
      interaction: buildInteraction(interactionConfig),
      maxScore: form.maxScore,
      metadata: buildMetadata(),
      stemText: documentText.value,
      title: form.title.trim(),
    };
    let item: AssessmentItemRevision;
    if (workingRevisionId.value) {
      item = updateItemDraft(workingRevisionId.value, patch);
    } else if (sourceItem.value) {
      item = createItemRevision(sourceItem.value.id, patch);
    } else {
      item = createItemDraft({
        classification: buildClassification(),
        document: form.document,
        interaction: patch.interaction,
        maxScore: form.maxScore,
        metadata: buildMetadata(),
        stemText: documentText.value,
        title: form.title.trim(),
      });
    }
    workingRevisionId.value = item.id;
    if (showSuccess) {
      message.success(`草稿已保存为 v${item.revision}`);
    }
    return item;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存草稿失败');
    return undefined;
  }
}

function submitReview() {
  if (form.taxonomyNodeIds.length === 0) {
    message.warning('提交前至少关联一个受控分类节点');
    return;
  }
  const item = saveDraft(false);
  if (!item) return;
  try {
    submitItemReview(item.id);
    message.success(`v${item.revision} 已提交审核`);
    void router.push('/assessment/items/review');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '提交审核失败');
  }
}

function leaveEditor() {
  void router.push('/assessment/items');
}
</script>

<template>
  <Page>
    <div class="item-editor-page">
      <section class="editor-heading">
        <div>
          <div class="editor-heading__eyebrow">
            <Tag color="purple">命题工作台</Tag>
            <span v-if="sourceItem">
              基于 {{ sourceItem.id }} 创建不可变新版本
            </span>
            <span v-else>创建新的题目家族</span>
          </div>
          <h1>{{ form.title || '未命名题目' }}</h1>
          <div class="editor-heading__progress">
            <Progress :percent="completionPercent" size="small" />
            <span v-if="savedRevision"> 最近保存：{{ savedRevision.id }} </span>
          </div>
        </div>
        <Space wrap>
          <Button @click="leaveEditor">返回题库</Button>
          <Button @click="saveDraft()">保存草稿</Button>
          <Button type="primary" @click="submitReview">提交审核</Button>
        </Space>
      </section>

      <Alert
        v-if="sourceItem"
        show-icon
        type="info"
        message="原版本不会被覆盖"
        :description="`当前编辑内容首次保存后将成为 ${sourceItem.familyId} 的后续草稿版本。`"
      />

      <div class="editor-grid">
        <aside class="editor-outline">
          <Card :bordered="false" title="命题大纲">
            <Steps direction="vertical" :items="outlineItems" size="small" />
          </Card>
        </aside>

        <main class="editor-canvas">
          <Card :bordered="false" title="基础信息">
            <Form layout="vertical">
              <Form.Item label="题目标题" required>
                <Input
                  v-model:value="form.title"
                  :maxlength="120"
                  placeholder="便于教师检索和辨识，不直接展示给考生"
                  show-count
                />
              </Form.Item>
              <div class="form-grid">
                <Form.Item label="主课程" required>
                  <Select
                    :options="courseOptions"
                    :value="form.primaryCourseId"
                    show-search
                    option-filter-prop="label"
                    @update:value="changePrimaryCourse"
                  />
                </Form.Item>
                <Form.Item label="题目来源">
                  <Input v-model:value="form.source" />
                </Form.Item>
              </div>
            </Form>
          </Card>

          <Card :bordered="false" title="题干内容">
            <ContentBlockEditor v-model="form.document" />
          </Card>
        </main>

        <aside class="editor-inspector">
          <Card :bordered="false" size="small" title="答题交互">
            <Form layout="vertical">
              <Form.Item label="交互包">
                <Select
                  :disabled="Boolean(sourceItem || workingRevisionId)"
                  :options="pluginOptions"
                  :value="form.pluginId"
                  @update:value="changePlugin"
                />
              </Form.Item>
              <Form.Item
                v-if="form.pluginId === 'builder.no-code'"
                label="无代码模板版本"
                required
              >
                <Select
                  :options="templateOptions"
                  :value="form.templateRevisionId"
                  @update:value="changeTemplate"
                />
              </Form.Item>
              <Alert
                v-if="selectedPlugin"
                class="mb-3"
                :message="selectedPlugin.name"
                :description="selectedPlugin.description"
                type="info"
              />
              <Form.Item label="交互配置 JSON">
                <Input.TextArea
                  v-model:value="form.interactionConfigText"
                  :auto-size="{ minRows: 5, maxRows: 12 }"
                  class="config-editor"
                />
              </Form.Item>
            </Form>
          </Card>

          <Card :bordered="false" size="small" title="分类与适用">
            <Form layout="vertical">
              <Form.Item label="认知层级">
                <Select
                  v-model:value="form.cognitiveLevel"
                  :options="cognitiveOptions"
                />
              </Form.Item>
              <Form.Item label="受控分类" required>
                <ClassificationPicker
                  v-model="form.taxonomyNodeIds"
                  :course-ids="[form.primaryCourseId]"
                  :nodes="schoolAssessmentState.taxonomyNodes"
                  :schemes="schoolAssessmentState.taxonomySchemes"
                />
              </Form.Item>
              <Form.Item label="适用专业" required>
                <Select
                  v-model:value="form.majorIds"
                  mode="multiple"
                  :options="majorOptions"
                  placeholder="选择一个或多个专业"
                />
              </Form.Item>
              <Form.Item label="可复用课程">
                <Select
                  v-model:value="form.reusableCourseIds"
                  mode="multiple"
                  :options="reusableCourseOptions"
                />
              </Form.Item>
              <Form.Item label="自由标签">
                <Select
                  v-model:value="form.tags"
                  mode="tags"
                  :options="tagOptions"
                  placeholder="输入后回车创建标签"
                />
              </Form.Item>
            </Form>
          </Card>

          <Card :bordered="false" size="small" title="评分与渠道">
            <div class="form-grid form-grid--compact">
              <Form.Item label="分值">
                <InputNumber
                  v-model:value="form.maxScore"
                  :min="1"
                  :precision="1"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item label="预计用时（秒）">
                <InputNumber
                  v-model:value="form.estimatedSeconds"
                  :min="30"
                  :step="30"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item label="难度">
                <InputNumber
                  v-model:value="form.difficulty"
                  :max="5"
                  :min="1"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item label="评分方式">
                <Select
                  v-model:value="form.scoringMode"
                  :options="[
                    { label: '自动评分', value: 'automatic' },
                    { label: '人工评分', value: 'human' },
                    { label: '混合评分', value: 'hybrid' },
                    { label: '外部服务', value: 'external' },
                  ]"
                />
              </Form.Item>
            </div>
            <Form.Item label="保密级别">
              <Select
                v-model:value="form.confidentiality"
                :options="[
                  { label: '校内', value: 'internal' },
                  { label: '公开', value: 'public' },
                  { label: '机密', value: 'confidential' },
                  { label: '秘密', value: 'secret' },
                ]"
              />
            </Form.Item>
            <Form.Item label="可见范围">
              <Select
                v-model:value="form.visibility"
                :options="[
                  { label: '全校可见', value: 'school' },
                  { label: '团队可见', value: 'team' },
                  { label: '受限', value: 'restricted' },
                ]"
              />
            </Form.Item>
            <div class="channel-summary">
              <span>渠道能力</span>
              <div>
                <Tag
                  v-for="channel in channelTags"
                  :key="channel.value"
                  :color="channel.enabled ? 'green' : 'default'"
                >
                  {{ channel.label }} ·
                  {{ channel.enabled ? '可用' : '不支持' }}
                </Tag>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <Card :bordered="false" class="live-preview" title="实时预览">
        <template #extra>
          <Tag color="processing">随内容画布同步</Tag>
        </template>
        <div class="live-preview__canvas">
          <div class="live-preview__stem">
            <span>题干预览</span>
            <h3>{{ form.title || '未命名题目' }}</h3>
            <ItemStem :document="form.document" />
          </div>
          <div class="live-preview__interaction">
            <Tag color="purple">
              {{ selectedPlugin?.name || '未选择交互' }}
            </Tag>
            <strong>考生真实作答</strong>
            <InteractionHost v-model="previewResponse" :item="previewItem" />
            <div class="live-preview__debug">
              <div>
                <small>响应 JSON</small>
                <pre>{{ previewResponseJson }}</pre>
              </div>
              <div>
                <small>即时评分</small>
                <p>
                  {{ previewScoreResult.awardedScore }} / {{ form.maxScore }} 分
                  ·
                  {{
                    previewScoreResult.requiresHumanReview
                      ? '含人工复核'
                      : '自动完成'
                  }}
                </p>
                <small>{{ previewScoreResult.evidence.join('；') }}</small>
              </div>
              <div>
                <small>纸面替代</small>
                <p v-if="selectedTemplate">
                  {{ selectedTemplate.paperFallback.note }} ·
                  {{ selectedTemplate.paperFallback.answerLines }} 行答题区
                </p>
                <p v-else>
                  {{
                    selectedPlugin?.capabilities.print
                      ? '按插件打印渲染器生成等价题面'
                      : '当前交互不支持纸笔渠道'
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.item-editor-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.editor-heading__eyebrow {
  display: flex;
  gap: 8px;
  align-items: center;
  color: hsl(var(--foreground) / 55%);
}

.editor-heading h1 {
  margin: 8px 0 5px;
  font-size: 24px;
}

.editor-heading__progress {
  display: grid;
  grid-template-columns: minmax(220px, 360px) auto;
  gap: 12px;
  align-items: center;
}

.editor-heading__progress span {
  font-size: 12px;
  color: hsl(var(--foreground) / 48%);
}

.editor-grid {
  display: grid;
  grid-template-columns: 210px minmax(520px, 1fr) 340px;
  gap: 14px;
  align-items: start;
}

.editor-outline,
.editor-inspector {
  position: sticky;
  top: 14px;
}

.editor-canvas,
.editor-inspector {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid--compact {
  gap: 8px;
}

.config-editor :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.channel-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.channel-summary > span {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.live-preview__canvas {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.7fr);
  gap: 16px;
  min-height: 220px;
}

.live-preview__stem,
.live-preview__interaction {
  padding: 20px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.live-preview__stem > span {
  font-size: 12px;
  color: hsl(var(--foreground) / 48%);
}

.live-preview__stem h3 {
  margin: 6px 0 16px;
}

.live-preview__interaction {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  justify-content: center;
  background: hsl(var(--accent) / 32%);
  border-style: dashed;
}

.live-preview__interaction p {
  margin: 0;
  line-height: 1.7;
  color: hsl(var(--foreground) / 55%);
}

.live-preview__debug {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  width: 100%;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border));
}

.live-preview__debug small {
  color: hsl(var(--foreground) / 48%);
}

.live-preview__debug > div:last-child {
  grid-column: 1 / -1;
}

.live-preview__debug pre {
  max-height: 140px;
  padding: 8px;
  margin: 5px 0 0;
  overflow: auto;
  font-size: 11px;
  background: hsl(var(--accent) / 55%);
  border-radius: 6px;
}

@media (max-width: 1400px) {
  .editor-grid {
    grid-template-columns: 190px minmax(480px, 1fr);
  }

  .editor-inspector {
    position: static;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .editor-outline,
  .editor-inspector {
    position: static;
    grid-column: auto;
  }

  .editor-inspector {
    display: flex;
  }

  .live-preview__canvas {
    grid-template-columns: 1fr;
  }

  .live-preview__debug {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .editor-heading,
  .editor-heading__progress {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
