import React, { useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, ClipboardCheck, Gauge, ShieldCheck } from "lucide-react";

const moments = [
  {
    step: "01",
    title: "Declare the test envelope",
    description: "Set a bounded workload, thresholds, environment, and target. The assessment starts with the context a score needs.",
    icon: ClipboardCheck,
    label: "25 VUs · 60 sec · staging"
  },
  {
    step: "02",
    title: "Watch the signal, not just the average",
    description: "Track latency percentiles, throughput, and failure behavior while the run is in progress.",
    icon: Activity,
    label: "p95 380 ms · 482 RPS"
  },
  {
    step: "03",
    title: "Share a report that holds up",
    description: "Turn recorded evidence into a qualified readiness view that is clear for engineers and clients alike.",
    icon: ShieldCheck,
    label: "Conditionally ready · medium confidence"
  }
];

export function Scrollytelling() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.storyIndex ?? 0);
            setActive(index);
          }
        });
      },
      { threshold: 0.55 }
    );

    const items = section.querySelectorAll<HTMLElement>("[data-story-index]");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  const ActiveIcon = moments[active].icon;

  return (
    <section ref={sectionRef} className="story-section" id="how-it-works">
      <div className="story-intro">
        <span className="eyebrow">From workload to evidence</span>
        <h2>A readiness score is only useful when everyone can see what sits behind it.</h2>
      </div>

      <div className="story-layout">
        <div className="story-steps">
          {moments.map((moment, index) => {
            const Icon = moment.icon;
            return (
              <article
                className={`story-step ${active === index ? "is-active" : ""}`}
                data-story-index={index}
                key={moment.step}
                onClick={() => setActive(index)}
                style={{ cursor: "pointer" }}
              >
                <span className="story-number">{moment.step}</span>
                <div>
                  <Icon size={19} aria-hidden="true" />
                  <h3>{moment.title}</h3>
                  <p>{moment.description}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="story-sticky-card" aria-live="polite">
          <div className="story-card-top">
            <span>Assessment sequence</span>
            <span>{moments[active].step} / 03</span>
          </div>

          <div className="story-icon-wrap">
            <ActiveIcon size={28} />
          </div>

          <h3>{moments[active].title}</h3>
          <p>{moments[active].description}</p>

          <div className="story-measure">
            <Gauge size={16} />
            <span>{moments[active].label}</span>
          </div>

          <div className="story-dots">
            {moments.map((item, index) => (
              <span
                key={item.step}
                className={index === active ? "active" : ""}
                onClick={() => setActive(index)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </div>

          <span className="story-arrow">
            <ArrowUpRight size={18} />
          </span>
        </div>
      </div>
    </section>
  );
}

export { Scrollytelling as ScrollytellingStory };
