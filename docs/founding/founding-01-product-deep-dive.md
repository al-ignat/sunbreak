**Secure BYOAI**

Enabling Personal AI at Work Without the Risk

Product Opportunity Deep Dive

Competitive Landscape • Go-to-Market • Technical Architecture • Buyer Personas

February 2026

# Executive Summary

Shadow AI — the use of AI tools by employees without organisational approval or oversight — has become one of the most significant enterprise security and governance challenges of 2026. Microsoft research shows that 75% of workers already use AI at work, with 78% bringing their own tools. An estimated 60% of organisations have experienced at least one data exposure event linked to public generative AI. Yet only 15% have updated their acceptable use policies to include AI guidelines.

The market is caught in a structural tension: employees need frontier AI tools to remain productive and competitive, but enterprises cannot tolerate unmonitored data flows to third-party models. Current solutions overwhelmingly approach this from the enterprise security side — they block, monitor, and restrict. Almost nobody is building from the employee experience side: enabling the use of personal AI accounts at work in a safe, governed manner.

This document analyses the competitive landscape, proposes a technical architecture, defines a go-to-market strategy, and maps the enterprise buyer personas for a product that sits in this gap — what we provisionally call “Secure BYOAI.”

# 1. Competitive Landscape

## 1.1 Market Structure

The shadow AI governance market sits at the intersection of several established and emerging categories. Understanding where competitors come from — and what they optimise for — reveals the whitespace for a BYOAI-enabling product.

| **Category**                                      | **Key Players**                                                                                        | **Core Approach**                                                                                                       | **Limitation for BYOAI**                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-Native Governance
(Purpose-built)              | Harmonic Security, Acuvity (acquired by Proofpoint Feb 2026), Prompt Security, Portal26, PointGuard AI | Browser extension or endpoint agent that discovers AI tools, classifies data in prompts, enforces policy                | Enterprise-centric. Focused on blocking/monitoring, not enabling personal accounts. Employee experience is secondary.                                                 |
| Modern Cloud DLP
(Extended to AI)                 | Nightfall AI, Cyberhaven, MIND DLP, Polymer DLP, Strac                                                 | API-native DLP across SaaS apps, endpoints, GenAI. LLM-powered content classification                                   | Broad DLP platforms that added GenAI modules. Not designed for the BYOAI use case. Heavy enterprise deployments.                                                      |
| SASE / CASB
(Feature additions)                   | Netskope, Zscaler, Cato Networks, Palo Alto Prisma                                                     | Network-level inspection of AI traffic through existing SASE/CASB infrastructure. Shadow AI dashboards added in 2025-26 | Blunt instrument. Per-domain controls. Cannot distinguish personal vs. corporate accounts. High false-positive rates with unstructured AI prompts.                    |
| Enterprise AI Platforms
(Replace, don’t enable)   | Microsoft Copilot, Google Gemini Enterprise, Amazon Q, ChatGPT Enterprise/Team                         | Provide a sanctioned, enterprise-grade AI tool as the approved alternative                                              | Replace personal tools entirely. Lag behind frontier models. Lose personalisation. Only 5% success rate in production vs. 40% for consumer tools (Fortune, Sep 2025). |
| Browser Security
(Emerging overlay)               | LayerX, Island Enterprise Browser, Talon (acquired by Palo Alto)                                       | Secure enterprise browser or browser extension that controls AI interactions at the DOM level                           | Closest to BYOAI enablement but focused on enterprise browser replacement. Privacy-invasive. Employees resist managed browsers for personal accounts.                 |

## 1.2 Key Competitors In Depth

**Harmonic Security (London/San Francisco)**

- **Funding: **$26M total (Series A led by Next47, Oct 2024)
- **Approach: **Lightweight browser extension deploying purpose-built small language models for millisecond-level data classification. Discovers all AI tools in use, analyses prompts and file uploads, and enforces context-aware policies.
- **Strengths: **Low-latency inline enforcement (not just monitoring). Works across 300+ GenAI tools. Fine-grained department-level policies. Fast deployment via MDM (Intune, Jamf, Kandji).
- **Gap for BYOAI: **Designed for security teams to control employees, not to empower employees to use personal accounts safely. No employee-facing UX for self-service compliance. Framed as “governance and control,” not enablement.

**Acuvity → Proofpoint (Sunnyvale, CA)**

