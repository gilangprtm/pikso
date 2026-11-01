"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/books";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

type CatalogBook = Pick<Book, "id" | "slug" | "title">;

export function CatalogCarousel({ books }: { books: CatalogBook[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const [minimumSlides, setMinimumSlides] = useState(4);
  // Embla needs enough slide width to cover the viewport for a seamless loop.
  // Repeat complete sets, never a partial sequence that would skip a story.
  const repetitions = books.length > 1 ? Math.ceil(minimumSlides / books.length) : 1;
  const carouselBooks = Array.from({ length: repetitions }, () => books).flat();
  const onApi = useCallback((nextApi: CarouselApi) => setApi(nextApi), []);

  useEffect(() => {
    if (!api) return;
    const update = () => setActive(api.selectedScrollSnap());
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  useEffect(() => {
    if (books.length < 2) return;
    const viewport = root.current?.querySelector<HTMLElement>('[data-slot="carousel-content"]');
    const slide = root.current?.querySelector<HTMLElement>('[data-slot="carousel-item"]');
    if (!viewport || !slide) return;
    const resize = () => {
      if (slide.offsetWidth > 0) {
        setMinimumSlides(Math.max(4, Math.ceil(viewport.clientWidth / slide.offsetWidth) + 2));
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [books.length]);

  return <Carousel ref={root} className="catalog-carousel" opts={{ align: "center", containScroll: false, loop: books.length > 1 }} setApi={onApi} aria-label="Koleksi cerita">
    <CarouselContent className="catalog-carousel-track">
      {carouselBooks.map((book, index) => <CarouselItem key={`${book.id}-${index}`} className="catalog-carousel-slide" data-active={index === active} aria-hidden={index !== active} inert={index !== active}>
        <div className="catalog-carousel-card">
          <Link href={`/books/${book.slug}`} className="book-card" aria-label={`Buka cerita ${book.title}`}>
            <div className="book-cover"><img src={`/api/books/${book.slug}/cover`} alt="" loading="lazy" decoding="async"/></div>
          </Link>
        </div>
      </CarouselItem>)}
    </CarouselContent>
  </Carousel>;
}
