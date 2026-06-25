import { pipelineRepository } from '../repositories/pipeline.repository';
import { prisma } from '../config/database';
import { matchingService } from './matching.service';
import { AppError } from '../middleware/error.middleware';

export class PipelineService {
  async createPipeline(
    employerUserId: string,
    data: { name: string; description?: string; criteria?: any; jobId?: string },
  ) {
    const employer = await prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer) throw new AppError(403, 'Employer profile not found');

    return pipelineRepository.create({
      employerId: employer.id,
      ...data,
    });
  }

  async getPipelines(employerUserId: string) {
    const employer = await prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer) throw new AppError(403, 'Employer profile not found');

    return pipelineRepository.findByEmployer(employer.id);
  }

  async getPipelineById(employerUserId: string, pipelineId: string) {
    const pipeline = await pipelineRepository.findById(pipelineId);
    if (!pipeline) throw new AppError(404, 'Pipeline not found');

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer || pipeline.employerId !== employer.id) {
      throw new AppError(403, 'Permission denied');
    }

    return pipeline;
  }

  async addCandidate(
    employerUserId: string,
    pipelineId: string,
    candidateId: string,
    notes?: string,
  ) {
    await this.assertPipelineOwnership(employerUserId, pipelineId);
    return pipelineRepository.addCandidate(pipelineId, candidateId, notes);
  }

  async removeCandidate(
    employerUserId: string,
    pipelineId: string,
    candidateId: string,
  ) {
    await this.assertPipelineOwnership(employerUserId, pipelineId);
    return pipelineRepository.removeCandidate(pipelineId, candidateId);
  }

  async deletePipeline(employerUserId: string, pipelineId: string) {
    await this.assertPipelineOwnership(employerUserId, pipelineId);
    return pipelineRepository.delete(pipelineId);
  }

  /**
   * Auto-populate a pipeline with top-matching candidates.
   * Uses the pipeline's criteria or linked job to find matches.
   */
  async autoPopulate(employerUserId: string, pipelineId: string, limit = 10) {
    const pipeline = await this.getPipelineById(employerUserId, pipelineId);

    let candidateIds: string[] = [];

    if (pipeline.jobId) {
      // Use job matching to find top candidates
      const matches = await prisma.candidateJobMatch.findMany({
        where: { jobId: pipeline.jobId },
        orderBy: { matchScore: 'desc' },
        take: limit,
        select: { candidateId: true },
      });
      candidateIds = matches.map((m) => m.candidateId);
    } else {
      // Use criteria-based search (skill matching)
      const criteria = pipeline.criteria as { skills?: string[] } | null;
      const skillNames = criteria?.skills || [];

      if (skillNames.length > 0) {
        const candidates = await prisma.candidateProfile.findMany({
          where: {
            skills: {
              some: {
                skill: { name: { in: skillNames, mode: 'insensitive' } },
              },
            },
          },
          take: limit,
          select: { id: true },
        });
        candidateIds = candidates.map((c) => c.id);
      } else {
        // Fallback: get most recent candidates with resumes
        const candidates = await prisma.candidateProfile.findMany({
          where: { user: { resumeFile: { isNot: null } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: { id: true },
        });
        candidateIds = candidates.map((c) => c.id);
      }
    }

    // Add candidates that aren't already in the pipeline
    const existing = pipeline.candidates.map((c: any) => c.candidateId);
    const newIds = candidateIds.filter((id) => !existing.includes(id));

    const added = [];
    for (const candidateId of newIds) {
      try {
        const entry = await pipelineRepository.addCandidate(
          pipelineId,
          candidateId,
          'Auto-populated by AI',
        );
        added.push(entry);
      } catch {
        // Skip duplicates
      }
    }

    return { added: added.length, total: existing.length + added.length };
  }

  private async assertPipelineOwnership(employerUserId: string, pipelineId: string) {
    const pipeline = await pipelineRepository.findById(pipelineId);
    if (!pipeline) throw new AppError(404, 'Pipeline not found');

    const employer = await prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer || pipeline.employerId !== employer.id) {
      throw new AppError(403, 'Permission denied');
    }
  }
}

export const pipelineService = new PipelineService();
