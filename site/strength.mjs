// Transparent trend index, not fair value or a cross-asset quality ranking.
export function strengthIndex(series,through){
 const ms=86400000,date=t=>new Date(t).toISOString().slice(0,10),end=Date.parse(through),base=end-365*ms;
 const candidates=['addresses','fees','dex','tvl','realized'];
 const used=[];
 for(const key of candidates){
  const map=new Map(series[key]?.points||[]),smoothed=new Map();
  for(let t=base;t<=end;t+=ms){let total=0,complete=true;for(let j=0;j<28;j++){const v=map.get(date(t-j*ms));if(!Number.isFinite(v)||v<0){complete=false;break}total+=v}if(complete&&total>0)smoothed.set(date(t),total/28)}
  if(smoothed.has(date(base))&&smoothed.has(through))used.push({key,smoothed});
 }
 if(used.length<2)return {points:[],used:used.map(x=>x.key),baseline:date(base)};
 const points=[];
 for(let t=base;t<=end;t+=ms){const d=date(t);if(used.every(x=>x.smoothed.has(d)))points.push([d,100*Math.exp(used.reduce((s,x)=>s+Math.log(x.smoothed.get(d)/x.smoothed.get(date(base))),0)/used.length)])}
 return {points,used:used.map(x=>x.key),baseline:date(base)};
}
