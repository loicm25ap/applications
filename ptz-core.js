const KEY="ptz_of_v1";const $=id=>document.getElementById(id);
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{refs:[],lots:[],current:null,days:{}}}catch{return{refs:[],lots:[],current:null,days:{}}}}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function ymd(d){const x=d instanceof Date?d:new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")}
function fmt(ms){ms=Math.max(0,ms||0);const s=Math.floor(ms/1000);return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor((s%3600)/60).toString().padStart(2,"0"))+":"+String(s%60).padStart(2,"0")}
