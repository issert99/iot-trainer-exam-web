<script lang="ts" setup>
import type { PrintArtifactKind } from '../renderers/print';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  message,
  Radio,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import QuestionRender from '../components/QuestionRender.vue';
import { validatePaperCompatibility } from '../plugins/registry';
import {
  createPrintPublicationPackage,
  openPrintArtifact,
} from '../renderers/print';
import {
  bankStore,
  CHANNEL_LABEL,
  getCourse,
  getLayout,
  getPaper,
} from '../store';

defineOptions({ name: 'BankPreview' });

const route = useRoute();
const paperId = ref(String(route.query.paperId || bankStore.lastPaperId));
const mode = ref<'cbt' | 'paper' | 'sheet'>('paper');

watch(
  () => route.query.paperId,
  (id) => {
    if (id) paperId.value = String(id);
  },
);

const paper = computed(() => getPaper(paperId.value));
const course = computed(() =>
  paper.value ? getCourse(paper.value.courseId) : undefined,
);
const paperOptions = computed(() =>
  bankStore.papers.map((item) => ({ label: item.name, value: item.id })),
);

const layoutName = computed(() => {
  if (!paper.value) return '';
  let id = paper.value.layoutSheetId;
  if (mode.value === 'cbt') {
    id = paper.value.layoutCbtId;
  } else if (mode.value === 'paper') {
    id = paper.value.layoutPaperId;
  }
  return getLayout(id)?.name || '';
});

const warnings = computed(() => {
  if (!paper.value) return [];
  const channel = mode.value === 'cbt' ? 'online' : 'print';
  const list = validatePaperCompatibility(paper.value)
    .filter((issue) => issue.channel === channel)
    .map(
      (issue) =>
        `${issue.blocking ? '阻断' : '提醒'}：${issue.questionTitle}—${issue.message}`,
    );
  if (
    mode.value !== 'cbt' &&
    paper.value.sections.some((section) =>
      section.items.some((item) => item.snapshot.primitive === 'passage'),
    )
  ) {
    list.push('材料复合题必须设置“题干与子题不拆页”。');
  }
  return list;
});

const publicationChecksum = computed(() => {
  if (!paper.value) return '';
  return createPrintPublicationPackage(
    paper.value,
    course.value?.name ?? '未命名课程',
  ).checksum;
});

function printArtifact(kind: PrintArtifactKind) {
  if (!paper.value) return;
  const opened = openPrintArtifact(
    paper.value,
    course.value?.name ?? '未命名课程',
    kind,
  );
  if (!opened) {
    message.warning('浏览器拦截了打印窗口，请允许本站打开新窗口');
    return;
  }
  message.success('已生成独立分页校样，可在新窗口打印或另存为 PDF');
}

const objectiveItems = computed(() =>
  paper.value
    ? paper.value.sections.flatMap((section) =>
        section.items.filter((item) =>
          ['blank', 'choice'].includes(item.snapshot.primitive),
        ),
      )
    : [],
);
</script>

