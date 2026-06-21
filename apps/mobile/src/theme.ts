import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#0b1220',
  panel: '#131c2e',
  border: '#1f2a3d',
  text: '#e8edf5',
  muted: '#9aa4b2',
  accent: '#4ade80',
  accent2: '#3b82f6',
  danger: '#ff6b6b',
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  h1: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13 },
  price: { color: colors.accent, fontSize: 16, fontWeight: '700', marginTop: 6 },
  input: {
    backgroundColor: '#0e1626',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    padding: 10,
    marginTop: 6,
  },
  label: { color: colors.muted, fontSize: 13, marginTop: 10 },
  btn: {
    backgroundColor: colors.accent2,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnSuccess: { backgroundColor: colors.accent },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextDark: { color: '#06210f', fontWeight: '700' },
  error: { color: colors.danger, marginTop: 8 },
  badge: {
    color: colors.muted,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
    overflow: 'hidden',
  },
});
