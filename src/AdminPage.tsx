// src/AdminPage.tsx
import React, { useEffect, useState } from "react";
import appLogo from "./assets/app_logo.png";
import type { User as FirebaseUser } from "firebase/auth";
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  deleteField,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// 🔐 Only these Google accounts can access the admin console.
const ADMIN_EMAILS = [
  "garyedashney@gmail.com",
  "ckw.now@gmail.com", // replace with his real one later
];

const ALLOWLIST_COLLECTION = "allowlist";
const USERS_COLLECTION = "users";
const SQUADS_COLLECTION = "squads";

type Tier = "free" | "amateur" | "pro";

interface AllowlistEntry {
  id: string; // doc id = emailLower
  email: string;
  tier: Tier;
  squadID?: string | null;
}

interface UserEntry {
  id: string; // doc id = UID
  email: string;
  displayName: string;
  tier?: Tier | null; // missing = free
  squadID?: string | null;
}

interface SquadOption {
  id: string;
  name: string;
}

const googleProvider = new GoogleAuthProvider();

const AdminPage: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- top-level UI state ---
  const [activeTab, setActiveTab] = useState<"allowlist" | "users">("allowlist");

  // --- allowlist state ---
  const [allowlistEntries, setAllowlistEntries] = useState<AllowlistEntry[]>([]);
  const [loadingAllowlist, setLoadingAllowlist] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newTier, setNewTier] = useState<Tier>("free");
  const [newSquadID, setNewSquadID] = useState("");

  // --- users state ---
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [tierFilterUsers, setTierFilterUsers] = useState<Tier | "all">("all");

  // --- squads state ---
  const [squadOptions, setSquadOptions] = useState<SquadOption[]>([]);
  const [loadingSquads, setLoadingSquads] = useState(false);

  // shared
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // per-row "recently saved" state
  const [recentAllowlistSavedId, setRecentAllowlistSavedId] = useState<string | null>(null);
  const [recentUserSavedId, setRecentUserSavedId] = useState<string | null>(null);

  // auto-clear "recently saved" indicators after 2.5 seconds
  useEffect(() => {
    if (!recentAllowlistSavedId) return;
    const t = setTimeout(() => setRecentAllowlistSavedId(null), 2500);
    return () => clearTimeout(t);
  }, [recentAllowlistSavedId]);

  useEffect(() => {
    if (!recentUserSavedId) return;
    const t = setTimeout(() => setRecentUserSavedId(null), 2500);
    return () => clearTimeout(t);
  }, [recentUserSavedId]);

  // --- Auth state listener ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  // --- Load allowlist ---
  const loadAllowlist = async () => {
    if (!isAdmin) return;
    setLoadingAllowlist(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, ALLOWLIST_COLLECTION));
      const list: AllowlistEntry[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        const email = (data.email || d.id || "").toString();
        const tier = (data.tier || "free") as Tier;
        const squadID = (data.squadID ?? null) as string | null;
        list.push({
          id: d.id,
          email,
          tier,
          squadID,
        });
      });
      list.sort((a, b) => a.email.localeCompare(b.email));
      setAllowlistEntries(list);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load allowlist.");
    } finally {
      setLoadingAllowlist(false);
    }
  };

  // --- Load users ---
  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, USERS_COLLECTION));
      const list: UserEntry[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        const email = (
          data.emailLower ||
          data.email ||
          d.id ||
          ""
        ).toString();
        const displayName = (data.displayName || "").toString();
        const tier = (data.tier ?? null) as Tier | null;
        const squadID = (data.squadID ?? null) as string | null;
        list.push({
          id: d.id,
          email,
          displayName,
          tier,
          squadID,
        });
      });
      list.sort((a, b) => a.email.localeCompare(b.email));
      setUserEntries(list);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // --- Load squads (for dropdowns) ---
  const loadSquads = async () => {
    if (!isAdmin) return;
    setLoadingSquads(true);
    try {
      const snap = await getDocs(collection(db, SQUADS_COLLECTION));
      const list: SquadOption[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        const name = (data.name || d.id || "").toString();
        if (name.trim()) {
          list.push({ id: d.id, name });
        }
      });

      // If no squads yet, seed defaults
      if (list.length === 0) {
        const defaults = [
          "Morning Oaks",
          "Matinee Monsters",
          "Wednesday Warriors",
        ];
        const created: SquadOption[] = [];
        for (const name of defaults) {
          const ref = doc(collection(db, SQUADS_COLLECTION));
          await setDoc(ref, {
            name,
            createdAt: serverTimestamp(),
          });
          created.push({ id: ref.id, name });
        }
        created.sort((a, b) => a.name.localeCompare(b.name));
        setSquadOptions(created);
      } else {
        list.sort((a, b) => a.name.localeCompare(b.name));
        setSquadOptions(list);
      }
    } catch (e: any) {
      console.error(e);
      setError((prev) => prev || e.message || "Failed to load squads.");
    } finally {
      setLoadingSquads(false);
    }
  };

  // reload when we become admin
  useEffect(() => {
    if (isAdmin) {
      loadAllowlist();
      loadUsers();
      loadSquads();
    } else {
      setAllowlistEntries([]);
      setUserEntries([]);
      setSquadOptions([]);
    }
  }, [isAdmin]);

  const handleSignIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to sign in.");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // --- Squad helpers ---

  const addSquad = async (rawName: string): Promise<string | null> => {
    const name = rawName.trim();
    if (!name) return null;

    // Check if it already exists (case-insensitive)
    const existing = squadOptions.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return existing.name;
    }

    try {
      const ref = doc(collection(db, SQUADS_COLLECTION));
      await setDoc(ref, {
        name,
        createdAt: serverTimestamp(),
      });

      setSquadOptions((prev) => {
        const next = [...prev, { id: ref.id, name }];
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });

      return name;
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to add new squad.");
      return null;
    }
  };

  const handleAllowlistSquadSelectChange = async (id: string, value: string) => {
    if (value === "__ADD_NEW__") {
      const input = window.prompt("Enter new squad name:");
      if (!input) return;
      const name = await addSquad(input);
      if (!name) return;
      setAllowlistEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, squadID: name } : e))
      );
    } else {
      setAllowlistEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, squadID: value || null } : e
        )
      );
    }
  };

  const handleUserSquadSelectChange = async (id: string, value: string) => {
    if (value === "__ADD_NEW__") {
      const input = window.prompt("Enter new squad name:");
      if (!input) return;
      const name = await addSquad(input);
      if (!name) return;
      setUserEntries((prev) =>
        prev.map((u) => (u.id === id ? { ...u, squadID: name } : u))
      );
    } else {
      setUserEntries((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, squadID: value || null } : u
        )
      );
    }
  };

  // --- Allowlist handlers ---

  const handleAllowlistTierChange = (id: string, tier: Tier) => {
    setAllowlistEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, tier } : e))
    );
  };

  const handleAllowlistSave = async (entry: AllowlistEntry) => {
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, ALLOWLIST_COLLECTION, entry.id);
      const squad = (entry.squadID ?? "").toString().trim();

      const updateData: any = {
        tier: entry.tier,
        updatedAt: serverTimestamp(),
      };

      if (squad) {
        updateData.squadID = squad;
        // Also ensure it's in the squads collection
        await addSquad(squad);
      } else {
        updateData.squadID = deleteField();
      }

      await updateDoc(ref, updateData);
      setRecentAllowlistSavedId(entry.id);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to update allowlist entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleAllowlistDelete = async (entry: AllowlistEntry) => {
    const ok = window.confirm(
      `Delete allowlist entry for ${entry.email}?\n\n` +
        "This does NOT delete their user account – it only removes their preloaded settings."
    );
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, ALLOWLIST_COLLECTION, entry.id);
      await deleteDoc(ref);
      await loadAllowlist();
      // No per-row "saved" indicator needed for delete
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to delete allowlist entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrUpdateAllowlist = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    const squad = newSquadID.trim();

    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, ALLOWLIST_COLLECTION, email);

      const payload: any = {
        email,
        tier: newTier,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (squad) {
        payload.squadID = squad;
        await addSquad(squad);
      } else {
        payload.squadID = deleteField();
      }

      await setDoc(ref, payload, { merge: true });

      setNewEmail("");
      setNewTier("free");
      setNewSquadID("");
      await loadAllowlist();
      // "Saved" indicator will happen when editing rows, so no per-row id here.
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to add/update allowlist entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleCleanupAllowlist = async () => {
    if (
      !window.confirm(
        "This will delete allowlist entries whose email already has a user record.\n\n" +
          "This does NOT affect existing users or their access – it only removes stale pre-registration entries.\n\n" +
          "Continue?"
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const userEmailSet = new Set(
        userEntries
          .map((u) => (u.email || "").toLowerCase())
          .filter((e) => !!e)
      );

      const toDelete = allowlistEntries.filter((e) =>
        userEmailSet.has((e.email || "").toLowerCase())
      );

      await Promise.all(
        toDelete.map((entry) =>
          deleteDoc(doc(db, ALLOWLIST_COLLECTION, entry.id))
        )
      );

      if (toDelete.length > 0) {
        await loadAllowlist();
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to clean up allowlist.");
    } finally {
      setSaving(false);
    }
  };

  // --- Users handlers ---

  const handleUserTierChange = (id: string, tier: Tier) => {
    setUserEntries((prev) =>
      prev.map((u) => (u.id === id ? { ...u, tier } : u))
    );
  };

  const handleUserSave = async (user: UserEntry) => {
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, USERS_COLLECTION, user.id);

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      // Tier logic: no field = free
      if (!user.tier || user.tier === "free") {
        updateData.tier = deleteField();
      } else {
        updateData.tier = user.tier;
      }

      // Squad logic: optional; delete field if blank
      const squad = (user.squadID ?? "").toString().trim();
      if (squad) {
        updateData.squadID = squad;
        await addSquad(squad);
      } else {
        updateData.squadID = deleteField();
      }

      await updateDoc(ref, updateData);
      setRecentUserSavedId(user.id);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to update user record.");
    } finally {
      setSaving(false);
    }
  };

  const handleUserDelete = async (user: UserEntry) => {
    if (
      !window.confirm(
        `Delete Firestore user record for:\n\n${user.displayName || "—"}\n${
          user.email
        }\n\n` +
          `This ONLY deletes the Firestore doc (stats, tier, squad, etc.).\n` +
          `It does NOT delete their sign-in account in Firebase Authentication.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, USERS_COLLECTION, user.id);
      await deleteDoc(ref);

      // Remove from local state
      setUserEntries((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to delete user record.");
    } finally {
      setSaving(false);
    }
  };

  // --- Derived filtered lists + stats ---

  // Allowlist stats
  const totalAllowlist = allowlistEntries.length;
  const allowlistCounts = allowlistEntries.reduce(
    (acc, e) => {
      acc[e.tier] += 1;
      return acc;
    },
    { free: 0, amateur: 0, pro: 0 } as Record<Tier, number>
  );

  // Users stats
  const totalUsers = userEntries.length;
  const userCounts = userEntries.reduce(
    (acc, u) => {
      const effectiveTier: Tier = (u.tier || "free") as Tier;
      acc[effectiveTier] += 1;
      return acc;
    },
    { free: 0, amateur: 0, pro: 0 } as Record<Tier, number>
  );

  const filteredUsers = userEntries.filter((u) => {
    const needle = searchUsers.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      u.email.toLowerCase().includes(needle) ||
      (u.displayName || "").toLowerCase().includes(needle);
    const effectiveTier: Tier = (u.tier || "free") as Tier;
    const matchesTier =
      tierFilterUsers === "all" || effectiveTier === tierFilterUsers;
    return matchesSearch && matchesTier;
  });

  // --- UI STATES (login / not authorized) ---

  if (!firebaseUser) {
    return (
      <div style={page}>
        <div style={card}>
          <h1>ATM 10MM App Admin Console</h1>
          <p>Sign in with an authorized Google account to manage access tiers.</p>
          <button onClick={handleSignIn} style={buttonPrimary}>
            Sign in with Google
          </button>
          {error && <p style={errorStyle}>{error}</p>}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={page}>
        <div style={card}>
          <h1>ATM 10MM App Admin Console</h1>
          <p>
            Signed in as <strong>{firebaseUser.email}</strong>
          </p>
          <p style={errorStyle}>
            This account is not authorized to access the admin console.
          </p>
          <button onClick={handleSignOut} style={buttonPrimary}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // --- Authorized admin view with nav + scrollable body ---

  return (
    <div style={page}>
      <div
        style={{
          ...card,
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            ...headerRow,
            alignItems: "center",
          }}
        >
          {/* Left: logo + centered title block */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src={appLogo}
              alt="ATM 10MM App"
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                objectFit: "contain",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <h1 style={{ margin: 0, textAlign: "center" }}>
                ATM 10MM App Admin Console
              </h1>
              <p
                style={{
                  ...subtle,
                  margin: 0,
                  textAlign: "center",
                }}
              >
                Preload tiers &amp; squads via <strong>allowlist</strong> and
                upgrade existing <strong>users</strong> after they register.
              </p>
            </div>
          </div>

          {/* Right: signed-in info */}
          <div style={{ textAlign: "right" }}>
            <div style={subtle}>
              Signed in as <strong>{firebaseUser.email}</strong>
            </div>
            <button onClick={handleSignOut} style={buttonPrimary}>
              Sign out
            </button>
          </div>
        </div>

        {/* Error message (if any) */}
        {error && <p style={errorStyle}>{error}</p>}

        {/* Top nav */}
        <div style={navRow}>
          <button
            type="button"
            onClick={() => setActiveTab("allowlist")}
            style={{
              ...navButton,
              ...(activeTab === "allowlist" ? navButtonActive : navButtonIdle),
            }}
          >
            Preload Access
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            style={{
              ...navButton,
              ...(activeTab === "users" ? navButtonActive : navButtonIdle),
            }}
          >
            Existing Users
          </button>
        </div>

        {/* Scrollable inner content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginTop: 8,
            paddingRight: 8,
          }}
        >
          {activeTab === "allowlist" ? (
            // --- PRELOAD / ALLOWLIST TAB ---
            <section>
              <div style={sectionCard}>
                <h2 style={{ marginTop: 0 }}>Preload Access (allowlist)</h2>

                {/* --- Add area --- */}
                <h3 style={sectionSubheading}>Add allowlist entry</h3>
                <p
                  style={{
                    ...subtle,
                    opacity: 1, // brighter than default subtle
                  }}
                >
                  Add an allowlist entry. When someone registers with this email,
                  they’ll start with the selected tier. Optionally set their squad
                  now; if you leave it blank, you can assign their squad later on
                  the <strong>Existing Users</strong> tab.
                </p>

                {/* Add row */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 10,
                    marginBottom: 18, // extra space before list area
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={searchInput}
                  />
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as Tier)}
                    style={getTierSelectStyle(newTier)}
                  >
                    <option value="free">Free</option>
                    <option value="amateur">Amateur</option>
                    <option value="pro">Pro</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Squad ID (optional)"
                    value={newSquadID}
                    onChange={(e) => setNewSquadID(e.target.value)}
                    style={select}
                  />
                  <button
                    onClick={handleAddOrUpdateAllowlist}
                    style={buttonPrimary}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>

                {/* --- Simple list + cleanup --- */}
                <h3 style={sectionSubheading}>Current allowlist entries</h3>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    marginTop: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={subtle}>
                    Total: <strong>{totalAllowlist}</strong>{" "}
                    {totalAllowlist > 0 && (
                      <>
                        · Free {allowlistCounts.free} · Amateur{" "}
                        {allowlistCounts.amateur} · Pro {allowlistCounts.pro}
                      </>
                    )}
                    {loadingSquads && " · Loading squads…"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCleanupAllowlist}
                    style={buttonSmall}
                    disabled={saving}
                  >
                    Clean up allowlist
                  </button>
                </div>

                {loadingAllowlist ? (
                  <p>Loading allowlist…</p>
                ) : totalAllowlist === 0 ? (
                  <p>No allowlist entries yet.</p>
                ) : (
                  <div style={{ overflowX: "auto", marginTop: 8 }}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Email</th>
                          <th style={th}>Tier</th>
                          <th style={th}>Squad</th>
                          <th style={th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allowlistEntries.map((e) => {
                          const isRecentlySaved =
                            recentAllowlistSavedId === e.id;
                          const saveButtonStyle = isRecentlySaved
                            ? buttonSavedSmall
                            : buttonSuccessSmall;
                          const saveButtonLabel = isRecentlySaved
                            ? "Saved"
                            : "Save";

                          return (
                            <tr key={e.id}>
                              <td style={tdEmail}>{e.email}</td>
                              <td style={tdTier}>
                                <select
                                  value={e.tier}
                                  onChange={(ev) =>
                                    handleAllowlistTierChange(
                                      e.id,
                                      ev.target.value as Tier
                                    )
                                  }
                                  style={getTierSelectStyle(e.tier)}
                                >
                                  <option value="free">Free</option>
                                  <option value="amateur">Amateur</option>
                                  <option value="pro">Pro</option>
                                </select>
                              </td>
                              <td style={tdSquad}>
                                <select
                                  value={e.squadID ?? ""}
                                  onChange={(ev) =>
                                    handleAllowlistSquadSelectChange(
                                      e.id,
                                      ev.target.value
                                    )
                                  }
                                  style={select}
                                >
                                  <option value="">None</option>
                                  {squadOptions.map((s) => (
                                    <option key={s.id} value={s.name}>
                                      {s.name}
                                    </option>
                                  ))}
                                  <option value="__ADD_NEW__">
                                    ➕ Add new…
                                  </option>
                                </select>
                              </td>
                              <td style={tdActions}>
                                <div style={{ display: "flex", gap: 10 }}>
                                  <button
                                    onClick={() => handleAllowlistSave(e)}
                                    style={saveButtonStyle}
                                    disabled={saving}
                                  >
                                    {saveButtonLabel}
                                  </button>
                                  <button
                                    onClick={() => handleAllowlistDelete(e)}
                                    style={buttonDangerSmall}
                                    disabled={saving}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ) : (
            // --- USERS TAB ---
            <section>
              <div style={sectionCard}>
                <h2 style={{ marginTop: 0 }}>Existing Users (users collection)</h2>
                <p style={subtle}>
                  These are users who have already signed up. If{" "}
                  <strong>no tier field</strong> is set, they are treated as{" "}
                  <strong>Free</strong>. Changing to Free here will remove the{" "}
                  <code>tier</code> field again. Squad assignment for leaderboards
                  lives on this screen in the <code>squadID</code> field.
                </p>

                {/* Search + stats */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                    marginTop: 8,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search name or email…"
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    style={searchInput}
                  />

                  <div style={showingRow}>
                    <span style={{ marginRight: 8 }}>
                      Showing <strong>{filteredUsers.length}</strong> of{" "}
                      <strong>{totalUsers}</strong> users
                    </span>
                    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                      <TierChip
                        label={`All`}
                        active={tierFilterUsers === "all"}
                        onClick={() => setTierFilterUsers("all")}
                      />
                      <TierChip
                        label={`Free (${userCounts.free})`}
                        active={tierFilterUsers === "free"}
                        onClick={() => setTierFilterUsers("free")}
                      />
                      <TierChip
                        label={`Amateur (${userCounts.amateur})`}
                        active={tierFilterUsers === "amateur"}
                        onClick={() => setTierFilterUsers("amateur")}
                      />
                      <TierChip
                        label={`Pro (${userCounts.pro})`}
                        active={tierFilterUsers === "pro"}
                        onClick={() => setTierFilterUsers("pro")}
                      />
                    </span>
                  </div>
                </div>

                {loadingUsers ? (
                  <p>Loading users…</p>
                ) : filteredUsers.length === 0 ? (
                  <p>No users match this view.</p>
                ) : (
                  <div style={{ overflowX: "auto", marginTop: 8 }}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Display Name</th>
                          <th style={th}>Email</th>
                          <th style={th}>Tier</th>
                          <th style={th}>Squad</th>
                          <th style={th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const effectiveTier: Tier = (u.tier || "free") as Tier;
                          const isFreeByMissingField = !u.tier;
                          const isRecentlySaved = recentUserSavedId === u.id;
                          const saveButtonStyle = isRecentlySaved
                            ? buttonSavedSmall
                            : buttonSuccessSmall;
                          const saveButtonLabel = isRecentlySaved ? "Saved" : "Save";

                          return (
                            <tr key={u.id}>
                              <td style={tdName}>{u.displayName || "—"}</td>
                              <td style={tdEmail}>
                                <div style={{ opacity: 0.8 }}>{u.email}</div>
                              </td>
                              <td style={tdTier}>
                                <select
                                  value={effectiveTier}
                                  onChange={(ev) =>
                                    handleUserTierChange(
                                      u.id,
                                      ev.target.value as Tier
                                    )
                                  }
                                  style={getTierSelectStyle(effectiveTier)}
                                >
                                  <option value="free">
                                    Free
                                    {isFreeByMissingField
                                      ? " (no tier set)"
                                      : ""}
                                  </option>
                                  <option value="amateur">Amateur</option>
                                  <option value="pro">Pro</option>
                                </select>
                              </td>
                              <td style={tdSquad}>
                                <select
                                  value={u.squadID ?? ""}
                                  onChange={(ev) =>
                                    handleUserSquadSelectChange(
                                      u.id,
                                      ev.target.value
                                    )
                                  }
                                  style={select}
                                >
                                  <option value="">None</option>
                                  {squadOptions.map((s) => (
                                    <option key={s.id} value={s.name}>
                                      {s.name}
                                    </option>
                                  ))}
                                  <option value="__ADD_NEW__">
                                    ➕ Add new…
                                  </option>
                                </select>
                              </td>
                              <td style={tdActions}>
                                <div style={{ display: "flex", gap: 10 }}>
                                  <button
                                    onClick={() => handleUserSave(u)}
                                    style={saveButtonStyle}
                                    disabled={saving}
                                  >
                                    {saveButtonLabel}
                                  </button>
                                  <button
                                    onClick={() => handleUserDelete(u)}
                                    style={buttonDangerSmall}
                                    disabled={saving}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Tiny component for clickable tier filters ---
interface TierChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const TierChip: React.FC<TierChipProps> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: 12,
      border: active ? "1px solid #22c55e" : "1px solid #4b5563",
      background: active ? "rgba(34,197,94,0.12)" : "transparent",
      color: active ? "#bbf7d0" : "#e5e7eb",
      cursor: "pointer",
    }}
  >
    {label}
  </button>
);

// --- Tier select color helper ---
const getTierSelectStyle = (tier: Tier): React.CSSProperties => {
  const base: React.CSSProperties = {
    ...select,
    textTransform: "capitalize",
    fontWeight: 600,
  };

  if (tier === "free") {
    return {
      ...base,
      background: "rgba(148,163,184,0.15)",
      color: "#e5e7eb",
      border: "1px solid rgba(148,163,184,0.8)",
    };
  }
  if (tier === "amateur") {
    return {
      ...base,
      background: "rgba(59,130,246,0.18)",
      color: "#dbeafe",
      border: "1px solid rgba(59,130,246,0.9)",
    };
  }
  // pro
  return {
    ...base,
    background: "rgba(34,197,94,0.18)",
    color: "#bbf7d0",
    border: "1px solid rgba(34,197,94,0.9)",
  };
};

// --- minimal inline styles ---
const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0f172a",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: 16,
};

const card: React.CSSProperties = {
  background: "#020617",
  color: "#e5e7eb",
  borderRadius: 16,
  padding: 24,
  maxWidth: 1100,
  width: "100%",
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
};

const sectionCard: React.CSSProperties = {
  background: "#020617",
  borderRadius: 12,
  padding: 16,
  border: "1px solid #1f2937",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
};

const buttonBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const buttonPrimary: React.CSSProperties = {
  ...buttonBase,
  background: "#22c55e",
  color: "#022c22",
};

const button: React.CSSProperties = {
  ...buttonBase,
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid #4b5563",
};

const buttonSmall: React.CSSProperties = {
  ...button,
  padding: "4px 12px",
  fontSize: 13,
};

const buttonSuccessSmall: React.CSSProperties = {
  ...buttonSmall,
  border: "1px solid #22c55e", // green outline
  color: "#bbf7d0", // soft green text
  background: "rgba(34, 197, 94, 0.12)", // subtle green tint
};

const buttonSavedSmall: React.CSSProperties = {
  ...buttonSmall,
  border: "1px solid #9ca3af",
  color: "#e5e7eb",
  background: "rgba(148,163,184,0.2)",
};

const buttonDangerSmall: React.CSSProperties = {
  ...buttonSmall,
  background: "transparent",
  border: "1px solid #fecaca",
  color: "#fecaca",
};

const inputBase: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #4b5563",
  background: "#020617",
  color: "#e5e7eb",
  fontSize: 13,
};

const searchInput: React.CSSProperties = {
  ...inputBase,
  flex: 1,
  border: "1px solid #3b82f6",
  boxShadow: "0 0 0 1px rgba(59,130,246,0.3)",
};

const select: React.CSSProperties = {
  ...inputBase,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  tableLayout: "auto",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 6px",
  borderBottom: "1px solid #1f2937",
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: "nowrap",
};

const tdBase: React.CSSProperties = {
  padding: "6px 6px",
  borderBottom: "1px solid #111827",
  verticalAlign: "middle",
  fontSize: 13,
};

const tdName: React.CSSProperties = {
  ...tdBase,
  maxWidth: 220,
};

const tdEmail: React.CSSProperties = {
  ...tdBase,
  maxWidth: 260,
  wordBreak: "break-all",
};

const tdTier: React.CSSProperties = {
  ...tdBase,
  whiteSpace: "nowrap",
};

const tdSquad: React.CSSProperties = {
  ...tdBase,
  whiteSpace: "nowrap",
};

const tdActions: React.CSSProperties = {
  ...tdBase,
  minWidth: 150,
};

const subtle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
};

const sectionSubheading: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginTop: 12,
  marginBottom: 4,
};

const errorStyle: React.CSSProperties = {
  color: "#fecaca",
  fontSize: 13,
  marginTop: 8,
};

const navRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 16,
  marginBottom: 8,
};

const navButton: React.CSSProperties = {
  ...buttonBase,
  background: "transparent",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 14,
};

const navButtonActive: React.CSSProperties = {
  border: "1px solid #22c55e",
  background: "rgba(34,197,94,0.08)",
  color: "#bbf7d0",
};

const navButtonIdle: React.CSSProperties = {
  border: "1px solid #4b5563",
  color: "#e5e7eb",
};

const showingRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  opacity: 0.85,
};

export default AdminPage;