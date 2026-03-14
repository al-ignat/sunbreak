import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { ReportCards } from '../../../../src/ui/dashboard/ReportCards';

describe('ReportCards', () => {
  it('renders all supported provider cards from the guidance model', () => {
    render(<ReportCards />);

    expect(screen.getByText('ChatGPT')).toBeTruthy();
    expect(screen.getByText('Claude')).toBeTruthy();
    expect(screen.getByText('Gemini')).toBeTruthy();
  });

  it('shows verification date and official source links', () => {
    render(<ReportCards />);

    expect(screen.getAllByText(/Verified against official sources on 2026-03-14/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('How to Delete and Archive Chats in ChatGPT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('How can I delete or rename a conversation?').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gemini Apps Privacy Hub').length).toBeGreaterThan(0);
  });
});
