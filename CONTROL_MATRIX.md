# Security Control Matrix

## 1. Overview

This document provides a comprehensive mapping of security controls implemented in the Event Management CMS platform. Each control is categorized by domain, with associated policies, procedures, control types, and ownership.

## 2. Control Categories

| Category | Description |
|----------|-------------|
| **Preventive** | Controls that prevent security incidents from occurring |
| **Detective** | Controls that identify security incidents when they occur |
| **Corrective** | Controls that remediate security incidents after detection |

## 3. Access Control (AC)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| AC-01 | Authentication Required | All API endpoints require valid authentication | User must authenticate via OIDC before accessing protected resources | Preventive | Security Team | `isAuthenticated` middleware in `server/replitAuth.ts` |
| AC-02 | Session Management | Sessions expire after inactivity period | Sessions stored in PostgreSQL with automatic expiration | Preventive | Platform Team | `connect-pg-simple` session store with TTL |
| AC-03 | Token Refresh | Access tokens automatically refreshed | Refresh tokens used to maintain active sessions | Preventive | Platform Team | `isAuthenticated` middleware with token refresh logic |
| AC-04 | Role-Based Access Control | Users assigned roles within organizations | Role checked before sensitive operations | Preventive | Product Team | `organizationMembers.role` field enforcement |
| AC-05 | Multi-Tenant Isolation | Each organization's data completely isolated | All queries scoped by organizationId | Preventive | Engineering | Storage layer methods require organizationId |
| AC-06 | Secure Cookie Configuration | Session cookies protected from theft | HttpOnly, Secure flags set | Preventive | Security Team | Session configuration in `server/replitAuth.ts` |

## 4. Input Validation (IV)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| IV-01 | Schema Validation | All API inputs validated against schemas | Zod schemas parse and validate request bodies | Preventive | Engineering | `insertSchema.parse()` in route handlers |
| IV-02 | Type Safety | Strong typing prevents type confusion | TypeScript enforces compile-time type checking | Preventive | Engineering | TypeScript strict mode enabled |
| IV-03 | Email Format Validation | Email addresses validated before storage | Regex pattern matching for email format | Preventive | Engineering | Zod email schema validation |
| IV-04 | Phone Number Validation | Phone numbers validated for format | Pattern matching and length checks | Preventive | Engineering | Custom validation in schemas |
| IV-05 | File Type Validation | Only allowed file types accepted | MIME type and extension checking | Preventive | Engineering | File upload handlers with type filtering |
| IV-06 | Excel/CSV Sanitization | Imported data validated and sanitized | ExcelJS and PapaParse with input validation | Preventive | Engineering | Import handlers in `import-attendees.tsx` |

## 5. Rate Limiting (RL)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| RL-01 | Payment Rate Limiting | Payment endpoints protected from abuse | Max 10 payment intents per minute per IP | Preventive | Security Team | `createPaymentIntentLimiter` in `server/rateLimit.ts` |
| RL-02 | Payment Verification Limiting | Payment verification protected | Max 20 verifications per minute per IP | Preventive | Security Team | `verifyPaymentLimiter` |
| RL-03 | Registration Rate Limiting | Public registration protected | Max 5 registrations per minute per IP | Preventive | Security Team | `publicRegistrationLimiter` |
| RL-04 | Code Validation Rate Limiting | Invite code validation protected | Max 30 validations per minute per IP | Preventive | Security Team | `validateInviteCodeLimiter` |

## 6. Data Protection (DP)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| DP-01 | Encryption in Transit | All data encrypted during transmission | TLS 1.2+ required for all connections | Preventive | Platform Team | Replit platform HTTPS enforcement |
| DP-02 | Encryption at Rest | Database encrypted at rest | Cloud provider managed encryption | Preventive | Infrastructure | Neon PostgreSQL encryption |
| DP-03 | Payment Data Handling | No card data stored | Stripe handles all payment data (PCI DSS) | Preventive | Engineering | Stripe.js tokenization |
| DP-04 | Secrets Management | Credentials stored securely | Environment variables via Replit Secrets | Preventive | DevOps | `.env` files excluded from git |
| DP-05 | Database Credentials | Database access restricted | Connection string in secure environment | Preventive | DevOps | `DATABASE_URL` environment variable |
| DP-06 | API Key Security | Third-party API keys protected | Keys stored as secrets, never in code | Preventive | Security Team | Replit Secrets management |

## 7. Logging and Monitoring (LM)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| LM-01 | Sensitive Data Redaction | Logs never contain sensitive data | Automatic redaction of passwords, tokens, keys | Preventive | Security Team | `redactSensitiveData()` in `server/logger.ts` |
| LM-02 | API Key Redaction | Stripe keys redacted in logs | Pattern matching for sk_*, pk_* prefixes | Preventive | Security Team | Sensitive patterns in logger.ts |
| LM-03 | Email Redaction | Email addresses redacted | Regex pattern replacement in logs | Preventive | Security Team | Email pattern in `SENSITIVE_PATTERNS` |
| LM-04 | Error Logging | Errors logged with context | Error details captured for debugging | Detective | Engineering | `logError()` function |
| LM-05 | Rate Limit Alerts | Rate limit violations logged | Warning logs when limits exceeded | Detective | Security Team | Rate limiter handler logging |
| LM-06 | Authentication Events | Login/logout events tracked | Session creation and destruction logged | Detective | Security Team | Auth route logging |

