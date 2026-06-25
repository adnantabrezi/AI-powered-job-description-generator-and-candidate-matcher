import { aiProvider } from '../ai/ai.provider';
import type { JDGenerationInput } from '../ai/ai.provider';
import { prisma } from '../config/database';
import { jobRepository } from '../repositories/job.repository';

export class JDGenerationService {
  /**
   * Generate a complete job description from structured input.
   */
  async generateJobDescription(input: JDGenerationInput) {
    const generated = await aiProvider.generateJobDescription(input);

    return {
      generatedDescription: generated.description,
      technicalSkills: generated.technicalSkills,
      softSkills: generated.softSkills,
      benefits: generated.benefits,
      requirements: generated.requirements,
      input,
    };
  }

  /**
   * Generate interview questions for an existing job.
   */
  async generateInterviewQuestions(jobId: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new Error('Job not found');

    const questions = await aiProvider.generateInterviewQuestions(
      job.description,
      job.title,
    );

    // Delete existing generated questions for this job
    await prisma.interviewQuestion.deleteMany({ where: { jobId } });

    // Save new questions
    const created = await Promise.all(
      questions.map((q) =>
        prisma.interviewQuestion.create({
          data: {
            jobId,
            category: q.category,
            question: q.question,
            guideline: q.guideline,
          },
        }),
      ),
    );

    // Also store as JSON on the job
    await prisma.job.update({
      where: { id: jobId },
      data: { interviewQuestions: questions as any },
    });

    return created;
  }

  /**
   * Analyze salary for a given role.
   */
  async analyzeSalary(params: {
    title: string;
    location: string;
    skills: string[];
    experienceYears?: number;
    salaryMin?: number;
    salaryMax?: number;
  }) {
    return aiProvider.analyzeSalary(
      params.title,
      params.location,
      params.skills,
      params.experienceYears,
      params.salaryMin,
      params.salaryMax,
    );
  }

  /**
   * Create a job with AI-generated content.
   * This generates the description, saves the job, then triggers matching.
   */
  async createJobWithAI(
    companyId: string,
    input: JDGenerationInput & { status?: string },
  ) {
    const generated = await aiProvider.generateJobDescription(input);

    const job = await prisma.job.create({
      data: {
        companyId,
        title: input.title,
        description: generated.description,
        generatedDescription: generated.description,
        location: input.location || 'Remote',
        employmentType: input.employmentType || 'Full-time',
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        remoteStatus: input.remoteStatus || false,
        requiredExperience: input.requiredExperience,
        status: (input.status as any) || 'PUBLISHED',
        benefits: generated.benefits,
        technicalSkills: generated.technicalSkills,
        softSkills: generated.softSkills,
        companyCulture: input.companyCulture,
        responsibilities: input.responsibilities,
      },
      include: {
        company: true,
        skills: { include: { skill: true } },
      },
    });

    // Link extracted skills
    const allSkills = [...generated.technicalSkills, ...generated.softSkills];
    for (const skillName of allSkills.slice(0, 20)) {
      const normalized = skillName.trim();
      if (!normalized) continue;

      const skill = await prisma.skill.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized },
      });

      await prisma.jobSkill.upsert({
        where: { jobId_skillId: { jobId: job.id, skillId: skill.id } },
        update: {},
        create: { jobId: job.id, skillId: skill.id },
      });
    }

    return job;
  }
}

export const jdGenerationService = new JDGenerationService();
