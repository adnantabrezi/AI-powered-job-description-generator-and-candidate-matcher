"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LMStudioProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../config/env");
class LMStudioProvider {
    client;
    constructor() {
        this.client = new openai_1.default({
            baseURL: env_1.ENV.AI_BASE_URL,
            apiKey: env_1.ENV.AI_API_KEY,
        });
    }
    async chatJSON(system, user) {
        const response = await this.client.chat.completions.create({
            model: env_1.ENV.AI_MODEL,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
        }, { timeout: 15000 });
        const content = response.choices[0].message.content || '{}';
        return cleanAndParseJSON(content);
    }
    async generateEmbedding(text) {
        const response = await this.client.embeddings.create({
            model: env_1.ENV.AI_EMBEDDING_MODEL,
            input: text.slice(0, 8000),
        }, { timeout: 3000 });
        return response.data[0].embedding;
    }
    async extractSkills(text) {
        try {
            const result = await this.chatJSON('Extract technical skills. Return JSON: {"skills":["React","TypeScript"]}', text.slice(0, 6000));
            return Array.isArray(result.skills) ? result.skills : [];
        }
        catch (e) {
            console.error('Failed to parse skills JSON:', e);
            return [];
        }
    }
    async matchCandidateToJob(candidateText, jobText) {
        try {
            return await this.chatJSON('Analyze candidate-job fit. Return JSON: {"score":0-100,"reason":"explanation"}', `Resume:\n${candidateText.slice(0, 3000)}\n\nJob:\n${jobText.slice(0, 3000)}`);
        }
        catch (e) {
            console.error('Failed to parse match result JSON:', e);
            return { score: 0, reason: 'Failed to parse AI output' };
        }
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
            model: env_1.ENV.AI_MODEL,
            messages: [
                { role: 'system', content: 'Summarize this resume in 3 bullet points.' },
                { role: 'user', content: text.slice(0, 6000) },
            ],
        });
        return response.choices[0].message.content || 'Summary unavailable';
    }
    async scoreResume(text, jobText) {
        const result = await this.matchCandidateToJob(text, jobText);
        return result.score;
    }
    // ── New interface methods ──
    async generateJobDescription(input) {
        return this.chatJSON('Generate a complete job description. Return JSON: {"description":"full markdown JD","technicalSkills":[],"softSkills":[],"benefits":[],"requirements":[]}', `Title: ${input.title}\nResponsibilities: ${input.responsibilities.join('; ')}\nSkills: ${input.requiredSkills.join(', ')}\nCulture: ${input.companyCulture || 'Not specified'}`);
    }
    async generateInterviewQuestions(jobText, role) {
        const result = await this.chatJSON('Generate interview questions. Return JSON: {"questions":[{"category":"TECHNICAL"|"BEHAVIORAL"|"CULTURE_FIT","question":"...","guideline":"..."}]}', `Role: ${role}\nJob:\n${jobText.slice(0, 4000)}`);
        return Array.isArray(result.questions) ? result.questions : [];
    }
    async analyzeSalary(title, location, skills, experienceYears, salaryMin, salaryMax) {
        return this.chatJSON('Analyze market salary. Return JSON: {"estimatedMin":number,"estimatedMedian":number,"estimatedMax":number,"inputComparison":"BELOW_MARKET"|"AT_MARKET"|"ABOVE_MARKET","confidence":"HIGH"|"MEDIUM"|"LOW","factors":[],"summary":"..."}', `Title: ${title}\nLocation: ${location}\nSkills: ${skills.join(', ')}\nExperience: ${experienceYears ?? 'N/A'} years\n${salaryMin || salaryMax ? `Proposed: $${salaryMin}-$${salaryMax}` : ''}`);
    }
    async generateCandidateSummary(resumeText, jobText, matchedSkills, missingSkills) {
        return this.chatJSON('Analyze candidate fit. Return JSON: {"whyThisCandidate":"...","strengthHighlights":[],"concerns":[],"confidenceScore":0.0-1.0}', `Resume:\n${resumeText.slice(0, 3000)}\nJob:\n${jobText.slice(0, 2000)}\nMatched: ${matchedSkills.join(', ')}\nMissing: ${missingSkills.join(', ')}`);
    }
    async extractLinkedInProfile(text) {
        const result = await this.chatJSON('Extract LinkedIn profile data. Return JSON: {"fullName":null,"headline":null,"summary":null,"skills":[],"experience":[],"education":[],"certifications":[]}', text.slice(0, 8000));
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
exports.LMStudioProvider = LMStudioProvider;
function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (magA * magB);
}
function cleanAndParseJSON(text) {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        const firstNewline = cleaned.indexOf('\n');
        if (firstNewline !== -1)
            cleaned = cleaned.slice(firstNewline).trim();
        if (cleaned.endsWith('```'))
            cleaned = cleaned.slice(0, cleaned.length - 3).trim();
    }
    try {
        return JSON.parse(cleaned);
    }
    catch (e) {
        try {
            const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/);
            const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
            const reasonKeyIndex = cleaned.search(/"reason"\s*:\s*"/);
            if (reasonKeyIndex !== -1) {
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
        }
        catch {
            // Fall through
        }
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1));
            }
            catch {
                // Fall through
            }
        }
        throw e;
    }
}
