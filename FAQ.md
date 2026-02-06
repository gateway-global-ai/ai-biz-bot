# Frequently Asked Questions (FAQ)

## Getting Started Questions

### Q: What does "getting caught up" mean in this repository?
**A:** "Getting caught up" means understanding:
- The current state of the codebase and what features exist
- Recent changes and merges that have happened
- Known issues and how to handle them
- How to set up your development environment
- The workflow and best practices for the project

**Start here**: [GETTING_STARTED_GUIDE.md](./GETTING_STARTED_GUIDE.md)

### Q: Is the project working? Can I use it?
**A:** Yes! The project builds successfully and is functional. The build process completes without errors, producing:
- Client bundle: ~2.5 MB (651 KB gzipped)
- Server bundle: ~1.7 MB
- Build time: ~10 seconds

There are some optimization opportunities (see below), but nothing that prevents the application from working.

### Q: I heard there are "issues" - should I be worried?
**A:** No. The "issues" are optimization opportunities, not blocking problems:
- **TypeScript memory**: The build works fine; it's just the type checker that needs more memory
- **Security vulnerability**: Low impact, in a transitive dependency, not directly used
- **Performance**: The app works; we just identified areas for improvement
- **Large images**: They load; they just take longer than they should

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for details on each.

## Setup Questions

### Q: What do I need to install to run this?
**A:** You need:
1. **Node.js 20+** - Runtime environment
2. **PostgreSQL** - Database
3. **npm** - Package manager (comes with Node.js)
4. **Environment variables** - API keys and configurations

