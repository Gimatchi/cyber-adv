const STORAGE_KEY = 'cyber-adv.scenario-maker.draft.v1';
const COLLECTIONS = {
  characters: { label: '人物', prefix: 'character', fields: [['id','ID'],['name','表示名'],['role','役割'],['portrait','アイコン文字'],['description','説明'],['action','会話アクション（JSON）','json']] },
  evidence: { label: '証拠品', prefix: 'evidence', fields: [['id','ID'],['name','表示名'],['portrait','アイコン文字'],['description','説明'],['investigationOptions','調査項目（JSON配列）','json']] },
  logs: { label: 'ログ', prefix: 'log', fields: [['id','ID'],['name','表示名'],['description','説明'],['rows','ログ行（JSON配列）','json']] },
  facts: { label: '判明事項', prefix: 'fact', fields: [['id','ID'],['name','表示名'],['description','説明'],['sortOrder','表示順（数値）','number']] },
  events: { label: 'Event', prefix: 'event', fields: [['id','ID'],['trigger','起動条件（JSON）','json'],['effects','Effect（JSON配列）','json']] },
  conversations: { label: '会話', prefix: 'conversation', fields: [['id','ID'],['start','開始ノードID'],['completionEvent','完了Event ID'],['nodes','ノード定義（JSON）','json']] },
  actions: { label: '捜査アクション', prefix: 'action', fields: [['id','ID'],['name','表示名'],['requires','実行条件（JSON配列）','json'],['completionEvent','完了Event ID']] },
  hints: { label: 'ヒント', prefix: 'hint', fields: [['id','ID'],['target','対象ID'],['stages','段階定義（JSON配列）','json']] },
};
const $ = (selector) => document.querySelector(selector);
const ui = { tabs: $('#collection-tabs'), list: $('#item-list'), fields: $('#editor-fields'), title: $('#editor-title'), count: $('#item-count'), collectionTitle: $('#collection-title'), preview: $('#json-preview'), validation: $('#validation-list'), toast: $('#toast'), saveState: $('#save-state') };
let scenario = null;
let activeCollection = 'characters';
let selectedIndex = -1;
let toastTimer;

function blankScenario() { return { id: 'case_new', title: '新しい事件', defaults: {}, characters: [], evidence: [], logs: [], facts: [], events: [], conversations: [], actions: [], hints: [] }; }
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function showToast(message) { ui.toast.textContent = message; ui.toast.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2000); }
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario)); ui.saveState.textContent = '下書きをこのブラウザに保存しました'; } catch { ui.saveState.textContent = '自動保存できませんでした'; } }
function safeParse(text, description) { try { return JSON.parse(text); } catch (error) { throw new Error(`${description}のJSONが正しくありません: ${error.message}`); } }
function mutate() { renderList(); renderEditor(); renderPreview(); renderValidation(); persist(); }

