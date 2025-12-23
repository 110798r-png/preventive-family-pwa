// === PREVENTIVE Family PWA 2.0 ===
// Автор: Вероника + Grimoire 🧙‍♂️

// === Константы ===
const STORAGE_KEY = "preventive_family_pwa_v2";
const SCHEMA_VERSION = 2;
const DOCTOR_PIN = "2580";

let state = {};
let toastTimeout = null;
let brandTapTimes = [];
let tapSequence = [];
let pwaHintShown = false;

// === Хелперы ===
function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(16).slice(2);
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ageFromDob(dob) {
  if (!dob) return { years: 0, months: 0, totalMonths: 0 };
  const now = new Date();
  const d = new Date(dob + "T00:00:00");
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  const totalMonths = Math.max(0, months);
  const years = Math.floor(totalMonths / 12);
  const rem = totalMonths % 12;
  return { years, months: rem, totalMonths };
}

function formTypeFor(dob) {
  const a = ageFromDob(dob);
  if (a.totalMonths < 24) return "Дети до 2 лет";
  if (a.years >= 7 && a.years < 18) return "Подростки";
  if (a.years >= 18) return "Взрослые";
  return "Дети";
}

function fmtMemberMeta(m) {
  const a = ageFromDob(m.dob);
  const ageStr =
    a.totalMonths < 24 ? `${a.years} г ${a.months} мес` : `${a.years} лет`;
  return `${ageStr} • ${formTypeFor(m.dob)}`;
}

// === Doctor defaults ===
function defaultDoctorProfile() {
  return {
    name: "Имя Фамилия",
    title: "Врач превентивной медицины",
    subtitle: "Работаю с семьями: питание, сон и анализы в одной системе.",
    aboutText:
      "Я помогаю семьям шаг за шагом улучшить здоровье без запугивания. Работаю на стыке педиатрии, нутрициологии и психосоматики.",
    educationText: "• Медицинский вуз / педиатрия\n• Курсы по превентивной медицине\n• Обучение по работе с семейными кейсами",
    methodText: "1. Как подготовиться к первой консультации\n2. Какие анализы нужны\n3. Как вести дневник самочувствия",
    guidesText: "Сон, Питание, Кишечник, Гормоны, Дети",
    story1Title: "Сон ребёнка",
    story1Text: "Как перевели семью с ночных просыпаний на стабильный сон.",
    story2Title: "Хроническая усталость",
    story2Text: "Как нормализовали анализы и режим дня.",
    story3Title: "Кишечник",
    story3Text: "Про питание, микробиоту и вздутие.",
    avatar: null,
    educationImages: [],
    storyImages: [],
  };
}

// === Demo Patients ===
function defaultMember({ name, dob, sex, relation }) {
  return {
    id: uid("m"),
    relation: relation || "член семьи",
    name,
    dob,
    sex,
    anketa: null,
    labs: {},
    chats: [
      {
        from: "doctor",
        text: "Здравствуйте! Заполните анкету и при необходимости напишите в чат.",
        ts: Date.now(),
      },
    ],
    consult: { urgent: "none", prev: "none" },
  };
}

function makeDemoPatients() {
  const p1 = {
    id: "p1",
    name: "Никита Прославенко",
    phone: "+79995550011",
    createdAt: new Date().toISOString(),
    members: [],
    selectedMemberId: null,
  };
  const m1 = defaultMember({
    name: "Никита Прославенко",
    dob: "1996-03-10",
    sex: "m",
    relation: "я",
  });
  const m2 = defaultMember({
    name: "Анна Прославенко",
    dob: "1998-11-02",
    sex: "f",
    relation: "жена",
  });
  const m3 = defaultMember({
    name: "Марк Прославенко",
    dob: "2021-08-18",
    sex: "m",
    relation: "ребёнок",
  });
  p1.members = [m1, m2, m3];
  p1.selectedMemberId = m1.id;
  return [p1];
}

// === State initialization ===
function initialState() {
  const patients = makeDemoPatients();
  return {
    schemaVersion: SCHEMA_VERSION,
    page: "home",
    memberTab: "overview",
    doctorProfile: defaultDoctorProfile(),
    patients,
    activePatientId: patients[0].id,
    doctorActivePatientId: patients[0].id,
    doctorView: "patients",
    mode: "patient",
    doctorStatus: "offline",
    notifications: [],
    paymentRequests: [],
    toast: "",
    uiAddMemberOpen: false,
    uiAnketaOpen: false,
    uiMenuOpen: false,
    uiRegisterOpen: false,
    uiDoctorEditOpen: false,
    uiDoctorPinModal: false,
    uiViewStory: null,
  };
}

