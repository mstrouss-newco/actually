import { redirect } from "next/navigation";

// The features tour is now part of the deck.
export default function Features() {
  redirect("/brief/deck");
}