- **Funding/Status: **Founded 2023, $9M seed, acquired by Proofpoint in February 2026.
- **Approach: **Positions itself between prompts and responses across endpoints, browsers, and AI agents. Intent-based access control — understanding what a prompt is trying to accomplish, not just pattern-matching.
- **Strengths: **Most architecturally advanced. Daemon alongside autonomous agents for agentic AI security. Retrospective forensic analysis. Now backed by Proofpoint’s enterprise distribution.
- **Gap for BYOAI: **Acquisition by Proofpoint will push it deeper into enterprise security stack, not toward employee-facing enablement. Will become a module in Proofpoint’s unified platform.

**Nightfall AI (San Francisco)**

- **Approach: **Cloud-native DLP with AI-powered classification across 50+ SaaS apps, endpoints, and GenAI tools. Copy-paste detection to ChatGPT and other LLMs. #1 rated DLP on G2.
- **Strengths: **Fastest deployment in the DLP category. API-native architecture eliminates proxy latency. Strong GenAI-specific controls.
- **Gap for BYOAI: **Broad DLP platform. GenAI protection is one feature among many. No concept of enabling personal accounts — purely protective posture.

**Microsoft BYOAI (Copilot in Microsoft 365)**

- **Approach: **Launched February 2026. Allows employees to bring personal Copilot subscriptions to work within Microsoft 365 apps, with enterprise permissions, compliance, and audit logs still applying.
- **Strengths: **First major vendor to formally address BYOAI. Enterprise-grade protection. IT retains visibility and control. Data stays within Microsoft 365 boundary.
- **Gap for BYOAI: **Only works for Microsoft Copilot within Microsoft 365 apps. Does not address the broader reality: employees use Claude, ChatGPT, Gemini, Perplexity, and dozens of specialised AI tools through browsers. Platform lock-in, not platform-agnostic enablement.

## 1.3 Competitive Whitespace

The critical finding from this landscape analysis is that every current solution falls into one of two camps:

- **Enterprise-down: **Security tools that give CISOs visibility and control over AI usage. Employees are subjects to be monitored, not users to be empowered.
- **Platform-locked: **Enterprise AI platforms that replace personal tools entirely (Microsoft BYOAI being the notable exception, but locked to Copilot in M365).

Nobody is building a platform-agnostic tool that sits on the employee’s side of the equation and makes personal AI account usage transparently safe for the enterprise. This is the whitespace.

# 2. Technical Architecture

## 2.1 Design Principles

The architecture must thread a needle: providing enterprise-grade governance without degrading the employee’s AI experience. Five principles guide the design:

- **Zero-friction when compliant: **The product should be invisible 95% of the time. Governance surfaces only when a policy is triggered.
- **Local-first classification: **Sensitive data detection must happen on-device, not by routing prompts through a cloud proxy. This addresses both latency and privacy concerns.
- **Provider-agnostic: **Must work with any AI tool accessed through a browser — ChatGPT, Claude, Gemini, Perplexity, and emerging tools — without per-tool integrations.
- **Privacy-preserving audit: **Enterprises get aggregate risk intelligence without reading individual conversations. Employees maintain privacy for compliant usage.
- **Employee-facing UX: **The primary interface is designed for the employee, not the security analyst. Think Grammarly, not CrowdStrike.

## 2.2 System Architecture

**Layer 1: Browser Extension (Client-Side)**

The core component is a lightweight browser extension (Chrome, Edge, Firefox, Safari, Arc) that intercepts AI interactions at the DOM level:

- **Prompt Interception: **Hooks into text input fields and file upload dialogs on AI platforms. Captures content before submission. Uses MutationObserver patterns to handle dynamic SPAs.
- **On-Device Classification: **Runs a purpose-built small language model (SLM) locally in the browser via WebAssembly/WebGPU. Classifies content across risk categories: PII, credentials, source code, IP, financial data, customer data. Sub-100ms latency target.
- **Inline Intervention: **When a policy trigger is detected, overlays a contextual warning on the AI tool’s interface. Offers options: auto-redact (replace sensitive tokens with placeholders), modify and resubmit, proceed with logging, or cancel.
- **Provider Fingerprinting: **Identifies which AI tool and account type (personal vs. enterprise) is in use. Adjusts risk thresholds based on the provider’s data retention and training policies.

**Layer 2: Local Classification Engine**

The classification engine is the core differentiator. It must be fast enough for inline enforcement (not just monitoring) and accurate enough to avoid alert fatigue.

