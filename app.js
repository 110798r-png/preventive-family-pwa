// === Константы и справочники ===
const STORAGE_KEY = "prev_family_pwa_plain_v1";
const DOCTOR_PIN = "2580";

let state; // заполним чуть ниже
let toastTimeout = null;
let brandTapTimes = [];

// === Хелперы ===
function uid(prefix = "id") {
  return (
    prefix +
    "_" +
    Math.random().toString(16).slice(2) +
    "_" +
    Math.random().toString(16).slice(2)
  );
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  // для data-атрибутов
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function ageFromDob(dob) {
  if (!dob) return { years: 0, months: 0, totalMonths: 0 };
  const now = new Date();
  const d = new Date(dob + "T00:00:00");
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth());
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
    a.totalMonths < 24
      ? `${a.years} г ${a.months} мес`
      : `${a.years} лет`;
  return `${ageStr} • ${formTypeFor(m.dob)}`;
}

// === Доктор, пациенты, демо-данные ===
function defaultDoctorProfile() {
  return {
    name: "Имя Фамилия",
    title: "Врач превентивной медицины",
    subtitle:
      "Работаю с семьями: сон, питание, анализы и образ жизни в одной системе.",
    educationText:
      "• Медицинский вуз / педиатрия / терапия\n" +
      "• Курсы по превентивной медицине и нутрициологии\n" +
      "• Обучение по работе с семейными кейсами",
    aboutText:
      "Здесь вы можете рассказать, как вы работаете: без запугивания, с уважением к пациенту, шаг за шагом.",
    methodText:
      "1. Как подготовиться к первой консультации.\n" +
      "2. Какие анализы обычно нужны.\n" +
      "3. Как вести дневник самочувствия.",
    guidesText: "Сон, Питание, Кишечник, Гормоны, Дети",
    story1Title: "Сон ребенка",
    story1Text:
      "Как перевели семью с ночных просыпаний на стабильный сон.",
    story2Title: "Хроническая усталость",
    story2Text:
      "Кейс, где анализы и режим дня вернули энергию.",
    story3Title: "Кишечник",
    story3Text:
      "История про вздутие, питание и микробиоту.",
  };
}

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
    consult: {
      urgent: "none",
      prev: "none",
    },
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

  const p2 = {
    id: "p2",
    name: "Амина Ахмедова",
    phone: "+79990000022",
    createdAt: new Date().toISOString(),
    members: [],
    selectedMemberId: null,
  };

  const m21 = defaultMember({
    name: "Амина Ахмедова",
    dob: "2001-05-01",
    sex: "f",
    relation: "я",
  });
  const m22 = defaultMember({
    name: "Али",
    dob: "2024-02-14",
    sex: "m",
    relation: "ребёнок",
  });

  p2.members = [m21, m22];
  p2.selectedMemberId = m21.id;

  return [p1, p2];
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

// === State ===
function initialState() {
  const patients = makeDemoPatients();
  return {
    page: "home", // home | family | member | doctor
    memberTab: "overview",
    doctorProfile: defaultDoctorProfile(),
    patients,
    activePatientId: patients[0]?.id || null,
    doctorActivePatientId: patients[0]?.id || null,

    // НОВОЕ: кто сейчас сидит в приложении и какой статус у врача
    mode: "patient",          // "patient" | "doctor"
    doctorStatus: "offline",  // "online" | "offline"

    notifications: [],
    paymentRequests: [],
    toast: "",
    uiAddMemberOpen: false,
    uiAnketaOpen: false,
    uiMenuOpen: false,
  };
}

function loadState() {
  let base = initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return base;

    base = Object.assign(base, saved);

        // НОВОЕ: дефолты для новых полей
    if (!base.mode) base.mode = "patient";
    if (!base.doctorStatus) base.doctorStatus = "offline";

    if (Array.isArray(base.patients)) {
      base.patients = base.patients.map((p) => {
        const pp = Object.assign({}, p);
        if (!Array.isArray(pp.members)) pp.members = [];
        pp.members = pp.members.map((m) => ensureMemberShape(m));
        if (!pp.selectedMemberId && pp.members[0]) {
          pp.selectedMemberId = pp.members[0].id;
        }
        return pp;
      });
    }

    if (!base.activePatientId && base.patients[0]) {
      base.activePatientId = base.patients[0].id;
    }
    if (!base.doctorActivePatientId && base.patients[0]) {
      base.doctorActivePatientId = base.patients[0].id;
    }

    base.toast = "";
    base.uiAddMemberOpen = false;
    base.uiAnketaOpen = false;
    base.uiMenuOpen = false;

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
      ...rest
    } = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch (e) {
    console.warn("Ошибка сохранения состояния", e);
  }
}

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

function showToast(msg) {
  state.toast = msg;
  render();
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    state.toast = "";
    render();
  }, 1700);
}

