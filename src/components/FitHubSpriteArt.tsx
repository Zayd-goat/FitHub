import React from 'react';
import {
  Image,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type SpriteQuadrant = 0 | 1 | 2 | 3;

type Props = {
  source: ImageSourcePropType;
  quadrant: SpriteQuadrant;
  size: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Displays one cell from an exact 2 x 2 transparent artwork sheet.
 * The crop stays native and resolution independent, so one production sheet
 * can supply a complete family of visually matched mini-scenes.
 */
export function FitHubSpriteArt({ source, quadrant, size, style, accessibilityLabel }: Props) {
  const column = quadrant % 2;
  const row = Math.floor(quadrant / 2);

  return <View
    pointerEvents="none"
    accessible={Boolean(accessibilityLabel)}
    accessibilityRole={accessibilityLabel ? 'image' : undefined}
    accessibilityLabel={accessibilityLabel}
    style={[{ width: size, height: size, overflow: 'hidden' }, style]}
  >
    <Image
      source={source}
      resizeMode="stretch"
      accessibilityIgnoresInvertColors
      style={{
        position: 'absolute',
        width: size * 2,
        height: size * 2,
        left: -column * size,
        top: -row * size,
      }}
    />
  </View>;
}
