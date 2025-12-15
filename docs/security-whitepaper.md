# Sandbox Event Management Platform
# Security Whitepaper

**Version 1.0**  
**Last Updated: December 2025**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Overview](#platform-overview)
3. [Authentication & Access Controls](#authentication--access-controls)
4. [Multi-Tenant Data Isolation](#multi-tenant-data-isolation)
5. [Application Security](#application-security)
6. [Payment Processing & PCI DSS Alignment](#payment-processing--pci-dss-alignment)
7. [Data Protection](#data-protection)
8. [Monitoring & Incident Response](#monitoring--incident-response)
9. [Compliance & Governance](#compliance--governance)
10. [Shared Responsibility Model](#shared-responsibility-model)
11. [Appendix: PCI DSS Control Mapping](#appendix-pci-dss-control-mapping)

---

## Executive Summary

Sandbox is a comprehensive event management platform designed with security as a foundational principle. We understand that our customers trust us with sensitive information including attendee personal data, payment information, and business-critical event data.

This whitepaper provides transparency into our security practices, architecture, and controls. Our platform implements defense-in-depth strategies across all layers of our infrastructure and application, with particular emphasis on:

- **Data Protection**: Encryption in transit and at rest, with strict access controls
- **Payment Security**: PCI DSS-aligned controls with no storage of cardholder data
- **Multi-Tenancy**: Complete data isolation between organizations
- **Application Hardening**: Input validation, rate limiting, and secure logging practices
- **Continuous Monitoring**: Real-time security monitoring and incident response procedures

We are committed to maintaining the highest standards of security to protect your data and your attendees' information.

---

## Platform Overview

### Architecture Summary

Sandbox is built on a modern, secure technology stack:

| Component | Technology | Security Benefit |
|-----------|------------|------------------|
| Frontend | React with TypeScript | Type safety, XSS prevention |
| Backend | Node.js with Express | Industry-standard security middleware |
| Database | PostgreSQL | ACID compliance, encryption support |
| Authentication | OpenID Connect (OIDC) | Industry-standard identity protocol |
| Payments | Stripe | PCI DSS Level 1 certified processor |
| Hosting | Replit Cloud | Managed infrastructure security |

### Data Classification

We classify data into the following categories to ensure appropriate handling:

| Classification | Description | Examples | Handling |
|----------------|-------------|----------|----------|
| **Public** | Non-sensitive, publicly visible | Event names, public descriptions | Standard protection |
| **Internal** | Business data, not for public | Event configurations, analytics | Access controls, encryption |
| **Confidential** | Sensitive personal/business data | Attendee PII, emails, phone numbers | Encryption, audit logging, redaction |
| **Restricted** | Highest sensitivity | Payment tokens, API keys, credentials | Never logged, encrypted, minimal access |

---

## Authentication & Access Controls

### Identity Management

Sandbox uses OpenID Connect (OIDC) for authentication, providing:

- **Single Sign-On (SSO)**: Seamless authentication experience
- **Token-Based Sessions**: Secure, stateless authentication tokens
- **Session Management**: Server-side session storage with automatic expiration
- **Secure Cookies**: HTTP-only, secure, same-site cookie configuration

### Session Security

| Control | Implementation |
|---------|----------------|
| Session Storage | PostgreSQL-backed session store (connect-pg-simple) |
| Session Timeout | 7-day session expiration |
| Cookie Security | HttpOnly, Secure, SameSite=Lax |
| Session Secrets | Environment-based secret management |

### Role-Based Access Control (RBAC)

Access to platform features is controlled through role assignments:

- **Owner**: Full administrative access to organization
- **Admin**: Event and data management capabilities
- **Member**: Limited access based on assigned permissions

All API endpoints enforce authentication and authorization checks before processing requests.

---

## Multi-Tenant Data Isolation

### Architecture

Sandbox operates as a multi-tenant platform where each customer organization's data is logically isolated from others.

### Isolation Controls

1. **Organization-Scoped Queries**: Every database query includes organization ID filtering
2. **API-Level Enforcement**: All API routes validate organization membership before data access
3. **Storage Layer Abstraction**: The data access layer enforces tenant isolation at the code level
4. **No Cross-Tenant Access**: It is architecturally impossible to access another organization's data

### Implementation Details

```
Request → Authentication → Organization Resolution → Scoped Data Access
```

Every authenticated request:
1. Validates the user's identity
2. Resolves the user's organization membership
3. Applies organization ID filtering to all data operations
4. Returns only data belonging to the authorized organization

---

## Application Security

### Input Validation

All user inputs are validated before processing:

- **Schema Validation**: Zod schemas validate request data structure and types
- **Type Coercion Prevention**: Strict type checking prevents type confusion attacks
- **Boundary Checks**: Numeric inputs validated for range and format
- **Format Validation**: Email, phone, and other formatted data validated against patterns

### Rate Limiting

Public-facing endpoints are protected against abuse:

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Payment Intent Creation | 10 requests | 1 minute |
| Payment Verification | 20 requests | 1 minute |
| Public Registration | 5 requests | 1 minute |
| Invite Code Validation | 30 requests | 1 minute |

Rate limit responses return a generic error message to prevent information disclosure.

### Secure Logging

Our logging system implements security-first practices:

**Redacted Data Categories:**
- Email addresses
- Payment card numbers
- CVV/CVC codes
- API keys and secrets
- Authentication tokens
- Stripe payment intent IDs

**Logging Controls:**
- Sensitive field names automatically redacted
- Pattern-based redaction for known sensitive formats
- Payload size limits prevent log flooding
- Production logging limited to warnings and errors only

### Error Handling

- **Generic Public Errors**: Public-facing endpoints return non-descriptive error messages
- **No Stack Traces**: Error details never exposed to end users
- **Secure Error Logging**: Internal errors logged with sensitive data redacted

---

## Payment Processing & PCI DSS Alignment

### Payment Architecture

Sandbox integrates with Stripe for payment processing, leveraging their PCI DSS Level 1 certification.

**Key Principle: We never store, process, or transmit cardholder data.**

### Payment Flow

```
1. Customer → Stripe.js (frontend) → Card data sent directly to Stripe
2. Stripe → Returns secure payment token
3. Our Backend → Uses token to complete transaction
4. Confirmation → Customer notified of success/failure
```

### PCI DSS Controls

| Requirement | Our Implementation |
|-------------|-------------------|
| **Req 1: Firewall** | Managed cloud infrastructure with network isolation |
| **Req 2: Secure Configuration** | No default credentials, hardened configurations |
| **Req 3: Protect Stored Data** | No cardholder data stored; tokens only |
| **Req 4: Encrypt Transmission** | TLS 1.2+ for all communications |
| **Req 5: Malware Protection** | Managed infrastructure with security monitoring |
| **Req 6: Secure Systems** | Input validation, secure coding practices |
| **Req 7: Restrict Access** | Role-based access, least privilege |
| **Req 8: Identify Users** | OIDC authentication, unique user IDs |
| **Req 9: Physical Security** | Cloud provider responsibility |
| **Req 10: Monitor Access** | Secure logging with audit trails |
| **Req 11: Test Security** | Regular security assessments |
| **Req 12: Security Policy** | Documented security procedures |

### Payment Validation

Before processing any payment:
- Amount must be a finite, positive number
- Amount must be within acceptable bounds ($0.01 - $999,999.99)
- Currency must be from approved list (USD, EUR, GBP, CAD, AUD)
- Package and event must exist and be active

---

## Data Protection

### Encryption

**In Transit:**
- All connections use TLS encryption (managed by hosting provider)
- HTTPS enforced for all web traffic

**At Rest:**
- Database encryption managed by cloud provider (Neon PostgreSQL)
- Sensitive configuration stored in secure secrets management
- API keys and credentials never stored in code

### Data Minimization

We collect only the data necessary for platform operation:
- Attendee registration information
- Event configuration data
- Payment transaction references (no card data)
- Usage analytics for platform improvement

### Data Retention

- Active data retained while account is active
- Deleted data removed from production systems promptly
- Backup retention follows industry standard practices

---

## Monitoring & Incident Response

### Security Monitoring

- **Application Logging**: All significant events logged with timestamps
- **Error Tracking**: Application errors captured and analyzed
- **Rate Limit Alerts**: Excessive request patterns detected
- **Access Logging**: Authentication and authorization events recorded

### Incident Response

Our incident response process follows industry best practices:

1. **Detection**: Automated monitoring and user reports
2. **Triage**: Severity assessment and team notification
3. **Containment**: Immediate actions to limit impact
4. **Investigation**: Root cause analysis
5. **Remediation**: Fix deployed and verified
6. **Communication**: Affected parties notified as appropriate
7. **Post-Incident Review**: Lessons learned documented

### Vulnerability Management

- Regular dependency updates
- Security patch prioritization
- Third-party library monitoring

---

## Compliance & Governance

### Security Practices

- Secure development lifecycle
- Code review requirements
- Automated testing
- Dependency vulnerability scanning

### Third-Party Risk Management

We carefully evaluate third-party services:

| Service | Purpose | Security Consideration |
|---------|---------|----------------------|
| Stripe | Payments | PCI DSS Level 1 certified |
| Replit | Hosting | SOC 2 compliant infrastructure |
| PostgreSQL | Database | Industry-standard security |

---

## Shared Responsibility Model

Security is a shared responsibility between Sandbox and our customers.

### Sandbox Responsibilities

- Platform security and availability
- Secure application development
- Infrastructure protection
- Data encryption
- Security monitoring
- Incident response
- Compliance maintenance

### Customer Responsibilities

- **Account Security**: Maintain strong, unique passwords
- **Access Management**: Review and manage team member access
- **API Key Protection**: Keep Stripe API keys secure
- **Data Accuracy**: Ensure attendee data is accurate and lawfully collected
- **Compliance**: Comply with applicable laws (GDPR, CCPA, etc.) for your use case
- **Reporting**: Promptly report suspected security issues

### Security Contact

To report security concerns or vulnerabilities, please contact our security team through the appropriate channels provided in your account dashboard.

---

## Appendix: PCI DSS Control Mapping

The following table maps PCI DSS requirements to our platform controls:

| PCI DSS Requirement | Control Category | Sandbox Implementation |
|---------------------|------------------|----------------------|
| 1.1 | Network Security | Cloud-managed firewall and network isolation |
| 2.1 | Secure Defaults | No default credentials; secure configuration management |
| 3.1 | Data Storage | No cardholder data stored; Stripe tokenization |
| 3.4 | Encryption | No PAN storage; all tokens encrypted |
| 4.1 | Transmission Security | TLS 1.2+ enforced on all connections |
| 6.1 | Vulnerability Management | Regular dependency updates and patching |
| 6.3 | Secure Development | Input validation, output encoding, secure coding |
| 6.5 | Application Security | OWASP Top 10 protections implemented |
| 7.1 | Access Control | Role-based access with least privilege |
| 8.1 | User Identification | Unique user IDs via OIDC authentication |
| 8.3 | Authentication | Strong authentication via OIDC provider |
| 10.1 | Audit Logging | All access and changes logged |
| 10.2 | Log Content | Security events captured with timestamps |
| 10.5 | Log Security | Logs protected with access controls |
| 11.3 | Security Testing | Regular security assessments |
| 12.1 | Security Policy | Documented security procedures |

---

## Document Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2025 | Initial release |

---

*This document is provided for informational purposes and describes our security practices as of the publication date. Security practices are continuously improved and may change without notice to this document.*
