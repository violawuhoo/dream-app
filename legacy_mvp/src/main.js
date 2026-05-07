import {
  chooseInterpretation,
  confirmSummary,
  correctSummary,
  finalizeRecord,
  requestDirectSummary,
  startDreamSession,
  stopSession,
  submitDreamMessage,
} from "./orchestrator.js";
import { clearUser, loadDreamRecords, loadUser, saveDreamRecord, saveUser } from "./storage.js";

const screens = {
  login: document.querySelector("#login-screen"),
  home: document.querySelector("#home-screen"),
  conversation: document.querySelector("#conversation-screen"),
  history: document.querySelector("#history-screen"),
};

const navButtons = [...document.querySelectorAll(".nav-button")];
const recentRecordsNode = document.querySelector("#recent-records");
const historyListNode = document.querySelector("#history-list");
const startSessionButton = document.querySelector("#start-session-button");
const historyLinkButton = document.querySelector("#history-link-button");
const stopFlowButton = document.querySelector("#stop-flow-button");
const chatLog = document.querySelector("#chat-log");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const stateLabel = document.querySelector("#state-label");
const summaryPanel = document.querySelector("#summary-panel");
const summaryContent = document.querySelector("#summary-content");
const confirmSummaryButton = document.querySelector("#confirm-summary-button");
const editSummaryButton = document.querySelector("#edit-summary-button");
const interpretationPanel = document.querySelector("#interpretation-panel");
const interpretationContent = document.querySelector("#interpretation-content");
const interpretationDisclaimer = document.querySelector("#interpretation-disclaimer");
const saveRecordButton = document.querySelector("#save-record-button");
const discardRecordButton = document.querySelector("#discard-record-button");
const directSummaryButton = document.querySelector("#direct-summary-button");
const interpretButton = document.querySelector("#interpret-button");
const skipInterpretationButton = document.querySelector("#skip-interpretation-button");
const messageTemplate = document.querySelector("#message-template");
const loginGoogleButton = document.querySelector("#login-google-button");
const loginInstagramButton = document.querySelector("#login-instagram-button");
const loginXButton = document.querySelector("#login-x-button");
const loginGuestButton = document.querySelector("#login-guest-button");
const mobileNav = document.querySelector(".mobile-nav");
const mobileLogoutButton = document.querySelector("#mobile-logout-button");

let session = null;
let records = loadDreamRecords();
let user = loadUser();
let isSubmitting = false;

function switchScreen(route) {
  Object.values(screens).forEach((screen) => screen.classList.remove("screen-visible"));
  if (route === "login") {
    screens.login.classList.add("screen-visible");
  }
  if (route === "home") {
    screens.home.classList.add("screen-visible");
  }
  if (route === "conversation") {
    screens.conversation.classList.add("screen-visible");
  }
  if (route === "history") {
    screens.history.classList.add("screen-visible");
  }
  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === route && route !== "login");
  });
  mobileNav?.classList.toggle("hidden", route === "login");
  mobileLogoutButton?.classList.toggle("hidden", !user);
}

function navigateToRoute(route) {
  if (route !== "login" && !user) {
    switchScreen("login");
    return false;
  }
  switchScreen(route);
  return false;
}

function renderMessages() {
  chatLog.innerHTML = "";
  if (!session) {
    return;
  }

  session.messages.forEach((message) => {
    const fragment = messageTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".message");
    const role = fragment.querySelector(".message-role");
    const body = fragment.querySelector(".message-body");
    article.classList.add(`message-${message.role}`);
    role.textContent = message.role === "assistant" ? "Veil" : "You";
    body.textContent = message.content;
    chatLog.appendChild(fragment);
  });
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderSummaryPanel() {
  const visible = Boolean(session?.state === "STRUCTURED" && session?.summary);
  summaryPanel.classList.toggle("hidden", !visible);
  if (visible) {
    summaryContent.textContent = session.summary;
  }
  confirmSummaryButton.classList.toggle("hidden", !visible);
  editSummaryButton.classList.toggle("hidden", !visible);
}

function renderInterpretationPanel() {
  const visible = Boolean(session?.state === "DONE" && session?.summary);
  interpretationPanel.classList.toggle("hidden", !visible);
  if (visible) {
    const interpretation =
      session.interpretation || "No interpretation was added. The dream will be kept as a plain record.";
    interpretationContent.innerHTML = interpretation.split("\n\n").map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("What stands out") || 
        trimmed.startsWith("1.") || 
        trimmed.startsWith("What it could suggest") || 
        trimmed.startsWith("2.")) {
        return `<p class="interpretation-section">${trimmed}</p>`;
      }
      return `<p>${trimmed}</p>`;
    }).join("");
  }
  if (interpretationDisclaimer) {
    interpretationDisclaimer.classList.toggle("hidden", !visible);
  }
  const showSaveControls = visible && !Boolean(session?.completedRecord);
  saveRecordButton.classList.toggle("hidden", !showSaveControls);
  discardRecordButton?.classList.toggle("hidden", !showSaveControls);
}

function renderControls() {
  const canSkipInterpretation = Boolean(
    session?.interpretationDecisionPending || session?.state === "INTERPRETING",
  );
  const canRequestInterpretation = Boolean(session?.interpretationDecisionPending);
  const showComposer = Boolean(session) &&
    session.state !== "DONE" &&
    session.state !== "STRUCTURED";
  skipInterpretationButton.classList.toggle("hidden", !canSkipInterpretation);
  interpretButton.classList.toggle("hidden", !canRequestInterpretation);
  chatForm.classList.toggle("hidden", !showComposer);
  directSummaryButton.classList.toggle("hidden", !showComposer);
  stateLabel.textContent = session?.state ?? "RAW";
  chatInput.disabled = isSubmitting;
}

