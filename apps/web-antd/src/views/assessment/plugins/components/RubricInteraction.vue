<script lang="ts" setup>
import type { AssessmentItemRevision, JsonValue } from '../../domain/types';

import { computed } from 'vue';

import { Alert, List, Tag } from 'ant-design-vue';

const props = defineProps<{
  disabled?: boolean;
  item: AssessmentItemRevision;
  modelValue: JsonValue;
}>();

const criteria = computed(() => {
  const value = props.item.interaction.config.criteria;
  return Array.isArray(value) ? value.map(String) : [];
});
</script>

<template>
  <div>
    <Alert
      type="info"
      show-icon
      message="考官现场记录"
      description="考生无需在此输入；考官将在独立评分工作台记录观察证据。"
    />
    <List size="small" bordered class="mt-3" :data-source="criteria">
      <template #renderItem="{ item: criterion }">
        <List.Item>
          {{ criterion }}
          <template #actions>
            <Tag>待评分</Tag>
          </template>
        </List.Item>
      </template>
    </List>
  </div>
</template>
