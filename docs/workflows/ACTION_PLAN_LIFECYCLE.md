# Action Plan Lifecycle Workflow

> **Purpose**: Standardize how action plans are created, executed, archived, and versioned in the Warga Digital project.  
> **Last Updated**: 2026-04-02  
> **Applies To**: All development work tracked via action plans in `docs/plans/`

---

## 🔄 Overview

This workflow ensures that:
1. Action plans are properly named with timestamps for historical tracking
2. A clean template is always available for future planning
3. Versioning is updated to reflect completed work
4. Commits follow conventional commit standards
5. All changes are pushed to the `dev` branch (never directly to `main`)

---

## 📋 Step-by-Step Instructions

### Step 1: Create or Use an Action Plan
- Start with a plan file in `docs/plans/`
- Use the naming convention: `PLAN_NAME.md` (active) or `PLAN_NAME_YYYY-MM-DD_COMPLETED.md` (archived)
- Reference the template: `docs/plans/templates/ACTION_PLAN_TEMPLATE.md`

### Step 2: Execute the Plan
- Work through the checklist items in priority order
- Update progress tracking table as tasks are completed
- Keep notes on implementation details, blockers, and decisions

### Step 3: Archive the Completed Plan
When all phases are complete:

1. **Rename the file** with a timestamp:
   ```bash
   mv docs/plans/PLAN_NAME.md docs/plans/PLAN_NAME_YYYY-MM-DD_COMPLETED.md
   ```
   Example: `CODE_REVIEW_ACTION_PLAN.md` → `CODE_REVIEW_ACTION_PLAN_2026-04-02_COMPLETED.md`

2. **Update metadata** in the archived file:
   - Add `> Completed on: YYYY-MM-DD`
   - Add `> Version: vX.Y.Z`
   - Update `**Last Updated**` to completion date
   - Update `**Next Action**` (e.g., "Merge to main after QA")
   - Mark status as `✅ ALL PHASES COMPLETE`

### Step 4: Prepare for Next Work Cycle
- Ensure `docs/plans/templates/ACTION_PLAN_TEMPLATE.md` exists and is up-to-date
- Create a new plan file from the template when starting new work:
  ```bash
  cp docs/plans/templates/ACTION_PLAN_TEMPLATE.md docs/plans/NEW_PLAN_NAME.md
  ```

### Step 5: Update Versioning
- Edit the `VERSION` file at the project root
- Follow semantic versioning:
  - **Patch** (`0.1.x`): Bug fixes, security patches, non-breaking improvements
  - **Minor** (`0.x.0`): New features, API additions, backward-compatible changes
  - **Major** (`x.0.0`): Breaking changes, architectural shifts

### Step 6: Commit to `dev` Branch
1. **Ensure you're on `dev`**:
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Stage changes**:
   ```bash
   git add docs/plans/PLAN_NAME_YYYY-MM-DD_COMPLETED.md
   git add VERSION
   git add <other-changed-files>
   ```

3. **Commit with conventional commit message**:
   ```
   <type>(<scope>): <description>

   - Rename plan to include completion timestamp
   - Update version to vX.Y.Z
   - Summary of completed work
   - Files created/modified/deleted
   ```

   **Examples**:
   ```
   docs(plans): finalize code review action plan v0.2.0 with timestamp and template

   - Rename CODE_REVIEW_ACTION_PLAN.md to CODE_REVIEW_ACTION_PLAN_2026-04-02_COMPLETED.md
   - Add completion metadata, version tag (v0.2.0), and branch info
   - Create ACTION_PLAN_TEMPLATE.md for future planning work
   - Bump VERSION from 0.1.0 to 0.2.0 (minor release)
   - All 25 code review issues resolved across 4 phases
   ```

4. **Push to `dev`**:
   ```bash
   git push origin dev
   ```

---

## 📁 Directory Structure

```
docs/
├── plans/
│   ├── templates/
│   │   └── ACTION_PLAN_TEMPLATE.md          # Clean template for new plans
│   ├── CODE_REVIEW_ACTION_PLAN_2026-04-02_COMPLETED.md  # Archived plan
│   └── NEW_FEATURE_PLAN.md                  # Active plan
└── workflows/
    └── ACTION_PLAN_LIFECYCLE.md             # This file
```

---

## 🏷️ Conventional Commit Types

| Type | Use Case | Example |
|------|----------|---------|
| `feat` | New feature | `feat(auth): add two-factor authentication` |
| `fix` | Bug fix | `fix(api): resolve null pointer in user endpoint` |
| `docs` | Documentation | `docs(plans): archive code review action plan` |
| `refactor` | Code restructuring | `refactor(register): extract helper functions` |
| `chore` | Maintenance | `chore(deps): update package versions` |
| `test` | Testing | `test(auth): add login flow integration tests` |

---

## ⚠️ Important Rules

1. **Never commit directly to `main`** — all work goes through `dev`
2. **Always timestamp archived plans** — prevents naming collisions and tracks history
3. **Keep the template clean** — do not modify the template with project-specific data
4. **Update VERSION file** — every significant milestone should bump the version
5. **Use conventional commits** — ensures automated changelog generation and clear history

---

## 🚀 Quick Reference Commands

```bash
# 1. Switch to dev branch
git checkout dev && git pull origin dev

# 2. Archive completed plan
mv docs/plans/PLAN.md docs/plans/PLAN_$(date +%Y-%m-%d)_COMPLETED.md

# 3. Update version
echo "0.2.0" > VERSION

# 4. Stage and commit
git add docs/plans/ VERSION <other-files>
git commit -m "docs(plans): archive plan with timestamp and bump version to vX.Y.Z"

# 5. Push
git push origin dev
```

---

## ✅ Checklist for Completion

- [ ] Plan file renamed with `YYYY-MM-DD_COMPLETED` suffix
- [ ] Metadata updated (completion date, version, next action)
- [ ] `VERSION` file bumped appropriately
- [ ] Committed to `dev` branch with conventional commit message
- [ ] Pushed to `origin/dev`
- [ ] Template verified as clean and ready for next plan
- [ ] New plan created (if applicable)

---

**Maintained By**: Development Team  
**Review Cycle**: Update this workflow when process improvements are identified