import type {
  AssessmentItemRevision,
  ItemRevisionStatus,
} from '../domain/types';

import { computed, reactive } from 'vue';

import {
  appendSchoolAudit,
  persistSchoolState,
  schoolAssessmentState,
} from './state';

export type ItemFacetQuery = {
  cognitiveLevels: string[];
  courseIds: string[];
  difficulty: number[];
  interactionIds: string[];
  keyword: string;
  majorIds: string[];
  status: ItemRevisionStatus[];
  taxonomyNodeIds: string[];
};

export const itemFacetQuery = reactive<ItemFacetQuery>({
  cognitiveLevels: [],
  courseIds: [],
  difficulty: [],
  interactionIds: [],
  keyword: '',
  majorIds: [],
  status: [],
  taxonomyNodeIds: [],
});

export const savedViews = reactive([
  {
    count: 4,
    id: 'view-shared-foundation',
    name: '跨专业共享基础题',
  },
  {
    count: 3,
    id: 'view-review',
    name: '待我审核',
  },
  {
    count: 2,
    id: 'view-high-exposure',
    name: '已发布可组卷',
  },
]);

export const latestItemRevisions = computed(() => {
  const latest = new Map<string, AssessmentItemRevision>();
  schoolAssessmentState.itemRevisions.forEach((item) => {
    const current = latest.get(item.familyId);
    if (!current || current.revision < item.revision) {
      latest.set(item.familyId, item);
    }
  });
  return [...latest.values()];
});

function includesAny(values: string[], selected: string[]) {
  return (
    selected.length === 0 || selected.some((entry) => values.includes(entry))
  );
}

function includesTaxonomyNode(
  itemNodeIds: string[],
  selectedNodeIds: string[],
) {
  if (selectedNodeIds.length === 0) return true;
  return selectedNodeIds.some((selectedNodeId) =>
    itemNodeIds.some((itemNodeId) => {
      let current = schoolAssessmentState.taxonomyNodes.find(
        (node) => node.id === itemNodeId,
      );
      while (current) {
        if (current.id === selectedNodeId) return true;
        current = current.parentId
          ? schoolAssessmentState.taxonomyNodes.find(
              (node) => node.id === current?.parentId,
            )
          : undefined;
      }
      return false;
    }),
  );
}

export const filteredItemRevisions = computed(() => {
  const query = itemFacetQuery.keyword.trim().toLocaleLowerCase();
  return latestItemRevisions.value.filter((item) => {
    const ownership = item.metadata.ownership;
    const applicability = item.metadata.applicability;
    const searchable = [
      item.title,
      item.id,
      item.classification.freeTags.join(' '),
      schoolAssessmentState.courses.find(
        (course) => course.id === ownership.primaryCourseId,
      )?.name ?? '',
    ]
      .join(' ')
      .toLocaleLowerCase();
    return (
      (!query || searchable.includes(query)) &&
      includesAny(
        [ownership.primaryCourseId, ...applicability.reusableCourseIds],
        itemFacetQuery.courseIds,
      ) &&
      includesAny(applicability.majorIds, itemFacetQuery.majorIds) &&
      includesTaxonomyNode(
        item.classification.taxonomyNodeIds,
        itemFacetQuery.taxonomyNodeIds,
      ) &&
      (itemFacetQuery.interactionIds.length === 0 ||
        itemFacetQuery.interactionIds.includes(item.interaction.pluginId)) &&
      (itemFacetQuery.difficulty.length === 0 ||
        itemFacetQuery.difficulty.includes(item.metadata.difficulty)) &&
      (itemFacetQuery.cognitiveLevels.length === 0 ||
        itemFacetQuery.cognitiveLevels.includes(
          item.classification.cognitiveLevel,
        )) &&
      (itemFacetQuery.status.length === 0 ||
        itemFacetQuery.status.includes(item.status))
    );
  });
});

export const taxonomyUsage = computed(() =>
  schoolAssessmentState.taxonomyNodes.map((node) => ({
    ...node,
    itemCount: latestItemRevisions.value.filter((item) =>
      item.classification.taxonomyNodeIds.includes(node.id),
    ).length,
    schemeName:
      schoolAssessmentState.taxonomySchemes.find(
        (scheme) => scheme.id === node.schemeId,
      )?.name ?? '',
  })),
);

export function courseName(id: string) {
  return schoolAssessmentState.courses.find((course) => course.id === id)?.name;
}

export function majorName(id: string) {
  return schoolAssessmentState.majors.find((major) => major.id === id)?.name;
}

export function taxonomyName(id: string) {
  return schoolAssessmentState.taxonomyNodes.find((node) => node.id === id)
    ?.name;
}

export function resetItemFacets() {
  Object.assign(itemFacetQuery, {
    cognitiveLevels: [],
    courseIds: [],
    difficulty: [],
    interactionIds: [],
    keyword: '',
    majorIds: [],
    status: [],
    taxonomyNodeIds: [],
  });
}

export function applySavedView(viewId: string) {
  resetItemFacets();
  switch (viewId) {
    case 'view-high-exposure': {
      itemFacetQuery.status = ['published'];

      break;
    }
    case 'view-review': {
      itemFacetQuery.status = ['review'];

      break;
    }
    case 'view-shared-foundation': {
      itemFacetQuery.courseIds = ['course-calculus'];
      itemFacetQuery.majorIds = ['major-mechanical', 'major-electrical'];

      break;
    }
    // No default
  }
}

export function addItemClassifications(
  itemIds: string[],
  taxonomyNodeIds: string[],
  actorId = 'teacher-demo',
) {
  schoolAssessmentState.itemRevisions
    .filter((item) => itemIds.includes(item.id))
    .forEach((item) => {
      item.classification.taxonomyNodeIds = [
        ...new Set([
          ...item.classification.taxonomyNodeIds,
          ...taxonomyNodeIds,
        ]),
      ];
      appendSchoolAudit({
        action: 'item.classification.updated',
        actorId,
        metadata: { taxonomyNodeIds },
        resourceId: item.id,
        resourceType: 'item-revision',
      });
    });
  persistSchoolState();
}
