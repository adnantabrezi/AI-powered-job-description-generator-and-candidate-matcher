import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { resumeRepository } from '../repositories/resume.repository';
import { aiProvider } from '../ai/ai.provider';
import { prisma } from '../config/database';
import { storageProvider } from '../storage/storage.provider';
import { matchingService } from './matching.service';
import { enqueueJob } from '../jobs/jobQueue';
import { jobRepository } from '../repositories/job.repository';

export class ResumeService {
  async processResume(userId: string, file: Express.Multer.File) {
    const relativePath = await storageProvider.save(file, userId);
    const absolutePath = storageProvider.getAbsolutePath(relativePath);
    const rawText = await this.extractText(absolutePath);

    let skills: string[] = [];
    let embedding: number[] | null = null;

    try {
      skills = await aiProvider.extractSkills(rawText);
    } catch (error) {
      console.warn('AI skill extraction failed, saving resume without skills:', error);
    }

    try {
      embedding = await aiProvider.generateEmbedding(rawText);
    } catch (error) {
      console.warn('AI embedding generation failed, saving resume without embedding:', error);
    }

    const resume = await resumeRepository.saveResume(
      userId,
      relativePath,
      rawText,
      embedding,
    );

    if (skills.length > 0) {
      await this.linkSkillsToCandidate(userId, skills);
    }

    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (profile) {
      matchingService.enqueueCandidateMatching(profile.id);
    }

    return resume;
  }

  private async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = await fs.readFile(filePath);

    if (ext === '.pdf') {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text;
    }

    if (ext === '.docx') {
      const data = await mammoth.extractRawText({ buffer });
      return data.value;
    }

    throw new Error('Unsupported file format. Please upload PDF or DOCX.');
  }

  private async linkSkillsToCandidate(userId: string, skills: string[]) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) return;

    for (const skillName of skills) {
      const normalized = skillName.trim();
      if (!normalized) continue;

      const skill = await prisma.skill.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized },
      });

      await prisma.candidateSkill.upsert({
        where: {
          candidateId_skillId: {
            candidateId: profile.id,
            skillId: skill.id,
          },
        },
        update: {},
        create: {
          candidateId: profile.id,
          skillId: skill.id,
          proficiency: 'Unknown',
        },
      });
    }
  }

  async generateJobEmbedding(jobId: string) {
    enqueueJob(`job-embedding:${jobId}`, async () => {
      const job = await jobRepository.findById(jobId);
      if (!job) return;

      const text = `${job.title} ${job.description} ${job.skills.map((s) => s.skill.name).join(' ')}`;
      const embedding = await aiProvider.generateEmbedding(text);

      await prisma.job.update({
        where: { id: jobId },
        data: { embedding },
      });
    });
  }
}

export const resumeService = new ResumeService();
