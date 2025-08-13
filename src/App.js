import { useEffect, useRef, useState, useMemo } from "react";
import Papa from "papaparse";
import "./styles.css";

function useReveal() {
  const containerRef = useRef(null);
  useEffect(() => {
    const els = containerRef.current?.querySelectorAll("[data-reveal]");
    if (!els || !els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return containerRef;
}

function Chip({ children }) {
  return <span className="chip">{children}</span>;
}

function ZipLocator() {
  const [zip, setZip] = useState("");
  const [rows, setRows] = useState([]); // [{ Zone, Zip, City, DeliveryDays }]
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  // Load CSV from /public/zones.csv
  useEffect(() => {
    Papa.parse("${process.env.PUBLIC_URL}/data/Zones.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // keep ZIPs as strings (preserve leading zeros)
      complete: (res) => {
        const cleaned = res.data.map((r) => ({
          Zone: (r.Zone ?? "").trim(),
          Zip: ((r.Zip ?? "").toString().replace(/\D/g, "") || "").padStart(
            5,
            "0"
          ),
          City: (r.City ?? "").trim(),
          DeliveryDays: (r.DeliveryDays ?? "").toString().trim().toUpperCase(),
        }));
        setRows(cleaned);
        setLoaded(true);
      },
      error: (err) => setError(err?.message || "Failed to load zones.csv"),
    });
  }, []);

  // Build a lookup map: zip -> row (first wins)
  const byZip = useMemo(() => {
    const m = new Map();
    for (const r of rows) if (r.Zip && !m.has(r.Zip)) m.set(r.Zip, r);
    return m;
  }, [rows]);

  const CONTACT_MSG =
    "We don’t currently deliver to this ZIP. Please reach out at shipping@fdlwarehouse.com or (732) 650-9200 ext.126";

  const check = (e) => {
    e?.preventDefault?.();
    const clean = (zip || "").trim();
    if (!/^\d{5}$/.test(clean)) {
      setStatus({
        type: "bad",
        title: "Invalid ZIP",
        body: "Enter a valid 5-digit ZIP.",
      });
      return;
    }

    const rec = byZip.get(clean);
    if (!rec) {
      setStatus({ type: "bad", title: "We Do Not Deliver", body: CONTACT_MSG });
      return;
    }

    if (rec.DeliveryDays === "DNT") {
      setStatus({
        type: "dnt",
        title: "DNT Delivers",
        body: `ZIP ${rec.Zip} is our Affiliate DNT Zone ${
          rec.City
            ? ` (${rec.City}), for more information, click their link at the bottom footer`
            : ""
        }.`,
        meta: null,
      });
      return;
    }

    setStatus({
      type: "ok",
      title: "We Deliver Here",
      body: `ZIP ${rec.Zip}${rec.City ? ` (${rec.City})` : ""}.`,
      meta: `Days: ${rec.DeliveryDays}`,
    });
  };

  return (
    <div className="zip-wrap" data-reveal>
      <form onSubmit={check} className="zip-form">
        <input
          inputMode="numeric"
          maxLength={5}
          placeholder="Enter ZIP code"
          value={zip}
          onChange={(e) =>
            setZip(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))
          }
        />
        <button type="submit" disabled={!loaded}>
          Check Coverage
        </button>
      </form>

      {!loaded && !error && <p className="zip-note">Loading coverage…</p>}
      {error && <p className="zip-result bad">{error}</p>}

      {status && (
        <div
          className={
            "zip-result " +
            (status.type === "ok"
              ? "ok"
              : status.type === "dnt"
              ? "warn"
              : "bad")
          }
        >
          <strong>{status.title}</strong>
          <div>{status.body}</div>
          {status.meta && (
            <div className="muted" style={{ marginTop: 6 }}>
              {status.meta}
            </div>
          )}
        </div>
      )}

      <p className="zip-note">
        Coverage updates periodically. If your ZIP isn’t listed, reach out — we
        may still help.
      </p>
    </div>
  );
}

function Navbar() {
  return (
    <div className="nav">
      <a href="#" className="brand">
        <img
          class="fdl_img"
          src="${process.env.PUBLIC_URL}/images/fdl-logo.png"
        />
      </a>
      <nav>
        <a href="#warehouse">Warehouse</a>
        <a href="#transport">Transportation</a>
        <a href="#services">Services</a>
        <a href="#contact">Contact</a>
        <a href="http://fdl.zapto.org/wm/" className="btn dark">
          Customer Portal
        </a>
      </nav>
    </div>
  );
}

function Hero() {
  const vidRef = useRef(null);
  const [canPlay, setCanPlay] = useState(true);

  // If you have a WebM (smaller), list it first
  const VIDEO_MP4 = "${process.env.PUBLIC_URL}/video/FDL.mp4";
  const POSTER = "${process.env.PUBLIC_URL}/work.jpg";

  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;

    // Skip any black first frame and kick playback ASAP
    const onLoadedMeta = () => {
      try {
        v.currentTime = 0.01;
      } catch {}
    };
    const onCanPlay = () => {
      v.play().catch(() => {});
    };
    const onEnded = () => {
      v.currentTime = 0;
      v.play().catch(() => {});
    }; // seamless loop

    v.addEventListener("loadedmetadata", onLoadedMeta);
    v.addEventListener("canplaythrough", onCanPlay);
    v.addEventListener("ended", onEnded);

    return () => {
      v.removeEventListener("loadedmetadata", onLoadedMeta);
      v.removeEventListener("canplaythrough", onCanPlay);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <section className="hero">
      {canPlay && (
        <video
          ref={vidRef}
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto" // <— important
          poster={POSTER}
          onError={() => setCanPlay(false)}
        >
          <source src={VIDEO_MP4} type="video/mp4" />
        </video>
      )}

      {!canPlay && <div className="hero-fallback" />}

      <div className="hero-overlay" />
      <div className="hero-inner">
        <h1>Fond du Lac Cold Storage</h1>
        <p className="tag">
          Reliable refrigerated warehousing & professional handling solutions.
        </p>
        <div className="cta">
          <a href="#contact" className="btn dark">
            Get a Quote
          </a>
          <a href="#transport" className="btn light">
            Zip Locator
          </a>
        </div>
        <div className="chips" data-reveal>
          <div className="chip">55°F Climate Control</div>
          <div className="chip">Importer-Friendly 3PL</div>
          <div className="chip">Final-Mile Delivery</div>
        </div>
      </div>
      <div className="fade-bottom" />
    </section>
  );
}

function Ticker() {
  return (
    <div className="ticker">
      <div className="ticker-track">
        <span>55°F Climate Control</span>
        <span>Secure, Organized Storage</span>
        <span>Pick &amp; Pack</span>
        <span>Labeling &amp; Repack</span>
        <span>Final-Mile Delivery</span>
        <span>Real-Time Oversight</span>
        <span>On-Site USDA Inspections</span>
        <span>Cross-Docking in Controlled Conditions</span>
        <span>HACCP-Compliant Handling</span>
        <span>Inventory Lifecycle Reporting</span>
        <span>Eco-Friendly Refrigeration Systems</span>

        {/* duplicate for seamless loop */}
        <span>55°F Climate Control</span>
        <span>Secure, Organized Storage</span>
        <span>Pick &amp; Pack</span>
        <span>Labeling &amp; Repack</span>
        <span>Final-Mile Delivery</span>
        <span>Real-Time Oversight</span>
        <span>On-Site USDA Inspections</span>
        <span>Cross-Docking in Controlled Conditions</span>
        <span>HACCP-Compliant Handling</span>
        <span>Inventory Lifecycle Reporting</span>
        <span>Eco-Friendly Refrigeration Systems</span>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card" data-reveal>
      <div className="card-head">
        <div className="card-icon">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.5"
          >
            <path d="M3 7h13l5 5v5a2 2 0 0 1-2 2H3z" />
            <path d="M16 7v4h5" />
          </svg>
        </div>
        <h3>{title}</h3>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function FlipCardImage({ title, imgSrc, imgAlt, back }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`flipcard ${flipped ? "is-flipped" : ""}`}
      onClick={() => setFlipped((f) => !f)} // tap to flip (mobile)
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && setFlipped((f) => !f)
      }
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
    >
      <div className="flipcard-inner">
        {/* FRONT: full-bleed image with title overlay */}
        <div className="flipcard-face flipcard-front">
          <img className="flip-img" src={imgSrc} alt={imgAlt} />
          <div className="flip-front-overlay" />
          <div className="flip-front-title">
            <h3>{title}</h3>
            <span className="flip-hint">Hover or tap to flip</span>
          </div>
        </div>

        {/* BACK: your text details */}
        <div className="flipcard-face flipcard-back">
          <div className="card-head">
            <div className="card-icon">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                fill="none"
                strokeWidth="1.5"
              >
                <path d="M3 7h13l5 5v5a2 2 0 0 1-2 2H3z" />
                <path d="M16 7v4h5" />
              </svg>
            </div>
            <h3>{title}</h3>
          </div>
          <div className="card-body">{back}</div>
          <div className="flip-hint">Tap again to return</div>
        </div>
      </div>
    </div>
  );
}

