import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('mood-growth-demo-v1-client'))localStorage.setItem('mood-growth-demo-v1-client','norte');});});
test('MatDepot pilot is available, empty and not connected',async({page})=>{
 await page.goto('/demo/resumen');await page.getByLabel('Cliente',{exact:true}).selectOption('matdepot');
 await expect(page.getByRole('heading',{name:'MatDepot: piloto seleccionado'})).toBeVisible();await expect(page.getByText('www.matdepotmex.com',{exact:false}).first()).toBeVisible();
 await page.goto('/demo/leads');await expect(page.locator('.growth-lead-card')).toHaveCount(0);
 await page.reload();await expect(page.getByLabel('Cliente',{exact:true})).toHaveValue('matdepot');
});
test('dashboard, every module, and local-only network boundary',async({page,request})=>{
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:3210'))external.push(r.url());});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Cada oportunidad, un siguiente paso.'})).toBeVisible();
 await page.screenshot({path:'test-results/dashboard-desktop.png',fullPage:true});
 for(const path of ['cuentas','leads','comercial','visibilidad','contenido','pauta','operacion','reportes','integraciones','ajustes','captura']){await page.goto('/demo/'+path);await expect(page.locator('main h1')).toBeVisible();}
 expect(errors).toEqual([]);expect(external).toEqual([]);
 const api=await request.post('/api/leads',{data:{name:'test'}});expect(api.status()).toBe(403);
});
test('convert company, retain change after reload, and switch client',async({page})=>{
 await page.goto('/demo/cuentas');const row=page.getByRole('row').filter({hasText:'Empaques del Pacífico'});await row.getByRole('button',{name:'Pasar a Leads'}).click();await expect(row.getByRole('button',{name:'En Leads'})).toBeDisabled();await page.reload();await expect(row.getByRole('button',{name:'En Leads'})).toBeDisabled();
 await page.getByLabel('Cliente',{exact:true}).selectOption('envase');await expect(row.getByRole('button',{name:'Pasar a Leads'})).toBeEnabled();
});
test('editorial flow requires review, invalidates on edit, and exports',async({page})=>{
 await page.goto('/demo/visibilidad');await page.getByRole('button',{name:'Palabras clave',exact:true}).click();await page.getByRole('button',{name:'Crear brief'}).first().click();
 await page.getByRole('navigation').getByRole('link',{name:/Estudio de contenido/}).click();await page.getByRole('button',{name:'Crear borrador de ejemplo'}).click();await expect(page.getByRole('textbox',{name:'Borrador',exact:true})).not.toBeEmpty();
 await expect(page.getByRole('button',{name:'Simular publicación',exact:true})).toBeDisabled();await page.getByRole('checkbox',{name:/Confirmo la revisión/}).check();await page.getByRole('button',{name:/Aprobar versión/}).click();await page.getByRole('button',{name:'Simular publicación',exact:true}).click();await expect(page.getByRole('button',{name:'Retirar publicación simulada'})).toBeVisible();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar HTML',exact:true}).click();expect((await dl).suggestedFilename()).toBe('contenido-demo.html');
 await page.getByRole('textbox',{name:'Borrador',exact:true}).fill('Nuevo contenido de prueba que cambia la versión previamente aprobada. Esta modificación requiere revisión editorial y confirmación de fuentes.');await page.getByRole('button',{name:'Guardar nueva versión'}).click();await expect(page.getByRole('button',{name:'Simular publicación',exact:true})).toBeDisabled();await expect(page.getByRole('checkbox',{name:/Confirmo la revisión/})).not.toBeChecked();
});
test('capture, lead follow-up, source and note persist',async({page})=>{
 await page.goto('/demo/captura');await page.getByLabel('Nombre de ejemplo').fill('Ana Prueba');await page.getByLabel('Empresa de ejemplo').fill('Prueba integral');await page.getByLabel('Correo ficticio').fill('ana@prueba.example');await page.getByLabel('Origen del lead').selectOption('seo');await page.getByLabel('¿Qué necesita la empresa?').fill('Cotizar 100 unidades');await page.getByRole('checkbox').check();await page.getByRole('button',{name:/Registrar solicitud/}).click();await page.getByRole('link',{name:/Ver la bandeja/}).click();await page.getByRole('button',{name:/Prueba integral/}).click();await page.getByRole('button',{name:'Registrar primera respuesta',exact:true}).click();await page.getByLabel('Nota de seguimiento').fill('Solicitar medidas antes del viernes');await page.getByRole('button',{name:'Agregar nota',exact:true}).click();await expect(page.getByText('Solicitar medidas antes del viernes',{exact:true})).toBeVisible();
});
test('mobile screens have no page overflow and can navigate',async({page})=>{
 await page.setViewportSize({width:390,height:844});for(const route of ['resumen','leads','contenido','visibilidad','ajustes']){await page.goto('/demo/'+route);await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
 await page.goto('/demo/resumen');await page.screenshot({path:'test-results/dashboard-mobile.png',fullPage:true});
});
