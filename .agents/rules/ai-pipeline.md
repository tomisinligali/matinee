---
trigger: always_on
---

# AI Pipeline and Provider Integration Rules

## Authority and Scope
- Follow `AGENTS.md`, the PRD, and applicable domain rules.
- Implement only approved AI features.
- DeepSeek and Anthropic Claude are the approved potential providers. Do not add others without approval.
- Keep application logic provider-agnostic. Isolate provider-specific SDKs, requests, responses, authentication, and errors in dedicated adapters.
- Never invent model choices, features, or fallback behavior.

## Provider Integration
- Use a shared application-level interface with separate DeepSeek and Claude adapters.
- Centralize provider and model configuration; never hardcode provider choices throughout the codebase.
- Keep API credentials server-side and validate configuration at startup.
- Follow each provider's official API documentation. Do not assume identical models, parameters, tool calling, structured outputs, or streaming support.
- Verify capabilities for the selected model before implementation.
- Unsupported or misconfigured providers must fail clearly. Never silently switch providers or models.

## Output Validation
- Define typed inputs and outputs for each AI capability.
- Normalize provider responses into application-owned result types.
- Validate generated content against schemas and business rules, even when provider-side structured output is supported.
- Handle refusals, malformed or incomplete output, timeouts, rate limits, and provider errors explicitly.
- Treat all model output as untrusted. Deterministic application logic remains authoritative.

## Prompts and Tool Calling
- Keep trusted instructions separate from user input, uploaded files, retrieved content, and other untrusted context.
- Protect against prompt injection; prompts alone are not security controls.
- Send only necessary, authorized context. Enforce access controls before retrieving or sharing data.
- Allow only explicitly approved tools with validated arguments, permissions, and preconditions.
- Never let AI bypass authorization, execute arbitrary code, access unrestricted databases, or modify protected records without approved application workflows.
- Require confirmation for consequential actions where specified by the PRD.

## Security and Privacy
- Never expose API keys, secrets, payment credentials, or sensitive data in clients, source control, logs, or errors.
- Apply least privilege, input/output limits, rate limiting, and appropriate abuse controls.
- Verify each provider's data-use, retention, privacy, and contractual terms before sending sensitive or personal information.
- Do not assume DeepSeek and Claude provide equivalent privacy or retention guarantees.
- Avoid logging full prompts and responses unless explicitly justified and protected.

## Reliability and Cost
- Use bounded timeouts, retries, concurrency, and token budgets.
- Retry only appropriate transient failures, using backoff where necessary.
- Handle rate limits, quota exhaustion, outages, and incomplete streams explicitly.
- Never repeat consequential actions simply because an AI request timed out.
- Prevent AI failures from corrupting application state or bypassing deterministic workflows.
- Track usage and cost where supported. Avoid redundant calls, excessive context, and unbounded generation.
- No automatic provider or model fallback without explicit approval and defined privacy, cost, and compatibility rules.

## Data and Auditability
- Persist AI inputs, outputs, and history only when required by the PRD and retention policy.
- Store normalized results rather than coupling application data to provider-specific payloads.
- Record relevant provider, model, prompt version, status, latency, usage, and correlation metadata.
- Keep AI suggestions separate from authoritative domain records until validated and accepted.
- AI must never silently change bookings, showtimes, seat allocations, prices, payments, refunds, or permissions.

## Testing Requirements
Test applicable changes for:
- Provider configuration and each implemented adapter.
- Response normalization, schema validation, and unsupported capabilities.
- Missing credentials, malformed output, refusals, and incomplete responses.
- Unauthorized tool calls, prompt injection, and protected-data access.
- Timeouts, retries, rate limits, outages, and interrupted streams.
- Access controls, sensitive-data redaction, and usage limits.
- Deterministic business rules and safe behavior when a provider is unavailable.

Use mocks for unit tests and appropriate provider environments for adapter integration tests. Mocks alone do not verify external API compatibility.

## Completion Requirements
- Implement relevant validation, authorization, error handling, observability, and tests.
- Document provider-specific limitations and unresolved decisions.
- Verify capabilities against official documentation before claiming support.
- Never introduce unapproved AI functionality or allow AI to bypass application rules.