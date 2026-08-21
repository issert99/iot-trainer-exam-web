<script lang="ts" setup>
import type { JsonObject, JsonValue } from '../domain/types';
import type { PluginManifest } from '../plugins/types';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { Progress, Tag } from 'ant-design-vue';

type SandboxLogEntry = {
  level: 'info' | 'success' | 'warning';
  message: string;
  time: string;
};

type SandboxStatus = 'booting' | 'ready' | 'running' | 'success' | 'warning';

const props = withDefaults(
  defineProps<{
    config?: JsonObject;
    manifest: PluginManifest;
    runToken?: number;
  }>(),
  {
    config: () => ({}),
    runToken: 0,
  },
);

const emit = defineEmits<{
  log: [entry: SandboxLogEntry];
  response: [value: JsonValue];
  status: [value: SandboxStatus];
}>();

const status = ref<SandboxStatus>('ready');
const progress = ref(0);
const timers: Array<ReturnType<typeof setTimeout>> = [];

const boundary = computed(() => {
  const map: Record<
    PluginManifest['sandbox'],
    { color: string; label: string; note: string }
  > = {
    'isolated-container': {
      color: 'orange',
      label: '一次性隔离容器',
      note: '禁用网络 · 只读镜像 · 资源配额',
    },
    'isolated-service': {
      color: 'orange',
      label: '隔离评分服务',
      note: '签名请求 · 最小数据 · 审计回执',
    },
    'signed-iframe': {
      color: 'purple',
      label: '签名 iframe',
      note: '来源白名单 · CSP · 消息协议',
    },
    none: {
      color: 'green',
      label: '主应用受控组件',
      note: '无外部代码 · 同源渲染 · 结构化响应',
    },
  };
  return map[props.manifest.sandbox];
});

const statusMeta = computed(() => {
  const map: Record<SandboxStatus, { label: string; tone: string }> = {
    booting: { label: '正在建立边界', tone: 'is-booting' },
    ready: { label: '等待运行', tone: 'is-ready' },
    running: { label: '运行中', tone: 'is-running' },
    success: { label: '运行完成', tone: 'is-success' },
    warning: { label: '需要检查', tone: 'is-warning' },
  };
  return map[status.value];
});

const scene = computed(() => {
  if (props.manifest.id === 'professional.programming') return 'programming';
  if (props.manifest.id === 'professional.cad') return 'cad';
  if (props.manifest.id === 'professional.medical-imaging') return 'medical';
  return 'standard';
});

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function reportStatus(value: SandboxStatus) {
  status.value = value;
  emit('status', value);
}

function reportLog(message: string, level: SandboxLogEntry['level'] = 'info') {
  emit('log', { level, message, time: now() });
}

function mockResponse(): JsonValue {
  if (scene.value === 'programming') {
    return {
      durationMs: 184,
      language: String(props.config.language ?? 'TypeScript'),
      memoryMb: 18.6,
      stdout: '全部断言通过',
      testsPassed: 8,
      testsTotal: 8,
    };
  }
  if (scene.value === 'cad') {
    return {
      constraints: { failed: 0, passed: 12 },
      fileRef: 'artifact://cad/bearing-seat-v7.step',
      previewHash: 'sha256:8fc7…2a1d',
      submitted: true,
    };
  }
  if (scene.value === 'medical') {
    return {
      annotations: [{ label: '疑似结节', slice: 42, x: 0.62, y: 0.38 }],
      seriesId: 'DICOM-DEMO-001',
      windowCenter: -600,
      windowWidth: 1500,
    };
  }
  return {
    accepted: true,
    configSnapshot: props.config,
    pluginId: props.manifest.id,
  };
}

function clearTimers() {
  while (timers.length > 0) {
    const timer = timers.pop();
    if (timer) clearTimeout(timer);
  }
}

