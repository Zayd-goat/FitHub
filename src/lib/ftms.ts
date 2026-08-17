import { BleManager, Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
const FTMS='00001826-0000-1000-8000-00805f9b34fb';
let manager:BleManager|null=null;
const ble=()=>manager??(manager=new BleManager());
export type FtmsState='searching'|'found'|'connecting'|'connected'|'unsupported'|'lost';
async function requestBlePermissions(){if(Platform.OS!=='android')return true;const result=await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);return Object.values(result).every(x=>x===PermissionsAndroid.RESULTS.GRANTED);}
export async function connectFirstFtms(onState:(s:FtmsState,name?:string)=>void,timeoutMs=12000):Promise<Device>{
 if(!await requestBlePermissions())throw new Error('Nearby devices permission is required to find compatible gym equipment.');
 const state=await ble().state();if(state!=='PoweredOn')throw new Error('Turn on Bluetooth, then try Connect Equipment again.');
 onState('searching');
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{ble().stopDeviceScan();onState('unsupported');reject(new Error("This machine doesn't support FitHub connectivity."));},timeoutMs);
  ble().startDeviceScan([FTMS],null,async(error,device)=>{
   if(error){clearTimeout(timeout);ble().stopDeviceScan();reject(error);return;}
   if(!device)return;onState('found',device.name??'Fitness machine');ble().stopDeviceScan();onState('connecting',device.name??undefined);
   try{const connected=await device.connect({timeout:10000});await connected.discoverAllServicesAndCharacteristics();const services=await connected.services();if(!services.some(s=>s.uuid.toLowerCase()===FTMS)){await connected.cancelConnection();throw new Error('This Bluetooth device does not expose the standard Fitness Machine Service.');}clearTimeout(timeout);onState('connected',connected.name??undefined);connected.onDisconnected(()=>onState('lost',connected.name??undefined));resolve(connected);}
   catch(e){clearTimeout(timeout);reject(e);}
  });
 });
}
export function disconnectFtms(){manager?.destroy();manager=null;}
