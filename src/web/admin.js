const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const config = require('../config');
const webAuth = require('../middlewares/webAuth');
const { createPostSchema, updatePostSchema } = require('../validators/post');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login' });
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect('/web/admin');
  } catch (error) {
    next(error);
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/web/admin/login');
});

router.use(webAuth);

router.get('/', async (req, res, next) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    const stats = {
      total: posts.length,
      published: posts.filter((p) => p.status === 'published').length,
      drafts: posts.filter((p) => p.status === 'draft').length,
    };

    res.render('admin/dashboard', { title: 'Admin Dashboard', posts, stats });
  } catch (error) {
    next(error);
  }
});

router.get('/posts/new', (req, res) => {
  res.render('admin/post-form', {
    title: 'New Post',
    post: null,
  });
});

router.post('/posts', async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      tags: req.body.tags
        ? req.body.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };
    const parsed = createPostSchema.parse(body);
    const post = new Post({
      ...parsed,
      author: req.user.id,
    });
    await post.save();
    res.redirect('/web/admin');
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.render('admin/post-form', {
        title: 'New Post',
        post: null,
        errors: error.errors.map((e) => e.message),
        values: req.body,
      });
    }
    next(error);
  }
});

router.get('/posts/:id/edit', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) {
      return res.redirect('/web/admin');
    }
    res.render('admin/post-form', {
      title: 'Edit Post',
      post,
      values: post,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/posts/:id/edit', async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      tags: req.body.tags
        ? req.body.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };
    const parsed = updatePostSchema.parse(body);
    const post = await Post.findByIdAndUpdate(req.params.id, parsed, {
      new: true,
      runValidators: true,
    });
    if (!post) {
      return res.redirect('/web/admin');
    }
    res.redirect('/web/admin');
  } catch (error) {
    if (error.name === 'ZodError') {
      const post = await Post.findById(req.params.id).lean();
      return res.render('admin/post-form', {
        title: 'Edit Post',
        post,
        values: { ...req.body },
        errors: error.errors.map((e) => e.message),
      });
    }
    next(error);
  }
});

router.post('/posts/:id/delete', async (req, res, next) => {
  try {
    await Comment.deleteMany({ post: req.params.id });
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/web/admin');
  } catch (error) {
    next(error);
  }
});

router.post('/posts/:id/toggle-status', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.redirect('/web/admin');
    }
    post.status = post.status === 'published' ? 'draft' : 'published';
    await post.save();
    res.redirect('/web/admin');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
