if(!Array.isArray(db.families))db.families=[];
if(typeof db.positions!=="object"||db.positions===null)db.positions={};
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
    b.className="chip"+(selRef===r?" on":"");
    const pos=db.positions[r];
    b.textContent=r+(pos!=null&&pos!==""?" ("+pos+")":"");
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
    const pos=db.positions[r];
    let html="<b>"+r+"</b>"+(f?" <span class='hint'>· "+(f.name||"famille")+"</span>":"");
    html+="<div class='adj-row' style='margin-top:6px'><div class='lab'>Positions</div><input id='pos_"+r+"' type='number' min='0' step='1' inputmode='numeric' value='"+(pos!=null?pos:"")+"' style='margin:0;padding:8px;font-size:14px'/></div>";
    card.innerHTML=html;
    const inp=card.querySelector("#pos_"+r);
    if(inp){
      inp.onchange=()=>{
        const v=inp.value.trim();
        if(v===""||isNaN(v))delete db.positions[r];
        else db.positions[r]=Math.max(0,Math.floor(Number(v)));
        save();render();
      };
    }
    const b=document.createElement("button");b.className="btn sm";b.textContent="Retirer";
    b.onclick=()=>{
      db.refs=db.refs.filter(x=>x!==r);
      delete db.positions[r];
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

/* === FEU : temps total lot vs cible logistique TP + TE×qté === */
function feuClass(p){
  if(p==null||!isFinite(p))return"feu-na";
  const a=Math.abs(p);
  if(a<=0.20)return"feu-ok";
  if(a<=0.35)return"feu-warn";
  return"feu-bad";
}
function feuLabel(p){
  if(p==null||!isFinite(p))return"n/c";
  const a=Math.abs(p);
  if(a<=0.20)return"Proche";
  if(a<=0.35)return"Écart modéré";
  return"Éloigné";
}
function feuGlobal(totalPct){
  if(totalPct==null||!isFinite(totalPct))return{cls:"feu-na",lab:"n/c",score:null};
  return{cls:feuClass(totalPct),lab:feuLabel(totalPct)+" · "+pctTxt(totalPct),score:totalPct};
}

function linearRegression(xs,ys){
  const n=xs.length;if(n<2)return null;
  let sx=0,sy=0,sxx=0,sxy=0;
  for(let i=0;i<n;i++){sx+=xs[i];sy+=ys[i];sxx+=xs[i]*xs[i];sxy+=xs[i]*ys[i];}
  const den=n*sxx-sx*sx;if(Math.abs(den)<1e-9)return null;
  const a=(n*sxy-sx*sy)/den; // slope
  const b=(sy-a*sx)/n;       // intercept
  return{a,b};
}
function estimateByPositions(targetPos){
  const groups={};
  db.lots.forEach(l=>{
    const pos=db.positions[l.ref];
    if(pos==null||!isFinite(pos))return;
    const t=analyseTimes(l);
    if(t.n.setup<=0&&(t.piece==null||t.piece<=0))return;
    if(!groups[pos])groups[pos]={setups:[],pieces:[],count:0};
    if(t.n.setup>0)groups[pos].setups.push(t.n.setup);
    if(t.piece!=null&&t.piece>0)groups[pos].pieces.push(t.piece);
    groups[pos].count++;
  });
  const keys=Object.keys(groups).map(Number).sort((a,b)=>a-b);
  if(!keys.length)return null;
  // points for regression (median per position)
  const xs=[],tps=[],tes=[];
  keys.forEach(k=>{
    const g=groups[k];
    const tp=median(g.setups),te=median(g.pieces);
    if(tp!=null){xs.push(k);tps.push(tp);}
    if(te!=null)tes.push({x:k,y:te});
  });
  const regTp=linearRegression(xs,tps);
  const regTe=tes.length>=2?linearRegression(tes.map(p=>p.x),tes.map(p=>p.y)):null;
  if(regTp||regTe){
    const tp=regTp?Math.max(0,regTp.a*targetPos+regTp.b):null;
    const te=regTe?Math.max(0,regTe.a*targetPos+regTe.b):null;
    return{method:"regression",tp,te,regTp,regTe,nPoints:keys.length};
  }
  // fallback nearest
  if(groups[targetPos]){
    const g=groups[targetPos];
    return{method:"exact",pos:targetPos,tp:median(g.setups),te:median(g.pieces),n:g.count};
  }
  let best=keys[0],bestD=Math.abs(keys[0]-targetPos);
  keys.forEach(k=>{
    const d=Math.abs(k-targetPos);
    if(d<bestD){best=k;bestD=d;}
  });
  const g=groups[best];
  return{method:"nearest",pos:best,tp:median(g.setups),te:median(g.pieces),n:g.count,dist:bestD};
}

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
    const routePct=pct(setupSum,cibleRoute);
    const prodPct=pct(prodSum,cibleProd);
    const piecePct=pct(mid,last.te);
    const totalObs=setupSum+prodSum;
    const totalCible=cibleRoute+cibleProd;
    const totalPct=pct(totalObs,totalCible);
    const feu=feuGlobal(totalPct);
    const div=document.createElement("div");div.className="card feu-card "+feu.cls;
    let html="<div class='feu-head'><span class='feu-dot "+feu.cls+"'></span><b>"+x.title+"</b> · "+x.lots.length+" OF · "+qty+" p.</div>";
    html+="<div class='feu-lab'>"+feu.lab+" · total réel "+hNum(totalObs)+" h / cible "+hNum(totalCible)+" h</div>";
    html+="<div class='hint'>Feu = écart du temps total (route + prod) vs TP + TE × qté. Vert ≤20 %, orange 21–35 %, rouge ≥36 %.</div>";
    html+="<div class='hint'>Cible groupe (dernier saisi) · TE "+hNum(last.te)+" h · TP "+hNum(last.tp)+" h</div>";
    html+="<div class='hint'>Observé corrigé : route − 1 TE, prod + 1 TE, pièce = prod ÷ qté</div>";
    html+="<div class='ttl'>Cible / observé / stats</div><table class='an'><tr><th></th><th class='c'>Cible</th><th class='o'>Observé</th><th class='o'>Écart</th><th class='s'>Stat</th></tr>";
    html+="<tr><td>Total lot</td><td class='c num'>"+hNum(totalCible)+" h</td><td class='o num'>"+hNum(totalObs)+" h</td><td class='o'><span class='tag "+tagFor(totalPct)+"'>"+pctTxt(totalPct)+"</span></td><td class='s num'></td></tr>";
    html+="<tr><td>Route TP</td><td class='c num'>"+hNum(cibleRoute)+" h</td><td class='o num'>"+hNum(setupSum)+" h</td><td class='o'><span class='tag "+tagFor(routePct)+"'>"+pctTxt(routePct)+"</span></td><td class='s num'>"+(midSetup==null?"n/c":hNum(midSetup)+" h")+"</td></tr>";
    html+="<tr><td>Prod TE×qté</td><td class='c num'>"+hNum(cibleProd)+" h</td><td class='o num'>"+hNum(prodSum)+" h</td><td class='o'><span class='tag "+tagFor(prodPct)+"'>"+pctTxt(prodPct)+"</span></td><td class='s num'>"+(mid==null?"n/c":hNum(mid)+" h/p")+"</td></tr>";
    html+="<tr><td>Temps pièce</td><td class='c num'>"+hNum(last.te)+" h</td><td class='o num'>"+(mid==null?"n/c":hNum(mid)+" h")+"</td><td class='o'><span class='tag "+tagFor(piecePct)+"'>"+pctTxt(piecePct)+"</span></td><td class='s num'>"+(midTe==null?"n/c":hNum(midTe)+" h")+"</td></tr></table>";
    html+="<div class='ttl p'>Proposition</div><table class='an prop'><tr><th>TE pièce</th><th>TP route</th></tr><tr><td>"+(propTe==null?"n/c":propTe.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" h")+"</td><td>"+propTpH.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" h</td></tr></table>";
    html+="<div class='ttl o'>Détail par OF</div><table class='an det'><tr><th>OF</th><th>Réf</th><th>Qté</th><th>Route</th><th>Pièce</th></tr>";
    x.lots.slice().sort((a,b)=>b.l.started-a.l.started).forEach(o=>{
      html+="<tr><td>"+o.l.of+"</td><td>"+o.l.ref+"</td><td>"+o.l.qty+"</td><td>"+hNum(o.t.n.setup)+"</td><td>"+(o.t.piece==null?"n/c":hNum(o.t.piece))+"</td></tr>";
    });
    html+="</table>";
    div.innerHTML=html;box.appendChild(div);
  });

  /* === Estimation par positions === */
  const posBox=document.createElement("div");posBox.className="card";
  let phtml="<div class='ttl'>Estimation par nombre de positions</div>";
  phtml+="<p class='hint'>Régression linéaire dès que possible (interpolation / extrapolation). Sinon médiane du plus proche. Temps corrigés.</p>";
  const groups={};
  db.lots.forEach(l=>{
    const pos=db.positions[l.ref];
    if(pos==null||!isFinite(pos))return;
    const t=times(l);
    if(!groups[pos])groups[pos]={setups:[],pieces:[],count:0};
    if(t.n.setup>0)groups[pos].setups.push(t.n.setup);
    if(t.piece!=null&&t.piece>0)groups[pos].pieces.push(t.piece);
    groups[pos].count++;
  });
  const pkeys=Object.keys(groups).map(Number).sort((a,b)=>a-b);
  if(pkeys.length){
    phtml+="<table class='an'><tr><th>Positions</th><th>Lots</th><th>TP méd. (h)</th><th>TE/pièce méd. (h)</th></tr>";
    pkeys.forEach(p=>{
      const g=groups[p];
      const tp=median(g.setups),te=median(g.pieces);
      phtml+="<tr><td>"+p+"</td><td>"+g.count+"</td><td>"+(tp!=null?hNum(tp):"n/c")+"</td><td>"+(te!=null?hNum(te):"n/c")+"</td></tr>";
    });
    phtml+="</table>";
  }else{
    phtml+="<p class='hint'>Pas encore assez de données (réfs avec positions + lots faits).</p>";
  }
  phtml+="<div class='lab' style='margin-top:10px'>Estimer pour une future pièce</div>";
  phtml+="<input id='estPos' type='number' min='1' step='1' inputmode='numeric' placeholder='Nombre de positions'/>";
  phtml+="<div id='estResult' class='hint' style='margin-top:6px;white-space:pre-wrap'></div>";
  posBox.innerHTML=phtml;
  box.appendChild(posBox);
  const estIn=posBox.querySelector("#estPos");
  const estRes=posBox.querySelector("#estResult");
  if(estIn&&estRes){
    estIn.oninput=()=>{
      const v=Number(estIn.value);
      if(!v||v<=0){estRes.textContent="";return;}
      const est=estimateByPositions(v);
      if(!est){estRes.textContent="Pas assez de données.";return;}
      let txt="";
      if(est.method==="regression"){
        txt="Régression linéaire ("+est.nPoints+" points)\n";
        if(est.regTp)txt+="TP ≈ "+est.regTp.a.toFixed(3)+" × positions + "+est.regTp.b.toFixed(3)+" h\n";
        if(est.regTe)txt+="TE ≈ "+est.regTe.a.toFixed(3)+" × positions + "+est.regTe.b.toFixed(3)+" h\n";
      }else if(est.method==="exact"){
        txt="Données exactes ("+est.n+" lots)\n";
      }else{
        txt="Plus proche : "+est.pos+" positions ("+est.n+" lots, écart "+est.dist+")\n";
      }
      txt+="TP estimé : "+(est.tp!=null?hNum(est.tp)+" h":"n/c")+"\n";
      txt+="TE/pièce estimé : "+(est.te!=null?hNum(est.te)+" h":"n/c");
      estRes.textContent=txt;
    };
  }
};
if(typeof render==="function")render();
