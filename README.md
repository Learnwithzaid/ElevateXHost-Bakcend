# LuxeHost Backend

A complete static site hosting backend built with Express.js, featuring JWT authentication, GitHub OAuth, GitHub repository integration, and automated deployments to Cloudflare Pages and Netlify.

## 🚀 Features

- ✅ User authentication with JWT and bcrypt password hashing
- ✅ GitHub OAuth integration with Passport.js
- ✅ Encrypted storage of GitHub access tokens (AES-256-GCM)
- ✅ GitHub API integration (repositories, branches, commits, content)
- ✅ Project management (CRUD operations)
- ✅ Automated deployments to Cloudflare Pages and Netlify
- ✅ Deployment status tracking and redeployment
- ✅ Rate limiting on all endpoints
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Comprehensive error handling and logging
- ✅ Input validation using Zod
- ✅ TypeScript for type safety
- ✅ Health check endpoint

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken), Passport.js
- **Password Hashing**: bcryptjs
- **OAuth**: GitHub Strategy
- **Validation**: Zod
- **Encryption**: Node.js crypto (AES-256-GCM)
- **GitHub API**: Octokit
- **Deployment Providers**: Cloudflare Pages, Netlify
- **Security**: Helmet, express-rate-limit, CORS

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 6+ (local or MongoDB Atlas)
- GitHub OAuth App (for OAuth integration)
- Cloudflare API Token (for Cloudflare Pages deployments)
- Netlify API Token (for Netlify deployments)

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd luxehost-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env` (see [Environment Variables](#environment-variables) section)

## 🔧 Configuration

### GitHub OAuth Setup

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: LuxeHost (or your app name)
   - **Homepage URL**: `http://localhost:3000` (development)
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. Add them to your `.env` file:
```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

### Database Setup

#### Option 1: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Add it to `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/luxehost?retryWrites=true&w=majority
```

#### Option 2: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use local connection string:
```env
MONGODB_URI=mongodb://localhost:27017/luxehost
```

### Cloudflare Pages Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to "My Profile" > "API Tokens"
3. Create a token with "Cloudflare Pages" permissions
4. Add to `.env`:
```env
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

### Netlify Setup

1. Go to [Netlify](https://app.netlify.com/)
2. Navigate to "User settings" > "Applications" > "Personal access tokens"
3. Create a new access token
4. Add to `.env`:
```env
NETLIFY_API_TOKEN=your_netlify_token_here
```

## 🏃 Running the Server

### Development Mode
```bash
npm run dev
```
Server will start on `http://localhost:3000` with hot reload.

### Production Build
```bash
npm run build
npm start
```

## 📚 API Endpoints

### Health Check

#### `GET /health`
Check server and database health status.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-08T12:00:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

### Authentication Routes

#### `POST /auth/signup`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response (201):**
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

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"johndoe","password":"SecurePass123!"}'
```

#### `POST /auth/login`
Authenticate with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
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

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'
```

#### `GET /auth/github`
Initiate GitHub OAuth flow. Redirects to GitHub for authorization.

**Scopes Requested:** `user:email`, `public_repo`, `repo`

#### `GET /auth/github/callback`
GitHub OAuth callback handler.

**Success:** Redirects to `FRONTEND_URL?token=<jwt_token>`  
**Error:** Redirects to `FRONTEND_URL?error=github_auth_failed`

#### `POST /auth/github`
Link GitHub account to existing user.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "githubAccessToken": "gho_xxxxxxxxxxxx"
}
```

### GitHub Routes

All GitHub routes require JWT authentication via `Authorization: Bearer <token>` header.

#### `GET /github/repos`
List user's GitHub repositories.

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": 123456789,
      "name": "my-website",
      "description": "My personal website",
      "url": "https://github.com/username/my-website",
      "owner": "username",
      "private": false,
      "language": "JavaScript",
      "defaultBranch": "main",
      "stars": 42
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/github/repos \
  -H "Authorization: Bearer <your_jwt_token>"
```

