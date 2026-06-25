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
    async chatJSON(system, user) {
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
    async generateEmbedding(text) {
        const response = await this.client.embeddings.create({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000),
        });
        return response.data[0].embedding;
    }
    async extractSkills(text) {
        const result = await this.chatJSON('Extract technical skills from resume text. Return JSON: {"skills":["React","TypeScript"]}', text.slice(0, 6000));
        return Array.isArray(result.skills) ? result.skills : [];
    }
    async matchCandidateToJob(candidateText, jobText) {
        return this.chatJSON('Analyze candidate-job fit. Return JSON: {"score":0-100,"reason":"explanation"}', `Resume:\n${candidateText.slice(0, 3000)}\n\nJob:\n${jobText.slice(0, 3000)}`);
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
        const result = await this.chatJSON('You are an expert HR content writer who creates compelling, modern job descriptions that attract top talent. Write in a professional yet approachable tone.', prompt);
        return normalizeGeneratedJD(result);
    }
    async generateInterviewQuestions(jobText, role) {
        const result = await this.chatJSON('Generate interview questions. Return JSON: {"questions":[{"category":"TECHNICAL"|"BEHAVIORAL"|"CULTURE_FIT","question":"...","guideline":"..."}]}', `Role: ${role}\nJob:\n${jobText.slice(0, 4000)}`);
        return Array.isArray(result.questions) ? result.questions : [];
    }
    async analyzeSalary(title, location, skills, experienceYears, salaryMin, salaryMax) {
        const result = await this.chatJSON('Analyze market salary. Return JSON: {"estimatedMin":number,"estimatedMedian":number,"estimatedMax":number,"inputComparison":"BELOW_MARKET"|"AT_MARKET"|"ABOVE_MARKET","confidence":"HIGH"|"MEDIUM"|"LOW","factors":[],"summary":"..."}', `Title: ${title}\nLocation: ${location}\nSkills: ${skills.join(', ')}\nExperience: ${experienceYears ?? 'N/A'} years\n${salaryMin || salaryMax ? `Proposed: $${salaryMin}-$${salaryMax}` : ''}`);
        return normalizeSalaryAnalysis(result);
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
exports.OpenAIProvider = OpenAIProvider;
function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (magA * magB);
}
function normalizeStringArray(arr) {
    if (!Array.isArray(arr))
        return [];
    return arr.map(item => {
        if (typeof item === 'string')
            return item;
        if (item && typeof item === 'object') {
            const val = Object.values(item).find(v => typeof v === 'string');
            if (typeof val === 'string')
                return val;
            return item.name || item.skill || item.title || item.benefit || item.languageOrFramework || JSON.stringify(item);
        }
        return String(item);
    }).filter(Boolean);
}
function normalizeGeneratedJD(jd) {
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
function normalizeSalaryAnalysis(res) {
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
    const factors = Array.isArray(res.factors) ? res.factors.map((f) => {
        if (typeof f === 'string')
            return f;
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
