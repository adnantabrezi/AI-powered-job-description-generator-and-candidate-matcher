import { aiProvider } from '../ai/ai.provider';
import { prisma } from '../config/database';
import { jobRepository } from '../repositories/job.repository';

export class CandidateSummaryService {
  /**
   * Generate a "Why this candidate" summary for a candidate-job pair.
   */
  async generateSummary(candidateId: string, jobId: string) {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        skills: { include: { skill: true } },
        user: { include: { resumeFile: true } },
      },
    });

    const job = await jobRepository.findById(jobId);
    if (!candidate || !job) throw new Error('Candidate or Job not found');

    const resumeText = candidate.user?.resumeFile?.rawText || '';
    const jobText = `${job.title}\n${job.description}`;

    const jobSkills = job.skills.map((js) => js.skill.name.toLowerCase());
    const candidateSkills = candidate.skills.map((cs) => cs.skill.name.toLowerCase());
    const matchedSkills = jobSkills.filter((s) => candidateSkills.includes(s));
    const missingSkills = jobSkills.filter((s) => !candidateSkills.includes(s));

    const summary = await aiProvider.generateCandidateSummary(
      resumeText,
      jobText,
      matchedSkills,
      missingSkills,
    );

    // Update the match record with the summary
    await prisma.candidateJobMatch.upsert({
      where: {
        jobId_candidateId: { jobId, candidateId },
      },
      update: {
        whyThisCandidate: summary.whyThisCandidate,
        strengthHighlights: summary.strengthHighlights,
        concerns: summary.concerns,
        confidenceScore: summary.confidenceScore,
      },
      create: {
        jobId,
        candidateId,
        matchScore: 0,
        matchedSkills,
        missingSkills,
        whyThisCandidate: summary.whyThisCandidate,
        strengthHighlights: summary.strengthHighlights,
        concerns: summary.concerns,
        confidenceScore: summary.confidenceScore,
      },
    });

    return summary;
  }
}

export const candidateSummaryService = new CandidateSummaryService();
