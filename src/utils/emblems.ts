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

// FIFA 3-letter country codes — the same short codes Panini prints on its
// World Cup sticker albums. Used in compact match headers where the full team
// name would be too long.
const TEAM_CODES: Record<string, string> = {
  Brazil: 'BRA',
  Argentina: 'ARG',
  France: 'FRA',
  Germany: 'GER',
  Spain: 'ESP',
  Portugal: 'POR',
  England: 'ENG',
  Netherlands: 'NED',
  Italy: 'ITA',
  Belgium: 'BEL',
  Croatia: 'CRO',
  Switzerland: 'SUI',
  Denmark: 'DEN',
  Poland: 'POL',
  Serbia: 'SRB',
  Austria: 'AUT',
  Ukraine: 'UKR',
  Turkey: 'TUR',
  Sweden: 'SWE',
  Norway: 'NOR',
  Scotland: 'SCO',
  Wales: 'WAL',
  'Czech Republic': 'CZE',
  'Republic of Ireland': 'IRL',
  'Northern Ireland': 'NIR',
  Hungary: 'HUN',
  Greece: 'GRE',
  Romania: 'ROU',
  Slovakia: 'SVK',
  Slovenia: 'SVN',
  Albania: 'ALB',
  'North Macedonia': 'MKD',
  'Bosnia & Herzegovina': 'BIH',
  Russia: 'RUS',
  Iceland: 'ISL',
  Finland: 'FIN',
  USA: 'USA',
  Canada: 'CAN',
  Mexico: 'MEX',
  'Costa Rica': 'CRC',
  Panama: 'PAN',
  Honduras: 'HON',
  Jamaica: 'JAM',
  'El Salvador': 'SLV',
  Guatemala: 'GUA',
  Cuba: 'CUB',
  Haiti: 'HAI',
  'Trinidad and Tobago': 'TRI',
  Curaçao: 'CUW',
  Ecuador: 'ECU',
  Colombia: 'COL',
  Peru: 'PER',
  Uruguay: 'URU',
  Chile: 'CHI',
  Paraguay: 'PAR',
  Venezuela: 'VEN',
  Bolivia: 'BOL',
  Japan: 'JPN',
  'South Korea': 'KOR',
  Iran: 'IRN',
  'Saudi Arabia': 'KSA',
  Australia: 'AUS',
  Qatar: 'QAT',
  Iraq: 'IRQ',
  'United Arab Emirates': 'UAE',
  Uzbekistan: 'UZB',
  Jordan: 'JOR',
  Lebanon: 'LBN',
  Syria: 'SYR',
  Oman: 'OMA',
  Bahrain: 'BHR',
  Kuwait: 'KUW',
  'New Zealand': 'NZL',
  Morocco: 'MAR',
  Senegal: 'SEN',
  Tunisia: 'TUN',
  Algeria: 'ALG',
  Egypt: 'EGY',
  Cameroon: 'CMR',
  Ghana: 'GHA',
  Nigeria: 'NGA',
  'Ivory Coast': 'CIV',
  'South Africa': 'RSA',
  'DR Congo': 'COD',
  Mali: 'MLI',
  'Burkina Faso': 'BFA',
  'Cape Verde': 'CPV',
  Gabon: 'GAB',
  Angola: 'ANG',
  Mozambique: 'MOZ',
  Zambia: 'ZAM',
  Tanzania: 'TAN',
  Kenya: 'KEN',
  Uganda: 'UGA',
  Madagascar: 'MAD',
  Mauritania: 'MTN',
  Libya: 'LBY',
  Sudan: 'SUD',
}

/**
 * 3-letter code for a team (FIFA / Panini style). Falls back to the first three
 * letters of the name, upper-cased, for placeholder slots like "Winner Group A".
 */
export function getTeamCode(teamName: string): string {
  if (!teamName) return '—'
  return TEAM_CODES[teamName] ?? teamName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
}

const FALLBACK_EMBLEM = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Football_in_sun.svg/200px-Football_in_sun.svg.png';

export function getTeamEmblemUrl(teamName: string): string {
  if (!teamName || teamName === 'fallback') return FALLBACK_EMBLEM;

  // Check if we have an exact override for the team name
  const mappedName = NAME_OVERRIDES[teamName] || teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  return `https://logodix.com/img/articles/world-cup-2026-qualified-team-logos/${mappedName}.png?v=15`;
}
