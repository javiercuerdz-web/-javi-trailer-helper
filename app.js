const fieldNames = [
  ["trailer","Trailer"],
  ["imei","IMEI"],
  ["vin6","VIN Last 6"],
  ["mac","Gateway MAC"],
  ["nosebox","Nosebox"],
  ["atis","ATIS"],
  ["receiver","Receiver"],
  ["camera","Camera"],
  ["door","Door"],
  ["tank","Tank"],
  ["regulator","Regulator"],
  ["lfo","LFO"],["lfi","LFI"],["rfi","RFI"],["rfo","RFO"],
  ["lro","LRO"],["lri","LRI"],["rri","RRI"],["rro","RRO"]
];

const starterData = [{
  id: crypto.randomUUID(),
  trailer: "HV2304865",
  imei: "866961063299610",
  vin6: "063923",
  mac: "CA:45:9B:67:D0:B5",
  nosebox: "", atis: "", receiver: "", camera: "", door: "",
  tank: "", regulator: "",
  lfo: "0404EEA0",
  lfi: "04049509",
  rfi: "0404956D",
  rfo: "0404F4D6",
  lro: "04053276",
  lri: "0404E9DE",
  rri: "0404F643",
  rro: "0404F81F",
  repairNotes: "",
  complete: false
}];

let trailers = JSON.parse(localStorage.getItem("javiTrailers") || "null") || starterData;
let currentId = null;

const $ = id => document.getElementById(id);
const list = $("trailerList");
const editor = $("editor");
const fields = $("fields");
const search = $("search");
const toast = $("toast");

function saveLocal(){
  localStorage.setItem("javiTrailers", JSON.stringify(trailers));
}
function showToast(text){
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 1200);
}
async function copyText(text){
  try{
    await navigator.clipboard.writeText(text || "");
    showToast("Copied");
  }catch{
    const box = document.createElement("textarea");
    box.value = text || "";
    document.body.appendChild(box);
    box.select();
    document.execCommand("copy");
    box.remove();
    showToast("Copied");
  }
}
function renderList(){
  const q = search.value.trim().toLowerCase();
  list.innerHTML = "";
  trailers
    .filter(t => (t.trailer || "").toLowerCase().includes(q))
    .sort((a,b)=>(a.complete===b.complete?0:a.complete?1:-1))
    .forEach(t=>{
      const card = document.createElement("div");
      card.className = "card" + (t.complete ? " complete" : "");
      card.innerHTML = `<div><h3>${escapeHtml(t.trailer || "Untitled Trailer")}</h3><div class="muted">${t.complete ? "Completed" : "Open"}${t.vin6 ? " • VIN " + escapeHtml(t.vin6) : ""}</div></div><button>Edit</button>`;
      card.querySelector("button").onclick = ()=>openEditor(t.id);
      list.appendChild(card);
    });
}
function openEditor(id){
  currentId = id;
  const t = trailers.find(x=>x.id===id);
  $("editorTitle").textContent = t.trailer || "Trailer";
  fields.innerHTML = "";
  fieldNames.forEach(([key,label])=>{
    const row = document.createElement("div");
    row.className = "field-row";
    row.innerHTML = `<label>${label}</label><input data-key="${key}" value="${escapeAttr(t[key] || "")}"><button type="button">Copy</button>`;
    row.querySelector("button").onclick = ()=>copyText(row.querySelector("input").value);
    fields.appendChild(row);
  });
  $("repairNotes").value = t.repairNotes || "";
  $("completeBtn").textContent = t.complete ? "Mark Open" : "Mark Complete";
  editor.classList.remove("hidden");
  editor.scrollIntoView({behavior:"smooth"});
}
function collectEditor(){
  const t = trailers.find(x=>x.id===currentId);
  fields.querySelectorAll("input").forEach(input=>t[input.dataset.key]=input.value.trim());
  t.repairNotes = $("repairNotes").value.trim();
  $("editorTitle").textContent = t.trailer || "Trailer";
  return t;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function escapeAttr(s){return escapeHtml(s);}

$("addTrailerBtn").onclick = ()=>{
  const t = {id:crypto.randomUUID(), complete:false, repairNotes:""};
  fieldNames.forEach(([key])=>t[key]="");
  trailers.unshift(t);
  saveLocal();
  renderList();
  openEditor(t.id);
};
$("closeEditorBtn").onclick = ()=>editor.classList.add("hidden");
$("saveBtn").onclick = ()=>{
  collectEditor();
  saveLocal();
  renderList();
  showToast("Saved");
};
$("copyNotesBtn").onclick = ()=>copyText($("repairNotes").value);
$("copyEverythingBtn").onclick = ()=>{
  const t = collectEditor();
  const lines = fieldNames
    .filter(([key])=>t[key])
    .map(([key,label])=>`${label}: ${t[key]}`);
  if(t.repairNotes) lines.push(`Repair Notes: ${t.repairNotes}`);
  copyText(lines.join("\n"));
};
$("completeBtn").onclick = ()=>{
  const t = collectEditor();
  t.complete = !t.complete;
  saveLocal();
  renderList();
  $("completeBtn").textContent = t.complete ? "Mark Open" : "Mark Complete";
  showToast(t.complete ? "Marked complete" : "Marked open");
};
$("deleteBtn").onclick = ()=>{
  if(!confirm("Delete this trailer?")) return;
  trailers = trailers.filter(x=>x.id!==currentId);
  saveLocal();
  renderList();
  editor.classList.add("hidden");
};
$("importBtn").onclick = ()=>{
  try{
    const incoming = JSON.parse($("jsonBox").value);
    const arr = Array.isArray(incoming) ? incoming : [incoming];
    arr.forEach(item=>{
      const t = {id:crypto.randomUUID(), complete:false, repairNotes:"", ...item};
      fieldNames.forEach(([key])=>{ if(t[key]===undefined) t[key]=""; });
      trailers.push(t);
    });
    saveLocal();
    renderList();
    $("jsonBox").value="";
    showToast("Imported");
  }catch{
    alert("The pasted data is not valid JSON.");
  }
};
$("exportBtn").onclick = ()=>{
  $("jsonBox").value = JSON.stringify(trailers.map(({id,...rest})=>rest), null, 2);
  $("jsonBox").focus();
};
search.oninput = renderList;

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("service-worker.js");
}
renderList();
