<script lang="ts" setup>
import type { JsonObject, JsonValue } from '../domain/types';
import type {
  AuthoringField,
  PluginManifest,
  SchemaProperty,
} from '../plugins/types';

import { computed, reactive, watch } from 'vue';

import {
  Alert,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
} from 'ant-design-vue';

type RenderField = AuthoringField & {
  schema?: SchemaProperty;
};

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    manifest: PluginManifest;
    modelValue: JsonObject;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: JsonObject];
}>();

const jsonDrafts = reactive<Record<string, string>>({});
const jsonErrors = reactive<Record<string, string>>({});

function inferredField(key: string, schema: SchemaProperty): AuthoringField {
  let type: AuthoringField['type'] = 'string';
  if (schema.type === 'array') {
    type = 'strings';
  } else if (schema.enum) {
    type = 'options';
  } else if (schema.type === 'integer' || schema.type === 'number') {
    type = 'number';
  } else if (schema.type === 'boolean') {
    type = 'boolean';
  }
  return {
    description: schema.description,
    key,
    label: schema.title || key,
    options: schema.enum?.map(String),
    required: props.manifest.configSchema.required.includes(key),
    type,
  };
}

const fields = computed<RenderField[]>(() => {
  const declared = props.manifest.authoringFields.map((field) => ({
    ...field,
    schema: props.manifest.configSchema.properties[field.key],
  }));
  const declaredKeys = new Set(declared.map((field) => field.key));
  const inferred = Object.entries(props.manifest.configSchema.properties)
    .filter(([key]) => !declaredKeys.has(key))
    .map(([key, schema]) => ({
      ...inferredField(key, schema),
      schema,
    }));
  return [...declared, ...inferred];
});

function updateField(key: string, value: JsonValue) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  });
}

function updateText(key: string, value: unknown) {
  updateField(key, String(value ?? ''));
}

function updateNumber(key: string, value: unknown) {
  const number = Number(value ?? 0);
  updateField(key, Number.isFinite(number) ? number : 0);
}

function updateBoolean(key: string, value: unknown) {
  updateField(key, value === true);
}

function updateTags(key: string, value: unknown) {
  updateField(key, Array.isArray(value) ? value.map(String) : []);
}

function updateOption(key: string, value: unknown) {
  updateField(key, String(value ?? ''));
}

function optionValues(field: RenderField) {
  return (field.options ?? field.schema?.enum?.map(String) ?? []).map(
    (value) => ({ label: value, value }),
  );
}

function arrayValue(field: RenderField) {
  const value = props.modelValue[field.key];
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry) =>
        typeof entry === 'string' ||
        typeof entry === 'number' ||
        typeof entry === 'boolean',
    )
    .map(String);
}

function usesJsonEditor(field: RenderField) {
  const value = props.modelValue[field.key];
  return (
    field.schema?.type === 'object' ||
    (field.type === 'options' &&
      !field.options?.length &&
      Array.isArray(value) &&
      value.some((entry) => typeof entry === 'object' && entry !== null))
  );
}

function syncJsonDrafts() {
  fields.value.forEach((field) => {
    if (!usesJsonEditor(field)) return;
    jsonDrafts[field.key] = JSON.stringify(
      props.modelValue[field.key] ?? [],
      null,
      2,
    );
  });
}

function commitJson(field: RenderField) {
  try {
    const parsed = JSON.parse(jsonDrafts[field.key] ?? 'null') as JsonValue;
    jsonErrors[field.key] = '';
    updateField(field.key, parsed);
  } catch {
    jsonErrors[field.key] = 'JSON 格式无效，请检查括号、引号和逗号。';
  }
}

watch(() => [props.manifest.id, props.modelValue], syncJsonDrafts, {
  deep: true,
  immediate: true,
});
</script>

<template>
  <div class="authoring-host">
    <Alert
      v-if="fields.length === 0"
      type="info"
      show-icon
      message="此插件没有可配置的命题字段"
    />
    <Form v-else layout="vertical">
      <Form.Item
        v-for="field in fields"
        :key="field.key"
        :required="field.required"
      >
        <template #label>
          <span class="field-label">
            {{ field.label }}
            <Tag v-if="field.required" color="blue">必填</Tag>
          </span>
        </template>

        <Switch
          v-if="field.type === 'boolean'"
          :checked="props.modelValue[field.key] === true"
          :disabled="disabled"
          checked-children="开启"
          un-checked-children="关闭"
          @update:checked="updateBoolean(field.key, $event)"
        />

        <InputNumber
          v-else-if="field.type === 'number'"
          :value="
            typeof props.modelValue[field.key] === 'number'
              ? Number(props.modelValue[field.key])
              : Number(field.schema?.default ?? 0)
          "
          :disabled="disabled"
          :min="field.schema?.minimum"
          :max="field.schema?.maximum"
          class="w-full"
          @update:value="updateNumber(field.key, $event)"
        />

        <Input.TextArea
          v-else-if="usesJsonEditor(field)"
          v-model:value="jsonDrafts[field.key]"
          :disabled="disabled"
          :rows="7"
          class="json-editor"
          @blur="commitJson(field)"
        />

        <Select
          v-else-if="field.type === 'strings'"
          mode="tags"
          :value="arrayValue(field)"
          :disabled="disabled"
          :options="optionValues(field)"
          placeholder="输入后按回车添加"
          @update:value="updateTags(field.key, $event)"
        />

        <Select
          v-else-if="field.type === 'options' && optionValues(field).length > 0"
          :value="String(props.modelValue[field.key] ?? '')"
          :disabled="disabled"
          :options="optionValues(field)"
          placeholder="请选择"
          @update:value="updateOption(field.key, $event)"
        />

        <Select
          v-else-if="field.type === 'options'"
          mode="tags"
          :value="arrayValue(field)"
          :disabled="disabled"
          placeholder="输入选项后按回车添加"
          @update:value="updateTags(field.key, $event)"
        />

        <Input.TextArea
          v-else-if="
            field.schema?.format === 'textarea' ||
            field.key.toLocaleLowerCase().includes('instructions') ||
            field.key.toLocaleLowerCase().includes('surrogate')
          "
          :value="String(props.modelValue[field.key] ?? '')"
          :disabled="disabled"
          :rows="4"
          @update:value="updateText(field.key, $event)"
        />

        <Input
          v-else
          :value="String(props.modelValue[field.key] ?? '')"
          :disabled="disabled"
          @update:value="updateText(field.key, $event)"
        />

        <p v-if="jsonErrors[field.key]" class="field-error">
          {{ jsonErrors[field.key] }}
        </p>
        <p
          v-else-if="field.description || field.schema?.description"
          class="field-help"
        >
          {{ field.description || field.schema?.description }}
        </p>
        <p v-else class="field-key">
          config.{{ field.key }} · {{ field.schema?.type || field.type }}
        </p>
      </Form.Item>
    </Form>
  </div>
</template>

<style scoped>
.authoring-host {
  min-width: 0;
}

.field-label {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  font-weight: 600;
}

.field-label :deep(.ant-tag) {
  margin-inline-end: 0;
  font-size: 10px;
  line-height: 18px;
}

.field-help,
.field-key,
.field-error {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
}

.field-help,
.field-key {
  color: hsl(var(--foreground) / 48%);
}

.field-error {
  color: #ef4444;
}

.json-editor {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

:deep(.ant-form-item) {
  margin-bottom: 18px;
}
</style>
