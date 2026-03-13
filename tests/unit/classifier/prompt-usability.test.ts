/**
 * Epic 3 prompt-usability evaluation.
 *
 * Validates that masking preserves AI usefulness across the required prompt
 * categories: multi-person coordination, code/configuration with secrets,
 * finance, and HR prompts.
 *
 * For each prompt we verify:
 * - tokens are descriptive (not opaque like [EMAIL_1])
 * - different people/values are distinguishable
 * - masked prompt retains enough structure for AI to understand the task
 * - tokens don't overdisclose (no full names, no raw secrets)
 */
import { describe, it, expect } from 'vitest';
import { classify } from '../../../src/classifier/engine';
import type { ClassifyOptions, Finding } from '../../../src/classifier/types';

const DEFAULT_OPTIONS: ClassifyOptions = { keywords: [] };

/** Apply masking: replace each finding in the text with its placeholder */
function applyMasking(text: string, findings: ReadonlyArray<Finding>): string {
  // Process findings from end to start to preserve indices
  const sorted = [...findings].sort((a, b) => b.startIndex - a.startIndex);
  let masked = text;
  for (const f of sorted) {
    masked = masked.slice(0, f.startIndex) + f.placeholder + masked.slice(f.endIndex);
  }
  return masked;
}

describe('Prompt-usability evaluation — Epic 3', () => {
  describe('Multi-person coordination prompts', () => {
    it('distinguishes multiple people in a team coordination prompt', () => {
      const prompt =
        'Schedule a meeting with john.smith@acme.com, jane.doe@acme.com, and bob.wilson@partner.org to discuss the Q3 roadmap. ' +
        'John leads engineering, Jane handles product, and Bob is the external advisor.';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      // Each person should get a distinguishable token
      expect(result.findings).toHaveLength(3);
      const placeholders = result.findings.map((f) => f.placeholder);

      // All three placeholders should be different
      const unique = new Set(placeholders);
      expect(unique.size).toBe(3);

      // Tokens should reference names, not be generic [email] / [email 2] / [email 3]
      expect(placeholders).toContainEqual(expect.stringContaining('John'));
      expect(placeholders).toContainEqual(expect.stringContaining('Jane'));
      expect(placeholders).toContainEqual(expect.stringContaining('Bob'));

      // Masked prompt should still convey the task
      expect(masked).toContain('Schedule a meeting with');
      expect(masked).toContain('Q3 roadmap');
      expect(masked).not.toContain('john.smith@acme.com');
      expect(masked).not.toContain('jane.doe@acme.com');
      expect(masked).not.toContain('bob.wilson@partner.org');

      // Tokens should NOT contain full last names
      for (const ph of placeholders) {
        expect(ph).not.toContain('smith');
        expect(ph).not.toContain('doe');
        expect(ph).not.toContain('wilson');
      }
    });

    it('handles repeated references to the same person', () => {
      const prompt =
        'Forward the invoice to alice.chen@finance.com and CC alice.chen@finance.com on the follow-up.';

      const result = classify(prompt, DEFAULT_OPTIONS);

      // Same email should produce same token
      const aliceFindings = result.findings.filter((f) => f.value === 'alice.chen@finance.com');
      expect(aliceFindings.length).toBe(2);
      expect(aliceFindings[0]?.placeholder).toBe(aliceFindings[1]?.placeholder);
    });

    it('handles role vs personal emails in the same prompt', () => {
      const prompt =
        'Send the report to maria.garcia@company.com and CC support@company.com for tracking.';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      // Maria should get a name-based token, support should be generic
      const mariaToken = result.findings.find((f) => f.value === 'maria.garcia@company.com')?.placeholder;
      const supportToken = result.findings.find((f) => f.value === 'support@company.com')?.placeholder;

      expect(mariaToken).toContain('Maria');
      expect(supportToken).toBe('[email]');
      expect(supportToken).not.toContain('support'); // doesn't leak role name

      // Masked prompt still readable
      expect(masked).toContain('Send the report to');
      expect(masked).toContain('for tracking');
    });
  });

  describe('Code/configuration prompts with secrets', () => {
    it('masks API keys with provider labels while preserving code context', () => {
      const prompt =
        'My deployment script uses OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz ' +
        'and connects to the database at 10.0.1.55. Can you help me refactor the retry logic?';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      // Should detect API key and IP
      const apiKeyFinding = result.findings.find((f) => f.type === 'api-key');
      const ipFinding = result.findings.find((f) => f.type === 'ip-address');

      expect(apiKeyFinding).toBeDefined();
      expect(ipFinding).toBeDefined();

      // API key token should identify the provider
      expect(apiKeyFinding?.placeholder).toContain('OpenAI');

      // Internal IP should be marked as such
      expect(ipFinding?.placeholder).toBe('[internal IP]');

      // Masked prompt still conveys the coding question
      expect(masked).toContain('deployment script');
      expect(masked).toContain('refactor the retry logic');
      expect(masked).not.toContain('sk-proj-');
    });

    it('masks AWS credentials in config snippets', () => {
      const prompt =
        'Here is my AWS config:\n' +
        'aws_access_key_id = AKIAIOSFODNN7EXAMPLE\n' +
        'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n' +
        'How do I rotate these credentials?';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      // Should detect at least the access key
      const awsFindings = result.findings.filter((f) => f.type === 'api-key');
      expect(awsFindings.length).toBeGreaterThanOrEqual(1);

      // Token should mention AWS
      const hasAwsToken = awsFindings.some((f) => f.placeholder.toLowerCase().includes('aws'));
      expect(hasAwsToken).toBe(true);

      // Question context preserved
      expect(masked).toContain('rotate these credentials');
    });

    it('masks GitHub tokens in CI config', () => {
      const prompt =
        'My GitHub Actions workflow uses this token: ghp_ABCDefGHIjklMNOpqrSTUvwxYZ1234567890. ' +
        'The workflow deploys to server 192.168.1.100. Can you add a caching step?';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      const ghToken = result.findings.find((f) => f.type === 'api-key');
      expect(ghToken?.placeholder).toContain('GitHub');

      expect(masked).toContain('GitHub Actions workflow');
      expect(masked).toContain('caching step');
      expect(masked).not.toContain('ghp_');
    });
  });

  describe('Finance prompts', () => {
    it('masks credit card with trailing digits for reference', () => {
      const prompt =
        'The client paid with card 4111 1111 1111 1111 but the charge of $5,200 was declined. ' +
        'Their backup card is 5500 0000 0000 0004. Can you check the payment gateway logs?';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      const cardFindings = result.findings.filter((f) => f.type === 'credit-card');
      expect(cardFindings).toHaveLength(2);

      // Cards should show last 4 digits for disambiguation
      expect(cardFindings[0]?.placeholder).toContain('ending');
      expect(cardFindings[1]?.placeholder).toContain('ending');

      // Different cards get different tokens
      expect(cardFindings[0]?.placeholder).not.toBe(cardFindings[1]?.placeholder);

      // Financial context preserved
      expect(masked).toContain('$5,200');
      expect(masked).toContain('payment gateway logs');
      expect(masked).not.toContain('4111 1111 1111 1111');
    });

    it('masks phone in billing context', () => {
      const prompt =
        'The customer at +1-555-867-5309 disputed the transaction. ' +
        'Their account email is billing@clientcorp.com. Please investigate.';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      const phoneFinding = result.findings.find((f) => f.type === 'phone');
      expect(phoneFinding?.placeholder).toContain('phone ending');

      expect(masked).toContain('disputed the transaction');
      expect(masked).toContain('Please investigate');
    });
  });

  describe('HR prompts', () => {
    it('masks SSN with no leakage in payroll context', () => {
      const prompt =
        'Process payroll for employee John Martinez (SSN: 123-45-6789). ' +
        'His direct deposit goes to the account ending 4521. Contact him at john.martinez@company.com.';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      // SSN should be fully generic — no digits leaked
      const ssnFinding = result.findings.find((f) => f.type === 'ssn');
      expect(ssnFinding?.placeholder).toBe('[SSN redacted]');
      expect(ssnFinding?.placeholder).not.toMatch(/\d/);

      // Email should be name-based
      const emailFinding = result.findings.find((f) => f.type === 'email');
      expect(emailFinding?.placeholder).toContain('John');

      // HR context preserved
      expect(masked).toContain('Process payroll');
      expect(masked).toContain('direct deposit');
      expect(masked).not.toContain('123-45-6789');
    });

    it('masks multiple SSNs with disambiguation', () => {
      const prompt =
        'Update W-2 forms for:\n' +
        '- Employee A: SSN 111-22-3333\n' +
        '- Employee B: SSN 444-55-6666\n' +
        'Both need correction for tax year 2025.';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      const ssnFindings = result.findings.filter((f) => f.type === 'ssn');
      expect(ssnFindings).toHaveLength(2);

      // Different SSNs get disambiguated tokens
      expect(ssnFindings[0]?.placeholder).toBe('[SSN redacted]');
      expect(ssnFindings[1]?.placeholder).toBe('[SSN redacted 2]');

      // Task context preserved
      expect(masked).toContain('Update W-2 forms');
      expect(masked).toContain('tax year 2025');
    });

    it('handles Danish CPR in HR context', () => {
      const prompt =
        'Register new employee with CPR 010190-1234 in the Danish payroll system. ' +
        'Start date is March 15, 2026.';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      const cprFinding = result.findings.find((f) => f.type === 'cpr');
      expect(cprFinding?.placeholder).toBe('[CPR redacted]');
      expect(masked).toContain('Register new employee');
      expect(masked).toContain('Danish payroll system');
      expect(masked).not.toContain('010190');
    });
  });

  describe('Token overdisclosure checks', () => {
    it('email tokens never contain full last names', () => {
      const emails = [
        'alexandra.konstantinidis@example.com',
        'b.o.johnson@example.com',
        'firstname.mcdonaldson@example.com',
      ];

      for (const email of emails) {
        const result = classify(`Contact ${email} please`, DEFAULT_OPTIONS);
        const finding = result.findings.find((f) => f.type === 'email');
        expect(finding).toBeDefined();

        // Token should use initial for last name, never full last name
        const placeholder = finding?.placeholder ?? '';
        expect(placeholder).not.toContain('konstantinidis');
        expect(placeholder).not.toContain('johnson');
        expect(placeholder).not.toContain('mcdonaldson');
      }
    });

    it('phone tokens only show last 2 digits', () => {
      const result = classify('Call +1-555-987-6543 for support', DEFAULT_OPTIONS);
      const finding = result.findings.find((f) => f.type === 'phone');

      expect(finding?.placeholder).toBe('[phone ending 43]');
      // Should NOT contain area code or middle digits
      expect(finding?.placeholder).not.toContain('555');
      expect(finding?.placeholder).not.toContain('987');
    });

    it('credit card tokens only show last 4 digits', () => {
      const result = classify('Charge card 4242 4242 4242 4242', DEFAULT_OPTIONS);
      const finding = result.findings.find((f) => f.type === 'credit-card');

      expect(finding?.placeholder).toBe('[card ending 4242]');
      expect(finding?.placeholder).not.toContain('4242 4242');
    });

    it('national IDs are fully opaque', () => {
      const prompt = 'SSN: 123-45-6789, CPR: 010190-1234';
      const result = classify(prompt, DEFAULT_OPTIONS);

      for (const f of result.findings) {
        if (['ssn', 'cpr', 'ni-number'].includes(f.type)) {
          // No digits in placeholder
          expect(f.placeholder).not.toMatch(/\d/);
        }
      }
    });
  });

  describe('Masked prompt AI usefulness', () => {
    it('preserves prompt structure and question clarity after masking', () => {
      const prompt =
        'Hi team, I need to onboard a new contractor. Their details:\n' +
        '- Name: Sarah Connor\n' +
        '- Email: sarah.connor@skynet.com\n' +
        '- Phone: +1-213-555-0147\n' +
        '- SSN: 234-56-7890\n\n' +
        'Please set up their accounts in Jira, Slack, and GitHub. ' +
        'Grant them read access to the api-gateway repo.';

      const result = classify(prompt, DEFAULT_OPTIONS);
      const masked = applyMasking(prompt, result.findings);

      // The task instruction should survive masking completely
      expect(masked).toContain('onboard a new contractor');
      expect(masked).toContain('set up their accounts in Jira, Slack, and GitHub');
      expect(masked).toContain('read access to the api-gateway repo');

      // Structure markers preserved
      expect(masked).toContain('- Name:');
      expect(masked).toContain('- Email:');
      expect(masked).toContain('- Phone:');

      // PII replaced
      expect(masked).not.toContain('sarah.connor@skynet.com');
      expect(masked).not.toContain('213-555-0147');
      expect(masked).not.toContain('234-56-7890');

      // Tokens are descriptive enough for AI context
      expect(masked).toContain('[Sarah');  // name-based email token
      expect(masked).toContain('phone ending');
      expect(masked).toContain('SSN redacted');
    });

    it('classification stays under 50ms performance budget', () => {
      const longPrompt =
        'Please review the following employee records and check for discrepancies:\n' +
        Array.from({ length: 20 }, (_, i) =>
          `- Employee ${i + 1}: user${i}@company.com, SSN: ${100 + i}-${45 + i}-${6789 + i}`
        ).join('\n');

      const result = classify(longPrompt, DEFAULT_OPTIONS);

      expect(result.durationMs).toBeLessThan(50);
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });
});
