# Troubleshooting Guide

## Dealing with Repository Issues - Solutions Guide

This guide answers common questions about repository issues and provides specific solutions.

## Table of Contents
- [TypeScript Memory Issues](#typescript-memory-issues)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Build Warnings](#build-warnings)
- [Performance Issues](#performance-issues)
- [Environment Setup](#environment-setup)
- [Database Issues](#database-issues)

## TypeScript Memory Issues

### Problem
Running `npm run check` fails with: "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory"

### What This Means
TypeScript's type checker is trying to load and analyze the entire codebase at once, which requires more memory than the default Node.js heap size (typically 512 MB to 2 GB).

### Solutions

#### Option 1: Use Build Instead (Recommended)
The build process uses Vite, which has better memory management:
```bash
npm run build
```
This validates TypeScript types during the build process without the memory overhead.

#### Option 2: Increase Memory Limit
Allocate more memory to Node.js:
```bash
# Linux/Mac
NODE_OPTIONS="--max-old-space-size=4096" npm run check

# Windows Command Prompt
set NODE_OPTIONS=--max-old-space-size=4096 && npm run check

# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run check
```

#### Option 3: Modify package.json Script
Update the `check` script in `package.json`:
```json
{
  "scripts": {
    "check": "NODE_OPTIONS='--max-old-space-size=4096' tsc"
  }
}
```

#### Option 4: Enable TypeScript Project References
For very large codebases, split into smaller projects:
```json
// tsconfig.json
{
  "references": [
    { "path": "./client" },
    { "path": "./server" }
  ]
}
```

### Prevention
The repository already uses:
- `"incremental": true` - Caches type information between builds
- `"tsBuildInfoFile"` - Stores the incremental cache
- `"skipLibCheck": true` - Skips type checking of declaration files

## Security Vulnerabilities

### Problem
`npm audit` shows: "1 moderate severity vulnerability"

### What This Means
A transitive dependency (lodash, used by recharts) has a known security issue:
- **Package**: lodash
- **Vulnerability**: Prototype Pollution in `_.unset` and `_.omit`
- **Severity**: Moderate (CVSS 6.5)
- **Advisory**: GHSA-xxjr-mmjv-4gpg

### Understanding the Risk
**Prototype Pollution** means an attacker could potentially modify JavaScript's Object prototype, affecting all objects in the application. However:
- This is a **transitive dependency** (recharts → lodash)
- The vulnerable functions may not be used by recharts
- Our code doesn't directly use lodash's `_.unset` or `_.omit`
- **Impact**: Low to Medium in most scenarios

### Solutions

#### Option 1: Try Auto-Fix
```bash
npm audit fix
```
This attempts to update packages to versions without vulnerabilities.

#### Option 2: Force Update Lodash
If recharts hasn't updated yet, force a newer lodash version:
```json
// package.json
{
  "overrides": {
    "lodash": "^4.17.21"
  }
}
```
Then run:
```bash
npm install
npm audit
```

#### Option 3: Replace the Dependency
If recharts continues to have issues, consider alternatives:
- **Recharts alternatives**: Victory, Nivo, Chart.js
- **Analysis**: Check which pages use charts
```bash
# Find chart usage
grep -r "recharts" client/src/
```

#### Option 4: Accept the Risk
If you determine the risk is acceptable:
1. Document the decision
2. Monitor for updates to recharts
3. Set up automated vulnerability scanning

### Monitoring
```bash
# Regular checks
npm audit

# Detailed JSON report
npm audit --json > audit-report.json

# Check for updates
npm outdated
```

## Build Warnings

### Problem 1: Large Chunk Size Warning
```
(!) Some chunks are larger than 500 kB after minification
```

#### What This Means
Your JavaScript bundle is too large, which can slow down initial page load.

#### Solutions

**Implement Code Splitting**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React libraries
          'react-vendor': ['react', 'react-dom', 'react-hook-form'],
          
          // Split UI components
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          
          // Split large libraries
          'charts': ['recharts'],
          'stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'ai': ['@google/generative-ai', 'openai'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1000 kB
  },
});
```

**Use Dynamic Imports**:
```typescript
// Instead of:
import { SomeHeavyComponent } from './SomeHeavyComponent';

// Use:
const SomeHeavyComponent = lazy(() => import('./SomeHeavyComponent'));

// In component:
<Suspense fallback={<Loading />}>
  <SomeHeavyComponent />
</Suspense>
```

### Problem 2: PostCSS Warning
```
A PostCSS plugin did not pass the `from` option to `postcss.parse`
```

#### What This Means
A PostCSS plugin isn't providing source map information.

#### Solutions

Usually harmless, but if you want to fix it:
```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
  // Add this:
  map: {
    inline: false,
    annotation: true,
  },
};
```

### Problem 3: Tailwind Ambiguous Class Warning
```
warn - The class `duration-[2s]` is ambiguous
```

#### Solution
Replace arbitrary values with standard values:
```typescript
// Instead of:
className="duration-[2s]"

