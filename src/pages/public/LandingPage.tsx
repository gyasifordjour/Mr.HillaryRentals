import { Fragment, useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight, CalendarDays, Camera, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleUserRound, Globe2, Heart, MapPin, Menu, Minus,
  Plus, PiggyBank, Search, ShieldCheck, UserRound, Wifi, Wheat, X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, isSameDay, startOfMonth, subMonths } from "date-fns";
import { useAuth } from "@/features/auth/AuthProvider";
import "@/styles/landing.css";

const SLIDES = [
  {
    photo: "/farm-images/pig-room.jpg",
    thumb: "/farm-images/pig-room.jpg",
    title: ["ROOM TO RAISE", "A HEALTHIER HERD"],
    heading: "A place to grow",
    copy: "Find managed pig housing, practical support and a clearer way to keep up with your animals.",
    position: "center 62%",
  },
  {
    photo: "/farm-images/farm-field.jpg",
    thumb: "/farm-images/farm-field.jpg",
    title: ["FIND A ROOM", "THAT FITS YOUR FARM"],
    heading: "Space that fits",
    copy: "Compare room capacity and availability, then request the dates that work for your plans.",
    position: "center 55%",
  },
  {
    photo: "/farm-images/pig-care.jpg",
    thumb: "/farm-images/piglets.jpg",
    title: ["CARE FOR", "WHAT YOU GROW"],
    heading: "Keep connected",
    copy: "Room-based camera access helps you check in on your herd from wherever you are.",
    position: "center 40%",
  },
];

const CLOUD_IMAGE = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261115_005635_6590354a-216c-40a2-9f84-93abe97dc7b1.png&w=2400&q=85";

const ROOMS = [
  ["Pig room 01", "A managed room for your herd", "/farm-images/pig-room.jpg"],
  ["Pig room 02", "Room to raise your next group", "/farm-images/piglets.jpg"],
  ["Pig room 03", "A practical place to get started", "/farm-images/pig-group.jpg"],
  ["Pig room 04", "Space for the work ahead", "/farm-images/pig-care.jpg"],
  ["Pig room 05", "A home for a growing herd", "/farm-images/farm-field.jpg"],
  ["Pig room 06", "Managed space, ready to request", "/farm-images/pig-room.jpg"],
  ["Pig room 07", "Room to farm with confidence", "/farm-images/piglets.jpg"],
  ["Pig room 08", "Find the space your farm needs", "/farm-images/pig-group.jpg"],
].map(([name, description, photo], index) => ({ name, description, photo, id: `room-${index + 1}` }));

const AMENITIES = [
  [Wifi, "Room camera access"], [DropletsIcon, "Water access"], [ShieldCheck, "Managed facility"],
  [PiggyBank, "Room capacity"], [Check, "Optional care"], [Camera, "Remote monitoring"],
] as const;

