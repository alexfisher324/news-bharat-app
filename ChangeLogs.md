# ChangeLogs

## Firebase Migration Plan for THE BHARAT Backend

This document describes the recommended migration from the current MongoDB-backed FastAPI server to Google Cloud Run + Firestore.

### 1. Why Cloud Run + Firestore

- The backend is already a FastAPI Python app.
- Cloud Run can run the existing Python service with minimal rewrite.
- Firestore is a managed document database that can replace MongoDB for `news`, `ads`, and `translation_cache`.
- Cloud Scheduler is a better managed approach for periodic jobs than APScheduler inside the container.

### 2. Backend changes required

#### Files to update
- `backend/server.py`
- `backend/requirements.txt`

#### Replace MongoDB setup
- Remove `motor.motor_asyncio` and MongoDB client initialization.
- Add Firestore client support:
  - `from google.cloud import firestore`
  - `db = firestore.AsyncClient()`

#### Replace collection usage
- `db.news` → `db.collection("news")`
- `db.ads` → `db.collection("ads")`
- `db.translation_cache` → `db.collection("translation_cache")`

#### Replace database operations
- `insert_one(...)` → `collection.document(id).set(...)`
- `find_one(...)` → Firestore query with `.where(...).limit(1).get()`
- `delete_one(...)` → `collection.document(id).delete()`
- `count_documents(query)` → Firestore query count or approximate collection count
- `find(...).sort(...).to_list(...)` → Firestore queries with `.order_by(...)`

#### Scheduler changes
- Remove or disable `APScheduler` startup scheduling from `backend/server.py`.
- Keep `POST /api/admin/trigger-fetch` for manual fetch.
- Add a cleanup trigger endpoint if needed for Cloud Scheduler.

### 3. Firestore schema mapping

#### `news` collection
- `id`
- `title`
- `description`
- `content`
- `imageUrl`
- `category`
- `state`
- `language`
- `source`
- `publishedAt`
- `createdAt`
- `isActive`
- `isAdminNews`

#### `ads` collection
- `id`
- `title`
- `media`
- `mediaType`
- `position`
- `duration`
- `isActive`
- `createdAt`
- `expiresAt`

#### `translation_cache` collection
- `cache_key`
- `source_text`
- `target_language`
- `translated_text`
- `created_at`

### 4. Data migration steps

1. Export existing MongoDB collections: `news`, `ads`, `translation_cache`.
2. Convert each document to Firestore format.
3. Import them into Firestore using a migration script.
4. Remove Mongo-specific `_id` fields from imported documents.

### 5. Deployment steps

1. Add `google-cloud-firestore` to `backend/requirements.txt`.
2. Create a `Dockerfile` for the backend service.
3. Deploy to Cloud Run:
   - `gcloud builds submit --tag gcr.io/<PROJECT_ID>/news-bharat-backend`
   - `gcloud run deploy news-bharat-backend --platform managed --region <region> --set-env-vars=FIRESTORE_PROJECT_ID=<PROJECT_ID>,EMERGENT_LLM_KEY=...`
4. Configure Cloud Run environment variables.

### 6. Cloud Scheduler jobs

- Schedule `POST https://<cloud-run-url>/api/admin/trigger-fetch` every 6 hours.
- Optionally schedule cleanup via `POST https://<cloud-run-url>/api/admin/cleanup` or other endpoint.
- Use Firestore TTL for translation cache expiration where possible.

### 7. Frontend update

- Update `frontend/.env`:
  - `EXPO_PUBLIC_BACKEND_URL=<Cloud Run URL>`
- No further frontend route changes are required because existing client code already uses this env variable.

### 8. Validation checklist

- [ ] `GET /api/news`
- [ ] `GET /api/ads`
- [ ] `POST /api/admin/login`
- [ ] `POST /api/admin/news`
- [ ] `POST /api/admin/ads`
- [ ] `GET /api/admin/news/list`
- [ ] `GET /api/admin/ads/list`
- [ ] `DELETE /api/admin/news/{id}`
- [ ] `DELETE /api/admin/ads/{id}`

### 9. Optional improvements

- Protect admin endpoints with auth tokens rather than client-side login only.
- Add pagination to `/api/admin/news/list` and `/api/admin/ads/list`.
- Use Firestore TTL for old news cleanup instead of manual deletion.
- Use a configurable `ADMIN_PASSWORD` env var for admin login.

### 10. Next immediate action

- Update `backend/requirements.txt` with Firestore dependency.
- Update `backend/server.py` to use Firestore instead of Mongo.
- Prepare `frontend/.env` for the Cloud Run backend URL.
- Create a Cloud Run deployment plan and Firestore migration script.
