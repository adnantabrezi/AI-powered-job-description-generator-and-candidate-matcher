import { Company } from '@prisma/client';
import { prisma } from '../config/database';

export class CompanyRepository {
  async create(data: {
    name: string;
    logoUrl?: string;
    website?: string;
    description?: string;
    industry?: string;
    location?: string;
    employeeCount?: number;
  }): Promise<Company> {
    return prisma.company.create({ data });
  }

  async findById(id: string): Promise<Company | null> {
    return prisma.company.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<Company>): Promise<Company> {
    return prisma.company.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Company> {
    return prisma.company.delete({ where: { id } });
  }

  async findByEmployerId(userId: string): Promise<Company | null> {
    const profile = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { companyId: true },
    });
    if (!profile) return null;
    return prisma.company.findUnique({ where: { id: profile.companyId } });
  }
}

export const companyRepository = new CompanyRepository();