// === Рендер ===
function renderTopBar(activePatient) {
  const unread = state.notifications.filter((n) => n.unread).length;
  const title =
    state.page === "home" ? "Главный экран врача" : "Личный кабинет";
  const name = activePatient ? activePatient.name : "Пациент не выбран";
  const phone = activePatient ? activePatient.phone : "";

  const modeLabel =
    state.mode === "doctor" ? "Режим: врач" : "Режим: пациент";
  const statusText =
    state.mode === "doctor"
      ? ` • Статус врача: ${
          state.doctorStatus === "online" ? "онлайн" : "оффлайн"
        }`
      : "";

  return `
    <div class="px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
      <div class="flex items-center justify-between">
        <button data-action="brand-tap" class="flex items-center gap-3 text-left active:scale-95 transition">
          <div class="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xl">🧬</div>
          <div>
            <div class="font-semibold text-gray-900 leading-tight">PREVENTIVE</div>
            <div class="text-xs text-gray-500 -mt-0.5">Светлая тема · предпросмотр</div>
          </div>
        </button>
        <div class="flex items-center gap-2">
          <button data-action="bell-read" class="px-3 py-1.5 rounded-2xl border border-gray-300 text-xs bg-gray-50 text-gray-700 active:scale-95 transition">
            🔔 <span class="ml-1 font-semibold">${unread}</span>
          </button>
          <button data-action="open-menu" class="px-3 py-1.5 rounded-2xl border border-gray-300 text-xs bg-gray-50 text-gray-700 active:scale-95 transition">
            ☰
          </button>
        </div>
      </div>
            <div class="mt-3">
        <div class="text-xs text-gray-500 mb-1">${title}</div>
        <div class="font-semibold text-gray-900 text-sm">${escapeHtml(
          name
        )}</div>
        <div class="text-xs text-gray-500">${escapeHtml(phone)}</div>
        <div class="text-[11px] text-gray-500 mt-0.5">
          ${modeLabel}${statusText}
        </div>
      </div>
  `;
}

function renderStoryCard(title, text) {
  if (!title && !text) return "";
  const t = (title || "").trim();
  const body = (text || "").trim();
  if (!t && !body) return "";
  return `
    <div class="min-w-[180px] max-w-[220px] bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs">
      <div class="font-semibold text-gray-900 mb-1">${escapeHtml(t)}</div>
      <div class="text-gray-700 whitespace-pre-line">${escapeHtml(body)}</div>
    </div>
  `;
}

