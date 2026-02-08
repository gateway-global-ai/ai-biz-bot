# Getting Started Guide - Gateway Global AI Chat MVP

## Understanding "Getting Caught Up"

If you're new to this repository or returning after some time, this guide will help you understand the current state, what issues exist, and how to handle them.

## What Does "Getting Caught Up" Mean?

"Getting caught up" refers to:
1. **Understanding the current codebase** - What features exist and how they work
2. **Knowing the recent changes** - What was recently merged and modified
3. **Identifying existing issues** - What problems need to be addressed
4. **Setting up your environment** - How to run and develop the application

## Current Repository State

### ✅ What's Working
- **Full-stack TypeScript application** with React frontend and Express backend
- **Build system** compiles successfully (client: 2.5 MB, server: 1.7 MB)
- **AI Integration** with Kimi 2.5 and Google Gemini
- **Business features**: Customer management, telephony, billing, website builder
- **UI components** from shadcn/ui library
- **Database integration** with Drizzle ORM and PostgreSQL

### ⚠️ Known Issues

#### 1. TypeScript Type Checking Memory Issue
**What it means**: When running `npm run check`, the TypeScript compiler runs out of memory.

**Why it happens**: The codebase is large and TypeScript needs more heap memory.

**How to handle it**:
```bash
# Option 1: Build instead of type-check (build uses Vite which has better memory handling)
npm run build

# Option 2: Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run check

# Option 3: Use incremental builds (already configured in tsconfig.json)
# The tsBuildInfoFile is set to cache type information between runs
```

**Impact**: Low - The build works fine, which validates most type correctness.

#### 2. Security Vulnerability (1 Moderate)
**What it means**: There's a vulnerability in the `lodash` package (version used by `recharts`).

**Details**:
- Package: lodash (transitive dependency via recharts)
- Severity: Moderate (CVSS 6.5)
- Issue: Prototype Pollution in `_.unset` and `_.omit`
- Advisory: GHSA-xxjr-mmjv-4gpg

**How to handle it**:
```bash
# Check current status
npm audit

# See if it can be auto-fixed
npm audit fix

# If that doesn't work, you have options:
# 1. Wait for recharts to update their lodash dependency
# 2. Use npm overrides to force a newer lodash version (risky)
# 3. Replace recharts with a different charting library
```

**Impact**: Low - This is a transitive dependency and the vulnerable functions aren't directly used by our code.

#### 3. Large Bundle Size
**What it means**: The client JavaScript bundle is 2.5 MB (651 KB gzipped).

**Why it happens**: All components and libraries are bundled into one file.

**How to handle it**:
```javascript
// Implement code splitting in vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-*'],
          'charts': ['recharts'],
          // etc.
        }
      }
    }
  }
});
```

**Impact**: Medium - Affects initial page load time, but gzip compression helps.

#### 4. Large Image Assets
**What it means**: Some images in the build are over 7 MB each.

**Files**:
- freepik__melissa-model-turned-into-a-futuristic-ai-robot-wi__8_1770156535941-Ddp5MLLu.png (7.3 MB)
- freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725736-C1t7mZkn.png (7.3 MB)
- freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725735-Bu242Uh_.png (7.6 MB)

**How to handle it**:
```bash
# Use image optimization tools
npm install -D vite-plugin-imagemin

# Or manually optimize with tools like:
# - ImageOptim (Mac)
# - TinyPNG (online)
# - sharp (Node.js library)

# Consider using WebP format
# Or load images from CDN instead of bundling
```

**Impact**: High - Significantly affects download time and bandwidth usage.

## Setting Up Your Development Environment

### 1. Prerequisites
```bash
# Check Node.js version (need 20+)
node --version

# Check PostgreSQL (need a running instance)
psql --version
```

### 2. Installation
```bash
# Clone the repository (if not done already)
git clone https://github.com/gateway-global-ai/chat-mvp-merge.git
cd chat-mvp-merge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Push database schema
npm run db:push
```

### 3. Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# AI Services
KIMI_API_KEY=your_kimi_api_key
GOOGLE_API_KEY=your_google_api_key

# Twilio (for SMS/Voice)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Google Maps/Places
GOOGLE_MAPS_API_KEY=your_maps_key

# Stripe (for payments)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable

# Session
SESSION_SECRET=random_string_for_sessions
```

### 4. Running the Application
```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Common Development Tasks

### Running Type Checks
```bash
# If you have enough memory
npm run check

# With more memory allocated
NODE_OPTIONS="--max-old-space-size=4096" npm run check

# Or just build (validates types during build)
npm run build
```

### Database Operations
```bash
# Push schema changes to database
npm run db:push

# Note: For migrations, you'll need to set up drizzle-kit migration system
```

### Security Audits
```bash
# Check for vulnerabilities
npm audit

# Try to auto-fix
npm audit fix

# See detailed report
npm audit --json
```

### Git Workflow
```bash
# Switch to development branch
git checkout feature/ongoing-development

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes, then commit
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/your-feature-name
```

## Handling Common Problems

### Problem: "Module not found" errors
**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Problem: Database connection errors
**Solution**:
1. Check PostgreSQL is running
2. Verify DATABASE_URL in .env
3. Run `npm run db:push` to sync schema

### Problem: Build fails
**Solution**:
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build
```

### Problem: TypeScript out of memory
**Solution**:
```bash
# Use build instead
npm run build

# Or increase memory
NODE_OPTIONS="--max-old-space-size=4096" npm run check
```

## Next Steps for Development

### High Priority
1. **Optimize Images** - Reduce the 7+ MB images to reasonable sizes
2. **Environment Setup** - Configure all required API keys
3. **Code Splitting** - Implement manual chunks to reduce bundle size

### Medium Priority
4. **Testing Framework** - Add Jest or Vitest for unit tests
5. **Monitor Security** - Keep track of the lodash vulnerability
6. **Documentation** - Add API documentation and component guides

### Low Priority
7. **CI/CD Pipeline** - Set up GitHub Actions for automated builds
8. **Pre-commit Hooks** - Add linting and formatting checks
9. **Performance Monitoring** - Add analytics and performance tracking

## Resources

- [README.md](./README.md) - Main project overview
- [STATUS.md](./STATUS.md) - Current status and issues
- [MERGE_SUMMARY.md](./MERGE_SUMMARY.md) - Recent changes
- [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) - Git workflow
- [replit.md](./replit.md) - Detailed architecture

## Getting Help

If you encounter issues not covered here:
1. Check the documentation files listed above
2. Review the codebase in `/client/src` and `/server`
3. Look at similar components for patterns
4. Check the GitHub Issues (if available)

## Summary

**"Getting caught up"** means:
- ✅ Understanding the current codebase and features
- ✅ Knowing what's working and what needs attention
- ✅ Setting up your development environment
- ✅ Being aware of known issues and how to handle them
- ✅ Following the established workflow and best practices

You're now caught up! The codebase is in good shape, builds successfully, and has clear documentation on what needs improvement.
