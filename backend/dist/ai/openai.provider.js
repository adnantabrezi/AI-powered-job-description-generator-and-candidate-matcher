"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../config/env");
class OpenAIProvider {
    client;
    constructor() {
        this.client = new openai_1.default({ apiKey: env_1.ENV.OPENAI_API_KEY });
    }
    async generateEmbedding(text) {
        const response = await this.client.embeddings.create({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000),
        });
        return response.data[0].embedding;
    }
    async extractSkills(text) {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Extract technical skills from resume text. Return JSON: {"skills":["React","TypeScript"]}',
                },
                { role: 'user', content: text.slice(0, 6000) },
            ],
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0].message.content || '{"skills":[]}';
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.skills) ? parsed.skills : [];
    }
    async matchCandidateToJob(candidateText, jobText) {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Analyze candidate-job fit. Return JSON: {"score":0-100,"reason":"explanation"}',
                },
                {
                    role: 'user',
                    content: `Resume:\n${candidateText.slice(0, 3000)}\n\nJob:\n${jobText.slice(0, 3000)}`,
                },
            ],
            response_format: { type: 'json_object' },
        });
        return JSON.parse(response.choices[0].message.content || '{"score":0,"reason":"Unavailable"}');
    }
    async rankApplicants(applicants) {
        const results = await Promise.all(applicants.map(async (applicant) => {
            const analysis = await this.matchCandidateToJob(applicant.resumeText, applicant.jobText);
            return { id: applicant.id, score: analysis.score, reason: analysis.reason };
        }));
        return results.sort((a, b) => b.score - a.score);
    }
    async semanticSearch(query, jobTexts) {
        const queryEmbedding = await this.generateEmbedding(query);
        const jobEmbeddings = await Promise.all(jobTexts.map(async (job) => ({
            id: job.id,
            embedding: await this.generateEmbedding(job.text),
        })));
        return jobEmbeddings
            .map((job) => ({
            id: job.id,
            score: cosineSimilarity(queryEmbedding, job.embedding),
        }))
            .sort((a, b) => b.score - a.score);
    }
    async summarizeResume(text) {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Summarize this resume in 3 bullet points.',
                },
                { role: 'user', content: text.slice(0, 6000) },
            ],
        });
        return response.choices[0].message.content || 'Summary unavailable';
    }
    async scoreResume(text, jobText) {
        const result = await this.matchCandidateToJob(text, jobText);
        return result.score;
    }
}
exports.OpenAIProvider = OpenAIProvider;
function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (magA * magB);
}
