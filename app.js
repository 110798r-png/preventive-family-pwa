// PREVENTIVE Family PWA — Vanilla JS + Tailwind
// ===========================================

// ----- Constants & helpers -----

const STORAGE_KEY = "prev_family_pwa_light_vanilla";
const DOCTOR_PIN = "2580";

const LAB_CATS = [
  { id: "cbc", title: "ОАК", icon: "🩸" },
  { id: "uac", title: "ОАМ", icon: "🧴" },
  { id: "copro", title: "Копрограмма", icon: "🧫" },
  { id: "biochem", title: "Биохимия", icon: "⚗️" },
  { id: "thyroid", title: "Щитовидка", icon: "🦋" },
  { id: "vit", title: "Витамины/Мин.", icon: "🧩" },
  { id: "iron", title: "Железо", icon: "🧲" },
  { id: "inf", title: "CMV/EBV", icon: "🦠" },
  { id: "us", title: "УЗИ", icon: "📟" },
  { id: "other", title: "Прочее", icon: "📎" },
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

function safeJsonParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function ageFromDob(dob, now = new Date()) {
  if (!dob) return { years: 0, months: 0, totalMonths: 0 };
  const d = new Date(`${dob}T00:00:00`);
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  const totalMonths = Math.max(0, months);
  const years = Math.floor(totalMonths / 12);
  const rem = totalMonths % 12;
  return { years, months: rem, totalMonths };
}

function formTypeFor(dob, now = new Date()) {
  const a = ageFromDob(dob, now);
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
    story1Title: "Сон ребёнка",
    story1Text: "Как перевели семью с ночных просыпаний на стабильный сон.",
    story2Title: "Хроническая усталость",
    story2Text: "Кейс, где анализы и режим дня вернули энергию.",
    story3Title: "Кишечник",
    story3Text: "История про вздутие, питание и микробиоту.",
  };
}

function defaultMember({ name, dob, sex, relation = "я" }) {
  return {
    id: uid("m"),
    relation,
    name,
    dob,
    sex,
    anketa: null,
    chats: [
      {
        from: "doctor",
        text: "Здравствуйте! Заполните анкету и загрузите анализы по категориям.",
        ts: Date.now(),
      },
    ],
    labs: {},
    consult: { urgent: "none", prev: "none" },
    workflow: {
      prepaymentType: null,
      prepaymentStatus: "none",
      cardLink: "",
      cardLinkSentAt: null,
      anketaExternalDone: false,
      anketaExternalDoneAt: null,
      appointmentDate: "",
      appointmentSetAt: null,
      analysesList: "",
      analysesListSentAt: null,
      analysesUploaded: false,
      analysesUploadedAt: null,
      treatmentReady: false,
      treatmentReadyAt: null,
    },
  };
}

function makeDemoPatients() {
  const p1 = {
    id: "p1",
    name: "Никита Прославенко",
    phone: "+79995550011",
    createdAt: new Date().toISOString(),
    members: [
      {
        ...defaultMember({
          name: "Никита Прославенко",
          dob: "1996-03-10",
          sex: "m",
          relation: "я",
        }),
        id: "m1",
      },
      {
        ...defaultMember({
          name: "Анна Прославенко",
          dob: "1998-11-02",
          sex: "f",
          relation: "жена",
        }),
        id: "m2",
      },
      {
        ...defaultMember({
          name: "Марк Прославенко",
          dob: "2021-08-18",
          sex: "m",
          relation: "ребёнок",
        }),
        id: "m3",
      },
    ],
    selectedMemberId: "m1",
  };

  const p2 = {
    id: "p2",
    name: "Амина Ахмедова",
    phone: "+79990000022",
    createdAt: new Date().toISOString(),
    members: [
      {
        ...defaultMember({
          name: "Амина Ахмедова",
          dob: "2001-05-01",
          sex: "f",
          relation: "я",
        }),
        id: "m21",
      },
      {
        ...defaultMember({
          name: "Али",
          dob: "2024-02-14",
          sex: "m",
          relation: "ребёнок",
        }),
        id: "m22",
      },
    ],
    selectedMemberId: "m21",
  };

  return [p1, p2];
}

