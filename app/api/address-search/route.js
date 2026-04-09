import { NextResponse } from 'next/server';

const SWISSTOPO_URL = 'https://api3.geo.admin.ch/rest/services/api/SearchServer';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? '';

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const res = await fetch(
      `${SWISSTOPO_URL}?searchText=${encodeURIComponent(query)}&type=locations&limit=6`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();

    const suggestions = (data.results ?? []).map(item => {
      const rawLabel = item.attrs.label;

      // Le vrai format de l'API : "Rue de la Paix 10 <b>1020 Renens VD</b>"
      // Le NPA et la ville sont toujours dans la balise <b>
      const boldMatch = rawLabel.match(/<b>(\d{4})\s+([^<]+)<\/b>/);

      const label = rawLabel.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      if (boldMatch) {
        const postalCode = boldMatch[1];
        const city = boldMatch[2].trim();
        // La rue = tout ce qui précède la balise <b>
        const street = rawLabel
          .slice(0, rawLabel.indexOf('<b>'))
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return { label, street, postalCode, city };
      }

      // Fallback pour les résultats sans NPA (localités, communes…)
      return { label, street: label, postalCode: '', city: '' };
    });

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
