/* ═══════════════════════ ثبات — المنطق ═══════════════════════ */

"use strict";

// ─────────── العادات ───────────

const PRAYERS = [
  { id: "fajr",    name: "الفجر",   icon: "🌅" },
  { id: "dhuhr",   name: "الظهر",   icon: "☀️" },
  { id: "asr",     name: "العصر",   icon: "🌤️" },
  { id: "maghrib", name: "المغرب",  icon: "🌆" },
  { id: "isha",    name: "العشاء",  icon: "🌙" },
];

const LIFE_HABITS = [
  { id: "healthy",  name: "الأكل الصحي",       icon: "🥗" },
  { id: "exercise", name: "الرياضة",           icon: "🏃" },
  { id: "wakeup",   name: "الاستيقاظ المبكر",  icon: "⏰" },
];

const ALL_HABITS = [...PRAYERS, ...LIFE_HABITS];

// مستويات الستريك — كأنها لعبة
const LEVELS = [
  { min: 0,   title: "🌱 بذرة الثبات" },
  { min: 1,   title: "✨ شرارة" },
  { min: 3,   title: "🕯️ جمرة" },
  { min: 7,   title: "🔥 لهب" },
  { min: 14,  title: "🚀 نار متّقدة" },
  { min: 30,  title: "⛰️ جبل ثبات" },
  { min: 66,  title: "💎 عادة راسخة" },
  { min: 100, title: "👑 أسطورة الثبات" },
];
const MILESTONES = [1, 3, 7, 14, 30, 66, 100];

// ─────────── التخزين ───────────

const STORAGE_KEY = "thabat:v1";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.days === "object" && parsed.days !== null) return parsed;
  } catch (_) { /* بيانات تالفة → نبدأ من جديد */ }
  return { days: {} };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();

// كل يوم: { habits: {id: true}, note: "رسالة كُتبت في هذا اليوم ليقرأها صاحبها غدًا" }
function getDay(key) {
  if (!data.days[key]) data.days[key] = { habits: {}, note: "" };
  return data.days[key];
}

// ─────────── التواريخ ───────────

function dateKey(d) {
  // تاريخ محلي بصيغة YYYY-MM-DD
  return d.toLocaleDateString("en-CA");
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

let todayKey = dateKey(new Date());

function isDone(key, habitId) {
  const day = data.days[key];
  return !!(day && day.habits && day.habits[habitId]);
}

// ─────────── الأرقام العربية ───────────

function arNum(n) {
  return Number(n).toLocaleString("ar-EG", { useGrouping: false });
}

// ─────────── حساب الستريك ───────────

// "مكتمل" لعادة معيّنة، أو ليوم كامل (كل العادات)
function habitDoneOn(key, habitId) {
  if (habitId) return isDone(key, habitId);
  return ALL_HABITS.every((h) => isDone(key, h.id));
}

// الستريك الحالي: اليوم غير المكتمل بعد لا يكسر السلسلة
function currentStreak(habitId) {
  let d = new Date();
  if (!habitDoneOn(dateKey(d), habitId)) d = addDays(d, -1);
  let streak = 0;
  while (habitDoneOn(dateKey(d), habitId)) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

function bestStreak(habitId) {
  const keys = Object.keys(data.days)
    .filter((k) => habitDoneOn(k, habitId))
    .sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    if (prev !== null && dateKey(addDays(new Date(prev + "T12:00:00"), 1)) === k) {
      run++;
    } else {
      run = 1;
    }
    prev = k;
    if (run > best) best = run;
  }
  return best;
}

function countFullDays() {
  return Object.keys(data.days).filter((k) => habitDoneOn(k, null)).length;
}

function weekPercent() {
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const key = dateKey(addDays(new Date(), -i));
    for (const h of ALL_HABITS) if (isDone(key, h.id)) done++;
  }
  return Math.round((done / (7 * ALL_HABITS.length)) * 100);
}

function levelFor(streak) {
  let level = LEVELS[0];
  for (const l of LEVELS) if (streak >= l.min) level = l;
  return level;
}

function nextMilestone(streak) {
  return MILESTONES.find((m) => m > streak) || null;
}

// ─────────── صفحة اليوم ───────────

