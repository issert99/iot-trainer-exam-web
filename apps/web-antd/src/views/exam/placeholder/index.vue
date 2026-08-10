<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Fallback } from '@vben/common-ui';

defineOptions({ name: 'ExamPlaceholder' });

const route = useRoute();
const title = computed(() => String(route.meta?.title || '模块建设中'));
</script>

<template>
  <div class="p-5">
    <Fallback
      :description="`${title}模块正在建设中，后续将接入真实业务接口。`"
      :title="title"
      status="coming-soon"
    />
  </div>
</template>
