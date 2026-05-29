const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

function withTransition(update) {
  if (!prefersReduced && document.startViewTransition) document.startViewTransition(update);
  else update();
}

function initTheme() {
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    withTransition(() => {
      if (root.dataset.theme === "dark") delete root.dataset.theme;
      else root.dataset.theme = "dark";
    });
  });
}

function initTiltAndMagnet() {
  document.querySelectorAll("[data-tilt]").forEach((surface) => {
    surface.addEventListener("pointermove", (event) => {
      if (prefersReduced) return;
      const rect = surface.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      surface.style.setProperty("--rx", `${(0.5 - y) * 4}deg`);
      surface.style.setProperty("--ry", `${(x - 0.5) * 5}deg`);
      surface.style.setProperty("--mx", `${x * 100}%`);
      surface.style.setProperty("--my", `${y * 100}%`);
    });
    surface.addEventListener("pointerleave", () => {
      surface.style.setProperty("--rx", "0deg");
      surface.style.setProperty("--ry", "0deg");
    });
  });

  document.querySelectorAll(".magnetic").forEach((item) => {
    item.addEventListener("pointermove", (event) => {
      if (prefersReduced) return;
      const rect = item.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      item.style.transform = `translate(${x * 0.08}px, ${y * 0.1}px)`;
    });
    item.addEventListener("pointerleave", () => {
      item.style.transform = "";
    });
  });
}

