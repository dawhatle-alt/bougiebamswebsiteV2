import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "center" }}>
          <h2 style={{ color: "#c0392b" }}>Something went wrong</h2>
          <pre style={{ background: "#f8f8f8", padding: "1rem", borderRadius: "4px", textAlign: "left", overflow: "auto", maxWidth: "600px", margin: "1rem auto", fontSize: "0.85rem" }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.href = "/"}
            style={{ padding: "0.5rem 1.5rem", cursor: "pointer" }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
