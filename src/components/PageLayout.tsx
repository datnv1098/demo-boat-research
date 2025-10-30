import React from 'react'

interface PageLayoutProps {
  children: React.ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="relative">
      {children}
    </div>
  )
}

interface StickyHeaderProps {
  children: React.ReactNode
}

export function StickyHeader({ children }: StickyHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 mb-2">
      {children}
    </div>
  )
}

interface ScrollableContentProps {
  children: React.ReactNode
}

export function ScrollableContent({ children }: ScrollableContentProps) {
  return (
    <div className="space-y-4">
      {children}
    </div>
  )
}
