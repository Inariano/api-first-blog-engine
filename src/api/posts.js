const express = require('express');
const Post = require('../models/Post');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/rbac');
const logger = require('../utils/logger');
const validate = require('../middlewares/validate');
const { createPostSchema, updatePostSchema } = require('../validators/post');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const posts = await Post.find({ status: 'published' })
      .populate('author', 'name email')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, requireRole('admin', 'writer'), validate(createPostSchema), async (req, res, next) => {
  try {
    const { title, content, category, tags, status } = req.body;

    const post = new Post({
      title,
      content,
      category,
      tags,
      status,
      author: req.user.id,
    });

    await post.save();
    res.status(201).json(post.toJSON());
  } catch (error) {
    logger.error('Create post error:', error);
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name email')
      .populate('category', 'name slug');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post.toJSON());
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, requireRole('admin', 'writer'), validate(updatePostSchema), async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user.id });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { title, content, category, tags, status } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (category !== undefined) post.category = category;
    if (tags !== undefined) post.tags = tags;
    if (status !== undefined) post.status = status;

    await post.save();
    res.json(post.toJSON());
  } catch (error) {
    logger.error('Update post error:', error);
    next(error);
  }
});

router.delete('/:id', auth, requireRole('admin', 'writer'), async (req, res, next) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user.id });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(204).end();
  } catch (error) {
    logger.error('Delete post error:', error);
    next(error);
  }
});

module.exports = router;
