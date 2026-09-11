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
function sortRefs(arr){return [...arr].sort((a,b)=>Number(a)-Number(b)||String(a).localeCompare(String(b)))}
function famOf(ref){return (db.families||[]).find(f=>(f.refs||[]).includes(ref))}
function famKey(ref){const f=famOf(ref);return f?"F:"+f.id:("R:"+ref)}
function lastTargets(refOrList){let set;if(Array.isArray(refOrList))set=new Set(refOrList);else{const f=famOf(refOrList);set=new Set(f&&f.refs&&f.refs.length?f.refs:[refOrList]);set.add(refOrList)}const lots=db.lots.filter(l=>set.has(l.ref)&&(l.teMs||l.tpMs)).sort((a,b)=>b.started-a.started);if(!lots.length)return{te:0,tp:0};return{te:lots[0].teMs||0,tp:lots[0].tpMs||0}}
function nets(o,a,b){const s=Math.max(0,(a!=null?a:o.setupMs||0)+(o.setupAdjMs||0));const p=Math.max(0,(b!=null?b:o.prodMs||0)+(o.prodAdjMs||0));return{setup:s,prod:p,work:s+p}}
function offNets(o,L){return{pause:Math.max(0,(L?L.pause:o.pauseMs||0)+(o.pauseAdjMs||0)),support:Math.max(0,(L?L.support:o.supportMs||0)+(o.supportAdjMs||0)),admin:Math.max(0,(L?L.admin:o.adminMs||0)+(o.adminAdjMs||0))}}
let db=load(),screen="lot",selRef="",adjOf=null;
if(!Array.isArray(db.refs))db.refs=[];if(!Array.isArray(db.lots))db.lots=[];if(!Array.isArray(db.families))db.families=[];if(!db.days||typeof db.days!=="object")db.days={};db.refs=sortRefs(db.refs);
