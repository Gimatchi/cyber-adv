const STORAGE_KEY = 'cyber-adv.case001.prototype.v1';

const defaultState = {
  activeTab: 'evidence',
  selectedCharacterId: 'ayaka',
  selectedEvidenceId: null,
  selectedFactId: null,
  evidence: [],
  facts: [],
  completedEvents: [],
  examinedEvidenceOptions: [],
};

let scenario;
let state = { ...defaultState };
let toastTimeout;

const ui = {
  people: document.querySelector('#people-list'),
  evidence: document.querySelector('#evidence-list'),
  detail: document.querySelector('#detail-view'),
  inspectionDialog: document.querySelector('#inspection-dialog'),
  inspectionContent: document.querySelector('#inspection-content'),
  peopleCount: document.querySelector('#people-count'),
  evidenceCount: document.querySelector('#evidence-count'),
  saveStatus: document.querySelector('#save-status'),
  saveDot: document.querySelector('#save-indicator-dot'),
  toast: document.querySelector('#toast'),
};

function readSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return { ...defaultState };

    return {
      ...defaultState,
      ...saved,
      evidence: Array.isArray(saved.evidence) ? saved.evidence : [],
      facts: Array.isArray(saved.facts) ? saved.facts : [],
      completedEvents: Array.isArray(saved.completedEvents) ? saved.completedEvents : [],
      examinedEvidenceOptions: Array.isArray(saved.examinedEvidenceOptions) ? saved.examinedEvidenceOptions : [],
    };
  } catch {
    return { ...defaultState };
  }
}

function persistState(manual = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
    ui.saveStatus.textContent = `保存済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
    ui.saveDot.classList.remove('is-pending');
    if (manual) showToast('この画面の状態を保存しました');
  } catch {
    ui.saveStatus.textContent = '保存できません';
    ui.saveDot.classList.add('is-pending');
  }
}

function markPending() {
  persistState();
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('is-visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => ui.toast.classList.remove('is-visible'), 2100);
}

function findCharacter(id) {
  return scenario.characters.find((character) => character.id === id);
}

function findEvidence(id) {
  return scenario.evidence.find((item) => item.id === id);
}

function makeButton(className, label, onClick, selected = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${className}${selected ? ' is-selected' : ''}`;
  button.addEventListener('click', onClick);
  if (label instanceof Node) button.append(label);
  else button.textContent = label;
  return button;
}

function renderPeople() {
  ui.people.replaceChildren();
  ui.peopleCount.textContent = String(scenario.characters.length);

  for (const character of scenario.characters) {
    const content = document.createElement('span');
    content.className = 'item-copy';
    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = character.name;
    const role = document.createElement('span');
    role.className = 'item-meta';
    role.textContent = character.role;
    content.append(name, role);

    const avatar = document.createElement('span');
    avatar.className = `avatar${character.id === state.selectedCharacterId ? ' is-accent' : ''}`;
    avatar.textContent = character.portrait;

    const button = makeButton('list-item', '', () => {
      state.selectedCharacterId = character.id;
      state.selectedEvidenceId = null;
      render();
      markPending();
    }, character.id === state.selectedCharacterId && !state.selectedEvidenceId);
    button.setAttribute('aria-pressed', String(character.id === state.selectedCharacterId && !state.selectedEvidenceId));
    button.append(avatar, content);
    ui.people.append(button);
  }
}

