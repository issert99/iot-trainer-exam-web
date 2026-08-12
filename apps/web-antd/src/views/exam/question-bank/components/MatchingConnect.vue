<script lang="ts" setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { Button } from 'ant-design-vue';

type LinkMap = Record<number, number>;

const props = withDefaults(
  defineProps<{
    left?: string[];
    modelValue?: LinkMap;
    prompt?: string;
    right?: string[];
  }>(),
  {
    left: () => [],
    right: () => [],
    modelValue: () => ({}),
    prompt: '',
  },
);

const emit = defineEmits<{
  'update:modelValue': [LinkMap];
}>();

const rootRef = ref<HTMLElement | null>(null);
const leftRefs = ref<(HTMLElement | null)[]>([]);
const rightRefs = ref<(HTMLElement | null)[]>([]);
const pendingLeft = ref<null | number>(null);
const links = ref<LinkMap>({ ...props.modelValue });
const paths = ref<{ d: string; key: string }[]>([]);

watch(
  () => props.modelValue,
  (v) => {
    links.value = { ...v };
    void redraw();
  },
  { deep: true },
);

watch(
  () => [props.left, props.right],
  () => {
    links.value = {};
    pendingLeft.value = null;
    emit('update:modelValue', {});
    void redraw();
  },
  { deep: true },
);

function setLeftRef(el: unknown, i: number) {
  leftRefs.value[i] = (el as HTMLElement) || null;
}

function setRightRef(el: unknown, i: number) {
  rightRefs.value[i] = (el as HTMLElement) || null;
}

function edgeOf(el: HTMLElement, root: DOMRect, side: 'left' | 'right') {
  const r = el.getBoundingClientRect();
  return {
    x: side === 'right' ? r.right - root.left : r.left - root.left,
    y: r.top - root.top + r.height / 2,
  };
}

async function redraw() {
  await nextTick();
  const root = rootRef.value?.getBoundingClientRect();
  if (!root) {
    paths.value = [];
    return;
  }
  const next: { d: string; key: string }[] = [];
  for (const [lk, rk] of Object.entries(links.value)) {
    const li = Number(lk);
    const ri = Number(rk);
    const lEl = leftRefs.value[li];
    const rEl = rightRefs.value[ri];
    if (!lEl || !rEl) continue;
    const a = edgeOf(lEl, root, 'right');
    const b = edgeOf(rEl, root, 'left');
    const mid = (a.x + b.x) / 2;
    next.push({
      key: `${li}-${ri}`,
      d: `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`,
    });
  }
  paths.value = next;
}

function pickLeft(i: number) {
  pendingLeft.value = pendingLeft.value === i ? null : i;
}

function pickRight(i: number) {
  if (pendingLeft.value === null) return;
  const left = pendingLeft.value;
  // 一侧一项只连一条：覆盖同左、同右旧连线
  const next: LinkMap = { ...links.value };
  for (const [lk, rk] of Object.entries(next)) {
    if (Number(lk) === left || Number(rk) === i) delete next[Number(lk)];
  }
  next[left] = i;
  links.value = next;
  pendingLeft.value = null;
  emit('update:modelValue', { ...next });
  void redraw();
}

function clearLinks() {
  links.value = {};
  pendingLeft.value = null;
  emit('update:modelValue', {});
  void redraw();
}

const linkedRight = computed(() => new Set(Object.values(links.value)));
const linkedLeft = computed(
  () => new Set(Object.keys(links.value).map(Number)),
);

function onResize() {
  void redraw();
}

onMounted(() => {
  void redraw();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div class="qb-match-wrap">
    <div v-if="prompt" class="qb-match-prompt">{{ prompt }}</div>
    <div class="qb-match-tip">
      先点左侧，再点右侧完成连线；再次点击可改连。
      <Button type="link" size="small" @click="clearLinks">清空连线</Button>
    </div>
    <div ref="rootRef" class="qb-match-board">
      <svg class="qb-match-svg" aria-hidden="true">
        <path v-for="p in paths" :key="p.key" :d="p.d" class="qb-match-line" />
      </svg>
      <div class="qb-match-col">
        <button
          v-for="(item, i) in left"
          :key="`l-${i}`"
          type="button"
          class="qb-match-item"
          :class="{
            active: pendingLeft === i,
            linked: linkedLeft.has(i),
          }"
          :ref="(el) => setLeftRef(el, i)"
          @click="pickLeft(i)"
        >
          <span class="qb-match-idx">{{ i + 1 }}</span>
          <span>{{ item }}</span>
        </button>
      </div>
      <div class="qb-match-col qb-match-col-right">
        <button
          v-for="(item, i) in right"
          :key="`r-${i}`"
          type="button"
          class="qb-match-item"
          :class="{ linked: linkedRight.has(i) }"
          :ref="(el) => setRightRef(el, i)"
          @click="pickRight(i)"
        >
          <span class="qb-match-idx">{{ String.fromCharCode(65 + i) }}</span>
          <span>{{ item }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qb-match-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qb-match-prompt {
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.qb-match-tip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.qb-match-board {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  min-height: 120px;
  padding: 8px 4px;
}

.qb-match-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.qb-match-line {
  fill: none;
  stroke: #1677ff;
  stroke-width: 2;
}

.qb-match-col {
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qb-match-col-right .qb-match-item {
  justify-content: flex-end;
  text-align: right;
}

.qb-match-item {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.4;
  color: hsl(var(--foreground));
  text-align: left;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    background 0.15s;
}

.qb-match-item:hover {
  border-color: #91caff;
}

.qb-match-item.active {
  background: #e6f4ff;
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(22 119 255 / 15%);
}

.qb-match-item.linked {
  border-color: #69b1ff;
}

.qb-match-idx {
  flex-shrink: 0;
  min-width: 1.2em;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}
</style>
