/**
 * Organization Service
 * Manages organizations (company grouping for shared conversations)
 * Supports org-level roles (admin/member) and membership approval
 */

import { OrgRole, OrgMembershipStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export interface OrganizationMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  orgRole: OrgRole;
  orgMembershipStatus: OrgMembershipStatus;
  createdAt: Date;
}

export interface OrganizationData {
  id: string;
  name: string;
  createdAt: Date;
  members: OrganizationMember[];
  pendingMembers: OrganizationMember[];
  currentUserRole: OrgRole | null;
}

export class OrganizationService {
  /**
   * Find an organization by normalized name, or create one if it doesn't exist.
   * When creating, the creator becomes admin. When joining existing, status is pending.
   */
  async findOrCreateByName(companyName: string, userId?: string) {
    const nameNorm = companyName.toLowerCase().trim();

    if (!nameNorm) {
      throw new Error('Company name cannot be empty');
    }

    // Try to find existing organization
    const existingOrg = await prisma.organization.findUnique({
      where: { nameNorm },
    });

    if (existingOrg) {
      logger.info('Found existing organization', { orgId: existingOrg.id, nameNorm });
      // Existing org: user joins as pending member (needs admin approval)
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            organizationId: existingOrg.id,
            orgRole: 'member',
            orgMembershipStatus: 'pending',
          },
        });
        logger.info('User set as pending member of existing organization', { userId, orgId: existingOrg.id });
      }
      return existingOrg;
    }

    // Create new organization - first user becomes admin
    const org = await prisma.organization.create({
      data: {
        name: companyName.trim(),
        nameNorm,
      },
    });

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          organizationId: org.id,
          orgRole: 'admin',
          orgMembershipStatus: 'active',
        },
      });
      logger.info('User set as admin of new organization', { userId, orgId: org.id });
    }

    logger.info('Created new organization', { orgId: org.id, name: org.name });
    return org;
  }

  /**
   * Get all active members of an organization.
   */
  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    const members = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        orgMembershipStatus: 'active',
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        orgRole: true,
        orgMembershipStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return members;
  }

  /**
   * Get pending members of an organization.
   */
  async getPendingMembers(orgId: string): Promise<OrganizationMember[]> {
    const members = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        orgMembershipStatus: 'pending',
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        orgRole: true,
        orgMembershipStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return members;
  }

  /**
   * Get the organization a user belongs to, including members and pending members.
   */
  async getUserOrganization(userId: string): Promise<OrganizationData | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, orgRole: true, orgMembershipStatus: true },
    });

    if (!user?.organizationId) {
      return null;
    }

    // If user is pending/rejected, they can see org name but not members
    if (user.orgMembershipStatus !== 'active') {
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
      });
      if (!org) return null;

      return {
        id: org.id,
        name: org.name,
        createdAt: org.createdAt,
        members: [],
        pendingMembers: [],
        currentUserRole: null,
      };
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (!org) return null;

    const members = await this.getMembers(org.id);
    const pendingMembers = user.orgRole === 'admin'
      ? await this.getPendingMembers(org.id)
      : [];

    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
      members,
      pendingMembers,
      currentUserRole: user.orgRole,
    };
  }

  /**
   * Check if user is an admin of their organization.
   */
  async isOrgAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, orgRole: true, orgMembershipStatus: true },
    });
    return !!(user?.organizationId && user.orgRole === 'admin' && user.orgMembershipStatus === 'active');
  }

  /**
   * Approve a pending member (admin only).
   */
  async approveMember(adminUserId: string, targetUserId: string): Promise<void> {
    await this.requireOrgAdmin(adminUserId, targetUserId);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { orgMembershipStatus: 'active' },
    });

    logger.info('Member approved', { adminUserId, targetUserId });
  }

  /**
   * Reject a pending member (admin only).
   */
  async rejectMember(adminUserId: string, targetUserId: string): Promise<void> {
    await this.requireOrgAdmin(adminUserId, targetUserId);

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        orgMembershipStatus: 'rejected',
        organizationId: null,
      },
    });

    logger.info('Member rejected', { adminUserId, targetUserId });
  }

  /**
   * Remove an active member from the organization (admin only).
   */
  async removeMember(adminUserId: string, targetUserId: string): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new Error('Cannot remove yourself');
    }
    await this.requireOrgAdmin(adminUserId, targetUserId);

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        organizationId: null,
        orgRole: 'member',
        orgMembershipStatus: 'active',
      },
    });

    logger.info('Member removed from organization', { adminUserId, targetUserId });
  }

  /**
   * Promote a member to admin (admin only).
   */
  async promoteMember(adminUserId: string, targetUserId: string): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new Error('Cannot promote yourself');
    }
    await this.requireOrgAdmin(adminUserId, targetUserId);

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { orgMembershipStatus: true },
    });
    if (target?.orgMembershipStatus !== 'active') {
      throw new Error('Can only promote active members');
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { orgRole: 'admin' },
    });

    logger.info('Member promoted to admin', { adminUserId, targetUserId });
  }

  /**
   * Demote an admin to member (admin only).
   */
  async demoteMember(adminUserId: string, targetUserId: string): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new Error('Cannot demote yourself');
    }
    await this.requireOrgAdmin(adminUserId, targetUserId);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { orgRole: 'member' },
    });

    logger.info('Admin demoted to member', { adminUserId, targetUserId });
  }

  /**
   * Leave the organization (any member).
   */
  async leaveOrganization(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, orgRole: true },
    });

    if (!user?.organizationId) {
      throw new Error('User does not belong to an organization');
    }

    // Check if user is the last admin
    if (user.orgRole === 'admin') {
      const adminCount = await prisma.user.count({
        where: {
          organizationId: user.organizationId,
          orgRole: 'admin',
          orgMembershipStatus: 'active',
          deletedAt: null,
        },
      });
      if (adminCount <= 1) {
        // Check if there are other active members
        const memberCount = await prisma.user.count({
          where: {
            organizationId: user.organizationId,
            orgMembershipStatus: 'active',
            deletedAt: null,
            id: { not: userId },
          },
        });
        if (memberCount > 0) {
          throw new Error('Cannot leave: you are the last admin. Promote another member first.');
        }
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: null,
        orgRole: 'member',
        orgMembershipStatus: 'active',
      },
    });

    logger.info('User left organization', { userId });
  }

  /**
   * Update organization name (admin only).
   */
  async updateOrganizationName(adminUserId: string, newName: string): Promise<void> {
    const isAdmin = await this.isOrgAdmin(adminUserId);
    if (!isAdmin) {
      throw new Error('Only organization admins can update the name');
    }

    const user = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new Error('User does not belong to an organization');
    }

    const nameNorm = newName.toLowerCase().trim();
    if (!nameNorm) {
      throw new Error('Organization name cannot be empty');
    }

    // Check for name collision
    const existing = await prisma.organization.findUnique({ where: { nameNorm } });
    if (existing && existing.id !== user.organizationId) {
      throw new Error('An organization with this name already exists');
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { name: newName.trim(), nameNorm },
    });

    logger.info('Organization name updated', { orgId: user.organizationId, newName });
  }

  /**
   * Helper: Verify admin permissions and same-org membership.
   */
  private async requireOrgAdmin(adminUserId: string, targetUserId: string): Promise<void> {
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { organizationId: true, orgRole: true, orgMembershipStatus: true },
    });

    if (!admin?.organizationId || admin.orgRole !== 'admin' || admin.orgMembershipStatus !== 'active') {
      throw new Error('Only organization admins can perform this action');
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { organizationId: true },
    });

    if (!target || target.organizationId !== admin.organizationId) {
      throw new Error('Target user does not belong to this organization');
    }
  }
}
