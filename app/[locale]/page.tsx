import { getTranslations, setRequestLocale } from "next-intl/server";
import { getImageProps } from "next/image";
import { ArrowRight, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeDemoButton } from "@/components/home-demo-button";
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

const STEPS = ["add", "links", "share"] as const;

// public/screenshots: phone shots are 780x1688, wide (desktop) shots 2560x1600
const PHONE = { width: 780, height: 1688 };
const WIDE = { width: 2560, height: 1600 };
const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
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
    <div className="min-h-screen bg-white text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Slim bar in the app navbar's colors, so landing → app feels continuous */}
      <header className="bg-zinc-900 pt-[env(safe-area-inset-top)]">
        <div className={`${CONTAINER} flex h-14 items-center justify-between gap-4`}>
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90">
              <ListVideo className="h-4 w-4 text-zinc-900" />
            </span>
            {SITE_NAME}
          </Link>
          <nav aria-label={t("navLabel")} className="flex items-center gap-1 text-sm font-medium">
            <Link href="/explore" className="rounded-lg px-3 py-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
              {tNav("explore")}
            </Link>
            <Link href="/about" className="rounded-lg px-3 py-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
              {tNav("about")}
            </Link>
            <Link
              href="/dashboard"
              className="ml-2 hidden rounded-lg bg-white px-3 py-1.5 text-zinc-900 transition-colors hover:bg-zinc-200 sm:block"
            >
              {t("cta")}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={`${CONTAINER} pt-14 pb-10 text-center sm:pt-20 sm:pb-14`}>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("tagline")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 text-pretty sm:text-lg">
            {t("intro")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard">
                {t("cta")}
                <ArrowRight />
              </Link>
            </Button>
            <HomeDemoButton>{t("demoCta")}</HomeDemoButton>
          </div>
          <p className="mt-4 text-sm text-zinc-500">{t("heroNote")}</p>
        </section>

        {/* Product shot: phone screenshot on small screens, desktop screenshot from md up */}
        <div className="bg-gradient-to-b from-white from-50% to-zinc-50 to-50%">
          <div className={CONTAINER}>
            <Screenshot
              phone="/screenshots/mobile-dashboard.jpg"
              wide="/screenshots/wide-dashboard.jpg"
              alt={t("screens.alt.dashboard")}
              priority
            />
          </div>
        </div>

        {/* How it works */}
        <section className="bg-zinc-50 py-16 sm:py-24">
          <div className={CONTAINER}>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">{t("steps.title")}</h2>
            <ol className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((key, i) => (
                <li key={key} className="border-t border-zinc-300 pt-5">
                  <span className="font-mono text-sm text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-lg font-semibold">{t(`steps.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t(`steps.${key}.body`)}</p>
                  {key === "add" && (
                    <ul className="mt-4 space-y-1.5 text-sm" aria-label={t("formats.title")}>
                      {FORMAT_EXAMPLES.map(([input, code]) => (
                        <li key={input} className="flex items-center gap-2 text-zinc-400">
                          <code className="rounded bg-white px-2 py-0.5 text-xs text-zinc-600 ring-1 ring-zinc-200">{input}</code>
                          <span aria-hidden="true">→</span>
                          <code className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white">{code}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Screens */}
        <section className="py-16 sm:py-24">
          <div className={CONTAINER}>
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("screens.title")}</h2>
              <p className="mt-3 text-zinc-600">{t("screens.body")}</p>
            </div>

            {/* Phones: swipeable row of phone shots */}
            <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:hidden">
              {(["playlist", "links"] as const).map((key) => (
                <PhoneFrame key={key} src={`/screenshots/mobile-${key}.jpg`} alt={t(`screens.alt.${key}`)} />
              ))}
            </div>

            {/* Desktop: wide playlist shot with the link popover on a phone in front */}
            <div className="relative mt-12 hidden md:block md:pr-24 lg:pr-32">
              <BrowserFrame src="/screenshots/wide-playlist.jpg" alt={t("screens.alt.playlist")} />
              <div className="absolute -bottom-8 right-0 w-48 lg:w-60">
                <PhoneFrame src="/screenshots/mobile-links.jpg" alt={t("screens.alt.links")} />
              </div>
            </div>
          </div>
        </section>

        {/* What is a code / formats: plain reference text, also what search engines index */}
        <section className="border-t border-zinc-100 py-16 sm:py-20">
          <div className={`${CONTAINER} grid gap-10 md:grid-cols-2 md:gap-16`}>
            <div>
              <h2 className="text-lg font-semibold">{t("whatIs.title")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t("whatIs.body")}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t("formats.title")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {t("formats.body")}{" "}
                <span className="whitespace-nowrap">
                  {t("formats.url")} → <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white">SSIS-123</code>
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-zinc-900 text-white">
          <div className={`${CONTAINER} flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{t("closing")}</h2>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">{t("free")}</p>
            </div>
            <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-200">
              <Link href="/dashboard">
                {t("cta")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="pb-[env(safe-area-inset-bottom)]">
        <nav aria-label={t("otherLanguages")} className={`${CONTAINER} py-8`}>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {routing.locales.map((l) => (
              <li key={l}>
                {l === locale ? (
                  <span className="font-medium text-zinc-900">{LOCALE_NAMES[l]}</span>
                ) : (
                  <Link href="/" locale={l} lang={l} hrefLang={l} className="text-zinc-500 hover:text-zinc-900">
                    {LOCALE_NAMES[l]}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </div>
  );
}

const FRAME = "overflow-hidden bg-zinc-900 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-900/10";

/** Art-directed hero shot: only the variant for the current viewport is downloaded. The wide shot is cropped to its top, where the content is. */
function Screenshot({ phone, wide, alt, priority }: { phone: string; wide: string; alt: string; priority?: boolean }) {
  const common = { alt, priority, quality: 80 };
  const wideSizes = "(min-width: 1152px) 1088px, 100vw";
  const {
    props: { srcSet: wideSrcSet },
  } = getImageProps({ ...common, ...WIDE, src: wide, sizes: wideSizes });
  const { props: phoneProps } = getImageProps({ ...common, ...PHONE, src: phone, sizes: "280px" });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={wideSrcSet} sizes={wideSizes} width={WIDE.width} height={WIDE.height} />
      {/* eslint-disable-next-line @next/next/no-img-element -- art direction needs <picture> */}
      <img
        {...phoneProps}
        className={`${FRAME} mx-auto h-auto w-[280px] rounded-[2rem] border-[6px] border-zinc-900 md:w-full md:rounded-xl md:border-0 md:aspect-[16/7] md:object-cover md:object-top`}
      />
    </picture>
  );
}

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  const { props } = getImageProps({ ...WIDE, src, alt, quality: 80, sizes: "(min-width: 1152px) 960px, 85vw" });
  // eslint-disable-next-line @next/next/no-img-element -- getImageProps output (art direction / custom frames)
  return <img {...props} className={`${FRAME} h-auto w-full rounded-xl`} />;
}

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  const { props } = getImageProps({ ...PHONE, src, alt, quality: 80, sizes: "(min-width: 768px) 240px, 70vw" });
  return (
    // eslint-disable-next-line @next/next/no-img-element -- getImageProps output (art direction / custom frames)
    <img
      {...props}
      className={`${FRAME} h-auto w-[70vw] max-w-[280px] shrink-0 snap-center rounded-[2rem] border-[6px] border-zinc-900 md:w-full md:max-w-none`}
    />
  );
}
