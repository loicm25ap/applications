function analyseTimes(l){
  const n=nets(l);
  const te=l.teMs||0;
  const shift=Math.min(Math.max(0,n.setup),Math.max(0,te));
  const setup=n.setup-shift,prod=n.prod+shift;
  return{
    work:n.work,
    piece:l.qty?prod/l.qty:null,
    charge:l.qty?n.work/l.qty:null,
    n:{setup:setup,prod:prod,work:n.work},
    shift:shift
  };
}
(function(){
  if(typeof renderAnalyse!=="function"||typeof pieceTimes!=="function")return;
  const rawAnalyse=renderAnalyse;
  renderAnalyse=function(){
    const keep=pieceTimes;
    pieceTimes=analyseTimes;
    try{rawAnalyse();}finally{pieceTimes=keep;}
  };
  if(typeof render==="function")render();
})();
