# System Description

## 1. Overview

The Event Management CMS is a comprehensive SaaS platform designed for managing events, attendees, speakers, sessions, content, budgets, and marketing campaigns. The platform supports multi-tenancy with organization-based data isolation, enabling multiple organizations to use the system independently with complete data separation.

### 1.1 Purpose

The system provides event organizers with tools to:
- Create and manage events with customizable registration pages
- Track attendee registrations and check-ins
- Process payments securely through Stripe
- Manage speakers and session schedules
- Run email marketing campaigns
- Monitor event budgets and deliverables
- Build custom public-facing event pages

### 1.2 Target Users

- **Event Organizers**: Create and manage events, track registrations
- **Organization Administrators**: Configure organization settings, manage team members
- **Attendees**: Register for events, make payments, access event information

## 2. System Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | Single-page application UI |
| Routing | Wouter | Client-side routing |
| State Management | TanStack React Query | Server state caching and synchronization |
| UI Components | shadcn/ui + Radix UI | Accessible component library |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Build Tool | Vite | Development and production builds |
| Backend | Node.js + Express.js | RESTful API server |
| Database | PostgreSQL (Neon) | Persistent data storage |
| ORM | Drizzle ORM | Database abstraction and type safety |
| Authentication | OpenID Connect (Replit Auth) | Identity and access management |
| Session Store | PostgreSQL (connect-pg-simple) | Secure session persistence |
| Payment Processing | Stripe | PCI-compliant payment handling |
| File Storage | Replit Object Storage (GCS) | Media and document storage |
| Email Service | Resend | Transactional email delivery |

### 2.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Replit Cloud Platform                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Vite Dev  │  │   Express   │  │  PostgreSQL │          │
│  │   Server    │──│   Backend   │──│  (Neon DB)  │          │
│  │  (Port 5000)│  │   (API)     │  │             │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                                   │
│         │                │                                   │
│  ┌──────┴────────────────┴──────┐                           │
│  │      External Services       │                           │
│  │  ┌─────────┐  ┌────────┐     │                           │
│  │  │ Stripe  │  │ Resend │     │                           │
│  │  │ Payments│  │ Email  │     │                           │
│  │  └─────────┘  └────────┘     │                           │
│  └──────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow

1. **User Request**: Browser sends HTTPS request to server
2. **Authentication Check**: Session validated via PostgreSQL store
3. **Authorization**: Organization membership and role verified
4. **Business Logic**: Express route handlers process request
5. **Data Access**: Drizzle ORM executes queries with org-scoped filtering
6. **Response**: JSON response returned with appropriate HTTP status

## 3. Security Architecture

### 3.1 Authentication

| Component | Implementation |
|-----------|---------------|
| Protocol | OpenID Connect (OIDC) |
| Identity Provider | Replit Auth |
| Session Storage | PostgreSQL with signed cookies |
| Token Management | Automatic refresh with refresh tokens |
| Cookie Security | HttpOnly, Secure |

### 3.2 Authorization

| Control | Description |
|---------|-------------|
| Multi-Tenancy | All data isolated by organizationId |
| Role-Based Access | Member, Admin, Owner roles per organization |
| Route Protection | isAuthenticated middleware on all /api routes |
| Data Scoping | Storage layer enforces org-level filtering |

### 3.3 Data Protection

| Category | Control |
|----------|---------|
| Encryption in Transit | TLS 1.2+ for all connections |
| Encryption at Rest | Cloud provider managed encryption |
| Sensitive Data | Payment data handled by Stripe (PCI DSS Level 1) |
| Secrets Management | Environment variables via Replit Secrets |
| Log Sanitization | Automatic redaction of sensitive fields |

### 3.4 Input Validation

| Layer | Implementation |
|-------|---------------|
| Schema Validation | Zod schemas for all API inputs |
| Type Safety | TypeScript enforces compile-time type checking |
| SQL Injection Prevention | Parameterized queries via Drizzle ORM |
| XSS Prevention | React's built-in escaping + CSP headers |

