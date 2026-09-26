## ADDED Requirements

### Requirement: Admin entry redirects to the content home
The admin application SHALL redirect the `/admin/` entry path to `/admin/content` and apply the usual session guard before showing protected content.

#### Scenario: Anonymous visitor opens admin entry
- **WHEN** an unauthenticated visitor opens `/admin/`
- **THEN** the visitor reaches sign-in with a safe return location and sees no protected content

#### Scenario: Authenticated visitor opens admin entry
- **WHEN** an authenticated visitor opens `/admin/`
- **THEN** the visitor reaches the content landing screen

### Requirement: Admin shell exposes logout
The authenticated shell SHALL expose a keyboard-operable logout action in the main screen header. Successful logout SHALL invalidate the browser session and clear protected cached state; a failed logout SHALL show an error.

#### Scenario: Administrator logs out
- **WHEN** an administrator activates logout and the auth endpoint confirms success
- **THEN** the shell clears protected state and navigates to sign-in
