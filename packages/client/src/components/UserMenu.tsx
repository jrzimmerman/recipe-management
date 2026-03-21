/**
 * User menu dropdown — top right of header.
 * Shows current user name, organization, and role.
 * Sign out clears the session and returns to login.
 */

import { useState, useEffect, useRef } from "react";
import type { Session } from "../api/client";

const ROLE_DISPLAY: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

interface UserMenuProps {
  session: Session;
  onSignOut: () => void;
}

export function UserMenu({ session, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="user-menu-name">{session.userName}</span>
        <span className="user-menu-caret">{open ? "\u25B4" : "\u25BE"}</span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-info">
            <span className="user-menu-org">{session.orgName}</span>
            <span className="user-menu-role">
              {ROLE_DISPLAY[session.role] ?? session.role}
            </span>
          </div>
          <div className="user-menu-divider" />
          <button
            className="user-menu-signout"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
