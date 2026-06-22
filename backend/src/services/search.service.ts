import { JobStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { aiProvider } from '../ai/ai.provider';
import { jobRepository } from '../repositories/job.repository';

export class SearchService {
  async semanticSearch(query: string, page = 1, limit = 20) {
    const publishedJobs = await prisma.job.findMany({
      where: { status: JobStatus.PUBLISHED },
      include: { company: true, skills: { include: { skill: true } } },
    });

    if (publishedJobs.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    try {
      // Generate embedding only for the user's query (one call)
      const queryEmbedding = await aiProvider.generateEmbedding(query);

      // Use stored job embeddings instead of regenerating them
      const jobsWithEmbeddings = publishedJobs
        .filter((job) => job.embedding && Array.isArray(job.embedding))
        .map((job) => ({
          job,
          score: cosineSimilarity(queryEmbedding, job.embedding as unknown as number[]),
        }));

      // If no jobs have embeddings yet, fall back to full-text search
      if (jobsWithEmbeddings.length === 0) {
        return this.fullTextSearch(query, page, limit);
      }

      const sorted = jobsWithEmbeddings
        .sort((a, b) => b.score - a.score)
        .map((item) => item.job);

      const start = (page - 1) * limit;
      const data = sorted.slice(start, start + limit);

      return {
        data,
        meta: {
          total: sorted.length,
          page,
          limit,
          totalPages: Math.ceil(sorted.length / limit),
          searchType: 'semantic',
        },
      };
    } catch {
      return this.fullTextSearch(query, page, limit);
    }
  }

  async fullTextSearch(query: string, page = 1, limit = 20) {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (terms.length === 0) {
      // Return all published jobs if query terms are too short
      const { jobs, total } = await jobRepository.findMany({
        where: { status: JobStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      });

      return {
        data: jobs,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit), searchType: 'fulltext' },
      };
    }

    const { jobs, total } = await jobRepository.findMany({
      where: {
        status: JobStatus.PUBLISHED,
        OR: terms.flatMap((term) => [
          { title: { contains: term, mode: 'insensitive' as const } },
          { description: { contains: term, mode: 'insensitive' as const } },
          { location: { contains: term, mode: 'insensitive' as const } },
        ]),
      },
      orderBy: { createdAt: 'desc' },
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
        searchType: 'fulltext',
      },
    };
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

export const searchService = new SearchService();
