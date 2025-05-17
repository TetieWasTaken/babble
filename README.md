# babble

Babble is a document-oriented database tailored for easy local development and production.

# Project structure

- `linker` - Combines each module together
- `core` - Primary engine
- `server` - Web server for the engine
- `cli` - CLI interface for users

# Server

## Endpoints

- `POST /server/add/` - Adds an item
- `GET /server/fetch/` - Fetches an item
- `PATCH /server/modify` - Modifies an item
- `DELETE /server/remove` - Removes an item
