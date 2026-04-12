# EU AI Act deep dive and cross-framework compliance map for Sunbreak

**The EU AI Act creates a layered compliance landscape that fundamentally reshapes how European enterprises can use AI tools — and Sunbreak sits at precisely the enforcement gap between policy and practice.** The regulation's phased rollout means companies already face live obligations (prohibited practices since February 2025, AI literacy since February 2025, GPAI rules since August 2025), with high-risk system obligations arriving by August 2026 — or potentially delayed to December 2027 under the Digital Omnibus proposal now in trilogue. For mid-market enterprises in regulated industries deploying ChatGPT, Claude, or Gemini, the critical insight is that the risk classification of the same AI tool changes based on *how employees use it*: general-purpose queries remain minimal risk, but HR screening, credit scoring, or healthcare decisions trigger high-risk obligations with full conformity requirements. This report provides the complete regulatory map.

---

## Part 2C: The EU AI Act in detail

### The four-tier risk classification and where AI tools land

The EU AI Act establishes a risk-based pyramid with obligations calibrated to harm potential. Understanding where specific tools and use cases land in this hierarchy is the foundation for enterprise compliance.

**Unacceptable risk (Article 5)** prohibits eight categories of AI practices outright, with **€35 million or 7% of global turnover** penalties — the Act's harshest. These include subliminal manipulation, exploitation of vulnerable groups, social scoring by public or private entities, predictive policing based solely on profiling, untargeted facial recognition scraping, **emotion recognition in workplaces and educational institutions**, biometric categorization for inferring sensitive attributes (race, religion, sexual orientation), and real-time remote biometric identification in public spaces for law enforcement (with narrow exceptions). All prohibitions became enforceable **2 February 2025**. The workplace emotion recognition ban is the most enterprise-relevant: AI meeting analytics tools that assess "engagement" or "sentiment" from facial expressions or voice tone during video calls are likely prohibited unless they fall within the narrow medical or safety exception.

**High risk (Articles 6–49, Annex III)** covers AI systems in eight sensitive domains where extensive compliance obligations apply. These are biometrics (where permitted), critical infrastructure, education and vocational training, employment and worker management, essential private and public services (including credit scoring and insurance pricing), law enforcement, migration and border control, and administration of justice. **The profiling carve-out is critical**: any Annex III system that performs profiling of natural persons is *always* classified as high-risk, regardless of exceptions that might otherwise apply under Article 6(3). High-risk obligations for Annex III systems become applicable **2 August 2026**, though the Digital Omnibus could push this to **2 December 2027**.

**Limited risk (Article 50)** imposes transparency obligations on AI systems that interact directly with people or generate synthetic content. This is where ChatGPT, Claude, and Gemini fall as consumer-facing chatbots — providers must inform users they are interacting with AI, and AI-generated content must be marked in machine-readable format. These obligations become applicable **2 August 2026**.

**Minimal risk** — the vast majority of AI systems — carries no specific obligations beyond the **Article 4 AI literacy requirement** (already in force) and encouragement to follow voluntary codes of conduct.

**Where general-purpose AI tools fall**: ChatGPT, Claude, and Gemini are *not* classified as high-risk in their general-purpose form. They operate at the **limited risk + GPAI model** level. However, the Act creates a separate regulatory layer for General-Purpose AI models under Chapter V that runs *alongside* the risk tiers. OpenAI, Anthropic, and Google bear GPAI provider obligations (since August 2025) while also being subject to transparency obligations.

**The classification transformation**: The pivotal concept is Article 25(1)(c) — when an enterprise modifies the intended purpose of a GPAI system so it becomes high-risk, **that enterprise becomes the provider of a high-risk AI system** with full provider obligations (conformity assessment, CE marking, technical documentation, quality management). An HR department building ChatGPT into an internal candidate-ranking tool does not merely become a deployer — it becomes the provider of a high-risk system under Annex III point 4.

### How Sunbreak itself would be classified

Sunbreak's classification depends entirely on its technical implementation:

**Regex/rule-based only (no AI):** Falls **entirely outside the AI Act's scope**. Recital 12 explicitly excludes "systems based on rules defined solely by natural persons to execute operations automatically." Regex pattern matching involves no inference capability — outputs are deterministically derived from human-authored rules. No AI Act obligations apply.

