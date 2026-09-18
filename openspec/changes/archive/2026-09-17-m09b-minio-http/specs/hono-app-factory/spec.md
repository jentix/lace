## ADDED Requirements

### Requirement: Media HTTP routes separate draft administration from public delivery
The HTTP application SHALL expose authenticated `GET` and `POST`
`/api/v1/admin/media`, authenticated `DELETE /api/v1/admin/media/:mediaId`, and
authenticated `GET /api/v1/admin/media/:mediaId/preview` routes. The list and
preview routes SHALL require the media lifecycle read permission, while upload
and deletion SHALL retain the media lifecycle write permission. It SHALL expose
anonymous `GET /api/v1/public/media/:mediaId` only when the supplied public-read
capability finds a reference from a current published snapshot. A non-existent,
draft-only, deleting, or unreferenced media ID SHALL have the same public
not-found response and SHALL not be probed through object storage.

#### Scenario: An administrator uploads and previews media
- **WHEN** an actor with the required permissions sends one valid multipart
  `file` and then requests its admin preview
- **THEN** the API returns validated media metadata for upload and streams the
  verified binary only to that authenticated actor

#### Scenario: Anonymous draft probing is denied without disclosure
- **WHEN** an anonymous caller requests a media ID used only by a draft or not
  present in a current published snapshot
- **THEN** the public route returns the stable not-found response without
  resolving the object or revealing whether the ID exists

#### Scenario: A deletion request is accepted for asynchronous processing
- **WHEN** an authorized writer deletes an eligible active media item
- **THEN** the API returns its deleting metadata with an accepted status and
  does not synchronously delete its binary object

### Requirement: Media ingestion has an independent streaming size boundary
The HTTP application SHALL consume a multipart media upload as a bounded binary
stream and reject it at the 10 MiB media limit even when its request has no
trustworthy content length or the general JSON body limit is lower. It SHALL
reject missing, duplicate, or non-file multipart parts before creating metadata,
and shall discard/cancel a rejected stream without forwarding bytes beyond the
media limit to object storage.

#### Scenario: Streaming upload crosses the media limit
- **WHEN** a multipart file's cumulative bytes cross 10 MiB while arriving from
  a chunked request
- **THEN** the route returns the stable payload-too-large error and does not
  create a stored object or media metadata row
