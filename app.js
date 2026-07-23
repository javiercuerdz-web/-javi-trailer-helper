"use strict";
const VERSION="9.7.0", KEY="javiTrailerHelperDataV9", DAILY_GOAL=540;
const DEFAULT_NOTES=[
{id:"noIssues",title:"No issues found",text:"No issues found with {sensor}. Triggered the sensor and verified it was reporting correctly on the PCT app."},
{id:"replaced",title:"Sensor replaced",text:"{sensor} was not working on the PCT app. Replaced it with a new sensor and verified the new sensor was reporting correctly on the PCT app."},
{id:"missing",title:"Sensor missing",text:"{sensor} was missing. Installed a new sensor and verified it was reporting correctly on the PCT app."},
{id:"smart7Repair",title:"Repaired in app after Smart7",text:"After replacing the damaged Smart7 box, I repaired {sensor} in the app, verified the correct serial number, and confirmed it was working on the PCT app."},
{id:"rewired",title:"Rewired sensor",text:"{sensor} wiring was damaged. Rewired the sensor, secured the connection, and verified it was working on the PCT app."},
{id:"noPressure",title:"No air pressure",text:"Unable to fully verify {sensor} because the trailer had no air pressure. Checked the sensor and connection, but final verification will be needed once air pressure is available."},
{id:"unable",title:"Unable to complete",text:"Unable to complete {sensor} at this time because [enter reason]."}
];
const FIELDS=[["door","Door"],["camera","Camera"],["receiver","Receiver"],["atis","ATIS"],["regulator","Regulator"],["tank","Air Tank"],["gateway","Gateway (StealthNet)"],["lfo","LFO"],["lfi","LFI"],["rfi","RFI"],["rfo","RFO"],["lro","LRO"],["lri","LRI"],["rri","RRI"],["rro","RRO"]];
const SERVICES=[
["lfi","LFI",15],["lfo","LFO",15],["lri","LRI",15],["lro","LRO",15],["rfi","RFI",15],["rfo","RFO",15],["rri","RRI",15],["rro","RRO",15],
["tpmsReceiver","TPMS Receiver",60],["atis","ATIS",30],["regulator","Regulator",30],["lampCheck","Lamp Check",30],["cargoCamera","Cargo Camera",30],["cargoSensor","Cargo Sensor",30],["tank","Air Tank Sensor",15],["door","Door Sensor",30],["smart7","Smart7",90],["stealthNet","StealthNet",90]
];
const $=id=>document.getElementById(id); let toastTimer;
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()}
function load(){for(const k of [KEY,"javiTrailerHelperDataV8","javiTrailerHelperDataV7","javiTrailerHelperDataV6","javiTrailerHelperDataV5","javiTrailerHelperDataV4"]){try{const old=JSON.parse(localStorage.getItem(k));if(old){return{trailers:(old.trailers||[]).map(migrateTrailer),work:(old.work||[]).map(migrateWork),notes:migrateNotes(old.notes)}}}catch{}}return{trailers:[],work:[],notes:migrateNotes([])}}
function localDateKey(value=Date.now()){const d=new Date(value);if(!Number.isFinite(d.getTime()))return "";return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function migrateTrailer(t){const s=t.sensors||{};const completedAt=t.completedAt||null;return{id:t.id||uid(),number:(t.number||"").toUpperCase(),vin6:(t.vinLast6||t.vin6||"").slice(-6).toUpperCase(),imei:t.imei||"",status:t.status||"open",createdAt:t.createdAt||Date.now(),updatedAt:t.updatedAt||Date.now(),completedAt,completedDate:t.completedDate||localDateKey(timestampMs(completedAt)),services:Array.isArray(t.services)?t.services:[],totalMinutes:Number(t.totalMinutes)||0,sensors:Object.fromEntries(FIELDS.map(([k])=>[k,s[k]||""]))}}
function migrateWork(w){return{id:w.id||uid(),number:(w.number||"").toUpperCase(),sensors:Array.isArray(w.sensors)?w.sensors:[],completed:!!w.completed,createdAt:w.createdAt||Date.now()}}
function migrateNotes(notes){if(!Array.isArray(notes)||!notes.length)return DEFAULT_NOTES.map(n=>({...n}));return notes.map(n=>({id:n.id||uid(),title:String(n.title||"Common Note"),text:String(n.text||"")}))}
let state=load();
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(s){clearTimeout(toastTimer);$("toast").textContent=s;$("toast").classList.add("show");toastTimer=setTimeout(()=>$("toast").classList.remove("show"),1500)}
async function copy(v,label){if(!v)return toast("Field is blank");try{await navigator.clipboard.writeText(v)}catch{}toast(label+" copied")}
function formatMinutes(m){m=Number(m)||0;if(m<60)return m+" mins";const h=Math.floor(m/60),r=m%60;return h+" hour"+(h!==1?"s":"")+(r?" "+r+" mins":"")}
function fieldHtml(label,value){if(!value)return "";return `<button class="copyField" data-copy="${esc(value)}" data-label="${label}"><span><span class="fieldName">${label}</span><span class="fieldValue">${esc(value)}</span></span><span class="copyHint">Tap to copy</span></button>`}
function serviceForSensor(key){return key==="camera"?"cargoCamera":key}
function sensorMinutes(key){const id=serviceForSensor(key);return Number((SERVICES.find(x=>x[0]===id)||[])[2])||0}
function sensorFieldHtml(t,key,label,value){if(!value)return "";const mins=sensorMinutes(key);return `<div class="sensorField"><button class="sensorCopy" data-copy="${esc(value)}" data-label="${label}"><span class="fieldName">${label}</span><span class="fieldValue">${esc(value)}</span></button><div class="sensorControls"><span class="repairMinutes">${mins} mins</span><div class="sensorButtons"><button class="noteSensor" data-note-sensor="${key}" data-trailer-id="${t.id}">Note</button><button class="removeSensor" data-remove-sensor="${key}" data-trailer-id="${t.id}" aria-label="Remove ${label}">Remove</button></div></div></div>`}
function completionHtml(t){if(t.status!=="completed")return "";const names=t.services.map(id=>serviceLabel(id)).filter(Boolean);return `<div class="completionSummary"><div><b>Completed</b>${t.completedAt?`<small>${new Date(t.completedAt).toLocaleString()}</small>`:""}</div><strong>${formatMinutes(t.totalMinutes)}</strong>${names.length?`<p>${names.map(esc).join(" · ")}</p>`:""}</div>`}
function timestampMs(value){
  if(value===null||value===undefined||value==="")return NaN;
  if(typeof value==="number")return value<1e12?value*1000:value;
  if(typeof value==="string"&&/^\d+$/.test(value.trim())){const n=Number(value);return n<1e12?n*1000:n}
  const n=new Date(value).getTime();return Number.isFinite(n)?n:NaN
}
function completionTime(t){
  const completed=timestampMs(t.completedAt);
  if(Number.isFinite(completed))return completed;
  const updated=timestampMs(t.updatedAt);
  return Number.isFinite(updated)?updated:NaN
}
function todayTotal(){
  const today=localDateKey();
  return state.trailers.reduce((sum,t)=>{
    if(String(t.status).toLowerCase()!=="completed")return sum;
    const completedDay=t.completedDate||localDateKey(completionTime(t));
    if(completedDay!==today)return sum;
    return sum+(Number(t.totalMinutes)||0);
  },0)
}
function renderDailyGoal(previewTotal=null){const total=previewTotal===null?todayTotal():Number(previewTotal)||0,remaining=Math.max(DAILY_GOAL-total,0),over=Math.max(total-DAILY_GOAL,0),percent=Math.round((total/DAILY_GOAL)*100);$("todayMinutes").textContent=total;$("goalPercent").textContent=percent+"%";$("goalProgress").style.width=Math.min(percent,100)+"%";$("dailyGoal").classList.toggle("goalReached",total>=DAILY_GOAL);$("dailyGoal").classList.toggle("goalWarning",total>=480&&total<DAILY_GOAL);$("goalMessage").textContent=over?`${over} mins over today’s goal`:remaining?`${remaining} mins remaining`:"Daily goal reached"}
function render(){const q=$("search").value.trim().toUpperCase();const trailers=[...state.trailers].filter(t=>!q||t.number.includes(q)||t.vin6.includes(q)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));$("trailerList").innerHTML=trailers.map(t=>`<article class="trailerCard"><div class="trailerTop"><div><button class="titleCopy" data-copy="${esc(t.number)}" data-label="Trailer">${esc(t.number)}</button><p class="meta">VIN ${esc(t.vin6||"")}</p></div><span class="badge ${t.status}">${t.status==="completed"?"Completed":"Open"}</span></div>${fieldHtml("VIN",t.vin6)}${fieldHtml("IMEI",t.imei)}${FIELDS.map(([k,l])=>sensorFieldHtml(t,k,l,t.sensors[k])).join("")}${completionHtml(t)}<div class="cardActions"><button class="secondary" data-edit="${t.id}">Edit Info</button><button class="primary" data-complete="${t.id}">${t.status==="completed"?"Edit Completion":"Complete Trailer"}</button></div></article>`).join("");$("noTrailers").classList.toggle("hidden",trailers.length>0);
$("totalCount").textContent=state.trailers.length;$("doneCount").textContent=state.trailers.filter(t=>t.status==="completed").length;$("openCount").textContent=state.trailers.filter(t=>t.status!=="completed").length;renderDailyGoal()}
function labelFor(k){return (FIELDS.find(x=>x[0]===k)||[k,k])[1]}
function serviceLabel(id){return (SERVICES.find(x=>x[0]===id)||[])[1]||""}
function setup(){$("sensorInputs").innerHTML=FIELDS.map(([k,l])=>`<label>${l}<input id="s_${k}" autocapitalize="characters"></label>`).join("");$("servicePicker").innerHTML=SERVICES.map(([id,label,mins])=>`<label class="serviceItem"><input type="checkbox" value="${id}" data-mins="${mins}"><span><b>${label}</b><small>${formatMinutes(mins)}</small></span></label>`).join("")}
function openDialog(id){const t=state.trailers.find(x=>x.id===id)||migrateTrailer({id:uid(),createdAt:Date.now()});$("dialogTitle").textContent=id?"Edit Trailer":"Add Trailer";$("editId").value=id||"";$("trailerId").value=t.number;$("vin6").value=t.vin6;$("imei").value=t.imei;FIELDS.forEach(([k])=>$("s_"+k).value=t.sensors[k]||"");$("pasteData").value="";$("deleteTrailer").classList.toggle("hidden",!id);$("trailerDialog").showModal()}
function parsePaste(raw){
  const out={sensors:{}};
  const lines=String(raw||"").replace(/\r/g,"").split("\n").map(x=>x.trim()).filter(Boolean);
  const sensorMap={"DOOR":"door","CAMERA":"camera","RECEIVER":"receiver","TPMS RECEIVER":"receiver","ATIS":"atis","ATIS LAMP":"atis","REGULATOR":"regulator","ATIS REGULATOR":"regulator","AIR TANK":"tank","TANK":"tank","GATEWAY":"gateway","GATEWAY STEALTHNET":"gateway","STEALTHNET":"gateway","SMART7":"gateway","SMART 7":"gateway","LFO":"lfo","LFI":"lfi","RFI":"rfi","RFO":"rfo","LRO":"lro","LRI":"lri","RRI":"rri","RRO":"rro"};
  const cleanLabel=s=>String(s||"").toUpperCase().replace(/[()_-]+/g," ").replace(/\s+/g," ").trim();
  let pendingSensor="";
  for(const line of lines){
    const m=line.match(/^\s*([^:]+):\s*(.*)$/);
    if(m){
      const label=cleanLabel(m[1]), value=m[2].trim();
      if(["TRAILER","TRAILER ID","ASSET","ASSET ID"].includes(label)){out.number=value.toUpperCase();pendingSensor="";continue}
      if(["VIN","LAST 6 VIN","VIN LAST 6"].includes(label)){out.vin6=value.replace(/\s/g,"").slice(-6).toUpperCase();pendingSensor="";continue}
      if(label==="IMEI"){out.imei=value.replace(/\s/g,"");pendingSensor="";continue}
      if(label==="SN"&&pendingSensor){out.sensors[pendingSensor]=value||"NA";pendingSensor="";continue}
      const key=sensorMap[label]||(label.startsWith("GATEWAY")?"gateway":"");
      if(key){out.sensors[key]=value||"NA";pendingSensor="";continue}
    }
    const label=cleanLabel(line);
    const key=sensorMap[label]||(label.startsWith("GATEWAY")?"gateway":"");
    if(key){pendingSensor=key;continue}
    if(!out.number&&/^[A-Z]{0,3}\d{3,}$/i.test(line)){out.number=line.toUpperCase();continue}
  }
  return out
}
function recommendedServices(t){const ids=[];for(const [k] of FIELDS){if(!t.sensors[k])continue;if(k==="camera")ids.push("cargoCamera");else ids.push(k)}return ids}
function openComplete(id){const t=state.trailers.find(x=>x.id===id);if(!t)return;$("completeId").value=id;$("completeTrailerNumber").textContent=t.number;const selected=t.services.length?t.services:recommendedServices(t);$("servicePicker").querySelectorAll("input").forEach(x=>x.checked=selected.includes(x.value));$("reopenTrailer").classList.toggle("hidden",t.status!=="completed");updateTime();$("completeDialog").showModal()}
function updateTime(){
  const selectedTotal=[...$("servicePicker").querySelectorAll("input:checked")].reduce((n,x)=>n+Number(x.dataset.mins),0);
  $("timeTotal").textContent=formatMinutes(selectedTotal);
  const current=state.trailers.find(x=>x.id===$("completeId").value);
  let base=todayTotal();
  if(current&&current.status==="completed"&&(current.completedDate||localDateKey(completionTime(current)))===localDateKey())base-=Number(current.totalMinutes)||0;
  const liveTotal=Math.max(0,base)+selectedTotal;
  if($("todayPreview"))$("todayPreview").textContent=`Today with this trailer: ${liveTotal} / ${DAILY_GOAL} mins`;
  renderDailyGoal(liveTotal);
}
$("autoFill").onclick=()=>{const d=parsePaste($("pasteData").value);if(d.number)$("trailerId").value=d.number;if(d.vin6)$("vin6").value=d.vin6;if(d.imei)$("imei").value=d.imei;FIELDS.forEach(([k])=>{if(d.sensors[k]!==undefined)$("s_"+k).value=d.sensors[k]});toast("Fields filled")};
$("trailerForm").onsubmit=e=>{e.preventDefault();const number=$("trailerId").value.trim().toUpperCase();if(!number)return;const id=$("editId").value||uid();const old=state.trailers.find(t=>t.id===id);const t={id,number,vin6:$("vin6").value.trim().slice(-6).toUpperCase(),imei:$("imei").value.trim(),status:old?.status||"open",createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),completedAt:old?.completedAt||null,completedDate:old?.completedDate||"",services:old?.services||[],totalMinutes:old?.totalMinutes||0,sensors:Object.fromEntries(FIELDS.map(([k])=>[k,$("s_"+k).value.trim()]))};const i=state.trailers.findIndex(x=>x.id===id);if(i>=0)state.trailers[i]=t;else state.trailers.unshift(t);$("trailerDialog").close();save();toast("Trailer saved")};
$("completeForm").onsubmit=e=>{e.preventDefault();const t=state.trailers.find(x=>x.id===$("completeId").value);if(!t)return;const wasCompleted=t.status==="completed";const checked=[...$("servicePicker").querySelectorAll("input:checked")];t.services=checked.map(x=>x.value);t.totalMinutes=checked.reduce((n,x)=>n+Number(x.dataset.mins),0);t.status="completed";t.completedAt=wasCompleted&&Number.isFinite(timestampMs(t.completedAt))?timestampMs(t.completedAt):Date.now();t.completedDate=localDateKey(t.completedAt);t.updatedAt=Date.now();$("completeDialog").close();save();const total=todayTotal();toast(total>=DAILY_GOAL?`Daily goal reached: ${total} mins`:`${total} / ${DAILY_GOAL} mins today`)};
$("reopenTrailer").onclick=()=>{const t=state.trailers.find(x=>x.id===$("completeId").value);if(!t)return;t.status="open";t.completedAt=null;t.completedDate="";$("completeDialog").close();save();toast("Trailer marked open")};
$("servicePicker").onchange=updateTime;


