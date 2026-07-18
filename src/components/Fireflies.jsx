import { memo } from "react";
import "./Fireflies.css";

const COUNT = 24;

const Fireflies = memo(function Fireflies() {
  return (
    <div className="fireflies" aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => (
        <span
          key={i}
          className="firefly"
          style={{
            left: `${(i * 7.3 + 3.1) % 100}%`,
            top: `${(i * 11.7 + 8.9) % 100}%`,
            animationDelay: `${-(i * 2.7) % 35}s`,
            animationDuration: `${28 + (i % 7) * 2}s`,
          }}
        />
      ))}
    </div>
  );
});

export default Fireflies;
