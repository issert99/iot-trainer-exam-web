/**
 * 挖空文原子：空位绑定 + 可选共享词库（覆盖「每空四选一」与「共享词库」）
 */

export type SlotBinding =
  | 'formula'
  | 'free_text'
  | 'local_choice'
  | 'number'
  | 'shared_pool';

export type PaperSlot = {
  answer?: string;
  binding: SlotBinding;
  marker: number;
  optionCount?: number;
  options?: Array<{ key: string; text: string }>;
};

export type PassagePool = {
  items: Array<{ key: string; text: string }>;
  reuse: 'once' | 'repeatable';
  size: number;
};

export type PassageProps = {
  defaultBinding: SlotBinding;
  defaultOptionCount: number;
  pool: null | PassagePool;
  slots: PaperSlot[];
  /** 文内用 [[n]] 标记空；模板阶段可为空，只靠 slots 量化 */
  text: string;
  title: string;
};

export const SLOT_BINDING_OPTIONS: Array<{
  label: string;
  value: SlotBinding;
}> = [
  { label: '本空自带选项', value: 'local_choice' },
  { label: '从共享词库选', value: 'shared_pool' },
  { label: '手打文字', value: 'free_text' },
  { label: '填数值', value: 'number' },
  { label: '填公式', value: 'formula' },
];

export function createDefaultPassageProps(
  binding: SlotBinding = 'local_choice',
  blankCount = 10,
): PassageProps {
  const props: PassageProps = {
    title: '挖空文',
    text: '',
    defaultBinding: binding,
    defaultOptionCount: 4,
    slots: [],
    pool: binding === 'shared_pool' ? createDefaultPool(15) : null,
  };
  setPassageBlankCount(props, blankCount);
  return props;
}

export function createDefaultPool(size = 15): PassagePool {
  return {
    size: Math.max(2, size),
    reuse: 'once',
    items: [],
  };
}

export function clozeParts(text: string) {
  return String(text || '').split(/(\[\[\d+\]\])/g);
}

export function clozeMarkerIndexes(passage: string): number[] {
  const matches = String(passage || '').matchAll(/\[\[(\d+)\]\]/g);
  const indexes = new Set<number>();
  for (const match of matches) {
    indexes.add(Number(match[1]));
  }
  return [...indexes].toSorted((a, b) => a - b);
}

function shellOptions(
  count: number,
  previous?: Array<{ key: string; text: string }>,
) {
  const n = Math.max(2, count);
  const prev = previous || [];
  return Array.from({ length: n }, (_, index) => ({
    key: prev[index]?.key || String.fromCodePoint(65 + index),
    text: prev[index]?.text || '',
  }));
}

export function makeSlot(
  marker: number,
  binding: SlotBinding,
  optionCount = 4,
  previous?: PaperSlot,
): PaperSlot {
  const slot: PaperSlot = {
    marker,
    binding,
    answer: previous?.answer,
  };
  if (binding === 'local_choice') {
    slot.optionCount = optionCount;
    slot.options = shellOptions(optionCount, previous?.options);
  }
  return slot;
}

/** 以 slots 数量为准同步空壳；文内有 [[n]] 时对齐标记 */
export function syncPassageSlots(props: PassageProps): PassageProps {
  const markers = clozeMarkerIndexes(props.text);
  const binding = props.defaultBinding || 'local_choice';
  const optionCount = props.defaultOptionCount || 4;
  const previous = Array.isArray(props.slots) ? props.slots : [];

  let targetMarkers = markers;
  if (targetMarkers.length === 0) {
    const count = Math.max(1, previous.length || 1);
    targetMarkers = Array.from({ length: count }, (_, index) => index + 1);
  }

  props.slots = targetMarkers.map((marker, index) => {
    const old =
      previous.find((item) => item.marker === marker) || previous[index];
    return makeSlot(
      marker,
      old?.binding || binding,
      old?.optionCount || optionCount,
      old,
    );
  });

  ensurePoolForSlots(props);
  return props;
}

export function setPassageBlankCount(props: PassageProps, count: number) {
  const n = Math.max(1, Math.min(50, Math.floor(count) || 1));
  const binding = props.defaultBinding || 'local_choice';
  const optionCount = props.defaultOptionCount || 4;
  const previous = Array.isArray(props.slots) ? props.slots : [];

  props.slots = Array.from({ length: n }, (_, index) => {
    const marker = index + 1;
    const old =
      previous.find((item) => item.marker === marker) || previous[index];
    return makeSlot(marker, old?.binding || binding, optionCount, old);
  });

  // 模板无正文时不强制改 text；有正文则重排标记
  if (String(props.text || '').trim()) {
    const without = String(props.text).replaceAll(/\[\[\d+\]\]/g, '___');
    const parts = without.split('___');
    let next = parts[0] || '';
    for (let i = 0; i < n; i += 1) {
      next += `[[${i + 1}]]`;
      if (parts[i + 1] !== undefined) next += parts[i + 1];
      else if (i < n - 1) next += ' …… ';
    }
    props.text = next;
  }

  ensurePoolForSlots(props);
  return props;
}

export function addPassageBlank(props: PassageProps) {
  return setPassageBlankCount(props, (props.slots?.length || 0) + 1);
}

