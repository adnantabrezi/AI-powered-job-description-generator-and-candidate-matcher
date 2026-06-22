import { ApplicationStatus } from '@prisma/client';
import { prisma } from '../config/database';

export class ApplicationRepository {
  async create(data: {
    jobId: string;
    candidateId: string;
    matchScore?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          jobId: data.jobId,
          candidateId: data.candidateId,
          matchScore: data.matchScore,
          matchedSkills: data.matchedSkills ?? [],
          missingSkills: data.missingSkills ?? [],
        },
        include: {
          job: { include: { company: true } },
          candidate: { include: { user: true } },
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          status: ApplicationStatus.APPLIED,
        },
      });

      return application;
    });
  }

  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        job: { include: { company: true } },
        candidate: { include: { user: true } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
  }

  async findByCandidate(candidateId: string) {
    return prisma.application.findMany({
      where: { candidateId },
      include: {
        job: { include: { company: true } },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByJob(jobId: string) {
    return prisma.application.findMany({
      where: { jobId },
      include: {
        candidate: { include: { user: true, skills: { include: { skill: true } } } },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
      },
      orderBy: { matchScore: 'desc' },
    });
  }

  async findExisting(jobId: string, candidateId: string) {
    return prisma.application.findUnique({
      where: { jobId_candidateId: { jobId, candidateId } },
    });
  }

  async updateStatus(id: string, status: ApplicationStatus) {
    return prisma.$transaction(async (tx) => {
      const application = await tx.application.update({
        where: { id },
        data: { status },
        include: {
          job: { include: { company: true } },
          candidate: { include: { user: true } },
        },
      });

      await tx.applicationStatusHistory.create({
        data: { applicationId: id, status },
      });

      return application;
    });
  }

  async delete(id: string) {
    return prisma.application.delete({ where: { id } });
  }
}

export const applicationRepository = new ApplicationRepository();
