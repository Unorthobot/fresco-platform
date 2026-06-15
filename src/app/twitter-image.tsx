// X/Twitter uses the same 1200×630 card as Open Graph. Reuse the
// opengraph-image render; `runtime` must be a literal for Next to apply it.
export const runtime = 'edge';
export { alt, size, contentType, default } from './opengraph-image';
