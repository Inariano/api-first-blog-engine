const express = require('express');
const Category = require('../models/Category');
const auth = require('../middlewares/auth');
const logger = require('../utils/logger');
const validate = require('../middlewares/validate');
const { createCategorySchema, updateCategorySchema } = require('../validators/category');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, validate(createCategorySchema), async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const category = new Category({ name, description });
    await category.save();
    res.status(201).json(category.toJSON());
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    logger.error('Create category error:', error);
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category.toJSON());
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, validate(updateCategorySchema), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { name, description } = req.body;
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;

    await category.save();
    res.json(category.toJSON());
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    logger.error('Update category error:', error);
    next(error);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(204).end();
  } catch (error) {
    logger.error('Delete category error:', error);
    next(error);
  }
});

module.exports = router;
