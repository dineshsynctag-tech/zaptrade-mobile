/**
 * RFC 4122 v4-shaped id for Idempotency-Key headers. Uniqueness, not
 * secrecy, is what matters here, so Math.random is sufficient.
 */
export function newIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
