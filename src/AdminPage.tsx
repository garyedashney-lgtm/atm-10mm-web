// src/AdminPage.tsx
import React, { useEffect, useRef, useState } from "react";
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
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  deleteField,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// --- CSV helpers ------------------------------------------------------------

function csvValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const headerLine = headers.map(csvValue).join(",");
  const lines = rows.map((row) => row.map(csvValue).join(","));
  const csv = [headerLine, ...lines].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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

  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  leaderboardUpdatedAt?: Timestamp | null;

  source?: string | null;

  // Trial fields
  trialProvided?: boolean | null;
  trialStatus?: string | null;
  trialEndsAt?: Timestamp | null;

  // Tier fields
  tier?: Tier | null; // missing = free
  tierOverride?: Tier | null; // only "pro" | "amateur" | null (we'll enforce later)

  squadID?: string | null;
}

interface SquadOption {
  id: string;
  name: string;
}

const googleProvider = new GoogleAuthProvider();

type UserSortKey =
  | "displayName"
  | "email"
  | "createdAt"
  | "source"
  | "trialProvided"
  | "trialStatus"
  | "trialEndsAt"
  | "updatedAt"
  | "tierOverride";
type SortDir = "asc" | "desc";

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

  // Users sorting (clickable column headers)
  const [userSort, setUserSort] = useState<{ key: UserSortKey; dir: SortDir }>(
    {
      key: "email",
      dir: "asc",
    }
  );

  // --- squads state ---
  const [squadOptions, setSquadOptions] = useState<SquadOption[]>([]);
  const [loadingSquads, setLoadingSquads] = useState(false);

  // shared
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent repeated auto-clean deletes for same email
  const autoCleanRanFor = useRef<Set<string>>(new Set());

  const toggleUserSort = (key: UserSortKey) => {
    setUserSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  const sortArrow = (key: UserSortKey) => {
    if (userSort.key !== key) return "";
    return userSort.dir === "asc" ? " ▲" : " ▼";
  };

    const timestampMillis = (t?: Timestamp | null) =>
    t && typeof (t as any).toDate === "function" ? t.toDate().getTime() : 0;

  const formatTimestamp = (t?: Timestamp | null) => {
  if (!t || typeof (t as any).toDate !== "function") return "—";
  return t.toDate().toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

  // quick “how long ago” indicator for Updated At (clamped to avoid -1 due to clock skew)
const daysSince = (t?: Timestamp | null) => {
  const ms = timestampMillis(t);
  if (!ms) return "—";

  const diffMs = Date.now() - ms;

  // If server timestamp is slightly in the future vs this browser clock,
  // diffMs can be negative; clamp to 0 days.
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return `${days}d`;
};
    const latestTimestamp = (...items: (Timestamp | null | undefined)[]) => {
    let best: Timestamp | null = null;
    let bestMs = 0;

    for (const t of items) {
      const ms = timestampMillis(t ?? null);
      if (ms > bestMs) {
        bestMs = ms;
        best = (t ?? null) as Timestamp | null;
      }
    }
    return best;
  };


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

  // --- REALTIME LISTENERS (no flicker, live data) ---

  useEffect(() => {
    if (!isAdmin) {
      setAllowlistEntries([]);
      setUserEntries([]);
      setSquadOptions([]);
      return;
    }

    // allowlist
    setLoadingAllowlist(true);
    const allowlistUnsub = onSnapshot(
      collection(db, ALLOWLIST_COLLECTION),
      (snap) => {
        const list: AllowlistEntry[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          const email = (data.email || d.id || "").toString();
          const tier = (data.tier || "free") as Tier;
          const squadID = (data.squadID ?? null) as string | null;
          list.push({ id: d.id, email, tier, squadID });
        });
        list.sort((a, b) => a.email.localeCompare(b.email));
        setAllowlistEntries(list);
        setLoadingAllowlist(false);
      },
      (err) => {
        console.error(err);
        setError((prev) => prev || err.message || "Failed to listen to allowlist.");
        setLoadingAllowlist(false);
      }
    );

    // users
    // users
setLoadingUsers(true);
const usersUnsub = onSnapshot(
  collection(db, USERS_COLLECTION),
  (snap) => {
    const list: UserEntry[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      const email = (data.emailLower || data.email || d.id || "").toString();
      const displayName = (data.displayName || "").toString();
      const tier = (data.tier ?? null) as Tier | null;
      const squadID = (data.squadID ?? null) as string | null;

      const createdAt = (data.createdAt ?? null) as Timestamp | null;
      const updatedAt = (data.updatedAt ?? null) as Timestamp | null;
      const leaderboardUpdatedAt = (data.leaderboardUpdatedAt ?? null) as Timestamp | null;
      const source = (data.source ?? null) as string | null;

      const trialProvided = (data.trialProvided ?? null) as boolean | null;
      const trialStatus = (data.trialStatus ?? null) as string | null;
      const trialEndsAt = (data.trialEndsAt ?? null) as Timestamp | null;

      const tierOverride = (data.tierOverride ?? null) as Tier | null;

      list.push({
        id: d.id,
        email,
        displayName,
        createdAt,
        updatedAt,
        leaderboardUpdatedAt,
        source,
        trialProvided,
        trialStatus,
        trialEndsAt,
        tier,
        tierOverride,
        squadID,
      });
    });

    list.sort((a, b) => a.email.localeCompare(b.email));
    setUserEntries(list);
    setLoadingUsers(false);
  },
  (err) => {
    console.error(err);
    setError((prev) => prev || err.message || "Failed to listen to users.");
    setLoadingUsers(false);
  }
);

    // squads
    setLoadingSquads(true);
    const squadsUnsub = onSnapshot(
      collection(db, SQUADS_COLLECTION),
      async (snap) => {
        const list: SquadOption[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          const name = (data.name || d.id || "").toString();
          if (name.trim()) {
            list.push({ id: d.id, name });
          }
        });

        if (list.length === 0) {
          const defaults = ["Morning Oaks", "Matinee Monsters", "Wednesday Warriors"];
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
        setLoadingSquads(false);
      },
      (err) => {
        console.error(err);
        setError((prev) => prev || err.message || "Failed to listen to squads.");
        setLoadingSquads(false);
      }
    );

    return () => {
      allowlistUnsub();
      usersUnsub();
      squadsUnsub();
    };
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

    // Check existing (case-insensitive)
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

      // onSnapshot will eventually update; but also update local eagerly
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

  // --- Auto-persist helpers (no Save buttons) ---

  const persistAllowlistEntry = async (entry: AllowlistEntry) => {
    try {
      const ref = doc(db, ALLOWLIST_COLLECTION, entry.id);
      const squad = (entry.squadID ?? "").toString().trim();

      const updateData: any = {
        tier: entry.tier,
        updatedAt: serverTimestamp(),
      };

      if (squad) {
        updateData.squadID = squad;
        await addSquad(squad);
      } else {
        updateData.squadID = deleteField();
      }

      await updateDoc(ref, updateData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to auto-save allowlist entry.");
    }
  };

  const persistUserEntry = async (user: UserEntry) => {
    try {
      const ref = doc(db, USERS_COLLECTION, user.id);
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (!user.tier || user.tier === "free") {
        updateData.tier = deleteField();
      } else {
        updateData.tier = user.tier;
      }

      const squad = (user.squadID ?? "").toString().trim();
      if (squad) {
        updateData.squadID = squad;
        await addSquad(squad);
      } else {
        updateData.squadID = deleteField();
      }

      await updateDoc(ref, updateData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to auto-save user record.");
    }
  };

    const setUserTierOverride = async (
    userId: string,
    override: "pro" | "amateur"
  ) => {
    try {
      const ref = doc(db, USERS_COLLECTION, userId);
      await updateDoc(ref, {
        tierOverride: override,
        tier: override, // keep consistent
        // Optional: if overriding, treat any trial as ended
        trialStatus: "ended",
        trialEndedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to set tier override.");
    }
  };

  const clearUserTierOverride = async (userId: string) => {
    try {
      const ref = doc(db, USERS_COLLECTION, userId);
      await updateDoc(ref, {
        tierOverride: deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to clear tier override.");
    }
  };

  // --- Allowlist cleanup helpers ---

  const deleteAllowlistByEmailLower = async (emailLower: string) => {
    const key = (emailLower || "").trim().toLowerCase();
    if (!key) return;

    const match = allowlistEntries.find((e) => {
      const eEmail = (e.email || "").trim().toLowerCase();
      const eId = (e.id || "").trim().toLowerCase();
      return eEmail === key || eId === key;
    });

    try {
      if (match) {
        await deleteDoc(doc(db, ALLOWLIST_COLLECTION, match.id));
      } else {
        // allowlist doc id is usually emailLower, so try direct delete
        await deleteDoc(doc(db, ALLOWLIST_COLLECTION, key));
      }
    } catch (e: any) {
      // Firestore delete for missing doc is effectively harmless; suppress spam.
      console.warn("Allowlist delete (safe) failed:", e?.message || e);
    }
  };

  // --- Allowlist handlers ---

  const handleAllowlistTierChange = (id: string, tier: Tier) => {
    setAllowlistEntries((prev) => {
      const prevEntry = prev.find((e) => e.id === id);
      if (!prevEntry) return prev;
      const updatedEntry: AllowlistEntry = { ...prevEntry, tier };
      void persistAllowlistEntry(updatedEntry);
      return prev.map((e) => (e.id === id ? updatedEntry : e));
    });
  };

  const handleAllowlistSquadSelectChange = async (id: string, value: string) => {
    if (value === "__ADD_NEW__") {
      const input = window.prompt("Enter new squad name:");
      if (!input) return;
      const name = await addSquad(input);
      if (!name) return;

      setAllowlistEntries((prev) => {
        const prevEntry = prev.find((e) => e.id === id);
        if (!prevEntry) return prev;
        const updatedEntry: AllowlistEntry = { ...prevEntry, squadID: name };
        void persistAllowlistEntry(updatedEntry);
        return prev.map((e) => (e.id === id ? updatedEntry : e));
      });
    } else {
      setAllowlistEntries((prev) => {
        const prevEntry = prev.find((e) => e.id === id);
        if (!prevEntry) return prev;
        const updatedEntry: AllowlistEntry = {
          ...prevEntry,
          squadID: value || null,
        };
        void persistAllowlistEntry(updatedEntry);
        return prev.map((e) => (e.id === id ? updatedEntry : e));
      });
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
      // onSnapshot will update UI
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
      // list auto-updates via onSnapshot
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

      // onSnapshot will pick up deletions
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to clean up allowlist.");
    } finally {
      setSaving(false);
    }
  };

  // --- Users handlers ---

  const handleUserTierChange = (id: string, tier: Tier) => {
    setUserEntries((prev) => {
      const prevUser = prev.find((u) => u.id === id);
      if (!prevUser) return prev;
      const updatedUser: UserEntry = { ...prevUser, tier };
      void persistUserEntry(updatedUser);
      return prev.map((u) => (u.id === id ? updatedUser : u));
    });
  };

  const handleUserSquadSelectChange = async (id: string, value: string) => {
    if (value === "__ADD_NEW__") {
      const input = window.prompt("Enter new squad name:");
      if (!input) return;
      const name = await addSquad(input);
      if (!name) return;

      setUserEntries((prev) => {
        const prevUser = prev.find((u) => u.id === id);
        if (!prevUser) return prev;
        const updatedUser: UserEntry = { ...prevUser, squadID: name };
        void persistUserEntry(updatedUser);
        return prev.map((u) => (u.id === id ? updatedUser : u));
      });
    } else {
      setUserEntries((prev) => {
        const prevUser = prev.find((u) => u.id === id);
        if (!prevUser) return prev;
        const updatedUser: UserEntry = {
          ...prevUser,
          squadID: value || null,
        };
        void persistUserEntry(updatedUser);
        return prev.map((u) => (u.id === id ? updatedUser : u));
      });
    }
  };

  const handleUserDelete = async (user: UserEntry) => {
    if (
      !window.confirm(
        `Delete Firestore user record for:\n\n${user.displayName || "—"}\n${
          user.email
        }\n\n` +
          `This ONLY deletes the Firestore doc (stats, tier, squad, etc.).\n` +
          `It does NOT delete their sign-in account in Firebase Authentication.\n\n` +
          `It WILL also remove any allowlist entry for this email, so they can only come back as Free.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 1) delete Firestore users/{uid}
      const ref = doc(db, USERS_COLLECTION, user.id);
      await deleteDoc(ref);

      // 2) also remove allowlist/{emailLower} so they can only come back as Free
      await deleteAllowlistByEmailLower(user.email);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to delete user record.");
    } finally {
      setSaving(false);
    }
  };

  // --- CSV download handlers ---

  const handleDownloadAllowlistCsv = () => {
    if (allowlistEntries.length === 0) return;

    const headers = ["email", "tier", "squadID"];
    const rows = allowlistEntries.map((e) => [
      e.email,
      e.tier,
      e.squadID ?? "",
    ]);

    downloadCsv("preload-allowlist.csv", headers, rows);
  };

  const handleDownloadUsersCsv = () => {
    if (userEntries.length === 0) return;

    const headers = ["uid", "email", "displayName", "tier", "squadID"];
    const rows = userEntries.map((u) => [
      u.id,
      u.email,
      u.displayName,
      u.tier ?? "free",
      u.squadID ?? "",
    ]);

    downloadCsv("existing-users.csv", headers, rows);
  };

  // --- Derived filtered lists + stats ---

  const totalAllowlist = allowlistEntries.length;
  const allowlistCounts = allowlistEntries.reduce(
    (acc, e) => {
      acc[e.tier] += 1;
      return acc;
    },
    { free: 0, amateur: 0, pro: 0 } as Record<Tier, number>
  );

  const totalUsers = userEntries.length;
  const userCounts = userEntries.reduce(
    (acc, u) => {
      const effectiveTier: Tier = (u.tier || "free") as Tier;
      acc[effectiveTier] += 1;
      return acc;
    },
    { free: 0, amateur: 0, pro: 0 } as Record<Tier, number>
  );

  const filteredUsers = userEntries
    .filter((u) => {
      const needle = searchUsers.trim().toLowerCase();
      const matchesSearch =
        !needle ||
        u.email.toLowerCase().includes(needle) ||
        (u.displayName || "").toLowerCase().includes(needle);
      const effectiveTier: Tier = (u.tier || "free") as Tier;
      const matchesTier =
        tierFilterUsers === "all" || effectiveTier === tierFilterUsers;
      return matchesSearch && matchesTier;
    })
        .sort((a, b) => {
      const dir = userSort.dir === "asc" ? 1 : -1;

      // Timestamp sorts
      if (userSort.key === "createdAt") {
        return (timestampMillis(a.createdAt) - timestampMillis(b.createdAt)) * dir;
      }
      if (userSort.key === "updatedAt") {
        const aLast = latestTimestamp(a.updatedAt, a.leaderboardUpdatedAt);
        const bLast = latestTimestamp(b.updatedAt, b.leaderboardUpdatedAt);
        return (timestampMillis(aLast) - timestampMillis(bLast)) * dir;
}
      if (userSort.key === "trialEndsAt") {
        return (timestampMillis(a.trialEndsAt) - timestampMillis(b.trialEndsAt)) * dir;
      }

      // Bool-ish sort
      if (userSort.key === "trialProvided") {
        const av = a.trialProvided ? 1 : 0;
        const bv = b.trialProvided ? 1 : 0;
        return (av - bv) * dir;
      }

      // Enum-ish sorts
      if (userSort.key === "trialStatus") {
        const score = (v?: string | null) =>
          v === "active" ? 2 : v === "ended" ? 1 : 0;
        return (score(a.trialStatus) - score(b.trialStatus)) * dir;
      }

      if (userSort.key === "tierOverride") {
        const score = (v?: string | null) =>
          v === "pro" ? 2 : v === "amateur" ? 1 : 0;
        return (score(a.tierOverride) - score(b.tierOverride)) * dir;
      }

      // String sorts (default)
      const av =
        userSort.key === "displayName"
          ? a.displayName || ""
          : userSort.key === "email"
          ? a.email || ""
          : userSort.key === "source"
          ? (a.source ?? "")
          : "";

      const bv =
        userSort.key === "displayName"
          ? b.displayName || ""
          : userSort.key === "email"
          ? b.email || ""
          : userSort.key === "source"
          ? (b.source ?? "")
          : "";

      return av.toString().localeCompare(bv.toString()) * dir;
    });

  // --- Auto-clean allowlist whenever a user exists in users collection ---
  useEffect(() => {
    if (!isAdmin) return;
    if (loadingUsers || loadingAllowlist) return;
    if (userEntries.length === 0 || allowlistEntries.length === 0) return;

    const userEmailSet = new Set(
      userEntries
        .map((u) => (u.email || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const toDelete = allowlistEntries.filter((e) => {
      const emailLower = (e.email || e.id || "").trim().toLowerCase();
      if (!emailLower) return false;
      if (!userEmailSet.has(emailLower)) return false;
      if (autoCleanRanFor.current.has(emailLower)) return false;
      return true;
    });

    if (toDelete.length === 0) return;

    // mark first so repeated snapshots don't refire the same ones
    toDelete.forEach((e) => {
      const emailLower = (e.email || e.id || "").trim().toLowerCase();
      if (emailLower) autoCleanRanFor.current.add(emailLower);
    });

    void (async () => {
      try {
        await Promise.all(
          toDelete.map((e) => deleteDoc(doc(db, ALLOWLIST_COLLECTION, e.id)))
        );
      } catch (err: any) {
        console.warn("Auto-clean allowlist failed:", err?.message || err);
      }
    })();
  }, [isAdmin, loadingUsers, loadingAllowlist, userEntries, allowlistEntries]);

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

  // --- Authorized admin view ---

  return (
    <div style={page}>
      <div
        style={{
          ...card,
          display: "flex",
          flexDirection: "column",
          height: "auto",
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

        {/* Body area */}
        <div
          style={{
            marginTop: 8,
            paddingRight: 8,
          }}
        >
          {activeTab === "allowlist" ? (
            // --- PRELOAD / ALLOWLIST TAB ---
            <section>
              <div
                style={{
                  ...sectionCard,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 0 }}>
                    Preload Access (allowlist)
                  </h2>
                  <button
                    type="button"
                    onClick={handleDownloadAllowlistCsv}
                    style={buttonSmall}
                    disabled={allowlistEntries.length === 0}
                  >
                    Download CSV
                  </button>
                </div>

                {/* --- Add area --- */}
                <h3 style={sectionSubheading}>Add allowlist entry</h3>
                <p
                  style={{
                    ...subtle,
                    opacity: 1,
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
                    marginBottom: 18,
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
                  <div
                    style={{
                      marginTop: 8,
                      overflowX: "auto",
                      position: "relative",
                      paddingBottom: 16,
                    }}
                  >
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
                        {allowlistEntries.map((e) => (
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
                                <option value="__ADD_NEW__">➕ Add new…</option>
                              </select>
                            </td>
                            <td style={tdActions}>
                              <div style={{ display: "flex", gap: 10 }}>
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ) : (
            // --- USERS TAB ---
            <section>
              <div
                style={{
                  ...sectionCard,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 0 }}>
                    Existing Users (users collection)
                  </h2>
                  <button
                    type="button"
                    onClick={handleDownloadUsersCsv}
                    style={buttonSmall}
                    disabled={userEntries.length === 0}
                  >
                    Download CSV
                  </button>
                </div>

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
                    <span
                      style={{
                        display: "inline-flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
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
                  <div
                    style={{
                      marginTop: 8,
                      overflowX: "auto",
                      position: "relative",
                      paddingBottom: 16,
                    }}
                  >
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={clickableTh} onClick={() => toggleUserSort("displayName")}>
                            Display Name{sortArrow("displayName")}
                          </th>

                          <th style={clickableTh} onClick={() => toggleUserSort("email")}>
                            Email{sortArrow("email")}
                          </th>

                          <th style={clickableTh} onClick={() => toggleUserSort("createdAt")}>
                            Created At{sortArrow("createdAt")}
                          </th>

                          <th style={clickableTh} onClick={() => toggleUserSort("source")}>
                            Source{sortArrow("source")}
                          </th>

                          {/* New: trial + usage columns */}
                          <th style={clickableTh} onClick={() => toggleUserSort("trialProvided")}>
                            Trial Provided{sortArrow("trialProvided")}
                          </th>

                          <th style={clickableTh} onClick={() => toggleUserSort("trialStatus")}>
                            Trial Status{sortArrow("trialStatus")}
                          </th>

                          <th style={clickableTh} onClick={() => toggleUserSort("trialEndsAt")}>
                            Trial Ends{sortArrow("trialEndsAt")}
                          </th>

                          <th style={clickableTh} onClick={() => toggleUserSort("updatedAt")}>
                            Last Active{sortArrow("updatedAt")}
                          </th>

                          {/* Not sortable key (derived), but we can still sort by updatedAt via Updated At column */}
                          <th style={th}>Days Since</th>

                          {/* Existing */}
                          <th style={th}>Tier</th>
                          <th style={th}>Squad</th>

                          {/* New: tierOverride moved near the end */}
                          <th style={clickableTh} onClick={() => toggleUserSort("tierOverride")}>
                            Tier Override{sortArrow("tierOverride")}
                          </th>

                          <th style={th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const effectiveTier: Tier = (u.tier || "free") as Tier;
                          const isFreeByMissingField = !u.tier;
                          const lastActiveAt = latestTimestamp(u.updatedAt, u.leaderboardUpdatedAt);

                          return (
                            <tr key={u.id}>
                              <td style={tdName}>{u.displayName || "—"}</td>

                              <td style={tdEmail}>
                                <div style={{ opacity: 0.8 }}>{u.email}</div>
                              </td>

                              <td style={tdCreatedAt}>{formatTimestamp(u.createdAt)}</td>

                              <td style={tdSource}>{u.source || "—"}</td>

                              {/* New columns */}
                              <td style={tdSource}>{u.trialProvided ? "yes" : "—"}</td>

                              <td style={tdSource}>{u.trialStatus || "—"}</td>

                              <td style={tdCreatedAt}>{formatTimestamp(u.trialEndsAt)}</td>

                              <td style={tdCreatedAt}>{formatTimestamp(lastActiveAt)}</td>
                              <td style={tdSource}>{daysSince(lastActiveAt)}</td>

                              {/* Existing Tier */}
                              <td style={tdTier}>
                                <select
                                  value={effectiveTier}
                                  onChange={(ev) => handleUserTierChange(u.id, ev.target.value as Tier)}
                                  style={getTierSelectStyle(effectiveTier)}
                                >
                                  <option value="free">
                                    Free{isFreeByMissingField ? " (no tier set)" : ""}
                                  </option>
                                  <option value="amateur">Amateur</option>
                                  <option value="pro">Pro</option>
                                </select>
                              </td>

                              {/* Existing Squad */}
                              <td style={tdSquad}>
                                <select
                                  value={u.squadID ?? ""}
                                  onChange={(ev) => handleUserSquadSelectChange(u.id, ev.target.value)}
                                  style={select}
                                >
                                  <option value="">None</option>
                                  {squadOptions.map((s) => (
                                    <option key={s.id} value={s.name}>
                                      {s.name}
                                    </option>
                                  ))}
                                  <option value="__ADD_NEW__">➕ Add new…</option>
                                </select>
                              </td>

                              {/* New: Tier Override display (read-only for now) */}
                              <td style={tdSource}>
                                <select
                                  value={u.tierOverride ?? ""}
                                  onChange={(ev) => {
                                    const v = ev.target.value;
                                    if (!v) {
                                      void clearUserTierOverride(u.id);
                                    } else {
                                      void setUserTierOverride(u.id, v as "pro" | "amateur");
                                    }
                                  }}
                                  style={select}
                                  disabled={u.source === "stripe"}
                                  title={
                                    u.source === "stripe"
                                      ? "Stripe users are controlled by webhooks (override disabled)."
                                      : ""
                                  }
                                >
                                  <option value="">—</option>
                                  <option value="pro">pro</option>
                                  <option value="amateur">amateur</option>
                                </select>
                              </td>

                              {/* Actions */}
                              <td style={tdActions}>
                                <div style={{ display: "flex", gap: 10 }}>
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
      border: "1px solid rgba(148,163,184,0.8)",
    };
  }
  if (tier === "amateur") {
    return {
      ...base,
      background: "rgba(59,130,246,0.18)",
      border: "1px solid rgba(59,130,246,0.9)",
    };
  }
  return {
    ...base,
    background: "rgba(34,197,94,0.18)",
    border: "1px solid rgba(34,197,94,0.9)",
  };
};

// --- minimal inline styles ---
const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0f172a",
  padding: 16,
};

const card: React.CSSProperties = {
  background: "#020617",
  color: "#e5e7eb",
  borderRadius: 16,
  padding: 24,
  maxWidth: 1600,
  width: "100%",
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
  margin: "0 auto 24px",
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
  width: "max-content",
  minWidth: "100%",
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
  position: "sticky",
  top: 0,
  background: "#020617",
  zIndex: 1,
};

const clickableTh: React.CSSProperties = {
  ...th,
  cursor: "pointer",
  userSelect: "none",
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

const tdCreatedAt: React.CSSProperties = {
  ...tdBase,
  whiteSpace: "nowrap",
  maxWidth: 170,
};

const tdSource: React.CSSProperties = {
  ...tdBase,
  whiteSpace: "nowrap",
  maxWidth: 140,
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
  minWidth: 100,
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