#### `GET /github/repos/:owner/:repo/branches`
List repository branches.

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "name": "main",
      "commit": {
        "sha": "abc123...",
        "url": "https://api.github.com/..."
      }
    }
  ]
}
```

#### `GET /github/repos/:owner/:repo/commits`
List repository commits.

**Query Parameters:**
- `branch` (optional): Branch name (default: default branch)
- `limit` (optional): Number of commits (default: 10, max: 100)

#### `GET /github/repos/:owner/:repo/contents/:path`
Get file or directory contents.

### Projects Routes

All project routes require JWT authentication.

#### `GET /projects`
List user's projects.

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "userId": "507f191e810c19729de860ea",
      "name": "my-portfolio",
      "description": "My portfolio website",
      "githubRepo": "username/my-portfolio",
      "deploymentProvider": "cloudflare",
      "deploymentId": "abc-123-xyz",
      "deploymentUrl": "https://my-portfolio.pages.dev",
      "status": "deployed",
      "lastDeploymentTime": "2024-01-08T12:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-08T12:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer <your_jwt_token>"
```

#### `POST /projects`
Create a new project.

**Request Body:**
```json
{
  "name": "my-blog",
  "description": "My personal blog",
  "githubRepo": "username/my-blog",
  "branch": "main",
  "deploymentProvider": "netlify"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-blog","description":"My personal blog","githubRepo":"username/my-blog","branch":"main","deploymentProvider":"netlify"}'
```

#### `GET /projects/:id`
Get project by ID.

#### `PATCH /projects/:id`
Update project.

**Request Body:**
```json
{
  "name": "my-updated-blog",
  "description": "Updated description"
}
```

#### `DELETE /projects/:id`
Delete project.

#### `GET /projects/:id/deployment-status`
Get current deployment status.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "status": "deployed",
    "url": "https://my-site.pages.dev",
    "lastDeployed": "2024-01-08T12:00:00.000Z",
    "deploymentUrl": "https://my-site.pages.dev"
  }
}
```

#### `POST /projects/:id/redeploy`
Trigger a redeployment.

## 🔒 Security

### Rate Limiting

Different rate limits are applied to different route groups:

- **General routes**: 100 requests per 15 minutes per IP
- **Auth routes**: 5 requests per 15 minutes per IP
- **GitHub routes**: 30 requests per minute per IP
- **Webhook routes**: 50 requests per minute per IP

When rate limit is exceeded, a `429 Too Many Requests` response is returned with a `Retry-After` header.

### Security Headers (Helmet)

The following security headers are automatically applied:
- Content Security Policy (CSP)
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- X-XSS-Protection

### CORS Configuration

Cross-Origin Resource Sharing is configured to:
- Allow requests from `FRONTEND_URL` (configurable)
- Allow credentials (cookies/auth headers)
- Support methods: GET, POST, PATCH, DELETE, OPTIONS
- Expose `X-Total-Count` header for pagination

### Authentication

- Passwords hashed with bcryptjs (10 salt rounds)
- JWT tokens with configurable expiration
- GitHub access tokens encrypted with AES-256-GCM before storage
- No sensitive data in API responses

## ⚠️ Error Handling

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
| `INVALID_CONTENT_TYPE` | 400 | Content-Type must be application/json |
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `MISSING_TOKEN` | 401 | JWT token not provided |
| `INVALID_TOKEN` | 401 | JWT token is invalid |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `UNAUTHORIZED` | 401 | Unauthorized access |
| `GITHUB_NOT_CONNECTED` | 401 | GitHub account not connected |
| `INSUFFICIENT_PERMISSIONS` | 403 | Insufficient permissions for resource |
| `NOT_FOUND` | 404 | Resource not found |
| `PROJECT_NOT_FOUND` | 404 | Project not found |
| `USER_EXISTS` | 409 | User with email already exists |
| `PROJECT_NAME_EXISTS` | 409 | Project name already exists |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `DEPLOYMENT_FAILED` | 502 | Deployment provider API failed |

## 🌍 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `JWT_SECRET` | Secret for JWT signing | - | Yes |
| `JWT_EXPIRY` | JWT token expiration | 7d | No |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | - | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | - | Yes |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback URL | - | Yes |
| `ENCRYPTION_KEY` | 32-byte key for AES-256-GCM | - | Yes |
| `FRONTEND_URL` | Frontend URL(s), comma-separated | http://localhost:5173 | Yes |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | - | Yes* |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | - | Yes* |
| `NETLIFY_API_TOKEN` | Netlify API token | - | Yes* |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 900000 | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 | No |
| `AUTH_RATE_LIMIT_MAX` | Auth requests per window | 5 | No |
| `WEBHOOK_RATE_LIMIT_MAX` | Webhook requests per minute | 50 | No |
| `GITHUB_RATE_LIMIT_MAX` | GitHub requests per minute | 30 | No |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | info | No |

\* Required if using that deployment provider

## 🧪 Testing

### Test Authentication

```bash
# Sign up
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Test1234!"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Protected route
curl -X GET http://localhost:3000/api/protected \
  -H "Authorization: Bearer <your_token>"
