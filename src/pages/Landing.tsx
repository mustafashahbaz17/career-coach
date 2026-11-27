// The public home page at "/". Says who Career Coach is for, what it does and what it costs.
// It reads nothing from the database and calls no n8n webhooks.
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useActiveSection, useParallax, useWordScrub } from '../lib/useMotion'
import Icon from '../components/Icon'

// Sample cards for the dark "tracker preview" in the hero. Clearly labelled Sample on screen.
const SAMPLE_BOARD = [
  { stage: 'Saved', cards: [{ co: 'Reckitt', role: 'Brand Mgmt Trainee', days: 2, ready: 41 }, { co: 'Nestlé', role: 'MT — Marketing', days: 16, ready: 52 }] },
  { stage: 'Applied', cards: [{ co: 'Unilever', role: 'Future Leaders', days: 9, ready: 68 }] },
  { stage: 'Interview', cards: [{ co: 'KPMG', role: 'Advisory Intern', days: 5, ready: 74 }] },
]

const STEPS = [
  { title: 'Import your profile & take the quiz', text: 'Bring in your LinkedIn profile or type your details, then answer a 3-minute interest quiz.' },
  { title: 'See your tracks & matches', text: 'Career tracks that fit you, and programmes you’re eligible for — with why you qualify.' },
  { title: 'Track deadlines & tailor your CV', text: 'Every application on one board with reminders. Approve CV changes bullet by bullet.' },
  { title: 'Practise & negotiate', text: 'Timed mock interviews with scored feedback, and help with your offer.', premium: true },
]

const PLANS = [
  { key: 'free', name: 'Free', price: 0, line: 'Profile, quiz and career tracks, your top 5 matches, a tracker for up to 10 applications, and 2 CV reviews a month.' },
  { key: 'pro', name: 'Pro', price: 499, line: 'Every match plus what you’re missing, an unlimited tracker, 15 CV reviews a month and a Monday digest email.' },
  { key: 'premium', name: 'Premium', price: 999, line: 'Everything in Pro, plus the timed interview simulator and help negotiating your offer.' },
]

const FAQ = [
  {
    q: 'Is my data private?',
    a: 'Yes. Your details, quiz answers and applications are visible only to you — each account can only ever read its own data. Optional details like gender or nationality are used only to check eligibility rules for specific programmes (for example a women-only scholarship), never to decide what careers you should consider.',
  },
  {
    q: 'Is this a replacement for a career counsellor?',
    a: 'No. Career Coach helps you organise and prepare for recruitment season, but it isn’t professional career advice, and it isn’t mental-health support. Talk to your university’s career office or someone you trust for the big decisions.',
  },
  {
    q: 'What does the AI do?',
    a: 'It reads your profile and quiz answers to suggest career tracks, matches you to programmes you’re eligible for, suggests CV changes that you accept or reject, and gives feedback on practice interview answers. It never sends anything or applies anywhere on your behalf.',
  },
]

