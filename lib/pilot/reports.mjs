export const reportsConfig={googleanalytics4:{account:'536869166',fields:['date','sessions','engaged_sessions','screen_page_views']},searchconsole:{account:'sc-domain:matdepotmex.com',fields:['date','clicks','impressions','position']}};
export function reportPeriod(now=new Date()){
 const end=new Date(now);end.setUTCDate(end.getUTCDate()-4);const start=new Date(end);start.setUTCDate(start.getUTCDate()-27);
 return {date_from:start.toISOString().slice(0,10),date_to:end.toISOString().slice(0,10)};
}
export function validateReport(source,rows,period){
 const config=reportsConfig[source];if(!config||!Array.isArray(rows)||rows.length>10000)throw new Error('invalid_report');
 const seen=new Set();return rows.map(row=>{const date=String(row.date||'').replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<period.date_from||date>period.date_to||seen.has(date))throw new Error('invalid_report_date');seen.add(date);const out={date};for(const field of config.fields.filter(f=>f!=='date')){if(row[field]===null||row[field]===undefined||row[field]==='')throw new Error('missing_metric');const value=Number(row[field]);if(!Number.isFinite(value)||value<0)throw new Error('invalid_metric');out[field]=value;}return out;});
}
export function summarizeReport(report){
 const rows=validateReport(report.source,report.rows,report);const sum=k=>rows.reduce((s,r)=>s+r[k],0);
 if(report.source==='googleanalytics4')return {sessions:sum('sessions'),engaged_sessions:sum('engaged_sessions'),screen_page_views:sum('screen_page_views')};
 const impressions=sum('impressions'),clicks=sum('clicks');return {clicks,impressions,ctr:impressions?clicks/impressions:null,position:impressions?rows.reduce((s,r)=>s+r.position*r.impressions,0)/impressions:null};
}
export async function fetchReport(source,key,period,transport=fetch){
 const config=reportsConfig[source];if(!config||!key)throw new Error('not_configured');
 const url=new URL(`https://connectors.windsor.ai/${source}`);url.search=new URLSearchParams({api_key:key,fields:config.fields.join(','),select_accounts:config.account,...period}).toString();
 // Never log this URL: Windsor's API uses a query credential.
 let response;try{response=await transport(url,{cache:'no-store',signal:AbortSignal.timeout(25000)});}catch{throw new Error('provider_unavailable');}
 if(!response.ok)throw new Error('provider_unavailable');const result=await response.json();if(result.status==='pending')throw new Error('report_pending');
 return {source,account_id:config.account,...period,rows:validateReport(source,result.data,period),method:'server_api',fetched_at:new Date().toISOString()};
}
