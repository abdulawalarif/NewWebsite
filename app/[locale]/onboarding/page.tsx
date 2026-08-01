import type { Metadata } from "next";
import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Einrichten – Sailly",
  robots: { index: false },
};

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center text-slate-500 text-sm">
          Laden…
        </div>
      }
    >
      <OnboardingClient locale={locale} />
    </Suspense>
  );
}
