// Multi-step estimate form for uphightreecare.com
// Customer leads  -> uphigh_estimate_requests (existing table; scheduled email notifications)
// Vendor/partner  -> uphigh_solicitations (reviewed separately, no notifications)
const SUPA = "https://fpnawmvyrabdqnynhjiz.supabase.co";
const KEY = "sb_publishable_cu3KKb1ivsGaUvjJwxgYGw_g_SK3QZT";

const SLCO_ZIPS = new Set(["84006","84020","84044","84047","84065","84070","84081","84084","84088","84092","84093","84094","84095","84096","84101","84102","84103","84104","84105","84106","84107","84108","84109","84111","84115","84116","84117","84118","84119","84120","84121","84123","84124","84128","84129"]);

const SERVICES = ["Tree Removal","Tree Trimming & Pruning","Tree Thinning or Shaping","Stump Grinding","Emergency / Storm Damage","Something else"];
const VENDOR_SERVICES = ["Lead Generation","AI Systems / Data Optimization","Website, Security & Technical Optimization","Analytics","Other"];

const INPUT_CLS = "mt-1 w-full rounded-md border border-line px-3 py-2.5 focus:border-pine-600";
const BTN_CLS = "rounded-md bg-saw-500 px-5 py-3 font-semibold text-white hover:bg-saw-600";

const widget = document.getElementById("estimate-widget");
const bodyEl = document.getElementById("ew-body");
const progEl = document.getElementById("ew-progress");
const backEl = document.getElementById("ew-back");
const statusEl = document.getElementById("estimate-status");

