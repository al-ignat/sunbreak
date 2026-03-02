/**
 * Shared test fixtures: realistic prompt samples for classification testing.
 * Used by engine tests and for measuring false positive rate.
 */

/** Prompts that should produce zero findings (clean developer prompts) */
export const CLEAN_PROMPTS = [
  'How do I implement a binary search tree in TypeScript?',
  'Explain the difference between TCP and UDP protocols.',
  'Write a function that reverses a linked list in place.',
  'What are the best practices for React component testing?',
  'Help me understand the observer pattern in JavaScript.',
  'How do I set up a CI/CD pipeline with GitHub Actions?',
  'Explain the CAP theorem and its implications for distributed systems.',
  'Write a Dockerfile for a Node.js application with multi-stage builds.',
  'What is the time complexity of quicksort in the average case?',
  'Help me refactor this class to use composition over inheritance.',
] as const;

/** Prompts containing a single type of PII */
export const SINGLE_PII_PROMPTS = [
  {
    text: 'Please check why john.doe@company.com is not receiving notifications.',
    expectedTypes: ['email'],
    expectedCount: 1,
  },
  {
    text: 'The customer called from +1-555-867-5309 about their order.',
    expectedTypes: ['phone'],
    expectedCount: 1,
  },
  {
    text: 'Process payment for card 4111111111111111.',
    expectedTypes: ['credit-card'],
    expectedCount: 1,
  },
  {
    text: 'Employee SSN: 123-45-6789 needs to be updated in the system.',
    expectedTypes: ['ssn'],
    expectedCount: 1,
  },
  {
    text: 'Danish citizen CPR: 010190-1234 for the insurance form.',
    expectedTypes: ['cpr'],
    expectedCount: 1,
  },
  {
    text: 'The server at 10.0.1.55 is running out of memory.',
    expectedTypes: ['ip-address'],
    expectedCount: 1,
  },
  {
    text: 'Found this key in the codebase: AKIAIOSFODNN7EXAMPLE',
    expectedTypes: ['api-key'],
    expectedCount: 1,
  },
] as const;

/** Prompts with multiple types of PII mixed together */
export const MIXED_PII_PROMPTS = [
  {
    text: 'Send the invoice to alice@corp.com. Card on file: 4111 1111 1111 1111. Call 555-123-4567 if questions.',
    expectedMinFindings: 3,
  },
  {
    text: 'Deploy to 192.168.1.50 using token sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh for auth.',
    expectedMinFindings: 2,
  },
] as const;

/** Code-heavy prompts that commonly produce false positives */
export const CODE_PROMPTS = [
  {
    text: 'Use @Component decorator and @Injectable() for the service class.',
    description: 'TypeScript decorators should not match as emails',
    expectedFindings: 0,
  },
  {
    text: 'Clone the repo: git clone git@github.com:org/project.git',
    description: 'Git SSH URLs should not match as emails',
    expectedFindings: 0,
  },
  {
    text: 'Set version to v2.0.0.1 in the config file.',
    description: 'Version numbers should not match as IP addresses',
    expectedFindings: 0,
  },
  {
    text: 'The API returns status code 404 for missing resources.',
    description: 'HTTP status codes should not match as phone numbers',
    expectedFindings: 0,
  },
] as const;
