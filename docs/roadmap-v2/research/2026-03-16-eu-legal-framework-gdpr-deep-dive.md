# European Legal Framework Inventory and GDPR Deep Dive for AI Data Protection

**Sunbreak operates at the precise intersection of Europe's most consequential regulatory pressures.** The EU has enacted or is implementing at least 13 major legal frameworks that collectively create an overwhelming compliance environment for enterprises using third-party AI tools. When employees paste personal data into ChatGPT, Claude, or Gemini, they simultaneously implicate GDPR data minimization principles, EU AI Act deployer obligations, NIS2 supply chain security requirements, DORA ICT risk management rules, trade secret protection duties, and potentially the European Health Data Space's secondary use restrictions. Sunbreak's local-browser classification and masking architecture directly addresses compliance requirements under nearly every framework — and the regulatory trajectory through 2027 will only intensify demand.

This document is structured in two parts: a comprehensive inventory of all relevant European legal frameworks (Part 2A), and a detailed GDPR analysis specific to the employee-AI-tool scenario (Part 2B).

---

# PART 2A: EUROPEAN LEGAL FRAMEWORK INVENTORY

## Framework comparison at a glance

| Framework | Type | Status (Mar 2026) | Max Penalty | Sunbreak Demand Driver | Regulates Sunbreak | Regulates AI Tools |
|---|---|---|---|---|---|---|
| **GDPR** | Regulation | Fully applicable since May 2018 | €20M / 4% turnover | ★★★★★ | Moderate | High |
| **EU AI Act** | Regulation | Phased; prohibitions + GPAI live; high-risk Aug 2026 | €35M / 7% turnover | ★★★★☆ | Low-Moderate | High |
| **ePrivacy Directive** | Directive | In force; Regulation withdrawn Jul 2025 | Member State determined | ★★★☆☆ | Moderate | Moderate |
| **NIS2** | Directive | Transposition ongoing; ~20/27 MS complete | €10M / 2% turnover | ★★★★☆ | Indirect | High |
| **DORA** | Regulation | Fully applicable since Jan 2025 | €10M / 5% turnover + daily penalties | ★★★★★ | Low | High |
| **DSA** | Regulation | Fully applicable since Feb 2024 | 6% turnover | ★★☆☆☆ | No | Increasing |
| **DMA** | Regulation | Fully applicable; 7 gatekeepers designated | 10% turnover (20% repeat) | ★☆☆☆☆ | No | Indirect |
| **DGA** | Regulation | Applicable since Sep 2023 | Member State determined | ★☆☆☆☆ | No | Marginal |
| **Data Act** | Regulation | Applicable since Sep 2025 | Member State determined (~€20M / 4%) | ★★★☆☆ | Low | Yes |
| **CRA** | Regulation | In force; reporting Sep 2026; full Dec 2027 | €15M / 2.5% turnover | ★★☆☆☆ | **Direct** | Partial |
| **EHDS** | Regulation | In force since Mar 2025; phased to 2031 | TBD by implementing acts | ★★★★★ (healthcare) | No | High |
| **Trade Secrets Directive** | Directive | In force since 2018 (transposed) | Civil remedies (damages, injunctions) | ★★★★★ | No | High |

---

## 1. GDPR — Regulation (EU) 2016/679

The General Data Protection Regulation is the cornerstone of European data protection and Sunbreak's single most important regulatory demand driver. As a Regulation, it is **directly applicable in all 27 EU Member States** without requiring national transposition — unlike a Directive, which sets goals that each country must implement through its own legislation, creating national variations in scope and enforcement.

**Status and dates.** Adopted 27 April 2016, the GDPR entered into force on 24 May 2016 and became applicable on **25 May 2018**. It has been fully enforceable for nearly eight years. Cumulative fines have exceeded **€7.1 billion** since enforcement began, with **€1.2 billion** issued in 2025 alone and **443 daily breach notifications** reported — a 22% year-over-year increase.

**Scope.** The GDPR applies to all processing of personal data by automated means (Art. 2) by controllers or processors established in the EU, and extraterritorially to non-EU entities offering goods/services to EU residents or monitoring their behavior (Art. 3). This captures every AI provider serving European users.

**Ten key requirements** govern the GDPR compliance landscape: lawful basis for processing (Art. 6), consent standards (Art. 7), special category data protections (Art. 9), data protection by design and default (Art. 25), data protection impact assessments (Art. 35), 72-hour breach notification (Arts. 33–34), comprehensive data subject rights (Arts. 12–22), international transfer safeguards (Arts. 44–49), DPO appointment obligations (Art. 37), and records of processing activities (Art. 30).

**Penalties** operate on two tiers: up to **€10 million or 2% of global turnover** for controller/processor obligation violations (Art. 83(4)), and up to **€20 million or 4% of global turnover** for violations of processing principles, data subject rights, and international transfer rules (Art. 83(5)). Notable recent fines include Meta's €1.2 billion (2023, international transfers), TikTok's €530 million (2025, transfers to China), and Google's €325 million (2025, CNIL).

**Sunbreak relevance.** The GDPR creates massive demand for Sunbreak. When employees enter personal data into AI tools, the data is transmitted to third-party servers — often outside the EEA — creating compliance exposure under Arts. 5 (data minimization), 6 (lawful basis), 25 (data protection by design), 32 (security of processing), and 44–49 (international transfers). Sunbreak implements Art. 25 by design, serving as a technical measure under Art. 32 and a supplementary measure for international transfers under EDPB Recommendations 01/2020. The GDPR deep dive in Part 2B covers the full analysis.

---

## 2. EU AI Act — Regulation (EU) 2024/1689

The Artificial Intelligence Act is the world's first comprehensive AI-specific legislation and the most significant new regulatory framework affecting enterprise AI tool usage. Published in the Official Journal on **12 July 2024**, it entered into force on **1 August 2024** with a phased implementation schedule.

