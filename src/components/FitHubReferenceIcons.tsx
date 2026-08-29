import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

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
    <Path d="M11 53c3-8 17-5 18-14 1-7-12-7-10-15 1-6 12-7 20-7" {...stroke(color, 4)}/>
    <Circle cx="11" cy="53" r="4" fill={accentColor} stroke={TEAL_DARK} strokeWidth="2"/>
    <Circle cx="28" cy="39" r="3" fill={accentColor}/><Circle cx="20" cy="24" r="3" fill={accentColor}/>
    <Path d="M39 7v19" {...stroke(color, 2.6)}/><Path d="M40 8h14l-4 5 4 5H40z" fill={accentColor} stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    <Path d="M37 50v7M42 47v13M54 47v13M59 50v7M42 54h12" {...stroke(color, 2.8)}/>
    <Circle cx="48" cy="54" r="7" fill={accentColor}/><Path d="M45 54h6M48 51v6" stroke={WHITE} strokeWidth="1.8" strokeLinecap="round"/>
  </Svg>;

export const ReferenceNutritionIcon = ({ size = 58, color = '#102B35', accentColor = '#19BFD9' }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M8 33h37c-1 14-8 21-19 21S9 47 8 33z" fill={accentColor} fillOpacity=".18" stroke={color} strokeWidth="2.6" strokeLinejoin="round"/>
    <Path d="M14 33c2-8 9-11 15-5 3-8 11-10 16-3" {...stroke(TEAL_DARK, 2.2)}/><Path d="M13 54h29" {...stroke(color, 2.5)}/>
    <Path d="M25 25c-1-9 3-14 12-16-1 9-5 14-12 16z" fill={GREEN} stroke={GREEN_DARK} strokeWidth="1.8"/>
    <Path d="M26 25c-4-8-10-10-17-7 3 7 8 10 17 7z" fill="#77C95A" stroke={GREEN_DARK} strokeWidth="1.8"/>
    <Path d="M53 13v39M48 13v14M58 13v14M48 21h10" {...stroke(color, 2.6)}/>
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
    <Circle cx="30" cy="10" r="5" fill={color}/><Path d="m28 18-7 11 10 6 7-12 8 7" {...stroke(color, 4)}/><Path d="m21 29-9 13M31 35l-4 15M37 23l-11-3" {...stroke(color, 4)}/>
    <Path d="M6 50c10 5 22 4 31-2 9-6 17-6 25-2" {...stroke(accentColor, 3.5)}/><Path d="M10 55c13 4 27 2 38-4" {...stroke(accentColor, 2)}/>
    <Circle cx="55" cy="17" r="9" fill="#E4F8FA" stroke={color} strokeWidth="2"/><Path d="M55 17v-5M55 17l4 2M52 5h6" {...stroke(color, 1.8)}/>
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
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="m6 23 18-15 18 15v19H29V29H19v13H6z" fill={filled ? accentColor : 'none'} stroke={color} strokeWidth="2.8" strokeLinejoin="round"/><Rect x="21" y="31" width="6" height="11" rx="1" fill={filled ? WHITE : 'none'}/></Svg>;

export const ReferenceFriendsNavIcon = ({ size = 30, color = '#102B35', accentColor = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="17" cy="17" r="7" fill={filled ? accentColor : 'none'} stroke={color} strokeWidth="2.5"/><Circle cx="33" cy="20" r="5.5" fill={filled ? accentColor : 'none'} fillOpacity=".75" stroke={color} strokeWidth="2.3"/><Path d="M4 42c1-11 5-16 13-16s12 5 13 16M29 29c8 0 12 5 13 13" {...stroke(color, 2.5)}/></Svg>;

export const ReferenceTrainNavIcon = ({ size = 36, color = WHITE }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 56 40"><Path d="M4 13v14M10 8v24M16 12v16M40 12v16M46 8v24M52 13v14M16 20h24" {...stroke(color, 4)}/></Svg>;

export const ReferenceFoodNavIcon = ({ size = 30, color = '#102B35', accentColor = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M8 6v16M13 6v16M8 14h5M10.5 22v20M37 6v36M37 6c-7 7-7 17 0 21" {...stroke(color, 2.8)}/><Path d="M22 34c3-8 8-11 14-8-1 7-5 11-12 12" fill={filled ? accentColor : 'none'} stroke={filled ? accentColor : color} strokeWidth="2.2"/></Svg>;

export const ReferenceProfileNavIcon = ({ size = 30, color = '#102B35', accentColor = '#19BFD9', filled = false }: ReferenceIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Circle cx="24" cy="15" r="8" fill={filled ? accentColor : 'none'} stroke={color} strokeWidth="2.6"/><Path d="M7 43c2-12 8-18 17-18s15 6 17 18" fill={filled ? accentColor : 'none'} fillOpacity=".3" stroke={color} strokeWidth="2.6" strokeLinecap="round"/></Svg>;
