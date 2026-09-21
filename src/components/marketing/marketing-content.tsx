"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/primitives";

export type Marketing = {
  pinterestTitle: string;
  pinterestDescription: string;
  pinterestTags: string[];
  instagramCaption: string;
  instagramHashtags: string[];
  facebookPost: string;
  emailSubject: string;
  emailBody: string;
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong px-2 text-xs font-medium text-ink hover:bg-surface-2"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Block({ title, body, tags }: { title: string; body: string; tags?: string[] }) {
  const full = tags?.length ? `${body}\n\n${tags.map((t) => `#${t}`).join(" ")}` : body;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</h3>
        <CopyBtn text={full} />
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{body}</p>
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
              #{t}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

export function MarketingContent({ m }: { m: Marketing }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Block title="Pinterest" body={`${m.pinterestTitle}\n\n${m.pinterestDescription}`} tags={m.pinterestTags} />
      <Block title="Instagram" body={m.instagramCaption} tags={m.instagramHashtags} />
      <Block title="Facebook" body={m.facebookPost} />
      <Block title="Email" body={`Subject: ${m.emailSubject}\n\n${m.emailBody}`} />
    </div>
  );
}
