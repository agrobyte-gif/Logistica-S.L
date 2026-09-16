import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, statusColor } from '../theme';

export function StatusPill({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <View style={[pill.wrap, { backgroundColor: c + '22' }]}>
      <Text style={[pill.text, { color: c }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontSize: 12, fontWeight: '700' },
});

export function Card({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress?: () => void;
}) {
  const content = <View style={card.wrap}>{children}</View>;
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
});

export function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const bg =
    variant === 'primary'
      ? colors.brand
      : variant === 'danger'
        ? colors.danger
        : 'transparent';
  const fg = variant === 'ghost' ? colors.textMuted : '#fff';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || busy}
      activeOpacity={0.85}
      style={[
        btn.wrap,
        { backgroundColor: bg },
        variant === 'ghost' && btn.ghost,
        (disabled || busy) && btn.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[btn.text, { color: fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const btn = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  ghost: { borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '700' },
});