**Local NER models:** **Qualifies as an AI system** under Article 3(1) because machine learning–based NER models *infer* entity classifications from statistical patterns rather than explicit rules. However, it falls into the **minimal risk** tier — it does not interact with users as a chatbot (Art. 50), does not fall into any Annex III category, and its purpose is *protective* rather than evaluative. The only obligation is Article 4 AI literacy for staff.

**Local small language models:** Also **qualifies as an AI system** and also falls into **minimal risk**. The use of a more sophisticated model does not change the risk classification — risk depends on the *use case*, not the technical sophistication. Sunbreak makes no consequential decisions about individuals' access to services, employment, or credit. One edge case: if an employer repurposed Sunbreak to *monitor employee prompts* for performance evaluation, it could shift toward Annex III point 4 — but as designed, it remains minimal risk.

### Eight categories of high-risk AI and what they demand

Annex III enumerates the high-risk domains with specificity that matters for enterprise AI governance:

- **Biometrics**: Remote biometric identification, categorization by sensitive attributes, emotion recognition (where not prohibited)
- **Critical infrastructure**: Safety components in digital infrastructure, road traffic, water/gas/heating/electricity
- **Education**: Determining admissions, evaluating learning outcomes, assessing appropriate education level, monitoring cheating
- **Employment**: Recruitment, CV filtering, interview evaluation, performance evaluation, promotion decisions, task allocation, worker behavior monitoring
- **Essential services**: Creditworthiness assessment, credit scoring, life/health insurance risk pricing, public benefits eligibility, emergency call triage
- **Law enforcement**: Victim risk assessment, polygraphs, evidence reliability, recidivism risk
- **Migration**: Border risk assessment, asylum/visa application examination
- **Justice and democracy**: Judicial AI tools, election influence systems

**Provider obligations** for high-risk systems are extensive. Article 9 requires a continuous, iterative **risk management system** covering identification, analysis, evaluation, and mitigation of risks throughout the system's lifecycle, with mandatory testing against clearly defined metrics. Article 10 mandates **data governance** ensuring training data is relevant, representative, error-free, and examined for biases. Article 11 requires **technical documentation** drawn up before market placement and kept current. Article 12 demands **automatic logging** of events for traceability. Article 13 requires **transparency** through comprehensive instructions for use covering system characteristics, capabilities, limitations, and human oversight measures. Article 14 mandates **human oversight** design enabling operators to understand the system, remain aware of automation bias, override outputs, and intervene via a "stop" mechanism. Article 15 sets standards for **accuracy, robustness, and cybersecurity**, including resilience to adversarial attacks, data poisoning, and model manipulation.

**Deployer obligations** under Article 26 are substantial but more focused: use the system per provider instructions, assign **competent human oversight**, ensure input data relevance, monitor operations, maintain logs for at least **6 months**, inform workers before workplace deployment (Art. 26(7)), and inform affected persons they are subject to AI-assisted decisions (Art. 26(11)).

The **Fundamental Rights Impact Assessment** (FRIA) under Article 27 applies to public bodies deploying high-risk systems, private entities providing public services, and any deployer using credit scoring or insurance risk pricing AI. The FRIA must cover affected populations, specific harm risks, human oversight implementation, and internal governance arrangements — and results must be notified to the market surveillance authority.

### When enterprises become deployers — or worse, providers

An enterprise using ChatGPT, Claude, or Gemini for **general tasks** (brainstorming, drafting, translation) is a deployer of a minimal/limited-risk system with only AI literacy and transparency obligations. The company becomes a **deployer of a high-risk system** when it uses these tools for Annex III purposes — screening CVs, evaluating employee performance, assessing creditworthiness, determining benefits eligibility, or evaluating student work.

The more dangerous scenario is the **provider shift** under Article 25(1): the enterprise becomes a *provider* (with full conformity obligations) if it puts its name on a high-risk system, makes substantial modifications, or modifies the intended purpose of a GPAI system to make it high-risk. Building ChatGPT into an internal HR screening pipeline constitutes modifying its intended purpose under Article 25(1)(c), triggering technical documentation, conformity assessment, CE marking, quality management, and EU database registration requirements.

### GPAI model obligations and systemic risk

