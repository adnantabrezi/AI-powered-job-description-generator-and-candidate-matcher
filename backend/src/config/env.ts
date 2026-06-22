import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-for-dev-only',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-for-dev-only',
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  BCRYPT_SALT_ROUNDS: 12,
  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  AI_BASE_URL: process.env.AI_BASE_URL || 'http://localhost:1234/v1',
  AI_API_KEY: process.env.AI_API_KEY || 'lm-studio',
  AI_MODEL: process.env.AI_MODEL || 'local-model',
  AI_EMBEDDING_MODEL: process.env.AI_EMBEDDING_MODEL || 'local-model',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@jobboard.local',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export const validateEnv = () => {
  const required = ['DATABASE_URL'];
  required.forEach((name) => {
    if (!process.env[name]) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  });
};
