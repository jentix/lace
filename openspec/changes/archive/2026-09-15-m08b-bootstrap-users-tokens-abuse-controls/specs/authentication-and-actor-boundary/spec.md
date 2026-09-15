## ADDED Requirements

### Requirement: Disabled accounts fail closed at actor resolution
The authentication boundary SHALL refuse to resolve an actor from a valid
provider session when its persisted user account has been disabled. It SHALL
not disclose the disabled state through a session or actor response.

#### Scenario: Disabled user presents a valid session
- **WHEN** a session belonging to a disabled user reaches a protected route
- **THEN** actor resolution fails and the route returns the standard
authorization denial before application work runs

