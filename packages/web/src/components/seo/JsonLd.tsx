/**
 * Renders a JSON-LD structured-data script tag.
 * Works in both server and client components (plain <script> output).
 *
 * `<` is escaped to its < form so any string in `data` that contains
 * `</script>` cannot break out of the script tag (XSS defense-in-depth).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
