# Engineering Team Meeting — 2026-05-02

**Attendees:** Alice (lead), Bob (backend), Carol (frontend), Dave (DevOps)

---

**Alice:** Good morning everyone. Let's start with the status update on the migration to the new authentication system.

**Bob:** Sure, I've been working on it. The migration is about 60% complete. We've migrated the user table and the sessions table. The main challenge right now is the legacy token format. We have tokens that are still in the old format that need to be supported during the transition period.

**Alice:** That makes sense. How long do you think the transition period needs to be?

**Bob:** I think we need at least 30 days to allow existing users to refresh their tokens. We could potentially reduce it to 14 days if we send email notifications proactively.

**Carol:** From the frontend side, I've already updated the token handling to support both formats. The change is behind the feature flag `AUTH_LEGACY_TOKENS` which is currently set to true in production.

**Alice:** Good. Dave, what's the deployment situation?

**Dave:** The staging deployment went smoothly. We ran into some issues with the health checks but those were resolved by adjusting the timeout from 10 seconds to 30 seconds. Production should be straightforward.

**Alice:** Great. Let's schedule the production deployment for next Tuesday. Bob, can you have the migration ready by Monday?

**Bob:** Yes, I should be able to finish it by Friday actually. That gives us the weekend buffer.

**Alice:** Perfect. Now let's talk about the API rate limiting work. Carol, I know you've been looking at the frontend impact.

**Carol:** Right. The current rate limit is 100 requests per minute for free tier users. Our frontend makes about 45 requests per minute during heavy usage, so we have some headroom. But if we lower the free tier limit, we'll need to implement better request batching.

**Bob:** We're planning to reduce it to 60 requests per minute for free tier. The Pro plan will stay at 300. This should help reduce server costs by about 15-20%.

**Dave:** I can set up the rate limiting configuration in the nginx reverse proxy. It's straightforward with the `limit_req_zone` directive.

**Alice:** Sounds good. Let's aim to have the rate limiting changes deployed alongside the auth migration next Tuesday. Any other business?

**Carol:** Just a quick note — the new onboarding flow is ready for review. I'll send out a review link this afternoon. I'd love feedback before we ship it next week.

**Bob:** I'll take a look.

**Dave:** Same here.

**Alice:** Great. Thanks everyone. Let's sync again Thursday.

---

*Meeting ended at 09:45*

*Action items:*
- Bob: Complete auth migration by Friday 2026-05-06
- Carol: Send onboarding flow review link
- Dave: Prepare nginx rate limiting config
- Alice: Schedule production deployment for Tuesday 2026-05-07
