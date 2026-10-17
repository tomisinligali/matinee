---
trigger: always_on
---

# Money and Billing Rules

## Authority and Scope
- Follow `AGENTS.md`, the PRD, approved architecture, and applicable domain rules.
- Do not invent ticket prices, platform fees, cinema commissions, taxes, settlement schedules, cancellation fees, or refund policies.
- Treat unresolved payment-provider, merchant-of-record, and settlement decisions as blockers to the affected implementation.
- Keep payment-provider code isolated behind a dedicated adapter. Use only the provider approved in the project decision register.

## Money Handling
- Never use floating-point arithmetic for monetary values.
- Store monetary amounts as integers in the smallest supported currency unit.
- Store and validate currency explicitly; never assume all amounts use the same currency.
- Calculate prices, fees, totals, and refunds on the server.
- Never trust client-supplied prices, discounts, fees, totals, or currency.
- Preserve the agreed price and currency on the booking or purchase record so later catalogue or pricing changes cannot alter historical transactions.
- Do not calculate or charge fees unless the relevant commercial policy has been approved.

## Payment Lifecycle
- Persist a payment-attempt record before or as part of initiating an external payment flow.
- Assign each logical payment attempt a stable, unique reference.
- Verify payment status using authenticated provider data or a provider API lookup.
- A client redirect, screenshot, callback parameter, or success message is never proof of payment.
- Verify the expected reference, amount, currency, and applicable transaction status before accepting payment.
- Keep payment state separate from booking and inventory state.
- Never mark a payment successful solely because a checkout session was created.
- Do not create a second independent payment attempt while the first attempt's outcome is unresolved.
- A timeout or network failure does not prove that payment failed.

## Idempotency and Webhooks
- Make payment initiation and finalization safe against duplicate requests.
- Reusing an idempotency key with a different request payload must be rejected.
- Verify webhook authenticity according to the selected provider's official documentation.
- Persist and deduplicate provider events before applying their effects.
- Handle duplicate, delayed, and out-of-order events without reversing a confirmed booking or overwriting a verified financial outcome.
- Do not rely on webhook delivery alone; provide a reconciliation path for missing or delayed events.

## Refunds and Reconciliation
- Create durable refund records with references, amounts, currency, status, and relevant provider identifiers.
- Apply only the approved cancellation and refund policy.
- Do not assume that a refund request means the refund succeeded.
- Track pending, failed, completed, and unresolved refund outcomes.
- Use provider-supported idempotency and bounded retries where available.
- Reconcile local payment and refund records against provider records.
- Keep unmatched transactions and unresolved financial outcomes visible for authorized support or operational review.
- Never silently delete or overwrite payment history to hide a failed or uncertain transaction.

## Security and Audit
- Keep payment credentials server-side and out of source control, client bundles, logs, and error responses.
- Do not store card details unless a separately approved compliant design explicitly requires it.
- Restrict access to payment, refund, and reconciliation data.
- Audit sensitive financial actions with actor, timestamp, action, affected record, and correlation identifiers.
- Never allow payment processing to bypass authorization or booking-integrity rules.

## Testing Requirements
Test:
- Amount and currency validation.
- Invalid, mismatched, pending, failed, and successful payment verification.
- Duplicate requests and idempotency-key payload conflicts.
- Invalid signatures and duplicate, delayed, or out-of-order webhooks.
- Provider timeouts followed by eventual success.
- Refund retries, timeouts, and unresolved outcomes.
- Reconciliation of unmatched or missing transactions.
- Authorization and sensitive-data redaction.

## Completion Requirements
- Implement durable payment records, server-side verification, idempotency, safe error handling, and reconciliation where applicable.
- Document provider limitations and unresolved financial policies.
- Never claim payment or refund success without authoritative verification.