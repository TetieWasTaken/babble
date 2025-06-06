# babble

Babble is a document-oriented database tailored for easy local development and production.

![Preview](./media/main.gif 'Preview')

###### Babble preview

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

- `POST /server/add/` - Adds an item
- `GET /server/fetch/` - Fetches an item
- `PATCH /server/modify` - Modifies an item
- `DELETE /server/remove` - Removes an item
