import { describe, expect, it, vi } from 'vitest';
import { reportError } from './reportError.ts';

describe('reportError', () => {
  const stubGlobals = () => {
    vi.stubGlobal('window', { location: { href: 'https://x.test/posts/a' } });
    vi.stubGlobal('navigator', { userAgent: 'test-agent' });
  };

  it('sends nothing above the sample rate', () => {
    stubGlobals();
    const send = vi.fn();
    reportError({ message: 'boom' }, { random: () => 0.99, send });
    expect(send).not.toHaveBeenCalled();
  });

  it('sends a bounded, validated payload when sampled in', () => {
    stubGlobals();
    const send = vi.fn();
    reportError(
      { message: 'boom', stack: 'at x', kind: 'unhandledrejection' },
      { random: () => 0, send },
    );
    expect(send).toHaveBeenCalledOnce();
    const [url, body] = send.mock.calls[0] as [string, string];
    expect(url).toBe('/api/log');
    expect(JSON.parse(body)).toEqual({
      message: 'boom',
      stack: 'at x',
      url: 'https://x.test/posts/a',
      userAgent: 'test-agent',
      kind: 'unhandledrejection',
    });
  });

  it('truncates an oversized message and stack', () => {
    stubGlobals();
    const send = vi.fn();
    reportError({ message: 'm'.repeat(900), stack: 's'.repeat(4000) }, { random: () => 0, send });
    const parsed = JSON.parse((send.mock.calls[0] as [string, string])[1]) as {
      message: string;
      stack: string;
    };
    expect(parsed.message).toHaveLength(500);
    expect(parsed.stack).toHaveLength(2000);
  });
});
