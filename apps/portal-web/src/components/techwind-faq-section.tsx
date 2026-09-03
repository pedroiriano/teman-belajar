"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export function TechwindFaqSection({
  faqs = [],
}: {
  faqs: FaqItem[];
}) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (containerRef.current && parallaxRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (rect.bottom >= 0 && rect.top <= windowHeight) {
              // Progress: 0 when top enters viewport from bottom, 1 when bottom leaves top
              const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
              // Calculate parallax shift: translates between -35px and +35px
              const translateY = (progress - 0.5) * 70;
              parallaxRef.current.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const handleToggle = (id: string) => {
    // When clicking an open item, toggle it closed.
    // When clicking a closed item, open it and automatically close all other items.
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <div className="relative grid md:grid-cols-12 grid-cols-1 items-center mt-8 gap-[30px]">
        {/* Left Column: SaaS CTA Image with Parallax (Jarallax style) */}
        <div className="md:col-span-6">
          <div ref={containerRef} className="relative rounded-xl overflow-hidden shadow-md dark:shadow-gray-800 h-96 sm:h-[480px] md:h-[540px]">
            <div
              ref={parallaxRef}
              className="jarallax absolute inset-x-0 -top-[15%] h-[130%] w-full bg-slate-400 bg-no-repeat bg-top bg-cover will-change-transform"
              style={{ backgroundImage: "url('/techwind-hero/saas/cta.jpg')" }}
              data-jarallax=""
              data-speed="0.5"
              role="img"
              aria-label="Ilustrasi Pertanyaan yang Sering Diajukan"
            />
          </div>
        </div>

        {/* Right Column: Mutual Exclusion Accordion */}
        <div className="md:col-span-6">
          <div data-accordion="collapse" id="accordion-collapse" className="space-y-4">
            {faqs.map((item, idx) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="relative shadow-sm dark:shadow-gray-800 rounded-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-colors"
                >
                  <h3 className="text-base font-semibold" id={`accordion-collapse-heading-${idx + 1}`}>
                    <button
                      aria-controls={`accordion-collapse-body-${idx + 1}`}
                      aria-expanded={isOpen}
                      className={`flex justify-between items-center p-5 w-full font-semibold text-start transition-colors duration-300 ${
                        isOpen
                          ? "bg-gray-50 dark:bg-slate-800/60 text-primary"
                          : "text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary"
                      }`}
                      data-accordion-target={`#accordion-collapse-body-${idx + 1}`}
                      type="button"
                      onClick={() => handleToggle(item.id)}
                    >
                      <span>{item.question}</span>
                      <svg
                        className={`size-4 shrink-0 transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-primary" : "text-slate-400"
                        }`}
                        data-accordion-icon=""
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clipRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          fillRule="evenodd"
                        />
                      </svg>
                    </button>
                  </h3>
                  <div
                    id={`accordion-collapse-body-${idx + 1}`}
                    aria-labelledby={`accordion-collapse-heading-${idx + 1}`}
                    className={isOpen ? "block" : "hidden"}
                  >
                    <div className="p-5 pt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed border-t border-gray-100 dark:border-gray-800">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Button Selengkapnya */}
      <div className="container relative mt-8 text-center">
        <Link
          className="py-2 px-5 inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-transparent hover:bg-primary border-primary text-primary hover:text-white rounded-md transition-all shadow-sm group"
          href="/help"
        >
          <span>Selengkapnya</span>
          <svg
            className="size-4 inline-block transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