**Implementation timeline.** Prohibitions on unacceptable-risk AI practices and AI literacy obligations (Art. 4) became applicable on **2 February 2025**. GPAI model obligations took effect on **2 August 2025**, including transparency, documentation, and copyright compliance requirements for all GPAI providers, plus additional evaluation and adversarial testing obligations for systemic-risk models (those trained with **≥10²⁵ FLOPs**). The bulk of remaining provisions — including high-risk AI system requirements, transparency obligations for AI-generated content (Art. 50), and deployer obligations — become applicable on **2 August 2026**. A proposed Digital Omnibus may delay high-risk deadlines by up to 16 months; the Council agreed its negotiating position on 13 March 2026.

**Risk-based classification.** The AI Act operates on four tiers. Unacceptable-risk practices (Art. 5) are banned outright — including social scoring, manipulative AI, and untargeted facial recognition scraping. High-risk systems (Annex III) face strict requirements including risk management, data governance, transparency, human oversight, conformity assessment, and registration. Limited-risk systems trigger transparency obligations. Minimal-risk systems face no mandatory requirements.

**GPAI models** — including GPT-4, Claude, and Gemini — form a separate regulatory category under Chapter V. All GPAI providers must maintain technical documentation, publish training data summaries, and implement copyright compliance policies. Models with systemic risk face additional obligations for model evaluation, adversarial testing, incident reporting, and cybersecurity. The **GPAI Code of Practice**, published 10 July 2025, provides the practical compliance pathway and has been signed by major providers including OpenAI, Anthropic, and Google.

**Penalties** reach **€35 million or 7% of global turnover** for prohibited practices, **€15 million or 3%** for high-risk and GPAI violations, and **€7.5 million or 1%** for providing false information to authorities.

**Sunbreak relevance.** Enterprises using ChatGPT, Claude, or Gemini are classified as **deployers** under the AI Act. Their obligations include ensuring AI literacy (Art. 4, already applicable), controlling input data relevance (Art. 26(4)), maintaining logs, and conducting fundamental rights impact assessments for high-risk deployments (Art. 27). Sunbreak directly supports deployer obligations by filtering sensitive data from AI inputs, creating audit trails, and implementing human oversight at the data-entry point. If Sunbreak uses AI for its own classification, it would likely fall into the minimal or limited-risk tier and would not constitute a high-risk system. If it uses only rule-based pattern matching, it falls outside the AI Act's scope entirely.

---

## 3. ePrivacy Directive — Directive 2002/58/EC

The ePrivacy Directive serves as **lex specialis** to the GDPR, providing sector-specific rules for electronic communications. It remains in force through national transpositions across all Member States, despite being widely viewed as outdated.

**The ePrivacy Regulation proposal is dead.** The European Commission formally withdrew the proposal (2017/0003(COD)) on **16 July 2025** after eight years of failed negotiations, citing "no foreseeable agreement." Instead, the Commission proposed targeted amendments through the Digital Omnibus Regulation (December 2025), which would migrate certain terminal-equipment consent requirements from Art. 5(3) ePrivacy to new GDPR Articles 88a and 88b.

**Key provisions** include confidentiality of communications (Art. 5(1)), cookie and tracking consent requirements (Art. 5(3)), traffic data processing rules (Art. 6), location data restrictions (Art. 9), and anti-spam protections (Art. 13). The Directive's confidentiality provisions are relevant when employees transmit sensitive data to AI tools via web interfaces, as these constitute electronic communications.

**Sunbreak relevance.** As a browser extension that accesses and processes information on user terminal equipment, Sunbreak must navigate Art. 5(3) consent requirements. However, since users deliberately install Sunbreak for its protective function, the "strictly necessary for a service requested by the user" exception likely applies. The Directive's confidentiality of communications provisions reinforce the need for tools preventing sensitive data leakage to AI tools.

---

## 4. NIS2 Directive — Directive (EU) 2022/2555

The Network and Information Security Directive 2 dramatically expanded Europe's cybersecurity obligations. As a Directive, it required national transposition by **17 October 2024**. As of March 2026, approximately **20 of 27 Member States** have completed transposition; the Commission sent reasoned opinions to 19 lagging states in May 2025. Germany's transposition (NIS2UmsuCG) took effect in December 2025 with an estimated **29,000 entities** in scope.

**Scope.** NIS2 covers essential entities (large organizations in high-criticality sectors: energy, transport, banking, health, digital infrastructure, public administration) and important entities (medium organizations in these sectors plus additional sectors like food, chemicals, manufacturing, and digital providers). The size-cap rule captures enterprises with **250+ employees** as essential and **50+ employees** as important in covered sectors.

**Key requirements** under Art. 21 mandate an all-hazards approach to cybersecurity risk management, including risk analysis policies, incident handling, business continuity, **supply chain security** (Art. 21(2)(d)), vulnerability handling, cryptography policies, access controls, and multi-factor authentication. Management bodies bear personal accountability (Art. 20). Incident reporting requires early warning within **24 hours** and full notification within **72 hours** (Art. 23).

**Penalties** reach **€10 million or 2% of global turnover** for essential entities and **€7 million or 1.4%** for important entities (Art. 34).

**Sunbreak relevance.** NIS2's supply chain security requirements (Art. 21(2)(d)) are directly relevant. When regulated entities use third-party AI tools, those tools become part of the entity's supply chain. Art. 21(3) requires assessment of each supplier's cybersecurity practices and vulnerabilities. Sunbreak serves as a **technical control** implementing data protection policy for AI tool usage, supporting risk management (Art. 21(2)(a)), supply chain security (Art. 21(2)(d)), cryptography/confidentiality (Art. 21(2)(h)), and access control (Art. 21(2)(i)). As a supplier to NIS2-regulated entities, Sunbreak may face contractual security assurance requirements.

---

## 5. DORA — Regulation (EU) 2022/2554

The Digital Operational Resilience Act applies specifically to the financial sector and has been **fully applicable since 17 January 2025**. As a Regulation, it is directly applicable without national transposition. DORA serves as lex specialis to NIS2 for financial entities.