## 8. SQL Injection Prevention (SI)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| SI-01 | Parameterized Queries | All database queries parameterized | Drizzle ORM generates safe queries | Preventive | Engineering | Drizzle ORM query builder |
| SI-02 | ORM Abstraction | No raw SQL in application code | All queries through Drizzle methods | Preventive | Engineering | Storage interface pattern |
| SI-03 | Type-Safe Queries | Query types validated at compile time | TypeScript + Drizzle type inference | Preventive | Engineering | Drizzle-zod schema integration |

## 9. XSS Prevention (XS)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| XS-01 | React Auto-Escaping | Output automatically escaped | React DOM methods escape content | Preventive | Engineering | React JSX rendering |
| XS-02 | Content Security Policy | Inline scripts restricted | CSP headers configured | Preventive | Security Team | HTTP header configuration |
| XS-03 | dangerouslySetInnerHTML Avoided | Raw HTML injection avoided | Only used with sanitized content | Preventive | Engineering | Code review policy |

## 10. Dependency Security (DS)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| DS-01 | Vulnerability Scanning | Dependencies scanned for CVEs | Regular npm audit runs | Detective | Security Team | `npm audit` in CI pipeline |
| DS-02 | Vulnerable Package Replacement | Known vulnerable packages replaced | xlsx replaced with ExcelJS | Corrective | Engineering | Package.json updates |
| DS-03 | Dependency Updates | Dependencies kept current | Regular update cycles | Preventive | Engineering | Dependabot or manual updates |

## 11. Session Security (SS)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| SS-01 | Session Expiration | Sessions expire after timeout | PostgreSQL session store with TTL | Preventive | Security Team | `expire` column with index |
| SS-02 | Session Invalidation | Sessions invalidated on logout | Session destroyed on /api/logout | Corrective | Engineering | Passport logout handler |
| SS-03 | Session Storage Security | Sessions stored server-side | PostgreSQL store, not client-side | Preventive | Platform Team | `connect-pg-simple` |
| SS-04 | Session ID Rotation | New session ID on authentication | Passport regenerates session | Preventive | Security Team | Passport.js session handling |

## 12. Error Handling (EH)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| EH-01 | Generic Error Messages | Detailed errors not exposed to users | User-friendly messages, detailed logs | Preventive | Engineering | Error handling middleware |
| EH-02 | Stack Trace Protection | Stack traces server-side only | Production mode hides stack traces | Preventive | DevOps | NODE_ENV configuration |
| EH-03 | Graceful Degradation | Service failures handled gracefully | Try-catch with fallback behavior | Corrective | Engineering | Error boundaries and handlers |

## 13. File Upload Security (FU)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| FU-01 | File Type Restriction | Only allowed types accepted | MIME type validation on upload | Preventive | Engineering | Object storage handlers |
| FU-02 | File Size Limits | Maximum file size enforced | Size check before processing | Preventive | Engineering | Upload configuration |
| FU-03 | Presigned URLs | Direct uploads to storage | Presigned URLs for secure uploads | Preventive | Engineering | `objectStorage.ts` |
| FU-04 | ACL Enforcement | Access control on stored files | Public/private ACL policies | Preventive | Engineering | `objectAcl.ts` |

## 14. Payment Security (PS)

| ID | Control | Policy | Procedure | Type | Owner | Implementation |
|----|---------|--------|-----------|------|-------|----------------|
| PS-01 | PCI Compliance Delegation | Card data never touches servers | Stripe handles all payment data | Preventive | Security Team | Stripe.js frontend integration |
| PS-02 | Webhook Verification | Stripe webhooks verified | Signature validation on webhooks | Preventive | Engineering | Stripe SDK signature check |
| PS-03 | Payment Token Usage | Only tokens stored, not card data | PaymentIntent IDs stored | Preventive | Engineering | `paymentIntentId` field |
| PS-04 | Secure Key Storage | Stripe keys in secure storage | Keys in environment secrets | Preventive | DevOps | Replit Secrets |

## 15. Control Summary by Domain

| Domain | Preventive | Detective | Corrective | Total |
|--------|-----------|-----------|------------|-------|
| Access Control | 6 | 0 | 0 | 6 |
| Input Validation | 6 | 0 | 0 | 6 |
| Rate Limiting | 4 | 0 | 0 | 4 |
| Data Protection | 6 | 0 | 0 | 6 |
| Logging & Monitoring | 3 | 3 | 0 | 6 |
| SQL Injection Prevention | 3 | 0 | 0 | 3 |
| XSS Prevention | 3 | 0 | 0 | 3 |
| Dependency Security | 1 | 1 | 1 | 3 |
| Session Security | 3 | 0 | 1 | 4 |
| Error Handling | 2 | 0 | 1 | 3 |
| File Upload Security | 4 | 0 | 0 | 4 |
| Payment Security | 4 | 0 | 0 | 4 |
| **Total** | **45** | **4** | **3** | **52** |

## 16. Ownership Summary

| Owner | Controls | Responsibilities |
|-------|----------|-----------------|
| Security Team | 14 | Authentication, rate limiting, logging, encryption |
| Engineering | 28 | Input validation, query safety, error handling |
| Platform Team | 5 | Infrastructure, session management |
| DevOps | 4 | Environment configuration, secrets |
| Product Team | 1 | Role definitions, access policies |

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Review Cycle: Quarterly*
