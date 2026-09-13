/**
 * CarPassport Centralized GSAP Animation System
 *
 * Provides snappy, tactile, neobrutalist motion for:
 * 1. Tab switching (Verify / Log Service / Test Suite)
 * 2. Card entrance on initial page render
 * 3. Button / input tactile press feedback
 * 4. Transaction status banner animations (success flash, revert shake, info slide)
 * 5. Staggered timeline entry reveals with a 600ms total stagger cap
 *
 * All easing curves, durations, and stagger values are strictly centralized.
 * Respects prefers-reduced-motion: instantly applies end-states with zero reflow.
 */

(function (global) {
  "use strict";

  // ==========================================================
  // Centralized Motion Tokens (No magic numbers across files)
  // ==========================================================
  const MOTION = {
    EASE: {
      SNAPPY_SNAP: "back.out(2.2)", // Uniform app-wide mechanical snap with overshoot
      SWAP_OUT: "power2.in",        // Directional panel exit
      SWAP_IN: "power3.out",        // Directional panel entry
      PRESS: "power1.inOut",        // Tactile button depression
      RELEASE: "back.out(2.5)",     // Mechanical spring release
      SHAKE: "power1.inOut",        // Error rejection shake
      FLASH: "power1.out",          // Success flash
    },
    DURATION: {
      TAB_EXIT: 0.12,               // 120ms outgoing tab exit
      TAB_ENTER: 0.18,              // 180ms incoming tab enter (300ms total)
      CARD_ENTER: 0.28,             // 280ms card entrance
      BUTTON_PRESS: 0.08,           // ~80ms tactile press
      BUTTON_RELEASE: 0.12,         // 120ms button rebound
      BANNER_ENTER: 0.22,           // 220ms status banner entrance
      BANNER_SHAKE_CYCLE: 0.05,     // 50ms per oscillation cycle
      TIMELINE_ITEM: 0.24,          // 240ms per timeline item
    },
    STAGGER: {
      TAB_CARDS: 0.04,              // 40ms stagger for cards inside switched tab
      INITIAL_CARDS: 0.05,          // 50ms stagger for cards on initial page load
      TIMELINE_DEFAULT_ITEM: 0.05,  // 50ms default delay per timeline record
      TIMELINE_MAX_TOTAL: 0.60,     // 600ms maximum total stagger cap
    },
  };

  // Check prefers-reduced-motion media query
  function isReducedMotion() {
    try {
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch {
      return false;
    }
  }

  // Helper to ensure GSAP is available
  function hasGsap() {
    return typeof global.gsap !== "undefined" && !isReducedMotion();
  }

  // ==========================================================
  // 1. Tab Switching Animation
  // ==========================================================
  let isTabAnimating = false;
  const TAB_ORDER = ["buyer-tab", "mechanic-tab", "tests-tab"];

  function switchTabAnimated(targetTabId, clickedBtn) {
    const tabs = Array.from(document.querySelectorAll(".tab-content"));
    const btns = Array.from(document.querySelectorAll(".tab-btn"));
    const currentActiveTab = tabs.find((t) => t.classList.contains("active"));
    const targetTab = document.getElementById(targetTabId);

    if (!targetTab) return;
    if (currentActiveTab === targetTab) return;

    // Update button states immediately
    btns.forEach((b) => b.classList.remove("active"));
    if (clickedBtn) {
      clickedBtn.classList.add("active");
    } else {
      const idx = TAB_ORDER.indexOf(targetTabId);
      if (idx !== -1 && btns[idx]) btns[idx].classList.add("active");
    }

    // If reduced motion or GSAP not available, instant swap
    if (!hasGsap() || !currentActiveTab) {
      tabs.forEach((t) => t.classList.remove("active"));
      targetTab.classList.add("active");
      return;
    }

    if (isTabAnimating) {
      global.gsap.killTweensOf([currentActiveTab, targetTab]);
      currentActiveTab.classList.remove("active");
      targetTab.classList.add("active");
      isTabAnimating = false;
    }

    isTabAnimating = true;

    // Directional calculation
    const fromIdx = TAB_ORDER.indexOf(currentActiveTab.id);
    const toIdx = TAB_ORDER.indexOf(targetTabId);
    const isForward = toIdx >= fromIdx;
    const exitX = isForward ? -24 : 24;
    const enterX = isForward ? 24 : -24;

    const gsap = global.gsap;

    // 1. Animate outgoing panel out
    gsap.to(currentActiveTab, {
      x: exitX,
      opacity: 0,
      duration: MOTION.DURATION.TAB_EXIT,
      ease: MOTION.EASE.SWAP_OUT,
      onComplete: () => {
        currentActiveTab.classList.remove("active");
        gsap.set(currentActiveTab, { clearProps: "all" });

        // 2. Prepare incoming panel
        targetTab.classList.add("active");
        const cards = targetTab.querySelectorAll(".neo-card");

        // Incoming panel transition
        gsap.fromTo(
          targetTab,
          { x: enterX, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: MOTION.DURATION.TAB_ENTER,
            ease: MOTION.EASE.SWAP_IN,
            clearProps: "x,opacity",
            onComplete: () => {
              isTabAnimating = false;
            },
          }
        );

        // Test Suite: Two-level hierarchical stagger (groups first, then individual test rows)
        if (targetTabId === "tests-tab") {
          animateTestSuiteEntrance(targetTab);
        } else if (cards.length > 0) {
          // Standard tab card stagger by 40ms
          gsap.fromTo(
            cards,
            { y: 14, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: MOTION.DURATION.CARD_ENTER,
              stagger: MOTION.STAGGER.TAB_CARDS,
              ease: MOTION.EASE.SNAPPY_SNAP,
              clearProps: "y,opacity",
            }
          );
        }
      },
    });
  }

  // ==========================================================
  // 1b. Dedicated Two-Level Hierarchical Stagger for Test Suite
  // ==========================================================
  function animateTestSuiteEntrance(testsTabEl) {
    if (!testsTabEl || !hasGsap()) return;
    const gsap = global.gsap;
    const summaryStrip = testsTabEl.querySelector("#testSummaryStrip");
    const groupCards = testsTabEl.querySelectorAll(".suite-group-card");
    const testRows = testsTabEl.querySelectorAll(".test-row");

    gsap.killTweensOf([summaryStrip, groupCards, testRows]);

    const tl = gsap.timeline();

    // 1. Summary strip snaps in at the top
    if (summaryStrip) {
      tl.fromTo(
        summaryStrip,
        { y: -14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.DURATION.CARD_ENTER,
          ease: MOTION.EASE.SNAPPY_SNAP,
          clearProps: "transform,opacity",
        },
        0
      );
    }

    // 2. First level: stagger each Suite group card in first
    if (groupCards.length > 0) {
      tl.fromTo(
        groupCards,
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.DURATION.CARD_ENTER,
          stagger: 0.08, // Stagger Suite group cards first
          ease: MOTION.EASE.SNAPPY_SNAP,
          clearProps: "transform,opacity",
        },
        summaryStrip ? "-=0.1" : 0
      );
    }

    // 3. Second level: stagger each individual PASS row inside a group shortly after
    if (testRows.length > 0) {
      tl.fromTo(
        testRows,
        { x: -16, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.18,
          stagger: 0.016, // Snappy sub-stagger per test row
          ease: MOTION.EASE.SNAPPY_SNAP,
          clearProps: "transform,opacity",
        },
        "-=0.12"
      );
    }
  }

  // ==========================================================
  // 2. Card Entrance on Initial Page Render
  // ==========================================================
  let initialCardsAnimated = false;

  function animateInitialCards() {
    if (initialCardsAnimated) return;
    initialCardsAnimated = true;

    if (!hasGsap()) return;

    const activeTab = document.querySelector(".tab-content.active");
    if (!activeTab) return;

    const cards = activeTab.querySelectorAll(".neo-card");
    if (!cards.length) return;

    global.gsap.fromTo(
      cards,
      { y: 18, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: MOTION.DURATION.CARD_ENTER,
        stagger: MOTION.STAGGER.INITIAL_CARDS,
        ease: MOTION.EASE.SNAPPY_SNAP,
        clearProps: "y,opacity",
      }
    );
  }

  // ==========================================================
  // 3. Tactile Button & Input Feedback
  // ==========================================================
  function initTactileInteractions() {
    if (isReducedMotion() || typeof global.gsap === "undefined") return;

    const gsap = global.gsap;

    // Delegated pointerdown for .neo-btn and .tab-btn
    document.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".neo-btn, .tab-btn");
      if (!btn || btn.disabled) return;

      gsap.to(btn, {
        x: 4,
        y: 4,
        boxShadow: "1px 1px 0px var(--ink, #111111)",
        duration: MOTION.DURATION.BUTTON_PRESS,
        ease: MOTION.EASE.PRESS,
      });

      const releaseHandler = () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          boxShadow: btn.classList.contains("active")
            ? "3px 3px 0px var(--ink, #111111)"
            : "6px 6px 0px var(--ink, #111111)",
          duration: MOTION.DURATION.BUTTON_RELEASE,
          ease: MOTION.EASE.RELEASE,
          clearProps: "transform,boxShadow",
        });
        window.removeEventListener("pointerup", releaseHandler);
        window.removeEventListener("pointercancel", releaseHandler);
      };

      window.addEventListener("pointerup", releaseHandler);
      window.addEventListener("pointercancel", releaseHandler);
    });

    // Subtle snap focus for neo-inputs
    document.addEventListener("focusin", (e) => {
      if (e.target.matches && e.target.matches(".neo-input")) {
        gsap.fromTo(
          e.target,
          { scale: 0.992 },
          {
            scale: 1,
            duration: 0.14,
            ease: MOTION.EASE.SNAPPY_SNAP,
            clearProps: "transform",
          }
        );
      }
    });
  }

  // ==========================================================
  // 4. Transaction Status Banner Animations
  // ==========================================================
  function animateBanner(bannerEl, type) {
    if (!bannerEl) return;
    if (!hasGsap()) return;

    const gsap = global.gsap;
    gsap.killTweensOf(bannerEl);

    if (type === "ok") {
      // Success: sharp slide-in followed by a single flash of --accent-success
      const tl = gsap.timeline();
      tl.fromTo(
        bannerEl,
        { y: -10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.DURATION.BANNER_ENTER,
          ease: MOTION.EASE.SNAPPY_SNAP,
        }
      );
      tl.fromTo(
        bannerEl,
        { backgroundColor: "#00E676" },
        {
          backgroundColor: "#00C853",
          duration: 0.35,
          ease: MOTION.EASE.FLASH,
          clearProps: "backgroundColor,transform,opacity",
        }
      );
    } else if (type === "err") {
      // Error/Revert: short, sharp horizontal shake (rejection physically communicated)
      const tl = gsap.timeline();
      tl.fromTo(
        bannerEl,
        { y: -8, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.DURATION.BANNER_ENTER * 0.7,
          ease: MOTION.EASE.SNAPPY_SNAP,
        }
      );
      tl.to(bannerEl, { x: -6, duration: MOTION.DURATION.BANNER_SHAKE_CYCLE, ease: MOTION.EASE.SHAKE })
        .to(bannerEl, { x: 6, duration: MOTION.DURATION.BANNER_SHAKE_CYCLE, ease: MOTION.EASE.SHAKE })
        .to(bannerEl, { x: -4, duration: MOTION.DURATION.BANNER_SHAKE_CYCLE, ease: MOTION.EASE.SHAKE })
        .to(bannerEl, { x: 4, duration: MOTION.DURATION.BANNER_SHAKE_CYCLE, ease: MOTION.EASE.SHAKE })
        .to(bannerEl, { x: 0, duration: MOTION.DURATION.BANNER_SHAKE_CYCLE, ease: "power1.out", clearProps: "transform,opacity" });
    } else {
      // Info / Pending: sharp mechanical slide-in
      gsap.fromTo(
        bannerEl,
        { y: -10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.DURATION.BANNER_ENTER,
          ease: MOTION.EASE.SNAPPY_SNAP,
          clearProps: "transform,opacity",
        }
      );
    }
  }

  // ==========================================================
  // 5. Timeline Entries Reveal (Buyer's Service History)
  // ==========================================================
  function animateTimelineEntries(items) {
    if (!items || !items.length) return;
    if (!hasGsap()) return;

    const count = items.length;
    // Cap total stagger duration at 600ms regardless of entry count
    const dynamicStagger = Math.min(
      MOTION.STAGGER.TIMELINE_DEFAULT_ITEM,
      MOTION.STAGGER.TIMELINE_MAX_TOTAL / Math.max(1, count)
    );

    global.gsap.fromTo(
      items,
      { x: -26, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: MOTION.DURATION.TIMELINE_ITEM,
        stagger: dynamicStagger,
        ease: MOTION.EASE.SNAPPY_SNAP,
        clearProps: "transform,opacity",
      }
    );
  }

  // ==========================================================
  // Initialization & Global Export
  // ==========================================================
  function init() {
    initTactileInteractions();

    // Check if splash is not blocking or already completed
    const splash = document.getElementById("splash-screen");
    if (!splash) {
      // Splash already skipped or removed, animate cards now
      setTimeout(animateInitialCards, 50);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.CarPassportAnimations = {
    MOTION,
    switchTabAnimated,
    animateTestSuiteEntrance,
    animateInitialCards,
    animateBanner,
    animateTimelineEntries,
    isReducedMotion,
  };
})(window);
