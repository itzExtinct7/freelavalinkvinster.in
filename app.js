(()=>{
const $=id=>document.getElementById(id);
const cfg=window.DASHBOARD_CONFIG||{};
const API=cfg.playersUrl||'/api/stats',EVERY=Math.max(1000,Number(cfg.refreshInterval)||5000),MAX=Math.round(15*60000/EVERY),KEY='vl-history';
const demo=new URLSearchParams(location.search).has('demo');
let busy=false,hist=[],fails=0,last=null,lastAt=0,timer=null,state='init';
try{hist=JSON.parse(sessionStorage.getItem(KEY)||'[]').slice(-MAX)}catch(e){}

const num=n=>Number.isFinite(n)?Math.round(n).toLocaleString():'—';
const pct=v=>Math.round(Math.min(1,Math.max(0,v))*100);
const bytes=b=>{if(!Number.isFinite(b))return '—';const u=['B','KB','MB','GB','TB'];let i=0;while(b>=1024&&i<4){b/=1024;i++}return (i>1?b.toFixed(1):Math.round(b))+' '+u[i]};
const dur=ms=>{let s=Math.floor(ms/1000),d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return d?`${d}d ${h}h`:h?`${h}h ${m}m`:`${m}m`};
const level=p=>p>90?'bad':p>70?'warn':'';

function norm(j){
 const s=(j&&(j.stats||j.data||j))||{},c=s.cpu||{},m=s.memory||{},f=s.frameStats;
 return{players:+s.players||0,playing:+s.playingPlayers||0,uptime:+s.uptime||0,
  cores:c.cores,sys:+c.systemLoad||0,lav:+c.lavalinkLoad||0,used:m.used,alloc:m.allocated,
  frames:f?{sent:+f.sent||0,nulled:+f.nulled||0,deficit:+f.deficit||0}:null};
}
function fake(){
 const t=Date.now()/1000,p=Math.round(40+25*Math.sin(t/40)+Math.random()*4);
 return{players:p+18,playing:p,uptime:3*864e5+(t%864e3)*1000,cores:4,sys:.3+.08*Math.sin(t/30),lav:.12+p/400,
  used:5.2e8,alloc:1.1e9,frames:{sent:p*3000,nulled:Math.round(Math.random()*20),deficit:-Math.round(Math.random()*40)},ping:38+Math.round(Math.random()*12)};
}
const frameLoss=f=>f?(f.nulled+Math.max(0,f.deficit))/Math.max(1,f.sent):0;

function status(d){
 if(d.lav>.85||d.sys>.95)return['warn','The processor is close to its limit.'];
 if(frameLoss(d.frames)>.02)return['warn','Some audio frames are being dropped.'];
 return['ok',''];
}

async function poll(){
 clearTimeout(timer);
 if(document.hidden||busy)return;
 if(demo){apply(fake());return schedule()}
 busy=true;
 const c=new AbortController(),to=setTimeout(()=>c.abort(),8000),t=performance.now();
 try{
  const r=await fetch(API,{cache:'no-store',signal:c.signal});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const d=norm(await r.json());d.ping=Math.round(performance.now()-t);
  fails=0;apply(d);
 }catch(e){fails++;fail()}
 finally{clearTimeout(to);busy=false;schedule()}
}
const schedule=()=>{timer=setTimeout(poll,EVERY*Math.min(1+fails,3))};

function apply(d){
 last=d;lastAt=Date.now();
 hist.push({p:d.playing,c:d.lav});hist=hist.slice(-MAX);
 try{sessionStorage.setItem(KEY,JSON.stringify(hist))}catch(e){}
 const[s,why]=status(d);setState(s);
 $('headline').textContent=s==='ok'?'Node is online':'Node is under strain';
 $('main').classList.remove('stale');
 $('players').textContent=num(d.players);$('playing').textContent=num(d.playing);
 $('uptime').textContent=dur(d.uptime);
 $('ping').innerHTML=Number.isFinite(d.ping)?`${d.ping}<small>ms</small>`:'—';
 meter('lav',pct(d.lav));meter('sys',pct(d.sys));
 $('cores').textContent=d.cores?`${d.cores} CPU core${d.cores>1?'s':''} available`:'';
 const mp=d.alloc?pct(d.used/d.alloc):0;
 $('memTxt').textContent=Number.isFinite(d.used)?bytes(d.used):'—';
 $('memLabel').textContent=d.alloc?`In use of ${bytes(d.alloc)}`:'In use';
 $('memBar').style.width=mp+'%';$('memBar').className='fill '+level(mp);
 const f=d.frames;
 $('sent').textContent=f?num(f.sent):'—';$('nulled').textContent=f?num(f.nulled):'—';$('deficit').textContent=f?num(f.deficit):'—';
 const loss=frameLoss(f);
 $('verdict').textContent=!f?'No frame data yet. It appears once a player is connected.':
  loss<.005?'Playback is smooth. Almost every frame arrived on time.':
  loss<.02?'Minor stutter is possible for some listeners.':'Playback is stuttering. Many frames are being lost.';
 sub(why);draw();
}
function meter(k,p){$(k+'Txt').textContent=p+'%';$(k+'Bar').style.width=p+'%';$(k+'Bar').className='fill'+(k==='lav'?' v':'')+' '+level(p)}

function fail(){
 if(fails<2&&last)return;
 setState('down');
 $('headline').textContent='Node is unreachable';
 $('main').classList.toggle('stale',!!last);
 sub();
}
function setState(s){
 state=s;document.documentElement.dataset.state=s;
 const t={ok:'Online',warn:'Degraded',down:'Offline',init:'Checking'}[s];
 $('pillText').textContent=t;document.title=`${t} – Vinster Lavalink status`;
}
let why='';
function sub(w){
 if(w!==undefined)why=w;
 const el=$('sub');
 if(state==='down'){
  el.textContent=last?`The last ${fails} checks failed. Showing the final values from ${ago()}. Retrying automatically.`:'The stats endpoint did not respond. Retrying automatically.';return;
 }
 if(!last)return;
 el.textContent=`Updated ${ago()}.`+(Number.isFinite(last.ping)?` Responds in ${last.ping} ms.`:'')+(why?' '+why:'');
}
function ago(){const s=Math.round((Date.now()-lastAt)/1000);return s<3?'just now':s<90?s+' seconds ago':Math.round(s/60)+' minutes ago'}

function draw(){
 const cv=$('wave'),dpr=window.devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;
 if(!w)return;
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
 const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
 const step=w/MAX,bw=Math.max(1.5,step*.6),mid=h/2,peak=Math.max(5,...hist.map(s=>s.p));
 x.fillStyle='rgba(196,243,107,.14)';x.fillRect(0,mid-.5,w,1);
 hist.forEach((s,i)=>{
  const X=w-(hist.length-i)*step,a=Math.max(1.5,s.p/peak*(mid-8)),latest=i===hist.length-1;
  x.fillStyle=latest?'#c4f36b':'rgba(196,243,107,.5)';
  x.beginPath();x.roundRect?x.roundRect(X,mid-a,bw,a*2,bw/2):x.rect(X,mid-a,bw,a*2);x.fill();
 });
 if(hist.length>1){
  x.strokeStyle='#75e4d0';x.lineWidth=2;x.lineJoin='round';x.beginPath();
  hist.forEach((s,i)=>{const X=w-(hist.length-i)*step+bw/2,Y=h-6-Math.min(1,s.c)*(h-12);i?x.lineTo(X,Y):x.moveTo(X,Y)});
  x.stroke();
 }
 const l=hist[hist.length-1];
 cv.setAttribute('aria-label',l?`Chart of the last ${Math.round(hist.length*EVERY/60000)} minutes. Now ${l.p} players playing, Lavalink CPU at ${pct(l.c)} percent.`:'Chart of playing players and Lavalink CPU. No data yet.');
}

$('refresh').addEventListener('click',poll);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});
new ResizeObserver(draw).observe($('wave'));
setInterval(()=>sub(),1000);
draw();poll();
})();
