# Limits

## Current Technical Limits

- No TURN relay support yet for difficult NAT environments
- Group chat and group calls are not implemented
- Push notifications are not finalized for production scale
- Large-file behavior depends on Cloudinary and client network reliability

## Operational Limits

- Single-node-first deployment assumptions in parts of runtime state
- Horizontal socket scaling requires adapter/infra setup

## Product Limits

- 1-to-1 communication only
- Mobile app is still in active development

## Migration Notes

- Legacy frontend has been removed from this repository
- The active web client is `web/` (React + Vite)