**Scope** covers **20+ types of financial entities** including banks, payment institutions, investment firms, insurance companies, crypto-asset service providers, and — crucially — their ICT third-party service providers. The first list of designated Critical Third-Party ICT Providers (CTPPs) was published on **18 November 2025**.

**Five pillars** structure DORA's requirements. The ICT risk management framework (Arts. 5–16) mandates comprehensive identification, protection, detection, response, and recovery measures. ICT incident management (Arts. 17–23) requires classification and multi-stage reporting starting within hours. Digital operational resilience testing (Arts. 24–27) demands regular testing including threat-led penetration testing every three years. Third-party ICT service provider risk management (Arts. 28–30) requires detailed registers, pre-contractual due diligence, **ICT concentration risk assessment** (Art. 29), and mandatory contractual provisions. The oversight framework (Arts. 31–44) empowers supervisory authorities over critical third-party providers.

**AI tools as ICT third-party service providers.** ChatGPT, Claude, and Gemini accessed via API or web interface constitute ICT services under DORA's broad definition (Art. 3(21)). Financial entities must include them in their **Register of Information** (Art. 28(3)), conduct pre-contractual due diligence, and ensure contracts contain mandatory DORA terms. The concentration of the AI market among a small number of providers creates measurable **ICT concentration risk** under Art. 29.

**Penalties** include fines up to **€10 million or 5% of turnover** for financial entities, and daily penalties of up to **1% of average daily worldwide turnover** for non-compliant critical third-party providers (up to six months). Competent authorities can ultimately require financial entities to **suspend or terminate** arrangements with non-compliant providers.

**Sunbreak relevance.** DORA is Sunbreak's strongest demand driver for the BFSI target market. The regulation creates acute pressure for financial entities to control data flowing to third-party AI tools. Sunbreak directly supports Art. 9 (protection and prevention), Art. 28 (third-party risk management), Art. 29 (concentration risk mitigation), and Art. 8 (data classification). By ensuring sensitive financial data never reaches AI providers, Sunbreak reduces the risk profile of AI tool usage and may help financial entities avoid classifying AI tools as supporting "critical or important functions."

---

## 6. DSA — Regulation (EU) 2022/2065

The Digital Services Act has been **fully applicable since 17 February 2024** for all intermediary services, with VLOPs/VLOSEs (≥45 million monthly active EU users) subject to enhanced obligations since August 2023. Currently **23 VLOPs and 2 VLOSEs** are designated.

**AI chatbot classification is pending.** In October 2025, OpenAI self-reported **120.4 million average monthly active EU users** for ChatGPT's search feature — nearly three times the 45-million VLOP/VLOSE threshold. The Commission aims to conclude the designation procedure in **Q1 2026**. If designated, ChatGPT would become the first AI chatbot subject to VLOP/VLOSE obligations including systemic risk assessments (Art. 34), independent audits (Art. 37), and data access for researchers (Art. 40).

**Sunbreak relevance.** The DSA does not regulate Sunbreak (which is not an intermediary service). However, the tightening regulation of AI platforms signals that enterprises cannot rely solely on AI providers' compliance. Sunbreak provides an enterprise-side safeguard layer independent of platform obligations.

---

## 7. DMA — Regulation (EU) 2022/1925

The Digital Markets Act targets designated gatekeepers across core platform services. Seven companies are currently designated: Alphabet, Amazon, Apple, ByteDance, Meta, Microsoft, and Booking.com. **No AI provider has been separately designated**, and "AI" is not currently listed as a core platform service. However, AI features embedded in existing designated services (Google AI Overviews in Search, Microsoft Copilot in Windows) already fall within scope. Penalties reach **10% of global turnover** (20% for repeat infringement).

**Sunbreak relevance** is limited but contextual. The DMA's restrictions on gatekeepers combining personal data across services (Art. 5(2)) reinforce the regulatory principle that enterprise data flowing to AI ecosystems requires careful control.

---

## 8. DGA — Regulation (EU) 2022/868

The Data Governance Act, applicable since **24 September 2023**, establishes rules for data intermediation services, data altruism, and re-use of public sector data. Sunbreak is not a data intermediation service and falls outside the DGA's scope. Relevance is marginal but exists for organizations participating in European Data Spaces, where Sunbreak's classification capabilities could help identify and protect sensitive data entering sharing workflows.

---

## 9. Data Act — Regulation (EU) 2023/2854

The Data Act became generally applicable on **12 September 2025**, with connected product design obligations applicable from September 2026 and cloud switching charges fully prohibited from January 2027. It regulates IoT data access, B2B data sharing, unfair contractual terms, and critically, **cloud switching and portability** (Chapter VI).

AI tools offered as SaaS (ChatGPT API, Claude API, Gemini API) likely qualify as "data processing services" under Art. 2(12), subjecting them to Chapter VI switching and portability obligations. Enterprise customers have the right to switch providers and retrieve their data within 30 days. The strategic narrative for Sunbreak: "The Data Act gives you the right to get your data back from AI providers. Sunbreak ensures you don't need to — by preventing sensitive data from being sent in the first place."

---

## 10. CRA — Regulation (EU) 2024/2847

The Cyber Resilience Act entered into force on **10 December 2024** with a phased timeline: vulnerability and incident reporting obligations apply from **11 September 2026**, and full compliance including CE marking is required by **11 December 2027**. The CRA covers all "products with digital elements" placed on the EU market with a data connection.

**Sunbreak is directly in scope** as a Chrome browser extension — it is installable software with a data connection. As the manufacturer, Sunbreak's maker must comply with Annex I essential cybersecurity requirements (secure-by-default design, confidentiality protections, vulnerability handling, SBOM provision), conduct conformity assessment, and obtain CE marking by December 2027. Classification could be default (self-assessment) or potentially Important Class I (given the security-critical nature of the tool and that web browsers are explicitly Class I). Vulnerability reporting to CSIRT/ENISA is required from September 2026.

This is Sunbreak's most significant **product compliance** obligation and requires planning now for the December 2027 deadline.

---

## 11. EHDS — Regulation (EU) 2025/327

