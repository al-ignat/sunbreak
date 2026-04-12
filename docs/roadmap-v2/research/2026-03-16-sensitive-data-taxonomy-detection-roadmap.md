# Sensitive Data Taxonomy and Detection Roadmap for Sunbreak

**The single highest-impact detectors Sunbreak should build next are: IBAN numbers, personal names (via NER), source code identification, confidentiality markers, and database connection strings.** These five categories cover the most frequently leaked data types in AI prompts while offering feasible browser-based detection. Research from Cyberhaven, Harmonic Security, and Menlo Security consistently shows that **39.7% of AI interactions now involve sensitive data**, with source code (30%), legal documents (22%), customer data (15%), and financial information (13%) dominating exposure incidents. The priority matrix below maps 60+ data types across frequency, severity, and detection feasibility to create an actionable build sequence.

This taxonomy spans two domains — personal/privacy data governed by regulations like GDPR, HIPAA, and CCPA, and corporate/organizational data governed by trade secret law, SEC rules, and industry frameworks. Each data type is assessed for how often knowledge workers paste it into ChatGPT, Claude, or Gemini; how severe the consequences of exposure are; and how practically a browser extension can detect it using regex, heuristics, or local ML models.

---

## Part 1A: Personal data and privacy taxonomy

### 1. Personally identifiable information beyond what Sunbreak already detects

Sunbreak already covers SSN, CPR, NINO, email, phone, credit cards, and IP addresses. The following PII subcategories represent the next detection frontier.

