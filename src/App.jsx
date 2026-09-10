import CitizenApp from "./CitizenApp";
import TeamApp from "./TeamApp";

function App() {
  const path = window.location.pathname;

  if (path.startsWith("/team")) {
    return <TeamApp />;
  }

  return <CitizenApp />;
}

export default App;