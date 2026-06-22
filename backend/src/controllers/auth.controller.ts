import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { authRepository } from '../repositories/auth.repository';
import { passwordSchema } from '../utils/password';

const registerCandidateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: passwordSchema,
});

const registerEmployerSchema = z.object({
  company_name: z.string().min(2),
  email: z.string().email(),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export class AuthController {
  async registerCandidate(req: Request, res: Response) {
    const data = registerCandidateSchema.parse(req.body);
    const result = await authService.registerCandidate(data);
    res.status(201).json(result);
  }

  async registerEmployer(req: Request, res: Response) {
    const data = registerEmployerSchema.parse(req.body);
    const result = await authService.registerEmployer(data);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);
    const tokens = await authService.login(email, password);
    res.json(tokens);
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.json(tokens);
  }

  async logout(req: Request, res: Response) {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authRepository.deleteRefreshToken(refreshToken);
    res.status(204).send();
  }
}

export const authController = new AuthController();
