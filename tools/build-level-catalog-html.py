#!/usr/bin/env python3
"""Build a self-contained browser catalog from the researched map CSV."""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs' / 'level-research' / 'catalog.csv'
OUTPUT = ROOT / 'outputs' / 'level-catalog-2026-10-20' / '单人地图素材目录.html'
SHORTLIST = ROOT / 'docs' / 'level-research' / 'launch-100-candidates.csv'
VERIFICATION = ROOT / 'docs' / 'level-research' / 'launch-100-verification.json'
DIFFICULTY = ROOT / 'docs' / 'level-research' / 'launch-100-difficulty.csv'
FUTURE = ROOT / 'docs' / 'level-research' / 'future-100-release.csv'
PK_BANK = ROOT / 'docs' / 'level-research' / 'pk-bank.csv'

with SOURCE.open(encoding='utf-8', newline='') as file:
    records = list(csv.DictReader(file))
with SHORTLIST.open(encoding='utf-8', newline='') as file:
    candidates = {(row['source'], row['source_no']): int(row['candidate_no'])
                  for row in csv.DictReader(file)}
verified = json.loads(VERIFICATION.read_text(encoding='utf-8'))
verified_numbers = {row['candidate_no'] for row in verified['results'] if row['status'] == 'verified'}
assert len(candidates) == 100 and len(verified_numbers) == 100
with DIFFICULTY.open(encoding='utf-8', newline='') as file:
    ratings = {int(row['candidate_no']): row for row in csv.DictReader(file)}
assert set(ratings) == verified_numbers
with FUTURE.open(encoding='utf-8', newline='') as file:
    future = {(row['source'], row['source_no']): row for row in csv.DictReader(file)}
assert len(future) == 100 and {int(row['level_no']) for row in future.values()} == set(range(101, 201))
with PK_BANK.open(encoding='utf-8', newline='') as file:
    pk_bank = {(row['source'], row['source_no']): row for row in csv.DictReader(file)}
assert len(pk_bank) == 120 and {int(row['bank_no']) for row in pk_bank.values()} == set(range(1, 121))