function initialState() {
  return {
    page: "home", // home | family | member | doctor
    memberTab: "overview", // overview | anketa | labs | chat | consult
    patients: makeDemoPatients(),
    activePatientId: "p1",
    doctorActivePatientId: "p1",
    notifications: [],
    doctorProfile: defaultDoctorProfile(),
    toast: "",
  };
}

function loadState() {
  const raw =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null;
  const saved = raw ? safeJsonParse(raw) : null;
  const base = initialState();
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    doctorProfile: saved.doctorProfile || base.doctorProfile,
  };
}

function saveState(s) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

// ----- Global state -----

let state = loadState();
const root = document.getElementById("root");
let brandTapTimes = [];

// helpers

function setState(patch) {
  state = { ...state, ...patch };
  saveState(state);
  renderApp();
}

function getActivePatient() {
  return (
    state.patients.find((p) => p.id === state.activePatientId) ||
    state.patients[0] ||
    null
  );
}

function getActiveMember() {
  const p = getActivePatient();
  if (!p) return null;
  return (
    p.members.find((m) => m.id === p.selectedMemberId) ||
    p.members[0] ||
    null
  );
}

function getUnreadCount() {
  return state.notifications.filter((n) => n.unread).length;
}

function showToast(msg) {
  setState({ toast: msg });
  setTimeout(() => {
    state.toast = "";
    renderApp();
  }, 1700);
}

// ----- Render parts -----

function renderTopbarHTML() {
  const p = getActivePatient();
  const unread = getUnreadCount();

  return `
    <div class="px-5 pt-5 pb-4 border-b border-black/10 bg-white flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <button data-action="brand-tap" class="active:scale-95 transition flex items-center gap-3 text-left">
          <div class="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl">
            🧬
          </div>
          <div>
            <div class="font-semibold tracking-wide leading-tight text-slate-900">
              PREVENTIVE
            </div>
            <div class="text-xs text-slate-500 -mt-0.5">
              Светлая тема • предпросмотр
            </div>
          </div>
        </button>
        <div class="flex items-center gap-2">
          <button data-action="mark-notif-read"
            class="px-3 py-2 rounded-2xl border text-xs ${
              unread ? "bg-slate-50" : "bg-white"
            } border-black/10 text-slate-700">
            🔔 <b class="ml-1">${unread}</b>
          </button>
          <button data-action="open-menu"
            class="active:scale-95 transition rounded-2xl bg-black/5 hover:bg-black/10 text-xs px-3 py-2">
            ☰
          </button>
        </div>
      </div>

      <div>
        <div class="text-xs text-slate-500 mb-1">
          ${
            state.page === "home"
              ? "Главный экран врача"
              : "Личный кабинет"
          }
        </div>
        <div class="font-semibold text-slate-900 text-sm">
          ${p ? p.name : "Пациент не выбран"}
        </div>
        <div class="text-xs text-slate-500">${p ? p.phone : ""}</div>
      </div>
    </div>
  `;
}

