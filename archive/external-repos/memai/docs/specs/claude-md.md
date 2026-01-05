# CLAUDE.md Fractal Documentation Specification

> Through a fractal documentation system, let AI Agents quickly rebuild context at any code location, achieving "local autonomy, global coordination".

## Naming Convention

- **Primary file**: `CLAUDE.md` - The actual documentation file
- **Symlink**: `AGENTS.md` - Symlink pointing to `CLAUDE.md` (for compatibility with agents.md spec)
- All new documentation MUST use `CLAUDE.md` as the primary file name

## Why This Specification?

AI-assisted development faces three core challenges:

1. **Context Loss**: Codebase too large, AI cannot understand the whole picture at once
2. **Documentation Decay**: Documentation out of sync after code updates, AI gets outdated information
3. **Cognitive Fragmentation**: AI loses overall architectural cognition when jumping between directories

## Solution: Fractal Documentation Structure

Inspired by "Godel, Escher, Bach" concepts of "counterpoint and self-reference", build a three-layer fractal structure:

```
Root CLAUDE.md        →  System "Constitution", defines core protocols and global specifications
    ↓
Subdirectory CLAUDE.md →  Local "Map", lets AI work independently in any subdirectory
    ↓
File Header Comments   →  Cell-level information, describes single file's input, output, position
```

This is a **self-referential system**: files describe how to modify themselves, folders describe how files collaborate, root describes how folders coexist.

---

## Core Protocol

### Atomic Update Rule (Mandatory)

After any code change, you **MUST** synchronize related documentation:

```
Code change → Update file header comment → Update directory CLAUDE.md → (if global impact) Update root CLAUDE.md
```

### Trigger Mechanism

Each document contains update triggers:

```markdown
> Warning: When this folder structure changes, you MUST update this document
```

```typescript
/**
 * [PROTOCOL]: When modifying this file, you MUST update this header and the directory CLAUDE.md
 */
```

### No Legacy Baggage

- No backward compatibility, delete/refactor unused code directly
- No `_deprecated`, `// removed`, `// TODO: remove` comments
- No `_old`, `_backup` temporary files

---

## Three-Layer Documentation Structure

### Layer One: Root CLAUDE.md

**Status**: System "Constitution"

**Responsibilities**:
- Define core sync protocol
- Provide global tech stack reference
- Declare common code specifications
- Index to subdirectory CLAUDE.md files

### Layer Two: Subdirectory CLAUDE.md

**Status**: Local "Map"

**Creation Threshold**: Create when directory has more than 10 files

**Responsibilities**:
- 3-line minimal positioning (Position, Responsibility, Constraints)
- Member file list
- Directory-specific technical constraints
- Common modification scenarios

### Layer Three: File Header Comments

**Status**: Cell-level information

**Scope**: Key files (entry points, core services, complex components)

**Responsibilities**:
- Declare input/output
- Explain position in system
- Include update trigger

---

## File Header Comment Specification

Choose format based on file type:

| File Type | Format |
|-----------|--------|
| Service/Logic | `[INPUT]` / `[OUTPUT]` / `[POS]` |
| React Component | `[PROPS]` / `[EMITS]` / `[POS]` |
| Utility Functions | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| Type Definitions | `[DEFINES]` / `[USED_BY]` / `[POS]` |

### Example: Service/Logic File

```typescript
/**
 * [INPUT]: (Credentials, UserRepo) - Credentials and user data access interface
 * [OUTPUT]: (AuthToken, SessionContext) | Exception - Auth token or exception
 * [POS]: Core authentication service, logic glue between API layer and Data layer
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and the directory CLAUDE.md
 */
```

### Example: React Component

```typescript
/**
 * [PROPS]: { noteId, onSave, className? } - Note ID, save callback, optional style
 * [EMITS]: onSave(content: string) - Triggered when content changes
 * [POS]: Core editor component, used by EditorPage and QuickNote
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and the directory CLAUDE.md
 */
```

### Example: Utility Functions

```typescript
/**
 * [PROVIDES]: formatDate, parseDate, isValidDate - Date processing utilities
 * [DEPENDS]: dayjs - Underlying date library
 * [POS]: Global utility functions, reused by multiple modules
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and the directory CLAUDE.md
 */
```

### Example: Type Definition File

```typescript
/**
 * [DEFINES]: User, UserRole, UserPermission - User-related types
 * [USED_BY]: auth/, user/, admin/ - Authentication, user, admin modules
 * [POS]: Core domain types, changes require careful impact assessment
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and the directory CLAUDE.md
 */
```

---

## Templates

### Root CLAUDE.md Template