function ensureMemberShape(m) {
  if (!m) return null;
  return {
    id: m.id || uid("m"),
    relation: m.relation || "член семьи",
    name: m.name || "Без имени",
    dob: m.dob || "2000-01-01",
    sex: m.sex || "f",
    anketa: m.anketa || null,
    labs: m.labs || {},
    chats:
      Array.isArray(m.chats) && m.chats.length
        ? m.chats
        : [
            {
              from: "doctor",
              text: "Здравствуйте! Заполните анкету и при необходимости напишите в чат.",
              ts: Date.now(),
            },
          ],
    consult: m.consult || { urgent: "none", prev: "none" },
  };
}

function loadState() {
  let base = initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== SCHEMA_VERSION) {
      console.log("❗ Обновление схемы данных, перегенерация");
      return base;
    }
    Object.assign(base, saved);
    if (Array.isArray(base.patients)) {
      base.patients = base.patients.map((p) => {
        const pp = Object.assign({}, p);
        if (!Array.isArray(pp.members)) pp.members = [];
        pp.members = pp.members.map((m) => ensureMemberShape(m));
        if (!pp.selectedMemberId && pp.members[0])
          pp.selectedMemberId = pp.members[0].id;
        return pp;
      });
    }
    base.toast = "";
    base.uiAddMemberOpen = false;
    base.uiAnketaOpen = false;
    base.uiMenuOpen = false;
    base.uiRegisterOpen = false;
    base.uiDoctorEditOpen = false;
    base.uiDoctorPinModal = false;
    return base;
  } catch (e) {
    console.warn("Ошибка загрузки состояния", e);
    return base;
  }
}

function saveState() {
  try {
    const {
      toast,
      uiAddMemberOpen,
      uiAnketaOpen,
      uiMenuOpen,
      uiRegisterOpen,
      uiDoctorEditOpen,
      uiDoctorPinModal,
      uiViewStory,
      ...rest
    } = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch (e) {
    console.warn("Ошибка сохранения состояния", e);
  }
}

// === Toast ===
function showToast(msg) {
  state.toast = msg;
  render();
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    state.toast = "";
    render();
  }, 1700);
}

// === Helpers ===
function getActivePatient() {
  if (!Array.isArray(state.patients) || !state.patients.length) return null;
  return (
    state.patients.find((p) => p.id === state.activePatientId) ||
    state.patients[0]
  );
}

function getActiveMember() {
  const p = getActivePatient();
  if (!p || !Array.isArray(p.members) || !p.members.length) return null;
  const mid = p.selectedMemberId || p.members[0].id;
  return p.members.find((m) => m.id === mid) || p.members[0];
}

// === PWA Hint ===
function maybeShowPWAHint() {
  if (pwaHintShown) return;
  if (window.matchMedia("(display-mode: standalone)").matches) return;
  setTimeout(() => {
    showToast("💡 Добавьте приложение на главный экран!");
  }, 5000);
  pwaHintShown = true;
}

// === Init ===
state = loadState();
maybeShowPWAHint();

