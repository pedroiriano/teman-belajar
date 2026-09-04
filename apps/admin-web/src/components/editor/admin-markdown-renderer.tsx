import type { ReactNode } from "react";

/**
 * Zero-dependency Markdown renderer for Admin panel preview.
 * Ported & enhanced from portal-web/src/components/markdown-renderer.tsx.
 * Supports: headings, bold, italic, inline code, links, images, bullet/numbered lists,
 * code fences, blockquotes, horizontal rules, and paragraphs.
 */

/* ── Inline parsing ────────────────────────────────────────────── */

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text** or __text__
    let match = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    if (!match) match = remaining.match(/^(.*?)__(.+?)__/);
    if (match) {
      if (match[1]) nodes.push(<span key={key++}>{parseInlineSimple(match[1])}</span>);
      nodes.push(<strong key={key++} className="font-bold">{parseInlineSimple(match[2])}</strong>);
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic *text* or _text_ (but not inside words with underscores)
    match = remaining.match(/^(.*?)\*(.+?)\*/);
    if (match) {
      if (match[1]) nodes.push(<span key={key++}>{parseInlineSimple(match[1])}</span>);
      nodes.push(<em key={key++} className="italic">{parseInlineSimple(match[2])}</em>);
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Inline code `code`
    match = remaining.match(/^(.*?)`([^`]+)`/);
    if (match) {
      if (match[1]) nodes.push(<span key={key++}>{match[1]}</span>);
      nodes.push(
        <code key={key++} className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[13px] font-mono text-sky-700 dark:text-sky-300">
          {match[2]}
        </code>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Image ![alt](url)
    match = remaining.match(/^(.*?)!\[([^\]]*)\]\(([^)]+)\)/);
    if (match) {
      if (match[1]) nodes.push(<span key={key++}>{match[1]}</span>);
      nodes.push(
        <span key={key++} className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={match[3]}
            alt={match[2] || "Media"}
            className="my-2 max-w-full rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
            loading="lazy"
          />
        </span>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Link [text](url)
    match = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      if (match[1]) nodes.push(<span key={key++}>{match[1]}</span>);
      nodes.push(
        <a key={key++} href={match[3]} className="text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:text-sky-800 dark:hover:text-sky-300" target="_blank" rel="noopener noreferrer">
          {match[2]}
        </a>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // No more matches — emit the rest as text
    nodes.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return nodes;
}

/** Simple inline parse (for nested bold/italic — avoids infinite recursion) */
function parseInlineSimple(text: string): ReactNode {
  return text;
}

/* ── Heading ID generation ─────────────────────────────────────── */

function headingId(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 72);
  return `${slug || "bagian"}-${index + 1}`;
}

/* ── Block-level parser ────────────────────────────────────────── */

interface ParsedBlock {
  type: "heading" | "bullet" | "numbered" | "code" | "blockquote" | "hr" | "image" | "paragraph" | "empty";
  content: string;
  level?: number;
  lines?: string[];
}

function parseBlocks(content: string): ParsedBlock[] {
  const lines = content.split("\n");
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence ```
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code", content: codeLines.join("\n") });
      continue;
    }

    // Heading # ## ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        content: headingMatch[2].trim(),
        level: headingMatch[1].length,
      });
      i++;
      continue;
    }

    // Horizontal rule ---  ***  ___
    if (/^([-*_])\1{2,}\s*$/.test(line.trim())) {
      blocks.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    // Blockquote >
    if (line.startsWith("> ") || line === ">") {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join("\n"), lines: quoteLines });
      continue;
    }

    // Bullet list - or *
    if (/^[-*]\s+/.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        listLines.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "bullet", content: "", lines: listLines });
      continue;
    }

    // Numbered list 1. 2. etc.
    if (/^\d+\.\s+/.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        listLines.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "numbered", content: "", lines: listLines });
      continue;
    }

    // Full-line image ![alt](url)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({ type: "image", content: imgMatch[2], lines: [imgMatch[1]] });
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      blocks.push({ type: "empty", content: "" });
      i++;
      continue;
    }

    // Paragraph (default)
    blocks.push({ type: "paragraph", content: line });
    i++;
  }

  return blocks;
}

/* ── React component ───────────────────────────────────────────── */

export function AdminMarkdownRenderer({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-400 dark:text-slate-500 italic">
        Pratinjau akan muncul di sini saat Anda mulai menulis…
      </div>
    );
  }

  const blocks = parseBlocks(content);

  return (
    <div className="cuba-prose prose prose-slate dark:prose-invert max-w-none text-sm leading-7 text-slate-700 dark:text-slate-300 space-y-3">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const id = headingId(block.content, i);
            if (block.level === 1)
              return <h1 key={i} id={id} className="text-2xl font-black text-slate-900 dark:text-white pt-4 pb-1 border-b border-slate-200 dark:border-slate-800">{block.content}</h1>;
            if (block.level === 2)
              return <h2 key={i} id={id} className="text-xl font-black text-slate-900 dark:text-white pt-3">{block.content}</h2>;
            return <h3 key={i} id={id} className="text-lg font-extrabold text-slate-900 dark:text-white pt-2">{block.content}</h3>;
          }

          case "bullet":
            return (
              <ul key={i} className="ml-5 list-disc space-y-1 marker:text-sky-500">
                {block.lines?.map((item, j) => (
                  <li key={j} className="pl-1">{parseInline(item)}</li>
                ))}
              </ul>
            );

          case "numbered":
            return (
              <ol key={i} className="ml-5 list-decimal space-y-1 marker:text-sky-600 marker:font-bold">
                {block.lines?.map((item, j) => (
                  <li key={j} className="pl-1">{parseInline(item)}</li>
                ))}
              </ol>
            );

          case "code":
            return (
              <pre key={i} className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-[13px] font-mono leading-6 text-slate-800 dark:text-slate-200">
                <code>{block.content}</code>
              </pre>
            );

          case "blockquote":
            return (
              <blockquote key={i} className="border-l-4 border-sky-400 dark:border-sky-600 bg-sky-50/50 dark:bg-sky-950/20 rounded-r-lg pl-4 pr-3 py-2.5 text-slate-600 dark:text-slate-400 italic">
                {block.lines?.map((line, j) => (
                  <p key={j}>{parseInline(line)}</p>
                ))}
              </blockquote>
            );

          case "hr":
            return <hr key={i} className="border-slate-200 dark:border-slate-800 my-4" />;

          case "image":
            return (
              <figure key={i} className="my-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.content}
                  alt={block.lines?.[0] || "Media"}
                  className="max-w-full rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mx-auto"
                  loading="lazy"
                />
                {block.lines?.[0] && (
                  <figcaption className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {block.lines[0]}
                  </figcaption>
                )}
              </figure>
            );

          case "empty":
            return <div key={i} className="h-2" />;

          case "paragraph":
          default:
            return (
              <p key={i} className="leading-7">
                {parseInline(block.content)}
              </p>
            );
        }
      })}
    </div>
  );
}
