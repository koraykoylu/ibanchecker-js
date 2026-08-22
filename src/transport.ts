/** Minimal HTTP seam. Anything that speaks this interface can be injected instead of
 * the default {@link FetchTransport}, which is how the tests run without a network and
 * how a host application can route calls through its own HTTP stack. */
export interface Transport {
  send(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | null,
  ): Promise<{ status: number; body: string }>;
}

/** Default transport, built on the global `fetch` available in Node 18+ and every
 * modern browser. Needs nothing installed. */
export class FetchTransport implements Transport {
  constructor(private readonly timeoutMs: number = 10_000) {}

  async send(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | null,
  ): Promise<{ status: number; body: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ?? undefined,
        signal: controller.signal,
      });
      return { status: res.status, body: await res.text() };
    } finally {
      clearTimeout(timer);
    }
  }
}
