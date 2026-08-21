<script lang="ts" setup>
import type { ItemRevisionStatus } from '../domain/types';
import type { ItemFacetQuery } from '../stores/classification';

import { computed } from 'vue';

import { Button, Input, Select, Space, Tag } from 'ant-design-vue';

type FilterOption<T extends number | string = string> = {
  label: string;
  value: T;
};

const props = defineProps<{
  cognitiveOptions: FilterOption[];
  courseOptions: FilterOption[];
  difficultyOptions: FilterOption<number>[];
  interactionOptions: FilterOption[];
  majorOptions: FilterOption[];
  modelValue: ItemFacetQuery;
  statusOptions: FilterOption<ItemRevisionStatus>[];
  taxonomyOptions: FilterOption[];
}>();

const emit = defineEmits<{
  reset: [];
  'update:modelValue': [value: ItemFacetQuery];
}>();

function patchQuery(patch: Partial<ItemFacetQuery>) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

const keyword = computed({
  get: () => props.modelValue.keyword,
  set: (value: string) => patchQuery({ keyword: value }),
});
const courseIds = computed({
  get: () => props.modelValue.courseIds,
  set: (value: string[]) => patchQuery({ courseIds: value }),
});
const majorIds = computed({
  get: () => props.modelValue.majorIds,
  set: (value: string[]) => patchQuery({ majorIds: value }),
});
const taxonomyNodeIds = computed({
  get: () => props.modelValue.taxonomyNodeIds,
  set: (value: string[]) => patchQuery({ taxonomyNodeIds: value }),
});
const interactionIds = computed({
  get: () => props.modelValue.interactionIds,
  set: (value: string[]) => patchQuery({ interactionIds: value }),
});
const difficulty = computed({
  get: () => props.modelValue.difficulty,
  set: (value: number[]) => patchQuery({ difficulty: value }),
});
const cognitiveLevels = computed({
  get: () => props.modelValue.cognitiveLevels,
  set: (value: string[]) => patchQuery({ cognitiveLevels: value }),
});
const status = computed({
  get: () => props.modelValue.status,
  set: (value: ItemRevisionStatus[]) => patchQuery({ status: value }),
});

const activeFacetCount = computed(
  () =>
    [
      props.modelValue.courseIds,
      props.modelValue.majorIds,
      props.modelValue.taxonomyNodeIds,
      props.modelValue.interactionIds,
      props.modelValue.difficulty,
      props.modelValue.cognitiveLevels,
      props.modelValue.status,
    ].filter((entries) => entries.length > 0).length +
    (props.modelValue.keyword.trim() ? 1 : 0),
);
</script>

<template>
  <div class="facet-filter-bar">
    <div class="facet-filter-bar__primary">
      <Input
        v-model:value="keyword"
        allow-clear
        class="facet-filter-bar__search"
        placeholder="搜索题目、版本、课程或标签"
      />
      <Select
        v-model:value="courseIds"
        allow-clear
        mode="multiple"
        :max-tag-count="0"
        :options="courseOptions"
        placeholder="课程"
      />
      <Select
        v-model:value="majorIds"
        allow-clear
        mode="multiple"
        :max-tag-count="0"
        :options="majorOptions"
        placeholder="适用专业"
      />
      <Select
        v-model:value="taxonomyNodeIds"
        allow-clear
        mode="multiple"
        :max-tag-count="0"
        :options="taxonomyOptions"
        placeholder="受控分类"
        show-search
        option-filter-prop="label"
      />
      <Select
        v-model:value="interactionIds"
        allow-clear
        mode="multiple"
        :max-tag-count="0"
        :options="interactionOptions"
        placeholder="交互类型"
      />
    </div>

    <div class="facet-filter-bar__secondary">
      <Space wrap :size="[8, 8]">
        <span class="facet-filter-bar__label">进一步筛选</span>
        <Select
          v-model:value="difficulty"
          allow-clear
          mode="multiple"
          :max-tag-count="1"
          :options="difficultyOptions"
          placeholder="难度"
          style="width: 150px"
        />
        <Select
          v-model:value="cognitiveLevels"
          allow-clear
          mode="multiple"
          :max-tag-count="1"
          :options="cognitiveOptions"
          placeholder="认知层级"
          style="width: 160px"
        />
        <Select
          v-model:value="status"
          allow-clear
          mode="multiple"
          :max-tag-count="1"
          :options="statusOptions"
          placeholder="版本状态"
          style="width: 160px"
        />
      </Space>

      <div class="facet-filter-bar__actions">
        <Tag v-if="activeFacetCount" color="blue">
          {{ activeFacetCount }} 组条件
        </Tag>
        <Button
          type="link"
          :disabled="activeFacetCount === 0"
          @click="emit('reset')"
        >
          清空筛选
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.facet-filter-bar {
  padding: 14px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.facet-filter-bar__primary {
  display: grid;
  grid-template-columns: minmax(220px, 1.35fr) repeat(4, minmax(120px, 0.8fr));
  gap: 10px;
}

.facet-filter-bar__secondary {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px dashed hsl(var(--border));
}

.facet-filter-bar__label {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.facet-filter-bar__actions {
  display: flex;
  flex: none;
  align-items: center;
}

@media (max-width: 1200px) {
  .facet-filter-bar__primary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .facet-filter-bar__search {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .facet-filter-bar__primary {
    grid-template-columns: 1fr;
  }

  .facet-filter-bar__search {
    grid-column: auto;
  }

  .facet-filter-bar__secondary {
    align-items: flex-start;
  }
}
</style>
