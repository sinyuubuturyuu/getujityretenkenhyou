    (() => {
      "use strict";

      const STORAGE = {
        current: "tire.monthly.current.v1",
        previous: "tire.monthly.previous.v1",
        vehicles: "tire.monthly.vehicles.v1",
        drivers: "tire.monthly.drivers.v1",
        truckTypes: "tire.monthly.trucktypes.v1",
        theme: "tire.monthly.theme.v1"
      };
      const SETTINGS_BACKUP_KIND = Object.freeze({
        VEHICLES: "vehicles",
        DRIVERS: "drivers"
      });
      const SETTINGS_BACKUP_SLOT = 1;
      const LAST_COMMIT_PUSHED_AT = "2026-03-01 21:33";
      const GITHUB_REPO_API_LATEST_COMMIT = "https://api.github.com/repos/sinyuubuturyuu/getujityretenkenhyou/commits?sha=main&per_page=1";

      const TRUCK_TYPES = {
        LOW12: "low12",
        TEN10: "ten10",
        FOURTON6: "fourton6"
      };
      const TRUCK_TYPE_CATALOG = [
        { value: TRUCK_TYPES.LOW12, label: "大型低床" },
        { value: TRUCK_TYPES.TEN10, label: "大型10輪" },
        { value: TRUCK_TYPES.FOURTON6, label: "４トン車" }
      ];
      const FLOW_SCREENS = {
        BASIC: "basic",
        TRUCK: "truck",
        EXPORT: "export",
        SETTINGS: "settings"
      };

      const DISPLAY_MAP_12 = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];
      const DISPLAY_MAP_10 = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
      const DISPLAY_MAP_6 = ["①", "②", "③", "④", "⑤", "⑥"];
      const ALL_IDS = Array.from({ length: 12 }, (_, i) => i + 1);
      const TIRE_NUMBERING_VERSION = 3;
      const LOW12_OLD_TO_NEW_ID_MAP = Object.freeze({
        1: 1,
        2: 3,
        3: 5,
        4: 6,
        5: 9,
        6: 10,
        7: 2,
        8: 4,
        9: 7,
        10: 8,
        11: 11,
        12: 12
      });
      const TEN10_OLD_TO_NEW_ID_MAP = Object.freeze({
        1: 1,
        2: 3,
        3: 4,
        4: 7,
        5: 8,
        6: 2,
        7: 5,
        8: 6,
        9: 9,
        10: 10
      });
      const FOURTON6_OLD_TO_NEW_ID_MAP = Object.freeze({
        1: 1,
        2: 3,
        3: 4,
        4: 2,
        5: 5,
        6: 6
      });

      const TRUCK_LAYOUTS = {
        [TRUCK_TYPES.LOW12]: {
          left: [[1], [3], [5, 6], [9, 10]],
          right: [[2], [4], [7, 8], [11, 12]],
          axes: ["前輪", "2軸", "3軸", "4軸"]
        },
        [TRUCK_TYPES.TEN10]: {
          left: [[1], [3, 4], [7, 8]],
          right: [[2], [5, 6], [9, 10]],
          axes: ["前輪", "2軸", "3軸"]
        },
        [TRUCK_TYPES.FOURTON6]: {
          left: [[1], [3, 4]],
          right: [[2], [5, 6]],
          axes: ["前輪", "2軸"]
        }
      };

      const NORMAL_FIELDS = [
        { key: "maker", label: "メーカー", options: ["ミシュラン", "サイルン", "チャオヤン", "トーヨー", "ジンユー", "ブリヂストン", "ダンロップ", "ヨコハマ"] },
        { key: "type", label: "種類", options: ["ノーマル", "スタッドレス", "再生", "リグ"] },
        { key: "groove", label: "溝", options: ["○", "△", "✕"] },
        { key: "wear", label: "偏摩耗", options: ["○", "△", "✕"] },
        { key: "damage", label: "キズ", options: ["○", "✕"] },
        { key: "pressure", label: "空気圧", options: ["○", "✕"] }
      ];

      const SPARE_FIELDS = [
        { key: "maker", label: "メーカー", options: ["ミシュラン", "サイルン", "チャオヤン", "トーヨー", "ジンユー", "ブリヂストン", "ダンロップ", "ヨコハマ"] },
        { key: "type", label: "種類", options: ["ノーマル", "スタッドレス", "再生", "リグ"] },
        { key: "condition", label: "状態", options: ["○", "△", "✕"] }
      ];

      const el = {
        basicScreen: document.getElementById("basicScreen"),
        truckScreen: document.getElementById("truckScreen"),
        exportScreen: document.getElementById("exportScreen"),
        settingsScreen: document.getElementById("settingsScreen"),
        inspectionDate: document.getElementById("inspectionDate"),
        driverNameDisplay: document.getElementById("driverNameDisplay"),
        vehicleNumberDisplay: document.getElementById("vehicleNumberDisplay"),
        truckTypeDisplay: document.getElementById("truckTypeDisplay"),
        basicNextBtn: document.getElementById("basicNextBtn"),
        leftTires: document.getElementById("leftTires"),
        rightTires: document.getElementById("rightTires"),
        truckAxes: document.getElementById("truckAxes"),
        spareButton: document.getElementById("spareButton"),
        truckBackBtn: document.getElementById("truckBackBtn"),
        truckToExportBtn: document.getElementById("truckToExportBtn"),
        exportCsvBtn: document.getElementById("exportCsvBtn"),
        exportBackBtn: document.getElementById("exportBackBtn"),
        quickResetBtn: document.getElementById("quickResetBtn"),
        openSettingsBtn: document.getElementById("openSettingsBtn"),
        exportSummary: document.getElementById("exportSummary"),
        reportNote: document.getElementById("reportNote"),
        inputDialog: document.getElementById("inputDialog"),
        dialogTarget: document.getElementById("dialogTarget"),
        dialogCloseBtn: document.getElementById("dialogCloseBtn"),
        stepFieldList: document.getElementById("stepFieldList"),
        closeStepBtn: document.getElementById("closeStepBtn"),
        inputWarning: document.getElementById("inputWarning"),
        closeSettingsBtn: document.getElementById("closeSettingsBtn"),
        sendConfirmDialog: document.getElementById("sendConfirmDialog"),
        sendFixBtn: document.getElementById("sendFixBtn"),
        sendSubmitBtn: document.getElementById("sendSubmitBtn"),
        sendFarewell: document.getElementById("sendFarewell"),
        sendFarewellImage: document.getElementById("sendFarewellImage"),
        themeMode: document.getElementById("themeMode"),
        settingsUpdatedAt: document.getElementById("settingsUpdatedAt"),
        newVehicleNumber: document.getElementById("newVehicleNumber"),
        addVehicleBtn: document.getElementById("addVehicleBtn"),
        saveVehicleBackupBtn: document.getElementById("saveVehicleBackupBtn"),
        restoreVehicleBackupBtn: document.getElementById("restoreVehicleBackupBtn"),
        deleteVehicleBackupBtn: document.getElementById("deleteVehicleBackupBtn"),
        vehicleBackupStatus: document.getElementById("vehicleBackupStatus"),
        vehicleList: document.getElementById("vehicleList"),
        newDriverName: document.getElementById("newDriverName"),
        newDriverReading: document.getElementById("newDriverReading"),
        addDriverBtn: document.getElementById("addDriverBtn"),
        saveDriverBackupBtn: document.getElementById("saveDriverBackupBtn"),
        restoreDriverBackupBtn: document.getElementById("restoreDriverBackupBtn"),
        deleteDriverBackupBtn: document.getElementById("deleteDriverBackupBtn"),
        driverBackupStatus: document.getElementById("driverBackupStatus"),
        driverList: document.getElementById("driverList"),
        newTruckType: document.getElementById("newTruckType"),
        addTruckTypeBtn: document.getElementById("addTruckTypeBtn"),
        truckTypeList: document.getElementById("truckTypeList"),
        toast: document.getElementById("toast")
      };

      const today = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const formatDateTimeMinute = (value) => {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${y}-${m}-${day} ${hh}:${mm}`;
      };
      const normalizeTruckType = (type) => {
        if (type === TRUCK_TYPES.TEN10) return TRUCK_TYPES.TEN10;
        if (type === TRUCK_TYPES.FOURTON6) return TRUCK_TYPES.FOURTON6;
        return TRUCK_TYPES.LOW12;
      };
      const truckTypeLabel = (type) => {
        const found = TRUCK_TYPE_CATALOG.find((item) => item.value === type);
        return found ? found.label : truckTypeLabel(normalizeTruckType(type));
      };
      const sortTruckTypes = (rows) => TRUCK_TYPE_CATALOG.map((item) => item.value).filter((value) => rows.includes(value));
      const getLayout = (type) => TRUCK_LAYOUTS[normalizeTruckType(type)];
      const getActiveIds = (type) => {
        const layout = getLayout(type);
        return layout.left.concat(layout.right).flat();
      };
      const displayMapFor = (type) => {
        const normalized = normalizeTruckType(type);
        if (normalized === TRUCK_TYPES.TEN10) return DISPLAY_MAP_10;
        if (normalized === TRUCK_TYPES.FOURTON6) return DISPLAY_MAP_6;
        return DISPLAY_MAP_12;
      };
      const circle = (id, type = TRUCK_TYPES.LOW12) => displayMapFor(type)[id - 1] || String(id);

      const newTire = () => ({ maker: "", type: "", groove: "", wear: "", damage: "", pressure: "" });
      const newSpare = () => ({ maker: "", type: "", condition: "" });
      const migrateLow12TiresToCurrentNumbering = (sourceTires) => {
        const migrated = Object.fromEntries(ALL_IDS.map((id) => [id, newTire()]));
        ALL_IDS.forEach((oldId) => {
          const newId = LOW12_OLD_TO_NEW_ID_MAP[oldId] || oldId;
          migrated[newId] = { ...newTire(), ...(sourceTires && sourceTires[oldId] ? sourceTires[oldId] : {}) };
        });
        return migrated;
      };
      const migrateTiresByMap = (sourceTires, idMap) => {
        const migrated = Object.fromEntries(ALL_IDS.map((id) => [id, newTire()]));
        ALL_IDS.forEach((oldId) => {
          const newId = idMap[oldId] || oldId;
          migrated[newId] = { ...newTire(), ...(sourceTires && sourceTires[oldId] ? sourceTires[oldId] : {}) };
        });
        return migrated;
      };
      const defaultCurrent = () => ({
        tireNumberingVersion: TIRE_NUMBERING_VERSION,
        truckType: TRUCK_TYPES.LOW12,
        inspectionDate: today(),
        driverName: "",
        vehicleNumber: "",
        reportNote: "",
        tires: Object.fromEntries(ALL_IDS.map((id) => [id, newTire()])),
        spare: newSpare(),
        updatedAt: new Date().toISOString()
      });

      const read = (key, fallback) => {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : fallback;
        } catch {
          return fallback;
        }
      };
      const normalizeCurrent = (obj) => {
        const base = defaultCurrent();
        const curr = {
          ...base,
          ...(obj || {}),
          truckType: normalizeTruckType(obj && obj.truckType),
          tires: base.tires,
          spare: { ...base.spare, ...(obj && obj.spare ? obj.spare : {}) }
        };
        ALL_IDS.forEach((id) => {
          curr.tires[id] = { ...newTire(), ...(obj && obj.tires && obj.tires[id] ? obj.tires[id] : {}) };
        });
        const sourceVersionValue = Number(obj && obj.tireNumberingVersion);
        const sourceVersion = Number.isFinite(sourceVersionValue) ? sourceVersionValue : 1;
        if (curr.truckType === TRUCK_TYPES.LOW12 && sourceVersion < 2) {
          curr.tires = migrateLow12TiresToCurrentNumbering(curr.tires);
        }
        if (curr.truckType === TRUCK_TYPES.TEN10 && sourceVersion < 3) {
          curr.tires = migrateTiresByMap(curr.tires, TEN10_OLD_TO_NEW_ID_MAP);
        }
        if (curr.truckType === TRUCK_TYPES.FOURTON6 && sourceVersion < 3) {
          curr.tires = migrateTiresByMap(curr.tires, FOURTON6_OLD_TO_NEW_ID_MAP);
        }
        curr.tireNumberingVersion = TIRE_NUMBERING_VERSION;
        curr.driverName = typeof curr.driverName === "string" ? curr.driverName : "";
        curr.reportNote = typeof curr.reportNote === "string" ? curr.reportNote : "";
        if (!curr.inspectionDate) curr.inspectionDate = today();
        if (!curr.updatedAt) curr.updatedAt = new Date().toISOString();
        return curr;
      };
      const normalizePrevious = (obj) => {
        if (!obj || typeof obj !== "object") return null;
        return normalizeCurrent(obj);
      };
      const basicSignatureOf = (obj) => {
        const source = obj && typeof obj === "object" ? obj : {};
        return [
          String(source.driverName ?? "").trim(),
          String(source.vehicleNumber ?? "").trim(),
          String(source.truckType ?? "").trim()
        ].join("|");
      };
      const monthKeyFromDateText = (value) => {
        const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(value || "").trim());
        if (!match) return "";
        return `${match[1]}-${match[2]}`;
      };
      const previousMonthKey = (monthKey) => {
        const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || "").trim());
        if (!match) return "";
        const year = Number(match[1]);
        const month = Number(match[2]);
        if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return "";
        const d = new Date(Date.UTC(year, month - 1, 1));
        d.setUTCMonth(d.getUTCMonth() - 1);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      };
      const isWithinPreviousMonthWindow = (candidate, base) => {
        const baseMonth = monthKeyFromDateText(base && base.inspectionDate);
        const candidateMonth = monthKeyFromDateText(candidate && candidate.inspectionDate);
        if (!baseMonth || !candidateMonth) return false;
        if (candidateMonth === baseMonth) return true;
        return candidateMonth === previousMonthKey(baseMonth);
      };
      const hasCompleteBasicInfo = (obj) => {
        const source = obj && typeof obj === "object" ? obj : {};
        return Boolean(
          String(source.inspectionDate ?? "").trim()
          && String(source.driverName ?? "").trim()
          && String(source.vehicleNumber ?? "").trim()
          && String(source.truckType ?? "").trim()
        );
      };

      const normalizeVehicles = (rows) => {
        if (!Array.isArray(rows)) return [];
        const uniq = [];
        rows.forEach((item) => {
          const value = String(item ?? "").trim();
          if (!value) return;
          if (!uniq.includes(value)) uniq.push(value);
        });
        return uniq.slice(0, 300);
      };
      const JA_COLLATOR = new Intl.Collator("ja", {
        usage: "sort",
        sensitivity: "base",
        numeric: true,
        ignorePunctuation: true
      });
      const KATAKANA_RE = /[\u30A1-\u30F6]/g;
      const DRIVER_WITH_READING_RE = /^(.*?)[\s　]*[（(]([^（）()]+)[）)]$/;
      const toHiragana = (value) => String(value ?? "")
        .normalize("NFKC")
        .replace(KATAKANA_RE, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
      const parseDriverEntry = (value) => {
        const raw = String(value ?? "").trim();
        if (!raw) return { name: "", reading: "" };
        const match = raw.match(DRIVER_WITH_READING_RE);
        if (!match) return { name: raw, reading: "" };
        const name = String(match[1] ?? "").trim();
        const reading = String(match[2] ?? "").trim();
        if (!name || !reading) return { name: raw, reading: "" };
        return { name, reading };
      };
      const normalizeDriverName = (value) => parseDriverEntry(value).name;
      const normalizeDriverReading = (value) => toHiragana(value).replace(/\s+/g, "").trim();
      const normalizeDriverEntry = (value) => {
        const parsed = parseDriverEntry(value);
        if (!parsed.name) return "";
        if (!parsed.reading) return parsed.name;
        return `${parsed.name}（${normalizeDriverReading(parsed.reading)}）`;
      };
      const driverSortKey = (value) => {
        const parsed = parseDriverEntry(value);
        const source = parsed.reading || parsed.name;
        return normalizeDriverReading(source);
      };
      const normalizeDrivers = (rows) => normalizeVehicles(
        Array.isArray(rows) ? rows.map((item) => normalizeDriverEntry(item)) : []
      ).sort((a, b) => {
        const keyCompare = JA_COLLATOR.compare(driverSortKey(a), driverSortKey(b));
        if (keyCompare !== 0) return keyCompare;
        return JA_COLLATOR.compare(normalizeDriverName(a), normalizeDriverName(b));
      });
      const isSameStringArray = (a, b) => (
        Array.isArray(a)
        && Array.isArray(b)
        && a.length === b.length
        && a.every((value, index) => value === b[index])
      );
      const normalizeTruckTypes = (rows) => {
        if (!Array.isArray(rows)) return sortTruckTypes(TRUCK_TYPE_CATALOG.map((item) => item.value));
        const uniq = [];
        rows.forEach((item) => {
          if (!TRUCK_TYPE_CATALOG.some((type) => type.value === item)) return;
          if (!uniq.includes(item)) uniq.push(item);
        });
        const sorted = sortTruckTypes(uniq);
        return sorted.length > 0 ? sorted : sortTruckTypes(TRUCK_TYPE_CATALOG.map((item) => item.value));
      };
      const emptyBackupMeta = () => ({
        [SETTINGS_BACKUP_KIND.VEHICLES]: null,
        [SETTINGS_BACKUP_KIND.DRIVERS]: null
      });

      let current = normalizeCurrent(read(STORAGE.current, defaultCurrent()));
      let previous = normalizePrevious(read(STORAGE.previous, null));
      let vehicles = normalizeVehicles(read(STORAGE.vehicles, []));
      let drivers = normalizeDrivers(read(STORAGE.drivers, []));
      let truckTypes = normalizeTruckTypes(read(STORAGE.truckTypes, TRUCK_TYPE_CATALOG.map((item) => item.value)));
      const firstDriverName = () => drivers.length > 0 ? normalizeDriverName(drivers[0]) : "";
      const findDriverIndexByName = (name) => {
        const target = String(name ?? "").trim();
        if (!target) return -1;
        return drivers.findIndex((entry) => normalizeDriverName(entry) === target);
      };
      const hasDriverName = (name) => findDriverIndexByName(name) >= 0;
      let settingsBackupMeta = emptyBackupMeta();
      let settingsBackupLoading = false;
      let settingsBackupWorking = false;
      let latestCommitPushedAt = LAST_COMMIT_PUSHED_AT;
      let latestCommitFetchedAtMs = 0;
      let latestCommitFetchPromise = null;
      let previousLookupToken = 0;
      let tireButtons = {};
      let dialog = { target: null, fields: [], step: 0 };
      let currentScreen = FLOW_SCREENS.BASIC;
      let screenBeforeSettings = FLOW_SCREENS.BASIC;
      const SHARE_REASONS = { OK: "ok", CANCEL: "cancel", UNSUPPORTED: "unsupported", ERROR: "error" };
      const CLOUD_SYNC_ON_SUBMIT_ONLY = true;
      const buildCloudPayload = (source = "input") => ({
        source,
        savedAt: new Date().toISOString(),
        current: normalizeCurrent(current),
        previous: previous ? normalizeCurrent(previous) : null,
        vehicles: vehicles.slice(),
        drivers: drivers.slice(),
        truckTypes: truckTypes.slice()
      });
      const scheduleCloudSync = (source = "input") => {
        if (CLOUD_SYNC_ON_SUBMIT_ONLY) return;
        if (!window.FirebaseCloudSync || typeof window.FirebaseCloudSync.schedule !== "function") return;
        window.FirebaseCloudSync.schedule(source);
      };

      const saveCurrent = () => {
        current.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE.current, JSON.stringify(current));
        scheduleCloudSync("input");
      };
      const savePrevious = () => {
        if (!previous) {
          localStorage.removeItem(STORAGE.previous);
          scheduleCloudSync("previous");
          return;
        }
        localStorage.setItem(STORAGE.previous, JSON.stringify(previous));
        scheduleCloudSync("previous");
      };
      const saveVehicles = () => {
        localStorage.setItem(STORAGE.vehicles, JSON.stringify(vehicles));
        scheduleCloudSync("master");
      };
      const saveDrivers = () => {
        drivers = normalizeDrivers(drivers);
        localStorage.setItem(STORAGE.drivers, JSON.stringify(drivers));
        scheduleCloudSync("master");
      };
      const saveTruckTypes = () => {
        localStorage.setItem(STORAGE.truckTypes, JSON.stringify(truckTypes));
        scheduleCloudSync("master");
      };

      function cleanupLegacyExportDirectoryStorage() {
        localStorage.removeItem("tire.monthly.export.dirname.v1");
        if (!("indexedDB" in window)) return;
        try {
          indexedDB.deleteDatabase("tire.monthly.fs.v1");
        } catch {
          // noop
        }
      }

      current.driverName = normalizeDriverName(current.driverName);
      if (current.vehicleNumber && !vehicles.includes(current.vehicleNumber)) {
        vehicles.unshift(current.vehicleNumber);
        saveVehicles();
      }
      if (current.driverName && !hasDriverName(current.driverName)) {
        drivers = normalizeDrivers(drivers.concat(current.driverName));
        saveDrivers();
      }
      if (!truckTypes.includes(current.truckType)) {
        current.truckType = truckTypes[0] || TRUCK_TYPES.LOW12;
        saveCurrent();
      }

      const fillCount = (obj, fields) => fields.reduce((sum, f) => sum + (obj[f.key] ? 1 : 0), 0);
      const totalCount = () => getActiveIds(current.truckType).reduce((sum, id) => sum + fillCount(current.tires[id], NORMAL_FIELDS), 0) + fillCount(current.spare, SPARE_FIELDS);
      const percent = () => {
        const totalFields = getActiveIds(current.truckType).length * NORMAL_FIELDS.length + SPARE_FIELDS.length;
        return Math.round((totalCount() / totalFields) * 100);
      };

      const tireClass = (id) => {
        const c = fillCount(current.tires[id], NORMAL_FIELDS);
        if (c === 0) return "";
        if (c === NORMAL_FIELDS.length) return "done";
        return "partial";
      };
      const spareClass = () => {
        const c = fillCount(current.spare, SPARE_FIELDS);
        if (c === 0) return "";
        if (c === SPARE_FIELDS.length) return "done";
        return "partial";
      };

      const text = (v) => v || "未入力";

      function renderScreens() {
        const basic = currentScreen === FLOW_SCREENS.BASIC;
        const truck = currentScreen === FLOW_SCREENS.TRUCK;
        const exp = currentScreen === FLOW_SCREENS.EXPORT;
        const settings = currentScreen === FLOW_SCREENS.SETTINGS;

        el.basicScreen.classList.toggle("active", basic);
        el.truckScreen.classList.toggle("active", truck);
        el.exportScreen.classList.toggle("active", exp);
        el.settingsScreen.classList.toggle("active", settings);
        document.body.classList.toggle("screen-truck", truck);
        document.body.classList.toggle("screen-export", exp);
        document.body.classList.toggle("screen-settings", settings);
      }

      function renderExportSummary() {
        el.exportSummary.textContent = "";
        el.exportSummary.style.display = "none";
      }

      function renderReportNote() {
        const note = current.reportNote || "";
        if (el.reportNote.value !== note) el.reportNote.value = note;
      }

      function renderButtons() {
        getActiveIds(current.truckType).forEach((id) => {
          if (!tireButtons[id]) return;
          tireButtons[id].className = `tire ${tireClass(id)}`.trim();
        });
        el.spareButton.className = `tire ${spareClass()}`.trim();
      }

      function renderBasicInfoDisplay() {
        const driverName = normalizeDriverName(current.driverName);
        const vehicleNumber = String(current.vehicleNumber || "").trim();
        const truckType = truckTypes.includes(current.truckType) ? current.truckType : "";

        el.driverNameDisplay.textContent = driverName || "未選択";
        el.driverNameDisplay.classList.toggle("placeholder", !driverName);
        el.vehicleNumberDisplay.textContent = vehicleNumber || "未選択";
        el.vehicleNumberDisplay.classList.toggle("placeholder", !vehicleNumber);
        el.truckTypeDisplay.textContent = truckType ? truckTypeLabel(truckType) : "未選択";
        el.truckTypeDisplay.classList.toggle("placeholder", !truckType);
      }

      function renderVehicleList() {
        el.vehicleList.innerHTML = "";
        if (vehicles.length === 0) {
          el.vehicleList.innerHTML = '<div class="empty">登録済み車両番号はありません。</div>';
          return;
        }

        vehicles.forEach((vehicle) => {
          const row = document.createElement("div");
          row.className = "vehicle-item";

          const label = document.createElement("span");
          label.textContent = vehicle;

          const actions = document.createElement("div");
          actions.className = "vehicle-item-actions";

          const show = document.createElement("button");
          show.type = "button";
          show.className = `mini-btn show-btn${current.vehicleNumber === vehicle ? " active" : ""}`;
          show.textContent = "決定";
          show.dataset.vehicle = vehicle;
          show.dataset.action = "show";
          show.setAttribute("aria-pressed", current.vehicleNumber === vehicle ? "true" : "false");

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "mini-btn";
          remove.textContent = "削除";
          remove.dataset.vehicle = vehicle;
          remove.dataset.action = "remove";

          row.appendChild(label);
          actions.appendChild(show);
          actions.appendChild(remove);
          row.appendChild(actions);
          el.vehicleList.appendChild(row);
        });
      }

      function renderDriverList() {
        const orderedDrivers = normalizeDrivers(drivers);
        if (!isSameStringArray(drivers, orderedDrivers)) {
          drivers = orderedDrivers;
          saveDrivers();
        }

        el.driverList.innerHTML = "";
        if (orderedDrivers.length === 0) {
          el.driverList.innerHTML = '<div class="empty">登録済み乗務員はありません。</div>';
          return;
        }

        orderedDrivers.forEach((driver) => {
          const driverName = normalizeDriverName(driver);
          const row = document.createElement("div");
          row.className = "vehicle-item";

          const label = document.createElement("span");
          label.textContent = driverName;

          const actions = document.createElement("div");
          actions.className = "vehicle-item-actions";

          const show = document.createElement("button");
          show.type = "button";
          show.className = `mini-btn show-btn${current.driverName === driverName ? " active" : ""}`;
          show.textContent = "決定";
          show.dataset.driver = driver;
          show.dataset.action = "show";
          show.setAttribute("aria-pressed", current.driverName === driverName ? "true" : "false");

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "mini-btn";
          remove.textContent = "削除";
          remove.dataset.driver = driver;
          remove.dataset.action = "remove";

          row.appendChild(label);
          actions.appendChild(show);
          actions.appendChild(remove);
          row.appendChild(actions);
          el.driverList.appendChild(row);
        });
      }

      function renderTruckTypeCatalogSelect() {
        const options = TRUCK_TYPE_CATALOG.filter((item) => !truckTypes.includes(item.value));
        el.newTruckType.innerHTML = "";
        if (options.length === 0) {
          el.newTruckType.appendChild(new Option("登録可能な車種はありません", ""));
          el.newTruckType.value = "";
          el.addTruckTypeBtn.disabled = true;
          return;
        }
        el.newTruckType.appendChild(new Option("選択してください", ""));
        options.forEach((item) => {
          el.newTruckType.appendChild(new Option(item.label, item.value));
        });
        el.newTruckType.value = "";
        el.addTruckTypeBtn.disabled = false;
      }

      function renderTruckTypeList() {
        el.truckTypeList.innerHTML = "";
        if (truckTypes.length === 0) {
          el.truckTypeList.innerHTML = '<div class="empty">登録済み車種はありません。</div>';
          return;
        }
        truckTypes.forEach((truckType) => {
          const row = document.createElement("div");
          row.className = "vehicle-item";

          const label = document.createElement("span");
          label.textContent = truckTypeLabel(truckType);

          const actions = document.createElement("div");
          actions.className = "vehicle-item-actions";

          const show = document.createElement("button");
          show.type = "button";
          show.className = `mini-btn show-btn${current.truckType === truckType ? " active" : ""}`;
          show.textContent = "決定";
          show.dataset.truckType = truckType;
          show.dataset.action = "show";
          show.setAttribute("aria-pressed", current.truckType === truckType ? "true" : "false");

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "mini-btn";
          remove.textContent = "削除";
          remove.dataset.truckType = truckType;
          remove.dataset.action = "remove";

          row.appendChild(label);
          actions.appendChild(show);
          actions.appendChild(remove);
          row.appendChild(actions);
          el.truckTypeList.appendChild(row);
        });
      }

      function normalizeBackupKind(kind) {
        if (kind === SETTINGS_BACKUP_KIND.VEHICLES) return SETTINGS_BACKUP_KIND.VEHICLES;
        if (kind === SETTINGS_BACKUP_KIND.DRIVERS) return SETTINGS_BACKUP_KIND.DRIVERS;
        return "";
      }

      function backupKindLabel(kind) {
        if (kind === SETTINGS_BACKUP_KIND.VEHICLES) return "車両番号";
        if (kind === SETTINGS_BACKUP_KIND.DRIVERS) return "乗務員";
        return "";
      }

      function hasSettingsBackupApi() {
        if (!window.FirebaseCloudSync) return false;
        if (typeof window.FirebaseCloudSync.saveSettingsBackup !== "function") return false;
        if (typeof window.FirebaseCloudSync.loadSettingsBackup !== "function") return false;
        if (typeof window.FirebaseCloudSync.deleteSettingsBackup !== "function") return false;
        return true;
      }

      function currentBackupStatusText(entry) {
        if (!entry) return "未保存";
        const rawCount = Number(entry.valueCount);
        const count = Number.isFinite(rawCount) && rawCount >= 0
          ? Math.floor(rawCount)
          : (Array.isArray(entry.values) ? entry.values.length : 0);
        const sourceTime = entry.serverUpdatedAt || entry.clientUpdatedAt || "";
        const time = formatDateTimeMinute(sourceTime) || "時刻不明";
        return `${time} / ${count}件`;
      }

      function setBackupMeta(kind, backup) {
        const normalizedKind = normalizeBackupKind(kind);
        if (!normalizedKind) return;
        settingsBackupMeta = {
          ...settingsBackupMeta,
          [normalizedKind]: backup && typeof backup === "object" ? { ...backup } : null
        };
      }

      function renderBackupStatus(statusEl, kind) {
        if (!statusEl) return;
        const apiReady = hasSettingsBackupApi();
        if (!apiReady) {
          statusEl.textContent = "バックアップ: Firebase未設定";
          return;
        }
        if (settingsBackupLoading) {
          statusEl.textContent = "バックアップ: 読み込み中...";
          return;
        }
        statusEl.textContent = `バックアップ: ${currentBackupStatusText(settingsBackupMeta[kind])}`;
      }

      function renderSettingsBackups() {
        const apiReady = hasSettingsBackupApi();
        const disabledBase = settingsBackupWorking || !apiReady;

        if (el.saveVehicleBackupBtn) el.saveVehicleBackupBtn.disabled = disabledBase;
        if (el.restoreVehicleBackupBtn) {
          el.restoreVehicleBackupBtn.disabled = disabledBase || !settingsBackupMeta[SETTINGS_BACKUP_KIND.VEHICLES];
        }
        if (el.saveDriverBackupBtn) el.saveDriverBackupBtn.disabled = disabledBase;
        if (el.restoreDriverBackupBtn) {
          el.restoreDriverBackupBtn.disabled = disabledBase || !settingsBackupMeta[SETTINGS_BACKUP_KIND.DRIVERS];
        }

        if (el.deleteVehicleBackupBtn) {
          el.deleteVehicleBackupBtn.disabled = disabledBase || !settingsBackupMeta[SETTINGS_BACKUP_KIND.VEHICLES];
        }
        if (el.deleteDriverBackupBtn) {
          el.deleteDriverBackupBtn.disabled = disabledBase || !settingsBackupMeta[SETTINGS_BACKUP_KIND.DRIVERS];
        }

        renderBackupStatus(el.vehicleBackupStatus, SETTINGS_BACKUP_KIND.VEHICLES);
        renderBackupStatus(el.driverBackupStatus, SETTINGS_BACKUP_KIND.DRIVERS);
      }

      async function refreshSettingsBackups() {
        if (!hasSettingsBackupApi()) {
          settingsBackupMeta = emptyBackupMeta();
          renderSettingsBackups();
          return;
        }

        settingsBackupLoading = true;
        renderSettingsBackups();
        const nextMeta = emptyBackupMeta();
        try {
          for (const kind of Object.values(SETTINGS_BACKUP_KIND)) {
            const result = await window.FirebaseCloudSync.loadSettingsBackup(kind, SETTINGS_BACKUP_SLOT, { metadataOnly: true });
            if (result && result.ok && result.backup) {
              nextMeta[kind] = result.backup;
              continue;
            }
            if (result && result.reason === "not_found") {
              nextMeta[kind] = null;
              continue;
            }
            console.warn(`Failed to load backup metadata (${kind})`, result);
          }
        } catch (error) {
          console.warn("Failed to refresh settings backups:", error);
        } finally {
          settingsBackupMeta = nextMeta;
          settingsBackupLoading = false;
          renderSettingsBackups();
        }
      }

      function backupReasonMessage(reason, mode) {
        if (reason === "not_found") return mode === "delete" ? "削除対象のバックアップがありません" : "バックアップは未保存です";
        if (reason === "offline") return "オフラインのためFirebaseに接続できません";
        if (reason === "firebase_unready") return "Firebaseの接続準備が完了していません";
        if (reason === "permission_denied") return "Firebase権限エラーです（Firestoreルールを確認してください）";
        if (reason === "unauthenticated") return "匿名認証が無効です（Firebase Authenticationで匿名認証を有効化してください）";
        if (reason === "failed_precondition") return "Firestore未作成の可能性があります（Firebase ConsoleでFirestoreを作成してください）";
        if (reason === "empty_values") return "バックアップ対象のデータがありません";
        if (mode === "save") return "バックアップ保存に失敗しました";
        if (mode === "restore") return "バックアップ復元に失敗しました";
        if (mode === "delete") return "バックアップ削除に失敗しました";
        return "バックアップ処理に失敗しました";
      }

      function backupValuesForKind(kind) {
        if (kind === SETTINGS_BACKUP_KIND.VEHICLES) return normalizeVehicles(vehicles);
        if (kind === SETTINGS_BACKUP_KIND.DRIVERS) return normalizeDrivers(drivers);
        return [];
      }

      async function saveSettingsBackup(kind) {
        const normalizedKind = normalizeBackupKind(kind);
        if (!normalizedKind) return;
        if (!hasSettingsBackupApi()) {
          showToast("Firebaseバックアップを利用できません");
          return;
        }
        const values = backupValuesForKind(normalizedKind);
        if (!values.length) {
          showToast("バックアップ対象のデータがありません");
          return;
        }

        settingsBackupWorking = true;
        renderSettingsBackups();
        try {
          const result = await window.FirebaseCloudSync.saveSettingsBackup(
            normalizedKind,
            SETTINGS_BACKUP_SLOT,
            values,
            { source: "settings" }
          );
          if (!result || !result.ok) {
            console.warn("Settings backup save failed result:", result);
            showToast(backupReasonMessage(result && result.reason, "save"));
            return;
          }
          setBackupMeta(normalizedKind, result.backup);
          showToast(`${backupKindLabel(normalizedKind)}をバックアップ保存しました`);
        } catch (error) {
          console.warn("Failed to save settings backup:", error);
          showToast("バックアップ保存に失敗しました");
        } finally {
          settingsBackupWorking = false;
          renderSettingsBackups();
        }
      }

      function applyRestoredSettingsBackup(kind, values) {
        if (kind === SETTINGS_BACKUP_KIND.VEHICLES) {
          vehicles = normalizeVehicles(values);
          saveVehicles();
          if (current.vehicleNumber && !vehicles.includes(current.vehicleNumber)) {
            current.vehicleNumber = "";
            saveCurrent();
            void refreshPreviousFromCloud();
          }
          return;
        }
        if (kind === SETTINGS_BACKUP_KIND.DRIVERS) {
          drivers = normalizeDrivers(values);
          saveDrivers();
          if (current.driverName && !hasDriverName(current.driverName)) {
            current.driverName = "";
            saveCurrent();
            void refreshPreviousFromCloud();
          }
          return;
        }
      }

      async function restoreSettingsBackup(kind) {
        const normalizedKind = normalizeBackupKind(kind);
        if (!normalizedKind) return;
        if (!hasSettingsBackupApi()) {
          showToast("Firebaseバックアップを利用できません");
          return;
        }
        if (!settingsBackupMeta[normalizedKind]) {
          showToast("バックアップは未保存です");
          return;
        }

        const confirmed = window.confirm(
          `${backupKindLabel(normalizedKind)}をバックアップから復元します。現在の登録内容は上書きされます。よろしいですか？`
        );
        if (!confirmed) return;

        settingsBackupWorking = true;
        renderSettingsBackups();
        try {
          const result = await window.FirebaseCloudSync.loadSettingsBackup(normalizedKind, SETTINGS_BACKUP_SLOT);
          if (!result || !result.ok || !result.backup) {
            console.warn("Settings backup restore failed result:", result);
            showToast(backupReasonMessage(result && result.reason, "restore"));
            return;
          }
          const backupValues = Array.isArray(result.backup.values) ? result.backup.values : [];
          const normalizedBackupValues = normalizedKind === SETTINGS_BACKUP_KIND.DRIVERS
            ? normalizeDrivers(backupValues)
            : normalizeVehicles(backupValues);
          const shouldRewriteDriversBackup = (
            normalizedKind === SETTINGS_BACKUP_KIND.DRIVERS
            && !isSameStringArray(backupValues, normalizedBackupValues)
          );

          applyRestoredSettingsBackup(normalizedKind, normalizedBackupValues);

          let nextBackupMeta = result.backup;
          if (shouldRewriteDriversBackup) {
            const rewriteResult = await window.FirebaseCloudSync.saveSettingsBackup(
              normalizedKind,
              SETTINGS_BACKUP_SLOT,
              normalizedBackupValues,
              { source: "settings_normalize" }
            );
            if (rewriteResult && rewriteResult.ok && rewriteResult.backup) {
              nextBackupMeta = rewriteResult.backup;
            } else {
              console.warn("Settings backup normalize rewrite failed:", rewriteResult);
            }
          }

          setBackupMeta(normalizedKind, nextBackupMeta);
          renderAll();
          if (shouldRewriteDriversBackup) {
            showToast(`${backupKindLabel(normalizedKind)}を復元し、あいうえお順でバックアップ更新しました`);
          } else {
            showToast(`${backupKindLabel(normalizedKind)}をバックアップから復元しました`);
          }
        } catch (error) {
          console.warn("Failed to restore settings backup:", error);
          showToast("バックアップ復元に失敗しました");
        } finally {
          settingsBackupWorking = false;
          renderSettingsBackups();
        }
      }

      async function deleteSettingsBackup(kind) {
        const normalizedKind = normalizeBackupKind(kind);
        if (!normalizedKind) return;
        if (!hasSettingsBackupApi()) {
          showToast("Firebaseバックアップを利用できません");
          return;
        }
        if (!settingsBackupMeta[normalizedKind]) {
          showToast("削除対象のバックアップがありません");
          return;
        }

        const confirmed = window.confirm(
          `${backupKindLabel(normalizedKind)}のバックアップを削除します。よろしいですか？`
        );
        if (!confirmed) return;

        settingsBackupWorking = true;
        renderSettingsBackups();
        try {
          const result = await window.FirebaseCloudSync.deleteSettingsBackup(normalizedKind, SETTINGS_BACKUP_SLOT);
          if (!result || !result.ok) {
            console.warn("Settings backup delete failed result:", result);
            showToast(backupReasonMessage(result && result.reason, "delete"));
            return;
          }
          setBackupMeta(normalizedKind, null);
          showToast(`${backupKindLabel(normalizedKind)}のバックアップを削除しました`);
        } catch (error) {
          console.warn("Failed to delete settings backup:", error);
          showToast("バックアップ削除に失敗しました");
        } finally {
          settingsBackupWorking = false;
          renderSettingsBackups();
        }
      }

      function renderSettings() {
        const mode = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
        el.themeMode.value = mode;
        if (el.settingsUpdatedAt) el.settingsUpdatedAt.textContent = `更新: ${latestCommitPushedAt}`;
        renderVehicleList();
        renderDriverList();
        renderTruckTypeCatalogSelect();
        renderTruckTypeList();
        renderSettingsBackups();
      }

      function renderMeta() {
        el.inspectionDate.value = current.inspectionDate;
        renderBasicInfoDisplay();
      }

      function renderAll() {
        renderMeta();
        renderSettings();
        renderScreens();
        renderExportSummary();
        renderReportNote();
        renderButtons();
        updateTinyOverflowFix();
      }

      function normalizePreviousFromCloudState(state) {
        if (!state || typeof state !== "object") return null;
        const source = state.current || state.previous || null;
        return normalizePrevious(source);
      }

      const previousForCurrentBasic = () => {
        if (!previous) return null;
        if (basicSignatureOf(previous) !== basicSignatureOf(current)) return null;
        if (!isWithinPreviousMonthWindow(previous, current)) return null;
        return previous;
      };

      async function refreshPreviousFromCloud() {
        if (!hasCompleteBasicInfo(current)) {
          if (el.inputDialog.open) renderStep();
          return;
        }
        const cloudSync = window.FirebaseCloudSync;
        if (!cloudSync) return;

        const expectedSignature = basicSignatureOf(current);
        const token = ++previousLookupToken;
        const applyCloudState = (cloudState) => {
          const nextPrevious = normalizePreviousFromCloudState(cloudState);
          if (!nextPrevious) return false;
          if (basicSignatureOf(nextPrevious) !== expectedSignature) return false;
          if (!isWithinPreviousMonthWindow(nextPrevious, current)) return false;
          previous = nextPrevious;
          savePrevious();
          return true;
        };

        try {
          if (typeof cloudSync.loadStateForPayload === "function") {
            const result = await cloudSync.loadStateForPayload(buildCloudPayload("lookup_previous"));
            if (token !== previousLookupToken) return;
            if (result && result.ok && result.state) applyCloudState(result.state);
            if (el.inputDialog.open) renderStep();
            return;
          }
          if (typeof cloudSync.loadLatestState === "function") {
            const result = await cloudSync.loadLatestState({ limit: 120 });
            if (token !== previousLookupToken) return;
            if (result && result.ok && result.state) applyCloudState(result.state);
            if (el.inputDialog.open) renderStep();
          }
        } catch (error) {
          if (token !== previousLookupToken) return;
          console.warn("Failed to load previous data from Firebase:", error);
          if (el.inputDialog.open) renderStep();
        }
      }

      function setFlowScreen(screen) {
        closeDialog();
        currentScreen = screen;
        renderAll();
      }

      function isBasicInfoReady() {
        if (!current.inspectionDate) return false;
        if (!current.driverName) return false;
        if (!current.vehicleNumber) return false;
        if (!current.truckType || !truckTypes.includes(current.truckType)) return false;
        return true;
      }

      function isInspectionComplete() {
        return percent() === 100;
      }

      const firstUnfilled = (obj, fields) => {
        const i = fields.findIndex((f) => !obj[f.key]);
        return i >= 0 ? i : 0;
      };

      function openDialog(type, id = null) {
        const spare = type === "spare";
        dialog = {
          target: spare ? "spare" : id,
          fields: spare ? SPARE_FIELDS : NORMAL_FIELDS
        };
        el.dialogTarget.textContent = spare ? "スペアタイヤ入力" : `${circle(id, current.truckType)} タイヤ入力`;
        el.inputWarning.classList.remove("show");
        renderStep();
        if (typeof el.inputDialog.showModal === "function") el.inputDialog.showModal();
        else el.inputDialog.setAttribute("open", "");
        void refreshPreviousFromCloud();
      }

      function closeDialog() {
        el.inputWarning.classList.remove("show");
        if (el.inputDialog.open && typeof el.inputDialog.close === "function") el.inputDialog.close();
        else el.inputDialog.removeAttribute("open");
      }

      function hasDialogUnfilled() {
        if (!el.inputDialog.open) return false;
        if (!dialog || !Array.isArray(dialog.fields) || dialog.fields.length === 0) return false;
        const obj = targetObj();
        if (!obj) return false;
        return dialog.fields.some((f) => !obj[f.key]);
      }

      function tryCloseInputDialog() {
        if (!hasDialogUnfilled()) {
          closeDialog();
          return true;
        }
        renderStep();
        showToast("未入力があります");
        return false;
      }

      function openSettingsDialog() {
        screenBeforeSettings = currentScreen;
        void refreshLatestCommitPushedAt();
        renderSettings();
        setFlowScreen(FLOW_SCREENS.SETTINGS);
        void refreshSettingsBackups();
      }

      function closeSettingsDialog() {
        const backTo = screenBeforeSettings === FLOW_SCREENS.SETTINGS ? FLOW_SCREENS.BASIC : screenBeforeSettings;
        setFlowScreen(backTo);
      }

      function openSendConfirmDialog() {
        if (typeof el.sendConfirmDialog.showModal === "function") el.sendConfirmDialog.showModal();
        else el.sendConfirmDialog.setAttribute("open", "");
      }

      function closeSendConfirmDialog() {
        if (el.sendConfirmDialog.open && typeof el.sendConfirmDialog.close === "function") el.sendConfirmDialog.close();
        else el.sendConfirmDialog.removeAttribute("open");
      }
      const targetObj = () => dialog.target === "spare" ? current.spare : current.tires[dialog.target];

      function renderStep() {
        const obj = targetObj();
        const matchedPrevious = previousForCurrentBasic();
        const prevObj = matchedPrevious
          ? (dialog.target === "spare" ? matchedPrevious.spare : matchedPrevious.tires[dialog.target])
          : null;
        el.stepFieldList.innerHTML = "";
        dialog.fields.forEach((f) => {
          const row = document.createElement("div");
          row.className = `step-select-row${obj[f.key] ? " done" : ""}`;
          const label = document.createElement("span");
          label.className = "step-row-label";
          label.textContent = f.label;

          const select = document.createElement("select");
          select.className = "sel step-inline-select";
          select.dataset.key = f.key;

          const currentValue = obj[f.key] || "";
          const previousValue = prevObj ? (prevObj[f.key] || "") : "";
          const promptText = previousValue
            ? `前回データ:${previousValue}`
            : "前回データなし";
          const promptOption = new Option(promptText, "");
          promptOption.disabled = true;
          select.appendChild(promptOption);
          const orderedOptions = previousValue && f.options.includes(previousValue)
            ? [previousValue].concat(f.options.filter((value) => value !== previousValue))
            : f.options;
          orderedOptions.forEach((value) => {
            select.appendChild(new Option(value, value));
          });
          select.value = currentValue || "";

          row.appendChild(label);
          row.appendChild(select);
          el.stepFieldList.appendChild(row);
        });
      }

      function applyStep(fieldKey, value) {
        if (!value) return;
        const obj = targetObj();
        const field = dialog.fields.find((item) => item.key === fieldKey);
        if (!field) return;
        obj[field.key] = value;
        saveCurrent();
        renderAll();
        renderStep();
      }

      function showInputWarning(message) {
        if (!el.inputDialog.open) return false;
        el.inputWarning.textContent = message;
        el.inputWarning.classList.add("show");
        clearTimeout(showInputWarning.tid);
        showInputWarning.tid = setTimeout(() => el.inputWarning.classList.remove("show"), 1800);
        return true;
      }

      function showToast(message) {
        const text = String(message ?? "");
        const isMissingWarning = text.includes("未入力");
        if (isMissingWarning && showInputWarning(text)) {
          el.toast.classList.remove("show");
          return;
        }
        el.toast.classList.toggle("warn", isMissingWarning);
        el.toast.textContent = text;
        el.toast.classList.add("show");
        clearTimeout(showToast.tid);
        showToast.tid = setTimeout(() => el.toast.classList.remove("show"), 1800);
      }

      function snapshot() {
        return {
          savedAt: new Date().toISOString(),
          completion: percent(),
          data: normalizeCurrent(JSON.parse(JSON.stringify(current)))
        };
      }

      function esc(v) {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
        return s;
      }
      function sanitizeFileNamePart(value, fallback = "乗務員未設定") {
        const s = String(value ?? "").trim();
        const cleaned = s
          .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
          .replace(/\s+/g, " ");
        return cleaned || fallback;
      }

      function rowsFor(entry) {
        const d = entry.data;
        const rows = [];
        let sharedWritten = false;
        let noteWritten = false;
        const shared = () => {
          if (sharedWritten) return ["", "", "", ""];
          sharedWritten = true;
          return [entry.savedAt, d.inspectionDate, d.vehicleNumber, d.driverName];
        };
        const report = () => {
          if (noteWritten) return "";
          noteWritten = true;
          return d.reportNote;
        };

        getActiveIds(d.truckType).forEach((id) => {
          const t = d.tires[id];
          rows.push([
            ...shared(),
            circle(id, d.truckType),
            t.maker, t.type, t.groove, t.wear, t.damage, t.pressure, "",
            report()
          ]);
        });
        rows.push([
          ...shared(),
          "スペア",
          d.spare.maker, d.spare.type, "", "", "", "", d.spare.condition,
          report()
        ]);
        return rows;
      }

      async function shareCsvFile(fileName, content) {
        if (typeof navigator.share !== "function") return { ok: false, reason: SHARE_REASONS.UNSUPPORTED };
        if (typeof File !== "function") return { ok: false, reason: SHARE_REASONS.UNSUPPORTED };
        let file;
        try {
          file = new File([content], fileName, { type: "text/csv;charset=utf-8;" });
        } catch {
          return { ok: false, reason: SHARE_REASONS.UNSUPPORTED };
        }
        try {
          if (navigator.canShare && !navigator.canShare({ files: [file] })) {
            return { ok: false, reason: SHARE_REASONS.UNSUPPORTED };
          }
        } catch {
          return { ok: false, reason: SHARE_REASONS.UNSUPPORTED };
        }
        try {
          // iOS互換性を優先して files のみ渡す
          await navigator.share({
            files: [file]
          });
          return { ok: true, reason: SHARE_REASONS.OK };
        } catch (error) {
          if (error && error.name === "AbortError") return { ok: false, reason: SHARE_REASONS.CANCEL };
          console.warn("Share CSV failed:", error);
          return { ok: false, reason: SHARE_REASONS.ERROR };
        }
      }
      function downloadCsv(fileName, content) {
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      async function closeApp() {
        try {
          window.close();
        } catch {
          // noop
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
        if (!document.hidden) window.location.replace("about:blank");
      }

      async function showSendFarewell() {
        if (!el.sendFarewell) return;
        el.sendFarewell.classList.add("show");
        el.sendFarewell.setAttribute("aria-hidden", "false");

        const image = el.sendFarewellImage;
        if (image && !image.complete) {
          await new Promise((resolve) => {
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              image.removeEventListener("load", finish);
              image.removeEventListener("error", finish);
              resolve();
            };
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
            window.setTimeout(finish, 1200);
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 1800));
      }

      async function exportCsv() {
        const previousSnapshot = normalizeCurrent(JSON.parse(JSON.stringify(current)));
        previous = previousSnapshot;
        savePrevious();
        if (window.FirebaseCloudSync && typeof window.FirebaseCloudSync.saveNowDetailed === "function") {
          window.FirebaseCloudSync.clearPendingQueue && window.FirebaseCloudSync.clearPendingQueue();
          const cloudResult = await window.FirebaseCloudSync.saveNowDetailed("submit", { allowLocalQueue: false });
          if (!cloudResult.ok && cloudResult.reason !== "disabled" && cloudResult.reason !== "payload_missing") {
            renderAll();
            if (cloudResult.reason === "offline") {
              window.alert("Firebaseに保存できませんでした。圏外またはオフラインの可能性があります。通信回復後に、もう一度「送信」を押してください。");
            } else {
              window.alert("Firebaseに保存できませんでした。通信状態を確認して、もう一度「送信」を押してください。");
            }
            showToast("Firebase未保存です。再送信してください");
            return;
          }
        } else if (window.FirebaseCloudSync && typeof window.FirebaseCloudSync.saveNow === "function") {
          window.FirebaseCloudSync.clearPendingQueue && window.FirebaseCloudSync.clearPendingQueue();
          const cloudSaved = await window.FirebaseCloudSync.saveNow("submit", { allowLocalQueue: false });
          if (!cloudSaved) {
            renderAll();
            window.alert("Firebaseに保存できませんでした。通信状態を確認して、もう一度「送信」を押してください。");
            showToast("Firebase未保存です。再送信してください");
            return;
          }
        }
        resetCurrent({ confirm: false, toast: false });
        await showSendFarewell();
        await closeApp();
      }

      function resetCurrent(options = {}) {
        const doConfirm = options.confirm !== false;
        const doToast = options.toast !== false;
        if (doConfirm && !window.confirm("現在の入力内容をリセットします。よろしいですか？")) return false;
        const truckType = current.truckType;
        const driverName = current.driverName;
        const vehicleNumber = current.vehicleNumber;
        closeDialog();
        current = defaultCurrent();
        current.truckType = truckTypes.includes(truckType) ? truckType : (truckTypes[0] || TRUCK_TYPES.LOW12);
        current.driverName = hasDriverName(driverName) ? driverName : "";
        current.vehicleNumber = vehicles.includes(vehicleNumber) ? vehicleNumber : "";
        saveCurrent();
        buildTires();
        currentScreen = FLOW_SCREENS.BASIC;
        renderAll();
        void refreshPreviousFromCloud();
        if (doToast) showToast("現在入力をリセットしました");
        return true;
      }

      function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        document.body.setAttribute("data-theme", theme);
        if (el.themeMode) el.themeMode.value = theme === "dark" ? "dark" : "light";
      }

      function initTheme() {
        const stored = localStorage.getItem(STORAGE.theme);
        if (stored === "dark" || stored === "light") {
          applyTheme(stored);
          return;
        }
        const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(dark ? "dark" : "light");
      }

      function setTheme(theme) {
        const next = theme === "dark" ? "dark" : "light";
        localStorage.setItem(STORAGE.theme, next);
        applyTheme(next);
      }

      async function refreshLatestCommitPushedAt(options = {}) {
        const force = options.force === true;
        const now = Date.now();
        const REFRESH_INTERVAL_MS = 60 * 1000;
        if (!force && latestCommitFetchedAtMs > 0 && (now - latestCommitFetchedAtMs) < REFRESH_INTERVAL_MS) {
          return;
        }
        if (latestCommitFetchPromise) {
          await latestCommitFetchPromise;
          return;
        }
        const url = `${GITHUB_REPO_API_LATEST_COMMIT}&t=${now}`;
        latestCommitFetchPromise = (async () => {
          try {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
            const data = await response.json();
            const latest = Array.isArray(data) ? data[0] : data;
            const iso = latest && latest.commit && latest.commit.committer && latest.commit.committer.date
              ? latest.commit.committer.date
              : "";
            const formatted = formatDateTimeMinute(iso);
            if (formatted) latestCommitPushedAt = formatted;
            latestCommitFetchedAtMs = Date.now();
          } catch (e) {
            console.warn("Failed to fetch latest commit pushed time:", e);
          } finally {
            latestCommitFetchPromise = null;
            renderSettings();
          }
        })();
        await latestCommitFetchPromise;
      }

      function updateTinyOverflowFix() {
        const body = document.body;
        if (!body) return;
        if (currentScreen !== FLOW_SCREENS.EXPORT) {
          body.classList.remove("tiny-overflow-lock");
          return;
        }
        const active = document.activeElement;
        const tag = active && active.tagName ? active.tagName : "";
        const editing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
        if (editing) {
          body.classList.remove("tiny-overflow-lock");
          return;
        }
        const viewport = window.visualViewport;
        const viewportHeight = Math.round(viewport && viewport.height ? viewport.height : window.innerHeight);
        if (!viewportHeight) {
          body.classList.remove("tiny-overflow-lock");
          return;
        }
        const root = document.documentElement;
        const overflowPx = Math.ceil(root.scrollHeight - viewportHeight);
        const tinyOverflow = overflowPx > 0 && overflowPx <= 16;
        body.classList.toggle("tiny-overflow-lock", tinyOverflow);
      }

      function updateMobileFitScale() {
        const active = document.activeElement;
        const tag = active && active.tagName ? active.tagName : "";
        const editing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
        if (editing) return;

        const viewport = window.visualViewport;
        const width = Math.round(viewport && viewport.width ? viewport.width : window.innerWidth);
        const height = Math.round(viewport && viewport.height ? viewport.height : window.innerHeight);
        const coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        const smallViewport = width <= 900;

        if (!coarsePointer || !smallViewport) {
          document.documentElement.style.setProperty("--mobile-fit-scale", "1");
          document.documentElement.style.setProperty("--bottom-dock-space", "110px");
          updateTinyOverflowFix();
          return;
        }

        const minScale = 0.72;
        const widthScale = Math.min(1, Math.max(minScale, width / 420));
        const heightScale = Math.min(1, Math.max(minScale, height / 900));
        const scale = Math.max(minScale, Math.min(widthScale, heightScale));
        const standaloneMode = (
          window.matchMedia &&
          (
            window.matchMedia("(display-mode: standalone)").matches ||
            window.matchMedia("(display-mode: fullscreen)").matches ||
            window.matchMedia("(display-mode: minimal-ui)").matches
          )
        ) || (typeof window.navigator.standalone === "boolean" && window.navigator.standalone === true);
        const dockBase = standaloneMode ? 102 : 110;
        const dockSpace = Math.round(dockBase * scale);

        document.documentElement.style.setProperty("--mobile-fit-scale", scale.toFixed(3));
        document.documentElement.style.setProperty("--bottom-dock-space", `${dockSpace}px`);
        updateTinyOverflowFix();
      }

      function bindMobileFitScale() {
        updateMobileFitScale();
        window.addEventListener("resize", updateMobileFitScale, { passive: true });
        window.addEventListener("orientationchange", updateMobileFitScale, { passive: true });
        if (window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
          window.visualViewport.addEventListener("resize", updateMobileFitScale, { passive: true });
        }
        document.addEventListener("focusout", () => {
          window.setTimeout(updateMobileFitScale, 0);
        });
      }

      function setDriverName(name) {
        const next = normalizeDriverName(name);
        if (next && !hasDriverName(next)) return;
        if (current.driverName === next) return;
        current.driverName = next;
        saveCurrent();
        renderAll();
        void refreshPreviousFromCloud();
      }

      function setVehicleNumber(number) {
        const next = String(number || "").trim();
        if (next && !vehicles.includes(next)) return;
        if (current.vehicleNumber === next) return;
        current.vehicleNumber = next;
        saveCurrent();
        renderAll();
        void refreshPreviousFromCloud();
      }

      function setTruckType(type) {
        if (!truckTypes.includes(type)) {
          return;
        }
        const next = normalizeTruckType(type);
        if (current.truckType === next) return;
        current.truckType = next;
        saveCurrent();
        closeDialog();
        buildTires();
        renderAll();
        void refreshPreviousFromCloud();
      }

      function addVehicleNumber() {
        const value = String(el.newVehicleNumber.value || "").trim();
        if (!value) {
          showToast("車両番号を入力してください");
          return;
        }
        if (vehicles.includes(value)) {
          showToast("同じ車両番号は登録済みです");
          return;
        }

        vehicles.push(value);
        vehicles.sort((a, b) => a.localeCompare(b, "ja"));
        saveVehicles();

        if (!current.vehicleNumber) {
          current.vehicleNumber = value;
          saveCurrent();
          void refreshPreviousFromCloud();
        }

        el.newVehicleNumber.value = "";
        renderAll();
        showToast("車両番号を登録しました");
      }

      function removeVehicleNumber(value) {
        const index = vehicles.indexOf(value);
        if (index < 0) return;
        if (!window.confirm(`「${value}」を削除しますか？`)) return;

        vehicles.splice(index, 1);
        saveVehicles();

        if (current.vehicleNumber === value) {
          current.vehicleNumber = vehicles[0] || "";
          saveCurrent();
          void refreshPreviousFromCloud();
        }

        renderAll();
        showToast("車両番号を削除しました");
      }

      function addDriverName() {
        const rawName = String(el.newDriverName.value || "").trim();
        const rawReading = String(el.newDriverReading.value || "").trim();
        const parsedName = parseDriverEntry(rawName);
        const driverName = normalizeDriverName(parsedName.name || rawName);
        if (!driverName) {
          showToast("乗務員名（漢字）を入力してください");
          return;
        }
        const readingSource = rawReading || parsedName.reading;
        const normalizedEntry = normalizeDriverEntry(
          readingSource ? `${driverName}（${readingSource}）` : driverName
        );
        const normalizedReading = parseDriverEntry(normalizedEntry).reading;

        const sameNameIndex = findDriverIndexByName(driverName);
        if (sameNameIndex >= 0) {
          const existingEntry = drivers[sameNameIndex];
          if (existingEntry === normalizedEntry) {
            showToast("同じ乗務員は登録済みです");
            return;
          }
          drivers.splice(sameNameIndex, 1, normalizedEntry);
          drivers = normalizeDrivers(drivers);
          saveDrivers();
          el.newDriverName.value = "";
          el.newDriverReading.value = "";
          renderAll();
          showToast("乗務員の読みを更新しました");
          return;
        }

        drivers = normalizeDrivers(drivers.concat(normalizedEntry));
        saveDrivers();

        if (!current.driverName) {
          current.driverName = driverName;
          saveCurrent();
          void refreshPreviousFromCloud();
        }

        el.newDriverName.value = "";
        el.newDriverReading.value = "";
        renderAll();
        if (!normalizedReading && /[\u3400-\u9FFF]/.test(driverName)) {
          showToast("乗務員を登録しました（ひらがなを入力すると、あいうえお順で並びます）");
          return;
        }
        showToast("乗務員を登録しました");
      }

      function removeDriverName(value) {
        const index = drivers.indexOf(value);
        if (index < 0) return;
        const targetName = normalizeDriverName(value);
        if (!window.confirm(`「${targetName}」を削除しますか？`)) return;

        drivers.splice(index, 1);
        saveDrivers();

        if (current.driverName === targetName) {
          current.driverName = firstDriverName();
          saveCurrent();
          void refreshPreviousFromCloud();
        }

        renderAll();
        showToast("乗務員を削除しました");
      }

      function addTruckType() {
        const value = String(el.newTruckType.value || "").trim();
        if (!value) {
          showToast("車種を選択してください");
          return;
        }
        if (truckTypes.includes(value)) {
          showToast("同じ車種は登録済みです");
          return;
        }

        truckTypes = sortTruckTypes(truckTypes.concat(value));
        saveTruckTypes();

        if (!truckTypes.includes(current.truckType)) {
          current.truckType = value;
          saveCurrent();
          closeDialog();
          buildTires();
          void refreshPreviousFromCloud();
        }

        renderAll();
        showToast("車種を登録しました");
      }

      function removeTruckType(value) {
        const index = truckTypes.indexOf(value);
        if (index < 0) return;
        if (truckTypes.length <= 1) {
          showToast("車種は1件以上登録してください");
          return;
        }
        if (!window.confirm(`「${truckTypeLabel(value)}」を削除しますか？`)) return;

        truckTypes.splice(index, 1);
        truckTypes = sortTruckTypes(truckTypes);
        saveTruckTypes();

        if (current.truckType === value) {
          current.truckType = truckTypes[0] || TRUCK_TYPES.LOW12;
          saveCurrent();
          closeDialog();
          buildTires();
          void refreshPreviousFromCloud();
        }

        renderAll();
        showToast("車種を削除しました");
      }

      function buildTires() {
        const layout = getLayout(current.truckType);
        const rowCount = layout.axes.length;
        const layoutEl = el.leftTires.closest(".layout");
        if (layoutEl) layoutEl.dataset.truckType = current.truckType;

        el.leftTires.innerHTML = "";
        el.rightTires.innerHTML = "";
        el.truckAxes.innerHTML = "";
        el.leftTires.style.gridTemplateRows = `repeat(${rowCount}, minmax(0, 1fr))`;
        el.rightTires.style.gridTemplateRows = `repeat(${rowCount}, minmax(0, 1fr))`;
        el.truckAxes.style.gridTemplateRows = `repeat(${rowCount}, minmax(0, 1fr))`;
        tireButtons = {};

        layout.axes.forEach((label) => {
          const axis = document.createElement("div");
          axis.className = "ax";
          axis.textContent = label;
          el.truckAxes.appendChild(axis);
        });

        const make = (id) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "tire";
          b.textContent = circle(id, current.truckType);
          b.addEventListener("click", () => openDialog("tire", id));
          tireButtons[id] = b;
          return b;
        };

        const appendSide = (container, layout) => {
          layout.forEach((group) => {
            const slot = document.createElement("div");
            slot.className = `tire-slot ${group.length > 1 ? "dual" : "single"}`;
            group.forEach((id) => slot.appendChild(make(id)));
            container.appendChild(slot);
          });
        };

        appendSide(el.leftTires, layout.left);
        appendSide(el.rightTires, layout.right);
      }

      function bindEvents() {
        el.inspectionDate.addEventListener("change", (ev) => {
          if (!ev.target.value) return;
          current.inspectionDate = ev.target.value;
          saveCurrent();
          renderAll();
          void refreshPreviousFromCloud();
        });
        el.basicNextBtn.addEventListener("click", () => {
          if (!isBasicInfoReady()) {
            showToast("基本情報をすべて設定してください");
            return;
          }
          setFlowScreen(FLOW_SCREENS.TRUCK);
        });
        el.truckBackBtn.addEventListener("click", () => setFlowScreen(FLOW_SCREENS.BASIC));
        el.truckToExportBtn.addEventListener("click", () => {
          if (!isInspectionComplete()) {
            showToast("未入力があります\nすべて入力してください");
            return;
          }
          setFlowScreen(FLOW_SCREENS.EXPORT);
        });
        el.exportBackBtn.addEventListener("click", () => setFlowScreen(FLOW_SCREENS.TRUCK));
        el.spareButton.addEventListener("click", () => openDialog("spare"));
        el.reportNote.addEventListener("input", (ev) => {
          current.reportNote = ev.target.value;
          saveCurrent();
        });
        el.exportCsvBtn.addEventListener("click", openSendConfirmDialog);
        el.sendFixBtn.addEventListener("click", () => {
          closeSendConfirmDialog();
          setFlowScreen(FLOW_SCREENS.TRUCK);
        });
        el.sendSubmitBtn.addEventListener("click", () => {
          closeSendConfirmDialog();
          void exportCsv();
        });
        el.quickResetBtn.addEventListener("click", resetCurrent);
        el.openSettingsBtn.addEventListener("click", openSettingsDialog);
        el.closeSettingsBtn.addEventListener("click", closeSettingsDialog);
        el.themeMode.addEventListener("change", (ev) => setTheme(ev.target.value));
        el.addVehicleBtn.addEventListener("click", addVehicleNumber);
        el.newVehicleNumber.addEventListener("keydown", (ev) => {
          if (ev.key !== "Enter") return;
          ev.preventDefault();
          addVehicleNumber();
        });
        el.addDriverBtn.addEventListener("click", addDriverName);
        el.newDriverName.addEventListener("keydown", (ev) => {
          if (ev.key !== "Enter") return;
          ev.preventDefault();
          const reading = String(el.newDriverReading.value || "").trim();
          if (!reading) {
            el.newDriverReading.focus();
            return;
          }
          addDriverName();
        });
        el.newDriverReading.addEventListener("keydown", (ev) => {
          if (ev.key !== "Enter") return;
          ev.preventDefault();
          addDriverName();
        });
        el.addTruckTypeBtn.addEventListener("click", addTruckType);
        el.saveVehicleBackupBtn.addEventListener("click", () => {
          void saveSettingsBackup(SETTINGS_BACKUP_KIND.VEHICLES);
        });
        el.restoreVehicleBackupBtn.addEventListener("click", () => {
          void restoreSettingsBackup(SETTINGS_BACKUP_KIND.VEHICLES);
        });
        el.deleteVehicleBackupBtn.addEventListener("click", () => {
          void deleteSettingsBackup(SETTINGS_BACKUP_KIND.VEHICLES);
        });
        el.saveDriverBackupBtn.addEventListener("click", () => {
          void saveSettingsBackup(SETTINGS_BACKUP_KIND.DRIVERS);
        });
        el.restoreDriverBackupBtn.addEventListener("click", () => {
          void restoreSettingsBackup(SETTINGS_BACKUP_KIND.DRIVERS);
        });
        el.deleteDriverBackupBtn.addEventListener("click", () => {
          void deleteSettingsBackup(SETTINGS_BACKUP_KIND.DRIVERS);
        });
        el.vehicleList.addEventListener("click", (ev) => {
          const target = ev.target;
          if (!(target instanceof HTMLButtonElement)) return;
          const vehicle = target.dataset.vehicle;
          if (!vehicle) return;
          if (target.dataset.action === "show") {
            setVehicleNumber(vehicle);
            return;
          }
          removeVehicleNumber(vehicle);
        });
        el.driverList.addEventListener("click", (ev) => {
          const target = ev.target;
          if (!(target instanceof HTMLButtonElement)) return;
          const driver = target.dataset.driver;
          if (!driver) return;
          if (target.dataset.action === "show") {
            setDriverName(driver);
            return;
          }
          removeDriverName(driver);
        });
        el.truckTypeList.addEventListener("click", (ev) => {
          const target = ev.target;
          if (!(target instanceof HTMLButtonElement)) return;
          const truckType = target.dataset.truckType;
          if (!truckType) return;
          if (target.dataset.action === "show") {
            setTruckType(truckType);
            return;
          }
          removeTruckType(truckType);
        });
        el.dialogCloseBtn.addEventListener("click", closeDialog);
        el.closeStepBtn.addEventListener("click", tryCloseInputDialog);
        el.inputDialog.addEventListener("cancel", (ev) => {
          if (tryCloseInputDialog()) return;
          ev.preventDefault();
        });
        el.stepFieldList.addEventListener("change", (ev) => {
          const target = ev.target;
          if (!(target instanceof HTMLSelectElement)) return;
          if (!target.classList.contains("step-inline-select")) return;
          const fieldKey = target.dataset.key;
          if (!fieldKey) return;
          applyStep(fieldKey, target.value);
        });
      }

      async function registerSW() {
        if (!("serviceWorker" in navigator)) return;
        try {
          const registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
          await registration.update();
        } catch (e) {
          console.warn("Service Worker registration failed:", e);
        }
      }

      function init() {
        if (window.FirebaseCloudSync && typeof window.FirebaseCloudSync.init === "function") {
          void (async () => {
            await window.FirebaseCloudSync.init({
              getPayload: () => buildCloudPayload("autosave")
            });
            await refreshPreviousFromCloud();
          })();
        }
        cleanupLegacyExportDirectoryStorage();
        initTheme();
        bindMobileFitScale();
        void refreshLatestCommitPushedAt({ force: true });
        if (!current.inspectionDate) current.inspectionDate = today();
        if (!current.driverName && drivers.length > 0) current.driverName = firstDriverName();
        if (!current.vehicleNumber && vehicles.length > 0) current.vehicleNumber = vehicles[0];
        if (!truckTypes.includes(current.truckType)) current.truckType = truckTypes[0] || TRUCK_TYPES.LOW12;
        currentScreen = FLOW_SCREENS.BASIC;
        buildTires();
        bindEvents();
        saveCurrent();
        renderAll();
        void refreshPreviousFromCloud();
        registerSW();
      }

      init();
    })();
