import type { ReactNode } from "react";
import { UserMenu } from "./UserMenu";
import type { Session } from "../api/client";

interface LayoutProps {
  session: Session;
  onHome: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

export function Layout({ session, onHome, onSignOut, children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo" onClick={onHome} role="button" tabIndex={0}>
            {session.orgName}
          </h1>
          <UserMenu session={session} onSignOut={onSignOut} />
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
