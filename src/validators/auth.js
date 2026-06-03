const { z } = require('zod');

const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' })
    .min(1, 'Name is required'),
  email: z.string({ required_error: 'Email is required' })
    .email('Invalid email format'),
  password: z.string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .email('Invalid email format'),
  password: z.string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };
