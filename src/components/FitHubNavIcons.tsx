import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  accentColor?: string;
  filled?: boolean;
};

const line = (color: string, width = 2.4) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const FitHubHomeNavIcon = ({ size = 29, color = '#6C858D', accentColor = '#19BFD9', filled = false }: Props) =>
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M6 22 24 7l18 15v19H29V29H19v12H6z" fill={filled ? accentColor : 'none'} fillOpacity={filled ? .13 : 0} stroke={color} strokeWidth="2.6" strokeLinejoin="round"/>
    <Path d="M11 20v-7h7" {...line(color, 2.5)}/>
    <G transform="translate(31 32)"><Line x1="0" y1="5" x2="11" y2="5" stroke={filled ? accentColor : color} strokeWidth="2.5" strokeLinecap="round"/><Line x1="2" y1="1" x2="2" y2="9" stroke={filled ? accentColor : color} strokeWidth="2.5" strokeLinecap="round"/><Line x1="9" y1="1" x2="9" y2="9" stroke={filled ? accentColor : color} strokeWidth="2.5" strokeLinecap="round"/></G>
  </Svg>;

export const FitHubFriendsNavIcon = ({ size = 29, color = '#6C858D', accentColor = '#19BFD9', filled = false }: Props) =>
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx="18" cy="16" r="7" fill={filled ? accentColor : 'none'} fillOpacity={filled ? .12 : 0} stroke={color} strokeWidth="2.5"/>
    <Circle cx="34" cy="19" r="5.5" fill="none" stroke={color} strokeWidth="2.3"/>
    <Path d="M5 40c1-9 6-14 13-14s12 5 13 14M28 29c7-2 13 3 15 11" {...line(color, 2.5)}/>
    {filled ? <Circle cx="42" cy="8" r="3" fill={accentColor}/> : null}
  </Svg>;

export const FitHubTrainNavIcon = ({ size = 35, color = '#FFFFFF' }: Props) =>
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Path d="M13 28h30" {...line(color, 3.3)}/>
    <Rect x="7" y="19" width="6" height="18" rx="3" fill="none" stroke={color} strokeWidth="3"/>
    <Rect x="43" y="19" width="6" height="18" rx="3" fill="none" stroke={color} strokeWidth="3"/>
    <Path d="M3 22v12M53 22v12M21 24v8M35 24v8" {...line(color, 3)}/>
    <Circle cx="28" cy="28" r="3" fill={color}/>
  </Svg>;

export const FitHubFoodNavIcon = ({ size = 29, color = '#6C858D', accentColor = '#19BFD9', filled = false }: Props) =>
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path d="M5 25h26c-1 10-5 15-13 15S6 35 5 25z" fill={filled ? accentColor : 'none'} fillOpacity={filled ? .13 : 0} stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    <Path d="M9 40h18M18 21c0-7 4-11 11-13-1 7-4 11-11 13zM18 21C14 15 9 14 5 17c3 4 7 6 13 4zM38 8v32M34 8v11M42 8v11M34 14h8" {...line(color, 2.4)}/>
    {filled ? <Circle cx="18" cy="30" r="3" fill={accentColor}/> : null}
  </Svg>;

export const FitHubProfileNavIcon = ({ size = 29, color = '#6C858D', accentColor = '#19BFD9', filled = false }: Props) =>
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx="24" cy="15" r="9" fill={filled ? accentColor : 'none'} fillOpacity={filled ? .12 : 0} stroke={color} strokeWidth="2.6"/>
    <Path d="M7 42c1-11 7-17 17-17s16 6 17 17" {...line(color, 2.7)}/>
    {filled ? <Path d="M18 15c2 2 10 2 12 0" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round"/> : null}
  </Svg>;
