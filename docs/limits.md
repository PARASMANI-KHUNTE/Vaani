# Limits

## Current Functional Limits

- Chat is currently focused on 1-to-1 conversations only
- Calling is currently 1-to-1 only
- Active call state is kept in memory, not Redis
- TURN server support is not yet integrated
- No dedicated native mobile app exists yet
- Push notifications for closed-app mobile delivery are not implemented
- Group chat and group calling are not implemented

## Current Technical Limits

- Horizontal scaling for active calls is not complete because live call state is not yet externalized
- WebRTC currently depends on STUN only, which is not enough for all restrictive network cases
- Moderation is basic and not yet extended to advanced antivirus, NSFW, or AI classification pipelines
- Full observability stack such as tracing, metrics dashboards, and alerting is not documented as completed
- Background job orchestration is lightweight and not based on a dedicated queue system

## Current UX Limits

- Call history is visible in profile but not yet exposed as a dedicated standalone screen
- Missed call notifications are not yet separated from the broader notification strategy
- Call reconnect UX can be improved for flaky networks
- Advanced accessibility review has not been formally documented

## Documentation Limits

- API docs are descriptive markdown, not OpenAPI/Swagger yet
- Architecture docs describe the current implementation but do not yet include sequence diagrams
- Operational runbooks and incident procedures are not yet formalized

## Mobile Readiness Limits

- No Expo app scaffold exists yet
- OTA channels and mobile release environments are not configured yet
- `react-native-webrtc` integration decisions for Expo are pending

## Practical Development Limits

- The repo has shown occasional `.next/types` regeneration quirks during repeated typecheck/build runs
- Some polished production items still depend on final infrastructure choices such as Redis adapter setup, TURN deployment, push provider selection, and crash reporting platform
