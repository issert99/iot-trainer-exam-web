<script lang="ts" setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { Button, InputNumber, Tooltip } from 'ant-design-vue';

type Point = {
  x: number;
  y: number;
};

type Tool =
  | 'arrow'
  | 'brush'
  | 'diamond'
  | 'ellipse'
  | 'eraser'
  | 'eyedropper'
  | 'fill'
  | 'line'
  | 'marker'
  | 'pencil'
  | 'rect'
  | 'roundRect'
  | 'select'
  | 'spray'
  | 'text'
  | 'triangle';

type ShapeMode = 'both' | 'fill' | 'outline';

type ShapeKind =
  | 'arrow'
  | 'diamond'
  | 'ellipse'
  | 'line'
  | 'rect'
  | 'roundRect'
  | 'text'
  | 'triangle';

type ShapeObject = {
  color: string;
  fontSize?: number;
  from: Point;
  id: string;
  kind: ShapeKind;
  lineWidth: number;
  mode: ShapeMode;
  text?: string;
  to: Point;
};

const props = withDefaults(
  defineProps<{
    height?: number;
    modelValue?: string;
    prompt?: string;
    width?: number;
  }>(),
  {
    height: 720,
    modelValue: '',
    prompt: '',
    width: 1280,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const RENDER_SCALE = Math.max(
  2,
  Math.min(3, Math.round(globalThis.devicePixelRatio || 2)),
);

type ShapePreview = {
  color: string;
  from: Point;
  kind: ShapeKind;
  lineWidth: number;
  mode: ShapeMode;
  to: Point;
};

type HistoryEntry = {
  png: string;
  raster: string;
  shapes: ShapeObject[];
};

type ToolItem = {
  id: Tool;
  label: string;
};

type ActiveSelection = {
  base: ImageData;
  data: ImageData;
  h: number;
  w: number;
  x: number;
  y: number;
};

const root = ref<HTMLElement>();
const stage = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const fileInput = ref<HTMLInputElement>();
const textInputEl = ref<HTMLTextAreaElement>();

let rasterCanvas: HTMLCanvasElement | undefined;

const fullscreen = ref(false);
const activeTool = ref<Tool>('pencil');
const primaryColor = ref('#111827');
const secondaryColor = ref('#ffffff');
const customColor = ref('#2563eb');
const brushSize = ref(4);
const shapeMode = ref<ShapeMode>('outline');
const showGrid = ref(false);
const zoom = ref(100);
const history = ref<HistoryEntry[]>([]);
const historyIndex = ref(-1);
const drawing = ref(false);
const selecting = ref(false);
const draggingSelection = ref(false);
const draggingShape = ref(false);
const startPoint = ref<Point>({ x: 0, y: 0 });
const lastPoint = ref<Point>({ x: 0, y: 0 });
const selectionOffset = ref<Point>({ x: 0, y: 0 });
const shapeDragOrigin = ref<Point>({ x: 0, y: 0 });
const shapeDragStartFrom = ref<Point>({ x: 0, y: 0 });
const shapeDragStartTo = ref<Point>({ x: 0, y: 0 });
const selection = ref<ActiveSelection>();
const shapes = ref<ShapeObject[]>([]);
const selectedShapeId = ref<string>();
const loadingExternal = ref(false);
const textDraft = ref({
  color: '#111827',
  fontSize: 20,
  value: '',
  visible: false,
  x: 0,
  y: 0,
});
const pendingTextPlacement = ref<{ color: string; point: Point }>();
let textBlurArmed = false;
let textFocusTimer: number | undefined;

const freehandTools = new Set<Tool>([
  'brush',
  'eraser',
  'marker',
  'pencil',
  'spray',
]);
const shapeTools = new Set<Tool>([
  'arrow',
  'diamond',
  'ellipse',
  'line',
  'rect',
  'roundRect',
  'triangle',
]);
const sizePresets = [2, 4, 8, 14, 22, 34];
const palette = [
  '#111827',
  '#374151',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
];

const toolGroups: ToolItem[][] = [
  [
    { id: 'pencil', label: '铅笔' },
    { id: 'brush', label: '画笔' },
    { id: 'marker', label: '马克笔' },
    { id: 'spray', label: '喷枪' },
    { id: 'eraser', label: '橡皮擦' },
    { id: 'fill', label: '填充' },
    { id: 'text', label: '文字' },
    { id: 'eyedropper', label: '取色' },
    { id: 'select', label: '选择' },
  ],
  [
    { id: 'line', label: '直线' },
    { id: 'arrow', label: '箭头' },
    { id: 'rect', label: '矩形' },
    { id: 'roundRect', label: '圆角矩形' },
    { id: 'ellipse', label: '椭圆' },
    { id: 'triangle', label: '三角形' },
    { id: 'diamond', label: '菱形' },
  ],
];

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);
const zoomText = computed(() => `${zoom.value}%`);
const activeToolLabel = computed(
  () =>
    toolGroups.flat().find((item) => item.id === activeTool.value)?.label ||
    activeTool.value,
);
const canDeleteSelection = computed(
  () => Boolean(selection.value) || Boolean(selectedShapeId.value),
);
const canvasStyle = computed(() => ({
  height: `${Math.round((props.height * zoom.value) / 100)}px`,
  width: `${Math.round((props.width * zoom.value) / 100)}px`,
}));

function svgIcon(path: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const toolIcons: Record<Tool, string> = {
  arrow: svgIcon('<path d="M4 20 19 5"/><path d="M11 5h8v8"/>'),
  brush: svgIcon(
    '<path d="m4 20 8-8"/><path d="M13 11l5-5a2 2 0 0 1 3 3l-5 5"/><path d="M7 17c-1.5 0-3 1-3 3 2 0 4-.5 5-2"/>',
  ),
  diamond: svgIcon('<path d="m12 3 9 9-9 9-9-9 9-9z"/>'),
  ellipse: svgIcon('<ellipse cx="12" cy="12" rx="8" ry="5"/>'),
  eraser: svgIcon('<path d="m4 15 8-8 7 7-5 5H8l-4-4z"/><path d="M14 19h7"/>'),
  eyedropper: svgIcon(
    '<path d="m14 5 5 5"/><path d="M10 14 4 20"/><path d="m19 5-9 9-2-2 9-9a1.5 1.5 0 0 1 2 2z"/>',
  ),
  fill: svgIcon(
    '<path d="m5 11 7-7 7 7-7 7-7-7z"/><path d="M19 16c1.5 1.4 2 2.5 2 3.4a2 2 0 0 1-4 0c0-.9.5-2 2-3.4z"/>',
  ),
  line: svgIcon('<path d="M5 19 19 5"/>'),
  marker: svgIcon('<path d="M6 20h12"/><path d="m8 16 7-12 3 2-7 12-3-2z"/>'),
  pencil: svgIcon(
    '<path d="m4 20 4-1 11-11a2 2 0 0 0-3-3L5 16l-1 4z"/><path d="m14 6 4 4"/>',
  ),
  rect: svgIcon('<rect x="5" y="6" width="14" height="12" rx="1"/>'),
  roundRect: svgIcon('<rect x="4" y="6" width="16" height="12" rx="4"/>'),
  select: svgIcon(
    '<path d="M5 5h4"/><path d="M15 5h4"/><path d="M5 19h4"/><path d="M15 19h4"/><path d="M5 5v4"/><path d="M19 5v4"/><path d="M5 15v4"/><path d="M19 15v4"/>',
  ),
  spray: svgIcon(
    '<circle cx="7" cy="17" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="17" cy="6" r="1"/><circle cx="17" cy="15" r="1"/><path d="M6 7h5l2 3"/><path d="M4 7h2v6H4z"/>',
  ),
  text: svgIcon('<path d="M5 6h14"/><path d="M12 6v12"/><path d="M9 18h6"/>'),
  triangle: svgIcon('<path d="m12 4 9 16H3L12 4z"/>'),
};

function getContext() {
  return canvas.value?.getContext('2d', { willReadFrequently: true });
}

function getRasterContext() {
  return rasterCanvas?.getContext('2d', { willReadFrequently: true });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isShapeKind(tool: Tool): tool is ShapeKind {
  return shapeTools.has(tool);
}

function cloneShapes(list: ShapeObject[]): ShapeObject[] {
  return list.map((item) => ({
    ...item,
    from: { ...item.from },
    to: { ...item.to },
  }));
}

function createShapeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `shape-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function toolButtonStyle(id: Tool) {
  return {
    '--paint-icon': `url("${toolIcons[id]}")`,
  };
}

function activeColor(event?: PointerEvent) {
  return event?.button === 2 || event?.buttons === 2
    ? secondaryColor.value
    : primaryColor.value;
}

function canvasPoint(event: PointerEvent): Point {
  const target = canvas.value;
  if (!target) return { x: 0, y: 0 };

  const rect = target.getBoundingClientRect();
  return {
    x: clamp(
      ((event.clientX - rect.left) / rect.width) * props.width,
      0,
      props.width,
    ),
    y: clamp(
      ((event.clientY - rect.top) / rect.height) * props.height,
      0,
      props.height,
    ),
  };
}

function resetBufferTransform(ctx: CanvasRenderingContext2D) {
  ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

function clearBufferToWhite(
  target: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.restore();
  resetBufferTransform(ctx);
}

function clearRasterToWhite() {
  const target = rasterCanvas;
  const ctx = getRasterContext();
  if (!target || !ctx) return;
  clearBufferToWhite(target, ctx);
}

function clearMainToWhite() {
  const target = canvas.value;
  const ctx = getContext();
  if (!target || !ctx) return;
  clearBufferToWhite(target, ctx);
}

function setupBuffer(target: HTMLCanvasElement) {
  target.width = Math.round(props.width * RENDER_SCALE);
  target.height = Math.round(props.height * RENDER_SCALE);
  const ctx = target.getContext('2d', { willReadFrequently: true });
  if (ctx) resetBufferTransform(ctx);
}

function getPng() {
  return canvas.value?.toDataURL('image/png') || '';
}

function getRasterPng() {
  return rasterCanvas?.toDataURL('image/png') || '';
}

function emitCanvas() {
  emit('update:modelValue', getPng());
}

function ensureRasterCanvas() {
  if (!rasterCanvas) {
    rasterCanvas = document.createElement('canvas');
  }
  setupBuffer(rasterCanvas);
}

function toPhysical(value: number) {
  return Math.round(value * RENDER_SCALE);
}

function fitZoomToStage() {
  const stageEl = stage.value;
  if (!stageEl) return;

  const padding = 24;
  const availW = stageEl.clientWidth - padding * 2;
  const availH = stageEl.clientHeight - padding * 2;
  if (availW <= 0 || availH <= 0) return;

  const zoomW = (availW / props.width) * 100;
  const zoomH = (availH / props.height) * 100;
  zoom.value = clamp(Math.floor(Math.min(zoomW, zoomH)), 25, 200);
}

function configureStroke(
  ctx: CanvasRenderingContext2D,
  color: string,
  tool: Tool = activeTool.value,
  width = brushSize.value,
) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = tool === 'marker' ? 0.28 : 1;
  ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
  ctx.fillStyle = color;
  ctx.lineWidth = tool === 'eraser' ? width * 2.2 : width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function applyShapePaint(ctx: CanvasRenderingContext2D, mode: ShapeMode) {
  if (mode === 'fill' || mode === 'both') ctx.fill();
  if (mode === 'outline' || mode === 'both') ctx.stroke();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  lineWidth: number,
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = Math.max(12, lineWidth * 3);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - size * Math.cos(angle - Math.PI / 6),
    to.y - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    to.x - size * Math.cos(angle + Math.PI / 6),
    to.y - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function normalizedRect(from: Point, to: Point) {
  return {
    h: Math.abs(to.y - from.y),
    w: Math.abs(to.x - from.x),
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
  };
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const radius = Math.min(Math.abs(w), Math.abs(h), 28);
  const right = x + w;
  const bottom = y + h;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  kind: ShapeKind,
  from: Point,
  to: Point,
  color: string,
  lineWidth: number,
  mode: ShapeMode,
  options?: { fontSize?: number; text?: string },
) {
  const rect = normalizedRect(from, to);

  ctx.save();
  configureStroke(ctx, color, kind === 'text' ? 'pencil' : kind, lineWidth);
  ctx.globalAlpha = 1;
  ctx.lineWidth = lineWidth;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (kind === 'text') {
    const fontSize = options?.fontSize || Math.max(16, lineWidth * 5);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(options?.text || '', from.x, from.y);
    ctx.restore();
    return;
  }

  if (kind === 'line' || kind === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    if (kind === 'arrow') drawArrowHead(ctx, from, to, lineWidth);
    ctx.restore();
    return;
  }

  if (kind === 'rect') {
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    applyShapePaint(ctx, mode);
  }

  if (kind === 'roundRect') {
    roundedRectPath(ctx, rect.x, rect.y, rect.w, rect.h);
    applyShapePaint(ctx, mode);
  }

  if (kind === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(
      rect.x + rect.w / 2,
      rect.y + rect.h / 2,
      Math.max(rect.w / 2, 0.5),
      Math.max(rect.h / 2, 0.5),
      0,
      0,
      Math.PI * 2,
    );
    applyShapePaint(ctx, mode);
  }

  if (kind === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.w / 2, rect.y);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.lineTo(rect.x, rect.y + rect.h);
    ctx.closePath();
    applyShapePaint(ctx, mode);
  }

  if (kind === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.w / 2, rect.y);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h / 2);
    ctx.lineTo(rect.x + rect.w / 2, rect.y + rect.h);
    ctx.lineTo(rect.x, rect.y + rect.h / 2);
    ctx.closePath();
    applyShapePaint(ctx, mode);
  }

  ctx.restore();
}

function paintShape(
  ctx: CanvasRenderingContext2D,
  shape: Pick<
    ShapeObject,
    | 'color'
    | 'fontSize'
    | 'from'
    | 'kind'
    | 'lineWidth'
    | 'mode'
    | 'text'
    | 'to'
  >,
) {
  drawShape(
    ctx,
    shape.kind,
    shape.from,
    shape.to,
    shape.color,
    shape.lineWidth,
    shape.mode,
    { fontSize: shape.fontSize, text: shape.text },
  );
}

function drawShapeSelectionOutline(shape: ShapeObject) {
  const ctx = getContext();
  if (!ctx) return;

  const rect = normalizedRect(shape.from, shape.to);
  const pad = Math.max(4, shape.lineWidth);
  const x = rect.x - pad;
  const y = rect.y - pad;
  const w = rect.w + pad * 2;
  const h = rect.h + pad * 2;

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2563eb';
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);

  const handle = 6;
  const points = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ];
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2563eb';
  for (const point of points) {
    ctx.fillRect(point.x - handle / 2, point.y - handle / 2, handle, handle);
    ctx.strokeRect(
      point.x - handle / 2 + 0.5,
      point.y - handle / 2 + 0.5,
      handle,
      handle,
    );
  }
  ctx.restore();
}

function redrawScene(
  preview?: ShapePreview,
  options?: { showSelection?: boolean },
) {
  const target = canvas.value;
  const ctx = getContext();
  const raster = rasterCanvas;
  if (!target || !ctx || !raster) return;

  clearMainToWhite();
  ctx.drawImage(raster, 0, 0, props.width, props.height);

  for (const shape of shapes.value) {
    paintShape(ctx, shape);
  }

  if (preview) {
    paintShape(ctx, preview);
  }

  if (options?.showSelection !== false && selectedShapeId.value) {
    const selected = shapes.value.find(
      (item) => item.id === selectedShapeId.value,
    );
    if (selected) drawShapeSelectionOutline(selected);
  }
}

function bakeShapesIntoRaster() {
  const ctx = getRasterContext();
  if (!ctx) return;

  for (const shape of shapes.value) {
    paintShape(ctx, shape);
  }
  shapes.value = [];
  selectedShapeId.value = undefined;
}

function saveHistory(emitChange = true) {
  redrawScene(undefined, { showSelection: false });
  const png = getPng();
  const raster = getRasterPng();
  redrawScene();
  if (!png || !raster) return;

  const current = history.value[historyIndex.value];
  if (current && png === current.png) {
    if (emitChange) emit('update:modelValue', png);
    return;
  }

  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push({
    png,
    raster,
    shapes: cloneShapes(shapes.value),
  });
  historyIndex.value = history.value.length - 1;
  if (emitChange) emit('update:modelValue', png);
}

function loadRasterFromDataUrl(value: string, onDone?: () => void) {
  const target = rasterCanvas;
  const ctx = getRasterContext();
  if (!target || !ctx) return;

  clearRasterToWhite();

  if (!value) {
    onDone?.();
    return;
  }

  const image = new Image();
  image.addEventListener('load', () => {
    const currentTarget = rasterCanvas;
    const currentCtx = getRasterContext();
    if (!currentTarget || !currentCtx) return;

    clearRasterToWhite();
    currentCtx.drawImage(image, 0, 0, props.width, props.height);
    onDone?.();
  });
  image.src = value;
}

function restoreHistoryEntry(
  entry: HistoryEntry | undefined,
  emitChange = false,
) {
  if (!entry) return;

  selection.value = undefined;
  selectedShapeId.value = undefined;

  loadRasterFromDataUrl(entry.raster, () => {
    shapes.value = cloneShapes(entry.shapes);
    redrawScene();
    if (emitChange) emit('update:modelValue', entry.png || getPng());
  });
}

function loadExternalPng(value: string, emitChange = false) {
  selection.value = undefined;
  selectedShapeId.value = undefined;
  shapes.value = [];

  loadRasterFromDataUrl(value, () => {
    redrawScene();
    if (emitChange) emitCanvas();
  });
}

function initializeCanvas() {
  const target = canvas.value;
  if (!target) return;

  setupBuffer(target);
  ensureRasterCanvas();
  clearRasterToWhite();
  shapes.value = [];
  selectedShapeId.value = undefined;
  selection.value = undefined;
  pendingTextPlacement.value = undefined;
  textDraft.value.visible = false;

  if (props.modelValue) {
    loadRasterFromDataUrl(props.modelValue, () => {
      redrawScene();
      history.value = [
        {
          png: props.modelValue,
          raster: getRasterPng(),
          shapes: [],
        },
      ];
      historyIndex.value = 0;
    });
    return;
  }

  redrawScene();
  history.value = [
    {
      png: getPng(),
      raster: getRasterPng(),
      shapes: [],
    },
  ];
  historyIndex.value = 0;
}

function drawFreehandLine(from: Point, to: Point, color: string) {
  const ctx = getRasterContext();
  if (!ctx) return;

  ctx.save();
  configureStroke(ctx, color);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawSpray(point: Point, color: string) {
  const ctx = getRasterContext();
  if (!ctx) return;

  const radius = Math.max(6, brushSize.value * 2.4);
  const density = Math.max(10, Math.round(brushSize.value * 3));

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  for (let index = 0; index < density; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    ctx.fillRect(
      point.x + Math.cos(angle) * distance,
      point.y + Math.sin(angle) * distance,
      1.4,
      1.4,
    );
  }
  ctx.restore();
}

function drawSelectionOutline(x: number, y: number, w: number, h: number) {
  const ctx = getContext();
  if (!ctx) return;

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2563eb';
  ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  ctx.restore();
}

function drawSelectionPreview() {
  const ctx = getRasterContext();
  const active = selection.value;
  if (!ctx || !active) return;

  ctx.putImageData(active.base, 0, 0);
  ctx.putImageData(active.data, toPhysical(active.x), toPhysical(active.y));
  redrawScene();
  drawSelectionOutline(active.x, active.y, active.w, active.h);
}

function createSelection(from: Point, to: Point) {
  const target = rasterCanvas;
  const ctx = getRasterContext();
  if (!target || !ctx) return;

  const rect = normalizedRect(from, to);
  const x = Math.round(clamp(rect.x, 0, props.width));
  const y = Math.round(clamp(rect.y, 0, props.height));
  const w = Math.round(clamp(rect.w, 0, props.width - x));
  const h = Math.round(clamp(rect.h, 0, props.height - y));

  if (w < 4 || h < 4) return;

  const px = toPhysical(x);
  const py = toPhysical(y);
  const pw = Math.max(1, toPhysical(w));
  const ph = Math.max(1, toPhysical(h));

  const data = ctx.getImageData(px, py, pw, ph);
  ctx.clearRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);

  selection.value = {
    base: ctx.getImageData(0, 0, target.width, target.height),
    data,
    h,
    w,
    x,
    y,
  };
  drawSelectionPreview();
}

function commitSelection(save = false) {
  const ctx = getRasterContext();
  const active = selection.value;
  if (!ctx || !active) return;

  ctx.putImageData(active.base, 0, 0);
  ctx.putImageData(active.data, toPhysical(active.x), toPhysical(active.y));
  selection.value = undefined;
  redrawScene();
  if (save) saveHistory();
}

function deleteSelection() {
  if (selectedShapeId.value) {
    shapes.value = shapes.value.filter(
      (item) => item.id !== selectedShapeId.value,
    );
    selectedShapeId.value = undefined;
    redrawScene();
    saveHistory();
    return;
  }

  const ctx = getRasterContext();
  const active = selection.value;
  if (!ctx || !active) return;

  ctx.putImageData(active.base, 0, 0);
  selection.value = undefined;
  redrawScene();
  saveHistory();
}

function pointInSelection(point: Point) {
  const active = selection.value;
  if (!active) return false;

  return (
    point.x >= active.x &&
    point.x <= active.x + active.w &&
    point.y >= active.y &&
    point.y <= active.y + active.h
  );
}

function distanceToSegment(point: Point, from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }

  const t = clamp(
    ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSq,
    0,
    1,
  );
  const projX = from.x + t * dx;
  const projY = from.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

function hitTestShape(point: Point): ShapeObject | undefined {
  for (let index = shapes.value.length - 1; index >= 0; index -= 1) {
    const shape = shapes.value[index];
    if (!shape) continue;

    if (shape.kind === 'line' || shape.kind === 'arrow') {
      if (
        distanceToSegment(point, shape.from, shape.to) <
        Math.max(8, shape.lineWidth)
      ) {
        return shape;
      }
      continue;
    }

    const rect = normalizedRect(shape.from, shape.to);
    if (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    ) {
      return shape;
    }
  }

  return undefined;
}

function shapeLargeEnough(from: Point, to: Point) {
  return Math.hypot(to.x - from.x, to.y - from.y) >= 4;
}

function sampleColor(point: Point) {
  const ctx = getContext();
  if (!ctx) return;

  const pixel = ctx.getImageData(
    toPhysical(point.x),
    toPhysical(point.y),
    1,
    1,
  ).data;
  const [r = 0, g = 0, b = 0] = pixel;
  const hex = [r, g, b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  primaryColor.value = `#${hex}`;
  customColor.value = primaryColor.value;
}

function fillArea(point: Point, color: string) {
  const target = rasterCanvas;
  const ctx = getRasterContext();
  if (!target || !ctx) return;

  const image = ctx.getImageData(0, 0, target.width, target.height);
  const data = image.data;
  const startX = Math.floor(point.x * RENDER_SCALE);
  const startY = Math.floor(point.y * RENDER_SCALE);
  const startIndex = (startY * target.width + startX) * 4;
  const fillParts = color
    .match(/\w\w/g)
    ?.map((part) => Number.parseInt(part, 16));
  if (!fillParts || fillParts.length < 3) return;
  const fillR = fillParts[0] ?? 0;
  const fillG = fillParts[1] ?? 0;
  const fillB = fillParts[2] ?? 0;

  const source = [
    data[startIndex],
    data[startIndex + 1],
    data[startIndex + 2],
    data[startIndex + 3],
  ];
  if (
    source[0] === fillR &&
    source[1] === fillG &&
    source[2] === fillB &&
    source[3] === 255
  ) {
    return;
  }

  const stack: Point[] = [{ x: startX, y: startY }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const x = current.x;
    const y = current.y;
    if (x < 0 || y < 0 || x >= target.width || y >= target.height) continue;

    const index = (y * target.width + x) * 4;
    if (
      data[index] !== source[0] ||
      data[index + 1] !== source[1] ||
      data[index + 2] !== source[2] ||
      data[index + 3] !== source[3]
    ) {
      continue;
    }

    data[index] = fillR;
    data[index + 1] = fillG;
    data[index + 2] = fillB;
    data[index + 3] = 255;

    stack.push(
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    );
  }

  ctx.putImageData(image, 0, 0);
  redrawScene();
  saveHistory();
}

function beginTextEdit(point: Point, color: string) {
  textBlurArmed = false;
  if (textFocusTimer !== undefined) {
    window.clearTimeout(textFocusTimer);
    textFocusTimer = undefined;
  }

  textDraft.value = {
    color,
    fontSize: Math.max(18, brushSize.value * 5),
    value: '',
    visible: true,
    x: point.x,
    y: point.y,
  };

  void nextTick(() => {
    const el = textInputEl.value;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(0, el.value.length);
    // Avoid the spurious blur that happens while the opening click settles.
    textFocusTimer = window.setTimeout(() => {
      textBlurArmed = true;
      el.focus({ preventScroll: true });
    }, 50);
  });
}

function cancelTextDraft() {
  if (!textDraft.value.visible) return;
  textBlurArmed = false;
  if (textFocusTimer !== undefined) {
    window.clearTimeout(textFocusTimer);
    textFocusTimer = undefined;
  }
  textDraft.value.visible = false;
  textDraft.value.value = '';
  redrawScene();
}

function commitTextDraft(options?: { force?: boolean }) {
  if (!textDraft.value.visible) return;
  if (!options?.force && !textBlurArmed) {
    void nextTick(() => textInputEl.value?.focus({ preventScroll: true }));
    return;
  }

  const value = textDraft.value.value.trim();
  const { color, fontSize, x, y } = textDraft.value;
  textBlurArmed = false;
  if (textFocusTimer !== undefined) {
    window.clearTimeout(textFocusTimer);
    textFocusTimer = undefined;
  }
  textDraft.value.visible = false;
  textDraft.value.value = '';

  if (!value) {
    redrawScene();
    return;
  }

  const ctx = getContext();
  let width = value.length * fontSize * 0.62;
  const height = fontSize * 1.35;
  if (ctx) {
    ctx.save();
    ctx.font = `${fontSize}px sans-serif`;
    width = Math.max(12, ctx.measureText(value).width);
    ctx.restore();
  }

  const id = createShapeId();
  shapes.value.push({
    color,
    fontSize,
    from: { x, y },
    id,
    kind: 'text',
    lineWidth: brushSize.value,
    mode: 'fill',
    text: value,
    to: { x: x + width, y: y + height },
  });
  selectedShapeId.value = id;
  activeTool.value = 'select';
  redrawScene();
  saveHistory();
}

function setTool(nextTool: Tool) {
  pendingTextPlacement.value = undefined;
  if (textDraft.value.visible) {
    commitTextDraft({ force: true });
  }
  if (nextTool !== 'select') {
    commitSelection(true);
    selectedShapeId.value = undefined;
    redrawScene();
  }
  activeTool.value = nextTool;
}

function handlePointerDown(event: PointerEvent) {
  const target = canvas.value;
  if (!target) return;

  if (textDraft.value.visible) {
    commitTextDraft({ force: true });
  }

  const point = canvasPoint(event);
  const color = activeColor(event);

  if (activeTool.value === 'text') {
    commitSelection(true);
    selectedShapeId.value = undefined;
    pendingTextPlacement.value = { color, point };
    return;
  }

  target.setPointerCapture(event.pointerId);

  if (activeTool.value === 'select') {
    const hitShape = hitTestShape(point);
    if (hitShape) {
      commitSelection(false);
      selectedShapeId.value = hitShape.id;
      draggingShape.value = true;
      shapeDragOrigin.value = point;
      shapeDragStartFrom.value = { ...hitShape.from };
      shapeDragStartTo.value = { ...hitShape.to };
      redrawScene();
      return;
    }

    if (pointInSelection(point)) {
      selectedShapeId.value = undefined;
      draggingSelection.value = true;
      const active = selection.value;
      if (!active) return;
      selectionOffset.value = { x: point.x - active.x, y: point.y - active.y };
      return;
    }

    selectedShapeId.value = undefined;
    commitSelection(true);
    selecting.value = true;
    startPoint.value = point;
    redrawScene();
    return;
  }

  commitSelection(true);
  selectedShapeId.value = undefined;

  if (activeTool.value === 'eyedropper') {
    sampleColor(point);
    return;
  }

  if (activeTool.value === 'fill') {
    fillArea(point, color);
    return;
  }

  startPoint.value = point;
  lastPoint.value = point;
  drawing.value = true;

  if (activeTool.value === 'spray') {
    drawSpray(point, color);
    redrawScene();
  }
}

function handlePointerMove(event: PointerEvent) {
  const target = canvas.value;
  if (!target) return;

  const point = canvasPoint(event);
  const color = activeColor(event);

  if (draggingShape.value) {
    const selected = shapes.value.find(
      (item) => item.id === selectedShapeId.value,
    );
    if (!selected) return;

    const dx = point.x - shapeDragOrigin.value.x;
    const dy = point.y - shapeDragOrigin.value.y;
    selected.from = {
      x: shapeDragStartFrom.value.x + dx,
      y: shapeDragStartFrom.value.y + dy,
    };
    selected.to = {
      x: shapeDragStartTo.value.x + dx,
      y: shapeDragStartTo.value.y + dy,
    };
    redrawScene();
    return;
  }

  if (draggingSelection.value) {
    const active = selection.value;
    if (!active) return;

    active.x = clamp(
      point.x - selectionOffset.value.x,
      0,
      props.width - active.w,
    );
    active.y = clamp(
      point.y - selectionOffset.value.y,
      0,
      props.height - active.h,
    );
    drawSelectionPreview();
    return;
  }

  if (selecting.value) {
    redrawScene();
    const rect = normalizedRect(startPoint.value, point);
    drawSelectionOutline(rect.x, rect.y, rect.w, rect.h);
    return;
  }

  if (!drawing.value) return;

  if (freehandTools.has(activeTool.value)) {
    if (activeTool.value === 'spray') {
      drawSpray(point, color);
    } else {
      drawFreehandLine(lastPoint.value, point, color);
    }
    lastPoint.value = point;
    redrawScene();
    return;
  }

  if (isShapeKind(activeTool.value)) {
    redrawScene({
      color,
      from: startPoint.value,
      kind: activeTool.value,
      lineWidth: brushSize.value,
      mode: shapeMode.value,
      to: point,
    });
  }
}

function handlePointerLeave(event: PointerEvent) {
  if (
    activeTool.value === 'text' ||
    textDraft.value.visible ||
    pendingTextPlacement.value
  ) {
    return;
  }
  handlePointerUp(event);
}

function handlePointerUp(event: PointerEvent) {
  const target = canvas.value;
  if (!target) return;

  const point = canvasPoint(event);
  if (target.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }

  const pendingText = pendingTextPlacement.value;
  if (pendingText) {
    pendingTextPlacement.value = undefined;
    beginTextEdit(pendingText.point, pendingText.color);
    return;
  }

  if (draggingShape.value) {
    draggingShape.value = false;
    redrawScene();
    saveHistory();
    return;
  }

  if (draggingSelection.value) {
    draggingSelection.value = false;
    drawSelectionPreview();
    return;
  }

  if (selecting.value) {
    selecting.value = false;
    const rect = normalizedRect(startPoint.value, point);
    if (rect.w < 4 && rect.h < 4) {
      redrawScene();
      return;
    }
    createSelection(startPoint.value, point);
    return;
  }

  if (!drawing.value) return;
  drawing.value = false;

  if (isShapeKind(activeTool.value)) {
    if (shapeLargeEnough(startPoint.value, point)) {
      const id = createShapeId();
      shapes.value.push({
        color: activeColor(event),
        from: { ...startPoint.value },
        id,
        kind: activeTool.value,
        lineWidth: brushSize.value,
        mode: shapeMode.value,
        to: { ...point },
      });
      selectedShapeId.value = id;
      activeTool.value = 'select';
      redrawScene();
      saveHistory();
      return;
    }

    redrawScene();
    return;
  }

  redrawScene();
  saveHistory();
}

function undo() {
  if (!canUndo.value) return;
  selection.value = undefined;
  historyIndex.value -= 1;
  restoreHistoryEntry(history.value[historyIndex.value], true);
}

function redo() {
  if (!canRedo.value) return;
  selection.value = undefined;
  historyIndex.value += 1;
  restoreHistoryEntry(history.value[historyIndex.value], true);
}

function clearCanvas() {
  selection.value = undefined;
  selectedShapeId.value = undefined;
  shapes.value = [];
  clearRasterToWhite();
  redrawScene();
  saveHistory();
}

function flipHorizontal() {
  const target = rasterCanvas;
  const ctx = getRasterContext();
  if (!target || !ctx) return;

  commitSelection(true);
  bakeShapesIntoRaster();
  redrawScene();

  const image = getRasterPng();
  const picture = new Image();
  picture.addEventListener('load', () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.translate(target.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(picture, 0, 0, target.width, target.height);
    resetBufferTransform(ctx);
    redrawScene();
    saveHistory();
  });
  picture.src = image;
}

function flipVertical() {
  const target = rasterCanvas;
  const ctx = getRasterContext();
  if (!target || !ctx) return;

  commitSelection(true);
  bakeShapesIntoRaster();
  redrawScene();

  const image = getRasterPng();
  const picture = new Image();
  picture.addEventListener('load', () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.translate(0, target.height);
    ctx.scale(1, -1);
    ctx.drawImage(picture, 0, 0, target.width, target.height);
    resetBufferTransform(ctx);
    redrawScene();
    saveHistory();
  });
  picture.src = image;
}

function rotate90() {
  const target = rasterCanvas;
  const ctx = getRasterContext();
  if (!target || !ctx) return;

  commitSelection(true);
  bakeShapesIntoRaster();
  redrawScene();

  const image = getRasterPng();
  const picture = new Image();
  picture.addEventListener('load', () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.translate(target.width / 2, target.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(
      picture,
      -target.height / 2,
      -target.width / 2,
      target.height,
      target.width,
    );
    resetBufferTransform(ctx);
    redrawScene();
    saveHistory();
  });
  picture.src = image;
}

function openImage() {
  fileInput.value?.click();
}

function handleImageOpen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    const value = String(reader.result || '');
    const target = rasterCanvas;
    const ctx = getRasterContext();
    if (!target || !ctx || !value) return;

    const image = new Image();
    image.addEventListener('load', () => {
      commitSelection(false);
      selectedShapeId.value = undefined;
      shapes.value = [];
      clearRasterToWhite();

      const scale = Math.min(
        props.width / image.width,
        props.height / image.height,
      );
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (props.width - width) / 2;
      const y = (props.height - height) / 2;
      ctx.drawImage(image, x, y, width, height);
      redrawScene();
      saveHistory();
    });
    image.src = value;
  });
  reader.readAsDataURL(file);
  input.value = '';
}

