import { ENV } from '../config/env';
import { LMStudioProvider } from './lmstudio.provider';
import { OpenAIProvider } from './openai.provider';

export interface AIProvider {
  generateEmbedding(text: string): Promise<number[]>;
  extractSkills(text: string): Promise<string[]>;
  matchCandidateToJob(
    candidateText: string,
    jobText: string,
  ): Promise<{ score: number; reason: string }>;
  rankApplicants(
    applicants: { id: string; resumeText: string; jobText: string }[],
  ): Promise<{ id: string; score: number; reason: string }[]>;
  semanticSearch(
    query: string,
    jobTexts: { id: string; text: string }[],
  ): Promise<{ id: string; score: number }[]>;
  summarizeResume(text: string): Promise<string>;
  scoreResume(text: string, jobText: string): Promise<number>;
}

export class AIProviderFactory {
  static getProvider(): AIProvider {
    switch (ENV.AI_PROVIDER) {
      case 'openai':
        return new OpenAIProvider();
      case 'lm-studio':
        return new LMStudioProvider();
      default:
        throw new Error(`Unsupported AI provider: ${ENV.AI_PROVIDER}`);
    }
  }
}

export const aiProvider = AIProviderFactory.getProvider();
