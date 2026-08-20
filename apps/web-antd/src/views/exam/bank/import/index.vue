<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  message,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  bankStore,
  importMockQuestions,
  listCourseOptions,
  PRIMITIVE_LABEL,
} from '../store';

defineOptions({ name: 'BankImport' });

const route = useRoute();
const router = useRouter();
const current = ref(0);
const courseId = ref(
  String(route.query.courseId || bankStore.courses[0]?.id || ''),
);
const fileName = ref('');

const rows = reactive<
  Array<{
    error?: string;
    primitive: string;
    status: 'ok' | 'warn';
    stem: string;
    title: string;
    typeName: string;
  }>
>([]);

const mapped = computed(() =>
  rows.map((row) => ({
    ...row,
    mapped:
      PRIMITIVE_LABEL[row.primitive as keyof typeof PRIMITIVE_LABEL] ||
      '未识别',
  })),
);

function beforeUpload(file: File) {
  fileName.value = file.name;
  rows.splice(
    0,
    rows.length,

    {
      title: '循环结构选择',
      stem: '下列循环至少执行一次的是？',
      typeName: '单项选择',
      primitive: 'choice',
      status: 'ok' as const,
    },
    {
      title: '编译与解释',
      stem: '解释编译与解释的区别。',
      typeName: '简答',
      primitive: 'text',
      status: 'ok' as const,
    },
    {
      title: '未标记题型',
      stem: '请补充程序填空。',
      typeName: '未知',
      primitive: '',
      status: 'warn' as const,
      error: '题型名无法映射，请手工指定原语',
    },
  );
  current.value = 1;
  return false;
}

function goValidate() {
  current.value = 2;
}

function commit() {
  const created = importMockQuestions(courseId.value);
  current.value = 3;
  message.success(`已入库 ${created.length} 道（演示：跳过无法映射的题）`);
}
</script>

<template>
  <Page auto-content-height>
    <Card title="导入向导（本地演示，不接接口）">
      <div class="mb-4 flex items-center gap-3">
        <span>导入到课程</span>
        <Select
          v-model:value="courseId"
          style="width: 280px"
          :options="listCourseOptions()"
        />
      </div>
      <Steps
        :current="current"
        class="mb-6"
        :items="[
          { title: '上传' },
          { title: '映射题型' },
          { title: '校验预览' },
          { title: '完成' },
        ]"
      />

      <div v-if="current === 0">
        <p class="hint">
          第一期支持 Word 命题模板、Excel 选择题、ZIP（JSON+媒体）。扫描 PDF
          先不做。
        </p>
        <Upload
          :before-upload="beforeUpload"
          :max-count="1"
          accept=".docx,.xlsx,.zip"
        >
          <Button type="primary">选择文件</Button>
        </Upload>
        <p v-if="fileName" class="mt-2">已选：{{ fileName }}</p>
      </div>

      <div v-else-if="current === 1">
        <Table
          :data-source="mapped"
          :pagination="false"
          row-key="title"
          :columns="[
            { title: '标题', dataIndex: 'title' },
            { title: '原文题型', dataIndex: 'typeName' },
            { title: '映射原语', dataIndex: 'mapped' },
            { title: '状态', dataIndex: 'status' },
          ]"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              <Tag :color="record.status === 'ok' ? 'success' : 'warning'">
                {{ record.status === 'ok' ? '可入库' : record.error }}
              </Tag>
            </template>
          </template>
        </Table>
        <Button class="mt-4" type="primary" @click="goValidate">
          下一步校验
        </Button>
      </div>

      <div v-else-if="current === 2">
        <p>将写入课程共建库，状态为待审。无法映射的题不会入库。</p>
        <Space class="mt-4">
          <Button @click="current = 1">上一步</Button>
          <Button type="primary" @click="commit">确认入库</Button>
        </Space>
      </div>

      <div v-else>
        <p>导入完成。请到课程题库里审核后再推进正式库。</p>
        <Button
          class="mt-4"
          type="primary"
          @click="router.push('/question-bank/courses')"
        >
          去课程题库
        </Button>
      </div>
    </Card>
  </Page>
</template>

<style scoped>
.hint {
  margin-bottom: 16px;
  color: hsl(var(--foreground) / 65%);
}
</style>