function saveAsImage() {
  commitSelection(false);
  redrawScene(undefined, { showSelection: false });
  const link = document.createElement('a');
  link.href = getPng();
  link.download = 'drawing-answer.png';
  link.click();
  redrawScene();
}

function setShapeMode(mode: ShapeMode) {
  shapeMode.value = mode;
}

function setPrimaryColor(color: string) {
  primaryColor.value = color;
  customColor.value = color;
}

function swapColors() {
  const nextPrimary = secondaryColor.value;
  secondaryColor.value = primaryColor.value;
  primaryColor.value = nextPrimary;
  customColor.value = primaryColor.value;
}

function zoomIn() {
  zoom.value = clamp(zoom.value + 10, 25, 200);
}

function zoomOut() {
  zoom.value = clamp(zoom.value - 10, 25, 200);
}

async function toggleFullscreen() {
  const target = root.value;
  if (!target) return;

  if (fullscreen.value) {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // CSS fullscreen remains available when the browser API is blocked.
    }
    fullscreen.value = false;
    return;
  }

  try {
    await target.requestFullscreen();
  } catch {
    // Keep the component usable inside embedded or permission-limited contexts.
  }
  fullscreen.value = true;
  await nextTick();
  fitZoomToStage();
}

function handleFullscreenChange() {
  fullscreen.value = Boolean(document.fullscreenElement);
  if (fullscreen.value) {
    void nextTick(() => fitZoomToStage());
  }
}

