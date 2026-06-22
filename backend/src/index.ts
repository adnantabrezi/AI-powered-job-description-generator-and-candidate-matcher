import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { ENV, validateEnv } from './config/env';
import { setupSwagger } from './config/swagger';
import { authController } from './controllers/auth.controller';
import { jobController } from './controllers/job.controller';
import { resumeController, upload } from './controllers/resume.controller';
import { applicationController } from './controllers/application.controller';
import { searchController } from './controllers/search.controller';
import { dashboardController } from './controllers/dashboard.controller';
import { authenticate, authorize, optionalAuth } from './middleware/auth.middleware';
import { authRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';
import { asyncHandler } from './utils/asyncHandler';
import { UserRole } from '@prisma/client';
import { prisma } from './config/database';

validateEnv();

const app = express();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (ENV.NODE_ENV === 'development' || !origin) {
        callback(null, true);
      } else if (origin === ENV.CORS_ORIGIN) {
        callback(null, true);
      } else {
        const url = new URL(origin);
        const hostname = url.hostname;
        const isLocal =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('172.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.');

        if (isLocal) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

setupSwagger(app);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
app.post('/api/auth/register/candidate', authRateLimiter, asyncHandler(authController.registerCandidate.bind(authController)));
app.post('/api/auth/register/employer', authRateLimiter, asyncHandler(authController.registerEmployer.bind(authController)));
app.post('/api/auth/login', authRateLimiter, asyncHandler(authController.login.bind(authController)));

// Users
app.get('/api/users/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: (req as any).user.id },
    select: {
      id: true,
      email: true,
      role: true,
      candidateProfile: true,
      employerProfile: { include: { company: true } },
    },
  });
  res.json({ user });
}));

// Jobs
app.get('/api/jobs/search', asyncHandler(searchController.search.bind(searchController)));
app.get('/api/jobs', optionalAuth, asyncHandler(jobController.list.bind(jobController)));
app.post('/api/jobs', authenticate, authorize(UserRole.EMPLOYER), asyncHandler(jobController.create.bind(jobController)));
app.patch('/api/jobs/:id/status', authenticate, authorize(UserRole.EMPLOYER), asyncHandler(jobController.updateStatus.bind(jobController)));

// Applications
app.post('/api/applications', authenticate, authorize(UserRole.CANDIDATE), asyncHandler(applicationController.apply.bind(applicationController)));
app.get('/api/applications/me', authenticate, authorize(UserRole.CANDIDATE), asyncHandler(applicationController.getMyApplications.bind(applicationController)));
app.patch('/api/applications/:id/status', authenticate, authorize(UserRole.EMPLOYER), asyncHandler(applicationController.updateStatus.bind(applicationController)));
app.delete('/api/applications/:id', authenticate, authorize(UserRole.CANDIDATE), asyncHandler(applicationController.withdraw.bind(applicationController)));

// Resumes
app.post('/api/resumes/upload', authenticate, authorize(UserRole.CANDIDATE), upload.single('resume'), asyncHandler(resumeController.upload.bind(resumeController)));
app.get('/api/resumes/me', authenticate, authorize(UserRole.CANDIDATE), asyncHandler(resumeController.getResume.bind(resumeController)));
app.delete('/api/resumes/me', authenticate, authorize(UserRole.CANDIDATE), asyncHandler(resumeController.deleteResume.bind(resumeController)));
app.get('/api/resumes/:userId/download', authenticate, asyncHandler(resumeController.downloadResume.bind(resumeController)));

// Dashboards
app.get('/api/dashboard/candidate', authenticate, authorize(UserRole.CANDIDATE), asyncHandler(dashboardController.candidate.bind(dashboardController)));
app.get('/api/dashboard/employer', authenticate, authorize(UserRole.EMPLOYER), asyncHandler(dashboardController.employer.bind(dashboardController)));

app.use(errorHandler);

const PORT = Number(ENV.PORT);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api/docs`);
  });
}

export default app;
