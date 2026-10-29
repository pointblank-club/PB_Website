import Image, { type StaticImageData } from "next/image";
import styles from "./HeroSection.module.css";

export function RockLight({ glow, sizes }: { glow: StaticImageData; sizes: string }) {
  return (
    <>
      <Image src={glow} alt="" sizes={sizes} loading="eager" draggable={false} className={styles.crackGlow} />
      <Image src={glow} alt="" sizes={sizes} loading="eager" draggable={false} className={styles.crackPulse} />
    </>
  );
}
