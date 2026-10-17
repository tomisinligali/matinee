---
trigger: always_on
---


# Git and Change Management

## Repository Authority

- Follow the repository's existing branch, commit-message, package-manager, and review conventions.
- Read `AGENTS.md`, relevant PRD requirements, and existing project documentation before making changes.
- Do not invent or enforce a new branching strategy or commit-message format unless the project has approved one.
- Keep changes aligned with the current roadmap phase and requested acceptance criteria.

## Scope Control

- Keep each change focused on one coherent task or closely related set of acceptance criteria.
- Do not bundle unrelated refactors, dependency upgrades, formatting sweeps, or speculative features into a task.
- Inspect the working tree before modifying files.
- Preserve unrelated user changes. Never overwrite, revert, or discard them without explicit authorization.
- Do not use destructive Git commands to clean up a working tree unless their effects are understood and explicitly authorized.
- Review the final diff for unintended file changes, generated artifacts, secrets, and accidental deletions.

## Commit Quality

- Make commits reviewable and coherent according to the repository's established conventions.
- Do not claim a change has been committed unless the commit command actually succeeded.
- Do not rewrite shared history or force-push unless explicitly authorized and appropriate for the repository workflow.
- Do not amend, reset, rebase, or discard existing work in a way that risks losing another contributor's changes.
- Do not commit build outputs, dependency caches, temporary debugging files, local databases, or generated files unless the project explicitly requires them.

## Security and Sensitive Changes

- Never commit credentials, `.env` files containing secrets, private keys, payment credentials, webhook secrets, customer data, or sensitive logs.
- Keep `.env.example` limited to variable names and safe placeholders.
- Inspect staged changes before committing.
- Do not disable security checks, tests, lint rules, or pre-commit safeguards to force a commit through.
- Treat changes involving migrations, seat allocation, payment state, refunds, authorization, or data retention as high-risk and ensure their review and tests are proportionate to their impact.

## Documentation and Traceability

- Update relevant documentation when a change affects API contracts, architecture, database invariants, payment lifecycles, operational procedures, or approved decisions.
- Record approved changes to locked technologies, business rules, or launch requirements in the appropriate decision documentation.
- Do not use a code comment or commit message as a substitute for recording a blocking product or architecture decision.
- Preserve meaningful migration history and test evidence.
- Do not claim that a test, build, migration, review, or deployment succeeded without actual evidence.

## Final Diff Verification

Before reporting completion:

- Review the changed-file list and final diff.
- Confirm that unrelated changes and accidental deletions are absent.
- Confirm that no secrets or sensitive data were introduced.
- Confirm that required tests and checks were run and their actual outcomes are documented.
- Report any uncommitted changes, failed checks, unresolved decisions, or incomplete acceptance criteria honestly.
- Follow the completion checklist in `AGENTS.md`.
