import React, { ReactNode } from "react";
import { WorkspaceButton } from "./AnimatedButtons";

export { WorkspaceButton, GoBackButton } from "./AnimatedButtons";

interface AnimatedCreateWorkspaceButtonProps {
  onClick?: () => void;
  text?: string;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "inverted";
  className?: string;
}

export function AnimatedCreateWorkspaceButton({
  onClick,
  text = "Create Workspace",
  className = ""
}: AnimatedCreateWorkspaceButtonProps) {
  return (
    <WorkspaceButton onClick={onClick} className={className}>
      {text}
    </WorkspaceButton>
  );
}
