-- House join requests: new user requests to join an existing house (same blok).
-- Owner approves/rejects from profile. Approved => user_houses (FAMILY); rejected => no link.

CREATE TYPE house_join_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE house_join_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id            UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  requester_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              house_join_request_status NOT NULL DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at        TIMESTAMPTZ,
  responded_by        UUID REFERENCES users(id),
  UNIQUE (house_id, requester_user_id)
);

CREATE INDEX idx_house_join_requests_house_id ON house_join_requests(house_id);
CREATE INDEX idx_house_join_requests_requester_user_id ON house_join_requests(requester_user_id);
CREATE INDEX idx_house_join_requests_status ON house_join_requests(status);

ALTER TABLE house_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "House join requests: no anon access"
  ON house_join_requests FOR ALL TO anon USING (false) WITH CHECK (false);
