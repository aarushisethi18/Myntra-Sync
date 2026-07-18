import { useEffect, useState } from "react";

const initializationSteps = [
  "Connected",
  "Initializing your experience…",
  "Getting location…",
  "Fetching weather…",
  "Checking today’s context…",
  "Opening Myntra Sync…",
];

interface ContextInitializationProps {
  /** Change this value to begin a new context recomputation sequence. */
  trigger?: string | number;
  onComplete?: () => void;
}

export default function ContextInitialization({ trigger = "initial", onComplete }: ContextInitializationProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setActiveStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    initializationSteps.slice(1).forEach((_, index) => {
      timers.push(setTimeout(() => setActiveStep(index + 1), 650 * (index + 1)));
    });
    timers.push(setTimeout(() => onComplete?.(), 650 * initializationSteps.length + 250));
    return () => timers.forEach(clearTimeout);
  }, [trigger, onComplete]);

  return (
    <main className="context-initialization" aria-live="polite">
      <section className="context-initialization-card" aria-label="Preparing your Myntra Sync context">
        <div className="context-brand" aria-hidden="true">M</div>
        <p className="eyebrow">Myntra Sync</p>
        <h1>Making your day feel effortless.</h1>
        <ol className="initialization-steps">
          {initializationSteps.map((step, index) => {
            const isComplete = index < activeStep;
            const isActive = index === activeStep;
            return <li className={isActive ? "is-active" : isComplete ? "is-complete" : ""} key={step}>
              <span aria-hidden="true">{isComplete ? "✓" : isActive ? "•" : ""}</span>{step}
            </li>;
          })}
        </ol>
      </section>
    </main>
  );
}
