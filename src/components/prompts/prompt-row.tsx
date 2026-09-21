"use client";

import { useState } from "react";
import { Pencil, RefreshCw, Copy, Trash2, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { statusTone } from "@/lib/constants";
import {
  updatePromptAction,
  regeneratePromptAction,
  duplicatePromptAction,
  deletePromptAction,
} from "@/server/actions/planning";

export type PromptRowData = {
  id: string;
  index: number;
  concept: string;
  category: string | null;
  text: string;
  status: string;
};

const field =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function IconForm({
  action,
  name,
  value,
  title,
  children,
  confirm,
}: {
  action: (fd: FormData) => void;
  name: string;
  value: string;
  title: string;
  children: React.ReactNode;
  confirm?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name={name} value={value} />
      <button
        type="submit"
        title={title}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
      >
        {children}
      </button>
    </form>
  );
}

export function PromptRow({ prompt }: { prompt: PromptRowData }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-b border-line align-top">
        <td className="px-3 py-3 text-sm text-subtle">{prompt.index}</td>
        <td colSpan={4} className="px-3 py-3">
          <form action={updatePromptAction} className="space-y-2">
            <input type="hidden" name="promptId" value={prompt.id} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                name="concept"
                defaultValue={prompt.concept}
                placeholder="Concept"
                className={field}
                required
              />
              <input
                name="category"
                defaultValue={prompt.category ?? ""}
                placeholder="Category"
                className={field}
              />
            </div>
            <textarea name="text" defaultValue={prompt.text} rows={3} className={field} required />
            <div className="flex gap-2">
              <button
                type="submit"
                onClick={() => setTimeout(() => setEditing(false), 0)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Check className="h-4 w-4" /> Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-line align-top hover:bg-surface-2/50">
      <td className="px-3 py-3 text-sm text-subtle">{prompt.index}</td>
      <td className="px-3 py-3 text-sm font-medium text-ink">{prompt.concept}</td>
      <td className="px-3 py-3 text-sm text-muted">{prompt.category ?? "—"}</td>
      <td className="max-w-md px-3 py-3 text-sm text-muted">
        <span className="line-clamp-2">{prompt.text}</span>
      </td>
      <td className="px-3 py-3">
        <Badge tone={statusTone(prompt.status === "approved" ? "ready" : prompt.status)}>
          {prompt.status}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Edit"
            onClick={() => setEditing(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <IconForm action={regeneratePromptAction} name="promptId" value={prompt.id} title="Regenerate">
            <RefreshCw className="h-4 w-4" />
          </IconForm>
          <IconForm action={duplicatePromptAction} name="promptId" value={prompt.id} title="Duplicate">
            <Copy className="h-4 w-4" />
          </IconForm>
          <IconForm
            action={deletePromptAction}
            name="promptId"
            value={prompt.id}
            title="Delete"
            confirm="Delete this prompt?"
          >
            <Trash2 className="h-4 w-4" />
          </IconForm>
        </div>
      </td>
    </tr>
  );
}
