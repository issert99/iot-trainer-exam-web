<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { loader, VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { Select } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    defaultLanguage?: string;
    height?: string;
    languages?: string[];
    modelValue?: string;
    prompt?: string;
  }>(),
  {
    modelValue: '',
    languages: () => ['python', 'c', 'java', 'javascript', 'sql'],
    defaultLanguage: 'python',
    height: '320px',
    prompt: '',
  },
);

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

loader.config({
  paths: {
    vs: 'https://cdn.npmmirror.com/packages/monaco-editor/0.52.2/files/min/vs',
  },
});

const language = ref(props.defaultLanguage || 'python');
const code = ref(props.modelValue || '');

watch(
  () => props.modelValue,
  (v) => {
    if (v !== code.value) code.value = v || '';
  },
);

watch(
  () => props.defaultLanguage,
  (v) => {
    if (v) language.value = v;
  },
);

const monacoLang = computed(() => {
  const map: Record<string, string> = {
    python: 'python',
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    java: 'java',
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    sql: 'sql',
    html: 'html',
    css: 'css',
    json: 'json',
  };
  return map[String(language.value).toLowerCase()] || 'plaintext';
});

const langOptions = computed(() =>
  (props.languages?.length ? props.languages : [language.value]).map((l) => ({
    label: l,
    value: l,
  })),
);

function onCodeChange(v: string | undefined) {
  code.value = v ?? '';
  emit('update:modelValue', code.value);
}

const editorOptions = {
  automaticLayout: true,
  fontSize: 14,
  fontFamily:
    'JetBrains Mono, Cascadia Code, Fira Code, Consolas, Monaco, monospace',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  tabSize: 4,
  suggestOnTriggerCharacters: true,
  quickSuggestions: true,
  parameterHints: { enabled: true },
  snippetSuggestions: 'inline' as const,
  folding: true,
  lineNumbers: 'on' as const,
  renderLineHighlight: 'line' as const,
  padding: { top: 8, bottom: 8 },
};
</script>

<template>
  <div class="qb-code-block">
    <div v-if="prompt" class="qb-code-prompt">{{ prompt }}</div>
    <div class="qb-code-toolbar">
      <span class="qb-code-toolbar-label">语言</span>
      <Select
        v-model:value="language"
        size="small"
        style="width: 140px"
        :options="langOptions"
      />
      <span class="qb-code-hint">Ctrl+Space 触发代码提示</span>
    </div>
    <div class="qb-code-frame" :style="{ height }">
      <VueMonacoEditor
        :value="code"
        theme="vs"
        :language="monacoLang"
        :options="editorOptions"
        @update:value="onCodeChange"
      />
    </div>
  </div>
</template>

<style scoped>
.qb-code-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qb-code-prompt {
  font-size: 14px;
  line-height: 1.65;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
}

.qb-code-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.qb-code-toolbar-label {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.qb-code-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.qb-code-frame {
  overflow: hidden;
  background: #fff;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}
</style>
