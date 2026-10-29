"use client";

import { useState, type PointerEvent } from "react";
import Image from "next/image";
import AwardBadge from "@/components/homepage/AwardBadge";
import ridgeFar from "@/public/images/hero/ridge-far.webp";
import trophy from "@/public/images/hero/trophy.webp";
import columnsFar from "@/public/images/hero/columns-far.webp";
import cliffFront from "@/public/images/hero/cliff-front.webp";
import ridgeGlow from "@/public/images/hero/ridge-far-glow.webp";
import columnsGlow from "@/public/images/hero/columns-far-glow.webp";
import cliffGlow from "@/public/images/hero/cliff-front-glow.webp";
import { RockLight, cursorLight } from "@/components/homepage/RockLight";
import HeroFog from "@/components/homepage/HeroFog";
import styles from "./HeroSection.module.css";

const RIDGE_SIZES = "(max-width: 900px) 241vw, 89vw";
const COLUMNS_SIZES = "(max-width: 900px) 170vw, 62vw";
const CLIFF_SIZES = "(max-width: 900px) 322vw, 117vw";

function drift(section: HTMLElement, nx: number, ny: number) {
  for (const el of section.querySelectorAll<HTMLElement>("[data-drift]")) {
    const depth = Number(el.dataset.drift);
    el.style.transform = `translate3d(${(nx * -depth).toFixed(1)}px, ${(ny * -depth * 0.5).toFixed(1)}px, 0)`;
  }
}

export default function HeroSection() {
  // The glass mask reuses the trophy file the <img> picked from its srcset; pointing it at trophy.src would download the original as well.
  // Masks are fetched in CORS mode, so the <img> loads with crossOrigin too, or the browser fetches the same file again.
  const [trophyMask, setTrophyMask] = useState("");

  function movePointer(event: PointerEvent<HTMLElement>) {
    const section = event.currentTarget;
    const bounds = section.getBoundingClientRect();
    const nx = (event.clientX - bounds.left) / bounds.width * 2 - 1, ny = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    const lit = [...section.querySelectorAll<HTMLElement>("[data-rock-light]")];
    const litBoxes = lit.map((el) => el.getBoundingClientRect());
    lit.forEach((el, i) => {
      el.style.setProperty("--lx", `${(event.clientX - litBoxes[i].left).toFixed(0)}px`);
      el.style.setProperty("--ly", `${(event.clientY - litBoxes[i].top).toFixed(0)}px`);
    });
    drift(section, nx, ny);
    section.style.setProperty("--lp", "1");
    Object.assign(cursorLight, { x: event.clientX, y: event.clientY, on: true });
  }

  function leavePointer(event: PointerEvent<HTMLElement>) {
    drift(event.currentTarget, 0, 0);
    event.currentTarget.style.setProperty("--lp", "0");
    cursorLight.on = false;
  }

  return (
    <section id="home" aria-labelledby="hero-heading" className={styles.hero}
      onPointerDown={movePointer} onPointerMove={movePointer} onPointerLeave={leavePointer}>
      <div className={styles.scene}>
        <div className={styles.frame}>
          <div aria-hidden="true" data-rock-light data-parallax data-drift="6" className={`${styles.layer} ${styles.ridge}`}>
            <Image src={ridgeFar} alt="" priority sizes={RIDGE_SIZES} draggable={false} />
            <RockLight glow={ridgeGlow} sizes={RIDGE_SIZES} />
          </div>
          <div aria-hidden="true" data-rock-light data-parallax data-drift="10" className={`${styles.layer} ${styles.columns}`}>
            <Image src={columnsFar} alt="" priority sizes={COLUMNS_SIZES} draggable={false} />
            <RockLight glow={columnsGlow} sizes={COLUMNS_SIZES} />
          </div>
          <div data-layer="trophy" data-parallax data-drift="18" className={`${styles.layer} ${styles.trophy}`}>
            <Image src={trophy}
              alt="Point Blank's crystal trophy for the FOSS Awards 2026 Student Community of the Year"
              priority sizes="(max-width: 900px) 60vw, 20vw" draggable={false} crossOrigin="anonymous"
              onLoad={(event) => setTrophyMask(`url("${event.currentTarget.currentSrc}")`)} />
            <span aria-hidden="true" className={styles.charge} />
            {trophyMask && <span aria-hidden="true" className={styles.glass}
              style={{ maskImage: trophyMask, WebkitMaskImage: trophyMask }} />}
          </div>
          <div aria-hidden="true" data-rock-light data-parallax data-drift="22" className={`${styles.layer} ${styles.cliff}`}>
            <Image src={cliffFront} alt="" priority sizes={CLIFF_SIZES} draggable={false} />
            <RockLight glow={cliffGlow} sizes={CLIFF_SIZES} />
          </div>
        </div>
        <HeroFog layer="back" drift={9} />
        <HeroFog layer="front" drift={24} />
      </div>
      <div aria-hidden="true" className={styles.scrim} />

      <div className={styles.inner}>
        <div data-parallax className={styles.copy}>
          <h1 id="hero-heading" className={styles.heading}>
            <span className={styles.headingLine}>
              <span className={styles.silver}>We Are</span>{" "}<span className={styles.brackets} aria-hidden="true">&lt;. &gt;</span>
            </span>
            <span className={styles.headingLine}>
              <span className={styles.green}>Point</span>{" "}<span className={styles.silver}>Blank</span>
            </span>
          </h1>
          <p className={styles.tagline}>Student run Open Source Community from India</p>
          <div className={styles.award}><AwardBadge /></div>
        </div>
      </div>
    </section>
  );
}
