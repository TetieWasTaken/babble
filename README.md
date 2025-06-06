# babble

Babble is a document-oriented database tailored for easy local development and production.

![Preview](./media/main.gif 'Preview')

###### Babble preview

# Features:

- Password authentication\*
- REPL and interactive CLI for ease of use
- Server-only mode (for interacting with the _core_ directly)

###### \*Data is **NOT** encrypted locally. Authentication only protects http server.

# How to run

Clone the repo or download the source code from [the releases](https://github.com/TetieWasTaken/babble/releases):
`https://github.com/TetieWasTaken/babble.git`

Run the database:
`yarn run dev`
or `yarn run dev -s` for server-only mode

Select `new` to create a new database, then select the REPL CLI (advanced) or the interactive CLI (simple)

# Project structure

- `linker` - Combines each module together
- `core` - Primary engine
- `server` - Web server for the engine
- `cli` - CLI interface for users

# Server

## Endpoints

##### Data management

- `POST /server/:uid/add/*` - Adds an item
- `GET /server/:uid/fetch/*` - Fetches an item
- `PATCH /server/:uid/modify/*` - Modifies an item
- `DELETE /server/:uid/remove/*` - Removes an item
- `GET /server/:uid/export` - Exports a database
- `POST /server/:uid/import` - Imports a database

##### Database management

- `GET /server/uid` - Get every avalailable UID
- `POST /server/new/:uid` - Creates a new database
- `DELETE /server/delete/:uid` - Deletes a database

##### Authentication

- `GET /server/pubkey` - Retrieves the public key

###### \* wildcard is a slash-delimited key path
