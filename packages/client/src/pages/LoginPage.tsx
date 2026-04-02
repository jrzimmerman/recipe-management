/**
 * Login screen — gate shown when no session exists.
 * Demonstrates the auth flow skeleton with demo users grouped by organization.
 * Each user card shows name, kitchen role, and auth tier.
 * Tap a card to sign in.
 */

import type { Session } from "../api/client";
import type { UserRole } from "@recipe-mgmt/shared";

interface DemoUser {
  userId: string;
  userName: string;
  orgId: string;
  orgName: string;
  role: UserRole;
  kitchenRole: string;
}

const DEMO_ORGS: { name: string; orgId: string; users: DemoUser[] }[] = [
  {
    name: "Bowl & Soul",
    orgId: "org-bowlandsoul",
    users: [
      {
        userId: "user-maria-santos",
        userName: "Maria Santos",
        orgId: "org-bowlandsoul",
        orgName: "Bowl & Soul",
        role: "admin",
        kitchenRole: "Owner / Manager",
      },
      {
        userId: "user-james-chen",
        userName: "James Chen",
        orgId: "org-bowlandsoul",
        orgName: "Bowl & Soul",
        role: "member",
        kitchenRole: "Head Chef",
      },
      {
        userId: "user-jordan-kim",
        userName: "Jordan Kim",
        orgId: "org-bowlandsoul",
        orgName: "Bowl & Soul",
        role: "viewer",
        kitchenRole: "Line Cook",
      },
    ],
  },
  {
    name: "Green Machine",
    orgId: "org-greenmachine",
    users: [
      {
        userId: "user-alex-rivera",
        userName: "Alex Rivera",
        orgId: "org-greenmachine",
        orgName: "Green Machine",
        role: "admin",
        kitchenRole: "Owner / Manager",
      },
      {
        userId: "user-priya-patel",
        userName: "Priya Patel",
        orgId: "org-greenmachine",
        orgName: "Green Machine",
        role: "member",
        kitchenRole: "Head Chef",
      },
      {
        userId: "user-casey-brooks",
        userName: "Casey Brooks",
        orgId: "org-greenmachine",
        orgName: "Green Machine",
        role: "viewer",
        kitchenRole: "Prep Cook",
      },
    ],
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Full access",
  member: "View, create, & edit",
  viewer: "View only",
};

interface LoginPageProps {
  onLogin: (session: Session) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const handleSelect = (user: DemoUser) => {
    onLogin({
      orgId: user.orgId,
      orgName: user.orgName,
      userId: user.userId,
      userName: user.userName,
      role: user.role,
    });
  };

  return (
    <div className="login-screen">
      <div className="login-header">
        <h1 className="login-title">Recipe Management</h1>
        <p className="login-subtitle">Select your account to sign in</p>
      </div>

      {DEMO_ORGS.map((org) => (
        <div key={org.orgId} className="login-org-group">
          <h2 className="login-org-name">{org.name}</h2>
          <div className="login-cards">
            {org.users.map((user) => (
              <button
                key={user.userId}
                className="login-card"
                onClick={() => handleSelect(user)}
              >
                <span className="login-card-name">{user.userName}</span>
                <span className="login-card-kitchen-role">
                  {user.kitchenRole}
                </span>
                <span className={`login-card-role role-${user.role}`}>
                  {user.role} — {ROLE_LABELS[user.role]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
