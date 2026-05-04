# Engineering Team Meeting — 2026-05-02

**Attendees:** Alice (lead), Bob (backend), Carol (frontend), Dave (DevOps)

---

**Alice:** Good morning. Start with status update on migration to new auth system.

**Bob:** Sure. Migration ~60% complete. Migrated user and sessions tables. Main challenge: legacy token format. Old-format tokens need support during transition.

**Alice:** Makes sense. How long transition period needs to be?

**Bob:** Need at least 30 days for existing users to refresh tokens. Could reduce to 14 days with proactive email notifications.

**Carol:** Frontend token handling updated for both formats. Behind feature flag `AUTH_LEGACY_TOKENS`, true in production.

**Alice:** Good. Dave, deployment situation?

**Dave:** Staging deployment smooth. Health check issues resolved by adjusting timeout from 10s to 30s. Production straightforward.

**Alice:** Great. Schedule prod deploy next Tuesday. Bob, migration ready by Monday?

**Bob:** Yes, finish by Friday. Weekend buffer.

**Alice:** Perfect. Now API rate limiting. Carol, frontend impact?

**Carol:** Right. Current rate limit: 100 req/min free tier. Frontend ~45 req/min heavy usage, some headroom. Lower free tier limit → need better request batching.

**Bob:** Planning to reduce free tier to 60 req/min. Pro stays at 300. Reduces server costs ~15-20%.

**Dave:** Can set up rate limiting in nginx reverse proxy. Straightforward with `limit_req_zone`.

**Alice:** Sounds good. Deploy rate limiting changes alongside auth migration next Tuesday. Other business?

**Carol:** Quick note — new onboarding flow ready for review. Will send review link this afternoon. Want feedback before ship next week.

**Bob:** I'll take a look.

**Dave:** Same here.

**Alice:** Great. Thanks everyone. Sync Thursday.

---

*Meeting ended at 09:45*

*Action items:*
- Bob: Complete auth migration by Friday 2026-05-06
- Carol: Send onboarding flow review link
- Dave: Prepare nginx rate limiting config
- Alice: Schedule production deployment for Tuesday 2026-05-07
