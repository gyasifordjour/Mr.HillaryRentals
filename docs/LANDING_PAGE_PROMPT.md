# FarmRent: Scroll Fly-In Landing Page (recreation prompt)

Build the public landing page (route `/`) for **FarmRent**, a platform where farmers rent individual pig rooms on a managed farm in Ghana and watch their pigs live on camera. The page is one long pinned scroll story followed by a white section.

The story has five beats:

1. **Hero:** a misty dawn sky over a large pig house on green farmland, with the headline "Rent a Pig Room. Watch It Live." Foreground grass and crops sit in front of the bottom of the headline letters.
2. **Fly-in:** scrolling scrubs a cinematic video in which the camera pushes from the farm gate toward the pig house, passes through the doorway and lands at eye level inside a clean room facing a ceiling-mounted camera. The vision statement resolves out of blur mid-flight.
3. **Inside the room:** a paragraph writes in word by word and four amber hotspots pop up on the room. A light morning mist rolls in from the left to keep the sky behind the text clean.
4. **Live monitoring:** a heading, a glass "Live camera" card with a status indicator and a drawing activity sparkline, and a five-row feature list.
5. **Services and pricing:** a white rounded panel slides up with a heading, three tilting image cards and four count-up stats.

Implementation choice: build it as a React + TypeScript + Tailwind page at `src/pages/public/LandingPage.tsx`, with the scroll logic in a hook `src/hooks/useScrollStory.ts` (one `requestAnimationFrame` loop, no animation libraries). All timings and values below stay exact. Use plain CSS for the effects Tailwind cannot express (masks, keyframes, backdrop filters) in `src/styles/landing.css`.

---

## 1. Page basics

- Title `FarmRent: Rent a Pig Room, Watch It Live`.
- **Fonts:** Inter Tight 400/500/600 and JetBrains Mono 400/500 via Google Fonts (preconnect to fonts.googleapis.com and fonts.gstatic.com).
- **CSS variables on `:root`:**
  - `--ink:#1e2b1c`, `--ink2:#3d4f38`
  - `--mist:#ece9e2`, `--paper:#f7f5f0`
  - `--accent:#f2b84b`, `--accent2:#d99a1f`
  - `--glass:rgba(247,245,240,.16)`, `--line:rgba(255,255,255,.28)`
  - `--sans:"Inter Tight","Helvetica Neue",Arial,sans-serif`
  - `--mono:"JetBrains Mono",ui-monospace,Menlo,monospace`
- Reset: `box-sizing:border-box; margin:0; padding:0`. Body background `--mist`, font `--sans`, colour `--ink`, antialiased, `overflow-x:hidden`. Links inherit colour, no underline.
- `.mono`: mono, uppercase, letter-spacing .14em, 11px.
- `.chip`: inline-flex, centred, height 22px, padding 0 9px, background `--accent`, colour `--ink`, radius 3px, mono 10.5px, letter-spacing .16em, uppercase.

## 2. Assets (replace with real files)

Put real files in `public/landing/`. The client should supply real farm photos and video; generated images are a fallback and must never be passed off as the real farm.

1. `flyin.mp4`: 5 s, 24 fps, 1920×1080, no audio. The camera starts outside the farm at dawn, pushes toward the pig house, goes through the doorway and lands at eye level in a clean pig room facing a ceiling camera.
2. `hero-still.webp`: frame 0 of the video at 2688×1520.
3. `hero-cutout.webp`: transparent cut-out of the pig house only (no sky, no side scenery).
4. `room-landscape.webp`: the final frame, the interior of a room. Used for two cards.
5. `farm-exterior.webp`: a wide shot of the farm. Used for the middle card.

If the video is not ready yet, fall back to scrubbing between `hero-still.webp`, a mid-flight still and `room-landscape.webp` with crossfades over the same scroll ranges.

## 3. Navigation (fixed)

- Fixed top, z-index 50, three-column grid `1fr auto 1fr`, padding 22px 34px.
- **Logo (left):** Inter Tight 600, 21px, letter-spacing -.02em, text "FarmRent", with a 26×26 icon: a hexagon in currentColor plus an amber `#f2b84b` leaf on top (same paths as a simple hexagon-and-leaf mark).
- **Menu (centre):** "Rooms", "How it works", "Services", "Contact". Each mono 11.5px, letter-spacing .14em, uppercase, 30px gap. Hover colour `--accent2`. Each scrolls to its section.
- **Right:** "LOGIN" in mono 11.5px, letter-spacing .16em, with a 12px gap before a 20×20 amber square (radius 3px) holding "›". Links to `/login`. On hover the square shifts 3px right (.3s).

