'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Clock,
  Pencil,
  Check,
  ChevronDown,
  Shield,
  ShieldOff,
  UserMinus,
  UserCheck,
  UserX,
  LogOut,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrganization,
  updateOrgName,
  leaveOrganization,
  withdrawRequest,
  approveMember,
  rejectMember,
  removeMember,
  promoteMember,
  demoteMember,
  joinOrganization,
  OrgMember,
} from '@/lib/api/organization';

export interface OrganizationTranslations {
  title: string;
  noOrganization: string;
  pendingApproval: string;
  pendingAdminInfo: string;
  withdrawRequest: string;
  members: string;
  pendingMembers: string;
  admin: string;
  member: string;
  promote: string;
  demote: string;
  remove: string;
  approve: string;
  reject: string;
  leave: string;
  leaveConfirm: string;
  leaveWarning: string;
  editName: string;
  save: string;
  cancel: string;
  createOrJoin: string;
  companyNamePlaceholder: string;
  joinButton: string;
  createInfo: string;
  joinInfo: string;
}

interface OrganizationPanelProps {
  open: boolean;
  onClose: () => void;
  translations: OrganizationTranslations;
}

export function OrganizationPanel({ open, onClose, translations: t }: OrganizationPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState('');

  const { data: org, isLoading, refetch } = useQuery({
    queryKey: ['organization'],
    queryFn: getOrganization,
    enabled: open,
  });

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdownId) return;
    const handler = () => setOpenDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdownId]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['organization'] });

  const updateNameMutation = useMutation({
    mutationFn: updateOrgName,
    onSuccess: () => {
      invalidate();
      setIsEditingName(false);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: leaveOrganization,
    onSuccess: () => {
      invalidate();
      setShowLeaveConfirm(false);
    },
  });

  const joinMutation = useMutation({
    mutationFn: joinOrganization,
    onSuccess: () => {
      invalidate();
      setJoinName('');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawRequest,
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({ mutationFn: approveMember, onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: rejectMember, onSuccess: invalidate });
  const removeMutation = useMutation({ mutationFn: removeMember, onSuccess: invalidate });
  const promoteMutation = useMutation({ mutationFn: promoteMember, onSuccess: invalidate });
  const demoteMutation = useMutation({ mutationFn: demoteMember, onSuccess: invalidate });

  if (!open) return null;

  const isAdmin = org?.currentUserRole === 'admin';
  const isPending = org !== null && org?.currentUserRole === null;

  const handleSaveName = () => {
    if (editedName.trim() && editedName.trim() !== org?.name) {
      updateNameMutation.mutate(editedName.trim());
    } else {
      setIsEditingName(false);
    }
  };

  const startEditName = () => {
    setEditedName(org?.name || '');
    setIsEditingName(true);
  };

  const getMemberDisplayName = (member: OrgMember) => {
    if (member.firstName || member.lastName) {
      return [member.firstName, member.lastName].filter(Boolean).join(' ');
    }
    return member.email;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : !org ? (
            /* No organization — create or join form */
            <div className="py-8 px-2">
              <div className="text-center mb-6">
                <Building2 className="w-12 h-12 text-blue-400 dark:text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.createOrJoin}</h3>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (joinName.trim()) joinMutation.mutate(joinName.trim());
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder={t.companyNamePlaceholder}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={!joinName.trim() || joinMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {t.joinButton}
                </Button>
              </form>
              <div className="mt-6 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.createInfo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.joinInfo}</p>
              </div>
            </div>
          ) : isPending ? (
            /* Pending approval */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{org.name}</h3>
              <p className="text-gray-500 dark:text-gray-400">{t.pendingApproval}</p>
              {org.adminNames && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  {t.pendingAdminInfo.replace('{admins}', org.adminNames)}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
                className="mt-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4 mr-1" />
                {t.withdrawRequest}
              </Button>
            </div>
          ) : (
            /* Active member / admin */
            <div className="space-y-6">
              {/* Organization name */}
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      className="flex-1 px-3 py-2 text-lg font-semibold border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveName}
                      disabled={updateNameMutation.isPending}
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingName(false)}>
                      <X className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{org.name}</h3>
                    {isAdmin && (
                      <button
                        onClick={startEditName}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title={t.editName}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Pending Members (admin only) */}
              {isAdmin && org.pendingMembers && org.pendingMembers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    {t.pendingMembers} ({org.pendingMembers.length})
                  </h4>
                  <div className="space-y-2">
                    {org.pendingMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {getMemberDisplayName(member)}
                          </p>
                          {(member.firstName || member.lastName) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => approveMutation.mutate(member.id)}
                            disabled={approveMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
                            title={t.approve}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(member.id)}
                            disabled={rejectMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                            title={t.reject}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Members */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t.members} ({org.members.length})
                </h4>
                <div className="space-y-2">
                  {org.members.map((member) => {
                    const isCurrentUser = member.id === user?.id;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-750/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {getMemberDisplayName(member)}
                              </p>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                  member.orgRole === 'admin'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                              >
                                {member.orgRole === 'admin' ? t.admin : t.member}
                              </span>
                            </div>
                            {(member.firstName || member.lastName) && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                            )}
                          </div>
                        </div>

                        {/* Admin actions (not for self) */}
                        {isAdmin && !isCurrentUser && (
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === member.id ? null : member.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            {openDropdownId === member.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10">
                                {member.orgRole === 'member' ? (
                                  <button
                                    onClick={() => {
                                      promoteMutation.mutate(member.id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <Shield className="w-4 h-4" />
                                    {t.promote}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      demoteMutation.mutate(member.id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <ShieldOff className="w-4 h-4" />
                                    {t.demote}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    removeMutation.mutate(member.id);
                                    setOpenDropdownId(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <UserMinus className="w-4 h-4" />
                                  {t.remove}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Leave Organization */}
        {org && !isPending && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            {showLeaveConfirm ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.leaveConfirm}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.leaveWarning}</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowLeaveConfirm(false)}>
                    {t.cancel}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    {t.leave}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeaveConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4 mr-1" />
                {t.leave}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
