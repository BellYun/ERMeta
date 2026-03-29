"use client"

import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import * as Sentry from "@sentry/nextjs"

interface Props {
  children: React.ReactNode
  sectionName: string
  fallbackHeight?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        sectionName: this.props.sectionName,
        componentStack: errorInfo.componentStack,
      },
      tags: {
        section: this.props.sectionName,
        errorBoundary: "section",
      },
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center"
          style={{ minHeight: this.props.fallbackHeight }}
        >
          <AlertTriangle className="mb-3 h-8 w-8 text-[var(--color-danger)]" />
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            {this.props.sectionName} 데이터를 불러오지 못했습니다
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            일시적인 문제일 수 있습니다
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
