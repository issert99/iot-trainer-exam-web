<script lang="ts" setup>
import { computed, reactive } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Form, message, Radio, Select } from 'ant-design-vue';

import { buildQtiPackage } from '../adapters/qti';
import {
  createPrintPublicationPackage,
  openPrintArtifact,
} from '../renderers/print';
import {
  bankStore,
  getPaper,
  LAYER_LABEL,
  listCourseOptions,
  listQuestions,
} from '../store';

defineOptions({ name: 'BankExport' });

const form = reactive({
  courseId: bankStore.courses[0]?.id || '',
  layer: '' as '' | 'course' | 'draft' | 'official',
  target: 'bank' as 'bank' | 'paper',
  paperId: bankStore.lastPaperId,
  format: 'word' as 'excel' | 'json' | 'pdf' | 'qti' | 'word',
});

const paperOptions = computed(() =>
  bankStore.papers.map((item) => ({
    label: item.name,
    value: item.id,
  })),
);

function exportNow() {
  let text: string;
  let name: string;
  let mimeType = 'text/plain;charset=utf-8';
  if (form.target === 'paper') {
    const paper = getPaper(form.paperId);
    if (!paper) {
      message.warning('还没有已组试卷');
      return;
    }
    if (form.format === 'pdf') {
      const courseName =
        bankStore.courses.find((item) => item.id === paper.courseId)?.name ??
        '未命名课程';
      const opened = openPrintArtifact(paper, courseName, 'question');
      message[opened ? 'success' : 'warning'](
        opened
          ? '已打开分页校样，请选择打印或另存为 PDF'
          : '浏览器拦截了打印窗口',
      );
      return;
    } else if (form.format === 'qti') {
      const qti = buildQtiPackage(paper);
      name = `${paper.name}-QTI-${qti.profile.replace(' ', '-')}.xml`;
      text =
        qti.files.find((item) => item.name === 'assessment-test.xml')?.text ??
        '';
      mimeType = 'application/xml;charset=utf-8';
    } else {
      const courseName =
        bankStore.courses.find((item) => item.id === paper.courseId)?.name ??
        '未命名课程';
      const publication = createPrintPublicationPackage(paper, courseName);
      name = `${paper.name}-冻结出版包.json`;
      text = JSON.stringify(
        {
          paper,
          publication: {
            ...publication,
            artifacts: publication.artifacts.map(
              ({ checksum, fileName, kind }) => ({
                checksum,
                fileName,
                kind,
              }),
            ),
          },
        },
        null,
        2,
      );
      mimeType = 'application/json;charset=utf-8';
    }
  } else {
    const list = listQuestions({
      courseId: form.courseId,
      layer: form.layer,
    });
    name = `题库导出-${list.length}题.${form.format === 'excel' ? 'csv' : 'json'}`;
    text =
      form.format === 'excel'
        ? [
            '标题,原语,渠道,状态',
            ...list.map(
              (q) => `${q.title},${q.primitive},${q.channel},${q.status}`,
            ),
          ].join('\n')
        : JSON.stringify(list, null, 2);
  }
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  message.success('已生成可追溯导出文件');
}
</script>

<template>
  <Page>
    <Card title="导出中心">
      <Form layout="vertical" class="max-w-xl">
        <Form.Item label="导出对象">
          <Radio.Group v-model:value="form.target">
            <Radio.Button value="bank">按题库筛选</Radio.Button>
            <Radio.Button value="paper">按已组试卷（冻结快照）</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <template v-if="form.target === 'bank'">
          <Form.Item label="课程">
            <Select
              v-model:value="form.courseId"
              :options="listCourseOptions()"
            />
          </Form.Item>
          <Form.Item label="所在库">
            <Select
              v-model:value="form.layer"
              allow-clear
              placeholder="全部"
              :options="
                Object.entries(LAYER_LABEL).map(([value, label]) => ({
                  label,
                  value,
                }))
              "
            />
          </Form.Item>
          <Form.Item label="格式">
            <Radio.Group v-model:value="form.format">
              <Radio.Button value="word">Word 清单</Radio.Button>
              <Radio.Button value="excel">Excel</Radio.Button>
              <Radio.Button value="json">JSON+媒体包</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </template>
        <template v-else>
          <Form.Item label="试卷">
            <Select v-model:value="form.paperId" :options="paperOptions" />
          </Form.Item>
          <Form.Item label="格式">
            <Radio.Group v-model:value="form.format">
              <Radio.Button value="json">考试快照 ZIP</Radio.Button>
              <Radio.Button value="pdf">分页 PDF</Radio.Button>
              <Radio.Button value="qti">QTI 3 XML</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </template>
        <Button type="primary" @click="exportNow">导出</Button>
      </Form>
      <p class="mt-4 text-sm opacity-60">
        正式考试必须导出快照，不能活引用题库。老师改题不会改到已开考的卷。
      </p>
    </Card>
  </Page>
</template>
