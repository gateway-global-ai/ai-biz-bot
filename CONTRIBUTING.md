# Contributing to Gateway Global AI Platform

Thank you for your interest in contributing to Gateway Global AI! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior
- Be respectful and professional in all interactions
- Provide constructive feedback
- Focus on what's best for the project and community
- Show empathy towards other community members

### Unacceptable Behavior
- Harassment, discrimination, or offensive comments
- Trolling or insulting/derogatory remarks
- Publishing others' private information
- Any conduct that would be inappropriate in a professional setting

## Getting Started

### Prerequisites
- Node.js 20 or higher
- PostgreSQL database (local or remote)
- Git for version control
- A GitHub account

### Setting Up Your Development Environment

1. **Fork the Repository**
   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/chat-mvp-merge.git
   cd chat-mvp-merge
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/gateway-global-ai/chat-mvp-merge.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. **Set Up Database**
   ```bash
   npm run db:push
   ```

6. **Verify Setup**
   ```bash
   # Type check
   npm run check
   
   # Build
   npm run build
   
   # Run development server
   npm run dev
   ```

## Development Workflow

### Branch Strategy

We follow a feature branch workflow based on GitFlow principles. See [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) for complete details.

#### Main Branches
- `main` - Production-ready code (protected)
- `develop` - Integration branch for features
- `feature/ongoing-development` - Active development branch

#### Creating a Feature Branch

```bash
# Update your local repository
git checkout feature/ongoing-development
git pull upstream feature/ongoing-development

# Create your feature branch
git checkout -b feature/your-feature-name

# Work on your feature
# ... make changes ...

# Commit your changes
git add .
git commit -m "feat: descriptive commit message"

# Push to your fork
git push origin feature/your-feature-name
```

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream changes into your branch
git checkout feature/ongoing-development
git merge upstream/feature/ongoing-development

# Rebase your feature branch if needed
git checkout feature/your-feature-name
git rebase feature/ongoing-development
```

## Code Standards

### TypeScript Guidelines

- **Always use TypeScript** for new code
- Define proper types, avoid `any` when possible
- Use interfaces for object shapes
- Export types that might be reused

```typescript
// Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<UserProfile> {
  // implementation
}

// Avoid
function getUser(id: any): any {
  // implementation
}
```

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings (unless template literals)
- **Semicolons**: Required
- **Line Length**: Maximum 100 characters (soft limit)
- **Naming**:
  - camelCase for variables and functions
  - PascalCase for classes and components
  - UPPER_CASE for constants
  - kebab-case for file names

### React Component Guidelines

```typescript
// Use functional components with TypeScript
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

### File Organization

```
client/src/
  components/     # Reusable UI components
  pages/          # Page components (routes)
  lib/            # Utilities and hooks
  hooks/          # Custom React hooks
  types/          # TypeScript type definitions

server/
  routes.ts       # API routes
  services/       # Business logic
  middleware/     # Express middleware

shared/
  schema.ts       # Database schema
  types.ts        # Shared TypeScript types
```

### Comments and Documentation

- Write JSDoc comments for public APIs
- Add inline comments for complex logic
- Keep comments up-to-date with code changes
- Use `TODO:`, `FIXME:`, `HACK:` tags appropriately

```typescript
/**
 * Generates an AI-powered website for a business
 * @param businessData - Business information from Google Places
 * @param options - Configuration options for site generation
 * @returns Generated site configuration
 */
export async function generateWebsite(
  businessData: BusinessData,
  options: SiteGenerationOptions
): Promise<SiteConfig> {
  // implementation
}
```

## Testing Guidelines

### Current State
We currently don't have a comprehensive test suite. However, we're planning to implement testing infrastructure. When contributing, please:

1. **Manual Testing**: Thoroughly test your changes manually
2. **Build Verification**: Ensure `npm run build` completes without errors
3. **Type Checking**: Run `npm run check` and fix any TypeScript errors
4. **Browser Testing**: Test in multiple browsers if applicable
5. **Mobile Testing**: Verify responsive design changes

### Future Testing (Coming Soon)
We plan to implement:
- Unit tests with Vitest
- Integration tests for API endpoints
- E2E tests with Playwright
- Component tests with React Testing Library

When the test infrastructure is ready, all new features should include appropriate tests.

## Submitting Changes

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)

