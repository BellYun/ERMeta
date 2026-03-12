"use client"

import React from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ResultErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center">
          <AlertTriangle className="mb-3 h-10 w-10 text-[var(--color-danger)]" />
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            조합 결과를 표시하는 중 오류가 발생했습니다
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {this.state.error?.message || "알 수 없는 오류"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