```markdown
# Project Name

> This document is the core guide for AI Agents. Following the [agents.md specification](https://agents.md/).

## Core Sync Protocol (Mandatory)

1. **Atomic Update Rule**: After any code change, you MUST update the relevant CLAUDE.md files
2. **Recursive Trigger**: File change → Update file header → Update directory CLAUDE.md → (if global impact) Update root CLAUDE.md
3. **Fractal Autonomy**: Any subdirectory's CLAUDE.md should allow AI to independently understand that module's context
4. **No Legacy Baggage**: No backward compatibility, delete/refactor unused code directly, no deprecated comments

## Project Structure

| Directory | Description | Specification |
|-----------|-------------|---------------|
| `apps/xxx/` | App description | → `apps/xxx/CLAUDE.md` |
| `packages/` | Shared packages | → `packages/CLAUDE.md` |

### Tech Stack Quick Reference

| Layer | Technology |
|-------|------------|
| Frontend | React / Vue / ... |
| Backend | NestJS / Express / ... |
| Database | PostgreSQL / MongoDB / ... |

## Collaboration Guidelines

- All English communication, commits, documentation
- Search First: Don't guess implementations, search and verify against existing code
- Don't Define Business Semantics: Confirm product/data meanings with stakeholders first
- Reuse Priority: Prioritize reusing existing interfaces, types, and utilities

## Workflow

1. **Plan**: Before changes, provide minimal scope plan with motivation and risks
2. **Execute**: Focus on single issue, no blind changes
3. **Verify**: Run lint/typecheck locally, pass before committing
4. **Sync**: Update relevant CLAUDE.md (mandatory)

## File Header Comment Specification

| File Type | Format |
|-----------|--------|
| Service/Logic | `[INPUT]` / `[OUTPUT]` / `[POS]` |
| React Component | `[PROPS]` / `[EMITS]` / `[POS]` |
| Utility Functions | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| Type Definitions | `[DEFINES]` / `[USED_BY]` / `[POS]` |

## Directory Conventions

Component or module directory structure:
- `index.tsx` - Entry
- `const.ts` - Types/Constants
- `helper.ts` - Pure function logic
- `components/` - Sub-components

## Code Principles

1. **Single Responsibility**: Each function/component does one thing
2. **Pure Functions First**: Implement logic as pure functions for easy testing
3. **Early Return**: Use early returns to reduce nesting, improve readability
4. **DRY Principle**: Extract and reuse duplicate logic

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components/Types | PascalCase | `PublishDialog` |
| Functions/Variables | camelCase | `handleSubmit` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY` |
```

### Subdirectory CLAUDE.md Template

```markdown
# [Directory Name]

> Warning: When this folder structure changes, you MUST update this document

## Position

[One sentence explaining this directory's role in the system]

## Responsibilities

[What this directory is responsible for, what it's not responsible for]

## Constraints

[Technical constraints, dependency rules, prohibitions]

## Member List

| File/Directory | Type | Description |
|----------------|------|-------------|
| `index.ts` | Entry | Module exports |
| `service.ts` | Service | Core business logic |
| `types.ts` | Types | Type definitions |
| `components/` | Directory | UI components → see `components/CLAUDE.md` |

## Common Modification Scenarios

| Scenario | Files Involved | Notes |
|----------|----------------|-------|
| Add API | `service.ts`, `types.ts` | Need to sync type definitions |
| Modify UI | `components/` | Follow component conventions |

## Dependencies

```
This module
├── depends on → packages/shared-api
├── depends on → ../common/
└── depended by ← apps/pc/renderer
```
```

---

## Feature Documentation Specification (Optional)

For larger projects, recommend the "PRD-Tech-Plan" three-document pattern:

```
docs/features/
├── feature-name/
│   ├── prd.md      # Requirements doc (must be confirmed before tech doc)
│   ├── tech.md     # Technical doc (annotate related code paths)
│   └── plan.md     # Execution plan (delete after completion)
```

### Workflow

```
User request → AI writes prd.md → User confirms → AI writes tech.md → AI writes plan.md → Code step by step → Delete plan.md after completion
```

### Bidirectional Annotation

Document annotates code path, code annotates document path:

```typescript
/**
 * [POS]: Cloud sync core service
 * [DOC]: docs/features/cloud-sync/tech.md
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and related docs
 */
```

---

## Quick Start

### Step 1: Create Root CLAUDE.md

Copy the "Root Template" above, fill in according to your project:
- Project structure table
- Tech stack reference
- Team collaboration guidelines

### Step 2: Create CLAUDE.md for Core Directories

For directories with more than 10 files, use the "Subdirectory Template" to create corresponding CLAUDE.md.

### Step 3: Add Header Comments to Key Files

Prioritize adding header comments to:
- Module entry files (index.ts)
- Core service files
- Complex business components
- Shared type definitions

### Step 4: Establish Update Habits

After each code change, check if you need to update:
- File header comments
- Directory CLAUDE.md
- Root CLAUDE.md (if global impact)

---

## AI Comprehension Test

Enter any subdirectory, AI should be able to answer through that directory's CLAUDE.md:

1. What does this directory do?
2. Which files to modify for a certain feature?
3. What technical constraints to follow?

If AI cannot answer, the documentation needs supplementation.

---

## References

- [agents.md specification](https://agents.md/)
- ["Godel, Escher, Bach"](https://en.wikipedia.org/wiki/G%C3%B6del,_Escher,_Bach) - Aesthetics of counterpoint and self-reference
