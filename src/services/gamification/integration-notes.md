# Gamification Integration Notes

## Backend-only finalization

All XP-granting actions must be finalized in Firebase Functions for integrity:

- `discoverPlace`
- `visitPlace`
- `collectPlace`
- `uploadApprovedPhoto`
- `approvedSuggestedEdit`

The mobile app can use the shared engine for display, previews, and local eligibility checks, but it should not be the source of truth for persisted XP or levels.

## Recommended backend flow

1. Build a deterministic event id from the approved business event.
2. Derive the dedupe key with `getAwardKey(action, eventId)`.
3. In a Firestore transaction, check whether that dedupe key already exists for the user.
4. If it exists, return a no-op result.
5. If it does not exist, call `awardXp(...)` with the current persisted XP and known awarded keys.
6. Persist the updated `xp` and `level`, plus an immutable award record keyed by the dedupe key.

## Suggested event id examples

- `discoverPlace`: `place:{placeId}`
- `visitPlace`: `visit:{visitId}`
- `collectPlace`: `collection:{collectionId}`
- `uploadApprovedPhoto`: `photo:{photoId}`
- `approvedSuggestedEdit`: `suggested-edit:{suggestedEditId}`

## Mobile app usage

- Use `getLevelFromXp(profile.xp)` and `getXpForNextLevel(profile.xp)` for UI.
- Use `canAwardActionXp(...)` only for local gating or optimistic messaging.
- Refresh from backend after any award-triggering workflow completes.
