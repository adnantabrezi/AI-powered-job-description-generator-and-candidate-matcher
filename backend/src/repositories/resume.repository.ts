import { Prisma, ResumeFile } from '@prisma/client';
import { prisma } from '../config/database';

export class ResumeRepository {
  async saveResume(
    userId: string,
    filePath: string,
    rawText: string,
    embedding: number[] | null,
  ): Promise<ResumeFile> {
    const jsonEmbedding = embedding === null ? Prisma.DbNull : embedding;
    return prisma.resumeFile.upsert({
      where: { userId },
      update: { filePath, rawText, embedding: jsonEmbedding },
      create: { userId, filePath, rawText, embedding: jsonEmbedding },
    });
  }

  async findByUserId(userId: string): Promise<ResumeFile | null> {
    return prisma.resumeFile.findUnique({ where: { userId } });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.resumeFile.delete({ where: { userId } });
  }
}

export const resumeRepository = new ResumeRepository();
