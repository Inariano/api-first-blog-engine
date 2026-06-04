const { z } = require('zod');
const sanitizeHtml = require('../utils/sanitize');

const createCommentSchema = z.object({
  content: z.string({ required_error: 'Content is required' })
    .min(1, 'Content is required')
    .transform(sanitizeHtml),
});

module.exports = { createCommentSchema };
