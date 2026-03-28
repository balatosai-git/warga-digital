# Kas-RT Notifications - Quick Reference

## What Was Added

Notifications are now sent whenever authorized users **edit (PATCH)** or **delete (DELETE)** kas-rt transactions and categories.

## Summary of Changes

### 1. Transaction Notifications (PATCH & DELETE)
**File:** `src/app/api/kas-rt/transactions/[id]/route.ts`

| Action | Title | Recipients | Page |
|--------|-------|-----------|------|
| PATCH (Edit) | "Pemasukan/Pengeluaran Kas RT Diperbarui" | Users with `ROLE_IDS_CAN_SUBMIT_KAS_RT` | `/kas-rt` |
| DELETE | "Pemasukan/Pengeluaran Kas RT Dihapus" | Users with `ROLE_IDS_CAN_SUBMIT_KAS_RT` | `/kas-rt` |

**Notification includes:**
- Transaction title
- Amount in Rupiah format
- Transaction type (income/expense)
- Date
- Action performed (UPDATED/DELETED)

### 2. Category Notifications (POST, PATCH & DELETE)
**Files:** 
- `src/app/api/admin/kas-rt-categories/route.ts`
- `src/app/api/admin/kas-rt-categories/[id]/route.ts`

| Action | Title | Recipients | Page |
|--------|-------|-----------|------|
| POST (Create) | "Kategori Kas RT Baru" | Users with `ROLE_IDS_ADMIN` | `/admin/kas-rt-categories` |
| PATCH (Update) | "Kategori Kas RT Diperbarui" | Users with `ROLE_IDS_ADMIN` | `/admin/kas-rt-categories` |
| DELETE | "Kategori Kas RT Dihapus" | Users with `ROLE_IDS_ADMIN` | `/admin/kas-rt-categories` |

**Notification includes:**
- Category name
- Action performed (created/updated/deleted)

## Default Role IDs

- **Can Submit Kas-RT:** 4 (RT_BENDAHARA), 8 (RW_BENDAHARA)
- **Admin:** 4 (RT_ADMIN), 5 (RW_ADMIN)

*Configurable via environment variables: `ROLE_IDS_CAN_SUBMIT_KAS_RT` and `ROLE_IDS_ADMIN`*

## How It Works

1. User performs action (edit/delete transaction or manage category)
2. Action is saved to database
3. Notification helper function is called
4. All authorized users are fetched based on role
5. Notification records created with deduplication key
6. Notifications inserted to database (non-blocking)
7. User receives notification in-app

## Error Handling

- Notification failures **do NOT** block the transaction/category operation
- All errors logged to console for debugging
- If notification system is down, transactions still process normally

## Testing Checklist

- [ ] Edit transaction → managers receive "Diperbarui" notification
- [ ] Delete transaction → managers receive "Dihapus" notification
- [ ] Create category → admins receive "Baru" notification
- [ ] Edit category → admins receive "Diperbarui" notification
- [ ] Delete category → admins receive "Dihapus" notification
- [ ] Notification links navigate to correct pages
- [ ] No duplicate notifications (dedupe works)
- [ ] Unauthorized users don't receive notifications

## Deduplication

Notifications use `dedupe_key` to prevent duplicates:
- Transaction: `kas_rt_transaction:{id}:{action}:to:{userId}`
- Category: `kas_rt_category:{id}:{action}:to:{userId}`

Same notification won't be created twice for same user/entity/action.

## Database

- Uses existing `notifications` table
- No schema changes required
- Stores in `notifications` table with type='KAS_RT'

## Files Modified

1. `src/app/api/kas-rt/transactions/[id]/route.ts`
   - Added `sendKasRtNotification()` helper (line 53-119)
   - PATCH calls notifications after update (line 299-305)
   - DELETE calls notifications after deletion (line 382-391)

2. `src/app/api/admin/kas-rt-categories/route.ts`
   - Added `sendCategoryNotification()` helper (line 37-127)
   - POST calls notifications after creation (line 263-270)

3. `src/app/api/admin/kas-rt-categories/[id]/route.ts`
   - Added `sendCategoryNotification()` helper (line 20-109)
   - PATCH calls notifications after update (line 230-238)
   - DELETE calls notifications after deletion (line 347-355)

## Notifications Table Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  recipient_user_id UUID,
  actor_user_id UUID,
  type VARCHAR (e.g., 'KAS_RT'),
  priority VARCHAR (e.g., 'NORMAL'),
  title VARCHAR(160),
  body TEXT,
  action_url VARCHAR(255),
  entity_table VARCHAR(60),
  entity_id UUID,
  dedupe_key VARCHAR(120) UNIQUE,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID
);
```

## Metadata Structure

**Transactions:**
```json
{
  "transactionId": "uuid",
  "transactionType": "income|expense",
  "amount": 150000,
  "date": "2025-01-15",
  "action": "UPDATED|DELETED"
}
```

**Categories:**
```json
{
  "categoryId": "uuid",
  "categoryName": "string",
  "action": "created|updated|deleted"
}
```

## Future Enhancements

- [ ] Email notifications for missed in-app notifications
- [ ] User preference settings for notification types
- [ ] Real-time push notifications via WebSocket
- [ ] Notification grouping for multiple changes
- [ ] Scheduled notification digests
- [ ] Attachment change notifications
- [ ] Approval workflows with notifications

## Rollback

To disable notifications temporarily:
1. Comment out `await sendKasRtNotification()` calls in transaction file
2. Comment out `await sendCategoryNotification()` calls in category files
3. Transactions/categories will still work normally
4. No data loss or corruption

Or fully revert the three modified files.