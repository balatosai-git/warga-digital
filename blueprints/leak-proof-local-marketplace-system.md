# Leak-Proof Local Marketplace System (Indonesia)

**Role:** Platform systems analyst  
**Objective:** Transaction capture, trust enforcement, value retention  
**Scope:** Perumahan, desa, RT/RW, koperasi, masjid, UMKM cluster  
**Constraint:** Users are fluent in WhatsApp, bank transfer, COD, informal trust, rule bypassing  
**Failure condition:** Any flow that allows *platform chat → bank transfer → WhatsApp confirmation* is INVALID.

---

## TASK 1 — DISCOVERY LEAKAGE

### How Goods & Services Are Discovered
- WhatsApp Groups:
  - “Warga RT 05”
  - “Info Perumahan”
  - “Jual Beli Komplek”
- Offline:
  - Warung
  - Masjid (after shalat)
  - Pos satpam
- Social:
  - Tetangga → tetangga
  - “Kenal orangnya”

### Typical Discovery Phrases
- “Ada yang jual gas?”
- “Butuh tukang AC”
- “Ada catering murah buat arisan?”

### Exact Bypass Phrases (Common)
- “Japri ya”
- “DM aja”
- “Langsung WA saya”
- “Biar enak, chat pribadi”
- “Biar cepet, lewat WA”
- “Gak usah ribet lewat aplikasi”
- “Transfer aja langsung”
- “COD depan rumah aja”
- “Lewat platform ribet potongannya”

### Typical Transaction Flow (Uncontrolled)

**Service**
1. Post in group  
2. Private WhatsApp chat  
3. Price negotiation  
4. “Transfer dulu ya”  
5. Service delivered  
6. Problem → ignored / social complaint  

**Goods**
1. Post photo  
2. “Masih ada?”  
3. COD or transfer  
4. Item handed over  
5. No receipt, no system  

### Control Loss Points
- Discovery → WhatsApp
- Negotiation invisible
- Payment outside system
- No transaction record
- No dispute authority
- No post-payment leverage

---

## TASK 2 — PAYMENT & TRUST REALITY

### Who Is Trusted (Descending Order)
- RT / RW
- Mosque admin (DKM)
- Senior warga / sesepuh
- Known toko owner
- Satpam
- Koperasi admin

### What Proof Is “Enough”
- “Orangnya tetangga sini”
- “Pernah bantu acara RT”
- “Nomornya ada di grup”
- “Rekening atas nama sendiri”
- “Disaksikan satpam”

### Dispute Resolution (Reality)
- Public shaming in WA group
- Report to RT
- Group ban
- Silent exclusion
- Police only for large fraud

### Fear vs Tolerance
**Fear**
- Money lost
- Seller disappears
- Reputation damage

**Tolerate**
- Extra steps for safety
- Delayed payout
- Manual confirmation

**Will Not Tolerate**
- Loss of face
- Public accusation
- Community exclusion

---

## TASK 3 — RULE RESISTANCE & BYPASS

### Most Bypassed Rules
- Platform payment
- Platform chat
- Platform fees
- Identity verification

### Why They Bypass
- “Biar cepet”
- “Biar gak dipotong”
- “Sudah saling kenal”
- “Aplikasi ribet”

### Enforcement Reality

**Soft Enforcement (Fails)**
- Warning messages
- Popups
- Education banners

**Hard Enforcement (Works)**
- Transaction freeze
- Reputation downgrade visible to RT
- Access suspension
- Community marketplace ban
- Public flag: “⚠ Pernah bypass”

---

## TASK 4 — PLATFORM CONTROL LEVERS

### 1. Payment Control (Mandatory)
- No seller contact before escrow
- No chat unlock without payment initiation

**Without it:** Platform becomes advertising only.

### 2. Escrow / Staged Release
- Buyer pays platform
- Seller paid after delivery confirmation or RT/satpam approval

**Without it:** No dispute authority.

### 3. Identity Anchor (Local)
- RT number
- RW number
- Block / cluster
- Verified by RT / mosque admin

**Without it:** Platform treated as anonymous.

### 4. Dispute Authority
- Platform decision is final
- Backed by RT endorsement and logs

**Without it:** Disputes return to WhatsApp.

---

## TASK 5 — LOCAL POWER STRUCTURES

### Authority Embedding
- **RT/RW:** Verify users, suspend accounts
- **Masjid/Koperasi:** Moral authority, escrow sponsor
- **Satpam:** Physical verification, COD witness

### Social + Digital Sanctions
- Platform ban → RT notified
- RT ban → marketplace removal
- Visible status: “Akun dibatasi oleh RT 05”

---

## TASK 6 — OFF-PLATFORM PENALTY DESIGN

### Trigger Conditions
- External chat
- Off-platform payment
- Delivery without escrow

### Effective Penalties
- Reputation drop visible to neighbors
- Temporary buyer ban
- Loss of access to RT-verified sellers
- Removal from featured listings
- Flag: “Pernah transaksi di luar sistem”

**Why It Works**
- Community standing > money
- Access > convenience
- Face > discounts

---

## TASK 7 — MINIMUM VIABLE RIGIDITY (MVR)

### Mandatory
- Platform escrow payment
- RT/RW-linked identity
- Platform chat only
- Delivery confirmation
- Dispute process

### Automated
- Payment lock before chat
- Escrow release rules
- Reputation updates
- Penalty triggers

### Never Optional
- Payment routing
- Identity anchor
- Transaction logging
- Sanction visibility

### Rigidity Checklist
- [ ] No chat without payment
- [ ] No contact info before escrow
- [ ] No payout without confirmation
- [ ] No anonymous seller
- [ ] No off-platform completion without penalty
- [ ] RT-visible enforcement status

---

## HARD TRUTH

**If users can say “chat sini, transfer sana” — the platform is already dead.**

A viable Indonesian local marketplace must function as:
- Community ledger
- Controlled exchange
- Socially backed authority

—not a friendly classifieds app.
