'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Copy, Check, Trash2, Crown, Shield, User, Link2, RefreshCw, ChevronRight, Building2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface TeamInvite {
  id: string;
  token: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  invites: TeamInvite[];
  owner: { id: string; name: string | null; email: string; image: string | null };
}

interface TeamPageProps {
  userId: string;
  userSubscription: string;
  onUpgrade: () => void;
}

const ROLE_ICONS = { owner: Crown, admin: Shield, member: User };
const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member' };

export function TeamPage({ userId, userSubscription, onUpgrade }: TeamPageProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [renamingTeam, setRenamingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [confirmDisband, setConfirmDisband] = useState(false);
  const { showToast } = useToast();

  const isOwner = team?.ownerId === userId;
  const isAdmin = team?.members.find(m => m.user.id === userId)?.role === 'admin';
  const canManage = isOwner || isAdmin;

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeam(data.team || null);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim() }),
      });
      const data = await res.json();
      if (data.team) { setTeam(data.team); setTeamName(''); showToast('Team created!', 'success'); }
      else showToast(data.error || 'Failed to create team', 'error');
    } catch { showToast('Failed to create team', 'error'); }
    setCreating(false);
  };

  const handleGenerateInvite = async () => {
    if (!team) return;
    setGeneratingInvite(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member' }),
      });
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        showToast('Invite link copied to clipboard!', 'success');
        fetchTeam();
      } else showToast(data.error || 'Failed to generate invite', 'error');
    } catch { showToast('Failed to generate invite', 'error'); }
    setGeneratingInvite(false);
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!team) return;
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${memberId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Member removed', 'success'); fetchTeam(); }
      else { const d = await res.json(); showToast(d.error || 'Failed to remove member', 'error'); }
    } catch { showToast('Failed to remove member', 'error'); }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) { showToast('Role updated', 'success'); fetchTeam(); }
      else { const d = await res.json(); showToast(d.error || 'Failed to update role', 'error'); }
    } catch { showToast('Failed to update role', 'error'); }
  };

  const handleRenameTeam = async () => {
    if (!team || !newTeamName.trim()) return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      if (res.ok) {
        showToast('Team renamed', 'success');
        setRenamingTeam(false);
        setNewTeamName('');
        fetchTeam();
      }
    } catch { showToast('Failed to rename team', 'error'); }
  };

  const handleDisbandTeam = async () => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' });
      if (res.ok) { setTeam(null); setConfirmDisband(false); showToast('Team disbanded', 'success'); }
      else { const d = await res.json(); showToast(d.error || 'Failed to disband team', 'error'); }
    } catch { showToast('Failed to disband team', 'error'); }
  };

  const handleLeaveTeam = async () => {
    if (!team) return;
    const me = team.members.find(m => m.user.id === userId);
    if (!me) return;
    if (!confirm('Leave this team? You will lose access to shared workspaces.')) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${me.id}`, { method: 'DELETE' });
      if (res.ok) { setTeam(null); showToast('You have left the team', 'success'); }
    } catch { showToast('Failed to leave team', 'error'); }
  };

  // Not a Studio user — show upgrade prompt
  if (userSubscription !== 'studio') {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <p className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light mb-3">Studio</p>
          <h1 className="text-fresco-2xl font-medium text-fresco-black">Team</h1>
        </div>
        <div className="border-2 border-dashed border-fresco-border rounded-none p-12 text-center">
          <div className="w-14 h-14 bg-fresco-light-gray rounded-none flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-7 h-7 text-fresco-graphite-mid" />
          </div>
          <h2 className="text-fresco-lg font-medium text-fresco-black mb-3">Team features require Studio</h2>
          <p className="text-fresco-sm text-fresco-graphite-mid mb-8 max-w-sm mx-auto">
            Invite your team, share workspaces, and collaborate on thinking together.
          </p>
          <button onClick={onUpgrade} className="fresco-btn fresco-btn-primary">
            Upgrade to Studio — $79/mo
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-fresco-graphite-light" />
      </div>
    );
  }

  // No team yet — create one
  if (!team) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <p className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light mb-3">Studio</p>
          <h1 className="text-fresco-2xl font-medium text-fresco-black">Team</h1>
          <p className="text-fresco-sm text-fresco-graphite-mid mt-2">Create a team to share workspaces and collaborate.</p>
        </div>

        <div className="border border-fresco-border rounded-none p-8">
          <h2 className="text-fresco-base font-medium text-fresco-black mb-6">Create your team</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              placeholder="Team name"
              className="flex-1 px-4 py-2.5 border border-fresco-border rounded-none text-fresco-base focus:outline-none focus:ring-2 focus:ring-fresco-black bg-transparent"
            />
            <button
              onClick={handleCreateTeam}
              disabled={creating || !teamName.trim()}
              className="fresco-btn fresco-btn-primary disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Has team — show full admin UI
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light mb-3">Studio</p>
          {renamingTeam ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameTeam(); if (e.key === 'Escape') { setRenamingTeam(false); setNewTeamName(''); } }}
                className="text-fresco-2xl font-medium bg-transparent border-b-2 border-fresco-black focus:outline-none"
                autoFocus
              />
              <button onClick={handleRenameTeam} className="text-fresco-sm text-fresco-black font-medium">Save</button>
              <button onClick={() => { setRenamingTeam(false); setNewTeamName(''); }} className="text-fresco-sm text-fresco-graphite-mid">Cancel</button>
            </div>
          ) : (
            <h1
              className="text-fresco-2xl font-medium text-fresco-black cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => { if (isOwner) { setRenamingTeam(true); setNewTeamName(team.name); } }}
              title={isOwner ? 'Click to rename' : undefined}
            >
              {team.name}
            </h1>
          )}
          <p className="text-fresco-sm text-fresco-graphite-mid mt-1">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</p>
        </div>

        {canManage && (
          <button
            onClick={handleGenerateInvite}
            disabled={generatingInvite}
            className="fresco-btn flex items-center gap-2"
          >
            {generatingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {generatingInvite ? 'Generating…' : 'Copy invite link'}
          </button>
        )}
      </div>

      {/* Members */}
      <div className="mb-8">
        <h2 className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light mb-4">Members</h2>
        <div className="border border-fresco-border rounded-none divide-y divide-fresco-border-light">
          {team.members.map(member => {
            const RoleIcon = ROLE_ICONS[member.role as keyof typeof ROLE_ICONS] || User;
            const isSelf = member.user.id === userId;
            const isThisOwner = member.role === 'owner';

            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-fresco-light-gray flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {member.user.image
                    ? <img src={member.user.image} alt="" className="w-full h-full object-cover" />
                    : <span className="text-fresco-sm font-medium text-fresco-graphite-mid">{(member.user.name || member.user.email)[0].toUpperCase()}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-fresco-sm font-medium text-fresco-black truncate">
                    {member.user.name || member.user.email}
                    {isSelf && <span className="ml-2 text-fresco-xs text-fresco-graphite-light">(you)</span>}
                  </p>
                  <p className="text-fresco-xs text-fresco-graphite-light truncate">{member.user.email}</p>
                </div>

                {/* Role */}
                <div className="flex items-center gap-3">
                  {isOwner && !isThisOwner ? (
                    <select
                      value={member.role}
                      onChange={e => handleChangeRole(member.id, e.target.value)}
                      className="text-fresco-xs border border-fresco-border rounded-none px-2 py-1 bg-transparent focus:outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={cn('flex items-center gap-1 text-fresco-xs px-2 py-1 rounded-none',
                      isThisOwner ? 'bg-fresco-black text-white' : 'bg-fresco-light-gray text-fresco-graphite-mid'
                    )}>
                      <RoleIcon className="w-3 h-3" />
                      {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                    </span>
                  )}

                  {/* Remove / leave button */}
                  {!isThisOwner && (isOwner || isSelf) && (
                    <button
                      onClick={() => isSelf ? handleLeaveTeam() : handleRemoveMember(member.id, member.user.name || member.user.email)}
                      className="p-1.5 text-fresco-graphite-light hover:text-red-500 transition-colors"
                      title={isSelf ? 'Leave team' : 'Remove member'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active invite links */}
      {canManage && team.invites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light mb-4">Active invite links</h2>
          <div className="border border-fresco-border rounded-none divide-y divide-fresco-border-light">
            {team.invites.map(invite => (
              <div key={invite.id} className="flex items-center gap-4 px-5 py-3">
                <Link2 className="w-4 h-4 text-fresco-graphite-light flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-fresco-xs font-mono text-fresco-graphite-mid truncate">{window?.location?.origin}/join/{invite.token}</p>
                  <p className="text-fresco-xs text-fresco-graphite-light">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()} · {invite.role}
                  </p>
                </div>
                <button
                  onClick={() => copyInviteLink(invite.token)}
                  className="flex items-center gap-1.5 text-fresco-xs text-fresco-graphite-mid hover:text-fresco-black transition-colors"
                >
                  {copiedToken === invite.token ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedToken === invite.token ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      {isOwner && (
        <div className="border border-fresco-border rounded-none p-6">
          <h2 className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light mb-4">Danger zone</h2>
          {!confirmDisband ? (
            <button
              onClick={() => setConfirmDisband(true)}
              className="text-fresco-sm text-red-500 hover:text-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Disband team
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-fresco-sm text-fresco-graphite-mid">Are you sure? This cannot be undone.</p>
              <button onClick={handleDisbandTeam} className="text-fresco-sm text-red-600 font-medium hover:text-red-800">Yes, disband</button>
              <button onClick={() => setConfirmDisband(false)} className="text-fresco-sm text-fresco-graphite-mid">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
