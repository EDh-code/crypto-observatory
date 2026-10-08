import {strengthIndex} from './strength.mjs';
import {day,change,drawdown,periodReturn} from './math.mjs';
const $=s=>document.querySelector(s),names={BTC:'Bitcoin',ETH:'Ethereum',SOL:'Solana',SUI:'Sui',XRP:'XRP Ledger'};
let data,asset='BTC',view='usage',metric='addresses',windowDays=365;
const definitions={
 addresses:['Active addresses','number','Unique active addresses reported by the provider. One person may control many addresses; bots and exchanges distort this measure.'],
 transactions:['Transactions','number','Provider-defined transaction count, not verified human activity. Do not compare raw counts across chains.'],
 fees:['Network fees','usd','Total network fees paid per day. Higher fees can reflect demand or congestion. They are not profits paid directly to every tokenholder.'],
 transfers:['Adjusted transfer value','usd','Daily on-chain transfer value after the provider’s adjustments. Self-transfers can remain; this is not a measure of net investment inflows.'],
 dex:['DEX trading volume','usd','Daily trading volume on decentralised exchanges tracked by DefiLlama. Speculation, incentives and wash trading can affect volume.'],
 tvl:['Funds in DeFi (TVL)','usd','USD value locked in tracked DeFi protocols. Token price changes can move TVL without new deposits. TVL is a stock, not daily usage.'],
 dormant:['Unmoved for 1+ year','percent','100 × (1 − supply active within one year ÷ current supply). A BTC dormancy proxy, not Glassnode’s 155-day entity-adjusted long-term-holder measure. Lost coins and automatic ageing affect it.'],
 realized:['Realised capitalisation','usd','Supply valued at the price when coins last moved, using provider methodology. An approximate aggregate cost basis, not literal net cash inflows.'],
 drawdown:['Drawdown in loaded history','percent','Fall from the highest daily USD price observed in the loaded history (up to five years). This is not necessarily the all-time-high drawdown.'],
 return:['Rolling 1-year return','percent','USD price change over 365 days. Nominal, not inflation-adjusted; this does not establish preservation of purchasing power.'],
 lth:['Long-term holder share','percent','Not connected: a comparable long-term-holder series requires a provider and asset-specific methodology. Staking, custody and escrow complicate comparisons.']
};
function fmt(n,type='number'){if(n==null||!Number.isFinite(n))return 'Unavailable';if(type==='percent')return n.toFixed(1)+'%';return(type==='usd'?'$':'')+new Intl.NumberFormat('en',{notation:Math.abs(n)>=1e5?'compact':'standard',maximumFractionDigits:Math.abs(n)<10?2:1}).format(n)}
function series(key){const a=data.assets[asset]||{};if(['drawdown','return'].includes(key)){const p=a.price;return p?{...p,points:key==='drawdown'?drawdown(p.points):periodReturn(p.points,365)}:null}return a[key]}
function keys(){return view==='store'?[(asset==='BTC'?'dormant':'lth'),'realized','drawdown','return']:(['ETH','SOL','SUI'].includes(asset)?['addresses','fees','dex','tvl']:['addresses','transactions','fees','transfers'])}
function stale(s){return s?.points?.length&&Date.now()-day(s.points.at(-1)[0])>4*86400000}
function failed(k){return data.failures.some(f=>f.asset===asset&&f.metric===k)}
function render(){
 overview();
 $('#assets').replaceChildren(...Object.entries(names).map(([symbol,name])=>{const b=document.createElement('button');b.className='asset'+(asset===symbol?' selected':'');b.setAttribute('aria-pressed',asset===symbol);b.innerHTML=`<span><strong>${symbol}</strong><small>${name}</small></span><span class="price">${fmt(data.assets[symbol]?.price?.points?.at(-1)?.[1],'usd')}</span>`;b.onclick=()=>{asset=symbol;metric=keys()[0];render()};return b}));
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.view===view);b.setAttribute('aria-pressed',b.dataset.view===view)});
 const contexts={BTC:'Settlement activity is only one part of Bitcoin’s use. Holding wealth may create no transactions.',ETH:'These figures cover Ethereum mainnet. Layer 2 activity is not included; use growthepie for the wider ecosystem.',SOL:'Use fees and trading activity together. Raw Solana totals can include validator votes, so transaction totals are not shown as user activity.',SUI:'Look for persistent activity alongside funds in applications. Incentives and token prices can distort apparent growth.',XRP:'Transactions and adjusted transfers are broad network measures, not a verified breakdown of payment adoption or Ripple’s commercial activity.'};
 $('#context').textContent=`${names[asset]} · ${view==='usage'?contexts[asset]:'Holding behaviour measures conviction; returns and drawdowns measure outcomes. Neither proves future store-of-value performance.'}`;
 $('#cards').replaceChildren(...keys().map(k=>{const s=series(k),points=s?.points||[],last=points.at(-1),[label,type]=definitions[k],b=document.createElement('button');b.className='metric'+(metric===k?' selected':'');b.setAttribute('aria-pressed',metric===k);const changes=[30,90].map(d=>{let n=change(points,d);if(type==='percent'&&last){const prev=points.find(p=>day(p[0])===day(last[0])-d*86400000);n=prev?last[1]-prev[1]:null}return`${d}d: ${n==null?'—':(n>=0?'+':'')+n.toFixed(1)+(type==='percent'?' pp':'%')}`}).join(' · ');b.innerHTML=`<span class="label">${label}</span><span class="value">${fmt(last?.[1],type)}</span><span class="change">${changes}</span><small>${last?'As of '+last[0]+(stale(s)?' · Stale':'')+(failed(k)?' · Refresh failed':''):'No series connected'}</small>`;b.onclick=()=>{metric=k;render()};return b}));
 $('#explanation').replaceChildren(...keys().map(k=>{const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=definitions[k][0]+'. ';p.append(strong,definitions[k][2]);return p}));
 $('#coverage').replaceChildren(...Object.keys(names).map(a=>{const p=document.createElement('p'),ss=data.assets[a];p.textContent=a+': '+Object.entries(ss).filter(([k])=>!['supply','active1y'].includes(k)).map(([k,v])=>`${k} (${v.points.at(-1)?.[0]||'no observations'})`).join(', ');return p}));
 const p=document.createElement('p');p.textContent=`${data.failures.length} series were unavailable or failed in the last refresh. Older observations, if any, are retained.`;$('#coverage').append(p);
 chart();
}
function chart(){const s=series(metric),[label,type,description]=definitions[metric];$('#chart-title').textContent=label;$('#chart-label').textContent=asset+' / '+(view==='store'?'STORE OF VALUE':'NETWORK USAGE');$('#chart-source').textContent=s?.source||'No connected source';$('#chart-caption').textContent=description;
 const all=s?.points||[],cutoff=Date.now()-windowDays*86400000,pts=all.filter(p=>day(p[0])>=cutoff);
 if(pts.length<2){$('#chart').innerHTML='<div class="empty"><strong>Not enough observations to plot</strong><span>No estimated or sample values have been substituted.</span></div>';return}
 const w=1050,h=300,left=80,right=20,top=20,bottom=35,x0=day(pts[0][0]),x1=day(pts.at(-1)[0]);let lo=Math.min(...pts.map(p=>p[1])),hi=Math.max(...pts.map(p=>p[1]));const pad=(hi-lo)*.12||Math.abs(hi)*.05||1;lo-=pad;hi+=pad;const x=d=>left+(day(d)-x0)/(x1-x0)*(w-left-right),y=v=>top+(hi-v)/(hi-lo)*(h-top-bottom);
 let grids='';for(let i=0;i<5;i++){const v=lo+(hi-lo)*i/4,yy=y(v);grids+=`<line x1="${left}" y1="${yy}" x2="${w-right}" y2="${yy}" stroke="#2a373b"/><text x="${left-12}" y="${yy+4}" text-anchor="end">${fmt(v,type)}</text>`}
 // Break the line across missing dates rather than implying continuous observations.
 let path='';pts.forEach(([d,v],i)=>{path+=(i===0||day(d)-day(pts[i-1][0])>86400000*1.5?'M':'L')+x(d).toFixed(1)+','+y(v).toFixed(1)+' '});
 $('#chart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${asset} ${label}, ${pts[0][0]} to ${pts.at(-1)[0]}"><title>${asset} ${label}</title>${grids}<path d="${path}" fill="none" stroke="#c0f479" stroke-width="2.5"/><circle cx="${x(pts.at(-1)[0])}" cy="${y(pts.at(-1)[1])}" r="4" fill="#c0f479"/><text x="${left}" y="${h-5}">${pts[0][0]}</text><text x="${w-right}" y="${h-5}" text-anchor="end">${pts.at(-1)[0]}</text></svg>`;
}
async function load(){const button=$('#refresh');button.disabled=true;try{const r=await fetch('./data/metrics.json',{cache:'no-store'});if(!r.ok)throw Error();data=await r.json();$('#updated').textContent='Collection run: '+new Date(data.updatedAt).toLocaleString();$('#notice').textContent=Date.now()-Date.parse(data.updatedAt)>3*86400000?'The collection run is over three days old. Check the GitHub Actions workflow.':'';render()}catch{$('#notice').textContent='Could not load observations. Serve this folder through GitHub Pages or a local HTTP server, then retry.'}finally{button.disabled=false}}
$('#refresh').onclick=load;$('#period').onchange=e=>{windowDays=Number(e.target.value);chart()};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;metric=keys()[0];render()});load();