- **Architecture: **Quantised SLM (approximately 50-100M parameters) running in-browser. Trained on enterprise data patterns: code syntax detection, PII patterns, financial statement formats, NDA/contract language, customer identifiers.
- **Custom Classifiers: **Enterprises can upload custom patterns (e.g., internal project codenames, product names, API schemas) that the engine learns to detect without exposing the patterns to any cloud service.
- **Confidence Scoring: **Each classification includes a confidence score. High-confidence triggers (credentials, SSNs) auto-block. Medium-confidence triggers (potential IP) warn. Low-confidence triggers log only.
- **Context Awareness: **The engine understands conversational context. A prompt saying “help me write a privacy policy” that includes sample PII is different from one that’s genuinely sharing customer data.

**Layer 3: Cloud Control Plane**

A lightweight cloud service handles policy management, aggregate analytics, and enterprise administration:

- **Policy Engine: **Rule definition interface where security teams set organisational policies: which data categories to block/warn/log, which AI providers are permitted, department-level overrides.
- **Anonymised Analytics Dashboard: **Aggregate metrics visible to security teams: number of AI interactions per department, risk distribution, policy trigger rates, most-used AI tools, trend lines. No individual conversation content.
- **Compliance Reporting: **Auto-generated reports for audit purposes showing policy enforcement statistics, incident summaries, and remediation actions. Maps to GDPR, SOC 2, HIPAA, PCI DSS, and EU AI Act requirements.
- **Threat Intelligence Feed: **Continuously updated database of AI tool risk profiles: data retention policies, training data usage, encryption standards, jurisdiction, and compliance certifications.

**Layer 4: Employee Experience Layer**

This is the key architectural differentiator. Every competitor treats the employee as a threat to be monitored. This product treats them as a user to be served:

- **Personal Dashboard: **Employees see their own compliance status: “You’ve had 142 AI interactions this week, all within policy.” Builds trust and awareness.
- **AI Tool Report Cards: **Before employees start using a new AI tool, they can check its risk profile: data retention policy, training data usage, security certifications. Empowers informed choices.
- **Smart Suggestions: **When content is flagged, the product doesn’t just block — it suggests how to safely achieve the same goal. E.g., “This prompt contains customer names. Here’s a redacted version that will give you the same result.”
- **Opt-In Transparency: **Employees can choose to share anonymised usage patterns with their organisation to contribute to AI strategy insights, earning “trusted AI user” status that unlocks fewer restrictions.

## 2.3 Architecture Diagram (Logical Flow)

| **Component**        | **Location**                      | **Function**                                                |
| -------------------- | --------------------------------- | ----------------------------------------------------------- |
| Browser Extension    | Employee device                   | DOM interception, prompt capture, inline UI overlays        |
| Classification SLM   | Employee device (WASM/WebGPU)     | On-device data classification at sub-100ms latency          |
| Policy Cache         | Employee device                   | Cached organisational policies for offline enforcement      |
| Cloud Control Plane  | Vendor cloud (SOC 2 certified)    | Policy management, anonymised analytics, compliance reports |
| Admin Console        | Web application                   | Security team policy configuration and dashboards           |
| Employee Dashboard   | Web application / extension panel | Personal compliance status, tool report cards, suggestions  |
| AI Provider Registry | Vendor cloud                      | Continuously updated risk profiles for 500+ AI tools        |

## 2.4 Key Technical Decisions

**Why Browser Extension, Not Endpoint Agent?**

- **Deployment: **Browser extensions deploy in minutes via MDM. Endpoint agents require weeks of testing and cause performance concerns (Cyberhaven reportedly causes 2-3x longer build times for developers).
- **Coverage: **Nearly all personal AI usage happens in the browser. Endpoint agents are overkill for this specific use case.
- **Employee acceptance: **Browser extensions feel less invasive than kernel-level agents. Critical for the trust-based product positioning.

**Why On-Device Classification?**

- **Privacy: **Employee prompts never leave the device for classification. This is the strongest possible privacy guarantee and a fundamental trust differentiator.
- **Latency: **Cloud-based classification adds 200-500ms per prompt. For inline enforcement (not just monitoring), this is unacceptable.
- **Regulatory: **For EU customers under GDPR, not routing prompt content through a third-party cloud service removes a significant compliance burden.

# 3. Go-to-Market Strategy

## 3.1 Positioning