See the [Installation section](./GETTING_STARTED_GUIDE.md#setting-up-your-development-environment) in the Getting Started Guide.

### Q: Where do I get the API keys?
**A:** You'll need accounts with:
- **Database**: PostgreSQL (local or hosted like Supabase, Railway, Neon)
- **AI**: Kimi API (moonshot.cn) and Google AI Studio
- **Twilio**: For SMS/voice features
- **Google Cloud**: For Maps/Places API
- **Stripe**: For payment processing

Copy `.env.example` to `.env` and fill in your credentials.

### Q: Can I run this without all the API keys?
**A:** Partially. Some features require specific keys:
- **Basic UI**: No keys needed, static pages work
- **Database features**: DATABASE_URL required
- **AI chat**: KIMI_API_KEY or GOOGLE_API_KEY needed
- **SMS/Voice**: TWILIO credentials required
- **Maps/Business**: GOOGLE_MAPS_API_KEY required
- **Payments**: STRIPE keys required

Start with DATABASE_URL and add others as you need features.

## Build & Development Questions

### Q: Why does `npm run check` fail with "out of memory"?
**A:** The TypeScript compiler is trying to analyze the entire large codebase at once, which exceeds the default Node.js memory limit.

**Solutions**:
```bash
# Option 1: Use build instead (recommended)
npm run build

# Option 2: Increase memory
NODE_OPTIONS="--max-old-space-size=4096" npm run check
```

See [TypeScript Memory Issues](./TROUBLESHOOTING.md#typescript-memory-issues) for more options.

### Q: How do I run the application?
**A:** 
```bash
# Development mode (with hot reload)
npm run dev

# Then open http://localhost:5000 in your browser
```

For production:
```bash
npm run build    # Build the app
npm start        # Start production server
```

### Q: The build works but shows warnings - is that okay?
**A:** Yes! The warnings are suggestions for optimization:
- **Large chunk size**: Recommends code splitting (optional)
- **PostCSS warning**: Harmless, about source maps
- **Large images**: Recommends optimization (good idea but not required)

The app works fine with these warnings.

## Issue-Specific Questions

### Q: What's this security vulnerability I heard about?
**A:** There's one moderate severity vulnerability:
- **Package**: lodash (via recharts dependency)
- **Issue**: Prototype Pollution
- **Direct impact**: Low - we don't use lodash directly
- **Mitigation**: Monitor for recharts updates

**Details**: [Security Vulnerabilities](./TROUBLESHOOTING.md#security-vulnerabilities)

### Q: Why is the JavaScript bundle so large?
**A:** The bundle includes:
- React and all UI components
- Charting libraries
- AI integration libraries
- Form handling libraries
- Many Radix UI components

**Solutions**:
- Implement code splitting (recommended)
- Use dynamic imports
- Lazy load heavy components

**Guide**: [Build Warnings](./TROUBLESHOOTING.md#build-warnings)

### Q: Can the 7+ MB images be optimized?
**A:** Yes! These are PNG images that can be significantly reduced:
```bash
# Options:
1. Compress PNGs (can reduce by 50-80%)
2. Convert to WebP (better compression)
3. Use a CDN with automatic optimization
4. Implement lazy loading
```

**Complete guide**: [Performance Issues](./TROUBLESHOOTING.md#performance-issues)

## Workflow Questions

### Q: How do I create a new feature?
**A:**
```bash
# 1. Switch to development branch
git checkout feature/ongoing-development

# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and test
npm run dev    # Test your changes

# 4. Build to verify
npm run build

# 5. Commit and push
git add .
git commit -m "Description of changes"
git push origin feature/your-feature-name
```

See [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) for complete workflow.

### Q: How do I know if my changes break anything?
**A:**
```bash
# 1. Build the project
npm run build

# 2. If build succeeds, you're likely good
# 3. Test the features you changed
npm run dev

# 4. For future: Add tests (currently no test framework)
```

### Q: What branch should I work on?
**A:** 
- **New features**: Branch from `feature/ongoing-development`
- **Bug fixes**: Create a `hotfix/` or `bugfix/` branch
- **Experiments**: Create an `experiment/` branch
- **Never commit directly** to main branches

## Database Questions

### Q: How do I set up the database?
**A:**
```bash
# 1. Ensure PostgreSQL is running
psql --version

# 2. Create a database (or use existing)
createdb your_database_name

# 3. Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@localhost:5432/your_database_name

# 4. Push the schema
npm run db:push
```

### Q: What if `db:push` fails?
**A:** Check:
1. Is PostgreSQL running?
2. Is DATABASE_URL correct?
3. Do you have permissions?

**Complete troubleshooting**: [Database Issues](./TROUBLESHOOTING.md#database-issues)

## Documentation Questions

### Q: Where should I look first?
**A:** Depends on what you need:
- **Just starting**: [GETTING_STARTED_GUIDE.md](./GETTING_STARTED_GUIDE.md)
- **Have a problem**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Understanding the project**: [README.md](./README.md)
- **Current status**: [STATUS.md](./STATUS.md)
- **Recent changes**: [MERGE_SUMMARY.md](./MERGE_SUMMARY.md)
- **Git workflow**: [BRANCH_GUIDE.md](./BRANCH_GUIDE.md)
- **Architecture**: [replit.md](./replit.md)

### Q: Is there API documentation?
**A:** Not yet. This is a recommended next step. For now:
- Check the route definitions in `server/routes.ts`
- Look at the component implementations in `client/src/`
- Review the API calls in page components

## Performance Questions

### Q: How fast should the build be?
**A:** Current benchmarks:
- Client build: ~10 seconds
- Server build: ~0.3 seconds
- Total: ~10-11 seconds

This is normal for a project of this size.

### Q: How can I make the app faster?
**A:** Priority optimizations:
1. **Optimize images** (biggest impact) - Reduce 7+ MB files
2. **Code splitting** (good impact) - Reduce initial bundle
3. **Lazy loading** (good impact) - Load components on demand
4. **CDN for assets** (medium impact) - Offload static files

**Complete guide**: [Performance Issues](./TROUBLESHOOTING.md#performance-issues)

## Next Steps Questions

### Q: What should I work on first?
**A:** Depends on your role:

**If you're a developer adding features**:
1. Set up your environment
2. Get the app running locally
3. Start building your feature

**If you're improving the project**:
1. Optimize the large images (high impact, easy win)
2. Add code splitting (good impact, medium effort)
3. Add a test framework (high value, medium effort)
4. Fix the security vulnerability (low impact, low effort)

See [Next Steps](./GETTING_STARTED_GUIDE.md#next-steps-for-development) for detailed priorities.

### Q: Where can I get help?
**A:** Resources:
1. **Documentation** in this repository
2. **Code comments** in the source files
3. **Similar components** as examples
4. **GitHub Issues** (if available)
5. **Stack Overflow** for general questions

## Quick Command Reference

```bash
# Installation
npm install

# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build            # Build for production
npm start                # Start production server

# Type Checking
npm run check            # Type check (may need more memory)
NODE_OPTIONS="--max-old-space-size=4096" npm run check

# Database
npm run db:push          # Push schema to database

# Security
npm audit                # Check for vulnerabilities
npm audit fix            # Try to auto-fix

# Git
git checkout feature/ongoing-development
git checkout -b feature/your-name
git add .
git commit -m "message"
git push origin feature/your-name
```

## Still Have Questions?

1. **Check**: [GETTING_STARTED_GUIDE.md](./GETTING_STARTED_GUIDE.md)
2. **Check**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. **Search**: Use grep to find examples in the codebase
   ```bash
   grep -r "pattern" client/src/
   ```
4. **Ask**: Create an issue or ask the team

---

**Last Updated**: February 6, 2026  
**Maintained by**: Gateway Global AI Team