## 4. Scroll story structure

- **`#story`:** position relative, height **640vh**.
- **Stage:** sticky top 0, height 100vh, overflow hidden, background `#dfe3e0`. Stacking order:
  1. **Camera box `.cam`:** absolute, inset `-9% -3% -3%`, `will-change:transform`. Contains a `<canvas id="cv">`, the hero still as `<img class="plate">` (cover, above the canvas), and a `.mist` div (two soft white radial gradients, "drift" animation 18 s ease-in-out infinite alternate).
  2. Hidden `<video id="push">` (`muted playsinline preload="auto"`, 2×2px, opacity 0).
  3. **Mist bank `.fog`** (section 8).
  4. **Layer L0:** hero headline block.
  5. **Front cut-out `.cam.camF`:** same inset, holds the cut-out image with `object-fit:cover`, masked horizontally with `linear-gradient(90deg, transparent 20%, #000 24%, #000 76%, transparent 80%)`. Starts hidden.
  6. **Layers L1** (hero HUD, caption, scroll hint), **L2** (vision), **L3** (room paragraph and hotspots), **L4** (live monitoring).
  7. **Progress bar `.prog`:** centred at bottom 22px, 120×2px, background `rgba(30,43,28,.18)`, inner bar `--accent2` with `scaleX(progress)`.
- Every `.layer`: absolute inset 0, `pointer-events:none`, children `pointer-events:auto`.

## 5. Video frame cache and canvas scrubbing

The clip is never seeked live. It plays once on load while every frame is cached as a JPEG blob, then the canvas draws cached frames by scroll position.

- `FPS=24`. On `loadeddata`: `NF=max(2, round(duration*24))`, `frames=new Array(NF)`, offscreen grab canvas 1600×900.
- **Frame 0 first:** draw the video into the grab canvas and `toBlob` as `image/jpeg` quality .9 into `frames[0]`, then call drawWant.
- **With `requestVideoFrameCallback`:** `i=min(NF-1, round(mediaTime*24))`. If `i>0` and not cached, store a JPEG blob at quality .86. Re-register until the video ends, starting with `play()`.
- **Fallback (no rVFC):** step `currentTime=min(i/24, duration-.01)` for i=0…NF-1, grabbing on each `seeked`.
- **Canvas size:** `clientWidth × clientHeight × min(devicePixelRatio, 1.5)`, recomputed on resize.
- **drawWant():** find the nearest cached frame to `want`, search outward ±k, `createImageBitmap(blob)`, draw cover-fitted and centred using `max(cw/bw, ch/bh)`, close the bitmap, repeat if the target changed.

## 6. Fly-past details (optional)

Skip the floating rocks from the original. If the video has hay, birds or dust passing the lens, nothing extra is needed in code.

## 7. Hero (L0 and L1)

- **Headline block `.hero-copy`:** absolute, left and right 0, centred.
  - Chip "Pig housing rental".
  - `h1`: one masked line "Rent a Pig Room. Watch It Live." Inter Tight 500, line-height .92, letter-spacing -.045em, margin-top 18px, colour ink. The line wrapper is `display:block; overflow:hidden; padding-bottom:.06em; white-space:nowrap`. The inner span starts at `translateY(105%)` and animates "rise" to none over 1.1 s with `cubic-bezier(.2,.8,.2,1)`.
  - Two buttons under it: "Browse rooms" (amber, links to `/rooms`) and "Login" (glass outline, links to `/login`).
- **Placement (layoutHero, on load, resize and `document.fonts.ready`):** foreground grass tips must sit on the lower half of the letters.
  1. `bw=W*1.06`, `bh=H*1.12`, `k=max(bw/1600, bh/900)`.
  2. `fernTop = -.09H + (bh - 900k)/2 + 245k + .06H`. Adjust the 245 to wherever the foreground tips sit in the real still.
  3. `fs=min(104, 72k)` px; if the line is wider than 86% of the viewport, scale down to fit.
  4. Block top = `fernTop + .5*fs - blockHeight`.
  - Below 821px wide, clear inline values, allow wrapping and use CSS (top 12.5vh, size `clamp(40px,6vw,96px)`).
