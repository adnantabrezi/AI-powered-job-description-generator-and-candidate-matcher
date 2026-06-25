import OpenAI from 'openai';
import { ENV } from '../config/env';
import {
  AIProvider,
  JDGenerationInput,
  GeneratedJobDescription,
  InterviewQuestion,
  SalaryAnalysis,
  CandidateSummary,
  LinkedInProfileData,
} from './ai.provider';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });
  }

  private async chatJSON<T>(system: string, user: string): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  }

  async extractSkills(text: string): Promise<string[]> {
    const result = await this.chatJSON<{ skills: string[] }>(
      'Extract technical skills from resume text. Return JSON: {"skills":["React","TypeScript"]}',
      text.slice(0, 6000),
    );
    return Array.isArray(result.skills) ? result.skills : [];
  }

  async matchCandidateToJob(
    candidateText: string,
    jobText: string,
  ): Promise<{ score: number; reason: string }> {
    return this.chatJSON<{ score: number; reason: string }>(
      'Analyze candidate-job fit. Return JSON: {"score":0-100,"reason":"explanation"}',
      `Resume:\n${candidateText.slice(0, 3000)}\n\nJob:\n${jobText.slice(0, 3000)}`,
    );
  }

  async rankApplicants(applicants: { id: string; resumeText: string; jobText: string }[]): Promise<
    { id: string; score: number; reason: string }[]
  > {
    const results = await Promise.all(
      applicants.map(async (applicant) => {
        const analysis = await this.matchCandidateToJob(applicant.resumeText, applicant.jobText);
        return { id: applicant.id, score: analysis.score, reason: analysis.reason };
      }),
    );
    return results.sort((a, b) => b.score - a.score);
  }

  async semanticSearch(query: string, jobTexts: { id: string; text: string }[]): Promise<
    { id: string; score: number }[]
  > {
    const queryEmbedding = await this.generateEmbedding(query);
    const jobEmbeddings = await Promise.all(
      jobTexts.map(async (job) => ({
        id: job.id,
        embedding: await this.generateEmbedding(job.text),
      })),
    );

    return jobEmbeddings
      .map((job) => ({
        id: job.id,
        score: cosineSimilarity(queryEmbedding, job.embedding),
      }))
      .sort((a, b) => b.score - a.score);
  }

  async summarizeResume(text: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Summarize this resume in 3 bullet points.' },
        { role: 'user', content: text.slice(0, 6000) },
      ],
    });
    return response.choices[0].message.content || 'Summary unavailable';
  }

  async scoreResume(text: string, jobText: string): Promise<number> {
    const result = await this.matchCandidateToJob(text, jobText);
    return result.score;
  }

  // ── New interface methods ──

  async generateJobDescription(input: JDGenerationInput): Promise<GeneratedJobDescription> {
    const prompt = `Generate a complete, professional job description based on this input:

TITLE: ${input.title}
RESPONSIBILITIES: ${input.responsibilities.join('; ')}
REQUIRED SKILLS: ${input.requiredSkills.join(', ')}
EMPLOYMENT TYPE: ${input.employmentType || 'Full-time'}
LOCATION: ${input.location || 'Not specified'}${input.remoteStatus ? ' (Remote)' : ''}
EXPERIENCE REQUIRED: ${input.requiredExperience ? `${input.requiredExperience}+ years` : 'Not specified'}
SALARY RANGE: ${input.salaryMin && input.salaryMax ? `$${input.salaryMin.toLocaleString()} - $${input.salaryMax.toLocaleString()}` : 'Competitive'}
COMPANY CULTURE: ${input.companyCulture || 'Not specified'}

Return JSON with this exact structure:
{
  "description": "Full formatted job description in markdown with sections: About the Role, Key Responsibilities, What You'll Do Day-to-Day, Qualifications, Nice to Have, Benefits & Perks, and About Our Culture. Make it compelling and modern.",
  "technicalSkills": ["skill1", "skill2"],
  "softSkills": ["skill1", "skill2"],
  "benefits": ["benefit1", "benefit2"],
  "requirements": ["requirement1", "requirement2"]
}

CRITICAL: In the "description" markdown field, do NOT output raw JSON strings, JSON code blocks, or serialized objects. Use only standard markdown text, bullet points, and headers.
All skill arrays (technicalSkills, softSkills, benefits, requirements) MUST be arrays of simple strings, NOT objects. E.g. use ["React"] and NOT [{"name": "React"}].`;

    const result = await this.chatJSON<any>(
      'You are an expert HR content writer who creates compelling, modern job descriptions that attract top talent. Write in a professional yet approachable tone.',
      prompt,
    );

    return normalizeGeneratedJD(result);
  }

  async generateInterviewQuestions(jobText: string, role: string): Promise<InterviewQuestion[]> {
    const result = await this.chatJSON<{ questions: InterviewQuestion[] }>(
      'Generate interview questions. Return JSON: {"questions":[{"category":"TECHNICAL"|"BEHAVIORAL"|"CULTURE_FIT","question":"...","guideline":"..."}]}',
      `Role: ${role}\nJob:\n${jobText.slice(0, 4000)}`,
    );
    return Array.isArray(result.questions) ? result.questions : [];
  }

  async analyzeSalary(
    title: string, location: string, skills: string[],
    experienceYears?: number, salaryMin?: number, salaryMax?: number,
  ): Promise<SalaryAnalysis> {
    const result = await this.chatJSON<any>(
      'Analyze market salary. Return JSON: {"estimatedMin":number,"estimatedMedian":number,"estimatedMax":number,"inputComparison":"BELOW_MARKET"|"AT_MARKET"|"ABOVE_MARKET","confidence":"HIGH"|"MEDIUM"|"LOW","factors":[],"summary":"..."}',
      `Title: ${title}\nLocation: ${location}\nSkills: ${skills.join(', ')}\nExperience: ${experienceYears ?? 'N/A'} years\n${salaryMin || salaryMax ? `Proposed: $${salaryMin}-$${salaryMax}` : ''}`,
    );
    return normalizeSalaryAnalysis(result);
  }

  async generateCandidateSummary(
    resumeText: string, jobText: string, matchedSkills: string[], missingSkills: string[],
  ): Promise<CandidateSummary> {
    return this.chatJSON<CandidateSummary>(
      'Analyze candidate fit. Return JSON: {"whyThisCandidate":"...","strengthHighlights":[],"concerns":[],"confidenceScore":0.0-1.0}',
      `Resume:\n${resumeText.slice(0, 3000)}\nJob:\n${jobText.slice(0, 2000)}\nMatched: ${matchedSkills.join(', ')}\nMissing: ${missingSkills.join(', ')}`,
    );
  }

  async extractLinkedInProfile(text: string): Promise<LinkedInProfileData> {
    const result = await this.chatJSON<LinkedInProfileData>(
      'Extract LinkedIn profile data. Return JSON: {"fullName":null,"headline":null,"summary":null,"skills":[],"experience":[],"education":[],"certifications":[]}',
      text.slice(0, 8000),
    );
    return {
      fullName: result.fullName || undefined,
      headline: result.headline || undefined,
      summary: result.summary || undefined,
      skills: Array.isArray(result.skills) ? result.skills : [],
      experience: Array.isArray(result.experience) ? result.experience : [],
      education: Array.isArray(result.education) ? result.education : [],
      certifications: Array.isArray(result.certifications) ? result.certifications : [],
    };
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function normalizeStringArray(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const val = Object.values(item).find(v => typeof v === 'string');
      if (typeof val === 'string') return val;
      return item.name || item.skill || item.title || item.benefit || item.languageOrFramework || JSON.stringify(item);
    }
    return String(item);
  }).filter(Boolean);
}

