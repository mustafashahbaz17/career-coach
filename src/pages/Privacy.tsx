// /privacy — Privacy page (public, no sign-in needed). Linked from the footer and the sign-up page.
//
// The words come straight from docs/content/privacy_page.md, which the content owner writes and edits.
// Vite bundles that file as plain text (`?raw`), and the small reader below turns it into the page.
// So to change the privacy text, edit the .md file only: the site updates on the next deploy.
//
// The reader understands just what that file uses: "# " title, "## " headings, "- " bullet lists,
// **bold** text, plain paragraphs, and it turns email addresses into mailto links.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import privacyText from '../../docs/content/privacy_page.md?raw'

type Block =
  | { kind: 'title' | 'heading' | 'para'; text: string }
  | { kind: 'list'; items: string[] }

function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: string[] | null = null
  const flushPara = () => { if (para.length) { blocks.push({ kind: 'para', text: para.join(' ') }); para = [] } }
  const flushList = () => { if (list) { blocks.push({ kind: 'list', items: list }); list = null } }

  for (const raw of md.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) { flushPara(); flushList(); continue }
    if (line.startsWith('# ')) { flushPara(); flushList(); blocks.push({ kind: 'title', text: line.slice(2) }); continue }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ kind: 'heading', text: line.slice(3) }); continue }
    if (/^[-*] /.test(line)) { flushPara(); (list ??= []).push(line.slice(2)); continue }
    if (list) list[list.length - 1] += ' ' + line // a wrapped bullet line
    else para.push(line)
  }
  flushPara(); flushList()
  return blocks
}

// **bold** and email addresses → React elements (no HTML strings, so nothing can be injected)
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<strong key={m.index}>{inline(m[1])}</strong>)
    else {
      const email = m[2].replace(/\.$/, '')
      out.push(<a key={m.index} href={`mailto:${email}`}>{email}</a>)
      if (m[2].endsWith('.')) out.push('.')
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function Privacy() {
  const blocks = parseMarkdown(privacyText)
  const title = blocks.find((b) => b.kind === 'title')
  const firstHeading = blocks.findIndex((b) => b.kind === 'heading')
  const intro = blocks.slice(0, firstHeading < 0 ? blocks.length : firstHeading).filter((b) => b.kind !== 'title')
  const body = firstHeading < 0 ? [] : blocks.slice(firstHeading)
  const headings = body.filter((b): b is { kind: 'heading'; text: string } => b.kind === 'heading')

  return (
    <div className="wrap privacy-page" style={{ paddingTop: 'clamp(16px,3vw,30px)', paddingBottom: 48 }}>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'clamp(28px,3.6vw,40px)' }}>{title && title.kind === 'title' ? title.text : 'Privacy'}</h1>
          {intro.map((b, i) => b.kind === 'para' && <p key={i} className="muted" style={{ maxWidth: 680 }}>{inline(b.text)}</p>)}
        </div>
      </div>

      <div className="privacy-grid">
        <nav className="privacy-toc card flat" aria-label="On this page">
          <b className="small">On this page</b>
          <ul>
            {headings.map((h) => <li key={h.text}><a href={`#${slug(h.text)}`}>{h.text}</a></li>)}
          </ul>
        </nav>

        <article className="card privacy-body">
          {body.map((b, i) => {
            if (b.kind === 'heading') return <h2 key={i} id={slug(b.text)}>{b.text}</h2>
            if (b.kind === 'list') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>
            if (b.kind === 'para') return <p key={i}>{inline(b.text)}</p>
            return null
          })}
          <div className="row" style={{ marginTop: 24, gap: 10 }}>
            <Link className="btn" to="/">Back to home</Link>
            <Link className="btn ghost" to="/pricing">See plans</Link>
          </div>
        </article>
      </div>
    </div>
  )
}
