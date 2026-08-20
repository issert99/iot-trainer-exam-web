<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Input,
  InputNumber,
  message,
  Select,
  Space,
} from 'ant-design-vue';

import { bankStore, getPaper, paperStats, PRIMITIVE_LABEL } from '../store';

defineOptions({ name: 'BankStudio' });

const route = useRoute();
const router = useRouter();
const paperId = ref(String(route.query.paperId || bankStore.lastPaperId));

watch(
  () => route.query.paperId,
  (id) => {
    if (id) paperId.value = String(id);
  },
);

const paper = computed(() => getPaper(paperId.value));
const stats = computed(() => (paper.value ? paperStats(paper.value) : null));
const paperOptions = computed(() =>
  bankStore.papers.map((item) => ({ label: item.name, value: item.id })),
);

function move(sectionIndex: number, itemIndex: number, dir: -1 | 1) {
  const section = paper.value?.sections[sectionIndex];
  if (!section) return;
  const next = itemIndex + dir;
  if (next < 0 || next >= section.items.length) return;
  const current = section.items[itemIndex];
  const target = section.items[next];
  if (!current || !target) return;
  section.items[itemIndex] = target;
  section.items[next] = current;
}

function removeItem(sectionIndex: number, itemIndex: number) {
  paper.value?.sections[sectionIndex]?.items.splice(itemIndex, 1);
  message.success('已从本卷移除，题库题目仍在');
}

function preview() {
  router.push({
    path: '/question-bank/preview',
    query: { paperId: paperId.value },
  });
}

function save() {
  bankStore.lastPaperId = paperId.value;
  message.success('试卷快照已更新（仍在本地）');
}
</script>

<template>
  <Page>
    <div class="st-page">
      <Card :bordered="false" class="st-head">
        <Space wrap>
          <Select
            v-model:value="paperId"
            style="width: 320px"
            :options="paperOptions"
          />
          <span v-if="stats">
            {{ stats.count }} 题 · 实得 {{ stats.score }} / 卷面
            {{ paper?.totalScore }}
          </span>
          <Button @click="save">保存调整</Button>
          <Button type="primary" @click="preview">双通道预览</Button>
        </Space>
      </Card>

      <div v-if="paper" class="st-body">
        <Card
          v-for="(section, sIndex) in paper.sections"
          :key="section.name"
          :bordered="false"
          class="st-sec"
        >
          <template #title>
            <Input v-model:value="section.name" style="max-width: 280px" />
          </template>
          <div
            v-for="(item, i) in section.items"
            :key="item.questionId"
            class="st-item"
          >
            <div class="grow">
              <strong>{{ i + 1 }}. {{ item.snapshot.title }}</strong>
              <p>{{ item.snapshot.stem }}</p>
              <span class="meta">
                {{ PRIMITIVE_LABEL[item.snapshot.primitive] }} ·
                {{ item.snapshot.typeName }}
              </span>
            </div>
            <InputNumber
              v-model:value="item.score"
              :min="1"
              addon-before="分"
            />
            <Space>
              <Button size="small" @click="move(sIndex, i, -1)">上移</Button>
              <Button size="small" @click="move(sIndex, i, 1)">下移</Button>
              <Button size="small" danger @click="removeItem(sIndex, i)">
                移出
              </Button>
            </Space>
          </div>
          <p v-if="section.items.length === 0" class="empty">
            该大题暂无题目，回智能组卷补抽。
          </p>
        </Card>
      </div>
      <Card v-else title="还没有试卷">
        请先到组卷蓝图生成一份快照。
        <Button
          class="mt-3"
          type="primary"
          @click="router.push('/question-bank/blueprint')"
        >
          去蓝图
        </Button>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.st-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.st-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: auto;
}

.st-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.grow {
  flex: 1;
  min-width: 0;
}

.grow p {
  margin: 4px 0;
  opacity: 0.75;
}

.meta,
.empty {
  font-size: 12px;
  opacity: 0.55;
}
</style>