sources = list(dict.fromkeys(row['source'] for row in records))
categories = ['微型解谜', '小型规划', '中型规划', '大型挑战']
urls = list(dict.fromkeys(row['source_url'] for row in records))
data = [
    [sources.index(row['source']), row['source_no'], row['id'], categories.index(row['category']),
     int(row['boxes']), int(row['width']), int(row['height']), int(row['floors']),
     int(row['min_steps']) if row['min_steps'] else None, row['same_as_local'],
     json.loads(row['rows']), urls.index(row['source_url']),
     float(row['small_screen_cell_px']), row['too_small_on_phone'] == '是',
     row['too_many_boxes'] == '是', candidates.get((row['source'], row['source_no']), 0),
     int(ratings[candidates[(row['source'], row['source_no'])]]['estimated_stars'])
     if (row['source'], row['source_no']) in candidates else 0,
     float(ratings[candidates[(row['source'], row['source_no'])]]['proxy_score'])
     if (row['source'], row['source_no']) in candidates else None,
     int(future[(row['source'], row['source_no'])]['level_no'])
     if (row['source'], row['source_no']) in future else 0,
     int(future[(row['source'], row['source_no'])]['estimated_stars'])
     if (row['source'], row['source_no']) in future else 0,
     float(future[(row['source'], row['source_no'])]['proxy_score'])
     if (row['source'], row['source_no']) in future else None,
     int(pk_bank[(row['source'], row['source_no'])]['bank_no'])
     if (row['source'], row['source_no']) in pk_bank else 0,
     pk_bank[(row['source'], row['source_no'])]['tier']
     if (row['source'], row['source_no']) in pk_bank else '',
     int(pk_bank[(row['source'], row['source_no'])]['verified_solution_steps'])
     if (row['source'], row['source_no']) in pk_bank else
     int(future[(row['source'], row['source_no'])]['solution_steps'])
     if (row['source'], row['source_no']) in future else None]
    for row in records
]
payload = json.dumps({'sources': sources, 'categories': categories, 'urls': urls, 'rows': data},
                     ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')

html = r'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>单人地图素材目录 · 6,186 关</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#172a39;background:#f5f8f8}
*{box-sizing:border-box}body{margin:0}button,input,select{font:inherit}button{cursor:pointer}
.shell{max-width:1540px;margin:auto;padding:32px 28px 60px}
header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:25px}
h1{font-size:30px;line-height:1.2;margin:0 0 8px;letter-spacing:-.03em}.sub{margin:0;color:#60717d;font-size:14px}
.badge{font-size:12px;color:#436276;background:#e8f0f3;border-radius:999px;padding:8px 12px;white-space:nowrap}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
.stat{background:#fff;border:1px solid #e0e9e9;border-radius:13px;padding:17px 19px;box-shadow:0 3px 15px #182f3310}
.stat b{display:block;font-size:25px;line-height:1.1;font-variant-numeric:tabular-nums}.stat span{display:block;color:#60717d;font-size:12px;margin-top:7px}
.learning{display:flex;align-items:center;justify-content:space-between;gap:18px;background:#eaf6ee;border:1px solid #c8e4d0;border-radius:13px;padding:14px 18px;margin-bottom:18px}
.learning strong{color:#245c3d}.learning p{margin:6px 0 0;color:#456c56;font-size:13px;line-height:1.6}
.learning a{color:#236847;font-weight:650}
.learning pre{margin:0;flex:none;padding:9px 12px;font-size:12px;line-height:1.15}
.panel{background:#fff;border:1px solid #dbe6e6;border-radius:14px;box-shadow:0 5px 22px #18343e0d;overflow:hidden}
.filters{display:grid;grid-template-columns:minmax(230px,2fr) repeat(6,minmax(125px,1fr)) auto;gap:10px;padding:16px;border-bottom:1px solid #e4ecec;align-items:end}
label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:650;color:#526670}
input,select{height:39px;border:1px solid #ccdada;border-radius:8px;padding:0 11px;background:#fff;color:#172a39;min-width:0;outline:none}
input:focus,select:focus{border-color:#3b8e8b;box-shadow:0 0 0 3px #3b8e8b22}
.reset{height:39px;border:1px solid #ccdada;background:#f9fbfb;border-radius:8px;padding:0 15px;color:#2f5962}
.bar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 17px;color:#5c7179;font-size:13px}
.table-wrap{overflow:auto;max-height:69vh}table{width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap}
thead{position:sticky;top:0;z-index:2;background:#193d4b;color:#fff}th{text-align:left;font-weight:600;padding:13px 11px;cursor:pointer;user-select:none}
th:hover{background:#255567}td{padding:10px 11px;border-top:1px solid #e8eeee;font-variant-numeric:tabular-nums}
tbody tr:nth-child(even){background:#f8fbfb}tbody tr:hover{background:#ecf7f5}td.num{text-align:right}
.tag{display:inline-block;border-radius:5px;padding:3px 7px;font-size:11px;background:#e8eff6;color:#315575}
.tag.micro{background:#e5f4e9;color:#276242}.tag.small{background:#e9f4f5;color:#27666b}.tag.medium{background:#fff2dc;color:#92621d}.tag.large{background:#f9e9e7;color:#9a473b}
.reason{color:#a34635;font-weight:650}.pass{color:#31705a;font-weight:650}
.link{border:0;background:none;color:#126b70;padding:0;font-weight:650;text-decoration:underline;text-underline-offset:3px}
.muted{color:#9aa8ab}.pager{display:flex;align-items:center;justify-content:flex-end;gap:7px;padding:13px 17px;border-top:1px solid #e4ecec;font-size:13px}
.pager button{border:1px solid #ccdada;background:#fff;border-radius:7px;padding:6px 10px;color:#355d65}.pager button:disabled{opacity:.4;cursor:default}
.foot{font-size:12px;line-height:1.7;color:#71828a;margin:15px 2px 0}
dialog{border:0;border-radius:16px;padding:0;box-shadow:0 24px 80px #0b27344d;max-width:calc(100vw - 32px);width:560px;color:#17303a}
dialog::backdrop{background:#102b38a8}.modal-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #e3ecec}
.modal-head h2{margin:0;font-size:18px}.close{border:0;background:#eff4f4;border-radius:8px;width:32px;height:32px;font-size:20px;color:#48626b}
.meta{padding:15px 20px;display:flex;flex-wrap:wrap;gap:8px;font-size:12px;color:#536873}.meta span{padding:5px 8px;background:#f0f5f5;border-radius:5px}
pre{margin:0 20px 18px;padding:18px;background:#17303b;color:#f2faf8;border-radius:10px;overflow:auto;font:17px/1.15 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.05em}
.source-link{display:block;margin:0 20px 21px;color:#126b70;font-size:13px;word-break:break-all}
@media(max-width:900px){.shell{padding:22px 12px 40px}.stats{grid-template-columns:repeat(2,1fr)}.filters{grid-template-columns:repeat(2,1fr)}.filters label:first-child{grid-column:1/-1}header{align-items:start;flex-direction:column}h1{font-size:25px}}
@media(max-width:540px){.stats{gap:8px}.stat{padding:12px}.stat b{font-size:21px}.filters{gap:9px;padding:12px}td,th{padding:9px 8px}.table-wrap{max-height:65vh}}
@media(max-width:700px){.learning{align-items:flex-start;flex-direction:column}}
</style>
</head>
<body>
<main class="shell">
<header><div><h1>单人地图素材目录</h1><p class="sub">本地经典与外部地图集，按结构筛选并查看原始棋盘</p></div><span class="badge">离线可用 · 单文件</span></header>
<section class="stats" aria-label="总体统计">
<div class="stat"><b id="allCount">6,186</b><span>地图记录</span></div>
<div class="stat"><b id="passCount">5,768</b><span>尺寸与箱数初筛通过</span></div>
<div class="stat"><b id="visibleCount">6,186</b><span>当前筛选结果</span></div>
<div class="stat"><b id="excludeCount">418</b><span>建议暂不进主线</span></div>
</section>
<section class="learning"><div><strong>首发、后续与双人 PK 地图已分开</strong><p>首发 100 关已保留；后续批次另选 100 张。双人 PK 另有 120 张独立题库。使用“批次”筛选可逐张看图。<a href="../../docs/level-research/future-100-levels.json">后续关卡 JSON</a> · <a href="../../docs/level-research/pk-bank.json">PK 题库 JSON</a>。旧首轮备选池仅作研究记录。</p></div><pre>########
#@  $ .#
########</pre></section>
<section class="panel">
<div class="filters">
<label>搜索来源、编号或关卡 ID<input id="query" type="search" placeholder="例如 Microban、selfboot-18"></label>
<label>地图来源<select id="source"><option value="">全部来源</option></select></label>
<label>结构分类<select id="category"><option value="">全部分类</option></select></label>
<label>箱子数量<select id="boxes"><option value="">不限箱数</option></select></label>
<label>手机主线初筛<select id="screening"><option value="">全部结果</option><option value="pass">初筛通过</option><option value="small">整图过小</option><option value="boxes">箱子过多</option><option value="both">两项都触发</option></select></label>
<label>批次<select id="launch"><option value="">全部地图</option><option value="future">后续上线 100 关</option><option value="pk">双人 PK 题库 120 张</option><option value="old">旧首轮备选池</option></select></label>
<label>预估难度<select id="rating"><option value="">全部星级</option><option value="1">1 星</option><option value="2">2 星</option><option value="3">3 星</option><option value="4">4 星</option><option value="5">5 星</option></select></label>
<button class="reset" id="reset">清除筛选</button>
</div>
<div class="bar"><span id="resultLabel"></span><span>点击列标题排序 · 点击编号看地图</span></div>
<div class="table-wrap"><table><thead><tr>
<th data-sort="index">序号</th><th data-sort="source">来源</th><th data-sort="number">来源编号</th><th data-sort="id">本地 ID</th>
<th data-sort="category">结构分类</th><th data-sort="boxes">箱子数</th><th data-sort="width">宽</th><th data-sort="height">高</th>
<th data-sort="size">尺寸</th><th data-sort="cell">小屏单格</th><th data-sort="small">整图过小</th><th data-sort="many">箱子过多</th><th data-sort="screening">主线初筛</th><th data-sort="future">后续关号</th><th data-sort="pk">PK 题号</th><th data-sort="launch">旧候选号</th><th data-sort="floors">可行走格</th><th data-sort="steps">最少步数</th><th data-sort="solution">可行解步数</th><th data-sort="duplicate">与本地重复</th><th data-sort="rating">预估难度</th>
</tr></thead><tbody id="rows"></tbody></table></div>
<div class="pager"><span id="pageLabel"></span><button id="prev">上一页</button><button id="next">下一页</button></div>
</section>
<p class="foot">PK 题库 120 张已接入建房抽题；“短局/常规/进阶”各 40 张，按一条已验证解的操作量分组，仍需双人实测。后续关号 101～200 是预排顺序，尚未加入游戏运行关卡。两批外部地图均通过求解和引擎回放，且不与首发原始地图重复。可行解步数不保证最少；预估难度尚未试玩校准。手机初筛按本项目 320×568 小屏棋盘计算：全图单格低于 16 屏幕像素标“整图过小”，超过 8 箱标“箱子过多”。</p>
</main>
<dialog id="mapDialog"><div class="modal-head"><h2 id="mapTitle"></h2><button class="close" id="close" aria-label="关闭">×</button></div><div class="meta" id="mapMeta"></div><pre id="mapBoard"></pre><a id="mapSource" class="source-link" target="_blank" rel="noopener noreferrer">查看地图来源</a></dialog>
<script id="catalog-data" type="application/json">__DATA__</script>
<script>
const catalog=JSON.parse(document.getElementById('catalog-data').textContent);
const {sources,categories,urls,rows}=catalog;
const $=id=>document.getElementById(id);
const controls={query:$('query'),source:$('source'),category:$('category'),boxes:$('boxes'),screening:$('screening'),launch:$('launch'),rating:$('rating')};
sources.forEach((name,i)=>controls.source.add(new Option(name,String(i))));
categories.forEach((name,i)=>controls.category.add(new Option(name,String(i))));
const boxCounts=[...new Set(rows.map(r=>r[4]))].sort((a,b)=>a-b);
boxCounts.forEach(count=>controls.boxes.add(new Option(`${count} 箱`,String(count))));
let filtered=rows.map((_,i)=>i),page=0,sortKey='index',ascending=true;
const pageSize=50,fmt=n=>Number(n).toLocaleString('zh-CN');
function reason(r){return r[13]&&r[14]?'两项都触发':r[13]?'整图过小':r[14]?'箱子过多':'初筛通过'}
function value(r,index,key){switch(key){case'index':return index+1;case'source':return sources[r[0]];case'number':return Number(r[1].split('-').at(-1));case'id':return r[2];case'category':return categories[r[3]];case'boxes':return r[4];case'width':return r[5];case'height':return r[6];case'size':return r[5]*r[6];case'cell':return r[12];case'small':return Number(r[13]);case'many':return Number(r[14]);case'screening':return reason(r);case'launch':return r[15]||9999;case'future':return r[18]||9999;case'pk':return r[21]||9999;case'floors':return r[7];case'steps':return r[8]??-1;case'solution':return r[23]??-1;case'duplicate':return r[9];case'rating':return r[19]||r[16]||0;default:return index}}
function update(){
 const q=controls.query.value.trim().toLowerCase(),s=controls.source.value,c=controls.category.value,b=controls.boxes.value,f=controls.screening.value,l=controls.launch.value,d=controls.rating.value;
 filtered=rows.map((_,i)=>i).filter(i=>{const r=rows[i];return (!s||r[0]===Number(s))&&(!c||r[3]===Number(c))&&(!b||r[4]===Number(b))&&(!l||(l==='future'&&r[18]>0)||(l==='pk'&&r[21]>0)||(l==='old'&&r[15]>0))&&(!d||(l==='future'?r[19]:l==='old'?r[16]:r[19]||r[16])===Number(d))&&(!f||(f==='pass'&&!r[13]&&!r[14])||(f==='small'&&r[13])||(f==='boxes'&&r[14])||(f==='both'&&r[13]&&r[14]))&&(!q||`${sources[r[0]]} ${r[1]} ${r[2]} ${r[9]}`.toLowerCase().includes(q))});
 filtered.sort((a,b)=>{const va=value(rows[a],a,sortKey),vb=value(rows[b],b,sortKey);const result=typeof va==='number'&&typeof vb==='number'?va-vb:String(va).localeCompare(String(vb),'zh-CN');return ascending?result: -result});
 page=0;render();
}
function cell(text,cls=''){const td=document.createElement('td');td.textContent=text??'—';if(cls)td.className=cls;return td}
function render(){
 const start=page*pageSize,end=Math.min(start+pageSize,filtered.length),body=$('rows');body.replaceChildren();
 const frag=document.createDocumentFragment();
 for(const i of filtered.slice(start,end)){
  const r=rows[i],tr=document.createElement('tr'),open=cell('', '');
  const button=document.createElement('button');button.className='link';button.textContent=fmt(i+1);button.onclick=()=>showMap(i);open.append(button);tr.append(open);
  tr.append(cell(sources[r[0]]),cell(r[1]),cell(r[2]||'—'));
  const tag=cell(categories[r[3]]);tag.className=`tag ${['micro','small','medium','large'][r[3]]}`;tr.append(tag);
  tr.append(cell(r[4],'num'),cell(r[5],'num'),cell(r[6],'num'),cell(`${r[5]}×${r[6]}`),cell(`${r[12].toFixed(1)} px`,'num'),cell(r[13]?'是':'否',r[13]?'reason':''),cell(r[14]?'是':'否',r[14]?'reason':''),cell(reason(r),r[13]||r[14]?'reason':'pass'),cell(r[18]?`第 ${r[18]} 关 · 已验证`:'—',r[18]?'pass':'muted'),cell(r[21]?`PK ${r[21]} · ${r[22]}`:'—',r[21]?'pass':'muted'),cell(r[15]?`#${r[15]}`:'—',r[15]?'':'muted'),cell(r[7],'num'),cell(r[8]??'—','num'),cell(r[23]??'—','num'),cell(r[9]||'—'),cell(r[19]||r[16]?`${'★'.repeat(r[19]||r[16])} · 预估`:'—',r[19]||r[16]?'':'muted'));
  frag.append(tr);
 }
 body.append(frag);$('visibleCount').textContent=fmt(filtered.length);$('resultLabel').textContent=`显示 ${filtered.length?fmt(start+1):0}–${fmt(end)} / ${fmt(filtered.length)} 条`;
 $('pageLabel').textContent=`第 ${page+1} / ${Math.max(1,Math.ceil(filtered.length/pageSize))} 页`;
 $('prev').disabled=page===0;$('next').disabled=end>=filtered.length;
}
function showMap(i){
 const r=rows[i],source=sources[r[0]];$('mapTitle').textContent=`${source} · 第 ${r[1]} 关`;
 const meta=[`${r[4]} 个箱子`,`${r[5]}×${r[6]}`,`${r[12].toFixed(1)} px/格（小屏）`,reason(r),`${r[7]} 个可行走格`,categories[r[3]]];
 if(r[18])meta.push(`后续第 ${r[18]} 关 · 已验证`);if(r[19])meta.push(`后续预估难度 ${r[19]} 星 · 复杂度分 ${r[20]}`);if(r[21])meta.push(`PK 第 ${r[21]} 题 · ${r[22]}`);if(r[23])meta.push(`已验证可行解 ${r[23]} 步`);if(r[15])meta.push(`旧备选 #${r[15]}`);if(r[8]!==null)meta.push(`最少 ${r[8]} 步`);if(r[9])meta.push(`与 ${r[9]} 相同`);
 $('mapMeta').replaceChildren(...meta.map(t=>{const s=document.createElement('span');s.textContent=t;return s}));
 $('mapBoard').textContent=r[10].map(line=>line.replaceAll('_',' ')).join('\n');
 $('mapSource').href=source==='本地经典'?'../../docs/levels-original.json':urls[r[11]];
 $('mapDialog').showModal();
}
Object.values(controls).forEach(control=>control.addEventListener(control===controls.query?'input':'change',()=>{if(control===controls.launch){sortKey=control.value==='future'?'future':control.value==='pk'?'pk':'index';ascending=true;controls.rating.disabled=control.value==='pk';if(control.value==='pk')controls.rating.value=''}update()}));
$('reset').onclick=()=>{Object.values(controls).forEach(c=>c.value='');sortKey='index';ascending=true;update()};
$('prev').onclick=()=>{page--;render()};$('next').onclick=()=>{page++;render()};$('close').onclick=()=>$('mapDialog').close();
document.querySelectorAll('th[data-sort]').forEach(th=>th.onclick=()=>{const key=th.dataset.sort;ascending=sortKey===key?!ascending:true;sortKey=key;update()});
render();
</script>
</body></html>'''

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(html.replace('__DATA__', payload), encoding='utf-8')
print(f'{OUTPUT}: {len(records)} maps, {OUTPUT.stat().st_size:,} bytes')