The European Health Data Space entered into force on **26 March 2025** — the first sectoral data space established as binding EU law. Implementation is phased: primary use provisions (patient access, cross-border exchange via MyHealth@EU) apply from **March 2029**, and secondary use provisions (research, AI training through Health Data Access Bodies) become applicable between **2029 and 2031**.

The EHDS is critical for healthcare customers. Electronic health data (EHD) is defined broadly — encompassing clinical records, medical images, prescriptions, and even wellness application data. Secondary use of EHD requires authorization through national Health Data Access Bodies, secure processing environments, and prohibition of re-identification attempts (Arts. 68–71). **When healthcare employees input patient data into ChatGPT, Claude, or Gemini, this constitutes unauthorized secondary use** outside the EHDS framework, bypassing HDAB authorization and secure environment requirements.

**Sunbreak relevance for healthcare is extremely high.** The tool prevents EHD leakage into AI tools, supports dual GDPR + EHDS compliance, and addresses the employee risk vector. Sales narrative: "The EHDS creates strict rules about how health data can be used beyond direct care. When your employees paste patient information into ChatGPT, that's unauthorized secondary use. Sunbreak prevents this before it happens."

---

## 12. Trade Secrets Directive — Directive (EU) 2016/943

The Trade Secrets Directive, transposed into national law across all Member States by June 2018, protects undisclosed business information meeting three criteria: the information is secret, has commercial value because of its secrecy, and the holder has taken **reasonable steps** to keep it secret (Art. 2(1)).

**This "reasonable steps" requirement is arguably Sunbreak's strongest enterprise sales argument.** Allowing employees to paste trade secrets into public AI tools without safeguards could constitute failure to take reasonable steps — potentially **destroying trade secret status entirely**. The Samsung incident (2023), where engineers pasted confidential source code and meeting notes into ChatGPT, illustrates the risk: information retained for model training becomes irretrievably compromised. Studies show **11% of data pasted into ChatGPT is sensitive or confidential**, with source code as the second most common type. Once disclosed to AI tools, information may be surfaced to other users and cannot be recalled.

Deploying Sunbreak constitutes a demonstrable reasonable step to maintain trade secret status. The Directive provides civil remedies including injunctions, damages (including lost profits and unjust enrichment), and destruction of infringing goods — though not criminal sanctions at the EU level (some Member States add criminal provisions).

---

## 13. Notable national implementations

National laws add requirements beyond the GDPR baseline, creating compliance complexity for pan-European products.

**Germany's BDSG** mandates DPO appointment when **≥20 persons** regularly engage in automated processing (lower than GDPR's Art. 37 threshold) and imposes **criminal penalties** of up to three years imprisonment for unauthorized commercial transfer of personal data (§42). The TTDSG (since December 2021) mandates strict opt-in consent for non-essential cookies and tracking. Germany has 16 state DPAs plus the federal BfDI, creating a complex multi-authority enforcement landscape. A new Employee Data Protection Act (BeschDG) is under development following ECJ findings that §26 BDSG insufficiently implements Art. 88(2) GDPR.

**France's Loi Informatique et Libertés** (originally 1978, the first European comprehensive data protection law) adds criminal sanctions of up to **five years imprisonment and €300,000 fines** (€1.5M for legal entities) for fraudulent data collection or failure to implement security measures. CNIL does not generally recognize employee consent as "freely given," affecting how employers deploy monitoring tools. France sets the digital age of consent at 15 and includes unique provisions for digital death/deceased persons' data.

**Denmark's Databeskyttelsesloven** uniquely prevents the DPA (Datatilsynet) from directly imposing fines — all fines must be imposed by courts. It specifically regulates processing of Danish CPR social security numbers and covers data of deceased persons for up to 10 years.

**Other notable variations** include Spain's LOPDGDD (highest volume of fines in the EU — over 1,021 fines totaling ~€120.7M), Italy's active Garante (first DPA to ban ChatGPT), and the Netherlands' highest absolute number of breach notifications (**39,773** in the year to January 2026).

**Impact on Sunbreak.** A "highest common denominator" approach is required — comply with the strictest national variation for each requirement. Key areas include employee consent/information obligations for workplace deployment, local storage/access requirements (TTDSG §25 for German users), and privacy notice requirements.

---

# PART 2B: GDPR DEEP DIVE FOR AI TOOL USAGE

## Controller vs. processor roles when employees use AI tools

**The employer is the data controller** when employees enter personal data into AI tools in a work context. Under Art. 4(7), the controller "determines the purposes and means of the processing." The employer determines why the data is processed (business purpose) and broadly how (by authorizing or failing to restrict AI tool usage). EDPB Guidelines 07/2020 confirm controllership is a "functional concept" based on actual roles and factual circumstances, not contractual designation.

The AI provider's role depends fundamentally on the account type. With **enterprise/corporate accounts**, the AI provider acts as a **data processor** (Art. 4(8)), processing personal data on behalf of the employer-controller under a Data Processing Agreement (Art. 28). OpenAI's DPA states explicitly: "OpenAI will process Customer Data as Customer's Data Processor." Google's Cloud Data Processing Addendum similarly designates Google as processor. Anthropic's commercial terms include a DPA with Standard Contractual Clauses, and API data is never used for training.

With **personal/consumer accounts**, the picture changes dramatically. The AI provider becomes an **independent controller** for processing beyond prompt servicing (e.g., model training). Anthropic's privacy policy states it is the data controller for personal accounts. Consumer terms typically allow data use for model training by default. Critically, **no DPA exists** between the employer and provider, creating an immediate Art. 28 violation. As regulatory analysis confirms: "Personal accounts breach Article 28. Always."

**Joint controllership** (Art. 26) may arise when an AI provider uses prompt data for its own purposes alongside the employer's purpose. CJEU case law (Fashion ID, C-40/17; Wirtschaftsakademie, C-210/16) establishes that joint controllership can exist even with unequal involvement. Consumer accounts where the provider retains data for training while the employer benefits from outputs could create de facto joint controllership, requiring a transparent arrangement under Art. 26 determining respective GDPR responsibilities.

