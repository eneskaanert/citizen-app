import { Analytics } from "@vercel/analytics/react";
import CitizenApp from "./CitizenApp";
import TeamApp from "./TeamApp";

function App() {
  const path = window.location.pathname;

  if (path.startsWith("/team")) {
    return (
      <>
        <TeamApp />
        <Analytics />
      </>
    );
  }

  return (
    <>
      <CitizenApp />
      <Analytics />
    </>
  );
}

export default App;