function renderTabs() {
  ui.tabs.replaceChildren();
  for (const [key, config] of Object.entries(COLLECTIONS)) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `tab${key === activeCollection ? ' is-active' : ''}`; button.textContent = config.label;
    button.addEventListener('click', () => { activeCollection = key; selectedIndex = scenario[key].length ? Math.min(Math.max(selectedIndex, 0), scenario[key].length - 1) : -1; renderTabs(); renderList(); renderEditor(); });
    ui.tabs.append(button);
  }
  ui.collectionTitle.textContent = COLLECTIONS[activeCollection].label;
}
function renderList() {
  const items = scenario[activeCollection]; ui.count.textContent = String(items.length); ui.list.replaceChildren();
  items.forEach((item, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `entry${index === selectedIndex ? ' is-active' : ''}`; button.textContent = item.name || item.title || item.id || `新しい${COLLECTIONS[activeCollection].label}`;
    button.addEventListener('click', () => { selectedIndex = index; renderList(); renderEditor(); }); ui.list.append(button);
  });
}
function makeField(key, label, type, value) {
  const wrap = document.createElement('label'); wrap.className = 'field'; wrap.append(document.createTextNode(label));
  const input = type === 'json' ? document.createElement('textarea') : document.createElement('input');
  if (type === 'json') { input.value = JSON.stringify(value ?? (key === 'effects' || key === 'rows' || key === 'investigationOptions' ? [] : {}), null, 2); input.spellcheck = false; }
  else { input.value = value ?? ''; if (type === 'number') { input.type = 'number'; input.step = '1'; } else input.type = 'text'; input.autocomplete = 'off'; }
  input.addEventListener('input', () => {
    const item = scenario[activeCollection][selectedIndex];
    try { item[key] = type === 'json' ? safeParse(input.value, label) : type === 'number' ? (input.value === '' ? undefined : Number(input.value)) : input.value; input.setAttribute('aria-invalid','false'); renderList(); renderPreview(); renderValidation(); persist(); }
    catch { input.setAttribute('aria-invalid','true'); ui.validation.replaceChildren(); const li = document.createElement('li'); li.className = 'error'; li.textContent = `${label}: JSONを確認してください`; ui.validation.append(li); }
  });
  wrap.append(input);
  if (type === 'json') { const hint = document.createElement('span'); hint.className = 'field-hint'; hint.textContent = 'JSON形式で入力します。配列項目は [] で始めます。'; wrap.append(hint); }
  return wrap;
}
function renderEditor() {
  const item = scenario[activeCollection][selectedIndex]; ui.fields.replaceChildren(); $('#delete-button').hidden = !item;
  if (!item) { ui.title.textContent = '項目を選択してください'; const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = '左の一覧から項目を選ぶか、新しい項目を追加してください。'; ui.fields.append(empty); return; }
  ui.title.textContent = item.name || item.title || item.id || '項目を編集中';
  const fields = COLLECTIONS[activeCollection].fields;
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i]; ui.fields.append(makeField(...field, item[field[0]]));
  }
}
function currentJSON() { $('#case-id').value = scenario.id ?? ''; $('#case-title').value = scenario.title ?? ''; $('#case-defaults').value = JSON.stringify(scenario.defaults ?? {}, null, 2); renderPreview(); }
function renderPreview() { ui.preview.textContent = JSON.stringify(scenario, null, 2); }

