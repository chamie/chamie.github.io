/* ---------- IndexedDB ---------- */
const DB_NAME = 'adhd_buffer', DB_VER = 1, STORE = 'notes';
let db;
function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e=>{
      const d = e.target.result;
      if(!d.objectStoreNames.contains(STORE)){
        const os = d.createObjectStore(STORE, {keyPath:'id'});
        os.createIndex('createdAt','createdAt');
      }
    };
    req.onsuccess = e=>resolve(e.target.result);
    req.onerror = e=>reject(e.target.error);
  });
}
function tx(mode){ return db.transaction(STORE, mode).objectStore(STORE); }
function putNote(note){
  return new Promise((res,rej)=>{
    const r = tx('readwrite').put(note);
    r.onsuccess=()=>res(); r.onerror=()=>rej(r.error);
  });
}
function deleteNote(id){
  return new Promise((res,rej)=>{
    const r = tx('readwrite').delete(id);
    r.onsuccess=()=>res(); r.onerror=()=>rej(r.error);
  });
}
function getAllNotes(){
  return new Promise((res,rej)=>{
    const r = tx('readonly').getAll();
    r.onsuccess=()=>res(r.result.sort((a,b)=>b.createdAt-a.createdAt));
    r.onerror=()=>rej(r.error);
  });
}

