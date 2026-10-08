const DAY=86400000;
const labels={addresses:'Active addresses',fees:'Network fees',dex:'DEX volume',tvl:'DeFi TVL',realized:'Realised capitalisation'};
const stamp=d=>Date.parse(d+'T00:00:00Z');
const date=t=>new Date(t).toISOString().slice(0,10);
const pct=n=>(n>=0?'+':'')+n.toFixed(1)+'%';
function average(points,end){const map=new Map(points||[]);let total=0;for(let i=0;i<28;i++){const v=map.get(date(end-i*DAY));if(!Number.isFinite(v)||v<0)return null;total+=v}return total/28}
export function analyseCoin(symbol,series,through,now=Date.now()){
 const end=stamp(through),factors=[];
 for(const [key,label]of Object.entries(labels)){const current=average(series[key]?.points,end),previous=average(series[key]?.points,end-30*DAY);if(current!==null&&previous>0)factors.push({key,label,change:(current/previous-1)*100})}
 const price=new Map(series.price?.points||[]),p=price.get(through),old=price.get(date(end-30*DAY)),priceChange=p>0&&old>0?(p/old-1)*100:null;
 const up=factors.filter(x=>x.change>5),down=factors.filter(x=>x.change< -5),growth=factors.length?100*(Math.exp(factors.reduce((s,x)=>s+Math.log(Math.max(1e-12,1+x.change/100)),0)/factors.length)-1):null;
 const mvrvMap=new Map(series.mvrv?.points||[]),mvrv=mvrvMap.get(through),history=[...mvrvMap].filter(([d,v])=>stamp(d)>=end-3*365*DAY&&stamp(d)<end&&v>0).map(x=>x[1]);
 const percentile=mvrv>0&&history.length>=365?100*history.filter(v=>v<=mvrv).length/history.length:null;
 const stale=!Number.isFinite(end)||now-end>4*DAY;
 const divergence=factors.length>=3&&up.length>=Math.ceil(factors.length*.6)&&growth>5&&priceChange!==null&&priceChange<=0;
 const cheap=percentile!==null&&percentile<=20;
 let status='No clear valuation signal';
 if(stale)status='Data too old to assess';else if(factors.length<2||priceChange===null)status='Insufficient evidence';else if(divergence&&cheap)status='Potential discount — mixed evidence';else if(divergence)status='Price lagging improving factors';else if(cheap)status='Low historical valuation ratio';else if(down.length>up.length)status='Underlying factors weakening';
 const drivers=[...factors].sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));
 const trend=stale?'Refresh the data before interpreting these signals.':`${up.length} of ${factors.length} available factors improved by more than 5%; ${down.length} declined by more than 5%.`;
 const evidence=priceChange===null?'A matching 30-day price comparison is unavailable.':`Price ${pct(priceChange)} over 30 days. ${drivers.slice(0,2).map(x=>x.label+' '+pct(x.change)).join('; ')}${drivers.length?'.':''}`;
 const valuation=percentile===null?'No sufficiently long MVRV history is available. Price/activity divergence alone does not establish undervaluation.':`MVRV is ${mvrv.toFixed(2)}×, at approximately the ${Math.round(percentile)}th percentile of ${history.length} daily observations over the preceding three years. ${cheap?'This is historically low, not proof of fair value.':'This does not meet our bottom-20% historical-discount screen.'}`;
 const risks={BTC:'Dormant or lost coins affect cost-basis measures. We do not have holder-age evidence, and on-chain activity misses some store-of-value demand.',ETH:'These activity figures omit Layer 2 networks. More ecosystem usage does not necessarily produce proportionate ETH demand.',SOL:'Trading volume and fees can rise together because of speculation. TVL also moves with token prices; inflation and token value capture are not assessed.',SUI:'Incentives, token prices and speculative trading can inflate the measures. Future unlocks and dilution are not incorporated.',XRP:'Ledger activity does not prove adoption of XRP as a bridge asset. Escrow releases, concentration and token demand are not incorporated.'};
 const confidence=stale||factors.length<3?'Limited':cheap&&divergence?'Moderate':'Limited';
 const watch=divergence?'Watch whether improvement persists and spreads beyond correlated trading/fee measures. A reversal in activity would weaken the case.':cheap?'Watch whether network activity stabilises or improves. Continued deterioration could justify the low ratio.':'Look for sustained improvement across several factors, alongside a historically low valuation measure, before forming a discount thesis.';
 return {symbol,status,trend,evidence,valuation,counterargument:risks[symbol],confidence,watch,factors,priceChange,percentile,stale};
}
export function renderAnalyst(data,container){
 const results=Object.entries(data.assets).map(([a,s])=>analyseCoin(a,s,data.through));
 container.replaceChildren();const heading=document.createElement('h2');heading.textContent='What the data is saying';container.append(heading);
 const intro=document.createElement('p');intro.className='muted';intro.textContent=`Rules-based research notes · As of ${data.through} · Not AI-generated or a buy/sell recommendation`;container.append(intro);
 for(const r of results){const item=document.createElement('details');item.className='analyst-note';const summary=document.createElement('summary');summary.textContent=`${r.symbol} · ${r.status}`;item.append(summary);const teaser=document.createElement('p');teaser.textContent=r.trend;item.append(teaser);
 for(const [label,value]of [['Evidence',r.evidence],['Valuation case',r.valuation],['Counterargument',r.counterargument],['Evidence strength',r.confidence+' — qualitative, not a probability of a price rise.'],['What would change the view',r.watch]]){const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+': ';p.append(b,value);item.append(p)}container.append(item)}
 const method=document.createElement('details');method.className='analyst-note';const title=document.createElement('summary');title.textContent='How these assessments are generated';const body=document.createElement('p');body.textContent='Version 1 uses explicit research screens, not an AI model. Factor changes compare complete 28-day averages ending 30 days apart. Improvements/declines require ±5%. A divergence flag needs at least three factors, 60% improving, combined geometric growth above 5%, and flat/falling price. MVRV compares market cap with realised cap; the lowest 20% of available daily observations in the preceding three years is a historical-discount flag (minimum 365 observations). These thresholds are heuristic, not backtested. USD metrics are price-sensitive and factors are correlated. Missing data is excluded; old data blocks current signals. There is no fair-price estimate, token-unlock model, news analysis or claim that usage automatically benefits holders.';method.append(title,body);container.append(method);
}
