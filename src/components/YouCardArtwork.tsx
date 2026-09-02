import React from 'react';
import { Image, StyleSheet } from 'react-native';

export type YouCardArtworkKind =
  | 'journey'
  | 'supplements'
  | 'workoutSplit'
  | 'gymTogether'
  | 'customize'
  | 'weeklySplit'
  | 'clubs';

const artwork = {
  journey: require('../../assets/you_ui_v1/journey.png'),
  supplements: require('../../assets/you_ui_v1/supplements.png'),
  workoutSplit: require('../../assets/you_ui_v1/workout_split.png'),
  gymTogether: require('../../assets/you_ui_v1/gym_together.png'),
  customize: require('../../assets/you_ui_v1/customize.png'),
  weeklySplit: require('../../assets/you_ui_v1/weekly_split.png'),
  clubs: require('../../assets/you_ui_v1/clubs.png'),
} as const;

export function YouCardArtwork({ kind, width, height }: { kind: YouCardArtworkKind; width: number; height: number }) {
  return <Image
    source={artwork[kind]}
    style={[styles.image, { width, height }]}
    resizeMode="contain"
    fadeDuration={0}
    accessible={false}
    accessibilityIgnoresInvertColors
  />;
}

const styles = StyleSheet.create({ image: { alignSelf: 'center' } });
