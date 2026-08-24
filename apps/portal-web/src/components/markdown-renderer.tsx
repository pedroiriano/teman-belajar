import React from 'react';

export type MarkdownHeading = { id: string; text: string; level: 2 | 3 };

function headingId(text: string, index: number) {
  const slug = text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 72);
  return `${slug || "bagian"}-${index + 1}`;
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  return content.split("\n").flatMap((line, index) => {
    const match = line.match(/^(##|###)\s+(.+)$/);
    return match ? [{ id: headingId(match[2].trim(), index), text: match[2].trim(), level: match[1].length as 2 | 3 }] : [];
  });
}

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  
  return (
    <div className="prose prose-indigo max-w-none text-slate-700 space-y-4">
      {lines.map((line, i) => {
        const headingMatch = line.match(/^(##|###)\s+(.+)$/);
        if (headingMatch) {
          const text = headingMatch[2].trim();
          const id = headingId(text, i);
          return headingMatch[1] === "##"
            ? <h2 id={id} key={i} className="scroll-mt-28 pt-5 text-2xl font-black text-slate-900">{text}</h2>
            : <h3 id={id} key={i} className="scroll-mt-28 pt-3 text-xl font-extrabold text-slate-900">{text}</h3>;
        }
        const bulletMatch = line.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) return <ul key={i} className="ml-5 list-disc"><li>{bulletMatch[1]}</li></ul>;
        // Very basic image markdown parser: ![alt](url)
        const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        
        if (imgMatch) {
          const [, alt, url] = imgMatch;
          // For Portal Web, images should be public and accessible directly
          // We can just render the img tag.
          return (
            <figure key={i} className="my-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={url} 
                alt={alt || "Media Image"} 
                className="w-full max-w-3xl rounded-lg shadow-md border border-slate-100 object-contain mx-auto"
                loading="lazy"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTRweCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJyb2tlbjwvdGV4dD48L3N2Zz4=';
                }}
              />
              {alt && <figcaption className="text-center text-sm text-slate-500 mt-2">{alt}</figcaption>}
            </figure>
          );
        }

        // Just text paragraph
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} className="leading-8">{line}</p>;
      })}
    </div>
  );
}
