// Reads the text out of a PDF in the student's browser (the file itself is never uploaded or stored).
// Used by the "Upload your CV" option in onboarding: the text goes to the n8n `cv-import` workflow.
//
// pdf.js is loaded only when someone actually picks a file, so it doesn't slow down the rest of the site.
//
// Returns { ok: true, text } or { ok: false, reason } and never throws.
//   reason 'not_pdf'   → the file isn't a PDF
//   reason 'too_big'   → over MAX_BYTES
//   reason 'no_text'   → we couldn't find enough text (usually a scanned image or a locked PDF)

export const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_PAGES = 6 // CVs are 1 to 2 pages; anything longer is cut off
export const MAX_CHARS = 30000 // matches the cv_versions.content_text limit
export const MIN_CHARS = 50 // less than this means there's nothing useful to read

export type PdfTextResult = { ok: true; text: string; pages: number } | { ok: false; reason: 'not_pdf' | 'too_big' | 'no_text' }

export async function pdfToText(file: File): Promise<PdfTextResult> {
  const looksPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!looksPdf) return { ok: false, reason: 'not_pdf' }
  if (file.size > MAX_BYTES) return { ok: false, reason: 'too_big' }

  try {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
    const doc = await task.promise
    const pages = Math.min(doc.numPages, MAX_PAGES)
    const out: string[] = []
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      // Keep line breaks where the PDF has them, so headings and bullets stay readable for the AI.
      let line = ''
      const lines: string[] = []
      for (const item of content.items) {
        if (!('str' in item)) continue
        line += item.str
        if (item.hasEOL) { lines.push(line); line = '' }
        else if (item.str && !item.str.endsWith(' ')) line += ' '
      }
      if (line) lines.push(line)
      out.push(lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n'))
    }
    void task.destroy() // frees the worker

    const text = out.join('\n\n').trim().slice(0, MAX_CHARS)
    if (text.replace(/\s/g, '').length < MIN_CHARS) return { ok: false, reason: 'no_text' }
    return { ok: true, text, pages }
  } catch (e) {
    console.error('Reading the PDF failed', e)
    return { ok: false, reason: 'no_text' }
  }
}