function handleWindowResize() {
  if (fullscreen.value) fitZoomToStage();
}

function handleKeydown(event: KeyboardEvent) {
  const typing =
    textDraft.value.visible ||
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement;

  if (typing) {
    if (event.key === 'Escape' && textDraft.value.visible) {
      event.preventDefault();
      cancelTextDraft();
    }
    return;
  }

  if (
    (event.key === 'Delete' || event.key === 'Backspace') &&
    (selection.value || selectedShapeId.value)
  ) {
    event.preventDefault();
    deleteSelection();
  }

  if (event.key === 'Escape' && fullscreen.value) {
    event.preventDefault();
    void toggleFullscreen();
  }

  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    void toggleFullscreen();
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undo();
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redo();
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (loadingExternal.value) return;
    const current = history.value[historyIndex.value]?.png || '';
    if (value && value !== current) {
      loadingExternal.value = true;
      loadExternalPng(value);
      history.value = [
        {
          png: value,
          raster: value,
          shapes: [],
        },
      ];
      historyIndex.value = 0;
      loadingExternal.value = false;
    }
  },
);

watch(
  () => [props.width, props.height],
  () => {
    nextTick(() => initializeCanvas());
  },
);

onMounted(() => {
  nextTick(() => initializeCanvas());
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleWindowResize);
});
</script>

