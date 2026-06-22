import { JobStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { jobMatchRepository } from '../repositories/job.match.repository';

export class DashboardService {
  async getCandidateDashboard(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { user: { include: { resumeFile: true } } },
    });
    if (!profile) throw new Error('Candidate profile not found');

    const [recommendedJobs, recentApplications, notifications] = await Promise.all([
      jobMatchRepository.findMatchesByCandidate(profile.id),
      prisma.application.findMany({
        where: { candidateId: profile.id },
        include: { job: { include: { company: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      recommendedJobs: recommendedJobs.slice(0, 10),
      recentApplications,
      resumeStatus: profile.user.resumeFile
        ? { uploaded: true, updatedAt: profile.user.resumeFile.updatedAt }
        : { uploaded: false },
      notifications,
    };
  }

  async getEmployerDashboard(userId: string) {
    const employer = await prisma.employerProfile.findUnique({ where: { userId } });
    if (!employer) throw new Error('Employer profile not found');

    const [activeJobs, applications, analytics] = await Promise.all([
      prisma.job.findMany({
        where: { companyId: employer.companyId },
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.findMany({
        where: { job: { companyId: employer.companyId } },
        include: {
          candidate: {
            include: {
              user: {
                include: {
                  resumeFile: true,
                },
              },
            },
          },
          job: true,
        },
        orderBy: { matchScore: 'desc' },
        take: 20,
      }),
      prisma.application.groupBy({
        by: ['status'],
        where: { job: { companyId: employer.companyId } },
        _count: { status: true },
      }),
    ]);

    return {
      activeJobs,
      applicants: applications,
      aiRankings: applications.slice(0, 10),
      hiringAnalytics: analytics,
    };
  }

  async getAdminDashboard() {
    const [userCounts, jobCounts, applicationCounts, emailStats] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
      prisma.job.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.application.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.emailLog.groupBy({ by: ['status'], _count: { status: true } }),
    ]);

    return {
      userCounts,
      jobCounts,
      applicationCounts,
      emailStats,
      revenueMetrics: {
        note: 'Revenue tracking placeholder for future billing integration',
        mrr: 0,
        activeSubscriptions: 0,
      },
    };
  }
}

export const dashboardService = new DashboardService();