#### Examples
```
feat(chat): add voice visualizer to chat interface

Implement voice visualizer that appears inside chat window
when voice button is clicked, replacing message body.

Closes #123

---

fix(api): handle null response from Google Places API

Add null check before processing business data to prevent
runtime errors when API returns empty results.

---

docs: update README with MVP focus and new features

- Add product vision link
- Update feature descriptions
- Reorganize documentation section
```

### Pull Request Process

1. **Create Pull Request**
   - Use GitHub's web interface to create a PR from your feature branch
   - Target the `feature/ongoing-development` branch
   - Use a descriptive title following commit message format
   - Fill out the PR template completely

2. **PR Description Should Include**:
   - Summary of changes
   - Motivation and context
   - Related issue numbers (if applicable)
   - Screenshots (for UI changes)
   - Breaking changes (if any)
   - Checklist of completed items

3. **Before Submitting**:
   - [ ] Code follows project style guidelines
   - [ ] TypeScript check passes (`npm run check`)
   - [ ] Build completes successfully (`npm run build`)
   - [ ] Manual testing completed
   - [ ] Documentation updated (if needed)
   - [ ] Commit messages follow convention
   - [ ] No merge conflicts with target branch

4. **Review Process**:
   - At least one maintainer approval required
   - Address all review comments
   - Keep PR focused on a single feature/fix
   - Be responsive to feedback

5. **After Approval**:
   - Maintainers will merge your PR
   - Delete your feature branch after merge

## Reporting Issues

### Bug Reports

When reporting a bug, please include:

1. **Clear Title**: Descriptive summary of the issue
2. **Description**: What happened vs. what you expected
3. **Steps to Reproduce**:
   ```
   1. Go to '...'
   2. Click on '...'
   3. Scroll down to '...'
   4. See error
   ```
4. **Environment**:
   - Browser and version
   - Operating system
   - Node.js version
   - Any relevant configuration
5. **Screenshots**: If applicable
6. **Error Messages**: Full error logs or stack traces
7. **Additional Context**: Any other relevant information

### Bug Report Template

```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- Browser: Chrome 120
- OS: macOS 14
- Node.js: v20.10.0

## Screenshots
[If applicable]

## Error Messages
```
[Paste error logs here]
```

## Additional Context
Any other information about the problem.
```

## Feature Requests

We welcome feature suggestions! When submitting a feature request:

1. **Search First**: Check if the feature has already been requested
2. **Use Case**: Explain why this feature would be valuable
3. **Proposed Solution**: Describe how you envision it working
4. **Alternatives**: Any alternative solutions you've considered
5. **Additional Context**: Mockups, examples, or references

### Feature Request Template

```markdown
## Feature Summary
A clear description of the feature you'd like to see.

## Problem/Motivation
What problem does this feature solve? Who would benefit?

## Proposed Solution
How should this feature work? Include specific details.

## Alternatives Considered
What other approaches could solve this problem?

## Additional Context
Mockups, examples, or links to similar features.
```

## Development Tips

### Debugging

```bash
# View detailed error logs
NODE_ENV=development npm run dev

# Check TypeScript errors
npm run check

# Inspect database
# Use your PostgreSQL client to connect with DATABASE_URL
```

### Common Issues

**Build Fails**
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version: `node --version` (should be 20+)

**TypeScript Errors**
- Run type check: `npm run check`
- Check for missing type definitions
- Ensure imports are correct

**Database Issues**
- Verify DATABASE_URL in .env
- Run migrations: `npm run db:push`
- Check PostgreSQL is running

### Performance Considerations

- Minimize bundle size (currently 2.5 MB - we're working on it)
- Use lazy loading for large components
- Optimize images before committing
- Consider code splitting for new features

## Questions?

- Check [README.md](./README.md) for project overview
- See [PRODUCT_VISION.md](./PRODUCT_VISION.md) for product strategy
- Read [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md) for repository organization
- Review [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) for Git workflow
- Create a GitHub Discussion for questions

## Recognition

Contributors will be recognized in:
- Release notes for significant contributions
- Special mentions in project announcements
- Potential collaboration opportunities as we grow

Thank you for contributing to Gateway Global AI! Together, we're making AI accessible to small businesses everywhere. 🚀

---

**Last Updated**: February 7, 2026  
**Maintainers**: Gateway Global AI Team
