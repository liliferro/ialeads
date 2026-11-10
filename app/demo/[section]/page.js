import Screens from '@/components/growth/Screens';
import { notFound } from 'next/navigation';
const sections=['resumen','cuentas','leads','comercial','visibilidad','contenido','pauta','operacion','reportes','integraciones','ajustes','captura'];
export function generateStaticParams(){return sections.map(section=>({section}));}
export default async function Page({params}){const {section}=await params;if(!sections.includes(section))notFound();return <Screens section={section}/>;}
