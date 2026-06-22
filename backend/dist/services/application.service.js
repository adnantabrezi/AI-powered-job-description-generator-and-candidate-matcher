"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationService = exports.ApplicationService = void 0;
const client_1 = require("@prisma/client");
const application_repository_1 = require("../repositories/application.repository");
const database_1 = require("../config/database");
const matching_service_1 = require("./matching.service");
const email_service_1 = require("../notifications/email.service");
const error_middleware_1 = require("../middleware/error.middleware");
class ApplicationService {
    async apply(userId, jobId) {
        const profile = await database_1.prisma.candidateProfile.findUnique({ where: { userId } });
        if (!profile)
            throw new error_middleware_1.AppError(404, 'Candidate profile not found');
        const job = await database_1.prisma.job.findUnique({
            where: { id: jobId },
            include: { company: true },
        });
        if (!job || job.status !== client_1.JobStatus.PUBLISHED) {
            throw new error_middleware_1.AppError(400, 'Job is not available for applications');
        }
        const existing = await application_repository_1.applicationRepository.findExisting(jobId, profile.id);
        if (existing)
            throw new error_middleware_1.AppError(409, 'You have already applied to this job');
        const match = await matching_service_1.matchingService.calculateMatchScore(profile.id, jobId);
        const application = await application_repository_1.applicationRepository.create({
            jobId,
            candidateId: profile.id,
            matchScore: match.matchScore,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
        });
        const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            await email_service_1.emailService.sendEmail(user.email, 'APPLICATION_SUBMITTED', {
                jobTitle: job.title,
                companyName: job.company.name,
            });
            await email_service_1.emailService.createNotification(userId, `Application submitted for ${job.title}`);
        }
        return application;
    }
    async getMyApplications(userId) {
        const profile = await database_1.prisma.candidateProfile.findUnique({ where: { userId } });
        if (!profile)
            throw new error_middleware_1.AppError(404, 'Candidate profile not found');
        return application_repository_1.applicationRepository.findByCandidate(profile.id);
    }
    async getJobApplicants(employerUserId, jobId) {
        await this.assertJobOwnership(employerUserId, jobId);
        return application_repository_1.applicationRepository.findByJob(jobId);
    }
    async updateStatus(employerUserId, applicationId, status) {
        const application = await application_repository_1.applicationRepository.findById(applicationId);
        if (!application)
            throw new error_middleware_1.AppError(404, 'Application not found');
        await this.assertJobOwnership(employerUserId, application.jobId);
        const updated = await application_repository_1.applicationRepository.updateStatus(applicationId, status);
        const candidateEmail = updated.candidate.user.email;
        await email_service_1.emailService.sendEmail(candidateEmail, 'APPLICATION_STATUS_CHANGED', {
            jobTitle: updated.job.title,
            status,
        });
        await email_service_1.emailService.createNotification(updated.candidate.userId, `Application status for ${updated.job.title}: ${status}`);
        if (status === client_1.ApplicationStatus.INTERVIEW_SCHEDULED) {
            await email_service_1.emailService.sendEmail(candidateEmail, 'INTERVIEW_SCHEDULED', {
                jobTitle: updated.job.title,
                interviewDate: new Date().toISOString(),
            });
        }
        if (status === client_1.ApplicationStatus.OFFER_SENT) {
            await email_service_1.emailService.sendEmail(candidateEmail, 'OFFER_SENT', {
                jobTitle: updated.job.title,
                companyName: updated.job.company.name,
            });
        }
        return updated;
    }
    async withdraw(userId, applicationId) {
        const profile = await database_1.prisma.candidateProfile.findUnique({ where: { userId } });
        if (!profile)
            throw new error_middleware_1.AppError(404, 'Candidate profile not found');
        const application = await application_repository_1.applicationRepository.findById(applicationId);
        if (!application || application.candidateId !== profile.id) {
            throw new error_middleware_1.AppError(404, 'Application not found');
        }
        if (application.status === client_1.ApplicationStatus.HIRED) {
            throw new error_middleware_1.AppError(400, 'Cannot withdraw a hired application');
        }
        return application_repository_1.applicationRepository.delete(applicationId);
    }
    async getHistory(userId, applicationId, role) {
        const application = await application_repository_1.applicationRepository.findById(applicationId);
        if (!application)
            throw new error_middleware_1.AppError(404, 'Application not found');
        if (role === 'CANDIDATE') {
            const profile = await database_1.prisma.candidateProfile.findUnique({ where: { userId } });
            if (!profile || application.candidateId !== profile.id) {
                throw new error_middleware_1.AppError(403, 'Permission denied');
            }
        }
        else if (role === 'EMPLOYER') {
            await this.assertJobOwnership(userId, application.jobId);
        }
        return application.statusHistory;
    }
    async assertJobOwnership(employerUserId, jobId) {
        const employer = await database_1.prisma.employerProfile.findUnique({
            where: { userId: employerUserId },
        });
        if (!employer)
            throw new error_middleware_1.AppError(403, 'Employer profile not found');
        const job = await database_1.prisma.job.findUnique({ where: { id: jobId } });
        if (!job || job.companyId !== employer.companyId) {
            throw new error_middleware_1.AppError(403, 'Permission denied');
        }
    }
}
exports.ApplicationService = ApplicationService;
exports.applicationService = new ApplicationService();
