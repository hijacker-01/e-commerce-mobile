import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
/**
 * Require granular permission flags (e.g. 'order.approve', 'invoice.create').
 * OWNER implicitly has all permissions; see PermissionsGuard.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
