/**
 * CarPassport Standalone Neobrutalist Splash Screen
 *
 * Requirements:
 * - Full-viewport overlay, --bg background, highest z-index.
 * - Center content: CarPassport wordmark (--text-display), monospace tagline ("VERIFYING CHAIN STATE...").
 * - Sharp, mechanical GSAP animation (hard translateY snaps with slight overshoot, no soft fades).
 * - Bottom-aligned progress indicator: thick-bordered rectangle filling with --accent-primary.
 * - Fast hard wipe exit (translateY offscreen with power4.in, no crossfade).
 * - Plays once per session via sessionStorage ("splashSeen").
 * - Robust fallback if GSAP is unavailable or errors occur (never blocks the user).
 * - Easy to disable or replay for live demos / grading.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "splashSeen";

  // Check if splash should be bypassed (already seen in this session, or disabled via URL/window flag)
  function shouldSkipSplash() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("splash")) {
        // Explicit force flag for grading/demo
        return false;
      }
      if (params.has("nosplash") || window.DISABLE_SPLASH === true) {
        return true;
      }
      return sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  // Dismiss and clean up splash immediately
  function dismissSplashImmediate() {
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.remove();
    }
    document.documentElement.classList.remove("splash-active");
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors in restricted contexts
    }
    if (window.CarPassportAnimations && window.CarPassportAnimations.animateInitialCards) {
      window.CarPassportAnimations.animateInitialCards();
    }
  }

  // Ensure HTML structure exists
  function ensureSplashMarkup() {
    let splash = document.getElementById("splash-screen");
    if (splash) return splash;

    const overlay = document.createElement("div");
    overlay.id = "splash-screen";
    overlay.className = "splash-overlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="splash-topbar">
        <div class="splash-meta-tag">[SYS] CARPASSPORT // L2-CORE</div>
        <div class="splash-meta-node">CHAIN: POLYGON AMOY [80002]</div>
        <div class="splash-meta-status">NODE: READY</div>
      </div>

      <div class="splash-center">
        <div class="splash-badge">BLOCKCHAIN VEHICLE PASSPORT PROTOCOL</div>
        <h1 class="splash-wordmark" id="splash-wordmark" aria-label="CarPassport">
          <span class="splash-char-slot"><span class="splash-char">C</span></span><span class="splash-char-slot"><span class="splash-char">a</span></span><span class="splash-char-slot"><span class="splash-char">r</span></span><span class="splash-char-slot"><span class="splash-char">P</span></span><span class="splash-char-slot"><span class="splash-char">a</span></span><span class="splash-char-slot"><span class="splash-char">s</span></span><span class="splash-char-slot"><span class="splash-char">s</span></span><span class="splash-char-slot"><span class="splash-char">p</span></span><span class="splash-char-slot"><span class="splash-char">o</span></span><span class="splash-char-slot"><span class="splash-char">r</span></span><span class="splash-char-slot"><span class="splash-char">t</span></span>
        </h1>

        <div class="splash-tagline" id="splash-tagline">
          <span class="splash-prompt">&gt;</span>
          <span id="splash-status-text">VERIFYING CHAIN STATE...</span>
          <span class="splash-cursor">▋</span>
        </div>
      </div>

      <div class="splash-footer">
        <div class="splash-progress-header">
          <span id="splash-step-label">INITIALIZING PROTOCOL LEDGER</span>
          <span class="splash-progress-pct" id="splash-progress-pct">0%</span>
        </div>
        <div class="splash-progress-track">
          <div class="splash-progress-bar" id="splash-progress-bar"></div>
        </div>
        <div class="splash-hash-stream" id="splash-hash-stream">0x73a8f190bc98e...keccak256(vin_passport_registry)</div>
      </div>
    `;

    document.body.prepend(overlay);
    return overlay;
  }

  // Initialize and run splash animation
  function runSplashScreen() {
    // If already seen this session, remove immediately with no delay
    if (shouldSkipSplash()) {
      dismissSplashImmediate();
      return;
    }

    const splashEl = ensureSplashMarkup();
    document.documentElement.classList.add("splash-active");

    // Robust fallback: if GSAP failed to load, fall back to dismissing immediately
    if (typeof window.gsap === "undefined") {
      console.warn("[CarPassport] GSAP not detected — bypassing splash to avoid blocking UI.");
      dismissSplashImmediate();
      return;
    }

    // Safety timeout: dismiss splash under any circumstance within 2.5s
    const fallbackTimer = setTimeout(() => {
      dismissSplashImmediate();
    }, 2500);

    try {
      const gsap = window.gsap;
      const chars = splashEl.querySelectorAll(".splash-char");
      const progressBar = splashEl.querySelector("#splash-progress-bar");
      const pctText = splashEl.querySelector("#splash-progress-pct");
      const statusText = splashEl.querySelector("#splash-status-text");
      const stepLabel = splashEl.querySelector("#splash-step-label");
      const hashStream = splashEl.querySelector("#splash-hash-stream");
      const badge = splashEl.querySelector(".splash-badge");
      const tagline = splashEl.querySelector(".splash-tagline");

      // Set initial mechanical states (translate off-screen, no soft fade opacity)
      gsap.set(chars, { yPercent: 125 });
      gsap.set(tagline, { scale: 0.95, y: 15, opacity: 0 });
      gsap.set(badge, { y: -10, opacity: 0 });
      gsap.set(progressBar, { width: "0%" });

      // Create master timeline for easy re-timing
      const tl = gsap.timeline({
        onComplete: () => {
          clearTimeout(fallbackTimer);
          // Hard, snappy exit wipe (translateY off-screen with power4.in, no crossfade)
          gsap.to(splashEl, {
            yPercent: -100,
            duration: 0.38,
            ease: "power4.in",
            onComplete: () => {
              dismissSplashImmediate();
            },
          });
        },
      });

      // 1. Badge snaps into position
      tl.to(badge, {
        y: 0,
        opacity: 1,
        duration: 0.15,
        ease: "steps(3)",
      });

      // 2. Letters enter with sharp, mechanical motion (translateY snap with slight overshoot)
      tl.to(
        chars,
        {
          yPercent: 0,
          duration: 0.32,
          stagger: 0.032,
          ease: "back.out(2.4)", // Neobrutalist snappy mechanical overshoot
        },
        "-=0.05"
      );

      // 3. Monospace terminal tagline snaps into view
      tl.to(
        tagline,
        {
          scale: 1,
          y: 0,
          opacity: 1,
          duration: 0.18,
          ease: "power3.out",
        },
        "-=0.1"
      );

      // 4. Progress tween: fills left-to-right with --accent-primary
      // Fixed timed fill: ~1.35 seconds total, perfectly within 1.2–1.8s requirement
      const progressObj = { value: 0 };
      tl.to(
        progressObj,
        {
          value: 100,
          duration: 1.35,
          ease: "power2.inOut",
          onUpdate: () => {
            const current = Math.round(progressObj.value);
            if (progressBar) progressBar.style.width = current + "%";
            if (pctText) pctText.textContent = current + "%";

            // Update terminal state messages during progress
            if (current >= 30 && current < 65) {
              if (statusText) statusText.textContent = "VERIFYING CHAIN STATE...";
              if (stepLabel) stepLabel.textContent = "QUERYING POLYGON AMOY RPC";
              if (hashStream) hashStream.textContent = "0x892a01ef6b432...syncing contract headers";
            } else if (current >= 65 && current < 95) {
              if (statusText) statusText.textContent = "PARSING CARPASSPORT ABI...";
              if (stepLabel) stepLabel.textContent = "LOADING CRYPTOGRAPHIC MAPPINGS";
              if (hashStream) hashStream.textContent = "0x4b7192a00c82f...keccak256(vinHashOf)";
            } else if (current >= 95) {
              if (statusText) statusText.textContent = "SYSTEM READY // BOOT COMPLETE";
              if (stepLabel) stepLabel.textContent = "LAUNCHING UNIFIED HUB";
              if (hashStream) hashStream.textContent = "0x0000000000000...all audits verified";
            }
          },
        },
        0.35 // Start progress bar while letters finish snapping
      );

      // Brief dwell (0.1s) at 100% before triggering exit wipe
      tl.to({}, { duration: 0.1 });
    } catch (err) {
      console.error("[CarPassport] Splash animation error:", err);
      clearTimeout(fallbackTimer);
      dismissSplashImmediate();
    }
  }

  // Expose controls for testing / grading demo
  window.CarPassportSplash = {
    replay: function () {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      window.location.reload();
    },
    dismiss: dismissSplashImmediate,
    isSplashSeen: function () {
      try {
        return sessionStorage.getItem(STORAGE_KEY) === "true";
      } catch {
        return false;
      }
    },
  };

  // Immediate check: if already seen, remove as early as possible
  if (shouldSkipSplash()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", dismissSplashImmediate);
    } else {
      dismissSplashImmediate();
    }
  } else {
    // Mount & run when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runSplashScreen);
    } else {
      runSplashScreen();
    }
  }
})();
