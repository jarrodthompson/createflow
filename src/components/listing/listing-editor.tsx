"use client";

import { useState } from "react";
import { RefreshCw, Save, Sparkles, Wand2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import {
  updateListingAction,
  regenerateListingFieldAction,
  generateListingAction,
} from "@/server/actions/listing";

export type ListingData = {
  title: string;
  description: string;
  tags: string[];
  keywords: string[];
  materials: string[];
  colors: string[];
  occasions: string[];
  styleTags: string[];
  category: string;
};

const input =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
const label = "text-xs font-semibold uppercase tracking-wider text-subtle";

function RegenButton({ field }: { field: "title" | "description" | "tags" | "keywords" }) {
  return (
    <button
      type="submit"
      formAction={regenerateListingFieldAction.bind(null, field)}
      title="Regenerate this field"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-xs font-medium text-ink hover:bg-surface-2"
    >
      <RefreshCw className="h-3.5 w-3.5" /> Regenerate
    </button>
  );
}

export function ListingEditor({
  productId,
  data,
  isMock,
}: {
  productId: string;
  data: ListingData;
  isMock: boolean;
}) {
  const [title, setTitle] = useState(data.title);
  const [tags, setTags] = useState(data.tags.join(", "));
  const [description, setDescription] = useState(data.description);

  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  const titleOver = title.length > 140;
  const tooManyTags = tagList.length > 13;
  const longTags = tagList.filter((t) => t.length > 20);

  return (
    <form action={updateListingAction} className="space-y-5">
      <input type="hidden" name="productId" value={productId} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {isMock && (
          <Badge tone="warning">
            <Sparkles className="h-3.5 w-3.5" /> Mock SEO (dev) — set AI_TEXT_PROVIDER for real
          </Badge>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="submit"
            formAction={generateListingAction}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <Wand2 className="h-4 w-4" /> Regenerate all
          </button>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Save className="h-4 w-4" /> Save listing
          </button>
        </div>
      </div>

      {/* Title */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className={label}>Title</span>
          <RegenButton field="title" />
        </div>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${input} mt-2`}
          maxLength={200}
        />
        <p className={`mt-1 text-xs ${titleOver ? "text-danger" : "text-subtle"}`}>
          {title.length}/140 characters {titleOver && "· too long for Etsy"}
        </p>
      </Card>

      {/* Description */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className={label}>Description</span>
          <RegenButton field="description" />
        </div>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={10}
          className={`${input} mt-2 font-mono text-xs leading-relaxed`}
        />
        <p className="mt-1 text-xs text-subtle">{description.length} characters</p>
      </Card>

      {/* Tags */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className={label}>Tags</span>
          <RegenButton field="tags" />
        </div>
        <input
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className={`${input} mt-2`}
          placeholder="comma, separated, tags"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tagList.map((t) => (
            <span
              key={t}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                t.length > 20 ? "bg-danger-bg text-danger" : "bg-surface-2 text-ink"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <p className={`mt-1 text-xs ${tooManyTags ? "text-danger" : "text-subtle"}`}>
          {tagList.length}/13 tags {tooManyTags && "· Etsy allows max 13"}
          {longTags.length > 0 && ` · ${longTags.length} over 20 chars`}
        </p>
      </Card>

      {/* Keywords */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className={label}>Search keywords</span>
          <RegenButton field="keywords" />
        </div>
        <input
          name="keywords"
          defaultValue={data.keywords.join(", ")}
          className={`${input} mt-2`}
          placeholder="comma, separated"
        />
      </Card>

      {/* Attributes grid */}
      <Card className="p-5">
        <span className={label}>Attributes</span>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="colors" label="Colours" value={data.colors.join(", ")} />
          <Field name="materials" label="Materials" value={data.materials.join(", ")} />
          <Field name="occasions" label="Occasions" value={data.occasions.join(", ")} />
          <Field name="styleTags" label="Style" value={data.styleTags.join(", ")} />
          <Field name="category" label="Category" value={data.category} single />
        </div>
      </Card>
    </form>
  );
}

function Field({
  name,
  label: lbl,
  value,
  single,
}: {
  name: string;
  label: string;
  value: string;
  single?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink">{lbl}</label>
      <input
        name={name}
        defaultValue={value}
        className={input}
        placeholder={single ? "" : "comma, separated"}
      />
    </div>
  );
}