Chapter V creates obligations specifically for GPAI model providers — distinct from the risk-tier system. A GPAI model under Article 3(63) is one displaying "significant generality" and "capable of competently performing a wide range of distinct tasks." GPT-4, Claude 3/4, and Gemini all definitively qualify. Their providers must maintain technical documentation, provide downstream information enabling compliance, comply with EU copyright law (including rights reservation opt-outs under the Copyright Directive), and publish **sufficiently detailed training data summaries** using the AI Office's mandatory template.

GPAI models with **systemic risk** face additional obligations under Article 55: model evaluation using standardized protocols, adversarial testing, systemic risk assessment and mitigation at Union level, serious incident tracking and reporting, and adequate cybersecurity for models and physical infrastructure. The systemic risk threshold is **10²⁵ FLOPs** of cumulative training compute — a rebuttable presumption. Models exceeding this include **GPT-4, GPT-4o, and o3** (OpenAI), **Gemini 1.0 Ultra, 1.5 Pro, and 2.5 Pro** (Google), **Claude 3 Opus, Claude 3.5 Sonnet, and Claude 4 Opus** (Anthropic), **Llama 3 large variants** (Meta), **Grok 3 and 4** (xAI), and **Mistral Large 2** (Mistral). Approximately **25 models from 11 providers** globally exceeded this threshold as of early 2025.

**GPAI obligations became applicable 2 August 2025** for new models. Legacy models placed on the market before that date have until **2 August 2027** to comply. Enforcement powers (including fines up to €15M or 3% of global turnover) begin **2 August 2026**.

### The GPAI Code of Practice shapes compliance

The GPAI Code of Practice was published **10 July 2025** by the AI Office after a multi-stakeholder drafting process involving nearly 1,000 participants. It was endorsed by the Commission and AI Board on **1 August 2025** as an "adequate voluntary tool" for demonstrating compliance with Articles 53 and 55. Signatories receive a **presumption of conformity** with GPAI obligations.

**28 organizations signed all three chapters** (Transparency, Copyright, Safety & Security), including **OpenAI, Anthropic, Google, Microsoft, Amazon, IBM, and Mistral AI**. The Code requires comprehensive model documentation via a standardized Model Documentation Form, downstream information packages within 14 days, copyright policy compliance, training data summaries using the AI Office's published template, and — for systemic risk models — a Safety and Security Framework with risk assessments across CBRN, cybersecurity, loss of control, and societal-scale risk categories.

**Meta publicly refused to sign** on 18 July 2025, calling the Code "legally uncertain" and claiming it goes "far beyond the scope of the AI Act." Meta faces heightened regulatory scrutiny and must demonstrate compliance through alternative means. **xAI signed only the Safety and Security chapter**, declining Transparency and Copyright provisions.

### AI literacy is already a live obligation

Article 4 has been enforceable since **2 February 2025** — making it one of the first live obligations. It states that providers and deployers "shall take measures to ensure, **to their best extent**, a sufficient level of AI literacy of their staff and other persons dealing with the operation and use of AI systems on their behalf." The "to their best extent" wording introduces a reasonableness standard rather than an absolute requirement.

AI literacy under Article 3(56) means "skills, knowledge and understanding that allow providers, deployers and affected persons ... to make an informed deployment of AI systems, as well as to gain awareness about the opportunities and risks of AI and possible harm it can cause." The European Commission has confirmed that **a company whose employees use ChatGPT must comply with Article 4** — employees should understand specific risks including hallucinations, data privacy, and bias. No formal certificate is required, but organizations should maintain internal records of training initiatives.

**Sunbreak directly contributes to AI literacy compliance** by delivering contextual, at-the-point-of-use education about what constitutes sensitive information and why it matters. The Commission has explicitly stated that "simply relying on the AI systems' instructions for use or asking staff to read them might be ineffective and insufficient" — making real-time, practical tools like Sunbreak a valuable complement to formal training programs. While not a substitute for foundational AI training, Sunbreak provides ongoing behavioral reinforcement.

There is **no direct standalone fine** for Article 4 violations, but non-compliance would likely be treated as an aggravating factor in enforcement actions for other violations. The Digital Omnibus proposes shifting Article 4 from a private-sector obligation to a government-led promotional obligation, but this is politically controversial and may not survive trilogue negotiations — organizations should continue complying with the current text.

### Transparency obligations arrive in August 2026

