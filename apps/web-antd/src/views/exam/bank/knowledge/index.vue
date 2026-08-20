<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tree,
} from 'ant-design-vue';

import {
  addKnowledge,
  bankStore,
  knowledgeTreeData,
  listCourseOptions,
  removeKnowledge,
  updateKnowledge,
} from '../store';

defineOptions({ name: 'BankKnowledge' });

const courseId = ref(bankStore.courses[0]?.id || '');
const selectedId = ref<string>('all');
const form = reactive({ name: '', parentId: null as null | string });
const renameName = ref('');

const treeData = computed(() => knowledgeTreeData(courseId.value));
const parentOptions = computed(() =>
  bankStore.knowledge
    .filter((item) => item.courseId === courseId.value)
    .map((item) => ({ label: item.name, value: item.id })),
);

const selectedNode = computed(() =>
  bankStore.knowledge.find((item) => item.id === selectedId.value),
);

function onSelect(keys: (number | string)[]) {
  selectedId.value = String(keys[0] || 'all');
  renameName.value = selectedNode.value?.name || '';
}

function onAdd() {
  if (!form.name.trim()) {
    message.warning('请填写知识点名称');
    return;
  }
  addKnowledge({
    courseId: courseId.value,
    name: form.name.trim(),
    parentId: form.parentId,
  });
  form.name = '';
  message.success('已新增知识点');
}

function onRename() {
  if (!selectedNode.value || !renameName.value.trim()) {
    message.warning('请先选中节点并填写新名称');
    return;
  }
  updateKnowledge(selectedId.value, renameName.value.trim());
  message.success('已更新');
}

function onDelete() {
  if (!selectedNode.value) {
    message.warning('请先选中知识点');
    return;
  }
  Modal.confirm({
    title: '删除该节点及子节点？',
    content: '题目上的挂载关系会一并摘掉，题目本身保留。',
    onOk() {
      removeKnowledge(selectedId.value);
      selectedId.value = 'all';
      message.success('已删除');
    },
  });
}
</script>

<template>
  <Page>
    <div class="know-page">
      <Card class="know-side" title="课程知识树" :bordered="false">
        <Select
          v-model:value="courseId"
          class="mb-3 w-full"
          :options="listCourseOptions()"
          @change="selectedId = 'all'"
        />
        <Tree
          :selected-keys="[selectedId]"
          :tree-data="treeData"
          :default-expand-all="true"
          :field-names="{ title: 'title', key: 'key', children: 'children' }"
          @select="onSelect"
        />
      </Card>
      <Card class="know-main" title="维护知识点" :bordered="false">
        <p class="hint">
          树只负责浏览。一道题可以挂多个知识点，不要把分类做成唯一文件夹。
        </p>
        <Form layout="vertical" class="mt-4 max-w-xl">
          <Form.Item label="新节点名称">
            <Input v-model:value="form.name" placeholder="例如：递归出口" />
          </Form.Item>
          <Form.Item label="挂在哪个父节点下">
            <Select
              :value="form.parentId || undefined"
              allow-clear
              placeholder="不选则为章级节点"
              :options="parentOptions"
              @update:value="form.parentId = $event ? String($event) : null"
            />
          </Form.Item>
          <Form.Item label="当前节点新名称">
            <Input
              v-model:value="renameName"
              placeholder="选中左侧节点后修改"
            />
          </Form.Item>
          <Space>
            <Button type="primary" @click="onAdd">新增节点</Button>
            <Button :disabled="selectedId === 'all'" @click="onRename">
              重命名当前
            </Button>
            <Button danger :disabled="selectedId === 'all'" @click="onDelete">
              删除当前
            </Button>
          </Space>
        </Form>
        <div v-if="selectedNode" class="mt-6 text-sm opacity-70">
          当前：{{ selectedNode.name }} ·
          题目改挂点后，组卷蓝图按树抽题会跟着走。
        </div>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.know-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.know-side {
  flex-shrink: 0;
  width: 320px;
}

.know-main {
  flex: 1;
  min-width: 0;
}

.hint {
  margin: 0;
  color: hsl(var(--foreground) / 65%);
}
</style>
