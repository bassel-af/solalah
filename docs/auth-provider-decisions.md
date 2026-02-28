Identity & Authentication Decision Summary

Context
We are building a family-oriented platform with two clients: a Next.js web application and a Flutter mobile application. Users can belong to multiple families with different roles in each (e.g., admin in one family, regular member in another). The platform will grow with many features over time. We need a centralized authentication system that handles identity securely. After evaluating both self-hosted open-source options and managed cloud services, we chose Keycloak.

Evaluated Providers
- Keycloak (self-hosted, open source, Java/Quarkus)
- Clerk (managed cloud service)
- Zitadel (self-hosted, open source, Go)
- Authentik (self-hosted, open source, Python/Django)

Why Keycloak

Production stability: Keycloak has been in development for 12 years, backed by Red Hat, and is part of the CNCF incubation program. It is the most battle-tested identity solution available. For a platform that will grow significantly, this maturity reduces operational risk.

License safety: Keycloak uses the Apache 2.0 license, which has no copyleft restrictions. This means there is no risk of being forced to open-source application code due to integration with the identity provider.

No vendor lock-in: Keycloak is fully self-hosted and open source. There is no dependency on a third-party company's pricing decisions, terms of service changes, or continued existence. Migration away from Keycloak means migrating standard OIDC — not untangling proprietary SDK integrations.

Largest ecosystem: Keycloak has the largest community (~31,000 GitHub stars), the most Stack Overflow answers, tutorials, and third-party integrations. When problems arise, finding solutions is easier than with any alternative.

Handles the hardest parts: Account registration, email verification, secure login, JWT token issuance and refresh, password recovery, brute-force protection, and session management across multiple devices. Building all of this manually would take weeks and would be prone to serious security vulnerabilities.

Widest protocol support: Keycloak supports OIDC, SAML, and LDAP out of the box. As the platform grows and potentially integrates with external systems, this breadth matters.

Future extensibility: Social login (Google, Apple), MFA policies, user federation, and identity brokering are all built in with no rebuilding needed.

Self-hosted for privacy: User data stays on our own server and never leaves to third-party companies.

Flutter integration: Community-maintained packages (keycloak_wrapper, keycloak_flutter) provide mature OIDC/PKCE flows with token management and secure storage. These are not official SDKs, but they are well-documented and battle-tested. Since no provider offers pre-built Flutter UI components, custom auth UI must be built regardless of provider choice — this levels the playing field.

Known trade-offs with Keycloak

Resource usage: Keycloak is the heaviest option evaluated, with a baseline memory footprint of ~1.25 GB RAM. It uses a Java/Quarkus stack with 8 separate cache configurations that can be complex to tune. For a growing platform this is acceptable, but it is a real cost.

Admin UI complexity: Keycloak's admin console is powerful but complex. The learning curve is steep compared to Authentik's visual flow designer or Clerk's dashboard.

Permissions in the application layer: Family permissions (one user, multiple families, different roles per family) must be built in our application code. Keycloak handles authentication and identity; our backend handles family-level authorization. This is additional development work, but it gives us full control over the permission model as the platform grows.

Version upgrades: Major Keycloak version upgrades (notably the WildFly to Quarkus migration) have historically introduced breaking changes. Upgrades require careful planning.

Why Not Clerk

Clerk was the strongest alternative evaluated. Its Organizations feature natively models "one user, multiple groups with per-group roles" — which maps directly to our families model. It also has a first-class Next.js integration with pre-built React components. However:

No self-hosting: Clerk is entirely cloud-hosted. User data lives on Clerk's servers with no option to self-host. For a family platform handling personal genealogical data, this is a significant privacy concern.

Vendor lock-in: Clerk's SDK is deeply embedded in application code (components like <SignIn>, <OrganizationSwitcher>, hooks, middleware). If Clerk raises prices, changes terms, or shuts down, migration requires rewriting auth flows across the entire application — not just swapping an OIDC provider.

Flutter SDK is beta: Clerk announced its official Flutter SDK in March 2025, but it remains in beta as of February 2026. Building a production mobile app on a beta authentication SDK introduces risk of breaking changes and missing features. There are no pre-built Flutter UI components like the React ones — so the main DX advantage Clerk has on web does not carry over to mobile.

Cost grows with usage: The free tier (10,000 MAUs, 100 organizations) is generous for early development. Beyond that, costs scale at $0.02/user/month plus add-ons (SMS + social login = $200/mo). For a self-hosted alternative, the only cost is server resources.

Clerk's real strengths: The Organizations model with per-org custom roles and permissions would eliminate the need to build our own family permissions layer. The Next.js App Router integration is best-in-class with native React Server Components support. The <OrganizationSwitcher> component alone would save significant frontend work on web. For a web-only project or one using React Native, Clerk would likely be the better choice.

Why Not Zitadel

Self-hosting is not production-grade: Multiple developer reports from 2025-2026 describe Zitadel's self-hosting experience as brittle. Documentation is written primarily for cloud users, init-time-only environment variables cause silent failures that are hard to diagnose, and architectural churn (e.g., Login V2 split into a separate service) disrupts existing deployments.

AGPL 3.0 license: Zitadel switched from Apache 2.0 to AGPL 3.0 in May 2025 (effective v3). If Zitadel is integrated into the application rather than used as a purely external service, the AGPL copyleft provisions could require open-sourcing the entire application. This introduces legal risk that does not exist with Keycloak or Clerk.

Security track record: High-severity security advisories were reported in 2025, including SSRF and account-takeover-style federation flaws. While all software has vulnerabilities, this is concerning for a younger project.

No Flutter SDK: Zitadel does not provide a Flutter SDK. Their documentation recommends generic OIDC libraries like flutter_appauth. This is workable but offers no advantage over Keycloak's community packages.

Actions V2 adds operational overhead: Zitadel's extensibility system moved from inline JavaScript to external webhooks. Custom logic now requires deploying and maintaining separate HTTP services, adding latency, failure modes, and infrastructure complexity.

Community is growing but still smaller: Zitadel has grown to ~12,000 GitHub stars and 200+ contributors, which is respectable. However, Keycloak's ecosystem is still significantly larger, and Zitadel's documentation has acknowledged gaps in onboarding and clarity.

Why Not Authentik

Risk of outgrowing it: Authentik is positioned for small-to-medium deployments and homelab use cases. For a platform with many planned features and long-term growth, there is a risk of hitting limitations as complexity increases. Keycloak has more proven scalability at larger scales.

Smallest ecosystem: Authentik has the smallest community of the four options evaluated, with fewer integrations, fewer production deployment reports, and less third-party tooling.

No Flutter SDK: Like Zitadel, Authentik does not provide a Flutter SDK. Integration relies on generic OIDC libraries.

Authentik's real strengths: Authentik has the best admin UI of the self-hosted options (visual flow-based designer), uses less memory than Keycloak (~600 MB-1 GB), and is genuinely easier to set up and maintain. It uses the Apache 2.0 license. For a smaller project, Authentik would be a strong choice. For our growth ambitions, Keycloak's maturity and ecosystem outweigh Authentik's ease-of-use advantages.

Decision Summary
Keycloak is chosen for its production maturity, Apache 2.0 license, largest ecosystem, and full self-hosting capability. The main cost is higher resource usage and the need to build family permissions in our application layer. Clerk was the closest alternative — its Organizations model is a near-perfect fit for our data model, but vendor lock-in, no self-hosting, and a beta Flutter SDK ruled it out. Zitadel's AGPL license change and brittle self-hosting experience, and Authentik's smaller scale, ruled out the remaining options.