The product occupies a unique position: it is the first platform-agnostic tool that makes personal AI accounts safe for enterprise use, rather than replacing them with inferior enterprise alternatives or blocking them entirely.

**Positioning Statement**

“Secure BYOAI lets your employees use the AI tools they love — their personal ChatGPT, Claude, Gemini, and more — while giving your security team the visibility and control they need. No more shadow AI. No more blocking innovation. No more choosing between productivity and compliance.”

**Key Differentiators**

- **Employee-first design: **The only product that treats employees as users to serve, not threats to monitor
- **Platform-agnostic: **Works with any AI tool accessed through a browser, unlike Microsoft’s Copilot-only BYOAI
- **On-device privacy: **Prompts are classified locally; no employee conversation content flows to the vendor or the employer
- **Enable, don’t enforce: **Helps employees safely use AI rather than restricting usage

## 3.2 Target Market Segmentation

| **Segment**           | **Size Range**                                  | **Key Characteristics**                                                                                                                            | **Priority**                                                                         |
| --------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Mid-Market Enterprise | 500-5,000 employees                             | Growing AI adoption, limited security resources, need fast deployment, budget-conscious. Often lack dedicated AI governance team.                  | PRIMARY: Fastest sales cycles, highest pain, least likely to have existing solutions |
| Large Enterprise      | 5,000-50,000 employees                          | Complex compliance requirements, multi-department adoption, existing DLP/CASB investments, longer sales cycles. May have AI governance committees. | SECONDARY: Higher ACV but longer cycles. Position as complement to existing stack.   |
| Regulated Industries  | Any size in BFSI, Healthcare, Legal, Government | Strictest compliance requirements (GDPR, HIPAA, PCI DSS, SOX). Highest data sensitivity. Often earliest to adopt governance.                       | HIGH-VALUE VERTICAL: Premium pricing justified by compliance mandate                 |
| Technology Companies  | Any size                                        | Highest AI adoption rates. Source code is primary risk. Developer productivity is paramount. Most sophisticated buyers.                            | BEACHHEAD: Fastest adoption, strongest word-of-mouth, but price-sensitive            |

## 3.3 Pricing Model

| **Tier**             | **Price/User/Month** | **Features**                                                                                                                                                             | **Target**                                                     |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Free / Freemium      | Free                 | Personal dashboard, AI tool report cards, basic PII detection. Limited to 3 AI tools.                                                                                    | Individual employees, bottoms-up adoption within organisations |
| Team                 | $5-8                 | All Free features + team-level anonymised analytics, custom policies (up to 10 rules), email alerts, Slack integration.                                                  | Small teams, department leads, early-stage companies           |
| Enterprise           | $12-18               | All Team features + unlimited policies, SIEM integration, compliance reporting, custom classifiers, SSO/SCIM, dedicated support, SLA.                                    | Mid-market to large enterprise. Primary revenue driver.        |
| Regulated Enterprise | $20-30               | All Enterprise features + industry-specific compliance templates (HIPAA, PCI, SOX), audit trail with legal hold, custom data residency, on-premise control plane option. | BFSI, Healthcare, Legal, Government                            |

The freemium tier is critical for the bottoms-up GTM motion. Employees discover the product, use it personally, and become internal advocates when the organisation considers enterprise deployment.

## 3.4 Go-to-Market Motions

**Motion 1: Bottoms-Up / Product-Led Growth (PLG)**

- **How: **Individual employees or department leads discover Secure BYOAI through content marketing, AI community channels, developer forums, and word-of-mouth. They install the free browser extension.
- **Conversion: **Usage data builds the case for team/enterprise adoption. “47 people in your organisation already use Secure BYOAI. Upgrade to see aggregate insights.”
- **Content strategy: **Publish AI tool risk report cards, shadow AI benchmarking reports, “Is your AI usage safe?” self-assessment tools. Position the company as the authority on responsible personal AI use.

**Motion 2: Top-Down Enterprise Sales**

- **How: **Direct sales to CISOs, CIOs, and Heads of AI/Digital Transformation. Led with the cost-of-inaction narrative: $670K average additional cost per shadow AI breach (IBM 2025).
- **Proof points: **Free shadow AI audit tool: “Let us show you how much shadow AI is happening in your organisation in 48 hours.” Low-commitment entry point that generates urgency.
- **Channel partners: **Cybersecurity VARs, managed security service providers (MSSPs), and consulting firms (Big 4 practices focused on AI governance).

