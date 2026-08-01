import { Suspense } from "react";
import type { Metadata } from "next";
import MockCheckoutClient from "./checkout-client";

export const metadata: Metadata = {
  title: "Zahlung – Sailly",
  robots: { index: false },
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <MockCheckoutClient locale={locale} />
    </Suspense>
  );
}
