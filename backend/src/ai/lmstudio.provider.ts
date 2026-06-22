import OpenAI from 'openai';
import { ENV } from '../config/env';
import { AIProvider } from './ai.provider';

export class LMStudioProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: ENV.AI_BASE_URL,
      apiKey: ENV.AI_API_KEY,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: ENV.AI_EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }, {
      timeout: 3000,
    });
    return response.data[0].embedding;
  }

  async extractSkills(text: string): Promise<string[]> {
    const response = await this.client.chat.completions.create({
      model: ENV.AI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Extract technical skills. Return JSON: {"skills":["React","TypeScript"]}',
        },
        { role: 'user', content: text.slice(0, 6000) },
      ],
    }, {
      timeout: 10000,
    });

    const content = response.choices[0].message.content || '{"skills":[]}';
    try {
      const parsed = cleanAndParseJSON(content);
      return Array.isArray(parsed.skills) ? parsed.skills : [];
    } catch (e) {
      console.error('Failed to parse skills JSON:', content);
      return [];
    }
  }

  async matchCandidateToJob(
    candidateText: string,
    jobText: string,
  ): Promise<{ score: number; reason: string }> {
    const response = await this.client.chat.completions.create({
      model: ENV.AI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Analyze candidate-job fit. Return JSON: {"score":0-100,"reason":"explanation"}',
        },
        {
          role: 'user',
          content: `Resume:\n${candidateText.slice(0, 3000)}\n\nJob:\n${jobText.slice(0, 3000)}`,
        },
      ],
    }, {
      timeout: 10000,
    });

    const content = response.choices[0].message.content || '{"score":0,"reason":"Unavailable"}';
    try {
      return cleanAndParseJSON(content);
    } catch (e) {
      console.error('Failed to parse match result JSON:', content);
      return { score: 0, reason: 'Failed to parse AI output' };
    }
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
      model: ENV.AI_MODEL,
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
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function cleanAndParseJSON(text: string): any {
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline).trim();
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, cleaned.length - 3).trim();
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // If standard parsing fails, try a manual regex/substring recovery for unescaped inner quotes
    try {
      const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

      const reasonKeyIndex = cleaned.search(/"reason"\s*:\s*"/);
      if (reasonKeyIndex !== -1) {
        // Find opening quote of reason
        const valueStartIndex = cleaned.indexOf('"', reasonKeyIndex + 8) + 1;
        const lastBraceIndex = cleaned.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
          const valueEndIndex = cleaned.lastIndexOf('"', lastBraceIndex - 1);
          if (valueEndIndex > valueStartIndex) {
            const reason = cleaned.slice(valueStartIndex, valueEndIndex);
            return { score, reason };
          }
        }
      }
    } catch (innerError) {
      // Fall through
    }

    // Fallback: search for first '{' and last '}'
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (innerError) {
        // Fall through
      }
    }
    throw e;
  }
}
