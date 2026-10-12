import Link from "next/link";

export function Back({ href }: { href: string }) {
  return (
    <Link href={href} className="back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
      Back
    </Link>
  );
}

export function Art({ src, w, h, radius = 12, style }: { src: string; w: number; h: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div className="art" style={{ width: w, height: h, borderRadius: radius, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/art/${src}.webp`} alt="" />
    </div>
  );
}

export function Check({ size = 13, color = "currentColor", width = 2.6 }: { size?: number; color?: string; width?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round"><path d="M3 8.5l3.2 3L13 4.5" /></svg>;
}
