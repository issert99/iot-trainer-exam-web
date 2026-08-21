import type { Component } from 'vue';

import type {
  AssessmentItemRevision,
  ChannelMode,
  DeliveryChannel,
  JsonObject,
  JsonValue,
  ResponseEnvelope,
} from '../domain/types';

export type AuthoringField = {
  description?: string;
  key: string;
  label: string;
  options?: string[];
  required: boolean;
  type: 'boolean' | 'number' | 'options' | 'string' | 'strings';
};

export type SchemaProperty = {
  default?: JsonValue;
  description?: string;
  enum?: JsonValue[];
  format?: string;
  items?: SchemaProperty;
  maximum?: number;
  minimum?: number;
  title: string;
  type: 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string';
};

export type PluginManifest = {
  accessibility: {
    keyboard: boolean;
    screenReader: boolean;
    supportsAlternativeContent: boolean;
  };
  authoringFields: AuthoringField[];
  channels: Partial<
    Record<
      DeliveryChannel,
      {
        mode: ChannelMode;
        renderer: string;
      }
    >
  >;
  configSchema: {
    properties: Record<string, SchemaProperty>;
    required: string[];
    type: 'object';
  };
  description: string;
  examples: Array<{
    config: JsonObject;
    name: string;
    response: JsonValue;
  }>;
  id: string;
  migrations: string[];
  qtiInteraction?: string;
  responseSchema: {
    description: string;
    type: string;
  };
  sandbox: 'isolated-container' | 'isolated-service' | 'none' | 'signed-iframe';
  scoring: 'automatic' | 'external' | 'human' | 'hybrid';
  testCases: Array<{
    expectedScore: number;
    name: string;
    response: JsonValue;
  }>;
  title: string;
  uiSchema: JsonObject;
  version: string;
};

export type PluginScoreResult = {
  awardedScore: number;
  evidence: string[];
  requiresHumanReview: boolean;
};

export type PluginValidation = {
  errors: string[];
  warnings: string[];
};

export type InteractionPlugin = {
  authoringComponent?: Component;
  createDefaultConfig: () => JsonObject;
  createInitialValue: (item: AssessmentItemRevision) => JsonValue;
  manifest: PluginManifest;
  onlineComponent: Component;
  renderPrint: (
    item: AssessmentItemRevision,
    options: {
      answerMode: 'answer-key' | 'answer-sheet' | 'question';
      index: number;
      score: number;
    },
  ) => string;
  score: (
    item: AssessmentItemRevision,
    response: ResponseEnvelope | undefined,
    maxScore: number,
  ) => PluginScoreResult;
  toQti: (item: AssessmentItemRevision) => string;
  validate: (item: AssessmentItemRevision) => PluginValidation;
};
