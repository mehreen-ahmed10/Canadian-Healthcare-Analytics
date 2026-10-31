const $=id=>document.getElementById(id);let charts={};let yearly=[],provinces=[],genders=[],ages=[];
const palette=["#3979e8","#48b8a7","#9476df","#eda451","#6a9bc9","#d77b9b","#87b58e","#b6a0d7","#e2bf70","#72aebd"];
const fmt=v=>Number(v||0).toLocaleString("en-CA",{maximumFractionDigits:2});
async function api(url){const r=await fetch(url);if(!r.ok){let t=await r.text();throw Error(`${r.status}: ${t}`)}return r.json()}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2500)}
function chart(id,type,labels,data,options={}){if(charts[id])charts[id].destroy();charts[id]=new Chart($(id),{type,data:{labels,datasets:[{data,label:options.label||"",backgroundColor:options.colors||palette[0],borderColor:options.border||palette[0],borderWidth:type==="line"?2:0,fill:type==="line",tension:.35,pointRadius:type==="line"?2:0,borderRadius:type==="bar"?5:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:options.legend||false,position:"bottom",labels:{usePointStyle:true,boxWidth:7,font:{size:9}}}},scales:options.noAxes?{}:{x:{grid:{display:false},ticks:{font:{size:9},color:"#8c98a9"}},y:{grid:{color:"#eff2f6"},ticks:{font:{size:9},color:"#8c98a9",maxTicksLimit:5}}}}})}
async function load(){try{
 const [s,y,p]=await Promise.all([api("/api/dashboard/summary"),api("/api/dashboard/yearly"),api("/api/dashboard/provinces")]);
 yearly=y;provinces=p;$("regions").textContent=fmt(s.regions);$("years").textContent=fmt(Number(s.last_year)-Number(s.first_year)+1);$("records").textContent=fmt(s.fact_records);
 const yearOptions=[...new Set(yearly.map(x=>x.year))];$("yearFilter").innerHTML=yearOptions.map(x=>`<option value="${x}" ${x===2022?"selected":""}>${x}</option>`).join("");
 $("regionFilter").innerHTML='<option value="all">All provinces & territories</option>'+provinces.map(x=>`<option value="${x.geography_name}">${x.geography_name}</option>`).join("");
 drawYear();drawProvince();await drawSegment();
 }catch(e){console.error(e);["trendEmpty","provinceEmpty","genderEmpty","ageEmpty"].forEach(id=>$(id).textContent="Data unavailable — check database/API connection");toast("Could not load data. See browser console and API response.")}}
function drawYear(){const y=$("yearFilter").value;let rows=yearly;if(y!=="all")rows=yearly.filter(x=>String(x.year)===y);chart("trendChart","line",rows.map(x=>x.year),rows.map(x=>+x.total_expenditure),{label:"Total expenditure",colors:"rgba(57,121,232,.14)",border:"#3979e8"});$("trendEmpty").style.display=rows.length?"none":"grid"}
function drawProvince(){let rows=provinces;if($("regionFilter").value!=="all")rows=rows.filter(x=>x.geography_name===$("regionFilter").value);rows=[...rows].sort((a,b)=>+b.total_expenditure-+a.total_expenditure);chart("provinceChart","bar",rows.map(x=>x.geography_name),rows.map(x=>+x.total_expenditure),{colors:palette});$("provinceEmpty").style.display=rows.length?"none":"grid";$("provinceTable").innerHTML=rows.map(x=>`<tr><td>${x.geography_name}</td><td><span class="pill">${x.geography_type}</span></td><td>${fmt(x.total_expenditure)}</td><td>${fmt(x.avg_per_capita)}</td></tr>`).join("");$("regionCount").textContent=`${rows.length} regions`}
async function drawSegment(){let year=$("yearFilter").value||2022;const [g,a]=await Promise.all([api(`/api/dashboard/gender?year=${year}`),api(`/api/dashboard/age?year=${year}`)]);genders=g;ages=a;
 chart("genderChart","doughnut",g.map(x=>x.gender_category.replace("Expenditure per year, ","")),g.map(x=>+x.total_expenditure),{colors:["#3979e8","#48b8a7"],noAxes:true,legend:true});
 $("genderEmpty").style.display=g.length?"none":"grid";
 chart("ageChart","pie",a.map(x=>x.age_group),a.map(x=>+x.total_expenditure),{colors:palette,noAxes:true,legend:true});
 $("ageEmpty").style.display=a.length?"none":"grid";
 $("genderLegend").innerHTML=g.map((x,i)=>`<span><i style="background:${["#3979e8","#48b8a7"][i]}"></i>${x.gender_category.replace("Expenditure per year, ","")}</span>`).join("");
}
$("yearFilter").addEventListener("change",()=>{drawYear();drawSegment().catch(e=>{console.error(e);toast("Could not update segment charts")})});
$("regionFilter").addEventListener("change",drawProvince);
$("reset").addEventListener("click",()=>{$("yearFilter").value="2022";$("regionFilter").value="all";drawYear();drawProvince();drawSegment()});
$("refresh").addEventListener("click",()=>load().then(()=>toast("Dashboard refreshed")));
$("export").addEventListener("click",()=>{let rows=[["Region","Type","Total expenditure","Average per capita"],...provinces.map(x=>[x.geography_name,x.geography_type,x.total_expenditure,x.avg_per_capita])];let csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="healthcare_regional_expenditure.csv";a.click();URL.revokeObjectURL(a.href)});
$("openMenu").addEventListener("click",()=>$("sidebar").classList.add("open"));$("closeMenu").addEventListener("click",()=>$("sidebar").classList.remove("open"));
document.querySelectorAll(".nav-item[href^='#']").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();toast("Detailed analysis page is coming next.");$("sidebar").classList.remove("open")}));
load();
