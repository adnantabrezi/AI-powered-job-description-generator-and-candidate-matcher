import { prisma } from '../config/database';
import { JobStatus } from '@prisma/client';

export class JobRepository {
  async create(data: {
    companyId: string;
    title: string;
    description: string;
    location: string;
    employmentType: string;
    salaryMin?: number;
    salaryMax?: number;
    remoteStatus?: boolean;
    requiredExperience?: number;
    skillIds?: string[];
    status?: JobStatus;
  }) {
    const { skillIds, ...jobData } = data;

    return prisma.job.create({
      data: {
        ...jobData,
        skills: {
          create: skillIds?.map((id) => ({ skillId: id })) ?? [],
        },
      },
      include: {
        company: true,
        skills: { include: { skill: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.job.findUnique({
      where: { id },
      include: {
        company: true,
        skills: { include: { skill: true } },
      },
    });
  }

  async findMany(params: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    take?: number;
    skip?: number;
  }) {
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: params.where,
        orderBy: params.orderBy,
        take: params.take,
        skip: params.skip,
        include: {
          company: true,
          skills: { include: { skill: true } },
        },
      }),
      prisma.job.count({ where: params.where }),
    ]);

    return { jobs, total };
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      location?: string;
      employmentType?: string;
      salaryMin?: number;
      salaryMax?: number;
      remoteStatus?: boolean;
      requiredExperience?: number;
      skillIds?: string[];
    },
  ) {
    const { skillIds, ...jobData } = data;

    return prisma.$transaction(async (tx) => {
      if (skillIds) {
        await tx.jobSkill.deleteMany({ where: { jobId: id } });
      }

      return tx.job.update({
        where: { id },
        data: {
          ...jobData,
          ...(skillIds
            ? { skills: { create: skillIds.map((skillId) => ({ skillId })) } }
            : {}),
        },
        include: {
          company: true,
          skills: { include: { skill: true } },
        },
      });
    });
  }

  async delete(id: string) {
    return prisma.job.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    return prisma.job.update({
      where: { id },
      data: { status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
      include: {
        company: true,
        skills: { include: { skill: true } },
      },
    });
  }
}

export const jobRepository = new JobRepository();
