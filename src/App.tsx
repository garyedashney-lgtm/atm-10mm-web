// @ts-nocheck
// src/App.tsx
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import AppLogo from "./assets/app_logo.png";
import FourPsShield from "./assets/four_ps.png";
import IdentityInCrisis from "./assets/identityncrisis.png";
import AdvisorToMen from "./assets/ic_advisortomen.png";
// For later use:
// import PowerNLove from "./assets/powernlove.png";
// import TenRLogo from "./assets/tenr_logo.png";


function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // which top-level section is active: Daily, Weekly, Goals, Journal, More
  const [activeSection, setActiveSection] = useState<
    "daily" | "weekly" | "goals" | "journal" | "more" | "admin"
  >("daily");

  const [shieldPreview, setShieldPreview] = useState<
    { src: string; alt: string } | null
  >(null);

    // 🔥 Weekly reset token – bump this to clear Weekly screen
  const [weeklyResetToken, setWeeklyResetToken] = useState(0);


  // Watch auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveSection("daily");
  };

  // --- Auth loading state ---
  if (checkingAuth) {
    return (
      <div style={styles.page}>
        <div style={styles.centerCard}>
          <h1 style={styles.centerTitle}>ATM 10MM Web</h1>
          <p>Checking login status…</p>
        </div>
      </div>
    );
  }

  // --- Logged-out view: login card ---
  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.centerCard}>
          <h1 style={styles.centerTitle}>ATM 10MM Web</h1>
          <p>Sign in with the same email and password you use in the 10MM app.</p>

          <form onSubmit={handleLogin} style={styles.form}>
            <label style={styles.label}>
              Email
              <input
                style={styles.input}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label style={styles.label}>
              Password
              <input
                style={styles.input}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <div style={styles.error}>{error}</div>}

            <button
              style={styles.primaryButton}
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Logged-in view ---

  let mainContent: JSX.Element;
  switch (activeSection) {
    case "daily":
      mainContent = <DailyScreen />;
      break;
    case "weekly":
      mainContent = <WeeklyScreen resetToken={weeklyResetToken} />;
      break;
    case "goals":
      mainContent = <GoalsScreen />;
      break;
    case "journal":
      mainContent = <JournalScreen />;
      break;
    case "more":
      mainContent = (
        <PlaceholderFull label="More (settings / account / squad)" />
      );
      break;
    case "admin":
      mainContent = (
        <PlaceholderFull label="Admin (tiers, squads, users – coming soon)" />
      );
      break;
    default:
      mainContent = <DailyScreen />;
  }
// Weekly actions – wired to header buttons
  const handleWeeklyClearAll = () => {
    // Bump token → WeeklyScreen remounts → all local state cleared
    setWeeklyResetToken((t) => t + 1);
  };

  const handleWeeklyShare = () => {
    // Stub for now – later we’ll build a Weekly snapshot string
    alert("Share Weekly snapshot (coming soon)");
  };


    // --- Header title / subtitle / icon by section ---
  let headerTitle = "";
  let headerSubtitle = "ATM 10MM App · Web Companion";
  let headerIcon = "";

  switch (activeSection) {
    case "daily":
      headerTitle = "Daily Defender Actions";
      headerIcon = "✅";
      break;
    case "weekly":
      headerTitle = "Weekly Check-In";
      headerIcon = "📆";
      break;
    case "goals":
      headerTitle = "Goals & Defender Destiny";
      headerIcon = "🎯";
      break;
    case "journal":
      headerTitle = "Journal";
      headerIcon = "📝";
      break;
    case "more":
      headerTitle = "More";
      headerIcon = "⚙️";
      break;
    case "admin":
      headerTitle = "Admin Console";
      headerIcon = "🛡️";
      break;
    default:
      headerTitle = "Daily Defender Actions";
      headerIcon = "✅";
  }

  // --- Shield image / alt by section ---
let shieldImage: string = AppLogo;
let shieldAlt = "ATM 10MM Shield";

