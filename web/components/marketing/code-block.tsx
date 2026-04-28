"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CodeBlock({
  code,
  lang = "bash",
  label = "field-report",
}: { code: string; lang?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <span>filed under · {label}.{lang}</span>
        <button
          onClick={copy}
          className="text-muted hover:text-rust transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto text-[13px] leading-relaxed font-mono text-fg">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  );
}