```

### Test GitHub Integration

```bash
# List repositories
curl -X GET http://localhost:3000/github/repos \
  -H "Authorization: Bearer <your_token>"

# List branches
curl -X GET http://localhost:3000/github/repos/owner/repo/branches \
  -H "Authorization: Bearer <your_token>"
```

### Test Projects

```bash
# Create project
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-site","githubRepo":"user/repo","deploymentProvider":"cloudflare"}'

# List projects
curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer <your_token>"
```

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- Production environment setup
- MongoDB Atlas configuration
- Docker deployment
- Heroku/Railway/Render deployment
- CI/CD with GitHub Actions
- Health check configuration
- Monitoring and logging

## 🔧 Development

### Project Structure

```
src/
├── config/           # Configuration files (Passport, etc.)
├── constants/        # Error codes and constants
├── middleware/       # Express middleware
│   ├── authMiddleware.ts
│   ├── corsMiddleware.ts
│   ├── errorHandler.ts
│   ├── rateLimiter.ts
│   ├── requestLogger.ts
│   └── validateContentType.ts
├── models/           # Mongoose models
│   ├── User.ts
│   └── Project.ts
├── routes/           # API routes
│   ├── auth.ts
│   ├── github.ts
│   ├── projects.ts
│   └── health.ts
├── schemas/          # Zod validation schemas
├── services/         # External service integrations
│   ├── cloudflareService.ts
│   ├── encryptionService.ts
│   ├── githubService.ts
│   └── netlifyService.ts
├── types/            # TypeScript type definitions
├── utils/            # Utility functions (logger, etc.)
└── server.ts         # Main server file
```

### Middleware Order

Middleware is applied in this specific order:
1. Helmet (security headers)
2. CORS (cross-origin requests)
3. Body parsers (JSON, URL-encoded)
4. Passport initialization
5. Request logger
6. Content-Type validation
7. Rate limiters (per route group)
8. JWT authentication (protected routes only)
9. Routes
10. 404 handler
11. Error handler (must be last)

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new files
- Follow existing code style and patterns
- Add proper error handling
- Validate all inputs with Zod
- Never log sensitive data (passwords, tokens, secrets)
- Write descriptive commit messages
- Update documentation for API changes

## 📧 Support
## GitHub Webhooks

The system supports automatic redeployment via GitHub webhooks on push events.

### Webhook Setup

To enable automatic redeployment for a project:

1.  **Get Webhook Details**: Call `GET /projects/:projectId/webhook-secret` to retrieve your project's unique `webhookSecret` and the `webhookUrl`.
2.  **Configure GitHub**:
    *   Go to your repository settings on GitHub.
    *   Select **Webhooks** > **Add webhook**.
    *   **Payload URL**: Enter the `webhookUrl` (e.g., `https://your-api.com/webhook/github`).
    *   **Content type**: Select `application/json`.
    *   **Secret**: Enter the `webhookSecret`.
    *   **Which events would you like to trigger this webhook?**: Select **Just the push event**.
    *   Click **Add webhook**.

### Testing Webhooks

You can simulate a push event by calling:
`POST /projects/:projectId/webhook/test`

Example using `curl`:
```bash
curl -X POST http://localhost:3000/projects/<projectId>/webhook/test \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Signature Verification

The system verifies all incoming webhooks using HMAC-SHA256 signature verification to ensure they originate from GitHub.

## License

For issues and questions, please open an issue on GitHub.