function renderEvidence() {
  const visibleItems = scenario.evidence.filter((item) => state.evidence.includes(item.id));
  ui.evidence.replaceChildren();
  ui.evidenceCount.textContent = String(visibleItems.length);
  document.querySelectorAll('.tab-button').forEach((tab) => {
    const active = tab.dataset.tab === state.activeTab;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  if (state.activeTab === 'logs') {
    ui.evidenceCount.textContent = String(scenario.logs.length);
    for (const logFile of scenario.logs) {
      const log = makeButton('list-item', '', () => {
        state.selectedCharacterId = null;
        state.selectedEvidenceId = logFile.id;
        render();
        markPending();
      }, state.selectedEvidenceId === logFile.id);
      const avatar = document.createElement('span');
      avatar.className = 'avatar';
      avatar.textContent = 'LOG';
      const copy = document.createElement('span');
      copy.className = 'item-copy';
      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = logFile.name;
      const meta = document.createElement('span');
      meta.className = 'item-meta';
      meta.textContent = 'ログファイル';
      copy.append(name, meta);
      log.append(avatar, copy);
      ui.evidence.append(log);
    }
    return;
  }

  if (state.activeTab === 'facts') {
    renderFactList();
    return;
  }

  if (visibleItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'まだ証拠品がありません。人物に話を聞いて、資料を集めましょう。';
    ui.evidence.append(empty);
    return;
  }

  for (const item of visibleItems) {
    const button = makeButton('list-item', '', () => {
      state.selectedCharacterId = null;
      state.selectedEvidenceId = item.id;
      render();
      markPending();
    }, state.selectedEvidenceId === item.id);
    const avatar = document.createElement('span');
    avatar.className = 'avatar is-accent';
    avatar.textContent = item.portrait ?? 'EV';
    const copy = document.createElement('span');
    copy.className = 'item-copy';
    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.name;
    const meta = document.createElement('span');
    meta.className = 'item-meta';
    meta.textContent = '取得済み';
    copy.append(name, meta);
    button.append(avatar, copy);
    ui.evidence.append(button);
  }
}

function createActionButton(label, disabled, onClick) {
  const button = makeButton('action-button', label, onClick);
  button.disabled = disabled;
  return button;
}

function runEvent(eventId) {
  if (state.completedEvents.includes(eventId)) {
    showToast('この操作はすでに完了しています');
    return;
  }
  const event = scenario.events.find((entry) => entry.id === eventId);
  if (!event) return;

  for (const effect of event.effects) {
    if (effect.type !== 'add') continue;
    const [collection, id] = effect.target.split('.');
    if (!['evidence', 'facts'].includes(collection)) continue;
    const target = state[collection];
    if (!target.includes(id)) target.push(id);
  }
  state.completedEvents.push(event.id);
  render();
  persistState();
  showToast('捜査の進行を保存しました');
}

function renderPerson(character) {
  const header = document.createElement('div');
  header.className = 'detail-topline';
  header.textContent = 'PERSONNEL FILE / 聞き込み対象';

  const card = document.createElement('div');
  card.className = 'detail-card';
  const portrait = document.createElement('div');
  portrait.className = 'portrait';
  portrait.textContent = character.portrait;
  const copy = document.createElement('div');
  copy.className = 'detail-copy';
  const role = document.createElement('div');
  role.className = 'detail-role';
  role.textContent = character.role;
  const name = document.createElement('h2');
  name.textContent = character.name;
  const description = document.createElement('p');
  description.className = 'detail-description';
  description.textContent = character.description;
  const id = document.createElement('div');
  id.className = 'detail-id';
  id.textContent = `ID  ${character.id}`;
  copy.append(role, name, description, id);

  if (character.action) {
    const done = state.completedEvents.includes(character.action.eventId);
    const button = createActionButton(done ? '話をした' : character.action.label, done, () => runEvent(character.action.eventId));
    copy.append(button);
  }
  card.append(portrait, copy);
  ui.detail.replaceChildren(header, card);
}

function renderEvidenceDetail(item) {
  const header = document.createElement('div');
  header.className = 'detail-topline';
  header.textContent = 'EVIDENCE FILE / 証拠品';
  const card = document.createElement('div');
  card.className = 'detail-card';
  const portrait = document.createElement('div');
  portrait.className = 'portrait evidence-art';
  portrait.textContent = item.id === 'ev_ayaka_phone' ? 'PHONE' : 'FILE';
  const copy = document.createElement('div');
  copy.className = 'detail-copy';
  const role = document.createElement('div');
  role.className = 'detail-role';
  role.textContent = '取得済み資料';
  const name = document.createElement('h2');
  name.textContent = item.name;
  const description = document.createElement('p');
  description.className = 'detail-description';
  description.textContent = item.description;
  const id = document.createElement('div');
  id.className = 'detail-id';
  id.textContent = `ID  ${item.id}`;
  copy.append(role, name, description, id);

  const investigationOptions = item.investigationOptions ?? [];
  const isComplete = investigationOptions.length > 0 && investigationOptions.every((option) => isInspectionOptionComplete(item, option));
  copy.append(createActionButton(isComplete ? '調査済み' : '証拠品を調べる', isComplete, () => openInspectionDialog(item)));
  card.append(portrait, copy);
  ui.detail.replaceChildren(header, card);
}

function renderLog(logFile) {
  const header = document.createElement('div');
  header.className = 'detail-topline';
  header.textContent = 'LOG FILE / ログ調査';
  const title = document.createElement('h2');
  title.textContent = logFile.name;
  title.style.margin = '19px 0 7px';
  const intro = document.createElement('p');
  intro.className = 'detail-description';
  intro.textContent = `${logFile.description} 「？」の行を選ぶとログを解析します。`;
  const wrapper = document.createElement('div');
  wrapper.className = 'log-view';
  wrapper.append(title, intro);
  for (const logLine of logFile.rows) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'log-row';
    row.disabled = !logLine.important || state.completedEvents.includes(logLine.eventId);
    const flag = document.createElement('span');
    flag.className = 'question-flag';
    flag.textContent = logLine.important ? '?' : '';
    const text = document.createElement('span');
    text.textContent = `${logLine.time}  ${logLine.text}`;
    row.append(flag, text);
    if (logLine.important) {
      const action = document.createElement('span');
      action.className = 'log-action-label';
      action.textContent = '解析する';
      row.append(action);
      row.setAttribute('aria-label', `ログを解析する：${logLine.time} ${logLine.text}`);
      row.addEventListener('click', () => runEvent(logLine.eventId));
    }
    wrapper.append(row);
  }
  ui.detail.replaceChildren(header, wrapper);
}

function renderDetail() {
  if (state.activeTab === 'facts') {
    const fact = scenario.facts.find((entry) => entry.id === state.selectedFactId && state.facts.includes(entry.id));
    if (fact) {
      renderFactReport(fact);
      return;
    }
    const header = document.createElement('div');
    header.className = 'detail-topline';
    header.textContent = 'INVESTIGATION REPORT / 捜査報告書';
    const empty = document.createElement('p');
    empty.className = 'empty-state report-empty';
    empty.textContent = '左の一覧から判明事項を選ぶと、捜査報告書の形式で内容を確認できます。';
    ui.detail.replaceChildren(header, empty);
    return;
  }
  const logFile = state.activeTab === 'logs' && scenario.logs.find((log) => log.id === state.selectedEvidenceId);
  if (logFile) {
    renderLog(logFile);
    return;
  }
  const evidence = state.selectedEvidenceId && findEvidence(state.selectedEvidenceId);
  if (evidence && state.evidence.includes(evidence.id)) {
    renderEvidenceDetail(evidence);
    return;
  }
  const character = findCharacter(state.selectedCharacterId) ?? scenario.characters[0];
  state.selectedCharacterId = character.id;
  renderPerson(character);
}

function renderFactList() {
  const visibleFacts = scenario.facts.filter((fact) => state.facts.includes(fact.id));
  ui.evidenceCount.textContent = String(visibleFacts.length);
  ui.evidence.replaceChildren();
  if (!visibleFacts.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '捜査で判明した情報はまだありません。';
    ui.evidence.append(empty);
    return;
  }
  for (const fact of visibleFacts) {
    const button = makeButton('list-item', '', () => {
      state.selectedFactId = fact.id;
      state.selectedCharacterId = null;
      state.selectedEvidenceId = null;
      render();
      markPending();
    }, state.selectedFactId === fact.id);
    const icon = document.createElement('span');
    icon.className = 'avatar is-accent';
    icon.textContent = '報';
    const copy = document.createElement('span');
    copy.className = 'item-copy';
    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = fact.name;
    const meta = document.createElement('span');
    meta.className = 'item-meta';
    meta.textContent = '判明事項を確認する';
    copy.append(name, meta);
    button.append(icon, copy);
    ui.evidence.append(button);
  }
}

function renderFactReport(fact) {
  const header = document.createElement('div');
  header.className = 'detail-topline';
  header.textContent = 'INVESTIGATION REPORT / 捜査報告書';
  const report = document.createElement('article');
  report.className = 'fact-report';
  const label = document.createElement('div');
  label.className = 'report-label';
  label.textContent = '判明事項';
  const title = document.createElement('h2');
  title.textContent = fact.name;
  const description = document.createElement('p');
  description.textContent = fact.description;
  const footer = document.createElement('div');
  footer.className = 'report-footer';
  footer.textContent = 'これまでの捜査で記録された内容';
  report.append(label, title, description, footer);
  ui.detail.replaceChildren(header, report);
}

function isInspectionOptionComplete(item, option) {
  return state.examinedEvidenceOptions.includes(`${item.id}.${option.id}`)
    || (option.eventId && state.completedEvents.includes(option.eventId));
}

function openInspectionDialog(item) {
  renderInspectionChoices(item);
  ui.inspectionDialog.showModal();
}

function renderInspectionChoices(item) {
  ui.inspectionContent.replaceChildren();
  const prompt = document.createElement('p');
  prompt.className = 'detail-description';
  prompt.textContent = `「${item.name}」のどこを調べますか？`;
  const choices = document.createElement('div');
  choices.className = 'inspection-choices';
  for (const option of item.investigationOptions ?? []) {
    const done = isInspectionOptionComplete(item, option);
    const choice = createActionButton(done ? `${option.label}（調査済み）` : option.label, done, () => inspectEvidenceOption(item, option));
    choices.append(choice);
  }
  if (!choices.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'この証拠品には、まだ調査項目が登録されていません。';
    choices.append(empty);
  }
  ui.inspectionContent.append(prompt, choices);
}

function inspectEvidenceOption(item, option) {
  const optionKey = `${item.id}.${option.id}`;
  if (isInspectionOptionComplete(item, option)) return;
  if (option.eventId) runEvent(option.eventId);
  state.examinedEvidenceOptions.push(optionKey);
  persistState();
  ui.inspectionContent.replaceChildren();
  const resultTitle = document.createElement('h3');
  resultTitle.className = 'inspection-result-title';
  resultTitle.textContent = option.label;
  const result = document.createElement('p');
  result.className = 'inspection-result';
  result.textContent = option.result;
  const next = createActionButton('ほかの項目を調べる', false, () => renderInspectionChoices(item));
  ui.inspectionContent.append(resultTitle, result, next);
  render();
}

function render() {
  renderPeople();
  renderEvidence();
  renderDetail();
}

async function start() {
  const response = await fetch('./case001.json');
  if (!response.ok) throw new Error('シナリオデータを読み込めませんでした');
  scenario = await response.json();
  state = readSavedState();

  document.querySelectorAll('.tab-button').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.activeTab = tab.dataset.tab;
      if (state.activeTab === 'evidence' && scenario.logs.some((log) => log.id === state.selectedEvidenceId)) state.selectedEvidenceId = null;
      if (state.activeTab === 'facts' && !state.facts.includes(state.selectedFactId)) {
        state.selectedFactId = scenario.facts.find((fact) => state.facts.includes(fact.id))?.id ?? null;
      }
      render();
      markPending();
    });
  });
  document.querySelector('#inspection-close').addEventListener('click', () => ui.inspectionDialog.close());
  ui.inspectionDialog.addEventListener('click', (event) => {
    if (event.target === ui.inspectionDialog) ui.inspectionDialog.close();
  });
  document.querySelector('#save-button').addEventListener('click', () => persistState(true));
  document.querySelector('#reset-button').addEventListener('click', () => {
    if (!window.confirm('このブラウザに保存した試作データを消去しますか？')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = { ...defaultState };
    render();
    persistState();
    showToast('試作データをリセットしました');
  });

  state.evidence = state.evidence.filter((id) => scenario.evidence.some((item) => item.id === id));
  state.facts = state.facts.filter((id) => scenario.facts.some((fact) => fact.id === id));
  state.completedEvents = state.completedEvents.filter((id) => scenario.events.some((event) => event.id === id));
  const validInspectionKeys = scenario.evidence.flatMap((item) => (item.investigationOptions ?? []).map((option) => `${item.id}.${option.id}`));
  state.examinedEvidenceOptions = state.examinedEvidenceOptions.filter((key) => validInspectionKeys.includes(key));
  if (!['evidence', 'logs', 'facts'].includes(state.activeTab)) state.activeTab = 'evidence';
  if (!scenario.facts.some((fact) => fact.id === state.selectedFactId)) state.selectedFactId = null;
  render();
  persistState();
}

start().catch((error) => {
  document.querySelector('#detail-view').textContent = error.message;
  document.querySelector('#save-status').textContent = '読み込みに失敗';
});
