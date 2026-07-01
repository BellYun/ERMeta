import type { Metadata } from "next";
import { NotFoundContent } from "@/app/NotFoundContent";
import { ThemeInitScript } from "@/components/ThemeInitScript";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function NotFound() {
  return (
    <>
      <ThemeInitScript />
      <NotFoundContent />
    </>
  );
}
