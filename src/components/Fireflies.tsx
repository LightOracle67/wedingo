import { memo } from "react";
import "./Fireflies.css";

const COUNT = 20;

const Fireflies = memo(function Fireflies() {
  console.log("[app]", "[Fireflies]", "mount", { count: COUNT });
  return (
    <div className="fireflies" aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        const style = {
          left: `${(i * 7.3 + 3.1) % 100}%`,
          top: `${(i * 11.7 + 8.9) % 100}%`,
          animationDelay: `${-(i * 2.3 + 0.7) % 35}s`,
          animationDuration: `${30 + (i % 6) * 4}s`,
        };
        console.log("[app]", "[Fireflies]", "render firefly", { index: i, ...style });
        return <span key={i} className="firefly" style={style} />;
      })}
    </div>
  );
});

export default Fireflies;