Article 50 creates four categories of transparency obligation. **Providers of interactive AI systems** (Art. 50(1)) must design systems so users know they are interacting with AI. **Providers of content-generating AI** (Art. 50(2)) must mark outputs in machine-readable format as artificially generated — the industry is converging on the **C2PA standard**. **Deployers of emotion recognition or biometric categorization** (Art. 50(3)) must inform exposed persons. **Deployers generating deepfakes** (Art. 50(4)) must disclose the content is AI-generated, with exceptions for artistic and satirical works.

For enterprises deploying AI tools for employees, the primary provider obligations fall on OpenAI, Anthropic, and Google. Enterprises that **build their own systems using APIs** become providers under Article 50(2) with full marking obligations. The AI Office published a **first draft Code of Practice on AI-generated content marking** in December 2025, with the final version expected mid-2026. The Digital Omnibus proposes extending the Art. 50(2) deadline to **2 February 2027** for systems already on the market before August 2026.

### Implementation timeline as of March 2026

The phased implementation creates a moving compliance target:

| Date | Milestone | Status |
|------|-----------|--------|
| 1 Aug 2024 | AI Act enters into force | ✅ Complete |
| 2 Feb 2025 | Prohibited practices (Art. 5) + AI literacy (Art. 4) apply | ✅ In force |
| 2 Aug 2025 | GPAI obligations (Chapter V), governance bodies, national authority deadline, penalties framework | ✅ In force |
| 2 Aug 2026 | High-risk obligations (Annex III), transparency (Art. 50), deployer obligations, GPAI enforcement powers | ⏳ Pending — may be delayed by Omnibus |
| 2 Aug 2027 | High-risk for regulated products (Annex I/Art. 6(1)); legacy GPAI model compliance | ⏳ Future |

**The Digital Omnibus on AI** (COM(2025) 836, proposed 19 November 2025) is the critical wild card. It proposes a **"stop-the-clock" mechanism** linking high-risk obligations to the availability of harmonised standards, with backstop deadlines of **2 December 2027** for Annex III systems and **2 August 2028** for Annex I systems — a potential 16–24 month delay.

As of **13 March 2026**, the Council adopted its negotiating mandate. The European Parliament's LIBE and IMCO committees are scheduled to vote on **18 March 2026** (tomorrow). Key Parliament additions include a proposed ban on AI-generated non-consensual intimate imagery and fixed deadlines matching the Council's backstop dates. Trilogue negotiations are expected to begin mid-2026, but the Omnibus must be adopted *before* 2 August 2026 for the delays to take effect — creating significant legal uncertainty.

**Harmonised standards are significantly behind schedule.** CEN-CENELEC JTC 21 has been working since May 2023, with the original April 2025 deadline already missed. The first standard to reach public enquiry was **prEN 18286** (Quality Management System) in October 2025. First published standards are not expected until **Q4 2026** at earliest, reinforcing the rationale for the Omnibus delay. In the interim, the GPAI Code of Practice and forthcoming Commission guidelines serve as compliance benchmarks.

### Enforcement infrastructure is still taking shape

**No formal AI Act fines have been imposed as of March 2026.** This reflects the nascent state of enforcement infrastructure rather than lack of violations. The AI Office — headed by **Dr. Lucilla Sioli** within DG CONNECT, with **125+ staff** — has focused on guidance publication and GPAI Code of Practice development. Full GPAI enforcement powers (including the ability to impose fines up to €15M or 3% of turnover) begin **2 August 2026**.

National competent authority designations remain incomplete. **Spain** leads with AESIA as a dedicated AI agency and an active regulatory sandbox. **Ireland** has designated 15 competent authorities across sectors. **Germany's** Bundesnetzagentur is designated as market surveillance authority but the KI-MIG legislation missed the August 2025 deadline. **Finland** reportedly achieved full AI Act enforcement powers in December 2025. **France** has identified agencies but formal designation is pending. Many Member States missed the deadline — the Commission is expected to initiate infringement proceedings.

The most notable enforcement-adjacent action is the Commission's **February 2026 notification to Meta** regarding possible interim measures on WhatsApp third-party AI assistant exclusions, crossing AI Act and DMA enforcement. Reports of investigations into workplace emotion recognition and social scoring remain unconfirmed by official sources.

The **EU AI Pact** — a voluntary commitment scheme launched in November 2023 — has attracted **over 130 companies** committing to AI governance strategies, high-risk system mapping, and AI literacy promotion, functioning as a bridge until mandatory obligations fully apply.

