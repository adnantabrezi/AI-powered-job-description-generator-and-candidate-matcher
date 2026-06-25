"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingService = exports.MatchingService = void 0;
const job_match_repository_1 = require("../repositories/job.match.repository");
const job_repository_1 = require("../repositories/job.repository");
const ai_provider_1 = require("../ai/ai.provider");
const database_1 = require("../config/database");
const jobQueue_1 = require("../jobs/jobQueue");
const email_service_1 = require("../notifications/email.service");
class MatchingService {
    async calculateMatchScore(candidateId, jobId) {
        const candidate = await database_1.prisma.candidateProfile.findUnique({
            where: { id: candidateId },
            include: {
                skills: { include: { skill: true } },
                user: { include: { resumeFile: true } },
            },
        });
        const job = await job_repository_1.jobRepository.findById(jobId);
        if (!candidate || !job)
            throw new Error('Candidate or Job not found');
        const jobSkills = job.skills.map((js) => js.skill.name.toLowerCase());
        const candidateSkills = candidate.skills.map((cs) => cs.skill.name.toLowerCase());
        const matchedSkills = jobSkills.filter((s) => candidateSkills.includes(s));
        const missingSkills = jobSkills.filter((s) => !candidateSkills.includes(s));
        // Weighted scoring: Skills(25) + Exp(15) + Embedding(15) + Keywords(10) + AI(25) + Culture(10)
        const skillScore = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 25 : 12.5;
        let expScore = 15;
        if (job.requiredExperience) {
            expScore =
                candidate.experienceYears >= job.requiredExperience
                    ? 15
                    : Math.max(0, (candidate.experienceYears / job.requiredExperience) * 15);
        }
        let embeddingScore = 0;
        const resumeEmbedding = candidate.user?.resumeFile?.embedding;
        const jobEmbedding = job.embedding;
        if (resumeEmbedding && jobEmbedding && Array.isArray(resumeEmbedding) && Array.isArray(jobEmbedding)) {
            embeddingScore = cosineSimilarity(resumeEmbedding, jobEmbedding) * 15;
        }
        let keywordScore = 0;
        const resumeText = candidate.user?.resumeFile?.rawText?.toLowerCase() ?? '';
        const keywords = job.description.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
        const matchedKeywords = keywords.filter((k) => resumeText.includes(k));
        keywordScore = keywords.length > 0 ? (matchedKeywords.length / keywords.length) * 10 : 5;
        let aiScore = 0;
        let aiReason = 'No AI analysis available';
        let whyThisCandidate;
        let strengthHighlights = [];
        let concerns = [];
        let confidenceScore;
        if (candidate.user?.resumeFile?.rawText && job.description) {
            try {
                // Deep AI analysis
                const aiAnalysis = await ai_provider_1.aiProvider.matchCandidateToJob(candidate.user.resumeFile.rawText, job.description);
                aiScore = (aiAnalysis.score / 100) * 25;
                aiReason = aiAnalysis.reason;
                // Generate "Why this candidate" summary
                try {
                    const summary = await ai_provider_1.aiProvider.generateCandidateSummary(candidate.user.resumeFile.rawText, job.description, matchedSkills, missingSkills);
                    whyThisCandidate = summary.whyThisCandidate;
                    strengthHighlights = summary.strengthHighlights;
                    concerns = summary.concerns;
                    confidenceScore = summary.confidenceScore;
                }
                catch {
                    // Summary generation is non-critical
                }
            }
            catch {
                aiReason = 'AI analysis unavailable';
            }
        }
        // Culture fit score (10%)
        let cultureScore = 5; // Default mid-range
        if (candidate.user?.resumeFile?.rawText && job.companyCulture) {
            // Simple keyword overlap for culture
            const cultureWords = job.companyCulture.toLowerCase().split(/\s+/);
            const cultureMatch = cultureWords.filter((w) => resumeText.includes(w)).length;
            cultureScore = Math.min(10, (cultureMatch / Math.max(cultureWords.length, 1)) * 10);
        }
        const finalScore = Math.min(100, Math.round((skillScore + expScore + embeddingScore + keywordScore + aiScore + cultureScore) * 100) / 100);
        const existingMatch = await database_1.prisma.candidateJobMatch.findUnique({
            where: { jobId_candidateId: { jobId, candidateId } },
        });
        const isNewRecommendation = (!existingMatch || existingMatch.matchScore < 40) && finalScore >= 40;
        if (isNewRecommendation && candidate.user?.email) {
            await email_service_1.emailService.sendEmail(candidate.user.email, 'RECOMMENDATION_FOUND', {
                jobTitle: job.title,
                matchScore: finalScore.toString(),
                reason: aiReason,
            });
        }
        return job_match_repository_1.jobMatchRepository.createMatch({
            jobId,
            candidateId,
            matchScore: finalScore,
            matchedSkills,
            missingSkills,
            reason: aiReason,
            whyThisCandidate,
            strengthHighlights,
            concerns,
            confidenceScore,
        });
    }
    async rankApplicantsForJob(jobId) {
        const applications = await database_1.prisma.application.findMany({
            where: { jobId },
            include: {
                candidate: {
                    include: { user: { include: { resumeFile: true } } },
                },
            },
        });
        const job = await job_repository_1.jobRepository.findById(jobId);
        if (!job)
            throw new Error('Job not found');
        const matches = await Promise.all(applications.map((app) => this.calculateMatchScore(app.candidateId, jobId)));
        for (const match of matches) {
            await database_1.prisma.application.update({
                where: {
                    jobId_candidateId: { jobId, candidateId: match.candidateId },
                },
                data: {
                    matchScore: match.matchScore,
                    matchedSkills: match.matchedSkills,
                    missingSkills: match.missingSkills,
                },
            });
        }
        return matches.sort((a, b) => b.matchScore - a.matchScore);
    }
    async triggerGlobalMatching(jobId) {
        const candidates = await database_1.prisma.candidateProfile.findMany({
            where: { user: { resumeFile: { isNot: null } } },
        });
        const matches = [];
        for (const candidate of candidates) {
            const match = await this.calculateMatchScore(candidate.id, jobId);
            matches.push(match);
        }
        return matches;
    }
    enqueueJobMatching(jobId) {
        (0, jobQueue_1.enqueueJob)(`match-job:${jobId}`, async () => {
            await this.triggerGlobalMatching(jobId);
        });
    }
    enqueueCandidateMatching(candidateId) {
        (0, jobQueue_1.enqueueJob)(`match-candidate:${candidateId}`, async () => {
            const jobs = await database_1.prisma.job.findMany({ where: { status: 'PUBLISHED' } });
            for (const job of jobs) {
                await this.calculateMatchScore(candidateId, job.id);
            }
        });
    }
}
exports.MatchingService = MatchingService;
function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (magA * magB);
}
exports.matchingService = new MatchingService();
