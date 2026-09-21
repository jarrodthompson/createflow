import { Feather } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
            <Feather className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">CreateFlow</h1>
          <p className="mt-1 text-sm text-muted">
            AI Etsy Digital Product Creation &amp; Listing Management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
