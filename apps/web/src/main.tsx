import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error in application root:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0E16",
          color: "#F4F6FB",
          fontFamily: "Space Grotesk, sans-serif",
          padding: "2rem",
          textAlign: "center"
        }}>
          <div style={{
            maxWidth: "500px",
            padding: "2rem",
            borderRadius: "1rem",
            background: "#10151F",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem", color: "#5B5FEF" }}>
              Ratecap
            </h1>
            <p style={{ fontSize: "0.9rem", color: "#8E95A5", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              A client runtime error was intercepted. You can reload the page or return to the main dashboard.
            </p>
            {this.state.error && (
              <pre style={{
                fontSize: "0.75rem",
                background: "rgba(0,0,0,0.4)",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                color: "#F2586B",
                overflowX: "auto",
                marginBottom: "1.5rem",
                textAlign: "left"
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => { window.location.href = "/"; }}
              style={{
                padding: "0.6rem 1.4rem",
                borderRadius: "0.5rem",
                background: "#5B5FEF",
                color: "#FFFFFF",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
