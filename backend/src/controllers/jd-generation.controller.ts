import { Response } from 'express';
import { z } from 'zod';
import { jdGenerationService } from '../services/jd-generation.service';
import { companyRepository } from '../repositories/company.repository';
import { AuthRequest } from '../middleware/auth.middleware';

const generateJDSchema = z.object({
  title: z.string().min(3),
  responsibilities: z.array(z.string()).min(1),
  requiredSkills: z.array(z.string()).min(1),
  salaryMin: z.number().nonnegative().optional(),
  salaryMax: z.number().nonnegative().optional(),
  companyCulture: z.string().optional(),
  employmentType: z.string().optional(),
  location: z.string().optional(),
  remoteStatus: z.boolean().optional(),
  requiredExperience: z.number().int().nonnegative().optional(),
});

const salaryAnalysisSchema = z.object({
  title: z.string().min(2),
  location: z.string().min(2),
  skills: z.array(z.string()).default([]),
  experienceYears: z.number().int().nonnegative().optional(),
  salaryMin: z.number().nonnegative().optional(),
  salaryMax: z.number().nonnegative().optional(),
});

export class JDGenerationController {
  /**
   * POST /api/jobs/generate-description
   * Generate a job description without saving (preview mode).
   */
  async generateDescription(req: AuthRequest, res: Response) {
    try {
      const input = generateJDSchema.parse(req.body);
      const result = await jdGenerationService.generateJobDescription(input);
      res.json(result);
    } catch (error: any) {
      console.error("JD Generation Error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.issues });
      } else {
        res.status(400).json({ error: error.message || String(error) });
      }
    }
  }

  /**
   * POST /api/jobs/create-with-ai
   * Generate a JD and create the job in one step.
   */
  async createWithAI(req: AuthRequest, res: Response) {
    try {
      const input = generateJDSchema.parse(req.body);
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const company = await companyRepository.findByEmployerId(userId);
      if (!company) throw new Error('No company associated with this employer');

      const job = await jdGenerationService.createJobWithAI(company.id, input);
      res.status(201).json(job);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/jobs/:id/interview-questions
   * Generate interview questions for an existing job.
   */
  async generateInterviewQuestions(req: AuthRequest, res: Response) {
    try {
      const jobId = req.params.id as string;
      const questions = await jdGenerationService.generateInterviewQuestions(jobId);
      res.json({ questions });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * GET /api/jobs/:id/interview-questions
   * Get existing interview questions for a job.
   */
  async getInterviewQuestions(req: AuthRequest, res: Response) {
    try {
      const { prisma } = await import('../config/database');
      const jobId = req.params.id as string;
      const questions = await prisma.interviewQuestion.findMany({
        where: { jobId },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ questions });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/jobs/salary-analysis
   * Get salary market analysis.
   */
  async analyzeSalary(req: AuthRequest, res: Response) {
    try {
      const params = salaryAnalysisSchema.parse(req.body);
      const analysis = await jdGenerationService.analyzeSalary(params);
      res.json(analysis);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const jdGenerationController = new JDGenerationController();
