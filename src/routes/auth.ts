import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { signupSchema, loginSchema } from '../schemas/validation';
import passport from 'passport';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

interface AuthError extends Error {
  code?: string;
}

// Helper function to generate JWT token
function generateToken(user: { id: string; email: string; username: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY } as jwt.SignOptions
  );
}

// Helper function to send error response
function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): void {
  const response: any = {
    status: 'error',
    code,
    message,
  };
  if (details) {
    response.details = details;
  }
  res.status(statusCode).json(response);
}

// POST /auth/signup
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = signupSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendErrorResponse(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid input data',
        validationResult.error.flatten().fieldErrors
      );
      return;
    }

    const { email, username, password } = validationResult.data;

    // Check if user already exists by email
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      sendErrorResponse(
        res,
        409,
        'USER_EXISTS',
        'User with this email already exists'
      );
      return;
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      sendErrorResponse(
        res,
        409,
        'USERNAME_EXISTS',
        'Username already taken'
      );
      return;
    }

    // Create new user (password will be hashed by pre-save hook)
    const newUser = new User({
      email: email.toLowerCase(),
      username,
      password,
    });

    await newUser.save();

    // Generate JWT token
    const token = generateToken({
      id: newUser._id.toString(),
      email: newUser.email,
      username: newUser.username,
    });

    // Return token and user info (without password)
    res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          username: newUser.username,
        },
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    sendErrorResponse(
      res,
      500,
      'SERVER_ERROR',
      'An error occurred during signup'
    );
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendErrorResponse(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid input data',
        validationResult.error.flatten().fieldErrors
      );
      return;
    }

    const { email, password } = validationResult.data;

    // Find user by email (include password field for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      sendErrorResponse(
        res,
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );
      return;
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      sendErrorResponse(
        res,
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );
      return;
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    // Return token and user info (without password)
    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    sendErrorResponse(
      res,
      500,
      'SERVER_ERROR',
      'An error occurred during login'
    );
  }
});

// GET /auth/github - Initiate GitHub OAuth flow
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email', 'public_repo'],
  })
);

// GET /auth/github/callback - GitHub OAuth callback handler
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false }),
  (req: Request, res: Response): void => {
    try {
      const user = req.user as any;
      if (!user) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}?error=github_auth_failed`);
        return;
      }

      // Generate JWT token for the authenticated user
      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      });

      // Redirect to frontend with token as query parameter
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}?token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.error('GitHub callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}?error=server_error`);
    }
  }
);

// Error handling middleware for auth routes
router.use((err: AuthError, req: Request, res: Response, next: NextFunction): void => {
  console.error('Auth route error:', err);

  if (err.name === 'ValidationError') {
    sendErrorResponse(
      res,
      400,
      'VALIDATION_ERROR',
      'Validation failed',
      err.message
    );
    return;
  }

  if (err.name === 'MongoError' && (err as any).code === 11000) {
    sendErrorResponse(
      res,
      409,
      'DUPLICATE_ENTRY',
      'A record with this information already exists'
    );
    return;
  }

  sendErrorResponse(
    res,
    500,
    'SERVER_ERROR',
    'An unexpected error occurred'
  );
});

export default router;
