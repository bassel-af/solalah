import { describe, test, expect } from 'vitest';
import { buildInviteEmail } from '@/lib/email/templates/invite';

const params = {
  workspaceName: 'آل سعيد',
  inviterName: 'باسل',
  inviteUrl: 'http://localhost:3000/invite/inv-uuid-123',
};

describe('buildInviteEmail', () => {
  test('subject contains the workspace name', () => {
    const { subject } = buildInviteEmail(params);
    expect(subject).toContain('آل سعيد');
  });

  test('subject contains the app name', () => {
    const { subject } = buildInviteEmail(params);
    expect(subject).toContain('سلالة');
  });

  test('html contains the invite URL', () => {
    const { html } = buildInviteEmail(params);
    expect(html).toContain(params.inviteUrl);
  });

  test('text contains the invite URL', () => {
    const { text } = buildInviteEmail(params);
    expect(text).toContain(params.inviteUrl);
  });

  test('html has RTL direction', () => {
    const { html } = buildInviteEmail(params);
    expect(html).toContain('dir="rtl"');
  });

  test('html contains the inviter name', () => {
    const { html } = buildInviteEmail(params);
    expect(html).toContain('باسل');
  });

  test('html contains the workspace name', () => {
    const { html } = buildInviteEmail(params);
    expect(html).toContain('آل سعيد');
  });

  test('text contains the inviter name', () => {
    const { text } = buildInviteEmail(params);
    expect(text).toContain('باسل');
  });

  test('html contains a CTA link element', () => {
    const { html } = buildInviteEmail(params);
    expect(html).toContain(`href="${params.inviteUrl}"`);
  });
});