**Motion 3: Ecosystem / Platform Partnerships**

- **AI provider partnerships: **Partner with Anthropic, OpenAI, Google to be recommended as the “safe way to use [their tool] at work.” Mutual benefit: AI providers want enterprise adoption barriers lowered.
- **Identity/MDM integrations: **Okta, Entra ID, Jamf, Intune integrations for enterprise deployment. Marketplace listings for distribution.
- **GRC platform integrations: **ServiceNow, OneTrust, Archer for compliance workflow integration.

## 3.5 Sales Cycle and Metrics

| **Metric**             | **PLG Motion**                                                               | **Enterprise Motion**                                   |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Time to First Value    | 5 minutes (install extension)                                                | 48 hours (shadow AI audit)                              |
| Sales Cycle            | Self-serve to team: 2-4 weeks. Team to enterprise: 1-3 months                | 3-6 months (mid-market), 6-12 months (large enterprise) |
| ACV Target             | $5K-25K                                                                      | $50K-500K                                               |
| Key Conversion Metrics | Extension installs, daily active users, policy triggers, team upgrade rate   | Audit completion, POC activation, department expansion  |
| Expansion Motion       | Seat expansion as departments adopt. Tier upgrades as compliance needs grow. | Multi-department rollout. Regulated tier upsell.        |

# 4. Enterprise Buyer Personas

The product has a dual-buyer dynamic: the employee user and the enterprise decision-maker. Success requires both to be satisfied. Below are the key personas across the buying journey.

## 4.1 The CISO / VP of Security

| **Attribute**     | **Detail**                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Role              | Chief Information Security Officer or VP/Director of Information Security                                                                                                                                                                                                                  |
| Organisation Size | Typically 1,000+ employees. Budget owner for security tools.                                                                                                                                                                                                                               |
| Core Mandate      | Protect the organisation from data breaches, ensure regulatory compliance, manage risk posture. Increasingly accountable for AI governance.                                                                                                                                                |
| Pain Points       | Zero visibility into what data employees share with AI tools. Existing DLP misses conversational AI because prompts are unstructured text, not files. Board pressure to “enable AI innovation” conflicts with risk mandate. Cannot demonstrate compliance with AI usage in audits.         |
| What They Buy     | Visibility, control, compliance evidence. Needs aggregate dashboards, policy enforcement, and audit trails. Does not need to read individual conversations.                                                                                                                                |
| Objections        | “We already have Netskope/Zscaler.” Response: CASB/SASE cannot classify unstructured AI prompts at the semantic level. “Why not just deploy enterprise AI tools?” Response: Employees will still use personal tools; 78% already do. This governs the reality, not the aspiration.         |
| Decision Criteria | Speed to deployment, accuracy of classification (low false positives), integration with existing stack (SIEM, SOAR), compliance coverage, total cost of ownership.                                                                                                                         |
| Budget Source     | Security tools budget. Competes with/complements DLP, CASB, and emerging AI security line items.                                                                                                                                                                                           |

## 4.2 The CIO / VP of IT

| **Attribute**     | **Detail**                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role              | Chief Information Officer or VP/Director of IT                                                                                                                                                                                                                                                                                                  |
| Core Mandate      | Enable employee productivity through technology. Balance innovation with governance. Manage IT spending and vendor portfolio.                                                                                                                                                                                                                   |
| Pain Points       | Employees complain that enterprise AI tools are inferior to personal ones. Shadow AI undermines IT’s ability to manage the technology estate. Board asks “what’s our AI strategy?” but IT has no data on actual AI usage patterns. Sanctioned enterprise AI tools succeed in production only 5% of the time vs. 40% for consumer tools.         |
| What They Buy     | Enablement with guardrails. Wants to say “yes” to AI adoption, not “no.” Needs usage intelligence to inform enterprise AI strategy. Wants to understand which tools employees actually find valuable.                                                                                                                                           |
| Objections        | “This just adds another tool.” Response: It’s a thin layer that governs all existing AI tools, not a replacement. “We’re rolling out Copilot/Gemini Enterprise.” Response: Great — this governs the 60%+ of usage that happens outside those platforms.                                                                                         |
| Decision Criteria | Employee experience impact, deployment simplicity, strategic intelligence value, vendor consolidation story.                                                                                                                                                                                                                                    |

