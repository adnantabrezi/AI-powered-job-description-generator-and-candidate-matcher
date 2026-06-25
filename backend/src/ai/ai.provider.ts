import { ENV } from '../config/env';
import { OllamaProvider } from './ollama.provider';
import { OpenAIProvider } from './openai.provider';
import { ClaudeProvider } from './claude.provider';

// ── Types for new AI capabilities ──

export interface JDGenerationInput {
  title: string;
  responsibilities: string[];
  requiredSkills: string[];
  salaryMin?: number;
  salaryMax?: number;
  companyCulture?: string;
  employmentType?: string;
  location?: string;
  remoteStatus?: boolean;
  requiredExperience?: number;
}

export interface GeneratedJobDescription {
  description: string;
  technicalSkills: string[];
  softSkills: string[];
  benefits: string[];
  requirements: string[];
}

export interface InterviewQuestion {
  category: 'TECHNICAL' | 'BEHAVIORAL' | 'CULTURE_FIT';
  question: string;
  guideline: string;
}

export interface SalaryAnalysis {
  estimatedMin: number;
  estimatedMedian: number;
  estimatedMax: number;
  inputComparison: 'BELOW_MARKET' | 'AT_MARKET' | 'ABOVE_MARKET';
  confidence: string;
  factors: string[];
  summary: string;
}

export interface CandidateSummary {
  whyThisCandidate: string;
  strengthHighlights: string[];
  concerns: string[];
  confidenceScore: number;
}

export interface LinkedInProfileData {
  fullName?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  experience: { title: string; company: string; duration: string; description?: string }[];
  education: { institution: string; degree: string; field?: string; year?: string }[];
  certifications: string[];
}

// ── Core AI Provider Interface ──

export interface AIProvider {
  // Existing capabilities
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

  // New capabilities (Phase 2-4)
  generateJobDescription(input: JDGenerationInput): Promise<GeneratedJobDescription>;
  generateInterviewQuestions(jobText: string, role: string): Promise<InterviewQuestion[]>;
  analyzeSalary(
    title: string,
    location: string,
    skills: string[],
    experienceYears?: number,
    salaryMin?: number,
    salaryMax?: number,
  ): Promise<SalaryAnalysis>;
  generateCandidateSummary(
    resumeText: string,
    jobText: string,
    matchedSkills: string[],
    missingSkills: string[],
  ): Promise<CandidateSummary>;
  extractLinkedInProfile(text: string): Promise<LinkedInProfileData>;
}

// ── Factory ──

export class AIProviderFactory {
  static getProvider(): AIProvider {
    switch (ENV.AI_PROVIDER) {
      case 'claude':
        return new ClaudeProvider();
      case 'openai':
        return new OpenAIProvider();
      case 'ollama':
        return new OllamaProvider();
      default:
        throw new Error(`Unsupported AI provider: ${ENV.AI_PROVIDER}`);
    }
  }
}

export const aiProvider = AIProviderFactory.getProvider();
