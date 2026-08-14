const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const { sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate/Register user via Google OAuth credential
 * @access  Public
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential token is required.',
      });
    }

    // 1. Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token payload.',
      });
    }

    const { sub: googleId, email, name } = payload;

    // 2. Find or create user
    let user = await User.findOne({ email });

    if (user) {
      // Link Google ID if registered via local signup previously
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        await user.save();
      }
    } else {
      user = new User({
        name: name || email.split('@')[0],
        email,
        googleId,
        authProvider: 'google',
      });
      await user.save();

      // Send welcome email
      sendWelcomeEmail(email, user.name);
    }

    // 3. Generate token & return response
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Google authentication failed on server. Please try again.',
    });
  }
});

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user and send welcome email
 * @access  Public
 */
router.post(
  '/signup',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((e) => e.msg),
        });
      }

      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      const user = new User({ name, email, password });
      await user.save();

      const token = generateToken(user._id);
      sendWelcomeEmail(email, name);

      res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error. Please try again later.',
      });
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((e) => e.msg),
        });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Login successful!',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error. Please try again later.',
      });
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
const authMiddleware = require('../middleware/auth');
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt,
      },
    },
  });
});

module.exports = router;