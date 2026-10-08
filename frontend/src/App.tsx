import { useState } from "react";
import {
  ArrowRight,
  Backpack,
  Check,
  ChevronLeft,
  Compass,
  MapPin,
  Moon,
  Mountain,
  Navigation,
  PhoneOff,
  Sparkles,
  Sun,
  Timer,
  Trees,
} from "lucide-react";
import "./App.css";

type Mission = {
  title: string;
  description: string;
};

type Adventure = {
  title: string;
  description: string;
  duration_minutes: number;
  route_idea: string;
  missions: Mission[];
  things_to_notice: string[];
  packing_list: string[];
  safety: string[];
  phone_rule: string;
};

type Step = "home" | "plan" | "adventure" | "reflect" | "journal";

const API = "/api";

export default function App() {
  const [step, setStep] = useState<Step>("home");
  const [location, setLocation] = useState("Local park");
  const [activity, setActivity] = useState("walking");
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState("easy");
  const [interests, setInterests] = useState<string[]>(["nature"]);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [completed, setCompleted] = useState<boolean[]>([]);
  const [observations, setObservations] = useState("");
  const [highlight, setHighlight] = useState("");
  const [journal, setJournal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((x) => x !== interest)
        : [...current, interest],
    );
  };

  const createAdventure = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/adventure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          activity,
          duration,
          difficulty,
          interests,
        }),
      });

      const raw = await response.text();

      let data: any;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          raw.trim()
            ? `Server returned an invalid response: ${raw.slice(0, 300)}`
            : "The AI server returned an empty response. Make sure llama-server is running."
        );
      }

      if (!response.ok) {
        throw new Error(data.detail || "Could not create adventure.");
      }

      if (!data.adventure) {
        throw new Error("The AI did not return an adventure.");
      }

      setAdventure(data.adventure);
      setCompleted(new Array(data.adventure.missions.length).fill(false));
      setStep("adventure");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const createJournal = async () => {
    if (!adventure) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adventure_title: adventure.title,
          location,
          duration,
          completed_missions: adventure.missions
            .filter((_, index) => completed[index])
            .map((mission) => mission.title),
          observations,
          highlights: highlight,
        }),
      });

      const raw = await response.text();

      let data: any;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          raw.trim()
            ? `Server returned an invalid response: ${raw.slice(0, 300)}`
            : "The AI server returned an empty response."
        );
      }

      if (!response.ok) {
        throw new Error(data.detail || "Could not create journal.");
      }

      if (!data.journal) {
        throw new Error("The AI did not return a journal.");
      }

      setJournal(data.journal);
      setStep("journal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const completedCount = completed.filter(Boolean).length;

  if (step === "home") {
    return (
      <main className="app">
        <nav className="nav">
          <div className="brand">
            <div className="brand-mark">
              <Trees size={19} />
            </div>
            <span>TrailMate</span>
          </div>

          <div className="nav-pill">
            <span className="status-dot" />
            Local AI
          </div>
        </nav>

        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={15} />
              Powered by open-source AI
            </div>

            <h1>
              Touch grass.
              <br />
              <em>Actually.</em>
            </h1>

            <p className="hero-text">
              TrailMate turns your free time into a small outdoor adventure —
              then tells you to put your phone away.
            </p>

            <button className="primary-button" onClick={() => setStep("plan")}>
              Plan an adventure
              <ArrowRight size={18} />
            </button>

            <div className="hero-note">
              <PhoneOff size={15} />
              The screen should be the shortest part of the experience.
            </div>
          </div>

          <div className="hero-art">
            <div className="sun">
              <Sun size={30} />
            </div>
            <div className="mountain mountain-back" />
            <div className="mountain mountain-front" />
            <div className="trail" />
            <div className="tree tree-one">🌲</div>
            <div className="tree tree-two">🌲</div>
          </div>
        </section>

        <section className="how">
          <div className="section-heading">
            <span>THE LOOP</span>
            <h2>Less screen. More world.</h2>
          </div>

          <div className="steps">
            {[
              ["01", "Plan", "Tell TrailMate what you want to explore."],
              ["02", "Go", "Get your missions, then put the phone away."],
              ["03", "Notice", "Look around. Walk. Listen. Explore."],
              ["04", "Remember", "Come back and turn the experience into a journal."],
            ].map(([number, title, text]) => (
              <div className="loop-card" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <footer>
          <span>TrailMate</span>
          <span>Qwen3-0.6B · llama.cpp · FastAPI</span>
        </footer>
      </main>
    );
  }

  if (step === "plan") {
    return (
      <main className="app narrow">
        <Header onBack={() => setStep("home")} />

        <section className="planner">
          <div className="eyebrow">
            <Compass size={15} />
            Adventure planner
          </div>

          <h1>Where are we going?</h1>
          <p className="subtext">
            Give TrailMate a few details. It'll handle the rest.
          </p>

          <label>Location</label>
          <div className="input-wrap">
            <MapPin size={18} />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Lodhi Garden"
            />
          </div>

          <label>Activity</label>
          <div className="choice-grid">
            {["walking", "cycling", "nature walk", "photography"].map((x) => (
              <button
                className={activity === x ? "choice active" : "choice"}
                onClick={() => setActivity(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>

          <label>Time available</label>
          <div className="duration-row">
            {[30, 60, 90, 120].map((x) => (
              <button
                className={duration === x ? "choice active" : "choice"}
                onClick={() => setDuration(x)}
                key={x}
              >
                {x} min
              </button>
            ))}
          </div>

          <label>Difficulty</label>
          <div className="choice-grid three">
            {["easy", "moderate", "challenging"].map((x) => (
              <button
                className={difficulty === x ? "choice active" : "choice"}
                onClick={() => setDifficulty(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>

          <label>What interests you?</label>
          <div className="choice-grid">
            {["nature", "photography", "birds", "history", "quiet", "fitness"].map(
              (x) => (
                <button
                  className={interests.includes(x) ? "choice active" : "choice"}
                  onClick={() => toggleInterest(x)}
                  key={x}
                >
                  {x}
                </button>
              ),
            )}
          </div>

          {error && <div className="error">{error}</div>}

          <button
            className="primary-button full"
            onClick={createAdventure}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Creating your adventure...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Create my adventure
              </>
            )}
          </button>

          <div className="local-ai-note">
            <Sparkles size={16} />
            <div>
              <strong>Running locally</strong>
              <p>Your adventure is generated by Qwen3-0.6B through llama.cpp.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (step === "adventure" && adventure) {
    return (
      <main className="app narrow">
        <Header onBack={() => setStep("plan")} />

        <section className="adventure">
          <div className="adventure-top">
            <div>
              <div className="eyebrow">
                <Mountain size={15} />
                Your adventure
              </div>
              <h1>{adventure.title}</h1>
              <p className="subtext">{adventure.description}</p>
            </div>

            <div className="time-badge">
              <Timer size={16} />
              {adventure.duration_minutes} min
            </div>
          </div>

          <div className="phone-rule">
            <PhoneOff size={21} />
            <div>
              <strong>Phone-away rule</strong>
              <p>{adventure.phone_rule}</p>
            </div>
          </div>

          <div className="route-card">
            <Navigation size={19} />
            <div>
              <small>ROUTE IDEA</small>
              <p>{adventure.route_idea}</p>
            </div>
          </div>

          <div className="progress">
            <div>
              <span>Your missions</span>
              <strong>
                {completedCount}/{adventure.missions.length}
              </strong>
            </div>
            <div className="progress-track">
              <div
                style={{
                  width: `${(completedCount / adventure.missions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="missions">
            {adventure.missions.map((mission, index) => (
              <button
                className={completed[index] ? "mission done" : "mission"}
                onClick={() =>
                  setCompleted((current) =>
                    current.map((value, i) => (i === index ? !value : value)),
                  )
                }
                key={index}
              >
                <div className="mission-check">
                  {completed[index] ? <Check size={16} /> : index + 1}
                </div>
                <div>
                  <strong>{mission.title}</strong>
                  <p>{mission.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="two-column">
            <InfoCard title="Things to notice" items={adventure.things_to_notice} />
            <InfoCard title="Pack" items={adventure.packing_list} icon={<Backpack size={17} />} />
          </div>

          <div className="safety">
            <strong>Before you go</strong>
            {adventure.safety.map((item, i) => (
              <p key={i}>• {item}</p>
            ))}
          </div>

          <button
            className="primary-button full"
            onClick={() => setStep("reflect")}
          >
            I’m back — reflect on my adventure
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
    );
  }

  if (step === "reflect") {
    return (
      <main className="app narrow">
        <Header onBack={() => setStep("adventure")} />

        <section className="planner">
          <div className="eyebrow">
            <Sun size={15} />
            Welcome back
          </div>

          <h1>What did you notice?</h1>
          <p className="subtext">
            Don't worry about writing perfectly. Just remember the experience.
          </p>

          <label>Observations</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="A bird I hadn't noticed before, the smell of wet soil..."
          />

          <label>Best moment</label>
          <textarea
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            placeholder="The best part was..."
          />

          {error && <div className="error">{error}</div>}

          <button
            className="primary-button full"
            onClick={createJournal}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Writing your journal...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Create my adventure journal
              </>
            )}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app narrow">
      <Header onBack={() => setStep("reflect")} />

      <section className="journal">
        <div className="eyebrow">
          <Moon size={15} />
          Adventure Journal
        </div>

        <h1>Worth remembering.</h1>

        <article className="journal-card">
          {journal.split("\n").map((line, index) => (
            <p key={index} className={line.startsWith("#") ? "journal-title" : ""}>
              {line || "\u00A0"}
            </p>
          ))}
        </article>

        <div className="journal-footer">
          <Trees size={18} />
          <span>Another adventure is waiting.</span>
        </div>

        <button className="primary-button full" onClick={() => setStep("home")}>
          Plan another adventure
          <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <nav className="nav">
      <button className="back" onClick={onBack}>
        <ChevronLeft size={18} />
        Back
      </button>

      <div className="brand">
        <div className="brand-mark">
          <Trees size={19} />
        </div>
        <span>TrailMate</span>
      </div>

      <div className="nav-pill">
        <span className="status-dot" />
        Local AI
      </div>
    </nav>
  );
}

function InfoCard({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="info-card">
      <h3>{icon || <Trees size={17} />} {title}</h3>
      {items.map((item, i) => (
        <p key={i}>• {item}</p>
      ))}
    </div>
  );
}
