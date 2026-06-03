const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().optional(),
  SESSION_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_SECRET: z.string().default('dev-jwt-secret'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error('Invalid environment variables:', envVars.error.format());
  process.exit(1);
}

const config = {
  env: envVars.data.NODE_ENV,
  port: envVars.data.PORT,
  host: envVars.data.HOST,
  mongodb: {
    uri: envVars.data.MONGODB_URI || (envVars.data.NODE_ENV === 'test' ? undefined : null),
  },
  session: {
    secret: envVars.data.SESSION_SECRET,
  },
  jwt: {
    secret: envVars.data.JWT_SECRET,
    expiresIn: envVars.data.JWT_EXPIRES_IN,
  },
};

module.exports = config;
