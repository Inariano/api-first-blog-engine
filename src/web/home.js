const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Category = require('../models/Category');
const User = require('../models/User');
const config = require('../config');
const auth = require('../middlewares/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).limit(5).lean();
    res.render('home', { title: 'Blog Engine', categories });
  } catch (error) {
    next(error);
  }
});

router.get('/login', (req, res) => {
  const categories = [];
  res.render('login', { title: 'Login', categories });
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const categories = await Category.find().sort({ name: 1 }).limit(5).lean();
      return res.render('login', {
        title: 'Login',
        error: 'Email and password are required',
        categories,
        values: req.body,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      const categories = await Category.find().sort({ name: 1 }).limit(5).lean();
      return res.render('login', {
        title: 'Login',
        error: 'Invalid credentials',
        categories,
        values: req.body,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const categories = await Category.find().sort({ name: 1 }).limit(5).lean();
      return res.render('login', {
        title: 'Login',
        error: 'Invalid credentials',
        categories,
        values: req.body,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (user.role === 'admin') {
      return res.redirect('/web/admin');
    }

    res.redirect('/web');
  } catch (error) {
    next(error);
  }
});

router.get('/register', (req, res) => {
  const categories = [];
  res.render('register', { title: 'Register', categories });
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      const categories = await Category.find().sort({ name: 1 }).limit(5).lean();
      return res.render('register', {
        title: 'Register',
        error: 'All fields are required',
        categories,
        values: req.body,
      });
    }

    if (password.length < 6) {
      const categories = await Category.find().sort({ name: 1 }).limit(5).lean();
      return res.render('register', {
        title: 'Register',
        error: 'Password must be at least 6 characters',
        categories,
        values: req.body,
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      const categories = await Category.find().sort({ name: 1 }).limit(5).lean();
      return res.render('register', {
        title: 'Register',
        error: 'Email already in use',
        categories,
        values: req.body,
      });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect('/web');
  } catch (error) {
    next(error);
  }
});

router.get('/categories/:slug', async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).lean();
    if (!category) {
      return res.status(404).render('home', { title: 'Category Not Found' });
    }

    const posts = await Post.find({ status: 'published', category: category._id })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const categories = await Category.find().sort({ name: 1 }).limit(5).lean();

    res.render('category-posts', {
      title: category.name,
      category,
      posts,
      categories,
    });
  } catch (error) {
    next(error);
  }
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

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/web');
});

module.exports = router;
