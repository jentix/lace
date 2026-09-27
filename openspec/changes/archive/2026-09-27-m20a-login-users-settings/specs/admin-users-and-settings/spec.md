## MODIFIED Requirements

### Requirement: Administrator can manage users in the browser
The Users screen SHALL list users with email, role, and active or disabled
status, and SHALL mark the signed-in administrator's own row as "You". Role and
status SHALL be shown as labelled badges using the shared role vocabulary
(Admin, Editor, Viewer); raw user IDs SHALL never be shown. The screen SHALL
summarize how many accounts exist and how many are disabled.

An administrator SHALL create a user from a Create user dialog that collects
email, password (at least 12 characters, stated beside the field), and role;
the role picker SHALL describe what each role can do. Each active row SHALL
offer Change role, which opens a dialog preselecting the confirmed role and
submitting only a different role, and Disable, which opens a confirmation
dialog. Each disabled row SHALL offer Enable, which opens a confirmation
dialog, and SHALL offer no role change. The signed-in administrator's own row
SHALL offer no Disable action, and changing the administrator's own role away
from Admin SHALL warn in the dialog that they will lose access to Users and
Settings.

A mutation SHALL appear successful only after API confirmation: the dialog
closes, a notification names the affected account and change, and the list
refreshes from remote state. A failed mutation SHALL keep its dialog open,
show the error inside it, and leave the listed role and status at their last
confirmed values; a final-administrator rejection SHALL be explained as "The
final active administrator cannot be disabled or demoted." Cancelling a dialog
SHALL issue no request and return focus to the control that opened it.

#### Scenario: Administrator creates a user
- **WHEN** an administrator opens Create user and submits a valid email, password, and role
- **THEN** the screen submits the request, closes the dialog, announces the created account, and lists the new user after confirmation

#### Scenario: Create user fails
- **WHEN** the API rejects a Create user submission
- **THEN** the dialog stays open with the entered email and role, shows the error, and the list is unchanged

#### Scenario: Administrator changes a role
- **WHEN** an administrator opens Change role for an active user, picks a different role, and saves
- **THEN** the screen sends only the role change and shows the new role badge after confirmation

#### Scenario: Final administrator change is rejected
- **WHEN** the API rejects a role change or disable action that would remove the final active administrator
- **THEN** the dialog shows the final-administrator explanation and the row retains its previously confirmed role and active status

#### Scenario: Administrator disables and re-enables a user
- **WHEN** an administrator confirms Disable for another active user and later confirms Enable for that user
- **THEN** the screen sends `disabled: true` and then `disabled: false`, and the row shows Disabled and then Active after each confirmation

#### Scenario: Administrator views their own row
- **WHEN** the signed-in administrator's account is listed
- **THEN** the row is marked "You", offers Change role, and offers no Disable action

#### Scenario: Administrator demotes themselves
- **WHEN** the signed-in administrator picks a non-admin role for their own account in Change role
- **THEN** the dialog warns that they will lose access to Users and Settings before they save

#### Scenario: A dialog is cancelled
- **WHEN** an administrator cancels a Create user, Change role, Disable, or Enable dialog
- **THEN** no user request is sent and focus returns to the control that opened the dialog

#### Scenario: Users cannot be loaded
- **WHEN** the user-list request fails for a reason other than an expired session
- **THEN** the screen shows the error with a Try again action that repeats the request

#### Scenario: Editor opens Users directly
- **WHEN** an editor opens `/users`
- **THEN** the screen shows access denied and issues no user-list request

### Requirement: Administrator can inspect local settings and manage build tokens
The Settings screen SHALL show status cards for API readiness (Ready or Not
ready), the configured-model count, and the number of active build tokens,
with a Refresh status action that repeats the readiness request. It SHALL list
build-token metadata without plaintext credentials: name, token prefix,
created time, last-used time or "Never", and an Active or Revoked badge. Times
SHALL be shown relative to now with the absolute local time available on hover
and never as raw ISO timestamps.

An administrator SHALL create a build token from a dialog that collects its
name. After the API confirms creation, the same dialog SHALL show the plaintext
token once with a Copy action, copy feedback, and a Done action, and SHALL
state that the value cannot be shown again. Pointer interaction outside the
dialog SHALL not dismiss it while the plaintext is shown. The plaintext SHALL
exist only in that dialog's transient state and SHALL be cleared when the
dialog closes or Settings unmounts; it SHALL never enter the URL, a query
cache, or browser storage. Each active token SHALL offer Revoke, which opens a
confirmation dialog naming the token and its effect. Failed operations SHALL
keep their dialog open with the error and leave confirmed token metadata
unchanged.

#### Scenario: Token is issued
- **WHEN** an administrator creates a named build token
- **THEN** the dialog displays the token plaintext once with Copy and Done, and the metadata list refreshes to include the new active token

#### Scenario: Token is dismissed
- **WHEN** the administrator selects Done, presses Escape, or leaves Settings while the token is shown
- **THEN** the plaintext is removed from the browser component state and is absent from later token listings and dialog openings

#### Scenario: Token creation fails
- **WHEN** the API rejects build-token creation
- **THEN** the dialog stays on the name step with the error and no plaintext is shown

#### Scenario: Administrator revokes a token
- **WHEN** an administrator confirms Revoke for an active token
- **THEN** the token is revoked, a notification names it, and the list shows it as Revoked without a Revoke action

#### Scenario: Token revocation fails
- **WHEN** the API rejects revocation
- **THEN** the token remains listed according to confirmed API state and the confirmation dialog shows the failure

#### Scenario: Token times are shown
- **WHEN** a token was created two hours ago and never used
- **THEN** its row reads "2 hours ago" for Created with the absolute time on hover, and "Never" for Last used

#### Scenario: Viewer opens Settings directly
- **WHEN** a viewer opens `/settings`
- **THEN** the screen shows access denied and issues no settings or token request