switch (activeSection) {
  case "daily":
  case "weekly":
    shieldImage = FourPsShield;
    shieldAlt = "Four Quadrant 4Ps shield";
    break;

  case "goals":
    shieldImage = IdentityInCrisis;
    shieldAlt = "Identity In Crisis shield";
    break;

  case "journal":
  case "more":
    shieldImage = AppLogo;
    shieldAlt = "ATM 10MM Logo";
    break;

  case "admin":
    // Temporarily use the app logo for Admin too
    shieldImage = AppLogo;
    shieldAlt = "ATM 10MM Logo";
    break;

  default:
    shieldImage = AppLogo;
    shieldAlt = "ATM 10MM Shield";
}

  // Simple stub for now – later we’ll wire this to Firestore roles / claims
  const isAdmin = true;

  return (
  <div style={styles.page}>
    <div style={styles.appShell}>
      {/* Top bar */}
      <header style={styles.header}>
        {/* Left: shield */}
        <button
          style={styles.shieldButton}
          type="button"
          onClick={() => setShieldPreview({ src: shieldImage, alt: shieldAlt })}
        >
          <img
            src={shieldImage}
            alt={shieldAlt}
            style={styles.shieldImageSmall}
          />
          <span style={styles.shieldLabel}>Shield</span>
        </button>

        {/* Center: title (changes per section) */}
        <div style={styles.headerCenter}>
          <div style={styles.appName}>
            <span style={styles.appNameIcon}>{headerIcon}</span>
            <span>{headerTitle}</span>
          </div>
          <div style={styles.appSubtitle}>{headerSubtitle}</div>
        </div>

        {/* Right: profile */}
        <div style={styles.userBlock}>
          <div style={styles.userMeta}>
            <div style={styles.userEmail}>{user?.email}</div>
            <button style={styles.signOutLink} onClick={handleLogout}>
              Sign out
            </button>
          </div>
          <div style={styles.avatarCircle}>
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </header>

      {/* Simple stub for now – later we’ll wire this to Firestore roles */}
      {/* TODO: set this to false for regular users, or read from Firestore */}

      {/* Nav row */}
      <nav style={styles.navRow}>
        {/* Left side nav buttons */}
        <div style={styles.navButtonsLeft}>
          {renderNavButton("daily", "Daily", activeSection, setActiveSection)}
          {renderNavButton("weekly", "Weekly", activeSection, setActiveSection)}
          {renderNavButton("goals", "Goals", activeSection, setActiveSection)}
          {renderNavButton("journal", "Journal", activeSection, setActiveSection)}
          {renderNavButton("more", "More", activeSection, setActiveSection)}
          {isAdmin &&
            renderNavButton("admin", "Admin", activeSection, setActiveSection)}
        </div>

        {/* Weekly-only overlay buttons — FLOAT ABOVE nav row without altering height */}
        {activeSection === "weekly" && (
          <div style={styles.weeklyOverlayButtons}>
            <button
              style={styles.headerActionButton}
              onClick={handleWeeklyClearAll}
            >
              Clear all
            </button>
            <button
              style={styles.headerActionButton}
              onClick={handleWeeklyShare}
            >
              Share
            </button>
          </div>
        )}
      </nav>
      {/* Shield preview modal */}
      {shieldPreview && (
        <div
          style={styles.shieldModalOverlay}
          onClick={() => setShieldPreview(null)}
        >
          <div
            style={styles.shieldModalInner}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={shieldPreview.src}
              alt={shieldPreview.alt}
              style={styles.shieldModalImage}
            />
            <button
              type="button"
              style={styles.shieldModalCloseButton}
              onClick={() => setShieldPreview(null)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Main content – this is our ONLY scroll area */}
      <main style={styles.main}>
        <div style={styles.contentFrame}>{mainContent}</div>
      </main>
    </div>
  </div>
);
}

// --- Sub-components ---

function renderNavButton(
  key: any,
  label: string,
  activeSection: any,
  setActiveSection: any
) {
  const isActive = activeSection === key;
  return (
    <button
      onClick={() => setActiveSection(key)}
      style={{
        ...styles.navButton,
        opacity: isActive ? 1 : 0.7,
        borderBottom: isActive ? "2px solid #22c55e" : "2px solid transparent",
      }}
    >
      {label}
    </button>
  );
}

function DailyScreen() {
  // Local Daily 4P toggle state (we'll wire to Firestore later)
  const [dailyCompleted, setDailyCompleted] = useState({
    phys: false,
    piety: false,
    people: false,
    prod: false,
  });

  const togglePillar = (key: "phys" | "piety" | "people" | "prod") => {
    setDailyCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Focused activity per pillar (web-local for now)
  const [focus, setFocus] = useState({
    phys: "",
    piety: "",
    people: "",
    prod: "",
  });

  const updateFocus = (
    key: "phys" | "piety" | "people" | "prod",
    value: string
  ) => {
    setFocus((prev) => ({ ...prev, [key]: value }));
  };

  // Simple local To-Do list for now (later we can persist / sync)
  const [todos, setTodos] = useState<
    { id: number; text: string; done: boolean }[]
  >([{ id: 1, text: "", done: false }]);

  const addTodo = () => {
    setTodos((prev) => [...prev, { id: Date.now(), text: "", done: false }]);
  };

  const updateTodoText = (id: number, text: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const removeTodo = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div style={styles.actionsLayout}>
      {/* LEFT: DAILY */}
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Daily 4P Checklist</h2>
          <div style={styles.panelSubTitle}>
            Today’s Defender actions across Physiology, Piety, People,
            Production.
          </div>
        </div>

        <div style={styles.dailyGrid}>
          <DailyQuadrant
            title="Physiology"
            emoji="💪"
            description="The body is the universal address of your existence: Breath, walk, lift, bike, hike, stretch, sleep, fast, eat clean, supplement, hydrate, etc."
            active={dailyCompleted.phys}
            focusText={focus.phys}
            onChangeFocus={(val: string) => updateFocus("phys", val)}
            onToggle={() => togglePillar("phys")}
          />
          <DailyQuadrant
            title="Piety"
            emoji="🙏"
            description="Using mystery & awe as the spirit speaks for the soul: 3 blessings, waking up, end-of-day prayer, body scan & resets, the watcher, etc."
            active={dailyCompleted.piety}
            focusText={focus.piety}
            onChangeFocus={(val: string) => updateFocus("piety", val)}
            onToggle={() => togglePillar("piety")}
          />
          <DailyQuadrant
            title="People"
            emoji="🤝"
            description="Team Human: herd animals who exist in each other: Light people up, reverse the flow, problem solve & collaborate in Defense of Meaning and Freedom, etc."
            active={dailyCompleted.people}
            focusText={focus.people}
            onChangeFocus={(val: string) => updateFocus("people", val)}
            onToggle={() => togglePillar("people")}
          />
          <DailyQuadrant
            title="Production"
            emoji="📈"
            description="A man produces more than he consumes: Set goals, share talents, make the job the boss, track progress, Pareto Principle, no one outworks me, etc."
            active={dailyCompleted.prod}
            focusText={focus.prod}
            onChangeFocus={(val: string) => updateFocus("prod", val)}
            onToggle={() => togglePillar("prod")}
          />
        </div>
      </section>

      {/* RIGHT: TO-DO + STATS / LEADERBOARD (two separate cards, full width) */}
      <section style={styles.panelRightColumn}>
        {/* Card 1: To-Do List */}
        <div style={styles.subPanelCard}>
          <div style={styles.notesHeaderRow}>
            <span style={{ fontSize: 16, marginRight: 6 }}>📝</span>
            <span style={styles.subPanelTitle}>To-Do List</span>
            <span style={{ flex: 1 }} />
            <button style={styles.addTodoButton} onClick={addTodo}>
              + Add item
            </button>
          </div>
          <div style={styles.notesSubtext}>
            Checked items clear at midnight. (For now this list is local to
            this browser.)
          </div>

          <div style={styles.todoList}>
            {todos.map((todo) => {
              const isDone = todo.done;
              return (
                <div key={todo.id} style={styles.todoRow}>
                  {/* Custom checkbox like Daily 4P */}
                  <span
                    onClick={() => toggleTodo(todo.id)}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: isDone
                        ? "1px solid #bbf7d0"
                        : "1px solid rgba(148,163,184,0.8)",
                      background: isDone ? "#22c55e" : "transparent",
                      boxShadow: isDone
                        ? "0 0 0 1px rgba(22,163,74,0.6)"
                        : "none",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition:
                        "background 0.16s ease-out, box-shadow 0.16s ease-out, border-color 0.16s ease-out",
                    }}
                  >
                    {isDone ? (
                      <span
                        style={{
                          fontSize: 11,
                          lineHeight: 1,
                          color: "#ffffff",
                        }}
                      >
                        ✓
                      </span>
                    ) : null}
                  </span>

                  <input
                    type="text"
                    value={todo.text}
                    onChange={(e) => updateTodoText(todo.id, e.target.value)}
                    placeholder="New task..."
                    style={{
                      ...styles.todoInput,
                      textDecoration: todo.done ? "line-through" : "none",
                      opacity: todo.done ? 0.6 : 1,
                    }}
                  />
                  <button
                    style={styles.todoDeleteButton}
                    onClick={() => removeTodo(todo.id)}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Daily Stats + Leaderboard */}
        <div style={styles.subPanelCard}>
          {/* Daily Stats heading */}
          <div style={styles.notesHeaderRow}>
            <span style={{ fontSize: 16, marginRight: 6 }}>📊</span>
            <span style={styles.subPanelTitle}>Daily Stats (placeholder)</span>
          </div>
          <div style={styles.notesSubtext}>
            These will mirror the 7 / 30 / 60 day Daily totals from your phone
            app once we wire up Firestore aggregation.
          </div>

          {/* Stats cards */}
          <div style={styles.weeklyCards}>
            <div style={styles.weeklyStatCard}>
              <div style={styles.weeklyStatLabel}>7-day Daily total</div>
              <div style={styles.weeklyStatValue}>—</div>
              <div style={styles.weeklyStatHint}>
                Soon: pulled from the same Firebase docs as your Daily
                checklist.
              </div>
            </div>

            <div style={styles.weeklyStatCard}>
              <div style={styles.weeklyStatLabel}>30-day Daily total</div>
              <div style={styles.weeklyStatValue}>—</div>
              <div style={styles.weeklyStatHint}>
                This will mirror the Stats page on your phone app.
              </div>
            </div>

            <div style={styles.weeklyStatCard}>
              <div style={styles.weeklyStatLabel}>60-day Daily total</div>
              <div style={styles.weeklyStatValue}>—</div>
              <div style={styles.weeklyStatHint}>
                Perfect for seeing long-range consistency and trend.
              </div>
            </div>
          </div>

          {/* Leaderboard block */}
          <div style={{ marginTop: 10 }}>
            <div style={styles.subPanelTitle}>Squad Leaderboard (coming)</div>
            <div style={styles.notesSubtext}>
              We’ll use the same Daily stats stored in Firebase plus squad names
              to rank each man’s 4P totals. This panel becomes your “Scoreboard”
              once we wire the backend.
            </div>

            <div style={{ marginTop: 8, ...styles.weeklyStatCard }}>
              <div style={styles.weeklyStatLabel}>Your current squad rank</div>
              <div style={styles.weeklyStatValue}>— / —</div>
              <div style={styles.weeklyStatHint}>
                Placeholder: this will reflect real-time squad ranking once
                Firestore structures are in place.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function WeeklyScreen({ resetToken }: { resetToken: number }) {
  return (
    <div key={resetToken} style={styles.actionsLayout}>
      {/* LEFT: WEEKLY 4P CHECK-IN */}
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Weekly Check-In</h2>
          <div style={styles.panelSubTitle}>
            7-day 4P reflections: short summaries for Physiology, Piety, People,
            Production.
          </div>
        </div>

        <div style={styles.weeklyLeftColumn}>
          <WeeklySectionCard
            icon="🏋"
            title="Physiology"
            subtitle="The body is the universal address of your existence."
            placeholder="type your notes here…"
          />
          <WeeklySectionCard
            icon="🙏"
            title="Piety"
            subtitle="Using mystery & awe as the spirit speaks for the soul."
            placeholder="type your notes here…"
          />
          <WeeklySectionCard
            icon="👥"
            title="People"
            subtitle="Team Human: herd animals who exist in each other."
            placeholder="type your notes here…"
          />
          <WeeklySectionCard
            icon="💼"
            title="Production"
            subtitle="A man produces more than he consumes."
            placeholder="type your notes here…"
          />
        </div>
      </section>

      {/* RIGHT: WINS + ONE THING + EXTRA NOTES */}
      <section style={styles.panelRightColumn}>
        {/* Wins / Losses – right pane */}
        <WeeklySectionCard
          icon="⚖️"
          title="Wins / Losses"
          placeholder="type your notes here…"
        />

        {/* This Week’s One Thing Done */}
        <WeeklyOneThingCard />

        {/* One Thing for Next Week */}
        <WeeklySectionCard
          icon="🎯"
          title="One Thing for Next Week"
          placeholder="type your notes here…"
        />

        {/* Extra Notes */}
        <WeeklySectionCard
          icon="📓"
          title="Extra Notes"
          placeholder="type your extra notes here…"
        />
      </section>
    </div>
  );
}

function JournalScreen() {
  type JournalKey =
    | "freeFlow"
    | "gratitude"
    | "blessings"
    | "cageWolf"
    | "tenR"
    | "selfCare"
    | "library";

  const items: {
    key: JournalKey;
    title: string;
    subtitle: string;
    emoji: string;
  }[] = [
    {
      key: "freeFlow",
      title: "Free Flow",
      subtitle: "– Talk! Let it rip with unfiltered writing.",
      emoji: "📓",
    },
    {
      key: "gratitude",
      title: "Gratitude",
      subtitle: "– Thanks! Capture today’s gifts and graces.",
      emoji: "🙏",
    },
    {
      key: "blessings",
      title: "3 Blessings",
      subtitle: "– Tally! Three concrete blessings from today.",
      emoji: "✨",
    },
    {
      key: "cageWolf",
      title: "Cage The Wolf",
      subtitle: "– Tempted? De-fang the urge on paper.",
      emoji: "🐺",
    },
    {
      key: "tenR",
      title: "10R Process",
      subtitle: "– Triggered? Walk the full 10R outline.",
      emoji: "📝",
    },
    {
      key: "selfCare",
      title: "Self Care Writing",
      subtitle: "– Traumatized? Structured care for your nervous system.",
      emoji: "🪞",
    },
    {
      key: "library",
      title: "Journal Library Search",
      subtitle: "Find past entries by title, date, or keywords.",
      emoji: "🔍",
    },
  ];

  const [selectedKey, setSelectedKey] = useState<JournalKey>("freeFlow");
  const selected = items.find((i) => i.key === selectedKey)!;

  return (
    <div style={styles.actionsLayout}>
      {/* LEFT: list of outlines + library */}
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Journal</h2>
          <div style={styles.panelSubTitle}>
            Start a new outline, or open the library to search past entries.
          </div>
        </div>

        <div style={styles.goalsList}>
          {/* “New Journal” block label */}
          <div style={styles.goalsSectionLabel}>New Journal</div>

          {items
            .filter((i) => i.key !== "library")
            .map((item) => {
              const isActive = item.key === selectedKey;
              const cardStyle = isActive
                ? {
                    ...styles.goalsCard,
                    borderColor: "#22c55e",
                    boxShadow:
                      "0 0 0 1px rgba(34,197,94,0.5), 0 18px 40px rgba(0,0,0,0.55)",
                  }
                : styles.goalsCard;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedKey(item.key)}
                  style={cardStyle}
                >
                  <div style={styles.goalsEmojiCircle}>{item.emoji}</div>
                  <div style={styles.goalsCardTextBlock}>
                    <div style={styles.goalsCardTitle}>{item.title}</div>
                    <div style={styles.goalsCardSubtitle}>
                      {item.subtitle}
                    </div>
                  </div>
                  <div style={styles.goalsChevron}>›</div>
                </button>
              );
            })}

          <div style={{ height: 18 }} />

          {/* Library section */}
          <div style={styles.goalsSectionLabel}>Journal Library</div>

          {items
            .filter((i) => i.key === "library")
            .map((item) => {
              const isActive = item.key === selectedKey;
              const cardStyle = isActive
                ? {
                    ...styles.goalsCard,
                    borderColor: "#22c55e",
                    boxShadow:
                      "0 0 0 1px rgba(34,197,94,0.5), 0 18px 40px rgba(0,0,0,0.55)",
                  }
                : styles.goalsCard;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedKey(item.key)}
                  style={cardStyle}
                >
                  <div style={styles.goalsEmojiCircle}>{item.emoji}</div>
                  <div style={styles.goalsCardTextBlock}>
                    <div style={styles.goalsCardTitle}>{item.title}</div>
                    <div style={styles.goalsCardSubtitle}>
                      {item.subtitle}
                    </div>
                  </div>
                  <div style={styles.goalsChevron}>›</div>
                </button>
              );
            })}
        </div>
      </section>

            {/* RIGHT: detail pane */}
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>{selected.title}</h2>
                <div style={styles.panelSubTitle}>{selected.subtitle}</div>
              </div>

              {selectedKey === "freeFlow" ? (
                <FreeFlowDetail />
              ) : selectedKey === "gratitude" ? (
                <GratitudeDetail />
              ) : selectedKey === "library" ? (
                <div style={styles.goalsDetailBody}>
                  <p style={styles.goalsDetailText}>
                    This will become your full <strong>Journal Library Search</strong>{" "}
                    – with filters for date, outline type, and keywords, mirroring the
                    phone app.
                  </p>
                  <p style={styles.goalsDetailText}>
                    For now, use the library on your phone for searching and filtering
                    past entries. We’ll wire this panel into the same journal data in
                    Firebase later.
                  </p>
                </div>
              ) : (
                <div style={styles.goalsDetailBody}>
                  <p style={styles.goalsDetailText}>
                    This pane will mirror the full <strong>{selected.title}</strong>{" "}
                    outline from your mobile app — prompts, helper bullets, and all.
                  </p>
                  <p style={styles.goalsDetailText}>
                    For now, treat this as a map while we build out each web editor.
                  </p>
                </div>
              )}
          </section>
    </div>
  );
}

function JournalOutlineDetail({ selected }: { selected: any }) {
  return (
    <div style={styles.goalsDetailBody}>
      <p style={styles.goalsDetailText}>
        This pane will become the full{" "}
        <strong>{selected.title}</strong> outline from your phone app — including
        prompts, helper text, and save-to-Journal behavior.
      </p>
      <p style={styles.goalsDetailText}>
        For now, use this as a planning map: keep the outline title visible here
        while you run the full protocol on your phone.
      </p>
      <ul style={styles.goalsDetailList}>
        <li>
          Each outline will later support rich editing, keyboard helpers, and
          “Save to Journal” from the web.
        </li>
        <li>
          We&apos;ll sync entries via Firebase so your web and mobile journals
          stay in lockstep.
        </li>
      </ul>
    </div>
  );
}

function JournalSearchDetail() {
  const [query, setQuery] = useState("");

  return (
    <div style={styles.goalsDetailBody}>
      <div style={{ marginBottom: 8 }}>
        <p style={styles.goalsDetailText}>
          Search your entire Journal Library by text, outline type, or date
          range.
        </p>
        <p style={styles.goalsDetailText}>
          This stub will later connect to the same Firestore-backed Journal
          index your phone app uses.
        </p>
      </div>

      <div
        style={{
          marginTop: 4,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search journal entries…"
          style={{
            flex: 1,
            borderRadius: 999,
            border: "1px solid rgba(55,65,81,1)",
            padding: "8px 14px",
            fontSize: 13,
            background: "#020617",
            color: "#e5e7eb",
            outline: "none",
          }}
        />
        <button
          type="button"
          style={{
            borderRadius: 999,
            border: "none",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: "#22c55e",
            color: "#022c22",
            whiteSpace: "nowrap",
          }}
        >
          Search
        </button>
      </div>

      <div
        style={{
          marginTop: 10,
          borderRadius: 12,
          border: "1px solid rgba(55,65,81,0.95)",
          padding: "10px 12px",
          background: "rgba(15,23,42,0.96)",
          fontSize: 12,
          opacity: 0.85,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Results (coming soon)
        </div>
        <div>
          We&apos;ll show a list of matching entries here with date, outline
          type, and a snippet — and let you click through to read the full
          journal.
        </div>
      </div>
    </div>
  );
}

function FreeFlowDetail() {
  const [createdAt] = useState<Date>(new Date());
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isEditing, setIsEditing] = useState(true);

  const canSave = title.trim().length > 0 || body.trim().length > 0;

  const formatShort = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleSave = () => {
    if (!canSave) return;
    setUpdatedAt(new Date());
    // For now this is local-only; later we’ll sync to Firestore/Journal
    alert("Saved (local only for now). Web journal sync coming later.");
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleClear = () => {
    setTitle("");
    setBody("");
    setIsEditing(true);
  };

  return (
    <div style={styles.csBody}>
      {/* Created / Updated row */}
      <div style={{ marginBottom: 4, display: "flex", gap: 8, fontSize: 11 }}>
        <span>Created {formatShort(createdAt)}</span>
        <span style={{ opacity: 0.7 }}>•</span>
        <span style={{ opacity: 0.7 }}>Updated {formatShort(updatedAt)}</span>
      </div>

      {/* Intro */}
      <div style={styles.csIntro}>
        <div style={styles.csIntroTitle}>Free Flow — Talk!</div>
        <div style={styles.csIntroText}>
          Dump the full story on the page. No edits, no filters, no fixing.
          Just keep your fingers moving.
        </div>
      </div>

      {/* Title */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>🧠</span>
          <span style={styles.csPillarTitle}>Title</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => isEditing && setTitle(e.target.value)}
          placeholder="Give this entry a title…"
          style={{
            ...styles.todoInput,
            marginTop: 6,
            width: "100%",
          }}
        />
      </div>

      {/* Body */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>📓</span>
          <span style={styles.csPillarTitle}>Your thoughts</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          Type until the charge drops. Don&apos;t worry about spelling,
          grammar, or structure.
        </div>
        <textarea
          style={{ ...styles.csTextarea, marginTop: 4 }}
          placeholder="Start typing and don’t stop..."
          value={body}
          onChange={(e) => isEditing && setBody(e.target.value)}
        />
      </div>

      {/* Buttons row */}
      <div style={styles.csSaveRow}>
        <div style={{ display: "flex", gap: 8 }}>
          {isEditing ? (
            <button
              type="button"
              style={{
                ...styles.csSaveButton,
                opacity: canSave ? 1 : 0.4,
                cursor: canSave ? "pointer" : "default",
              }}
              disabled={!canSave}
              onClick={handleSave}
            >
              Save
            </button>
          ) : (
            <button
              type="button"
              style={styles.csSaveButton}
              onClick={handleEdit}
            >
              Edit
            </button>
          )}

          <button
            type="button"
            style={{
              ...styles.csSaveButton,
              background: "transparent",
              border: "1px solid rgba(148,163,184,0.7)",
              color: "#e5e7eb",
            }}
            onClick={handleClear}
          >
            Clear
          </button>
        </div>

        <div style={styles.csSaveHint}>
          For now, this entry is stored in this browser only. Later we’ll sync
          Free Flow to the same Journal tables your phone app uses.
        </div>
      </div>
    </div>
  );
}

function GratitudeDetail() {
  const [createdAt] = useState<Date>(new Date());
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [title, setTitle] = useState("Gratitude");

  const seedBody = "Today, I am grateful for:\n\n";
  const [body, setBody] = useState(seedBody);
  const [isEditing, setIsEditing] = useState(true);

  const canSave =
    title.trim().length > 0 ||
    (body.trim().length > 0 && body.trim() !== "Today, I am grateful for:");

  const formatShort = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleSave = () => {
    if (!canSave) return;
    setUpdatedAt(new Date());
    // Stub: later, push this into the real Journal store / Firestore
    alert("Gratitude entry saved (local only for now). Web sync coming later.");
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleClear = () => {
    setTitle("Gratitude");
    setBody(seedBody);
    setIsEditing(true);
  };

  return (
    <div style={styles.csBody}>
      {/* Created / Updated row */}
      <div style={{ marginBottom: 4, display: "flex", gap: 8, fontSize: 11 }}>
        <span>Created {formatShort(createdAt)}</span>
        <span style={{ opacity: 0.7 }}>•</span>
        <span style={{ opacity: 0.7 }}>Updated {formatShort(updatedAt)}</span>
      </div>

      {/* Intro */}
      <div style={styles.csIntro}>
        <div style={styles.csIntroTitle}>Gratitude — Thanks!</div>
        <div style={styles.csIntroText}>
          Anchor the day by naming specific people, moments, and gifts you&apos;re
          grateful for.
        </div>
      </div>

      {/* Title */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>🙏</span>
          <span style={styles.csPillarTitle}>Title</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => isEditing && setTitle(e.target.value)}
          placeholder="Gratitude"
          style={{
            ...styles.todoInput,
            marginTop: 6,
            width: "100%",
          }}
        />
      </div>

      {/* Body */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>✨</span>
          <span style={styles.csPillarTitle}>Today, I am grateful for…</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          List concrete things: names, events, sights, sounds, smells. The more
          specific, the more your nervous system can re-live the blessing.
        </div>
        <textarea
          style={{ ...styles.csTextarea, marginTop: 4 }}
          value={body}
          onChange={(e) => isEditing && setBody(e.target.value)}
        />
      </div>

      {/* Buttons row */}
      <div style={styles.csSaveRow}>
        <div style={{ display: "flex", gap: 8 }}>
          {isEditing ? (
            <button
              type="button"
              style={{
                ...styles.csSaveButton,
                opacity: canSave ? 1 : 0.4,
                cursor: canSave ? "pointer" : "default",
              }}
              disabled={!canSave}
              onClick={handleSave}
            >
              Save
            </button>
          ) : (
            <button
              type="button"
              style={styles.csSaveButton}
              onClick={handleEdit}
            >
              Edit
            </button>
          )}

          <button
            type="button"
            style={{
              ...styles.csSaveButton,
              background: "transparent",
              border: "1px solid rgba(148,163,184,0.7)",
              color: "#e5e7eb",
            }}
            onClick={handleClear}
          >
            Clear
          </button>
        </div>

        <div style={styles.csSaveHint}>
          For now, this Gratitude entry lives only in this browser. Later we’ll
          sync it with the same journal tables your phone uses.
        </div>
      </div>
    </div>
  );
}

function GoalsScreen() {
  type GoalKey = "current" | "destiny" | "yearly" | "seasonal" | "monthly";

  // Season emoji (same idea as the Android version)
  const today = new Date();
  const month = today.getMonth(); // 0–11

  let seasonEmoji = "🍂"; // Fall default
  if (month === 11 || month === 0 || month === 1) {
    seasonEmoji = "❄️"; // Dec–Feb
  } else if (month >= 2 && month <= 4) {
    seasonEmoji = "🌸"; // Mar–May
  } else if (month >= 5 && month <= 7) {
    seasonEmoji = "☀️"; // Jun–Aug
  }

  const goals: {
    key: GoalKey;
    title: string;
    subtitle: string;
    emoji: string;
  }[] = [
    {
      key: "current",
      title: "Current State",
      subtitle: "The full truth of where you are at now.",
      emoji: "🧭",
    },
    {
      key: "destiny",
      title: "Destiny Vision",
      subtitle: "Define your ‘I am / I will’ for each quadrant.",
      emoji: "🧭",
    },
    {
      key: "yearly",
      title: "Yearly Goals",
      subtitle: "Set your North Star and anchor the year.",
      emoji: "🗓️",
    },
    {
      key: "seasonal",
      title: "Seasonal Goals",
      subtitle: "Break yearly focus down into seasons.",
      emoji: seasonEmoji,
    },
    {
      key: "monthly",
      title: "Monthly Goals",
      subtitle: "Plan this month’s focus and milestones.",
      emoji: "📅",
    },
  ];

  const [selectedKey, setSelectedKey] = useState<GoalKey>("current");
  const selected = goals.find((g) => g.key === selectedKey)!;

  return (
    <div style={styles.actionsLayout}>
      {/* LEFT: GOALS LIST */}
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Goals</h2>
          <div style={styles.panelSubTitle}>
            Defender Destiny · Who Am I? Who Shall I Be?
          </div>
        </div>

        <div style={styles.goalsList}>
          {/* Who Am I? */}
          <div style={styles.goalsSectionLabel}>Who Am I?</div>

          {goals
            .filter((g) => g.key === "current")
            .map((goal) => {
              const isActive = goal.key === selectedKey;
              const cardStyle = isActive
                ? {
                    ...styles.goalsCard,
                    borderColor: "#22c55e",
                    boxShadow:
                      "0 0 0 1px rgba(34,197,94,0.5), 0 18px 40px rgba(0,0,0,0.55)",
                  }
                : styles.goalsCard;

              return (
                <button
                  key={goal.key}
                  type="button"
                  onClick={() => setSelectedKey(goal.key)}
                  style={cardStyle}
                >
                  <div style={styles.goalsEmojiCircle}>{goal.emoji}</div>
                  <div style={styles.goalsCardTextBlock}>
                    <div style={styles.goalsCardTitle}>{goal.title}</div>
                    <div style={styles.goalsCardSubtitle}>
                      {goal.subtitle}
                    </div>
                  </div>
                  <div style={styles.goalsChevron}>›</div>
                </button>
              );
            })}

          {/* Spacer between sections */}
          <div style={{ height: 18 }} />

          {/* Who Shall I Be? */}
          <div style={styles.goalsSectionLabel}>Who Shall I Be?</div>

          {goals
            .filter((g) => g.key !== "current")
            .map((goal) => {
              const isActive = goal.key === selectedKey;
              const cardStyle = isActive
                ? {
                    ...styles.goalsCard,
                    borderColor: "#22c55e",
                    boxShadow:
                      "0 0 0 1px rgba(34,197,94,0.5), 0 18px 40px rgba(0,0,0,0.55)",
                  }
                : styles.goalsCard;

              return (
                <button
                  key={goal.key}
                  type="button"
                  onClick={() => setSelectedKey(goal.key)}
                  style={cardStyle}
                >
                  <div style={styles.goalsEmojiCircle}>{goal.emoji}</div>
                  <div style={styles.goalsCardTextBlock}>
                    <div style={styles.goalsCardTitle}>{goal.title}</div>
                    <div style={styles.goalsCardSubtitle}>
                      {goal.subtitle}
                    </div>
                  </div>
                  <div style={styles.goalsChevron}>›</div>
                </button>
              );
            })}
        </div>
      </section>

      {/* RIGHT: DETAIL PANE */}
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>{selected.title}</h2>
          <div style={styles.panelSubTitle}>{selected.subtitle}</div>
        </div>

        {selectedKey === "current" ? (
          <CurrentStateDetail />
        ) : selectedKey === "destiny" ? (
          <DestinyVisionDetail />
        ) : selectedKey === "yearly" ? (
          <YearlyGoalsDetail />
        ) : selectedKey === "seasonal" ? (
          <SeasonalGoalsDetail />
        ) : selectedKey === "monthly" ? (
          <MonthlyGoalsDetail />
        ) : (
          <GenericGoalDetail selected={selected} />
        )}
      </section>
    </div>
  );
}

function CurrentStateDetail() {
  const [phys, setPhys] = useState("");
  const [piety, setPiety] = useState("");
  const [people, setPeople] = useState("");
  const [prod, setProd] = useState("");

  const placeholder = "Be specific. Facts over feelings.";

  return (
    <div style={styles.csBody}>
      {/* Intro */}
      <div style={styles.csIntro}>
        <div style={styles.csIntroTitle}>Write down the full truth:</div>
        <div style={styles.csIntroText}>
          In each quadrant, write down the full as-is, no-BS truth of where you
          are at right now.
        </div>
      </div>

      {/* Physiology */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>🏋</span>
          <span style={styles.csPillarTitle}>Physiology</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          The body is the universal address of your existence: Breath, walk,
          lift, bike, hike, stretch, sleep, fast, eat clean, supplement,
          hydrate, etc.
        </div>
        <textarea
          style={styles.csTextarea}
          placeholder={placeholder}
          rows={4}
          value={phys}
          onChange={(e) => setPhys(e.target.value)}
        />
      </div>

      {/* Piety */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>🙏</span>
          <span style={styles.csPillarTitle}>Piety</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          Using mystery & awe as the spirit speaks for the soul: 3 blessings,
          waking up, end-of-day prayer, body scan & resets, the watcher, etc.
        </div>
        <textarea
          style={styles.csTextarea}
          placeholder={placeholder}
          rows={4}
          value={piety}
          onChange={(e) => setPiety(e.target.value)}
        />
      </div>

      {/* People */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>👥</span>
          <span style={styles.csPillarTitle}>People</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          Team Human: herd animals who exist in each other: Light people up,
          reverse the flow, problem solve & collaborate in Defense of Meaning
          and Freedom, etc.
        </div>
        <textarea
          style={styles.csTextarea}
          placeholder={placeholder}
          rows={4}
          value={people}
          onChange={(e) => setPeople(e.target.value)}
        />
      </div>

      {/* Production */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>💼</span>
          <span style={styles.csPillarTitle}>Production</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          A man produces more than he consumes: Set goals, share talents, make
          the job the boss, track progress, Pareto Principle, no one outworks
          me, etc.
        </div>
        <textarea
          style={styles.csTextarea}
          placeholder={placeholder}
          rows={4}
          value={prod}
          onChange={(e) => setProd(e.target.value)}
        />
      </div>

      {/* Save row (stubbed for now) */}
      <div style={styles.csSaveRow}>
        <button type="button" style={styles.csSaveButton}>
          Save to Journal (coming soon)
        </button>
        <div style={styles.csSaveHint}>
          Later this will push a formatted snapshot into your Journal, just like
          the phone app’s “CSS: Current State Snapshot”.
        </div>
      </div>
    </div>
  );
}
function DestinyVisionDetail() {
  const [phys, setPhys] = useState("");
  const [piety, setPiety] = useState("");
  const [people, setPeople] = useState("");
  const [prod, setProd] = useState("");

  const placeholder = "“I am…”  “I will…”";

  return (
    <div style={styles.csBody}>
      {/* Intro */}
      <div style={styles.csIntro}>
        <div style={styles.csIntroTitle}>Write out a full destiny vision:</div>
        <div style={styles.csIntroText}>
          In each quadrant, define your vision with “I” and “My” statements —
          and read them every day.
        </div>
      </div>

      {/* Physiology */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>🏋</span>
          <span style={styles.csPillarTitle}>Physiology</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          The body is the universal address of your existence: Breath, walk,
          lift, bike, hike, stretch, sleep, fast, eat clean, supplement,
          hydrate, etc.
        </div>
        <textarea
          style={styles.csTextarea}
          placeholder={placeholder}
          rows={4}
          value={phys}
          onChange={(e) => setPhys(e.target.value)}
        />
      </div>

      {/* Piety */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>🙏</span>
          <span style={styles.csPillarTitle}>Piety</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          Using mystery & awe as the spirit speaks for the soul: 3 blessings,
          waking up, end-of-day prayer, body scan & resets, the watcher, etc.
        </div>
        <textarea
          style={styles.csTextarea}
          placeholder={placeholder}
          rows={4}
          value={piety}
          onChange={(e) => setPiety(e.target.value)}
        />
      </div>

      {/* People */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>👥</span>
          <span style={styles.csPillarTitle}>People</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          Team Human: herd animals who exist in each other: Light people up,
          reverse the flow, problem solve & collaborate in Defense of Meaning
          and Freedom, etc.
        </div>
        <textarea
          style={styles.csTextarea}
          placeholder={placeholder}
          rows={4}
          value={people}
          onChange={(e) => setPeople(e.target.value)}
        />
      </div>

      {/* Production */}
      <div style={styles.csPillarBlock}>
        <div style={styles.csPillarHeaderRow}>
          <span style={styles.csPillarEmoji}>💼</span>
          <span style={styles.csPillarTitle}>Production</span>
        </div>
        <div style={styles.csPillarSubtitle}>
          A man produces more than he consumes: Set goals, share talents, make
          the job the boss, track progress, Pareto Principle, no one outworks
          me, etc.
        </div>
        <textarea
          style={styles.csTextarea}
          placeholder={placeholder}
          rows={4}
          value={prod}
          onChange={(e) => setProd(e.target.value)}
        />
      </div>

      {/* Save row (stub) */}
      <div style={styles.csSaveRow}>
        <button type="button" style={styles.csSaveButton}>
          Save to Journal (coming soon)
        </button>
        <div style={styles.csSaveHint}>
          Later this will snapshot your Destiny Vision into the Journal, just
          like “DVS: Destiny Vision Snapshot” on the phone app.
        </div>
      </div>
    </div>
  );
}

function YearlyGoalsDetail() {
  type GoalItem = { id: number; text: string; done: boolean };

  type YearGoals = {
    phys: GoalItem[];
    piety: GoalItem[];
    people: GoalItem[];
    prod: GoalItem[];
  };

  const makeId = () => Date.now() + Math.floor(Math.random() * 1000);
  const currentYear = new Date().getFullYear();

  const createInitialYearGoals = (): YearGoals => ({
    // Seed each pillar with ONE blank goal row
    phys: [{ id: makeId(), text: "", done: false }],
    piety: [{ id: makeId(), text: "", done: false }],
    people: [{ id: makeId(), text: "", done: false }],
    prod: [{ id: makeId(), text: "", done: false }],
  });

  const [year, setYear] = useState<number>(currentYear);
  const [goalsByYear, setGoalsByYear] = useState<Record<number, YearGoals>>(
    () => ({
      [currentYear]: createInitialYearGoals(),
    })
  );

  // Ensure we have a structure for whatever year is active
  useEffect(() => {
    setGoalsByYear((prev) => {
      if (prev[year]) return prev;
      return {
        ...prev,
        [year]: createInitialYearGoals(),
      };
    });
  }, [year]);

  const getYearGoals = (y: number): YearGoals => {
    const existing = goalsByYear[y];
    if (existing) return existing;
    return createInitialYearGoals();
  };

  const updateYearGoals = (y: number, next: YearGoals) => {
    setGoalsByYear((prev) => ({
      ...prev,
      [y]: next,
    }));
  };

  const yearGoals = getYearGoals(year);

  // Helpers for each pillar
  const setPhysGoals = (list: GoalItem[]) =>
    updateYearGoals(year, { ...yearGoals, phys: list });
  const setPietyGoals = (list: GoalItem[]) =>
    updateYearGoals(year, { ...yearGoals, piety: list });
  const setPeopleGoals = (list: GoalItem[]) =>
    updateYearGoals(year, { ...yearGoals, people: list });
  const setProdGoals = (list: GoalItem[]) =>
    updateYearGoals(year, { ...yearGoals, prod: list });

  // Generic list manipulation helpers
  const addGoal = (
    list: GoalItem[],
    setList: (items: GoalItem[]) => void
  ) => {
    setList([
      ...list,
      { id: makeId(), text: "", done: false },
    ]);
  };

  const updateGoalText = (
    list: GoalItem[],
    setList: (items: GoalItem[]) => void,
    id: number,
    text: string
  ) => {
    setList(list.map((g) => (g.id === id ? { ...g, text } : g)));
  };

  const toggleGoal = (
    list: GoalItem[],
    setList: (items: GoalItem[]) => void,
    id: number
  ) => {
    setList(
      list.map((g) =>
        g.id === id ? { ...g, done: !g.done } : g
      )
    );
  };

  const removeGoal = (
    list: GoalItem[],
    setList: (items: GoalItem[]) => void,
    id: number
  ) => {
    setList(list.filter((g) => g.id !== id));
  };

  const renderPillar = (
    title: string,
    emoji: string,
    subtitle: string | null,
    list: GoalItem[],
    setList: (items: GoalItem[]) => void
  ) => (
    <div style={styles.weeklySectionCard}>
      <div style={styles.notesHeaderRow}>
        <span style={{ fontSize: 16, marginRight: 6 }}>{emoji}</span>
        <span style={styles.subPanelTitle}>{title}</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          style={styles.addTodoButton}
          onClick={() => addGoal(list, setList)}
        >
          + Add goal
        </button>
      </div>

      {subtitle && (
        <div style={styles.notesSubtext}>{subtitle}</div>
      )}

      <div style={styles.todoList}>
        {list.map((goal) => {
          const isDone = goal.done;
          return (
            <div key={goal.id} style={styles.todoRow}>
              {/* Checkbox styled like Daily 4P / To-Do */}
              <span
                onClick={() => toggleGoal(list, setList, goal.id)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: isDone
                    ? "1px solid #bbf7d0"
                    : "1px solid rgba(148,163,184,0.8)",
                  background: isDone ? "#22c55e" : "transparent",
                  boxShadow: isDone
                    ? "0 0 0 1px rgba(22,163,74,0.6)"
                    : "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition:
                    "background 0.16s ease-out, box-shadow 0.16s ease-out, border-color 0.16s ease-out",
                }}
              >
                {isDone ? (
                  <span
                    style={{
                      fontSize: 11,
                      lineHeight: 1,
                      color: "#ffffff",
                    }}
                  >
                    ✓
                  </span>
                ) : null}
              </span>

              <input
                type="text"
                value={goal.text}
                onChange={(e) =>
                  updateGoalText(
                    list,
                    setList,
                    goal.id,
                    e.target.value
                  )
                }
                placeholder="Yearly Goal…"
                style={{
                  ...styles.todoInput,
                  textDecoration: isDone ? "line-through" : "none",
                  opacity: isDone ? 0.6 : 1,
                }}
              />

              <button
                style={styles.todoDeleteButton}
                onClick={() => removeGoal(list, setList, goal.id)}
                title="Remove goal"
              >
                ✕
              </button>
            </div>
          );
        })}

        {list.length === 0 && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginTop: 4,
            }}
          >
            No goals yet for this pillar. Use “+ Add goal” to start.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.goalsDetailBody}>
      {/* Year selector row – centered & more obvious */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.8 }}>Year</span>

        <button
          type="button"
          onClick={() => setYear((y) => y - 1)}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.95)",
            color: "#e5e7eb",
            fontSize: 14,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          ‹
        </button>

        <div
          style={{
            minWidth: 90,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 999,
            border: "1px solid rgba(34,197,94,0.8)",
            padding: "6px 14px",
            background: "rgba(22,163,74,0.18)",
            color: "#ffffff",
          }}
        >
          {year}
        </div>

        <button
          type="button"
          onClick={() => setYear((y) => y + 1)}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.95)",
            color: "#e5e7eb",
            fontSize: 14,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          ›
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "8px",
        }}
      >
        {renderPillar(
          "Physiology",
          "🏋",
          "The body is the universal address of your existence.",
          yearGoals.phys,
          setPhysGoals
        )}
        {renderPillar(
          "Piety",
          "🙏",
          "Using mystery & awe as the spirit speaks for the soul.",
          yearGoals.piety,
          setPietyGoals
        )}
        {renderPillar(
          "People",
          "👥",
          "Team Human: herd animals who exist in each other.",
          yearGoals.people,
          setPeopleGoals
        )}
        {renderPillar(
          "Production",
          "💼",
          "A man produces more than he consumes.",
          yearGoals.prod,
          setProdGoals
        )}
      </div>
    </div>
  );
}

function SeasonalGoalsDetail() {
  type SeasonKey = "Winter" | "Spring" | "Summer" | "Fall";
  type PillarKey = "phys" | "piety" | "people" | "prod";

  const seasonOrder: SeasonKey[] = ["Winter", "Spring", "Summer", "Fall"];
  const seasonEmoji: Record<SeasonKey, string> = {
    Winter: "❄️",
    Spring: "🌸",
    Summer: "☀️",
    Fall: "🍂",
  };

  const now = new Date();
  const month = now.getMonth(); // 0–11

  let initialSeason: SeasonKey = "Winter";
  if (month >= 2 && month <= 4) {
    initialSeason = "Spring"; // Mar–May
  } else if (month >= 5 && month <= 7) {
    initialSeason = "Summer"; // Jun–Aug
  } else if (month >= 8 && month <= 10) {
    initialSeason = "Fall"; // Sep–Nov
  } else {
    initialSeason = "Winter"; // Dec–Feb
  }

  const [seasonIndex, setSeasonIndex] = useState(
    seasonOrder.indexOf(initialSeason)
  );
  const [year, setYear] = useState(now.getFullYear());

  const season = seasonOrder[seasonIndex];

  function seasonRangeLabel(s: SeasonKey, y: number): string {
    switch (s) {
      case "Winter":
        // Dec (prev year) → Mar (current year)
        return `Dec ${y - 1} – Mar ${y}`;
      case "Spring":
        // Mar → Jun (same year)
        return `Mar ${y} – Jun ${y}`;
      case "Summer":
        // Jun → Sep (same year)
        return `Jun ${y} – Sep ${y}`;
      case "Fall":
      default:
        // Sep → Dec (same year)
        return `Sep ${y} – Dec ${y}`;
    }
  }

  const goPrevSeason = () => {
    setSeasonIndex((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return seasonOrder.length - 1;
      }
      return prev - 1;
    });
  };

  const goNextSeason = () => {
    setSeasonIndex((prev) => {
      if (prev === seasonOrder.length - 1) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  type GoalItem = { id: number; text: string; done: boolean };

  const [goals, setGoals] = useState<Record<PillarKey, GoalItem[]>>({
    phys: [{ id: 1, text: "", done: false }],
    piety: [{ id: 2, text: "", done: false }],
    people: [{ id: 3, text: "", done: false }],
    prod: [{ id: 4, text: "", done: false }],
  });

  const addGoal = (pillar: PillarKey) => {
    setGoals((prev) => {
      const list = prev[pillar] || [];
      return {
        ...prev,
        [pillar]: [
          ...list,
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            text: "",
            done: false,
          },
        ],
      };
    });
  };

  const updateGoalText = (pillar: PillarKey, id: number, text: string) => {
    setGoals((prev) => ({
      ...prev,
      [pillar]: prev[pillar].map((g) =>
        g.id === id ? { ...g, text } : g
      ),
    }));
  };

  const toggleGoal = (pillar: PillarKey, id: number) => {
    setGoals((prev) => ({
      ...prev,
      [pillar]: prev[pillar].map((g) =>
        g.id === id ? { ...g, done: !g.done } : g
      ),
    }));
  };

  const removeGoal = (pillar: PillarKey, id: number) => {
    setGoals((prev) => ({
      ...prev,
      [pillar]: prev[pillar].filter((g) => g.id !== id),
    }));
  };

  const renderPillar = (
    pillar: PillarKey,
    icon: string,
    title: string,
    subtitle: string
  ) => {
    const list = goals[pillar] || [];

    return (
      <div key={pillar} style={styles.weeklySectionCard}>
        <div style={styles.notesHeaderRow}>
          <span style={{ fontSize: 16, marginRight: 6 }}>{icon}</span>
          <span style={styles.subPanelTitle}>{title}</span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => addGoal(pillar)}
            style={styles.addTodoButton}
          >
            + Add goal
          </button>
        </div>
        <div style={styles.notesSubtext}>{subtitle}</div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {list.map((g) => {
            const isDone = g.done;
            return (
              <div key={g.id} style={styles.todoRow}>
                {/* checkbox, same visual as Daily / To-Do */}
                <span
                  onClick={() => toggleGoal(pillar, g.id)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: isDone
                      ? "1px solid #bbf7d0"
                      : "1px solid rgba(148,163,184,0.8)",
                    background: isDone ? "#22c55e" : "transparent",
                    boxShadow: isDone
                      ? "0 0 0 1px rgba(22,163,74,0.6)"
                      : "none",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition:
                      "background 0.16s ease-out, box-shadow 0.16s ease-out, border-color 0.16s ease-out",
                  }}
                >
                  {isDone ? (
                    <span
                      style={{
                        fontSize: 11,
                        lineHeight: 1,
                        color: "#ffffff",
                      }}
                    >
                      ✓
                    </span>
                  ) : null}
                </span>

                <input
                  type="text"
                  value={g.text}
                  onChange={(e) =>
                    updateGoalText(pillar, g.id, e.target.value)
                  }
                  placeholder="Seasonal goal…"
                  style={{
                    ...styles.todoInput,
                    textDecoration: isDone ? "line-through" : "none",
                    opacity: isDone ? 0.6 : 1,
                  }}
                />
                <button
                  style={styles.todoDeleteButton}
                  onClick={() => removeGoal(pillar, g.id)}
                  title="Remove goal"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.goalsDetailBody}>
      {/* Season + Year selector (centered, same vibe as Yearly) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <button
          type="button"
          onClick={goPrevSeason}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(75,85,99,0.9)",
            background: "rgba(15,23,42,0.9)",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            cursor: "pointer",
            color: "#e5e7eb",
          }}
        >
          ‹
        </button>

        <div
          style={{
            minWidth: 170,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 999,
            border: "1px solid rgba(34,197,94,0.8)",
            padding: "6px 18px",
            background: "rgba(22,163,74,0.18)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span>{seasonEmoji[season]}</span>
          <span>
            {season} {year}
          </span>
        </div>

        <button
          type="button"
          onClick={goNextSeason}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(75,85,99,0.9)",
            background: "rgba(15,23,42,0.9)",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            cursor: "pointer",
            color: "#e5e7eb",
          }}
        >
          ›
        </button>
      </div>

      {/* 4 pillars stacked – SAME container layout as Yearly */}
            <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "8px",
        }}
      >
        {renderPillar(
          "phys",
          "🏋",
          "Physiology",
          "The body is the universal address of your existence."
        )}
        {renderPillar(
          "piety",
          "🙏",
          "Piety",
          "Using mystery & awe as the spirit speaks for the soul."
        )}
        {renderPillar(
          "people",
          "👥",
          "People",
          "Team Human: herd animals who exist in each other."
        )}
        {renderPillar(
          "prod",
          "💼",
          "Production",
          "A man produces more than he consumes."
        )}
      </div>
    </div>
  );
}

function MonthlyGoalsDetail() {
  type GoalItem = { id: number; text: string; done: boolean };
  type MonthGoals = {
    phys: GoalItem[];
    piety: GoalItem[];
    people: GoalItem[];
    prod: GoalItem[];
  };

  const makeId = () => Date.now() + Math.floor(Math.random() * 1000);

  const createInitialMonthGoals = (): MonthGoals => ({
    phys: [{ id: makeId(), text: "", done: false }],
    piety: [{ id: makeId(), text: "", done: false }],
    people: [{ id: makeId(), text: "", done: false }],
    prod: [{ id: makeId(), text: "", done: false }],
  });

  // Initial month (set to 1st of current month)
  const initialDate = (() => {
    const d = new Date();
    d.setDate(1);
    return d;
  })();

  const initialMonthKey = `${initialDate.getFullYear()}-${initialDate.getMonth()}`;

  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);
  const [goalsByMonth, setGoalsByMonth] = useState<Record<string, MonthGoals>>(
    () => ({
      [initialMonthKey]: createInitialMonthGoals(),
    })
  );

  const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

  // Ensure we always have a structure for whatever month is active
  useEffect(() => {
    setGoalsByMonth((prev) => {
      if (prev[monthKey]) return prev;
      return {
        ...prev,
        [monthKey]: createInitialMonthGoals(),
      };
    });
  }, [monthKey]);

  const monthGoals: MonthGoals =
    goalsByMonth[monthKey] ?? createInitialMonthGoals();

  // Helpers to update a single pillar while keeping others
  const setPillarGoals = (pillar: keyof MonthGoals, list: GoalItem[]) => {
    setGoalsByMonth((prev) => {
      const existing = prev[monthKey] ?? createInitialMonthGoals();
      return {
        ...prev,
        [monthKey]: {
          ...existing,
          [pillar]: list,
        },
      };
    });
  };

  const physGoals = monthGoals.phys;
  const pietyGoals = monthGoals.piety;
  const peopleGoals = monthGoals.people;
  const prodGoals = monthGoals.prod;

  const addGoal = (
    list: GoalItem[],
    setList: (items: GoalItem[]) => void
  ) => {
    setList([...list, { id: makeId(), text: "", done: false }]);
  };

  const updateGoalText = (
    list: GoalItem[],
    setList: (items: GoalItem[]) => void,
    id: number,
    text: string
  ) => {
    setList(list.map((g) => (g.id === id ? { ...g, text } : g)));
  };

  const toggleGoal = (
    list: GoalItem[],
    setList: (items: GoalItem[]) => void,
    id: number
  ) => {
    setList(
      list.map((g) =>
        g.id === id ? { ...g, done: !g.done } : g
      )
    );
  };

  const removeGoal = (
    list: GoalItem[],
    setList: (items: GoalItem[]) => void,
    id: number
  ) => {
    setList(list.filter((g) => g.id !== id));
  };

  const monthLabel = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

  const goPrevMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      return next;
    });
  };

  const goNextMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  const renderPillar = (
    icon: string,
    title: string,
    subtitle: string | null,
    list: GoalItem[],
    setList: (items: GoalItem[]) => void
  ) => (
    <div style={styles.weeklySectionCard}>
      <div style={styles.notesHeaderRow}>
        <span style={{ fontSize: 16, marginRight: 6 }}>{icon}</span>
        <span style={styles.subPanelTitle}>{title}</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          style={styles.addTodoButton}
          onClick={() => addGoal(list, setList)}
        >
          + Add goal
        </button>
      </div>

      {subtitle && (
        <div style={styles.notesSubtext}>{subtitle}</div>
      )}

      <div style={styles.todoList}>
        {list.map((goal) => {
          const isDone = goal.done;
          return (
            <div key={goal.id} style={styles.todoRow}>
              {/* Checkbox styled like Daily 4P / To-Do */}
              <span
                onClick={() => toggleGoal(list, setList, goal.id)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: isDone
                    ? "1px solid #bbf7d0"
                    : "1px solid rgba(148,163,184,0.8)",
                  background: isDone ? "#22c55e" : "transparent",
                  boxShadow: isDone
                    ? "0 0 0 1px rgba(22,163,74,0.6)"
                    : "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition:
                    "background 0.16s ease-out, box-shadow 0.16s ease-out, border-color 0.16s ease-out",
                }}
              >
                {isDone ? (
                  <span
                    style={{
                      fontSize: 11,
                      lineHeight: 1,
                      color: "#ffffff",
                    }}
                  >
                    ✓
                  </span>
                ) : null}
              </span>

              <input
                type="text"
                value={goal.text}
                onChange={(e) =>
                  updateGoalText(
                    list,
                    setList,
                    goal.id,
                    e.target.value
                  )
                }
                placeholder="Monthly goal…"
                style={{
                  ...styles.todoInput,
                  textDecoration: isDone ? "line-through" : "none",
                  opacity: isDone ? 0.6 : 1,
                }}
              />

              <button
                style={styles.todoDeleteButton}
                onClick={() => removeGoal(list, setList, goal.id)}
                title="Remove goal"
              >
                ✕
              </button>
            </div>
          );
        })}

        {list.length === 0 && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginTop: 4,
            }}
          >
            No goals yet for this pillar. Use “+ Add goal” to start.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.goalsDetailBody}>
      {/* Month selector row – centered, matching Yearly/Seasonal vibe */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={goPrevMonth}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(75,85,99,0.9)",
            background: "rgba(15,23,42,0.9)",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            cursor: "pointer",
            color: "#e5e7eb",
          }}
        >
          ‹
        </button>

        <div
          style={{
            minWidth: 180,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 999,
            border: "1px solid rgba(34,197,94,0.8)",
            padding: "6px 18px",
            background: "rgba(22,163,74,0.18)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span>📅</span>
          <span>{monthLabel(currentMonth)}</span>
        </div>

        <button
          type="button"
          onClick={goNextMonth}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(75,85,99,0.9)",
            background: "rgba(15,23,42,0.9)",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            cursor: "pointer",
            color: "#e5e7eb",
          }}
        >
          ›
        </button>
      </div>

            <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "8px",
        }}
      >
        {renderPillar(
          "🏋",
          "Physiology",
          "The body is the universal address of your existence.",
          physGoals,
          (items) => setPillarGoals("phys", items)
        )}
        {renderPillar(
          "🙏",
          "Piety",
          "Using mystery & awe as the spirit speaks for the soul.",
          pietyGoals,
          (items) => setPillarGoals("piety", items)
        )}
        {renderPillar(
          "👥",
          "People",
          "Team Human: herd animals who exist in each other.",
          peopleGoals,
          (items) => setPillarGoals("people", items)
        )}
        {renderPillar(
          "💼",
          "Production",
          "A man produces more than he consumes.",
          prodGoals,
          (items) => setPillarGoals("prod", items)
        )}
      </div>
    </div>
  );
}

