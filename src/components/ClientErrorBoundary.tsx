"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Rendered instead of children if a descendant throws. */
  fallback?: ReactNode;
  /** Optional label for console diagnostics. */
  label?: string;
};

type State = { hasError: boolean };

/**
 * Isolates wallet / SDK failures so a thrown render error can never unmount
 * neighbouring UI (e.g. the navbar links). Without this, any throw in a wallet
 * component would bubble to the root and blank the whole page.
 */
export class ClientErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(
      `[NOVA] Contained error in ${this.props.label ?? "wallet island"}`,
      error,
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