function Warehouse() {
  return (
    <section id="warehouse" className="section">
      <div className="section-head" data-reveal>
        <h2>Warehouse</h2>
        <p>
          Purpose-built, climate-controlled storage that protects quality and
          delivers readiness.
        </p>
      </div>

      <div className="grid">
        <FlipCardImage
          title="55°F Climate-Controlled Storage"
          imgSrc="${process.env.PUBLIC_URL}/images/image2.jpg" // <-- replace with your image path
          imgAlt="Climate-controlled warehouse"
          back={
            <>
              Our facility maintains a precise 55 °F environment — ideal for
              wine, cheese, chocolate, craft beer, and other premium goods. Each
              pallet is secured, organized, and monitored for full traceability.
              <ul className="list" style={{ marginTop: 10 }}>
                <li>Continuous temperature monitoring</li>
                <li>SKU/lot/vintage separation</li>
              </ul>
            </>
          }
        />

        <FlipCardImage
          title="Operational Integrity"
          imgSrc="${process.env.PUBLIC_URL}/images/work.jpg" // <-- replace with your image path
          imgAlt="Worker handling inventory"
          back={
            <>
              From inbound receiving to outbound staging, workflows minimize
              dwell time and preserve product integrity, ensuring your inventory
              is ready the moment you need it.
              <ul className="list" style={{ marginTop: 10 }}>
                <li>Appointment-based receiving</li>
                <li>QC checks on arrival</li>
              </ul>
            </>
          }
        />
      </div>
    </section>
  );
}