<template>
  <div ref="root" class="paint" :class="{ fullscreen }">
    <header class="paint-header">
      <div class="paint-title">
        <strong>绘图作答</strong>
        <span>{{ prompt || '使用画笔、形状、文字或图片完成作答' }}</span>
      </div>
      <div class="paint-header-actions">
        <Button size="small" @click="openImage">打开图片</Button>
        <Button size="small" @click="saveAsImage">保存为</Button>
        <Button size="small" type="primary" @click="toggleFullscreen">
          {{ fullscreen ? '退出全屏' : '全屏' }}
        </Button>
      </div>
    </header>

    <div class="paint-toolbar">
      <template v-for="(group, groupIndex) in toolGroups" :key="groupIndex">
        <div class="paint-tools">
          <Tooltip v-for="item in group" :key="item.id" :title="item.label">
            <Button
              class="paint-tool-button"
              :class="{ active: activeTool === item.id }"
              :style="toolButtonStyle(item.id)"
              :aria-label="item.label"
              @click="setTool(item.id)"
            />
          </Tooltip>
        </div>
        <span class="paint-divider"></span>
      </template>

      <div class="paint-colors">
        <Tooltip title="主色">
          <button
            class="paint-color-swatch large"
            :style="{ backgroundColor: primaryColor }"
            type="button"
            @click="setPrimaryColor(customColor)"
          ></button>
        </Tooltip>
        <Tooltip title="副色">
          <button
            class="paint-color-swatch secondary"
            :style="{ backgroundColor: secondaryColor }"
            type="button"
            @click="secondaryColor = primaryColor"
          ></button>
        </Tooltip>
        <Button class="paint-swap" size="small" @click="swapColors">
          交换
        </Button>
        <div class="paint-palette">
          <button
            v-for="color in palette"
            :key="color"
            class="paint-color-swatch"
            :style="{ backgroundColor: color }"
            type="button"
            @click="setPrimaryColor(color)"
          ></button>
          <input
            v-model="customColor"
            class="paint-custom-color"
            type="color"
            @input="setPrimaryColor(customColor)"
          />
        </div>
      </div>

      <span class="paint-divider"></span>

      <div class="paint-size-group">
        <button
          v-for="size in sizePresets"
          :key="size"
          class="paint-size"
          :class="{ active: brushSize === size }"
          type="button"
          @click="brushSize = size"
        >
          <span
            :style="{
              height: `${Math.min(size, 18)}px`,
              width: `${Math.min(size, 18)}px`,
            }"
          ></span>
        </button>
        <InputNumber
          v-model:value="brushSize"
          class="paint-size-input"
          :max="48"
          :min="1"
          size="small"
        />
      </div>

      <span class="paint-divider"></span>

      <div class="paint-segment">
        <Button
          size="small"
          :type="shapeMode === 'outline' ? 'primary' : 'default'"
          @click="setShapeMode('outline')"
        >
          描边
        </Button>
        <Button
          size="small"
          :type="shapeMode === 'fill' ? 'primary' : 'default'"
          @click="setShapeMode('fill')"
        >
          填充
        </Button>
        <Button
          size="small"
          :type="shapeMode === 'both' ? 'primary' : 'default'"
          @click="setShapeMode('both')"
        >
          两者
        </Button>
      </div>

      <span class="paint-divider"></span>

      <div class="paint-actions">
        <Button size="small" :disabled="!canUndo" @click="undo">撤销</Button>
        <Button size="small" :disabled="!canRedo" @click="redo">重做</Button>
        <Button size="small" @click="clearCanvas">清空</Button>
        <Button
          size="small"
          :disabled="!canDeleteSelection"
          @click="deleteSelection"
        >
          删除选择
        </Button>
      </div>

      <span class="paint-divider"></span>

      <div class="paint-actions">
        <Button size="small" @click="showGrid = !showGrid">
          {{ showGrid ? '隐藏网格' : '显示网格' }}
        </Button>
        <Button size="small" @click="flipHorizontal">水平翻转</Button>
        <Button size="small" @click="flipVertical">垂直翻转</Button>
        <Button size="small" @click="rotate90">旋转90</Button>
      </div>

      <span class="paint-divider"></span>

      <div class="paint-zoom">
        <Button size="small" @click="zoomOut">-</Button>
        <span>{{ zoomText }}</span>
        <Button size="small" @click="zoomIn">+</Button>
      </div>
    </div>

    <main ref="stage" class="paint-stage">
      <div class="paint-canvas-shell" :class="{ grid: showGrid }">
        <canvas
          ref="canvas"
          :style="canvasStyle"
          @contextmenu.prevent
          @pointercancel="handlePointerUp"
          @pointerdown="handlePointerDown"
          @pointerleave="handlePointerLeave"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
        ></canvas>
        <textarea
          v-show="textDraft.visible"
          ref="textInputEl"
          v-model="textDraft.value"
          class="paint-text-input"
          :style="{
            color: textDraft.color,
            fontSize: `${(textDraft.fontSize * zoom) / 100}px`,
            left: `${(textDraft.x * zoom) / 100}px`,
            top: `${(textDraft.y * zoom) / 100}px`,
            minHeight: `${(textDraft.fontSize * zoom) / 100 + 8}px`,
          }"
          autocomplete="off"
          rows="1"
          spellcheck="false"
          @blur="commitTextDraft()"
          @keydown.enter.exact.prevent="commitTextDraft({ force: true })"
          @keydown.esc.prevent="cancelTextDraft"
          @mousedown.stop
          @pointerdown.stop
        ></textarea>
      </div>
    </main>

    <footer class="paint-status">
      <span>画布 {{ width }} x {{ height }}</span>
      <span>工具：{{ activeToolLabel }}</span>
      <span>粗细：{{ brushSize }}px</span>
      <span>倍率：{{ RENDER_SCALE }}x</span>
      <span>缩放：{{ zoomText }}</span>
      <span v-if="selection">
        已选择 {{ Math.round(selection.w) }} x {{ Math.round(selection.h) }}
      </span>
      <span v-else-if="selectedShapeId">已选择形状</span>
    </footer>

    <input
      ref="fileInput"
      accept="image/*"
      class="paint-file-input"
      type="file"
      @change="handleImageOpen"
    />
  </div>