function renderHistory() {
  recentRecordsNode.innerHTML = "";
  historyListNode.innerHTML = "";

  if (!records.length) {
    const empty = `<p class="empty-copy">Nothing has been kept yet.</p>`;
    recentRecordsNode.innerHTML = empty;
    historyListNode.innerHTML = empty;
    return;
  }

  records.slice(0, 3).forEach((record) => {
    const item = document.createElement("article");
    item.className = "record-card compact";
    item.innerHTML = `
      <p class="record-date">${new Date(record.created_at).toLocaleString()}</p>
      <p class="record-title">${record.title || record.narrative}</p>
    `;
    recentRecordsNode.appendChild(item);
  });

  records.forEach((record) => {
    const item = document.createElement("article");
    item.className = "record-card";
    item.innerHTML = `
      <p class="record-date">${new Date(record.created_at).toLocaleString()}</p>
      <p class="record-title">${record.title || record.narrative}</p>
      <p class="record-meta">Keywords: ${record.keywords.join(", ") || "none"}</p>
      <p class="record-meta">Emotions: ${record.emotions.join(", ") || "none"}</p>
      <p class="record-meta">${record.interpretation || "No interpretation saved."}</p>
    `;
    historyListNode.appendChild(item);
  });
}

function renderSession() {
  renderMessages();
  renderSummaryPanel();
  renderInterpretationPanel();
  renderControls();
}

function beginSession() {
  if (!user) {
    switchScreen("login");
    return;
  }
  session = startDreamSession();
  switchScreen("conversation");
  renderSession();
  chatInput.focus();
}

window.__dreamAppBooted = true;
window.__dreamAppBeginSession = beginSession;
window.__dreamAppInternalNavigate = navigateToRoute;

async function persistCurrentRecord() {
  if (!session) {
    return;
  }
  isSubmitting = true;
  renderSession();
  try {
    const record = await finalizeRecord(session);
    records = saveDreamRecord(record);
    renderHistory();
    renderSession();
  } finally {
    isSubmitting = false;
    renderSession();
  }
}

historyLinkButton.addEventListener("click", () => {
  switchScreen("history");
});

function completeLogin(provider) {
  const nextUser = saveUser({
    provider,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  });
  user = nextUser;
  switchScreen("home");
}

loginGoogleButton?.addEventListener("click", () => completeLogin("google"));
loginInstagramButton?.addEventListener("click", () => completeLogin("instagram"));
loginXButton?.addEventListener("click", () => completeLogin("x"));
loginGuestButton?.addEventListener("click", () => completeLogin("guest"));

mobileLogoutButton?.addEventListener("click", () => {
  clearUser();
  user = null;
  session = null;
  switchScreen("login");
});

stopFlowButton.addEventListener("click", () => {
  if (!session) {
    return;
  }
  stopSession(session);
  renderSession();
});

async function handleChatSubmit(event) {
  event.preventDefault();
  if (isSubmitting) {
    return false;
  }
  if (!session) {
    switchScreen("conversation");
    return false;
  }

  const input = chatInput.value.trim();
  if (!input) {
    return false;
  }

  isSubmitting = true;
  renderSession();

  try {
    if (session.interpretationDecisionPending) {
      const decision = input.toLowerCase();
      await chooseInterpretation(session, decision.startsWith("y"));
    } else {
      await submitDreamMessage(session, input);
    }

    chatInput.value = "";
    renderSession();
    switchScreen("conversation");
  } catch (error) {
    session.messages.push({
      role: "assistant",
      content:
        error instanceof Error
          ? `The thread blurred for a moment: ${error.message}`
          : "The thread blurred for a moment.",
    });
    renderSession();
  } finally {
    isSubmitting = false;
    renderSession();
    if (session?.state !== "STRUCTURED" && session?.state !== "DONE") {
      chatInput.focus();
    }
  }

  return false;
}

window.__dreamAppHandleSubmit = handleChatSubmit;

directSummaryButton.addEventListener("click", async () => {
  if (!session) {
    return;
  }
  if (isSubmitting) {
    return;
  }
  isSubmitting = true;
  renderSession();
  try {
    await requestDirectSummary(session);
    renderSession();
  } catch (error) {
    session.messages.push({
      role: "assistant",
      content:
        error instanceof Error
          ? `The summary would not come through cleanly: ${error.message}`
          : "The summary would not come through cleanly.",
    });
    renderSession();
  } finally {
    isSubmitting = false;
    renderSession();
  }
});

interpretButton.addEventListener("click", async () => {
  if (!session || isSubmitting) {
    return;
  }
  isSubmitting = true;
  renderSession();
  try {
    await chooseInterpretation(session, true);
    renderSession();
  } finally {
    isSubmitting = false;
    renderSession();
  }
});

confirmSummaryButton.addEventListener("click", () => {
  if (!session) {
    return;
  }
  confirmSummary(session);
  renderSession();
});

editSummaryButton.addEventListener("click", () => {
  if (!session) {
    return;
  }
  const updated = window.prompt("Rewrite the summary so it matches the dream more precisely.", session.summary);
  if (!updated) {
    return;
  }
  correctSummary(session, updated);
  renderSession();
});

skipInterpretationButton.addEventListener("click", async () => {
  if (!session || isSubmitting) {
    return;
  }
  isSubmitting = true;
  renderSession();
  try {
    await chooseInterpretation(session, false);
    renderSession();
  } finally {
    isSubmitting = false;
    renderSession();
  }
});

saveRecordButton.addEventListener("click", persistCurrentRecord);
discardRecordButton?.addEventListener("click", () => {
  session = null;
  switchScreen("home");
  renderSession();
});

renderHistory();
switchScreen(user ? "home" : "login");
