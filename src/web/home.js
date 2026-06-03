const express = require('express');
const Post = require('../models/Post');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', { title: 'Blog Engine' });
});

router.get('/posts', async (req, res, next) => {
  try {
    const posts = await Post.find({ status: 'published' })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.render('partials/posts', { layout: false, posts });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
