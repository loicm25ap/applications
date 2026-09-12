const KEY="ptz_of_v1";const $=id=>document.getElementById(id);
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{refs:[],lots:[],current:null,days:{}}}catch{return{refs:[],lots:[],current:null,days:{}}}}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function ymd(d){const x=d instanceof Date?d:new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")}
function fmt(ms){ms=Math.max(0,ms||0);const s=Math.floor(ms/1000);return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor((s%3600)/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function hNum(ms){return ((ms||0)/3600000).toLocaleString("fr-FR",{minimumFractionDigits:3,maximumFractionDigits:3})}
function pieceTimes(l){const n=nets(l);return{work:n.work,piece:l.qty?n.prod/l.qty:null,charge:l.qty?n.work/l.qty:null,n}}
function analyseTimes(l){const n=nets(l);const te=l.teMs||0;const shift=Math.min(Math.max(0,n.setup),Math.max(0,te));const setup=n.setup-shift,prod=n.prod+shift;return{work:n.work,setup:setup,prod:prod,piece:l.qty?prod/l.qty:null,n:{setup:setup,prod:prod,work:n.work},shift:shift}}
