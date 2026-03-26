export type TenantStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type TenantType = "PERUMAHAN" | "DESA" | "KOPERASI";
export type CommunityLevel = "RT" | "RW" | "OTHER";
export type HouseStatus = "PRIBADI" | "KONTRAKAN" | "KANTOR";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BANNED";
export type TenantUserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";
export type RelationshipType = "OWNER" | "FAMILY" | "TENANT" | "CARETAKER";
export type UserHouseStatus = "ACTIVE" | "INACTIVE";
export type RoleScope = "SYSTEM" | "TENANT" | "HOUSE";
export type AuthorityType = "RT" | "RW" | "DKM" | "KOPERASI" | "SATPAM";
export type AuthorityStatus = "ACTIVE" | "REVOKED";
export type EntityType = "USER" | "HOUSE" | "USER_HOUSE";
export type VerificationStatus = "VERIFIED" | "REVOKED";
export type HouseJoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type NotificationType = "SYSTEM" | "KAS_RT" | "RUMAH" | "ORGANISASI" | "MARKETPLACE";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH";

/* ─── Marketplace enums ──────────────────────────────────────────────────── */
export type MarketplaceDomainCode = "UMKM" | "JASA";
export type MarketplaceItemStatus = "DRAFT" | "ACTIVE" | "SOLD_OUT" | "ARCHIVED";
export type MarketplaceTxStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";
export type MarketplacePaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
export type MarketplaceTxEventType =
  | "CREATED"
  | "CONFIRMED"
  | "PAID"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUND_REQUESTED"
  | "REFUNDED";

