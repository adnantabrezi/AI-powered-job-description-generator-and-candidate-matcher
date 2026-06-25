import Anthropic from '@anthropic-ai/sdk';
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

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: ENV.CLAUDE_API_KEY });
    this.model = ENV.CLAUDE_MODEL;
  }

  // ── Helper ──

  private async chatJSON<T>(system: string, user: string): Promise<T> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseJSON<T>(text);
  }

  private async chatText(system: string, user: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    });

    return response.content[0].type === 'text'
      ? response.content[0].text
      : '';
  }

  private parseJSON<T>(text: string): T {
    let cleaned = text.trim();
    // Strip markdown code fences
    if (cleaned.startsWith('```')) {
      const firstNewline = cleaned.indexOf('\n');
      if (firstNewline !== -1) cleaned = cleaned.slice(firstNewline).trim();
      if (cleaned.endsWith('```'))
        cleaned = cleaned.slice(0, cleaned.length - 3).trim();
    }
    // Find JSON boundaries
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    // Try array
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      try {
        return JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
      } catch {
        /* fall through */
      }
    }
    return JSON.parse(cleaned);
  }

  // ── Existing AIProvider methods ──

  async generateEmbedding(text: string): Promise<number[]> {
    // Claude doesn't have a native embedding API.
    // Generate a simple bag-of-words vector as a fallback.
    // For production, pair with OpenAI embeddings.
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const vocab = [...new Set(words)].slice(0, 512);
    const vector = vocab.map(
      (word) => words.filter((w) => w === word).length / words.length,
    );
    // Pad to fixed dimension
    while (vector.length < 128) vector.push(0);
    return vector.slice(0, 512);
  }

  async extractSkills(text: string): Promise<string[]> {
    const result = await this.chatJSON<{ skills: string[] }>(
      'You are a skill extraction expert. Extract all technical and professional skills from the given text. Return JSON: {"skills":["skill1","skill2",...]}. Include programming languages, frameworks, tools, soft skills, and domain expertise. Be comprehensive.',
      text.slice(0, 8000),
    );
    return Array.isArray(result.skills) ? result.skills : [];
  }

  async matchCandidateToJob(
    candidateText: string,
    jobText: string,
  ): Promise<{ score: number; reason: string }> {
    return this.chatJSON<{ score: number; reason: string }>(
      'You are an expert recruiter and talent evaluator. Analyze the candidate-job fit comprehensively. Consider skills match, experience relevance, career trajectory, and potential. Return JSON: {"score":0-100,"reason":"detailed explanation of fit"}.',
      `CANDIDATE RESUME:\n${candidateText.slice(0, 4000)}\n\nJOB DESCRIPTION:\n${jobText.slice(0, 4000)}`,
    );
  }

  async rankApplicants(
    applicants: { id: string; resumeText: string; jobText: string }[],
  ): Promise<{ id: string; score: number; reason: string }[]> {
    const results = await Promise.all(
      applicants.map(async (applicant) => {
        const analysis = await this.matchCandidateToJob(
          applicant.resumeText,
          applicant.jobText,
        );
        return { id: applicant.id, score: analysis.score, reason: analysis.reason };
      }),
    );
    return results.sort((a, b) => b.score - a.score);
  }

  async semanticSearch(
    query: string,
    jobTexts: { id: string; text: string }[],
  ): Promise<{ id: string; score: number }[]> {
    if (jobTexts.length === 0) return [];

    // For small sets, use Claude to rank relevance directly
    if (jobTexts.length <= 20) {
      const jobSummaries = jobTexts
        .map((j, i) => `[${i}] ${j.text.slice(0, 200)}`)
        .join('\n');

      const result = await this.chatJSON<{
        rankings: { index: number; score: number }[];
      }>(
        'You are a job search engine. Rank the jobs by relevance to the search query. Return JSON: {"rankings":[{"index":0,"score":0.95},{"index":1,"score":0.3},...]}. Score from 0 to 1.',
        `SEARCH QUERY: ${query}\n\nJOBS:\n${jobSummaries}`,
      );

      return (result.rankings || [])
        .map((r) => ({
          id: jobTexts[r.index]?.id || '',
          score: r.score,
        }))
        .filter((r) => r.id)
        .sort((a, b) => b.score - a.score);
    }

    // For larger sets, use embedding-based search
    const queryEmb = await this.generateEmbedding(query);
    return jobTexts
      .map((job) => ({
        id: job.id,
        score: cosineSimilarity(queryEmb, this.quickEmbed(job.text)),
      }))
      .sort((a, b) => b.score - a.score);
  }

  private quickEmbed(text: string): number[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const vector = new Array(128).fill(0);
    for (const word of words) {
      const hash = simpleHash(word) % 128;
      vector[hash] += 1;
    }
    const mag = Math.sqrt(vector.reduce((s: number, v: number) => s + v * v, 0));
    return mag > 0 ? vector.map((v: number) => v / mag) : vector;
  }

  async summarizeResume(text: string): Promise<string> {
    return this.chatText(
      'You are a professional resume reviewer. Provide a concise 3-5 bullet point summary highlighting key strengths, experience, and notable skills. Use markdown bullet points.',
      text.slice(0, 8000),
    );
  }

  async scoreResume(text: string, jobText: string): Promise<number> {
    const result = await this.matchCandidateToJob(text, jobText);
    return result.score;
  }

  // ── New methods: JD Generation ──

  async generateJobDescription(
    input: JDGenerationInput,
  ): Promise<GeneratedJobDescription> {
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

Make the description engaging, specific, and free of generic jargon. Include concrete details about the role. Generate 6-10 technical skills, 4-6 soft skills, 6-8 benefits (tailored to the culture), and 5-8 requirements.`;

    const result = await this.chatJSON<any>(
      'You are an expert HR content writer who creates compelling, modern job descriptions that attract top talent. Write in a professional yet approachable tone.',
      prompt,
    );

    return normalizeGeneratedJD(result);
  }

  // ── New methods: Interview Questions ──

  async generateInterviewQuestions(
    jobText: string,
    role: string,
  ): Promise<InterviewQuestion[]> {
    const result = await this.chatJSON<{ questions: InterviewQuestion[] }>(
      'You are a senior hiring manager and interview design expert. Generate targeted, insightful interview questions that truly assess candidate fit for the role. Avoid generic questions.',
      `Generate interview questions for this role:

ROLE: ${role}

JOB DESCRIPTION:
${jobText.slice(0, 4000)}

Return JSON: {"questions":[{"category":"TECHNICAL"|"BEHAVIORAL"|"CULTURE_FIT","question":"the question","guideline":"what a good answer looks like and how to evaluate the response"}]}

Generate exactly:
- 5 TECHNICAL questions (specific to the role's tech stack and domain)
- 3 BEHAVIORAL questions (using STAR format prompts)
- 2 CULTURE_FIT questions (aligned with the job's work environment)`,
    );

    return Array.isArray(result.questions) ? result.questions : [];
  }

  // ── New methods: Salary Analysis ──

  async analyzeSalary(
    title: string,
    location: string,
    skills: string[],
    experienceYears?: number,
    salaryMin?: number,
    salaryMax?: number,
  ): Promise<SalaryAnalysis> {
    const prompt = `Analyze the market salary for this position:

TITLE: ${title}
LOCATION: ${location}
KEY SKILLS: ${skills.join(', ')}
EXPERIENCE LEVEL: ${experienceYears ? `${experienceYears} years` : 'Not specified'}
${salaryMin || salaryMax ? `PROPOSED RANGE: $${salaryMin?.toLocaleString() || '?'} - $${salaryMax?.toLocaleString() || '?'}` : ''}

Return JSON:
{
  "estimatedMin": number (annual USD),
  "estimatedMedian": number (annual USD),
  "estimatedMax": number (annual USD),
  "inputComparison": "BELOW_MARKET" | "AT_MARKET" | "ABOVE_MARKET",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "factors": ["factor affecting salary 1", "factor 2", ...],
  "summary": "2-3 sentence analysis of the salary positioning"
}

Base your estimates on current US tech market data. Consider location cost-of-living adjustments, skill demand, and experience premium.`;

    const result = await this.chatJSON<any>(
      'You are a compensation analyst with deep knowledge of tech industry salaries across different markets, roles, and experience levels. Provide data-driven estimates.',
      prompt,
    );

    return normalizeSalaryAnalysis(result);
  }

  // ── New methods: Candidate Summary ──

  async generateCandidateSummary(
    resumeText: string,
    jobText: string,
    matchedSkills: string[],
    missingSkills: string[],
  ): Promise<CandidateSummary> {
    const prompt = `Analyze this candidate's fit for the role and generate a compelling summary.

RESUME:
${resumeText.slice(0, 4000)}

JOB DESCRIPTION:
${jobText.slice(0, 3000)}

MATCHED SKILLS: ${matchedSkills.join(', ') || 'None identified'}
MISSING SKILLS: ${missingSkills.join(', ') || 'None'}

Return JSON:
{
  "whyThisCandidate": "A compelling 2-3 paragraph summary explaining why this candidate is a strong fit (or not). Reference specific experience, projects, and skills from their resume. Be honest about gaps too.",
  "strengthHighlights": ["specific strength 1", "strength 2", "strength 3"],
  "concerns": ["potential concern 1", "concern 2"],
  "confidenceScore": 0.0-1.0
}`;

    return this.chatJSON<CandidateSummary>(
      'You are a senior talent acquisition specialist. Provide honest, balanced, and specific candidate evaluations. Focus on concrete evidence from their resume rather than generic praise.',
      prompt,
    );
  }

  // ── New methods: LinkedIn Profile Parsing ──

  async extractLinkedInProfile(text: string): Promise<LinkedInProfileData> {
    const result = await this.chatJSON<LinkedInProfileData>(
      'You are a data extraction specialist. Parse the LinkedIn profile text and extract structured information. Be thorough and accurate. If information is not present, use empty arrays/null.',
      `Extract structured data from this LinkedIn profile:

${text.slice(0, 8000)}

Return JSON:
{
  "fullName": "string or null",
  "headline": "string or null",
  "summary": "string or null",
  "skills": ["skill1", "skill2"],
  "experience": [{"title":"Job Title","company":"Company Name","duration":"Jan 2020 - Present","description":"brief description"}],
  "education": [{"institution":"University Name","degree":"Degree Type","field":"Field of Study","year":"2020"}],
  "certifications": ["cert1", "cert2"]
}`,
    );

    return {
      fullName: result.fullName || undefined,
      headline: result.headline || undefined,
      summary: result.summary || undefined,
      skills: Array.isArray(result.skills) ? result.skills : [],
      experience: Array.isArray(result.experience) ? result.experience : [],
      education: Array.isArray(result.education) ? result.education : [],
      certifications: Array.isArray(result.certifications)
        ? result.certifications
        : [],
    };
  }
}

// ── Utilities ──

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < len; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    magA += (a[i] ?? 0) * (a[i] ?? 0);
    magB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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