let activeNoteContext=null;
function applyNoteTemplate(text,sensor){return String(text||"").replaceAll("{sensor}",sensor)}
function renderNotePicker(){if(!activeNoteContext)return;const {trailerId,key}=activeNoteContext,t=state.trailers.find(x=>x.id===trailerId),sensor=labelFor(key);$("notePickerTitle").textContent=sensor+" Repair Note";$("notePickerTrailer").textContent=t?t.number:"";$("notePickerList").innerHTML=state.notes.map(n=>{const generated=applyNoteTemplate(n.text,sensor);return `<button type="button" class="noteChoice" data-use-note="${esc(n.id)}"><strong>${esc(n.title)}</strong><span>${esc(generated)}</span><small>Tap to copy</small></button>`}).join("")}
function openNotePicker(trailerId,key){activeNoteContext={trailerId,key};renderNotePicker();$("notePickerDialog").showModal()}
function renderNotesEditor(){$("notesEditor").innerHTML=state.notes.map((n,i)=>`<section class="noteEditCard" data-note-index="${i}"><div class="noteEditTop"><span>Common Note ${i+1}</span><button type="button" class="deleteCommonNote" data-delete-note="${i}">Delete</button></div><label>Button name<input class="noteTitleInput" value="${esc(n.title)}"></label><label>Repair note<textarea class="noteTextInput" rows="5">${esc(n.text)}</textarea></label><p class="templateHint">Use <code>{sensor}</code> where the sensor name should appear.</p></section>`).join("")}
function openNotes(){renderNotesEditor();$("notesDialog").showModal()}
function saveNotesFromEditor(){const cards=[...$("notesEditor").querySelectorAll(".noteEditCard")];state.notes=cards.map((card,i)=>({id:state.notes[i]?.id||uid(),title:card.querySelector(".noteTitleInput").value.trim()||"Common Note",text:card.querySelector(".noteTextInput").value.trim()})).filter(n=>n.text);save();$("notesDialog").close();toast("Common notes saved")}

