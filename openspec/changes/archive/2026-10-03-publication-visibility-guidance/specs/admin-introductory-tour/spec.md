## MODIFIED Requirements

### Requirement: Publication guidance distinguishes content state from served-site updates
Guidance SHALL explain that saving changes a draft, publication makes a snapshot
available to published-content consumers, and the served site's update depends
on its rendering/build setup. It SHALL explain recorded build statuses without
claiming publication guarantees immediate site refresh or successful deployment.
It SHALL use Step 29's verified mode guidance: Astro dev shows published changes
to existing pages on reload and needs a restart for new or renamed URLs, a
manual static site needs a fresh build and deployment, and automatic builds
serve content after a succeeded build. It SHALL NOT prescribe restarting Astro
development after every publication and SHALL NOT offer build-source selection.

#### Scenario: Publication is explained before mode verification
- **WHEN** an admin reaches publication or Builds guidance and Admin cannot know which site mode the operator uses
- **THEN** guidance distinguishes publishing from site updating, summarizes the verified dev, manual static and automatic build behavior, and suggests inspecting build status without promising immediate deployment