- **HUD (L1):** absolute at left 53.5%, top 62%, over the pig house. A white 22px crosshair 44px to its left. A chip "Room 03". A `pre` in mono 11px, letter-spacing .12em, line-height 1.65, white with soft shadow: `CAPACITY 15 PIGS` / `CAMERA ONLINE` / `STATUS AVAILABLE`. Thin 14px corner ticks around it.
- **Caption (bottom-left):** 2px amber left border, mono 11.5px, line-height 1.75, letter-spacing .13em, uppercase, ink2: "Rent only the space you need. / Optional feeding and cleaning. / Your own live camera."
- **Scroll hint (bottom-right):** "SCROLL TO EXPLORE" with a 20px circle and a chevron that nudges 2px every 1.6 s.

## 8. Mist bank

Keeps the sky behind the left-hand copy clean.

- Absolute at left -8vw, top -6vh, 56vw × 60vh, hidden until needed.
- Mask: `radial-gradient(ellipse 52% 48% at 46% 46%, #000 44%, rgba(0,0,0,.7) 64%, transparent 100%)`.
- Three stacked layers: a base soft grey radial gradient (blur 10px), and two animated noise textures (SVG feTurbulence data URIs, opacity .55 and .9, blur 14px and 8px, "fogA" 26 s and "fogB" 19 s alternate drifts). Sample the grey from the real still's sky.
- Per frame: `fg=ease(seg(sp,.38,.47))`; transform `translate3d((fg-1)*18 + sx*-10 vw, sy*-6 px, 0)`.

## 9. Vision (L2)

- Centred block, width `min(820px,90vw)`, white, centred.
- Chip "Why FarmRent".
- h2, each word in its own inline-block span: "No Barn to Build," / "Just Rent a Room" / "and Watch It Live" (line breaks after the first two). Inter Tight 500, `clamp(34px,4.6vw,70px)`, line-height 1, letter-spacing -.04em, margin 18px 0 20px, soft dark shadows for legibility.
- Paragraph, 16px: "Farm rooms for rent, with your own camera, / so you can check on your pigs from anywhere."
- Per frame: `vIn=seg(sp,.16,.27)`, `vOut=seg(sp,.34,.42)`. Word i gets `k=clamp(vIn*1.6 - i*.08)`: translate `(1-k)*30 - vOut*60 px`, blur `(1-k)*12 + vOut*14 px`, opacity `k*(1-vOut)`. Chip and paragraph: opacity `clamp(vIn*2-.6)*(1-vOut)`, lift `-vOut*50px`.

## 10. Room paragraph and hotspots (L3)

- **Paragraph `.acct`:** left 34px, top 14vh, width `min(560px,86vw)`, ink, `clamp(20px,1.9vw,29px)`, line-height 1.16, letter-spacing -.02em, soft white halo. Text split into word spans: "Every room is rented on its own, with a clear price, a set capacity and a camera of its own, so you only pay for the space you use."
- **Four hotspots** (relative to the stage):
  - left 12%, top 58%: "Capacity", value "10–20 pigs"
  - left 33%, top 41%: "Camera", value "Live 24/7"
  - left 70%, top 66%: "Water & drainage", value "Included"
  - left 83%, top 47%: "Services", value "Optional"
  (Confirm real values with the client before launch.)
- **Anatomy:** 22px amber circle dot with an ink plus, pinging every 2.4 s. Label is a glass pill (mono 10.5px, uppercase, padding 6px 9px, radius 4px, background `rgba(247,245,240,.72)`, blur 8px). Value sits in a hidden `em` (colour `#8a5a00`) that expands to 20px on hover or `.on`. Click toggles `.on`, one at a time.
- **Per frame:** `aIn=seg(sp,.45,.55)`, `aOut=seg(sp,.63,.68)`. Word i: `k=clamp(aIn*2.2 - i/count*1.2)`, opacity `(.15+.85k)*(1-aOut)`, blur `(1-k)*6 + aOut*10 px`. Hotspot i: `k=seg(sp, .49+i*.02, .53+i*.02)`, transform `translate3d(sx*-30px, sy*-20px, 0) scale(k*(1-aOut))`.

