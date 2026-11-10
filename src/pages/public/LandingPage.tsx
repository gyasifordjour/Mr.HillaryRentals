import { Fragment, useEffect, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowRight, Hexagon, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import "@/styles/landing.css";

const STEPS = [
  { number: "01", title: "Browse rooms", description: "See photos, capacity and monthly price for available rooms." },
  { number: "02", title: "Send a request", description: "Choose your room and preferred rental dates for the farm to review." },
  { number: "03", title: "Confirm your stay", description: "Agree dates and payment arrangements with the farm team." },
];

const NAV_OFFSET = 68;

function RevealWords({ text }: { text: string }) {
  let index = 0;
  return (
    <>
      {text.split("\n").map((line, lineIndex) => {
        const words = line.split(" ");
        return (
          <span className="landing-word-line" key={lineIndex}>
            {words.map((word, wordIndex) => (
              <Fragment key={wordIndex}>
                <span
                  className="landing-word"
                  style={{ "--word-index": index++ } as CSSProperties}
                >
                  {word}
                </span>
                {wordIndex < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </span>
        );
      })}
    </>
  );
}

function smoothScrollTo(target: HTMLElement) {
  const targetY = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  const startY = window.scrollY;
  const distance = targetY - startY;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || Math.abs(distance) < 1) {
    window.scrollTo({ top: targetY, behavior: reduceMotion ? "auto" : "smooth" });
    return;
  }

  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";

  const duration = Math.min(1200, Math.max(600, Math.abs(distance) * 0.7));
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let startedAt: number | null = null;

  const step = (now: number) => {
    if (startedAt === null) startedAt = now;
    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      root.style.scrollBehavior = previousBehavior;
    }
  };

  requestAnimationFrame(step);
}

function useScrollProgress() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let target = 0;
    let current = 0;
    let previous = 0;
    let animationFrame = 0;
    let disposed = false;

    const readProgress = () => {
      const maxScroll = root.scrollHeight - window.innerHeight;
      return maxScroll > 0
        ? Math.min(1, Math.max(0, window.scrollY / maxScroll))
        : 0;
    };

    const tick = (now: number) => {
      if (disposed) return;
      const dt = previous ? Math.min(64, now - previous) : 16.7;
      previous = now;
      current += (target - current) * (1 - Math.pow(.86, dt / 16.7));
      if (Math.abs(target - current) < .0002) current = target;
      root.style.setProperty("--landing-progress", current.toFixed(4));
      if (current !== target) {
        animationFrame = requestAnimationFrame(tick);
      } else {
        animationFrame = 0;
        previous = 0;
      }
    };

    const update = () => {
      target = readProgress();
      if (reduceMotion.matches) {
        current = target;
        root.style.setProperty("--landing-progress", current.toFixed(4));
        return;
      }
      if (!animationFrame) {
        previous = 0;
        animationFrame = requestAnimationFrame(tick);
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      disposed = true;
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      root.style.removeProperty("--landing-progress");
    };
  }, []);
}

function usePointerParallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let previous = 0;
    let animationFrame = 0;
    let disposed = false;

    const tick = (now: number) => {
      if (disposed) return;
      const dt = previous ? Math.min(64, now - previous) : 16.7;
      previous = now;
      const follow = 1 - Math.pow(.94, dt / 16.7);
      x += (targetX - x) * follow;
      y += (targetY - y) * follow;
      root.style.setProperty("--landing-px", x.toFixed(4));
      root.style.setProperty("--landing-py", y.toFixed(4));

      if (Math.abs(targetX - x) > .0005 || Math.abs(targetY - y) > .0005) {
        animationFrame = requestAnimationFrame(tick);
      } else {
        animationFrame = 0;
        previous = 0;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      targetX = event.clientX / window.innerWidth - .5;
      targetY = event.clientY / window.innerHeight - .5;
      if (!animationFrame) {
        previous = 0;
        animationFrame = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onPointerMove);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      root.style.removeProperty("--landing-px");
      root.style.removeProperty("--landing-py");
    };
  }, []);
}

