"""Public daily observations. No API secrets or third-party dependencies required."""
import concurrent.futures as cf
import datetime as dt
import json, math, os, pathlib, urllib.request, urllib.parse, urllib.error, time
ROOT = pathlib.Path(__file__).resolve().parents[1]
NOW = dt.datetime.now(dt.timezone.utc)
START = (NOW - dt.timedelta(days=1827)).date().isoformat()
END = (NOW.date() - dt.timedelta(days=1)).isoformat()
ASSETS = ['BTC','ETH','SOL','SUI','XRP']
METRICS = {'price':'PriceUSD','addresses':'AdrActCnt','transactions':'TxCnt','fees':'FeeTotUSD','transfers':'TxTfrValAdjUSD','realized':'CapRealUSD','supply':'SplyCur','active1y':'SplyAct1yr','mvrv':'CapMVRVCur','marketcap':'CapMrktCurUSD'}

def get(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'CryptoObservatory/1.0'}),timeout=25) as r: return json.load(r)
        except urllib.error.HTTPError as exc:
            if exc.code in (400,401,403,404) or attempt == 2: raise
            time.sleep(1 + attempt)
        except Exception:
            if attempt == 2: raise
            time.sleep(1 + attempt)

def clean(points):
    out = {}
    for date,value in points:
        try:
            n = float(value)
            if math.isfinite(n) and n >= 0 and date <= END: out[date] = n
        except (ValueError,TypeError): pass
    return sorted(out.items())

def cm(asset,key,metric):
    query = urllib.parse.urlencode(dict(assets=asset.lower(),metrics=metric,frequency='1d',start_time=START,end_time=END,page_size=10000))
    base = 'https://api.coinmetrics.io' if os.environ.get('COINMETRICS_API_KEY') else 'https://community-api.coinmetrics.io'
    if os.environ.get('COINMETRICS_API_KEY'): query += '&api_key=' + urllib.parse.quote(os.environ['COINMETRICS_API_KEY'])
    url = base + '/v4/timeseries/asset-metrics?' + query
    points=[]
    while url:
        payload=get(url)
        points.extend((r['time'][:10],r.get(metric)) for r in payload['data'])
        url=payload.get('next_page_url')
        if url and not url.startswith(base + '/'): raise ValueError('Unexpected pagination host')
    return asset,key,{'source':'Coin Metrics','url':'https://docs.coinmetrics.io/','points':clean(points)}

def llama(asset,kind):
    chain={'ETH':'Ethereum','SOL':'Solana','SUI':'Sui'}[asset]
    if kind=='tvl':
        data=get('https://api.llama.fi/v2/historicalChainTvl/'+chain)
        points=[(dt.datetime.fromtimestamp(r['date'],dt.timezone.utc).date().isoformat(),r['tvl']) for r in data]
    else:
        data=get('https://api.llama.fi/overview/dexs/'+chain+'?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume')
        points=[(dt.datetime.fromtimestamp(int(t),dt.timezone.utc).date().isoformat(),v) for t,v in data['totalDataChart']]
    return asset,kind,{'source':'DefiLlama','url':'https://defillama.com/chain/'+chain.lower(),'points':clean(points)}

def chain_fees(asset):
    chain={'BTC':'bitcoin','ETH':'ethereum','SOL':'solana','SUI':'sui','XRP':'xrpl'}[asset]
    data=get('https://api.llama.fi/summary/fees/'+chain+'?dataType=dailyFees')
    points=[(dt.datetime.fromtimestamp(int(t),dt.timezone.utc).date().isoformat(),v) for t,v in data['totalDataChart']]
    return asset,'fees',{'source':'DefiLlama chain fees','url':'https://defillama.com/fees/'+chain,'points':clean(points)}

def main():
    path=ROOT/'site/data/metrics.json'
    old=json.loads(path.read_text()) if path.exists() else {'assets':{}}
    assets={a:dict(old.get('assets',{}).get(a,{})) for a in ASSETS}
    failures=[]; success=0
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        jobs={}
        for a in ASSETS:
            for key,m in METRICS.items():
                if key in ('active1y','supply') and a!='BTC': continue
                jobs[pool.submit(cm,a,key,m)]=(a,key)
        for a in ['ETH','SOL','SUI']:
            for key in ['tvl','dex']: jobs[pool.submit(llama,a,key)]=(a,key)
        for job in cf.as_completed(jobs):
            a,key=jobs[job]
            try:
                _,_,series=job.result()
                if not series['points']: raise ValueError('No available observations')
                assets[a][key]=series; success+=1
            except Exception as e:
                # Preserve last good data, but expose failure and the original observation date.
                failures.append({'asset':a,'metric':key,'reason':str(e).split('?')[0][:150]})
    for a in ASSETS:
        if not assets[a].get('fees') or any(f['asset']==a and f['metric']=='fees' for f in failures):
            try:
                _,_,ss=chain_fees(a)
                if ss['points']:
                    assets[a]['fees']=ss;success+=1
                    failures=[f for f in failures if not(f['asset']==a and f['metric']=='fees')]
            except Exception: pass
    # Algebraic fallback: MVRV = market cap / realised cap, same provider and date.
    for a in ASSETS:
        aa=assets[a]
        if not aa.get('realized'):
            cap=dict(aa.get('marketcap',{}).get('points',[]))
            points=[(d,cap[d]/v) for d,v in aa.get('mvrv',{}).get('points',[]) if v>0 and d in cap]
            if points:
                aa['realized']={'source':'Derived: Coin Metrics market cap / MVRV','url':'https://docs.coinmetrics.io/','points':points}
                failures=[f for f in failures if not(f['asset']==a and f['metric']=='realized')]
    btc=assets['BTC']; supply=dict(btc.get('supply',{}).get('points',[]))
    dormant=[]
    for date,active in btc.get('active1y',{}).get('points',[]):
        total=supply.get(date)
        if total and 0<=active<=total: dormant.append((date,100*(1-active/total)))
    if dormant: btc['dormant']={'source':'Derived from Coin Metrics','url':'https://docs.coinmetrics.io/','points':dormant}
    payload={'updatedAt':NOW.isoformat(),'through':END,'successfulSeries':success,'failures':failures,'assets':assets}
    path.write_text(json.dumps(payload,separators=(',',':')))
    print(json.dumps({'successfulSeries':success,'unavailableSeries':len(failures),'latest':{a:{k:v['points'][-1][0] for k,v in ss.items() if v['points']} for a,ss in assets.items()}}))
    if not success: raise SystemExit('No sources refreshed; existing data preserved. Deployment stopped.')
if __name__=='__main__': main()
