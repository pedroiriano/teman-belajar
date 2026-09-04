"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { AdminIcon } from "@/components/admin-icon";
import { AdminMarkdownRenderer } from "@/components/editor/admin-markdown-renderer";
import {
  wrapSelection,
  insertAtLineStart,
  insertBlock,
  insertCodeBlock,
  toggleNumberedList,
  countWords,
  countChars,
  type EditResult,
} from "@/components/editor/editor-utils";

/* ── Types ──────────────────────────────────────────────────────── */

export interface CubaMarkdownEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  rows?: number;
  mediaPickerSlot?: ReactNode;
  disabled?: boolean;
}

type EditorMode = "write" | "preview" | "split";

/* ── Component ──────────────────────────────────────────────────── */

export function CubaMarkdownEditor({
  id,
  value,
  onChange,
  placeholder = "Tulis konten dalam Markdown yang terstruktur…",
  label,
  required,
  rows = 14,
  mediaPickerSlot,
  disabled,
}: CubaMarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<EditorMode>("write");

  /* ── Apply result helper ──────────────────────────────────────── */
  const applyResult = useCallback(
    (result: EditResult) => {
      onChange(result.value);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [onChange]
  );

  /* ── Selection getter ─────────────────────────────────────────── */
  const sel = (): [number, number] => {
    const ta = textareaRef.current;
    if (!ta) return [0, 0];
    return [ta.selectionStart, ta.selectionEnd];
  };

  /* ── Toolbar actions ──────────────────────────────────────────── */
  const onHeading = (level: 2 | 3) => {
    const [s, e] = sel();
    const prefix = level === 2 ? "## " : "### ";
    applyResult(insertAtLineStart(value, s, e, prefix));
  };

  const onBold = () => {
    const [s, e] = sel();
    applyResult(wrapSelection(value, s, e, "**", "**", "tebal"));
  };

  const onItalic = () => {
    const [s, e] = sel();
    applyResult(wrapSelection(value, s, e, "*", "*", "miring"));
  };

  const onBulletList = () => {
    const [s, e] = sel();
    applyResult(insertAtLineStart(value, s, e, "- "));
  };

  const onNumberedList = () => {
    const [s, e] = sel();
    applyResult(toggleNumberedList(value, s, e));
  };

  const onLink = () => {
    const [s, e] = sel();
    const selected = value.slice(s, e);
    if (selected) {
      applyResult(wrapSelection(value, s, e, "[", "](url)"));
    } else {
      const insert = "[teks tautan](url)";
      const newValue = value.slice(0, s) + insert + value.slice(e);
      applyResult({
        value: newValue,
        selectionStart: s + 1,
        selectionEnd: s + 11, // select "teks tautan"
      });
    }
  };

  const onInlineCode = () => {
    const [s, e] = sel();
    applyResult(wrapSelection(value, s, e, "`", "`", "kode"));
  };

  const onCodeBlock = () => {
    const [s, e] = sel();
    applyResult(insertCodeBlock(value, s, e));
  };

  const onBlockquote = () => {
    const [s, e] = sel();
    applyResult(insertAtLineStart(value, s, e, "> "));
  };

  const onHorizontalRule = () => {
    const [s] = sel();
    applyResult(insertBlock(value, s, "\n---\n"));
  };

  /* ── Keyboard shortcuts ───────────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    if (!isCtrl) return;

    switch (e.key.toLowerCase()) {
      case "b":
        e.preventDefault();
        onBold();
        break;
      case "i":
        e.preventDefault();
        onItalic();
        break;
      case "k":
        e.preventDefault();
        onLink();
        break;
    }
  };

  /* ── Tab indentation ──────────────────────────────────────────── */
  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const [s, e2] = sel();
      const insert = "  ";
      const newValue = value.slice(0, s) + insert + value.slice(e2);
      applyResult({
        value: newValue,
        selectionStart: s + insert.length,
        selectionEnd: s + insert.length,
      });
    }
  };

  const showTextarea = mode === "write" || mode === "split";
  const showPreview = mode === "preview" || mode === "split";

  return (
    <div className={`cuba-editor ${disabled ? "opacity-60 pointer-events-none" : ""}`} data-cuba-editor>
      {/* Header: Label + Media Picker */}
      {(label || mediaPickerSlot) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
          {label && (
            <label htmlFor={id} className="admin-label !mb-0">
              {label}
              {required && <span className="text-rose-600 ml-0.5">*</span>}
            </label>
          )}
          {mediaPickerSlot}
        </div>
      )}

      {/* Editor Shell */}
      <div className="cuba-editor-shell rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div
          className="cuba-editor-toolbar flex flex-wrap items-center gap-0.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-2 py-1.5"
          role="toolbar"
          aria-label="Formatting toolbar"
        >
          {/* Heading buttons */}
          <ToolbarButton onClick={() => onHeading(2)} title="Heading 2 (##)" aria-label="Heading 2">
            <span className="text-[11px] font-black leading-none">H2</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => onHeading(3)} title="Heading 3 (###)" aria-label="Heading 3">
            <span className="text-[11px] font-black leading-none">H3</span>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Inline formatting */}
          <ToolbarButton onClick={onBold} title="Tebal (Ctrl+B)" aria-label="Tebal">
            <span className="text-[13px] font-black leading-none">B</span>
          </ToolbarButton>
          <ToolbarButton onClick={onItalic} title="Miring (Ctrl+I)" aria-label="Miring">
            <span className="text-[13px] font-bold italic leading-none">I</span>
          </ToolbarButton>
          <ToolbarButton onClick={onInlineCode} title="Kode inline (`)" aria-label="Kode inline">
            <span className="text-[11px] font-mono font-bold leading-none">&lt;&gt;</span>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Block formatting */}
          <ToolbarButton onClick={onBulletList} title="Daftar poin (- )" aria-label="Daftar poin">
            <AdminIcon name="list" className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={onNumberedList} title="Daftar bernomor (1. )" aria-label="Daftar bernomor">
            <span className="text-[11px] font-black leading-none">1.</span>
          </ToolbarButton>
          <ToolbarButton onClick={onBlockquote} title="Kutipan (>)" aria-label="Kutipan">
            <span className="text-[13px] font-bold leading-none">&ldquo;</span>
          </ToolbarButton>
          <ToolbarButton onClick={onCodeBlock} title="Blok kode (```)" aria-label="Blok kode">
            <AdminIcon name="code" className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Insert */}
          <ToolbarButton onClick={onLink} title="Tautan (Ctrl+K)" aria-label="Sisipkan tautan">
            <AdminIcon name="external" className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={onHorizontalRule} title="Garis horizontal (---)" aria-label="Garis horizontal">
            <AdminIcon name="more" className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mode tabs */}
          <div className="cuba-editor-mode-tabs flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
            <ModeTab active={mode === "write"} onClick={() => setMode("write")} label="Tulis">
              <AdminIcon name="edit" className="h-3 w-3" />
            </ModeTab>
            <ModeTab active={mode === "split"} onClick={() => setMode("split")} label="Bagi">
              <span className="text-[10px] font-black leading-none">⫽</span>
            </ModeTab>
            <ModeTab active={mode === "preview"} onClick={() => setMode("preview")} label="Pratinjau">
              <AdminIcon name="eye" className="h-3 w-3" />
            </ModeTab>
          </div>
        </div>

        {/* Editor Body */}
        <div className={`cuba-editor-body ${mode === "split" ? "grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800" : ""}`}>
          {/* Textarea */}
          {showTextarea && (
            <textarea
              ref={textareaRef}
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => { handleKeyDown(e); handleTab(e); }}
              required={required}
              disabled={disabled}
              rows={rows}
              placeholder={placeholder}
              className="cuba-editor-textarea w-full resize-y border-0 bg-transparent px-4 py-3 font-mono text-sm leading-7 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-0"
              aria-label={label || "Editor konten Markdown"}
            />
          )}

          {/* Preview */}
          {showPreview && (
            <div
              className="cuba-editor-preview overflow-y-auto px-5 py-4"
              style={{ minHeight: `${rows * 1.75 + 1.5}rem` }}
            >
              <AdminMarkdownRenderer content={value} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cuba-editor-footer flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            {countWords(value)} kata · {countChars(value)} karakter
          </span>
          <span className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
              <kbd className="rounded border border-slate-300 dark:border-slate-700 px-1 py-0.5 text-[10px] font-mono">Ctrl+B</kbd> Tebal
              {" · "}
              <kbd className="rounded border border-slate-300 dark:border-slate-700 px-1 py-0.5 text-[10px] font-mono">Ctrl+I</kbd> Miring
              {" · "}
              <kbd className="rounded border border-slate-300 dark:border-slate-700 px-1 py-0.5 text-[10px] font-mono">Ctrl+K</kbd> Tautan
            </span>
            <span className="font-bold text-sky-600 dark:text-sky-400">Markdown</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function ToolbarButton({
  onClick,
  title,
  children,
  pressed,
  ...rest
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  pressed?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={pressed}
      className="cuba-toolbar-btn inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white transition-colors"
      {...rest}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <span className="toolbar-divider mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
  );
}

function ModeTab({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
        active
          ? "bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
