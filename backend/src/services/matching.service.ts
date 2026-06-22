import { jobMatchRepository } from '../repositories/job.match.repository';
import { jobRepository } from '../repositories/job.repository';
import { aiProvider } from '../ai/ai.provider';
import { prisma } from '../config/database';
import { enqueueJob } from '../jobs/jobQueue';
import { emailService } from '../notifications/email.service';

export class MatchingService {
  async calculateMatchScore(candidateId: string, jobId: string) {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        skills: { include: { skill: true } },
        user: { include: { resumeFile: true } },
      },
    });

    const job = await jobRepository.findById(jobId);
    if (!candidate || !job) throw new Error('Candidate or Job not found');

    const jobSkills = job.skills.map((js) => js.skill.name.toLowerCase());
    const candidateSkills = candidate.skills.map((cs) => cs.skill.name.toLowerCase());

    const matchedSkills = jobSkills.filter((s) => candidateSkills.includes(s));
    const missingSkills = jobSkills.filter((s) => !candidateSkills.includes(s));

    const skillScore =
      jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 30 : 15;

    let expScore = 20;
    if (job.requiredExperience) {
      expScore =
        candidate.experienceYears >= job.requiredExperience
          ? 20
          : Math.max(0, (candidate.experienceYears / job.requiredExperience) * 20);
    }

    let embeddingScore = 0;
    const resumeEmbedding = candidate.user?.resumeFile?.embedding as unknown as number[] | null;
    const jobEmbedding = job.embedding as unknown as number[] | null;
    if (resumeEmbedding && jobEmbedding && Array.isArray(resumeEmbedding) && Array.isArray(jobEmbedding)) {
      embeddingScore = cosineSimilarity(resumeEmbedding, jobEmbedding) * 20;
    }

    let keywordScore = 0;
    const resumeText = candidate.user?.resumeFile?.rawText?.toLowerCase() ?? '';
    const keywords = job.description.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const matchedKeywords = keywords.filter((k) => resumeText.includes(k));
    keywordScore = keywords.length > 0 ? (matchedKeywords.length / keywords.length) * 10 : 5;

    let aiScore = 0;
    let aiReason = 'No AI analysis available';

    if (candidate.user?.resumeFile?.rawText && job.description) {
      try {
        const aiAnalysis = await aiProvider.matchCandidateToJob(
          candidate.user.resumeFile.rawText,
          job.description,
        );
        aiScore = (aiAnalysis.score / 100) * 20;
        aiReason = aiAnalysis.reason;
      } catch {
        aiReason = 'AI analysis unavailable';
      }
    }

    const finalScore = Math.min(
      100,
      Math.round((skillScore + expScore + embeddingScore + keywordScore + aiScore) * 100) / 100,
    );

    const existingMatch = await prisma.candidateJobMatch.findUnique({
      where: {
        jobId_candidateId: { jobId, candidateId },
      },
    });

    const isNewRecommendation = (!existingMatch || existingMatch.matchScore < 40) && finalScore >= 40;

    if (isNewRecommendation && candidate.user?.email) {
      await emailService.sendEmail(candidate.user.email, 'RECOMMENDATION_FOUND', {
        jobTitle: job.title,
        matchScore: finalScore.toString(),
        reason: aiReason,
      });
    }

    return jobMatchRepository.createMatch({
      jobId,
      candidateId,
      matchScore: finalScore,
      matchedSkills,
      missingSkills,
      reason: aiReason,
    });
  }

  async rankApplicantsForJob(jobId: string) {
    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        candidate: {
          include: { user: { include: { resumeFile: true } } },
        },
      },
    });

    const job = await jobRepository.findById(jobId);
    if (!job) throw new Error('Job not found');

    const matches = await Promise.all(
      applications.map((app) => this.calculateMatchScore(app.candidateId, jobId)),
    );

    for (const match of matches) {
      await prisma.application.update({
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

  async triggerGlobalMatching(jobId: string) {
    const candidates = await prisma.candidateProfile.findMany({
      where: { user: { resumeFile: { isNot: null } } },
    });

    const matches = [];
    for (const candidate of candidates) {
      const match = await this.calculateMatchScore(candidate.id, jobId);
      matches.push(match);
    }
    return matches;
  }

  enqueueJobMatching(jobId: string) {
    enqueueJob(`match-job:${jobId}`, async () => {
      await this.triggerGlobalMatching(jobId);
    });
  }

  enqueueCandidateMatching(candidateId: string) {
    enqueueJob(`match-candidate:${candidateId}`, async () => {
      const jobs = await prisma.job.findMany({ where: { status: 'PUBLISHED' } });
      for (const job of jobs) {
        await this.calculateMatchScore(candidateId, job.id);
      }
    });
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

export const matchingService = new MatchingService();
