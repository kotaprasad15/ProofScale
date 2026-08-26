import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { WorkspaceButton } from "./AnimatedButtons";

const links = [
  ["How it works", "#how-it-works"],
  ["Methodology", "#methodology"],
  ["Role pathways", "#role-pathways"],
  ["Safety guardrails", "#safety"],
] as const;

interface PublicNavProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function PublicNav({ onSignIn, onSignUp }: PublicNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="public-nav">
      <div className="public-nav-inner">
        <BrandLogo onClick={onSignIn ? undefined : () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

        <nav className="nav-links" aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            onClick={onSignIn}
            className="sign-in-link bg-transparent border-0 font-bold cursor-pointer"
          >
            Sign in
          </button>
          <WorkspaceButton onClick={onSignUp} />
        </div>

        <button
          className="mobile-menu-trigger"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="mobile-nav-panel">
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignIn?.();
            }}
            className="sign-in-link text-left bg-transparent border-0 font-bold cursor-pointer py-1"
          >
            Sign in
          </button>
          <WorkspaceButton
            onClick={() => {
              setOpen(false);
              onSignUp?.();
            }}
          />
        </div>
      )}
    </header>
  );
}
