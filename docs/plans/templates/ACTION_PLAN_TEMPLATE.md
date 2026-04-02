# [Action Plan Title] — Warga Digital

> **Created**: YYYY-MM-DD  
> **Author**: [Your Name/Role]  
> **Status**: 🟡 Draft / 🟠 In Progress / ✅ Complete / 🔴 Blocked  
> **Target Version**: vX.Y.Z  
> **Related Issues/PRs**: #[issue-number]

---

## 📋 Overview

Brief description of what this plan covers, why it's needed, and the expected outcome.

### Scope
- **In Scope**: [List what will be addressed]
- **Out of Scope**: [List what is explicitly excluded]
- **Estimated Effort**: [e.g., 2–3 days / 1 sprint]

---

## 🗂️ Master Checklist

### Phase 1: [Phase Name] (Priority: Critical/High/Medium/Low)
- [ ] **#1** [Task Title]
  - [ ] Subtask or implementation detail
  - [ ] Files affected: `path/to/file.ts`
- [ ] **#2** [Task Title]
  - [ ] Subtask or implementation detail

### Phase 2: [Phase Name]
- [ ] **#3** [Task Title]
- [ ] **#4** [Task Title]

### Phase 3: [Phase Name]
- [ ] **#5** [Task Title]
- [ ] **#6** [Task Title]

### Phase 4: [Phase Name / Cleanup & Docs]
- [ ] **#7** [Task Title]
- [ ] **#8** [Task Title]

---

## 🗺️ Execution Plan

### Step 1: [Step Title]
- **Goal**: [What this step achieves]
- **Files to Create/Modify**: `path/to/file.ts`
- **Implementation Notes**:
  - [Detail 1]
  - [Detail 2]
- **Validation**: [How to verify it works]

### Step 2: [Step Title]
- **Goal**: [What this step achieves]
- **Files to Create/Modify**: `path/to/file.ts`
- **Implementation Notes**:
  - [Detail 1]
- **Validation**: [How to verify it works]

*(Add more steps as needed)*

---

## 📊 Progress Tracking

| Phase | Tasks | Status | Started | Completed | Notes |
|-------|-------|--------|---------|-----------|-------|
| Phase 1 | #1, #2 | 🟡 Not Started | — | — | — |
| Phase 2 | #3, #4 | 🟡 Not Started | — | — | — |
| Phase 3 | #5, #6 | 🟡 Not Started | — | — | — |
| Phase 4 | #7, #8 | 🟡 Not Started | — | — | — |
| **Total** | **8** | **0% Complete** | — | — | — |

---

## ⚠️ Risks & Considerations

### Security & Compliance
- [List any security implications, auth changes, or compliance requirements]

### Architecture & Performance
- [Note any architectural constraints, runtime limits, or performance impacts]

### Database & Data Integrity
- [Mention migrations, schema changes, or data migration steps]

### Breaking Changes
- [List any API/UI changes that may affect consumers or require frontend updates]

---

## 🚨 Rollback Plan

If issues arise during or after implementation:
1. [Step 1: How to revert or disable the change]
2. [Step 2: Database rollback procedure, if applicable]
3. [Step 3: Monitoring & verification steps]

---

## ✅ Definition of Done

Each task is considered complete when:
- [ ] Code changes are implemented and committed
- [ ] TypeScript compilation passes with no errors
- [ ] Linting & formatting checks pass (`npm run lint`, `npm run format`)
- [ ] Manual/automated testing confirms expected behavior
- [ ] No regressions in related functionality
- [ ] Documentation updated (if applicable)
- [ ] Checklist item marked complete with commit reference

---

## 📝 Change Summary

### Files Created
- `path/to/new-file.ts` — [Brief description]

### Files Modified
- `path/to/existing-file.ts` — [What changed and why]

### Files Deleted
- `path/to/removed-file.ts` — [Reason for removal]

### Dependencies Added/Removed
- `package-name` — [Reason]

---

## 🔖 Versioning & Commit Guidelines

### Version Bump Strategy
- **Patch** (`0.1.x`): Bug fixes, security patches, non-breaking improvements
- **Minor** (`0.x.0`): New features, API additions, backward-compatible changes
- **Major** (`x.0.0`): Breaking changes, architectural shifts

### Conventional Commit Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Examples**:
```
fix(auth): add rate limiting to login endpoint
feat(api): standardize error response format
refactor(register): extract helper functions
docs(plans): add action plan template
chore(deps): update pdf-lib usage
```

---

**Last Updated**: YYYY-MM-DD  
**Next Action**: [What needs to happen next]  
**Assigned To**: [Name/Role]