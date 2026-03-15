# Moryflow Main Repository

> This document is the repo-level collaboration entry point. It contains only always-on identity, boundaries, hard constraints, and routing.

## Project Overview

This monorepo houses Moryflow as the primary product, alongside the co-evolving Anyhunt capability platform:

- Primary product: Moryflow (Notes + AI workflow + site publishing)
- Capability platform: Anyhunt Dev (Fetchx / Memox / Sandx capabilities)

Moryflow and Anyhunt Dev are independent business lines with separate identity, billing, and data; they share only `packages/*` infrastructure code.

## Core Sync Protocol (Mandatory)

1. `CLAUDE.md` only carries stable context: directory responsibilities, structural boundaries, public contracts, key constraints, core entry points.
2. Only update a `CLAUDE.md` when its directory responsibilities, structure, cross-module contracts, or key constraints become stale.
3. File headers are updated only when `[INPUT] / [OUTPUT] / [POS]`, `[PROPS] / [EMITS]`, `[PROVIDES] / [DEPENDS]` facts change.
4. Business code, shared packages, scripts, and local `CLAUDE.md` files must not contain `[UPDATE]`, dates, PR numbers, step progress, review closures, validation broadcasts, or any timeline-style logs.
5. Design docs / implementation plans for new requirements go to `docs/plans/*` first; `docs/design/*` and `docs/reference/*` hold only adopted stable facts.
6. `index.md` files serve only as navigation; design/runbook prose is the single source of truth; historical process relies on git / PR / changelog.
7. Before PR merge, adopted stable facts from `docs/plans/*` must be distilled into the corresponding `docs/design/*` or `docs/reference/*`; plan docs absorbed by official prose must be deleted or shrunk — no long-term duplication.
8. `completed / implemented / confirmed` docs must be frozen as "current state / current implementation / current verification baseline" before merge, with redundant process logs removed.
9. No backward compatibility — delete/refactor unused code directly, do not keep deprecated comments.
10. Unless it directly affects existing user data, always refactor to best practices without accommodating old code/data structures.
11. Only create new `CLAUDE.md` and `AGENTS.md` symlinks when the current directory (including all subdirectories) contains `> 10` files.

## Global Boundaries

- Repo narrative: Moryflow is the primary product; Anyhunt exists as a capability platform and parent brand in the same monorepo
- Moryflow: `www.moryflow.com` + `server.moryflow.com` + `moryflow.app`
- Anyhunt Dev: `anyhunt.app` + `server.anyhunt.app/api/v1` + `console.anyhunt.app` + `admin.anyhunt.app`
- API Key prefixes: Moryflow=`mf_`, Anyhunt Dev=`ah_`
- Anyhunt Dev currently serves capabilities via API Key + dynamic rate-limiting by default

## Collaboration Rules

- Conversation language adapts to match the user's language
- User-facing copy, error messages, and API response messages use English
- Git commit messages must be in English
- Look before you leap — never guess implementations; prefer reusing existing interfaces, types, and utilities
- Root-cause fixes first — no band-aid patches
- External review feedback: validate before acting — reproduce or read the code to confirm applicability to the current codebase
- **Design system (mandatory)**: all UI changes must first read `docs/reference/design-system.md` and follow the macOS native-feel design spec
- Interaction design by subtraction: fewer interruptions, less jargon, fewer entry points, clear next steps
- Request and state management: `Zustand Store + Methods + Functional API Client`
- AI agents must not execute `git commit` / `git push` / `git tag` without explicit user authorization
- If the user has explicitly authorized commits for the current PR, that authorization covers only the continuous `commit` / `push` / comment reply / review thread resolve / CI fix actions necessary to reach a mergeable state; it does not extend to other PRs, tags, releases, or merges

Request and state design sources of truth:

- `docs/design/anyhunt/core/request-and-state-unification.md`
- `docs/design/moryflow/core/ui-conversation-and-streaming.md`

## Global Deployment Pitfalls

- TanStack Start SSR must not reuse a Router singleton on the server; create a new router per request
- Reverse proxy deployments must enable `trust proxy`
- `deploy/moryflow/docker-compose.yml`: `moryflow-server` must explicitly inject and share `SYNC_ACTION_SECRET`
- `**/.tanstack/**`, `**/routeTree.gen.*` and other generated files must not be hand-edited
- TanStack Start/Nitro server builds must avoid multiple React instances; explicitly set `nitro.noExternals=false`
- By default, do not trigger `pull_request` / `pull_request_target` build, test, or packaging on `self-hosted` runners; external contribution checks must use GitHub-hosted runners or isolated short-lived execution environments

## Documentation Routing

- Docs entry point: `docs/index.md`
- Design index: `docs/design/index.md`
- Reference index: `docs/reference/index.md`
- Anyhunt Core: `docs/design/anyhunt/core/index.md`
- Moryflow Core: `docs/design/moryflow/core/index.md`

Choose docs by task:

| Task                                                                                             | Read First                                     |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| UI changes, styles, interactions, component design, colors/radii/animations                      | `docs/reference/design-system.md`              |
| Repo background, directory structure, migration reference                                        | `docs/reference/repository-context.md`         |
| Collaboration rules, PR readiness, comment/CI follow-up, plans write-back, doc sync, git commits | `docs/reference/collaboration-and-delivery.md` |
| Testing requirements, risk tiers, validation commands                                            | `docs/reference/testing-and-validation.md`     |
| State management, forms, Zod, DTOs, naming, security                                             | `docs/reference/engineering-standards.md`      |
| SSR, reverse proxy, builds, package artifacts, deploy baselines                                  | `docs/reference/build-and-deploy-baselines.md` |

## Working Mode

1. Start with a minimal-scope plan stating motivation and risks; clarify first when key requirements are uncertain
2. Focus on a single problem — no blind changes
3. Execute minimum necessary validation by risk tier; escalate to root-level full validation only when genuinely needed
4. Only update source-of-truth prose, necessary indexes, and related `CLAUDE.md` files that have become stale

## Naming Convention

- `CLAUDE.md` is the primary file
- `AGENTS.md` is a symlink to `CLAUDE.md` for agents.md spec compatibility