The Art. 28 DPA must contain specific provisions: subject matter and duration, nature and purpose of processing, data types and subject categories, processor obligations to process only on documented instructions, confidentiality commitments, security measures, sub-processor authorization controls, data subject rights assistance, breach notification duties, data deletion/return on termination, and audit rights. EDPB's October 2024 opinion emphasized that DPAs must include "more specific, concrete information" rather than merely restating Art. 28(3) requirements.

**Compliance evidence Sunbreak provides:** Detection logs demonstrating which personal data categories were intercepted before reaching AI providers, supporting Art. 28 compliance verification and demonstrating the controller's oversight of data flows to processors.

---

## Lawful basis analysis for personal data in AI prompts

When personal data enters an AI prompt, the employer must identify a lawful basis under Art. 6(1). Of the six available bases, **legitimate interests (Art. 6(1)(f))** is the most viable for routine enterprise AI tool usage.

**Consent (Art. 6(1)(a))** is largely impractical. Consent must come not from the employee entering data, but from the **data subjects whose personal data appears in the prompt** — customers, clients, patients. It must be freely given, specific, informed, and unambiguous (Art. 4(11)). Data subjects typically have no idea their data may be processed by AI tools. Withdrawal rights (Art. 7(3)) are practically impossible to honor once data enters an AI system used for training. For employees specifically, consent is rarely "freely given" due to the employer-employee power imbalance (EDPB Guidelines 05/2020, para. 21; Recital 43).

**Performance of a contract (Art. 6(1)(b))** applies only where AI processing is objectively necessary to fulfill a specific contract with the data subject — a very narrow scope. Convenience or efficiency improvements do not qualify; the ICO states that if "there is a less intrusive way of processing their data to provide the same service," this basis does not apply.

**Legitimate interests (Art. 6(1)(f))** requires the three-part cumulative test confirmed by CJEU (C-621/22, October 2024) and EDPB Guidelines on legitimate interest (October 2024). First, identify a **legitimate interest** that is lawful, clearly articulated, and real — employer interests in productivity, customer service improvement, or operational efficiency can qualify. Second, assess **necessity** — is processing personal data via AI tool strictly necessary, or are less intrusive alternatives available? This is where Sunbreak directly assists: by masking personal data before transmission, it demonstrates pursuit of less intrusive means and supports the necessity element. Third, conduct a **balancing test** weighing employer interests against data subjects' rights. EDPB Opinion 28/2024 identifies key factors: nature of data, context, reasonable expectations of data subjects, possible consequences, and whether data was publicly available. A customer who provided data for a service contract would not reasonably expect it to be entered into a third-party AI tool — Sunbreak serves as a "mitigating measure" that reduces impact on data subjects, potentially tipping this balance favorably.

**Model training requires a separate lawful basis.** The Italian Garante fined OpenAI **€15 million** specifically because it processed personal data for ChatGPT training "without having an adequate legal basis." EDPB Opinion 28/2024 confirms development (training) and deployment are "distinct and separate purposes," each requiring independent lawful basis assessment. Enterprise accounts contractually prohibit training on customer data, eliminating this concern. Consumer accounts allow training by default, creating uncontrolled secondary processing.

**Purpose limitation (Art. 5(1)(b))** presents additional challenges. If data was collected for one purpose (e.g., service delivery), using it in an AI prompt for another (internal analysis, draft generation) may violate purpose limitation unless the new purpose is compatible under Art. 6(4) or a new lawful basis exists. CNIL guidance emphasizes that AI processing purposes must be "determined, legitimate and clear" — an organization "cannot define the purpose too broadly as, for example, 'the development and improvement of an AI system.'"

**Compliance evidence Sunbreak provides:** Detection and masking logs demonstrating data minimization in practice, directly supporting the necessity element of the legitimate interests test and providing documentary evidence for the Art. 6(1)(f) balancing assessment.

---

## Special category data creates the highest-risk AI scenarios

Article 9(1) prohibits processing of eight categories of sensitive data: **racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data** (when processed for unique identification), **health data**, and **data concerning sex life or sexual orientation**. This prohibition operates alongside — not instead of — Art. 6 requirements. Processing special category data requires both an Art. 6 lawful basis and an Art. 9(2) exception simultaneously.

The ten Art. 9(2) exceptions include explicit consent (Art. 9(2)(a)), employment law necessity (Art. 9(2)(b)), vital interests (Art. 9(2)(c)), processing by not-for-profit bodies (Art. 9(2)(d)), manifestly public data (Art. 9(2)(e)), legal claims (Art. 9(2)(f)), substantial public interest (Art. 9(2)(g)), health/social care (Art. 9(2)(h)), public health (Art. 9(2)(i)), and archiving/research (Art. 9(2)(j)). **No Art. 9(2) exception readily covers inadvertent entry of special category data into consumer AI tools.** The processing is therefore unlawful by default.

Common scenarios of inadvertent special category data in prompts include health data ("Summarize this patient file"), religious references ("Prepare schedule around Ramadan for team member X"), trade union information (employee grievance files), ethnic origin data (HR diversity documents), and sexual orientation indicators (benefits forms listing same-sex partners). Criminal conviction data under Art. 10 faces an equally restrictive separate regime where even consent is generally insufficient — only processing under official authority control or specific legal authorization is permitted.

**Consequences are severe.** Art. 9 violations trigger the highest penalty tier (Art. 83(5)) — up to **€20 million or 4% of turnover**. Breaches involving special category data are almost always classified as "high risk to rights and freedoms," requiring notification to both the supervisory authority (Art. 33) and affected data subjects (Art. 34). Multiple DPAs have imposed massive fines for special category violations: the Dutch DPA fined Clearview AI **€30.5 million** for processing biometric data without lawful basis.

**Sunbreak's value proposition peaks here.** By detecting health terms, religious references, ethnic indicators, trade union mentions, biometric identifiers, and sexual orientation data before transmission, Sunbreak prevents the special category data from reaching the AI provider — eliminating the need for an Art. 9(2) exception entirely and avoiding the most serious category of GDPR breach.

