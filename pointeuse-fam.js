if(!Array.isArray(db.families))db.families=[];
function sortRefs(a){return [...a].sort((x,y)=>Number(x)-Number(y)||String(x).localeCompare(String(y)))}
db.refs=sortRefs(db.refs);
function famOf(ref){return (db.families||[]).find(f=>(f.refs||[]).includes(ref))}
function famKey(ref){const f=famOf(ref);return f?"F:"+f.id:"R:"+ref}
function analyseTimes(l){
  const n=nets(l);const te=l.teMs||0;
  const shift=Math.min(Math.max(0,n.setup),Math.max(0,te));
  const setup=n.setup-shift,prod=n.prod+shift;
  return{work:n.work,piece:l.qty?prod/l.qty:null,charge:l.qty?n.work/l.qty:null,n:{setup:setup,prod:prod,work:n.work},shift:shift};
}
lastTargets=function(ref){
  const f=famOf(ref);const set=new Set(f&&f.refs&&f.refs.length?f.refs:[ref]);set.add(ref);
  const lots=db.lots.filter(l=>set.has(l.ref)&&(l.teMs||l.tpMs)).sort((a,b)=>b.started-a.started);
  if(!lots.length)return{te:0,tp:0};
  return{te:lots[0].teMs||0,tp:lots[0].tpMs||0};
};
renderChips=function(){
  const box=$("refChips");box.innerHTML="";
  sortRefs(db.refs).forEach(r=>{
    const b=document.createElement("button");
    b.className="chip"+(selRef===r?" on":"");b.textContent=r;
    b.onclick=()=>{selRef=r;$("refIn").value=r;fillTargets();renderChips()};
    box.appendChild(b);
  });
};
function freeRefs(){
  const used=new Set();(db.families||[]).forEach(f=>(f.refs||[]).forEach(r=>used.add(r)));
  return sortRefs(db.refs.filter(r=>!used.has(r)));
}
renderRefs=function(){
  const box=$("refList");box.innerHTML="";
  if(!db.refs.length)box.innerHTML="<p class='hint'>Pas encore de réf.</p>";
  sortRefs(db.refs).forEach(r=>{
    const card=document.createElement("div");card.className="card";
    const f=famOf(r);
    card.innerHTML="<b>"+r+"</b>"+(f?" <span class='hint'>· "+(f.name||"famille")+"</span>":"");
    const b=document.createElement("button");b.className="btn sm";b.textContent="Retirer";
    b.onclick=()=>{
      db.refs=db.refs.filter(x=>x!==r);
      (db.families||[]).forEach(f=>{f.refs=(f.refs||[]).filter(x=>x!==r)});
      save();render();
    };
    card.appendChild(b);box.appendChild(card);
  });
  const fam=document.createElement("div");fam.className="form";
  fam.innerHTML="<div class='lab'>Familles — même geste, réfs différentes</div>"+
    "<input id='famName' placeholder='Nom de famille'/>"+
    "<button class='btn gold full' id='btnFamAdd'>Créer la famille</button>";
  box.appendChild(fam);
  $("btnFamAdd").onclick=()=>{
    const name=($("famName").value||"").trim()||("Famille "+((db.families||[]).length+1));
    db.families.push({id:"f"+Date.now(),name:name,refs:[]});
    $("famName").value="";save();render();
  };
  (db.families||[]).forEach((f,fi)=>{
    const card=document.createElement("div");card.className="card";
    const free=freeRefs();
    let html="<b>"+(f.name||"Famille")+"</b><div class='hint'>TE/TP cible = dernier saisi du groupe</div>";
    html+="<div class='chips' id='famChips"+fi+"'></div>";
    if(free.length){
      html+="<select id='famSel"+fi+"'>";
      free.forEach(r=>{html+="<option value='"+r+"'>"+r+"</option>"});
      html+="</select><button class='btn sm' id='famJoin"+fi+"'>Ajouter la réf</button>";
    }
    html+="<button class='btn sm' id='famDel"+fi+"'>Supprimer la famille</button>";
    card.innerHTML=html;box.appendChild(card);
    const chips=card.querySelector("#famChips"+fi);
    (f.refs||[]).slice().sort((a,b)=>Number(a)-Number(b)).forEach(r=>{
      const c=document.createElement("button");c.className="chip on";c.textContent=r+" ×";
      c.onclick=()=>{f.refs=f.refs.filter(x=>x!==r);save();render()};
      chips.appendChild(c);
    });
    const join=card.querySelector("#famJoin"+fi);
    if(join)join.onclick=()=>{
      const r=$("famSel"+fi).value;if(!r)return;
      if(!(f.refs||[]).includes(r))f.refs.push(r);save();render();
    };
    card.querySelector("#famDel"+fi).onclick=()=>{
      db.families.splice(fi,1);save();render();
    };
  });
};
renderAnalyse=function(){
  const times=analyseTimes;
  const by={};
  db.lots.forEach(l=>{
    const k=famKey(l.ref);
    if(!by[k]){
      const f=famOf(l.ref);
      by[k]={key:k,title:f?"Famille "+(f.name||"")+" · réfs "+sortRefs(f.refs).join(", "):("Réf "+l.ref),lots:[],refs:f?f.refs.slice():[l.ref]};
    }
    by[k].lots.push({l,t:times(l)});
  });
  const box=$("analyse");box.innerHTML="";
  const rows=Object.values(by).sort((a,b)=>String(a.title).localeCompare(String(b.title),"fr"));
  if(!rows.length){box.innerHTML="<p class='hint'>Pas encore de stats.</p>";return}
  rows.forEach(x=>{
    const pieces=x.lots.map(o=>o.t.piece).filter(v=>v!=null);
    const mid=median(pieces);
    const tes=x.lots.map(o=>o.l.teMs||0).filter(v=>v>0),midTe=median(tes);
    const qty=x.lots.reduce((s,o)=>s+o.l.qty,0);
    const setupSum=x.lots.reduce((s,o)=>s+o.t.n.setup,0);
    const prodSum=x.lots.reduce((s,o)=>s+o.t.n.prod,0);
    const last=lastTargets(x.refs[0]);
    const cibleProd=x.lots.reduce((s,o)=>s+(last.te||0)*(o.l.qty||0),0);
    const cibleRoute=x.lots.reduce((s,o)=>s+(last.tp||0),0);
    const setups=x.lots.map(o=>o.t.n.setup).filter(v=>v>0),midSetup=median(setups);
    const bufPieces=x.lots.filter(o=>o.l.qty).map(o=>(o.t.n.prod+30*60000)/o.l.qty);
    const midBuf=median(bufPieces),propTe=midBuf!=null?ceilH2(midBuf):null;
    const propTpH=midSetup!=null?ceilH05(midSetup):0;
    const div=document.createElement("div");div.className="card";
    let html="<div><b>"+x.title+"</b> · "+x.lots.length+" OF · "+qty+" p.</div>";
    html+="<div class='hint'>Cible groupe (dernier saisi) · TE "+hNum(last.te)+" h · TP "+hNum(last.tp)+" h</div>";
    html+="<div class='hint'>Observé corrigé : route − 1 TE, prod + 1 TE, pièce = prod ÷ qté</div>";
    html+="<div class='ttl'>Cible / observé / stats</div><table class='an'><tr><th></th><th class='c'>Cible</th><th class='o'>Observé</th><th class='o'>Écart</th><th class='s'>Stat</th></tr>";
    html+="<tr><td>Route TP</td><td class='c num'>"+hNum(cibleRoute)+" h</td><td class='o num'>"+hNum(setupSum)+" h</td><td class='o'><span class='tag "+tagFor(pct(setupSum,cibleRoute))+"'>"+pctTxt(pct(setupSum,cibleRoute))+"</span></td><td class='s num'>"+(midSetup==null?"n/c":hNum(midSetup)+" h")+"</td></tr>";
    html+="<tr><td>Prod TE×qté</td><td class='c num'>"+hNum(cibleProd)+" h</td><td class='o num'>"+hNum(prodSum)+" h</td><td class='o'><span class='tag "+tagFor(pct(prodSum,cibleProd))+"'>"+pctTxt(pct(prodSum,cibleProd))+"</span></td><td class='s num'>"+(mid==null?"n/c":hNum(mid)+" h/p")+"</td></tr>";
    html+="<tr><td>Temps pièce</td><td class='c num'>"+hNum(last.te)+" h</td><td class='o num'>"+(mid==null?"n/c":hNum(mid)+" h")+"</td><td class='o'><span class='tag "+tagFor(pct(mid,last.te))+"'>"+pctTxt(pct(mid,last.te))+"</span></td><td class='s num'>"+(midTe==null?"n/c":hNum(midTe)+" h")+"</td></tr></table>";
    html+="<div class='ttl p'>Proposition</div><table class='an prop'><tr><th>TE pièce</th><th>TP route</th></tr><tr><td>"+(propTe==null?"n/c":propTe.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" h")+"</td><td>"+propTpH.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" h</td></tr></table>";
    html+="<div class='ttl o'>Détail par OF</div><table class='an det'><tr><th>OF</th><th>Réf</th><th>Qté</th><th>Route</th><th>Pièce</th></tr>";
    x.lots.slice().sort((a,b)=>b.l.started-a.l.started).forEach(o=>{
      html+="<tr><td>"+o.l.of+"</td><td>"+o.l.ref+"</td><td>"+o.l.qty+"</td><td>"+hNum(o.t.n.setup)+"</td><td>"+(o.t.piece==null?"n/c":hNum(o.t.piece))+"</td></tr>";
    });
    html+="</table>";
    div.innerHTML=html;box.appendChild(div);
  });
};
if(typeof render==="function")render();