### What enterprises must actually do now

A company allowing employees to use ChatGPT, Claude, or Gemini at work faces a multi-layer compliance challenge. Here is the essential checklist:

**Immediately required (already in force):**
1. Ensure no employee AI use falls within prohibited practices — especially workplace emotion recognition
2. Implement AI literacy programs covering AI risks, data privacy, hallucinations, and bias for all staff using AI tools
3. Document AI literacy measures (training records, policies, materials)
4. If using AI tools that incorporate GPAI models, ensure you understand provider's GPAI compliance status

**Required by August 2026 (or December 2027 if Omnibus passes):**
5. Conduct an **AI use case inventory** — identify every way employees use AI tools and classify by risk tier
6. For any high-risk uses (HR decisions, credit scoring, insurance pricing, etc.): determine whether you are a deployer or have inadvertently become a provider under Article 25
7. For high-risk deployer situations: implement human oversight, ensure input data relevance, maintain logs for 6+ months, inform affected persons and workers
8. Conduct Fundamental Rights Impact Assessment if required (public services, credit scoring, insurance)
9. Ensure transparency obligations are met — employees know they are interacting with AI
10. Integrate AI Act obligations with existing GDPR compliance (DPIA should address AI-specific risks)
11. Establish monitoring and incident reporting procedures
12. Maintain comprehensive documentation for regulatory inquiries

**Sunbreak's role in AI Act compliance** spans multiple obligations: it supports **AI literacy** (Art. 4) through real-time contextual education; it implements **data governance** (Art. 10) by preventing inappropriate data from entering AI systems; it provides **human oversight** (Art. 14/26) by creating a pause-and-review mechanism; it generates **audit logs** (Art. 12/26(6)) documenting AI interactions; and it prevents employees from inadvertently triggering **high-risk classification** (Art. 6/25) by catching sensitive data categories before they enter prompts.

---

## Part 2D: Cross-framework compliance map

### Ten use cases mapped across European regulatory frameworks

The following mapping synthesizes the complete three-part research series, identifying which frameworks apply to specific enterprise AI tool scenarios, what requirements are triggered, and how Sunbreak provides compliance value.

