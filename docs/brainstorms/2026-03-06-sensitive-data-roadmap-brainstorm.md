---
date: 2026-03-06
topic: sensitive-data-classification-roadmap
status: draft
---

# Sunbreak Data Classification Roadmap — From Regex to Intelligence

## The Core Insight

The categories easiest to detect with regex (PII, credit cards) are NOT the categories with the highest business value. The most damaging categories — trade secrets, financial projections, strategic plans — require semantic understanding that pattern matching cannot provide.

This creates a clear product sequencing: start with what's easy to detect (build trust, prove value, achieve adoption), then climb the complexity ladder toward what enterprises actually pay for.

```
Business Value to Enterprise
^
|                                          * Trade Secrets
|                                    * Strategic Plans / M&A
|                              * Source Code IP
|                        * Customer Commercial Data
|                  * Financial Projections (MNPI)
|             * Legal Privileged Comms
|        * API Keys & Credentials
|    * HR / Compensation Data
|  * Standard PII (SSN, email, phone)
|  * Payment Card Data
+------------------------------------------------------> Detection Complexity
  Regex     Keywords+    NER        SLM        Domain     LLM
            Context    Models    Classifiers  Fine-tuned  (Server)
```

**What this means for Sunbreak:** v1 regex PII is the foot in the door. The real product — the one CISOs queue up to buy — lives in the upper-right quadrant. Every phase of this roadmap moves us diagonally toward higher business value AND higher technical sophistication.

---

## Enterprise Data Categories — Ranked by Business Impact

### TIER 1: Existential Risk (Company-threatening if leaked)

**1. Trade Secrets & Proprietary Business Intelligence**
- Pricing strategies, M&A discussions, competitive intelligence, proprietary algorithms
- For Maersk: route optimization algorithms, fuel hedging strategies, container stacking methods
- No regex can catch "our margin on the Asia-Europe route is 4.2%"
- Legal impact: loss of trade secret protection if "reasonable measures" weren't taken
- Detection: requires semantic understanding of what is proprietary to a specific company
- *Technology needed: Tier 4-5 (domain-specific fine-tuned models or LLM)*

**2. Operational Technology & Infrastructure Data**
- Network diagrams, system configs, vulnerability assessments, penetration test results
- Maersk lost $300M to NotPetya in 2017 — an employee pasting infra details into ChatGPT gives adversaries a blueprint
- NIS2 directive: fines up to 10M EUR or 2% global turnover for critical infrastructure failures
- Detection: internal IP ranges are regex-able, but broader infra context needs classification
- *Technology needed: Tier 1-2 (structured parts) + Tier 3 (contextual parts)*

**3. Source Code & Technical IP**
- Proprietary software, internal APIs, database schemas, algorithm implementations
- Samsung: engineers pasted source code into ChatGPT 3 times in one month
- Source code is 30% of all sensitive data detected in AI prompts (Harmonic Security, 22.4M prompts)
- Detection: code structure is pattern-detectable; distinguishing proprietary vs open-source needs context
- *Technology needed: Tier 1-2 (structure detection) + Tier 3 (proprietary classification)*

### TIER 2: Severe Risk (Major financial/legal consequences)

**4. Financial Data & Material Non-Public Information (MNPI)**
- Earnings before announcement, forecasts, P&L, M&A deal terms
- Maersk is publicly traded (OMX Copenhagen) — pre-release financials violate securities law
- 12.6% M&A data + 7.8% financial projections in Harmonic's exposure breakdown
- Detection: financial figures alone aren't sensitive — "projected Q3 revenue" IS, "last year's revenue" ISN'T
- *Technology needed: Tier 1 (markers) + Tier 3 (temporal/contextual understanding)*

**5. Customer & Partner Commercial Data**
- Contract terms, shipping volumes, negotiated rates, SLAs, cargo manifests
- 45.77% of all sensitive data in AI prompts is customer data (Harmonic)
- For Maersk: leaking Walmart's supply chain topology leaks Walmart's business strategy
- Detection: basic PII is regex-able, but commercial terms + counterparty = hard
- *Technology needed: Tier 2 (entity recognition) + Tier 3 (relationship classification)*

**6. Legal Privileged Communications**
- Attorney-client communications, regulatory filings, litigation strategy
- 22.3% of detected exposures — second largest category after code (Harmonic)
- Privilege can be WAIVED if shared with third-party AI — irreversible legal harm
- Detection: explicit headers ("PRIVILEGED AND CONFIDENTIAL") are easy; content without headers is hard
- *Technology needed: Tier 1 (headers/markers) + Tier 3 (document classification)*