function normalizeGeneratedJD(jd: any): GeneratedJobDescription {
  if (!jd) {
    return {
      description: '',
      technicalSkills: [],
      softSkills: [],
      benefits: [],
      requirements: [],
    };
  }
  return {
    description: typeof jd.description === 'string' ? jd.description : '',
    technicalSkills: normalizeStringArray(jd.technicalSkills),
    softSkills: normalizeStringArray(jd.softSkills),
    benefits: normalizeStringArray(jd.benefits),
    requirements: normalizeStringArray(jd.requirements),
  };
}

function normalizeSalaryAnalysis(res: any): SalaryAnalysis {
  if (!res) {
    return {
      estimatedMin: 0,
      estimatedMedian: 0,
      estimatedMax: 0,
      inputComparison: 'AT_MARKET',
      confidence: 'MEDIUM',
      factors: [],
      summary: '',
    };
  }
  const factors = Array.isArray(res.factors) ? res.factors.map((f: any) => {
    if (typeof f === 'string') return f;
    if (f && typeof f === 'object') {
      if (f.skill) {
        const range = f.expectedMinSalary || f.expectedMaxSalary 
          ? ` ($${f.expectedMinSalary?.toLocaleString() ?? '?'}-$${f.expectedMaxSalary?.toLocaleString() ?? '?'})` 
          : '';
        return `${f.skill}${range}`;
      }
      return Object.values(f).find(v => typeof v === 'string') || JSON.stringify(f);
    }
    return String(f);
  }) : [];

  return {
    estimatedMin: typeof res.estimatedMin === 'number' ? res.estimatedMin : Number(res.estimatedMin) || 0,
    estimatedMedian: typeof res.estimatedMedian === 'number' ? res.estimatedMedian : Number(res.estimatedMedian) || 0,
    estimatedMax: typeof res.estimatedMax === 'number' ? res.estimatedMax : Number(res.estimatedMax) || 0,
    inputComparison: res.inputComparison || 'AT_MARKET',
    confidence: res.confidence || 'MEDIUM',
    factors,
    summary: typeof res.summary === 'string' ? res.summary : '',
  };
}
