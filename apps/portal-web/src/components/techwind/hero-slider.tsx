"use client";

/* eslint-disable @next/next/no-img-element -- exact licensed Techwind hero assets are served locally */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PortalIcon } from "@/components/portal-icon";

export type TechwindHeroSlide = {
  image: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  align: "left" | "center" | "right";
};

export function TechwindHeroSlider({ slides }: { slides: TechwindHeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % count), 7000);
    return () => window.clearInterval(timer);
  }, [count, paused, reducedMotion]);

  if (!count) return null;
  const previous = () => setActiveIndex((current) => (current - 1 + count) % count);
  const next = () => setActiveIndex((current) => (current + 1) % count);
  const slide = slides[activeIndex];
  const alignment = slide.align === "center" ? "is-center" : slide.align === "right" ? "is-right" : "is-left";

  return (
    <section
      className="techwind-hero-slider"
      data-techwind-pattern="index-course-hero"
      aria-roledescription="carousel"
      aria-label="Sorotan pembelajaran"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") previous();
        if (event.key === "ArrowRight") next();
        if (event.key === " ") { event.preventDefault(); setPaused((value) => !value); }
      }}
      onPointerDown={(event) => { if (event.pointerType === "touch") pointerStart.current = event.clientX; }}
      onPointerUp={(event) => {
        if (pointerStart.current === null) return;
        const distance = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(distance) > 45) distance > 0 ? previous() : next();
      }}
    >
      <div className="techwind-hero-slides" aria-live="off">
        {slides.map((item, index) => (
          <div key={item.image} className={`techwind-hero-image ${index === activeIndex ? "is-active" : ""}`} aria-hidden={index !== activeIndex}>
            <img src={item.image} alt="" fetchPriority={index === 0 ? "high" : "auto"} onError={(event) => { event.currentTarget.hidden = true; }} />
          </div>
        ))}
        <div className={`techwind-hero-overlay ${alignment}`} aria-hidden="true" />
        <div className="portal-container relative z-20 flex h-full items-center">
          <div className={`techwind-hero-content ${alignment}`} key={activeIndex}>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
            <Link href={slide.ctaHref} className="portal-button-primary mt-8">{slide.ctaLabel}</Link>
          </div>
        </div>
      </div>
      <button type="button" className="techwind-hero-arrow is-previous" onClick={previous} aria-label="Slide sebelumnya"><span><PortalIcon name="chevron-left" /></span></button>
      <button type="button" className="techwind-hero-arrow is-next" onClick={next} aria-label="Slide berikutnya"><span><PortalIcon name="chevron-right" /></span></button>
      <p className="sr-only" aria-live="polite">Slide {activeIndex + 1} dari {count}: {slide.title}</p>
    </section>
  );
}