### TIER 3: High Risk (Regulatory fines, individual harm)

**7. API Keys, Credentials & Secrets**
- AWS keys, database connection strings, SSH keys, tokens, passwords
- 12,000 valid API keys found in AI training datasets (Common Crawl)
- Direct breach vector — a single leaked credential = system access
- Detection: known prefixes (AKIA, sk-, ghp_), PEM headers, high-entropy strings
- *Technology needed: Tier 0-1 (pattern matching — already partially built in v1)*

**8. HR, Compensation & Employee Data**
- Salary data, performance reviews, PIPs, termination decisions, benefits
- 27% of sensitive AI prompts contain employee data
- Pay equity lawsuits, discrimination claims, privacy violations
- Detection: employee IDs + salary patterns + HR terminology = medium difficulty
- *Technology needed: Tier 1 (keyword + context windows)*

**9. Standard PII**
- SSN, email, phone, passport, driver's license, date of birth, home address
- 77% of employees paste company data into AI tools (LayerX 2025)
- GDPR fines up to 4% global revenue; CCPA, state privacy laws
- Detection: well-established regex patterns — best-solved category
- *Technology needed: Tier 0 (regex — already built in v1)*

**10. Payment Card & Banking Data**
- Credit card numbers, CVV, IBAN, SWIFT codes, bank accounts
- PCI DSS mandates — fines $5K-$100K/month for violations
- Detection: Luhn algorithm, fixed formats — highest-confidence regex detection
- *Technology needed: Tier 0 (regex — already built in v1)*

### TIER 4: Moderate Risk (Context-dependent)

**11. Strategic Plans & Board Materials**
- Market entry plans, product roadmaps, board presentations, R&D specs
- R&D materials: 17.1% of sensitive data (Cyberhaven)
- Detection: "BOARD CONFIDENTIAL" is easy; strategic content without markers is hard
- *Technology needed: Tier 1 (markers) + Tier 3 (document classification)*

**12. Medical / Health Information (HIPAA PHI)**
- Patient records, diagnoses, treatment plans, medical record numbers
- HIPAA fines up to $2.13M per violation category per year
- Healthcare breach average: $7.42M (2025)
- Detection: MRN patterns, ICD-10 codes, drug names are dictionary-matchable
- *Technology needed: Tier 1-2 (dictionary + NER for medical entities)*

**13. GDPR Special Categories**
- Racial/ethnic origin, political opinions, religious beliefs, health data, biometric data
- GDPR Article 9: processing generally prohibited without explicit consent
- Detection: health keywords work; racial/political/religious = deep semantic understanding
- *Technology needed: Tier 2-3 (NER + semantic classification)*

**14. Internal Communications Metadata**
- Email threads, Slack messages, meeting transcripts pasted for summarization
- Sensitivity depends entirely on content — lunch plans vs. divestiture discussion
- Detection: container format (email headers) is detectable; content sensitivity is not
- *Technology needed: Tier 3-4 (content classification)*

---

## Technology Tiers — What Each Can Do

### Tier 0: Regex + Checksum Validation

**What Sunbreak already has (v1):**
- Email, phone, credit card (Luhn), SSN/CPR/NI, IP address, API keys (known prefixes)

| Metric | Value |
|--------|-------|
| Latency | <1ms per pattern |
| Download size | ~5KB of patterns |
| Browser feasibility | Trivial |
| False positive rate | 2-5% (main weakness) |

**What it CAN'T do:** Distinguish real data from examples. No contextual understanding. Misses anything without a fixed format (names, companies, unstructured business data).

### Tier 1: Dictionary + Keyword Context Windows

**The Microsoft Purview / Google Cloud DLP approach.** Not just "does this match a pattern?" but "does this match a pattern NEAR a relevant keyword?"

How it works:
- Primary element: regex match + optional checksum
- Supporting element: keyword proximity (e.g., "Social Security" within 250 chars of a 9-digit number)
- Confidence scoring: 65% (pattern only) -> 75% (pattern + 1 keyword) -> 85% (pattern + 2 keywords)
- Context windows: configurable character distance before/after the match

