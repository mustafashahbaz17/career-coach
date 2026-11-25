// Lists, the form's shape, and the rules for the About-you form.
// Column names match `profiles` in supabase/01_supabase_onboarding.sql.

export const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Faisalabad', 'Multan', 'Hyderabad']

export const UNIVERSITIES = [
  'LUMS — Lahore University of Management Sciences', 'NUST — National University of Sciences and Technology',
  'FAST-NUCES', 'IBA Karachi — Institute of Business Administration', 'GIKI — Ghulam Ishaq Khan Institute',
  'UET Lahore', 'NED University of Engineering and Technology', 'University of the Punjab', 'Quaid-i-Azam University',
  'COMSATS University Islamabad', 'Habib University', 'Aga Khan University', 'University of Karachi',
  'Forman Christian College', 'Kinnaird College for Women', 'Lahore School of Economics', 'Government College University Lahore',
  'SZABIST', 'Bahria University', 'Air University', 'Institute of Space Technology', 'PIEAS',
  'Information Technology University (ITU)', 'University of Central Punjab', 'University of Management and Technology (UMT)',
  'Beaconhouse National University', 'Bahauddin Zakariya University', 'University of Peshawar', 'University of Engineering and Technology Peshawar',
]

export const DEGREES = ['BS', 'BSc', 'BBA', 'BA', 'BE', 'MBBS', 'LLB', 'MS/MPhil', 'MBA']

export const STUDY_YEARS: [string, string][] = [
  ['1st', '1st year'], ['2nd', '2nd year'], ['3rd', '3rd year'], ['4th', '4th year'], ['5th', '5th year'], ['graduated', 'Graduated'],
]

export const LANGUAGES = ['English', 'Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi', 'Saraiki', 'Arabic', 'French', 'German', 'Chinese', 'Other']

export const GENDERS: [string, string][] = [['female', 'Female'], ['male', 'Male'], ['other', 'Other'], ['prefer_not_to_say', 'Prefer not to say']]

export const NATIONALITIES: [string, string][] = [['pakistani', 'Pakistani'], ['other', 'Other']]

export const LINKEDIN_RE = /^https?:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?$/

export const MAX_SKILLS = 15

export type ExperienceRow = { title: string; org: string; start: string; end: string; description: string }

export type AboutForm = {
  full_name: string
  city: string // one of CITIES, or 'Other'
  cityOther: string
  birth_year: string
  university: string
  degree: string // one of DEGREES, or 'Other'
  degreeOther: string
  major: string
  study_year: string
  grad_year: string
  cgpa: string
  cgpa_scale: '4.0' | '5.0'
  skills: string[]
  languages: string[]
  experience: ExperienceRow[]
  gender: string
  nationality: string
  linkedin_url: string
  // Kept from a LinkedIn import, not shown as fields
  headline: string
  education: unknown[]
}

export type FieldKey = keyof AboutForm
export type Errors = Partial<Record<FieldKey, string>>

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

// Fill the form from the student's saved `profiles` row (so a refresh keeps everything).
export function formFromProfile(p: Record<string, unknown> | null): AboutForm {
  const city = str(p?.city)
  const degree = str(p?.degree)
  const scale = Number(p?.cgpa_scale) === 5 ? '5.0' : '4.0'
  return {
    full_name: str(p?.full_name),
    city: !city ? '' : CITIES.includes(city) ? city : 'Other',
    cityOther: city && !CITIES.includes(city) ? city : '',
    birth_year: str(p?.birth_year),
    university: str(p?.university),
    degree: !degree ? '' : DEGREES.includes(degree) ? degree : 'Other',
    degreeOther: degree && !DEGREES.includes(degree) ? degree : '',
    major: str(p?.major),
    study_year: str(p?.study_year),
    grad_year: str(p?.grad_year),
    cgpa: p?.cgpa === null || p?.cgpa === undefined ? '' : Number(p.cgpa).toFixed(2),
    cgpa_scale: scale,
    skills: Array.isArray(p?.skills) ? (p!.skills as string[]) : [],
    languages: Array.isArray(p?.languages) ? (p!.languages as string[]) : [],
    experience: Array.isArray(p?.experience)
      ? (p!.experience as Partial<ExperienceRow>[]).map((e) => ({ title: str(e.title), org: str(e.org), start: str(e.start), end: str(e.end), description: str(e.description) }))
      : [],
    gender: str(p?.gender),
    nationality: str(p?.nationality),
    linkedin_url: str(p?.linkedin_url),
    headline: str(p?.headline),
    education: Array.isArray(p?.education) ? (p!.education as unknown[]) : [],
  }
}

