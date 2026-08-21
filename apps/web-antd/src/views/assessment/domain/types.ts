export type JsonPrimitive = boolean | null | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type SchoolProfile = {
  academicYear: string;
  code: string;
  id: string;
  name: string;
  semester: string;
};

export type OrganizationType =
  | 'college'
  | 'department'
  | 'school'
  | 'teaching-unit';

export type OrganizationNode = {
  code: string;
  id: string;
  name: string;
  parentId: null | string;
  type: OrganizationType;
};

export type Discipline = {
  code: string;
  id: string;
  level: 'category' | 'discipline' | 'field';
  name: string;
  parentId: null | string;
};

export type Major = {
  code: string;
  collegeId: string;
  degreeLevel: 'associate' | 'bachelor' | 'doctoral' | 'master';
  disciplineId: string;
  id: string;
  name: string;
};

export type Course = {
  applicableMajorIds: string[];
  code: string;
  credit: number;
  id: string;
  name: string;
  ownerOrgId: string;
  sharedAcrossMajors: boolean;
};

export type CurriculumPlan = {
  courseIds: string[];
  id: string;
  majorId: string;
  name: string;
  version: string;
};

export type CourseOffering = {
  classNames: string[];
  courseId: string;
  id: string;
  semester: string;
  teacherIds: string[];
};

export type TaxonomyStructure = 'facet' | 'graph' | 'tree';
export type TaxonomyScope =
  | 'ability'
  | 'application'
  | 'certification'
  | 'graduate-outcome'
  | 'knowledge'
  | 'topic';

export type TaxonomyScheme = {
  code: string;
  description: string;
  id: string;
  name: string;
  ownerOrgId?: string;
  scope: TaxonomyScope;
  status: 'active' | 'draft' | 'retired';
  structure: TaxonomyStructure;
  version: number;
};

export type TaxonomyNode = {
  aliases: string[];
  code: string;
  courseIds: string[];
  description: string;
  id: string;
  name: string;
  parentId: null | string;
  schemeId: string;
};

export type TaxonomyEdge = {
  fromId: string;
  id: string;
  relation: 'contains' | 'prerequisite' | 'supports';
  schemeId: string;
  toId: string;
};

export type ItemOwnership = {
  authorIds: string[];
  maintainerTeam: string;
  ownerOrgId: string;
  primaryCourseId: string;
  visibility: 'restricted' | 'school' | 'team';
};

export type ItemApplicability = {
  curriculumPlanIds: string[];
  disciplineIds: string[];
  educationLevels: string[];
  gradeBands: string[];
  majorIds: string[];
  reusableCourseIds: string[];
};

export type ItemClassification = {
  cognitiveLevel:
    | 'analyze'
    | 'apply'
    | 'create'
    | 'evaluate'
    | 'remember'
    | 'understand';
  freeTags: string[];
  taxonomyNodeIds: string[];
};

export type ItemQuality = {
  discrimination?: number;
  exposureCount: number;
  lastUsedAt?: string;
  pValue?: number;
  sampleSize: number;
  usageCount: number;
};

export type ItemMetadata = {
  applicability: ItemApplicability;
  confidentiality: 'confidential' | 'internal' | 'public' | 'secret';
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedSeconds: number;
  ownership: ItemOwnership;
  quality: ItemQuality;
  source: string;
};

export type ContentBlock = {
  accessibility?: {
    alternativeText?: string;
    language?: string;
    transcript?: string;
  };
  data: JsonObject;
  id: string;
  type:
    | 'callout'
    | 'code'
    | 'formula'
    | 'image'
    | 'media'
    | 'paragraph'
    | 'resource'
    | 'table';
};

export type ContentDocument = {
  blocks: ContentBlock[];
  schemaVersion: '1.0';
};

export type DeliveryChannel = 'online' | 'practical' | 'print';
export type ChannelMode =
  | 'equivalent'
  | 'examiner-recorded'
  | 'native'
  | 'unsupported';

export type ChannelVariant = {
  channel: DeliveryChannel;
  contentOverride?: ContentDocument;
  mode: ChannelMode;
  note?: string;
};

export type InteractionBinding = {
  config: JsonObject;
  kind: 'plugin' | 'template';
  pluginId: string;
  pluginVersion: string;
  templateRevisionId?: string;
};

export type ScoringPolicy = {
  config: JsonObject;
  mode: 'automatic' | 'external' | 'human' | 'hybrid';
  policyVersion: string;
};

export type ItemRevisionStatus =
  | 'approved'
  | 'draft'
  | 'published'
  | 'rejected'
  | 'retired'
  | 'review'
  | 'suspended';

