---
trigger: always_on
---


# Security and Access Control

## Security Authority

- Follow `AGENTS.md`, `PRD.md`, and applicable approved privacy, retention, and regulatory decisions.
- Enforce security controls on the server. Client-side checks, hidden UI controls, and navigation restrictions are not authorization.
- If a change depends on an unresolved security, privacy, or regulatory decision, stop the affected work and report the blocker.
- Never weaken booking integrity, financial correctness, historical-data protection, or access controls to make a feature easier to implement.

## Authentication and Authorization

- Authenticate protected requests using the project's approved authentication mechanism.
- Enforce authorization for every protected operation, including reads, writes, exports, status changes, and recovery actions.
- Verify that a customer can access only their own bookings and permitted customer data.
- Verify that cinema operators have an active membership for the specific cinema being accessed.
- Enforce the approved fixed MVP operator roles on the server.
- Do not trust user IDs, cinema IDs, roles, ownership claims, or permission flags supplied by the client without verification.
- Revoking a cinema membership must immediately prevent future administrative access.
- Do not delete historical bookings or payments when a membership is revoked.
- Restrict platform administration and sensitive financial operations to explicitly authorized staff.
- Apply the same backend authorization and domain rules to mobile and administration clients.
- Never implement an administrative bypass that skips normal domain safeguards.

## Input Validation and API Protection

- Validate path parameters, query parameters, request bodies, uploaded content, and external-provider payloads.
- Reject malformed, unsupported, out-of-range, or unauthorized input explicitly.
- Use Prisma or reviewed parameterized SQL for database access. Never build SQL by concatenating untrusted input.
- Apply request-size limits and appropriate rate limits to authentication, seat-hold creation, checkout, and sensitive administrative actions.
- Avoid exposing stack traces, database details, credentials, internal secrets, or unnecessary personal or financial data in API responses.
- Use consistent error responses that do not reveal protected information.
- Protect state-changing endpoints against unauthorized invocation and replay where applicable.
- Use secure transport and the approved session/token handling strategy for the deployment environment.

## Secrets and Sensitive Data

- Keep database credentials, Flutterwave credentials, webhook secrets, signing keys, and other secrets outside source control.
- Never embed server secrets or privileged provider credentials in the React Native application.
- Do not log authentication tokens, passwords, secrets, raw payment credentials, or unnecessary sensitive personal data.
- Avoid collecting or retaining data that is not required for an approved product or operational purpose.
- Do not store raw card details unless an explicitly approved compliant payment design requires it.
- Prefer provider-hosted or appropriately tokenized payment collection.
- Restrict access to financial records and sensitive operational logs according to least privilege.
- Use safe configuration defaults and validate required environment variables at startup.
- Never silently substitute missing production credentials with insecure defaults.

## Flutterwave and Webhook Security

- Keep Flutterwave API credentials on the server.
- Verify webhook authenticity according to current official Flutterwave documentation.
- Reject unauthenticated or invalid provider events without changing payment or booking state.
- Do not trust a client redirect, callback parameter, or browser success page as proof of payment.
- Verify provider transaction status through authenticated provider data and/or an appropriate server-side transaction lookup.
- Deduplicate provider events according to the documented event-identity scope.
- Make webhook processing safe under retries, duplicates, delays, and out-of-order delivery.
- Do not log complete webhook secrets, authentication headers, or unnecessary sensitive payload fields.
- Keep payment verification and booking confirmation behind the appropriate domain-level checks.

## Audit and Accountability

- Record the actor, timestamp, action, target, and relevant correlation identifiers for critical changes.
- Audit inventory and showtime changes, membership and ownership changes, cinema suspensions, financial reconciliation, refunds, and privileged recovery actions.
- Keep audit metadata safe and avoid unnecessary sensitive data.
- Restrict access to audit records and protect them against unauthorized modification.
- Preserve audit history when related operational records are archived or deactivated.
- Ensure that support recovery actions are attributable to an authorized actor or an explicitly identified system process.

## Privacy and Retention

- Do not invent data-retention periods, consent requirements, or regulatory interpretations.
- Follow documented, approved requirements for the launch market.
- Minimize personal data collection and limit access to what each role needs.
- Preserve legally and operationally required financial and audit records.
- Apply approved retention and deletion rules without destroying records needed for financial reconciliation, dispute resolution, or audit.
- Do not approve public launch while required privacy, retention, or regulatory decisions remain unresolved.

## Security Verification

For applicable changes, test:

- Unauthenticated access to protected endpoints.
- Cross-customer booking access attempts.
- Cross-cinema operator access attempts.
- Revoked membership and insufficient-role access.
- Malformed and unauthorized request inputs.
- Rate limits on sensitive endpoints.
- Invalid webhook authentication and duplicate event handling.
- Secret exposure through source files, logs, API responses, and mobile configuration.
- Historical-record preservation and audit generation for privileged actions.

Report actual results. Do not claim a security review or launch approval based only on passing unit tests.