| # | Use case | Primary frameworks | Key requirements | Sunbreak provides | Key persona |
|---|----------|-------------------|------------------|-------------------|-------------|
| 1 | **Employee pastes customer PII into ChatGPT** | GDPR (Art. 5, 6, 25, 28, 44), ePrivacy, AI Act (Art. 4), NIS2 (Art. 21) | Lawful basis for transfer; DPA required; data minimization; international transfer safeguards; breach notification | Pre-transmission PII detection across EU formats; auto-masking implementing privacy by design (Art. 25); audit trail for Art. 30 records | DPO |
| 2 | **Developer pastes source code with API keys into Claude** | Trade Secrets Directive (Art. 2, 4), NIS2 (Art. 21), DORA (Art. 9, 28 if financial), AI Act (Art. 4) | "Reasonable steps" to maintain secrecy; credential protection; ICT third-party risk management | API key/secret pattern detection; source code sensitivity classification; automated credential masking; evidence of "reasonable steps" | CISO |
| 3 | **HR professional discusses employee performance with Gemini** | GDPR (Art. 6, 9, 22, 35), AI Act (Art. 6, Annex III pt.4, Art. 26), Employment law | DPIA mandatory; lawful basis problematic; if used for decisions = high-risk AI; worker consultation required; automated decision rights | Employee data pattern detection; prevents inadvertent high-risk system creation; masking preserving analytical utility; compliance documentation | DPO + Head of AI |
| 4 | **Financial analyst shares revenue forecasts with ChatGPT** | MAR (Art. 7–10, 17–18), Trade Secrets Directive (Art. 2), DORA (Art. 6–9, 28), MiFID II (Art. 16) | Inside information disclosure prohibition; insider list management; ICT risk management; record-keeping | Financial data pattern detection; potential inside information flagging; blocking before market-sensitive data transmitted; audit trail for MAR Art. 16 | Compliance/Legal |
| 5 | **Healthcare worker describes patient case to AI tool** | GDPR (Art. 9, 35), National medical secrecy, EHDS (Art. 4–10), AI Act (Annex III §5), MDR | Health data processing restricted to Art. 9(2) exceptions; professional secrecy; DPIA required; if diagnostic = high-risk AI + potential medical device | Health data detection (patient IDs, ICD-10 codes, medications, lab values); aggressive patient-identifiable redaction; Art. 9 safeguard compliance | CISO/DPO (Healthcare) |
| 6 | **Legal team uses AI for contract analysis (privileged docs)** | Professional secrecy/legal privilege (ECHR Art. 8), GDPR (Art. 6, 28), Trade Secrets Directive (Art. 2, 9), AI Act (Art. 4) | Privilege waiver risk; confidentiality obligations per CCBE Code 2.3; DPA required; trade secret protection | Privileged info detection (client names, matter references); contract-specific PII masking; privilege preservation by preventing third-party transmission | General Counsel |
| 7 | **Bank/insurance employee uses AI tools** | DORA (Art. 5–9, 28–30), EBA/EIOPA guidelines, GDPR (Art. 5–6), AI Act (Annex III pt.5), NIS2, MiFID II | ICT risk management framework; third-party risk management for AI as ICT provider; if credit/insurance pricing = high-risk AI; asset identification | Financial data detection; DORA-aligned preventive control; audit logging for Art. 8 documentation; cross-regulation compliance evidence | CISO + Chief Compliance Officer |
| 8 | **Employee pastes "Confidential" strategy document** | Trade Secrets Directive (Art. 2, 4), NIS2 (Art. 21), AI Act (Art. 4), Internal classification | Three-part trade secret test; "reasonable steps" requirement; information security policies; cyber hygiene | Classification label detection ("Confidential," "Restricted," "Secret"); strategic keyword detection; hard block for highest classifications; Art. 2(1)(c) evidence | CISO + CIO |
| 9 | **Defense contractor discusses technical specifications** | National security regulations, EU Dual-Use Regulation (2021/821, Art. 2, 4, 7), NIS2, Classified info protection | Export control authorization for technology transfer; criminal liability for secrecy violations; supply chain security | Technical specification detection; classification marking detection (NATO); hard blocking for defense content; dual-use terminology matching | Facility Security Officer |
| 10 | **Employee uses personal ChatGPT for work tasks** | GDPR (Art. 5, 24, 28, 30, 32), AI Act (Art. 4, 26), NIS2 (Art. 20–21), Employer liability | Controller remains responsible; no DPA for personal accounts; unrecorded processing; security failure; personal liability under NIS2 | Shadow AI governance — controls at browser level regardless of account; Art. 24/32 compliance in BYOD context; visibility into invisible AI usage | CIO + CISO |

### Compliance feature roadmap for Sunbreak

Based on cross-framework analysis, these features map to regulatory requirements, buyer demand, and market timing:

**Immediate (must-have for market entry):**

**PII detection and auto-masking engine** — detecting names, emails, phone numbers, addresses, and national IDs across all 27 EU member state formats. Addresses GDPR Art. 5(1)(c) data minimization, Art. 25 privacy by design, and Art. 32 security of processing. Primary buyers: DPO and CISO. This is the core product — without it, there is no compliance story.

**Classification label detection and policy enforcement** — detecting document markings (Confidential, Internal, Restricted, Secret, NATO classifications) in pasted text with configurable warn/block/mask responses. Addresses Trade Secrets Directive Art. 2(1)(c) "reasonable steps," NIS2 Art. 21(2)(a), and ISO 27001 A.8.2. Primary buyers: CISO and CIO. Essential for regulated industry entry.

**Credential and secret detection** — pattern matching for API keys, tokens, passwords, connection strings, SSH keys, and certificates. Addresses NIS2 Art. 21, DORA Art. 9, and Trade Secrets Directive. Primary buyer: CISO. A single exposed API key can cost millions — this feature has immediate, tangible security ROI.

**6-month horizon (must-have for enterprise sales):**

**Centralized admin dashboard and policy console** — enterprise configuration of detection rules, sensitivity levels, and enforcement actions per department, role, and AI tool. Addresses GDPR Art. 24 accountability, NIS2 Art. 21, and AI Act Art. 4. Primary buyers: CIO and CISO. Without centralized management, enterprise buyers cannot operationalize the product.

