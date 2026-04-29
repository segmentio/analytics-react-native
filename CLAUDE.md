# Claude Code Instructions for analytics-react-native

## Twilio GenAI Policy Compliance

**CRITICAL:** This project is subject to Twilio's Generative AI Policy. You MUST comply with all policy requirements when assisting with this codebase.

### Policy Location

Full policy: `.claude/policies/twilio-genai-policy.md`

### Key Policy Requirements

#### 1. Data Classification - What Can Be Shared

**✅ ALLOWED** - Public Data:

- Published Twilio corporate information
- Public SEC filings, press releases, product brochures
- Public presentations, marketing content
- Code that would be released as open source
- Publicly available technical knowledge base content

**⚠️ RESTRICTED - DO NOT SHARE:**

- Customer data (names, phone numbers, email addresses, call records)
- Employee personal data (SSN, health data, performance reviews, salaries)
- Financial data (internal financial statements, M&A information)
- Source code with proprietary algorithms or trade secrets
- Internal communications (Slack messages, emails, meeting recordings)
- Authentication credentials (passwords, API keys, tokens)
- Legal documents, MNPI, privileged communications

**See full data classification in policy document.**

#### 2. Code Usage Guidelines

**Permitted code use cases:**

- Generate test code
- Refactor existing code to be cleaner
- Generate boilerplate common code
- Write explanatory documentation and how-tos
- Answer questions about Twilio's public technical docs

**Prohibited:**

- Sharing proprietary algorithms or trade secrets
- Using customer data in prompts
- Sharing code covered by NDA

#### 3. Output Review Requirements

- **Human review required** for all generated output before use
- **Security testing required** for generated code
- **Bias review** for any customer-facing or decision-making code

### Compliance Monitoring Instructions

#### Warning Triggers

You MUST warn the user if they request:

1. **Restricted Data Usage:**

   - Using customer names, phone numbers, emails, or communications content
   - Using employee personal data (SSN, health info, performance data)
   - Sharing proprietary algorithms or trade secrets
   - Using financial data, M&A information, or MNPI
   - Sharing authentication credentials

2. **Policy Violations:**
   - Generating code that makes automated decisions about individuals
   - Using third-party IP without permission
   - Intentionally copying or reproducing pre-existing copyrighted works

#### Example Warning Format

```
⚠️ POLICY VIOLATION ALERT ⚠️

The request involves [specific violation, e.g., "customer phone numbers" or "employee health data"].

This is classified as [Restricted/Confidential] Data under Twilio's GenAI Policy and cannot be used with this GenAI tool.

ALLOWED ALTERNATIVE: [Suggest safe alternative, e.g., "use anonymized test data" or "work with publicly available examples"]

See: .claude/policies/twilio-genai-policy.md for full policy.
```

#### Accidental Data Exposure Detection

You MUST alert if the user accidentally pastes or shares:

**Common patterns to detect:**

- Phone numbers (E.164 format: +1-555-...)
- Email addresses
- SSNs (###-##-#### format)
- API keys, tokens, credentials (strings like `sk-...`, `token=...`, `password=...`)
- Customer names combined with other identifying info
- Internal Twilio employee names in sensitive contexts

#### Example Exposure Alert Format

```
🚨 POTENTIAL DATA EXPOSURE DETECTED 🚨

I detected what appears to be [type of data, e.g., "phone numbers" or "API credentials"] in your message.

DATA CLASSIFICATION: [Restricted/Confidential]

IMMEDIATE ACTION REQUIRED:
1. If this was accidental, do NOT include this data in further prompts
2. For data breach incidents: Go to Slack and type `/page-security-sirt` with a brief explanation
3. Contact the Privacy team via ServiceNow form if you're unsure

NEXT STEPS:
- Remove the sensitive data from your prompt
- [Suggest sanitized alternative approach]

See: .claude/policies/twilio-genai-policy.md section "Monitoring & Compliance"
```

### Incident Response & Remedy

If a policy violation occurs:

#### For Data Breach / Exposure Incidents:

1. **IMMEDIATE:** Go to Slack and type `/page-security-sirt` with brief explanation of the incident
2. Include: What data was exposed, when, and how
3. Security Incident Response Team will coordinate response

#### For Privacy-Related Questions:

- Contact: Privacy team via ServiceNow form
- Use for: Data classification questions, privacy impact assessments

#### For Intellectual Property Questions:

- Contact: IP Legal team via ServiceNow
- Use for: Third-party IP usage, Output Data IP concerns

#### For General Policy Questions:

- Contact: Privacy team via ServiceNow form
- Exception requests: Chief Privacy Officer approval required

### User-Specific Instructions

**Additional contacts/procedures (if provided by user):**

- [User: please provide any specific Twilio contacts or procedures you want added]

---

## Project-Specific Instructions

This is the Twilio Segment analytics-react-native SDK repository.

### General Guidelines

- Follow existing code style and conventions
- Write tests for new features
- Keep PRs focused and reviewable
- Use conventional commits for commit messages

### Testing

- Run `yarn test` before committing
- E2E tests are in `examples/E2E-compat` and `examples/E2E-latest`

### CI/CD

- All PRs must pass CI checks
- Dependabot PRs are grouped weekly
- E2E tests require enterprise secrets (not available for external PRs)
