import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

const FTMS='00001826-0000-1000-8000-00805f9b34fb';
const TREADMILL='00002acd-0000-1000-8000-00805f9b34fb';
const BIKE='00002ad2-0000-1000-8000-00805f9b34fb';
let manager:BleManager|null=null;
let monitors:Subscription[]=[];
const ble=()=>manager??(manager=new BleManager());
export type FtmsState='searching'|'found'|'connecting'|'connected'|'unsupported'|'lost';
export type FtmsMetrics={source:'machine';speedKph?:number;distanceKm?:number;inclinePercent?:number;resistanceLevel?:number;cadenceRpm?:number;watts?:number;calories?:number;heartRate?:number;elapsedSeconds?:number};

async function requestBlePermissions(){
 if(Platform.OS!=='android')return true;
 if(Number(Platform.Version)<31)return await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)===PermissionsAndroid.RESULTS.GRANTED;
 const result=await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);
 return Object.values(result).every(x=>x===PermissionsAndroid.RESULTS.GRANTED);
}
const raw=(value?:string|null)=>{if(!value)return [] as number[];const decoded=globalThis.atob(value);return Array.from(decoded,x=>x.charCodeAt(0));};
const u16=(b:number[],i:number)=>(b[i]??0)|((b[i+1]??0)<<8);
const s16=(b:number[],i:number)=>{const n=u16(b,i);return n>0x7fff?n-0x10000:n;};
const u24=(b:number[],i:number)=>(b[i]??0)|((b[i+1]??0)<<8)|((b[i+2]??0)<<16);

function treadmill(b:number[]):FtmsMetrics|null{
 if(b.length<4)return null;const flags=u16(b,0);let i=2;const out:FtmsMetrics={source:'machine',speedKph:u16(b,i)/100};i+=2;
 if(flags&2)i+=2;if(flags&4){out.distanceKm=u24(b,i)/1000;i+=3;}if(flags&8){out.inclinePercent=s16(b,i)/10;i+=4;}if(flags&16)i+=4;if(flags&32)i++;if(flags&64)i++;if(flags&128){out.calories=u16(b,i);i+=5;}if(flags&256){out.heartRate=b[i];i++;}if(flags&512)i++;if(flags&1024)out.elapsedSeconds=u16(b,i);return out;
}
function bike(b:number[]):FtmsMetrics|null{
 if(b.length<2)return null;const flags=u16(b,0);let i=2;const out:FtmsMetrics={source:'machine'};
 if(!(flags&1)){out.speedKph=u16(b,i)/100;i+=2;}if(flags&2)i+=2;if(flags&4){out.cadenceRpm=u16(b,i)/2;i+=2;}if(flags&8)i+=2;if(flags&16){out.distanceKm=u24(b,i)/1000;i+=3;}if(flags&32){out.resistanceLevel=s16(b,i);i+=2;}if(flags&64){out.watts=s16(b,i);i+=2;}if(flags&128)i+=2;if(flags&256){out.calories=u16(b,i);i+=5;}if(flags&512){out.heartRate=b[i];i++;}if(flags&1024)i++;if(flags&2048)out.elapsedSeconds=u16(b,i);return out;
}
async function watch(device:Device,onMetrics?:(m:FtmsMetrics)=>void){
 monitors.forEach(x=>x.remove());monitors=[];if(!onMetrics)return;
 for(const characteristic of await device.characteristicsForService(FTMS)){
  const id=characteristic.uuid.toLowerCase();if(id!==TREADMILL&&id!==BIKE)continue;
  monitors.push(device.monitorCharacteristicForService(FTMS,characteristic.uuid,(error,next)=>{if(error||!next?.value)return;const parsed=id===TREADMILL?treadmill(raw(next.value)):bike(raw(next.value));if(parsed)onMetrics(parsed);}));
 }
}
export async function connectFirstFtms(onState:(s:FtmsState,name?:string)=>void,onMetrics?:(m:FtmsMetrics)=>void,timeoutMs=15000):Promise<Device>{
 if(!await requestBlePermissions())throw new Error('Nearby devices permission is required to find compatible gym equipment.');
 if(await ble().state()!=='PoweredOn')throw new Error('Turn on Bluetooth, then try Connect Equipment again.');onState('searching');
 return new Promise((resolve,reject)=>{let settled=false;const fail=(e:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);ble().stopDeviceScan();reject(e);};const timer=setTimeout(()=>{onState('unsupported');fail(new Error('No compatible FTMS machine was found. Use Track manually if the machine does not broadcast Bluetooth FTMS.'));},timeoutMs);
  ble().startDeviceScan([FTMS],{allowDuplicates:false},async(error,device)=>{if(error)return fail(error);if(!device||settled)return;onState('found',device.name??'Fitness machine');ble().stopDeviceScan();onState('connecting',device.name??undefined);try{const connected=await device.connect({timeout:12000});await connected.discoverAllServicesAndCharacteristics();if(!(await connected.services()).some(x=>x.uuid.toLowerCase()===FTMS)){await connected.cancelConnection();throw new Error('This device does not expose the standard Fitness Machine Service.');}await watch(connected,onMetrics);settled=true;clearTimeout(timer);onState('connected',connected.name??undefined);connected.onDisconnected(()=>{monitors.forEach(x=>x.remove());monitors=[];onState('lost',connected.name??undefined);});resolve(connected);}catch(e){fail(e);}});
 });
}
export function disconnectFtms(){monitors.forEach(x=>x.remove());monitors=[];manager?.destroy();manager=null;}