// Check the form before saving. Returns one message per field that's wrong.
export function validate(f: AboutForm): Errors {
  const e: Errors = {}
  const thisYear = new Date().getFullYear()
  if (!f.full_name.trim()) e.full_name = 'Please add your full name.'
  if (!f.city) e.city = 'Please choose your city.'
  else if (f.city === 'Other' && !f.cityOther.trim()) e.cityOther = 'Please type your city.'
  if (f.birth_year.trim()) {
    const y = Number(f.birth_year)
    if (!Number.isInteger(y) || y < 1950 || y > 2015) e.birth_year = 'Year of birth should be between 1950 and 2015.'
  }
  if (!f.university.trim()) e.university = 'Please add your university.'
  if (!f.degree) e.degree = 'Please choose your degree.'
  else if (f.degree === 'Other' && !f.degreeOther.trim()) e.degreeOther = 'Please type your degree.'
  if (!f.major.trim()) e.major = 'Please add your major or field of study.'
  if (!f.study_year) e.study_year = 'Please choose your current year.'
  if (!f.grad_year.trim()) e.grad_year = 'Please add your expected graduation year.'
  else {
    const g = Number(f.grad_year)
    if (!Number.isInteger(g) || g < 2000 || g > thisYear + 8) e.grad_year = `Graduation year should be between 2000 and ${thisYear + 8}.`
  }
  if (f.cgpa.trim()) {
    const c = Number(f.cgpa)
    const scale = Number(f.cgpa_scale)
    if (Number.isNaN(c) || c < 0) e.cgpa = 'CGPA should be a number, like 3.25.'
    else if (c > scale) e.cgpa = `Your CGPA can’t be higher than the ${f.cgpa_scale} scale. Check the number or change the scale.`
    else if (!/^\d(\.\d{1,2})?$/.test(f.cgpa.trim())) e.cgpa = 'Use up to 2 decimal places, like 3.25.'
  }
  if (f.skills.length > MAX_SKILLS) e.skills = `Up to ${MAX_SKILLS} skills.`
  return e
}

// What we write to `profiles` on Continue. Never includes plan or is_admin (the database rejects those).
export function profileUpdate(f: AboutForm) {
  const intOrNull = (s: string) => (s.trim() ? parseInt(s, 10) : null)
  return {
    full_name: f.full_name.trim(),
    city: f.city === 'Other' ? f.cityOther.trim() : f.city,
    birth_year: intOrNull(f.birth_year),
    university: f.university.trim(),
    degree: f.degree === 'Other' ? f.degreeOther.trim() : f.degree,
    major: f.major.trim(),
    study_year: f.study_year,
    grad_year: intOrNull(f.grad_year),
    cgpa: f.cgpa.trim() ? Math.round(Number(f.cgpa) * 100) / 100 : null,
    cgpa_scale: Number(f.cgpa_scale),
    skills: f.skills,
    languages: f.languages,
    experience: f.experience
      .filter((x) => x.title.trim() || x.org.trim())
      .map((x) => ({ title: x.title.trim(), org: x.org.trim(), start: x.start.trim(), end: x.end.trim(), description: x.description.trim() })),
    gender: f.gender || null,
    nationality: f.nationality || null,
    linkedin_url: f.linkedin_url.trim() || null,
    headline: f.headline.trim() || null,
    education: f.education,
  }
}

// --- LinkedIn import: fill only EMPTY fields, never overwrite what the student has typed ---

export type Mapped = {
  full_name?: string | null; headline?: string | null; city?: string | null; university?: string | null
  degree?: string | null; major?: string | null; grad_year?: number | string | null
  skills?: string[]; languages?: string[]; experience?: Partial<ExperienceRow>[]; education?: unknown[]
}

export function applyImport(f: AboutForm, m: Mapped): { form: AboutForm; filled: FieldKey[] } {
  const next: AboutForm = { ...f }
  const filled: FieldKey[] = []
  const put = <K extends FieldKey>(k: K, v: AboutForm[K]) => { next[k] = v; filled.push(k) }
  const s = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

  if (!f.full_name.trim() && s(m.full_name)) put('full_name', s(m.full_name))
  if (!f.city && s(m.city)) {
    const found = CITIES.find((c) => s(m.city).toLowerCase().includes(c.toLowerCase()))
    if (found) put('city', found)
    else { next.cityOther = s(m.city).split(',')[0]; put('city', 'Other') }
  }
  if (!f.university.trim() && s(m.university)) put('university', s(m.university))
  if (!f.degree && s(m.degree)) {
    const found = DEGREES.find((d) => d.toLowerCase() === s(m.degree).toLowerCase())
    if (found) put('degree', found)
    else { next.degreeOther = s(m.degree); put('degree', 'Other') }
  }
  if (!f.major.trim() && s(m.major)) put('major', s(m.major))
  if (!f.grad_year.trim() && /^\d{4}$/.test(s(m.grad_year))) put('grad_year', s(m.grad_year))
  if (!f.skills.length && m.skills?.length) put('skills', [...new Set(m.skills.map((x) => String(x).trim()).filter(Boolean))].slice(0, MAX_SKILLS))
  if (!f.languages.length && m.languages?.length) {
    const langs = [...new Set(m.languages.map((l) => LANGUAGES.find((x) => x.toLowerCase() === String(l).trim().toLowerCase()) || 'Other'))]
    put('languages', langs)
  }
  if (!f.experience.some((x) => x.title.trim() || x.org.trim()) && m.experience?.length) {
    put('experience', m.experience.slice(0, 10).map((e) => ({ title: s(e.title), org: s(e.org), start: s(e.start), end: s(e.end), description: s(e.description) })))
  }
  if (!f.headline.trim() && s(m.headline)) next.headline = s(m.headline)
  if (!f.education.length && m.education?.length) next.education = m.education
  return { form: next, filled }
}
