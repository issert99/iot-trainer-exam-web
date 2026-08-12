<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Button, Space } from 'ant-design-vue';

export type CanvasNode = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type CanvasLink = {
  from: string;
  to: string;
};

const props = withDefaults(
  defineProps<{
    backgroundImage?: string;
    mode?: string;
    modelValue?: CanvasLink[];
    nodes?: CanvasNode[];
    prompt?: string;
  }>(),
  {
    mode: 'topology',
    backgroundImage: '',
    prompt: '',
    nodes: () => [],
    modelValue: () => [],
  },
);

const emit = defineEmits<{
  'update:modelValue': [CanvasLink[]];
}>();

const DEFAULT_NODES: CanvasNode[] = [
  { id: 'router', label: '路由器', x: 220, y: 40 },
  { id: 'sw1', label: '交换机 A', x: 80, y: 160 },
  { id: 'sw2', label: '交换机 B', x: 360, y: 160 },
  { id: 'pc1', label: '主机 1', x: 40, y: 300 },
  { id: 'pc2', label: '主机 2', x: 200, y: 300 },
  { id: 'server', label: '服务器', x: 400, y: 300 },
];

const boardNodes = ref<CanvasNode[]>([]);
const links = ref<CanvasLink[]>([...(props.modelValue || [])]);
const pendingFrom = ref<null | string>(null);
const drag = reactive<{
  id: null | string;
  nx: number;
  ny: number;
  ox: number;
  oy: number;
}>({ id: null, ox: 0, oy: 0, nx: 0, ny: 0 });

function initNodes() {
  const src =
    props.nodes?.length > 0
      ? props.nodes
      : DEFAULT_NODES.map((n) => ({ ...n }));
  boardNodes.value = src.map((n) => ({ ...n }));
}

watch(
  () => props.nodes,
  () => initNodes(),
  { deep: true, immediate: true },
);

watch(
  () => props.modelValue,
  (v) => {
    links.value = [...(v || [])];
  },
  { deep: true },
);

const nodeMap = computed(() => {
  const m = new Map<string, CanvasNode>();
  for (const n of boardNodes.value) m.set(n.id, n);
  return m;
});

function emitLinks() {
  emit(
    'update:modelValue',
    links.value.map((l) => ({ ...l })),
  );
}

function linkKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function hasLink(a: string, b: string) {
  const k = linkKey(a, b);
  return links.value.some((l) => linkKey(l.from, l.to) === k);
}

function onNodeClick(id: string, e: MouseEvent) {
  if (drag.id) return;
  e.stopPropagation();
  if (!pendingFrom.value) {
    pendingFrom.value = id;
    return;
  }
  if (pendingFrom.value === id) {
    pendingFrom.value = null;
    return;
  }
  const from = pendingFrom.value;
  const to = id;
  links.value = hasLink(from, to)
    ? links.value.filter((l) => linkKey(l.from, l.to) !== linkKey(from, to))
    : [...links.value, { from, to }];
  pendingFrom.value = null;
  emitLinks();
}

function onPointerDown(id: string, e: PointerEvent) {
  const n = nodeMap.value.get(id);
  if (!n) return;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  drag.id = id;
  drag.ox = e.clientX;
  drag.oy = e.clientY;
  drag.nx = n.x;
  drag.ny = n.y;
}

function onPointerMove(e: PointerEvent) {
  if (!drag.id) return;
  const n = boardNodes.value.find((x) => x.id === drag.id);
  if (!n) return;
  const dx = e.clientX - drag.ox;
  const dy = e.clientY - drag.oy;
  n.x = Math.max(0, Math.min(520, drag.nx + dx));
  n.y = Math.max(0, Math.min(360, drag.ny + dy));
}

function onPointerUp() {
  drag.id = null;
}

function clearLinks() {
  links.value = [];
  pendingFrom.value = null;
  emitLinks();
}

function resetLayout() {
  initNodes();
  clearLinks();
}

const lineCoords = computed(
  () =>
    links.value
      .map((l) => {
        const a = nodeMap.value.get(l.from);
        const b = nodeMap.value.get(l.to);
        if (!a || !b) return null;
        return {
          key: linkKey(l.from, l.to),
          x1: a.x + 56,
          y1: a.y + 22,
          x2: b.x + 56,
          y2: b.y + 22,
        };
      })
      .filter(Boolean) as {
      key: string;
      x1: number;
      x2: number;
      y1: number;
      y2: number;
    }[],
);

onMounted(() => {
  if (!props.modelValue?.length) emitLinks();
});
</script>

<template>
  <div class="qb-topo">
    <div v-if="prompt" class="qb-topo-prompt">{{ prompt }}</div>
    <div class="qb-topo-tip">
      <span>
        点击设备选中，再点另一设备完成连线；再点同一对可取消。按住拖动可调整位置。
      </span>
      <Space>
        <Button size="small" @click="clearLinks">清空连线</Button>
        <Button size="small" @click="resetLayout">重置布局</Button>
      </Space>
    </div>
    <div
      class="qb-topo-board"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <img
        v-if="backgroundImage"
        :src="backgroundImage"
        class="qb-topo-bg"
        alt=""
      />
      <svg class="qb-topo-svg" viewBox="0 0 560 400" aria-hidden="true">
        <line
          v-for="ln in lineCoords"
          :key="ln.key"
          :x1="ln.x1"
          :y1="ln.y1"
          :x2="ln.x2"
          :y2="ln.y2"
          class="qb-topo-line"
        />
      </svg>
      <button
        v-for="n in boardNodes"
        :key="n.id"
        type="button"
        class="qb-topo-node"
        :class="{ active: pendingFrom === n.id }"
        :style="{ left: `${n.x}px`, top: `${n.y}px` }"
        @click="(e) => onNodeClick(n.id, e)"
        @pointerdown="(e) => onPointerDown(n.id, e)"
      >
        {{ n.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.qb-topo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qb-topo-prompt {
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.qb-topo-tip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.qb-topo-board {
  position: relative;
  width: 100%;
  height: 400px;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  background:
    linear-gradient(90deg, rgb(0 0 0 / 4%) 1px, transparent 1px),
    linear-gradient(rgb(0 0 0 / 4%) 1px, transparent 1px), #fafafa;
  background-size: 20px 20px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.qb-topo-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  object-fit: contain;
  opacity: 0.35;
}

.qb-topo-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.qb-topo-line {
  stroke: #1677ff;
  stroke-width: 2.5;
}

.qb-topo-node {
  position: absolute;
  z-index: 1;
  min-width: 96px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  cursor: grab;
  background: #fff;
  border: 1.5px solid #94a3b8;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    background 0.15s;
}

.qb-topo-node:active {
  cursor: grabbing;
}

.qb-topo-node:hover {
  border-color: #1677ff;
}

.qb-topo-node.active {
  color: #0958d9;
  background: #e6f4ff;
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgb(22 119 255 / 18%);
}
</style>