function renderHomeHTML() {
  const d = state.doctorProfile;
  const guides =
    d.guidesText
      ?.split(",")
      .map((x) => x.trim())
      .filter(Boolean) || [];

  const stories = [
    { title: d.story1Title, text: d.story1Text },
    { title: d.story2Title, text: d.story2Text },
    { title: d.story3Title, text: d.story3Text },
  ].filter((s) => (s.title || "").trim() || (s.text || "").trim());

  return `
    <div class="p-5 space-y-4">
      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-5">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl">
            🩺
          </div>
          <div class="flex-1">
            <div class="text-xs uppercase tracking-wide text-slate-500">
              ${d.title}
            </div>
            <div class="text-lg font-semibold text-slate-900 mt-1">
              ${d.name}
            </div>
            ${
              d.subtitle
                ? `<div class="text-sm text-slate-600 mt-1">${d.subtitle}</div>`
                : ""
            }
            <button data-action="go-family"
              class="mt-4 w-full rounded-2xl bg-slate-900 text-white font-semibold px-4 py-3 text-sm active:scale-95 transition">
              👤 Мой профиль
            </button>
          </div>
        </div>
      </div>

      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
        <div class="font-semibold text-slate-900">Моё образование</div>
        <div class="mt-2 text-sm text-slate-700 space-y-1">
          ${
            d.educationText
              ?.split("\\n")
              .filter((l) => l.trim())
              .map((l) => `<div>${l}</div>`)
              .join("") || ""
          }
        </div>
      </div>

      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
        <div class="font-semibold text-slate-900">О себе</div>
        ${
          d.aboutText
            ? `<div class="mt-2 text-sm text-slate-700">${d.aboutText}</div>`
            : ""
        }
      </div>

      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
        <div class="font-semibold text-slate-900">Методичка</div>
        <div class="mt-2 text-sm text-slate-700 space-y-1">
          ${
            d.methodText
              ?.split("\\n")
              .filter((l) => l.trim())
              .map((l) => `<div>${l}</div>`)
              .join("") || ""
          }
        </div>
      </div>

      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
        <div class="font-semibold text-slate-900">Гайды</div>
        <div class="mt-2 flex flex-wrap gap-2 text-xs">
          ${guides
            .map(
              (g) =>
                `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs bg-slate-50 text-slate-700 border-black/10">${g}</span>`
            )
            .join("")}
        </div>
      </div>

      ${
        stories.length
          ? `<div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
              <div class="font-semibold text-slate-900 mb-2">Истории</div>
              <div class="flex gap-3 overflow-x-auto pb-1">
                ${stories
                  .map(
                    (s) => `
                  <div class="min-w-[180px] max-w-[200px] rounded-2xl border border-black/10 bg-slate-50 p-3 text-xs text-slate-700">
                    <div class="font-semibold text-slate-900 mb-1">${s.title || ""}</div>
                    <div>${s.text || ""}</div>
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
    </div>
  `;
}

function renderFamilyHTML() {
  const p = getActivePatient();
  if (!p) return "<div class='p-5'>Нет пациентов</div>";

  const membersHTML = p.members
    .map((m) => {
      const labsCount = Object.values(m.labs || {}).reduce(
        (acc, arr) => acc + (arr?.length || 0),
        0
      );
      const ank = m.anketa ? "заполнена" : "нет";
      const cons =
        m.consult?.urgent !== "none" || m.consult?.prev !== "none"
          ? "есть"
          : "нет";

      return `
        <button data-action="select-member" data-id="${m.id}"
          class="active:scale-95 transition w-full text-left rounded-3xl border border-black/10 bg-white hover:bg-slate-50 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-semibold text-lg leading-tight text-slate-900">
                ${m.name}
                <span class="ml-2 text-xs text-slate-500">
                  (${m.relation || "член семьи"})
                </span>
              </div>
              <div class="text-sm text-slate-600 mt-0.5">
                ${fmtMemberMeta(m)}
              </div>
            </div>
            <div class="text-right text-xs text-slate-600 space-y-2">
              <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs bg-slate-50 text-slate-700 border-black/10">
                Анкета: <b class="ml-1">${ank}</b>
              </span>
              <div></div>
              <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs bg-slate-50 text-slate-700 border-black/10">
                Файлы: <b class="ml-1">${labsCount}</b>
              </span>
              <div></div>
              <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs bg-slate-50 text-slate-700 border-black/10">
                Конс: <b class="ml-1">${cons}</b>
              </span>
            </div>
          </div>
        </button>
      `;
    })
    .join("");

  return `
    <div class="p-5 space-y-4">
      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-slate-900">
              Профиль пациента
            </div>
            <div class="text-sm text-slate-600">
              Внутри — члены семьи и их анкеты
            </div>
          </div>
          <button data-action="add-member"
            class="rounded-2xl bg-slate-900 text-white text-sm px-4 py-2 active:scale-95 transition">
            + Добавить
          </button>
        </div>
      </div>

      <div class="space-y-3">
        ${membersHTML}
      </div>
    </div>
  `;
}

function renderMemberChatHTML(member) {
  const msgs = member.chats || [];
  const consultActive =
    member.consult?.urgent === "active" || member.consult?.prev === "active";

  const listHTML = msgs
    .map((msg) => {
      const mine = msg.from === "patient";
      return `
        <div class="flex ${mine ? "justify-end" : "justify-start"}">
          <div class="${
            mine
              ? "bg-slate-900 text-white"
              : "bg-slate-50 text-slate-900 border border-black/10"
          } max-w-[80%] rounded-2xl px-4 py-3">
            <div class="text-[11px] opacity-70">
              ${mine ? "Вы" : "Врач"} • ${new Date(msg.ts).toLocaleString()}
            </div>
            <div class="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
              ${msg.text}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] overflow-hidden">
      <div class="p-4 border-b border-black/10 flex items-center justify-between">
        <div>
          <div class="font-semibold text-slate-900">
            Чат с врачом
          </div>
          <div class="text-xs text-slate-600">
            По выбранному члену семьи
          </div>
        </div>
        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs bg-slate-50 text-slate-700 border-black/10">
          ${consultActive ? "консультация активна" : "обычный чат"}
        </span>
      </div>
      <div class="p-4 h-[320px] overflow-auto space-y-3 bg-white" id="chat-list">
        ${
          listHTML ||
          "<div class='text-xs text-slate-500'>Пока нет сообщений</div>"
        }
      </div>
      <div class="p-3 border-t border-black/10 flex gap-2 bg-white">
        <input id="chat-input"
          class="w-full rounded-2xl bg-slate-50 border border-black/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10 placeholder:text-slate-400"
          placeholder="Напишите сообщение…" />
        <button data-action="chat-send"
          class="active:scale-95 transition rounded-2xl bg-slate-900 text-white font-semibold px-5 py-3">
          →
        </button>
      </div>
    </div>
  `;
}

function renderMemberTabsHTML(member) {
  const tabs = [
    { id: "overview", label: "Обзор" },
    { id: "anketa", label: "Анкета" },
    { id: "labs", label: "Анализы" },
    { id: "chat", label: "Чат" },
    { id: "consult", label: "Консультации" },
  ];

  const tabsHTML = tabs
    .map(
      (t) => `
      <button data-action="set-tab" data-tab="${t.id}"
        class="px-4 py-2 text-sm rounded-2xl active:scale-95 transition ${
          state.memberTab === t.id
            ? "bg-slate-900 text-white"
            : "bg-black/5 text-slate-800"
        }">
        ${t.label}
      </button>
    `
    )
    .join("");

    const workflow = member.workflow || {};
  const labsCount = Object.values(member.labs || {}).reduce(
    (acc, arr) => acc + (arr?.length || 0),
    0
  );
  const consultStatuses = [
    member.consult?.urgent,
    member.consult?.prev,
  ].filter((x) => x && x !== "none");
  const consultText = consultStatuses.length
    ? consultStatuses.join(" • ")
    : "Нет";

  let contentHTML = "";

    if (state.memberTab === "chat") {
    contentHTML = renderMemberChatHTML(member);
  } else if (state.memberTab === "overview") {
    contentHTML = `
      <div class="space-y-3">
        <!-- Карточка-резюме -->
        <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-2xl border border-black/10 bg-slate-50 p-3">
              <div class="text-xs text-slate-500">Анкета</div>
              <div class="mt-1 font-semibold text-slate-900">
                ${member.anketa ? "Заполнена" : "Не заполнена"}
              </div>
            </div>
            <div class="rounded-2xl border border-black/10 bg-slate-50 p-3">
              <div class="text-xs text-slate-500">Анализы</div>
              <div class="mt-1 font-semibold text-slate-900">
                ${labsCount || "Нет"} файл(ов)
              </div>
            </div>
            <div class="rounded-2xl border border-black/10 bg-slate-50 p-3">
              <div class="text-xs text-slate-500">Консультации</div>
              <div class="mt-1 font-semibold text-slate-900">
                ${consultText}
              </div>
            </div>
            <div class="rounded-2xl border border-black/10 bg-slate-50 p-3">
              <div class="text-xs text-slate-500">Тип анкеты</div>
              <div class="mt-1 font-semibold text-slate-900">
                ${formTypeFor(member.dob)}
              </div>
            </div>
          </div>
        </div>

        <!-- Ход консультации -->
        <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
          <div class="font-semibold text-slate-900 mb-2">
            Ход консультации
          </div>
          <div class="space-y-2 text-sm">
            <!-- Предоплата -->
            <div class="flex items-center justify-between">
              <span>Предоплата</span>
              <span class="text-slate-900">
                ${
                  workflow.prepaymentStatus === "confirmed"
                    ? "подтверждена"
                    : workflow.prepaymentStatus === "pending"
                    ? "ожидает подтверждения"
                    : "не отмечена"
                }
              </span>
            </div>

            <!-- Карточка на Google Диске -->
            ${
              workflow.cardLink
                ? `
            <div class="flex items-center justify-between gap-2">
              <span>Карточка в Google Диске</span>
              <a href="${workflow.cardLink}" target="_blank" rel="noopener noreferrer"
                class="text-xs text-sky-600 underline">
                Открыть
              </a>
            </div>`
                : `
            <div class="text-xs text-slate-500">
              Ссылка на карточку появится после того, как врач её создаст.
            </div>`
            }

            <!-- Анкета в Google Диске -->
            <div class="flex items-center justify-between">
              <span>Анкета в Google Диске</span>
              <span class="text-slate-900">
                ${workflow.anketaExternalDone ? "заполнена" : "ожидает"}
              </span>
            </div>

            <button data-action="patient-mark-external-anketa"
              class="mt-1 w-full rounded-2xl px-4 py-2 text-xs active:scale-95 transition ${
                workflow.cardLink
                  ? "bg-black/5 hover:bg-black/10 text-slate-900"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }"
              ${workflow.cardLink ? "" : "disabled"}
            >
              Я заполнил(а) анкету в Google Диске
            </button>

            <!-- Дата консультации -->
            <div class="flex items-center justify-between mt-2">
              <span>Дата консультации</span>
              <span class="text-slate-900">
                ${workflow.appointmentDate || "не выбрана"}
              </span>
            </div>
            <button data-action="patient-set-appointment"
              class="mt-1 w-full rounded-2xl px-4 py-2 text-xs active:scale-95 transition bg-black/5 hover:bg-black/10 text-slate-900">
              Выбрать / изменить дату
            </button>

            <!-- Список анализов от врача -->
            ${
              workflow.analysesList
                ? `
            <div class="mt-2 rounded-2xl border border-black/10 bg-slate-50 p-2 text-xs">
              <div class="text-slate-500 mb-1">
                Список анализов от врача:
              </div>
              <div class="text-slate-900 whitespace-pre-wrap">
                ${workflow.analysesList}
              </div>
            </div>`
                : `
            <div class="mt-2 text-xs text-slate-500">
              Список анализов появится после изучения анкеты врачом.
            </div>`
            }

            <!-- Анализы загружены -->
            <div class="flex items-center justify-between mt-2">
              <span>Анализы загружены</span>
              <span class="text-slate-900">
                ${workflow.analysesUploaded ? "да" : "ещё нет"}
              </span>
            </div>

            <!-- Схема лечения -->
            <div class="flex items-center justify-between mt-2">
              <span>Схема лечения</span>
              <span class="text-slate-900">
                ${
                  workflow.treatmentReady
                    ? "готова (в карточке на диске)"
                    : "ещё готовится"
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (state.memberTab === "anketa") {
    const ank = member.anketa;
    contentHTML = `
      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold text-slate-900">Анкета</div>
            <div class="text-sm text-slate-600 mt-1">
              ${
                ank
                  ? "Обновлена: " + new Date(ank.updatedAt).toLocaleString()
                  : "Не заполнена"
              }
            </div>
          </div>
          <button data-action="edit-anketa"
            class="rounded-2xl bg-slate-900 text-white text-sm px-4 py-2 active:scale-95 transition">
            ${ank ? "Обновить" : "Заполнить"}
          </button>
        </div>

        ${
          ank
            ? `
          <div class="mt-4 space-y-3">
            <div class="rounded-2xl border border-black/10 bg-slate-50 p-3 text-sm">
              <div class="text-xs text-slate-500">Цель</div>
              <div class="mt-1 text-slate-900">${ank.goal || "—"}</div>
            </div>
            <div class="rounded-2xl border border-black/10 bg-slate-50 p-3 text-sm">
              <div class="text-xs text-slate-500">Жалобы</div>
              <div class="mt-1 text-slate-900">${ank.complaints || "—"}</div>
            </div>
          </div>`
            : ""
        }
      </div>
    `;
  } else if (state.memberTab === "labs") {
    const catsHTML = LAB_CATS.map((c) => {
      const count = (member.labs?.[c.id] || []).length;
      return `
        <div class="rounded-3xl border border-black/10 bg-slate-50 p-3 text-sm flex items-center justify-between">
          <div>
            <div class="font-semibold text-slate-900">${c.icon} ${c.title}</div>
            <div class="text-xs text-slate-600 mt-1">Файлов: ${count}</div>
          </div>
          <button data-action="open-lab" data-cat="${c.id}"
            class="rounded-2xl bg-white border border-black/10 text-xs px-3 py-1 active:scale-95 transition">
            Открыть
          </button>
        </div>
      `;
    }).join("");

    contentHTML = `
      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4 space-y-3">
        <div class="font-semibold text-slate-900">Анализы</div>
        <div class="space-y-2">
          ${catsHTML}
        </div>
        <div class="text-[11px] text-slate-500">
          Логику загрузки файлов можно перенести по шагам (через &lt;input type="file"&gt; и state.labs).
        </div>
      </div>
    `;
  } else if (state.memberTab === "consult") {
    contentHTML = `
      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4 space-y-3">
        <div class="font-semibold text-slate-900">Консультации</div>
        <div class="text-xs text-slate-600">
          Здесь можно так же, как в React-версии, отобразить срочную и превентивную консультации,
          кнопки "Оплачено" и т.д. Мы добавим эту логику следующим шагом.
        </div>
      </div>
    `;
  }

  return `
    <div class="p-5 space-y-4">
      <div class="flex items-center justify-between">
        <button data-action="go-family"
          class="rounded-2xl bg-black/5 px-3 py-2 text-sm active:scale-95 transition">
          ← Профиль пациента
        </button>
        <div class="text-right">
          <div class="font-semibold text-slate-900">${member.name}</div>
          <div class="text-xs text-slate-600">
            ${member.relation ? member.relation + " • " : ""}${fmtMemberMeta(
    member
  )}
          </div>
        </div>
      </div>

      <div class="flex gap-2 overflow-auto pb-1">
        ${tabsHTML}
      </div>

      ${contentHTML}
    </div>
  `;
}

