import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type FreshIconProps = {
  size?: number;
  color?: string;
  accentColor?: string;
  filled?: boolean;
};

const line = (color: string, width = 2.2) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const FreshBellIcon = ({ size = 30, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M12 34h24l-3-5v-8c0-6-3.6-10-9-10s-9 4-9 10v8z" {...line(color)}/><Path d="M20 38c.7 2 2 3 4 3s3.3-1 4-3" {...line(color)}/><Circle cx="35" cy="12" r="4" fill={accentColor}/></Svg>;

export const FreshSettingsIcon = ({ size = 30, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M9 13h30M9 24h30M9 35h30" {...line(color)}/><Circle cx="18" cy="13" r="4" fill={accentColor} stroke={color} strokeWidth="2"/><Circle cx="31" cy="24" r="4" fill={accentColor} stroke={color} strokeWidth="2"/><Circle cx="21" cy="35" r="4" fill={accentColor} stroke={color} strokeWidth="2"/></Svg>;

export const FreshWorkoutDetailsIcon = ({ size = 30, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Rect x="10" y="7" width="28" height="34" rx="5" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2"/><Path d="M18 7V5h12v2M17 20v8M31 20v8M13 22h4M31 22h4M17 24h14" {...line(color)}/><Circle cx="24" cy="34" r="2.5" fill={accentColor}/></Svg>;

export const FreshWorkoutProgressIcon = ({ size = 34, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M8 17v14M13 14v20M35 14v20M40 17v14M13 24h22" {...line(color, 2.8)}/><Rect x="19" y="19" width="10" height="10" rx="3" fill={accentColor} opacity=".28"/><Circle cx="24" cy="24" r="3" fill={accentColor}/></Svg>;

export const FreshActiveMinutesIcon = ({ size = 34, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="24" cy="27" r="15" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.2"/><Path d="M18 6h12M24 6v6M34 14l3-3M24 27l7 4M24 27V17" {...line(color)}/><Circle cx="24" cy="27" r="2.8" fill={accentColor}/></Svg>;

export const FreshJourneyIcon = ({ size = 48, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Path d="M9 43h38M13 39V17" {...line(color)}/><Path d="m15 35 9-9 7 5 12-15" {...line(accentColor, 3)}/><Circle cx="15" cy="35" r="3" fill={accentColor}/><Circle cx="24" cy="26" r="3" fill={accentColor}/><Circle cx="31" cy="31" r="3" fill={accentColor}/><Circle cx="43" cy="16" r="3" fill={accentColor}/><Path d="M18 48v4M23 46v8M33 46v8M38 48v4M23 50h10" {...line(color, 2.5)}/></Svg>;

export const FreshNutritionIcon = ({ size = 48, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Circle cx="27" cy="29" r="16" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.2"/><Circle cx="27" cy="29" r="10" {...line(color, 1.8)}/><Path d="M8 12v14M12 12v14M8 18h4M10 26v17M47 12c-5 7-5 14 0 18v13" {...line(color)}/><Path d="M22 29c3-5 7-7 12-6-1 5-4 9-10 10" {...line(accentColor, 2.6)}/></Svg>;

export const FreshSupplementsIcon = ({ size = 48, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Rect x="12" y="15" width="27" height="34" rx="6" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.2"/><Rect x="16" y="8" width="19" height="8" rx="2" fill={accentColor} opacity=".25" stroke={color} strokeWidth="2"/><Path d="M18 28h15M18 35h11" {...line(color)}/><Path d="M36 35c4-4 11 2 7 6l-4 4c-4 4-10-2-6-6z" fill={accentColor} opacity=".38" stroke={color} strokeWidth="2"/><Path d="m35 38 6 5" {...line(color)}/></Svg>;

export const FreshCommunityIcon = ({ size = 48, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Path d="M28 6 47 13v13c0 12-7 20-19 25C16 46 9 38 9 26V13z" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.2"/><Circle cx="28" cy="23" r="5" fill={accentColor} opacity=".55" stroke={color} strokeWidth="1.8"/><Circle cx="17" cy="29" r="3.5" fill={accentColor} opacity=".3" stroke={color} strokeWidth="1.5"/><Circle cx="39" cy="29" r="3.5" fill={accentColor} opacity=".3" stroke={color} strokeWidth="1.5"/><Path d="M18 42c1-8 4-12 10-12s9 4 10 12M10 41c1-5 3-8 7-8M46 41c-1-5-3-8-7-8" {...line(color)}/></Svg>;

export const FreshRunIcon = ({ size = 48, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Path d="M7 39c10 5 21 2 29-4 5-4 10-4 14-2" {...line(accentColor, 3)}/><Path d="M8 34c8-1 12-6 15-14 4 7 9 10 17 12-7 8-18 11-32 8z" fill={accentColor} opacity=".14" stroke={color} strokeWidth="2.2"/><Path d="M11 34h20M17 28l10 4" {...line(color)}/><Circle cx="43" cy="15" r="8" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2"/><Path d="M43 15v-5M43 15l4 2" {...line(color)}/></Svg>;

export const FreshHeartIcon = ({ size = 26, color = '#11252c', accentColor = '#20bfd2', filled = false }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M24 40S8 31 8 18c0-8 10-11 16-4 6-7 16-4 16 4 0 13-16 22-16 22z" fill={filled ? accentColor : 'none'} stroke={color} strokeWidth="2.2" strokeLinejoin="round"/></Svg>;

export const FreshFeedIcon = ({ size = 24, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Rect x="8" y="9" width="32" height="30" rx="6" fill={accentColor} opacity=".08" stroke={color} strokeWidth="2"/><Circle cx="17" cy="19" r="4" fill={accentColor}/><Path d="M25 17h9M25 22h7M14 30h20" {...line(color)}/></Svg>;

export const FreshCalendarIcon = ({ size = 26, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Rect x="7" y="10" width="34" height="31" rx="6" fill={accentColor} opacity=".08" stroke={color} strokeWidth="2.2"/><Path d="M7 19h34M16 6v8M32 6v8" {...line(color)}/><Circle cx="17" cy="28" r="2.5" fill={accentColor}/><Circle cx="25" cy="28" r="2.5" fill={accentColor}/><Circle cx="33" cy="28" r="2.5" fill={accentColor}/><Circle cx="17" cy="35" r="2.5" fill={accentColor}/><Circle cx="25" cy="35" r="2.5" fill={accentColor}/></Svg>;

export const FreshFoodJournalIcon = ({ size = 72, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 84 84"><Rect x="8" y="10" width="34" height="52" rx="6" fill={accentColor} opacity=".08" stroke={color} strokeWidth="2.2"/><Path d="M17 10v52M14 22h6M14 34h6M14 46h6M24 25h11M24 34h11M24 43h8" {...line(color)}/><Circle cx="55" cy="52" r="22" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.2"/><Circle cx="55" cy="52" r="14" {...line(color, 1.8)}/><Path d="M49 52c3-6 8-8 14-6-1 7-5 11-12 11M70 18v25M75 18v25M70 28h5" {...line(color)}/></Svg>;

export const FreshSearchIcon = ({ size = 32, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="21" cy="21" r="12" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.4"/><Path d="m30 30 10 10M15 21h12M21 15v12" {...line(color, 2.4)}/></Svg>;

export const FreshScanIcon = ({ size = 32, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M8 18V8h10M30 8h10v10M40 30v10H30M18 40H8V30" {...line(color, 2.5)}/><Path d="M14 17v14M19 15v18M24 17v14M29 14v20M34 17v14" stroke={color} strokeWidth="2"/><Line x1="11" y1="25" x2="37" y2="25" stroke={accentColor} strokeWidth="2.8" strokeLinecap="round"/></Svg>;

export const FreshRecentIcon = ({ size = 32, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="25" cy="25" r="16" fill={accentColor} opacity=".08" stroke={color} strokeWidth="2.2"/><Path d="M10 10v9h9M11 18a17 17 0 1 1-2 15M25 15v11l8 5" {...line(color)}/><Circle cx="25" cy="25" r="2.5" fill={accentColor}/></Svg>;

export const FreshSavedIcon = ({ size = 32, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Rect x="9" y="6" width="30" height="36" rx="5" fill={accentColor} opacity=".08" stroke={color} strokeWidth="2.2"/><Path d="M16 6v36M31 6v15l-5-3.5-5 3.5V6M22 29h11M22 35h8" {...line(color)}/></Svg>;

export const FreshBreakfastIcon = ({ size = 36, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="15" cy="14" r="6" fill={accentColor} opacity=".28" stroke={color} strokeWidth="1.8"/><Path d="M5 31h38c-2 8-8 12-19 12S7 39 5 31zM10 31c2-7 8-10 14-4 4-6 11-4 14 4M6 14H2M28 14h-4M15 5V1" {...line(color)}/></Svg>;

export const FreshLunchIcon = ({ size = 36, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="36" cy="11" r="6" fill={accentColor} opacity=".3" stroke={color} strokeWidth="1.8"/><Path d="M5 27h36c-1 10-8 16-18 16S7 37 5 27zM10 27c2-7 8-9 13-4 4-7 11-6 15 1" {...line(color)}/><Path d="M14 16h15" {...line(accentColor, 2.6)}/></Svg>;

export const FreshDinnerIcon = ({ size = 36, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M7 35h34M11 35c0-10 5-17 13-17s13 7 13 17M5 40h38" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><Circle cx="24" cy="15" r="3" fill={accentColor}/><Path d="M39 7c-5 1-7 4-6 9 4 0 7-2 8-6" {...line(color, 1.8)}/></Svg>;

export const FreshSnackIcon = ({ size = 36, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M23 14c8-7 17-1 14 12-2 11-6 17-14 17S11 37 9 26C6 13 15 7 23 14z" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.2"/><Path d="M23 14c1-7 5-10 11-10M23 14c-5-4-10-3-13 1" {...line(color)}/><Circle cx="39" cy="37" r="3" fill={accentColor}/></Svg>;

export const FreshMealBowlIcon = ({ size = 32, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M7 24h34c0 12-7 18-17 18S7 36 7 24z" fill={accentColor} opacity=".1" stroke={color} strokeWidth="2.2"/><Path d="M11 24c0-7 6-10 11-5 3-8 11-8 15 0M13 42h22" {...line(color)}/></Svg>;

export const FreshWaterIcon = ({ size = 46, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Rect x="18" y="5" width="20" height="8" rx="3" fill={accentColor} opacity=".25" stroke={color} strokeWidth="2"/><Path d="M20 13h16l4 8v29H16V21z" fill={accentColor} opacity=".08" stroke={color} strokeWidth="2.2"/><Path d="M17 34c8-5 15 5 22 0" {...line(accentColor, 2.8)}/><Path d="M28 20c-4 6-7 10-7 14a7 7 0 0 0 14 0c0-4-3-8-7-14z" fill={accentColor} opacity=".35"/></Svg>;

export const FreshWaterGlassIcon = ({ size = 34, color = '#20bfd2', filled = false }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 36 44"><Path d="M5 4h26l-3 35H8z" fill={filled ? color : 'none'} fillOpacity={filled ? .18 : 0} stroke={color} strokeWidth="2.2" strokeLinejoin="round"/><Path d="M9 25c5-3 11 3 18 0" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={filled ? 1 : .35}/></Svg>;

export const FreshPlusIcon = ({ size = 28, color = '#fff' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M24 10v28M10 24h28" {...line(color, 3)}/></Svg>;

export const FreshChevronIcon = ({ size = 22, color = '#11252c', direction = 'right' }: FreshIconProps & { direction?: 'up' | 'down' | 'left' | 'right' }) => {
  const path = direction === 'up' ? 'm14 29 10-10 10 10' : direction === 'down' ? 'm14 19 10 10 10-10' : direction === 'left' ? 'm29 14-10 10 10 10' : 'm19 14 10 10-10 10';
  return <Svg width={size} height={size} viewBox="0 0 48 48"><Path d={path} {...line(color, 2.8)}/></Svg>;
};

export const FreshCloseIcon = ({ size = 24, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="24" cy="24" r="18" fill={accentColor} opacity=".08"/><Path d="m16 16 16 16M32 16 16 32" {...line(color, 2.6)}/></Svg>;

export const FreshCopyIcon = ({ size = 22, color = '#11252c', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Rect x="15" y="14" width="25" height="26" rx="4" fill={accentColor} opacity=".08" stroke={color} strokeWidth="2"/><Path d="M32 14V8H8v24h7" {...line(color)}/></Svg>;

export const FreshMoreIcon = ({ size = 24, color = '#11252c' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="24" cy="11" r="3" fill={color}/><Circle cx="24" cy="24" r="3" fill={color}/><Circle cx="24" cy="37" r="3" fill={color}/></Svg>;

export const FreshHomeNavIcon = ({ size = 28, color = '#11252c', accentColor = '#20bfd2', filled = false }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="m7 22 17-14 17 14v19H29V29H19v12H7z" fill={filled ? accentColor : 'none'} fillOpacity={filled ? .2 : 0} stroke={color} strokeWidth="2.5" strokeLinejoin="round"/><Circle cx="36" cy="14" r="3" fill={filled ? accentColor : color}/></Svg>;

export const FreshFriendsNavIcon = ({ size = 28, color = '#11252c', accentColor = '#20bfd2', filled = false }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="18" cy="17" r="7" fill={filled ? accentColor : 'none'} fillOpacity=".22" stroke={color} strokeWidth="2.3"/><Circle cx="33" cy="20" r="5" fill={filled ? accentColor : 'none'} fillOpacity=".14" stroke={color} strokeWidth="2"/><Path d="M5 41c1-10 5-15 13-15s12 5 13 15M29 29c7 0 11 4 12 12" {...line(color)}/></Svg>;

export const FreshTrainNavIcon = ({ size = 32, color = '#fff', accentColor = '#20bfd2' }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M6 17v14M11 13v22M37 13v22M42 17v14M11 24h26" {...line(color, 3)}/><Circle cx="24" cy="24" r="5" fill={accentColor} opacity=".45"/></Svg>;

export const FreshFoodNavIcon = ({ size = 28, color = '#11252c', accentColor = '#20bfd2', filled = false }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="25" cy="25" r="14" fill={filled ? accentColor : 'none'} fillOpacity=".16" stroke={color} strokeWidth="2.2"/><Circle cx="25" cy="25" r="8" {...line(color, 1.8)}/><Path d="M7 8v17M12 8v17M7 16h5M9.5 25v15M42 8c-5 7-5 14 0 18v14" {...line(color)}/></Svg>;

export const FreshProfileNavIcon = ({ size = 28, color = '#11252c', accentColor = '#20bfd2', filled = false }: FreshIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="24" cy="16" r="9" fill={filled ? accentColor : 'none'} fillOpacity=".2" stroke={color} strokeWidth="2.3"/><Path d="M7 43c2-11 8-17 17-17s15 6 17 17" fill={filled ? accentColor : 'none'} fillOpacity=".1" stroke={color} strokeWidth="2.3" strokeLinecap="round"/></Svg>;