## 11. Live monitoring (L4)

- **Heading `.cred`:** left 34px, top 13vh, max-width 380px, ink, `clamp(22px,2vw,30px)`, line-height 1.08, letter-spacing -.025em. Amber mono label above: "✕ Live monitoring". Heading: "See your pigs any time, from your phone".
- **Camera card:** left 38%, top 38vh, 250px wide, padding 18px, radius 10px, background `rgba(40,58,44,.32)`, border `1px rgba(255,255,255,.22)`, `backdrop-filter: blur(16px) saturate(1.2)`, white text.
  - h4 "Live camera / Room 03" (15px, 500).
  - Mono 9.5px note at opacity .7: "Your rented room".
  - Big number counting 0 → 24 (46px, 500) followed by mono 10px "HRS / DAY" (decorative; it reads as 24-hour viewing).
  - Amber tag "● ONLINE" at right 16px, top 96px.
  - 220×70 SVG sparkline (amber 1.6px polyline `0,60 30,55 60,57 90,44 120,46 150,30 180,24 214,10`, white dots at (90,44) and (150,30), amber dot at (214,10)). It is decorative, not real data; do not label it as a measurement.
  - Mono footer "MON · TUE · WED · THU".
- **Feature list `.feats`:** right 34px, top 30vh, width `min(400px,36vw)`, padding 6px 16px, radius 10px, background `rgba(247,245,240,.62)`, blur 14px. Rows are a grid `30px 1fr 16px`, 8px gap, padding 11px 0, 1px bottom rule `rgba(30,43,28,.14)`, mono 11px, letter-spacing .12em, uppercase:
  - 01 Your own camera in every room
  - 02 Only you see your rooms
  - 03 Works on phone and computer
  - 04 Access starts and ends with your rental
  - 05 Pay with Mobile Money or card
  Hover or `.on`: colour `#8a5a00`, 6px extra left padding, arrow moves 4px right.
- **Per frame:** `sIn=seg(sp,.72,.82)` for the heading (opacity, rise `(1-sIn)*30px`, blur `(1-sIn)*8px`). `cIn=ease(seg(sp,.74,.86))` for the card (opacity; transform `translate3d(sx*-14px, (1-cIn)*60 + sy*-10 px, 0) rotateY(sx*8deg) rotateX(-sy*8deg)`). Number `round(24*seg(sp,.76,.9))`. Sparkline dashoffset full length → 0 over `seg(sp,.77,.92)`. Row i: `k=ease(seg(sp,.76+i*.025,.82+i*.025))`, opacity k, `translateX((1-k)*40px)`.

## 12. Per-frame scroll controller

One rAF loop drives everything (put it in `useScrollStory`).

- `seg(p,a,b)=clamp((p-a)/(b-a))`; `ease` is cubic in-out (`t<.5 ? 4t³ : 1-(-2t+2)³/2`).
- Raw `p = clamp(-storyRect.top / (story.offsetHeight - innerHeight))`. Smoothed `sp += (p-sp)*(1-.86^(dt/16.7))`, dt capped at 64ms, snap when within .0002.
- Pointer `mx,my` = position / viewport - .5; smoothed `sx,sy` follow at 6% per frame.
- **Video:** `vp=ease(seg(sp,.05,.70))`, `want=round(vp*(NF-1))`, then drawWant.
- **Camera:** `.cam` and `.camF` get `translate3d(-sx*18px, -sy*12 + (1-vp)*innerHeight*.06 px, 0) scale(1+.02*(1-vp))`.
- **Hand-off:** `ho = shown<0 ? 0 : (shown===0 ? seg(sp,.06,.105) : 1)`. The plate and the cut-out get opacity `1-ho` and hide at 0. Both dissolve into the identical frame 0 while the headline blurs out.
- **Hero copy:** `h=seg(sp,.02,.1)`. Headline: `translate3d(-sx*10px, -h*80 - sy*6 px, 0) scale(1+h*.12)`, blur `h*14px`, opacity `1-h`. HUD: `translate3d(sx*26px, sy*18 - h*40 px, 0)`, opacity `1-seg(sp,.02,.08)`. Caption and hint: opacity `1-seg(sp,.01,.05)`. L0 and L1 hide when h reaches 1.
- Other layers hide (`visibility:hidden`) whenever their amount is 0. Progress bar `scaleX(sp)`.
- Respect `prefers-reduced-motion`: skip the scrub and show the stills with a simple fade between beats.

