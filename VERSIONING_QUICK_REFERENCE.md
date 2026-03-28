# Warga Digital - Versioning Quick Reference

## 📌 Current Version

```bash
npm run version:info
```

View the `VERSION` file or check `package.json` for the current version number.

---

## 🚀 Quick Start

### Check Current Version
```bash
npm run version:info
```

### Bump Version
```bash
# Bump patch version (0.1.0 → 0.1.1) - for bug fixes
npm run version:patch

# Bump minor version (0.1.0 → 0.2.0) - for new features
npm run version:minor

# Bump major version (0.1.0 → 1.0.0) - for breaking changes
npm run version:major
```

### Prepare a Release
```bash
npm run version:prepare patch    # Interactive release preparation
```

---

## 📋 Release Process (5 Steps)

### 1. Update CHANGELOG.md
```markdown
# Move [Unreleased] entries to new version section
## [0.2.0] - 2025-03-15

### Added
- New feature
```

### 2. Bump Version
```bash
npm run version:patch  # or minor/major
```

### 3. Commit Changes
```bash
git add VERSION package.json CHANGELOG.md
git commit -m "chore: release v0.2.0"
```

### 4. Create Git Tag
```bash
git tag v0.2.0
```

### 5. Push to Repository
```bash
git push origin main --tags
# Then create GitHub Release from the tag
```

---

## 🔤 Semantic Versioning Rules

| Part | When | From | To | Example |
|------|------|------|-----|---------|
| **MAJOR** | Breaking changes | 0.1.0 | 1.0.0 | API overhaul, DB changes |
| **MINOR** | New features | 0.1.0 | 0.2.0 | New endpoints, new UI |
| **PATCH** | Bug fixes | 0.1.0 | 0.1.1 | Hotfixes, patches |

---

## 📝 Changelog Entry Guide

### Add to `[Unreleased]` Section in CHANGELOG.md

```markdown
## [Unreleased]

### Added
- WhatsApp OTP support (#45)
- CSV export for reports

### Fixed
- OTP timeout on slow connections (#42)
- Balance calculation error

### Security
- Rate limiting on API endpoints
```

### Entry Categories

| Category | Use For | Example |
|----------|---------|---------|
| **Added** | New features | "New dashboard with analytics" |
| **Changed** | Modified behavior | "Improved form validation" |
| **Deprecated** | Soon to remove | "Old API endpoint (use new one)" |
| **Removed** | Removed features | "Dropped IE11 support" |
| **Fixed** | Bug fixes | "Fixed calculation error" |
| **Security** | Security fixes | "Fixed XSS vulnerability" |

### Writing Tips

✅ **Good**
```markdown
### Added
- Support for WhatsApp OTP delivery (#45)
- CSV export for Kas RT transactions
```

❌ **Bad**
```markdown
### Added
- New stuff
- Various improvements
```

---

## 📂 Files Involved

| File | Purpose | Sync? |
|------|---------|-------|
| `VERSION` | Version number (source of truth) | Auto ✓ |
| `package.json` | Package version field | Auto ✓ |
| `CHANGELOG.md` | Release notes | Manual |

**Note**: Version bump scripts automatically keep VERSION and package.json in sync.

---

## 🔄 Development Workflow

### When Developing
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. **Add changelog entry** to `[Unreleased]` section
4. Create pull request
5. After merge, next release will include your changes

### When Releasing
1. Update CHANGELOG.md (organize [Unreleased] entries)
2. Bump version using npm scripts
3. Commit and tag
4. Push to repository
5. Create GitHub Release

---

## 🛠️ All Available Scripts

```bash
# View version information
npm run version:info

# Bump version numbers
npm run version:patch      # X.Y.Z → X.Y.Z+1
npm run version:minor      # X.Y.Z → X.Y+1.0
npm run version:major      # X.Y.Z → X+1.0.0

# Prepare release (interactive)
npm run version:prepare

# Standard development
npm run dev                # Start dev server
npm run build              # Build for production
npm run lint               # Check code quality
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `VERSIONING.md` | Complete versioning guide |
| `CHANGELOG.md` | Full change history |
| `VERSION` | Current version number |
| `README.md` | Project overview |

---

## ❓ Common Questions

**Q: How often should I release?**  
A: Typically monthly or biweekly. Batch related features together.

**Q: When do I update the changelog?**  
A: As you develop. Add entries immediately after implementing changes.

**Q: What if I released the wrong version?**  
A: Don't change the tag. Release a fix as the next patch version.

**Q: Do I need to tag every release?**  
A: Yes. Tags help with version tracking and GitHub releases.

**Q: How do I handle breaking changes?**  
A: Bump MAJOR version and document clearly with ⚠️ BREAKING CHANGE

**Q: Can I skip PATCH and go to MINOR?**  
A: Follow semantic versioning for clarity. Release patches before minors.

---

## 🔗 Useful Commands Cheatsheet

```bash
# Check what changed since last release
git log v0.1.0..HEAD --oneline

# List all version tags
git tag -l "v*" --sort=-version:refname

# View details of a specific tag
git show v0.1.0

# Create annotated tag (recommended)
git tag -a v0.2.0 -m "Release v0.2.0"

# Delete a tag locally (if needed)
git tag -d v0.2.0

# Delete a tag from remote (if needed)
git push origin --delete v0.2.0
```

---

## 📞 Need Help?

1. Read full guide: `VERSIONING.md`
2. Check change history: `CHANGELOG.md`
3. Run: `npm run version:info` to see current state
4. Create an issue on GitHub for questions

---

## Version History

| Version | Release Date | Status |
|---------|-------------|--------|
| 0.1.0 | 2025-02-09 | Early Development |

See `CHANGELOG.md` for detailed history.

---

**Last Updated**: February 9, 2025  
**Current Version**: 0.1.0