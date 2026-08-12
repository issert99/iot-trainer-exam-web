<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { MathfieldElement } from 'mathlive';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    modelValue?: string;
    placeholder?: string;
  }>(),
  {
    compact: false,
    modelValue: '',
    placeholder: '请输入数学公式',
  },
);

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

const host = ref<HTMLDivElement>();
let mathfield: MathfieldElement | undefined;

function onInput() {
  if (mathfield) emit('update:modelValue', mathfield.value);
}

onMounted(() => {
  mathfield = new MathfieldElement();
  mathfield.value = props.modelValue;
  mathfield.setAttribute('placeholder', props.placeholder);
  mathfield.setAttribute('virtual-keyboard-mode', 'manual');
  mathfield.addEventListener('input', onInput);
  host.value?.append(mathfield);
});

watch(
  () => props.modelValue,
  (value) => {
    if (mathfield && mathfield.value !== value) mathfield.value = value;
  },
);

onBeforeUnmount(() => {
  mathfield?.removeEventListener('input', onInput);
  mathfield?.remove();
});
</script>

<template>
  <div class="qb-formula-editor" :class="{ compact }">
    <div v-if="!compact" class="qb-formula-label">
      <span>公式编辑器</span>
      <span>支持 LaTeX · 点击输入框可打开数学键盘</span>
    </div>
    <div ref="host" class="qb-formula-host"></div>
  </div>
</template>

<style scoped>
.qb-formula-editor {
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.qb-formula-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 35%);
  border-bottom: 1px solid hsl(var(--border));
}

.qb-formula-host {
  padding: 16px;
}

.qb-formula-host :deep(math-field) {
  display: block;
  width: 100%;
  min-height: 54px;
  padding: 12px 14px;
  font-size: 22px;
  outline: none;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.qb-formula-host :deep(math-field:focus-within) {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 12%);
}

.qb-formula-editor.compact {
  display: inline-block;
  width: 180px;
  vertical-align: middle;
  border-radius: 5px;
}

.qb-formula-editor.compact .qb-formula-host {
  padding: 0;
}

.qb-formula-editor.compact .qb-formula-host :deep(math-field) {
  min-height: 30px;
  padding: 3px 8px;
  font-size: 16px;
  border: 0;
}
</style>
