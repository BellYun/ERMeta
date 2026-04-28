"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { captureException } from "@/lib/sentry-client";

interface Props {
  children: React.ReactNode;
  sectionName: string;
  fallbackHeight?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface BoundaryMessages {
  loadFailed: string;
  temporaryIssue: string;
  retry: string;
}

class SectionErrorBoundaryInner extends React.Component<Props & BoundaryMessages, State> {
  constructor(props: Props & BoundaryMessages) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureException(error, {
      extra: {
        sectionName: this.props.sectionName,
        componentStack: errorInfo.componentStack,
      },
      tags: {
        section: this.props.sectionName,
        errorBoundary: "section",
      },
    });
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
            {this.props.loadFailed}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {this.props.temporaryIssue}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {this.props.retry}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SectionErrorBoundary(props: Props) {
  const t = useTranslations("sectionErrorBoundary");

  return (
    <SectionErrorBoundaryInner
      {...props}
      loadFailed={t("loadFailed", { section: props.sectionName })}
      temporaryIssue={t("temporaryIssue")}
      retry={t("retry")}
    />
  );
}