function renderMemberHTML() {
  const m = getActiveMember();
  if (!m) return "<div class='p-5'>Нет данных</div>";
  return renderMemberTabsHTML(m);
}

function renderDoctorHTML() {
  const patientsHTML = state.patients
    .map(
      (p) => `
      <button data-action="doctor-select-patient" data-id="${p.id}"
        class="w-full text-left rounded-2xl border px-3 py-3 active:scale-95 transition ${
          p.id === state.doctorActivePatientId
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white border-black/10 hover:bg-black/5 text-slate-900"
        }">
        <div class="font-semibold">${p.name}</div>
        <div class="text-xs ${
          p.id === state.doctorActivePatientId
            ? "text-white/70"
            : "text-slate-600"
        }">${p.phone}</div>
      </button>
    `
    )
    .join("");

  return `
    <div class="p-5 space-y-4">
      <div class="flex items-center justify-between">
        <button data-action="go-family"
          class="rounded-2xl bg-black/5 px-3 py-2 text-sm active:scale-95 transition">
          ← Выйти
        </button>
        <div class="text-right">
          <div class="font-semibold text-slate-900">Кабинет врача</div>
          <div class="text-xs text-slate-600">
            Список пациентов. Остальные функции можно добавить по оригинальному приложению.
          </div>
        </div>
      </div>

      <div class="rounded-3xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] p-4">
        <div class="font-semibold text-slate-900">Пациенты</div>
        <div class="mt-3 жиspace-y-2">
          ${patientsHTML}
        </div>
      </div>
    </div>
  `;
}

