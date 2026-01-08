# Authentication System

A complete authentication system built with Express.js, featuring JWT authentication, bcrypt password hashing, and Passport.js GitHub OAuth integration.

## Features

- ✅ User registration with email and password
- ✅ User login with JWT token generation
- ✅ Password hashing using bcrypt (10 rounds)
- ✅ JWT authentication middleware
- ✅ GitHub OAuth integration with Passport.js
- ✅ Encrypted storage of GitHub access tokens
- ✅ Input validation using Zod
- ✅ MongoDB integration with Mongoose
- ✅ Comprehensive error handling
- ✅ TypeScript for type safety

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **OAuth**: Passport.js with GitHub Strategy
- **Validation**: Zod
- **Encryption**: Node.js crypto (AES-256-GCM)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd auth-system
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/auth-system

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=7d

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

ENCRYPTION_KEY=your-32-byte-encryption-key-change-in-prod

FRONTEND_URL=http://localhost:5173
```

5. Set up GitHub OAuth:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App
   - Set the Authorization callback URL to: `http://localhost:3000/auth/github/callback`
   - Copy the Client ID and Client Secret to your `.env` file

## Usage

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## API Endpoints

### Authentication Routes

#### POST /auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "johndoe"
    }
  }
}
```

**Error Response (400) - Validation Error:**
```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

**Error Response (409) - User Exists:**
```json
{
  "status": "error",
  "code": "USER_EXISTS",
  "message": "User with this email already exists"
}
```

---

#### POST /auth/login
Authenticate with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "johndoe"
    }
  }
}
```

**Error Response (401) - Invalid Credentials:**
```json
{
  "status": "error",
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

---

#### GET /auth/github
Initiate GitHub OAuth flow. Redirects to GitHub for authorization.

**Scopes Requested:**
- `user:email` - Access to user's email addresses
- `public_repo` - Access to public repositories

---

#### GET /auth/github/callback
GitHub OAuth callback handler. GitHub redirects here after user authorization.

**Success Response:**
Redirects to `FRONTEND_URL` with JWT token as query parameter:
```
http://localhost:5173?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Error Response:**
Redirects to `FRONTEND_URL` with error parameter:
```
http://localhost:5173?error=github_auth_failed
```

### Protected Routes

#### GET /api/protected
Example protected route requiring JWT authentication.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "You have access to this protected route",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Error Response (401) - Missing Token:**
```json
{
  "status": "error",
  "code": "MISSING_TOKEN",
  "message": "Access token is required"
}
```

**Error Response (401) - Invalid Token:**
```json
{
  "status": "error",
  "code": "INVALID_TOKEN",
  "message": "Invalid access token"
}
```

**Error Response (401) - Expired Token:**
```json
{
  "status": "error",
  "code": "TOKEN_EXPIRED",
  "message": "Access token has expired"
}
```

## Error Response Format

All error responses follow this format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `MISSING_TOKEN` | 401 | JWT token not provided |
| `INVALID_TOKEN` | 401 | JWT token is invalid |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `USER_EXISTS` | 409 | User with this email already exists |
| `USERNAME_EXISTS` | 409 | Username is already taken |
| `DUPLICATE_ENTRY` | 409 | Duplicate database entry |
| `SERVER_ERROR` | 500 | Internal server error |

## Security Features

- ✅ Passwords are hashed using bcrypt with 10 salt rounds
- ✅ JWT tokens expire based on `JWT_EXPIRY` configuration
- ✅ GitHub access tokens are encrypted using AES-256-GCM before storage
- ✅ Passwords are never returned in API responses (selected: false in schema)
- ✅ JWT secret and encryption key loaded from environment variables
- ✅ Input validation on all endpoints using Zod

## User Model Schema

```typescript
{
  _id: ObjectId,
  email: string (unique, required),
  username: string (unique, required, min 3 chars),
  password: string (hashed, not selected by default),
  githubId: string (optional, sparse unique),
  githubAccessToken: string (encrypted, not selected by default),
  githubUsername: string (optional),
  createdAt: Date,
  updatedAt: Date
}
```

## Middleware

### authenticateToken
JWT authentication middleware that:
- Extracts token from `Authorization: Bearer <token>` header
- Verifies token using `JWT_SECRET`
- Attaches decoded user object to `req.user`
- Returns 401 if token is missing, invalid, or expired

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment | development | No |
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `JWT_SECRET` | Secret for JWT signing | - | Yes |
| `JWT_EXPIRY` | JWT token expiration time | 7d | No |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | - | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | - | Yes |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback URL | - | Yes |
| `ENCRYPTION_KEY` | Key for token encryption (32 bytes) | - | Yes |
| `FRONTEND_URL` | Frontend URL for OAuth redirects | http://localhost:5173 | Yes |

## Development

The project includes:
- TypeScript configuration for type safety
- Hot reload in development using `ts-node-dev`
- ESLint-ready structure
- Proper error handling and logging

## License

MIT
