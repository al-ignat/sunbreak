# Deep Research Prompt: Sensitive Data Taxonomy and European Legal Frameworks for AI Data Protection Product Development

## Context About Me and This Research

I am building **Sunbreak** — a Chrome browser extension (Manifest V3) that detects sensitive data in user prompts before they are sent to AI tools like ChatGPT, Claude, and Gemini. It warns the user and offers one-click masking/redaction. All classification happens locally in the browser using regex pattern matching today, with plans to add context-aware detection and eventually local small language models.

**Current detection capabilities (regex-based):** email addresses, phone numbers (international incl. Danish +45, UK +44), credit card numbers (Luhn-validated), US Social Security Numbers, Danish CPR numbers, UK National Insurance Numbers, IPv4/IPv6 addresses, API keys/tokens (AWS, GitHub, Stripe, OpenAI, Azure, generic patterns), and user-configurable custom keywords.

**Product positioning:** Employee-first, not enterprise-down. The extension helps knowledge workers use their preferred personal AI tools at work safely, rather than blocking or surveilling them. Free extension with bottoms-up adoption toward team and enterprise tiers. All classification stays local — no data leaves the browser.

**Upcoming roadmap priorities include:** context-aware detection beyond regex (confidentiality markers, financial indicators, legal privilege, HR/compensation context, code secrets, security infrastructure indicators), company-specific classification (Jira IDs, internal URLs, AWS account IDs, custom patterns), smart reversible masking with descriptive tokens, compliance metadata foundations, and eventually local SLM classification via ONNX Runtime Web.

**Target market:** $227-340M (2024-2025) growing to $4.83B by 2034. Mid-market enterprise (500-5,000 employees) is primary. Regulated industries (BFSI, healthcare, legal, government) are a high-value vertical. Key buyer personas include CISOs, CIOs, Heads of AI, Compliance/Legal/DPOs, and end-user employees.

**Why I need this research:** I need to understand (1) the full universe of sensitive data types my product should eventually detect — both personal privacy data and corporate confidential information — so I can prioritize my detection roadmap, and (2) the European legal landscape my product operates within and that my enterprise customers must comply with, so I can build compliance-relevant features and position the product correctly.

---

## Research Area 1: Comprehensive Sensitive Data and Information Taxonomy

I need a structured, exhaustive taxonomy of data and information types that are considered sensitive, confidential, or protected — organized from two perspectives.

### 1A. Personal Data / Privacy Perspective

Provide a comprehensive categorized inventory of personal data types that individuals and organizations must protect. For each category and subcategory:

- **Define** the data type with concrete examples
- **Assign a risk/severity level** (Critical, High, Medium, Low) based on the potential harm from exposure to a third-party AI model
- **Note which regulations** primarily govern this data type (e.g., GDPR Article 9 special categories, HIPAA PHI, PCI DSS, etc.)
- **Assess detectability** — how feasible is it to detect this data type programmatically (via regex, heuristics, or NLP/ML), and what approach is most effective?

Categories to cover at minimum (expand as appropriate):