**New categories this unlocks:**
- Confidentiality markers: "CONFIDENTIAL", "PRIVILEGED", "DRAFT - NOT FOR DISTRIBUTION", "INTERNAL ONLY"
- Legal privilege headers + legal terminology in proximity
- Financial data markers: currency amounts + "projected"/"forecast"/"Q3"/"FY2027"
- HR patterns: salary/compensation + employee ID + performance terminology
- Code structure: function definitions, import statements, class declarations
- Security data: internal IPs + CVE identifiers + server hostnames
- Database connection strings, environment variable blocks

| Metric | Value |
|--------|-------|
| Latency | 1-5ms |
| Download size | ~100-500KB (keyword dictionaries) |
| Browser feasibility | Easy |
| False positive reduction | 40-60% improvement over raw regex |

**This is the highest-ROI next step.** It dramatically reduces false positives on existing detectors AND opens new detection categories — all without downloading models or requiring GPU.

### Tier 2: Named Entity Recognition (NER)

**The first "model" tier.** Detects entities that have no fixed format: person names, organization names, locations, medical terms.

Best candidates for browser deployment:
- **DistilBERT-NER** (~66M params, ~130MB quantized) — fastest practical option
- **BERT-base-NER** (~110M params, ~170-250MB quantized) — higher accuracy
- **ab-ai/pii_model** — ~96% F1 on PII benchmarks

Deployment via **Transformers.js v4** (preview):
- WebGPU backend: 3-5x faster than WASM
- 53% smaller default bundle
- Tokenizer-only mode at 8.8KB for lightweight deployment
- Pre-converted ONNX models available on HuggingFace

**New categories this unlocks:**
- Person names (no regex can reliably detect "Maria Garcia" as PII)
- Organization names in context ("Walmart's Q3 shipping volume")
- Location data ("our Berlin warehouse at Friedrichstrasse 42")
- Medical terms and conditions for HIPAA compliance

| Metric | Value |
|--------|-------|
| Latency | 50-300ms (WebGPU), 100-500ms (WASM) |
| Download size | 130-250MB (one-time, cached) |
| Browser feasibility | Feasible with caching strategy |
| First-load UX impact | Significant — needs progressive download |

**Key UX challenge:** The first model download. Options:
1. Download on extension install (background, before first use)
2. Progressive enhancement: regex detectors run immediately, NER activates after download
3. Opt-in: "Enable advanced detection (130MB download)"

### Tier 3: Small Language Model (SLM) Contextual Classification

**Where the real money is.** This is what Harmonic Security does — and why they raised $26M.

The Harmonic approach (relevant prior art):
- Fine-tuned **ModernBERT** (149M params base)
- 21 separate binary classifiers, each for a specific sensitivity domain
- Training data generated by LLM (Amazon Nova Pro), then fine-tuned via SageMaker
- Claims 96% greater accuracy than legacy regex DLP
- Latency: sub-500ms (p95) — server-side

For Sunbreak's browser deployment:
- **ModernBERT-base** quantized to int8: ~150-200MB
- 8192 token context window (handles long prompts)
- 2-4x faster than previous BERT encoders
- Binary classifier approach: one model that outputs "sensitive: yes/no" + category
- Alternative: **Chrome Gemini Nano** (built-in, zero download, rolling out CPU support in Chrome 140)

**New categories this unlocks:**
- Financial projections vs historical data ("projected Q3" vs "last year's Q3")
- M&A content detection without explicit markers
- Legal discourse without "PRIVILEGED" headers
- Source code sensitivity (proprietary logic vs boilerplate)
- Strategic plans and competitive intelligence
- Customer business intelligence (contract terms + counterparty)
- Context-aware PII: "sample data in a privacy policy draft" vs "real customer records"

| Metric | Value |
|--------|-------|
| Latency | 200-500ms |
| Download size | 150-530MB (quantized) OR 0 (Gemini Nano) |
| Browser feasibility | Marginal with own model; promising with Gemini Nano |
| Training required | Yes — need labeled dataset of sensitive/non-sensitive prompts |

**Chrome Gemini Nano is the wild card.** If Chrome's built-in model stabilizes for text classification, Sunbreak gets SLM-grade detection at zero download cost. Worth tracking closely.

### Tier 4: Enterprise Domain-Specific Models (Server-Side)

**This is where the enterprise tier lives.** Organization-specific classification that requires company context.

How competitors do it:
- **Nightfall AI**: Per-organization custom models trained on their data patterns
- **Microsoft Purview**: Trainable classifiers — admins provide positive/negative examples
- **Cyberhaven**: Data lineage — tracks data from origin (Salesforce CRM) through copy/paste into ChatGPT