## 13. Services and pricing section

- **Panel `#sol`:** relative, z-index 5, margin-top **-30vh**, white, radius 22px 22px 0 0, padding 70px 34px 90px, shadow `0 -30px 60px rgba(30,43,28,.12)`.
- **Head:** flex row (space-between, bottom aligned, 40px gap, wraps).
  - Left: chip "Rooms & services", h2 "Rent the space. Add the help you need." (Inter Tight 500, `clamp(34px,3.9vw,58px)`, line-height 1, -.04em, max-width 640px).
  - Right: 15px paragraph (max-width 360px, `#4a5a4f`): "Rent one room or several under a single agreement. Look after your pigs yourself, or ask the farm to feed, clean and supervise for you."
- **Cards:** three columns, 14px gap, margin-top 54px, each 440px tall, radius 12px, overflow hidden, base `#1f2e1c`, white text. Background image div scales 1.07 on hover (1.2 s). Overlay `linear-gradient(180deg, rgba(10,25,15,.45), transparent 35%, transparent 55%, rgba(10,25,15,.75))`. Top row: mono bracket label and a 28px amber circle with "→" that rotates -45deg on hover. Bottom: h3 (25px, 500) and a 13.5px paragraph that opens from 0 to 80px on hover. Tilt on pointermove: `perspective(1000px) rotateY(x*6deg) rotateX(-y*6deg)`, reset on leave.
  - **Card 1:** `room-landscape.webp`. Label "[Room rental]". Title "Rent a room, / not a farm". Body: "Choose a room that fits your pigs, pick your dates and rent it on its own."
  - **Card 2:** `farm-exterior.webp`. Label "[Farm services]". Title "Feeding, cleaning / and supervision". Body: "Optional help from the farm team when you cannot be there yourself."
  - **Card 3:** `room-landscape.webp` at a different crop. Label "[Live camera]". Title "Your pigs, / on your phone". Body: "Watch your rented rooms live. Access starts when your rental starts and ends when it ends."
- **Stats:** four columns, margin-top 60px, top rule `1px #e0e5e0`, cells padded 22px on top. Numbers 44px, 500, -.04em; labels mono 10.5px, .14em, uppercase, `#6a7a6f`. Use **real figures from the client**; until then show clearly marked placeholders such as "[X]" and do not publish invented numbers. Suggested labels: "Rooms available", "Cameras installed", "Farmers on the platform", "Live viewing". Count-up from 0 over 1.6 s with the cubic in-out ease the first time the panel's top passes 60% of the viewport height.

## 14. Closing sections (after the white panel)

- **How it works:** four steps in a row: 1 Browse rooms, 2 Send a rental request, 3 Pay with Mobile Money or card, 4 Move in and watch live.
- **FAQ:** accordion with 5–6 questions (what is included, how long a rental lasts, payment methods, who can see my camera, what if the camera goes offline). Answers must be confirmed by the client.
- **Contact:** phone, WhatsApp link and location, plus a short enquiry form (name, phone number, message) that posts to a Supabase table later.
- **Footer:** logo, nav links, Login link, copyright.

## 15. Responsive (≤820px)

- Nav padding 16px 18px; menu hidden, Login stays.
- Headline wraps. HUD moves to 50%/66%. Caption at left and right 18px, bottom 70px. Hint at right 18px, bottom 24px.
- Live monitoring: heading left 18px, top 11vh, max-width 80vw; card left 18px, bottom 6vh, 210px wide; feature list right 18px, bottom 6vh, 45vw wide, 9.5px text, arrows hidden.
- Solutions: padding 50px 18px 70px, one-column cards 340px tall, two-column stats.
- Test on a mid-range Android phone on mobile data: serve a 720p video variant and smaller stills below 820px, and lazy-load everything below the pinned story.

## 16. Route wiring

- Add `/` as the public landing page in `src/app/routes.tsx`.
- "Login" goes to `/login`; "Browse rooms" goes to the public rooms page.
- If a logged-in user opens `/`, show the same page with a "Go to dashboard" button in place of "Login".
