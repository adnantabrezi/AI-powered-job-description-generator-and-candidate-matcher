import { User, RefreshToken } from '@prisma/client';
import { prisma } from '../config/database';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    role: User['role'];
  }): Promise<User> {
    return prisma.user.create({ data });
  }

  async createCandidateProfile(data: { userId: string; fullName: string }) {
    return prisma.candidateProfile.create({ data });
  }

  async createEmployerProfile(data: { userId: string; companyId: string }) {
    return prisma.employerProfile.create({ data });
  }

  async saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({ where: { token } });
  }

  async revokeUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }
}

export const authRepository = new AuthRepository();
