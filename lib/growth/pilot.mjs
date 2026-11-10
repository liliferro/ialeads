// Confirmed pilot scope; public access verified, publishing/account access pending.
const confirmedProfile={configRevision:3,domain:'www.matdepotmex.com',product:'Pisos para gimnasios',domainVerified:true,domainStatus:'Sitio público accesible; categoría de gimnasios revisada el 9 de noviembre de 2026',source:'Dominio, Vercel y prioridad confirmados por Lili; categoría y contacto consultados en el sitio público',crm:'HubSpot · portal Mood 50738398 verificado; sincronización de la app pendiente',hubspotPortalId:'50738398',hubspotAccountName:'Mood Agency',hubspotAdminEmail:'lilianaferro@mood-agency.com',hubspotConnectorVerified:true,hubspotAppSyncEnabled:false,hubspotCurrency:'USD',hubspotTimezone:'US/Eastern',matdepotUserStatus:'Pendiente de respuesta e invitación por Lili',cms:'Sitio estático en Vercel; edición desde GitHub (matdepot-web)',audience:'Dueños y responsables de gimnasios; perfil por validar',categoryUrl:'https://www.matdepotmex.com/categorias/gimnasios.html',contactUrl:'https://www.matdepotmex.com/contacto.html'};
export function createMatDepotPilot() {
  return {
    profile: {name:'MatDepot',mode:'pilot',states:[],sectors:[],min:1,max:7,icpConfirmed:false,...confirmedProfile},
    budget:5000,
    companies:[],leads:[],suppressions:[],keywords:[],content:[],issues:[],observations:[],campaigns:[],deals:[],jobs:[],usage:[],
    tasks:[
      {id:'matdepot-t1',title:'Confirmar www.matdepotmex.com y acceso a la categoría de gimnasios',phase:'THINK',owner:'Lili / equipo web',due:'',done:true},
      {id:'matdepot-t2',title:'Validar comprador, zona y tamaño del proyecto de pisos para gimnasios',phase:'THINK',owner:'Lili / MatDepot',due:'',done:false},
      {id:'matdepot-t3',title:'Preparar separación del piloto en el portal Mood y confirmar acceso de MatDepot y analítica',phase:'THINK',owner:'Equipo MatDepot',due:'',done:false},
      {id:'matdepot-t4',title:'Preparar entorno de pruebas, permisos y almacenamiento compartido',phase:'DO',owner:'Desarrollo',due:'',done:false},
      {id:'matdepot-t5',title:'Registrar línea base con datos verificados del piloto',phase:'DO',owner:'Estrategia / analítica',due:'',done:false},
      {id:'matdepot-t6',title:'Validar el primer ciclo de oportunidad, contenido y medición',phase:'EVOLVE',owner:'Mood / MatDepot',due:'',done:false}
    ],
    events:[{id:'matdepot-e2',at:new Date().toISOString(),actor:'Configuración del piloto',type:'pilot',detail:'URL corregida a www.matdepotmex.com y acceso público verificado. Prioridad: pisos para gimnasios. Vercel confirmado por Lili; Portal HubSpot Mood Agency 50738398 y usuario lilianaferro@mood-agency.com verificados por el conector. La app local no sincroniza datos; acceso de MatDepot pendiente.'}]
  };
}
export function ensurePilot(state) {
  const current=state.tenants.matdepot;
  if(!current)return {...state,tenants:{matdepot:createMatDepotPilot(),...state.tenants}};
  if(current.profile.configRevision>=3)return state;
  const template=createMatDepotPilot();
  return {...state,tenants:{...state.tenants,matdepot:{...current,profile:{...current.profile,...confirmedProfile},tasks:current.tasks.map(task=>{
    const replacement=template.tasks.find(t=>t.id===task.id);
    if(!replacement||!['matdepot-t1','matdepot-t2','matdepot-t3'].includes(task.id))return task;
    return {...task,title:replacement.title,done:task.id==='matdepot-t1'?true:task.done};
  }),events:[template.events[0],...current.events]}}};
}
