export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  createdTimestamp?: number;
  attributes?: Record<string, string[]>;
}

export interface KeycloakRole {
  id: string;
  name: string;
  description?: string;
  composite?: boolean;
}

export const PRODUCT_ROLES = [
  "Guest",
  "Learner",
  "Instructor",
  "Content Editor",
  "Reviewer",
  "Course Manager",
  "Portal Administrator",
  "LMS Administrator",
  "Auditor",
  "Super Administrator",
] as const;

export type ProductRole = (typeof PRODUCT_ROLES)[number];

export function isProductRole(value: string): value is ProductRole {
  return PRODUCT_ROLES.includes(value as ProductRole);
}

export interface CreateUserPayload {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  emailVerified: boolean;
  credentials: Array<{ type: "password"; value: string; temporary: boolean }>;
}
