<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Descriptions,
  message,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  assembleBlueprint,
  bankStore,
  getPaper,
  paperStats,
  PRIMITIVE_LABEL,
  swapPaperItem,
} from '../store';

defineOptions({ name: 'BankAssemble' });

const route = useRoute();
const router = useRouter();
const paperId = ref(bankStore.lastPaperId);
const running = ref(false);

const paper = computed(() => getPaper(paperId.value));
const stats = computed(() => (paper.value ? paperStats(paper.value) : null));

const blueprintOptions = computed(() =>
  bankStore.blueprints.map((item) => ({
    label: item.name,
    value: item.id,
  })),
);
const paperOptions = computed(() =>
  bankStore.papers.map((item) => ({ label: item.name, value: item.id })),
);

const selectedBlueprint = ref(
  String(route.query.blueprintId || bankStore.blueprints[0]?.id || ''),
);

watch(
  () => route.query.blueprintId,
  (id) => {
    if (id) selectedBlueprint.value = String(id);
  },
);

function run(variant: 'A' | 'B') {
  if (!selectedBlueprint.value) return;
  running.value = true;
  const created = assembleBlueprint(selectedBlueprint.value, variant);
  paperId.value = created.id;
  running.value = false;
  if (created.gaps.length > 0)
    message.warning(`已组卷，但有 ${created.gaps.length} 条缺口`);
  else message.success(`已生成${variant}卷快照`);
}

function swap(questionId: string) {
  const ok = swapPaperItem(paperId.value, questionId);
  message[ok ? 'success' : 'warning'](
    ok ? '已置换同类题' : '没有可换的同类正式题',
  );
}

const itemRows = computed(() =>
  (paper.value?.sections || []).flatMap((section, sIndex) =>
    section.items.map((item, i) => ({
      key: item.questionId,
      section: section.name,
      index: `${sIndex + 1}-${i + 1}`,
      title: item.snapshot.title,
      primitive: PRIMITIVE_LABEL[item.snapshot.primitive],
      channel: item.snapshot.channel,
      score: item.score,
      questionId: item.questionId,
    })),
  ),
);

function toStudio() {
  router.push({
    path: '/question-bank/studio',
    query: { paperId: paperId.value },
  });
}

function toPreview() {
  router.push({
    path: '/question-bank/preview',
    query: { paperId: paperId.value },
  });
}
</script>

<template>
  <Page auto-content-height>
    <div class="as-page">
      <Card title="智能组卷" :bordered="false">
        <Space wrap>
          <span>蓝图</span>
          <Select
            v-model:value="selectedBlueprint"
            style="width: 280px"
            :options="blueprintOptions"
          />
          <Button type="primary" :loading="running" @click="run('A')">
            生成 A 卷
          </Button>
          <Button :loading="running" @click="run('B')">生成 B 卷</Button>
          <Select
            v-model:value="paperId"
            style="width: 280px"
            :options="paperOptions"
            placeholder="已生成的快照"
          />
        </Space>
      </Card>

      <Card v-if="paper && stats" title="覆盖报告" :bordered="false">
        <Descriptions bordered size="small" :column="4">
          <Descriptions.Item label="试卷">{{ paper.name }}</Descriptions.Item>
          <Descriptions.Item label="题量">{{ stats.count }}</Descriptions.Item>
          <Descriptions.Item label="实得总分">
            {{ stats.score }}
          </Descriptions.Item>
          <Descriptions.Item label="蓝图总分">
            {{ paper.totalScore }}
          </Descriptions.Item>
        </Descriptions>
        <div class="mt-3">
          <Tag v-for="(n, k) in stats.byPrimitive" :key="k">
            {{ k }} {{ n }}
          </Tag>
          <Tag
            v-for="(n, k) in stats.byDifficulty"
            :key="`d-${k}`"
            color="blue"
          >
            {{ k }} {{ n }}
          </Tag>
        </div>
        <div v-if="paper.gaps.length > 0" class="gap-box">
          <p v-for="gap in paper.gaps" :key="gap">{{ gap }}</p>
        </div>
        <p v-else class="ok">规则已抽满，池子够用。</p>
        <Space class="mt-3">
          <Button type="primary" @click="toStudio">进入试卷工作室</Button>
          <Button @click="toPreview">双通道预览</Button>
        </Space>
      </Card>

      <Card title="题目清单 · 可置换" :bordered="false">
        <Table
          :data-source="itemRows"
          :pagination="false"
          :columns="[
            { title: '大题', dataIndex: 'section', width: 160 },
            { title: '序号', dataIndex: 'index', width: 80 },
            { title: '标题', dataIndex: 'title' },
            { title: '原语', dataIndex: 'primitive', width: 90 },
            { title: '分', dataIndex: 'score', width: 60 },
            { title: '操作', key: 'action', width: 100 },
          ]"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <Button type="link" size="small" @click="swap(record.questionId)">
                换同类
              </Button>
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.as-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gap-box {
  padding: 8px 12px;
  margin-top: 12px;
  color: hsl(var(--destructive));
  background: hsl(var(--destructive) / 8%);
  border-radius: 6px;
}

.ok {
  margin-top: 12px;
  color: hsl(var(--foreground) / 60%);
}
</style>