function validateScenario() {
  const errors = [], warnings = [];
  if (!scenario.id?.trim()) errors.push('事件IDが空です'); if (!scenario.title?.trim()) errors.push('事件名が空です');
  const ids = new Map();
  for (const [collection, config] of Object.entries(COLLECTIONS)) {
    if (!Array.isArray(scenario[collection])) { errors.push(`${config.label}は配列である必要があります`); continue; }
    scenario[collection].forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push(`${config.label} ${index + 1} はJSONオブジェクトではありません`); return; }
      if (typeof item.id !== 'string' || !item.id.trim()) errors.push(`${config.label} ${index + 1} のIDがありません`);
      else if (ids.has(item.id)) errors.push(`ID「${item.id}」が${ids.get(item.id)}と重複しています`); else ids.set(item.id, `${config.label} ${index + 1}`);
      if (collection !== 'events' && !item.name?.trim()) errors.push(`${config.label}「${item.id || index + 1}」の表示名がありません`);
    });
  }
  const events = new Map((scenario.events ?? []).filter((e) => e?.id).map((e) => [e.id, e]));
  const eventRefs = [];
  for (const character of scenario.characters ?? []) if (character?.action?.eventId) eventRefs.push({ source: `人物 ${character.name || character.id}`, eventId: character.action.eventId, trigger: { type: 'action', target: character.action.id } });
  for (const evidence of scenario.evidence ?? []) for (const option of evidence?.investigationOptions ?? []) if (option?.eventId) eventRefs.push({ source: `証拠 ${evidence.name || evidence.id} / ${option.label || option.id}`, eventId: option.eventId, trigger: { type: 'evidence', target: evidence.id } });
  for (const log of scenario.logs ?? []) for (const row of log?.rows ?? []) if (row?.eventId) eventRefs.push({ source: `ログ ${log.name || log.id} / ${row.id}`, eventId: row.eventId, trigger: { type: 'logRow', target: row.id } });
  for (const ref of eventRefs) { const event = events.get(ref.eventId); if (!event) errors.push(`${ref.source} が参照するEvent「${ref.eventId}」がありません`); else if (event.trigger && (event.trigger.type !== ref.trigger.type || event.trigger.target !== ref.trigger.target)) warnings.push(`Event「${ref.eventId}」のtriggerが${ref.source}の参照と一致しません`); }
  for (const event of scenario.events ?? []) for (const effect of event?.effects ?? []) {
    if (!effect || typeof effect !== 'object') errors.push(`Event「${event.id}」に不正なEffectがあります`);
    else if (effect.type === 'add' && typeof effect.target !== 'string') errors.push(`Event「${event.id}」のadd Effectにtargetがありません`);
    else if (effect.type !== 'add') warnings.push(`Event「${event.id}」のEffect「${effect.type}」は現在の試作エンジンでは処理されません`);
  }
  return { errors, warnings };
}
function renderValidation() {
  const { errors, warnings } = validateScenario(); ui.validation.replaceChildren();
  if (!errors.length && !warnings.length) { const li = document.createElement('li'); li.className = 'ok'; li.textContent = 'エラーはありません。ID重複と主要なEvent参照を確認しました。'; ui.validation.append(li); return; }
  for (const message of [...errors, ...warnings]) { const li = document.createElement('li'); li.className = errors.includes(message) ? 'error' : ''; li.textContent = `${errors.includes(message) ? 'エラー' : '確認'}：${message}`; ui.validation.append(li); }
}
function addItem() {
  const config = COLLECTIONS[activeCollection], index = scenario[activeCollection].length + 1;
  const item = { id: `${config.prefix}_new_${String(index).padStart(3,'0')}` };
  for (const [key,,type] of config.fields) { if (key === 'id') continue; if (type === 'json') item[key] = ['effects','rows','investigationOptions'].includes(key) ? [] : {}; else if (type === 'number') item[key] = index * 10; else item[key] = ''; }
  scenario[activeCollection].push(item); selectedIndex = scenario[activeCollection].length - 1; mutate();
  const idInput = ui.fields.querySelector('input'); idInput?.focus(); idInput?.select();
}
function deleteItem() { if (selectedIndex < 0) return; scenario[activeCollection].splice(selectedIndex, 1); selectedIndex = scenario[activeCollection].length ? Math.min(selectedIndex, scenario[activeCollection].length - 1) : -1; mutate(); }
function download() {
  const result = validateScenario(); if (result.errors.length) { showToast(`エラー ${result.errors.length} 件を修正してください`); return; }
  const blob = new Blob([`${JSON.stringify(scenario, null, 2)}\n`], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${scenario.id || 'scenario'}.json`; link.click(); URL.revokeObjectURL(link.href); showToast('シナリオJSONを書き出しました');
}
async function loadFile(file) { try { const parsed = safeParse(await file.text(), 'ファイル'); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSONの最上位はオブジェクトにしてください'); scenario = parsed; for (const collection of Object.keys(COLLECTIONS)) if (!Array.isArray(scenario[collection])) scenario[collection] = []; activeCollection = 'characters'; selectedIndex = -1; renderAll(); persist(); showToast('JSONを読み込みました'); } catch (error) { showToast(error.message); } }
function renderAll() { renderTabs(); renderList(); renderEditor(); currentJSON(); renderValidation(); }

$('#case-id').addEventListener('input', (event) => { scenario.id = event.target.value; renderPreview(); renderValidation(); persist(); });
$('#case-title').addEventListener('input', (event) => { scenario.title = event.target.value; renderPreview(); renderValidation(); persist(); });
$('#case-defaults').addEventListener('input', (event) => { try { scenario.defaults = safeParse(event.target.value, '共通背景'); event.target.setAttribute('aria-invalid','false'); renderPreview(); persist(); } catch { event.target.setAttribute('aria-invalid','true'); } });
$('#add-button').addEventListener('click', addItem); $('#delete-button').addEventListener('click', deleteItem); $('#download-button').addEventListener('click', download);
$('#validate-button').addEventListener('click', () => { renderValidation(); showToast('データを検証しました'); });
$('#file-input').addEventListener('change', (event) => { const file = event.target.files?.[0]; if (file) loadFile(file); event.target.value = ''; });
$('#copy-button').addEventListener('click', async () => { try { await navigator.clipboard.writeText(JSON.stringify(scenario, null, 2)); showToast('JSONをコピーしました'); } catch { showToast('コピーできません。JSONを選択してコピーしてください'); } });

async function start() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { try { scenario = safeParse(saved, '保存データ'); } catch { scenario = blankScenario(); } }
  else {
    scenario = blankScenario();
    const source = new URLSearchParams(location.search).get('source');
    if (source) { try { const response = await fetch(`../${encodeURIComponent(source)}`); if (response.ok) scenario = await response.json(); } catch { /* blank scenario remains usable when opened locally without a server */ } }
  }
  for (const key of Object.keys(COLLECTIONS)) if (!Array.isArray(scenario[key])) scenario[key] = [];
  if (!scenario.defaults || typeof scenario.defaults !== 'object' || Array.isArray(scenario.defaults)) scenario.defaults = {};
  renderAll(); persist();
}
start().catch((error) => { ui.fields.textContent = error.message; });

