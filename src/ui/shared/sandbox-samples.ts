export interface SandboxSample {
  readonly label: string;
  readonly text: string;
}

export const SANDBOX_SAMPLES: ReadonlyArray<SandboxSample> = [
  {
    label: 'Email & phone',
    text: 'Please review this for John Smith (john.smith@acme.com, 555-867-5309) and summarize the key points.',
  },
  {
    label: 'API key',
    text: "I'm getting an error with my API setup. Here's my config: AKIA3EXAMPLE7KEY8TEST and the endpoint is api.example.com.",
  },
  {
    label: 'Credit card',
    text: 'The customer paid with card number 4111-1111-1111-1111, expiring 12/27. Can you draft a receipt?',
  },
  {
    label: 'SSN',
    text: 'Employee record: Jane Doe, SSN 123-45-6789, started on March 1st. Please generate an onboarding summary.',
  },
];