**Personal names** appear in virtually every business document pasted into AI tools. Menlo Security found PII in **55% of DLP events** at generative AI sites, with names being the most ubiquitous identifier. Detection requires Named Entity Recognition — regex alone cannot reliably identify names. The recommended approach uses Transformers.js with a quantized BERT-NER model (~110MB) running in a Web Worker. Severity: **High**. Regulations: GDPR Art. 4, HIPAA (identifier #1), CCPA §1798.140(v)(1). Detectability: Low via regex, Medium-High via in-browser NER (F1 ~91% with `Xenova/bert-base-NER`).

**Physical/mailing addresses** commonly appear when knowledge workers paste customer records, shipping data, or correspondence. A heuristic approach combining street patterns (`\d{1,5}\s+[\w\s]+(Street|Ave|Blvd|Dr|Rd|Lane)`) with state abbreviation + ZIP code patterns (`\b[A-Z]{2}\s+\d{5}(-\d{4})?\b`) achieves moderate precision. Severity: **Medium-High**. Regulations: GDPR Art. 4, HIPAA (identifier #2), CCPA. Detectability: Medium via multi-pattern heuristics.

**Dates of birth** are a key quasi-identifier that, combined with other data, enables re-identification. They appear in HR records, patient data, and customer profiles. Context-dependent detection using keyword proximity (`DOB`, `date of birth`, `born`, `birthday` within 50 characters of a date pattern) is highly effective. Severity: **Medium**. Regulations: HIPAA (identifier #3), GDPR Art. 4. Detectability: Medium-High with keyword + date pattern co-occurrence.

**Government-issued ID numbers across jurisdictions** vary dramatically in regex feasibility:

| ID Type | Format | Regex Feasibility | False Positive Risk |
|---|---|---|---|
| Spain DNI/NIE | `12345678Z` / `X1234567L` | **High** — letter+digits+check letter | Low |
| Italy Codice Fiscale | `RSSMRA85M01H501Z` (16 chars) | **High** — unique alphanumeric structure | Low |
| India PAN | `ABCPD1234E` (5 letters+4 digits+1 letter) | **High** — constrained 4th char | Low |
| Switzerland AHV | `756.1234.5678.97` | **High** — 756 prefix | Low |
| Finland HETU | `131052-308T` | **High** — date + century separator | Low-Medium |
| Sweden Personnummer | `850315-1234` | **Medium-High** — date + Luhn | Medium |
| France INSEE | `185057800608436` (15 digits) | **Medium-High** — sex prefix + date | Medium |
| US ITIN | `912-70-1234` | **High** — 9XX prefix + restricted middle | Low-Medium |
| Germany Steuer-ID | `65929970489` (11 digits) | **Medium** — needs check digit JS | High |
| Netherlands BSN | `111222333` (9 digits) | **Low-Medium** — generic 9-digit | Very High |
| Norway Fødselsnummer | 11 digits with date prefix | **Medium** — needs check digits | High |
| Canada SIN | 9 digits with Luhn | **Medium** — Luhn validatable | Very High |
| India Aadhaar | 12 digits with Verhoeff | **Medium** — needs complex JS | High |

For all medium/low-feasibility IDs, **keyword proximity is essential**: detecting context words like "Steuer-ID," "BSN," "personnummer," "fødselsnummer," or "Aadhaar" within 100 characters of a numeric pattern dramatically reduces false positives.

### 2. Financial data

**IBAN numbers** are a top-priority detection target. They appear frequently when workers paste invoices, payment instructions, or financial records into AI tools. The format is highly regex-friendly: 2-letter country code + 2 check digits + country-specific BBAN, with mod-97 validation. Country-specific lengths (DE=22, FR=27, NL=18, ES=24, IT=27, DK=18, GB=22) enable precise matching. Generic regex: `\b[A-Z]{2}\d{2}\s?[\dA-Z]{4}(\s?[\dA-Z]{4}){2,7}\s?[\dA-Z]{1,4}\b`. Severity: **High**. Regulations: GDPR Art. 4, GLBA, PCI DSS. Detectability: **High** via regex + mod-97 checksum in JavaScript.

**SWIFT/BIC codes** follow the pattern `\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b` — 8 or 11 characters with a 4-letter bank code, 2-letter country code, 2-char location, and optional 3-char branch. Severity: **Medium**. Detectability: **Medium-High** via regex, though false positives with random uppercase strings are possible.

**Cryptocurrency wallet addresses** have distinctive, highly regex-friendly formats. Bitcoin legacy addresses start with `1` or `3` (25-34 Base58 chars), Bech32 addresses start with `bc1`, and Ethereum addresses match `0x[0-9a-fA-F]{40}`. These rarely produce false positives due to their unique character sets. Severity: **High** (wallet addresses can enable fund tracking or theft). Regulations: FinCEN, AML/KYC requirements. Detectability: **High** via regex.

**Salary and compensation data** appears when HR professionals use AI to draft offer letters, analyze pay equity, or prepare reports. Detection relies on keyword co-occurrence: financial amounts (`\$\s?\d{1,3}(,\d{3})*`) near terms like "salary," "compensation," "bonus," "RSU," "vesting," or "pay band." Severity: **High**. Regulations: GDPR Art. 4, internal HR confidentiality policies. Detectability: **Medium** via keyword + amount co-occurrence.

**Bank account and routing numbers** require context-dependent detection. US ABA routing numbers are 9 digits with a constrained first-two-digit prefix (00-12, 21-32, 61-72, 80) and a weighted checksum. UK sort codes follow `\d{2}-\d{2}-\d{2}`. Without context keywords ("routing," "account," "sort code"), these produce high false positives. Severity: **High**. Regulations: GLBA, PSD2, PCI DSS. Detectability: **Medium** with context keywords.

### 3. Health and medical data (PHI)

Protected Health Information is governed by HIPAA's 18 identifiers and GDPR Article 9's special category designation, carrying penalties up to **$2.1 million per violation** (HIPAA Tier 4) or **€20 million / 4% of global turnover** (GDPR). Healthcare workers occasionally paste patient data into AI tools — one documented case involved a doctor entering a patient's name and diagnosis to generate an insurance letter.

**Medical record numbers and health plan IDs** lack standardized formats, making regex detection difficult. **National Provider Identifiers** (NPIs) are 10-digit numbers with a Luhn check digit and a prefix of `80840` in the enumeration standard — detectable with Luhn validation + context. **Drug and diagnosis terms** (ICD-10 codes, FDA drug names) can be matched against dictionaries. Contextual keywords — "patient," "diagnosed with," "prescribed," "treatment," "symptoms," "allergic to" — serve as effective heuristic signals. Severity: **Critical**. Detectability: **Medium** via keyword dictionaries + contextual patterns.

### 4. Biometric data

Biometric templates (fingerprint minutiae, facial geometry vectors, voice print embeddings) are typically binary or encoded data unlikely to appear as plaintext in AI prompts. The primary risk is metadata or descriptions ("the patient's fingerprint scan showed..."). Detection relies on keyword matching: "fingerprint," "biometric," "facial recognition," "retinal scan," "voice print." Severity: **Critical** under GDPR Art. 9 and Illinois BIPA ($1,000-$5,000 per violation with private right of action). Detectability: **Low** for raw templates, **Medium** for descriptive references via keywords.

### 5. Authentication credentials beyond current coverage

Sunbreak already detects AWS, GitHub, Stripe, OpenAI, and Azure keys. The following credential types should be added next:

**Database connection strings** are extremely common in AI prompts — developers routinely paste code containing MongoDB (`mongodb(+srv)?://`), PostgreSQL (`postgres(ql)?://`), MySQL (`mysql://`), Redis (`redis(s)?://`), and JDBC (`jdbc:\w+://`) URIs, often with embedded usernames and passwords. The pattern `[protocol]://[user]:[password]@[host]` is highly distinctive. Severity: **Critical**. Detectability: **High** via protocol-prefix regex.

**Private keys and certificates** in PEM format are trivially detected via `-----BEGIN (RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----`. These occasionally appear when developers paste infrastructure configuration or debug TLS issues. Severity: **Critical**. Detectability: **Very High** via exact string match.

**JWT tokens** match `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` — the `eyJ` prefix (base64 of `{"`) is nearly unique to JWTs. Severity: **High**. Detectability: **High** via regex.

**Additional API key patterns** to add: Google API keys (`AIza[0-9A-Za-z\-_]{35}`), Slack tokens (`xox[baprs]-`), GitLab tokens (`glpat-`), SendGrid (`SG\.`), Twilio (`SK[0-9a-fA-F]{32}`), DigitalOcean (`dop_v1_`), Shopify (`shpat_`), Facebook (`EAACEdEose0cBA`), Google OAuth (`ya29\.`), Heroku, Mailgun (`key-`), and HashiCorp Vault (`s\.[a-zA-Z0-9]{8,}`). All use distinctive prefixes with **very low false positive rates**. Severity: **Critical**. Detectability: **Very High**.

**Environment variable blocks** (`.env` file content) follow the pattern `^[A-Z][A-Z0-9_]+=.+` on multiple lines, with sensitive variable names like `DB_PASSWORD`, `SECRET_KEY`, `API_KEY`, `AWS_SECRET`. Severity: **High**. Detectability: **High** via multi-line regex + sensitive variable name dictionary.

### 6. Location data

**GPS coordinates** in decimal format (`\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b`) or DMS format are moderately common in prompts involving mapping, logistics, or location-based analysis. Severity: **Medium-High** (CCPA/CPRA classifies precise geolocation as "sensitive personal information"). Detectability: **Medium-High** via regex for coordinate patterns.

### 7. GDPR Article 9 special categories

Racial/ethnic origin, political opinions, religious beliefs, trade union membership, sexual orientation, and genetic data represent the highest-protection tier under EU law, where **processing is prohibited by default**. These data types are inherently difficult to detect programmatically because they appear as natural language descriptions rather than structured patterns. Detection requires NLP classifiers or extensive keyword dictionaries covering demographic terms, religious identifiers, political party names, and health conditions linked to genetic data. Severity: **Critical** under GDPR (€20M / 4% turnover). Detectability: **Low** — requires NLP/ML classifiers trained on sensitive category text. This is a Phase 3+ capability requiring local language models.

### 8. Employment and education data

**Employee IDs** vary by organization and lack standard formats, but labels like "Employee ID," "EMP#," or "Staff Number" near alphanumeric codes can trigger heuristic detection. **Performance reviews** and **disciplinary records** are detectable via keyword co-occurrence ("performance review," "rating," "improvement plan," "disciplinary action," "termination"). Harmonic Security found that **26.8% of sensitive AI prompts** involved employee data including payroll and performance reviews. Severity: **High**. Regulations: GDPR, state employment privacy laws. Detectability: **Medium** via keyword co-occurrence.

**Education records** protected under FERPA include student names, grades, transcripts, IEP documents, and disciplinary records. Detection uses education-specific keywords ("GPA," "transcript," "student ID," "enrollment," "FERPA"). Severity: **Medium**. Detectability: **Medium** via keyword dictionaries.

### 9. Children's data

Data about individuals under 13 triggers COPPA obligations (penalties up to **$53,088 per violation**; YouTube was fined $170M) and GDPR Article 8 protections. Detection is extremely difficult without knowing the age of data subjects. Contextual signals include "minor," "child," "parent/guardian consent," "student" (in K-8 context), and age/grade references. Severity: **Critical**. Detectability: **Very Low** — essentially requires understanding data context.

---

## Part 1B: Corporate and organizational data taxonomy

### 1. Confidentiality markers and classification labels

**This is the single easiest high-value corporate detection to implement.** Documents containing headers like "CONFIDENTIAL," "PROPRIETARY," "INTERNAL ONLY," "TRADE SECRET," "NOT FOR DISTRIBUTION," "ATTORNEY-CLIENT PRIVILEGED," or "UNDER EMBARGO" should trigger immediate warnings. Email confidentiality disclaimers ("this email is intended solely for...unauthorized disclosure is prohibited") are also detectable via phrase matching. Research shows that enterprises use 4-tier classification (Public → Internal → Confidential → Restricted), and labeled documents represent the clearest signal of sensitive corporate content.

Regex patterns for common markers:
```
/\b(CONFIDENTIAL|PROPRIETARY|RESTRICTED|INTERNAL\s+(?:USE\s+)?ONLY|TRADE\s+SECRET|DO\s+NOT\s+DISTRIBUTE|EYES\s+ONLY|UNDER\s+EMBARGO|ATTORNEY[\s-]CLIENT\s+PRIVILEGED?|PRIVILEGED\s+AND\s+CONFIDENTIAL)\b/i
```

Severity: **High to Critical** depending on classification level. Detection feasibility: **Very High** via keyword/regex matching.

### 2. Source code and technical assets

Source code is the **#1 type of sensitive data** sent to AI tools, accounting for **18.7-30% of all sensitive data exposure** across studies by Cyberhaven and Harmonic Security. The Samsung semiconductor incident — where engineers pasted proprietary source code, equipment-testing code, and meeting transcripts into ChatGPT within 20 days — remains the canonical cautionary example.

**Source code detection** uses a heuristic scoring system. Universal indicators include high density of special characters (`{}`, `[]`, `;`, `=>`), variable assignment patterns (`let`, `const`, `var`, `def`), and programming keywords (`function`, `return`, `import`, `class`). Language-specific signals boost confidence: Python's `def`/`import`/`self.`, JavaScript's `const`/`=>`/`require()`, Java's `public class`/`System.out`, Go's `func`/`:=`/`fmt.`, SQL's `SELECT`/`FROM`/`WHERE`. A point-scoring heuristic with a minimum threshold achieves **high accuracy** for multi-line code blocks.

**Embedded secrets in code** are a critical sub-category. Developers paste code containing hardcoded credentials, connection strings with passwords (`mongodb://user:pass@host`), and environment variables. The pattern `[a-zA-Z]{3,10}://[^/\s:@]+:[^/\s:@]+@.+` catches credentials embedded in protocol URIs. Generic credential patterns like `(?i)(password|pwd|pass)['":\s=]+[^\s'"]{4,}` catch variable assignments.

Severity: **Critical** for trade secret/IP code, **Critical** for embedded credentials. Regulations: Trade secret law (DTSA, EU Trade Secrets Directive), ITAR/EAR for defense code. Detectability: **High** via heuristic scoring for code identification, **High** for embedded secrets via regex.

### 3. Business strategy and financial information (MNPI)

Material Non-Public Information poses unique legal risks — sharing MNPI can trigger **SEC enforcement with penalties up to $5 million and 20 years imprisonment** for insider trading violations. Pre-release earnings, M&A plans, revenue forecasts, and board decisions all qualify.

Detection uses keyword co-occurrence scoring. Financial result terms ("revenue," "EBITDA," "earnings," "EPS," "guidance," "forecast") appearing with dollar amounts (`\$\s?\d{1,3}(,\d{3})*(.\d{1,2})?\s?(million|billion|M|B)`) and temporal markers ("Q1-Q4," "FY," "pre-announcement," "quiet period") signal potential MNPI. M&A terms ("acquisition," "merger," "due diligence," "LOI," "term sheet," "target company") require separate scoring. Harmonic Security found that **M&A content comprised 12.6%** and **financial projections 7.8%** of sensitive data exposures.

A co-occurrence scoring approach works best: single financial keywords are too broad, but **3+ signals co-occurring within a text block** dramatically increases confidence. Severity: **Critical** for MNPI, **High** for general financial data. Detectability: **Medium** via multi-keyword co-occurrence.

### 4. Customer and client data

Customer data — CRM records, billing information, sales pipeline details — accounted for **45.8% of sensitive prompts** in Harmonic Security's Q4 2024 study. Sales teams sending go-to-market data represent roughly **30% of AI-bound data** from their departments. Detection focuses on two patterns:

**Bulk/tabular PII detection**: Multiple lines with consistent delimiters (commas, tabs) containing repeated email addresses, phone numbers, or name patterns suggest pasted spreadsheet or CRM data. The regex `^(.*[,\t].*\n){3,}` detects tabular structure; combining this with existing PII detectors (email, phone) flagging multiple matches in structured format creates a powerful signal.

**Sales pipeline terminology**: Keywords like "pipeline," "opportunity," "qualified lead," "deal size," "ARR," "MRR," "close date," "contract value" indicate CRM or sales data. Severity: **High**. Detectability: **Medium-High** for structured/tabular data, **Medium** for unstructured mentions.

### 5. Internal documents and communications

**Meeting notes and internal memos** are a documented leakage vector (Samsung's third incident involved pasting meeting transcripts). Structural patterns include "Meeting Notes," "Minutes," "Action Items," "Attendees:," "Agenda:," "Next Steps" headers. Board materials contain "Board of Directors," "Board Resolution," "Executive Session." Internal memos feature "MEMORANDUM," "Memo To:," "From:...To:...Re:."

**Email content with embedded PII** is particularly risky — when a worker pastes an email thread into AI for summarization, it may contain names, addresses, account numbers, and confidential details of third parties who never consented to AI processing. Email disclaimer detection (`/this (email|message|communication).*?(confidential|proprietary|privileged)/i`) catches forwarded emails with sensitivity markers. Severity: **High**. Detectability: **Medium** via keyword patterns and structural heuristics.

### 6. Security and infrastructure data

**Cloud resource identifiers** that should not be exposed:

| Resource | Pattern | False Positive Risk |
|---|---|---|
| AWS ARN | `arn:aws[a-zA-Z-]*:[a-zA-Z0-9-]+:\S+` | Very Low |
| GCP Service Account | `[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com` | Very Low |
| AWS S3 Bucket URL | `s3://[a-z0-9\-\.]{3,63}` | Low |
| Internal/staging URLs | `(dev|staging|test|preprod|internal)\.[a-z0-9.-]+\.(com|net|io)` | Low-Medium |
| Azure GUID (with context) | UUID pattern near "tenant," "subscription," "azure" | Medium |
| Private IP ranges | `\b(10\.\d{1,3}|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b` | Low-Medium |

**Vulnerability reports and penetration test results** are detectable via keywords ("CVE-," "vulnerability," "exploit," "penetration test," "security assessment," "CVSS score"). Severity: **Critical** for security configurations, **High** for infrastructure identifiers. Detectability: **High** for specific resource patterns, **Medium** for security report content.

### 7. Legal and compliance data

Attorney-client privileged communications carry special legal protection — disclosure can **waive privilege permanently**. Detection keywords: "attorney-client privilege," "legal advice," "work product," "litigation hold," "settlement," "deposition," "privileged and confidential." Contract and NDA content includes "non-disclosure," "NDA," "whereas," "hereby agrees," "indemnification," "liquidated damages." Severity: **Critical** for privilege waiver risk. Detectability: **Medium-High** via keyword dictionaries.

### 8. HR and people data from organizational perspective

Compensation bands, org charts, headcount plans, and succession plans are highly confidential. Keywords: "salary band," "compensation range," "headcount," "FTE," "succession plan," "performance review," "PIP" (performance improvement plan), "termination letter." Severity: **High**. Detectability: **Medium** via keyword co-occurrence.

### 9. Government-regulated and export-controlled data

ITAR/EAR violations carry penalties up to **$1 million per violation and 20 years imprisonment**. Sharing controlled technical data with AI tools accessible by non-US persons could constitute a "deemed export." Detection signals: ITAR/EAR classification markings ("ITAR Controlled," "Export Controlled," "EAR99," "ECCN" numbers), defense-related terminology, and classification markings ("SECRET," "TOP SECRET," "FOUO," "CUI"). Severity: **Critical**. Detectability: **High** for classification markings, **Very Low** for unmarked controlled content.

---

## Part 1C: Detection priority matrix

### Tier 1 — Build next (high frequency × high severity × high feasibility)

These detectors offer the best return on engineering investment. All are implementable with regex, keyword matching, or heuristic scoring without ML models.

| Data Type | Frequency in AI Prompts | Exposure Severity | Detection Feasibility | Recommended Approach |
|---|---|---|---|---|
| **IBAN numbers** | Common | High | High | Regex `[A-Z]{2}\d{2}[\dA-Z]{11,30}` + mod-97 checksum validation in JS |
| **Database connection strings** | Very Common | Critical | High | Protocol-prefix regex: `(mongodb|postgres|mysql|redis|jdbc)\+?[a-z]*://` |
| **PEM private keys/certificates** | Common | Critical | Very High | Exact string match: `-----BEGIN.*PRIVATE KEY-----` |
| **JWT tokens** | Common | High | High | Regex: `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` |
| **Confidentiality/classification labels** | Very Common | High | Very High | Case-insensitive keyword match against label dictionary |
| **Source code detection** | Very Common | High-Critical | High | Multi-signal heuristic scoring (language keywords + syntax patterns + special char density) |
| **Additional API keys** (Google, Slack, GitLab, SendGrid, Twilio, etc.) | Common | Critical | Very High | Prefix-based regex (distinctive prefixes like `AIza`, `xox`, `glpat-`, `SG.`) |
| **Environment variable blocks** | Common | High | High | Pattern: `^[A-Z_]+=.+` on multiple lines + sensitive var name dictionary |
| **Email confidentiality disclaimers** | Very Common | Medium-High | High | Phrase regex matching common disclaimer language |
| **Bitcoin/Ethereum addresses** | Occasional | High | High | Prefix + charset regex (bc1, 0x + 40 hex) |

**Specific Tier 1 detection patterns:**

For **IBAN**: implement country-specific length validation after matching the generic pattern. The mod-97 algorithm is straightforward in JavaScript: rearrange (move first 4 chars to end), convert letters to numbers (A=10, B=11...Z=35), compute `BigInt(numericString) % 97n === 1n`.

For **source code**: score each text block against weighted signals. Award points for: import/require statements (+3), function/class definitions (+3), variable declarations with let/const/var/def (+2), curly brace pairs (+2), semicolon-terminated lines (+1), comment syntax (+1), and language-specific keywords (+1 each). Threshold of 5+ points across 3+ lines indicates code with high confidence.

For **confidentiality labels**: maintain a ranked dictionary. "RESTRICTED" and "TOP SECRET" trigger critical alerts; "CONFIDENTIAL" and "PROPRIETARY" trigger high alerts; "INTERNAL ONLY" and "DRAFT" trigger medium alerts. Scanning the first 500 characters of a prompt catches document headers efficiently.

### Tier 2 — Build soon (high value, moderate complexity)

These require keyword co-occurrence scoring, context windows, or check-digit validation in JavaScript.

| Data Type | Frequency | Severity | Feasibility | Recommended Approach |
|---|---|---|---|---|
| **Personal names** | Very Common | High | Medium (needs NER) | Phase into Transformers.js + `Xenova/bert-base-NER` (q8, ~110MB); interim: title prefix heuristic (Mr./Mrs./Dr. + capitalized words) |
| **Physical addresses** | Common | Medium-High | Medium | Multi-pattern: street number + street type + state/ZIP; combo scoring |
| **Dates of birth (with context)** | Common | Medium | Medium-High | Keyword proximity: "DOB"/"born"/"birthday" within 50 chars of date pattern |
| **Salary/compensation data** | Common | High | Medium | Dollar amounts + compensation keywords co-occurrence |
| **Spain DNI/NIE** | Occasional | High | High | Regex `\b(\d{8}|[XYZ]\d{7})[TRWAGMYFPDXBNJZSQVHLCKE]\b` + mod-23 check |
| **Italy Codice Fiscale** | Occasional | High | High | Regex `[A-Z]{6}\d{2}[ABCDEHLMPRST]\d{2}[A-Z]\d{3}[A-Z]` |
| **India PAN** | Occasional | High | High | Regex `[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]` |
| **Switzerland AHV** | Occasional | High | High | Regex `756\.?\d{4}\.?\d{4}\.?\d{2}` |
| **Sweden Personnummer** | Occasional | High | Medium-High | Date regex + separator + 4 digits + Luhn validation |
| **Finland HETU** | Occasional | High | High | Regex with century separator: date + `[-+A-F]` + 3 digits + check char |
| **US ITIN** | Occasional | High | High | Regex `9\d{2}[-\s]?(5[0-9]|6[0-5]|7[0-9]|8[0-8]|9[0-2]|9[4-9])[-\s]?\d{4}` |
| **US EIN** | Occasional | Medium-High | Medium | Regex `\d{2}-\d{7}` + context keywords + prefix validation |
| **Bulk/tabular PII** | Common | High | Medium-High | Detect 3+ lines with consistent delimiters + multiple existing PII matches |
| **MNPI / financial data** | Common | Critical | Medium | Multi-keyword co-occurrence: financial terms + dollar amounts + temporal markers |
| **Generic password assignments** | Common | Critical | Medium | `(?i)(password|pwd|secret|token)['"\s:=]+[^\s'"]{6,}` with entropy check |
| **Meeting notes/internal documents** | Very Common | Medium-High | Medium | Multi-keyword scoring: "meeting notes" + "action items" + "attendees" |
| **Legal privilege markers** | Common | Critical | Medium-High | Keyword dictionary: "attorney-client," "privileged," "work product," "litigation hold" |
| **M&A terminology clusters** | Occasional | Critical | Medium | Co-occurrence: "acquisition"/"merger"/"due diligence"/"LOI" + company names + dollar amounts |

### Tier 3 — Build later (important but lower frequency or harder detection)

| Data Type | Frequency | Severity | Feasibility | Approach |
|---|---|---|---|---|
| France INSEE number | Rare | High | Medium-High | 15-digit regex with sex prefix + mod-97 |
| Germany Steuer-ID | Rare | High | Medium | 11-digit + context keywords + ISO 7064 check |
| Netherlands BSN | Rare | High | Low-Medium | 9-digit + elfproef + keyword context mandatory |
| Norway Fødselsnummer | Rare | High | Medium | 11-digit date-prefixed + weighted check digits |
| Canada SIN | Rare | High | Medium | 9-digit + Luhn + keyword context |
| India Aadhaar | Rare | High | Medium | 12-digit + Verhoeff check + context |
| UK NHS number | Rare | High | Medium | 10-digit + mod-11 + context |
| SWIFT/BIC codes | Occasional | Medium | Medium-High | `[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?` |
| US ABA routing numbers | Occasional | High | Medium-High | 9-digit + prefix validation + weighted checksum |
| CUSIP/ISIN/SEDOL | Rare | Medium | Medium | Format regex + checksum validation |
| Medical terminology (PHI) | Occasional | Critical | Medium | Keyword dictionary (ICD-10, drug names, medical terms) + contextual signals |
| Sales pipeline/CRM terms | Common | High | Medium | Keyword dictionary + tabular data detection |
| Security/vuln report content | Occasional | Critical | Medium | CVE pattern + security terminology keywords |
| Cloud resource identifiers (ARNs, service accounts) | Occasional | High | High | Specific regex patterns (already defined above) |
| Export control markings | Rare | Critical | High | Keyword: "ITAR," "Export Controlled," "ECCN," "CUI" |
| GPS coordinates | Occasional | Medium-High | Medium-High | Decimal coordinate regex with range validation |

### Tier 4 — Future/advanced (requires NLP/ML or deep domain knowledge)

| Data Type | Frequency | Severity | Feasibility | Approach |
|---|---|---|---|---|
| GDPR Art. 9 special categories (race, religion, politics, sexual orientation) | Occasional | Critical | Very Low | Local NLP classifier trained on sensitive category text |
| Trade secret content (unmarked) | Occasional | Critical | Very Low | Domain-specific ML classifier |
| Proprietary algorithm descriptions | Occasional | Critical | Very Low | Technical NLP + organizational context |
| Children's data identification | Rare | Critical | Very Low | Age/grade context inference via NLP |
| Behavioral/digital activity data | Rare | Medium | Low | Structural pattern recognition |
| Biometric template data | Rare | Critical | Low | Binary/encoded data detection |
| Criminal/legal history in text | Rare | High | Low | NLP classifier for legal/criminal terminology |
| Competitive intelligence content | Occasional | High | Low | Multi-signal NLP (competitor names + strategic terms) |
| Implicit location data | Occasional | Medium | Very Low | NLP inference from contextual clues |

---

## Phased implementation architecture

### Phase 1: Regex and keyword expansion (immediate)

Deploy all Tier 1 detectors using the browser's native regex engine. Estimated development: **2-4 weeks**. This phase adds ~15 new detector types with **very low false positive rates** for the pattern-matched items. Implement a confidence scoring system from the start: each detector returns a score (0.0-1.0) based on format match strength + context keyword proximity + checksum validation. Display results in three tiers:
- 🔴 **High confidence** (>0.85): strong warning, auto-highlight
- 🟡 **Medium confidence** (0.5-0.85): subtle highlight, user review
- ⚪ **Low confidence** (<0.5): on-demand scan only

Architecture recommendation: run cheap checks first (exact keyword matches), then regex patterns, then heuristic scoring. Use a **context window** of ±100 characters around each regex match to check for supporting keywords, which boosts or lowers confidence.

### Phase 2: Heuristic scoring and co-occurrence (1-3 months)

Build Tier 2 detectors including source code heuristic scoring, financial data co-occurrence, meeting note detection, and check-digit validation for international IDs. Add the bulk/tabular PII detector that recognizes structured data containing multiple PII matches. This phase captures the high-frequency corporate data types (source code, internal documents, financial data) that represent the majority of actual leakage incidents.

### Phase 3: Local NER model (3-6 months)

Integrate **Transformers.js** with a quantized NER model for personal name, organization, and location detection. The recommended model path is `Xenova/bert-base-NER` in q8 quantization (~110MB), loaded on-demand and cached via the browser's Cache API, running inference in a Web Worker to avoid UI blocking. This enables detection of unstructured PII — names, organizations, and locations embedded in natural language — which regex fundamentally cannot achieve. Target inference latency: **<500ms per text chunk** on modern hardware. WebGPU acceleration (available in Chrome/Edge) provides 2-3× speedup over WASM.

### Phase 4: Advanced ML classifiers (6-12 months)

Build or fine-tune classifiers for GDPR Article 9 special categories, trade secret content analysis, and domain-specific sensitive data. Consider **GLiNER** (zero-shot NER supporting 60+ PII categories without retraining) as a flexible bridge between fixed NER models and fully custom classifiers. Explore **ONNX Runtime Web** with WebGPU for running larger models in-browser.

---

## Regulatory severity reference for prioritization

Understanding penalty structures helps justify detection priority to enterprise customers:

| Regulation | Max Penalty | Key Data Types |
|---|---|---|
| **ITAR/EAR** (export control) | $1M + 20 years prison per violation | Technical data, defense articles, controlled technology |
| **GDPR Art. 9** (special categories) | €20M or 4% global turnover | Health, biometric, genetic, racial, political, religious, sexual |
| **HIPAA** (health data) | $2.1M/year per category + 10 years prison | 18 PHI identifiers + health conditions |
| **SEC/SOX** (MNPI/insider trading) | $5M + 20 years prison (individual) | Pre-release financials, M&A, material events |
| **PCI DSS** (payment cards) | $5K-$100K/month + card processing loss | PAN, CVV, PIN, full track data |
| **Illinois BIPA** (biometrics) | $5K per intentional violation (private action) | Fingerprints, facial geometry, voice prints, iris scans |
| **CCPA/CPRA** | $7,500 per intentional violation | 13 categories of sensitive personal information |
| **COPPA** (children) | $53,088 per violation | All PI from children under 13 |
| **GLBA** (financial) | $100K per violation + 5 years prison | Nonpublic personal financial information |

---

## Conclusion

The research reveals a clear build path driven by empirical data on what knowledge workers actually leak. **Source code and credentials dominate exposure incidents**, making code detection and expanded secret scanning the highest-value investments after Sunbreak's current PII detectors. The three-phase architecture — regex/keywords → heuristic scoring → local NER — mirrors the approach used by enterprise DLP leaders like Microsoft Purview, Google Cloud DLP, and Nightfall AI, adapted for browser-side execution constraints.

Two non-obvious insights emerge from this analysis. First, **confidentiality labels are an underappreciated detection vector**: a simple keyword scan for "CONFIDENTIAL," "PROPRIETARY," or "INTERNAL ONLY" catches a large class of sensitive corporate documents with near-zero false positives and trivial implementation cost. Second, **bulk/tabular data detection** — recognizing when a user pastes a spreadsheet or CSV containing multiple PII instances — addresses one of the most dangerous leakage patterns (Harmonic Security found that file uploads account for 79.7% of credit card exposures and 75.3% of customer profile leaks).

The international ID landscape favors a tiered approach: IDs with distinctive formats (Spain DNI, Italy Codice Fiscale, India PAN, Switzerland AHV, Finland HETU) can be detected with regex alone, while generic-format IDs (Netherlands BSN, Canada SIN, Australia TFN) require mandatory keyword context to avoid unacceptable false positive rates. Investing in check-digit validation algorithms (Luhn, mod-97, Verhoeff, elfproef) in JavaScript provides a significant precision boost across multiple ID types for modest engineering effort.