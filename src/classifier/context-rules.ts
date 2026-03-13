import type {
  ContextCategory,
  ContextScoreResult,
  ContextScorer,
  ContextSignal,
  FindingType,
} from './types';

interface RuleDefinition {
  readonly category: ContextCategory;
  readonly findingTypes: ReadonlyArray<FindingType>;
  readonly patterns: ReadonlyArray<RegExp>;
  readonly direction: 'boost' | 'suppress';
  readonly weight: number;
  readonly label: string;
  readonly matchSource?: 'nearby' | 'surrounding';
}

const RULES: ReadonlyArray<RuleDefinition> = [
  {
    category: 'confidentiality',
    findingTypes: ['keyword', 'email', 'phone', 'credit-card'],
    patterns: [
      /\bconfidential\b/i,
      /\binternal use only\b/i,
      /\bdo not share\b/i,
      /\bproprietary\b/i,
      /\brestricted\b/i,
      /\bsensitive\b/i,
      /\bnda\b/i,
    ],
    direction: 'boost',
    weight: 1,
    label: 'confidential wording',
  },
  {
    category: 'legal-privilege',
    findingTypes: ['keyword', 'email', 'phone'],
    patterns: [
      /\battorney-client\b/i,
      /\bprivileged\b/i,
      /\blegal hold\b/i,
      /\blitigation\b/i,
      /\boutside counsel\b/i,
      /\bcounsel\b/i,
    ],
    direction: 'boost',
    weight: 1,
    label: 'legal privilege wording',
  },
  {
    category: 'hr-compensation',
    findingTypes: ['keyword', 'email', 'phone', 'ssn', 'cpr', 'ni-number'],
    patterns: [
      /\bsalary\b/i,
      /\bcompensation\b/i,
      /\bpayroll\b/i,
      /\bbonus\b/i,
      /\bequity\b/i,
      /\bcandidate\b/i,
      /\boffer letter\b/i,
      /\bemployee\b/i,
      /\bperformance review\b/i,
    ],
    direction: 'boost',
    weight: 1,
    label: 'hr or compensation wording',
  },
  {
    category: 'financial',
    findingTypes: ['keyword', 'email', 'credit-card', 'phone'],
    patterns: [
      /\binvoice\b/i,
      /\bbudget\b/i,
      /\bforecast\b/i,
      /\brevenue\b/i,
      /\bpayment\b/i,
      /\bexpense\b/i,
      /\bbank\b/i,
      /\brouting\b/i,
      /\bwire transfer\b/i,
      /\bfiscal\b/i,
      /\bearnings\b/i,
    ],
    direction: 'boost',
    weight: 1,
    label: 'financial wording',
  },
  {
    category: 'code-structure',
    findingTypes: ['keyword', 'api-key'],
    patterns: [
      /\bconnection string\b/i,
      /\bdatabase_url\b/i,
      /\bpassword\s*=/i,
      /\bpwd\s*=/i,
      /\btoken\s*=/i,
      /\bbearer\s+[a-z0-9._-]+/i,
      /\bapi[_-]?key\b/i,
      /\bsecret[_-]?key\b/i,
      /\.env\b/i,
      /\bpostgres(?:ql)?:\/\//i,
      /\bmongodb(?:\+srv)?:\/\//i,
      /\bjdbc:/i,
    ],
    direction: 'boost',
    weight: 1,
    label: 'code or connection-string context',
  },
  {
    category: 'security-infrastructure',
    findingTypes: ['keyword', 'ip-address', 'api-key'],
    patterns: [
      /\bbastion\b/i,
      /\bsubnet\b/i,
      /\bsecurity group\b/i,
      /\bfirewall\b/i,
      /\bvpn\b/i,
      /\bssh\b/i,
      /\bingress\b/i,
      /\bkubernetes\b/i,
      /\bproduction cluster\b/i,
      /\binternal host\b/i,
      /\bdns\b/i,
      /\bprivate network\b/i,
    ],
    direction: 'boost',
    weight: 1,
    label: 'security infrastructure context',
  },
  {
    category: 'example-data',
    findingTypes: ['keyword', 'email', 'phone', 'ip-address', 'api-key'],
    patterns: [
      /\bexample\b/i,
      /\bsample\b/i,
      /\bplaceholder\b/i,
      /\bdummy\b/i,
      /\bfake\b/i,
      /\bdemo\b/i,
      /\btutorial\b/i,
    ],
    direction: 'suppress',
    weight: -1,
    label: 'example-style content',
    matchSource: 'surrounding',
  },
];

function buildSignal(rule: RuleDefinition): ContextSignal {
  return {
    category: rule.category,
    label: rule.label,
    direction: rule.direction,
    weight: rule.weight,
  };
}

function scoreRule(rule: RuleDefinition, text: string): ContextScoreResult | null {
  if (!rule.patterns.some((pattern) => pattern.test(text))) {
    return null;
  }

  return {
    scoreDelta: rule.weight,
    categories: [rule.category],
    signals: [buildSignal(rule)],
  };
}

export const CONTEXT_SCORERS: ReadonlyArray<ContextScorer> = RULES.map((rule) => {
  return ({ finding, window }) => {
    if (!rule.findingTypes.includes(finding.type)) {
      return null;
    }

    const candidateText =
      rule.matchSource === 'surrounding'
        ? `${window.before} ${window.after}`
        : window.nearby;

    return scoreRule(rule, candidateText);
  };
});