---

## Data subject rights become practically unenforceable once data reaches AI systems

The rights under GDPR Chapter III present extreme practical challenges when personal data has entered a large language model, making prevention through tools like Sunbreak far more effective than attempted remediation.

**Right to be informed (Arts. 13–14).** Organizations must inform data subjects that their data may be processed by third-party AI tools. Art. 14 is particularly critical because most affected individuals (clients, customers, patients) did not directly provide data to the AI tool. The Italian Garante found OpenAI breached Arts. 12 and 13 because its privacy notice was only available in English, purposes were "too broad and unclear," and no notice existed for non-users whose data was used for training. Organizations deploying AI tools must update privacy notices to disclose the provider, purposes, legal basis, and transfer mechanisms. Under Art. 14(3), this information must be provided within one month.

**Right to erasure (Art. 17)** is the most technically fraught right in the AI context. Once personal data enters a prompt and potentially contributes to model training, **true erasure is practically infeasible**. LLMs may retain residual "memorization" from training data even after the original dataset is deleted. OpenAI allows erasure requests via its Privacy Portal but acknowledges this prevents data from appearing in responses rather than removing it from the model. The EDPB ChatGPT Taskforce acknowledged "data subjects may face factual limits to intervene in the complex processing operations of ChatGPT." CNIL has acknowledged that "data subject rights may be respected indirectly" through output filtering, but the gap between legal requirements and technical reality remains vast. The EDPB's Coordinated Enforcement Framework 2025 specifically focuses on Art. 17 implementation in practice.

**Right to rectification (Art. 16)** faces similar technical barriers. The EDPB ChatGPT Taskforce noted that "OpenAI encourages end users to exercise their right of erasure rather than rectification due to the technical challenges associated with the development and operation of its LLMs." The Italian Garante found an accuracy principle breach: "despite the adopted measures, OpenAI cannot guarantee the accuracy of the output data."

**Right to object (Art. 21)** is relevant where processing is based on legitimate interests. Following the Italian Garante's intervention, OpenAI now offers opt-outs for training. But the right to object must be communicated clearly to data subjects, and the employer must demonstrate "compelling legitimate grounds" that override the individual's interests.

**Rights related to automated decision-making (Art. 22)** apply when AI output directly determines outcomes affecting individuals — HR decisions, credit assessments, customer treatment. Art. 22(3) requires safeguards including the right to obtain human intervention, express one's point of view, and contest the decision.

**Sunbreak's strategic value:** By preventing personal data from reaching AI tools, Sunbreak eliminates the need for complex erasure, rectification, and access request fulfillment at the AI provider level — rights that are technically near-impossible to exercise with LLMs.

---

## DPIAs are effectively mandatory for organizational AI tool usage

The consensus across European DPAs is that organizational use of generative AI tools almost always requires a Data Protection Impact Assessment under Art. 35.

Art. 35(1) requires a DPIA where processing "using new technologies" is "likely to result in a high risk to the rights and freedoms of natural persons." Art. 35(3) lists mandatory scenarios including systematic evaluation based on automated processing, large-scale processing of special category data, and systematic monitoring. Generative AI tool usage triggers multiple DPIA indicators simultaneously: new technology, potential special category data processing, automated evaluation of personal aspects, and large-scale data transfer to third countries.

**DPA positions are unambiguous.** Norway's Datatilsynet stated in its landmark NTNU Copilot exit report: "As a general rule, a DPIA will be required when using generative AI tools." CNIL considers DPIAs "in principle necessary" for AI systems involving personal data. The ICO positions AI-related processing as "generally a high-risk activity that requires a DPIA." BfDI's 2024 guidance treats AI input data minimization as a **technical requirement** — organizations must implement "real-time data minimization" including "systems that prevent or remove personal data before AI processing occurs."

Art. 35(7) requires DPIAs to contain: a systematic description of processing operations and purposes, necessity and proportionality assessment, risk assessment, and envisaged mitigation measures including safeguards and security mechanisms. CNIL's AI-specific DPIA guidance identifies additional risks: confidentiality of extractable data, misuse of training data, automated discrimination from bias, generation of fictitious content about real persons (hallucinations), and risk of automated decision-making without human oversight.

**Sunbreak's role in DPIAs is threefold.** As a **technical safeguard** under Art. 35(7)(d), it qualifies as a data minimization and security measure protecting confidentiality. As **evidence of risk mitigation**, its deployment demonstrates proactive risk reduction aligned with regulatory expectations from CNIL, Datatilsynet, ICO, BfDI, and EDPB. As **data protection by design and default** (Art. 25), it embodies building data protection into processing operations from the outset — directly satisfying BfDI's explicit requirement for "real-time data minimization" in AI systems. By reducing residual risk, Sunbreak may help organizations avoid the need for prior consultation with supervisory authorities under Art. 36.

---

## International transfers challenge every enterprise AI deployment

Most major AI tools are US-based, making every employee prompt containing personal data a potential Chapter V international transfer. The EDPB Guidelines 05/2021 clarify cumulative criteria for what constitutes a "transfer" under Chapter V, and Art. 44 requires that the level of protection guaranteed by GDPR "is not undermined."

**The EU-US Data Privacy Framework remains valid but faces ongoing legal uncertainty.** Adopted 10 July 2023 via Implementing Decision (EU) 2023/1795, the DPF was upheld by the EU General Court on **3 September 2025** (Case T-553/23, Latombe v Commission), which found the US Data Protection Review Court sufficiently independent. However, Philippe Latombe filed an appeal to the CJEU on **31 October 2025**, which remains pending. CJEU proceedings typically take approximately 18 months, meaning a ruling could come in late 2026 or 2027. NOYB/Max Schrems has signaled broader challenges ("Schrems III"), and concerns persist about the stability of Executive Order 14086-based protections. Organizations should maintain **alternative transfer mechanisms** as fallback.