## 4.3 The Head of AI / Digital Transformation

| **Attribute** | **Detail**                                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role          | Head of AI, VP of Digital Transformation, Chief Data/Analytics Officer. Emerging role, especially in enterprises 2,000+.                                                                                                                |
| Core Mandate  | Accelerate AI adoption across the organisation. Measure AI’s impact on productivity. Build AI literacy and governance frameworks.                                                                                                       |
| Pain Points   | No data on actual AI usage across the organisation. Cannot quantify productivity gains from AI adoption. Governance framework exists on paper but has no enforcement mechanism. AI steering committees make policy that nobody follows. |
| What They Buy | AI adoption intelligence and governance enforcement. Usage analytics that show which departments are using which tools for what purposes. Evidence that governance policies are being followed.                                         |
| Unique Value  | This persona often becomes the internal champion. They have board-level mandate to “make AI work” and a product that enables safe AI adoption directly supports their KPIs.                                                             |

## 4.4 The Compliance / Legal / DPO

| **Attribute**     | **Detail**                                                                                                                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role              | Chief Compliance Officer, General Counsel, Data Protection Officer                                                                                                                                                                                                                 |
| Core Mandate      | Ensure regulatory compliance (GDPR, HIPAA, PCI DSS, EU AI Act). Manage legal risk. Respond to audits and data subject requests.                                                                                                                                                    |
| Pain Points       | Cannot demonstrate that AI usage complies with data protection regulations. 1 in 4 compliance audits in 2026 will include AI governance inquiries. EU AI Act imposes fines up to €35M or 7% of global revenue. No audit trail for what data has been shared with which AI tools.   |
| What They Buy     | Compliance evidence and audit trails. Pre-built templates for regulatory frameworks. Ability to respond to auditor questions about AI governance with concrete data.                                                                                                               |
| Decision Criteria | Regulatory coverage breadth, audit report quality, data residency options, legal defensibility of the approach.                                                                                                                                                                    |

## 4.5 The Employee / End User

| **Attribute**    | **Detail**                                                                                                                                                                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | Knowledge worker across any function: engineering, marketing, finance, HR, operations, legal, product management                                                                                                                                                                                         |
| Core Need        | Use the best AI tools available to do their job faster and better. Access to frontier models (latest Claude, GPT, Gemini) the moment they’re available. Preserve personalisation: conversation history, custom instructions, memories, workflows.                                                        |
| Pain Points      | Enterprise AI tools lag behind consumer versions. Forced to choose between productivity and compliance. Fear of surveillance when using AI at work. No clarity on what’s allowed vs. not allowed. “I know I probably shouldn’t paste this into ChatGPT, but the enterprise tool doesn’t work.”           |
| What They Want   | Permission to use their preferred tools without anxiety. Confidence that they’re not accidentally violating policy. Helpful guardrails, not restrictive walls. A tool that makes them look good, not one that slows them down.                                                                           |
| Adoption Drivers | Zero friction for compliant usage. Instant value (AI tool report cards, personal compliance status). Peer recommendation. Does not feel like corporate surveillance.                                                                                                                                     |

## 4.6 The Buying Coalition

In most enterprises, the purchase decision involves a coalition. Understanding who plays what role is critical for sales strategy:

| **Role in Purchase**  | **Persona**                               | **What They Need to Say Yes**                                                                                                    |
| --------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Budget Owner          | CISO (security budget) or CIO (IT budget) | ROI narrative: cost of shadow AI breach ($670K+) vs. product cost. Competitive peer pressure: “your peers are solving this.”     |
| Technical Evaluator   | Security Engineering / IT Operations      | Easy deployment, low false-positive rates, API integrations, no performance impact                                               |
| Business Sponsor      | Head of AI / CDO / Line of Business VP    | AI adoption acceleration, usage intelligence, productivity metrics                                                               |
| Legal/Compliance Gate | CCO / DPO / Legal                         | Regulatory compliance coverage, audit trail quality, privacy architecture                                                        |
| End User Validation   | Pilot group of knowledge workers          | No productivity degradation, helpful (not annoying) experience, trust                                                            |

# 5. Market Sizing and Timing

## 5.1 Market Size

The AI governance tools market is projected to grow from $227-340M (2024-2025) to $4.83B by 2034, at a CAGR of 35-45%. Within this, the specific “AI Usage Control” (AIUC) segment — governing how employees interact with third-party AI services — is the fastest-growing subsegment. Gartner predicts that by 2028, more than half of enterprises will use AI security platforms, up from less than 10% today.

