## MODIFIED Requirements

### Requirement: The shell header shows breadcrumbs without internal identifiers
The route header SHALL present breadcrumb navigation that locates the current
screen: the content overview, a model by its label, and an entry by its title,
or the resource screen name for Media, Builds, Users, and Settings. Every
breadcrumb except the last SHALL be a link, and the last SHALL be marked as the
current page. A model breadcrumb SHALL use the model's label, falling back to
its configured key. While an entry title is loading or unavailable the
breadcrumb SHALL use a neutral word. Breadcrumbs SHALL never show an entry ID
or a user ID. The header SHALL remain visible at the top of the viewport while
the route content scrolls, and SHALL offer the current screen a place for its
page-level actions beside the breadcrumbs; a screen without actions SHALL leave
that place empty.

#### Scenario: A collection entry is open
- **WHEN** a user opens an entry titled "First post" in the `posts` collection
  labelled "Posts"
- **THEN** the header breadcrumbs read Content, Posts, First post, with Content
  and Posts as links and First post as the current page

#### Scenario: A page singleton is open
- **WHEN** a user opens the singleton editor of the `home` page
- **THEN** the breadcrumbs read Content and the page label, without the entry
  ID

#### Scenario: An entry title is still loading
- **WHEN** the entry has not loaded yet
- **THEN** the last breadcrumb shows a neutral "Entry" label, not the entry ID

#### Scenario: A screen places actions in the header
- **WHEN** the entry editor is open
- **THEN** its save and publication actions appear inside the header beside the
  breadcrumbs, and they leave the header when the user navigates to a screen
  that provides no actions
