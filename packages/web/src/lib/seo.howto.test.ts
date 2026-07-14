import { howToJsonLd } from './seo';

const STEPS = [
  { name: 'Log in', text: 'Open the panel and sign in.' },
  { name: 'Generate token', text: 'Click generate and copy the value.' },
];

describe('howToJsonLd', () => {
  it('builds a HowTo with sequential HowToStep items', () => {
    const jsonld = howToJsonLd({ name: 'Get KSeF tokens', steps: STEPS }) as {
      '@context': string;
      '@type': string;
      name: string;
      step: { '@type': string; position: number; name: string; text: string }[];
    };
    expect(jsonld['@context']).toBe('https://schema.org');
    expect(jsonld['@type']).toBe('HowTo');
    expect(jsonld.name).toBe('Get KSeF tokens');
    expect(jsonld.step).toHaveLength(2);
    expect(jsonld.step[0]).toEqual({
      '@type': 'HowToStep',
      position: 1,
      name: 'Log in',
      text: 'Open the panel and sign in.',
    });
    expect(jsonld.step[1].position).toBe(2);
  });

  it('includes a description when provided', () => {
    const jsonld = howToJsonLd({ name: 'X', description: 'How to do X.', steps: STEPS }) as Record<
      string,
      unknown
    >;
    expect(jsonld.description).toBe('How to do X.');
  });

  it('omits description when not provided', () => {
    const jsonld = howToJsonLd({ name: 'X', steps: STEPS }) as Record<string, unknown>;
    expect('description' in jsonld).toBe(false);
  });
});
