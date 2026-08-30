import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

export type FoodIconProps = {
  size?: number;
  color?: string;
  accentColor?: string;
  surfaceColor?: string;
  filled?: boolean;
};

const stroke = (color: string, width = 2.5) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const WHITE = '#FFFFFF';
const SUN = '#F7C54B';
const SUN_DARK = '#E89B2F';
const LEAF = '#4FAF63';
const LEAF_DARK = '#2F7F4B';
const FOOD = '#F4B448';
const NUT = '#B97A3E';

export const FoodScreenBackdrop = ({ color = '#19BFD9' }: FoodIconProps) =>
  <Svg width="100%" height="100%" viewBox="0 0 390 920" preserveAspectRatio="xMidYMid slice">
    <G opacity=".045" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M-16 158h82M-4 147v22M8 140v36M42 140v36M54 147v22"/>
      <Circle cx="31" cy="158" r="16"/><Circle cx="31" cy="158" r="5"/>
      <Rect x="288" y="54" width="40" height="55" rx="11"/><Path d="M298 54v-9h20v9M290 77c11-7 24 7 36 0"/>
      <Ellipse cx="330" cy="376" rx="43" ry="17"/><Ellipse cx="330" cy="376" rx="31" ry="10"/><Path d="M365 392l17 17M378 405l-5 5"/>
      <Path d="M15 630h93M27 617v27M38 608v45M84 608v45M95 617v27"/>
      <Circle cx="61" cy="630" r="20"/><Circle cx="61" cy="630" r="7"/>
      <Rect x="300" y="728" width="45" height="62" rx="12"/><Path d="M310 728v-10h25v10M302 758c13-8 27 8 41 0"/>
      <Path d="M135 846c15-14 34-14 50 0M128 846h64M160 826v-8"/>
    </G>
    <G opacity=".055" fill={color}>
      <Circle cx="350" cy="188" r="2.5"/><Circle cx="362" cy="188" r="2.5"/><Circle cx="374" cy="188" r="2.5"/>
      <Circle cx="350" cy="200" r="2.5"/><Circle cx="362" cy="200" r="2.5"/><Circle cx="374" cy="200" r="2.5"/>
      <Circle cx="20" cy="438" r="2.5"/><Circle cx="32" cy="438" r="2.5"/><Circle cx="44" cy="438" r="2.5"/>
    </G>
  </Svg>;

