import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AlertButton, AlertOptions } from 'react-native';
import { useTheme } from './UI';

type AlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

const nativeAlert = Alert.alert.bind(Alert);
let nextAlertId = 1;

/**
 * Renders every Alert.alert call as an accessible FitHub action sheet.
 * Android Back, the close control, and the dimmed backdrop always dismiss
 * the current sheet so users are never trapped into selecting an action.
 */
export default function FitHubAlertProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [queue, setQueue] = useState<AlertRequest[]>([]);
  const current = queue[0] ?? null;
  const currentRef = useRef<AlertRequest | null>(current);
  currentRef.current = current;

  const present = useCallback((title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
    const choices = buttons?.length ? [...buttons] : [{ text: 'OK' }];
    setQueue((previous) => [...previous, {
      id: nextAlertId++,
      title: String(title ?? ''),
      message: message == null ? undefined : String(message),
      buttons: choices,
      options,
    }]);
  }, []);

  useEffect(() => {
    const replacement = (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
      present(title, message, buttons, options);
    };
    Alert.alert = replacement;
    return () => {
      if (Alert.alert === replacement) Alert.alert = nativeAlert;
    };
  }, [present]);

  const removeCurrent = useCallback(() => {
    const request = currentRef.current;
    if (!request) return;
    currentRef.current = null;
    setQueue((previous) => previous[0]?.id === request.id
      ? previous.slice(1)
      : previous.filter((item) => item.id !== request.id));
  }, []);

  const dismiss = useCallback(() => {
    const request = currentRef.current;
    if (!request) return;
    removeCurrent();
    setTimeout(() => request.options?.onDismiss?.(), 0);
  }, [removeCurrent]);

  const select = useCallback((button: AlertButton) => {
    if (!currentRef.current) return;
    removeCurrent();
    setTimeout(() => button.onPress?.(), 0);
  }, [removeCurrent]);

  return <>
    {children}
    <Modal
      visible={Boolean(current)}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
        />
        {current ? <View style={styles.sheet}>
          <View style={styles.handle}/>
          <View style={styles.header}>
            <View style={styles.brandMark} accessibilityElementsHidden>
              <View style={styles.dumbbellBar}/>
              <View style={[styles.dumbbellPlate, styles.plateLeftOuter]}/>
              <View style={[styles.dumbbellPlate, styles.plateLeftInner]}/>
              <View style={[styles.dumbbellPlate, styles.plateRightInner]}/>
              <View style={[styles.dumbbellPlate, styles.plateRightOuter]}/>
            </View>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>FITHUB</Text>
              <Text style={styles.title}>{current.title}</Text>
            </View>
            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <ScrollView
            style={styles.actionsScroll}
            contentContainerStyle={styles.actions}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {current.buttons.map((button, index) => {
              const destructive = button.style === 'destructive';
              const cancel = button.style === 'cancel';
              const label = button.text || 'OK';
              return <Pressable
                key={`${current.id}-${index}-${label}`}
                onPress={() => select(button)}
                style={({ pressed }) => [
                  styles.action,
                  destructive && styles.actionDestructive,
                  cancel && styles.actionCancel,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <View style={[
                  styles.actionMark,
                  destructive && styles.actionMarkDestructive,
                  cancel && styles.actionMarkCancel,
                ]}>
                  <Text style={[
                    styles.actionMarkText,
                    destructive && styles.destructiveText,
                    cancel && styles.cancelText,
                  ]}>{destructive ? '×' : cancel ? '–' : '✓'}</Text>
                </View>
                <Text style={[
                  styles.actionText,
                  destructive && styles.destructiveText,
                  cancel && styles.cancelText,
                ]}>{label}</Text>
                {!cancel ? <Text style={[styles.chevron, destructive && styles.destructiveText]}>›</Text> : null}
              </Pressable>;
            })}
          </ScrollView>
          <Text style={styles.dismissHint}>Tap outside or use your phone’s Back button to close</Text>
        </View> : null}
      </View>
    </Modal>
  </>;
}

const makeStyles = (colors: any) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: 'rgba(4, 14, 18, .68)',
  },
  sheet: {
    maxHeight: '86%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: 17,
    paddingTop: 9,
    paddingBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: .28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 13,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dumbbellBar: { width: 27, height: 3, borderRadius: 2, backgroundColor: colors.primary },
  dumbbellPlate: { position: 'absolute', width: 3, borderRadius: 2, backgroundColor: colors.primary },
  plateLeftOuter: { left: 10, height: 17 },
  plateLeftInner: { left: 15, height: 12 },
  plateRightInner: { right: 15, height: 12 },
  plateRightOuter: { right: 10, height: 17 },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.25 },
  title: { color: colors.text, fontSize: 22, lineHeight: 27, fontWeight: '900', marginTop: 2 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.text, fontSize: 28, lineHeight: 30, fontWeight: '400', marginTop: -2 },
  message: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 13, marginBottom: 4 },
  actionsScroll: { marginTop: 9 },
  actions: { gap: 8, paddingBottom: 2 },
  action: {
    minHeight: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  actionDestructive: { borderColor: colors.danger, backgroundColor: `${colors.danger}12` },
  actionCancel: { backgroundColor: colors.panel, borderStyle: 'dashed' },
  actionMark: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMarkDestructive: { backgroundColor: `${colors.danger}1A` },
  actionMarkCancel: { backgroundColor: colors.panel2 },
  actionMarkText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  actionText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '800' },
  destructiveText: { color: colors.danger },
  cancelText: { color: colors.muted },
  chevron: { color: colors.primary, fontSize: 24, fontWeight: '500', marginTop: -2 },
  dismissHint: { color: colors.muted, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 10 },
  pressed: { opacity: .68, transform: [{ scale: .99 }] },
});