function runSandbox() {
  clearTimers();
  progress.value = 8;
  reportStatus('booting');
  reportLog(`校验 ${props.manifest.id}@${props.manifest.version} 签名与配置`);

  timers.push(
    setTimeout(() => {
      progress.value = 42;
      reportStatus('running');
      reportLog(`${boundary.value.label}已就绪，开始执行`);
    }, 260),
    setTimeout(() => {
      progress.value = 76;
      reportLog(
        scene.value === 'standard'
          ? '组件已产生结构化响应'
          : '专业运行时已返回受控结果',
      );
    }, 700),
    setTimeout(() => {
      progress.value = 100;
      reportStatus('success');
      reportLog('响应结构校验通过，运行记录已封存', 'success');
      emit('response', mockResponse());
    }, 1100),
  );
}

watch(
  () => props.runToken,
  (token, previous) => {
    if (token > 0 && token !== previous) runSandbox();
  },
);

watch(
  () => props.manifest.id,
  () => {
    clearTimers();
    progress.value = 0;
    reportStatus('ready');
  },
);

onBeforeUnmount(clearTimers);
</script>

<template>
  <section class="sandbox-host" :class="`scene-${scene}`">
    <header class="sandbox-toolbar">
      <div class="window-controls" aria-hidden="true">
        <i></i><i></i><i></i>
      </div>
      <div class="boundary-title">
        <Tag :color="boundary.color">{{ boundary.label }}</Tag>
        <span>{{ boundary.note }}</span>
      </div>
      <div class="runtime-status" :class="statusMeta.tone">
        <i></i>{{ statusMeta.label }}
      </div>
    </header>

    <Progress
      v-if="['booting', 'running'].includes(status)"
      :percent="progress"
      :show-info="false"
      size="small"
      status="active"
      class="sandbox-progress"
    />

    <div v-if="scene === 'programming'" class="programming-stage">
      <aside class="file-tree">
        <strong>EXPLORER</strong>
        <span>⌄ src</span>
        <b>◇ min-stack.ts</b>
        <span>◇ min-stack.test.ts</span>
        <span>◇ package.json</span>
      </aside>
      <div class="code-editor">
        <div class="editor-tab">min-stack.ts <i>●</i></div>
        <pre><code><em>1</em> <span>class</span> MinStack {
<em>2</em>   private stack: number[] = [];
<em>3</em>   private mins: number[] = [];
<em>4</em>
<em>5</em>   push(value: number) {
<em>6</em>     this.stack.push(value);
<em>7</em>     // 在此完成 O(1) 最小值维护
<em>8</em>   }
<em>9</em> }</code></pre>
        <div class="test-strip">
          <span
            v-for="index in 8"
            :key="index"
            :class="{ passed: status === 'success' }"
          >
            T{{ index }}
          </span>
        </div>
      </div>
    </div>

    <div v-else-if="scene === 'cad'" class="cad-stage">
      <aside class="cad-tools">
        <span>⌖</span><span>◇</span><span>◫</span><span>↔</span><span>◎</span>
      </aside>
      <div class="cad-viewport">
        <div class="axis"><b>X</b><b>Y</b><b>Z</b></div>
        <div class="cad-part">
          <i class="part-base"></i>
          <i class="part-body"></i>
          <i class="part-hole"></i>
        </div>
        <div class="dimension dimension-x">120.00 mm</div>
        <div class="dimension dimension-y">Ø 42.00</div>
        <div class="cad-caption">
          <strong>轴承座 · 约束检查</strong>
          <span>{{
            status === 'success' ? '12/12 已通过' : '等待几何求解'
          }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="scene === 'medical'" class="medical-stage">
      <aside class="dicom-series">
        <strong>胸部 CT</strong>
        <div v-for="index in 4" :key="index" :class="{ active: index === 2 }">
          <span class="mini-scan"></span>
          <small>SE {{ 38 + index }}</small>
        </div>
      </aside>
      <div class="scan-viewport">
        <div class="scan-image">
          <i class="lung lung-left"></i>
          <i class="lung lung-right"></i>
          <i class="lesion"></i>
          <span class="crosshair crosshair-x"></span>
          <span class="crosshair crosshair-y"></span>
        </div>
        <span class="dicom-meta meta-top">W:1500 L:-600 · 1.0 mm</span>
        <span class="dicom-meta meta-bottom">SE 42 / 86</span>
        <div class="annotation-label">
          {{ status === 'success' ? '疑似结节 · 已保存' : '拖动框选异常区域' }}
        </div>
      </div>
    </div>

    <div v-else class="standard-stage">
      <div class="standard-card">
        <div class="standard-icon">
          {{ manifest.id === 'builder.no-code' ? '▦' : '✓' }}
        </div>
        <div>
          <Tag color="blue">{{ manifest.title }}</Tag>
          <h3>受控交互运行区</h3>
          <p>{{ manifest.description }}</p>
        </div>
      </div>
      <div class="response-track">
        <span :class="{ active: status !== 'ready' }">配置校验</span>
        <i></i>
        <span :class="{ active: ['running', 'success'].includes(status) }">
          交互渲染
        </span>
        <i></i>
        <span :class="{ active: status === 'success' }">响应封装</span>
      </div>
    </div>

    <footer class="sandbox-footer">
      <span>SDK postMessage / JSON Envelope</span>
      <code>{{ manifest.id }}@{{ manifest.version }}</code>
      <span>{{ manifest.scoring }} scoring</span>
    </footer>
  </section>
</template>

<style scoped>
.sandbox-host {
  position: relative;
  overflow: hidden;
  color: #dbeafe;
  background: #07111f;
  border: 1px solid rgb(148 163 184 / 24%);
  border-radius: 14px;
  box-shadow: 0 18px 45px rgb(2 6 23 / 24%);
}

.sandbox-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  min-height: 48px;
  padding: 0 14px;
  background: #101b2d;
  border-bottom: 1px solid rgb(148 163 184 / 16%);
}

