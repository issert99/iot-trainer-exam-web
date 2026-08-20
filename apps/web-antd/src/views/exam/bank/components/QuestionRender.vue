<script lang="ts" setup>
import type { BankQuestion } from '../types';

import { PRIMITIVE_LABEL } from '../store';

defineProps<{
  index?: number;
  mode: 'cbt' | 'paper' | 'sheet';
  question: BankQuestion;
  score?: number;
}>();
</script>

<template>
  <section class="q-block" :class="`is-${mode}`">
    <header class="q-head">
      <span v-if="index" class="q-no">{{ index }}.</span>
      <span class="q-stem">{{ question.stem }}</span>
      <span v-if="score" class="q-score">（{{ score }}分）</span>
    </header>

    <p v-if="question.content.material" class="q-material">
      {{ question.content.material }}
    </p>
    <p v-if="question.content.mediaLabel" class="q-media">
      {{
        mode === 'cbt'
          ? `媒体：${question.content.mediaLabel}`
          : `考务播放 / 附件：${question.content.mediaLabel}`
      }}
    </p>

    <ul v-if="question.content.options?.length" class="q-options">
      <li v-for="opt in question.content.options" :key="opt.key">
        <span class="bubble">{{ opt.key }}</span>
        {{ opt.text }}
      </li>
    </ul>

    <p
      v-if="question.primitive === 'blank' && question.content.answers"
      class="q-blank"
    >
      空位 {{ question.content.answers.length }} 个
    </p>

    <div v-if="question.primitive === 'numeric'" class="q-numeric">
      <span>数值：</span>
      <span class="numeric-line"></span>
      <span>单位：</span>
      <span class="unit-line"></span>
      <small v-if="mode === 'cbt'">
        支持单位：{{
          (question.content.allowedUnits || []).join(' / ') || '无'
        }}
      </small>
    </div>

    <div v-if="question.primitive === 'text'" class="q-lines">
      <div v-for="n in mode === 'paper' ? 5 : 1" :key="n" class="line"></div>
    </div>

    <div v-if="question.primitive === 'code'" class="q-code">
      <template v-if="mode === 'cbt'">
        代码编辑器 · {{ question.content.codeLang || 'C' }} · 可自测
      </template>
      <template v-else>
        本大题建议机房作答；纸笔仅保留题面与草稿区。
        <div class="draft"></div>
      </template>
    </div>

    <div v-if="question.primitive === 'drawing'" class="q-draw">
      {{ mode === 'paper' ? '作图区' : '画板（纸笔题在机考中提示转稿纸）' }}
    </div>

    <div v-if="question.primitive === 'media'" class="q-record">
      {{ mode === 'cbt' ? '点击录音 90 秒' : '本题仅机考，纸笔卷不出现' }}
    </div>

    <div v-if="question.primitive === 'file'" class="q-file">
      <template v-if="mode === 'cbt'">
        上传作品 ·
        {{ (question.content.allowedFileTypes || ['任意文件']).join('、') }} ·
        最大 {{ question.content.maxFileSizeMb || 20 }} MB
      </template>
      <template v-else>
        电子作品编号：____________ · 考务签字：____________
      </template>
    </div>

    <div v-if="question.primitive === 'rubric'" class="q-rubric">
      量规：{{ (question.content.rubric || []).join(' · ') }}
    </div>

    <div v-if="question.content.children?.length" class="q-children">
      <article
        v-for="(child, idx) in question.content.children"
        :key="child.id"
        class="q-child"
      >
        <p>({{ idx + 1 }}) {{ child.stem }}</p>
        <ul v-if="child.content.options?.length" class="q-options">
          <li v-for="opt in child.content.options" :key="opt.key">
            <span class="bubble">{{ opt.key }}</span>
            {{ opt.text }}
          </li>
        </ul>
      </article>
    </div>

    <footer v-if="mode === 'cbt'" class="q-meta">
      {{ PRIMITIVE_LABEL[question.primitive] }} · {{ question.typeName }}
    </footer>
  </section>
</template>

<style scoped>
.q-block {
  margin-bottom: 18px;
}

.q-head {
  line-height: 1.65;
}

.q-no {
  margin-right: 4px;
  font-weight: 600;
}

.q-score {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.q-material,
.q-media {
  padding: 8px 10px;
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.6;
  background: hsl(var(--accent));
  border-radius: 6px;
}

.q-options {
  padding: 0;
  margin: 8px 0 0;
  list-style: none;
}

.q-options li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 6px 0;
}

.bubble {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  border: 1px solid hsl(var(--border));
  border-radius: 50%;
}

.q-blank,
.q-meta,
.q-code,
.q-file,
.q-numeric,
.q-record,
.q-rubric {
  margin-top: 8px;
  font-size: 12px;
  color: hsl(var(--foreground) / 60%);
}

.q-numeric {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.numeric-line,
.unit-line {
  display: inline-block;
  min-width: 120px;
  border-bottom: 1px solid hsl(var(--border));
}

.unit-line {
  min-width: 72px;
}

.line,
.draft,
.q-draw {
  min-height: 22px;
  margin-top: 8px;
  border-bottom: 1px solid hsl(var(--border));
}

.draft,
.q-draw {
  min-height: 72px;
  border: 1px dashed hsl(var(--border));
  border-radius: 4px;
}

.q-child {
  padding-left: 8px;
  margin-top: 10px;
  border-left: 2px solid hsl(var(--border));
}

.is-cbt .bubble {
  border-radius: 4px;
}
</style>