**Audit log and compliance reporting** — tamper-resistant logging of all detections, warnings, blocks, and overrides with exportable reports for regulatory inquiries. Addresses GDPR Art. 5(2) and Art. 30, DORA Art. 8, MAR Art. 16, and NIS2 Art. 21. Primary buyers: DPO, Compliance/Legal, CISO. This transforms Sunbreak from a security tool into a compliance evidence platform.

**Financial data and inside information detection** — pattern recognition for revenue figures, EBITDA, M&A terminology, and trading language. Addresses MAR Art. 7–10 and DORA Art. 6–9. Primary buyer: Compliance/Legal in financial services. Strong vertical differentiator for BFSI market.

**Health data detection module** — medical terminology, patient identifiers, ICD-10 codes, medication lists, and lab values. Addresses GDPR Art. 9, EHDS provisions, and national medical secrecy laws. Primary buyer: Healthcare CISO/DPO. Essential for healthcare vertical.

**12-month horizon (differentiators):**

**DPIA/FRIA integration** — auto-generation of evidence packages mapping Sunbreak controls to GDPR Art. 35 and AI Act Art. 26/27 requirements. Primary buyer: DPO and Compliance/Legal. Positions Sunbreak as part of the compliance documentation workflow.

**AI tool inventory and shadow AI discovery** — auto-detection and cataloging of AI tools employees access with usage pattern analysis. Addresses AI Act Art. 4, DORA Art. 8, and GDPR Art. 30. Primary buyer: CIO and Head of AI. Positions Sunbreak as an AI governance platform.

**Multi-language EU support** — PII detection across all official EU languages with localized national ID formats (IBAN, BSN, Codice Fiscale, NIE). Primary buyer: DPO in multinational enterprises. Competitive moat for pan-European deployments.

**18+ month horizon (platform expansion):**

**Configurable industry compliance presets** — pre-configured detection and policy profiles per regulated industry (Financial Services/DORA+MAR, Healthcare/GDPR Art.9+EHDS, Defense/dual-use+classified, Legal/privilege, Public Sector). Accelerates enterprise onboarding across all verticals.

### Sales enablement by buyer persona

**For the CISO**, the conversation centers on data exfiltration and security posture. CISOs face **personal liability under NIS2 Article 20(1)** for cybersecurity management failures, and uncontrolled AI tool usage creates an undeniable gap. They care most about **NIS2, DORA, and the Trade Secrets Directive**. Their key question is: "How do we maintain security posture when employees use external AI tools?" Sunbreak answers this directly — it provides a browser-level security control detecting credentials, classified documents, source code, and PII in real-time, with all processing local. The pitch: *"Sunbreak gives you the security control you're currently missing — the ability to enforce data protection at the exact moment an employee pastes sensitive information into ChatGPT. It detects API keys, classified documents, and PII locally in the browser — no data leaves your network. With NIS2 making you personally liable for cybersecurity gaps and DORA requiring comprehensive ICT risk management, Sunbreak provides auditable evidence of 'reasonable measures' against AI data leakage. Deploy in hours — no infrastructure changes required."*

**For the DPO**, the issue is unlawful processing and accountability gaps. Every employee pasting customer data into ChatGPT creates an unrecorded processing operation — likely without legal basis, without a Data Processing Agreement, and without international transfer safeguards. DPOs care most about **GDPR (especially Art. 5, 25, 28, 35, and 44–49), the AI Act (Art. 4, 26), and ePrivacy**. Their question: "Can we demonstrate data protection by design when employees use external AI?" The pitch: *"Every employee prompt containing personal data creates a GDPR liability — no legal basis, no DPA, no transfer safeguards, no Art. 30 record. Sunbreak intercepts personal data locally before it ever leaves the browser, detecting EU-format PII across all 27 Member States. It's data protection by design (Art. 25) made operational — not a policy document but a technical measure you can demonstrate to supervisory authorities. Sunbreak turns a GDPR liability into a compliance strength."*

**For the CIO**, the challenge is enabling productivity without losing governance. Research consistently shows that **over 60% of employees under AI bans continue using AI tools** — prohibition fails. CIOs care about **the AI Act (Art. 4, 26), NIS2, and GDPR (Art. 24–25)**. Their question: "How do we enable AI productivity while maintaining governance?" The pitch: *"Your employees are already using AI — bans don't work. Sunbreak gives you a practical alternative: a browser extension that sits between employees and every AI tool, detecting sensitive data and enforcing policies in real-time. You get shadow AI visibility, configurable governance by department, and a single compliance layer addressing GDPR, AI Act, and NIS2 simultaneously. Instead of choosing between innovation and compliance, deliver both."*

