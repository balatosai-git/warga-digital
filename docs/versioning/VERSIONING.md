# Versioning Guide

This document explains how versioning, releases, and changelogs are managed in the Warga Digital project.

## Table of Contents

- [Semantic Versioning](#semantic-versioning)
- [Version Files](#version-files)
- [Changelog Management](#changelog-management)
- [Release Process](#release-process)
- [Development Workflow](#development-workflow)
- [Scripts & Commands](#scripts--commands)
- [Best Practices](#best-practices)
- [FAQ](#faq)

---

## Semantic Versioning

This project adheres to [Semantic Versioning 2.0.0](https://semver.org/). 

### Version Format

Versions follow the format: **MAJOR.MINOR.PATCH**

Example: `0.1.0`, `1.2.3`, `2.0.0`

### Version Components

#### MAJOR (X.y.z)
- Increment when you make **incompatible API changes**
- **Breaking changes** that require users to update their code
- Examples:
  - Removing an API endpoint
  - Changing authentication mechanism
  - Major database schema changes
  - Changing core data structures
  
**When to bump**: Major refactors, API overhauls, significant architectural changes

#### MINOR (x.Y.z)
- Increment when you **add functionality in a backward-compatible manner**
- New features that don't break existing functionality
- Examples:
  - Adding new API endpoints
  - Adding new UI components
  - New optional configuration options
  - Performance improvements
  - New database tables/fields (with migration support)

**When to bump**: Feature releases, new capabilities

#### PATCH (x.y.Z)
- Increment when you make **backward-compatible bug fixes**
- Small improvements and fixes
- Examples:
  - Fixing a UI bug
  - Correcting calculation errors
  - Fixing typos in documentation
  - Performance optimization
  - Security patches
  - Dependency updates

**When to bump**: Bug fixes, hotfixes, patches

### Pre-release and Build Metadata

Future versions may include pre-release identifiers:

- **Alpha**: `1.0.0-alpha` or `1.0.0-alpha.1`
- **Beta**: `1.0.0-beta` or `1.0.0-beta.1`
- **Release Candidate**: `1.0.0-rc.1`

Format: `MAJOR.MINOR.PATCH-PRERELEASE+BUILD`

Example: `1.0.0-beta.2`, `2.0.0-rc.1`

---

## Version Files

### VERSION (Root)

Located at: `./VERSION`

Contains the single-line current version number.

```
0.1.0
```

**Purpose**: Source of truth for the project version

**Do not edit manually** — use version bump scripts instead.

### package.json

Located at: `./package.json`

The `version` field contains the version string and should match the VERSION file.

```json
{
  "name": "warga-digital",
  "version": "0.1.0",
  ...
}
```

**Automatically updated** when using version bump scripts.

### CHANGELOG.md

Located at: `./CHANGELOG.md`

Contains all notable changes organized by version and category.

**Updated manually** during release preparation.

See [Changelog Management](#changelog-management) for details.

---

## Changelog Management

### Format

The changelog follows the [Keep a Changelog](https://keepachangelog.com/) format.

### Structure

```markdown
# Changelog

## [Unreleased]

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

---

## [1.0.0] - 2025-02-15

### Added
- Feature description

### Fixed
- Bug fix description

---

## [0.1.0] - 2025-02-09

### Added
- Initial release
```

### Entry Categories

#### Added
New features or capabilities added in this version.

Examples:
- New API endpoint for user profile updates
- Dashboard analytics page
- CSV export functionality
- Support for multi-language UI

```markdown
### Added
- New user profile dashboard with analytics
- CSV export for financial reports (#45)
- Dark mode support for all pages
```

#### Changed
Changes to existing functionality (non-breaking).

Examples:
- Modified API response format
- Improved UI/UX of existing pages
- Changed algorithm or logic
- Updated styling

```markdown
### Changed
- Improved form validation UX with real-time feedback
- Optimized Kas RT calculation for better performance
- Updated NextUI components to v2.5
```

#### Deprecated
Features that will be removed in a future version.

Examples:
- Marking an API endpoint as deprecated
- Warning about future breaking changes
- Deprecating configuration options

```markdown
### Deprecated
- Old `/api/users/profile` endpoint (use `/api/users/me` instead)
- `exportToXLS()` method (use `exportToCSV()` instead)
```

#### Removed
Features, APIs, or functionality that have been removed.

Examples:
- Removing an API endpoint
- Removing a dependency
- Removing a feature flag

```markdown
### Removed
- Removed legacy session-based authentication
- Removed Internet Explorer 11 support
- Removed deprecated `getBalance()` API method
```

#### Fixed
Bug fixes and corrections.

Examples:
- Fixed calculation errors
- Fixed UI bugs
- Fixed security vulnerabilities
- Fixed documentation errors

```markdown
### Fixed
- Fixed OTP verification timing out on poor connections (#42)
- Fixed duplicate entries in Kas RT transaction list
- Corrected household member count calculation
- Fixed responsive layout on mobile devices
```

#### Security
Security vulnerability fixes and security-related improvements.

Examples:
- Patching security vulnerabilities
- Adding new security features
- Improving encryption or authentication

```markdown
### Security
- Fixed XSS vulnerability in user comment display (#88)
- Added rate limiting to API endpoints
- Upgraded cryptography library to address known vulnerabilities
```

### Guidelines for Entries

1. **Be User-Focused**: Describe changes from the user's perspective
   - ❌ Bad: "Refactored auth module"
   - ✅ Good: "Login now works with WhatsApp OTP"

2. **Be Specific**: Avoid vague descriptions
   - ❌ Bad: "Various bug fixes"
   - ✅ Good: "Fixed calculation error in monthly Kas RT balance"

3. **Link to Issues**: Reference GitHub issues/PRs when applicable
   - ✅ Good: "Added CSV export functionality (#123)"

4. **Keep it Brief**: One line per entry when possible
   - ❌ Too long: "We improved the user interface by adding a new button..."
   - ✅ Concise: "Added quick action button to dashboard"

5. **Use Consistent Language**: Use imperative mood (commands)
   - ✅ "Add", "Fix", "Remove", "Update"
   - ❌ "Added", "Fixed", "Removed", "Updated"

6. **Group Related Changes**: Similar changes go in the same category
   - ✅ All authentication changes under one section
   - ❌ Spread them across multiple categories

### Writing Examples

**Good changelog entry:**
```markdown
### Added
- WhatsApp OTP delivery support via Clawdbot integration (#45)
- Admin dashboard with financial overview and trends
- Bulk import residents from CSV file

### Changed
- Improved form validation with real-time feedback

### Fixed
- Fixed OTP verification timeout on slow connections (#42)
- Corrected Kas RT balance calculation for inactive months

### Security
- Added rate limiting to prevent OTP brute force attacks
```

**Poor changelog entry:**
```markdown
### Added
- New stuff
- Improvements

### Fixed
- Various bugs
```

---

## Release Process

### Step-by-Step Guide

#### 1. Prepare for Release

Before starting, ensure:
- [ ] All features are complete and tested
- [ ] All tests pass: `npm run lint && npm run build`
- [ ] Code is committed and pushed
- [ ] No outstanding issues blocking the release

#### 2. Update CHANGELOG.md

Move items from `[Unreleased]` to a new version section:

```markdown
## [Unreleased]

### Added
### Changed
...

---

## [0.2.0] - 2025-03-15

### Added
- Feature A
- Feature B

### Fixed
- Bug fix A
```

#### 3. Bump Version

Use one of the npm scripts:

```bash
# For patch release (0.1.0 → 0.1.1)
npm run version:patch

# For minor release (0.1.0 → 0.2.0)
npm run version:minor

# For major release (0.1.0 → 1.0.0)
npm run version:major
```

This will:
- Update `VERSION` file
- Update `package.json` version field
- Display next steps

#### 4. Create Git Commit

```bash
git add VERSION package.json CHANGELOG.md
git commit -m "chore: release v0.2.0"
```

#### 5. Create Git Tag

```bash
git tag v0.2.0
# Or with an annotated tag and message:
git tag -a v0.2.0 -m "Release version 0.2.0"
```

#### 6. Push to Repository

```bash
git push origin main
git push origin v0.2.0
# Or push all tags:
git push --tags
```

#### 7. Create GitHub Release

1. Go to [Releases](https://github.com/your-org/warga-digital/releases)
2. Click "Draft a new release"
3. Select the tag you just created (v0.2.0)
4. Title: "Version 0.2.0" or "Release v0.2.0"
5. Copy relevant sections from CHANGELOG.md into the release notes
6. If it's a pre-release, check "This is a pre-release"
7. Click "Publish release"

### Release Template

Use this template for GitHub releases:

```markdown
# Release v0.2.0

**Release Date**: March 15, 2025

## Overview

Brief description of what this release is about.

## What's New

Summarize the major features and improvements.

## Breaking Changes

List any breaking changes and migration instructions.

## Features

### Added
- Feature A
- Feature B

### Changed
- Improvement A
- Improvement B

### Fixed
- Bug fix A
- Bug fix B

### Security
- Security improvement A

## Downloads

- [Source code (zip)](...)
- [Source code (tar.gz)](...)

## Installation

```bash
npm install@latest warga-digital@0.2.0
```

## Contributors

Thank you to everyone who contributed to this release!

## Links

- [Changelog](CHANGELOG.md)
- [Issues](...)
- [Pull Requests](...)
```

---

## Development Workflow

### During Development

As you develop features and fix bugs:

1. **For each change**, add an entry to the `[Unreleased]` section in `CHANGELOG.md`
2. **Commit with descriptive messages**:
   ```bash
   git commit -m "feat: add CSV export for Kas RT transactions"
   ```
3. **Use conventional commits** (optional but recommended):
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `chore:` for maintenance
   - `test:` for tests

### Branch Naming

Use descriptive branch names:

```
feature/csv-export
feature/whatsapp-otp
fix/kas-calculation-bug
docs/installation-guide
```

### PR Requirements

When submitting a pull request:

1. **Add a changelog entry** for user-facing changes
2. **Link to related issues**: "Fixes #123"
3. **Describe the change clearly** in the PR description
4. **Ensure tests pass**: `npm run lint && npm run build`

### Example PR Description

```markdown
## Description

Add CSV export functionality for Kas RT financial reports.

Fixes #45

## Changes

- Added `exportToCSV()` utility function
- Created CSV export button in reports page
- Added validation for empty datasets
- Added unit tests for export functionality

## Checklist

- [x] Tests pass
- [x] Documentation updated
- [x] CHANGELOG.md entry added
- [x] No breaking changes
```

---

## Scripts & Commands

### version:info

Display current version information and git status.

```bash
npm run version:info
```

Output includes:
- Current version
- Latest release version
- Git branch and commit
- Git tags
- Project dependencies

### version:patch

Bump patch version (X.Y.Z → X.Y.Z+1).

```bash
npm run version:patch
```

Use for: Bug fixes, patches, minor improvements

### version:minor

Bump minor version (X.Y.Z → X.Y+1.0).

```bash
npm run version:minor
```

Use for: New features, backward-compatible additions

### version:major

Bump major version (X.Y.Z → X+1.0.0).

```bash
npm run version:major
```

Use for: Breaking changes, API overhauls

### version:prepare

Prepare a new release with interactive prompts.

```bash
npm run version:prepare
```

This script guides you through:
- Validating the current state
- Creating release notes
- Updating all version files
- Creating commit and tag

---

## Best Practices

### 1. Update Changelog Immediately

Add changelog entries as you make changes, not at release time.

```bash
# After implementing a feature
vim CHANGELOG.md  # Add entry to [Unreleased]
git add CHANGELOG.md
git commit -m "docs: add changelog entry for CSV export"
```

### 2. Keep Versions Meaningful

- Don't release too frequently (aim for monthly or biweekly)
- Batch related changes together
- Ensure each version has meaningful changes

### 3. Use Descriptive Tags

Tag all releases:

```bash
git tag -a v0.2.0 -m "Release v0.2.0: Add CSV export and performance improvements"
```

### 4. Document Breaking Changes Prominently

When there are breaking changes:

```markdown
## [1.0.0] - 2025-06-01

### ⚠️ BREAKING CHANGES

- Migrated from session-based to JWT authentication
  - All existing sessions will be invalidated
  - API endpoints now require Bearer token
  - See [Migration Guide](MIGRATION.md) for details

### Added
...
```

### 5. Maintain Backward Compatibility

Deprecate features before removing them:

```markdown
## [0.3.0] - 2025-04-15

### Deprecated
- `getBalance()` API method (use `getAccountBalance()` instead)

## [0.4.0] - 2025-05-15

### Removed
- `getBalance()` API method (removed after 2 releases)
```

### 6. Test Before Releasing

Always verify everything works before releasing:

```bash
npm run lint      # Check code quality
npm run build     # Build for production
npm run test      # Run tests (when available)
```

### 7. Update Related Documentation

When releasing new features, update:
- README.md
- API documentation
- User guides
- Deployment instructions

---

## FAQ

### Q: When do I update CHANGELOG.md?

**A**: Update it as you develop. Add an entry for each PR/commit that affects users. During release, you'll move everything from `[Unreleased]` to the release version section.

### Q: Can I merge multiple PRs before releasing?

**A**: Yes! Collect multiple features and fixes before releasing. Each should have its own changelog entry, and they'll be grouped under the same version.

### Q: What if I made a mistake in a release?

**A**: Create a new patch release to fix it. Do not delete or re-tag releases.

### Q: Do I need to tag every version?

**A**: Yes, always tag releases. This helps with:
- Release management
- Version tracking
- Easy rollbacks
- GitHub releases page

### Q: How should I handle security releases?

**A**: 
1. Create a patch release as soon as the fix is available
2. Mark it clearly in the changelog with `### Security`
3. Communicate the fix to users
4. Consider backporting to older versions if they're still supported

### Q: What if I need to release a version for an old branch?

**A**: Create the version on that branch:

```bash
git checkout 0.1.x  # Checkout old branch
npm run version:patch  # Bump version
# Make the release
git push origin 0.1.x
git push origin v0.1.X  # Push the tag
```

### Q: Should I include development dependencies in the changelog?

**A**: Only if they affect users:
- ✅ Include: "Upgraded React to 19"
- ❌ Exclude: "Updated ESLint configuration"

### Q: How do I handle pre-releases?

**A**: Pre-releases follow the format `MAJOR.MINOR.PATCH-PRERELEASE`:

```
0.2.0-alpha
0.2.0-alpha.1
0.2.0-beta
0.2.0-rc.1
0.2.0  (final release)
```

Manually edit VERSION and package.json to use these versions.

### Q: Who decides when to release?

**A**: Typically the project maintainer or release manager. For team projects, establish a release schedule (e.g., every 2 weeks, monthly).

---

## Related Documents

- [CHANGELOG.md](CHANGELOG.md) - Detailed change history
- [README.md](README.md) - Project overview
- [Semantic Versioning](https://semver.org/) - Official semver specification
- [Keep a Changelog](https://keepachangelog.com/) - Changelog best practices

---

## Questions or Suggestions?

If you have questions about versioning or want to suggest improvements, please:

1. Check the [FAQ](#faq) section above
2. Review existing [GitHub Issues](https://github.com/your-org/warga-digital/issues)
3. Create a new issue with your question or suggestion

---

*Last updated: February 2025*
*Version: 0.1.0*