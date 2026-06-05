const { z } = require('zod');
const sanitizeHtml = require('../utils/sanitize');

const createPostSchema = z.object({
  title: z.string({ required_error: 'Title is required' })
    .min(1, 'Title is required')
    .transform(sanitizeHtml),
  content: z.string({ required_error: 'Content is required' })
    .min(1, 'Content is required')
    .transform(sanitizeHtml),
  category: z.string({ required_error: 'Category is required' })
    .min(1, 'Category is required'),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'published']).optional().default('draft'),
});

const updatePostSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').transform(sanitizeHtml).optional(),
  content: z.string().min(1, 'Content cannot be empty').transform(sanitizeHtml).optional(),
  category: z.string().min(1, 'Category cannot be empty').optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

module.exports = { createPostSchema, updatePostSchema };