function GenericGoalDetail({ selected }: any) {
  return (
    <div style={styles.goalsDetailBody}>
      <p style={styles.goalsDetailText}>
        This pane will mirror the full <strong>{selected.title}</strong> screen
        from your mobile app — including its text boxes, 4P blocks, and
        prompts.
      </p>
      <p style={styles.goalsDetailText}>
        For now, use this as a map: keep your Defender Destiny framework visible
        while you fill out the full version on your phone.
      </p>
      <ul style={styles.goalsDetailList}>
        <li>
          Align <strong>{selected.title}</strong> with your Daily and Weekly
          Actions.
        </li>
        <li>
          Use it as a reference while planning your One Thing for the week and
          month.
        </li>
        <li>
          We&apos;ll later sync all of this via Firebase so edits here and on
          mobile stay in lockstep.
        </li>
      </ul>
    </div>
  );
}

function DailyQuadrant({
  title,
  emoji,
  description,
  active,
  onToggle,
  focusText,
  onChangeFocus,
}: any) {
  const baseCard = styles.quadrantCard;

  const cardStyle = active
    ? {
        ...baseCard,
        borderColor: "#22c55e",
        boxShadow:
          "0 0 0 1px rgba(34,197,94,0.6), 0 14px 30px rgba(0,0,0,0.6)",
      }
    : baseCard;

  return (
    <div style={cardStyle}>
      <div
        onClick={onToggle}
        style={{
          cursor: "pointer",
          userSelect: "none",
        }}
        role="button"
      >
        <div style={styles.quadrantHeader}>
          <span style={styles.quadrantEmoji}>{emoji}</span>
          <span style={styles.quadrantTitle}>{title}</span>
          <span style={{ flex: 1 }} />
          {/* Custom checkbox in top-right */}
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: active
                ? "1px solid #bbf7d0"
                : "1px solid rgba(148,163,184,0.8)",
              background: active ? "#22c55e" : "transparent",
              boxShadow: active
                ? "0 0 0 1px rgba(22,163,74,0.6)"
                : "none",
              transition:
                "background 0.16s ease-out, box-shadow 0.16s ease-out, border-color 0.16s ease-out",
            }}
          >
            {active ? (
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1,
                  color: "#ffffff",
                }}
              >
                ✓
              </span>
            ) : null}
          </span>
        </div>
        <p style={styles.quadrantDescription}>{description}</p>
      </div>

      <div style={styles.focusBlock}>
        <div style={styles.focusLabel}>Focused activity</div>
        <textarea
          style={styles.focusInput}
          placeholder="Focused activity?"
          value={focusText}
          onChange={(e) => onChangeFocus(e.target.value)}
          rows={1}
        />
      </div>
    </div>
  );
}