**For the Head of AI / AI Governance Lead**, the risk is inadvertent high-risk classification. Uncontrolled use of ChatGPT for employment decisions, credit assessments, or healthcare advice triggers Annex III high-risk obligations without any of the required conformity infrastructure. They care about **the AI Act (Art. 4, 6, 26, 27, Annex III), GDPR Art. 22, and sector-specific requirements**. Their question: "Which employee AI use cases inadvertently trigger high-risk classification?" The pitch: *"The EU AI Act creates a new risk: employees using general-purpose AI for tasks that trigger high-risk classification — HR evaluations, credit assessments, healthcare decisions — without conformity assessments, human oversight, or documentation. Sunbreak catches these scenarios at the point of action, detecting sensitive data categories, enforcing pause-and-review workflows, and creating documentation trails. It's the bridge between your responsible AI policy and what actually happens when employees interact with AI every day."*

**For the Compliance/Legal Officer**, the concern is cumulative multi-framework exposure. A single employee action — pasting client data into ChatGPT — can simultaneously violate GDPR, AI Act, NIS2, and sector rules, with cumulative fines potentially exceeding **13% of global turnover**. They care about **GDPR, the AI Act, DORA/MAR, and the Trade Secrets Directive**. Their question: "How do we demonstrate compliance across multiple frameworks simultaneously?" The pitch: *"One employee, one paste, one ChatGPT prompt — and you face violations across GDPR (unlawful transfer), the AI Act (deployer obligations), NIS2 (risk management failure), and sector rules like MAR or DORA. Sunbreak addresses this convergent risk with a single browser-level control, generating cross-framework compliance evidence: audit logs satisfying GDPR Art. 30, DORA Art. 8, NIS2 Art. 21, and MAR Art. 16 in one report. It converts unmeasurable risk into a documented, controlled, and defensible process."*

### The regulatory window creates urgency

The compliance timeline creates a clear market window for Sunbreak. **AI literacy obligations are already enforceable** — every enterprise using AI tools needs to demonstrate measures taken, and Sunbreak provides real-time, contextual literacy reinforcement that goes beyond checkbox training. **GPAI obligations took effect August 2025**, meaning enterprises must now understand their responsibilities in the GPAI value chain. **High-risk and transparency obligations arrive August 2026** (or December 2027 under the Omnibus), but enterprises in regulated industries — particularly financial services under DORA (fully applicable since January 2025) and NIS2 — cannot afford to wait.

The Digital Omnibus delay is not a reason to defer compliance investment. Even if high-risk deadlines shift, **GDPR, NIS2, DORA, MAR, and the Trade Secrets Directive all apply now** with their own penalty structures. The AI Act adds an additional layer but does not displace existing obligations. For Sunbreak, this means the compliance case does not depend on any single regulation's timeline — the cross-framework value proposition is already live and compounding with each new enforcement deadline.

## Conclusion

The EU AI Act creates a sophisticated regulatory architecture that, combined with existing frameworks, demands enterprises treat AI tool usage as a governed, documented, and controlled activity — not an informal productivity hack. Three insights emerge from this analysis that should shape Sunbreak's strategy.

First, the **classification transformation risk** is the most under-appreciated compliance exposure: the same ChatGPT session can be minimal-risk for one prompt and trigger high-risk provider obligations for the next, depending entirely on the data and purpose. No other compliance tool currently intervenes at this critical moment of classification shift.

Second, the **cross-framework multiplier effect** means a single data leakage incident through an AI tool generates liability under 3–5 regulatory frameworks simultaneously. Sunbreak's unique value is not solving any single framework's requirements but providing a unified control point that generates compliance evidence across all of them at once — particularly valuable for mid-market enterprises lacking dedicated teams per regulation.

Third, the **AI literacy obligation is strategically undervalued** by most enterprises but represents Sunbreak's most immediate go-to-market lever. It is already enforceable, applies to every company using AI tools, and Sunbreak's real-time contextual warnings constitute a genuinely novel approach that the Commission's own guidance suggests is more effective than traditional training alone. Leading with AI literacy in sales conversations creates immediate regulatory urgency while establishing the platform for deeper compliance features as high-risk obligations come online.