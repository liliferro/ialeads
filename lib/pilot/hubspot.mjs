export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function noteBody(p) {
  return [['Proyecto',p.organization_name],['Solicitud',p.id],['Producto',p.product],['Nombre',p.name],['Empresa',p.company],['Necesidad',p.need],['Superficie m²',p.surface_m2],['Uso',p.use_area],['CP',p.postal_code],['Fecha requerida',p.required_date],['Origen',p.source],['Estado',p.status]].map(([k,v])=>`<p><b>${k}:</b> ${escapeHTML(v)}</p>`).join('');
}
// Every mutation is preceded by a durable lease and approval snapshot in PostgreSQL.
export async function syncApproved({ job, command, request }) {
  let phase='verify';
  const finish = data => command('finish',{lease:job.lease,...data});
  try {
    const p=job.payload;
    const account=await request('GET','/account-info/v3/details');
    if(String(account.portalId)!==String(p.hubspot_portal_id))return await finish({status:'blocked',error:'portal_mismatch'});
    if(job.phase==='note_creating')return await finish({status:'manual_review',error:'check_existing_note'});
    phase='contact';
    let contactId=job.contact_id;
    const lookup=()=>request('GET',`/crm/v3/objects/contacts/${encodeURIComponent(p.email)}?idProperty=email`);
    if(!contactId) {
      try { contactId=(await lookup()).id; }
      catch(e) {
        if(e.status!==404)throw e;
        try { contactId=(await request('POST','/crm/v3/objects/contacts',{properties:{email:p.email,firstname:p.name,company:p.company,phone:p.phone}})).id; }
        catch(createError) { if(createError.status!==409)throw createError; contactId=(await lookup()).id; }
      }
    }
    if(!contactId)throw new Error('missing_contact_id');
    await command('checkpoint',{lease:job.lease,phase:'contact_resolved',contact_id:String(contactId)});
    await command('checkpoint',{lease:job.lease,phase:'note_creating'});
    phase='note';
    const note=await request('POST','/crm/v3/objects/notes',{properties:{hs_timestamp:new Date().toISOString(),hs_note_body:noteBody(p)},associations:[{to:{id:String(contactId)},types:[{associationCategory:'HUBSPOT_DEFINED',associationTypeId:202}]}]});
    if(!note.id)throw new Error('missing_note_id');
    phase='commit';
    return await finish({status:'completed',note_id:String(note.id)});
  } catch(e) {
    // An ambiguous note response may represent an already-created note. Never auto-repeat it.
    const ambiguous=(phase==='note' && (!e.status || e.status>=500)) || phase==='commit';
    return await finish({status:ambiguous?'manual_review':(e.status===429 || !e.status || e.status>=500)?'retry':'blocked',error:ambiguous?'verify_remote_note':`hubspot_${e.status || 'unavailable'}`});
  }
}
export function hubspotTransport(token) {
  return async (method,path,body) => {
    const res=await fetch(`https://api.hubapi.com${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
    if(!res.ok){const e=new Error('hubspot_request_failed');e.status=res.status;throw e;}
    return res.json();
  };
}
