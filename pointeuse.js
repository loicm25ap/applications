const KEY="ptz_of_v1";const $=id=>document.getElementById(id);
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{refs:[],lots:[],current:null,days:{}}}catch{return{refs:[],lots:[],current:null,days:{}}}}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function ymd(d){const x=d instanceof Date?d:new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")}
function fmt(ms){ms=Math.max(0,ms||0);const s=Math.floor(ms/1000);return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor((s%3600)/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function hNum(ms){return ((ms||0)/3600000).toLocaleString("fr-FR",{minimumFractionDigits:3,maximumFractionDigits:3})}
function msLabel(ms){if(ms==null)return"n/c";return fmt(ms)+" · "+hNum(ms)+" h"}
function hm(ts){const d=new Date(ts);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
function sec(ms){return Math.round((ms||0)/1000)}
function parseMin(v){v=String(v||"").trim().replace(",",".");if(!v)return 0;const n=Number(v);return isFinite(n)?Math.round(n*60000):null}
function parseH(v){v=String(v||"").trim().replace(",",".");if(!v)return 0;const n=Number(v);return isFinite(n)&&n>=0?Math.round(n*3600000):null}
function onlyDigits(v){return String(v||"").replace(/\D/g,"")}
function pct(real,ref){if(!ref)return null;return (real-ref)/ref}
function pctTxt(p){if(p==null)return"n/c";return (p>=0?"+":"")+((p*100).toLocaleString("fr-FR",{maximumFractionDigits:0}))+" %"}
function tagFor(p){if(p==null)return"";const a=Math.abs(p);if(a>=0.25)return"bad";if(a>=0.15)return"warn";return"ok"}
function median(arr){const a=arr.filter(v=>v!=null&&isFinite(v)).sort((x,y)=>x-y);if(!a.length)return null;return a[Math.floor((a.length-1)/2)]}
function ceilH2(ms){if(ms==null)return null;return Math.ceil(((ms||0)/3600000)*100)/100}
function ceilH05(ms){if(!ms)return 0;const h=(ms||0)/3600000;return Math.ceil(h/0.05-1e-12)*0.05}
function h2(h){return (h||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})}
function prodCible(l){return (l.teMs||0)*(l.qty||0)}
function lastTargets(ref){const lots=db.lots.filter(l=>l.ref===ref&&(l.teMs||l.tpMs)).sort((a,b)=>b.started-a.started);if(!lots.length)return{te:0,tp:0};return{te:lots[0].teMs||0,tp:lots[0].tpMs||0}}
function nets(o,a,b){const s=Math.max(0,(a!=null?a:o.setupMs||0)+(o.setupAdjMs||0));const p=Math.max(0,(b!=null?b:o.prodMs||0)+(o.prodAdjMs||0));return{setup:s,prod:p,work:s+p}}
function offNets(o,L){return{pause:Math.max(0,(L?L.pause:o.pauseMs||0)+(o.pauseAdjMs||0)),support:Math.max(0,(L?L.support:o.supportMs||0)+(o.supportAdjMs||0)),admin:Math.max(0,(L?L.admin:o.adminMs||0)+(o.adminAdjMs||0))}}
let db=load(),screen="lot",selRef="",adjOf=null;
if(!Array.isArray(db.refs))db.refs=[];if(!Array.isArray(db.lots))db.lots=[];if(!db.days||typeof db.days!=="object")db.days={};
function live(){const z={setup:0,prod:0,pause:0,support:0,admin:0,phase:0,nSetup:0,nProd:0,nWork:0};const c=db.current;if(!c)return z;const add=c.phase==="stop"?0:Date.now()-c.phaseStarted;let setup=c.setupMs||0,prod=c.prodMs||0,pause=c.pauseMs||0,support=c.supportMs||0,admin=c.adminMs||0;if(c.phase==="setup")setup+=add;else if(c.phase==="prod")prod+=add;else if(c.phase==="pause")pause+=add;else if(c.phase==="support")support+=add;else if(c.phase==="admin")admin+=add;const n=nets(c,setup,prod);return{setup,prod,pause,support,admin,phase:add,nSetup:n.setup,nProd:n.prod,nWork:n.work}}
function closePhase(){const c=db.current;if(!c||c.phase==="stop")return;const add=Date.now()-c.phaseStarted;if(c.phase==="setup")c.setupMs+=add;else if(c.phase==="prod")c.prodMs+=add;else if(c.phase==="pause")c.pauseMs=(c.pauseMs||0)+add;else if(c.phase==="support")c.supportMs=(c.supportMs||0)+add;else if(c.phase==="admin")c.adminMs=(c.adminMs||0)+add;const last=c.segs[c.segs.length-1];if(last&&!last.end)last.end=Date.now()}
function startPhase(kind){const c=db.current;if(!c)return;c.phase=kind;c.phaseStarted=Date.now();c.segs.push({kind,start:Date.now()})}
function ofExists(num){return db.lots.some(l=>l.of===num)||(db.current&&db.current.of===num)}
function fillTargets(){const ref=onlyDigits($("refIn").value||selRef||"");if(!ref)return;const t=lastTargets(ref);if(t.te)$("teIn").value=hNum(t.te);if(t.tp)$("tpIn").value=hNum(t.tp)}
function startLot(phase){if(db.current){alert("Terminez d'abord le lot en cours.");return}const of=onlyDigits($("ofIn").value),ref=onlyDigits($("refIn").value||selRef||""),qty=parseInt($("qtyIn").value,10),te=parseH($("teIn").value),tp=parseH($("tpIn").value);if(!of||!ref){alert("OF et réf en chiffres.");return}if(!qty||qty<1){alert("Quantité.");return}if(te==null||tp==null){alert("TE / TP invalides.");return}if(ofExists(of)){alert("OF déjà existant.");return}if(!db.refs.includes(ref))db.refs.push(ref);selRef=ref;const kind=phase==="prod"?"prod":"setup";db.current={of,ref,qty,teMs:te,tpMs:tp,phase:kind,phaseStarted:Date.now(),setupMs:0,prodMs:0,pauseMs:0,supportMs:0,adminMs:0,setupAdjMs:0,prodAdjMs:0,pauseAdjMs:0,supportAdjMs:0,adminAdjMs:0,started:Date.now(),segs:[{kind,start:Date.now()}]};$("ofIn").value="";$("qtyIn").value="";save();render()}
function toPhase(kind){const c=db.current;if(!c||c.phase===kind)return;if(c.phase!=="stop")closePhase();startPhase(kind);save();render()}
function haltDay(){const c=db.current;if(!c||c.phase==="stop")return;closePhase();c.phase="stop";c.phaseStarted=Date.now();save();render()}
function checkOvernight(){const c=db.current;if(!c||c.phase==="stop")return;if(ymd(c.phaseStarted)===ymd(new Date()))return;if(c.nightAsk===ymd(new Date()))return;c.nightAsk=ymd(new Date());save();if(confirm("L'OF "+c.of+" tournait encore depuis hier. Couper le chrono maintenant ?"))haltDay()}
function endLot(){const c=db.current;if(!c)return;if(!confirm("Terminer l'OF "+c.of+" ?"))return;closePhase();db.lots.push({of:c.of,ref:c.ref,qty:c.qty,teMs:c.teMs||0,tpMs:c.tpMs||0,setupMs:c.setupMs,prodMs:c.prodMs,pauseMs:c.pauseMs||0,supportMs:c.supportMs||0,adminMs:c.adminMs||0,setupAdjMs:c.setupAdjMs||0,prodAdjMs:c.prodAdjMs||0,pauseAdjMs:c.pauseAdjMs||0,supportAdjMs:c.supportAdjMs||0,adminAdjMs:c.adminAdjMs||0,started:c.started,ended:Date.now(),date:ymd(c.started),segs:c.segs});db.current=null;adjOf=null;$("adjBox").style.display="none";save();render()}
function pieceTimes(l){const n=nets(l);return{work:n.work,piece:l.qty?n.prod/l.qty:null,charge:l.qty?n.work/l.qty:null,n}}
function analyseTimes(l){const n=nets(l);const te=l.teMs||0;const shift=Math.min(Math.max(0,n.setup),Math.max(0,te));const setup=n.setup-shift,prod=n.prod+shift;return{work:n.work,piece:l.qty?prod/l.qty:null,n:{setup:setup,prod:prod,work:n.work},shift:shift}}
