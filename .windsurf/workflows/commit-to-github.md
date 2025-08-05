---
description: Commit changes to GitHub with version update
---

# Commit to GitHub with Version Update

This workflow updates the version number across the application using the centralized version system and commits changes to GitHub.

## Steps

1. Update the version number using the centralized version update script (replace X.Y.Z.W with the new version)
// turbo
```bash
npm run version:update:centralized 7.0.0.21
```

2. Check the current version to verify it was updated correctly
// turbo
```bash
grep -n "\"version\":" package.json
```

3. Check if there are any changes to commit
// turbo
```bash
git status
```

4. Add all changed files to git
// turbo
```bash
git add .
```

5. Commit changes with a descriptive message (replace VERSION with the current version)
```bash
git commit -m "🔖 Update version to VERSION - Centralized Version System"
```

6. Push changes to GitHub
```bash
git push origin main
```

7. Verify the version is updated in the terminal
// turbo
```bash
node -e "console.log('Current version:', require('./package.json').version)"
```

8. Rebuild the bundle to include the new version
// turbo
```bash
npm run build:bundle
```

9. Restart the server to apply changes
// turbo
```bash
npm run restart:safe
```

10. Check the server logs to verify the correct version is shown
// turbo
```bash
tail -n 20 logs/application.log
```
