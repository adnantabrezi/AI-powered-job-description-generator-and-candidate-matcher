import { ApplicationStatus, JobStatus } from '@prisma/client';
import { applicationRepository } from '../repositories/application.repository';
import { prisma } from '../config/database';
import { matchingService } from './matching.service';
import { emailService } from '../notifications/email.service';
import { AppError } from '../middleware/error.middleware';

export class ApplicationService {
  async apply(userId: string, jobId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError(404, 'Candidate profile not found');

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job || job.status !== JobStatus.PUBLISHED) {
      throw new AppError(400, 'Job is not available for applications');
    }

    const existing = await applicationRepository.findExisting(jobId, profile.id);
    if (existing) throw new AppError(409, 'You have already applied to this job');

    const match = await matchingService.calculateMatchScore(profile.id, jobId);

    const application = await applicationRepository.create({
      jobId,
      candidateId: profile.id,
      matchScore: match.matchScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await emailService.sendEmail(user.email, 'APPLICATION_SUBMITTED', {
        jobTitle: job.title,
        companyName: job.company.name,
      });
      await emailService.createNotification(
        userId,
        `Application submitted for ${job.title}`,
      );
    }

    return application;
  }

  async getMyApplications(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError(404, 'Candidate profile not found');
    return applicationRepository.findByCandidate(profile.id);
  }

  async getJobApplicants(employerUserId: string, jobId: string) {
    await this.assertJobOwnership(employerUserId, jobId);
    return applicationRepository.findByJob(jobId);
  }

  async updateStatus(
    employerUserId: string,
    applicationId: string,
    status: ApplicationStatus,
  ) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new AppError(404, 'Application not found');

    await this.assertJobOwnership(employerUserId, application.jobId);

    const updated = await applicationRepository.updateStatus(applicationId, status);

    const candidateEmail = updated.candidate.user.email;
    await emailService.sendEmail(candidateEmail, 'APPLICATION_STATUS_CHANGED', {
      jobTitle: updated.job.title,
      status,
    });

    await emailService.createNotification(
      updated.candidate.userId,
      `Application status for ${updated.job.title}: ${status}`,
    );

    if (status === ApplicationStatus.INTERVIEW_SCHEDULED) {
      await emailService.sendEmail(candidateEmail, 'INTERVIEW_SCHEDULED', {
        jobTitle: updated.job.title,
        interviewDate: new Date().toISOString(),
      });
    }

    if (status === ApplicationStatus.OFFER_SENT) {
      await emailService.sendEmail(candidateEmail, 'OFFER_SENT', {
        jobTitle: updated.job.title,
        companyName: updated.job.company.name,
      });
    }

    return updated;
  }

  async withdraw(userId: string, applicationId: string) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError(404, 'Candidate profile not found');

    const application = await applicationRepository.findById(applicationId);
    if (!application || application.candidateId !== profile.id) {
      throw new AppError(404, 'Application not found');
    }

    if (application.status === ApplicationStatus.HIRED) {
      throw new AppError(400, 'Cannot withdraw a hired application');
    }

    return applicationRepository.delete(applicationId);
  }

  async getHistory(userId: string, applicationId: string, role: string) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new AppError(404, 'Application not found');

    if (role === 'CANDIDATE') {
      const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
      if (!profile || application.candidateId !== profile.id) {
        throw new AppError(403, 'Permission denied');
      }
    } else if (role === 'EMPLOYER') {
      await this.assertJobOwnership(userId, application.jobId);
    }

    return application.statusHistory;
  }

  private async assertJobOwnership(employerUserId: string, jobId: string) {
    const employer = await prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer) throw new AppError(403, 'Employer profile not found');

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.companyId !== employer.companyId) {
      throw new AppError(403, 'Permission denied');
    }
  }
}

export const applicationService = new ApplicationService();