function Transport() {
  return (
    <section id="transport" className="section soft">
      <div className="section-head" data-reveal>
        <h2>Transportation</h2>
        <p>
          Refrigerated delivery with the same precision as our storage — Find
          out if you are in our range with the Zip Locator
        </p>
      </div>

      <div className="grid">
        <FlipCardImage
          title="Temperature-Assured Transit"
          imgSrc="${process.env.PUBLIC_URL}/images/truck.jpg" // <-- replace with your image path
          imgAlt="Refrigerated truck"
          back={
            <>
              Our dedicated refrigerated fleet keeps products at a constant 55
              °F throughout the journey. Trained drivers handle
              temperature-sensitive goods with care and reliable timing.
              <ul className="list" style={{ marginTop: 10 }}>
                <li>Pre-cooled trailers</li>
                <li>Seal & temperature logs</li>
              </ul>
            </>
          }
        />

        {/* Keep ZIP Locator card as-is */}
        <div className="card" data-reveal>
          <div className="card-head">
            <div className="card-icon">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                fill="none"
                strokeWidth="1.5"
              >
                <path d="M3 7h13l5 5v5a2 2 0 0 1-2 2H3z" />
                <path d="M16 7v4h5" />
              </svg>
            </div>
            <h3>ZIP Coverage</h3>
          </div>
          <div>
            <ZipLocator />
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="section">
      <div className="section-head" data-reveal>
        <h2>Value-Added Services</h2>
        <p>Flexible support designed to fit your operations.</p>
      </div>
      <div className="grid thirds">
        <Card title="Pick &amp; Pack">
          Efficient order assembly and cartonization to meet your downstream
          requirements and timelines.
        </Card>
        <Card title="Labeling">
          SKU relabeling, compliance labels, and retail-ready presentation
          without interrupting your supply chain.
        </Card>
        <Card title="Repacking">
          Case breaking, kitting, and reconfiguration services tailored to
          product and channel needs.
        </Card>
      </div>
    </section>
  );
}

