import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

export type ReferenceIconProps = {
  size?: number;
  color?: string;
  accentColor?: string;
  filled?: boolean;
};

const stroke = (color: string, width = 2.4) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const TEAL_DARK = '#0B7890';
const GREEN = '#54A83E';
const GREEN_DARK = '#2F7D3D';
const ORANGE = '#F2A43A';
const GOLD = '#F7C94C';
const WHITE = '#FFFFFF';

export const ReferenceHomeBackdrop = ({ color = '#19BFD9', accentColor = '#102B35' }: ReferenceIconProps) =>
  <Svg width="100%" height="100%" viewBox="0 0 390 920" preserveAspectRatio="xMidYMid slice">
    <Defs>
      <LinearGradient id="home-wash" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={color} stopOpacity=".02"/>
        <Stop offset=".55" stopColor={color} stopOpacity=".09"/>
        <Stop offset="1" stopColor={color} stopOpacity=".025"/>
      </LinearGradient>
    </Defs>
    <Rect width="390" height="920" fill="url(#home-wash)"/>
    <Path d="M-72 312 211 29h102L2 340z" fill={WHITE} fillOpacity=".2"/>
    <Path d="M255-38 428 135v88L201-3z" fill={WHITE} fillOpacity=".18"/>
    <Path d="M-66 690 285 339h73L-9 709z" fill={color} fillOpacity=".04"/>
    <Path d="M128 943 437 634v67L195 943z" fill={WHITE} fillOpacity=".18"/>
    <G opacity=".06" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M135 75h154M147 59v32M157 50v50M267 50v50M277 59v32"/>
      <Circle cx="212" cy="75" r="27"/><Circle cx="212" cy="75" r="10"/>
      <Path d="M20 568h114M33 554v28M44 546v44M111 546v44M122 554v28"/>
      <Circle cx="78" cy="568" r="20"/><Circle cx="78" cy="568" r="7"/>
      <Path d="M246 781h115M258 769v24M268 762v38M339 762v38M349 769v24"/>
    </G>
    <G opacity=".12" fill={color}>
      <Circle cx="346" cy="185" r="2"/><Circle cx="356" cy="185" r="2"/><Circle cx="366" cy="185" r="2"/>
      <Circle cx="346" cy="195" r="2"/><Circle cx="356" cy="195" r="2"/><Circle cx="366" cy="195" r="2"/>
      <Circle cx="346" cy="205" r="2"/><Circle cx="356" cy="205" r="2"/><Circle cx="366" cy="205" r="2"/>
      <Circle cx="24" cy="430" r="2"/><Circle cx="34" cy="430" r="2"/><Circle cx="44" cy="430" r="2"/>
      <Circle cx="24" cy="440" r="2"/><Circle cx="34" cy="440" r="2"/><Circle cx="44" cy="440" r="2"/>
    </G>
    <G opacity=".08" stroke={color} strokeWidth="1.5">
      <Line x1="292" y1="265" x2="417" y2="140"/><Line x1="307" y1="280" x2="432" y2="155"/>
      <Line x1="-42" y1="846" x2="134" y2="670"/><Line x1="-29" y1="859" x2="147" y2="683"/>
    </G>
  </Svg>;

