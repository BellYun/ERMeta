import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./RecommendationNavigation.module.css";

export function RecommendationNavigation({ active }: { active: "pick" | "trio" }) {
  const t = useTranslations("trioBuilder");
  return (
    <nav className={styles.navigation} aria-label={t("mode")}>
      <Link href="/synergy-detail" aria-current={active === "pick" ? "page" : undefined}>
        {t("myPick")}
      </Link>
      <Link href="/trio-builder" aria-current={active === "trio" ? "page" : undefined}>
        {t("title")}
        <span className={styles.newBadge}>NEW!</span>
      </Link>
    </nav>
  );
}
