<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { Button, Space } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    prompt?: string;
  }>(),
  {
    modelValue: '',
    prompt: '',
  },
);

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

const canvas = ref<HTMLCanvasElement>();
const drawing = ref(false);
const tool = ref<'eraser' | 'pen'>('pen');
const color = ref('#1f2937');
const lineWidth = ref(3);
const history = ref<string[]>([]);

function context() {
  return canvas.value?.getContext('2d');
}

function position(event: PointerEvent) {
  const target = canvas.value;
  if (!target) return { x: 0, y: 0 };
  const rect = target.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * target.width,
    y: ((event.clientY - rect.top) / rect.height) * target.height,
  };
}

function startDraw(event: PointerEvent) {
  const ctx = context();
  if (!ctx || !canvas.value) return;
  canvas.value.setPointerCapture(event.pointerId);
  drawing.value = true;
  const point = position(event);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
}

function draw(event: PointerEvent) {
  const ctx = context();
  if (!drawing.value || !ctx) return;
  const point = position(event);
  ctx.globalCompositeOperation =
    tool.value === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = color.value;
  ctx.lineWidth =
    tool.value === 'eraser' ? lineWidth.value * 5 : lineWidth.value;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
}

function endDraw() {
  if (!drawing.value || !canvas.value) return;
  drawing.value = false;
  const value = canvas.value.toDataURL('image/png');
  history.value.push(value);
  emit('update:modelValue', value);
}

function clearCanvas(emitChange = true) {
  const target = canvas.value;
  const ctx = context();
  if (!target || !ctx) return;
  ctx.clearRect(0, 0, target.width, target.height);
  if (emitChange) {
    history.value = [];
    emit('update:modelValue', '');
  }
}

function paintImage(value: string) {
  clearCanvas(false);
  if (!value || !canvas.value) return;
  const image = new Image();
  image.addEventListener('load', () => {
    const target = canvas.value;
    if (!target) return;
    context()?.drawImage(image, 0, 0, target.width, target.height);
  });
  image.src = value;
}

function undo() {
  history.value.pop();
  const previous = history.value.at(-1) || '';
  paintImage(previous);
  emit('update:modelValue', previous);
}

watch(
  () => props.modelValue,
  (value) => {
    if (value && value !== history.value.at(-1)) paintImage(value);
  },
);

onMounted(() => paintImage(props.modelValue));
</script>

<template>
  <div class="qb-drawing">
    <div class="qb-drawing-toolbar">
      <div>
        <strong>绘图作答</strong>
        <span>{{ prompt || '可使用画笔或橡皮擦完成绘图' }}</span>
      </div>
      <Space size="small" wrap>
        <Button
          size="small"
          :type="tool === 'pen' ? 'primary' : 'default'"
          @click="tool = 'pen'"
        >
          画笔
        </Button>
        <Button
          size="small"
          :type="tool === 'eraser' ? 'primary' : 'default'"
          @click="tool = 'eraser'"
        >
          橡皮擦
        </Button>
        <label class="qb-drawing-color">
          颜色
          <input v-model="color" type="color" />
        </label>
        <label class="qb-drawing-width">
          粗细
          <input v-model.number="lineWidth" type="range" min="1" max="12" />
        </label>
        <Button size="small" @click="undo">撤销</Button>
        <Button size="small" danger @click="clearCanvas()">清空</Button>
      </Space>
    </div>
    <canvas
      ref="canvas"
      width="1000"
      height="380"
      @pointerdown="startDraw"
      @pointermove="draw"
      @pointerup="endDraw"
      @pointercancel="endDraw"
      @pointerleave="endDraw"
    ></canvas>
  </div>
</template>

<style scoped>
.qb-drawing {
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.qb-drawing-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  background: hsl(var(--muted) / 35%);
  border-bottom: 1px solid hsl(var(--border));
}

.qb-drawing-toolbar > div {
  display: flex;
  flex-direction: column;
  min-width: 140px;
}

.qb-drawing-toolbar span,
.qb-drawing-color,
.qb-drawing-width {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.qb-drawing-color,
.qb-drawing-width {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

.qb-drawing-color input {
  width: 24px;
  height: 22px;
  padding: 0;
  cursor: pointer;
  border: 0;
}

.qb-drawing-width input {
  width: 70px;
}

.qb-drawing canvas {
  display: block;
  width: 100%;
  height: 340px;
  touch-action: none;
  cursor: crosshair;
  background-color: #fff;
  background-image:
    linear-gradient(#eef2f7 1px, transparent 1px),
    linear-gradient(90deg, #eef2f7 1px, transparent 1px);
  background-size: 20px 20px;
}

@media (max-width: 760px) {
  .qb-drawing-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
