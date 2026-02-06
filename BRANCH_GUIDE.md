# Branch Management Guide

## Current Branches

### `copilot/merge-recent-commits`
**Purpose**: Integration branch for recent commits  
**Status**: Up-to-date with all merged work  
**Use**: Reference for completed work

### `feature/ongoing-development`
**Purpose**: Active development branch for new features  
**Status**: Ready for development  
**Use**: Base branch for all new feature development

## Branch Strategy

### For New Features
```bash
# Start from the development branch
git checkout feature/ongoing-development

# Create a new feature branch
git checkout -b feature/your-feature-name

# After completing work, commit and push
git add .
git commit -m "Description of changes"
git push origin feature/your-feature-name
```

### For Bug Fixes
```bash
# Create a hotfix branch
git checkout -b hotfix/bug-description

# After fixing, commit and push
git add .
git commit -m "Fix: description of bug fix"
git push origin hotfix/bug-description
```

## Workflow

1. **Development Work** → `feature/ongoing-development`
2. **New Features** → Branch from `feature/ongoing-development`
3. **Integration** → Merge into `feature/ongoing-development`
4. **Release** → Merge stable code to main/production branch

## Branch Naming Conventions

- **Features**: `feature/descriptive-name`
- **Bug Fixes**: `bugfix/issue-description`
- **Hotfixes**: `hotfix/critical-fix`
- **Experiments**: `experiment/what-youre-testing`
- **Documentation**: `docs/what-documentation`

## Important Notes

⚠️ **Never force push** to shared branches  
⚠️ **Always pull before pushing** to avoid conflicts  
✅ **Write descriptive commit messages**  
✅ **Keep commits small and focused**  
✅ **Test before committing**

## Quick Commands

```bash
# View all branches
git branch -a

# Switch to development branch
git checkout feature/ongoing-development

# Pull latest changes
git pull origin feature/ongoing-development

# View current branch status
git status

# View recent commits
git log --oneline -10

# View branches with last commit
git branch -v
```

---
*Last Updated: February 6, 2026*
