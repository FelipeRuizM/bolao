// A mapping to fix team names if the logo isn't found using the default slug.
// Format: 'Current Country Name': 'name-on-the-website'

export const NAME_OVERRIDES: Record<string, string> = {
  'USA': 'united-states',
  'South Korea': 'south-korea',
  'Saudi Arabia': 'saudi-arabia',
  'Costa Rica': 'costa-rica',
  'Ivory Coast': 'ivory-coast',
  'New Zealand': 'new-zealand',
  'Czech Republic': 'czechia',
  'Turkey': 'turkiye',
  'Curaçao': 'curacao',
  // Add more overrides here if some logos are failing to load
}

const FALLBACK_EMBLEM = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Football_in_sun.svg/200px-Football_in_sun.svg.png';

export function getTeamEmblemUrl(teamName: string): string {
  if (!teamName || teamName === 'fallback') return FALLBACK_EMBLEM;

  // Check if we have an exact override for the team name
  const mappedName = NAME_OVERRIDES[teamName] || teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  return `https://logodix.com/img/articles/world-cup-2026-qualified-team-logos/${mappedName}.png?v=15`;
}