### 3.5 Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Payment Intent Creation | 10 requests/minute |
| Payment Verification | 20 requests/minute |
| Public Registration | 5 requests/minute |
| Invite Code Validation | 30 requests/minute |

## 4. Data Architecture

### 4.1 Core Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| Users | Platform users | id, email, firstName, lastName, isAdmin |
| Organizations | Tenant containers | id, name, slug, stripeKeys, paymentEnabled |
| Organization Members | User-Org relationship | userId, organizationId, role |
| Events | Event instances | id, name, dates, location, status, maxAttendees |
| Attendees | Event registrations | id, eventId, email, status, paymentStatus |
| Sessions | Event agenda items | id, eventId, title, speakers, startTime |
| Speakers | Event presenters | id, eventId, name, bio, company |
| Packages | Registration tiers | id, name, price, features, isPublic |
| Invite Codes | Promotional codes | id, code, discountType, discountValue |

### 4.2 Data Isolation

All multi-tenant data tables include:
- `organizationId` foreign key (non-nullable)
- Storage layer methods require organizationId parameter
- API routes resolve organizationId from authenticated user session
- No cross-organization data access is possible at the query level

## 5. Integration Points

### 5.1 Stripe Payment Processing

- **Purpose**: Secure payment collection for event registrations
- **Integration Type**: Stripe.js (frontend) + Stripe Node SDK (backend)
- **Data Handling**: No card data touches our servers (PCI DSS compliant)
- **Webhook Processing**: Payment status updates received and verified

### 5.2 Resend Email Service

- **Purpose**: Transactional emails (confirmations, reminders)
- **Integration Type**: Resend Node SDK
- **Features**: Template-based emails with merge tags
- **Rate Limits**: Enforced via express-rate-limit

### 5.3 Replit Object Storage

- **Purpose**: Media uploads (images, documents)
- **Storage**: Google Cloud Storage backend
- **Access Control**: Presigned URLs for uploads, public/private ACL policies
- **Supported Types**: Images, PDFs, spreadsheets

### 5.4 Excel/CSV Import

- **Libraries**: ExcelJS (Excel files), PapaParse (CSV files)
- **Security**: xlsx library replaced due to CVE vulnerabilities
- **Validation**: All imported data validated before database insertion

## 6. Operational Features

### 6.1 Logging

| Feature | Implementation |
|---------|---------------|
| Log Levels | DEBUG, INFO, WARN, ERROR |
| Sensitive Redaction | API keys, emails, card numbers automatically masked |
| Pattern Matching | Stripe keys, Bearer tokens, passwords redacted |
| Source Tracking | Component-based log identification |

### 6.2 Error Handling

- Centralized error handling middleware
- User-friendly error messages
- Stack traces logged server-side only
- Graceful degradation for service failures

### 6.3 Session Management

- Sessions stored in PostgreSQL `sessions` table
- Automatic expiration with configurable TTL
- Secure cookie transmission
- Token refresh for long-lived sessions

## 7. Compliance Considerations

### 7.1 Data Privacy

- User data isolated by organization
- No personal data shared between tenants
- Users can request data export/deletion through support

### 7.2 Payment Security

- PCI DSS compliance delegated to Stripe
- No cardholder data stored in application database
- Secure payment tokens used for all transactions

### 7.3 Access Logging

- Authentication events logged
- Administrative actions tracked
- Sensitive operations require elevated permissions

## 8. Recovery and Continuity

### 8.1 Data Backup

- PostgreSQL automatic backups (managed by Neon)
- Point-in-time recovery available
- Application checkpoints for code rollback

### 8.2 Service Dependencies

| Service | Failure Impact | Mitigation |
|---------|----------------|------------|
| PostgreSQL | Full application unavailable | Auto-reconnect, connection pooling |
| Stripe | Payments unavailable | Queue payment attempts, retry logic |
| Resend | Emails delayed | Queue emails, retry mechanism |
| Object Storage | Media uploads unavailable | Graceful error handling |

---

*Document Version: 1.0*  
*Last Updated: December 2024*