function Contact() {
  const [status, setStatus] = useState({ state: "idle", msg: "" });

  // Your new Apps Script Web App URL
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby8ZH09T1OTdly4pt7vxvOQwGJCbMmHiwVSQ4FW0fNLEOGJEdVRMR3YUYVddgw1UPI/exec";

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append("subject", "New Quote Request — FDL Website"); // optional

    // Simple validation
    if (!fd.get("company") || !fd.get("email")) {
      setStatus({ state: "error", msg: "Company and Email are required." });
      return;
    }

    setStatus({ state: "loading", msg: "Sending..." });

    try {
      // FormData + no-cors = no preflight; response will be opaque in some previews
      await fetch(GAS_URL, { method: "POST", body: fd, mode: "no-cors" });

      setStatus({ state: "success", msg: "Thanks! Your request was emailed." });
      e.target.reset();
    } catch (err) {
      console.error(err);
      setStatus({ state: "error", msg: "Email failed. Please try again." });
    }
  }

  return (
    <section id="contact" className="section">
      <div className="contact" data-reveal>
        <h3>Let’s keep your goods moving</h3>
        <p>
          Tell us about your products and timelines. We’ll propose a storage and
          delivery plan that fits.
        </p>

        <form className="contact-form" onSubmit={handleSubmit}>
          {/* Field names must match what the script expects */}
          <input name="company" placeholder="Company" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="phone" placeholder="Phone" />
          <textarea
            name="details"
            placeholder="Briefly describe your products and delivery needs"
            required
          />

          {/* Honeypot anti-spam */}
          <input
            name="website"
            style={{ display: "none" }}
            tabIndex="-1"
            autoComplete="off"
          />

          <button className="btn dark" disabled={status.state === "loading"}>
            {status.state === "loading" ? "Sending..." : "Request Proposal"}
          </button>
        </form>

        {status.state !== "idle" && (
          <p
            className={
              status.state === "success"
                ? "zip-result ok"
                : status.state === "error"
                ? "zip-result bad"
                : "zip-note"
            }
            style={{ marginTop: 10 }}
          >
            {status.msg}
          </p>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="foot-inner">
        <div className="foot-brand">
          <img
            class="fdl_img"
            src="${process.env.PUBLIC_URL}/images/fdl-logo.png"
          />
          <span>Fond Du Lac Cold Storage</span>
          <p className="muted">
            Temperature-controlled warehousing and delivery. Edison, NJ.
          </p>
        </div>
        <div className="foot-col">
          <div className="foot-title">Explore</div>
          <a href="#warehouse">Warehouse</a>
          <a href="#transport">Transport</a>
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
          <a href="https://dntexpress.com/">DNT Express</a>
          <a href="http://www.fdlwarehouse.com/imlogin.php?loginstatus=-3">
            FDL Staff Login
          </a>
        </div>
        <div className="foot-col">
          <div className="foot-title">Contact</div>
          <div>Email: info@fdlwarehouse.com</div>
          <div>Phone: (732) 650-9200</div>
          <div>Address: 78 Saw Mill Pond Rd, Edison, NJ</div>
        </div>
      </div>
      <div className="foot-copy">
        © {new Date().getFullYear()} FDL Cold Storage. All rights reserved.
      </div>
    </footer>
  );
}

export default function App() {
  const ref = useReveal();
  return (
    <div ref={ref}>
      <Navbar />
      <Hero />
      <Ticker />
      <Warehouse />
      <Transport />
      <Services />
      <Contact />
      <Footer />
    </div>
  );
}