// A small 4-point sparkle used as a decorative accent next to a few headings.
function Sparkle({ orange }: { orange?: boolean }) {
  return (
    <svg className={`sparkle ${orange ? 'o' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 0c.6 5.6 3.4 9.4 12 12-8.6 2.6-11.4 6.4-12 12-.6-5.6-3.4-9.4-12-12C8.6 9.4 11.4 5.6 12 0z" />
    </svg>
  )
}

// The numbered sections, taken from the page's own headings. Used by the side menu and the big numbers.
const SECTIONS = [
  { id: 'who', num: '01', label: "Who it's for" },
  { id: 'how', num: '02', label: 'How it works' },
  { id: 'plans', num: '03', label: 'Plans' },
  { id: 'faq', num: '04', label: 'Questions' },
]
const SECTION_IDS = SECTIONS.map((x) => x.id)

// Big orange section number shown beside a heading (decorative; screen readers skip it).
function SecNum({ n }: { n: string }) {
  return <span className="sec-num" aria-hidden="true">{n}</span>
}

// Numbered side menu (wide screens). Lights up the section you're in; clicking scrolls there smoothly.
function SideMenu() {
  const active = useActiveSection(SECTION_IDS)
  const idx = SECTIONS.findIndex((x) => x.id === active)
  return (
    <aside className="side-menu" aria-label="On this page">
      <nav>
        <ol style={{ ['--rail-i' as string]: String(Math.max(idx, 0)) } as CSSProperties}>
          {SECTIONS.map((x) => (
            <li key={x.id} className={x.id === active ? 'on' : ''}>
              <a href={`#${x.id}`} aria-current={x.id === active ? 'true' : undefined}>
                <span className="n">{x.num}</span>{x.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  )
}

// Splits a sentence into word spans for the word-by-word brightening. The text itself is unchanged.
function ScrubText({ text, className }: { text: string; className?: string }) {
  const [el, setEl] = useState<HTMLParagraphElement | null>(null)
  useWordScrub(el)
  return (
    <p ref={setEl} className={`scrub ${className || ''}`}>
      {text.split(' ').map((w, i, all) => <span key={i} className="w">{w}{i < all.length - 1 ? ' ' : ''}</span>)}
    </p>
  )
}

// Soft curved edge for the lighter band in the middle of the page.
function Wave({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 48 C 320 8, 620 0, 900 14 S 1300 44, 1440 20 L 1440 48 Z" />
    </svg>
  )
}

function readyColour(v: number) {
  return v >= 70 ? 'var(--teal)' : v >= 45 ? 'var(--gold)' : 'var(--coral)'
}

export default function Landing() {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  useParallax(root) // background glows drift slightly slower than the page as you scroll

  return (
    <div className="wrap landing landing-layout" ref={setRoot}>
      <SideMenu />
      <div className="landing-main">
      {/* 1. Hero (decorations behind it: soft glows and fine rings) */}
      <div className="hero-shell">
      <div className="deco orb a" aria-hidden="true" />
      <div className="deco orb b" aria-hidden="true" />
      <div className="deco orb c" aria-hidden="true" />
      <div className="deco halo r1" aria-hidden="true" />
      <div className="deco halo r2" aria-hidden="true" />
      <section className="hero">
        <div className="stack-m">
          <span className="chip teal">For final- and penultimate-year students in Pakistan</span>
          <h1>Your recruitment season, <span className="hl-accent">handled.</span></h1>
          <p className="lead">
            Find the programmes you're eligible for, tailor your CV to each, practise the interview, and never miss a deadline. <b>Free to start.</b>
          </p>
          <div className="row">
            <Link className="btn pri" to="/signup">Get started free</Link>
            <a className="btn" href="#plans">See plans</a>
          </div>
          <div className="row small muted">
            <span className="row" style={{ gap: 6 }}><Icon name="check" size={16} /> Nothing is sent to a recruiter without your approval</span>
            <span className="row" style={{ gap: 6 }}><Icon name="check" size={16} /> Your data is visible only to you</span>
          </div>
        </div>

        <div className="hero-board-wrap">
        {/* small floating UI cards around the sample board (decorative) */}
        <div className="float-ui f1" aria-hidden="true"><span className="ic o"><Icon name="board" size={13} /></span>Reminder set · 3 days before</div>
        <div className="float-ui f2" aria-hidden="true"><span className="ic g"><Icon name="check" size={13} /></span>CV bullet approved</div>
        <div className="float-ui f3" aria-hidden="true"><span className="ic y"><Icon name="mic" size={13} /></span>Practice answer scored</div>
        <div className="hero-board" aria-label="Sample preview of the application tracker">
          <div className="row between" style={{ marginBottom: 12 }}>
            <b>A student's season</b>
            <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: 'var(--on-stage)' }}>Sample</span>
          </div>
          <div className="cols">
            {SAMPLE_BOARD.map((col) => (
              <div className="hb-col" key={col.stage}>
                <h5>{col.stage}</h5>
                {col.cards.map((c) => (
                  <div className="hb-card" key={c.co}>
                    <span className="small muted">{c.co}</span>
                    <b>{c.role}</b>
                    <div className="row between" style={{ marginTop: 6 }}>
                      <span className={`cd num ${c.days <= 3 ? 'urgent' : ''}`}>{c.days}d left</span>
                      <span className="num" style={{ fontWeight: 800 }}>{c.ready}</span>
                    </div>
                    <div className="bar" style={{ marginTop: 6, height: 5 }}>
                      <i style={{ width: `${c.ready}%`, background: readyColour(c.ready) }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="small" style={{ color: 'var(--on-stage-2)', marginTop: 6 }}>Readiness = CV match + practice done + days left</div>
        </div>
        </div>
      </section>
      </div>

      {/* Sections 2–3 and the promises sit on a lighter band with curved edges */}
      <div className="band">
      <Wave className="top" />
      <div className="deco orb d" aria-hidden="true" />
      <div className="deco orb e" aria-hidden="true" />

      {/* 2. Who it's for */}
      <section id="who" className="pub-sec grid g2" style={{ alignItems: 'start' }}>
        <div>
          <h2 className="numbered"><SecNum n="01" />Who it's for</h2>
          <ScrubText className="statement" text="Final-year and penultimate-year university students in Pakistan going through recruitment season." />
        </div>
        <div className="card">
          <ul className="who-list">
            <li>Management-trainee (MT) programmes</li>
            <li>Big 4 and corporate internships</li>
            <li>Graduate jobs, fellowships and scholarships</li>
          </ul>
        </div>
      </section>

      {/* 3. How it works */}
      <section id="how" className="pub-sec stack-m">
        <h2 className="numbered"><SecNum n="02" />How it works<Sparkle /></h2>
        <div className="journey four">
          {STEPS.map((s, i) => (
            <div className="step" key={s.title}>
              <div className="n">{i + 1}</div>
              <h4>
                {s.title} {s.premium && <span className="chip gold" style={{ fontSize: 11 }}>Premium</span>}
              </h4>
              <p className="small muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we promise (honesty) */}
      <section className="pub-sec grid g3">
        <div className="card">
          <h3>Eligibility first</h3>
          <p className="muted small">Hard rules like CGPA, degree and graduation year are checked before anything is ranked. Optional demographics are used only for rules like women-only scholarships — <mark className="hl">never to steer your career</mark>.</p>
        </div>
        <div className="card">
          <h3>You approve every change</h3>
          <p className="muted small">CV suggestions wait for you to accept, edit or reject them. We <mark className="hl">never invent experience</mark>, never auto-apply and never email a recruiter.</p>
        </div>
        <div className="card">
          <h3>Honest by design</h3>
          <p className="muted small">Anything we haven't checked by hand is labelled Sample, and <mark className="hl">every estimate says it's an estimate</mark>.</p>
        </div>
      </section>
      <Wave className="bot" />
      </div>

      {/* 4. Plans summary */}
      <section id="plans" className="pub-sec stack-m plans-shell">
        <div className="deco orb f" aria-hidden="true" />
        <div className="sec-title">
          <div>
            <h2 className="numbered"><SecNum n="03" />Plans<Sparkle orange /></h2>
            <p className="muted">Prices are early estimates we're testing with students.</p>
          </div>
          <Link className="btn sm" to="/pricing">Compare plans</Link>
        </div>
        <div className="grid g3">
          {PLANS.map((p) => (
            <div className={`card price ${p.key === 'premium' ? 'feat' : ''}`} key={p.key}>
              <div className="row between">
                <h3>{p.name}</h3>
                {p.key === 'premium' && <span className="chip gold">Interview and offer</span>}
              </div>
              <div>
                <span className="amt">PKR {p.price.toLocaleString()}</span>
                <span className="muted">/month {p.price > 0 && <span className="chip line">est.</span>}</span>
              </div>
              <p className="small muted">{p.line}</p>
              <div style={{ marginTop: 'auto' }}>
                <Link className={`btn full ${p.key === 'free' ? 'pri' : ''}`} to="/signup">
                  {p.key === 'free' ? 'Start free' : 'Start free, upgrade later'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FAQ */}
      <section id="faq" className="pub-sec faq" style={{ maxWidth: 780 }}>
        <h2 className="numbered" style={{ marginBottom: 14 }}><SecNum n="04" />Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
      </div>
    </div>
  )
}