function renderBottomNavHTML() {
  const isProfile =
    state.page === "family" || state.page === "member" || state.page === "doctor";
  return `
    <div class="border-t border-black/10 bg-white px-3 py-3"
      style="padding-bottom: env(safe-area-inset-bottom);">
      <button data-action="toggle-main"
        class="w-full rounded-2xl bg-slate-900 text-white text-sm px-4 py-3 active:scale-95 transition">
        ${!isProfile ? "👤 Мой профиль" : "🏠 Главный экран"}
      </button>
    </div>
  `;
}

function renderApp() {
  const contentHTML =
    state.page === "home"
      ? renderHomeHTML()
      : state.page === "family"
      ? renderFamilyHTML()
      : state.page === "member"
      ? renderMemberHTML()
      : state.page === "doctor"
      ? renderDoctorHTML()
      : "<div class='p-5'>Страница не найдена</div>";

  const toastHTML = state.toast
    ? `
      <div class="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 px-4">
        <div class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-[0_18px_70px_rgba(15,23,42,0.18)] text-slate-900">
          ${state.toast}
        </div>
      </div>`
    : "";

  root.innerHTML = `
    <div class="min-h-screen flex justify-center items-stretch sm:items-center bg-slate-100 p-0 sm:p-4">
      <div class="w-full max-w-[430px] m-3 h-[calc(100vh-24px)] rounded-[32px] border border-black/10 bg-white overflow-hidden shadow-[0_35px_130px_rgba(15,23,42,0.22)] flex flex-col relative">
        ${renderTopbarHTML()}
        <div class="flex-1 overflow-y-auto" style="padding-bottom: calc(92px + env(safe-area-inset-bottom));">
          ${contentHTML}
        </div>
        ${renderBottomNavHTML()}
        ${toastHTML}
      </div>
    </div>
  `;
}