function WeeklySectionCard({
  icon,
  title,
  subtitle,
  placeholder,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  placeholder: string;
}) {
  return (
    <div style={styles.weeklySectionCard}>
      <div style={styles.notesHeaderRow}>
        <span style={{ fontSize: 16, marginRight: 6 }}>{icon}</span>
        <span style={styles.subPanelTitle}>{title}</span>
      </div>
      {subtitle && (
        <div style={styles.notesSubtext}>
          {/* shortened weekly subtext */}
          {subtitle}
        </div>
      )}
      <textarea style={styles.textarea} placeholder={placeholder} />
    </div>
  );
}

function WeeklyOneThingCard() {
  const [done, setDone] = useState(false);

  return (
    <div style={styles.weeklySectionCard}>
      <div style={styles.notesHeaderRow}>
        <span style={{ fontSize: 16, marginRight: 6 }}>🎯</span>
        <span style={styles.subPanelTitle}>This Week’s One Thing Done?</span>
        <span style={{ flex: 1 }} />
        {/* Custom checkbox like Daily 4P (no card color change) */}
        <span
          onClick={() => setDone((prev) => !prev)}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: done
              ? "1px solid #bbf7d0"
              : "1px solid rgba(148,163,184,0.8)",
            background: done ? "#22c55e" : "transparent",
            boxShadow: done
              ? "0 0 0 1px rgba(22,163,74,0.6)"
              : "none",
            cursor: "pointer",
            transition:
              "background 0.16s ease-out, box-shadow 0.16s ease-out, border-color 0.16s ease-out",
          }}
        >
          {done ? (
            <span
              style={{
                fontSize: 13,
                lineHeight: 1,
                color: "#ffffff",
              }}
            >
              ✓
            </span>
          ) : null}
        </span>
      </div>

      <textarea
        style={styles.textarea}
        placeholder="— none set last week —"
      />
    </div>
  );
}

