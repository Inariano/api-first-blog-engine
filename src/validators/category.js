const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string({ required_error: 'Name is required' })
    .min(1, 'Name is required'),
  description: z.string().optional().default(''),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  description: z.string().optional(),
});

module.exports = { createCategorySchema, updateCategorySchema };