## 5.2 Timing Indicators

- **Regulatory catalyst: **EU AI Act high-risk system rules take effect August 2026, creating compliance urgency.
- **Consolidation signal: **Proofpoint’s acquisition of Acuvity (Feb 2026) signals that the category is heating up. Large security vendors are buying capability.
- **CASB incumbents adding features: **Cato Networks, Netskope, and Zscaler all added GenAI security controls in 2025. But these are bolt-on features, not purpose-built solutions.
- **Microsoft BYOAI launch: **Microsoft formally naming and productising “BYOAI” (Feb 2026) validates the concept and educates the market. But their solution is Copilot-only, leaving the multi-tool opportunity wide open.
- **Gartner recognition: **AI Security Platforms designated as a “Vanguard” technology in Gartner’s 2026 Strategic Technology Trends. Category is being formally defined.

## 5.3 Window of Opportunity

The window is now. The market is in the “early majority” phase of adoption. Category-defining companies in enterprise security typically emerge 18-24 months after the threat is widely recognised but before incumbent vendors have mature solutions. Shadow AI was widely recognised in 2024-2025. Incumbent CASB/DLP vendors are adding features in 2025-2026 but their architectural foundations are wrong for this problem (network-level inspection cannot understand conversational AI semantics). A purpose-built, employee-first product entering the market now has 12-18 months before incumbents can credibly compete.

# 6. Key Risks and Mitigations

| **Risk**                                 | **Impact**                                                                                                          | **Mitigation**                                                                                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI providers build BYOAI natively        | High — if Claude, ChatGPT, etc. each offer enterprise BYOAI features, the need for a third-party layer diminishes   | Multi-provider value proposition: enterprises use 5-15 AI tools. No single provider will govern competitors’ tools. Be the Switzerland layer.                                                              |
| CASB/SASE vendors improve GenAI features | Medium — Netskope, Zscaler add better AI classification                                                             | Architectural moat: on-device SLM classification will always outperform network-level inspection for unstructured conversational content. Speed and accuracy advantage compounds with training data.       |
| Enterprises mandate single AI tool       | Medium — some orgs may decide to ban personal AI entirely and standardise                                           | Data shows bans fail: 78% of employees use unapproved tools regardless. Market trend is toward governance, not prohibition. Fortune data shows enterprise tools succeed only 5% of the time in production. |
| Browser extension limitations            | Medium — browser APIs evolve, Manifest V3 restrictions, enterprise browser adoption                                 | Maintain multiple deployment options (extension, managed browser, lightweight agent). Monitor browser API roadmaps actively. Engage Chrome Enterprise early.                                               |
| Privacy backlash from employees          | High — if perceived as surveillance, adoption fails                                                                 | On-device classification is the strongest possible privacy commitment. Transparent architecture: publish the technical design. Employee-facing UX builds trust. Opt-in transparency features.              |

# 7. Recommended Next Steps

- **1. Validate demand: **Conduct 20-30 structured interviews with CISOs, CIOs, and knowledge workers across target segments to validate willingness-to-pay and feature prioritisation.
- **2. Prototype the extension: **Build a Chrome extension MVP with basic PII/credential detection (regex + lightweight model) and inline warning UI. Ship to 50-100 beta users within 8 weeks.
- **3. Train the classification SLM: **Partner with a synthetic data provider to generate training data for enterprise-relevant content classification. Target sub-100ms inference on mid-range hardware.
- **4. Shadow AI audit tool: **Build a free, no-commitment tool that organisations can deploy to get a 48-hour snapshot of their shadow AI usage. Primary lead generation mechanism.
- **5. Secure design partnerships: **Engage 3-5 mid-market enterprises as design partners for the enterprise tier. Offer free access in exchange for product feedback, case studies, and references.
- **6. AI provider outreach: **Begin conversations with Anthropic, OpenAI, and Google about partnership opportunities. “We help your users use your tools at work safely” is a compelling narrative for AI providers.

This document was prepared as a product opportunity analysis. All market data and statistics cited are sourced from publicly available reports including IBM Cost of a Data Breach Report 2025, Microsoft Work Trend Index, Netskope Cloud and Threat Report 2026, Gartner Strategic Technology Trends 2026, and various industry publications. Statistics are accurate as of February 2026.