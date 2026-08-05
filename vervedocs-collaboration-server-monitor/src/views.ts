export function renderLogin(error?: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VerveDocs - 登录</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b}
.login-wrapper{width:100%;max-width:420px;padding:20px}
.login-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:48px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.login-logo{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.login-logo svg{width:32px;height:32px}
.login-logo h1{font-size:22px;font-weight:600;letter-spacing:-0.5px}
.login-desc{color:#64748b;font-size:13px;margin-bottom:36px;line-height:1.5}
.form-group{margin-bottom:20px}
.form-group label{display:block;font-size:13px;color:#475569;margin-bottom:8px;font-weight:500}
.form-group input{width:100%;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;color:#1e293b;font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s}
.form-group input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.12)}
.form-group input::placeholder{color:#94a3b8}
.btn-login{width:100%;padding:13px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s,transform 0.1s;letter-spacing:0.3px}
.btn-login:hover{opacity:0.9}
.btn-login:active{transform:scale(0.98)}
.btn-login:disabled{opacity:0.5;cursor:not-allowed;transform:none}
.error-msg{color:#ef4444;font-size:13px;margin-top:16px;display:${error ? 'block' : 'none'};padding:10px 14px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca}
.login-footer{margin-top:32px;text-align:center;color:#94a3b8;font-size:12px}
</style>
</head>
<body>
<div class="login-wrapper">
<div class="login-card">
<div class="login-logo">
<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="6" fill="url(#g1)"/><path d="M10 10h5v5h-5zM17 10h5v5h-5zM10 17h5v5h-5zM17 17h2v5h-2z" fill="#fff" opacity="0.9"/><defs><linearGradient id="g1" x1="2" y1="2" x2="30" y2="30"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs></svg>
<h1>VerveDocs</h1>
</div>
<p class="login-desc">协同服务监控面板</p>
<form id="login-form">
<div class="form-group">
<label>用户名</label>
<input type="text" id="username" placeholder="请输入用户名" autocomplete="username" required autofocus>
</div>
<div class="form-group">
<label>密码</label>
<input type="password" id="password" placeholder="请输入密码" autocomplete="current-password" required>
</div>
<button type="submit" class="btn-login">登 录</button>
<div class="error-msg" id="error">${error || ''}</div>
</form>
<div class="login-footer">VerveDocs Monitor Server</div>
</div>
</div>
<script>
document.getElementById('login-form').addEventListener('submit',async e=>{
e.preventDefault();
const btn=e.target.querySelector('button');
const errEl=document.getElementById('error');
btn.disabled=true;
errEl.style.display='none';
try{
const res=await fetch('/dashboard/api/login',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({username:document.getElementById('username').value,password:document.getElementById('password').value})
});
if(res.ok){window.location.href='/dashboard';return}
const data=await res.json();
errEl.textContent=data.error||'登录失败';
errEl.style.display='block';
}catch(_){errEl.textContent='网络错误，请重试';errEl.style.display='block'}
finally{btn.disabled=false}
});
</script>
</body>
</html>`
}

export function renderDashboard(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VerveDocs 协同服务监控</title>
<script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#fff;--surface:#fff;--border:#e2e8f0;--border-hover:#cbd5e1;--primary:#6366f1;--primary-bg:rgba(99,102,241,0.08);--text:#1e293b;--text2:#475569;--text3:#94a3b8;--success:#22c55e;--success-bg:rgba(34,197,94,0.08);--warning:#f59e0b;--warning-bg:rgba(245,158,11,0.08);--error:#ef4444;--error-bg:rgba(239,68,68,0.08);--info:#3b82f6;--info-bg:rgba(59,130,246,0.08);--radius:12px;--radius-sm:8px}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;min-height:100vh}
header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.9);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
.header-left{display:flex;align-items:center;gap:12px}
.header-left h1{font-size:15px;font-weight:600;letter-spacing:-0.3px}
.status-dot{width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 6px rgba(34,197,94,0.4);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.status-text{font-size:12px;color:var(--success);font-weight:500}
.header-right{display:flex;align-items:center;gap:16px}
.refresh-info{font-size:12px;color:var(--text3)}
.btn-logout{padding:6px 16px;background:transparent;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text2);font-size:12px;cursor:pointer;transition:all 0.2s}
.btn-logout:hover{border-color:var(--error);color:var(--error);background:var(--error-bg)}
main{max-width:95%;margin:0 auto;padding:24px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px 24px;transition:border-color 0.2s,transform 0.2s,box-shadow 0.2s;position:relative;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);display:flex;align-items:center;gap:16px}
.stat-card:hover{border-color:var(--border-hover);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08)}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--primary),transparent);opacity:0;transition:opacity 0.2s}
.stat-card:hover::before{opacity:1}
.stat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.stat-icon.ic-conn{background:var(--info-bg);color:var(--info)}
.stat-icon.ic-active{background:var(--success-bg);color:var(--success)}
.stat-icon.ic-total{background:var(--warning-bg);color:var(--warning)}
.stat-icon.ic-db{background:var(--primary-bg);color:var(--primary)}
.stat-info{display:flex;flex-direction:column;gap:2px;min-width:0}
.stat-value{font-size:24px;font-weight:700;letter-spacing:-0.5px;font-variant-numeric:tabular-nums;line-height:1.2}
.stat-label{font-size:13px;color:var(--text3);font-weight:500;line-height:1.4}
.section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.section-header{padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.section-header h2{font-size:15px;font-weight:600}
.badge{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600}
.badge-info{background:var(--info-bg);color:var(--info)}
.badge-success{background:var(--success-bg);color:var(--success)}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
thead{background:#f8fafc}
th{padding:12px 24px;text-align:left;font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap}
td{padding:12px 24px;font-size:13px;border-top:1px solid var(--border);white-space:nowrap;color:var(--text2)}
tbody tr{transition:background 0.15s}
tbody tr:hover{background:#f8fafc}
.empty-state{padding:40px 24px;text-align:center;color:var(--text3);font-size:13px}
.color-dot{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;margin-right:8px}
.doc-type{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600}
.doc-type-word{background:var(--info-bg);color:var(--info)}
.doc-type-excel{background:var(--success-bg);color:var(--success)}
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0}
.info-item{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.info-label{font-size:13px;color:var(--text3)}
.info-value{font-size:13px;font-weight:500;font-variant-numeric:tabular-nums}
.mongo-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
.mongo-section{padding:20px 24px}
.mongo-section:first-child{border-right:1px solid var(--border)}
.mongo-section h3{font-size:13px;color:var(--text3);margin-bottom:16px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.mongo-stat{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9}
.mongo-stat:last-child{border-bottom:none}
.mongo-stat-label{font-size:13px;color:var(--text2)}
.mongo-stat-value{font-size:13px;font-weight:500;font-variant-numeric:tabular-nums}
.chart-wrap{padding:20px 24px}
.chart-wrap canvas{max-height:240px}

.info-trend{padding:20px 24px;border-bottom:1px solid var(--border)}
.info-trend h3{font-size:13px;color:var(--text3);margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.trend-range{font-size:11px;font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0}
.chart-wrap-trend{position:relative;max-height:160px}
.chart-wrap-trend canvas{max-height:160px}
.master-tag{display:inline-block;padding:1px 6px;margin-left:8px;border-radius:4px;font-size:10px;font-weight:700;background:var(--primary-bg);color:var(--primary)}

.info-value-mono{font-family:'SF Mono',Monaco,'Cascadia Code',monospace;font-size:12px;word-break:break-all}
.tabs{display:flex;gap:0;border-bottom:1px solid var(--border);padding:0 24px}
.tab{padding:12px 20px;font-size:14px;font-weight:500;color:var(--text3);cursor:pointer;border-bottom:2px solid transparent;transition:color 0.2s,border-color 0.2s;user-select:none}
.tab:hover{color:var(--text)}
.tab.active{color:var(--primary);border-bottom-color:var(--primary)}
.tab-badge{margin-left:6px;font-size:11px;padding:1px 7px;border-radius:10px;font-weight:600}
.tab-badge-info{background:var(--info-bg);color:var(--info)}
.tab-badge-success{background:var(--success-bg);color:var(--success)}
.tab-panel{display:none}
.tab-panel.active{display:block}
@media(max-width:768px){
main{padding:16px}
.stats-grid{grid-template-columns:1fr 1fr;gap:12px}
.stat-card{padding:16px 20px}
.mongo-grid{grid-template-columns:1fr}
.mongo-section:first-child{border-right:none;border-bottom:1px solid var(--border)}

th,td{padding:10px 14px}
}
@media(max-width:480px){
.stats-grid{grid-template-columns:1fr}
header{padding:0 16px}
}
</style>
</head>
<body x-data="dashboard()" x-init="init()">
<header>
<div class="header-left">
<svg width="24" height="24" viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="6" fill="url(#hg)"/><path d="M10 10h5v5h-5zM17 10h5v5h-5zM10 17h5v5h-5zM17 17h2v5h-2z" fill="#fff" opacity="0.9"/><defs><linearGradient id="hg" x1="2" y1="2" x2="30" y2="30"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs></svg>
<h1>VerveDocs协同服务监控面板</h1>
<span class="status-dot"></span>
<span class="status-text">实时</span>
</div>
<div class="header-right">
<span class="refresh-info">每 5 秒自动刷新</span>
<button class="btn-logout" @click="logout()">退出登录</button>
</div>
</header>
<main>
<div class="stats-grid">
<div class="stat-card">
<div class="stat-icon ic-conn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
<div class="stat-info"><div class="stat-value" x-text="connCount">-</div><div class="stat-label">活跃连接</div></div>
</div>
<div class="stat-card">
<div class="stat-icon ic-active"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
<div class="stat-info"><div class="stat-value" x-text="activeDocs">-</div><div class="stat-label">编辑中文档</div></div>
</div>
<div class="stat-card">
<div class="stat-icon ic-total"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
<div class="stat-info"><div class="stat-value" x-text="totalDocs">-</div><div class="stat-label">文档总数</div></div>
</div>
<div class="stat-card">
<div class="stat-icon ic-db"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div>
<div class="stat-info"><div class="stat-value" x-text="dbSize">-</div><div class="stat-label">数据库大小</div></div>
</div>
</div>

<div class="section">
<div class="tabs">
<div class="tab" :class="activeTab==='info'?'active':''" @click="activeTab='info';$nextTick(()=>updateConnTrend())">系统信息</div>
<div class="tab" :class="activeTab==='connections'?'active':''" @click="activeTab='connections'">活跃连接<span class="tab-badge tab-badge-info" x-text="connCount">0</span></div>
<div class="tab" :class="activeTab==='documents'?'active':''" @click="activeTab='documents'">文档列表<span class="tab-badge tab-badge-success" x-text="totalDocs">0</span></div>
</div>
<div class="tab-panel" :class="activeTab==='info'?'active':''">
<template x-if="clusterInstances.length>0">
<div class="table-wrap" style="border-bottom:1px solid var(--border)">
<table>
<thead><tr><th>实例 ID</th><th>主机</th><th>PID</th><th>端口</th><th>连接数</th><th>启动时间</th><th>Node</th></tr></thead>
<tbody>
<template x-for="inst in clusterInstances" :key="inst.instanceId">
<tr>
<td><span class="info-value-mono" x-text="inst.instanceId"></span><template x-if="inst.isMaster"><span class="master-tag"> 主节点</span></template></td>
<td x-text="inst.hostname"></td>
<td x-text="inst.pid"></td>
<td x-text="inst.port"></td>
<td x-text="inst.connections??0"></td>
<td x-text="fmtDate(inst.startTime)"></td>
<td x-text="inst.nodeVersion"></td>
</tr>
</template>
</tbody>
</table>
</div>
</template>

<div class="info-trend">
<h3>连接数趋势 <span class="trend-range">(最近 10 分钟)</span></h3>
<div class="chart-wrap-trend"><canvas id="connTrendChart"></canvas></div>
</div>
<div class="mongo-grid">
<div class="mongo-section">
<h3>数据库统计</h3>
<template x-for="s in dbStatsList" :key="s[0]">
<div class="mongo-stat"><span class="mongo-stat-label" x-text="s[0]"></span><span class="mongo-stat-value" x-text="s[1]"></span></div>
</template>
</div>
<div class="mongo-section">
<h3>集合统计</h3>
<template x-for="s in collStatsList" :key="s[0]">
<div class="mongo-stat"><span class="mongo-stat-label" x-text="s[0]"></span><span class="mongo-stat-value" x-text="s[1]"></span></div>
</template>
</div>
</div>
<div class="info-grid" style="border-top:1px solid var(--border)">
<div class="info-item"><span class="info-label">运行时间</span><span class="info-value" x-text="svUptime">-</span></div>
<div class="info-item"><span class="info-label">启动时间</span><span class="info-value" x-text="svStart">-</span></div>
<div class="info-item"><span class="info-label">Node.js 版本</span><span class="info-value" x-text="svNode">-</span></div>
<div class="info-item"><span class="info-label">MongoDB 版本</span><span class="info-value" x-text="svMongo">-</span></div>
<div class="info-item"><span class="info-label">数据库名称</span><span class="info-value" x-text="svDbName">-</span></div>
<div class="info-item"><span class="info-label">集合名称</span><span class="info-value" x-text="svCollName">-</span></div>
</div>

</div>
<div class="tab-panel" :class="activeTab==='connections'?'active':''">
<div class="table-wrap">
<table>
<thead><tr><th>用户</th><th>用户ID</th><th>文档</th><th>文档类型</th></tr></thead>
<tbody>
<template x-if="connList.length===0">
<tr><td colspan="4" class="empty-state">暂无活跃连接</td></tr>
</template>
<template x-for="c in connList" :key="c.userId+c.documentName">
<tr>
<td><span class="color-dot" :style="'background:'+c.color"></span><span x-text="c.userName"></span></td>
<td x-text="c.userId"></td>
<td x-text="c.docName"></td>
<td><span class="doc-type" :class="c.docType==='excel'?'doc-type-excel':'doc-type-word'" x-text="c.docLabel"></span></td>
</tr>
</template>
</tbody>
</table>
</div>
</div>
<div class="tab-panel" :class="activeTab==='documents'?'active':''">
<div class="table-wrap">
<table>
<thead><tr><th>文档ID</th><th>类型</th><th>文档大小</th><th>更新时间</th></tr></thead>
<tbody>
<template x-if="docList.length===0">
<tr><td colspan="4" class="empty-state">暂无文档</td></tr>
</template>
<template x-for="d in docList" :key="d.documentId">
<tr>
<td x-text="d.documentId"></td>
<td><span class="doc-type" :class="d.docType==='excel'?'doc-type-excel':'doc-type-word'" x-text="d.docLabel"></span></td>
<td x-text="fmtBytes(d.docSize)"></td>
<td x-text="fmtDate(d.updatedAt)"></td>
</tr>
</template>
</tbody>
</table>
</div>
</div>

</div>


</main>
<script>
const _charts={connTrend:null};
function dashboard(){
return {
activeTab:'info',
connCount:'-',activeDocs:'-',totalDocs:'-',dbSize:'-',
connList:[],docList:[],
dbStatsList:[],collStatsList:[],
svUptime:'-',svStart:'-',svNode:'-',svMongo:'-',svDbName:'-',svCollName:'-',

clusterInstances:[],
connHistory:[],
fmtBytes(b){if(!b||b===0)return '0 B';const k=1024,s=['B','KB','MB','GB','TB'],i=Math.floor(Math.log(b)/Math.log(k));return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i]},
fmtTime(ms){const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sec=s%60;let r='';if(d>0)r+=d+'天 ';if(h>0)r+=h+'时 ';if(m>0)r+=m+'分 ';r+=sec+'秒';return r},
fmtDate(d){if(!d)return '-';const dt=new Date(d),pad=n=>String(n).padStart(2,'0');return dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate())+' '+pad(dt.getHours())+':'+pad(dt.getMinutes())+':'+pad(dt.getSeconds())},
fmtDocType(t){return t==='excel'?'电子表格':t==='word'?'电子文档':'-'},
parseDocName(n){return n.startsWith('excel:')?n.slice(6):n},
async fetchStats(){
try{
const res=await fetch('/dashboard/api/stats');
if(res.status===401){window.location.href='/dashboard/login';return}
if(!res.ok)return;
const d=await res.json();
this.connCount=d.connections.total;
this.activeDocs=d.documents.active;
this.totalDocs=d.mongo?.collStats?.count??'-';
this.dbSize=d.mongo?.dbStats?this.fmtBytes(d.mongo.dbStats.dataSize):'-';
this.connList=d.connections.list.map(c=>({...c,docName:this.parseDocName(c.documentName),docLabel:this.fmtDocType(c.docType)}));
this.connHistory=d.connHistory||[];
this.docList=(d.documentList||[]).map(doc=>({...doc,docLabel:this.fmtDocType(doc.docType)}));
if(d.mongo?.dbStats){const s=d.mongo.dbStats;this.dbStatsList=[['数据大小',this.fmtBytes(s.dataSize)],['存储大小',this.fmtBytes(s.storageSize)],['索引大小',this.fmtBytes(s.indexSize||0)],['集合数',s.collections||0],['视图数',s.views||0]]}
if(d.mongo?.collStats){const s=d.mongo.collStats;this.collStatsList=[['文档数量',s.count],['集合大小',this.fmtBytes(s.size||0)],['平均文档大小',this.fmtBytes(s.avgObjSize||0)],['存储大小',this.fmtBytes(s.storageSize||0)],['索引数量',s.nindexes||0],['索引大小',this.fmtBytes(s.totalIndexSize||0)]]}
if(d.server){this.svUptime=this.fmtTime(d.server.uptime);this.svStart=this.fmtDate(d.server.startTime);this.svNode=d.server.nodeVersion;this.svMongo=d.mongo?.version||'-';this.svDbName=d.mongo?.database||'-';this.svCollName=d.mongo?.collection||'-'}
if(d.cluster){this.clusterInstances=d.cluster.instances||[]}

this.updateConnTrend();
}catch(e){console.error('fetchStats error:',e)}
},

updateConnTrend(){
const canvas=document.getElementById('connTrendChart');
if(!canvas||!this.connHistory.length)return;
const labels=this.connHistory.map(h=>{const d=new Date(h.t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0')});
const data=this.connHistory.map(h=>h.c);
if(_charts.connTrend){_charts.connTrend.data.labels=labels;_charts.connTrend.data.datasets[0].data=data;if(this.activeTab==='info'){_charts.connTrend.resize()}_charts.connTrend.update();return}
if(this.activeTab!=='info')return;
_charts.connTrend=new Chart(canvas,{type:'line',data:{labels,datasets:[{label:'连接数',data,borderColor:'rgba(99,102,241,0.9)',backgroundColor:'rgba(99,102,241,0.1)',fill:true,tension:0.3,pointRadius:0,pointHoverRadius:4,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,precision:0},grid:{color:'#f1f5f9'}},x:{grid:{display:false},ticks:{maxTicksLimit:12,font:{size:10}}}}}})
},
async logout(){try{await fetch('/dashboard/api/logout',{method:'POST'})}catch(_){}window.location.href='/dashboard/login'},
init(){this.fetchStats();setInterval(()=>this.fetchStats(),5000)}
}
}
</script>
</body>
</html>`
}