"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROLES } from "@/lib/auth/rbac";
import { Users, UserPlus, Shield, ShieldCheck, Mail, Lock, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";

export default function UsersPage() {
  const { user, role } = useAuth();
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState(ROLES.ADMIN);
  const [inviteSecret, setInviteSecret] = useState("");
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);

  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/admin/approvals");
      const data = await res.json();
      if (data.requests) {
        setPendingRequests(data.requests.filter((r) => !r.isMaster && !r.isVerified));
      }
    } catch (e) {}
  };

  const handleApprove = async (requestId) => {
    await fetch("/api/admin/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", requestId }),
    });
    fetchApprovals();
    fetchUsers();
  };

  const handleReject = async (requestId) => {
    await fetch("/api/admin/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", requestId }),
    });
    fetchApprovals();
  };

  const fetchUsers = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.users) {
        setUserList(data.users);
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchApprovals();
  }, [user]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          password: invitePassword,
          role: inviteRole,
          inviteSecret,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setInviteSuccess(true);
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(false);
        setInviteEmail("");
        setInvitePassword("");
        setInviteSecret("");
        fetchUsers();
      }, 2000);
    } catch (err) {
      setLoading(false);
      setInviteError(err.message);
    }
  };

  return (
    <DashboardLayout
      title="Admin Users & RBAC"
      subtitle="Role-Based Access Control and administrator credential management"
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Administrator Accounts</h3>
              <p className="text-xs text-[#8696a0]">
                Super Admin, Admin, and Read-only authorizations
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Administrator</span>
          </button>
        </div>

        {/* Master Gatekeeper Pending Approvals Section */}
        {pendingRequests.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#111b21] border border-amber-500/30 shadow-lg shadow-amber-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Master Gatekeeper: Pending Enrollment Approvals</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono">
                    {pendingRequests.length} Waiting
                  </span>
                </h3>
              </div>
              <span className="text-[11px] text-[#8696a0]">Requires Master Admin Authorization</span>
            </div>

            <div className="space-y-3 mt-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="p-3.5 rounded-xl bg-[#202c33] border border-[#2a3942] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{req.email}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase bg-slate-800 text-slate-300">
                        {req.role}
                      </span>
                    </p>
                    <p className="text-[10px] text-[#8696a0] font-mono mt-0.5">
                      Session ID: {req.requestId} • {req.masterApproved ? "Approved (Token Dispatched)" : "Awaiting Your Permission"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {!req.masterApproved ? (
                      <>
                        <button
                          onClick={() => handleReject(req.requestId)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(req.requestId)}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow transition"
                        >
                          Approve & Issue Verification Code
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-emerald-400 font-medium">
                        Verification Code Issued ({req.verificationToken})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-hidden rounded-2xl bg-[#111b21] border border-[#222d34] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#202c33] text-[#8696a0] font-semibold border-b border-[#222d34]">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222d34]/60 text-slate-200">
                {/* Always show currently logged in user */}
                <tr className="bg-[#202c33]/30">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                        {user?.email?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          <span>{user?.email}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                            YOU
                          </span>
                        </p>
                        <p className="text-[10px] text-[#8696a0] font-mono">{user?.uid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="px-2 py-0.5 rounded font-semibold uppercase text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      {role || "Admin"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#8696a0]">
                    Full Dashboard, Key Vault, Telemetry
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Session
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                    Current Session
                  </td>
                </tr>

                {userList
                  .filter((u) => u.uid !== user?.uid)
                  .map((u) => (
                    <tr key={u.uid} className="hover:bg-[#202c33]/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">
                            {u.email?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{u.email}</p>
                            <p className="text-[10px] text-[#8696a0] font-mono">{u.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded font-semibold uppercase text-[11px] bg-slate-800 text-slate-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#8696a0]">
                        Standard Role Permissions
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Authorized
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-[11px] text-[#8696a0]">Managed via Admin SDK</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enroll Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111b21] border border-[#222d34] p-6 text-slate-100">
            <h3 className="text-base font-semibold text-white mb-1">Enroll New Administrator</h3>
            <p className="text-xs text-[#8696a0] mb-4">
              Requires authorization token or invitation secret.
            </p>

            {inviteError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Administrator account successfully provisioned!</span>
              </div>
            ) : (
              <form onSubmit={handleCreateAdmin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="new.admin@stealthapp.internal"
                    className="w-full px-3 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={ROLES.ADMIN}>Admin</option>
                    <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
                    <option value={ROLES.READ_ONLY}>Read-Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Invitation Secret</label>
                  <input
                    type="password"
                    required
                    value={inviteSecret}
                    onChange={(e) => setInviteSecret(e.target.value)}
                    placeholder="Enter admin invitation secret"
                    className="w-full px-3 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Admin"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