function removeSensor(trailerId,key){const t=state.trailers.find(x=>x.id===trailerId);if(!t||!t.sensors[key])return;const label=labelFor(key);const mins=sensorMinutes(key);if(!confirm(`Remove ${label} from ${t.number}? This will subtract ${mins} minutes.`))return;t.sensors[key]="";const serviceId=serviceForSensor(key);t.services=(t.services||[]).filter(id=>id!==serviceId);t.totalMinutes=(t.services||[]).reduce((sum,id)=>sum+Number((SERVICES.find(x=>x[0]===id)||[])[2]||0),0);t.updatedAt=Date.now();save();toast(`${label} removed — ${mins} mins subtracted`)}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.edit)openDialog(b.dataset.edit);if(b.dataset.complete)openComplete(b.dataset.complete);if(b.dataset.copy!==undefined)copy(b.dataset.copy,b.dataset.label);if(b.dataset.removeSensor)removeSensor(b.dataset.trailerId,b.dataset.removeSensor);if(b.dataset.noteSensor)openNotePicker(b.dataset.trailerId,b.dataset.noteSensor);if(b.dataset.useNote!==undefined&&activeNoteContext){const n=state.notes.find(x=>x.id===b.dataset.useNote);if(n){const text=applyNoteTemplate(n.text,labelFor(activeNoteContext.key));copy(text,"Repair note");$("notePickerDialog").close()}}if(b.dataset.deleteNote!==undefined){const i=Number(b.dataset.deleteNote);if(confirm("Delete this common note?")){state.notes.splice(i,1);renderNotesEditor()}}});
$("copyNA").onclick=()=>copy("NA","NA");
$("manageNotes").onclick=openNotes;
$("closeNotes").onclick=()=>$("notesDialog").close();
$("closeNotePicker").onclick=()=>$("notePickerDialog").close();
$("openNoteSettings").onclick=()=>{$("notePickerDialog").close();openNotes()};
$("notesForm").onsubmit=e=>{e.preventDefault();saveNotesFromEditor()};
$("addNote").onclick=()=>{state.notes.push({id:uid(),title:"New Note",text:"{sensor} "});renderNotesEditor();setTimeout(()=>{const cards=$("notesEditor").querySelectorAll(".noteEditCard");cards[cards.length-1]?.scrollIntoView({behavior:"smooth"})},0)};
$("resetNotes").onclick=()=>{if(confirm("Reset all common notes to the detailed defaults?")){state.notes=DEFAULT_NOTES.map(n=>({...n}));renderNotesEditor()}};
$("deleteTrailer").onclick=()=>{const id=$("editId").value;if(confirm("Delete this trailer?")){state.trailers=state.trailers.filter(t=>t.id!==id);$("trailerDialog").close();save()}};
$("addTrailer").onclick=()=>openDialog();$("closeDialog").onclick=()=>$("trailerDialog").close();$("closeComplete").onclick=()=>{$("completeDialog").close();renderDailyGoal()};$("completeDialog").addEventListener("cancel",()=>setTimeout(renderDailyGoal,0));$("search").oninput=render;
setup();render();if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js");
