<script lang="ts" setup>
import type { ContentDocument } from '../domain/types';

defineProps<{
  document: ContentDocument;
}>();
</script>

<template>
  <div class="content-document">
    <template v-for="block in document.blocks" :key="block.id">
      <p v-if="block.type === 'paragraph'" class="paragraph">
        {{ block.data.text }}
      </p>
      <pre v-else-if="block.type === 'code'" class="code">{{
        block.data.source
      }}</pre>
      <div v-else-if="block.type === 'formula'" class="formula">
        {{ block.data.source }}
      </div>
      <figure v-else-if="block.type === 'image'" class="image">
        <img
          :src="String(block.data.url || '')"
          :alt="block.accessibility?.alternativeText || '题目图片'"
        />
      </figure>
      <blockquote v-else-if="block.type === 'callout'" class="callout">
        {{ block.data.text }}
      </blockquote>
      <table v-else-if="block.type === 'table'" class="data-table">
        <tbody>
          <tr
            v-for="(row, rowIndex) in Array.isArray(block.data.rows)
              ? block.data.rows
              : []"
            :key="rowIndex"
          >
            <td
              v-for="(cell, cellIndex) in Array.isArray(row) ? row : []"
              :key="cellIndex"
            >
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="block.type === 'media'" class="media">
        <strong>{{ block.data.label || '媒体资源' }}</strong>
        <span>{{
          block.accessibility?.transcript || block.data.description
        }}</span>
      </div>
      <div v-else class="resource">
        {{ block.data.label || block.data.text || block.type }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.content-document {
  line-height: 1.75;
}

.paragraph {
  margin: 0;
  white-space: pre-wrap;
}

.code {
  padding: 10px;
  overflow: auto;
  background: hsl(var(--accent));
  border-radius: 6px;
}

.formula {
  padding: 8px;
  font-family: serif;
  text-align: center;
}

.image img {
  max-width: 100%;
}

.callout {
  padding: 12px 14px;
  margin: 10px 0;
  background: hsl(var(--accent) / 55%);
  border-left: 4px solid hsl(var(--primary));
}

.data-table {
  width: 100%;
  margin: 10px 0;
  border-collapse: collapse;
}

.data-table td {
  padding: 8px;
  border: 1px solid hsl(var(--border));
}

.media {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}

.media span {
  color: hsl(var(--foreground) / 58%);
}

.resource {
  padding: 8px;
  border: 1px solid hsl(var(--border));
}
</style>
