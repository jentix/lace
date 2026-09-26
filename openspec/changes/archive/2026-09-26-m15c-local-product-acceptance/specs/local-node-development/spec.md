## MODIFIED Requirements

### Requirement: Local publication refresh and credential setup are documented
The developer guide SHALL explain how an administrator creates a read-only build token through the Admin Settings screen, configures the local server-side site process without committing the plaintext token, and refreshes or restarts the site after publication. The documented editorial path SHALL not require a browser-console API call or direct content API call. It SHALL explain that saving a draft does not change public site content and that automated build dispatch is not yet part of this workflow.

#### Scenario: Contributor publishes a changed draft
- **WHEN** a contributor follows the guide after publishing an edited entry
- **THEN** the documented refresh or restart step displays the new published content without editing the fixture

#### Scenario: Contributor saves without publishing
- **WHEN** a contributor saves a draft and follows the same refresh or restart step
- **THEN** the public site continues displaying the prior published content

#### Scenario: Administrator configures the live site through Admin
- **WHEN** an administrator follows the documented local setup after first sign-in
- **THEN** Settings issues the once-shown read-only build token and the administrator can enable live site mode without calling an API from the browser console
