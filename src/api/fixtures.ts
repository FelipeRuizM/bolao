import { ref, set } from 'firebase/database'
import { db } from '@/firebase'
import type { Match, Stage } from '@/types'

const RAW_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

interface OpenFootballMatch {
  round: string
  date: string
  time: string
  team1: string
  team2: string
  group?: string
  ground?: string
  score?: { ft?: [number, number] }
}

interface OpenFootballFile {
  name: string
  matches: OpenFootballMatch[]
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseKickoff(date: string, time: string): number {
  // Examples of `time`: "13:00 UTC-6", "20:00 UTC+2"
  const m = /^(\d{1,2}):(\d{2})\s+UTC([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(time.trim())
  if (!m) throw new Error(`Bad time format: "${time}"`)
  const [, hh, mm, sign, offH, offM = '00'] = m
  const iso = `${date}T${hh.padStart(2, '0')}:${mm}:00${sign}${offH.padStart(2, '0')}:${offM}`
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) throw new Error(`Could not parse: ${iso}`)
  return ms
}

export function roundToStage(round: string): Stage {
  const r = round.toLowerCase().trim()
  if (/^matchday\b/.test(r) || r.startsWith('group')) return 'group'
  if (r.includes('round of 32')) return 'r32'
  if (r.includes('round of 16')) return 'r16'
  if (r.startsWith('quarter')) return 'qf'
  if (r.startsWith('semi')) return 'sf'
  if (r.includes('third') || r.includes('3rd')) return '3rd'
  if (r === 'final' || r.startsWith('final')) return 'final'
  // Fallback: treat anything unknown as group so an import doesn't fail loudly
  console.warn(`Unknown round name "${round}", defaulting to "group"`)
  return 'group'
}

export function matchId(date: string, team1: string, team2: string): string {
  return `${date}_${slugify(team1)}_${slugify(team2)}`
}

export function normalizeMatch(raw: OpenFootballMatch): Match {
  const out: Match = {
    id: matchId(raw.date, raw.team1, raw.team2),
    homeTeam: raw.team1,
    awayTeam: raw.team2,
    kickoffAt: parseKickoff(raw.date, raw.time),
    stage: roundToStage(raw.round),
    status: 'SCHEDULED',
  }
  if (raw.group) out.group = raw.group
  return out
}

export async function fetchFixtures(): Promise<Match[]> {
  const res = await fetch(RAW_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`openfootball fetch failed: ${res.status}`)
  const data = (await res.json()) as OpenFootballFile
  return data.matches.map(normalizeMatch)
}

export async function importFixturesToFirebase(): Promise<{ count: number }> {
  const matches = await fetchFixtures()
  const indexed: Record<string, Match> = {}
  for (const m of matches) indexed[m.id] = m
  await set(ref(db, 'matches'), indexed)
  return { count: matches.length }
}
