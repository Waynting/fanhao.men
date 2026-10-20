import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LOCALE_NAMES, localePath, routing, type Locale } from "@/i18n/routing";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/site";

export const generateMetadata = pageMetadata({ path: "/" });

// Input → normalized form, shown as examples of what the add dialog accepts
const FORMAT_EXAMPLES = [
  ["ssis123", "SSIS-123"],
  ["fc2ppv1234567", "FC2-PPV-1234567"],
  ["1234567", "FC2-PPV-1234567"],
] as const;

const FEATURES = ["codeFirst", "links", "share"] as const;
const STEPS = ["s1", "s2", "s3"] as const;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tMeta = await getTranslations("Metadata");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL + localePath(locale, "/"),
    description: tMeta("siteDescription"),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: locale,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 mb-3">
          {SITE_NAME}
        </h1>
        <p className="text-xl font-medium text-zinc-800 mb-4">{t("tagline")}</p>
        <p className="text-lg text-zinc-600 mb-8 max-w-2xl mx-auto">{t("intro")}</p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">{t("cta")}</Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {FEATURES.map((key) => (
            <div key={key} className="p-6 rounded-xl border border-zinc-200/80">
              <h2 className="font-semibold text-lg mb-2">{t(`features.${key}.title`)}</h2>
              <p className="text-zinc-600 text-sm">{t(`features.${key}.body`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <section>
            <h2 className="font-semibold text-lg text-zinc-900 mb-2">{t("whatIs.title")}</h2>
            <p className="text-zinc-600 text-sm leading-relaxed">{t("whatIs.body")}</p>
          </section>
          <section>
            <h2 className="font-semibold text-lg text-zinc-900 mb-2">{t("formats.title")}</h2>
            <p className="text-zinc-600 text-sm leading-relaxed mb-3">{t("formats.body")}</p>
            <ul className="space-y-1.5 text-sm">
              {FORMAT_EXAMPLES.map(([input, code]) => (
                <li key={input} className="flex items-center gap-2 text-zinc-500">
                  <code className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-xs">{input}</code>→
                  <code className="px-2 py-0.5 bg-zinc-900 text-white rounded text-xs">{code}</code>
                </li>
              ))}
              <li className="flex items-center gap-2 text-zinc-500">
                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-xs">{t("formats.url")}</span>→
                <code className="px-2 py-0.5 bg-zinc-900 text-white rounded text-xs">SSIS-123</code>
              </li>
            </ul>
          </section>
        </div>

        <section className="mt-12 text-left">
          <h2 className="font-semibold text-lg text-zinc-900 mb-3">{t("steps.title")}</h2>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-zinc-600">
            {STEPS.map((key) => (
              <li key={key}>{t(`steps.${key}`)}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-zinc-500">{t("free")}</p>
        </section>

        <nav aria-label={t("otherLanguages")} className="mt-16 pt-6 border-t border-zinc-100">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {routing.locales.map((l) => (
              <li key={l}>
                {l === locale ? (
                  <span className="text-zinc-900 font-medium">{LOCALE_NAMES[l]}</span>
                ) : (
                  <Link href="/" locale={l} lang={l} hrefLang={l} className="text-zinc-500 hover:text-zinc-900">
                    {LOCALE_NAMES[l]}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
