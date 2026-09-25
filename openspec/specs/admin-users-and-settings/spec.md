# admin-users-and-settings Specification

## Purpose

Defines the browser workflows administrators use to manage local accounts, inspect operational readiness, and issue or revoke narrowly scoped build credentials safely.

## Requirements

### Requirement: Administrator can manage users in the browser
The Users screen SHALL list users with email, role, and disabled state and SHALL provide creation, role change, and disable actions only for an administrator. A mutation SHALL appear successful only after API confirmation and refreshed remote state. The screen SHALL present API failures, including final-administrator protection, without claiming success.

#### Scenario: Administrator creates a user
- **WHEN** an administrator submits a valid email, password, and role
- **THEN** the screen submits the request and shows the new user after confirmation

#### Scenario: Final administrator change is rejected
- **WHEN** the API rejects a role change or disable action that would remove the final active administrator
- **THEN** the screen shows the error and retains the previously confirmed role and active state

#### Scenario: Editor opens Users directly
- **WHEN** an editor opens `/users`
- **THEN** the screen shows access denied and issues no user-list request

### Requirement: Administrator can inspect local settings and manage build tokens
The Settings screen SHALL show read-only readiness and configured-model count, and list build-token metadata without plaintext credentials. An administrator SHALL be able to create and revoke build tokens. A newly issued plaintext token SHALL appear only in transient UI state with explicit copy and dismissal controls, and SHALL be cleared when dismissed or leaving Settings. Failed operations SHALL leave confirmed token metadata unchanged and show an error.

#### Scenario: Token is issued
- **WHEN** an administrator creates a named build token
- **THEN** the token plaintext is displayed once in the current screen and the metadata list refreshes

#### Scenario: Token is dismissed
- **WHEN** the administrator dismisses the issued token or leaves Settings
- **THEN** the plaintext is removed from the browser component state and is absent from later token listings

#### Scenario: Token revocation fails
- **WHEN** the API rejects revocation
- **THEN** the token remains listed according to confirmed API state and the screen shows the failure

#### Scenario: Viewer opens Settings directly
- **WHEN** a viewer opens `/settings`
- **THEN** the screen shows access denied and issues no settings or token request

### Requirement: Protected management requests recover expired sessions
User, status, and token requests SHALL use the same credentialed, validated admin transport and expired-session recovery as content requests.

#### Scenario: Session expires while loading users
- **WHEN** a user-list request establishes that the browser session is no longer valid
- **THEN** the admin clears protected state and sends the visitor to sign-in without showing stale users