function renderHome() {
  const d = state.doctorProfile;
  const guides = (d.guidesText || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  return `
    <div class="p-4 space-y-4">
      <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div class="flex gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xl">🩺</div>
          <div class="flex-1">
            <div class="text-xs uppercase text-gray-500 tracking-wide">${escapeHtml(
              d.title
            )}</div>
            <div class="text-lg font-semibold text-gray-900 mt-1">${escapeHtml(
              d.name
            )}</div>
            ${
              d.subtitle
                ? `<div class="text-sm text-gray-600 mt-1">${escapeHtml(
                    d.subtitle
                  )}</div>`
                : ""
            }
            <button data-action="go-page" data-page="family"
              class="w-full mt-3 rounded-2xl bg-gray-900 text-white text-sm py-2.5 active:scale-95 transition">
              👤 Мой профиль
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div class="font-semibold text-gray-900">Моё образование</div>
        <div class="mt-2 text-sm text-gray-700 whitespace-pre-line">${escapeHtml(
          d.educationText
        )}</div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div class="font-semibold text-gray-900">О себе</div>
        <div class="mt-2 text-sm text-gray-700 whitespace-pre-line">${escapeHtml(
          d.aboutText
        )}</div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div class="font-semibold text-gray-900">Методичка</div>
        <div class="mt-2 text-sm text-gray-700 whitespace-pre-line">${escapeHtml(
          d.methodText
        )}</div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div class="font-semibold text-gray-900">Гайды</div>
        <div class="mt-2 flex flex-wrap gap-2">
          ${guides
            .map(
              (g) =>
                `<span class="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">${escapeHtml(
                  g
                )}</span>`
            )
            .join("")}
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div class="font-semibold text-gray-900 mb-2">Истории</div>
        <div class="flex gap-3 overflow-x-auto pb-1">
          ${renderStoryCard(d.story1Title, d.story1Text)}
          ${renderStoryCard(d.story2Title, d.story2Text)}
          ${renderStoryCard(d.story3Title, d.story3Text)}
        </div>
      </div>
    </div>
  `;
}

function renderFamily(activePatient) {
  if (!activePatient) {
    return `<div class="p-4 text-sm text-gray-700">Пациент не выбран</div>`;
  }

  const membersHtml = (activePatient.members || [])
    .map((m) => {
      const labsCount = Object.values(m.labs || {}).reduce(
        (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      const ank = m.anketa ? "заполнена" : "нет";
      const cons =
        (m.consult?.urgent || "none") !== "none" ||
        (m.consult?.prev || "none") !== "none"
          ? "есть"
          : "нет";

      return `
        <button data-action="select-member" data-member-id="${m.id}"
          class="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 active:scale-95 transition">
          <div class="flex justify-between gap-3">
            <div>
              <div class="font-semibold text-gray-900 text-sm">
                ${escapeHtml(m.name)}
                <span class="ml-2 text-xs text-gray-500">
                  (${escapeHtml(m.relation || "член семьи")})
                </span>
              </div>
              <div class="text-xs text-gray-600 mt-0.5">${escapeHtml(
                fmtMemberMeta(m)
              )}</div>
            </div>
            <div class="text-right text-[11px] text-gray-600 space-y-1">
              <div>Анкета: <b>${ank}</b></div>
              <div>Файлы: <b>${labsCount}</b></div>
              <div>Конс: <b>${cons}</b></div>
            </div>
          </div>
        </button>
      `;
    })
    .join("");

  return `
    <div class="p-4 space-y-4">
      <div class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-semibold text-gray-900">Профиль пациента</div>
            <div class="text-sm text-gray-600">
              Внутри — члены семьи и их анкеты
            </div>
          </div>
          <button data-action="open-add-member"
            class="px-3 py-2 rounded-2xl bg-gray-900 text-white text-xs active:scale-95 transition">
            + Добавить
          </button>
        </div>
      </div>
      <div class="space-y-3">
        ${membersHtml}
      </div>
    </div>
  `;
}

function renderMemberOverview(member) {
  const labsCount = Object.values(member.labs || {}).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  const consLabels = [];
  if ((member.consult?.urgent || "none") !== "none")
    consLabels.push("Срочная");
  if ((member.consult?.prev || "none") !== "none")
    consLabels.push("Превентивная");
  const consLabel = consLabels.length ? consLabels.join(" · ") : "нет";

  return `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-2xl border border-gray-200 p-3 text-sm">
          <div class="text-xs text-gray-500">Анкета</div>
          <div class="mt-1 font-semibold text-gray-900">${
            member.anketa ? "Заполнена" : "Не заполнена"
          }</div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 p-3 text-sm">
          <div class="text-xs text-gray-500">Анализы</div>
          <div class="mt-1 font-semibold text-gray-900">${
            labsCount || "Нет"
          } файл(ов)</div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 p-3 text-sm">
          <div class="text-xs text-gray-500">Консультации</div>
          <div class="mt-1 font-semibold text-gray-900">${consLabel}</div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 p-3 text-sm">
          <div class="text-xs text-gray-500">Тип анкеты</div>
          <div class="mt-1 font-semibold text-gray-900">${escapeHtml(
            formTypeFor(member.dob)
          )}</div>
        </div>
      </div>
    </div>
  `;
}

function renderMemberAnketa(member) {
  const updated = member.anketa
    ? new Date(member.anketa.updatedAt).toLocaleString()
    : "Не заполнена";

  const goal = member.anketa?.goal || "—";
  const comp = member.anketa?.complaints || "—";

  return `
    <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="font-semibold text-gray-900">Анкета</div>
          <div class="text-sm text-gray-600 mt-1">${escapeHtml(updated)}</div>
        </div>
        <button data-action="open-anketa"
          class="px-3 py-1.5 rounded-2xl bg-gray-900 text-white text-xs active:scale-95 transition">
          ${member.anketa ? "Обновить" : "Заполнить"}
        </button>
      </div>

      <div class="space-y-3 text-sm">
        <div>
          <div class="text-xs text-gray-500">Цель</div>
          <div class="mt-1 text-gray-900 whitespace-pre-line">${escapeHtml(
            goal
          )}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Жалобы</div>
          <div class="mt-1 text-gray-900 whitespace-pre-line">${escapeHtml(
            comp
          )}</div>
        </div>
      </div>
    </div>
  `;
}

function renderMemberLabs(member) {
  const labsCount = Object.values(member.labs || {}).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  return `
    <div class="bg-white rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
      В этой вкладке позже можно будет загружать файлы анализов по категориям.
      <br/><br/>
      Сейчас у этого члена семьи сохранено файлов: <b>${labsCount}</b>.
    </div>
  `;
}

function renderMemberChat(member) {
  const msgs = member.chats || [];

  const statusLabel =
    state.doctorStatus === "online" ? "Врач онлайн" : "Врач оффлайн";
  const statusClass =
    state.doctorStatus === "online" ? "text-emerald-600" : "text-gray-400";

  const msgsHtml = msgs
    .map((msg) => {
      const isMine =
        (state.mode === "patient" && msg.from === "patient") ||
        (state.mode === "doctor" && msg.from === "doctor");

      let who;
      if (msg.from === "doctor") {
        who = state.mode === "doctor" ? "Вы (врач)" : "Врач";
      } else {
        // from: patient
        who = state.mode === "patient" ? "Вы" : "Пациент";
      }

      return `
        <div class="flex ${isMine ? "justify-end" : "justify-start"}">
          <div class="max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
            isMine
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-900"
          }">
            <div class="text-[10px] opacity-70">
              ${who} · ${new Date(msg.ts).toLocaleString()}
            </div>
            <div class="mt-1 whitespace-pre-line">${escapeHtml(
              msg.text
            )}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-[360px]">
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <div class="font-semibold text-gray-900 text-sm">Чат с врачом</div>
          <div class="text-xs text-gray-600">По выбранному члену семьи</div>
          <div class="text-[11px] mt-0.5 ${statusClass}">
            ${statusLabel}
          </div>
        </div>
      </div>
      <div class="flex-1 px-4 py-3 space-y-2 overflow-y-auto bg-white">
        ${msgsHtml}
      </div>
      <div class="px-3 py-3 border-t border-gray-200 bg-white flex gap-2">
        <input id="chatInput" type="text" placeholder="Напишите сообщение…"
          class="flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none" />
        <button data-action="chat-send"
          class="rounded-2xl bg-gray-900 text-white text-sm px-4 py-2 active:scale-95 transition">
          →
        </button>
      </div>
    </div>
  `;
}

function renderMemberConsult(activePatient, member) {
  const urgentStatus = member.consult?.urgent || "none";
  const prevStatus = member.consult?.prev || "none";

  function statusLabel(st) {
    if (st === "none") return "нет";
    if (st === "pending") return "ожидание";
    if (st === "active") return "активна";
    return st;
  }

  const phone = activePatient ? activePatient.phone : "";
  const baseUrgent = `URGENT • ${phone} • ${member.name}`;
  const basePrev = `PREV • ${phone} • ${member.name}`;

  return `
    <div class="space-y-3">
      <div class="bg-white rounded-2xl border border-gray-200 p-4 text-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold text-gray-900">💬 Срочная консультация</div>
            <div class="text-xs text-gray-600 mt-1">Приоритетный ответ</div>
          </div>
          <div class="text-xs text-gray-600">
            Статус: <b>${statusLabel(urgentStatus)}</b>
          </div>
        </div>
        <div class="mt-3 text-sm text-gray-700">
          Перевод на номер: <b>+7 (999) 000-00-00</b>
        </div>
        <div class="text-xs text-gray-600 mt-1">
          Комментарий: <b>${escapeHtml(baseUrgent)}</b>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button data-action="copy-text" data-text="${escapeAttr(
            baseUrgent
          )}"
            class="px-3 py-2 rounded-2xl bg-gray-100 text-sm active:scale-95 transition">
            Скопировать
          </button>
          <button data-action="consult-pay" data-type="urgent"
            class="px-3 py-2 rounded-2xl bg-gray-900 text-white text-sm active:scale-95 transition">
            Оплачено
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4 text-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold text-gray-900">🧠 Превентивная консультация</div>
            <div class="text-xs text-gray-600 mt-1">Разбор анкеты + план</div>
          </div>
          <div class="text-xs text-gray-600">
            Статус: <b>${statusLabel(prevStatus)}</b>
          </div>
        </div>
        <div class="mt-3 text-sm text-gray-700">
          Перевод на номер: <b>+7 (999) 000-00-00</b>
        </div>
        <div class="text-xs text-gray-600 mt-1">
          Комментарий: <b>${escapeHtml(basePrev)}</b>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button data-action="copy-text" data-text="${escapeAttr(
            basePrev
          )}"
            class="px-3 py-2 rounded-2xl bg-gray-100 text-sm active:scale-95 transition">
            Скопировать
          </button>
          <button data-action="consult-pay" data-type="prev"
            class="px-3 py-2 rounded-2xl bg-gray-900 text-white text-sm active:scale-95 transition">
            Оплачено
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderMember(activePatient, member) {
  if (!activePatient || !member) {
    return `<div class="p-4 text-sm text-gray-700">Член семьи не найден</div>`;
  }

  const tabs = [
    { id: "overview", label: "Обзор" },
    { id: "anketa", label: "Анкета" },
    { id: "labs", label: "Анализы" },
    { id: "chat", label: "Чат" },
    { id: "consult", label: "Консультации" },
  ];

  const tabsHtml = tabs
    .map((t) => {
      const active = state.memberTab === t.id;
      return `
        <button data-action="change-member-tab" data-tab="${t.id}"
          class="px-3 py-1.5 rounded-2xl text-sm ${
            active
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-800"
          } active:scale-95 transition">
          ${t.label}
        </button>
      `;
    })
    .join("");

  let content = "";
  if (state.memberTab === "overview") content = renderMemberOverview(member);
  else if (state.memberTab === "anketa") content = renderMemberAnketa(member);
  else if (state.memberTab === "labs") content = renderMemberLabs(member);
  else if (state.memberTab === "chat") content = renderMemberChat(member);
  else if (state.memberTab === "consult")
    content = renderMemberConsult(activePatient, member);

  return `
    <div class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <button data-action="go-page" data-page="family"
          class="px-3 py-1.5 rounded-2xl bg-gray-100 text-sm text-gray-800 active:scale-95 transition">
          ← Профиль
        </button>
        <div class="text-right">
          <div class="font-semibold text-gray-900 text-sm">
            ${escapeHtml(member.name)}
          </div>
          <div class="text-xs text-gray-600">
            ${escapeHtml(member.relation)} • ${escapeHtml(fmtMemberMeta(member))}
          </div>
          <div class="text-[11px] text-gray-500 mt-0.5">
            Режим: ${state.mode === "doctor" ? "врач" : "пациент"}
          </div>
        </div>
      </div>
      <div class="flex gap-2 overflow-x-auto pb-1">
        ${tabsHtml}
      </div>
      ${content}
    </div>
  `;
}

function renderDoctor() {
  const patients = state.patients || [];
  const selected =
    patients.find((p) => p.id === state.doctorActivePatientId) ||
    patients[0] ||
    null;

  const patientsHtml = patients
    .map((p) => {
      const active = selected && p.id === selected.id;
      return `
        <button data-action="doctor-select-patient" data-patient-id="${p.id}"
          class="w-full text-left px-3 py-2 rounded-2xl border ${
            active
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          } active:scale-95 transition">
          <div class="font-semibold text-sm">${escapeHtml(p.name)}</div>
          <div class="text-xs ${
            active ? "text-gray-200" : "text-gray-600"
          }">${escapeHtml(p.phone)}</div>
        </button>
      `;
    })
    .join("");

  const pending = (state.paymentRequests || []).filter(
    (r) => r.status === "pending"
  );
  const reqHtml =
    pending.length === 0
      ? `<div class="text-sm text-gray-600">Нет заявок</div>`
      : pending
          .map((r) => {
            const p = patients.find((x) => x.id === r.patientId);
            const m = p?.members?.find((x) => x.id === r.memberId);
            const label = r.type === "urgent" ? "Срочная" : "Превентивная";
            return `
          <div class="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm">
            <div class="font-semibold text-gray-900">
              ${escapeHtml(p?.name || "Пациент")} • ${label} • ${escapeHtml(
              m?.name || ""
            )}
            </div>
            <div class="text-xs text-gray-600 mt-0.5">${escapeHtml(
              p?.phone || ""
            )}</div>
            <div class="text-[11px] text-gray-500 mt-0.5">
              ${new Date(r.createdAt).toLocaleString()}
            </div>
            <div class="mt-2 flex gap-2">
              <button data-action="doctor-confirm-pay" data-id="${
                r.id
              }" data-ok="1"
                class="px-3 py-1.5 rounded-2xl bg-gray-900 text-white text-xs active:scale-95 transition">
                Подтв.
              </button>
              <button data-action="doctor-confirm-pay" data-id="${
                r.id
              }" data-ok="0"
                class="px-3 py-1.5 rounded-2xl bg-gray-100 text-xs active:scale-95 transition">
                Откл.
              </button>
            </div>
          </div>
        `;
          })
          .join("");

  const family = selected?.members || [];
  const familyHtml = family
    .map((m) => {
      const labsCount = Object.values(m.labs || {}).reduce(
        (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      const ank = m.anketa ? "есть" : "нет";
      return `
        <button data-action="doctor-open-member" data-member-id="${
          m.id
        }" data-patient-id="${selected.id}"
          class="w-full text-left px-3 py-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 transition">
          <div class="flex justify-between gap-3">
            <div>
              <div class="font-semibold text-gray-900 text-sm">
                ${escapeHtml(m.name)}
                <span class="text-xs text-gray-500">
                  (${escapeHtml(m.relation || "член семьи")})
                </span>
              </div>
              <div class="text-xs text-gray-600">${escapeHtml(
                fmtMemberMeta(m)
              )}</div>
            </div>
            <div class="text-[11px] text-gray-600 text-right">
              Анкета: <b>${ank}</b><br/>
              Файлы: <b>${labsCount}</b>
            </div>
          </div>
        </button>
      `;
    })
    .join("");

      return `
    <div class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <button data-action="doctor-exit"
          class="px-3 py-1.5 rounded-2xl bg-gray-100 text-sm text-gray-800 active:scale-95 transition">
          ← Выйти
        </button>
        <div class="text-right text-xs text-gray-600">Кабинет врача</div>
      </div>

      <!-- НОВАЯ КАРТОЧКА СТАТУСА -->
      <div class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="font-semibold text-gray-900 mb-2">Статус врача</div>
        <div class="text-xs text-gray-600">
          Этот статус видят пациенты в чате.
        </div>
        <div class="mt-3 flex gap-2">
          <button
            data-action="set-doctor-status"
            data-status="online"
            class="px-3 py-1.5 rounded-2xl text-xs border ${
              state.doctorStatus === "online"
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-gray-50 border-gray-300 text-gray-800"
            } active:scale-95 transition"
          >
            Онлайн
          </button>
          <button
            data-action="set-doctor-status"
            data-status="offline"
            class="px-3 py-1.5 rounded-2xl text-xs border ${
              state.doctorStatus === "offline"
                ? "bg-gray-900 border-gray-900 text-white"
                : "bg-gray-50 border-gray-300 text-gray-800"
            } active:scale-95 transition"
          >
            Оффлайн
          </button>
        </div>
        <div class="mt-2 text-xs text-gray-600">
          Текущий статус: <b>${
            state.doctorStatus === "online" ? "онлайн" : "оффлайн"
          }</b>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="font-semibold text-gray-900 mb-2">Пациенты</div>
        <div class="space-y-2">
          ${patientsHtml}
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="font-semibold text-gray-900 mb-2">Заявки на оплату</div>
        <div class="space-y-2">
          ${reqHtml}
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="font-semibold text-gray-900 mb-2">Семья пациента</div>
        <div class="space-y-2">
          ${familyHtml}
        </div>
      </div>
    </div>
  `;
}

  if (state.uiAnketaOpen && member) {
    const goal = member.anketa?.goal || "";
    const comp = member.anketa?.complaints || "";
    html += `
      <div class="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black bg-opacity-40">
        <div class="bg-white rounded-3xl w-full max-w-md mx-4 mb-4 sm:mb-0 p-4 space-y-3">
          <div class="flex items-center justify-between mb-1">
            <div>
              <div class="font-semibold text-gray-900">Анкета (мини)</div>
              <div class="text-xs text-gray-500">Тип: ${escapeHtml(
                formTypeFor(member.dob)
              )}</div>
            </div>
            <button data-action="close-modal" data-modal="anketa"
              class="px-2 py-1 rounded-xl bg-gray-100">✕</button>
          </div>
          <div class="space-y-3 text-sm">
            <div>
              <div class="text-xs text-gray-500">Цель</div>
              <textarea id="anketaGoal" rows="3"
                class="mt-1 w-full rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm">${escapeHtml(
                  goal
                )}</textarea>
            </div>
            <div>
              <div class="text-xs text-gray-500">Жалобы</div>
              <textarea id="anketaComplaints" rows="3"
                class="mt-1 w-full rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm">${escapeHtml(
                  comp
                )}</textarea>
            </div>
          </div>
          <button data-action="save-anketa"
            class="w-full mt-2 rounded-2xl bg-gray-900 text-white text-sm py-2.5 active:scale-95 transition">
            Сохранить
          </button>
        </div>
      </div>
    `;
  }

  if (state.uiMenuOpen) {
    html += `
      <div class="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black bg-opacity-40">
        <div class="bg-white rounded-3xl w-full max-w-xs mx-4 mb-4 sm:mb-0 p-4 space-y-2">
          <div class="flex items-center justify-between mb-1">
            <div class="font-semibold text-gray-900 text-sm">Меню</div>
            <button data-action="close-modal" data-modal="menu"
              class="px-2 py-1 rounded-xl bg-gray-100">✕</button>
          </div>
          <button data-action="go-page" data-page="home"
            class="w-full text-left px-3 py-2 rounded-2xl bg-gray-100 text-sm active:scale-95 transition">
            🏠 Главный экран
          </button>
          <button data-action="go-page" data-page="family"
            class="w-full text-left px-3 py-2 rounded-2xl bg-gray-100 text-sm active:scale-95 transition">
            👤 Мой профиль
          </button>
          <button data-action="open-doctor-login"
            class="w-full text-left px-3 py-2 rounded-2xl bg-gray-100 text-sm active:scale-95 transition">
            🛡️ Вход врача (PIN)
          </button>
          <button data-action="reset-demo"
            class="w-full text-left px-3 py-2 rounded-2xl bg-red-50 text-sm text-red-700 active:scale-95 transition">
            ↺ Сбросить демо-данные
          </button>
        </div>
      </div>
    `;
  }

  return html;
}

function renderToast() {
  if (!state.toast) return "";
  return `
    <div class="fixed inset-x-0 bottom-6 flex justify-center z-50 pointer-events-none">
      <div class="px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm shadow-lg pointer-events-auto">
        ${escapeHtml(state.toast)}
      </div>
    </div>
  `;
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const activePatient = getActivePatient();
  const member = getActiveMember();
  app.innerHTML = `
    <div class="min-h-screen flex justify-center items-start sm:items-center bg-gray-100 p-2 sm:p-4">
      <div class="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col">
        ${renderTopBar(activePatient)}
        <div class="flex-1 overflow-y-auto">
          ${renderPage(activePatient, member)}
        </div>
        ${renderBottomNav()}
      </div>
      ${renderModals(activePatient, member)}
      ${renderToast()}
    </div>
  `;
}

// === Логика действий ===
function handleSaveAddMember() {
  const relationEl = document.getElementById("addRelation");
  const nameEl = document.getElementById("addName");
  const dobEl = document.getElementById("addDob");
  const sexEl = document.getElementById("addSex");
  if (!relationEl || !nameEl || !dobEl || !sexEl) return;

  const name = nameEl.value.trim();
  const dob = dobEl.value;
  const sex = sexEl.value || "f";
  const relation = relationEl.value || "член семьи";

  if (!name || !dob) {
    showToast("Введите имя и дату рождения");
    return;
  }

  const patient = getActivePatient();
  if (!patient) return;

  const newM = defaultMember({ name, dob, sex, relation });
  patient.members.unshift(newM);
  patient.selectedMemberId = newM.id;

  state.memberTab = "anketa";
  state.uiAddMemberOpen = false;

  saveState();
  render();
  showToast("Член семьи добавлен");
}

function handleSaveAnketa() {
  const goalEl = document.getElementById("anketaGoal");
  const compEl = document.getElementById("anketaComplaints");
  if (!goalEl || !compEl) return;

  const goal = goalEl.value.trim();
  const complaints = compEl.value.trim();
  const member = getActiveMember();
  if (!member) return;

  member.anketa = {
    goal,
    complaints,
    updatedAt: new Date().toISOString(),
  };
  member.chats = member.chats || [];
  member.chats.push({
    from: "patient",
    text: "Я заполнил(а) анкету ✅",
    ts: Date.now(),
  });
  member.chats.push({
    from: "doctor",
    text: "Принял(а). Можете при необходимости загрузить анализы и написать вопросы.",
    ts: Date.now() + 200,
  });

  state.uiAnketaOpen = false;
  saveState();
  render();
  showToast("Анкета сохранена");
}

function handleChatSend() {
  const input = document.getElementById("chatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const member = getActiveMember();
  if (!member) return;

  const author = state.mode === "doctor" ? "doctor" : "patient";

  member.chats = member.chats || [];
  member.chats.push({
    from: author,
    text,
    ts: Date.now(),
  });

  input.value = "";
  saveState();
  render();

  // автоответ врача только если пишет пациент
  if (state.mode === "patient") {
    setTimeout(() => {
      const m2 = getActiveMember();
      if (!m2) return;
      m2.chats = m2.chats || [];
      m2.chats.push({
        from: "doctor",
        text: "Принял(а). Отвечу в ближайшее время 👌",
        ts: Date.now(),
      });
      saveState();
      render();
    }, 400);
  }
}

function handleConsultPay(type) {
  const member = getActiveMember();
  const patient = getActivePatient();
  if (!member || !patient) return;

  const existing = (state.paymentRequests || []).find(
    (r) =>
      r.patientId === patient.id &&
      r.memberId === member.id &&
      r.type === type &&
      r.status === "pending"
  );
  if (existing) {
    showToast("Заявка уже отправлена");
    return;
  }

  member.consult = member.consult || { urgent: "none", prev: "none" };
  member.consult[type] = "pending";

  const req = {
    id: uid("pay"),
    patientId: patient.id,
    memberId: member.id,
    type,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  state.paymentRequests = [req, ...(state.paymentRequests || [])];

  const notif = {
    id: uid("n"),
    title: "Оплата отмечена",
    body: `${patient.name} (${patient.phone}): ${
      type === "urgent" ? "Срочная" : "Превентивная"
    } — ${member.name}`,
    createdAt: new Date().toISOString(),
    unread: true,
  };
  state.notifications = [notif, ...(state.notifications || [])];

  saveState();
  render();
  showToast("Заявка отправлена врачу");
}

function handleDoctorConfirmPay(id, ok) {
  const r = (state.paymentRequests || []).find((x) => x.id === id);
  if (!r || r.status !== "pending") return;

  r.status = ok ? "confirmed" : "rejected";

  const patient = (state.patients || []).find((p) => p.id === r.patientId);
  const member = patient?.members?.find((m) => m.id === r.memberId);
  if (member) {
    member.consult = member.consult || { urgent: "none", prev: "none" };
    const label = r.type === "urgent" ? "Срочная" : "Превентивная";
    if (ok) {
      member.consult[r.type] = "active";
    } else {
      member.consult[r.type] = "none";
    }
    member.chats = member.chats || [];
    member.chats.push({
      from: "doctor",
      text: ok
        ? `Подтвердил(а) оплату: ${label} ✅ Доступ открыт.`
        : `Оплата не найдена. Заявка отклонена (${label}).`,
      ts: Date.now(),
    });
  }

  saveState();
  render();
  showToast(ok ? "Подтверждено" : "Отклонено");
}

function handleCopyText(text) {
  if (!navigator.clipboard) {
    showToast("Копирование недоступно");
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => showToast("Скопировано"))
    .catch(() => showToast("Не удалось скопировать"));
}

function handleBellRead() {
  const unread = (state.notifications || []).filter((n) => n.unread).length;
  if (!unread) {
    showToast("Нет новых уведомлений");
    return;
  }
  (state.notifications || []).forEach((n) => {
    n.unread = false;
  });
  saveState();
  render();
  showToast("Уведомления прочитаны");
}

function openDoctorLogin() {
  const pin = window.prompt("PIN врача");
  if (!pin) return;
  if (pin === DOCTOR_PIN) {
    // включаем режим врача
    state.mode = "doctor";
    if (!state.doctorStatus) {
      state.doctorStatus = "online"; // по умолчанию онлайн
    }
    state.page = "doctor";
    (state.notifications || []).forEach((n) => {
      n.unread = false;
    });
    saveState();
    render();
    showToast("Вход врача");
  } else {
    showToast("Неверный PIN");
  }
}

function handleBrandTap() {
  const now = Date.now();
  brandTapTimes = brandTapTimes.filter((t) => now - t < 900);
  brandTapTimes.push(now);
  if (brandTapTimes.length >= 4) {
    brandTapTimes = [];
    openDoctorLogin();
  }
}

function handleResetDemo() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  state = initialState();
  render();
  showToast("Демо данные сброшены");
}

function handleSelectMember(memberId) {
  const patient = getActivePatient();
  if (!patient) return;
  patient.selectedMemberId = memberId;
  state.page = "member";
  state.memberTab = "overview";
  saveState();
  render();
}

function handleChangeMemberTab(tab) {
  state.memberTab = tab;
  saveState();
  render();
}

// === Глобальный обработчик кликов ===
document.addEventListener("click", function (e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case "go-page": {
      const page = el.dataset.page;
      if (!page) return;

      // если были в кабинете врача и идём в профиль — считаем что выходим из режима врача
      if (state.page === "doctor" && page === "family") {
        state.mode = "patient";
      }

      state.page = page;
      if (page === "family" && !getActivePatient() && state.patients[0]) {
        state.activePatientId = state.patients[0].id;
      }
      saveState();
      render();
      break;
    }
    case "open-add-member":
      state.uiAddMemberOpen = true;
      render();
      break;
    case "close-modal": {
      const modal = el.dataset.modal;
      if (modal === "add-member") state.uiAddMemberOpen = false;
      else if (modal === "anketa") state.uiAnketaOpen = false;
      else if (modal === "menu") state.uiMenuOpen = false;
      render();
      break;
    }
    case "save-add-member":
      handleSaveAddMember();
      break;
    case "select-member":
      handleSelectMember(el.dataset.memberId);
      break;
    case "change-member-tab":
      handleChangeMemberTab(el.dataset.tab);
      break;
    case "open-anketa":
      state.uiAnketaOpen = true;
      render();
      break;
    case "save-anketa":
      handleSaveAnketa();
      break;
    case "chat-send":
      handleChatSend();
      break;
    case "consult-pay":
      handleConsultPay(el.dataset.type);
      break;
    case "copy-text":
      handleCopyText(el.dataset.text || "");
      break;
    case "bell-read":
      handleBellRead();
      break;
    case "brand-tap":
      handleBrandTap();
      break;
    case "open-menu":
      state.uiMenuOpen = true;
      render();
      break;
    case "open-doctor-login":
      state.uiMenuOpen = false;
      render();
      openDoctorLogin();
      break;
    case "reset-demo":
      handleResetDemo();
      break;
    case "doctor-select-patient":
      state.doctorActivePatientId = el.dataset.patientId;
      saveState();
      render();
      break;
    case "doctor-open-member": {
      const pid = el.dataset.patientId;
      const mid = el.dataset.memberId;
      const p = (state.patients || []).find((pp) => pp.id === pid);
      if (p) {
        p.selectedMemberId = mid;
        state.activePatientId = pid;
        state.page = "member";
        state.memberTab = "labs";
        saveState();
        render();
        showToast("Открыт профиль члена семьи");
      }
      break;
    }
    case "doctor-confirm-pay": {
      const id = el.dataset.id;
      const ok = el.dataset.ok === "1";
      handleDoctorConfirmPay(id, ok);
      break;
    }
          case "doctor-exit":
      // явный выход из режима врача
      state.mode = "patient";
      state.page = "family";
      if (!getActivePatient() && state.patients[0]) {
        state.activePatientId = state.patients[0].id;
      }
      saveState();
      render();
      showToast("Вы вышли из кабинета врача");
      break;
    case "set-doctor-status": {
      const status = el.dataset.status;
      if (status !== "online" && status !== "offline") return;
      state.doctorStatus = status;
      saveState();
      render();
      showToast(
        status === "online"
          ? "Статус врача: онлайн"
          : "Статус врача: оффлайн"
      );
      break;
    }
  }
});

// === Старт ===
state = loadState();
render();