**Standard Contractual Clauses (Art. 46(2)(c))** remain the most widely used transfer mechanism. The 2021 EU SCCs include Module 2 (Controller to Processor) for employer-to-AI-provider transfers with DPAs, and Module 1 (Controller to Controller) where the AI provider also acts as independent controller. Without a valid DPA — the situation with consumer AI accounts — processing of personal data through ChatGPT is not lawful per regulatory analysis.

**Transfer Impact Assessments** are required under Clause 14 of the 2021 SCCs, documenting whether the data importer can comply in light of destination-country laws. CNIL's practical guide outlines a six-step process aligned with EDPB Recommendations 01/2020. TIAs must assess whether the AI provider can restrict intelligence agency access, whether data is encrypted, and whether the provider has received government access requests. The TikTok precedent — Irish DPC's **€530 million fine** (May 2025) for inadequate China transfers despite conducting a TIA — demonstrates that superficial assessments are insufficient.

**Art. 49 derogations cannot support routine AI tool usage.** EDPB Guidelines 2/2018 state derogations "cannot become 'the rule' in practice" and must be restricted to specific, occasional situations. Systematic, repetitive use of AI tools for daily operations fails this test.

**Sunbreak as a supplementary technical measure** represents a powerful compliance argument. EDPB Recommendations 01/2020 (Version 2.0) list technical supplementary measures including encryption and pseudonymization. By detecting and masking PII locally before data leaves the browser, Sunbreak implements real-time pseudonymization at the point of data export. If the AI provider never receives identifiable personal data, the Schrems II government-access concern is materially reduced because there is no personal data to access. This fundamentally changes the TIA risk calculus. BfDI's 2024 guidance requiring "systems that prevent or remove personal data before AI processing occurs" directly describes Sunbreak's functionality.

---

## Employee AI data leaks are confirmed personal data breaches

The question of whether sending personal data to a third-party AI tool constitutes a personal data breach under Art. 4(12) has been definitively answered by the **Dutch DPA's August 2025 guidance**: yes, it does. Art. 4(12) defines a breach as "a breach of security leading to the accidental or unlawful... unauthorised disclosure of, or access to, personal data." The Dutch DPA confirmed: "By entering personal data into AI chatbots, the companies that offer the chatbot may gain unauthorised access to those personal data."

The Dutch DPA reported receiving **"dozens of data breach reports related to AI chatbot usage in 2024 and 2025 — and the numbers are rising."** Specific documented cases include a GP practice employee entering medical patient data into a chatbot (classified as special category breach), a telecom employee entering customer address files, and the city of Eindhoven discovering employees uploaded **2,368 files** containing personal data to public AI tools in just 30 days — including youth welfare documents, CVs, and internal case files.

**The 72-hour notification obligation (Art. 33)** triggers when the controller becomes "aware" of a breach, unless the breach is "unlikely to result in a risk to rights and freedoms." Risk assessment factors include the type and sensitivity of data, volume of affected subjects, ease of identification, severity of potential consequences, and whether data was encrypted before disclosure. For AI chatbot disclosures, the Dutch DPA considers many incidents notifiable. Special category data disclosed to a chatbot is almost certainly high risk. **Notification to data subjects (Art. 34)** is required at the higher "high risk" threshold, which is met when special category data is involved, when data may be used for model training (expanding exposure), or when data may become accessible through model outputs.

**Sunbreak as breach prevention.** Under Art. 32, controllers must implement "appropriate technical and organisational measures" including pseudonymization, encryption, and ongoing confidentiality assurance. Sunbreak's pre-send detection directly implements these requirements. Under EDPB Guidelines 9/2022, Recital 88 states that "due consideration should be given to... whether or not personal data had been protected by appropriate technical protection measures." A tool that prevents personal data from reaching AI tools could reduce breach severity to the point of eliminating notification obligations — if PII was effectively masked, no personal data was actually disclosed, meaning no "breach" occurred under Art. 4(12).

---

## Records of processing activities must capture AI tool usage

Art. 30 requires controllers to maintain records including processing purposes, data subject categories, personal data categories, recipients, international transfers, retention periods, and security measures. The EDPB ChatGPT Taskforce Report (May 2024) explicitly required controllers to provide Art. 30 records covering "the processing of personal data in relation to the ChatGPT software infrastructure." The EDPS Orientations on Generative AI (October 2025) states that "the purpose should be defined even in the early stages" and "must include this in the details of the purpose of processing when completing their records."

Best practice is creating a **separate ROPA entry** for "Use of third-party generative AI tools" documenting approved tools, permitted data categories, legal basis, DPAs, transfer mechanisms, and technical safeguards. Sunbreak's detection logs provide real-time evidence of what personal data categories employees attempt to send, frequency and volume metrics, data minimization evidence, and audit trails — directly supporting accurate ROPA maintenance.

---

## Accountability requires documented evidence, not just policies

The accountability principle (Art. 5(2)) requires controllers to "be responsible for, and be able to demonstrate compliance with" GDPR principles. This demonstration requirement is central to the regulatory framework — the Italian Garante's €15 million fine against OpenAI specifically cited Art. 5(2), finding OpenAI failed to identify a lawful basis pre-launch.

