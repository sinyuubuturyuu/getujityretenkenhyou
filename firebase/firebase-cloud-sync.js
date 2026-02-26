// Firestore cloud autosave (additive patch, no UI changes)
(function () {
  "use strict";

  const PENDING_KEY = "tire.monthly.cloud.pending.v1";
  const DEVICE_ID_KEY = "tire.monthly.cloud.device.v1";
  const MAX_PENDING = 200;
  const SETTINGS_BACKUP_KIND = {
    VEHICLES: "vehicles",
    DRIVERS: "drivers",
    TRUCK_TYPES: "truckTypes"
  };
  const SETTINGS_BACKUP_SLOT = 1;

  const state = {
    options: null,
    getPayload: null,
    initialized: false,
    firebase: null,
    auth: null,
    db: null,
    uid: "anon",
    deviceId: null,
    readyPromise: null,
    flushTimer: null,
    saveTimer: null,
    flushing: false
  };

  function log(message, extra) {
    if (extra === undefined) {
      console.info("[FirebaseCloudSync]", message);
      return;
    }
    console.info("[FirebaseCloudSync]", message, extra);
  }

  function warn(message, extra) {
    if (extra === undefined) {
      console.warn("[FirebaseCloudSync]", message);
      return;
    }
    console.warn("[FirebaseCloudSync]", message, extra);
  }

  function safeReadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function safeWriteJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      warn("Failed to persist local retry queue", error);
    }
  }

  function deepClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function sanitizeId(value, fallback) {
    const text = String(value ?? "").trim();
    const safe = text.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!safe) return fallback;
    return safe.slice(0, 120);
  }

  function getOrCreateDeviceId() {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = (crypto && typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  }

  function getPendingQueue() {
    const rows = safeReadJson(PENDING_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function setPendingQueue(rows) {
    const normalized = Array.isArray(rows) ? rows.slice(0, MAX_PENDING) : [];
    safeWriteJson(PENDING_KEY, normalized);
  }

  function pushPending(entry) {
    const queue = getPendingQueue();
    queue.push(entry);
    if (queue.length > MAX_PENDING) queue.splice(0, queue.length - MAX_PENDING);
    setPendingQueue(queue);
  }

  function createScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.getElementsByTagName("script"))
        .find((node) => node.src === src);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Script load failed: ${src}`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Script load failed: ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureFirebaseSdk() {
    if (window.firebase && window.firebase.apps) return window.firebase;
    await createScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
    await createScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js");
    await createScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js");
    if (!window.firebase || !window.firebase.apps) {
      throw new Error("Failed to load Firebase SDK");
    }
    return window.firebase;
  }

  function currentMonthKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function parseMonthFromDateText(value) {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(value || "").trim());
    if (!match) return "";
    return `${match[1]}-${match[2]}`;
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function normalizeSettingsBackupKind(kind) {
    if (kind === SETTINGS_BACKUP_KIND.VEHICLES) return SETTINGS_BACKUP_KIND.VEHICLES;
    if (kind === SETTINGS_BACKUP_KIND.DRIVERS) return SETTINGS_BACKUP_KIND.DRIVERS;
    if (kind === SETTINGS_BACKUP_KIND.TRUCK_TYPES) return SETTINGS_BACKUP_KIND.TRUCK_TYPES;
    return "";
  }

  function normalizeSettingsBackupSlot(slot) {
    const num = Number(slot);
    if (!Number.isInteger(num)) return 0;
    return num === SETTINGS_BACKUP_SLOT ? SETTINGS_BACKUP_SLOT : 0;
  }

  function normalizeSettingsBackupValues(rows) {
    if (!Array.isArray(rows)) return [];
    const uniq = [];
    rows.forEach((item) => {
      const value = String(item ?? "").trim();
      if (!value) return;
      if (!uniq.includes(value)) uniq.push(value);
    });
    return uniq.slice(0, 300);
  }

  function toIsoOrEmpty(value) {
    if (!value) return "";
    if (typeof value === "string") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? "" : value.toISOString();
    }
    if (value && typeof value.toDate === "function") {
      const d = value.toDate();
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    }
    return "";
  }

  function toFirestoreReason(error, fallback) {
    const code = String(error && error.code ? error.code : "").toLowerCase();
    const message = String(error && error.message ? error.message : "").toLowerCase();
    const text = `${code} ${message}`;
    if (text.includes("permission-denied")) return "permission_denied";
    if (text.includes("unauthenticated")) return "unauthenticated";
    if (text.includes("failed-precondition")) return "failed_precondition";
    if (text.includes("unavailable") || text.includes("network")) return "offline";
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (offline) return "offline";
    return fallback;
  }

  function hashText(value) {
    // FNV-1a 32-bit hash (deterministic, compact id key)
    let hash = 0x811c9dc5;
    const text = String(value ?? "");
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function extractInspectionMonth(entry) {
    const inspectionDate = entry
      && entry.payload
      && entry.payload.current
      && entry.payload.current.inspectionDate;
    return parseMonthFromDateText(inspectionDate) || currentMonthKey();
  }

  function extractBasicInfo(entry) {
    const current = entry && entry.payload && entry.payload.current ? entry.payload.current : {};
    return {
      inspectionDate: normalizeText(current.inspectionDate),
      driverName: normalizeText(current.driverName),
      vehicleNumber: normalizeText(current.vehicleNumber),
      truckType: normalizeText(current.truckType)
    };
  }

  function buildBasicSignature(entry) {
    const basic = extractBasicInfo(entry);
    const raw = [basic.inspectionDate, basic.driverName, basic.vehicleNumber, basic.truckType].join("|");
    return hashText(raw);
  }

  function buildDocId(uid, monthKey, basicSignature, deviceId) {
    const prefix = sanitizeId(state.options.documentPrefix, "monthly_tire");
    const company = sanitizeId(state.options.companyCode, "company");
    const user = sanitizeId(uid, "anon");
    const device = sanitizeId(deviceId || state.deviceId, "device");
    const month = sanitizeId(monthKey, currentMonthKey());
    const basic = sanitizeId(basicSignature, "basic");
    return `${prefix}_${company}_${user}_${device}_${month}_${basic}`.slice(0, 200);
  }

  function getDocInfoForEntry(entry) {
    const month = extractInspectionMonth(entry);
    const uid = state.uid || "anon";
    const deviceId = state.deviceId || getOrCreateDeviceId();
    const basicInfo = extractBasicInfo(entry);
    const basicSignature = buildBasicSignature(entry);
    const docId = buildDocId(uid, month, basicSignature, deviceId);
    return { month, uid, deviceId, basicInfo, basicSignature, docId };
  }

  function getDocRefForEntry(entry) {
    if (!state.db) return null;
    const docInfo = getDocInfoForEntry(entry);
    return state.db.collection(state.options.collection).doc(docInfo.docId);
  }

  function buildSettingsBackupDocId(kind, slot) {
    const prefix = sanitizeId(state.options.documentPrefix, "monthly_tire");
    const company = sanitizeId(state.options.companyCode, "company");
    const safeKind = sanitizeId(kind, "settings");
    const safeSlot = sanitizeId(String(slot), "1");
    return `${prefix}_${company}_settings_backup_${safeKind}_slot${safeSlot}`.slice(0, 200);
  }

  function getSettingsBackupDocRef(kind, slot) {
    if (!state.db) return null;
    const collection = sanitizeId(state.options.settingsBackupCollection, "monthly_tire_settings_backup");
    return state.db.collection(collection).doc(buildSettingsBackupDocId(kind, slot));
  }

  async function ensureFirebaseReady() {
    if (!state.initialized || !state.options || !state.options.enabled) return false;
    if (state.db && state.deviceId) return true;
    if (state.readyPromise) return state.readyPromise;

    state.readyPromise = (async () => {
      const config = window.APP_FIREBASE_CONFIG || {};
      const required = ["apiKey", "authDomain", "projectId", "appId"];
      const missing = required.filter((key) => !String(config[key] || "").trim());
      if (missing.length > 0) {
        warn("Firebase config is missing. Update firebase/firebase-config.js", missing);
        return false;
      }

      state.firebase = await ensureFirebaseSdk();
      if (!state.firebase.apps.length) {
        state.firebase.initializeApp(config);
      }

      state.auth = state.firebase.auth();
      state.db = state.firebase.firestore();
      state.deviceId = getOrCreateDeviceId();

      if (state.options.useAnonymousAuth !== false) {
        try {
          if (!state.auth.currentUser) await state.auth.signInAnonymously();
        } catch (error) {
          warn("Anonymous auth failed. Check Firestore/Auth rules.", error);
        }
      }

      state.uid = (state.auth.currentUser && state.auth.currentUser.uid) || "anon";
      log("Firebase cloud sync enabled");
      return true;
    })().finally(() => {
      state.readyPromise = null;
    });

    return state.readyPromise;
  }

  function toDocData(entry) {
    const inspectionMonth = extractInspectionMonth(entry);
    const basicInfo = extractBasicInfo(entry);
    const basicSignature = buildBasicSignature(entry);
    return {
      companyCode: state.options.companyCode,
      deviceId: state.deviceId,
      inspectionMonth,
      basicInfo,
      basicSignature,
      lastSource: entry.source,
      clientUpdatedAt: entry.clientUpdatedAt,
      updatedAt: state.firebase.firestore.FieldValue.serverTimestamp(),
      state: entry.payload
    };
  }

  async function writeEntry(entry, options) {
    const allowLocalQueue = !options || options.allowLocalQueue !== false;
    const ready = await ensureFirebaseReady();
    const docRef = getDocRefForEntry(entry);
    if (!ready || !docRef) {
      if (allowLocalQueue) pushPending(entry);
      return { ok: false, reason: "firebase_unready", queued: allowLocalQueue };
    }
    try {
      log("Saving document", getDocInfoForEntry(entry));
      await docRef.set(toDocData(entry), { merge: true });
      return { ok: true, reason: "ok", queued: false };
    } catch (error) {
      if (allowLocalQueue) {
        warn("Firestore write failed, queued locally for retry", error);
        pushPending(entry);
      } else {
        warn("Firestore write failed (local queue disabled)", error);
      }
      return { ok: false, reason: toFirestoreReason(error, "write_failed"), queued: allowLocalQueue };
    }
  }

  function normalizeSettingsBackupDoc(kind, slot, data, metadataOnly) {
    if (!data || typeof data !== "object") return null;
    const values = normalizeSettingsBackupValues(data.values);
    const valueCount = Number(data.valueCount);
    return {
      kind: normalizeSettingsBackupKind(data.kind) || kind,
      slot: normalizeSettingsBackupSlot(data.slot) || slot,
      valueCount: Number.isFinite(valueCount) && valueCount >= 0 ? valueCount : values.length,
      values: metadataOnly ? [] : values,
      clientUpdatedAt: toIsoOrEmpty(data.clientUpdatedAt),
      serverUpdatedAt: toIsoOrEmpty(data.updatedAt)
    };
  }

  async function saveSettingsBackup(kind, slot, values, meta) {
    const normalizedKind = normalizeSettingsBackupKind(kind);
    const normalizedSlot = normalizeSettingsBackupSlot(slot);
    if (!normalizedKind || !normalizedSlot) {
      return { ok: false, reason: "invalid_target", backup: null };
    }
    const normalizedValues = normalizeSettingsBackupValues(values);
    if (!normalizedValues.length) {
      return { ok: false, reason: "empty_values", backup: null };
    }

    const ready = await ensureFirebaseReady();
    const docRef = getSettingsBackupDocRef(normalizedKind, normalizedSlot);
    if (!ready || !docRef || !state.firebase) {
      return { ok: false, reason: "firebase_unready", backup: null };
    }

    const nowIso = new Date().toISOString();
    const payload = {
      companyCode: state.options.companyCode,
      kind: normalizedKind,
      slot: normalizedSlot,
      values: normalizedValues,
      valueCount: normalizedValues.length,
      clientUpdatedAt: nowIso,
      updatedAt: state.firebase.firestore.FieldValue.serverTimestamp(),
      updatedByUid: state.uid || "anon",
      updatedByDeviceId: state.deviceId || "",
      meta: meta && typeof meta === "object" ? deepClone(meta) : {}
    };

    try {
      await docRef.set(payload, { merge: true });
      return {
        ok: true,
        reason: "ok",
        backup: {
          kind: normalizedKind,
          slot: normalizedSlot,
          valueCount: normalizedValues.length,
          values: normalizedValues,
          clientUpdatedAt: nowIso,
          serverUpdatedAt: ""
        }
      };
    } catch (error) {
      warn("Settings backup save failed", error);
      return { ok: false, reason: toFirestoreReason(error, "write_failed"), backup: null };
    }
  }

  async function loadSettingsBackup(kind, slot, options) {
    const metadataOnly = Boolean(options && options.metadataOnly === true);
    const normalizedKind = normalizeSettingsBackupKind(kind);
    const normalizedSlot = normalizeSettingsBackupSlot(slot);
    if (!normalizedKind || !normalizedSlot) {
      return { ok: false, reason: "invalid_target", backup: null };
    }

    const ready = await ensureFirebaseReady();
    const docRef = getSettingsBackupDocRef(normalizedKind, normalizedSlot);
    if (!ready || !docRef) {
      return { ok: false, reason: "firebase_unready", backup: null };
    }

    try {
      const snap = await docRef.get();
      if (!snap.exists) {
        return { ok: false, reason: "not_found", backup: null };
      }
      const backup = normalizeSettingsBackupDoc(normalizedKind, normalizedSlot, snap.data(), metadataOnly);
      if (!backup) {
        return { ok: false, reason: "invalid_data", backup: null };
      }
      return { ok: true, reason: "ok", backup };
    } catch (error) {
      warn("Settings backup load failed", error);
      return { ok: false, reason: toFirestoreReason(error, "read_failed"), backup: null };
    }
  }

  async function listSettingsBackups(kind) {
    const normalizedKind = normalizeSettingsBackupKind(kind);
    if (!normalizedKind) {
      return { ok: false, reason: "invalid_target", backups: [] };
    }
    const result = await loadSettingsBackup(normalizedKind, SETTINGS_BACKUP_SLOT, { metadataOnly: true });
    if (!result.ok && result.reason !== "not_found") {
      return { ok: false, reason: result.reason || "read_failed", backups: [] };
    }
    const backup = result.ok ? result.backup : null;
    return {
      ok: true,
      reason: "ok",
      backups: [backup]
    };
  }

  async function deleteSettingsBackup(kind, slot) {
    const normalizedKind = normalizeSettingsBackupKind(kind);
    const normalizedSlot = normalizeSettingsBackupSlot(slot);
    if (!normalizedKind || !normalizedSlot) {
      return { ok: false, reason: "invalid_target" };
    }

    const ready = await ensureFirebaseReady();
    const docRef = getSettingsBackupDocRef(normalizedKind, normalizedSlot);
    if (!ready || !docRef) {
      return { ok: false, reason: "firebase_unready" };
    }

    try {
      const snap = await docRef.get();
      if (!snap.exists) {
        return { ok: false, reason: "not_found" };
      }
      await docRef.delete();
      return { ok: true, reason: "ok" };
    } catch (error) {
      warn("Settings backup delete failed", error);
      return { ok: false, reason: toFirestoreReason(error, "delete_failed") };
    }
  }

  async function flushPending() {
    if (state.flushing) return;
    state.flushing = true;
    try {
      const ready = await ensureFirebaseReady();
      if (!ready) return;
      const queue = getPendingQueue();
      if (!queue.length) return;
      const remain = [];
      for (const item of queue) {
        try {
          const docRef = getDocRefForEntry(item);
          if (!docRef) {
            remain.push(item);
            continue;
          }
          await docRef.set(toDocData(item), { merge: true });
        } catch (error) {
          warn("Retry sync failed, entry kept in local queue", error);
          remain.push(item);
        }
      }
      setPendingQueue(remain);
    } finally {
      state.flushing = false;
    }
  }

  function schedule(source) {
    if (!state.initialized || !state.options || !state.options.enabled) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      void saveNow(source || "input");
    }, 700);
  }

  async function saveNow(source, options) {
    const result = await saveNowDetailed(source, options);
    return result.ok;
  }

  async function saveNowDetailed(source, options) {
    if (!state.initialized || !state.options || !state.options.enabled) {
      return { ok: false, reason: "disabled", queued: false };
    }
    if (typeof state.getPayload !== "function") {
      return { ok: false, reason: "payload_missing", queued: false };
    }
    const payload = deepClone(state.getPayload());
    const entry = {
      source: source || "manual",
      clientUpdatedAt: new Date().toISOString(),
      payload
    };
    const result = await writeEntry(entry, options || {});
    if (result.ok) void flushPending();
    return result;
  }

  function bindRetryEvents() {
    window.addEventListener("online", () => {
      void flushPending();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      void flushPending();
    });
  }

  async function init(params) {
    state.options = Object.assign({
      enabled: false,
      collection: "monthly_tire_autosave",
      settingsBackupCollection: "monthly_tire_settings_backup",
      documentPrefix: "monthly_tire",
      companyCode: "company",
      useAnonymousAuth: true,
      autoFlushIntervalMs: 15000
    }, window.APP_FIREBASE_SYNC_OPTIONS || {});

    state.getPayload = params && typeof params.getPayload === "function" ? params.getPayload : null;
    state.initialized = true;

    if (!state.options.enabled) {
      log("Firebase cloud sync disabled (enabled=false in firebase-config.js)");
      return false;
    }
    if (typeof state.getPayload !== "function") {
      warn("Cloud sync not started: getPayload callback is missing");
      return false;
    }

    bindRetryEvents();
    clearInterval(state.flushTimer);
    state.flushTimer = setInterval(() => {
      void flushPending();
    }, Math.max(5000, Number(state.options.autoFlushIntervalMs) || 15000));

    await ensureFirebaseReady();
    void flushPending();
    return true;
  }

  window.FirebaseCloudSync = {
    init,
    schedule,
    saveNow,
    saveNowDetailed,
    saveSettingsBackup,
    loadSettingsBackup,
    listSettingsBackups,
    deleteSettingsBackup,
    clearPendingQueue: () => setPendingQueue([]),
    previewDocInfo: () => {
      if (typeof state.getPayload !== "function") return null;
      const payload = deepClone(state.getPayload());
      const entry = {
        source: "preview",
        clientUpdatedAt: new Date().toISOString(),
        payload
      };
      return getDocInfoForEntry(entry);
    },
    flushNow: () => flushPending(),
    isEnabled: () => Boolean(state.options && state.options.enabled)
  };
})();