.window-controls {
  display: flex;
  gap: 6px;
}

.window-controls i {
  width: 9px;
  height: 9px;
  background: #64748b;
  border-radius: 50%;
}

.window-controls i:first-child {
  background: #fb7185;
}

.window-controls i:nth-child(2) {
  background: #fbbf24;
}

.window-controls i:last-child {
  background: #4ade80;
}

.boundary-title {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  font-size: 11px;
  color: #94a3b8;
}

.boundary-title > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runtime-status {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
}

.runtime-status i {
  width: 7px;
  height: 7px;
  background: currentcolor;
  border-radius: 50%;
}

.runtime-status.is-booting,
.runtime-status.is-running {
  color: #38bdf8;
}

.runtime-status.is-success {
  color: #4ade80;
}

.runtime-status.is-warning {
  color: #fbbf24;
}

.sandbox-progress {
  position: absolute;
  z-index: 2;
  width: 100%;
  margin-top: -5px;
  line-height: 0;
}

.programming-stage,
.cad-stage,
.medical-stage,
.standard-stage {
  min-height: 390px;
}

.programming-stage {
  display: grid;
  grid-template-columns: 150px 1fr;
}

.file-tree {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 18px 12px;
  font-size: 11px;
  color: #94a3b8;
  background: #0b1628;
  border-right: 1px solid rgb(148 163 184 / 14%);
}

.file-tree strong {
  margin-bottom: 5px;
  font-size: 10px;
  color: #64748b;
  letter-spacing: 0.12em;
}

.file-tree b {
  font-weight: 500;
  color: #7dd3fc;
}

.code-editor {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgb(30 41 59 / 35%) 1px, transparent 1px) 0 0 / 48px
      100%,
    #07111f;
}

.editor-tab {
  width: max-content;
  padding: 10px 18px;
  font-size: 11px;
  color: #bae6fd;
  background: #111d30;
  border-bottom: 1px solid #38bdf8;
}

.editor-tab i {
  margin-left: 7px;
  font-size: 7px;
  color: #fbbf24;
}

.code-editor pre {
  padding: 22px 18px;
  margin: 0;
  overflow: auto;
  font:
    12px/2 Consolas,
    Monaco,
    monospace;
  color: #cbd5e1;
}

.code-editor code em {
  display: inline-block;
  width: 20px;
  font-style: normal;
  color: #475569;
  user-select: none;
}

