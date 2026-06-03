const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middlewares/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', { title: 'Blog Engine' });
});

router.get('/posts', async (req, res, next) => {
  try {
    const posts = await Post.find({ status: 'published' })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.render('partials/posts', { layout: false, posts });
  } catch (error) {
    next(error);
  }
});

router.get('/posts/:id', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).render('home', { title: 'Not Found' });
    }
    res.render('post', { title: post.title, postId: req.params.id });
  } catch (error) {
    next(error);
  }
});

router.get('/posts/:id/content', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name email')
      .lean();
    if (!post) {
      return res.status(404).send('Post not found');
    }
    res.render('partials/post-content', { layout: false, post });
  } catch (error) {
    next(error);
  }
});

router.get('/posts/:id/comments', async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.render('partials/comments', {
      layout: false,
      comments,
      postId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/posts/:id/comments', auth, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).send('Content is required');
    }

    const comment = new Comment({
      post: req.params.id,
      author: req.user.id,
      content: content.trim(),
    });
    await comment.save();

    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.render('partials/comments', {
      layout: false,
      comments,
      postId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