/* ---------- Метаданные (не блокируют сохранение) ---------- */
function id(){
  // crypto.randomUUID доступен только в secure context (HTTPS или localhost).
  // На обычном HTTP (например, IP в локальной сети) даём запасной вариант.
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function deviceMeta(){
  return {
    ua: navigator.userAgent,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width}x${screen.height}`,
    platform: navigator.platform || null,
  };
}

// Гео запрашивается один раз при загрузке страницы (не при каждой заметке),
// последняя известная позиция кэшируется и подставляется в заметки,
// созданные до первого ответа геолокации, — асинхронно, по получении.
let lastGeo = null;
function initGeoWatch(){
  if(!('geolocation' in navigator)) return;
  navigator.geolocation.watchPosition(
    pos=>{ lastGeo = {lat:pos.coords.latitude, lon:pos.coords.longitude, acc:pos.coords.accuracy}; },
    ()=>{ /* доступ не дан или недоступно — молча игнорируем, это не блокирует захват */ },
    {enableHighAccuracy:false, maximumAge:60000, timeout:8000}
  );
}

/* ---------- Рендер ---------- */
const listEl = document.getElementById('list');
const countEl = document.getElementById('count');

function fmtTime(ts){
  const d = new Date(ts);
  return d.toLocaleString(undefined, {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
}

async function render(){
  const notes = await getAllNotes();
  countEl.textContent = `${notes.length} заметок`;
  listEl.innerHTML = '';
  if(notes.length === 0){
    listEl.innerHTML = '<div id="empty">Пока пусто</div>';
    return;
  }
  for(const n of notes){
    const div = document.createElement('div');
    div.className = 'note';
    const metaParts = [`<span>${fmtTime(n.createdAt)}</span>`];
    if(n.geo) metaParts.push(`<span>📍 ${n.geo.lat.toFixed(4)}, ${n.geo.lon.toFixed(4)}</span>`);
    if(n.device && n.device.tz) metaParts.push(`<span>${n.device.tz}</span>`);
    let mediaHtml = '';
    if(n.attachments && n.attachments.length){
      mediaHtml = '<div class="media">' + n.attachments.map(a=>{
        if(a.kind === 'image') return `<img src="${a.url}" alt="">`;
        if(a.kind === 'video') return `<video src="${a.url}" controls></video>`;
        if(a.kind === 'audio') return `<audio src="${a.url}" controls style="width:180px"></audio>`;
        return `<a href="${a.url}" download="${a.name||'file'}">📎 ${a.name||'файл'}</a>`;
      }).join('') + '</div>';
    }
    div.innerHTML = `
      <button class="del" data-id="${n.id}">✕</button>
      <div class="txt"></div>
      ${mediaHtml}
      <div class="meta">${metaParts.join('')}</div>
    `;
    div.querySelector('.txt').textContent = n.text || '';
    listEl.appendChild(div);
  }
  listEl.querySelectorAll('.del').forEach(btn=>{
    btn.onclick = async ()=>{
      const noteId = btn.dataset.id;
      const n = (await getAllNotes()).find(x=>x.id===noteId);
      if(n && n.attachments) n.attachments.forEach(a=>a.url && URL.revokeObjectURL(a.url));
      await deleteNote(noteId);
      render();
    };
  });
}

/* ---------- Черновик: текст + вложения копятся до явного сохранения ---------- */
let draftAttachments = []; // [{kind,name,url,size,blob}]

function kindOf(mime){
  if(mime.startsWith('image/')) return 'image';
  if(mime.startsWith('video/')) return 'video';
  if(mime.startsWith('audio/')) return 'audio';
  return 'file';
}
function attachFromFile(file){
  return { kind: kindOf(file.type), name: file.name, url: URL.createObjectURL(file), size: file.size };
}

const pendingEl = document.getElementById('pending');
function renderPending(){
  pendingEl.innerHTML = draftAttachments.map((a, i)=>{
    let inner;
    if(a.kind === 'image') inner = `<img src="${a.url}">`;
    else if(a.kind === 'video') inner = `<video src="${a.url}" muted></video>`;
    else if(a.kind === 'audio') inner = `🎙️`;
    else inner = `📎`;
    return `<div class="pchip">${inner}<div class="rm" data-i="${i}">✕</div></div>`;
  }).join('');
  pendingEl.querySelectorAll('.rm').forEach(btn=>{
    btn.onclick = ()=>{
      const i = +btn.dataset.i;
      URL.revokeObjectURL(draftAttachments[i].url);
      draftAttachments.splice(i, 1);
      renderPending();
    };
  });
}

function addToDraft(file){
  draftAttachments.push(attachFromFile(file));
  renderPending();
}

/* ---------- Явное сохранение черновика как одной заметки ---------- */
async function saveDraft(){
  const text = ta.value.trim();
  if(!text && draftAttachments.length === 0) return; // пустой черновик не сохраняем
  const note = {
    id: id(),
    text,
    createdAt: Date.now(),
    device: deviceMeta(),
    geo: lastGeo, // может быть null, если геоданные ещё не пришли — это ок
    attachments: draftAttachments.map(({kind,name,url,size})=>({kind,name,url,size})),
  };
  await putNote(note);
  ta.value = '';
  ta.style.height = 'auto';
  draftAttachments = [];
  renderPending();
  await render();
  ta.focus();
}

/* ---------- Обработчики ввода: Enter всегда просто перенос строки ---------- */
const ta = document.getElementById('ta');
ta.addEventListener('keydown', e=>{
  if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
    e.preventDefault();
    saveDraft();
  }
  // обычный Enter ничего не делает — стандартный перенос строки в textarea
});
ta.addEventListener('input', ()=>{
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, window.innerHeight*0.4) + 'px';
});

document.getElementById('btnSave').onclick = saveDraft;

/* ---------- Вложения — добавляются в черновик, можно накидать сколько угодно ---------- */
document.getElementById('btnFile').onclick = ()=>document.getElementById('fileInput').click();
document.getElementById('btnPhoto').onclick = ()=>document.getElementById('photoInput').click();

document.getElementById('fileInput').onchange = e=>{
  Array.from(e.target.files).forEach(addToDraft);
  e.target.value = '';
};
document.getElementById('photoInput').onchange = e=>{
  Array.from(e.target.files).forEach(addToDraft);
  e.target.value = ''; // input можно нажимать повторно, чтобы добавить ещё кадр
};

/* Запись голоса: тап — старт, повторный тап — стоп, добавляется в черновик (не отправляется сразу) */
let mediaRecorder = null, chunks = [], recording = false;
document.getElementById('btnAudio').onclick = async ()=>{
  const btn = document.getElementById('btnAudio');
  if(!recording){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e=>chunks.push(e.data);
      mediaRecorder.onstop = ()=>{
        const blob = new Blob(chunks, {type:'audio/webm'});
        const file = new File([blob], `voice-${Date.now()}.webm`, {type:'audio/webm'});
        addToDraft(file);
        stream.getTracks().forEach(t=>t.stop());
      };
      mediaRecorder.start();
      recording = true;
      btn.textContent = '⏺️';
      btn.style.color = 'var(--danger)';
    }catch(err){
      alert('Нет доступа к микрофону');
    }
  } else {
    mediaRecorder.stop();
    recording = false;
    btn.textContent = '🎙️';
    btn.style.color = '';
  }
};

/* ---------- Экспорт ---------- */
document.getElementById('exportBtn').onclick = async ()=>{
  const notes = await getAllNotes();
  const plain = notes.map(n=>({...n, attachments: (n.attachments||[]).map(a=>({...a, url: undefined}))}));
  const blob = new Blob([JSON.stringify(plain, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `buffer-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
};

/* ---------- Инициализация ---------- */
(async function init(){
  db = await openDB();
  initGeoWatch();
  await render();
  ta.focus();
})();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
