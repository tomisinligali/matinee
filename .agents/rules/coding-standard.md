---
trigger: always_on
---


# Coding Standards

## Authority and Scope

- Follow `AGENTS.md`, `PRD.md`, the approved roadmap phase, and existing repository conventions.
- Read relevant source files, tests, configuration, and adjacent rules before changing code.
- Apply only the rules relevant to the current task. Do not expand scope without approval.
- When requirements conflict, stop and report the conflict rather than silently weakening security, financial correctness, or booking integrity.
- Do not introduce an unapproved framework, language, dependency, infrastructure component, or architectural pattern.

## Separation of Concerns

- Keep UI presentation, HTTP transport, domain logic, persistence, and external-provider integrations separate.
- Keep Express route handlers focused on request handling, validation orchestration, and response mapping. Delegate business operations to domain services.
- Keep React Native components focused on presentation and user interaction. Put API communication in the established service layer.
- Keep domain-specific responsibilities within their designated modules. Do not merge booking, inventory, payments, refunds, and notifications into an undifferentiated module.
- Keep Flutterwave-specific behaviour behind a payment integration boundary.
- Keep TMDB metadata retrieval separate from authoritative cinema inventory and booking operations.
- Reuse established domain operations instead of duplicating critical business rules across routes, jobs, and UI components.

## Correctness and Error Handling

- Validate untrusted input at system boundaries. Type declarations alone do not validate runtime input.
- Enforce business invariants on the server, regardless of client-side validation.
- Use explicit, documented error handling. Never swallow exceptions or report success after an operation fails.
- Do not convert unknown payment outcomes, database failures, or incomplete operations into successful results.
- Preserve distinctions between validation failures, authorization failures, inventory conflicts, expired holds, pending payments, unknown outcomes, and confirmed bookings.
- Use transactions for operations that must succeed or fail together.
- Never use an application-level read-then-write check as the sole protection for concurrent inventory ownership.
- Keep historical financial and booking records intact when updating current operational state.

## Maintainability

- Use names that communicate domain meaning and state.
- Prefer straightforward implementations over clever or speculative abstractions.
- Keep changes focused on the requested acceptance criteria.
- Avoid unnecessary dependencies, circular imports, duplicated logic, premature generalization, and unrelated refactors.
- Follow the repository's established formatting, linting, naming, and file-organization conventions.
- Add comments for non-obvious business constraints, concurrency decisions, and recovery behaviour rather than narrating self-explanatory code.
- Do not impose arbitrary line limits or introduce a new style convention without an approved need.

## Language and Dependencies

- Follow the approved project language. Do not migrate between JavaScript and TypeScript without explicit approval.
- If TypeScript is approved, use strict type checking and avoid unjustified `any` types and unchecked casts.
- Maintain runtime validation for requests, provider responses, and other untrusted data even when TypeScript is used.
- Use supported, compatible dependencies and the repository's existing package manager and lockfile.
- Do not upgrade major dependency versions or add infrastructure solely for convenience.
- Do not introduce AI services or AI-based business decisions into the MVP.
- Do not disable lint rules, type checks, tests, or security controls merely to obtain a successful build.

## Testing and Completion

- Add or update tests for changed behaviour, relevant failure paths, and applicable business invariants.
- Use PostgreSQL integration tests for database constraints, transactions, and concurrency-sensitive behaviour.
- Mock external systems only where appropriate; mocks do not replace verification of critical provider and database behaviour.
- Run applicable tests, linting, formatting checks, approved type checks, and relevant builds.
- Report the actual commands and outcomes. Never claim a check passed if it was not run or failed.
- Do not report incomplete work as complete when required acceptance criteria or critical tests are missing.
- Update relevant API, architecture, operational, or decision documentation when behaviour or approved contracts change.
- Finish each task with the completion checklist required by `AGENTS.md`.

## Prohibited Shortcuts

- No fake payment successes or placeholder critical handlers in work reported as complete.
- No silent fallback that changes business meaning after a failure.
- No bypass of authorization, transaction boundaries, validation, or audit requirements.
- No secrets, production credentials, private customer data, or sensitive operational logs committed to source control.
- No claim of production readiness based solely on successful compilation or passing unit tests.