function overview(){
 $('#overview').replaceChildren(...Object.entries(names).map(([symbol,name])=>{
  const result=strengthIndex(data.assets[symbol]||{},data.through),pts=result.points,last=pts.at(-1),delta=change(pts,30),b=document.createElement('button');
  const state=delta==null?'Insufficient data':delta>2?'Rising':delta< -2?'Falling':'Broadly flat';
  b.className='overview-coin';
  let svg='<div class="mini-empty">Insufficient current history</div>';
  if(pts.length>1){const values=pts.map(p=>p[1]),min=Math.min(...values),max=Math.max(...values),span=max-min||1,start=day(pts[0][0]),finish=day(last[0]);let path='';pts.forEach(([d,v],i)=>{path+=(i===0||day(d)-day(pts[i-1][0])>86400000?'M':'L')+(8+344*(day(d)-start)/(finish-start))+','+(80-66*(v-min)/span)+' '});svg=`<svg viewBox="0 0 360 94" role="img" aria-label="${symbol} strength trend over the last year"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`}
  b.innerHTML=`<div class="overview-top"><span><strong>${symbol}</strong><small>${name}</small></span><span class="trend ${delta>2?'up':delta< -2?'down':''}">${state}</span></div><div class="index-number">${last?last[1].toFixed(1):'—'}<span>Strength index</span></div><div class="${delta< -2?'down':'up'}">${svg}</div><div class="overview-foot"><span>30 days <strong>${delta==null?'—':(delta>=0?'+':'')+delta.toFixed(1)+'%'}</strong></span><span>Price ${fmt(data.assets[symbol]?.price?.points?.at(-1)?.[1],'usd')}</span></div><small>${result.used.length}/5 factors · ${last?'As of '+last[0]:'No complete series'}${Date.now()-day(data.through)>4*86400000?' · Stale':''}</small><small>Includes: ${result.used.map(k=>definitions[k][0]).join(', ')||'none'}</small><span class="inspect">View individual factors</span>`;
  b.onclick=()=>{asset=symbol;metric=keys()[0];$('#detail').hidden=false;$('#overview').hidden=true;$('.method').hidden=true;render();$('#back').focus()};return b;
 }));
}
$('#back').onclick=()=>{$('#detail').hidden=true;$('#overview').hidden=false;$('.method').hidden=false;$('#overview button').focus()};
