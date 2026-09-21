import { Title } from "@solidjs/meta";
import { createRouter } from "@solidjs/router";
import { TripCalc } from "./client/TripCalc";

const Router = createRouter({
  routes: [
    { path: "/", component: TripCalc },
    { path: "/t/:token", component: TripCalc },
  ],
});

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <Title>Trip Calc</Title>
          {props.children}
        </>
      )}
    </Router>
  );
}
