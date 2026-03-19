Identity & Authentication Decision Summary

Context
We are building a family-oriented platform with two clients: a Next.js web application and an Expo mobile application. Users can belong to multiple families with different roles in each (e.g., admin in one family, regular member in another). The platform will grow with many features over time. We need a centralized authentication system that handles identity securely and supports email login, Google SSO, phone OTP, 2FA, and full session/refresh token control — while keeping all user data private on our own infrastructure.

After evaluating both self-hosted open-source options and managed cloud services, we chose Supabase Auth (self-hosted).

Evaluated Providers
- Supabase Auth (self-hosted, open source, GoTrue engine)
- Keycloak (self-hosted, open source, Java/Quarkus)
- Clerk (managed cloud service)
- Zitadel (self-hosted, open source, Go)
- Authentik (self-hosted, open source, Python/Django)

Why Supabase Auth

All required auth features are first-class, not extensions: email/password, Google SSO, phone OTP (via SMS gateway), TOTP-based 2FA, session management, and refresh token control are all built into Supabase Auth natively. No extension installation, no custom authenticator SPI, no third-party plugin maintenance.

Official Expo SDK: Supabase provides an official JavaScript SDK (@supabase/supabase-js) with documented Expo/React Native integration. This is a meaningful advantage over Keycloak, which relies on community-maintained packages with no official mobile SDK.

Consolidated infrastructure: Self-hosting Supabase via Docker Compose gives us PostgreSQL (our application database), authentication (GoTrue), and file storage (for albums and media uploads) in a single stack. Three infrastructure concerns collapse into one deployment. This reduces operational complexity significantly.

Self-hosted and private: Supabase is fully open source (Apache 2.0) and designed to be self-hosted via Docker Compose. All user data, credentials, and sessions remain on our own server. No data leaves to third-party services.

Lighter than Keycloak: Supabase Auth (GoTrue) has a much smaller resource footprint than Keycloak's Java/Quarkus stack (~1.25 GB RAM baseline). This matters for a growing platform starting on modest infrastructure.

License safety: Apache 2.0 with no copyleft restrictions. No risk of being forced to open-source application code due to the auth integration.

Known trade-offs with Supabase Auth

Younger project: Supabase is approximately 5 years old versus Keycloak's 12. It is less battle-tested at enterprise scale. For a family platform (not a bank or large enterprise), this trade-off is acceptable.

Self-hosting complexity: The official Supabase self-hosted Docker Compose stack includes multiple services (PostgreSQL, GoTrue, PostgREST, Storage API, Kong gateway, Studio). This is more moving parts than running Keycloak alone, but the upside is a complete infrastructure stack rather than auth only.

Admin UI: Supabase Studio (included in the Docker Compose stack) provides a user management interface, but it is less feature-rich than Keycloak's admin console for advanced identity management scenarios.

All family permissions in application layer: As with Keycloak, workspace memberships, branch memberships, content roles, and user-tree linking must be built in our application code. Supabase Auth handles identity; our backend handles family-level authorization. This is not a Supabase-specific limitation — it applies to every option evaluated.

Why Not Keycloak

Keycloak was the previous choice and remains technically capable. The primary reasons for switching are:

Phone OTP requires a third-party extension: Native phone authentication is not built into Keycloak. It requires installing and maintaining a community extension (e.g., keycloak-phone-authenticator), which adds operational overhead and dependency risk.

No official Expo SDK: Keycloak's mobile integration for Expo/React Native relies on community-maintained packages. No official SDK means more risk of breaking changes and less documentation.

Resource overhead without proportional benefit: Keycloak's ~1.25 GB RAM baseline is justified for enterprise identity federation scenarios. For our use case — email, Google SSO, phone OTP, 2FA — Supabase Auth provides the same feature set at a fraction of the resource cost.

Supabase provides more than auth: Switching to Supabase means consolidating the database, auth, and file storage into one self-hosted stack. Keycloak is auth-only and would still require separate PostgreSQL and storage infrastructure.

Why Not Clerk

Clerk was the strongest managed option evaluated. Its developer experience for Next.js is best-in-class and its Organizations feature natively models our multi-workspace data model. However, Clerk is entirely cloud-hosted with no self-hosting option. For a family platform handling personal genealogical data and private family content, storing user credentials and sessions on a third-party company's servers is not acceptable. Vendor lock-in and SDK coupling are additional concerns.

Why Not Zitadel

Zitadel switched from Apache 2.0 to AGPL 3.0 in May 2025 (effective v3). This license change introduces legal risk if Zitadel is integrated into the application rather than used as a purely external service. Additionally, multiple developer reports from 2025–2026 describe Zitadel's self-hosting experience as brittle, with documentation primarily written for cloud users and architectural churn disrupting existing deployments. Zitadel also has no official Expo SDK.

Why Not Authentik

Authentik is well-suited for smaller deployments and has an excellent admin UI. However, phone OTP support is not first-class, there is no official Expo SDK, and the community and ecosystem are the smallest of the options evaluated. For a platform with significant planned growth, Keycloak or Supabase are safer long-term choices.

Deployment

Supabase is deployed via the official Docker Compose configuration from the Supabase GitHub repository. All services run in Docker containers on our own server. The stack includes: PostgreSQL, GoTrue (auth), PostgREST, Storage API, Kong (API gateway), and Supabase Studio (admin UI). Environment variables control SMTP configuration, SMS gateway credentials (for phone OTP), and OAuth client credentials (for Google SSO).

Decision Summary
Supabase Auth (self-hosted via Docker Compose) is chosen for its native support of all required auth features, official Expo SDK, consolidated infrastructure (DB + auth + storage in one stack), lighter resource footprint, Apache 2.0 license, and full self-hosting capability. Keycloak was the previous choice and remains capable, but Supabase better fits the current requirements given the Expo mobile target and the value of consolidating infrastructure. Clerk was the strongest alternative from a DX perspective but is ruled out by its cloud-only model.
