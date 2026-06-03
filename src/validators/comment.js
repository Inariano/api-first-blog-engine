const { z } = require('zod');

const createCommentSchema = z.object({
  content: z.string({ required_error: 'Content is required' })
    .min(1, 'Content is required'),
});

module.exports = { createCommentSchema };