function initAmbientCanvas() {
  const canvas = document.querySelector("#ambientCanvas");
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  const resize = () => {
    width = canvas.width = Math.floor(innerWidth * devicePixelRatio);
    height = canvas.height = Math.floor(innerHeight * devicePixelRatio);
  };
  resize();
  addEventListener("resize", resize);
  if (prefersReduced) return;
  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < 26; i += 1) {
      const x = (i * 307 + time * 0.01) % width;
      const y = (Math.sin(i * 1.9 + time * 0.0008) * 0.2 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,138,18,.18)" : "rgba(10,167,157,.16)";
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function initKernoFlow() {
  const section = document.querySelector("#kernoFlow");
  const label = document.querySelector("#processingLabel");
  if (!section || !label) return;

  // Inject filename captions below each Excel-style file token.
  // ::before is the folded-corner shading, ::after is the green X badge,
  // so the caption gets its own injected child element.
  section.querySelectorAll(".spreadsheet-token[data-file]").forEach((token) => {
    if (token.querySelector(".file-caption")) return;
    const caption = document.createElement("span");
    caption.className = "file-caption";
    caption.textContent = token.getAttribute("data-file");
    token.appendChild(caption);
  });

  const dashboard = {
    activityBadge: document.querySelector("#activityBadge"),
    progress: {
      label: document.querySelector("#metricProgressLabel"),
      delta: document.querySelector("#metricProgressDelta"),
      meta: document.querySelector("#metricProgressMeta"),
      value: document.querySelector("#metricProgressValue"),
      note: document.querySelector("#metricProgressNote")
    },
    waiting: {
      label: document.querySelector("#metricWaitingLabel"),
      delta: document.querySelector("#metricWaitingDelta"),
      meta: document.querySelector("#metricWaitingMeta"),
      value: document.querySelector("#metricWaitingValue"),
      note: document.querySelector("#metricWaitingNote")
    },
    qa: {
      label: document.querySelector("#metricQaLabel"),
      delta: document.querySelector("#metricQaDelta"),
      meta: document.querySelector("#metricQaMeta"),
      value: document.querySelector("#metricQaValue"),
      note: document.querySelector("#metricQaNote")
    },
    chart: {
      fill: document.querySelector("#chartFill"),
      done: document.querySelector("#chartDone"),
      work: document.querySelector("#chartWork"),
      pulse: document.querySelector("#chartPulse"),
      pulseRing: document.querySelector("#chartPulseRing")
    },
    stockoutTitle: document.querySelector("#stockoutTitle"),
    stockBars: [
      document.querySelector("#stockBarA"),
      document.querySelector("#stockBarB"),
      document.querySelector("#stockBarC")
    ],
    chips: [
      document.querySelector("#impactChipA"),
      document.querySelector("#impactChipB"),
      document.querySelector("#impactChipC")
    ],
    impactTitle: document.querySelector("#impactTitle"),
    impactBody: document.querySelector("#impactBody")
  };

  // Continuous 4-cycle ingestion loop — no idle bridges between cycles. Each phase
  // covers one input's full lifecycle (enter from off-screen left → settle → absorbed
  // into Kerno → module appears). Phases run back-to-back so the section feels like
  // a constantly-running operating system: while one item is being absorbed and the
  // next module is settling, the following item is already being placed at its drop
  // point. The seam between cycle-impact → cycle-stock is invisible because both
  // sides of the seam look identical: no item visible, no module pinned (both about
  // to enter / fade out in the next 200ms).
  const CYCLE = 4600;
  const phases = [
    { name: "idle",         label: "Reading the floor",          duration: 600 },
    { name: "cycle-stock",  label: "Stock note → shortage alert", duration: CYCLE },
    { name: "cycle-batch",  label: "Batch sheet → live batch",   duration: CYCLE },
    { name: "cycle-po",     label: "Vendor note → supplier PO",  duration: CYCLE },
    { name: "cycle-impact", label: "Inventory sheet → value at a glance", duration: CYCLE }
  ];

  const dashboardStates = {
    idle: {
      activityBadge: "Production Efficiency: 87%",
      progress: {
        label: "14 batches in progress",
        delta: "",
        meta: "Production Cost",
        value: "$12,400",
        note: "Baseline run rate"
      },
      waiting: {
        label: "5 batches waiting",
        delta: "",
        meta: "Value at Risk",
        value: "$6,200",
        note: "Watching ingredient levels"
      },
      qa: {
        label: "Supplier follow-up",
        delta: "",
        meta: "PO Status",
        value: "Awaiting date",
        note: "Request ready"
      },
      chart: {
        fill: "M24 124 L76 102 L128 86 L180 52 L232 74 L284 102 L336 58 L336 154 L24 154 Z",
        done: "M24 124 L76 102 L128 86 L180 52 L232 74 L284 102 L336 58",
        work: "M24 140 L76 120 L128 130 L180 108 L232 144 L284 118 L336 96"
      },
      stockoutTitle: "Inventory Stockout",
      stockBars: [
        { value: "25", label: "Shea Butter", bar: "52%" },
        { value: "45", label: "Rose Extract", bar: "90%" },
        { value: "10", label: "Coconut Oil", bar: "22%" }
      ],
      chips: ["+ Inventory watch", "+ Batch visibility", "+ Vendor coordination"],
      impactTitle: "Kerno turns the note into business movement.",
      impactBody: "The dashboard starts calm, then updates as soon as Kerno sees a risk, a batch request, or a supplier task."
    },
    stock: {
      activityBadge: "Shortage detected: Coconut Oil",
      progress: {
        label: "14 batches in progress",
        delta: "No batch loss",
        meta: "Production Cost",
        value: "$12,400",
        note: "Current batches protected"
      },
      waiting: {
        label: "6 batches waiting",
        delta: "+$1,650 risk",
        meta: "Value at Risk",
        value: "$7,850",
        note: "Ingredients missing"
      },
      qa: {
        label: "Supplier follow-up",
        delta: "Vendor pulled in",
        meta: "PO Status",
        value: "Drafting request",
        note: "Vendor contact pulled in"
      },
      chart: {
        fill: "M24 126 L76 106 L128 94 L180 70 L232 82 L284 110 L336 66 L336 154 L24 154 Z",
        done: "M24 126 L76 106 L128 94 L180 70 L232 82 L284 110 L336 66",
        work: "M24 142 L76 126 L128 134 L180 118 L232 146 L284 126 L336 102"
      },
      stockoutTitle: "Ingredient Risk",
      stockBars: [
        { value: "22", label: "Shea Butter", bar: "46%" },
        { value: "42", label: "Rose Extract", bar: "84%" },
        { value: "3", label: "Coconut Oil", bar: "10%" }
      ],
      chips: ["+ Coconut oil shortage", "+ Waiting batches flagged", "+ Value at risk surfaced"],
      impactTitle: "Kerno catches the ingredient gap before it turns into chaos.",
      impactBody: "One missing ingredient pushes risk to the surface immediately, marks the affected batches, and gives the team a clear next move."
    },
    batch: {
      activityBadge: "Batch #7781 queued automatically",
      progress: {
        label: "15 batches in progress",
        delta: "+1 batch live",
        meta: "Production Cost",
        value: "$13,180",
        note: "Recipe and team synced"
      },
      waiting: {
        label: "6 batches waiting",
        delta: "Risk still exposed",
        meta: "Value at Risk",
        value: "$7,850",
        note: "Shortage still being covered"
      },
      qa: {
        label: "Supplier follow-up",
        delta: "PO attached",
        meta: "PO Status",
        value: "PO queued",
        note: "Next action attached"
      },
      chart: {
        fill: "M24 120 L76 96 L128 82 L180 46 L232 68 L284 90 L336 50 L336 154 L24 154 Z",
        done: "M24 120 L76 96 L128 82 L180 46 L232 68 L284 90 L336 50",
        work: "M24 138 L76 112 L128 118 L180 92 L232 126 L284 108 L336 82"
      },
      stockoutTitle: "Protected Inventory",
      stockBars: [
        { value: "20", label: "Shea Butter", bar: "42%" },
        { value: "41", label: "Rose Extract", bar: "80%" },
        { value: "3", label: "Coconut Oil", bar: "10%" }
      ],
      chips: ["+ Batch #7781 queued", "+ Formula auto-filled", "+ Team share ready"],
      impactTitle: "Kerno turns the batch request into a live production move.",
      impactBody: "The system assembles the batch from the request, fills in the recipe details, and raises production without asking the team to rebuild the work by hand."
    },
    po: {
      activityBadge: "PO 419 sent for shipping date",
      progress: {
        label: "15 batches in progress",
        delta: "Run stays moving",
        meta: "Production Cost",
        value: "$13,180",
        note: "Batch still on track"
      },
      waiting: {
        label: "5 batches waiting",
        delta: "-$870 risk",
        meta: "Value at Risk",
        value: "$6,980",
        note: "Recovery motion started"
      },
      qa: {
        label: "Supplier follow-up",
        delta: "ETA requested",
        meta: "PO Status",
        value: "Awaiting May 18",
        note: "Vendor ping sent"
      },
      chart: {
        fill: "M24 118 L76 94 L128 80 L180 44 L232 62 L284 84 L336 46 L336 154 L24 154 Z",
        done: "M24 118 L76 94 L128 80 L180 44 L232 62 L284 84 L336 46",
        work: "M24 136 L76 108 L128 114 L180 90 L232 118 L284 100 L336 78"
      },
      stockoutTitle: "Replenishment Watch",
      stockBars: [
        { value: "21", label: "Shea Butter", bar: "44%" },
        { value: "41", label: "Rose Extract", bar: "80%" },
        { value: "6", label: "Coconut Oil", bar: "14%" }
      ],
      chips: ["+ PO 419 drafted", "+ ETA requested", "+ Vendor follow-up logged"],
      impactTitle: "Kerno pushes the supplier follow-up before the team loses momentum.",
      impactBody: "The vendor request is created from the shortage context, the expected date is tracked, and the business can see recovery starting instead of chasing updates manually."
    },
    chart: {
      activityBadge: "Production Efficiency: 89%",
      progress: {
        label: "15 batches in progress",
        delta: "+7% output",
        meta: "Production Cost",
        value: "$13,180",
        note: "Output climbing"
      },
      waiting: {
        label: "5 batches waiting",
        delta: "Contained",
        meta: "Value at Risk",
        value: "$6,980",
        note: "Risk now contained"
      },
      qa: {
        label: "Supplier follow-up",
        delta: "Visible",
        meta: "PO Status",
        value: "Awaiting May 18",
        note: "Next milestone visible"
      },
      chart: {
        fill: "M24 112 L76 86 L128 72 L180 40 L232 58 L284 82 L336 34 L336 154 L24 154 Z",
        done: "M24 112 L76 86 L128 72 L180 40 L232 58 L284 82 L336 34",
        work: "M24 132 L76 104 L128 110 L180 84 L232 114 L284 92 L336 72"
      },
      stockoutTitle: "Operational Pulse",
      stockBars: [
        { value: "21", label: "Shea Butter", bar: "44%" },
        { value: "43", label: "Rose Extract", bar: "86%" },
        { value: "6", label: "Coconut Oil", bar: "14%" }
      ],
      chips: ["+ Output rising", "+ Risk visible", "+ Team aligned"],
      impactTitle: "The dashboard starts proving value in real time.",
      impactBody: "This is the sales moment: each intake changes the operational picture, and Kerno makes that movement obvious the second it matters."
    },
    impact: {
      // Inventory counts file ingested. The owner just handed Kerno a raw
      // spreadsheet of physical counts; Kerno reconciles, flags shortages,
      // drafts the auto-PO, and updates the safety-stock picture.
      activityBadge: "Counts reconciled · 142 SKUs",
      progress: {
        label: "15 batches in progress",
        delta: "Plan revalidated",
        meta: "Production Cost",
        value: "$13,180",
        note: "Run plan re-confirmed"
      },
      waiting: {
        label: "3 SKUs below reorder",
        delta: "Auto-PO drafted",
        meta: "Days to stockout",
        value: "4 days",
        note: "Coconut Oil critical"
      },
      qa: {
        label: "Supplier follow-up",
        delta: "ETAs verified",
        meta: "PO Status",
        value: "Awaiting May 18",
        note: "Vendor on the hook"
      },
      chart: {
        fill: "M24 118 L76 96 L128 78 L180 60 L232 48 L284 40 L336 30 L336 154 L24 154 Z",
        done: "M24 118 L76 96 L128 78 L180 60 L232 48 L284 40 L336 30",
        work: "M24 138 L76 116 L128 102 L180 90 L232 80 L284 76 L336 64"
      },
      stockoutTitle: "Inventory after counts",
      stockBars: [
        { value: "24", label: "Shea Butter", bar: "48%" },
        { value: "44", label: "Rose Extract", bar: "88%" },
        { value: "8",  label: "Coconut Oil", bar: "16%" }
      ],
      chips: ["+ Counts synced", "+ Auto-PO drafted (3)", "+ Safety stock updated"],
      impactTitle: "142 raw counts become 3 clear actions.",
      impactBody: "Kerno reconciled the counts, flagged the SKUs that won't last the week, drafted the PO that covers them, and pushed the updated risk straight into the dashboard."
    }
  };

  // Idle reads the calm baseline. Each cycle phase has the matching dashboard state
  // and module focus active. The state holds until the *next* phase begins (so the
  // module sits on screen for the back-half of the cycle while the item glides back).
  const phaseStateMap = {
    idle: "idle",
    "cycle-stock":  "stock",
    "cycle-batch":  "batch",
    "cycle-po":     "po",
    "cycle-impact": "impact"
  };

  const phaseFocusMap = {
    idle: "none",
    "cycle-stock":  "stock",
    "cycle-batch":  "batch",
    "cycle-po":     "po",
    "cycle-impact": "impact"
  };

  function markLive(node) {
    if (!node) return;
    node.classList.remove("is-live");
    void node.offsetWidth;
    node.classList.add("is-live");
  }

  function spotlightCard(node) {
    const card = node?.closest(".dash-metric, .production-chart, .stockout-card, .dash-chips, .business-impact, .activity-strip");
    if (!card) return;
    card.classList.remove("is-updating");
    void card.offsetWidth;
    card.classList.add("is-updating");
    window.setTimeout(() => card.classList.remove("is-updating"), 2400);
  }

  // Tween any numbers found in a text value from previous to new over ~700ms.
  // Strings with the same number of numeric tokens animate; mismatched shapes
  // (e.g. "Awaiting" -> "$6,980") snap. Preserves the formatting/template of
  // the target string (prefixes, suffixes, separators).
  function tweenText(node, fromText, toText, duration = 700) {
    if (!node) return;
    const re = /-?\d[\d,]*(?:\.\d+)?/g;
    const fromMatches = fromText ? fromText.match(re) : null;
    const toMatches = toText.match(re);
    if (!fromMatches || !toMatches || fromMatches.length !== toMatches.length) {
      node.textContent = toText;
      return;
    }
    const fromNums = fromMatches.map((s) => parseFloat(s.replace(/,/g, "")));
    const toNums = toMatches.map((s) => parseFloat(s.replace(/,/g, "")));
    if (fromNums.some(Number.isNaN) || toNums.some(Number.isNaN)) {
      node.textContent = toText;
      return;
    }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      let i = 0;
      const out = toText.replace(re, () => {
        const v = fromNums[i] + (toNums[i] - fromNums[i]) * e;
        const target = toMatches[i];
        const isDecimal = target.includes(".");
        const hasComma = target.includes(",");
        let formatted = isDecimal ? v.toFixed(target.split(".")[1].length) : Math.round(v).toString();
        if (hasComma) {
          const [intPart, decPart] = formatted.split(".");
          formatted = parseInt(intPart, 10).toLocaleString();
          if (decPart) formatted += "." + decPart;
        }
        i++;
        return formatted;
      });
      node.textContent = out;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setText(node, value, changed) {
    if (!node) return;
    const prev = node.textContent;
    if (prev === value) return;
    tweenText(node, prev, value, 720);
    changed.push(node);
  }

  function setBar(node, config, changed) {
    if (!node || !config) return;
    const valueNode = node.querySelector("b");
    const labelNode = node.querySelector("em");
    if (node.style.getPropertyValue("--bar") !== config.bar) {
      node.style.setProperty("--bar", config.bar);
      // Briefly flash the bar so the height change reads as a real update,
      // not a passive layout shift. Class auto-removes after the animation.
      node.classList.remove("kf-bar-tick");
      void node.offsetWidth;
      node.classList.add("kf-bar-tick");
      window.setTimeout(() => node.classList.remove("kf-bar-tick"), 760);
      changed.push(node);
    }
    setText(valueNode, config.value, changed);
    setText(labelNode, config.label, changed);
  }

  // Draw the SVG path live: snap stroke-dashoffset to total length, then
  // transition it to 0 — the line is visibly redrawn left-to-right. We do
  // this on each chart update so the chart reads as actively redrawing,
  // not just a static change between two static images.
  function animatePathDraw(pathNode, duration = 900, delay = 0) {
    if (!pathNode || typeof pathNode.getTotalLength !== "function") return;
    const len = pathNode.getTotalLength();
    if (!len) return;
    pathNode.style.transition = "none";
    pathNode.style.strokeDasharray = `${len}`;
    pathNode.style.strokeDashoffset = `${len}`;
    // Force reflow so the next assignment actually transitions
    void pathNode.getBoundingClientRect();
    pathNode.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`;
    pathNode.style.strokeDashoffset = "0";
  }

  // Pull the last (x, y) point out of an SVG d string and position the
  // pulse + ring there so the ticker visually rides the end of the line.
  function movePulseToLastPoint(d) {
    if (!d || !dashboard.chart.pulse) return;
    const tokens = d.trim().split(/[\sML]+/i).filter(Boolean);
    // Each token is "x,y" or two consecutive "x", "y" — handle both.
    const flat = tokens.flatMap((t) => t.split(",")).map((n) => parseFloat(n)).filter((n) => !Number.isNaN(n));
    if (flat.length < 2) return;
    const y = flat[flat.length - 1];
    const x = flat[flat.length - 2];
    dashboard.chart.pulse.setAttribute("cx", x);
    dashboard.chart.pulse.setAttribute("cy", y);
    if (dashboard.chart.pulseRing) {
      dashboard.chart.pulseRing.setAttribute("cx", x);
      dashboard.chart.pulseRing.setAttribute("cy", y);
    }
  }

  function renderDashboardState(stateName) {
    const state = dashboardStates[stateName] || dashboardStates.idle;
    const changed = [];

    setText(dashboard.activityBadge, state.activityBadge, changed);

    ["progress", "waiting", "qa"].forEach((key) => {
      const target = dashboard[key];
      const next = state[key];
      setText(target.label, next.label, changed);
      setText(target.delta, next.delta, changed);
      setText(target.meta, next.meta, changed);
      setText(target.value, next.value, changed);
      setText(target.note, next.note, changed);
    });

    let chartChanged = false;
    if (dashboard.chart.fill?.getAttribute("d") !== state.chart.fill) {
      dashboard.chart.fill?.setAttribute("d", state.chart.fill);
      changed.push(dashboard.chart.fill);
      chartChanged = true;
    }
    if (dashboard.chart.done?.getAttribute("d") !== state.chart.done) {
      dashboard.chart.done?.setAttribute("d", state.chart.done);
      animatePathDraw(dashboard.chart.done, 950);
      changed.push(dashboard.chart.done);
      chartChanged = true;
    }
    if (dashboard.chart.work?.getAttribute("d") !== state.chart.work) {
      dashboard.chart.work?.setAttribute("d", state.chart.work);
      animatePathDraw(dashboard.chart.work, 950, 120);
      changed.push(dashboard.chart.work);
      chartChanged = true;
    }
    if (chartChanged) {
      const svg = document.querySelector(".prod-chart-svg");
      if (svg) {
        svg.classList.remove("kf-chart-flash");
        void svg.offsetWidth;
        svg.classList.add("kf-chart-flash");
        window.setTimeout(() => svg.classList.remove("kf-chart-flash"), 1150);
      }
    }
    // Reposition the live ticker pulse to the rightmost endpoint of the done line.
    movePulseToLastPoint(state.chart.done);

    setText(dashboard.stockoutTitle, state.stockoutTitle, changed);
    dashboard.stockBars.forEach((bar, index) => setBar(bar, state.stockBars[index], changed));
    dashboard.chips.forEach((chip, index) => setText(chip, state.chips[index], changed));
    setText(dashboard.impactTitle, state.impactTitle, changed);
    setText(dashboard.impactBody, state.impactBody, changed);

    changed.forEach((node) => {
      markLive(node);
      spotlightCard(node);
    });
  }

  let phaseIndex = 0;
  let timer = null;
  let renderTimer = null;
  let running = false;

  // Phase change choreography:
  //   t=0      .data-stale added → every module fades out (380ms) with CURRENT
  //            data still in the DOM, so the user sees the previous cycle's
  //            changes hold all the way out.
  //   t=1400   .data-stale removed AND renderDashboardState fires. Modules
  //            matching the new phase fade back in (560ms) while values tween
  //            from previous → new live in front of the user.
  // This means persistent modules visibly disappear between cycles instead of
  // showing stale data, and the live update happens during a clean reveal.
  function setPhase(index) {
    phaseIndex = index % phases.length;
    const phase = phases[phaseIndex];
    section.dataset.loopPhase = phase.name;
    section.dataset.dashboardFocus = phaseFocusMap[phase.name] || "none";
    label.textContent = phase.label;
    window.clearTimeout(renderTimer);
    const nextStateName = phaseStateMap[phase.name];
    if (phase.name.startsWith("cycle-")) {
      // Force all modules to fade out with current values intact.
      section.classList.add("data-stale");
      // Reveal + update simultaneously so the tween plays inside the visible module.
      renderTimer = window.setTimeout(() => {
        section.classList.remove("data-stale");
        renderDashboardState(nextStateName);
      }, 1400);
    } else {
      section.classList.remove("data-stale");
      renderDashboardState(nextStateName);
    }
  }

  function queueNextPhase() {
    const phase = phases[phaseIndex];
    timer = window.setTimeout(() => {
      setPhase(phaseIndex + 1);
      queueNextPhase();
    }, phase.duration);
  }

  function start() {
    if (running || prefersReduced) return;
    running = true;
    window.clearTimeout(timer);
    setPhase(phaseIndex);
    queueNextPhase();
  }

  function pause() {
    running = false;
    window.clearTimeout(timer);
    window.clearTimeout(renderTimer);
  }

  const controller = { start, pause, setPhase };
  section.kernoLoop = controller;

  if (prefersReduced) {
    setPhase(1);
    return;
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start();
        else pause();
      });
    }, { threshold: 0.2 });
    observer.observe(section);
  } else {
    start();
  }
}

function initSectionOneDemo() {
  const demos = {
    dashboard: {
      label: "Dashboard",
      title: "Dashboard activity comes alive.",
      body: "Kerno gives teams one command center for production efficiency, batch progress, QA work, tasks, and inventory risk.",
      video: "/assets/videos/kerno-dashboard-demo.mp4",
      poster: "/assets/videos/kerno-dashboard-demo.svg",
      fallback: "dashboard"
    },
    formula: {
      label: "Product Formula",
      title: "Create a batch from one product selection.",
      body: "Choose a product once and Kerno fills the formula components, quantities, units, lots, batch size, and route so production can start cleanly.",
      video: "/assets/videos/kerno-product-formula-demo.mp4",
      poster: "/assets/videos/kerno-product-formula-demo.svg",
      fallback: "formula"
    },
    qa: {
      label: "QA Management",
      title: "Criteria become a release-ready QA workflow.",
      body: "Entered QA criteria become a manager checklist, with item approvals, PIN verification, and final batch completion handled in one controlled flow.",
      video: "/assets/videos/kerno-qa-management-demo.mp4",
      poster: "/assets/videos/kerno-qa-management-demo.svg",
      fallback: "qa"
    },
    inventory: {
      label: "Inventory Management",
      title: "Vendors, SKUs, lots, and stock signals connect.",
      body: "Kerno connects vendors, SKUs, lot numbers, and live stock indicators so buyers can see inventory risk before it slows production.",
      video: "/assets/videos/kerno-inventory-management-demo.mp4",
      poster: "/assets/videos/kerno-inventory-management-demo.svg",
      fallback: "inventory"
    }
  };

  function fallbackMarkup(type) {
    const activeNav = {
      dashboard: "Dashboard",
      formula: "Batches",
      qa: "QA",
      inventory: "Inventory"
    }[type];

    const rows = {
      dashboard: ["Batch BA-12219 started", "QA release waiting", "Low stock resolved"],
      formula: ["Rose Water 94 gal", "Coconut Oil 48 lb", "Shea Butter 34 lb"],
      qa: ["Viscosity approved", "Fill weight approved", "Manager PIN verified"],
      inventory: ["Vendor: Botanicals Co.", "SKU: SHEA-12", "Lot: SB-1024"]
    }[type];

    const cards = {
      dashboard: [["Batches", "14"], ["Efficiency", "87%"], ["Stock risk", "$0"]],
      formula: [["Product", "Lotion"], ["Formula", "v4"], ["Status", "Ready"]],
      qa: [["Criteria", "6"], ["Approved", "5"], ["Batch", "Done"]],
      inventory: [["Vendors", "8"], ["SKUs", "142"], ["Lots", "518"]]
    }[type];

    const modal = type === "qa" ? `
      <div class="fallback-modal">
        <strong>Manager PIN</strong>
        <div class="fallback-pin"><i></i><i></i><i></i><i></i></div>
      </div>
    ` : "";

    return `
      <div class="fallback-ui">
        <aside class="fallback-sidebar" aria-hidden="true">
          <div class="fallback-brand"><img src="/kerno-logo.png" alt="" />Kerno</div>
          ${["Dashboard", "Batches", "QA", "Inventory", "Vendors"].map((item) => `<span class="fallback-nav${item === activeNav ? " is-active" : ""}">${item}</span>`).join("")}
        </aside>
        <div class="fallback-main">
          <div class="fallback-top">
            <strong>${demos[type].label}</strong>
            <span class="fallback-pill">Live workflow</span>
          </div>
          <div>
            <div class="fallback-grid">
              ${cards.map(([cardLabel, value]) => `<article class="fallback-card"><span>${cardLabel}</span><strong>${value}</strong><i></i></article>`).join("")}
            </div>
            <div class="fallback-lower">
              <div class="fallback-chart"></div>
              <div class="fallback-table">
                <span>Activity</span>
                ${rows.map((row) => `<div class="fallback-row"><b>${row}</b><em>Synced</em></div>`).join("")}
              </div>
            </div>
          </div>
          ${modal}
        </div>
      </div>
    `;
  }

  document.querySelectorAll("[data-fallback]").forEach((fallback) => {
    const type = fallback.dataset.fallback;
    fallback.innerHTML = fallbackMarkup(type);
    const video = fallback.parentElement?.querySelector("video");
    if (!video) return;

    video.addEventListener("error", () => fallback.classList.add("is-visible"));
    video.addEventListener("loadeddata", () => fallback.classList.remove("is-visible"));
    const playAttempt = video.play();
    if (playAttempt) playAttempt.catch(() => fallback.classList.add("is-visible"));
  });
}

function initDisplayToggle() {
  const showcase = document.querySelector(".demo-showcase");
  if (!showcase) return;

  // Ensure every player card has stand markup as siblings of the screen.
  // The stand lives OUTSIDE the screen element so UI content can never bleed
  // into the hardware. CSS shows/hides it per display mode.
  showcase.querySelectorAll(".demo-player-card").forEach((card) => {
    if (card.querySelector(".monitor-stand")) return;
    const stand = document.createElement("div");
    stand.className = "monitor-stand";
    stand.innerHTML = '<div class="monitor-neck" aria-hidden="true"></div><div class="monitor-base" aria-hidden="true"></div>';
    card.appendChild(stand);
    // Silver chin sits between the black bezel and the neck (iMac-style).
    if (!card.querySelector(".monitor-chin")) {
      const chin = document.createElement("div");
      chin.className = "monitor-chin";
      chin.setAttribute("aria-hidden", "true");
      // insert immediately after the shell
      const shell = card.querySelector(".demo-player-shell");
      if (shell && shell.nextSibling) card.insertBefore(chin, shell.nextSibling);
      else card.appendChild(chin);
    }
  });

  const buttons = showcase.querySelectorAll("[data-display-mode]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.displayMode;
      showcase.dataset.display = mode;
      buttons.forEach((b) => {
        const active = b.dataset.displayMode === mode;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
    });
  });
}

initTheme();
initSectionOneDemo();
initTiltAndMagnet();
initAmbientCanvas();
initKernoFlow();
initDisplayToggle();