// Use:
className="duration-2000"

// Or escape the brackets:
className="duration-\[2s\]"
```

## Performance Issues

### Problem: Large Image Files (7+ MB)

#### What This Means
Multiple PNG images are extremely large, causing slow downloads.

#### Solutions

**Option 1: Optimize Existing PNGs**
```bash
# Install imagemin
npm install -D imagemin imagemin-pngquant

# Create optimization script
node -e "
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');

imagemin(['dist/public/assets/*.png'], {
  destination: 'dist/public/assets',
  plugins: [
    imageminPngquant({ quality: [0.6, 0.8] })
  ]
});
"
```

**Option 2: Convert to WebP**
```bash
# Install sharp
npm install -D sharp

# Convert images
node -e "
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('client/public/assets')
  .filter(f => f.endsWith('.png'));

files.forEach(file => {
  sharp(path.join('client/public/assets', file))
    .webp({ quality: 80 })
    .toFile(path.join('client/public/assets', file.replace('.png', '.webp')));
});
"
```

**Option 3: Use a CDN**
Move large images to a CDN service:
- Cloudinary
- imgix
- AWS S3 + CloudFront

**Option 4: Lazy Load Images**
```typescript
<img 
  src={placeholder} 
  data-src={actualImage} 
  loading="lazy"
  onLoad={loadActualImage}
/>
```

## Environment Setup

### Problem: Application Won't Start

#### Check 1: Environment Variables
```bash
# Verify .env exists
ls -la .env

# Check required variables
cat .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random string for sessions
- `KIMI_API_KEY` - AI service key (optional for basic features)

#### Check 2: Database Connection
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Or manually
psql -h localhost -U your_user -d your_database
```

#### Check 3: Port Availability
```bash
# Check if port 5000 is in use
lsof -i :5000

# Or on Windows
netstat -ano | findstr :5000
```

### Problem: Build Fails

#### Solution 1: Clean Install
```bash
# Remove everything
rm -rf node_modules dist .vite package-lock.json

# Fresh install
npm install

# Build
npm run build
```

#### Solution 2: Check Node Version
```bash
# This project needs Node 20+
node --version

# If wrong version, use nvm
nvm install 20
nvm use 20
```

## Database Issues

### Problem: `npm run db:push` Fails

#### Solution 1: Check Connection
```bash
# Test connection
psql $DATABASE_URL

# If fails, check:
# 1. Is PostgreSQL running?
systemctl status postgresql

# 2. Is the connection string correct?
echo $DATABASE_URL
```

#### Solution 2: Check Permissions
```sql
-- In psql, check user permissions
\du

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE your_db TO your_user;
```

#### Solution 3: Check drizzle.config.ts
```typescript
// Ensure it has correct structure
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Problem: Schema Conflicts

```bash
# Drop and recreate (CAUTION: Deletes all data!)
npm run db:push -- --force

# Or use migrations instead
drizzle-kit generate
drizzle-kit migrate
```

## Getting More Help

If none of these solutions work:

1. **Check the logs**: Look for specific error messages
2. **Search the codebase**: Use grep to find similar patterns
   ```bash
   grep -r "error message" .
   ```
3. **Review documentation**: Check README.md, STATUS.md, and other docs
4. **Check dependencies**: Ensure all packages are compatible
   ```bash
   npm list
   npm outdated
   ```

## Quick Reference

### Common Commands
```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Type check (with memory)
NODE_OPTIONS="--max-old-space-size=4096" npm run check

# Security audit
npm audit

# Database push
npm run db:push

# Clean build
rm -rf dist && npm run build
```

### Useful Debugging
```bash
# Find large files
find . -type f -size +5M -not -path "./node_modules/*"

# Check bundle size
ls -lh dist/public/assets/

# Test imports
node --check server/index.ts

# Environment variables
env | grep -E 'NODE|DATABASE|API'
```

---

**Remember**: Most "issues" in this repository are optimization opportunities, not blocking problems. The application builds and runs successfully!