For Sunbreak this means:
- Cloud control plane (first server-side component)
- Organization provides sample data or document categories
- Fine-tune a classifier on their specific sensitivity definitions
- Push quantized model to browser OR classify server-side
- This is the enterprise tier ($12-18/user/month)

**New categories this unlocks:**
- "This looks like our product roadmap" (company-specific document classification)
- "This contains details about Project Phoenix" (codename detection)
- Organization-specific trade secrets
- Custom compliance rules per department

| Metric | Value |
|--------|-------|
| Latency | 200-500ms (server-side) |
| Requires | Cloud control plane, org-specific training data |
| Browser feasibility | Impractical (too many models per org) |
| Revenue implication | Enterprise tier — this is the monetization layer |

### Tier 5: Full LLM Classification (Server-Side)

**The nuclear option.** Can detect virtually anything a human analyst could identify, but with latency and cost trade-offs.

- 1-10+ second latency per classification
- Not suitable for inline/real-time interception
- Useful for: async audit of flagged content, training data generation, batch analysis
- How Harmonic uses LLMs: generate labeled training data, NOT real-time classification

**Sunbreak should use LLMs for:**
- Generating training data for Tier 3-4 models (the Harmonic playbook)
- Async re-analysis of flagged prompts for compliance reporting
- NOT for real-time classification

---

## The Roadmap: Phases by Increasing Complexity

### Phase 0: Regex PII (DONE - v1)

**What:** Email, phone, CC, SSN/CPR/NI, IP, API keys
**Technology:** Regex + checksums
**Business value:** Low-medium (regulatory compliance baseline)
**Effort:** Done
**Detects:** ~10% of what enterprises worry about

### Phase 1: Enhanced Configurable Patterns (v0.2 - PLANNED)

**What:** Pattern templates, custom regex, labeled categories, import/export
**Technology:** Regex + user configuration
**Business value:** Medium (customizable = team-adoptable)
**Effort:** 2-3 weeks
**Detects:** +5% (whatever the user configures)

### Phase 2: Context-Aware Pattern Detection (v0.3)

**What:** Keyword proximity scoring, confidentiality markers, financial/legal/HR pattern bundles, code structure detection
**Technology:** Enhanced regex + dictionary + context windows (a la Microsoft Purview SITs)
**Architecture decision:** Extend the classifier engine with a `ContextScorer` that adjusts confidence based on keyword proximity. No new architectural paradigm — same pure-function pattern, just smarter scoring.
**Business value:** Medium-high (dramatic false positive reduction + new categories)
**Effort:** 3-4 weeks
**Detects:** +15-20% of enterprise-relevant data

New detectors to build:
1. `confidentiality-marker.ts` — document classification headers
2. `financial-indicator.ts` — currency + temporal + projection keywords
3. `legal-privilege.ts` — privilege headers + legal terminology
4. `hr-compensation.ts` — salary patterns + HR terminology
5. `code-structure.ts` — function/class/import detection
6. `security-infra.ts` — internal IPs + CVEs + hostnames
7. Context scoring module for ALL existing detectors (reduce false positives)

**This is the highest-ROI phase.** No model downloads, no GPU requirements, runs in <5ms, and unlocks detection of categories that are 5-10x more valuable to enterprises than basic PII.

### Phase 3: Named Entity Recognition (v0.4)

**What:** Person names, organization names, locations, medical terms
**Technology:** Transformers.js v4 + quantized DistilBERT-NER (~130MB)
**Architecture decision:** This is the first major architecture change. Need to decide:
- Model loading strategy (install-time vs progressive vs opt-in)
- Web Worker for inference (keep main thread responsive)
- Async classification pipeline (regex runs sync, NER runs async, results merge)
- Model update mechanism (how to ship updated models)
- Fallback when WebGPU unavailable (WASM backend)

**Business value:** High (catches person names — the most common PII that regex misses)
**Effort:** 4-6 weeks (significant architecture work)
**Detects:** +10-15% of enterprise-relevant data

Key decisions:
- Do we bundle the model with the extension or lazy-load it?
- Chrome Web Store has a ~500MB size limit — model + extension must fit
- WASM vs WebGPU: WebGPU is 3-5x faster but not universally available
- Need a "capability detection" system: what's available on this user's browser?

### Phase 4: Semantic Classification (v0.5)

**What:** Financial projections, M&A content, legal discourse, strategic plans, customer business data
**Technology:** Fine-tuned ModernBERT (~150-200MB) OR Chrome Gemini Nano (0MB)
**Architecture decision:** The biggest fork in the road:

**Option A: Own Model (ModernBERT)**
- Full control over what it classifies
- Need training data pipeline (use LLM to generate, fine-tune SLM)
- ~150-200MB additional download
- Works across all browsers
- We own the model = competitive moat

**Option B: Chrome Gemini Nano**
- Zero download cost
- Google controls the model capabilities
- Chrome-only (kills Firefox/Edge)
- Limited API surface (may not support custom classification)
- No competitive moat — anyone can use it

**Option C: Hybrid**
- Use Gemini Nano where available for general "sensitivity scoring"
- Ship own ModernBERT for specific enterprise categories
- Best of both worlds but highest complexity

**Recommendation:** Start with Option A (own model). It's harder but it's the moat. Gemini Nano is a nice optimization for later but building on Google's API surface is fragile for a startup.

**Business value:** Very high (this is where enterprise sales start)
**Effort:** 8-12 weeks (ML pipeline + training data + fine-tuning + browser deployment)
**Detects:** +20-30% of enterprise-relevant data

Training data strategy (the Harmonic playbook):
1. Use Claude/GPT to generate synthetic examples of each sensitive category
2. Human review + curation of training set
3. Fine-tune ModernBERT binary classifiers (one per category)
4. Evaluate on held-out test set
5. Quantize to int8 and deploy via Transformers.js

### Phase 5: Enterprise Tier — Custom Classification (v0.6+)

**What:** Organization-specific detection, custom classifiers, compliance reporting
**Technology:** Cloud control plane + server-side fine-tuned models
**Architecture decision:** First server-side component. Major business decision:
- Build vs buy cloud infrastructure
- SOC 2 certification path
- Multi-tenant architecture
- Model training pipeline for per-org classifiers
- Privacy architecture: how to train on customer data without seeing it

**Business value:** Maximum (enterprise tier = $12-18/user/month)
**Effort:** 3-6 months (cloud infra + security certification + enterprise features)
**Detects:** +15-20% (organization-specific, the final frontier)

What this tier includes:
- Admin console for policy configuration
- Custom classifier training (admin uploads positive/negative examples)
- Department-level policies
- SIEM/SOAR integration
- Compliance reporting (GDPR, SOC 2, HIPAA, PCI DSS)
- SSO/SCIM for enterprise deployment
- Anonymized analytics dashboard

---

## The Complexity Landscape at a Glance

| Phase | Technology | New Data Categories | Download | Latency | Effort | Business Value |
|-------|-----------|-------------------|----------|---------|--------|---------------|
| 0 (v1) | Regex | PII, CC, API keys | 5KB | <1ms | Done | Low-Med |
| 1 (v0.2) | Configurable regex | User-defined patterns | +50KB | <1ms | 2-3w | Medium |
| 2 (v0.3) | Regex + context | Financial, legal, HR, code, security markers | +500KB | 1-5ms | 3-4w | Med-High |
| 3 (v0.4) | NER model | Names, orgs, locations, medical | +130MB | 50-300ms | 4-6w | High |
| 4 (v0.5) | Fine-tuned SLM | M&A, strategy, customer intel, trade secrets | +200MB | 200-500ms | 8-12w | Very High |
| 5 (v0.6+) | Cloud + custom models | Org-specific everything | Server | 200-500ms | 3-6mo | Maximum |

**Cumulative detection coverage estimate:**
- After Phase 0: ~10% of enterprise-sensitive data
- After Phase 1: ~15%
- After Phase 2: ~35%
- After Phase 3: ~50%
- After Phase 4: ~75%
- After Phase 5: ~90%+

---

## Key Architectural Decisions by Phase

### Phase 2 (v0.3) — No new paradigm needed
- Extend `engine.ts` with a `ContextScorer` module
- Each detector optionally returns keyword proximity signals
- Engine merges pattern match + context score -> adjusted confidence
- Same sync pipeline, same <50ms budget

### Phase 3 (v0.4) — First paradigm shift
- Introduce Web Worker for model inference
- Split classification into "fast path" (regex, sync) and "deep path" (NER, async)
- UI shows regex results immediately, NER results appear 100-300ms later
- Model caching in IndexedDB or Cache API
- Feature detection: WebGPU available? Use it. Fallback to WASM.

### Phase 4 (v0.5) — ML pipeline required
- Need training data generation pipeline
- Need model evaluation framework
- Need model versioning and update mechanism
- Binary classifier architecture: one model file, multiple classification heads
- Consider: can NER + SLM share a base model? (DistilBERT base with two heads)