</template>

<style scoped>
.paint {
  display: flex;
  flex-direction: column;
  min-height: 560px;
  overflow: hidden;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 12px 32px hsl(var(--foreground) / 8%);
}

.paint.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  height: 100vh;
}

.paint.fullscreen .paint-stage {
  display: grid;
  flex: 1;
  place-items: center;
  min-height: 0;
  overflow: auto;
}

.paint-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
}

.paint-title {
  display: flex;
  flex-direction: column;
  min-width: 180px;
}

.paint-title strong {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.35;
}

.paint-title span {
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 1.45;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.paint-header-actions,
.paint-actions,
.paint-segment,
.paint-tools,
.paint-zoom {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.paint-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  overflow-x: auto;
  background: hsl(var(--muted) / 34%);
  border-bottom: 1px solid hsl(var(--border));
}

.paint-divider {
  flex: 0 0 auto;
  width: 1px;
  height: 32px;
  background: hsl(var(--border));
}

.paint-tool-button {
  width: 34px;
  height: 32px;
  padding: 0;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
  background-image: var(--paint-icon);
  background-repeat: no-repeat;
  background-position: center;
  background-size: 18px 18px;
  border-color: hsl(var(--border));
  border-radius: 8px;
}

.paint-tool-button:hover,
.paint-tool-button.active {
  color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 50%);
}

