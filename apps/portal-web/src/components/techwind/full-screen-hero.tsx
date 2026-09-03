import Link from "next/link";
import { ReactNode } from "react";

export interface FullScreenHeroProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  align?: "left" | "center" | "right";
  overlay?: boolean;
  variant?: "listing" | "fullscreen";
  breadcrumbs?: Array<{ href?: string; label: string }>;
  showWave?: boolean;
  children?: ReactNode;
}

export function FullScreenHero({
  title,
  description,
  backgroundImage,
  align = "center",
  overlay = true,
  variant = "listing",
  breadcrumbs,
  showWave = true,
  children,
}: FullScreenHeroProps) {
  const alignmentClass =
    align === "left"
      ? "md:text-start text-center"
      : align === "right"
      ? "md:text-end text-center"
      : "text-center";

  const descriptionMargin =
    align === "left"
      ? "mx-auto md:ml-0 md:mr-auto"
      : align === "right"
      ? "mx-auto md:mr-0 md:ml-auto"
      : "mx-auto";

  const overlayClass = overlay
    ? "absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900"
    : "";

  const sectionClass =
    variant === "fullscreen"
      ? "relative h-screen overflow-hidden flex items-center justify-center"
      : "relative table w-full py-32 lg:py-40 bg-no-repeat bg-center bg-cover overflow-hidden";

  return (
    <>
      <section
        className={sectionClass}
        style={backgroundImage ? { backgroundImage: `url('${backgroundImage}')` } : undefined}
      >
        <div className={overlayClass} />
        <div className="container relative z-10 mx-auto px-4">
          <div className="grid grid-cols-1">
            <div className={alignmentClass}>
              <h1 className="font-bold text-white lg:leading-normal leading-normal text-3xl sm:text-4xl lg:text-5xl mb-4">
                {title}
              </h1>
              {description && (
                <p className={`text-white/70 text-base sm:text-lg max-w-2xl ${descriptionMargin}`}>
                  {description}
                </p>
              )}
              {children && <div className="mt-6 sm:mt-8">{children}</div>}
            </div>
          </div>
        </div>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="absolute text-center z-10 bottom-6 inset-x-0 mx-3">
            <nav aria-label="Breadcrumb">
              <ol className="tracking-[0.5px] mb-0 inline-flex flex-wrap items-center justify-center gap-1.5 text-xs uppercase font-bold text-white/60">
                {breadcrumbs.map((item, idx) => (
                  <li key={idx} className="inline-flex items-center gap-1.5">
                    {idx > 0 && (
                      <span className="text-white/40" aria-hidden="true">
                        /
                      </span>
                    )}
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="text-white/60 hover:text-white duration-300 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="text-white">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        )}
      </section>

      {showWave && (
        <div className="relative">
          <div className="shape absolute sm:-bottom-px -bottom-0.5 inset-x-0 overflow-hidden z-2 text-slate-50 dark:text-[#090e17] pointer-events-none">
            <svg
              className="w-full h-auto scale-[2.0] origin-top"
              viewBox="0 0 2880 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M0 48H1437.5H2880V0H2160C1442.5 52 720 0 720 0H0V48Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