function useCardTilt() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = Array.from(document.querySelectorAll<HTMLElement>(".landing-tilt"));
    const cleanups: Array<() => void> = [];

    cards.forEach((card) => {
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = `perspective(1000px) rotateY(${(x * 6).toFixed(2)}deg) rotateX(${(-y * 6).toFixed(2)}deg)`;
      };
      const onPointerLeave = () => {
        card.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)";
      };

      card.addEventListener("pointermove", onPointerMove);
      card.addEventListener("pointerleave", onPointerLeave);
      cleanups.push(() => {
        card.removeEventListener("pointermove", onPointerMove);
        card.removeEventListener("pointerleave", onPointerLeave);
        card.style.removeProperty("transform");
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
}

function useLandingVideo(videoRef: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = motionPreference.matches;
    let smoothed = 0;
    let animationFrame = 0;
    let disposed = false;

    const tick = () => {
      if (disposed || reduceMotion) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0
        ? Math.min(1, Math.max(0, window.scrollY / maxScroll))
        : 0;
      smoothed += (progress - smoothed) * 0.12;

      if (video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0.05) {
        const targetTime = smoothed * (video.duration - 0.05);
        if (Math.abs(targetTime - video.currentTime) > 0.02 && !video.seeking) {
          video.currentTime = targetTime;
        }
      }

      animationFrame = requestAnimationFrame(tick);
    };

    const syncMotionPreference = () => {
      video.pause();
      reduceMotion = motionPreference.matches;

      if (reduceMotion) {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        video.removeAttribute("src");
        video.load();
        return;
      }

      smoothed = 0;
      video.src = "/landing/hero.mp4";
      video.load();
      if (!animationFrame) animationFrame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document
      .querySelectorAll(".landing-reveal, .landing-reveal-words, .landing-reveal-lines")
      .forEach((element) => observer.observe(element));

    syncMotionPreference();
    motionPreference.addEventListener("change", syncMotionPreference);

    return () => {
      disposed = true;
      video.pause();
      motionPreference.removeEventListener("change", syncMotionPreference);
      observer.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [videoRef]);
}

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  useLandingVideo(videoRef);
  useScrollProgress();
  usePointerParallax();
  useCardTilt();

  const dashboardHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const accountHref = user ? dashboardHref : "/login";

  const handleInPageClick = (event: ReactMouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor) return;

    const hash = anchor.getAttribute("href");
    if (!hash || hash === "#") return;

    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return;

    event.preventDefault();
    smoothScrollTo(target);
    history.replaceState(null, "", hash);
  };

  return (
    <main className="landing-page" onClick={handleInPageClick}>
      <video
        className="landing-video"
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        poster="/landing/poster.jpg"
        aria-hidden="true"
      />
      <div className="landing-shade" aria-hidden="true" />

      <nav className="landing-nav" aria-label="Primary navigation">
        <Link to="/" className="landing-brand" aria-label="FarmRent home">
          <span className="landing-brand-mark"><Hexagon size={21} strokeWidth={1.7} /></span>
          FarmRent
        </Link>
        <div className="landing-nav-links">
          <a href="#rooms">Rooms</a>
          <a href="#how">How it works</a>
          <a href="#watch">Live cameras</a>
          <a href="#contact">Contact</a>
        </div>
        <Link to="/rooms" className="landing-nav-action">Request a room <ArrowRight size={14} /></Link>
        <span className="landing-progress" aria-hidden="true" />
      </nav>

      <div className="landing-content">
        <section className="landing-scene" id="rooms">
          <div className="landing-scene-top">
            <div className="landing-service-list landing-reveal">
              <span>/ Rent a pig room</span>
              <span>/ Request the dates you need</span>
              <span>/ Room camera access</span>
            </div>
            <p className="landing-lead landing-reveal-words">
              <RevealWords text="Raise pigs without building a farm. Rent a clean, ready room and keep up with your animals from wherever you are." />
            </p>
          </div>
          <div className="landing-scene-bottom">
            <div>
              <span className="landing-glass-label landing-reveal">PIG HOUSING, READY TO RENT</span>
              <h1 className="landing-reveal-lines">
                <span className="landing-line"><span>No farm to build.</span></span>
                <span className="landing-line"><span>Just room to grow.</span></span>
              </h1>
            </div>
            <div className="landing-glass-card landing-reveal landing-tilt">
              <strong>Ready to get started?</strong>
              <small>Explore rooms, availability and rental details.</small>
              <Link className="landing-pill" to="/rooms">Request a room <ArrowRight size={15} /></Link>
            </div>
          </div>
          <a className="landing-scroll-hint" href="#how"><span>SCROLL TO EXPLORE</span><i /></a>
        </section>

        <div className="landing-spacer" aria-hidden="true" />

        <section className="landing-scene landing-how" id="how">
          <div className="landing-scene-top">
            <span className="landing-glass-label landing-reveal">A SIMPLE WAY TO GET STARTED</span>
            <p className="landing-lead landing-reveal-words">
              <RevealWords text="Choose a room, send a request, and confirm the details with the farm team." />
            </p>
          </div>
          <div className="landing-scene-bottom">
            <div className="landing-copy-block">
              <h2 className="landing-reveal-words">
                <RevealWords text={"Pick a room.\nSend a request."} />
              </h2>
              <p className="landing-reveal-words">
                <RevealWords text="Browse available rooms, check capacity and pricing, and request the dates you need. The farm team will confirm availability and payment arrangements." />
              </p>
              <Link className="landing-pill landing-reveal" to="/rooms">Browse rooms <ArrowRight size={15} /></Link>
            </div>
            <div className="landing-step-panel">
              {STEPS.map((step) => (
                <article className="landing-step landing-reveal" key={step.number}>
                  <span>{step.number}</span>
                  <div><h3>{step.title}<ArrowRight size={15} /></h3><p>{step.description}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="landing-spacer" aria-hidden="true" />

        <section className="landing-scene landing-move-in" id="services">
          <div className="landing-scene-top">
            <span className="landing-glass-label landing-reveal">SETTLE IN</span>
            <p className="landing-lead landing-reveal-words">
              <RevealWords text="Clean pens, clean water and room to move. Ask the farm about optional feeding or cleaning support." />
            </p>
          </div>
          <div className="landing-scene-bottom">
            <div className="landing-copy-block">
              <h2 className="landing-reveal-words">
                <RevealWords text={"Your room is ready\nwhen you arrive."} />
              </h2>
              <p className="landing-reveal-words">
                <RevealWords text="Visit the farm or discuss extra care with the team. Service availability, schedules and prices are agreed directly." />
              </p>
            </div>
            <div className="landing-glass-card landing-reveal landing-tilt">
              <strong>Need help caring for your pigs?</strong>
              <small>Explore optional feeding and room-cleaning support.</small>
              <Link className="landing-pill" to={user?.role === "farmer" ? "/services" : accountHref}>Farm services <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>

        <div className="landing-spacer" aria-hidden="true" />

        <section className="landing-scene landing-watch" id="watch">
          <div className="landing-scene-top">
            <span className="landing-glass-label landing-reveal"><ShieldCheck size={14} /> PRIVATE CAMERA ACCESS</span>
            <p className="landing-lead landing-reveal-words">
              <RevealWords text="Camera access is intended for your rented rooms and the dates of your rental." />
            </p>
          </div>
          <div className="landing-scene-bottom">
            <div className="landing-copy-block" id="contact">
              <h2 className="landing-reveal-words">
                <RevealWords text={"Watch your pigs\nfrom anywhere."} />
              </h2>
              <p className="landing-reveal-words">
                <RevealWords text="Keep an eye on the rooms you rent from your phone or computer. Live camera streams will be available when secure camera access is connected." />
              </p>
              <div className="landing-actions landing-reveal">
                <Link className="landing-pill" to="/rooms">Browse rooms <ArrowRight size={15} /></Link>
                <Link className="landing-pill landing-pill-glass" to={accountHref}>{user ? "Open dashboard" : "Sign in"} <ArrowRight size={15} /></Link>
              </div>
            </div>
            <div className="landing-glass-card landing-camera-card landing-reveal landing-tilt">
              <div className="landing-bob">
                <span className="landing-camera-status"><i /> CAMERA ACCESS</span>
                <strong>Room monitoring</strong>
                <small>Live streaming is not connected in this preview.</small>
                <Link to={user ? "/cameras" : "/login"} className="landing-card-link">{user ? "View camera page" : "Sign in to learn more"} <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
          <footer className="landing-footer landing-reveal"><Link to="/">FarmRent</Link><span>Space to farm. Confidence to grow.</span><Link to="/rooms">Browse rooms <ArrowRight size={13} /></Link></footer>
        </section>
      </div>
    </main>
  );
}