// ----- Event handlers -----

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "open-menu") {
    showToast("Меню пока заглушка (потом добавим пункты, как в React)");
    return;
  }

  if (action === "toggle-main") {
    const isProfile =
      state.page === "family" ||
      state.page === "member" ||
      state.page === "doctor";
    setState({ page: isProfile ? "home" : "family" });
    return;
  }

  if (action === "go-family") {
    setState({ page: "family" });
    return;
  }

  if (action === "brand-tap") {
    const now = Date.now();
    brandTapTimes = brandTapTimes.filter((t) => now - t < 900);
    brandTapTimes.push(now);
    if (brandTapTimes.length >= 4) {
      brandTapTimes = [];
      const pin = prompt("PIN врача (демо: 2580)");
      if (pin === DOCTOR_PIN) {
        setState({ page: "doctor" });
        showToast("Вход врача");
      } else if (pin) {
        showToast("Неверный PIN");
      }
    }
    return;
  }

  if (action === "mark-notif-read") {
    if (!getUnreadCount()) {
      showToast("Нет новых уведомлений");
    } else {
      const notifs = state.notifications.map((n) => ({ ...n, unread: false }));
      setState({ notifications: notifs });
      showToast("Уведомления прочитаны");
    }
    return;
  }

  if (action === "select-member") {
    const id = btn.dataset.id;
    const patients = state.patients.map((p) =>
      p.id === state.activePatientId ? { ...p, selectedMemberId: id } : p
    );
    state.patients = patients;
    state.memberTab = "overview";
    saveState(state);
    renderApp();
    return;
  }

  if (action === "set-tab") {
    const tab = btn.dataset.tab;
    setState({ memberTab: tab });
    return;
  }

  if (action === "doctor-select-patient") {
    const id = btn.dataset.id;
    setState({ doctorActivePatientId: id });
    return;
  }

  if (action === "add-member") {
    const relation = prompt("Кто это? (жена, ребёнок...)", "ребёнок") || "член семьи";
    const name = prompt("Имя", "");
    const dob = prompt("Дата рождения (ГГГГ-ММ-ДД)", "2024-01-01");
    const sex = prompt("Пол (m/f)", "f") || "f";
    if (!name || !dob) {
      showToast("Имя и дата рождения обязательны");
      return;
    }
    const p = getActivePatient();
    if (!p) return;
    const newMember = {
      ...defaultMember({ name: name.trim(), dob: dob.trim(), sex, relation }),
      id: uid("m"),
    };
    const patients = state.patients.map((pp) =>
      pp.id === p.id
        ? {
            ...pp,
            members: [newMember, ...pp.members],
            selectedMemberId: newMember.id,
          }
        : pp
    );
    state.patients = patients;
    state.page = "member";
    state.memberTab = "anketa";
    saveState(state);
    renderApp();
    showToast("Член семьи добавлен");
    return;
  }

  if (action === "edit-anketa") {
    const p = getActivePatient();
    const m = getActiveMember();
    if (!p || !m) return;
    const goal = prompt("Цель (как в анкете)", m.anketa?.goal || "");
    const comp = prompt("Жалобы", m.anketa?.complaints || "");
    const patients = state.patients.map((pp) => {
      if (pp.id !== p.id) return pp;
      const members = pp.members.map((mm) =>
        mm.id === m.id
          ? {
              ...mm,
              anketa: {
                goal: goal || "",
                complaints: comp || "",
                updatedAt: new Date().toISOString(),
              },
            }
          : mm
      );
      return { ...pp, members };
    });
    state.patients = patients;
    saveState(state);
    renderApp();
    showToast("Анкета сохранена");
    return;
  }

    if (action === "patient-mark-external-anketa") {
    const p = getActivePatient();
    const m = getActiveMember();
    if (!p || !m) return;

    const workflow = m.workflow || {};
    if (!workflow.cardLink) {
      showToast("Сначала врач создаст карточку на диске");
      return;
    }

    const patients = state.patients.map((pp) => {
      if (pp.id !== p.id) return pp;
      const members = pp.members.map((mm) => {
        if (mm.id !== m.id) return mm;
        const w = { ...(mm.workflow || {}) };
        w.anketaExternalDone = true;
        w.anketaExternalDoneAt = new Date().toISOString();
        return {
          ...mm,
          workflow: w,
          chats: [
            ...(mm.chats || []),
            {
              from: "patient",
              text: "Я заполнил(а) анкету в Google Диске ✅",
              ts: Date.now(),
            },
          ],
        };
      });
      return { ...pp, members };
    });

    const notif = {
      id: uid("n"),
      title: "Анкета заполнена",
      body: `${p.name} (${p.phone}) • ${m.name}`,
      createdAt: new Date().toISOString(),
      unread: true,
    };

    setState({
      patients,
      notifications: [notif, ...state.notifications],
    });
    showToast("Отметили заполнение анкеты");
    return;
  }

  if (action === "patient-set-appointment") {
    const p = getActivePatient();
    const m = getActiveMember();
    if (!p || !m) return;

    const current = m.workflow?.appointmentDate || "";
    const val = prompt(
      "Введите дату и время консультации (например: 2025-02-01 14:00)",
      current
    );
    if (!val) return;

    const patients = state.patients.map((pp) => {
      if (pp.id !== p.id) return pp;
      const members = pp.members.map((mm) => {
        if (mm.id !== m.id) return mm;
        const w = { ...(mm.workflow || {}) };
        w.appointmentDate = val;
        w.appointmentSetAt = new Date().toISOString();
        return {
          ...mm,
          workflow: w,
          chats: [
            ...(mm.chats || []),
            {
              from: "patient",
              text: `Выбрал(а) дату консультации: ${val}`,
              ts: Date.now(),
            },
          ],
        };
      });
      return { ...pp, members };
    });

    const notif = {
      id: uid("n"),
      title: "Выбрана дата консультации",
      body: `${p.name} (${p.phone}) • ${m.name} • ${val}`,
      createdAt: new Date().toISOString(),
      unread: true,
    };

    setState({
      patients,
      notifications: [notif, ...state.notifications],
    });
    showToast("Дата консультации сохранена");
    return;
  }
  
  if (action === "open-lab") {
    const cat = btn.dataset.cat;
    const p = getActivePatient();
    const m = getActiveMember();
    if (!p || !m) return;
    const title = LAB_CATS.find((c) => c.id === cat)?.title || "Анализ";
    alert(
      `Открытие категории "${title}".\n\nЗдесь позже добавим загрузку файлов и историю — по аналогии с React.`
    );
    return;
  }

  if (action === "chat-send") {
    const input = document.getElementById("chat-input");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const p = getActivePatient();
    const m = getActiveMember();
    if (!p || !m) return;

    const patients = state.patients.map((pp) => {
      if (pp.id !== p.id) return pp;
      const members = pp.members.map((mm) => {
        if (mm.id !== m.id) return mm;
        return {
          ...mm,
          chats: [
            ...(mm.chats || []),
            { from: "patient", text, ts: Date.now() },
          ],
        };
      });
      return { ...pp, members };
    });

    state.patients = patients;
    saveState(state);
    renderApp();
    return;
  }
});

// Отправка по Enter в поле чата
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target && e.target.id === "chat-input") {
    e.preventDefault();
    const btn = document.querySelector("[data-action='chat-send']");
    if (btn) btn.click();
  }
});

// ----- Start -----
renderApp();
