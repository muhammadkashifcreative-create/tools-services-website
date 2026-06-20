import { Globe } from "lucide-react";
import { LANGUAGES, useI18n, type LangCode } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
      <Globe className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={lang}
        onChange={(e) => setLang(e.target.value as LangCode)}
        className="cursor-pointer appearance-none bg-transparent pr-3 text-xs font-semibold text-foreground focus:outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-background text-foreground">
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}