Art. 32 mandates "appropriate technical and organisational measures" for security of processing. For AI tool usage, appropriate technical measures include pre-send PII detection/masking (BfDI's 2024 guidance specifically requires this as a "technical requirement, not an organizational aspiration"), pseudonymization before AI input, encryption of communications, access controls for AI tool usage, and enterprise accounts with DPAs. Appropriate organizational measures include AI Acceptable Use Policies, governance frameworks with approval processes, employee training specific to GDPR and AI, incident response procedures for AI data leaks, and regular audits.

**Shadow AI — employees using unauthorized AI tools — directly threatens accountability.** Statistics show **77% of employees** have pasted company information into AI/LLM services, with **82%** using personal accounts and **11%** of pasted content being sensitive data. The organization cannot "demonstrate compliance" (Art. 5(2)) if it doesn't know AI tools are being used, has no DPAs in place (Art. 28), no ROPA entries (Art. 30), and no security measures (Art. 32).

Sunbreak addresses shadow AI by providing a **universal protection layer** operating at the browser level regardless of which AI tool is used — approved or unauthorized. Detection logs serve as compliance evidence for Art. 32 implementation, accountability documentation (Art. 5(2), Art. 24), DPIA risk mitigation evidence (Art. 35), breach investigation support, and ROPA maintenance.

---

## DPA enforcement landscape is intensifying around AI and GDPR

**EDPB.** The ChatGPT Taskforce (established April 2023) published its report on 23 May 2024, covering lawfulness, fairness, accuracy, and transparency issues. Opinion 28/2024 (adopted 17 December 2024) addressed when AI models can be considered anonymous, confirmed legitimate interest as a viable basis subject to strict testing, and listed corrective powers including "erasure of the AI model itself." The EDPB's 2024–2025 Work Programme plans guidelines on anonymization, pseudonymization, and data scraping in generative AI contexts.

**Italian Garante.** The first DPA to act against ChatGPT — imposing a temporary ban on **30 March 2023** over lack of legal basis, transparency failures, and absent age verification. The ban was lifted on **28 April 2023** after OpenAI implemented corrective measures. The subsequent investigation culminated in a **€15 million fine** (decision dated 2 November 2024, published 20 December 2024) for violations of Arts. 5(1)(a), 5(2), 6, 12, 13, 24, 25, and 33. The Garante also fined Luka Inc. (Replika AI) **€5 million** in 2025. OpenAI is appealing.

**CNIL.** Published an AI Action Plan (May 2023) and extensive recommendations on AI development, legitimate interest, purpose limitation, transparency, and data subject rights. Published two new AI-specific recommendations in February 2025 on informing data subjects and facilitating individual rights. Launched the PANAME project for privacy auditing of AI models.

**ICO.** Published eight essential questions for generative AI organizations (April 2023), conducted a five-part consultation series (January–September 2024), and published consultation outcomes (December 2024). Launched the AI and Biometrics Strategy (June 2025). Maintained the position that legitimate interests requires a high bar for the three-part test.

**Dutch DPA.** Published the most explicit guidance on AI chatbot data breaches (August 2025), reporting dozens of breach notifications from AI tool usage. Fined Clearview AI **€30.5 million** and is investigating whether directors can be held personally liable. Published its 4th AI & Algorithmic Risks Report (February 2025).

**BfDI and German DPAs.** German DPAs issued joint guidance on GDPR-compliant AI deployment (May 2024) emphasizing defined use cases, legal basis, and preference for closed AI systems. BfDI published "AI in Authorities" guidance (December 2025) and launched a public consultation on AI models and personal data. Hamburg DPA published a checklist for LLM-based chatbots.

**noyb complaints.** Filed complaints against OpenAI with the Austrian DSB (April 2024, ChatGPT providing incorrect information about Max Schrems) and with Norwegian Datatilsynet (March 2025, ChatGPT hallucinating that a Norwegian man murdered his children). Both cases are ongoing.

**Irish DPC.** Became lead supervisory authority for OpenAI from February 2024. Suspended X (Twitter) from processing personal data for Grok AI training. Imposed fines against LinkedIn (€310M), Meta (€251M), and TikTok (€530M) in 2024–2025.

---

## What compliance features Sunbreak should build

Based on the full regulatory analysis, Sunbreak's product roadmap should prioritize features that generate compliance evidence mapped to specific legal requirements.

For **GDPR accountability** (Arts. 5(2), 24, 25, 32): detection audit logs with timestamps, data category classification records, masking/redaction evidence, and configurable policy enforcement rules. For **DPIA support** (Art. 35): risk metrics dashboards showing data exposure patterns, special category data detection rates, and before/after risk quantification. For **breach prevention** (Arts. 33–34): real-time blocking of unauthorized personal data transmission, incident logs documenting prevented breaches, and alerts for security teams. For **ROPA maintenance** (Art. 30): automated classification of personal data categories flowing to AI tools, recipient tracking (which AI providers receive data), and volume reporting. For **international transfer compliance** (Arts. 44–49): evidence of pre-transfer data minimization qualifying as a supplementary measure under EDPB Recommendations 01/2020. For **AI Act deployer obligations** (Arts. 4, 26): AI literacy training integration, human oversight documentation, and input data governance logs. For **NIS2/DORA supply chain compliance** (NIS2 Art. 21, DORA Arts. 28–29): third-party risk mitigation evidence and data classification reporting for ICT risk frameworks. For **CRA product compliance** (by December 2027): vulnerability handling processes, SBOM, technical documentation, and CE marking preparation. For **Trade secrets protection** (Art. 2(1)(c)): confidential business information detection and "reasonable steps" documentation.

## Conclusion

The European regulatory landscape creates a multi-layered compliance imperative for enterprises using AI tools that is intensifying through 2027. Three dynamics define the opportunity for Sunbreak. First, **regulatory convergence**: GDPR, the AI Act, NIS2, DORA, and the EHDS are not parallel requirements but overlapping obligations that compound the risk of uncontrolled data flows to AI providers. A single employee prompt containing a patient's health data simultaneously implicates GDPR Art. 9 (special category data), Art. 35 (DPIA obligation), Arts. 44–49 (international transfers), the AI Act's data governance requirements, the EHDS's secondary use restrictions, and potentially DORA's ICT risk management framework. Second, **enforcement is accelerating**: the Dutch DPA's explicit characterization of AI chatbot data leaks as reportable breaches, the Italian Garante's €15 million ChatGPT fine, and the EDPB's coordinated enforcement focus on AI demonstrate that theoretical risks have become operational enforcement realities. Third, **prevention is far more valuable than remediation**: data subject rights (erasure, rectification, access) are technically near-impossible to exercise once data enters an LLM, making pre-send detection the only architecturally sound compliance approach. Sunbreak's local-browser processing model is not merely a product design choice — it is a regulatory architecture advantage that satisfies data protection by design (Art. 25), qualifies as a supplementary technical measure for international transfers, and may eliminate breach notification obligations entirely by ensuring personal data never leaves the enterprise perimeter.