function PlaceholderFull({ label }: any) {
  return (
    <div style={styles.placeholderWrapper}>
      <h2 style={styles.panelTitle}>{label}</h2>
      <p style={styles.panelSubTitle}>
        We’ll plug this into the same Firestore structures your mobile app
        uses.
      </p>
    </div>
  );
}

// --- styles ---

const styles: any = {
  page: {
    minHeight: "100vh",
    width: "100%",     // 👈 fixed
    margin: 0,
    padding: 0,
    background: "#020617",
    fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, sans-serif",
    color: "#e5e7eb",
    display: "flex",
    justifyContent: "center",
},
  appShell: {
    width: "1100px",          // 👈 lock the visual frame
    maxWidth: "100%",         // …but allow smaller screens to shrink it
    margin: "0 auto",
    padding: "16px 24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "100vh",          // main scrolls inside
    boxSizing: "border-box",
  },

  // top header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(51,65,85,0.9)",
  },
  shieldButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: "999px",
    padding: "6px 10px",
    border: "1px solid rgba(75,85,99,0.9)",
    background: "rgba(15,23,42,0.8)",
    cursor: "pointer",
    color: "#e5e7eb",
    fontSize: "12px",
  },
  shieldIcon: {
    fontSize: "16px",
  },
  shieldImage: {
    width: 32,
    height: 32,
    borderRadius: "999px",
    objectFit: "contain",
  },
  shieldLabel: {
    fontSize: "12px",
    opacity: 0.85,
  },
  headerCenter: {
    textAlign: "center",
    flex: 1,
  },
  appName: {
    fontSize: "20px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  appNameIcon: {
    marginRight: 8,
    fontSize: "18px",
  },
  appSubtitle: {
    fontSize: "13px",
    opacity: 0.8,
  },
  userBlock: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    fontSize: "12px",
  },
  userEmail: {
    opacity: 0.9,
  },
  signOutLink: {
    background: "none",
    border: "none",
    color: "#22c55e",
    fontSize: "11px",
    cursor: "pointer",
    padding: 0,
  },
  avatarCircle: {
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(148,163,184,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 600,
  },
    headerActionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    paddingTop: "4px",
    paddingBottom: "4px",
  },
  headerActionButton: {
    borderRadius: "999px",
    border: "1px solid rgba(148,163,184,0.7)",
    background: "rgba(15,23,42,0.95)",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#e5e7eb",
    cursor: "pointer",
  },
    shieldImageSmall: {
    width: 26,
    height: 26,
    borderRadius: "999px",
    objectFit: "cover",
    border: "1px solid rgba(148,163,184,0.7)",
    background: "rgba(15,23,42,0.9)",
  },

  shieldModalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.78)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },

  shieldModalInner: {
    position: "relative",
    borderRadius: "18px",
    padding: "16px 18px 18px",
    background:
      "radial-gradient(circle at top left, rgba(34,197,94,0.08), rgba(15,23,42,1))",
    border: "1px solid rgba(51,65,85,0.95)",
    boxShadow: "0 22px 60px rgba(0,0,0,0.8)",
    maxWidth: "90vw",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },

  shieldModalImage: {
    maxWidth: "70vw",
    maxHeight: "60vh",
    objectFit: "contain",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.4)",
    background: "#020617",
  },

  shieldModalCloseButton: {
    marginTop: "4px",
    alignSelf: "center",
    borderRadius: "999px",
    border: "1px solid rgba(148,163,184,0.8)",
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    background: "rgba(15,23,42,0.96)",
    color: "#e5e7eb",
  },

  // nav row
  navRow: {
  position: "relative",          // allows absolute positioning inside
  display: "flex",
  alignItems: "center",
  padding: "8px 12px",
  borderBottom: "1px solid rgba(148,163,184,0.12)",
  height: "48px",                // LOCKS height so it never grows
},