.paint-colors {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-width: 260px;
}

.paint-palette {
  display: grid;
  grid-template-columns: repeat(7, 18px);
  gap: 4px;
  align-items: center;
}

.paint-color-swatch {
  width: 18px;
  height: 18px;
  padding: 0;
  cursor: pointer;
  border: 1px solid hsl(var(--border));
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px hsl(var(--background) / 65%);
}

.paint-color-swatch.large {
  width: 30px;
  height: 30px;
  border-radius: 8px;
}

.paint-color-swatch.secondary {
  width: 24px;
  height: 24px;
  border-radius: 7px;
}

.paint-custom-color {
  width: 18px;
  height: 18px;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.paint-swap {
  flex: 0 0 auto;
}

.paint-size-group {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.paint-size {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.paint-size span {
  display: block;
  background: hsl(var(--foreground));
  border-radius: 999px;
}

.paint-size.active {
  background: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 50%);
}

.paint-size-input {
  width: 72px;
}

.paint-zoom span {
  min-width: 44px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.paint-stage {
  position: relative;
  flex: 1;
  padding: 18px;
  overflow: auto;
  background:
    radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0),
    hsl(var(--muted) / 18%);
  background-size: 18px 18px;
}

.paint-canvas-shell {
  position: relative;
  width: max-content;
  margin: 0 auto;
  background: #fff;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 16px 40px hsl(var(--foreground) / 12%);
}

.paint-canvas-shell.grid::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image:
    linear-gradient(rgb(37 99 235 / 11%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(37 99 235 / 11%) 1px, transparent 1px);
  background-size: 24px 24px;
}

.paint-canvas-shell canvas {
  display: block;
  max-width: none;
  touch-action: none;
  cursor: crosshair;
  background: #fff;
  border-radius: 8px;
}

.paint-text-input {
  position: absolute;
  z-index: 5;
  box-sizing: border-box;
  min-width: 12em;
  max-width: min(480px, 70vw);
  padding: 2px 4px;
  margin: 0;
  overflow: hidden;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  font-weight: 500;
  line-height: 1.25;
  caret-color: currentcolor;
  resize: both;
  outline: none;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #2563eb;
  border-radius: 2px;
  box-shadow: 0 0 0 2px rgb(37 99 235 / 20%);
}

.paint-status {
  display: flex;
  gap: 14px;
  align-items: center;
  min-height: 34px;
  padding: 7px 12px;
  overflow-x: auto;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background));
  border-top: 1px solid hsl(var(--border));
}

.paint-file-input {
  display: none;
}

@media (max-width: 960px) {
  .paint-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .paint-title span {
    max-width: 86vw;
  }
}
</style>
