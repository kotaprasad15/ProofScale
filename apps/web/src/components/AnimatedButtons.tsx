import React, { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function WorkspaceButton({
  onClick,
  children = "Create Workspace",
  className = ""
}: {
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`workspace-button ${className}`}
    >
      <span className="workspace-circle" />
      <ArrowRight className="workspace-arrow workspace-arrow-out" aria-hidden="true" />
      <ArrowRight className="workspace-arrow workspace-arrow-in" aria-hidden="true" />
      <span className="workspace-button-text">{children}</span>
    </button>
  );
}

export function GoBackButton({
  onClick,
  label = "Go back",
  className = "",
  size = "md",
  theme = "dark"
}: {
  onClick?: () => void;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  theme?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`go-back-button ${className}`}
      aria-label={label}
    >
      <span className="go-back-fill">
        <ArrowLeft size={18} aria-hidden="true" />
      </span>
      <span className="go-back-label">{label}</span>
    </button>
  );
}
