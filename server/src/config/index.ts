import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  REDDIT_API_KEY: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().default('3600'), // 1 hour in seconds
  RATE_LIMIT_WINDOW: z.string().default('60000'), // 1 minute in ms
  RATE_LIMIT_MAX: z.string().default('30'), // 30 requests per window
});

// Validate the environment variables
const envValidation = envSchema.safeParse(process.env);

if (!envValidation.success) {
  console.error('❌ Invalid environment variables:', envValidation.error.format());
  process.exit(1);
}

// Export the validated environment variables
export const config = {
  env: envValidation.data.NODE_ENV,
  port: parseInt(envValidation.data.PORT, 10),
  isProduction: envValidation.data.NODE_ENV === 'production',
  isDevelopment: envValidation.data.NODE_ENV === 'development',
  isTest: envValidation.data.NODE_ENV === 'test',
  
  // API Keys
  redditApiKey: envValidation.data.REDDIT_API_KEY,
  serpApiKey: envValidation.data.SERPAPI_KEY,
  
  // Redis
  redisUrl: envValidation.data.REDIS_URL,
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(envValidation.data.RATE_LIMIT_WINDOW, 10),
    max: parseInt(envValidation.data.RATE_LIMIT_MAX, 10),
  },
  
  // Caching
  cache: {
    ttl: parseInt(envValidation.data.CACHE_TTL, 10),
  },
} as const;

// Export types
export type Config = typeof config;