// === RENDER ===
function render() {
  saveState();
  const app = document.getElementById("app");

  let content = "";
  switch (state.page) {
    case "home":
      content = renderHome();
      break;
    case "family":
      content = renderFamily();
      break;
    case "member":
      content = renderMember();
      break;
    case "doctor":
      content = renderDoctor();
      break;
    default:
      content = renderHome();
  }

  const unread = state.notifications.filter((n) => n.unread).length;
  const isDoctor = state.mode === "doctor";
  const activePatient = getActivePatient();

  app.innerHTML = `
    <div class="flex flex-col h-screen bg-${isDoctor ? "blue-50" : "white"}">
      <header class="flex items-center justify-between p-3 shadow-md bg-white">
        <div id="brand" class="flex items-center gap-2 select-none cursor-pointer">
          <div class="w-9 h-9 bg-blue-100 flex items-center justify-center rounded-full text-blue-600 font-bold">🧬</div>
          <div>
            <div class="font-bold">PREVENTIVE</div>
            <div class="text-xs text-gray-500">${isDoctor ? "Режим врача" : "Режим пациента"}</div>
          </div>
        </div>
        <div class="flex gap-3 items-center">
          <button data-tooltip="Уведомления" id="notifBtn" class="relative">🔔
            ${unread > 0 ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-[5px]">${unread}</span>` : ""}
          </button>
          <button data-tooltip="Меню" id="menuBtn">☰</button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-4">${content}</main>

      ${state.toast ? `<div class="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-xl shadow-lg fade-in">${state.toast}</div>` : ""}
      ${renderModalLayer()}
    </div>
  `;

  bindTopBarEvents();
}

function bindTopBarEvents() {
  const brand = document.getElementById("brand");
  if (brand) {
    brand.onclick = () => {
      const now = Date.now();
      brandTapTimes.push(now);
      brandTapTimes = brandTapTimes.filter((t) => now - t < 800);
      if (brandTapTimes.length >= 4) {
        brandTapTimes = [];
        state.uiDoctorPinModal = true;
        showToast("🔒 Вход врача");
        render();
      }
    };
  }

  const notifBtn = document.getElementById("notifBtn");
  if (notifBtn) notifBtn.onclick = () => toggleNotifModal();

  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn) menuBtn.onclick = () => (state.uiMenuOpen = !state.uiMenuOpen, render());
}

// === Pages ===
function renderHome() {
  const d = state.doctorProfile;
  return `
    <div class="space-y-5">
      <div class="bg-white rounded-2xl shadow p-4">
        <div class="flex gap-4 items-center">
          <div class="w-20 h-20 rounded-full overflow-hidden bg-blue-50 flex items-center justify-center">
            ${d.avatar ? `<img src="${d.avatar}" class="object-cover w-full h-full">` : "🩺"}
          </div>
          <div>
            <h2 class="text-lg font-semibold">${escapeHtml(d.name)}</h2>
            <p class="text-gray-500">${escapeHtml(d.title)}</p>
          </div>
        </div>
        <p class="mt-3">${escapeHtml(d.aboutText)}</p>
        ${state.mode === "doctor"
          ? `<button class="text-blue-600 mt-3 text-sm underline" onclick="openDoctorEdit()">Редактировать</button>`
          : ""}
      </div>

      <div>
        <h3 class="font-semibold mb-2">📚 Моё образование</h3>
        <p>${escapeHtml(d.educationText)}</p>
        <div class="carousel mt-3">
          ${d.educationImages
            .map((img, i) => `<img src="${img}" class="w-24 h-24 rounded-xl object-cover shadow-sm cursor-pointer" onclick="removeDiploma(${i})" data-tooltip="Удалить фото">`)
            .join("")}
        </div>
        ${state.mode === "doctor"
          ? `<button class="text-blue-600 text-sm mt-2" onclick="addDiploma()">+ Добавить фото</button>`
          : ""}
      </div>

      <div>
        <h3 class="font-semibold mb-2">📖 Истории</h3>
        <div class="carousel">
          ${renderStories()}
        </div>
      </div>

      <button class="mt-4 bg-blue-600 text-white px-4 py-3 rounded-2xl w-full font-semibold" onclick="openFamily()">👨‍👩‍👧 Моя семья</button>
    </div>
  `;
}

function renderStories() {
  const d = state.doctorProfile;
  const imgs = d.storyImages;
  if (!imgs.length) return `<p class="text-gray-500 text-sm">Историй пока нет</p>`;
  return imgs
    .map(
      (img, i) => `
      <div class="flex flex-col items-center cursor-pointer" onclick="viewStory(${i})">
        <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200">
          <img src="${img}" class="object-cover w-full h-full">
        </div>
        <span class="text-xs mt-1">${d["story" + (i + 1) + "Title"] || "История"}</span>
      </div>`
    )
    .join("");
}

function renderFamily() {
  const p = getActivePatient();
  return `
    <div>
      <h2 class="font-semibold text-lg mb-2">Семья</h2>
      <div class="space-y-2">
        ${p.members
          .map(
            (m) => `
          <div class="bg-white rounded-2xl p-3 shadow-sm flex justify-between items-center cursor-pointer" onclick="openMember('${m.id}')">
            <div>
              <div class="font-semibold">${escapeHtml(m.name)}</div>
              <div class="text-sm text-gray-500">${fmtMemberMeta(m)}</div>
            </div>
            <div class="text-gray-400">›</div>
          </div>`
          )
          .join("")}
      </div>
      <div class="mt-4 flex gap-3">
        <button class="bg-blue-600 text-white px-4 py-2 rounded-xl flex-1" onclick="addMember()">+ Добавить</button>
        <button class="text-gray-500 flex-1 border rounded-xl" onclick="deletePatient()">Удалить аккаунт</button>
      </div>
    </div>`;
}

function renderMember() {
  const m = getActiveMember();
  if (!m) return `<p>Нет выбранного члена семьи</p>`;
  const tabs = ["overview", "anketa", "labs", "chat", "consult"];
  const labels = {
    overview: "Обзор",
    anketa: "Анкета",
    labs: "Анализы",
    chat: "Чат",
    consult: "Консультации",
  };
  const content = {
    overview: renderMemberOverview(m),
    anketa: renderMemberAnketa(m),
    labs: renderMemberLabs(m),
    chat: renderMemberChat(m),
    consult: renderMemberConsult(m),
  }[state.memberTab];

  return `
    <div>
      <div class="flex justify-between mb-3">
        <button class="text-blue-600 text-sm" onclick="openFamily()">← Назад</button>
        <div class="font-semibold">${escapeHtml(m.name)}</div>
      </div>
      <div class="flex justify-around text-sm mb-3 border-b">
        ${tabs
          .map(
            (t) => `
          <button class="py-2 ${state.memberTab === t ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"}" onclick="state.memberTab='${t}';render()">${labels[t]}</button>`
          )
          .join("")}
      </div>
      <div>${content}</div>
    </div>`;
}

function renderMemberOverview(m) {
  return `
    <div class="space-y-3">
      <p class="text-gray-600">${fmtMemberMeta(m)}</p>
      ${m.anketa
        ? `<div class="bg-white rounded-2xl p-3 shadow-sm"><h3 class="font-semibold mb-1">Цель:</h3><p>${escapeHtml(m.anketa.goal)}</p><h3 class="font-semibold mt-2 mb-1">Жалобы:</h3><p>${escapeHtml(m.anketa.complaints)}</p></div>`
        : `<p class="text-gray-500 text-sm">Анкета не заполнена</p>`}
      ${state.mode === "patient" && m.anketa
        ? `<button class="text-red-500 text-sm underline" onclick="deleteAnketa('${m.id}')">Удалить анкету</button>`
        : ""}
    </div>`;
}

function renderMemberAnketa(m) {
  if (state.mode === "doctor") {
    return m.anketa
      ? `<div class="bg-white rounded-xl p-3"><p><b>Цель:</b> ${escapeHtml(
          m.anketa.goal
        )}</p><p class="mt-2"><b>Жалобы:</b> ${escapeHtml(
          m.anketa.complaints
        )}</p></div>`
      : `<p class="text-gray-500 text-sm">Анкета не заполнена</p>`;
  }
  if (!m.anketa)
    return `<button class="bg-blue-600 text-white px-4 py-2 rounded-xl" onclick="openAnketa('${m.id}')">Заполнить анкету</button>`;
  return `
    <div class="bg-white p-3 rounded-xl">
      <h3 class="font-semibold mb-2">Анкета</h3>
      <p><b>Цель:</b> ${escapeHtml(m.anketa.goal)}</p>
      <p class="mt-2"><b>Жалобы:</b> ${escapeHtml(m.anketa.complaints)}</p>
      <button class="text-blue-600 text-sm mt-2" onclick="openAnketa('${m.id}')">Редактировать</button>
    </div>`;
}

function renderMemberLabs() {
  return `<p class="text-gray-500 text-sm">🔬 Раздел “Анализы” появится в следующей версии</p>`;
}

function renderMemberChat(m) {
  return `
    <div class="flex flex-col h-[70vh] bg-white rounded-2xl shadow-inner p-3">
      <div class="flex-1 overflow-y-auto space-y-2" id="chatBox">
        ${m.chats
          .map(
            (msg) => `
          <div class="flex ${msg.from === "patient" ? "justify-end" : "justify-start"}">
            <div class="${msg.from === "patient"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-800"} px-3 py-2 rounded-xl max-w-[75%] shadow">
              ${escapeHtml(msg.text)}
              <div class="text-[10px] text-gray-300 mt-1">${formatDate(
                msg.ts
              )}</div>
            </div>
          </div>`
          )
          .join("")}
      </div>
      ${state.mode === "patient"
        ? `<div class="mt-2 flex gap-2">
            <input id="chatInput" class="border flex-1 rounded-xl p-2 text-sm" placeholder="Написать сообщение..." />
            <button class="bg-blue-600 text-white rounded-xl px-3" onclick="sendChat('${m.id}')">➤</button>
          </div>`
        : ""}
    </div>`;
}

function renderMemberConsult(m) {
  const sUrg = m.consult.urgent;
  const sPrev = m.consult.prev;
  const patientMode = state.mode === "patient";
  return `
    <div class="space-y-4">
      <div class="bg-white rounded-2xl p-3 shadow-sm">
        <h3 class="font-semibold">Срочная консультация</h3>
        <p class="text-sm text-gray-500">Статус: ${consultStatusLabel(sUrg)}</p>
        ${patientMode && sUrg === "none"
          ? `<button class="bg-blue-600 text-white rounded-xl px-4 py-2 mt-2" onclick="createPaymentRequest('${m.id}','urgent')">Оплачено</button>`
          : ""}
      </div>
      <div class="bg-white rounded-2xl p-3 shadow-sm">
        <h3 class="font-semibold">Превентивная консультация</h3>
        <p class="text-sm text-gray-500">Статус: ${consultStatusLabel(sPrev)}</p>
        ${patientMode && sPrev === "none"
          ? `<button class="bg-blue-600 text-white rounded-xl px-4 py-2 mt-2" onclick="createPaymentRequest('${m.id}','prev')">Оплачено</button>`
          : ""}
      </div>
    </div>`;
}

function consultStatusLabel(s) {
  return {
    none: "нет",
    pending: "ожидание",
    active: "активна",
  }[s] || s;
}

// === Doctor Page ===
function renderDoctor() {
  const patients = state.patients;
  return `
  <div class="space-y-4">
    <h2 class="font-semibold text-lg">🩺 Кабинет врача</h2>
    <div class="space-y-2">
      ${patients.map((p) => `
        <div class="bg-white rounded-xl p-3 shadow-sm cursor-pointer" onclick="openDoctorPatient('${p.id}')">
          <div class="font-semibold">${escapeHtml(p.name)}</div>
          <div class="text-sm text-gray-500">${p.phone}</div>
        </div>
      `).join('')}
    </div>
    <div class="pt-4">
      <button class="text-blue-600 text-sm" onclick="logoutDoctor()">🚪 Выйти из режима врача</button>
    </div>
  </div>`;
}

function openDoctorPatient(pid) {
  state.doctorActivePatientId = pid;
  const p = state.patients.find(x => x.id === pid);
  if (!p) return;
  let pending = state.paymentRequests.filter(r => r.patientId === pid && r.status === 'pending');
  const family = p.members.map(m => `
    <div class="bg-white rounded-xl p-3 shadow-sm">
      <div class="font-semibold">${m.name}</div>
      <div class="text-sm text-gray-500">${fmtMemberMeta(m)}</div>
      ${m.anketa ? `<p class="mt-2 text-sm">Анкета: ${escapeHtml(m.anketa.goal)}</p>` : ''}
      <button class="text-blue-600 text-sm mt-2" onclick="openMember('${m.id}')">Открыть</button>
    </div>`).join('');
  let payReq = pending.map(r => `
    <div class="bg-yellow-50 rounded-xl p-3 flex justify-between items-center">
      <div>
        <div class="font-semibold">${escapeHtml(p.name)}</div>
        <div class="text-sm text-gray-600">${r.type === 'urgent' ? 'Срочная' : 'Превентивная'} консультация</div>
      </div>
      <div class="flex gap-2">
        <button class="bg-green-500 text-white px-3 py-1 rounded-xl text-sm" onclick="confirmPayment('${r.id}')">Подтв.</button>
        <button class="bg-red-500 text-white px-3 py-1 rounded-xl text-sm" onclick="rejectPayment('${r.id}')">Откл.</button>
      </div>
    </div>`).join('');
  document.querySelector('main').innerHTML = `
    <div class="space-y-4">
      <h2 class="font-semibold text-lg">Пациент: ${p.name}</h2>
      ${payReq || '<p class="text-sm text-gray-500">Нет ожидающих оплат</p>'}
      <h3 class="font-semibold mt-4 mb-2">Семья</h3>
      ${family}
      <button class="text-blue-600 text-sm mt-3" onclick="render()">← Назад</button>
    </div>`;
}

// === Modals ===
function renderModalLayer() {
  let html = "";
  if (state.uiDoctorPinModal) html += renderPinModal();
  if (state.uiRegisterOpen) html += renderRegisterModal();
  if (state.uiAnketaOpen) html += renderAnketaModal();
  if (state.uiMenuOpen) html += renderMenu();
  if (state.uiDoctorEditOpen) html += renderDoctorEditor();
  if (state.uiViewStory !== null) html += renderStoryView();
  return html;
}

function renderPinModal() {
  return `
  <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center fade-in">
    <div class="bg-white p-5 rounded-2xl w-80 text-center">
      <h3 class="font-semibold mb-3">Введите PIN врача</h3>
      <input id="pinInput" class="border p-2 rounded-lg text-center tracking-widest w-24 text-xl mb-3" maxlength="4" autofocus>
      <div class="flex justify-center gap-3">
        <button class="bg-blue-600 text-white px-4 py-2 rounded-xl" onclick="checkPin()">Войти</button>
        <button class="text-gray-500 px-4 py-2" onclick="closePin()">Отмена</button>
      </div>
    </div>
  </div>`;
}
function checkPin() {
  const val = document.getElementById("pinInput").value;
  if (val === DOCTOR_PIN) {
    state.mode = "doctor";
    state.page = "doctor";
    state.uiDoctorPinModal = false;
    showToast("🩺 Добро пожаловать, доктор!");
    try { navigator.vibrate([30, 50, 30]); } catch (e) {}
  } else showToast("Неверный PIN");
  render();
}
function closePin() {
  state.uiDoctorPinModal = false;
  render();
}

// === Меню ===
function renderMenu() {
  const isDoc = state.mode === "doctor";
  return `
  <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center fade-in">
    <div class="bg-white w-72 rounded-2xl p-4">
      <h3 class="font-semibold mb-2">Меню</h3>
      <div class="space-y-2">
        <button class="w-full text-left px-3 py-2 rounded-xl bg-gray-100" onclick="state.page='home';state.uiMenuOpen=false;render()">🏠 Главная</button>
        <button class="w-full text-left px-3 py-2 rounded-xl bg-gray-100" onclick="state.page='family';state.uiMenuOpen=false;render()">👨‍👩‍👧 Семья</button>
        ${isDoc ? `<button class="w-full text-left px-3 py-2 rounded-xl bg-gray-100" onclick="state.page='doctor';state.uiMenuOpen=false;render()">🩺 Кабинет врача</button>` : ""}
        <button class="w-full text-left px-3 py-2 rounded-xl bg-gray-100" onclick="state.uiMenuOpen=false;render()">✖ Закрыть</button>
      </div>
    </div>
  </div>`;
}

// === Анкета ===
function openAnketa(id) {
  state.uiAnketaOpen = id;
  render();
}
function renderAnketaModal() {
  const m = getActivePatient().members.find((x) => x.id === state.uiAnketaOpen);
  return `
  <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center fade-in">
    <div class="bg-white p-5 rounded-2xl w-96 max-w-[90vw]">
      <h3 class="font-semibold mb-3">Анкета ${m.name}</h3>
      <input id="goal" class="border p-2 rounded-xl w-full mb-2" placeholder="Цель" value="${m.anketa?.goal || ""}">
      <textarea id="complaints" rows="3" class="border p-2 rounded-xl w-full" placeholder="Жалобы">${m.anketa?.complaints || ""}</textarea>
      <div class="flex justify-end gap-3 mt-3">
        <button class="text-gray-500" onclick="closeAnketa()">Отмена</button>
        <button class="bg-blue-600 text-white px-4 py-2 rounded-xl" onclick="saveAnketa('${m.id}')">Сохранить</button>
      </div>
    </div>
  </div>`;
}
function closeAnketa() {
  state.uiAnketaOpen = false;
  render();
}
function saveAnketa(mid) {
  const p = getActivePatient();
  const m = p.members.find((x) => x.id === mid);
  m.anketa = {
    goal: document.getElementById("goal").value,
    complaints: document.getElementById("complaints").value,
  };
  m.chats.push({ from: "patient", text: "Заполнил(а) анкету ✅", ts: Date.now() });
  m.chats.push({ from: "doctor", text: "Принял(а) анкету. Можете задать вопросы.", ts: Date.now() });
  state.uiAnketaOpen = false;
  showToast("Анкета сохранена");
  render();
}
function deleteAnketa(mid) {
  const p = getActivePatient();
  const m = p.members.find((x) => x.id === mid);
  if (!m.anketa) return;
  if (confirm("Удалить анкету?")) {
    m.anketa = null;
    showToast("Анкета удалена");
    render();
  }
}

// === Чат ===
function sendChat(mid) {
  const input = document.getElementById("chatInput");
  if (!input || !input.value.trim()) return;
  const p = getActivePatient();
  const m = p.members.find((x) => x.id === mid);
  const msg = { from: "patient", text: input.value.trim(), ts: Date.now() };
  m.chats.push(msg);
  input.value = "";
  render();
  scrollChatDown();
  setTimeout(() => autoReply(m), 1500);
}
function autoReply(m) {
  m.chats.push({ from: "doctor", text: "Спасибо, я получил(а) сообщение. Ответ будет на консультации.", ts: Date.now() });
  render();
  scrollChatDown();
}
function scrollChatDown() {
  const el = document.getElementById("chatBox");
  if (el) el.scrollTop = el.scrollHeight;
}

// === Регистрация ===
function renderRegisterModal() {
  return `
  <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center fade-in">
    <div class="bg-white p-5 rounded-2xl w-80">
      <h3 class="font-semibold mb-3">Регистрация</h3>
      <input id="regName" class="border p-2 rounded-xl w-full mb-2" placeholder="ФИО">
      <input id="regPhone" class="border p-2 rounded-xl w-full mb-2" placeholder="Телефон">
      <div class="flex justify-end gap-3">
        <button class="text-gray-500" onclick="state.uiRegisterOpen=false;render()">Отмена</button>
        <button class="bg-blue-600 text-white px-4 py-2 rounded-xl" onclick="registerPatient()">Сохранить</button>
      </div>
    </div>
  </div>`;
}
function registerPatient() {
  const name = document.getElementById("regName").value;
  const phone = document.getElementById("regPhone").value;
  if (!name || !phone) return alert("Введите имя и телефон");
  const p = { id: uid("p"), name, phone, members: [], selectedMemberId: null };
  state.patients.push(p);
  state.activePatientId = p.id;
  state.uiRegisterOpen = false;
  showToast("Регистрация завершена");
  render();
}

// === Уведомления и оплаты ===
function toggleNotifModal() {
  if (!state.notifications.length) {
    showToast("Нет уведомлений");
    return;
  }
  alert(
    state.notifications
      .map((n) => `${n.title}: ${n.body}`)
      .join("\n") || "Нет уведомлений"
  );
  state.notifications.forEach((n) => (n.unread = false));
  render();
}

function createPaymentRequest(mid, type) {
  const p = getActivePatient();
  const req = {
    id: uid("req"),
    patientId: p.id,
    memberId: mid,
    type,
    status: "pending",
    createdAt: Date.now(),
  };
  state.paymentRequests.push(req);
  pushNotif("💳 Оплата", "Отправлена заявка врачу");
  const m = p.members.find((x) => x.id === mid);
  m.consult[type] = "pending";
  render();
}

function confirmPayment(id) {
  const req = state.paymentRequests.find((r) => r.id === id);
  if (!req) return;
  req.status = "confirmed";
  const p = state.patients.find((x) => x.id === req.patientId);
  const m = p.members.find((x) => x.id === req.memberId);
  m.consult[req.type] = "active";
  pushNotif("✅ Оплата подтверждена", `${p.name} — ${req.type} консультация активна`);
  render();
}

function rejectPayment(id) {
  const req = state.paymentRequests.find((r) => r.id === id);
  if (!req) return;
  req.status = "rejected";
  const p = state.patients.find((x) => x.id === req.patientId);
  const m = p.members.find((x) => x.id === req.memberId);
  m.consult[req.type] = "none";
  pushNotif("❌ Оплата отклонена", `${p.name} — ${req.type} консультация отклонена`);
  render();
}

function pushNotif(title, body) {
  state.notifications.unshift({ id: uid("n"), title, body, unread: true, ts: Date.now() });
}

// === Doctor Editor ===
function openDoctorEdit() {
  state.uiDoctorEditOpen = true;
  render();
}
function renderDoctorEditor() {
  const d = state.doctorProfile;
  return `
  <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center fade-in">
    <div class="bg-white p-5 rounded-2xl w-[90%] max-w-md overflow-y-auto max-h-[90vh]">
      <h3 class="font-semibold text-lg mb-3">Редактировать профиль врача</h3>
      <input id="docName" class="border p-2 rounded-xl w-full mb-2" value="${d.name}" placeholder="Имя">
      <input id="docTitle" class="border p-2 rounded-xl w-full mb-2" value="${d.title}" placeholder="Должность">
      <textarea id="docAbout" class="border p-2 rounded-xl w-full mb-2" rows="3" placeholder="О себе">${d.aboutText}</textarea>
      <textarea id="docEdu" class="border p-2 rounded-xl w-full mb-2" rows="2" placeholder="Образование">${d.educationText}</textarea>
      <textarea id="docGuides" class="border p-2 rounded-xl w-full mb-2" rows="2" placeholder="Гайды">${d.guidesText}</textarea>
      <p class="font-semibold mt-3">Аватар:</p>
      <input type="file" id="docAvatar" accept="image/*" onchange="uploadAvatar(event)">
      <div class="flex justify-end gap-3 mt-4">
        <button class="text-gray-500" onclick="state.uiDoctorEditOpen=false;render()">Отмена</button>
        <button class="bg-blue-600 text-white px-4 py-2 rounded-xl" onclick="saveDoctorProfile()">Сохранить</button>
      </div>
    </div>
  </div>`;
}
function uploadAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.doctorProfile.avatar = ev.target.result;
    render();
  };
  reader.readAsDataURL(file);
}
function saveDoctorProfile() {
  const d = state.doctorProfile;
  d.name = document.getElementById("docName").value;
  d.title = document.getElementById("docTitle").value;
  d.aboutText = document.getElementById("docAbout").value;
  d.educationText = document.getElementById("docEdu").value;
  d.guidesText = document.getElementById("docGuides").value;
  state.uiDoctorEditOpen = false;
  pushNotif("✅ Сохранено", "Профиль врача обновлён");
  render();
}

// === Stories ===
function viewStory(i) {
  state.uiViewStory = i;
  render();
}
function renderStoryView() {
  const d = state.doctorProfile;
  const i = state.uiViewStory;
  return `
  <div class="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center text-white fade-in">
    <img src="${d.storyImages[i]}" class="max-h-[70vh] rounded-xl mb-3">
    <div>${d["story" + (i + 1) + "Title"] || ""}</div>
    <div class="mt-4 flex gap-4">
      <button onclick="prevStory()">⬅</button>
      <button onclick="nextStory()">➡</button>
      <button onclick="state.uiViewStory=null;render()">✖</button>
    </div>
  </div>`;
}
function nextStory() {
  const d = state.doctorProfile;
  const i = (state.uiViewStory + 1) % d.storyImages.length;
  state.uiViewStory = i;
  render();
}
function prevStory() {
  const d = state.doctorProfile;
  const i = (state.uiViewStory - 1 + d.storyImages.length) % d.storyImages.length;
  state.uiViewStory = i;
  render();
}

// === Add diploma ===
function addDiploma() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.doctorProfile.educationImages.push(ev.target.result);
      showToast("📸 Фото добавлено");
      render();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}
function removeDiploma(i) {
  if (confirm("Удалить фото?")) {
    state.doctorProfile.educationImages.splice(i, 1);
    render();
  }
}

// === Навигация ===
function openFamily() { state.page = "family"; render(); }
function openMember(id) {
  const p = getActivePatient();
  p.selectedMemberId = id;
  state.page = "member";
  state.memberTab = "overview";
  render();
}
function logoutDoctor() {
  state.mode = "patient";
  state.page = "home";
  showToast("🚪 Выход из режима врача");
  render();
}
function addMember() {
  const p = getActivePatient();
  const name = prompt("Имя члена семьи:");
  if (!name) return;
  const dob = prompt("Дата рождения (гггг-мм-дд):");
  const sex = prompt("Пол (m/f):", "m");
  const relation = prompt("Роль (я/муж/жена/ребёнок):", "ребёнок");
  const m = defaultMember({ name, dob, sex, relation });
  p.members.push(m);
  showToast("Добавлен новый член семьи");
  render();
}
function deletePatient() {
  if (confirm("Удалить аккаунт пациента?")) {
    state.patients = state.patients.filter(p => p.id !== state.activePatientId);
    if (state.patients.length === 0) {
      state.uiRegisterOpen = true;
    }
    showToast("Аккаунт удалён");
    render();
  }
}

// === Init render ===
render();
