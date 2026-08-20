export type BankLayer = 'course' | 'draft' | 'official';
export type ChannelFit = 'both' | 'cbt' | 'paper';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type PaperVariant = 'A' | 'B';
export type Primitive =
  | 'annotate'
  | 'blank'
  | 'choice'
  | 'code'
  | 'drawing'
  | 'external'
  | 'file'
  | 'formula'
  | 'match'
  | 'media'
  | 'numeric'
  | 'passage'
  | 'rubric'
  | 'sequence'
  | 'text';
export type QuestionStatus = 'draft' | 'official' | 'retired' | 'review';

export type BankCourse = {
  code: string;
  college: string;
  id: string;
  major: string;
  name: string;
};

export type KnowledgeNode = {
  courseId: string;
  id: string;
  name: string;
  parentId: null | string;
};

export type ChoiceOption = { key: string; text: string };

export type QuestionContent = {
  allowedFileTypes?: string[];
  allowedUnits?: string[];
  answer?: string | string[];
  answers?: string[];
  blanks?: string[];
  children?: Array<{
    content: QuestionContent;
    id: string;
    primitive: Primitive;
    stem: string;
  }>;
  codeLang?: string;
  material?: string;
  maxFileSizeMb?: number;
  mediaLabel?: string;
  minWords?: number;
  multi?: boolean;
  numericAnswer?: number;
  options?: ChoiceOption[];
  pairs?: Array<{ left: string; right: string }>;
  reference?: string;
  rubric?: string[];
  tolerance?: number;
  unit?: string;
};

export type BankQuestion = {
  channel: ChannelFit;
  content: QuestionContent;
  courseId: string;
  difficulty: Difficulty;
  exposure: number;
  id: string;
  knowledgeIds: string[];
  layer: BankLayer;
  primitive: Primitive;
  score: number;
  source: string;
  status: QuestionStatus;
  stem: string;
  title: string;
  typeName: string;
  typePackVersion: string;
};

export type BlueprintRule = {
  count: number;
  difficulty?: Difficulty;
  id: string;
  knowledgeId?: string;
  primitive?: Primitive;
  score: number;
};

export type BlueprintSection = {
  id: string;
  name: string;
  rules: BlueprintRule[];
};

export type PaperBlueprint = {
  channel: ChannelFit;
  courseId: string;
  duration: number;
  id: string;
  layoutCbtId: string;
  layoutPaperId: string;
  layoutSheetId: string;
  name: string;
  sections: BlueprintSection[];
  totalScore: number;
};

export type PaperItem = {
  questionId: string;
  score: number;
  snapshot: BankQuestion;
};

export type PaperSection = {
  items: PaperItem[];
  name: string;
};

export type AssembledPaper = {
  blueprintId: string;
  channel: ChannelFit;
  courseId: string;
  duration: number;
  gaps: string[];
  id: string;
  layoutCbtId: string;
  layoutPaperId: string;
  layoutSheetId: string;
  name: string;
  sections: PaperSection[];
  totalScore: number;
  variant: PaperVariant;
};

export type LayoutKind = 'cbt' | 'paper' | 'sheet';

export type LayoutTemplate = {
  id: string;
  kind: LayoutKind;
  name: string;
  remark: string;
};

export type QuestionFilter = {
  channel?: '' | ChannelFit;
  courseId?: string;
  keyword?: string;
  knowledgeId?: string;
  layer?: '' | BankLayer;
  primitive?: '' | Primitive;
  status?: '' | QuestionStatus;
};
