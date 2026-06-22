"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobService = exports.JobService = void 0;
const job_repository_1 = require("../repositories/job.repository");
const company_repository_1 = require("../repositories/company.repository");
const client_1 = require("@prisma/client");
const matching_service_1 = require("./matching.service");
const resume_service_1 = require("./resume.service");
class JobService {
    async createJob(userId, data) {
        const company = await company_repository_1.companyRepository.findByEmployerId(userId);
        if (!company)
            throw new Error('No company associated with this employer profile');
        const job = await job_repository_1.jobRepository.create({
            ...data,
            companyId: company.id,
            status: client_1.JobStatus.PUBLISHED,
        });
        await resume_service_1.resumeService.generateJobEmbedding(job.id);
        matching_service_1.matchingService.enqueueJobMatching(job.id);
        return job;
    }
    async getJobById(id, userId, role) {
        const job = await job_repository_1.jobRepository.findById(id);
        if (!job)
            throw new Error('Job not found');
        if (role === 'CANDIDATE' && job.status !== client_1.JobStatus.PUBLISHED) {
            throw new Error('This job is not currently available');
        }
        return job;
    }
    async listJobs(params, userId, role) {
        const page = Number(params.page ?? 1);
        const limit = Number(params.limit ?? 20);
        const { status, remoteStatus, industry, sort } = params;
        const where = {};
        if (role === 'CANDIDATE' || !role) {
            where.status = status ?? client_1.JobStatus.PUBLISHED;
        }
        else if (role === 'EMPLOYER' && userId) {
            const company = await company_repository_1.companyRepository.findByEmployerId(userId);
            if (company)
                where.companyId = company.id;
        }
        if (remoteStatus !== undefined) {
            where.remoteStatus = remoteStatus === 'true' || remoteStatus === true;
        }
        if (industry) {
            where.company = { industry };
        }
        const orderBy = {};
        if (sort && typeof sort === 'string') {
            const [field, order] = sort.split(':');
            orderBy[field] = order === 'asc' ? 'asc' : 'desc';
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const { jobs, total } = await job_repository_1.jobRepository.findMany({
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
    async updateJob(userId, jobId, data) {
        const job = await job_repository_1.jobRepository.findById(jobId);
        if (!job)
            throw new Error('Job not found');
        const company = await company_repository_1.companyRepository.findByEmployerId(userId);
        if (!company || job.companyId !== company.id) {
            throw new Error('Permission denied: You do not own this job');
        }
        const updated = await job_repository_1.jobRepository.update(jobId, data);
        await resume_service_1.resumeService.generateJobEmbedding(jobId);
        return updated;
    }
    async deleteJob(userId, jobId) {
        const job = await job_repository_1.jobRepository.findById(jobId);
        if (!job)
            throw new Error('Job not found');
        const company = await company_repository_1.companyRepository.findByEmployerId(userId);
        if (!company || job.companyId !== company.id) {
            throw new Error('Permission denied: You do not own this job');
        }
        return job_repository_1.jobRepository.delete(jobId);
    }
    async changeJobStatus(userId, jobId, status) {
        const job = await job_repository_1.jobRepository.findById(jobId);
        if (!job)
            throw new Error('Job not found');
        const company = await company_repository_1.companyRepository.findByEmployerId(userId);
        if (!company || job.companyId !== company.id) {
            throw new Error('Permission denied: You do not own this job');
        }
        const updated = await job_repository_1.jobRepository.updateStatus(jobId, status);
        if (status === client_1.JobStatus.PUBLISHED) {
            matching_service_1.matchingService.enqueueJobMatching(jobId);
            await resume_service_1.resumeService.generateJobEmbedding(jobId);
        }
        return updated;
    }
}
exports.JobService = JobService;
exports.jobService = new JobService();