navButtonsLeft: {
  display: "flex",
  alignItems: "center",
  gap: "8px",
},

weeklyOverlayButtons: {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)", // perfectly centers vertically
  display: "flex",
  gap: "8px",
},

headerActionButton: {
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.7)",
  background: "rgba(15,23,42,0.95)",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 500,
  color: "#e5e7eb",
  cursor: "pointer",
},

  // main content (only scroll area)
  main: {
    paddingTop: "16px",
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },

  // unified frame for all sections (Daily / Weekly / Goals / etc.)
  contentFrame: {
    width: "100%",      // just fill the appShell
    margin: "0 auto",
  },

  // two-column layout (Daily, Weekly, Goals share this)
  actionsLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "20px",
  },

  panel: {
    borderRadius: "14px",
    border: "1px solid rgba(51,65,85,0.9)",
    padding: "14px 16px 18px",
    background:
      "radial-gradient(circle at top left, rgba(34,197,94,0.08), rgba(15,23,42,1))",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  panelRightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  panelHeader: {
    marginBottom: "4px",
  },
  panelTitle: {
    fontSize: "18px",
    fontWeight: 700,
    margin: 0,
  },
  panelSubTitle: {
    fontSize: "13px",
    opacity: 0.8,
    marginTop: "4px",
  },

  // DAILY grid – stacked 1×4
  dailyGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "10px",
    marginTop: "8px",
  },

  quadrantCard: {
    borderRadius: "12px",
    border: "1px solid rgba(55,65,81,0.95)",
    padding: "10px 12px",
    background: "rgba(15,23,42,0.96)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  quadrantHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  quadrantEmoji: {
    fontSize: "20px",
  },
  quadrantTitle: {
    fontSize: "15px",
    fontWeight: 600,
  },
  quadrantDescription: {
    fontSize: "12px",
    opacity: 0.9,
    margin: 0,
    lineHeight: 1.5,
  },

  // Focused activity
  focusBlock: {
    marginTop: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  focusLabel: {
    fontSize: "12px",
    opacity: 0.85,
  },
  focusInput: {
    minHeight: "32px", // roughly one line
    borderRadius: "8px",
    border: "1px solid rgba(55,65,81,1)",
    padding: "6px 8px",
    fontSize: "13px",
    background: "#020617",
    color: "#e5e7eb",
    resize: "vertical",
    outline: "none",
  },

  // Right column cards (Daily / Weekly)
  subPanelCard: {
    borderRadius: "12px",
    border: "1px solid rgba(55,65,81,0.95)",
    padding: "10px 12px",
    background: "rgba(15,23,42,0.96)",
  },

  notesHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  subPanelTitle: {
    fontSize: "14px",
    fontWeight: 600,
  },
  notesSubtext: {
    fontSize: "12px",
    opacity: 0.8,
    marginTop: "2px",
  },

  todoList: {
    marginTop: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  todoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 6px",
    borderRadius: "8px",
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(55,65,81,0.9)",
  },
  todoInput: {
    flex: 1,
    border: "1px solid rgba(55,65,81,1)",
    outline: "none",
    background: "#020617",   // ✔ matches CS / DVS / Daily
    color: "#e5e7eb",
    fontSize: "13px",
    borderRadius: "8px",
    padding: "6px 8px",
  },
  todoDeleteButton: {
    border: "none",
    background: "transparent",
    color: "rgba(248,113,113,0.9)",
    fontSize: "14px",
    cursor: "pointer",
  },
  addTodoButton: {
    borderRadius: "999px",
    border: "1px solid rgba(34,197,94,0.8)",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
    background: "rgba(22,163,74,0.1)",
    color: "#bbf7d0",
  },

  weeklyCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
    marginTop: "8px",
  },
  weeklyStatCard: {
    borderRadius: "12px",
    border: "1px solid rgba(55,65,81,0.95)",
    padding: "10px 12px",
    background: "rgba(15,23,42,0.96)",
  },
  weeklyStatLabel: {
    fontSize: "12px",
    opacity: 0.85,
  },
  weeklyStatValue: {
    fontSize: "20px",
    fontWeight: 700,
    marginTop: "4px",
  },
  weeklyStatHint: {
    fontSize: "11px",
    opacity: 0.8,
    marginTop: "4px",
  },

  weeklyLeftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "8px",
  },
  weeklySectionCard: {
    borderRadius: "12px",
    border: "1px solid rgba(55,65,81,0.95)",
    padding: "10px 12px",
    background: "rgba(15,23,42,0.96)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  textarea: {
    minHeight: "90px",
    borderRadius: "10px",
    border: "1px solid rgba(55,65,81,1)",
    padding: "8px 10px",
    fontSize: "13px",
    background: "#020617",
    color: "#e5e7eb",
    resize: "vertical",
    outline: "none",
  },

  // placeholder sections
  placeholderWrapper: {
    padding: "12px 4px",
  },

  // login card styles
  centerCard: {
    width: "100%",
    maxWidth: "420px",
    margin: "0 auto",
    marginTop: "80px",
    background: "#020617",
    color: "#e5e7eb",
    borderRadius: "18px",
    padding: "24px 24px 28px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
    border: "1px solid rgba(148, 163, 184, 0.35)",
  },
  centerTitle: {
    margin: "0 0 12px",
    fontSize: "24px",
    fontWeight: 700,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "12px",
  },
  label: {
    fontSize: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  input: {
    borderRadius: "8px",
    border: "1px solid rgba(51,65,85,0.8)",
    padding: "8px 10px",
    fontSize: "14px",
    background: "#020617",
    color: "#e5e7eb",
    outline: "none",
  },
  primaryButton: {
    marginTop: "8px",
    borderRadius: "999px",
    border: "none",
    padding: "10px 14px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    background: "#22c55e",
    color: "#022c22",
  },
  error: {
    marginTop: "4px",
    padding: "8px 10px",
    borderRadius: "8px",
    background: "rgba(248,113,113,0.1)",
    color: "#fecaca",
    fontSize: "13px",
  },

  // Goals list + detail
  goalsList: {
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  goalsSectionLabel: {
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.8,
  },
  goalsCard: {
    width: "100%",
    borderRadius: "12px",
    border: "1px solid rgba(55,65,81,0.95)",
    padding: "10px 12px",
    background: "rgba(15,23,42,0.96)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    textAlign: "left",
    transition:
      "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
  },
  goalsEmojiCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "999px",
    background: "rgba(34,197,94,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },
  goalsCardTextBlock: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  goalsCardTitle: {
    fontSize: "14px",
    fontWeight: 600,
  },
  goalsCardSubtitle: {
    fontSize: "12px",
    opacity: 0.8,
  },
  goalsChevron: {
    fontSize: "18px",
    opacity: 0.7,
  },
  goalsDetailBody: {
    width: "100%",
    marginTop: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "13px",
  },
  goalsDetailText: {
    margin: 0,
    lineHeight: 1.5,
    opacity: 0.9,
  },
  goalsDetailList: {
    margin: "4px 0 0 18px",
    padding: 0,
    fontSize: "13px",
    opacity: 0.85,
  },

  // Current State detail styles
  csBody: {
    marginTop: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    fontSize: "13px",
  },
  csIntro: {
    marginBottom: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  csIntroTitle: {
    fontSize: "14px",
    fontWeight: 600,
  },
  csIntroText: {
    fontSize: "13px",
    opacity: 0.85,
    fontStyle: "italic",
  },
  csPillarBlock: {
    borderRadius: "12px",
    border: "1px solid rgba(55,65,81,0.95)",
    padding: "10px 12px",
    background: "rgba(15,23,42,0.96)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  csPillarHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  csPillarEmoji: {
    fontSize: "18px",
  },
  csPillarTitle: {
    fontSize: "14px",
    fontWeight: 600,
  },
  csPillarSubtitle: {
    fontSize: "12px",
    opacity: 0.85,
    fontStyle: "italic",
  },
  csTextarea: {
    marginTop: "4px",
    minHeight: "80px",
    borderRadius: "10px",
    border: "1px solid rgba(55,65,81,1)",
    padding: "8px 10px",
    fontSize: "13px",
    background: "#020617",
    color: "#e5e7eb",
    resize: "vertical",
    outline: "none",
  },
  csSaveRow: {
    marginTop: "4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "4px",
  },
  csSaveButton: {
    borderRadius: "999px",
    border: "none",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    background: "#22c55e",
    color: "#022c22",
  },
  csSaveHint: {
    fontSize: "11px",
    opacity: 0.75,
    textAlign: "right",
  },
};

export default App;