export const layoutTokens = {
  appHeaderHeight: 64,
  appSidebarWidth: 288,
  pageMaxWidth: 1280,
} as const

export const chartPalette = {
  primary: '#0f6cbd',
  primarySoft: '#67b7ff',
  cyan: '#11b5c9',
  success: '#1d9b6c',
  warning: '#ea9a1d',
  danger: '#e25d5d',
  violet: '#8b5cf6',
  slate: '#64748b',
} as const

export const semanticTones = {
  success: {
    bg: 'bg-success/12',
    text: 'text-success',
    border: 'border-success/30',
  },
  warning: {
    bg: 'bg-warning/12',
    text: 'text-warning',
    border: 'border-warning/30',
  },
  danger: {
    bg: 'bg-danger/12',
    text: 'text-danger',
    border: 'border-danger/30',
  },
  info: {
    bg: 'bg-info/12',
    text: 'text-info',
    border: 'border-info/30',
  },
  neutral: {
    bg: 'bg-muted/75',
    text: 'text-foreground',
    border: 'border-border',
  },
} as const

export type SemanticTone = keyof typeof semanticTones
