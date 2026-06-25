import { prisma } from '../config/database';

export class PipelineRepository {
  async create(data: {
    employerId: string;
    name: string;
    description?: string;
    criteria?: any;
    jobId?: string;
  }) {
    return prisma.talentPipeline.create({
      data,
      include: { candidates: { include: { candidate: true } } },
    });
  }

  async findByEmployer(employerId: string) {
    return prisma.talentPipeline.findMany({
      where: { employerId },
      include: {
        candidates: { include: { candidate: true } },
        job: true,
        _count: { select: { candidates: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.talentPipeline.findUnique({
      where: { id },
      include: {
        candidates: {
          include: {
            candidate: {
              include: {
                user: { select: { email: true } },
                skills: { include: { skill: true } },
              },
            },
          },
        },
        job: true,
        employer: true,
      },
    });
  }

  async addCandidate(pipelineId: string, candidateId: string, notes?: string) {
    return prisma.pipelineCandidate.create({
      data: { pipelineId, candidateId, notes },
      include: { candidate: true },
    });
  }

  async removeCandidate(pipelineId: string, candidateId: string) {
    return prisma.pipelineCandidate.delete({
      where: {
        pipelineId_candidateId: { pipelineId, candidateId },
      },
    });
  }

  async delete(id: string) {
    return prisma.talentPipeline.delete({ where: { id } });
  }

  async update(id: string, data: { name?: string; description?: string; criteria?: any }) {
    return prisma.talentPipeline.update({
      where: { id },
      data,
    });
  }
}

export const pipelineRepository = new PipelineRepository();
