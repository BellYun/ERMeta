import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "./Navigation";

const CURRENT_PATCH = "10.6";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center text-[11px] font-black text-[var(--color-primary)]">
            ER
          </div>
          <span className="text-base font-bold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
            ER&GG
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="flex-1 hidden sm:flex justify-center">
          <Navigation />
        </div>

        <div className="shrink-0 ml-auto sm:ml-0 flex items-center gap-2">
          <LanguageSwitcher />
          <Badge variant="outline" className="text-[10px]">
            v{CURRENT_PATCH}
          </Badge>
        </div>
      </div>
    </header>
  );
}
