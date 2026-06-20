/**
 * Renders a JSON-LD structured-data script tag.
 * Works in both server and client components (plain <script> output).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
