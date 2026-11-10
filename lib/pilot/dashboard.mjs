import {validateReport,summarizeReport} from './reports.mjs';
export const shiftDate=(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
export function calendar(from,to){if(!from||!to||from>to)return [];const days=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;if(!Number.isFinite(days)||days>366)return [];return Array.from({length:days},(_,i)=>shiftDate(from,i));}
export function sourceSeries(reports,source){
 const rows=new Map();let invalid=0;
 for(const report of reports.filter(r=>r.source===source).sort((a,b)=>Date.parse(b.fetched_at)-Date.parse(a.fetched_at))){try{for(const row of validateReport(source,report.rows,report))if(!rows.has(row.date))rows.set(row.date,row);}catch{invalid++;}}
 return {rows:[...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)),invalid};
}
export function windowSummary(source,rows,from,to){const dates=calendar(from,to),selected=rows.filter(r=>r.date>=from&&r.date<=to),complete=dates.length>0&&selected.length===dates.length;return {totals:selected.length?summarizeReport({source,rows:selected,date_from:from,date_to:to}):null,days:selected.length,expected:dates.length,complete,series:dates.map(date=>selected.find(r=>r.date===date)||{date})};}
export function percentageChange(current,previous,complete){return complete&&Number.isFinite(current)&&Number.isFinite(previous)&&previous!==0?(current-previous)/previous*100:null;}
