import type {
  DeliveryChannel,
  ResponseEnvelope,
  ScoreEvidence,
} from '../contracts';
import type { BankQuestion, Primitive, QuestionContent } from '../types';

export type InteractionResponseKind =
  | 'attachment'
  | 'choice'
  | 'composite'
  | 'number-unit'
  | 'structured'
  | 'text';

export type PluginScoringMode = 'automatic' | 'external' | 'human' | 'hybrid';

export type InteractionPluginManifest = {
  accessibility: {
    keyboard: boolean;
    requiresAlternative?: boolean;
    screenReader: boolean;
  };
  channels: Record<
    DeliveryChannel,
    {
      mode: 'equivalent' | 'examiner-recorded' | 'native' | 'unsupported';
      renderer: string;
    }
  >;
  description: string;
  id: Primitive;
  qtiInteraction?: string;
  responseKind: InteractionResponseKind;
  sandbox?: 'isolated-container' | 'none' | 'signed-iframe';
  scoring: PluginScoringMode;
  title: string;
  version: string;
};

export type PluginValidationResult = {
  errors: string[];
  warnings: string[];
};

export type PluginScoreResult = {
  awardedScore: number;
  evidence: ScoreEvidence[];
  requiresHumanReview: boolean;
};

export type InteractionPlugin = {
  createDefaultContent: () => QuestionContent;
  createInitialResponse: (question: BankQuestion) => ResponseEnvelope;
  manifest: InteractionPluginManifest;
  score: (
    question: BankQuestion,
    response: ResponseEnvelope | undefined,
    maxScore: number,
  ) => PluginScoreResult;
  validate: (question: BankQuestion) => PluginValidationResult;
};
