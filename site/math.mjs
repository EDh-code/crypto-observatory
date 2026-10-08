export const day = d => Date.parse(d+'T00:00:00Z');
export function change(points,days){
 if(!points?.length)return null;
 const last=points.at(-1),target=day(last[0])-days*86400000;
 const prev=points.find(p=>day(p[0])===target);
 return prev&&prev[1]!==0?(last[1]/prev[1]-1)*100:null;
}
export function drawdown(points){let peak=0;return points.map(([d,v])=>{peak=Math.max(peak,v);return[d,peak?(v/peak-1)*100:0]})}
export function periodReturn(points,days){const byDate=new Map(points);return points.flatMap(([d,v])=>{const date=new Date(day(d)-days*86400000).toISOString().slice(0,10),base=byDate.get(date);return base>0?[[d,(v/base-1)*100]]:[]})}