export interface User {
  id: string;
  full_name: string;
  wa_number: string | null;
  wa_number_hash: string | null;
  wa_verified_at: string | null;
  email: string | null;
  date_of_birth: string | null;
  status: UserStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  description: string | null;
  type: TenantType;
  latitude: number | null;
  longitude: number | null;
  status: TenantStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface Community {
  id: string;
  tenant_id: string;
  code: string;
  name: string | null;
  level: CommunityLevel;
  parent_community_id: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface House {
  id: string;
  tenant_id: string;
  community_id: string;
  name: string;
  blok_rumah: string | null;
  address: string | null;
  total_residents: number;
  status: HouseStatus;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  status: TenantUserStatus;
  reputation_points: number;
  joined_at: string;
  left_at: string | null;
}

export interface UserHouse {
  id: string;
  tenant_id: string;
  user_id: string;
  house_id: string;
  relationship: RelationshipType;
  is_primary: boolean;
  move_in_date: string | null;
  move_out_date: string | null;
  status: UserHouseStatus;
  created_at: string;
  created_by: string | null;
}

export interface HouseJoinRequest {
  id: string;
  house_id: string;
  requester_user_id: string;
  status: HouseJoinRequestStatus;
  created_at: string;
  responded_at: string | null;
  responded_by: string | null;
}

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: number;
  earned_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  scope: RoleScope;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TenantUserRole {
  id: string;
  tenant_user_id: string;
  role_id: number;
  assigned_at: string;
  revoked_at: string | null;
}

export interface AuthorityAssignment {
  id: string;
  tenant_id: string;
  tenant_user_id: string;
  authority_type: AuthorityType;
  community_id: string;
  start_date: string;
  end_date: string | null;
  status: AuthorityStatus;
  created_at: string;
  created_by: string | null;
}

export interface Verification {
  id: string;
  tenant_id: string;
  entity_type: EntityType;
  entity_id: string;
  verified_by_authority_id: string | null;
  verified_at: string;
  status: VerificationStatus;
}

export interface OtpCode {
  id: string;
  wa_number_hash: string;
  code_hash: string;
  expires_at: string;
  verified_at: string | null;
  attempts: number;
  user_id: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  last_active_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string | null;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  action_url: string | null;
  entity_table: string | null;
  entity_id: string | null;
  dedupe_key: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

/* ─── Marketplace ────────────────────────────────────────────────────────── */

export interface MarketplaceDomain {
  id: string;
  code: MarketplaceDomainCode;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MarketplaceCategory {
  id: string;
  domain_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface MarketplaceItem {
  id: string;
  tenant_id: string;
  category_id: string;
  owner_user_id: string;
  owner_display_name: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  base_price: number;
  discount_percent: number;
  /** Generated: base_price * discount_percent / 100 */
  discount_amount: number;
  /** Generated: base_price - discount_amount */
  final_price: number;
  currency_code: string;
  unit_label: string;
  stock_qty: number | null;
  is_service: boolean;
  rating_avg: number;
  rating_count: number;
  status: MarketplaceItemStatus;
  is_featured: boolean;
  published_at: string | null;
  wa_number: string | null;
  location_note: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface MarketplaceItemMedia {
  id: string;
  item_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface MarketplaceItemTag {
  id: string;
  item_id: string;
  tag: string;
}

export interface MarketplaceTransaction {
  id: string;
  tenant_id: string;
  item_id: string;
  buyer_user_id: string;
  seller_user_id: string;
  qty: number;
  item_price_snapshot: number;
  discount_snapshot_pct: number;
  discount_snapshot_amount: number;
  subtotal_amount: number;
  platform_fee_amount: number;
  total_amount: number;
  status: MarketplaceTxStatus;
  payment_status: MarketplacePaymentStatus;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface MarketplaceTransactionEvent {
  id: string;
  transaction_id: string;
  event_type: MarketplaceTxEventType;
  actor_user_id: string | null;
  note: string | null;
  created_at: string;
}

/**
 * Database schema types for reference.
 * Run `npx supabase gen types typescript` to generate from your project.
 */
export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> };
      tenants: { Row: Tenant; Insert: Partial<Tenant>; Update: Partial<Tenant> };
      communities: { Row: Community; Insert: Partial<Community>; Update: Partial<Community> };
      houses: { Row: House; Insert: Partial<House>; Update: Partial<House> };
      tenant_users: { Row: TenantUser; Insert: Partial<TenantUser>; Update: Partial<TenantUser> };
      user_houses: { Row: UserHouse; Insert: Partial<UserHouse>; Update: Partial<UserHouse> };
      house_join_requests: { Row: HouseJoinRequest; Insert: Partial<HouseJoinRequest>; Update: Partial<HouseJoinRequest> };
      badges: { Row: Badge; Insert: Partial<Badge>; Update: Partial<Badge> };
      user_badges: { Row: UserBadge; Insert: Partial<UserBadge>; Update: Partial<UserBadge> };
      roles: { Row: Role; Insert: Partial<Role>; Update: Partial<Role> };
      tenant_user_roles: { Row: TenantUserRole; Insert: Partial<TenantUserRole>; Update: Partial<TenantUserRole> };
      authority_assignments: { Row: AuthorityAssignment; Insert: Partial<AuthorityAssignment>; Update: Partial<AuthorityAssignment> };
      verifications: { Row: Verification; Insert: Partial<Verification>; Update: Partial<Verification> };
      otp_codes: { Row: OtpCode; Insert: Partial<OtpCode>; Update: Partial<OtpCode> };
      sessions: { Row: Session; Insert: Partial<Session>; Update: Partial<Session> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      marketplace_domains: { Row: MarketplaceDomain; Insert: Partial<MarketplaceDomain>; Update: Partial<MarketplaceDomain> };
      marketplace_categories: { Row: MarketplaceCategory; Insert: Partial<MarketplaceCategory>; Update: Partial<MarketplaceCategory> };
      marketplace_items: { Row: MarketplaceItem; Insert: Partial<MarketplaceItem>; Update: Partial<MarketplaceItem> };
      marketplace_item_media: { Row: MarketplaceItemMedia; Insert: Partial<MarketplaceItemMedia>; Update: Partial<MarketplaceItemMedia> };
      marketplace_item_tags: { Row: MarketplaceItemTag; Insert: Partial<MarketplaceItemTag>; Update: Partial<MarketplaceItemTag> };
      marketplace_transactions: { Row: MarketplaceTransaction; Insert: Partial<MarketplaceTransaction>; Update: Partial<MarketplaceTransaction> };
      marketplace_transaction_events: { Row: MarketplaceTransactionEvent; Insert: Partial<MarketplaceTransactionEvent>; Update: Partial<MarketplaceTransactionEvent> };
    };
  };
}
