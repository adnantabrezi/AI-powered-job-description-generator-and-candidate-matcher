import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, UserRole } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository';
import { companyRepository } from '../repositories/company.repository';
import { ENV } from '../config/env';
import { emailService } from '../notifications/email.service';
import { validatePassword } from '../utils/password';
import { AppError } from '../middleware/error.middleware';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, ENV.BCRYPT_SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async registerCandidate(data: { name: string; email: string; password: string }) {
    validatePassword(data.password);

    const existingUser = await authRepository.findUserByEmail(data.email);
    if (existingUser) throw new AppError(409, 'Email already registered');

    const passwordHash = await this.hashPassword(data.password);

    const user = await authRepository.createUser({
      email: data.email,
      passwordHash,
      role: UserRole.CANDIDATE,
    });

    await authRepository.createCandidateProfile({
      userId: user.id,
      fullName: data.name,
    });

    await emailService.sendEmail(data.email, 'REGISTRATION', { name: data.name });

    return { userId: user.id, email: user.email };
  }

  async registerEmployer(data: {
    company_name: string;
    email: string;
    password: string;
  }) {
    validatePassword(data.password);

    const existingUser = await authRepository.findUserByEmail(data.email);
    if (existingUser) throw new AppError(409, 'Email already registered');

    const passwordHash = await this.hashPassword(data.password);

    const user = await authRepository.createUser({
      email: data.email,
      passwordHash,
      role: UserRole.EMPLOYER,
    });

    const company = await companyRepository.create({ name: data.company_name });

    await authRepository.createEmployerProfile({
      userId: user.id,
      companyId: company.id,
    });

    await emailService.sendEmail(data.email, 'REGISTRATION', {
      name: data.company_name,
    });

    return { userId: user.id, email: user.email, companyId: company.id };
  }

  async login(email: string, pass: string): Promise<TokenPair> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new AppError(401, 'Invalid credentials');

    const isValid = await this.comparePassword(pass, user.passwordHash);
    if (!isValid) throw new AppError(401, 'Invalid credentials');

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    return { accessToken, refreshToken, role: user.role };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const tokenData = await authRepository.findRefreshToken(refreshToken);
    if (!tokenData || tokenData.isRevoked || tokenData.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const user = await authRepository.findUserById(tokenData.userId);
    if (!user) throw new AppError(404, 'User not found');

    await authRepository.deleteRefreshToken(refreshToken);

    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await authRepository.saveRefreshToken(user.id, newRefreshToken, expiresAt);

    return { accessToken, refreshToken: newRefreshToken, role: user.role };
  }

  private generateAccessToken(user: User): string {
    return jwt.sign(
      { sub: user.id, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { sub: userId, jti: crypto.randomUUID() },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: ENV.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );
  }
}

export const authService = new AuthService();
