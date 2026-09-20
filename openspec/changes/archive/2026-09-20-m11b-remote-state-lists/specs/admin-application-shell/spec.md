## MODIFIED Requirements

### Requirement: Typed client routes cover the Session 11A admin surface
The admin application SHALL provide typed client routes for `/login`,
`/content`, `/content/:modelKey`, `/content/:modelKey/:entryId`, `/media`,
`/builds`, `/users`, and `/settings`. Refreshing one of these client routes
through the configured API/admin composition SHALL render the corresponding
admin client route rather than an API or health fallback response. The login,
content landing, and content-model routes SHALL present their Session 11B
remote-state behavior; resource screens outside Session 11B may retain their
foundation placeholders.

#### Scenario: A model-entry route is refreshed
- **WHEN** a browser refreshes `/content/posts/entry-123` through the admin
  deployment
- **THEN** the admin application renders the entry-route foundation and does
  not treat the path as an unknown API resource

#### Scenario: An invalid model key is presented
- **WHEN** a browser opens a content-model route whose parameter does not match
  the route's model-key grammar
- **THEN** the application renders its client not-found state without issuing a
  request for protected model data
