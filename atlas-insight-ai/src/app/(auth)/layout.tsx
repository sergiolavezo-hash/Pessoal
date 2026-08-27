import { Compass } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-foreground p-10 text-background lg:flex dark:bg-card">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Compass className="h-6 w-6" />
          Atlas Insight AI
        </Link>
        <div>
          <p className="max-w-md text-2xl font-medium leading-snug">
            Your data. Your rules. Your intelligence.
          </p>
          <p className="mt-4 max-w-md text-sm opacity-70">
            Connect your data sources, let Atlas understand your business, and talk to your data
            in plain language — with every number backed by a real query.
          </p>
        </div>
        <p className="text-xs opacity-50">© {new Date().getFullYear()} Atlas Insight AI</p>
      </div>
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