if (widget && bodyEl) {
  const t0 = Date.now();
  const data = { service:"", first:"", last:"", phone:"", street:"", city:"", zip:"", note:"", consent:false,
                 bizName:"", bizUrl:"", bizLinkedin:"", bizServices:[], opportunity:"" };
  let path = "lead"; // or "vendor"
  let step = 0;

  const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function status(kind, msg) {
    statusEl.classList.remove("ew-hide");
    statusEl.textContent = msg;
    statusEl.className = "mt-4 rounded-md px-4 py-3 text-sm font-medium " + (kind === "ok" ? "bg-canopy text-pine-800" : "bg-saw-50 text-saw-600");
  }
  function clearStatus(){ statusEl.classList.add("ew-hide"); statusEl.textContent=""; }

  function field(label, inner) {
    return `<label class="block"><span class="text-sm font-medium">${label}</span>${inner}</label>`;
  }
  function nextBtn(label) {
    return `<button type="button" id="ew-next" class="${BTN_CLS}">${label || "Next"}</button>`;
  }

  const leadSteps = [
    { // 0: service
      title: "What does your tree need?",
      render: () => SERVICES.map(s =>
        `<button type="button" class="ew-svc rounded-md border border-line px-3 py-2.5 text-sm font-medium cursor-pointer${data.service===s?" ew-sel":""}" data-svc="${esc(s)}">${esc(s)}</button>`).join("") +
        `<p class="mt-1 text-sm">Offering services or a partnership instead? <button type="button" id="ew-vendor" class="underline cursor-pointer">Start here</button></p>`,
      wire: () => {
        bodyEl.querySelectorAll(".ew-svc").forEach(b => b.addEventListener("click", () => { data.service = b.dataset.svc; go(1); }));
        document.getElementById("ew-vendor").addEventListener("click", () => { path = "vendor"; go(0); });
      }
    },
    { // 1: name
      title: "Your name",
      render: () =>
        field("First name", `<input type="text" id="ew-first" autocomplete="given-name" value="${esc(data.first)}" class="${INPUT_CLS}">`) +
        field("Last name", `<input type="text" id="ew-last" autocomplete="family-name" value="${esc(data.last)}" class="${INPUT_CLS}">`) + nextBtn(),
      save: () => { data.first = val("ew-first"); data.last = val("ew-last"); },
      valid: () => data.first && data.last ? "" : "Please enter your first and last name."
    },
    { // 2: phone
      title: "Best phone number to reach you",
      render: () => field("Phone", `<input type="tel" id="ew-phone" autocomplete="tel" inputmode="tel" placeholder="(801) 555-0123" value="${esc(data.phone)}" class="${INPUT_CLS}">`) + nextBtn(),
      save: () => { data.phone = val("ew-phone"); },
      valid: () => data.phone.replace(/\D/g, "").length >= 10 ? "" : "Please enter a 10-digit phone number."
    },
    { // 3: address
      title: "Where is the job? (greater Salt Lake area)",
      render: () =>
        field("Street address", `<input type="text" id="ew-street" autocomplete="street-address" value="${esc(data.street)}" class="${INPUT_CLS}">`) +
        `<div class="grid grid-cols-2 gap-4">` +
        field("City", `<input type="text" id="ew-city" autocomplete="address-level2" placeholder="e.g. Millcreek" value="${esc(data.city)}" class="${INPUT_CLS}">`) +
        field("ZIP", `<input type="text" id="ew-zip" autocomplete="postal-code" inputmode="numeric" maxlength="5" value="${esc(data.zip)}" class="${INPUT_CLS}">`) +
        `</div><p id="ew-zipnote" class="text-sm ew-hide">That ZIP looks outside our usual service area — you can still send it and we&#39;ll confirm.</p>` + nextBtn(),
      save: () => { data.street = val("ew-street"); data.city = val("ew-city"); data.zip = val("ew-zip"); },
      valid: () => {
        if (!data.street || !data.city || !/^\d{5}$/.test(data.zip)) return "Please enter the street, city, and 5-digit ZIP.";
        return "";
      },
      wire: () => {
        const zipEl = document.getElementById("ew-zip");
        zipEl.addEventListener("input", () => {
          const note = document.getElementById("ew-zipnote");
          if (/^\d{5}$/.test(zipEl.value) && !SLCO_ZIPS.has(zipEl.value)) note.classList.remove("ew-hide");
          else note.classList.add("ew-hide");
        });
      }
    },
    { // 4: details + consent + submit
      title: "Last step",
      render: () =>
        field("Anything else about the job? (optional)", `<textarea id="ew-note" rows="3" placeholder="e.g. Big cottonwood dropping limbs over the garage." class="${INPUT_CLS}">${esc(data.note)}</textarea>`) +
        `<label class="flex items-start gap-2 cursor-pointer"><input type="checkbox" id="ew-consent" class="mt-1"${data.consent?" checked":""}><span class="text-sm">I agree to the <a href="/privacy" class="underline" target="_blank">privacy policy</a> and affirm I&#39;m a potential customer who needs tree services in the greater Salt Lake area.</span></label>` +
        `<button type="button" id="ew-next" class="${BTN_CLS}">Send estimate request</button>`,
      save: () => { data.note = val("ew-note"); data.consent = document.getElementById("ew-consent").checked; },
      valid: () => data.consent ? "" : "Please confirm the checkbox so we can accept your request."
    }
  ];

  const vendorSteps = [
    { title: "Your business name",
      render: () => field("Business name", `<input type="text" id="ew-bizname" value="${esc(data.bizName)}" class="${INPUT_CLS}">`) + nextBtn(),
      save: () => { data.bizName = val("ew-bizname"); },
      valid: () => data.bizName ? "" : "Please enter your business name." },
    { title: "Your website",
      render: () => field("Website URL", `<input type="url" id="ew-bizurl" inputmode="url" placeholder="https://" value="${esc(data.bizUrl)}" class="${INPUT_CLS}">`) + nextBtn(),
      save: () => { data.bizUrl = val("ew-bizurl"); },
      valid: () => data.bizUrl ? "" : "Please enter your website URL." },
    { title: "Your LinkedIn profile (optional)",
      render: () => field("LinkedIn URL", `<input type="url" id="ew-bizli" inputmode="url" placeholder="https://linkedin.com/in/…" value="${esc(data.bizLinkedin)}" class="${INPUT_CLS}">`) + nextBtn(),
      save: () => { data.bizLinkedin = val("ew-bizli"); },
      valid: () => "" },
    { title: "What services do you offer?",
      render: () => VENDOR_SERVICES.map(s =>
        `<label class="flex items-start gap-2 cursor-pointer"><input type="checkbox" class="mt-1 ew-vsvc" value="${esc(s)}"${data.bizServices.includes(s)?" checked":""}><span class="text-sm font-medium">${esc(s)}</span></label>`).join("") + nextBtn(),
      save: () => { data.bizServices = [...bodyEl.querySelectorAll(".ew-vsvc:checked")].map(c => c.value); },
      valid: () => data.bizServices.length ? "" : "Please pick at least one." },
    { title: "Tell me about your business / the opportunity",
      render: () => field("The opportunity", `<textarea id="ew-opp" rows="4" class="${INPUT_CLS}">${esc(data.opportunity)}</textarea>`) +
        `<button type="button" id="ew-next" class="${BTN_CLS}">Send</button>`,
      save: () => { data.opportunity = val("ew-opp"); },
      valid: () => data.opportunity ? "" : "Please tell us a little about the opportunity." }
  ];

  function val(id){ const el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function steps(){ return path === "lead" ? leadSteps : vendorSteps; }

  function go(n) {
    step = n; clearStatus();
    const s = steps()[step];
    progEl.textContent = (path === "vendor" ? "Partner inquiry — step " : "Step ") + (step + 1) + " of " + steps().length;
    backEl.classList.toggle("ew-hide", path === "lead" && step === 0);
    bodyEl.innerHTML = `<p class="font-medium text-pine-900">${s.title}</p>` + s.render();
    if (s.wire) s.wire();
    const next = document.getElementById("ew-next");
    if (next) next.addEventListener("click", advance);
    bodyEl.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); advance(); } }));
    const first = bodyEl.querySelector("input,textarea,button.ew-svc");
    if (first && step > 0) first.focus();
  }

  function advance() {
    const s = steps()[step];
    if (s.save) s.save();
    const err = s.valid ? s.valid() : "";
    if (err) { status("err", err); return; }
    clearStatus();
    if (step + 1 < steps().length) go(step + 1); else submit();
  }

  backEl.addEventListener("click", () => {
    if (step > 0) go(step - 1);
    else if (path === "vendor") { path = "lead"; go(0); }
  });

  async function submit() {
    // Bot checks: honeypot + minimum fill time. Pretend success, save nothing.
    const honey = document.getElementById("ew-company");
    if ((honey && honey.value.trim()) || Date.now() - t0 < 3000) { done(); return; }

    const next = document.getElementById("ew-next");
    if (next) { next.disabled = true; next.textContent = "Sending…"; }
    const isLead = path === "lead";
    const table = isLead ? "uphigh_estimate_requests" : "uphigh_solicitations";
    const payload = isLead ? {
      name: (data.first + " " + data.last).trim(),
      phone: data.phone,
      city: data.city || null,
      message: "Service: " + data.service +
        "\nAddress: " + data.street + ", " + data.city + " " + data.zip +
        (SLCO_ZIPS.has(data.zip) ? "" : " (ZIP outside usual service area)") +
        (data.note ? "\nNotes: " + data.note : "") +
        "\nConsent: agreed to privacy policy, affirmed potential customer",
      page: location.pathname
    } : {
      business_name: data.bizName,
      business_url: data.bizUrl || null,
      linkedin_url: data.bizLinkedin || null,
      services: data.bizServices,
      opportunity: data.opportunity,
      page: location.pathname
    };
    try {
      const r = await fetch(`${SUPA}/rest/v1/${table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "return=minimal" },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(String(r.status));
      done();
    } catch {
      status("err", "Something went wrong sending the form. Please call (801) 890-7432 instead — it’s faster anyway.");
      if (next) { next.disabled = false; next.textContent = isLead ? "Try again" : "Send"; }
    }
  }

  function done() {
    progEl.textContent = "";
    backEl.classList.add("ew-hide");
    bodyEl.innerHTML = "";
    status("ok", path === "lead"
      ? "Request sent. We’ll call you back to set up your free estimate — usually within one business day."
      : "Thanks — your info is in the review queue. If there’s a fit, we’ll reach out.");
  }

  go(0);
}