export const ReferencePlayIcon = ({ size = 22, color = WHITE }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 32 32"><Path d="M10 6.5v19l15-9.5z" fill={color}/></Svg>;

export const ReferenceBellIcon = ({ size = 30, color = '#102B35' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M9 35h30c-4-4-5-8-5-15 0-7-4-12-10-12S14 13 14 20c0 7-1 11-5 15z" {...stroke(color, 2.7)}/><Path d="M20 40c1 3 7 3 8 0" {...stroke(color, 2.7)}/><Path d="M24 4v4" {...stroke(color, 2.4)}/></Svg>;

export const ReferenceSettingsIcon = ({ size = 30, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="m20 5 2-3h4l2 3 5 2 4-1 3 3-1 4 2 5 4 2v5l-4 2-2 5 1 4-3 3-4-1-5 2-2 4h-4l-2-4-5-2-4 1-3-3 1-4-2-5-4-2v-5l4-2 2-5-1-4 3-3 4 1z" fill="none" stroke={color} strokeWidth="2.3" strokeLinejoin="round"/><Circle cx="24" cy="23" r="7" fill={accentColor} fillOpacity=".18" stroke={color} strokeWidth="2.4"/></Svg>;

export const ReferenceCalendarIcon = ({ size = 28, color = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Rect x="7" y="10" width="34" height="31" rx="5" fill="none" stroke={color} strokeWidth="2.8"/><Path d="M7 19h34M16 5v10M32 5v10" {...stroke(color, 2.8)}/><Path d="M15 26h4M24 26h4M33 26h1M15 33h4M24 33h4M33 33h1" stroke={color} strokeWidth="3" strokeLinecap="round"/></Svg>;

export const ReferenceChevronIcon = ({ size = 22, color = '#102B35', direction = 'right' }: ReferenceIconProps & { direction?: 'left'|'right'|'up'|'down' }) => {
  const d = direction === 'left' ? 'M29 8 15 24l14 16' : direction === 'up' ? 'M8 29 24 15l16 14' : direction === 'down' ? 'M8 19 24 33l16-14' : 'M19 8l14 16-14 16';
  return <Svg width={size} height={size} viewBox="0 0 48 48"><Path d={d} {...stroke(color, 3.2)}/></Svg>;
};

export const ReferencePlusIcon = ({ size = 28, color = WHITE }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M24 8v32M8 24h32" {...stroke(color, 3.2)}/></Svg>;

export const ReferenceWeekWorkoutsIcon = ({ size = 48, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64"><Rect x="8" y="12" width="48" height="43" rx="10" fill={accentColor} fillOpacity=".12" stroke={color} strokeWidth="2.3"/><Path d="M8 25h48M20 7v11M44 7v11" {...stroke(color, 2.6)}/><Path d="M17 36v9M22 32v17M27 36v9M37 36v9M42 32v17M47 36v9M27 40h10" {...stroke(accentColor, 3)}/></Svg>;

export const ReferenceWeekActiveIcon = ({ size = 48, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64"><Circle cx="29" cy="31" r="22" fill={accentColor} fillOpacity=".12" stroke={color} strokeWidth="2.5"/><Path d="M29 31V17M29 31l10 5M23 4h12" {...stroke(color, 2.7)}/><Path d="m43 31-8 13h7l-4 12 13-17h-7l5-8z" fill={accentColor} stroke={TEAL_DARK} strokeWidth="1.7" strokeLinejoin="round"/></Svg>;

export const ReferenceHeartIcon = ({ size = 25, color = '#102B35', accentColor = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M24 42C11 33 5 27 5 17c0-7 5-11 11-11 4 0 7 2 8 6 2-4 5-6 9-6 6 0 10 4 10 11 0 10-6 16-19 25z" fill={filled ? accentColor : 'none'} stroke={color} strokeWidth="2.7" strokeLinejoin="round"/></Svg>;

export const ReferenceFeedIcon = ({ size = 24, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M6 9h36v25H20L10 42l2-8H6z" fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round"/><Path d="M14 18h20M14 25h15" {...stroke(accentColor, 2.6)}/></Svg>;

export const ReferenceJourneyIcon = ({ size = 58, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M15 47c9-3 12-8 7-15-5-8 1-15 12-18 5-1 9-1 14 0" fill="none" stroke={color} strokeWidth="2.7" strokeLinecap="round" strokeDasharray="4 4"/>
    <Path d="M14 37c-5 0-8 3-8 8 0 6 8 14 8 14s8-8 8-14c0-5-3-8-8-8z" fill={accentColor} stroke={color} strokeWidth="2"/><Circle cx="14" cy="45" r="2.5" fill={WHITE}/>
    <Path d="M48 4c-5 0-8 3-8 8 0 6 8 14 8 14s8-8 8-14c0-5-3-8-8-8z" fill={accentColor} stroke={color} strokeWidth="2"/><Circle cx="48" cy="12" r="2.5" fill={WHITE}/>
    <Circle cx="45" cy="48" r="12" fill="#E7F9FB" stroke={color} strokeWidth="2"/>
    <Path d="M34 45v6M38 42v12M52 42v12M56 45v6M38 48h14" {...stroke(accentColor, 2.8)}/>
  </Svg>;

export const ReferenceNutritionIcon = ({ size = 58, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M7 34h39c-1 14-8 21-20 21S8 48 7 34z" fill={accentColor} fillOpacity=".14" stroke={color} strokeWidth="2.6" strokeLinejoin="round"/>
    <Path d="M12 55h30" {...stroke(color, 2.5)}/>
    <Path d="M26 29c-1-10 4-17 14-20-1 10-6 16-14 20z" fill={GREEN} stroke={GREEN_DARK} strokeWidth="1.8"/>
    <Path d="M27 29c-7-10-14-12-21-8 5 8 11 11 21 8z" fill="#78C95B" stroke={GREEN_DARK} strokeWidth="1.8"/>
    <Path d="M31 29c4-7 10-10 17-8-3 7-8 10-17 8z" fill="#9BDD69" stroke={GREEN_DARK} strokeWidth="1.6"/>
    <Path d="M54 12v42M49 12v15M59 12v15M49 21h10" {...stroke(color, 2.6)}/>
  </Svg>;

export const ReferenceSupplementsIcon = ({ size = 58, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Rect x="13" y="14" width="31" height="42" rx="7" fill={accentColor} fillOpacity=".7" stroke={color} strokeWidth="2.5"/>
    <Rect x="16" y="7" width="25" height="10" rx="3" fill="#C7F4F8" stroke={color} strokeWidth="2.4"/><Path d="M18 23h21M18 47h21" {...stroke(TEAL_DARK, 2)}/>
    <Path d="M44 39c4-5 12 1 8 6l-7 8c-4 5-12-2-8-7z" fill={WHITE} stroke={color} strokeWidth="2.3"/>
    <Path d="m40 43 9 7" stroke={accentColor} strokeWidth="3" strokeLinecap="round"/>
  </Svg>;

export const ReferenceCommunityIcon = ({ size = 58, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M19 7h26v10c0 11-5 18-13 18s-13-7-13-18z" fill={accentColor} fillOpacity=".22" stroke={color} strokeWidth="2.6"/>
    <Path d="M19 12H9c0 11 5 16 13 16M45 12h10c0 11-5 16-13 16M32 35v8M23 45h18" {...stroke(color, 2.5)}/>
    <Path d="m32 13 2.5 5 5.5.8-4 4 1 5.5-5-2.6-5 2.6 1-5.5-4-4 5.5-.8z" fill={accentColor}/>
    <Circle cx="13" cy="45" r="5" fill={accentColor} stroke={color} strokeWidth="2"/><Circle cx="51" cy="45" r="5" fill={accentColor} stroke={color} strokeWidth="2"/>
    <Path d="M4 58c1-6 4-9 9-9s8 3 9 9M42 58c1-6 4-9 9-9s8 3 9 9M21 58c1-8 5-12 11-12s10 4 11 12" {...stroke(color, 2.3)}/>
  </Svg>;

export const ReferenceRunMetricsIcon = ({ size = 60, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 68 64">
    <Path d="M2 27h17M5 35h13M1 43h17" {...stroke(accentColor, 2.5)}/>
    <Circle cx="31" cy="11" r="5" fill={color}/><Path d="m29 19-7 11 10 6 7-12 8 7" {...stroke(color, 4)}/><Path d="m22 30-9 14M32 36l-5 15M38 24l-11-3" {...stroke(color, 4)}/>
    <Circle cx="55" cy="43" r="11" fill="#E7F9FB" stroke={color} strokeWidth="2.2"/><Path d="M55 43v-6M55 43l5 2M51 29h8" {...stroke(color, 2)}/>
  </Svg>;

export const ReferenceFoodDiaryIcon = ({ size = 112, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 128 104">
    <Ellipse cx="60" cy="94" rx="51" ry="7" fill="#BDDDE3" fillOpacity=".38"/>
    <G transform="rotate(-7 36 38)"><Rect x="8" y="8" width="54" height="66" rx="6" fill={WHITE} stroke={color} strokeWidth="2.7"/><Path d="M20 8v66M16 19h8M16 31h8M16 43h8M16 55h8" {...stroke(color, 2)}/><Path d="M30 25h23M30 37h23M30 49h18" {...stroke(accentColor, 2.5)}/><Path d="m27 23 2 2 4-5M27 35l2 2 4-5M27 47l2 2 4-5" {...stroke(accentColor, 2.2)}/></G>
    <Rect x="78" y="21" width="30" height="54" rx="8" fill="#C7F5F8" stroke={color} strokeWidth="2.5"/><Rect x="82" y="14" width="22" height="10" rx="3" fill={accentColor} fillOpacity=".65" stroke={color} strokeWidth="2"/><Path d="M80 34h26M80 58c9-5 17 4 27 0" {...stroke(accentColor, 2.5)}/>
    <Ellipse cx="60" cy="76" rx="39" ry="22" fill={WHITE} stroke={color} strokeWidth="2.8"/><Ellipse cx="60" cy="76" rx="31" ry="15" fill="#E7F8F5" stroke={TEAL_DARK} strokeWidth="1.5"/>
    <Path d="M39 78c8-13 16-12 26 0" stroke={ORANGE} strokeWidth="10" strokeLinecap="round"/><Path d="M40 74l18 8M45 68l18 8" stroke={color} strokeWidth="1.5" opacity=".65"/>
    <Circle cx="71" cy="76" r="8" fill={WHITE}/><Path d="M71 65c3-8 9-10 15-6M74 67c8-5 15-3 18 4" stroke={GREEN_DARK} strokeWidth="4" strokeLinecap="round"/>
  </Svg>;

export const ReferenceFoodSearchIcon = ({ size = 48, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Ellipse cx="23" cy="35" rx="17" ry="8" fill="#E9F6F4" stroke={color} strokeWidth="2"/><Circle cx="23" cy="25" r="14" fill={WHITE} stroke={color} strokeWidth="2.5"/><Path d="m34 36 12 12" {...stroke(color, 4)}/><Path d="M14 29c6-5 12-5 18 0" stroke={accentColor} strokeWidth="2" strokeLinecap="round"/></Svg>;

export const ReferenceBarcodeIcon = ({ size = 48, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Path d="M8 19V9h10M38 9h10v10M48 37v10H38M18 47H8V37" {...stroke(accentColor, 3)}/><Path d="M15 18v20M20 16v24M25 18v20M30 15v26M36 18v20M41 17v22" stroke={color} strokeWidth="2.2"/><Path d="M5 28h46" stroke={accentColor} strokeWidth="2" strokeLinecap="round"/></Svg>;

export const ReferenceRecentIcon = ({ size = 48, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Circle cx="28" cy="28" r="20" fill="#F5FCFD" stroke={color} strokeWidth="2.5"/><Circle cx="28" cy="28" r="13" fill="#E7F6F1" stroke={accentColor} strokeWidth="1.5"/><Path d="M28 28V17M28 28l8 3" {...stroke(color, 2.6)}/><Circle cx="28" cy="28" r="2.7" fill={accentColor}/><Path d="M17 34c7-5 14-5 22 0" stroke={GREEN_DARK} strokeWidth="2.2" strokeLinecap="round"/></Svg>;

export const ReferenceSavedMealsIcon = ({ size = 48, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 56"><Rect x="10" y="7" width="36" height="43" rx="4" fill="#E7F9FB" stroke={color} strokeWidth="2.5"/><Path d="M16 7v43M34 7v18l-6-4-6 4V7M20 34h19M20 41h15" {...stroke(color, 2.2)}/><Path d="M34 7v18l-6-4-6 4V7" fill={accentColor} fillOpacity=".55"/></Svg>;

export const ReferenceBreakfastIcon = ({ size = 54, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64"><Circle cx="27" cy="17" r="10" fill={GOLD} stroke={ORANGE} strokeWidth="2"/><Path d="M27 2v6M27 26v5M12 17H6M48 17h-6M16 6l4 5M38 6l-4 5" stroke={ORANGE} strokeWidth="2" strokeLinecap="round"/><Path d="M11 38h40c-2 13-9 19-20 19S13 51 11 38z" fill="#E9FBFC" stroke={color} strokeWidth="2.5"/><Path d="M17 38c2-8 9-10 15-4 4-7 11-5 14 4M17 57h29" {...stroke(accentColor, 2.2)}/></Svg>;

export const ReferenceLunchIcon = ({ size = 54, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64"><Circle cx="47" cy="13" r="8" fill={GOLD} stroke={ORANGE} strokeWidth="2"/><Path d="M9 35h45c-2 14-10 21-22 21S11 49 9 35z" fill={accentColor} fillOpacity=".55" stroke={color} strokeWidth="2.5"/><Path d="M15 35c1-9 9-12 15-5 3-10 12-13 18-4 5-3 9 0 8 9" {...stroke(GREEN_DARK, 3)}/><Path d="M18 29c2-8 6-12 11-13M31 30c3-8 8-11 13-11" stroke={GREEN} strokeWidth="4" strokeLinecap="round"/></Svg>;

export const ReferenceDinnerIcon = ({ size = 54, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64"><Path d="M9 47h46M13 43c0-16 7-26 19-26s19 10 19 26z" fill={accentColor} fillOpacity=".7" stroke={color} strokeWidth="2.6"/><Circle cx="32" cy="13" r="4" fill={accentColor} stroke={color} strokeWidth="2"/><Path d="M6 52h52" {...stroke(color, 2.8)}/><Path d="M18 39c8-8 18-11 28-8" stroke={WHITE} strokeWidth="2" strokeLinecap="round" opacity=".7"/></Svg>;

export const ReferenceSnacksIcon = ({ size = 54, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64"><Path d="M27 17c9-9 21-2 18 15-2 14-7 22-18 22S10 46 8 32C5 15 18 8 27 17z" fill="#B9DE67" stroke={GREEN_DARK} strokeWidth="2.5"/><Path d="M27 17c0-8 5-13 13-13M27 17c-5-5-10-4-14-1" {...stroke(GREEN_DARK, 2.6)}/><Ellipse cx="49" cy="44" rx="9" ry="5" fill={ORANGE} stroke="#9A5D26" strokeWidth="2" transform="rotate(-25 49 44)"/><Ellipse cx="52" cy="54" rx="8" ry="4" fill="#D99B48" stroke="#9A5D26" strokeWidth="2" transform="rotate(12 52 54)"/></Svg>;

export const ReferenceWaterBottleIcon = ({ size = 60, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 76"><Rect x="22" y="4" width="20" height="9" rx="3" fill={accentColor} stroke={color} strokeWidth="2"/><Path d="M19 13h26l5 11v45H14V24z" fill="#C8F5F8" stroke={color} strokeWidth="2.6"/><Path d="M15 43c10-7 22 7 34 0v24H15z" fill={accentColor} fillOpacity=".55"/><Path d="M32 27c-5 7-8 12-8 16a8 8 0 0 0 16 0c0-4-3-9-8-16z" fill={WHITE} fillOpacity=".82" stroke={accentColor} strokeWidth="1.5"/></Svg>;

export const ReferenceWaterDropIcon = ({ size = 28, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 36 46"><Path d="M18 3C12 13 5 22 5 30a13 13 0 0 0 26 0c0-8-7-17-13-27z" fill={accentColor} fillOpacity=".75" stroke={color} strokeWidth="2"/><Path d="M12 31c1 4 3 6 7 7" stroke={WHITE} strokeWidth="2.2" strokeLinecap="round" opacity=".8"/></Svg>;

export const ReferenceWaterGlassIcon = ({ size = 36, color = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 40 50"><Path d="M5 5h30l-4 40H9z" fill={filled ? color : WHITE} fillOpacity={filled ? .28 : .5} stroke={color} strokeWidth="2.6" strokeLinejoin="round"/><Path d="M10 30c7-4 14 4 21 0" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={filled ? 1 : .35}/></Svg>;

export const ReferenceHomeNavIcon = ({ size = 30, color = '#102B35', accentColor = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 52 48">
    <Path d="m5 22 17-14 17 14v19H27V29H17v12H5z" fill={filled ? accentColor : 'none'} fillOpacity={filled ? '.08' : '0'} stroke={color} strokeWidth="2.7" strokeLinejoin="round"/>
    <Circle cx="39" cy="37" r="8" fill={accentColor} stroke={WHITE} strokeWidth="1.5"/>
    <Path d="M34.5 34.5v5M37 33v8M41 33v8M43.5 34.5v5M37 37h4" stroke={WHITE} strokeWidth="1.6" strokeLinecap="round"/>
  </Svg>;

export const ReferenceFriendsNavIcon = ({ size = 30, color = '#102B35', accentColor = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 52 48"><Circle cx="18" cy="16" r="6.5" fill={filled ? accentColor : 'none'} fillOpacity=".1" stroke={color} strokeWidth="2.5"/><Circle cx="34" cy="19" r="5.3" fill={filled ? accentColor : 'none'} fillOpacity=".1" stroke={color} strokeWidth="2.3"/><Path d="M4 41c1-10 6-15 14-15s12 5 13 15M30 28c8 0 12 4 13 13" {...stroke(color, 2.5)}/></Svg>;

export const ReferenceTrainNavIcon = ({ size = 36, color = WHITE }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 40"><Path d="M4 13v14M10 8v24M16 12v16M40 12v16M46 8v24M52 13v14M16 20h24" {...stroke(color, 4)}/></Svg>;

export const ReferenceFoodNavIcon = ({ size = 30, color = '#102B35', accentColor = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 52 48"><Path d="M5 26h29c-1 10-6 15-14 15S6 36 5 26z" fill={filled ? accentColor : 'none'} fillOpacity=".12" stroke={color} strokeWidth="2.5"/><Path d="M10 26c2-7 8-9 12-4 3-7 9-8 13-2M9 41h24" {...stroke(color, 2.3)}/><Path d="M21 19c0-7 4-11 11-13-1 7-4 11-11 13z" fill={filled ? accentColor : 'none'} stroke={filled ? accentColor : color} strokeWidth="2"/><Path d="M43 7v35M39 7v13M47 7v13M39 14h8" {...stroke(color, 2.5)}/></Svg>;

export const ReferenceProfileNavIcon = ({ size = 30, color = '#102B35', accentColor = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 52 48"><Circle cx="26" cy="24" r="20" fill={filled ? accentColor : 'none'} fillOpacity=".08" stroke={color} strokeWidth="2.4"/><Circle cx="26" cy="17" r="6.2" fill={filled ? accentColor : 'none'} fillOpacity=".16" stroke={color} strokeWidth="2.3"/><Path d="M14 38c1-9 5-13 12-13s11 4 12 13" fill={filled ? accentColor : 'none'} fillOpacity=".12" stroke={color} strokeWidth="2.4" strokeLinecap="round"/></Svg>;
