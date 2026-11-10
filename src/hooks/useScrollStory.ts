import { useEffect, type RefObject } from "react";
import { GRASS_Y } from "@/pages/public/LandingScenes";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const FPS = 24;
const VIDEO_SRC = "/landing/flyin.mp4";

type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
};

/**
 * Drives the pinned scroll story on the landing page.
 * Uses the cached-frame video scrub when /landing/flyin.mp4 exists,
 * otherwise crossfades the built-in placeholder scenes.
 */
export function useScrollStory(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
    const $$ = <T extends HTMLElement = HTMLElement>(s: string) => Array.from(root.querySelectorAll<T>(s));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const story = $("#story");
    const cam = $("#cam");
    const camF = $("#camF");
    const plate = $<HTMLImageElement>("#plate");
    const cutout = $<HTMLImageElement>("#cutout");
    const canvas = $<HTMLCanvasElement>("#cv");
    const video = $<HTMLVideoElement>("#push") as VideoWithRVFC;
    const fog = $("#fog");
    const sc = [$("#sc0"), $("#sc1"), $("#sc2")];
    const L0 = $("#L0"), L1 = $("#L1"), L2 = $("#L2"), L3 = $("#L3"), L4 = $("#L4");
    const heroCopy = $("#heroCopy");
    const heroH1 = $("#heroH1");
    const hud = $("#hud");
    const cap = $("#cap");
    const cta = $("#cta");
    const hint = $("#hint");
    const vchip = $("#vchip");
    const vpara = $("#vpara");
    const vw = $$(".vw");
    const aw = $$(".aw");
    const hs = $$(".hs");
    const cred = $("#cred");
    const card = $("#card");
    const num = $("#num");
    const spark = $<SVGPolylineElement & HTMLElement>("#spark") as unknown as SVGPolylineElement;
    const rows = $$(".frow");
    const prog = $("#prog");
    const sol = $("#sol");
    const statEls = $$<HTMLElement>("#stats b");
    const cards = $$(".card");

    const ctx = canvas.getContext("2d")!;
    const sparkLen = spark.getTotalLength();
    spark.style.strokeDasharray = String(sparkLen);
    spark.style.strokeDashoffset = String(sparkLen);

    /* ---------- video frame cache ---------- */
    let NF = 0;
    let frames: (Blob | undefined)[] = [];
    let cached = 0;
    let shown = -1;
    let busy = false;
    let want = 0;
    let videoMode = false;
    const grab = document.createElement("canvas");
    grab.width = 1600;
    grab.height = 900;
    const gctx = grab.getContext("2d")!;
    let disposed = false;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      shown = -1;
      void drawWant();
    };

    const nearest = (w: number) => {
      for (let k = 0; k < NF; k++) {
        if (frames[w - k]) return w - k;
        if (frames[w + k]) return w + k;
      }
      return -1;
    };

    const drawBitmap = (bmp: ImageBitmap) => {
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / bmp.width, ch / bmp.height);
      const dw = bmp.width * s, dh = bmp.height * s;
      ctx.drawImage(bmp, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    async function drawWant() {
      if (busy || !videoMode || NF === 0) return;
      busy = true;
      try {
        let t = nearest(want);
        while (t >= 0 && t !== shown && !disposed) {
          const blob = frames[t]!;
          const bmp = await createImageBitmap(blob);
          drawBitmap(bmp);
          shown = t;
          bmp.close();
          t = nearest(want);
        }
      } finally {
        busy = false;
      }
    }

    const store = (i: number, quality: number) => {
      gctx.drawImage(video, 0, 0, 1600, 900);
      grab.toBlob(
        (b) => {
          if (b && !frames[i]) {
            frames[i] = b;
            cached++;
            if (i === want || shown < 0) void drawWant();
          }
        },
        "image/jpeg",
        quality
      );
    };

    const onLoaded = () => {
      if (reduce || !video.duration || !isFinite(video.duration)) return;
      NF = Math.max(2, Math.round(video.duration * FPS));
      frames = new Array(NF);
      videoMode = true;
      root.classList.add("has-video");
      resizeCanvas();
      store(0, 0.9);

      if (video.requestVideoFrameCallback) {
        const cb = (_now: number, meta: { mediaTime: number }) => {
          const i = Math.min(NF - 1, Math.round(meta.mediaTime * FPS));
          if (i > 0 && !frames[i]) store(i, 0.86);
          if (!video.ended && !disposed) video.requestVideoFrameCallback!(cb);
        };
        video.requestVideoFrameCallback(cb);
        video.play().catch(() => undefined);
      } else {
        let k = 0;
        const step = () => {
          if (k >= NF || disposed) return;
          video.currentTime = Math.min(k / FPS, video.duration - 0.01);
        };
        video.addEventListener("seeked", () => {
          if (k >= NF) return;
          store(k, k === 0 ? 0.9 : 0.86);
          k++;
          step();
        });
        step();
      }
    };

    if (!reduce) {
      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.src = VIDEO_SRC;
      video.load();
    }

    /* ---------- hero layout ---------- */
    const layoutHero = () => {
      const W = window.innerWidth, H = window.innerHeight;
      if (W <= 820) {
        heroCopy.style.top = "";
        heroH1.style.fontSize = "";
        return;
      }
      const bw = W * 1.06, bh = H * 1.12;
      const k = Math.max(bw / 1600, bh / 900);
      const fernTop = -0.09 * H + (bh - 900 * k) / 2 + GRASS_Y * k + 0.06 * H;
      let fs = Math.min(104, 72 * k);
      heroH1.style.fontSize = fs + "px";
      const line = heroH1.querySelector<HTMLElement>(".hline > span")!;
      const lw = line.getBoundingClientRect().width;
      if (lw > W * 0.86) {
        fs *= (W * 0.86) / lw;
        heroH1.style.fontSize = fs + "px";
      }
      heroCopy.style.top = fernTop + 0.5 * fs - heroCopy.offsetHeight + "px";
    };

    const onResize = () => {
      layoutHero();
      if (videoMode) resizeCanvas();
    };
    window.addEventListener("resize", onResize);
    layoutHero();
    void document.fonts?.ready.then(layoutHero);

    /* ---------- pointer + interactions ---------- */
    let mx = 0, my = 0, sx = 0, sy = 0;
    const onPointer = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onPointer);

    const cleanups: (() => void)[] = [];
    const exclusive = (els: HTMLElement[]) => {
      els.forEach((el) => {
        const h = () => {
          const was = el.classList.contains("on");
          els.forEach((o) => o.classList.remove("on"));
          if (!was) el.classList.add("on");
        };
        el.addEventListener("click", h);
        cleanups.push(() => el.removeEventListener("click", h));
      });
    };
    exclusive(hs);
    exclusive(rows);

    cards.forEach((c) => {
      const move = (e: PointerEvent) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      };
      const leave = () => (c.style.transform = "");
      c.addEventListener("pointermove", move);
      c.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        c.removeEventListener("pointermove", move);
        c.removeEventListener("pointerleave", leave);
      });
    });

    /* ---------- helpers ---------- */
    const fx = (el: HTMLElement, o: number, t?: string, b?: number) => {
      el.style.opacity = String(o);
      if (t !== undefined) el.style.transform = t;
      if (b !== undefined) el.style.filter = b > 0.05 ? `blur(${b}px)` : "none";
    };
    const hide = (el: HTMLElement, h: boolean) => {
      el.style.visibility = h ? "hidden" : "visible";
    };

    /* ---------- stats count-up ---------- */
    let statsStarted = false;
    const startStats = () => {
      statsStarted = true;
      const t0 = performance.now();
      const run = (now: number) => {
        const t = ease(clamp((now - t0) / 1600));
        statEls.forEach((el) => {
          const raw = el.dataset.target;
          if (raw === undefined || raw === "") return;
          const target = parseFloat(raw);
          const dec = parseInt(el.dataset.dec || "0", 10);
          const val = target * t;
          el.textContent = dec > 0 ? val.toFixed(dec) : Math.round(val).toLocaleString("en-US");
        });
        if (t < 1 && !disposed) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    };

    /* ---------- main loop ---------- */
    let sp = 0;
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const H = window.innerHeight;

      const rect = story.getBoundingClientRect();
      const p = clamp(-rect.top / Math.max(1, story.offsetHeight - H));
      if (reduce) sp = p;
      else {
        sp += (p - sp) * (1 - Math.pow(0.86, dt / 16.7));
        if (Math.abs(p - sp) < 0.0002) sp = p;
      }
      sx += (mx - sx) * 0.06;
      sy += (my - sy) * 0.06;

      // video / scenes
      const vp = ease(seg(sp, 0.05, 0.7));
      if (videoMode) {
        want = Math.round(vp * (NF - 1));
        void drawWant();
      } else {
        const o1 = seg(vp, 0.15, 0.45);
        const o2 = seg(vp, 0.55, 0.85);
        fx(sc[0], 1 - o1, `scale(${1 + seg(vp, 0, 0.5) * 0.6})`);
        fx(sc[1], o1 * (1 - o2), `scale(${1 + seg(vp, 0.2, 0.7) * 0.4})`);
        fx(sc[2], o2, `scale(${1 + seg(vp, 0.5, 1) * 0.12})`);
      }

      // camera parallax
      const camT = `translate3d(${-sx * 18}px, ${-sy * 12 + (1 - vp) * H * 0.06}px, 0) scale(${1 + 0.02 * (1 - vp)})`;
      cam.style.transform = camT;
      camF.style.transform = camT;

      // hand-off between high-res stills / foreground grass and the scrubbed video
      const ho = videoMode ? (shown < 0 ? 0 : shown === 0 ? seg(sp, 0.06, 0.105) : 1) : seg(sp, 0.06, 0.105);
      if (videoMode) {
        plate.style.opacity = String(1 - ho);
        hide(plate, ho >= 1);
      }
      cutout.style.opacity = String(1 - ho);
      camF.style.opacity = String(1 - ho);
      hide(camF, ho >= 1);

      // fog bank
      const fg = ease(seg(sp, 0.38, 0.47));
      fog.style.opacity = String(fg);
      fog.style.transform = `translate3d(${(fg - 1) * 18 + sx * -10}vw, ${sy * -6}px, 0)`;
      hide(fog, fg <= 0);

      // hero
      const h = seg(sp, 0.02, 0.1);
      fx(heroCopy, 1 - h, `translate3d(${-sx * 10}px, ${-h * 80 - sy * 6}px, 0) scale(${1 + h * 0.12})`, h * 14);
      fx(hud, 1 - seg(sp, 0.02, 0.08), `translate3d(${sx * 26}px, ${sy * 18 - h * 40}px, 0)`);
      const capO = 1 - seg(sp, 0.01, 0.05);
      cap.style.opacity = String(capO);
      hint.style.opacity = String(capO);
      cta.style.opacity = String(capO);
      cta.style.pointerEvents = capO < 0.3 ? "none" : "auto";
      hide(L0, h >= 1);
      hide(L1, h >= 1);

      // vision
      const vIn = seg(sp, 0.16, 0.27);
      const vOut = seg(sp, 0.34, 0.42);
      vw.forEach((w, i) => {
        const k = clamp(vIn * 1.6 - i * 0.08);
        fx(w, k * (1 - vOut), `translate3d(0, ${(1 - k) * 30 - vOut * 60}px, 0)`, (1 - k) * 12 + vOut * 14);
      });
      const cpO = clamp(vIn * 2 - 0.6) * (1 - vOut);
      fx(vchip, cpO, `translate3d(0, ${-vOut * 50}px, 0)`);
      fx(vpara, cpO, `translate3d(0, ${-vOut * 50}px, 0)`);
      hide(L2, vIn <= 0 || vOut >= 1);

      // room paragraph + hotspots
      const aIn = seg(sp, 0.45, 0.55);
      const aOut = seg(sp, 0.63, 0.68);
      aw.forEach((w, i) => {
        const k = clamp(aIn * 2.2 - (i / aw.length) * 1.2);
        w.style.opacity = String((0.15 + 0.85 * k) * (1 - aOut));
        w.style.filter = (1 - k) * 6 + aOut * 10 > 0.05 ? `blur(${(1 - k) * 6 + aOut * 10}px)` : "none";
      });
      hs.forEach((el, i) => {
        const k = seg(sp, 0.49 + i * 0.02, 0.53 + i * 0.02);
        el.style.transform = `translate3d(${sx * -30}px, ${sy * -20}px, 0) scale(${k * (1 - aOut)})`;
      });
      hide(L3, aIn <= 0 || aOut >= 1);

      // live monitoring
      const sIn = seg(sp, 0.72, 0.82);
      fx(cred, sIn, `translate3d(0, ${(1 - sIn) * 30}px, 0)`, (1 - sIn) * 8);
      const cIn = ease(seg(sp, 0.74, 0.86));
      fx(
        card,
        cIn,
        `translate3d(${sx * -14}px, ${(1 - cIn) * 60 + sy * -10}px, 0) rotateY(${sx * 8}deg) rotateX(${-sy * 8}deg)`
      );
      num.textContent = String(Math.round(24 * seg(sp, 0.76, 0.9)));
      spark.style.strokeDashoffset = String(sparkLen * (1 - seg(sp, 0.77, 0.92)));
      rows.forEach((r, i) => {
        const k = ease(seg(sp, 0.76 + i * 0.025, 0.82 + i * 0.025));
        fx(r, k, `translateX(${(1 - k) * 40}px)`);
      });
      hide(L4, sIn <= 0);

      prog.style.transform = `scaleX(${sp})`;

      if (!statsStarted && sol.getBoundingClientRect().top < H * 0.6) startStats();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      cleanups.forEach((c) => c());
      video.pause();
      video.removeAttribute("src");
      video.load();
      void cached;
    };
  }, [rootRef]);
}
