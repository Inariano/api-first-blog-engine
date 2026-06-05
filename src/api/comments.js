const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/rbac');
const logger = require('../utils/logger');
const validate = require('../middlewares/validate');
const { createCommentSchema } = require('../validators/comment');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, validate(createCommentSchema), async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = new Comment({
      post: postId,
      author: req.user.id,
      content: req.body.content,
    });

    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate('author', 'name email');

    res.status(201).json(populated.toJSON());
  } catch (error) {
    logger.error('Create comment error:', error);
    next(error);
  }
});

router.delete('/:commentId', auth, requireRole('admin', 'writer'), async (req, res, next) => {
  try {
    const { postId, commentId } = req.params;
    const comment = await Comment.findOne({
      _id: commentId,
      post: postId,
      author: req.user.id,
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    await comment.deleteOne();
    res.status(204).end();
  } catch (error) {
    logger.error('Delete comment error:', error);
    next(error);
  }
});

module.exports = router;
