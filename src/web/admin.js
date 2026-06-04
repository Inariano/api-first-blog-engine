const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Category = require('../models/Category');
const config = require('../config');
const webAuth = require('../middlewares/webAuth');
const { csrfValidate } = require('../middlewares/csrf');
const { createPostSchema, updatePostSchema } = require('../validators/post');
const { createCategorySchema, updateCategorySchema } = require('../validators/category');

const router = express.Router();

router.use(csrfValidate);

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

    if (user.status === 'blocked') {
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Your account has been blocked',
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

    req.session.success = 'Logged in successfully';
    res.redirect('/web/admin');
  } catch (error) {
    next(error);
  }
});

router.get('/logout', (req, res) => {
  req.session?.destroy?.();
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

    res.render('admin/dashboard', { layout: 'admin', title: 'Admin Dashboard', posts, stats, user: req.user });
  } catch (error) {
    next(error);
  }
});

router.get('/posts/new', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.render('admin/post-form', {
      layout: 'admin',
      title: 'New Post',
      post: null,
      categories,
    });
  } catch (error) {
    next(error);
  }
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
    req.session.success = 'Post created successfully';
    res.redirect('/web/admin');
  } catch (error) {
    if (error.name === 'ZodError') {
      const categories = await Category.find().sort({ name: 1 }).lean();
      return res.render('admin/post-form', {
        layout: 'admin',
        title: 'New Post',
        post: null,
        categories,
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
      req.session.error = 'Post not found';
      return res.redirect('/web/admin');
    }
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.render('admin/post-form', {
      layout: 'admin',
      title: 'Edit Post',
      post,
      categories,
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
      req.session.error = 'Post not found';
      return res.redirect('/web/admin');
    }
    req.session.success = 'Post updated successfully';
    res.redirect('/web/admin');
  } catch (error) {
    if (error.name === 'ZodError') {
      const post = await Post.findById(req.params.id).lean();
      const categories = await Category.find().sort({ name: 1 }).lean();
      return res.render('admin/post-form', {
        layout: 'admin',
        title: 'Edit Post',
        post,
        categories,
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
    req.session.success = 'Post deleted successfully';
    res.redirect('/web/admin');
  } catch (error) {
    next(error);
  }
});

router.post('/posts/:id/toggle-status', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      req.session.error = 'Post not found';
      return res.redirect('/web/admin');
    }
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    post.status = newStatus;
    await post.save();
    req.session.success = `Post ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`;
    res.redirect('/web/admin');
  } catch (error) {
    next(error);
  }
});

// Category CRUD

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.render('admin/categories', { layout: 'admin', title: 'Categories', categories });
  } catch (error) {
    next(error);
  }
});

router.get('/categories/new', (req, res) => {
  res.render('admin/category-form', {
    layout: 'admin',
    title: 'New Category',
    category: null,
  });
});

router.post('/categories', async (req, res, next) => {
  try {
    const parsed = createCategorySchema.parse(req.body);
    const category = new Category(parsed);
    await category.save();
    req.session.success = 'Category created successfully';
    res.redirect('/web/admin/categories');
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.render('admin/category-form', {
        layout: 'admin',
        title: 'New Category',
        category: null,
        errors: error.errors.map((e) => e.message),
        values: req.body,
      });
    }
    if (error.code === 11000) {
      return res.render('admin/category-form', {
        layout: 'admin',
        title: 'New Category',
        category: null,
        errors: ['Category already exists'],
        values: req.body,
      });
    }
    next(error);
  }
});

router.get('/categories/:id/edit', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      req.session.error = 'Category not found';
      return res.redirect('/web/admin/categories');
    }
    res.render('admin/category-form', {
      layout: 'admin',
      title: 'Edit Category',
      category,
      values: category,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/categories/:id/edit', async (req, res, next) => {
  try {
    const parsed = updateCategorySchema.parse(req.body);
    const category = await Category.findByIdAndUpdate(req.params.id, parsed, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      req.session.error = 'Category not found';
      return res.redirect('/web/admin/categories');
    }
    req.session.success = 'Category updated successfully';
    res.redirect('/web/admin/categories');
  } catch (error) {
    if (error.name === 'ZodError') {
      const category = await Category.findById(req.params.id).lean();
      return res.render('admin/category-form', {
        layout: 'admin',
        title: 'Edit Category',
        category,
        values: { ...req.body },
        errors: error.errors.map((e) => e.message),
      });
    }
    if (error.code === 11000) {
      const category = await Category.findById(req.params.id).lean();
      return res.render('admin/category-form', {
        layout: 'admin',
        title: 'Edit Category',
        category,
        values: { ...req.body },
        errors: ['Category already exists'],
      });
    }
    next(error);
  }
});

router.post('/categories/:id/delete', async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    req.session.success = 'Category deleted successfully';
    res.redirect('/web/admin/categories');
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.render('admin/users', {
      layout: 'admin',
      title: 'Users',
      currentPage: 'users',
      users,
      currentUserId: req.user.id,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/block', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    user.status = newStatus;
    await user.save();
    req.session.success = `User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`;
    res.redirect('/web/admin/users');
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/make-author', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.role = 'writer';
    await user.save();
    req.session.success = 'User promoted to author successfully';
    res.redirect('/web/admin/users');
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/delete', async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    req.session.success = 'User deleted successfully';
    res.redirect('/web/admin/users');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
