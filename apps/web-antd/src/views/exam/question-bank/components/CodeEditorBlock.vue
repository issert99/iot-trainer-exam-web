<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { loader, VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { Button, Select, Space, Tooltip } from 'ant-design-vue';

type EditorTheme = 'vs' | 'vs-dark';

const props = withDefaults(
  defineProps<{
    defaultLanguage?: string;
    height?: string;
    languages?: string[];
    modelValue?: string;
    prompt?: string;
    readonly?: boolean;
    starterCode?: string;
  }>(),
  {
    modelValue: '',
    languages: () => ['python', 'c', 'cpp', 'java', 'javascript', 'sql'],
    defaultLanguage: 'python',
    height: '420px',
    prompt: '',
    readonly: false,
    starterCode: '',
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
const code = ref(props.modelValue || props.starterCode || '');
const theme = ref<EditorTheme>('vs-dark');
const fontSize = ref(14);
const wordWrap = ref(true);
const minimap = ref(true);
const cursor = ref({ line: 1, column: 1 });
const editorRef = ref<any>();

watch(
  () => props.modelValue,
  (value) => {
    if (value !== code.value) code.value = value || '';
  },
);

watch(
  () => props.defaultLanguage,
  (value) => {
    if (value) language.value = value;
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
  (props.languages?.length ? props.languages : [language.value]).map((item) => {
    const labels: Record<string, string> = {
      python: 'Python',
      c: 'C',
      cpp: 'C++',
      java: 'Java',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      sql: 'SQL',
      html: 'HTML',
      css: 'CSS',
    };
    return {
      label: labels[item] || item,
      value: item,
    };
  }),
);

const lineCount = computed(() => Math.max(1, code.value.split('\n').length));

const editorOptions = computed(() => ({
  automaticLayout: true,
  fontSize: fontSize.value,
  fontFamily:
    'JetBrains Mono, Cascadia Code, Fira Code, Consolas, Monaco, monospace',
  fontLigatures: true,
  minimap: { enabled: minimap.value, maxColumn: 80 },
  scrollBeyondLastLine: false,
  wordWrap: wordWrap.value ? ('on' as const) : ('off' as const),
  tabSize: 4,
  insertSpaces: true,
  suggestOnTriggerCharacters: true,
  quickSuggestions: true,
  parameterHints: { enabled: true },
  snippetSuggestions: 'inline' as const,
  folding: true,
  lineNumbers: 'on' as const,
  renderLineHighlight: 'all' as const,
  renderWhitespace: 'selection' as const,
  bracketPairColorization: { enabled: true },
  guides: {
    bracketPairs: true,
    indentation: true,
  },
  stickyScroll: { enabled: true },
  padding: { top: 12, bottom: 12 },
  readOnly: props.readonly,
  cursorBlinking: 'smooth' as const,
  smoothScrolling: true,
  mouseWheelZoom: true,
}));

function onCodeChange(value: string | undefined) {
  code.value = value ?? '';
  emit('update:modelValue', code.value);
}

function onMount(editor: any) {
  editorRef.value = editor;
  editor.onDidChangeCursorPosition((event: any) => {
    cursor.value = {
      line: event.position.lineNumber,
      column: event.position.column,
    };
  });
}

function formatDocument() {
  const action = editorRef.value?.getAction?.('editor.action.formatDocument');
  action?.run?.();
}

function resetCode() {
  code.value = props.starterCode || '';
  emit('update:modelValue', code.value);
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(code.value);
  } catch {
    // ignore clipboard failures in restricted environments
  }
}

function toggleTheme() {
  theme.value = theme.value === 'vs-dark' ? 'vs' : 'vs-dark';
}
</script>

<template>
  <div class="ide" :class="{ dark: theme === 'vs-dark' }">
    <div v-if="prompt" class="ide-prompt">{{ prompt }}</div>

    <div class="ide-toolbar">
      <div class="ide-toolbar-left">
        <span class="ide-brand">Code Lab</span>
        <Select
          v-model:value="language"
          size="small"
          style="width: 140px"
          :options="langOptions"
        />
        <Space size="small">
          <Tooltip title="减小字号">
            <Button size="small" @click="fontSize = Math.max(12, fontSize - 1)">
              A-
            </Button>
          </Tooltip>
          <Tooltip title="增大字号">
            <Button size="small" @click="fontSize = Math.min(22, fontSize + 1)">
              A+
            </Button>
          </Tooltip>
          <Button size="small" @click="wordWrap = !wordWrap">
            {{ wordWrap ? '自动换行' : '不换行' }}
          </Button>
          <Button size="small" @click="minimap = !minimap">
            {{ minimap ? '缩略图开' : '缩略图关' }}
          </Button>
        </Space>
      </div>
      <div class="ide-toolbar-right">
        <Button size="small" @click="toggleTheme">
          {{ theme === 'vs-dark' ? '浅色' : '深色' }}
        </Button>
        <Button size="small" @click="formatDocument">格式化</Button>
        <Button size="small" @click="copyCode">复制</Button>
        <Button size="small" @click="resetCode">重置模板</Button>
      </div>
    </div>

    <div class="ide-tabs">
      <div class="ide-tab active">
        <span>solution.{{ monacoLang === 'python' ? 'py' : monacoLang }}</span>
      </div>
      <div class="ide-tab-hint">Ctrl+Space 智能提示 · Ctrl+滚轮缩放</div>
    </div>

    <div class="ide-frame" :style="{ height }">
      <VueMonacoEditor
        :value="code"
        :theme="theme"
        :language="monacoLang"
        :options="editorOptions"
        @mount="onMount"
        @update:value="onCodeChange"
      />
    </div>

    <div class="ide-statusbar">
      <span>{{
        langOptions.find((item) => item.value === language)?.label
      }}</span>
      <span>UTF-8</span>
      <span>空格: 4</span>
      <span>Ln {{ cursor.line }}, Col {{ cursor.column }}</span>
      <span>{{ lineCount }} 行</span>
    </div>
  </div>
</template>

<style scoped>
.ide {
  overflow: hidden;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 6%);
}

.ide.dark {
  background: #1e1e1e;
  border-color: #2f2f2f;
}

.ide-prompt {
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.ide.dark .ide-prompt {
  color: #cbd5e1;
  background: #252526;
  border-bottom-color: #333;
}

.ide-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(#f8fafc, #eef2f7);
  border-bottom: 1px solid #dbe2ea;
}

.ide.dark .ide-toolbar {
  background: linear-gradient(#2d2d2d, #252526);
  border-bottom-color: #333;
}

.ide-toolbar-left,
.ide-toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ide-brand {
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
  letter-spacing: 0.04em;
  background: #ccfbf1;
  border-radius: 999px;
}

.ide.dark .ide-brand {
  color: #99f6e4;
  background: #134e4a;
}

.ide-tabs {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #e8edf3;
  border-bottom: 1px solid #d0d7de;
}

.ide.dark .ide-tabs {
  background: #2d2d2d;
  border-bottom-color: #333;
}

.ide-tab {
  padding: 8px 12px;
  font-size: 12px;
  color: #64748b;
  border-bottom: 2px solid transparent;
}

.ide-tab.active {
  color: #0f172a;
  background: #fff;
  border-bottom-color: #2563eb;
}

.ide.dark .ide-tab.active {
  color: #e2e8f0;
  background: #1e1e1e;
  border-bottom-color: #3b82f6;
}

.ide-tab-hint {
  font-size: 11px;
  color: #94a3b8;
}

.ide-frame {
  overflow: hidden;
  background: #1e1e1e;
}

.ide-statusbar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: flex-end;
  padding: 4px 12px;
  font-size: 11px;
  color: #e2e8f0;
  background: #007acc;
}

.ide:not(.dark) .ide-statusbar {
  color: #fff;
}

@media (max-width: 760px) {
  .ide-toolbar,
  .ide-tabs {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
