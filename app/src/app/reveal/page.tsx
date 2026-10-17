import { redirect } from "next/navigation";

// Retired: the old reveal screen. Sign-up now goes straight to the import.
export default function Reveal() {
  redirect("/today");
}
