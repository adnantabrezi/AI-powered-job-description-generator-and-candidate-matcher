import { jobRepository } from '../repositories/job.repository';
import { companyRepository } from '../repositories/company.repository';
import { JobStatus } from '@prisma/client';
import { matchingService } from './matching.service';
import { resumeService } from './resume.service';

export class JobService {
  async createJob(userId: string, data: {
    title: string;
    description: string;
    location: string;
    employmentType: string;
    salaryMin?: number;
    salaryMax?: number;
    remoteStatus?: boolean;
    requiredExperience?: number;
    skillIds?: string[];
  }) {
    const company = await companyRepository.findByEmployerId(userId);
    if (!company) throw new Error('No company associated with this employer profile');

    const job = await jobRepository.create({
      ...data,
      companyId: company.id,
      status: JobStatus.PUBLISHED,
    });

    await resumeService.generateJobEmbedding(job.id);
    matchingService.enqueueJobMatching(job.id);
    return job;
  }

  async getJobById(id: string, userId?: string, role?: string) {
    const job = await jobRepository.findById(id);
    if (!job) throw new Error('Job not found');

    if (role === 'CANDIDATE' && job.status !== JobStatus.PUBLISHED) {
      throw new Error('This job is not currently available');
    }

    return job;
  }

  async listJobs(params: Record<string, unknown>, userId?: string, role?: string) {
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 20);
    const { status, remoteStatus, industry, sort } = params;

    const where: Record<string, unknown> = {};

    if (role === 'CANDIDATE' || !role) {
      where.status = status ?? JobStatus.PUBLISHED;
    } else if (role === 'EMPLOYER' && userId) {
      const company = await companyRepository.findByEmployerId(userId);
      if (company) where.companyId = company.id;
    }

    if (remoteStatus !== undefined) {
      where.remoteStatus = remoteStatus === 'true' || remoteStatus === true;
    }

    if (industry) {
      where.company = { industry };
    }

    const orderBy: Record<string, string> = {};
    if (sort && typeof sort === 'string') {
      const [field, order] = sort.split(':');
      orderBy[field] = order === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const { jobs, total } = await jobRepository.findMany({
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateJob(userId: string, jobId: string, data: Record<string, unknown>) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new Error('Job not found');

    const company = await companyRepository.findByEmployerId(userId);
    if (!company || job.companyId !== company.id) {
      throw new Error('Permission denied: You do not own this job');
    }

    const updated = await jobRepository.update(jobId, data as Parameters<typeof jobRepository.update>[1]);
    await resumeService.generateJobEmbedding(jobId);
    return updated;
  }

  async deleteJob(userId: string, jobId: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new Error('Job not found');

    const company = await companyRepository.findByEmployerId(userId);
    if (!company || job.companyId !== company.id) {
      throw new Error('Permission denied: You do not own this job');
    }

    return jobRepository.delete(jobId);
  }

  async changeJobStatus(userId: string, jobId: string, status: JobStatus) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new Error('Job not found');

    const company = await companyRepository.findByEmployerId(userId);
    if (!company || job.companyId !== company.id) {
      throw new Error('Permission denied: You do not own this job');
    }

    const updated = await jobRepository.updateStatus(jobId, status);

    if (status === JobStatus.PUBLISHED) {
      matchingService.enqueueJobMatching(jobId);
      await resumeService.generateJobEmbedding(jobId);
    }

    return updated;
  }
}

export const jobService = new JobService();