<template>
  <Page>
    <div class="pv-page">
      <Card :bordered="false">
        <Space wrap>
          <Select
            v-model:value="paperId"
            style="width: 320px"
            :options="paperOptions"
          />
          <Radio.Group v-model:value="mode">
            <Radio.Button value="cbt">机考</Radio.Button>
            <Radio.Button value="paper">纸卷</Radio.Button>
            <Radio.Button value="sheet">答题卡</Radio.Button>
          </Radio.Group>
          <Tag>{{ layoutName }}</Tag>
          <Button @click="printArtifact('question')">试题册 / PDF</Button>
          <Button @click="printArtifact('answer-sheet')">答题册 / PDF</Button>
          <Button @click="printArtifact('answer-key')">答案与评分细则</Button>
          <Tag v-if="publicationChecksum" color="blue">
            出版包 {{ publicationChecksum }}
          </Tag>
        </Space>
      </Card>

      <Alert
        v-if="warnings.length > 0"
        type="warning"
        show-icon
        class="mb-0"
        :message="warnings.join(' ')"
      />

      <div v-if="paper" class="pv-stage">
        <article v-if="mode === 'paper'" class="sheet paper-sheet">
          <header class="paper-head">
            <p>密封线 .................... 知测示范大学</p>
            <h2>{{ course?.name }} {{ paper.name }}</h2>
            <p>
              时长 {{ paper.duration }} 分钟 · 满分 {{ paper.totalScore }} ·
              {{ CHANNEL_LABEL[paper.channel] }}
            </p>
          </header>
          <section v-for="section in paper.sections" :key="section.name">
            <h3>{{ section.name }}</h3>
            <QuestionRender
              v-for="(item, index) in section.items"
              :key="item.questionId"
              mode="paper"
              :question="item.snapshot"
              :score="item.score"
              :index="index + 1"
            />
          </section>
        </article>

        <article v-else-if="mode === 'cbt'" class="sheet cbt-sheet">
          <aside class="cbt-nav">
            <p>剩余 {{ paper.duration }}:00</p>
            <button
              v-for="(item, index) in paper.sections.flatMap((s) => s.items)"
              :key="item.questionId"
              type="button"
            >
              {{ index + 1 }}
            </button>
          </aside>
          <div class="cbt-main">
            <section v-for="section in paper.sections" :key="section.name">
              <h3>{{ section.name }}</h3>
              <QuestionRender
                v-for="(item, index) in section.items"
                :key="item.questionId"
                mode="cbt"
                :question="item.snapshot"
                :score="item.score"
                :index="index + 1"
              />
            </section>
          </div>
        </article>

        <article v-else class="sheet card-sheet">
          <header>
            <p>场次码 □□□□ · 座位码 □□□ · {{ paper.variant }}卷</p>
            <h2>答题卡 · {{ paper.name }}</h2>
          </header>
          <h3>客观区</h3>
          <div class="omr">
            <div
              v-for="(item, index) in objectiveItems"
              :key="item.questionId"
              class="omr-row"
            >
              <span>{{ index + 1 }}</span>
              <i v-for="k in ['A', 'B', 'C', 'D']" :key="k">{{ k }}</i>
            </div>
          </div>
          <h3>主观区</h3>
          <div
            v-for="item in paper.sections
              .flatMap((s) => s.items)
              .filter((i) => !['choice'].includes(i.snapshot.primitive))"
            :key="item.questionId"
            class="subj"
          >
            {{ item.snapshot.title }}（{{ item.score }}分）
          </div>
        </article>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.pv-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pv-stage {
  flex: 1;
  min-height: 0;
  padding: 8px 0 24px;
  overflow: auto;
}

.sheet {
  width: min(860px, 100%);
  padding: 28px 36px;
  margin: 0 auto;
  color: #1f1f1f;
  background: #fff;
  border: 1px solid hsl(var(--border));
}

.paper-head {
  margin-bottom: 20px;
  text-align: center;
}

.paper-head h2,
.card-sheet h2 {
  margin: 8px 0;
  font-size: 20px;
}

.paper-sheet h3,
.cbt-sheet h3,
.card-sheet h3 {
  margin: 16px 0 8px;
  font-size: 15px;
}

.cbt-sheet {
  display: flex;
  gap: 16px;
  padding: 0;
  background: #f4f6f8;
}

.cbt-nav {
  width: 88px;
  padding: 12px 8px;
  background: #e8edf2;
}

.cbt-nav button {
  width: 28px;
  height: 28px;
  margin: 4px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #c5ced6;
}

.cbt-main {
  flex: 1;
  padding: 16px 20px 24px;
  background: #fff;
}

.omr-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 6px 0;
}

.omr-row i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 11px;
  font-style: normal;
  border: 1px solid #333;
  border-radius: 50%;
}

.subj {
  min-height: 64px;
  padding: 8px;
  margin: 8px 0;
  border: 1px solid #bbb;
}
</style>