.code-editor code span {
  color: #c084fc;
}

.test-strip {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.test-strip span {
  padding: 5px 0;
  font-size: 9px;
  color: #94a3b8;
  text-align: center;
  background: #172033;
  border-radius: 4px;
}

.test-strip span.passed {
  color: #86efac;
  background: rgb(22 101 52 / 45%);
}

.cad-stage {
  display: grid;
  grid-template-columns: 52px 1fr;
  background: #061525;
}

.cad-tools {
  display: flex;
  flex-direction: column;
  gap: 9px;
  align-items: center;
  padding-top: 15px;
  background: #0b1e32;
  border-right: 1px solid rgb(125 211 252 / 15%);
}

.cad-tools span {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  color: #7dd3fc;
  background: rgb(14 116 144 / 16%);
  border: 1px solid rgb(56 189 248 / 18%);
  border-radius: 6px;
}

.cad-viewport {
  position: relative;
  min-height: 390px;
  overflow: hidden;
  background:
    linear-gradient(rgb(56 189 248 / 8%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(56 189 248 / 8%) 1px, transparent 1px),
    radial-gradient(circle at center, #12334d 0, #071827 62%);
  background-size:
    24px 24px,
    24px 24px,
    auto;
  perspective: 700px;
}

.axis {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: flex;
  gap: 5px;
}

.axis b {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 9px;
  border: 1px solid currentcolor;
  border-radius: 50%;
}

.axis b:first-child {
  color: #fb7185;
}

.axis b:nth-child(2) {
  color: #4ade80;
}

.axis b:last-child {
  color: #60a5fa;
}

.cad-part {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 240px;
  height: 150px;
  transform: translate(-50%, -50%) rotateX(58deg) rotateZ(-28deg);
  transform-style: preserve-3d;
}

.cad-part i {
  position: absolute;
  display: block;
  border: 2px solid #67e8f9;
  box-shadow: inset 0 0 26px rgb(34 211 238 / 13%);
}

.part-base {
  inset: 50px 0 0;
  background: rgb(8 145 178 / 12%);
  border-radius: 14px;
}

.part-body {
  top: 0;
  left: 60px;
  width: 120px;
  height: 110px;
  background: rgb(8 145 178 / 15%);
  border-radius: 50% 50% 15px 15px;
  transform: translateZ(28px);
}

.part-hole {
  top: 30px;
  left: 96px;
  width: 48px;
  height: 48px;
  background: #061525;
  border-radius: 50%;
  transform: translateZ(32px);
}

.dimension {
  position: absolute;
  padding: 3px 6px;
  font:
    9px Consolas,
    monospace;
  color: #fef08a;
  background: rgb(15 23 42 / 80%);
  border: 1px solid rgb(250 204 21 / 38%);
}

.dimension-x {
  bottom: 76px;
  left: 25%;
}

.dimension-y {
  top: 90px;
  right: 21%;
}

.cad-caption {
  position: absolute;
  top: 18px;
  left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cad-caption strong {
  color: #e0f2fe;
}

.cad-caption span {
  font-size: 11px;
  color: #67e8f9;
}

.medical-stage {
  display: grid;
  grid-template-columns: 116px 1fr;
  background: #020617;
}

.dicom-series {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 10px;
  background: #080f1b;
  border-right: 1px solid #1e293b;
}

.dicom-series strong {
  margin-bottom: 3px;
  font-size: 11px;
  color: #cbd5e1;
}

.dicom-series > div {
  display: flex;
  gap: 7px;
  align-items: center;
  padding: 5px;
  color: #64748b;
  border: 1px solid transparent;
}

.dicom-series > div.active {
  color: #67e8f9;
  background: rgb(8 145 178 / 14%);
  border-color: #0e7490;
}

.mini-scan {
  width: 32px;
  height: 27px;
  background:
    radial-gradient(ellipse at 35% 50%, #111 0 24%, transparent 26%),
    radial-gradient(ellipse at 65% 50%, #111 0 24%, transparent 26%), #9ca3af;
  border-radius: 50%;
}

.scan-viewport {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 390px;
  overflow: hidden;
  background: radial-gradient(circle at center, #172033 0, #020617 65%);
}

.scan-image {
  position: relative;
  width: min(310px, 70%);
  aspect-ratio: 1;
  background:
    radial-gradient(circle at 50% 48%, #d1d5db 0 4%, transparent 5%),
    radial-gradient(
      circle at center,
      #9ca3af 0 47%,
      #4b5563 48% 51%,
      transparent 52%
    );
  border-radius: 50%;
  box-shadow: 0 0 45px rgb(148 163 184 / 18%);
}

.lung {
  position: absolute;
  top: 23%;
  width: 31%;
  height: 52%;
  background: radial-gradient(circle at 50% 45%, #020617, #111827 65%);
  border: 2px solid #6b7280;
  border-radius: 48% 48% 42% 42%;
}

.lung-left {
  left: 17%;
  transform: rotate(8deg);
}

.lung-right {
  right: 17%;
  transform: rotate(-8deg);
}

.lesion {
  position: absolute;
  top: 35%;
  right: 25%;
  width: 28px;
  height: 24px;
  border: 2px solid #22d3ee;
  border-radius: 50%;
  box-shadow: 0 0 12px #22d3ee;
}

.crosshair {
  position: absolute;
  background: rgb(34 211 238 / 28%);
}

.crosshair-x {
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
}

.crosshair-y {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.dicom-meta {
  position: absolute;
  font:
    9px Consolas,
    monospace;
  color: #94a3b8;
}

.meta-top {
  top: 14px;
  right: 14px;
}

.meta-bottom {
  right: 14px;
  bottom: 14px;
}

.annotation-label {
  position: absolute;
  bottom: 17px;
  left: 17px;
  padding: 6px 9px;
  font-size: 10px;
  color: #a5f3fc;
  background: rgb(8 47 73 / 78%);
  border: 1px solid #0e7490;
  border-radius: 5px;
}

.standard-stage {
  display: flex;
  flex-direction: column;
  gap: 34px;
  align-items: center;
  justify-content: center;
  padding: 42px;
  background:
    radial-gradient(circle at 80% 15%, rgb(14 165 233 / 13%), transparent 28%),
    linear-gradient(145deg, #07111f, #0b1d32);
}

.standard-card {
  display: flex;
  gap: 20px;
  align-items: center;
  max-width: 560px;
  padding: 24px;
  background: rgb(15 35 56 / 76%);
  border: 1px solid rgb(125 211 252 / 16%);
  border-radius: 14px;
}

.standard-icon {
  display: grid;
  flex: 0 0 58px;
  place-items: center;
  height: 58px;
  font-size: 25px;
  color: #67e8f9;
  background: rgb(8 145 178 / 17%);
  border: 1px solid rgb(34 211 238 / 32%);
  border-radius: 14px;
}

.standard-card h3 {
  margin: 8px 0 5px;
  color: #e0f2fe;
}

.standard-card p {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #94a3b8;
}

.response-track {
  display: flex;
  align-items: center;
  width: min(520px, 100%);
}

.response-track span {
  flex: 0 0 auto;
  font-size: 10px;
  color: #64748b;
}

.response-track span.active {
  color: #67e8f9;
}

.response-track i {
  flex: 1;
  height: 1px;
  margin: 0 10px;
  background: #334155;
}

.sandbox-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 0 14px;
  font-size: 9px;
  color: #64748b;
  background: #0b1628;
  border-top: 1px solid rgb(148 163 184 / 14%);
}

.sandbox-footer code {
  color: #7dd3fc;
}

@media (max-width: 760px) {
  .sandbox-toolbar {
    grid-template-columns: auto 1fr;
  }

  .runtime-status {
    display: none;
  }

  .programming-stage {
    grid-template-columns: 1fr;
  }

  .file-tree,
  .dicom-series {
    display: none;
  }

  .medical-stage {
    grid-template-columns: 1fr;
  }

  .sandbox-footer span:first-child {
    display: none;
  }
}
</style>