function DropletsIcon({ size = 17 }: { size?: number }) {
  return <span className="landing-drop-icon" style={{ width: size, height: size }}>◌</span>;
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [previousSlide, setPreviousSlide] = useState<number | null>(null);
  const [navSolid, setNavSolid] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState("rooms");
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [month, setMonth] = useState(new Date(2026, 11, 1));
  const [checkIn, setCheckIn] = useState<Date | null>(new Date(2026, 11, 22));
  const [checkOut, setCheckOut] = useState<Date | null>(new Date(2026, 11, 27));
  const [herdSize, setHerdSize] = useState(3);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<(typeof ROOMS)[number] | null>(null);
  const [flight, setFlight] = useState<{ photo: string; rect: { left: number; top: number; width: number; height: number } } | null>(null);
  const [flightLanded, setFlightLanded] = useState(false);
  const [booked, setBooked] = useState(false);
  const [pointer, setPointer] = useState({ x: -100, y: -100, hover: false, down: false });
  const current = SLIDES[slide];
  const accountHref = user?.role === "admin" ? "/admin" : user ? "/dashboard" : "/login";

  function changeSlide(next: number) {
    if (next === slide) return;
    setPreviousSlide(slide);
    setSlide(next);
    window.setTimeout(() => setPreviousSlide(null), 1250);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => changeSlide((slide + 1) % SLIDES.length), 5200);
    return () => window.clearTimeout(timer);
  }, [slide]);

  useEffect(() => {
    const scroll = () => setNavSolid(window.scrollY > window.innerHeight * .3);
    window.addEventListener("scroll", scroll, { passive: true });
    scroll();
    return () => window.removeEventListener("scroll", scroll);
  }, []);

  useEffect(() => {
    const sections = ["rooms", "services", "monitoring"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (current) setActiveMobileTab((current.target as HTMLElement).id);
    }, { rootMargin: "-30% 0px -55% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".landing-hero");
    if (!hero) return;
    let frame = 0;
    const updateScrollEffects = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const heroScroll = Math.min(scrollY, viewportHeight);
      const reveal = Math.min(1, heroScroll / (viewportHeight * .45));
      hero.style.setProperty("--slide-shift", `${heroScroll * .42}px`);
      hero.style.setProperty("--cloud-shift", `${heroScroll * -.38}px`);
      hero.style.setProperty("--cloud-scale", String(1 + .35 * heroScroll / viewportHeight));
      hero.style.setProperty("--top-cloud-opacity", String(reveal));
      hero.style.setProperty("--top-cloud-shift", `${heroScroll * -.2}px`);
      hero.style.setProperty("--rail-shift", `${heroScroll * .2}px`);
      hero.style.setProperty("--rail-opacity", String(Math.max(0, 1 - heroScroll / (viewportHeight * .5))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateScrollEffects);
    };
    updateScrollEffects();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      ["--slide-shift", "--cloud-shift", "--cloud-scale", "--top-cloud-opacity", "--top-cloud-shift", "--rail-shift", "--rail-opacity"].forEach((property) => hero.style.removeProperty(property));
    };
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(".landing-room-card");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedRoom || !flight) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFlightLanded(true);
      setFlight(null);
      return;
    }
    let animationFrame = 0;
    let timer = 0;
    let animation: Animation | undefined;
    const finishFlight = () => {
      setFlightLanded(true);
      setFlight(null);
    };
    animationFrame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(".landing-detail-image");
      const image = document.querySelector<HTMLImageElement>(".landing-flight-photo");
      if (!target || !image) {
        finishFlight();
        return;
      }
      const rect = target.getBoundingClientRect();
      animation = image.animate([
        { left: `${flight.rect.left}px`, top: `${flight.rect.top}px`, width: `${flight.rect.width}px`, height: `${flight.rect.height}px`, borderRadius: "11px" },
        { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: "10px" },
      ], { duration: 900, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
      timer = window.setTimeout(finishFlight, 900);
    });
    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
      animation?.cancel();
    };
  }, [selectedRoom, flight]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      setPointer((value) => ({ ...value, x: event.clientX, y: event.clientY, hover: Boolean((event.target as HTMLElement).closest("a,button,input,select,.landing-search-field")) }));
    };
    const down = () => setPointer((value) => ({ ...value, down: true }));
    const up = () => setPointer((value) => ({ ...value, down: false }));
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", down); window.removeEventListener("pointerup", up); };
  }, []);

  function chooseDay(day: Date) {
    if (!checkIn || checkOut || isBefore(day, checkIn)) {
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    setCheckOut(day);
    setDatesOpen(false);
    setGuestsOpen(true);
  }

  function searchRooms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams({ minPigs: String(Math.max(1, herdSize)) });
    params.set("status", "available");
    if (checkIn) params.set("start", format(checkIn, "yyyy-MM-dd"));
    if (checkOut) params.set("end", format(checkOut, "yyyy-MM-dd"));
    navigate(`/rooms?${params}`);
  }

  const firstDayOffset = (getDay(startOfMonth(month)) + 6) % 7;
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const toggleFavorite = (id: string) => setFavorites((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  const openRoom = (room: (typeof ROOMS)[number], source: HTMLElement) => {
    const image = source.matches(".landing-room-photo")
      ? source.querySelector("img")
      : source.closest(".landing-room-card")?.querySelector(".landing-room-photo img");
    const rect = image?.getBoundingClientRect();
    setFlight(rect ? { photo: room.photo, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } } : null);
    setFlightLanded(!rect);
    setSelectedRoom(room);
    setBooked(false);
  };
  const closeRoom = () => {
    setSelectedRoom(null);
    setFlight(null);
    setFlightLanded(false);
  };

  return (
    <main className="landing-page">
      <div className={`landing-cursor ${pointer.hover ? "is-hover" : ""} ${pointer.down ? "is-down" : ""} ${new URLSearchParams(location.search).has("rec") ? "is-recording" : ""}`} style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }} aria-hidden="true" />
      <nav className={`landing-nav ${navSolid ? "is-solid" : ""}`}>
        <div className="landing-nav-left">
          <Link className="landing-brand" to="/">Trinity Integrated Farms</Link><span className="landing-nav-divider" />
          <span className="landing-nav-farmers">Farmers <ChevronDown size={12} /></span>
        </div>
        <div className="landing-nav-links"><a href="#rooms">Rooms</a><a href="#services">Farm services</a><a href="#monitoring">Monitoring</a></div>
        <div className="landing-nav-right"><Link to={user ? accountHref : "/signup"}>{user ? "My account" : "Partner with us"}</Link><Globe2 size={17} strokeWidth={1.4} /><Link className="landing-account" to={accountHref} aria-label={user ? "Open dashboard" : "Sign in"}><Menu size={18} /><span><CircleUserRound size={20} fill="currentColor" /></span></Link></div>
      </nav>
      <nav className="landing-mobile-nav" aria-label="Mobile navigation">
        <div className="landing-mobile-nav-group">
          <a href="#services" className={`landing-mobile-nav-item ${activeMobileTab === "services" ? "is-active" : ""}`} style={{ "--nav-index": 0 } as React.CSSProperties} aria-current={activeMobileTab === "services" ? "location" : undefined} onClick={() => setActiveMobileTab("services")}><Wheat size={17} /><span>Farm</span></a>
          <a href="#rooms" className={`landing-mobile-nav-item ${activeMobileTab === "rooms" ? "is-active" : ""}`} style={{ "--nav-index": 1 } as React.CSSProperties} aria-current={activeMobileTab === "rooms" ? "location" : undefined} onClick={() => setActiveMobileTab("rooms")}><PiggyBank size={17} /><span>Rooms</span></a>
          <a href="#monitoring" className={`landing-mobile-nav-item ${activeMobileTab === "monitoring" ? "is-active" : ""}`} style={{ "--nav-index": 2 } as React.CSSProperties} aria-current={activeMobileTab === "monitoring" ? "location" : undefined} onClick={() => setActiveMobileTab("monitoring")}><Camera size={17} /><span>Cameras</span></a>
        </div>
        <Link to={accountHref} className="landing-mobile-nav-action" aria-label={user ? "Open profile" : "Sign in to profile"}><UserRound size={22} strokeWidth={2.2} /></Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-slide-stack">
          {SLIDES.map((item, index) => <div key={item.photo} className={`landing-slide ${index === slide ? "is-active" : index === previousSlide ? "is-previous" : ""}`} style={{ backgroundImage: `url("${item.photo}")`, backgroundPosition: item.position, zIndex: index === slide ? 3 : index === previousSlide ? 2 : 1 }} />)}
        </div>
        <div className="landing-top-clouds" aria-hidden="true"><img src={CLOUD_IMAGE} /></div>
        <div className="landing-tint" />
        <div className="landing-title-wrap" key={slide}><span className="landing-hero-kicker">TRINITY INTEGRATED FARMS</span><h1>{current.title.map((line, lineIndex) => {
          const words = line.split(" ");
          const firstWordIndex = current.title.slice(0, lineIndex).reduce((count, item) => count + item.split(" ").length, 0);
          return <span className="landing-title-line" key={line}>{words.map((word, wordIndex) => <Fragment key={`${word}${wordIndex}`}><span className="landing-title-mask"><span className="landing-title-word" style={{ "--word-index": firstWordIndex + wordIndex } as React.CSSProperties}>{word}</span></span>{wordIndex < words.length - 1 ? " " : null}</Fragment>)}</span>;
        })}</h1><p>{current.copy}</p><Link to="/rooms" className="landing-hero-cta">Explore farm rooms <ArrowRight size={16} /></Link></div>
        <div className="landing-rail">
          <span className="landing-ring ring-one" /><span className="landing-ring ring-two" />
          {SLIDES.map((item, index) => <button key={item.thumb} style={{ "--thumb-index": index } as React.CSSProperties} onClick={() => changeSlide(index)} className={`landing-thumb ${index === slide ? "active" : ""}`} aria-label={`Show ${item.heading}`}><img src={item.thumb} alt="" /></button>)}
        </div>
        <div className="landing-caption" key={`caption${slide}`}><span /><div><h2>{current.heading}</h2><p>{current.copy}</p></div></div>
        <div className="landing-slide-counter"><button onClick={() => changeSlide((slide + 2) % 3)} aria-label="Previous slide"><ChevronLeft size={17} /></button><span>0{slide + 1}<i />03</span><button onClick={() => changeSlide((slide + 1) % 3)} aria-label="Next slide"><ChevronRight size={17} /></button></div>
        <div className="landing-clouds" aria-hidden="true"><img src={CLOUD_IMAGE} /><img src={CLOUD_IMAGE} /></div>
        <div className="landing-bottom-fade" />

        <form className="landing-search" onSubmit={searchRooms}>
          <button type="button" className="landing-search-field landing-destination" onClick={() => { setDatesOpen(false); setGuestsOpen(false); }}><MapPin size={17} /><span><b>Farm</b><small>Trinity Integrated Farms</small></span><ChevronDown size={14} /></button>
          <button type="button" className={`landing-search-field ${datesOpen ? "chosen" : ""}`} onClick={() => { setDatesOpen(!datesOpen); setGuestsOpen(false); }}><CalendarDays size={17} /><span><b>Rental starts</b><small>{checkIn ? format(checkIn, "MMM d") : "Choose date"}</small></span></button>
          <button type="button" className="landing-search-field" onClick={() => { setDatesOpen(!datesOpen); setGuestsOpen(false); }}><CalendarDays size={17} /><span><b>Rental ends</b><small>{checkOut ? format(checkOut, "MMM d") : "Choose date"}</small></span></button>
          <button type="button" className="landing-search-field" onClick={() => { setGuestsOpen(!guestsOpen); setDatesOpen(false); }}><PiggyBank size={18} /><span><b>Herd size</b><small>{herdSize} {herdSize === 1 ? "pig" : "pigs"}</small></span></button>
          <button className="landing-search-submit" type="submit" aria-label="Find rooms"><Search size={18} /></button>

          {datesOpen && <div className="landing-popover landing-calendar">
            <header><button type="button" aria-label="Previous month" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft size={16} /></button><strong>{format(month, "MMMM yyyy")}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} /></button></header>
            <div className="calendar-grid calendar-weekdays">{"MTWTFSS".split("").map((day, index) => <span key={`${day}${index}`}>{day}</span>)}</div>
            <div className="calendar-grid">{Array.from({ length: firstDayOffset }, (_, index) => <i key={`blank${index}`} />)}{days.map((day) => { const selected = (checkIn && isSameDay(day, checkIn)) || (checkOut && isSameDay(day, checkOut)); return <button type="button" key={day.toISOString()} className={selected ? "selected" : ""} onClick={() => chooseDay(day)}>{format(day, "d")}</button>; })}</div>
          </div>}
          {guestsOpen && <div className="landing-popover landing-guests"><div><span><b>Pigs in herd</b><small>Approximate room capacity</small></span><div className="landing-stepper"><button type="button" onClick={() => setHerdSize(Math.max(1, herdSize - 1))}><Minus size={13} /></button><b>{herdSize}</b><button type="button" onClick={() => setHerdSize(herdSize + 1)}><Plus size={13} /></button></div></div><button className="landing-popover-done" type="button" onClick={() => setGuestsOpen(false)}>Done</button></div>}
        </form>
        <span className="landing-scroll-note">SCROLL TO EXPLORE <ArrowRight size={14} /></span>
        <span className="landing-photo-credit">ILLUSTRATIVE IMAGE</span>
      </section>

      <section className="landing-stays" id="rooms">
        <div className="landing-stays-heading"><div><span className="landing-eyebrow-dark">ROOM FOR YOUR NEXT STEP</span><h2>Find the space to grow</h2></div><Link to="/rooms" className="landing-see-all">See all rooms <ArrowRight size={15} /></Link></div>
        <div className="landing-room-grid">{ROOMS.map((room, index) => <article className="landing-room-card" key={room.id} style={{ "--card-index": index } as React.CSSProperties}>
          <button className="landing-room-photo" onClick={(event) => openRoom(room, event.currentTarget)} aria-label={`View ${room.name}`}><img src={room.photo} alt={room.description} loading="lazy" /><span className="landing-room-tag">Room details</span></button>
          <button className={`landing-heart ${favorites.includes(room.id) ? "liked" : ""}`} onClick={() => toggleFavorite(room.id)} aria-label={favorites.includes(room.id) ? "Remove from saved rooms" : "Save room"}><Heart size={16} fill={favorites.includes(room.id) ? "currentColor" : "none"} /></button>
          <button className="landing-room-info" onClick={(event) => openRoom(room, event.currentTarget)}><strong>{room.name}</strong><span><MapPin size={12} /> Trinity Integrated Farms</span><small>{room.description}</small></button>
        </article>)}</div>
      </section>

      <section className="landing-services" id="services"><div><span className="landing-eyebrow-dark">ROOM TO FARM, SUPPORT TO GROW</span><h2>Good space.<br /><em>More peace of mind.</em></h2><p>Browse managed pig rooms, request the dates you need, and ask about optional feeding or cleaning support. The farm team will confirm the details with you.</p><Link to="/rooms" className="landing-dark-button">Browse rooms <ArrowRight size={15} /></Link></div><div className="landing-service-points"><article><PiggyBank /><b>Rooms for your herd</b><p>Review room capacity and monthly pricing before you request a stay.</p></article><article id="monitoring"><Camera /><b>Check in remotely</b><p>Private camera access is intended for rooms during your rental.</p></article><article><ShieldCheck /><b>Request with confidence</b><p>Confirm availability and payment arrangements with the farm team.</p></article></div></section>

      <footer className="landing-footer"><Link to="/" className="landing-brand">Trinity Integrated Farms</Link><span>Space to farm. Confidence to grow.</span><div><Link to="/rooms">Browse rooms</Link><Link to={accountHref}>{user ? "Dashboard" : "Sign in"}</Link><Link to="/signup">Partner with us</Link></div></footer>

      {selectedRoom && <div className="landing-detail-backdrop" onClick={closeRoom} role="presentation"><section className="landing-detail" onClick={(event) => event.stopPropagation()} aria-label={`${selectedRoom.name} details`}>
        <button className="landing-detail-close" onClick={closeRoom} aria-label="Close room details"><X size={20} /></button>
        <div className="landing-detail-band" />
        <div className="landing-detail-content"><div className="landing-breadcrumb"><button onClick={closeRoom}>Home</button><span>›</span><span>Farm rooms</span><span>›</span><span>{selectedRoom.name}</span></div>
          <div className="landing-detail-columns"><div><img className={`landing-detail-image ${flight && !flightLanded ? "is-flight-pending" : ""}`} src={selectedRoom.photo} alt={selectedRoom.description} /><div className="landing-detail-thumbs"><img src="/farm-images/pig-room.jpg" alt="Illustrative pig room photo" /><img src="/farm-images/piglets.jpg" alt="Illustrative piglets photo" /><img src="/farm-images/pig-group.jpg" alt="Illustrative pig group photo" /></div></div>
            <div className="landing-detail-copy"><h2>{selectedRoom.name}</h2><div className="landing-host"><CircleUserRound size={23} /><span>Managed by <b>Trinity Integrated Farms</b></span></div><h3>About this farm room</h3><p>{selectedRoom.description}. Browse capacity and availability in the room catalog, then send a rental request. The farm team can confirm dates, monthly pricing, and available care services.</p><div className="landing-detail-booking"><strong>Rental details</strong><div><span>Rental dates</span><b>{checkIn ? format(checkIn, "MMM d") : "Select dates"} – {checkOut ? format(checkOut, "MMM d, yyyy") : "Choose end date"}</b></div><div><span>Herd size</span><b>{herdSize} {herdSize === 1 ? "pig" : "pigs"}</b></div><Link to="/rooms" className={`landing-book ${booked ? "is-booked" : ""}`} onClick={(event) => { if (!booked) { event.preventDefault(); setBooked(true); } }}>{booked ? "Request started ✓" : "Request this room"}</Link></div><div className="landing-detail-amenities"><h3>FarmRent features</h3>{AMENITIES.map(([Icon, text]) => <span key={text}><Icon size={16} />{text}</span>)}</div></div></div>
        </div>
      </section>{flight && !flightLanded && <img className="landing-flight-photo" src={flight.photo} style={{ left: flight.rect.left, top: flight.rect.top, width: flight.rect.width, height: flight.rect.height }} alt="" aria-hidden="true" />}</div>}
    </main>
  );
}