export function removeLastPassageBlank(props: PassageProps) {
  const count = Math.max(1, (props.slots?.length || 1) - 1);
  return setPassageBlankCount(props, count);
}

/** 在文末插入一个空（题目编辑时用） */
export function insertBlankAtEnd(props: PassageProps) {
  const next =
    Math.max(0, ...(props.slots || []).map((item) => item.marker)) + 1;
  const base = String(props.text || '');
  const spacer = base && !/\s$/.test(base) ? ' ' : '';
  props.text = `${base}${spacer}[[${next}]] `;
  return syncPassageSlots(props);
}

export function applyBindingToAll(props: PassageProps, binding: SlotBinding) {
  props.defaultBinding = binding;
  props.slots = (props.slots || []).map((slot) =>
    makeSlot(slot.marker, binding, props.defaultOptionCount || 4, slot),
  );
  ensurePoolForSlots(props);
  return props;
}

export function setSlotBinding(
  props: PassageProps,
  marker: number,
  binding: SlotBinding,
) {
  const slot = (props.slots || []).find((item) => item.marker === marker);
  if (!slot) return props;
  const next = makeSlot(marker, binding, props.defaultOptionCount || 4, slot);
  Object.assign(slot, next);
  ensurePoolForSlots(props);
  return props;
}

export function ensurePoolForSlots(props: PassageProps) {
  const needsPool = (props.slots || []).some(
    (slot) => slot.binding === 'shared_pool',
  );
  if (needsPool) {
    if (!props.pool) props.pool = createDefaultPool(15);
    const minSize = Math.max(2, (props.slots || []).length);
    if (props.pool.size < minSize) props.pool.size = minSize;
  } else {
    props.pool = null;
  }
  return props;
}

export function setDefaultOptionCount(props: PassageProps, count: number) {
  const n = Math.max(2, Math.min(12, Math.floor(count) || 4));
  props.defaultOptionCount = n;
  for (const slot of props.slots || []) {
    if (slot.binding === 'local_choice') {
      slot.optionCount = n;
      slot.options = shellOptions(n, slot.options);
    }
  }
  return props;
}

/** 预览/落库用：无正文时用空壳生成 [[n]] 串 */
export function passageDisplayText(props: PassageProps): string {
  const text = String(props.text || '').trim();
  if (text && clozeMarkerIndexes(text).length > 0) return text;
  const slots = props.slots || [];
  if (slots.length === 0) return '[[1]]';
  return slots.map((slot) => `…… [[${slot.marker}]] `).join('');
}

/** 映射到预览引擎的 blank.type */
export function bindingToBlankType(binding: SlotBinding): string {
  switch (binding) {
    case 'formula': {
      return 'formula';
    }
    case 'local_choice': {
      return 'choice';
    }
    case 'number': {
      return 'number';
    }
    case 'shared_pool': {
      return 'shared_options';
    }
    default: {
      return 'text_short';
    }
  }
}

export function passageToClozeConfig(props: PassageProps) {
  syncPassageSlots(props);
  const slots = props.slots || [];
  const hasShared = slots.some((slot) => slot.binding === 'shared_pool');
  const poolSize = props.pool?.size || Math.max(slots.length + 3, 8);

  return {
    passage: passageDisplayText(props),
    blankType: (() => {
      if (hasShared) return 'shared_options';
      if (slots[0]) return bindingToBlankType(slots[0].binding);
      return 'choice';
    })(),
    blankTypeMode: 'per_blank',
    blankCount: slots.length || 1,
    blanks: slots.map((slot) => ({
      marker: slot.marker,
      type: bindingToBlankType(slot.binding),
      answer: slot.answer,
      options:
        slot.binding === 'local_choice'
          ? shellOptions(
              slot.optionCount || props.defaultOptionCount || 4,
              slot.options,
            )
          : undefined,
    })),
    options: (() => {
      if (!hasShared) return [];
      if (props.pool?.items?.length) return props.pool.items;
      return Array.from({ length: poolSize }, (_, index) => ({
        key: String.fromCodePoint(65 + (index % 26)),
        text: '',
      }));
    })(),
    reuse: props.pool?.reuse || 'once',
    allowDistractors: true,
    scoreStrategy: 'partial',
    poolSize,
  };
}

export function fillPassageDemo(props: PassageProps): PassageProps {
  // eslint-disable-next-line unicorn/prefer-structured-clone
  const cloned = JSON.parse(JSON.stringify(props)) as PassageProps;
  syncPassageSlots(cloned);
  const slots = cloned.slots || [];
  const markers = slots.map((slot) => `[[${slot.marker}]]`).join(' …… ');
  cloned.text = `（示例文章）挖空示意：${markers}。`;

  for (const slot of slots) {
    if (slot.binding === 'local_choice') {
      const n = slot.optionCount || cloned.defaultOptionCount || 4;
      slot.options = Array.from({ length: n }, (_, index) => ({
        key: String.fromCodePoint(65 + index),
        text: `选项${String.fromCodePoint(65 + index)}`,
      }));
    }
  }

  if (cloned.pool) {
    const size = Math.max(cloned.pool.size, slots.length + 3);
    cloned.pool.size = size;
    cloned.pool.items = Array.from({ length: size }, (_, index) => ({
      key: String.fromCodePoint(65 + (index % 26)),
      text: `词${index + 1}`,
    }));
  }

  return cloned;
}
