import { prisma } from '../config/database';

export class JobMatchRepository {
  async createMatch(data: {
    jobId: string;
    candidateId: string;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    reason?: string;
  }) {
    return prisma.candidateJobMatch.upsert({
      where: {
        jobId_candidateId: {
          jobId: data.jobId,
          candidateId: data.candidateId,
        },
      },
      update: data,
      create: data,
    });
  }

  async findMatchesByJob(jobId: string, limit = 10, offset = 0) {
    return prisma.candidateJobMatch.findMany({
      where: { jobId },
      orderBy: { matchScore: 'desc' },
      take: limit,
      skip: offset,
      include: {
        candidate: { include: { user: true } },
      },
    });
  }

  async findMatchesByCandidate(candidateId: string) {
    return prisma.candidateJobMatch.findMany({
      where: { candidateId },
      orderBy: { matchScore: 'desc' },
      include: {
        job: { include: { company: true } },
      },
    });
  }
}

export const jobMatchRepository = new JobMatchRepository();
