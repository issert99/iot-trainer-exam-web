<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Input, Radio, Tag } from 'ant-design-vue';

import { bankStore } from '../store';

defineOptions({ name: 'BankLayouts' });

const kind = ref<'all' | 'cbt' | 'paper' | 'sheet'>('all');
const keyword = ref('');

const KIND_LABEL = {
  cbt: '机考布局',
  paper: '纸笔卷面',
  sheet: '答题卡',
} as const;

const list = computed(() =>
  bankStore.layouts.filter((item) => {
    if (kind.value !== 'all' && item.kind !== kind.value) return false;
    const key = keyword.value.trim();
    return !key || `${item.name}${item.remark}`.includes(key);
  }),
);

const usedBy = (id: string) =>
  bankStore.blueprints.filter(
    (item) =>
      item.layoutCbtId === id ||
      item.layoutPaperId === id ||
      item.layoutSheetId === id,
  );
</script>

<template>
  <Page>
    <Card title="版式模板库" :bordered="false">
      <div class="toolbar">
        <Radio.Group v-model:value="kind">
          <Radio.Button value="all">全部</Radio.Button>
          <Radio.Button value="cbt">机考布局</Radio.Button>
          <Radio.Button value="paper">纸笔卷面</Radio.Button>
          <Radio.Button value="sheet">答题卡</Radio.Button>
        </Radio.Group>
        <Input
          v-model:value="keyword"
          allow-clear
          placeholder="搜索模板"
          style="width: 220px"
        />
      </div>
      <p class="hint">
        试卷只引用模板，不复制一份内容。改模板会影响之后的预览和印刷，已冻结的考试快照仍用组卷当时的引用。
      </p>
      <div class="grid">
        <Card v-for="item in list" :key="item.id" size="small">
          <template #title>
            {{ item.name }}
          </template>
          <template #extra>
            <Tag>{{ KIND_LABEL[item.kind] }}</Tag>
          </template>
          <p>{{ item.remark }}</p>
          <p class="ref">
            被蓝图引用：
            {{
              usedBy(item.id)
                .map((bp) => bp.name)
                .join('、') || '暂无'
            }}
          </p>
        </Card>
      </div>
    </Card>
  </Page>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.hint {
  margin-bottom: 16px;
  color: hsl(var(--foreground) / 60%);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.ref {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.6;
}
</style>
