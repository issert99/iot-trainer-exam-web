<script lang="ts" setup>
import type { TaxonomyNode, TaxonomyScheme } from '../domain/types';

import { computed } from 'vue';

import { Empty, Tag, TreeSelect } from 'ant-design-vue';

type PickerTreeNode = {
  children?: PickerTreeNode[];
  disableCheckbox?: boolean;
  key: string;
  selectable?: boolean;
  title: string;
  value: string;
};

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    courseIds?: string[];
    modelValue: string[];
    nodes: TaxonomyNode[];
    placeholder?: string;
    schemes: TaxonomyScheme[];
  }>(),
  {
    compact: false,
    courseIds: () => [],
    placeholder: '选择知识、能力或毕业要求',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const selectedIds = computed({
  get: () => props.modelValue,
  set: (value: string[]) => emit('update:modelValue', value),
});

function isCourseRelevant(node: TaxonomyNode) {
  return (
    props.courseIds.length === 0 ||
    node.courseIds.length === 0 ||
    props.courseIds.some((courseId) => node.courseIds.includes(courseId))
  );
}

function buildChildren(
  schemeId: string,
  parentId: null | string,
): PickerTreeNode[] {
  return props.nodes
    .filter((node) => node.schemeId === schemeId && node.parentId === parentId)
    .toSorted((left, right) => {
      const relevance =
        Number(isCourseRelevant(right)) - Number(isCourseRelevant(left));
      return relevance || left.name.localeCompare(right.name, 'zh-CN');
    })
    .map((node) => {
      const children = buildChildren(schemeId, node.id);
      return {
        children: children.length > 0 ? children : undefined,
        key: node.id,
        title: `${node.name}${isCourseRelevant(node) ? '' : ' · 跨课程'}`,
        value: node.id,
      };
    });
}

const treeData = computed<PickerTreeNode[]>(() =>
  props.schemes
    .filter((scheme) => scheme.status !== 'retired')
    .map((scheme) => ({
      children: buildChildren(scheme.id, null),
      disableCheckbox: true,
      key: `scheme:${scheme.id}`,
      selectable: false,
      title: `${scheme.name} · v${scheme.version}`,
      value: `scheme:${scheme.id}`,
    }))
    .filter((scheme) => (scheme.children?.length ?? 0) > 0),
);

function isTaxonomyNode(node: TaxonomyNode | undefined): node is TaxonomyNode {
  return node !== undefined;
}

const selectedNodes = computed(() =>
  props.modelValue
    .map((id) => props.nodes.find((node) => node.id === id))
    .filter(isTaxonomyNode),
);

const selectedSchemeCount = computed(
  () => new Set(selectedNodes.value.map((node) => node.schemeId)).size,
);
</script>

<template>
  <div class="classification-picker">
    <TreeSelect
      v-if="treeData.length > 0"
      v-model:value="selectedIds"
      allow-clear
      :dropdown-style="{ maxHeight: '380px', overflow: 'auto' }"
      :max-tag-count="compact ? 1 : 3"
      :placeholder="placeholder"
      show-search
      tree-checkable
      tree-default-expand-all
      tree-node-filter-prop="title"
      :tree-data="treeData"
    />
    <Empty
      v-else
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      description="暂无分类标准"
    />

    <div v-if="!compact" class="classification-picker__summary">
      <span v-if="selectedNodes.length === 0">尚未关联受控分类</span>
      <template v-else>
        <Tag
          v-for="node in selectedNodes.slice(0, 6)"
          :key="node.id"
          color="blue"
        >
          {{ node.name }}
        </Tag>
        <Tag v-if="selectedNodes.length > 6">
          +{{ selectedNodes.length - 6 }}
        </Tag>
        <small>覆盖 {{ selectedSchemeCount }} 套标准</small>
      </template>
    </div>
  </div>
</template>

<style scoped>
.classification-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.classification-picker__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  min-height: 24px;
  color: hsl(var(--foreground) / 55%);
}

.classification-picker__summary small {
  margin-left: 4px;
}
</style>
