import { BleManager, Device } from 'react-native-ble-plx';
const FTMS='00001826-0000-1000-8000-00805f9b34fb';
let manager:BleManager|null=null;
const ble=()=>manager??(manager=new BleManager());
export type FtmsState='searching'|'found'|'connecting'|'connected'|'unsupported'|'lost';
export async function connectFirstFtms(onState:(s:FtmsState,name?:string)=>void,timeoutMs=12000):Promise<Device>{
 onState('searching');
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{ble().stopDeviceScan();onState('unsupported');reject(new Error("This machine doesn't support FitHub connectivity."));},timeoutMs);
  ble().startDeviceScan([FTMS],null,async(error,device)=>{
   if(error){clearTimeout(timeout);ble().stopDeviceScan();reject(error);return;}
   if(!device)return;onState('found',device.name??'Fitness machine');ble().stopDeviceScan();onState('connecting',device.name??undefined);
   try{const connected=await device.connect();await connected.discoverAllServicesAndCharacteristics();clearTimeout(timeout);onState('connected',connected.name??undefined);connected.onDisconnected(()=>onState('lost',connected.name??undefined));resolve(connected);}
   catch(e){clearTimeout(timeout);reject(e);}
  });
 });
}
export function disconnectFtms(){manager?.destroy();manager=null;}
