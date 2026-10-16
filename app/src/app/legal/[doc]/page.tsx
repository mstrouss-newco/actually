import { notFound } from "next/navigation";
import { DOCS, LegalPage } from "@/lib/legal";

export function generateStaticParams() { return Object.keys(DOCS).map(doc => ({ doc })); }
export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return { title: DOCS[doc] ? `${DOCS[doc].title} · Actually` : "Actually" };
}

export default async function Doc({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!DOCS[doc]) notFound();
  return <LegalPage doc={doc} />;
}