function renderDates() {
  const now = new Date();
  document.getElementById("date-gregorian").textContent = now.toLocaleDateString("ar", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  try {
    document.getElementById("date-hijri").textContent = now.toLocaleDateString(
      "ar-SA-u-ca-islamic-umalqura",
      { day: "numeric", month: "long", year: "numeric" }
    );
  } catch (_) {
    document.getElementById("date-hijri").textContent = "";
  }
}

function renderYesterdayMessage() {
  const el = document.getElementById("yesterday-message");
  const yesterday = data.days[dateKey(addDays(new Date(), -1))];
  const note = yesterday && yesterday.note ? yesterday.note.trim() : "";
  if (note) {
    el.textContent = note;
    el.classList.remove("empty");
  } else {
    el.textContent = "لم تكتب رسالة أمس… اكتب اليوم رسالة تقرأها غدًا 🌿";
    el.classList.add("empty");
  }
}

function renderHabitList(containerId, habits) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  for (const habit of habits) {
    const done = isDone(todayKey, habit.id);
    const streak = currentStreak(habit.id);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "habit-item" + (done ? " done" : "");
    btn.setAttribute("aria-pressed", String(done));

    const icon = document.createElement("span");
    icon.className = "habit-icon";
    icon.textContent = habit.icon;

    const name = document.createElement("span");
    name.className = "habit-name";
    name.textContent = habit.name;

    btn.append(icon, name);

    if (streak > 0) {
      const badge = document.createElement("span");
      badge.className = "habit-streak";
      badge.textContent = `🔥 ${arNum(streak)}`;
      btn.append(badge);
    }

    const check = document.createElement("span");
    check.className = "habit-check";
    check.textContent = "✔";
    btn.append(check);

    btn.addEventListener("click", () => toggleHabit(habit.id));
    container.append(btn);
  }
}

function toggleHabit(habitId) {
  const day = getDay(todayKey);
  const wasFullDay = habitDoneOn(todayKey, null);
  day.habits[habitId] = !day.habits[habitId];
  if (!day.habits[habitId]) delete day.habits[habitId];
  saveData();
  renderToday();
  renderTrack();
  if (!wasFullDay && habitDoneOn(todayKey, null)) celebrate();
}

function renderProgress() {
  const doneCount = ALL_HABITS.filter((h) => isDone(todayKey, h.id)).length;
  const total = ALL_HABITS.length;

  document.getElementById("progress-count").textContent = `${arNum(doneCount)}/${arNum(total)}`;

  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - doneCount / total);
  document.getElementById("ring-fill").style.strokeDashoffset = String(offset);

  const hint = document.getElementById("progress-hint");
  if (doneCount === total) {
    hint.textContent = "ما شاء الله! يوم مكتمل 🎉";
  } else if (doneCount === 0) {
    hint.textContent = "يومك يبدأ الآن، وفّقك الله";
  } else {
    hint.textContent = `بقي ${arNum(total - doneCount)} — أكمل يومك!`;
  }
}

// رسالة الغد — حفظ تلقائي
let noteTimer = null;

function setupNote() {
  const textarea = document.getElementById("tomorrow-note");
  const status = document.getElementById("note-status");
  textarea.value = getDay(todayKey).note || "";

  textarea.addEventListener("input", () => {
    status.textContent = "جارٍ الحفظ…";
    status.classList.remove("saved");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      getDay(todayKey).note = textarea.value;
      saveData();
      status.textContent = "حُفظت ✓ ستظهر لك غدًا";
      status.classList.add("saved");
    }, 500);
  });
}

function renderToday() {
  renderDates();
  renderYesterdayMessage();
  renderHabitList("prayers-list", PRAYERS);
  renderHabitList("habits-list", LIFE_HABITS);
  renderProgress();
}

// ─────────── صفحة المتابعة ───────────

