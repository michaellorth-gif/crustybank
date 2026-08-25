// Converts the constrained markdown produced by docgen.ts into a Word document.
// Supports exactly the constructs the generators emit: #/##/### headings,
// blockquotes, pipe tables (used for court captions — rendered borderless),
// bullet and numbered lists, --- rules, **bold** / *italic*, and \_ escaped
// underscores (signature lines). Output defaults to Times New Roman 12pt,
// double-spaced-adjacent court-filing conventions left to attorney adjustment.

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, HeadingLevel, AlignmentType,
} from 'docx'

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
}

function parseInline(text: string, extra: { italics?: boolean } = {}): TextRun[] {
  const unescaped = text.replace(/\\_/g, '_')
  const runs: TextRun[] = []
  const tokens = unescaped.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((t) => t.length > 0)
  for (const token of tokens) {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true, italics: extra.italics }))
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }))
    } else {
      runs.push(new TextRun({ text: token, italics: extra.italics }))
    }
  }
  return runs
}

function isTableSeparator(line: string): boolean {
  return /^\|(\s*:?-+:?\s*\|)+\s*$/.test(line)
}

function tableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((c) => c.trim())
}

export async function markdownToDocx(markdown: string, title: string): Promise<Buffer> {
  const lines = markdown.split('\n')
  const children: Array<Paragraph | Table> = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '' || trimmed === '---') {
      i++
      continue
    }

    // Tables (court captions, agency lists)
    if (trimmed.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        if (!isTableSeparator(lines[i].trim())) rows.push(tableCells(lines[i].trim()))
        i++
      }
      if (rows.length > 0) {
        const colCount = Math.max(...rows.map((r) => r.length))
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: NO_BORDERS,
          rows: rows.map((cells) => new TableRow({
            children: Array.from({ length: colCount }, (_, c) => new TableCell({
              borders: NO_BORDERS,
              children: [new Paragraph({ children: parseInline(cells[c] || '') })],
            })),
          })),
        }))
        children.push(new Paragraph({ text: '' }))
      }
      continue
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      children.push(new Paragraph({
        heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 240, after: 120 },
        children: parseInline(headingMatch[2]),
      }))
      i++
      continue
    }

    // Blockquotes (review banners, drafting notes)
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s?/, '')
      children.push(new Paragraph({
        indent: { left: 720 },
        spacing: { after: 120 },
        children: parseInline(quoteText, { italics: true }),
      }))
      i++
      continue
    }

    // Bullet list items
    if (/^[-*]\s+/.test(trimmed)) {
      children.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: parseInline(trimmed.replace(/^[-*]\s+/, '')),
      }))
      i++
      continue
    }

    // Numbered list items — keep the literal number so statutory lists stay stable
    if (/^\d+\.\s+/.test(trimmed)) {
      children.push(new Paragraph({
        indent: { left: 360 },
        spacing: { after: 60 },
        children: parseInline(trimmed),
      }))
      i++
      continue
    }

    // Ordinary paragraph (each source line is a hard-broken line by design)
    children.push(new Paragraph({
      spacing: { after: 120 },
      children: parseInline(trimmed),
    }))
    i++
  }

  const doc = new Document({
    title,
    styles: {
      default: {
        document: { run: { font: 'Times New Roman', size: 24 } },
        heading1: { run: { font: 'Times New Roman', size: 28, bold: true, color: '000000' } },
        heading2: { run: { font: 'Times New Roman', size: 26, bold: true, color: '000000' } },
        heading3: { run: { font: 'Times New Roman', size: 24, bold: true, color: '000000' } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      children,
    }],
  })

  return Packer.toBuffer(doc)
}

export function docxFilename(title: string): string {
  const slug = title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  return `${slug || 'document'}.docx`
}
