# How to Apply Deprecation Templates

This guide provides step-by-step instructions for applying the deprecation templates from [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md) to the 5 deprecated Gateway Global AI repositories.

## Prerequisites

### Required Permissions
- **Admin access** to the deprecated repositories
- **Write access** to the gateway-global-ai organization

### Before You Start
1. ✅ Review [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md) to understand the deprecation strategy
2. ✅ Review [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md) for the templates
3. ✅ Ensure you have the current date ready (February 2026)
4. ✅ Have GitHub web interface and/or git command line ready

## Quick Reference

### Repositories to Deprecate (5 total)

| Repository | Template | Status |
|------------|----------|--------|
| [gateway-global-ai-browser-chat](https://github.com/gateway-global-ai/gateway-global-ai-browser-chat) | Template 1 | Has valuable assets |
| [ai-chat](https://github.com/gateway-global-ai/ai-chat) | Template 2 | Fully replaced |
| [ai-task-manager-gateway-global](https://github.com/gateway-global-ai/ai-task-manager-gateway-global) | Template 3 | Consolidated |
| [serp-flights-server-gateway-global-ai](https://github.com/gateway-global-ai/serp-flights-server-gateway-global-ai) | Template 4 | Future travel use |
| [workspace](https://github.com/gateway-global-ai/workspace) | Template 5 | Fully integrated |

---

## Method 1: Web Interface (Recommended for Beginners)

This method uses GitHub's web interface to edit files directly.

### Step-by-Step Process

For each repository, follow these steps:

#### Phase 1: Update README

1. **Navigate to Repository**
   - Go to `https://github.com/gateway-global-ai/[repository-name]`
   - Example: `https://github.com/gateway-global-ai/gateway-global-ai-browser-chat`

2. **Edit README.md**
   - Click on `README.md` in the file list
   - Click the pencil icon (✏️) to edit
   - **IMPORTANT**: Keep the old README below the deprecation notice for reference

3. **Add Deprecation Notice**
   - Copy the appropriate template from [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md)
   - Add the archived badge at the very top:
     ```markdown
     [![Archived](https://img.shields.io/badge/status-archived-red)]()
     ```
   - Paste the deprecation notice template below the badge
   - Update `[Date]` placeholders with actual date (e.g., "February 7, 2026")
   - Add a horizontal rule (`---`) after the deprecation notice
   - Add a note: `## Original README (For Historical Reference)`
   - Keep the original README content below

4. **Commit Changes**
   - Scroll to bottom
   - Commit message: `docs: Add deprecation notice - repository archived`
   - Commit description: `This repository has been deprecated. All functionality moved to chat-mvp-merge.`
   - Click "Commit changes"

#### Phase 2: Update Repository Settings

1. **Go to Repository Settings**
   - Click "Settings" tab in the repository
   - Scroll down to see all options

2. **Update Repository Description**
   - In the "General" section at top
   - Click the gear icon next to "About"
   - Update description to: `⚠️ DEPRECATED - See chat-mvp-merge`
   - Add topics: `deprecated`, `archived`, `migrated`
   - Click "Save changes"

3. **Disable Issues** (if enabled)
   - In the "General" section
   - Under "Features"
   - Uncheck "Issues"

4. **Disable Pull Requests** (if possible)
   - Note: GitHub doesn't allow disabling PRs, they auto-disable on archive
   - Skip this step, it will happen automatically

5. **Disable Wiki** (if enabled)
   - In the "General" section
   - Under "Features"
   - Uncheck "Wikis"

6. **Disable Projects** (if enabled)
   - In the "General" section
   - Under "Features"
   - Uncheck "Projects"

#### Phase 3: Archive Repository

1. **Scroll to Danger Zone**
   - Still in Settings
   - Scroll all the way to bottom
   - Find "Danger Zone" section (red background)

2. **Archive Repository**
   - Click "Archive this repository"
   - Read the warning message carefully
   - Type the repository name to confirm
   - Click "I understand the consequences, archive this repository"

3. **Verify Archive**
   - You'll be redirected to the repository main page
   - Look for yellow banner: "This repository has been archived by the owner"
   - "Watch", "Fork", and "Star" buttons are still visible
   - Issues and PRs are now read-only

---

## Method 2: Command Line (Advanced Users)

This method uses Git and GitHub CLI for faster bulk operations.

### Prerequisites

```bash
# Install GitHub CLI if not already installed
# macOS
brew install gh

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Authenticate with GitHub
gh auth login
```

### Automated Script

Save this script as `apply_deprecations.sh`:

```bash
#!/bin/bash

# Configuration
ORG="gateway-global-ai"
REPOS=(
  "gateway-global-ai-browser-chat"
  "ai-chat"
  "ai-task-manager-gateway-global"
  "serp-flights-server-gateway-global-ai"
  "workspace"
)
TEMPLATES=(
  "Template 1: gateway-global-ai-browser-chat"
  "Template 2: ai-chat"
  "Template 3: ai-task-manager-gateway-global"
  "Template 4: serp-flights-server-gateway-global-ai"
  "Template 5: workspace"
)
CURRENT_DATE=$(date +"%B %Y")

echo "🚀 Starting deprecation process for ${#REPOS[@]} repositories..."
echo ""

for i in "${!REPOS[@]}"; do
  REPO="${REPOS[$i]}"
  TEMPLATE_NAME="${TEMPLATES[$i]}"
  
  echo "================================================="
  echo "📦 Processing: $REPO"
  echo "📄 Using: $TEMPLATE_NAME"
  echo "================================================="
  
  # Clone repository
  echo "1️⃣ Cloning repository..."
  if [ -d "$REPO" ]; then
    rm -rf "$REPO"
  fi
  gh repo clone "$ORG/$REPO" || {
    echo "❌ Failed to clone $REPO"
    continue
  }
  
  cd "$REPO" || continue
  
  # Backup original README
  echo "2️⃣ Backing up original README..."
  cp README.md README_ORIGINAL.md
  
  # TODO: Extract template from DEPRECATION_TEMPLATES.md
  # For now, this requires manual template insertion
  echo "3️⃣ ⚠️  MANUAL STEP REQUIRED:"
  echo "   Please edit README.md to add the deprecation notice"
  echo "   Using template: $TEMPLATE_NAME"
  echo ""
  echo "   Press Enter when done editing README.md..."
  read -r
  
  # Commit changes
  echo "4️⃣ Committing changes..."
  git add README.md
  git commit -m "docs: Add deprecation notice - repository archived

This repository has been deprecated. All functionality moved to chat-mvp-merge.
See: https://github.com/gateway-global-ai/chat-mvp-merge"
  
  git push origin main || git push origin master || {
    echo "⚠️  Failed to push. Check branch name and try manually."
  }
  
  cd ..
  
  # Update repository settings using GitHub CLI
  echo "5️⃣ Updating repository settings..."
  
  # Update description
  gh repo edit "$ORG/$REPO" \
    --description "⚠️ DEPRECATED - See chat-mvp-merge" \
    --add-topic deprecated \
    --add-topic archived \
    --add-topic migrated || echo "⚠️  Failed to update settings"
  
  # Disable features (GitHub CLI doesn't support all features yet)
  echo "6️⃣ ⚠️  MANUAL STEPS REQUIRED in GitHub web interface:"
  echo "   - Disable Issues"
  echo "   - Disable Wiki"
  echo "   - Disable Projects"
  echo ""
  
  echo "✅ Completed: $REPO"
  echo ""
  
  # Cleanup
  rm -rf "$REPO"
done

echo "================================================="
echo "🎉 Automated steps completed!"
echo ""
echo "⚠️  FINAL MANUAL STEPS (for each repository):"
echo "1. Go to https://github.com/$ORG/[repo-name]/settings"
echo "2. Disable Issues, Wiki, Projects in Features section"
echo "3. Scroll to Danger Zone"
echo "4. Click 'Archive this repository'"
echo "5. Type repository name to confirm"
echo "6. Click 'I understand the consequences, archive this repository'"
echo "================================================="
```

Make it executable and run:

```bash
chmod +x apply_deprecations.sh
./apply_deprecations.sh
```

### Manual Command Line Steps

For each repository:

```bash
# 1. Clone the repository
gh repo clone gateway-global-ai/[repository-name]
cd [repository-name]

# 2. Create a new branch
git checkout -b deprecate-repository

# 3. Edit README.md (use your preferred editor)
nano README.md
# OR
vim README.md
# OR
code README.md

# Add the archived badge and deprecation notice from DEPRECATION_TEMPLATES.md
# Keep original README below for reference

# 4. Commit and push
git add README.md
git commit -m "docs: Add deprecation notice - repository archived"
git push origin deprecate-repository

# 5. Create PR (or push directly to main if you have permissions)
gh pr create --title "Add deprecation notice" --body "This repository is being archived. All functionality has moved to chat-mvp-merge."

# 6. Merge PR (or push directly to main)
gh pr merge --auto --squash

# 7. Update repository settings
gh repo edit gateway-global-ai/[repository-name] \
  --description "⚠️ DEPRECATED - See chat-mvp-merge" \
  --add-topic deprecated \
  --add-topic archived \
  --add-topic migrated

# 8. Archive repository (requires web interface - see Web Method above)
```

---

## Detailed Instructions by Repository

### Repository 1: gateway-global-ai-browser-chat

**Template**: Template 1 from [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md)

**Special Notes**:
- This repo has valuable assets (travel agent features, GRN, behavioral controls)
- Make sure these are noted in the deprecation notice

**Steps**:
1. Copy Template 1 from DEPRECATION_TEMPLATES.md
2. Add archived badge: `[![Archived](https://img.shields.io/badge/status-archived-red)]()`
3. Update README.md with deprecation notice
4. Keep original README below
5. Commit: `docs: Add deprecation notice - repository archived`
6. Update description: `⚠️ DEPRECATED - See chat-mvp-merge`
7. Add topics: `deprecated`, `archived`, `migrated`
8. Disable Issues, Wiki, Projects
9. Archive repository

**Verification**:
- [ ] Archived badge visible at top of README
- [ ] Deprecation notice is clear and links to chat-mvp-merge
- [ ] Original README is preserved below
- [ ] Repository shows yellow "archived" banner
- [ ] Issues are disabled
- [ ] Description updated

---

### Repository 2: ai-chat

**Template**: Template 2 from [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md)

**Special Notes**:
- Simpler template - this was a development prototype
- Full replacement, no migration needed

**Steps**:
1. Copy Template 2 from DEPRECATION_TEMPLATES.md
2. Add archived badge
3. Update README.md
4. Commit and push
5. Update settings and archive

**Verification**:
- [ ] Deprecation notice applied
- [ ] Repository archived
- [ ] Description updated

---

### Repository 3: ai-task-manager-gateway-global

**Template**: Template 3 from [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md)

**Special Notes**:
- Emphasizes consolidation into main platform
- Highlights task management features in new platform

**Steps**:
1. Copy Template 3 from DEPRECATION_TEMPLATES.md
2. Add archived badge
3. Update README.md
4. Commit and push
5. Update settings and archive

**Verification**:
- [ ] Deprecation notice applied
- [ ] Repository archived
- [ ] Description updated

---

### Repository 4: serp-flights-server-gateway-global-ai

**Template**: Template 4 from [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md)

**Special Notes**:
- Different approach - notes future integration plans
- References travel-gateway-V1 and Q3 2026 timeline
- Links to ROADMAP.md

**Steps**:
1. Copy Template 4 from DEPRECATION_TEMPLATES.md
2. Add archived badge
3. Update README.md
4. Commit and push
5. Update settings and archive

**Verification**:
- [ ] Deprecation notice applied
- [ ] Future integration plans mentioned
- [ ] Repository archived
- [ ] Description updated

---

### Repository 5: workspace

**Template**: Template 5 from [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md)

**Special Notes**:
- Highlights complete Google Workspace integration in new platform
- Lists all integrated features (Drive, Calendar, Tasks, Docs, Sheets)
- Links to GOOGLE_WORKSPACE_INTEGRATION.md

**Steps**:
1. Copy Template 5 from DEPRECATION_TEMPLATES.md
2. Add archived badge
3. Update README.md
4. Commit and push
5. Update settings and archive

**Verification**:
- [ ] Deprecation notice applied
- [ ] Integration features listed
- [ ] Repository archived
- [ ] Description updated

---

## Complete Checklist

Use this checklist to track progress across all 5 repositories:

### gateway-global-ai-browser-chat
- [ ] README updated with Template 1
- [ ] Archived badge added
- [ ] Original README preserved
- [ ] Changes committed and pushed
- [ ] Description updated to "⚠️ DEPRECATED - See chat-mvp-merge"
- [ ] Topics added: deprecated, archived, migrated
- [ ] Issues disabled
- [ ] Wiki disabled
- [ ] Projects disabled
- [ ] Repository archived
- [ ] Yellow banner visible
- [ ] GITHUB_STRATEGY.md updated

### ai-chat
- [ ] README updated with Template 2
- [ ] Archived badge added
- [ ] Original README preserved
- [ ] Changes committed and pushed
- [ ] Description updated to "⚠️ DEPRECATED - See chat-mvp-merge"
- [ ] Topics added: deprecated, archived, migrated
- [ ] Issues disabled
- [ ] Wiki disabled
- [ ] Projects disabled
- [ ] Repository archived
- [ ] Yellow banner visible
- [ ] GITHUB_STRATEGY.md updated

### ai-task-manager-gateway-global
- [ ] README updated with Template 3
- [ ] Archived badge added
- [ ] Original README preserved
- [ ] Changes committed and pushed
- [ ] Description updated to "⚠️ DEPRECATED - See chat-mvp-merge"
- [ ] Topics added: deprecated, archived, migrated
- [ ] Issues disabled
- [ ] Wiki disabled
- [ ] Projects disabled
- [ ] Repository archived
- [ ] Yellow banner visible
- [ ] GITHUB_STRATEGY.md updated

### serp-flights-server-gateway-global-ai
- [ ] README updated with Template 4
- [ ] Archived badge added
- [ ] Original README preserved
- [ ] Changes committed and pushed
- [ ] Description updated to "⚠️ DEPRECATED - See chat-mvp-merge"
- [ ] Topics added: deprecated, archived, migrated
- [ ] Issues disabled
- [ ] Wiki disabled
- [ ] Projects disabled
- [ ] Repository archived
- [ ] Yellow banner visible
- [ ] GITHUB_STRATEGY.md updated

### workspace
- [ ] README updated with Template 5
- [ ] Archived badge added
- [ ] Original README preserved
- [ ] Changes committed and pushed
- [ ] Description updated to "⚠️ DEPRECATED - See chat-mvp-merge"
- [ ] Topics added: deprecated, archived, migrated
- [ ] Issues disabled
- [ ] Wiki disabled
- [ ] Projects disabled
- [ ] Repository archived
- [ ] Yellow banner visible
- [ ] GITHUB_STRATEGY.md updated

### Final Documentation Updates
- [ ] Update GITHUB_STRATEGY.md with archive dates
- [ ] Update organization .github profile
- [ ] Announce deprecations (if needed)

---

## Troubleshooting

### "I don't have admin access"
- **Solution**: Contact the repository owner or organization admin
- Required role: Admin or Owner

### "The archive button is greyed out"
- **Cause**: Repository has open pull requests or other blocking issues
- **Solution**: Close all pull requests first, then archive

### "I can't edit the README via web interface"
- **Cause**: Branch protection rules
- **Solution**: Use the command line method or ask an admin to temporarily disable protection

### "Template doesn't match my repository structure"
- **Solution**: Adapt the template as needed but keep key elements:
  - Deprecation notice
  - Link to chat-mvp-merge
  - Migration path
  - Reason for deprecation

### "I want to un-archive a repository"
- **Process**: 
  1. Go to repository Settings
  2. Scroll to Danger Zone
  3. Click "Unarchive this repository"
  4. Confirm
- **Note**: Only do this if deprecation was a mistake

---

## After Archiving

### What Changes?

**For Repository Visitors:**
- Yellow banner appears: "This repository has been archived by the owner"
- README shows deprecation notice
- Code is still readable
- Issues/PRs are read-only
- Can still fork, star, and clone

**For Repository Owners:**
- Cannot push new commits
- Cannot create/modify issues or PRs
- Cannot modify settings (except to unarchive)
- Repository is read-only

### Communication

After archiving all repositories:

1. **Update Organization Profile**
   - Edit `.github` repository
   - Update organization README
   - List active repositories
   - Note deprecated repositories

2. **Optional: Announcement**
   - Create GitHub Discussion in chat-mvp-merge
   - Post on social media if needed
   - Email stakeholders if applicable

3. **Update chat-mvp-merge Documentation**
   - Update GITHUB_STRATEGY.md with archive completion dates
   - Update REPOSITORY_CLEANUP_SUMMARY.md

---

## Tips for Success

1. **Take Your Time**: Don't rush through all 5 repos at once
2. **Double-Check Templates**: Make sure you're using the right template for each repo
3. **Preserve History**: Always keep the original README
4. **Test Links**: Click all links in deprecation notices to ensure they work
5. **Ask for Help**: If unsure, ask team members to review before archiving
6. **Document Progress**: Use the checklist to track what's done
7. **Screenshot Evidence**: Take screenshots of before/after for records

---

## Time Estimates

- **Web Interface Method**: ~15-20 minutes per repository
- **Command Line Method**: ~10 minutes per repository (after setup)
- **Total for all 5 repos**: 60-90 minutes

---

## Questions?

If you have questions about applying these templates:

1. Review [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md)
2. Review [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md)
3. Create a GitHub Discussion in this repository
4. Contact the Gateway Global AI team

---

**Last Updated**: February 7, 2026  
**Maintained By**: Gateway Global AI Team  
**Related Docs**: [GITHUB_STRATEGY.md](./GITHUB_STRATEGY.md), [DEPRECATION_TEMPLATES.md](./DEPRECATION_TEMPLATES.md)