export type AssessmentItemRevision = {
  channelVariants: ChannelVariant[];
  checksum: string;
  classification: ItemClassification;
  createdAt: string;
  createdBy: string;
  familyId: string;
  id: string;
  interaction: InteractionBinding;
  language: string;
  maxScore: number;
  metadata: ItemMetadata;
  reviewComment?: string;
  revision: number;
  scoring: ScoringPolicy;
  status: ItemRevisionStatus;
  stem: ContentDocument;
  title: string;
};

export type PrimitiveControlType =
  | 'audio'
  | 'drawing'
  | 'file'
  | 'formula'
  | 'hotspot'
  | 'matrix'
  | 'multi-choice'
  | 'number'
  | 'rating'
  | 'select'
  | 'single-choice'
  | 'table'
  | 'text'
  | 'textarea'
  | 'video';

export type InteractionControl = {
  config: JsonObject;
  id: string;
  label: string;
  required: boolean;
  scoreWeight: number;
  type: PrimitiveControlType;
  width: 1 | 2 | 3 | 4;
};

export type InteractionScoreRule = {
  config: JsonObject;
  controlId: string;
  id: string;
  type: 'exact' | 'human' | 'range' | 'regex' | 'rubric' | 'set-match';
  weight: number;
};

export type InteractionTemplateRevision = {
  accessibilityNotes: string;
  checksum: string;
  controls: InteractionControl[];
  createdAt: string;
  createdBy: string;
  description: string;
  familyId: string;
  id: string;
  name: string;
  paperFallback: {
    answerLines: number;
    mode: ChannelMode;
    note: string;
  };
  revision: number;
  scoreRules: InteractionScoreRule[];
  status: 'draft' | 'enabled' | 'retired' | 'testing';
};

export type PluginStatus =
  | 'deprecated'
  | 'disabled'
  | 'draft'
  | 'enabled'
  | 'testing';

export type PluginPackage = {
  capabilities: {
    accessibility: boolean;
    authoring: boolean;
    automaticScoring: boolean;
    online: boolean;
    practical: boolean;
    print: boolean;
  };
  description: string;
  id: string;
  name: string;
  packageKind: 'built-in' | 'school-developed' | 'vendor';
  sampleItemId?: string;
  sandbox: 'isolated-service' | 'none' | 'signed-iframe';
  status: PluginStatus;
  testSummary: {
    failed: number;
    lastRunAt: string;
    passed: number;
  };
  version: string;
};

export type BlueprintRule = {
  applicabilityMajorIds: string[];
  channels: DeliveryChannel[];
  count: number;
  difficultyRange: [number, number];
  interactionIds: string[];
  scorePerItem: number;
  taxonomyNodeIds: string[];
};

export type BlueprintSection = {
  id: string;
  name: string;
  rules: BlueprintRule[];
};

export type AssessmentBlueprint = {
  applicableMajorIds: string[];
  channels: DeliveryChannel[];
  courseIds: string[];
  createdAt: string;
  durationMinutes: number;
  id: string;
  name: string;
  sections: BlueprintSection[];
  status: 'draft' | 'published' | 'retired';
  totalScore: number;
};

export type OnlineProfile = {
  allowBacktrack: boolean;
  calculator: boolean;
  id: string;
  name: string;
  navigation: 'linear' | 'one-per-page' | 'scroll';
};

export type PrintProfile = {
  answerArea: 'boxed' | 'lines' | 'separate-booklet';
  bindingEdgeMillimeters: number;
  columns: 1 | 2;
  duplex: boolean;
  fontSizePoints: number;
  id: string;
  name: string;
  pageSize: 'A3' | 'A4' | 'Letter';
};

export type CompatibilityIssue = {
  blocking: boolean;
  channel: DeliveryChannel;
  code: string;
  itemRevisionId: string;
  message: string;
};

export type TestFormItem = {
  itemRevision: AssessmentItemRevision;
  score: number;
};

export type TestFormSection = {
  id: string;
  items: TestFormItem[];
  name: string;
};

export type TestFormRevision = {
  blueprintId: string;
  channels: DeliveryChannel[];
  checksum: string;
  compatibility: CompatibilityIssue[];
  createdAt: string;
  createdBy: string;
  durationMinutes: number;
  id: string;
  name: string;
  onlineProfile: OnlineProfile;
  printProfile: PrintProfile;
  revision: number;
  sections: TestFormSection[];
  status: 'archived' | 'draft' | 'proofing' | 'sealed' | 'under-approval';
  totalScore: number;
  variant: string;
};

export type AssuranceLevel = 'course' | 'high-stakes' | 'standard';
export type ExamDeliveryMode = 'online' | 'paper' | 'practical';
export type ExamEventStatus =
  | 'cancelled'
  | 'closed'
  | 'draft'
  | 'in-progress'
  | 'published'
  | 'ready'
  | 'result-pending'
  | 'scheduled'
  | 'scoring';

