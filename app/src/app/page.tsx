import { AppWelcome } from "./welcome";
import { Lander } from "./lander";

// Browser visitors get the full lander. Opened from the Home Screen, it's the app's welcome screen.
export default function Home() {
  return (
    <>
      <div className="only-app"><AppWelcome /></div>
      <Lander />
    </>
  );
}