### Phase 5 (v0.6+) — Server infrastructure
- First cloud component — fundamentally changes the product architecture
- SOC 2 Type II certification (6-12 months timeline)
- Privacy-preserving model training: federated learning or synthetic data only
- Tenant isolation, encryption at rest, audit logging

---

## What Competitors Do (Validation)

| Vendor | Approach | Categories | Latency | Architecture |
|--------|----------|-----------|---------|-------------|
| **Harmonic Security** | 21 fine-tuned ModernBERT classifiers | Code, legal, M&A, financial, insurance, HR, billing, engineering | Sub-500ms (server) | Browser extension -> server classification |
| **Nightfall AI** | 100+ ML detectors + LLM file classifiers | PII, API keys, PHI, source code, financials, HR, contracts, roadmaps | Real-time | Cloud API |
| **Cyberhaven** | Data lineage + classification | Source code (18.7%), R&D (17.1%), sales/marketing (10.7%) | Real-time | Endpoint agent |
| **Microsoft Purview** | Regex SITs + trainable classifiers | 300+ built-in SITs + custom | Real-time | Cloud service |
| **Sunbreak (today)** | Regex + checksums | PII basics, API keys | <1ms | Browser-only, all local |
| **Sunbreak (Phase 4)** | Regex + context + NER + SLM | All of above + semantic categories | <500ms | Browser-only, all local |

**Sunbreak's differentiator at Phase 4:** Everything Harmonic does, but running entirely in the browser. No data ever leaves the device. This is the strongest possible privacy guarantee — and it's architecturally unique in the market.

---

## Real-World Incident Validation

These incidents confirm the roadmap prioritization:

| Incident | Data Category | Would Sunbreak Detect It? |
|----------|--------------|--------------------------|
| Samsung engineers paste chip source code into ChatGPT (3x in one month) | Source code | Phase 2 (code structure) / Phase 4 (proprietary classification) |
| Investment bank penalized — LLM summaries exposed financial details | Financial MNPI | Phase 2 (financial markers) / Phase 4 (materiality assessment) |
| 12,000 API keys found in AI training data (Common Crawl) | Credentials | Phase 0 (already detected) |
| xAI developer leaks API key giving access to private SpaceX/Tesla LLMs | Credentials | Phase 0 (already detected) |
| 77% of employees paste company data into AI tools (LayerX 2025) | Mixed PII | Phase 0-1 (partial) / Phase 3+ (comprehensive) |
| Pharmaceutical company IP breach via public GenAI | Trade secrets | Phase 4 (semantic classification) |
| Maersk NotPetya — $300M from infrastructure compromise | OT/Infra data | Phase 2 (security infra patterns) |

---

## Open Questions

1. **Phase 3 model delivery:** Bundle with extension (~130MB install) or lazy-load after first use? Chrome Web Store allows up to ~500MB but large extensions get scrutiny.

2. **Phase 4 training data:** Generate synthetically (Harmonic's approach) or partner with enterprises for real-world labeled data? Synthetic is faster but may miss domain nuances.

3. **Gemini Nano dependency:** Track Chrome 140's Gemini Nano CPU support closely. If the Prompt API supports custom classification tasks, it could leapfrog our own SLM work. But building on Google's API is a platform risk.

4. **Multi-model download UX:** By Phase 4, users may need 130MB (NER) + 200MB (SLM) = 330MB of models. How do we make this feel lightweight? Progressive enhancement? Streaming inference during download?

5. **Enterprise tier timing:** When do we introduce the cloud control plane? Too early = distraction from the browser product. Too late = competitors lock in enterprise accounts. Current thinking: start Phase 5 work in parallel with Phase 4.

6. **Privacy guarantee evolution:** "All local" is our strongest differentiator. Phase 5 introduces server-side components. How do we maintain the privacy narrative? Answer: classification always stays local. Server only handles policy management and anonymized analytics. Prompt content never touches our servers.

---

## Next Steps

1. **Validate with target buyers** — show this roadmap to 3-5 CISOs and ask: "Which phase would make you a paying customer?"
2. **Phase 2 planning** — this is the highest-ROI next step; proceed to `/ce:plan`
3. **Track Gemini Nano** — Chrome 140 timeline, Prompt API capabilities
4. **Evaluate Transformers.js v4** — build a proof-of-concept with DistilBERT-NER in a Chrome extension