export type ExamEvent = {
  approvalActorIds: string[];
  assuranceLevel: AssuranceLevel;
  candidateIds: string[];
  createdAt: string;
  createdBy: string;
  deliveryMode: ExamDeliveryMode;
  endAt: string;
  id: string;
  name: string;
  settings: {
    allowResume: boolean;
    extraTimePercent: number;
    randomizeItems: boolean;
    requireFullscreen: boolean;
  };
  startAt: string;
  status: ExamEventStatus;
  testFormRevisionId: string;
};

export type PaperBatch = {
  bookletCount: number;
  collectedCount: number;
  eventId: string;
  handedOverAt?: string;
  id: string;
  printedCount: number;
  status: 'collected' | 'distributed' | 'printing' | 'ready' | 'scanning';
};

export type ScanJob = {
  batchId: string;
  errorCount: number;
  id: string;
  pageCount: number;
  reviewedCount: number;
  status: 'completed' | 'recognizing' | 'reviewing' | 'uploaded';
};

export type PracticalStation = {
  evidenceTypes: Array<'audio' | 'file' | 'image' | 'rubric' | 'video'>;
  examinerIds: string[];
  id: string;
  name: string;
  status: 'closed' | 'ready' | 'running';
};

export type ResponseEnvelope = {
  attachmentIds?: string[];
  pluginId: string;
  value: JsonValue;
};

export type AttemptStatus =
  | 'in-progress'
  | 'not-started'
  | 'published'
  | 'reviewed'
  | 'scored'
  | 'scoring'
  | 'submitted';

export type CandidateAttempt = {
  candidateId: string;
  eventId: string;
  id: string;
  lastSavedAt?: string;
  responses: Record<string, ResponseEnvelope>;
  responseSequence: number;
  startedAt?: string;
  status: AttemptStatus;
  submittedAt?: string;
  testFormRevisionId: string;
};

export type ResponseEvent = {
  attemptId: string;
  clientTimestamp: string;
  id: string;
  idempotencyKey: string;
  itemRevisionId: string;
  payload: ResponseEnvelope;
  sequence: number;
  syncState: 'pending' | 'synced';
};

export type SubmissionSnapshot = {
  attemptId: string;
  checksum: string;
  createdAt: string;
  id: string;
  responses: Record<string, ResponseEnvelope>;
  responseSequence: number;
  testFormRevisionId: string;
};

export type ScoreStatus =
  | 'assigned'
  | 'automatic'
  | 'final'
  | 'first-marked'
  | 'manual-required'
  | 'moderation-required'
  | 'second-marked';

export type ScoreRecord = {
  algorithmVersion: string;
  attemptId: string;
  awardedScore: number;
  evidence: string[];
  firstScore?: number;
  id: string;
  itemRevisionId: string;
  maxScore: number;
  method: 'automatic' | 'human' | 'moderated';
  reviewedAt?: string;
  scorerId?: string;
  secondScore?: number;
  status: ScoreStatus;
  supersededByRecordId?: string;
  supersedesRecordId?: string;
};

export type ResultAppeal = {
  applicantId: string;
  attemptId: string;
  createdAt: string;
  id: string;
  reason: string;
  resolution?: string;
  status: 'accepted' | 'pending' | 'rejected' | 'resolved';
};

export type AuditRecord = {
  action: string;
  actorId: string;
  chainHash: string;
  id: string;
  metadata: JsonObject;
  occurredAt: string;
  outcome: 'denied' | 'failure' | 'success';
  previousHash: string;
  resourceId: string;
  resourceType: string;
};

export type SchoolAssessmentState = {
  activeItemId: string;
  appeals: ResultAppeal[];
  attempts: CandidateAttempt[];
  auditRecords: AuditRecord[];
  blueprints: AssessmentBlueprint[];
  connection: 'offline' | 'online';
  courses: Course[];
  curriculumPlans: CurriculumPlan[];
  disciplines: Discipline[];
  events: ExamEvent[];
  forms: TestFormRevision[];
  interactionTemplates: InteractionTemplateRevision[];
  itemRevisions: AssessmentItemRevision[];
  majors: Major[];
  organizationNodes: OrganizationNode[];
  paperBatches: PaperBatch[];
  pluginPackages: PluginPackage[];
  practicalStations: PracticalStation[];
  responseEvents: ResponseEvent[];
  scanJobs: ScanJob[];
  school: SchoolProfile;
  scoreRecords: ScoreRecord[];
  submissions: SubmissionSnapshot[];
  taxonomyEdges: TaxonomyEdge[];
  taxonomyNodes: TaxonomyNode[];
  taxonomySchemes: TaxonomyScheme[];
};