function renderHero() {
  const streak = currentStreak(null);
  const level = levelFor(streak);
  const next = nextMilestone(streak);

  document.getElementById("overall-streak").textContent = arNum(streak);
  document.getElementById("level-title").textContent = level.title;
  document.getElementById("streak-hero").classList.toggle("lit", streak > 0);

  const bar = document.getElementById("level-bar-fill");
  const nextLabel = document.getElementById("level-next");
  if (next) {
    const prevMilestone = MILESTONES.filter((m) => m <= streak).pop() || 0;
    const pct = ((streak - prevMilestone) / (next - prevMilestone)) * 100;
    bar.style.width = `${Math.max(4, pct)}%`;
    nextLabel.textContent = `بقي ${arNum(next - streak)} ${next - streak === 1 ? "يوم" : "أيام"} للوصول إلى «${levelFor(next).title}»`;
  } else {
    bar.style.width = "100%";
    nextLabel.textContent = "وصلت إلى القمة! حافظ على ثباتك 🏆";
  }
}

function renderStats() {
  document.getElementById("stat-best").textContent = arNum(bestStreak(null));
  document.getElementById("stat-full-days").textContent = arNum(countFullDays());
  document.getElementById("stat-week").textContent = `${arNum(weekPercent())}٪`;
}

const GRID_DAYS = 14;

function renderTrackList() {
  const container = document.getElementById("track-list");
  container.innerHTML = "";

  for (const habit of ALL_HABITS) {
    const card = document.createElement("div");
    card.className = "track-card";

    // الرأس: الاسم + الستريك الحالي والأفضل
    const head = document.createElement("div");
    head.className = "track-head";

    const icon = document.createElement("span");
    icon.className = "habit-icon";
    icon.textContent = habit.icon;

    const name = document.createElement("span");
    name.className = "habit-name";
    name.textContent = habit.name;

    const streaks = document.createElement("div");
    streaks.className = "track-streaks";

    const cur = document.createElement("span");
    cur.className = "current";
    cur.textContent = `🔥 ${arNum(currentStreak(habit.id))}`;
    cur.title = "الستريك الحالي";

    const best = document.createElement("span");
    best.className = "best";
    best.textContent = `🏆 ${arNum(bestStreak(habit.id))}`;
    best.title = "أفضل ستريك";

    streaks.append(cur, best);
    head.append(icon, name, streaks);
    card.append(head);

    // شبكة آخر ١٤ يومًا
    const grid = document.createElement("div");
    grid.className = "day-grid";

    for (let i = GRID_DAYS - 1; i >= 0; i--) {
      const day = addDays(new Date(), -i);
      const key = dateKey(day);
      const done = isDone(key, habit.id);

      const cell = document.createElement("span");
      cell.className = "day-cell";
      if (done) {
        cell.classList.add("done");
        cell.textContent = "✔";
      } else if (key === todayKey) {
        cell.classList.add("today-pending");
      }
      cell.title = day.toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" });
      grid.append(cell);
    }

    card.append(grid);

    const caption = document.createElement("div");
    caption.className = "grid-caption";
    caption.innerHTML = `<span>قبل ${arNum(GRID_DAYS)} يومًا</span><span>اليوم</span>`;
    card.append(caption);

    container.append(card);
  }
}

function renderTrack() {
  renderHero();
  renderStats();
  renderTrackList();
}

// ─────────── الاحتفال ───────────

const CONFETTI_COLORS = ["#0e8a68", "#c2410c", "#eda100", "#2a78d6", "#e87ba4"];

function celebrate() {
  const layer = document.getElementById("confetti-layer");
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.right = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDuration = `${2 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.append(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

// ─────────── التنقل بين الصفحتين ───────────

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      document.querySelectorAll(".view").forEach((v) => {
        v.classList.toggle("hidden", v.id !== tab.dataset.view);
      });
      window.scrollTo({ top: 0 });
    });
  });
}

// ─────────── الوضع الليلي ───────────

function setupTheme() {
  const toggle = document.getElementById("theme-toggle");
  const saved = localStorage.getItem("thabat:theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));

  toggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("thabat:theme", next);
    applyTheme(next);
  });

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    toggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

// ─────────── تغيّر اليوم أثناء فتح التطبيق ───────────

function watchDayChange() {
  setInterval(() => {
    const nowKey = dateKey(new Date());
    if (nowKey !== todayKey) {
      todayKey = nowKey;
      document.getElementById("tomorrow-note").value = getDay(todayKey).note || "";
      renderToday();
      renderTrack();
    }
  }, 60 * 1000);
}

// ─────────── التشغيل ───────────

setupTheme();
setupTabs();
setupNote();
renderToday();
renderTrack();
watchDayChange();