- **Personally Identifiable Information (PII):** names, addresses, dates of birth, government-issued IDs (SSN, passport, driver's license, national IDs across major jurisdictions — US, EU member states, UK, Nordics, DACH region), tax IDs, voter registration
- **Financial data:** credit/debit card numbers, bank account numbers (IBAN, SWIFT/BIC, routing numbers), financial statements, salary/compensation data, tax returns, investment portfolio details, cryptocurrency wallet addresses
- **Health/Medical data (PHI):** diagnoses, treatment records, prescription information, insurance IDs, genetic data, mental health records, disability information
- **Biometric data:** fingerprints, facial recognition data, voice prints, retinal scans, behavioral biometrics
- **Authentication and access credentials:** passwords, API keys, tokens, certificates, SSH keys, connection strings, encryption keys, MFA seeds
- **Contact information:** email addresses, phone numbers, physical addresses, social media handles/profiles
- **Location data:** GPS coordinates, IP addresses, home addresses, travel itineraries, location history, geofence data
- **Behavioral and digital activity data:** browsing history, search queries, purchase history, app usage patterns, device fingerprints
- **Employment data:** employee IDs, performance reviews, disciplinary records, background check results, work authorization status
- **Children's data and education records** (COPPA, FERPA relevance)
- **Legal data:** court records, legal proceedings, criminal history, immigration status
- **Communications content:** email bodies, chat messages, voicemail transcripts
- **Any other categories** you identify as relevant to the context of employees pasting data into AI prompts

### 1B. Corporate / Organizational Data Perspective

Provide a comprehensive categorized inventory of corporate and organizational data that companies must protect from exposure to third-party AI tools. Same structure: define, give examples, assign severity, note governing frameworks, assess detectability.

Categories to cover at minimum:

- **Trade secrets and intellectual property:** proprietary algorithms, formulas, manufacturing processes, research data, unpublished inventions, patent-pending material
- **Source code and technical assets:** proprietary source code, architecture documents, infrastructure diagrams, database schemas, internal API specifications, deployment configurations, environment variables
- **Business strategy and planning:** M&A targets/plans, strategic roadmaps, competitive analysis, pricing strategies, market entry plans, board presentations, investor communications
- **Financial information:** pre-release earnings, revenue forecasts, audit findings, budget allocations, cost structures, margin data, deal terms
- **Customer and client data:** customer databases, CRM records, customer communications, contract terms, pricing agreements, customer-specific configurations, sales pipeline details
- **Internal communications and documents:** internal memos, executive communications, meeting notes, Slack/Teams messages, draft policies, incident reports
- **Security and infrastructure:** network diagrams, vulnerability assessments, penetration test results, security configurations, firewall rules, incident response plans, access control lists, cloud account IDs
- **HR and people data:** organizational charts, headcount plans, compensation bands, succession plans, investigation files, termination documentation
- **Legal and compliance:** privileged attorney-client communications, pending litigation details, regulatory investigation correspondence, compliance audit results, contract negotiations
- **Vendor and partner data:** vendor contracts, partner agreements, SLAs, procurement data, supply chain details
- **Product and engineering:** unreleased product specifications, beta features, internal tooling, QA/testing data with real customer information, production logs with sensitive data
- **Government and regulatory:** classified information (for defense/gov contractors), export-controlled data (ITAR/EAR), regulatory submission drafts

### 1C. Synthesis: Detection Priority Matrix

After completing 1A and 1B, create a prioritized matrix that maps data types to:

1. **Frequency of appearance in AI prompts** (how often would knowledge workers accidentally paste/type this into ChatGPT, Claude, or Gemini?) — rate as Very Common, Common, Occasional, Rare
2. **Severity of exposure** — rate as Critical, High, Medium, Low
3. **Detection feasibility** — rate as High (regex/pattern), Medium (heuristic + context), Low (requires NLP/ML), Very Low (requires domain knowledge)
4. **Recommended detection approach** — regex pattern, keyword matching, contextual heuristic, NLP/NER, or ML classifier

This matrix should directly inform which detectors I should build next and in what order.

---

## Research Area 2: European Legal Frameworks for Data Protection, AI, and Digital Services

I need a comprehensive analysis of the major European legal frameworks relevant to a product that (a) handles sensitive data classification, (b) operates in the context of AI tool usage, and (c) serves enterprise customers who must demonstrate compliance.

### 2A. Framework Inventory

Identify and describe ALL main European legal frameworks relevant to data protection, AI governance, and digital services. For each framework, provide:

- **Full name and common abbreviation**
- **Legal basis** (regulation vs. directive, and the practical difference)
- **Status** (in force, pending, transitional dates)
- **What it regulates** (scope and subject matter)
- **Who it applies to** (territorial and material scope — which organizations, what triggers applicability)
- **Key requirements** (the 5-10 most important obligations)
- **Penalties for non-compliance** (fines, sanctions, enforcement mechanisms)
- **Relevance to an AI data protection tool** (how does this framework create demand for, regulate, or affect a product like Sunbreak?)

Frameworks to cover at minimum (add any I am missing):

- **GDPR** (General Data Protection Regulation)
- **EU AI Act** (Artificial Intelligence Act)
- **ePrivacy Directive** (and status of the ePrivacy Regulation proposal)
- **NIS2 Directive** (Network and Information Security)
- **Digital Services Act (DSA)**
- **Digital Markets Act (DMA)**
- **Data Governance Act (DGA)**
- **Data Act**
- **DORA** (Digital Operational Resilience Act — financial sector)
- **European Health Data Space (EHDS)**
- **EU Cyber Resilience Act**
- **Any other relevant frameworks** — national implementations, sector-specific regulations, or pending legislation I should be aware of

### 2B. GDPR Deep Dive

Since GDPR is the foundational framework, provide a deeper analysis focused on what businesses must comply with when their employees use third-party AI tools with potentially personal data:

- **Data controller vs. processor implications** when employees paste personal data into AI tools — who is the controller? Who is the processor? What obligations attach?
- **Lawful basis for processing** — which lawful bases could apply when personal data is entered into an AI prompt? How does legitimate interest analysis work here?
- **Special category data** (Article 9) — what are the special categories and what additional protections apply?
- **Data subject rights** — which rights are most relevant when personal data has been sent to an AI tool (right to erasure, right to be informed, etc.)?
- **Data Protection Impact Assessments (DPIAs)** — when is a DPIA required for AI tool usage? What must it contain?
- **International data transfers** — implications when AI tools process data outside the EEA (most AI tools are US-based). Current transfer mechanisms (SCCs, adequacy decisions, Article 49 derogations).
- **Data breach notification** — if personal data exposed via AI tool constitutes a breach, what are the notification obligations (72 hours to supervisory authority, communication to data subjects)?
- **Records of processing activities** — how does AI tool usage fit into Article 30 records?
- **Accountability and documentation** — what evidence must organizations maintain to demonstrate GDPR compliance regarding AI tool usage?

### 2C. EU AI Act Deep Dive

The EU AI Act high-risk system rules take effect August 2026, which is a key regulatory catalyst. Provide:

- **Risk classification system** — what are the four risk categories (unacceptable, high, limited, minimal) and what falls into each? Where does a tool like Sunbreak itself fall? Where do AI tools like ChatGPT/Claude/Gemini fall?
- **High-risk AI system obligations** — what must providers and deployers of high-risk systems do? (Risk management, data governance, technical documentation, transparency, human oversight, accuracy/robustness/cybersecurity)
- **General-purpose AI (GPAI) model obligations** — what are the obligations for providers of foundation models and GPAI systems? How do systemic risk thresholds work?
- **Transparency requirements** — what must be disclosed to users of AI systems? How does this affect companies deploying AI tools for their employees?
- **Prohibited AI practices** — what uses of AI are banned entirely?
- **Timeline** — what takes effect when? Which provisions are already in force, which are coming in August 2026, and which are later?
- **Enforcement and penalties** — fines structure, supervisory authorities, complaint mechanisms
- **Practical implications for enterprises** — what must a company that allows employees to use ChatGPT, Claude, or Gemini at work actually do to comply with the AI Act?

### 2D. Cross-Framework Compliance Map

Create a mapping that shows which frameworks are most relevant to which use cases of an AI data protection tool:

| Use Case | Primary Frameworks | Key Requirements | What Sunbreak Could Provide |
|---|---|---|---|
| Employee pastes customer PII into ChatGPT | ? | ? | ? |
| Developer pastes source code with API keys | ? | ? | ? |
| HR professional discusses employee data with Claude | ? | ? | ? |
| Financial analyst shares revenue data with Gemini | ? | ? | ? |
| Healthcare worker describes patient case to AI | ? | ? | ? |
| Legal team uses AI for contract analysis | ? | ? | ? |
| Employee at financial institution uses AI tools | ? | ? | ? |

Fill in this table with the relevant frameworks, requirements, and what a local-classification AI safety tool could provide as compliance evidence or risk mitigation.

---

## Deliverable Format

Structure the output as a reference document with clear sections, tables, and hierarchical organization. Use tables wherever they improve clarity. Include citations and references to specific articles/recitals of regulations where relevant.

The document should be usable as:
1. A **detection roadmap input** — telling me what data types to prioritize detecting next
2. A **compliance feature spec input** — telling me what compliance evidence features to build
3. A **market positioning reference** — telling me which regulatory pressures create demand for my product
4. A **sales enablement reference** — telling me what compliance frameworks matter to which buyer personas