export const FoodCalendarIcon = ({ size = 28, color = '#19BFD9', accentColor = color }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect x="6" y="9" width="36" height="33" rx="7" fill={accentColor} fillOpacity=".09" stroke={color} strokeWidth="2.7"/>
    <Path d="M6 19h36M16 5v9M32 5v9" {...stroke(color, 2.7)}/>
    {[16,24,32].flatMap((x) => [27,35].map((y) => <Circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill={accentColor}/>))}
  </Svg>;

export const FoodChevronIcon = ({ size = 22, color = '#10252C', direction = 'down' }: FoodIconProps & { direction?: 'left'|'right'|'up'|'down' }) => {
  const d = direction === 'left' ? 'M30 9 16 24l14 15' : direction === 'right' ? 'M18 9l14 15-14 15' : direction === 'up' ? 'M9 30 24 16l15 14' : 'M9 18l15 14 15-14';
  return <Svg width={size} height={size} viewBox="0 0 48 48"><Path d={d} {...stroke(color, 3.1)}/></Svg>;
};

export const FoodPlusIcon = ({ size = 28, color = WHITE }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 48 48"><Path d="M24 8v32M8 24h32" {...stroke(color, 3.3)}/></Svg>;

export const FoodDiarySceneIcon = ({ size = 120, color = '#10252C', accentColor = '#19BFD9', surfaceColor = WHITE }: FoodIconProps) =>
  <Svg width={size} height={size * .82} viewBox="0 0 148 122">
    <Ellipse cx="69" cy="112" rx="64" ry="7" fill={accentColor} fillOpacity=".12"/>
    <G transform="rotate(-4 48 77)">
      <Rect x="7" y="45" width="82" height="57" rx="13" fill={surfaceColor} stroke={color} strokeWidth="3"/>
      <Path d="M12 71h72M48 48v49" {...stroke(color, 2.2)}/>
      <Path d="M17 56h24v10H17zM17 78h24v16H17zM54 52h25v15H54zM54 77h25v17H54z" fill={accentColor} fillOpacity=".16" stroke={accentColor} strokeWidth="1.5" strokeLinejoin="round"/>
      <Circle cx="26" cy="84" r="5" fill={FOOD}/><Circle cx="35" cy="86" r="4" fill={FOOD}/>
      <Path d="M58 59c5-8 11-8 17 0M57 84c4-5 9-5 14 0" stroke={LEAF} strokeWidth="4" strokeLinecap="round"/>
    </G>
    <G>
      <Rect x="91" y="19" width="30" height="66" rx="9" fill={accentColor} fillOpacity=".22" stroke={color} strokeWidth="2.7"/>
      <Rect x="96" y="10" width="20" height="12" rx="4" fill={accentColor} stroke={color} strokeWidth="2.1"/>
      <Path d="M93 39h26M93 62c8-5 16 5 26 0" {...stroke(accentColor, 2.5)}/>
    </G>
    <G transform="rotate(5 120 76)">
      <Rect x="104" y="50" width="38" height="56" rx="6" fill={surfaceColor} stroke={color} strokeWidth="2.6"/>
      <Rect x="113" y="44" width="20" height="9" rx="3" fill={accentColor} fillOpacity=".5" stroke={color} strokeWidth="2"/>
      <Path d="m112 66 3 3 5-6M112 79l3 3 5-6M124 67h11M124 80h11M112 93h23" {...stroke(color, 1.9)}/>
      <Circle cx="136" cy="103" r="9" fill={accentColor} stroke={surfaceColor} strokeWidth="2"/><Path d="m132 103 3 3 6-7" {...stroke(WHITE, 2.2)}/>
    </G>
  </Svg>;

export const FoodSearchDiscoveryIcon = ({ size = 50, color = '#10252C', accentColor = '#19BFD9', surfaceColor = WHITE }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Ellipse cx="25" cy="35" rx="18" ry="8" fill={accentColor} fillOpacity=".10" stroke={color} strokeWidth="2.3"/>
    <Circle cx="25" cy="25" r="15" fill={surfaceColor} stroke={color} strokeWidth="2.8"/>
    <Circle cx="25" cy="25" r="8" fill={accentColor} fillOpacity=".16"/>
    <Path d="m36 36 14 14" {...stroke(color, 4)}/>
    <Path d="m47 8 1.5 3.5L52 13l-3.5 1.5L47 18l-1.5-3.5L42 13l3.5-1.5z" fill={accentColor}/>
  </Svg>;

export const FoodScanFrameIcon = ({ size = 50, color = '#10252C', accentColor = '#19BFD9' }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Path d="M8 20V8h12M40 8h12v12M52 40v12H40M20 52H8V40" {...stroke(accentColor, 3.2)}/>
    <Path d="M17 19v22M22 17v26M27 20v20M32 17v26M38 19v22M43 18v24" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <Path d="M6 30h48" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round"/>
  </Svg>;

export const FoodRecentTrayIcon = ({ size = 50, color = '#10252C', accentColor = '#19BFD9', surfaceColor = WHITE }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Circle cx="25" cy="24" r="17" fill={surfaceColor} stroke={color} strokeWidth="2.7"/>
    <Path d="M25 24V13M25 24l8 4" {...stroke(color, 2.7)}/><Circle cx="25" cy="24" r="2.5" fill={accentColor}/>
    <Rect x="29" y="36" width="24" height="14" rx="5" fill={accentColor} fillOpacity=".18" stroke={color} strokeWidth="2.3"/>
    <Path d="M33 36c2-6 14-6 16 0M27 52h28" {...stroke(color, 2.2)}/>
  </Svg>;

export const FoodSavedRecipeIcon = ({ size = 50, color = '#10252C', accentColor = '#19BFD9', surfaceColor = WHITE }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Rect x="10" y="7" width="40" height="47" rx="7" fill={surfaceColor} stroke={color} strokeWidth="2.7"/>
    <Path d="M17 7v47M37 7v19l-7-5-7 5V7" {...stroke(color, 2.3)}/>
    <Path d="M37 7v19l-7-5-7 5V7" fill={accentColor} fillOpacity=".55"/>
    <Path d="M23 36h19M23 44h14" {...stroke(color, 2.2)}/>
  </Svg>;

export const FoodBreakfastPlateIcon = ({ size = 60, color = '#10252C', accentColor = '#19BFD9', surfaceColor = WHITE }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 72 68">
    <Circle cx="25" cy="14" r="9" fill={SUN} stroke={SUN_DARK} strokeWidth="2"/>
    <Path d="M25 1v5M25 22v5M11 14H5M45 14h-6M15 4l4 4M35 4l-4 4" stroke={SUN_DARK} strokeWidth="2" strokeLinecap="round"/>
    <Ellipse cx="31" cy="45" rx="25" ry="15" fill={surfaceColor} stroke={color} strokeWidth="2.7"/>
    <Ellipse cx="31" cy="45" rx="18" ry="10" fill={accentColor} fillOpacity=".08" stroke={accentColor} strokeWidth="1.4"/>
    <Path d="M20 45c0-5 4-8 9-8s9 3 9 8-4 8-9 8-9-3-9-8z" fill={WHITE} stroke={color} strokeWidth="1.7"/><Circle cx="29" cy="45" r="3.5" fill={SUN}/>
    <Path d="M61 29v31M56 29v12M66 29v12M56 36h10" {...stroke(color, 2.6)}/>
  </Svg>;

export const FoodLunchBentoIcon = ({ size = 60, color = '#10252C', accentColor = '#19BFD9', surfaceColor = WHITE }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 72 68">
    <Rect x="8" y="15" width="52" height="43" rx="10" fill={surfaceColor} stroke={color} strokeWidth="2.7"/>
    <Path d="M8 36h52M35 15v43" {...stroke(color, 2.1)}/>
    <Path d="M14 21h15v9H14zM14 42h15v10H14zM41 21h13v9H41zM41 42h13v10H41z" fill={accentColor} fillOpacity=".18" stroke={accentColor} strokeWidth="1.2"/>
    <Circle cx="47" cy="25" r="4" fill={FOOD}/><Circle cx="21" cy="47" r="4" fill={FOOD}/>
    <Path d="M53 13c1-8 6-11 13-10-1 7-5 11-13 10zM53 13c-7-7-12-7-16-3 4 5 9 6 16 3z" fill={LEAF} stroke={LEAF_DARK} strokeWidth="1.6"/>
    <Path d="M12 61h44" {...stroke(color, 2.3)}/>
  </Svg>;

export const FoodDinnerClocheIcon = ({ size = 60, color = '#10252C', accentColor = '#19BFD9' }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 72 68">
    <Path d="M17 19c-4-5 5-7 1-12M32 17c-4-5 5-7 1-12M47 19c-4-5 5-7 1-12" {...stroke(color, 2.2)}/>
    <Circle cx="36" cy="25" r="4" fill={accentColor} stroke={color} strokeWidth="2"/>
    <Path d="M11 52c0-18 9-29 25-29s25 11 25 29z" fill={accentColor} fillOpacity=".28" stroke={color} strokeWidth="2.8"/>
    <Path d="M15 47c11-11 26-15 41-9" stroke={WHITE} strokeWidth="2" strokeLinecap="round" opacity=".72"/>
    <Path d="M7 53h58M12 59h48" {...stroke(color, 2.7)}/>
  </Svg>;

export const FoodSnacksPouchIcon = ({ size = 60, color = '#10252C', accentColor = '#19BFD9', surfaceColor = WHITE }: FoodIconProps) =>
  <Svg width={size} height={size} viewBox="0 0 72 68">
    <Path d="M13 10h38l4 49H9z" fill={surfaceColor} stroke={color} strokeWidth="2.7" strokeLinejoin="round"/>
    <Path d="M13 18h38M11 48c13-7 27 7 42 0" {...stroke(accentColor, 2.2)}/>
    <Path d="M32 28c7-7 16-2 14 9-1 9-6 14-14 14s-13-5-14-14c-2-11 7-16 14-9z" fill={SUN} stroke={SUN_DARK} strokeWidth="1.8"/>
    <Path d="M32 28c0-6 4-9 10-10" {...stroke(LEAF_DARK, 2.1)}/><Path d="M32 26c-5-4-9-4-12-1 3 4 7 5 12 1z" fill={LEAF}/>
    <Ellipse cx="59" cy="48" rx="8" ry="5" fill={NUT} stroke={color} strokeWidth="1.4" transform="rotate(-24 59 48)"/>
    <Ellipse cx="60" cy="58" rx="7" ry="4" fill={FOOD} stroke={color} strokeWidth="1.4" transform="rotate(15 60 58)"/>
  </Svg>;

export const FoodWaterBottleIcon = ({ size = 64, color = '#10252C', accentColor = '#19BFD9' }: FoodIconProps) =>
  <Svg width={size} height={size * 1.12} viewBox="0 0 68 78">
    <Rect x="22" y="3" width="24" height="10" rx="4" fill={accentColor} stroke={color} strokeWidth="2.4"/>
    <Path d="M18 13h32l5 12v47H13V25z" fill={accentColor} fillOpacity=".16" stroke={color} strokeWidth="2.9"/>
    <Path d="M15 47c12-8 25 8 38 0v23H15z" fill={accentColor} fillOpacity=".65"/>
    <Path d="M34 27c-6 8-9 13-9 18a9 9 0 0 0 18 0c0-5-3-10-9-18z" fill={WHITE} fillOpacity=".9" stroke={accentColor} strokeWidth="1.7"/>
  </Svg>;

export const FoodWaterDropIcon = ({ size = 26, color = '#10252C', accentColor = '#19BFD9' }: FoodIconProps) =>
  <Svg width={size} height={size * 1.2} viewBox="0 0 38 46"><Path d="M19 3C12 14 5 23 5 31a14 14 0 0 0 28 0c0-8-7-17-14-28z" fill={accentColor} fillOpacity=".7" stroke={color} strokeWidth="2.2"/><Path d="M12 31c1 5 4 8 8 9" stroke={WHITE} strokeWidth="2" strokeLinecap="round" opacity=".8"/></Svg>;

export const FoodWaterGlassIcon = ({ size = 36, color = '#19BFD9', filled = false }: FoodIconProps) =>
  <Svg width={size} height={size * 1.18} viewBox="0 0 42 52"><Path d="M5 5h32l-4 42H9z" fill={color} fillOpacity={filled ? '.25' : '.03'} stroke={color} strokeWidth="2.6" strokeLinejoin="round"/><Path d="M10 32c8-4 15 4 23 0" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={filled ? 1 : .35}/></Svg>;
