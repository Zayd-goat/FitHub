import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

export type FitHubSocialIconName =
  | 'search'
  | 'personAdd'
  | 'dumbbell'
  | 'medal'
  | 'progress'
  | 'check'
  | 'envelope'
  | 'calendar'
  | 'location'
  | 'people'
  | 'share'
  | 'lock'
  | 'list'
  | 'grid'
  | 'comment'
  | 'send'
  | 'edit'
  | 'globe'
  | 'clock'
  | 'chevron'
  | 'close';

type Props = {
  name: FitHubSocialIconName;
  size?: number;
  color?: string;
  accentColor?: string;
  filled?: boolean;
};

const stroke = (color: string, width = 2) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function FitHubSocialIcon({ name, size = 24, color = '#10252C', accentColor = '#19BFD9', filled = false }: Props) {
  const line = stroke(color);
  const accent = stroke(accentColor);
  const softFill = filled ? accentColor : 'none';

  return <Svg width={size} height={size} viewBox="0 0 24 24">
    {name === 'search' ? <G>
      <Circle cx="10.5" cy="10.5" r="6.6" {...line}/>
      <Line x1="15.4" y1="15.4" x2="21" y2="21" {...line}/>
      <Path d="M7.3 10.5c.8-1.5 1.9-2.2 3.4-2.2" {...accent}/>
    </G> : null}

    {name === 'personAdd' ? <G>
      <Circle cx="9" cy="7.1" r="3.7" {...line} fill={softFill} fillOpacity={filled ? .14 : 0}/>
      <Path d="M2.7 20c.5-4.6 2.7-7 6.3-7s5.8 2.4 6.3 7" {...line}/>
      <Path d="M18.5 11.5v7M15 15h7" {...accent}/>
    </G> : null}

    {name === 'dumbbell' ? <G>
      <Path d="M7 12h10" {...line}/>
      <Rect x="2" y="8" width="3" height="8" rx="1.4" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .18 : 0}/>
      <Rect x="19" y="8" width="3" height="8" rx="1.4" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .18 : 0}/>
      <Path d="M5 9.5v5M19 9.5v5" {...accent}/>
    </G> : null}

    {name === 'medal' ? <G>
      <Path d="m7 2 3.2 6M17 2l-3.2 6M8.5 2h7" {...line}/>
      <Circle cx="12" cy="14.5" r="6" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .13 : 0}/>
      <Path d="m12 10.8 1.1 2.2 2.4.3-1.7 1.8.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.7-1.8 2.4-.3z" {...accent}/>
    </G> : null}

    {name === 'progress' ? <G>
      <Path d="M3 20h18M5 17v-4M10 17V9M15 17v-7M20 17V5" {...line}/>
      <Path d="m5 10 5-4 4 2 6-5" {...accent}/>
      <Path d="M17 3h3v3" {...accent}/>
    </G> : null}

    {name === 'check' ? <G>
      <Circle cx="12" cy="12" r="9" fill={filled ? accentColor : 'none'} stroke={filled ? accentColor : color} strokeWidth="2"/>
      <Path d="m7.5 12.2 3 3 6.2-6.5" fill="none" stroke={filled ? '#FFFFFF' : accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </G> : null}

    {name === 'envelope' ? <G>
      <Rect x="2.5" y="5" width="19" height="14" rx="2.5" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .1 : 0}/>
      <Path d="m4 7 8 6 8-6" {...accent}/>
    </G> : null}

    {name === 'calendar' ? <G>
      <Rect x="3" y="4.5" width="18" height="16" rx="3" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .1 : 0}/>
      <Path d="M7 2.5v4M17 2.5v4M3 9h18" {...line}/>
      <Path d="M7.5 13h3M13.5 13h3M7.5 17h3" {...accent}/>
    </G> : null}

    {name === 'location' ? <G>
      <Path d="M12 22s7-6.2 7-13a7 7 0 1 0-14 0c0 6.8 7 13 7 13z" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .12 : 0}/>
      <Circle cx="12" cy="9" r="2.4" {...accent}/>
    </G> : null}

    {name === 'people' ? <G>
      <Circle cx="8" cy="8" r="3.2" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .12 : 0}/>
      <Circle cx="17.5" cy="9.5" r="2.5" {...line}/>
      <Path d="M2.2 20c.4-4.5 2.4-6.8 5.8-6.8s5.4 2.3 5.8 6.8M14.5 14.2c3.9-1.3 6.8 1.1 7.3 5.8" {...line}/>
    </G> : null}

    {name === 'share' ? <G>
      <Path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" {...accent}/>
      <Path d="M5 11v8.5h14V11" {...line}/>
    </G> : null}

    {name === 'lock' ? <G>
      <Rect x="4" y="10" width="16" height="11" rx="2.5" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .1 : 0}/>
      <Path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" {...line}/>
      <Circle cx="12" cy="15" r="1.2" fill={accentColor}/>
    </G> : null}

    {name === 'list' ? <G>
      <Circle cx="4" cy="6" r="1" fill={accentColor}/><Circle cx="4" cy="12" r="1" fill={accentColor}/><Circle cx="4" cy="18" r="1" fill={accentColor}/>
      <Path d="M8 6h13M8 12h13M8 18h13" {...line}/>
    </G> : null}

    {name === 'grid' ? <G>
      <Rect x="3" y="3" width="7" height="7" rx="1.3" {...line}/><Rect x="14" y="3" width="7" height="7" rx="1.3" {...line}/>
      <Rect x="3" y="14" width="7" height="7" rx="1.3" {...line}/><Rect x="14" y="14" width="7" height="7" rx="1.3" {...line}/>
    </G> : null}

    {name === 'comment' ? <Path d="M4 4.5h16v11H9l-5 4v-15z" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .12 : 0}/> : null}

    {name === 'send' ? <G>
      <Path d="m3 4 18 8-18 8 3-8z" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .16 : 0}/>
      <Path d="M6 12h9" {...accent}/>
    </G> : null}

    {name === 'edit' ? <G>
      <Path d="M4 20h4l11-11-4-4L4 16z" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .12 : 0}/>
      <Path d="m13.5 6.5 4 4M4 20h16" {...accent}/>
    </G> : null}

    {name === 'globe' ? <G>
      <Circle cx="12" cy="12" r="9" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .1 : 0}/>
      <Path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9z" {...line}/>
    </G> : null}

    {name === 'clock' ? <G>
      <Circle cx="12" cy="12" r="9" {...line} fill={filled ? accentColor : 'none'} fillOpacity={filled ? .1 : 0}/>
      <Path d="M12 7v5l3.5 2" {...accent}/>
    </G> : null}

    {name === 'chevron' ? <Path d="m9 5 7 7-7 7" {...line}/> : null}
    {name === 'close' ? <Path d="M5 5l14 14M19 5 5 19" {...line}/> : null}
  </Svg>;
}
