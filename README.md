# NEXUS Backend – REST API (Vercel)

NEXUS Backend is a C2 (Command and Control) framework backend designed to handle device registration, data ingestion (photos, logs, locations, files), command storage and retrieval, and health checks. Built with Node.js, it is deployed as serverless functions on Vercel and utilizes Supabase as its database and storage layer.

## Quick Deployment

Follow these step-by-step instructions to deploy the API:

1. Create a Supabase project and obtain your Project URL and Service Role Key.
2. Set up the required database tables in your Supabase project: `devices`, `photos`, `logs`, `locations`, `files`, `commands`, and `results`.
3. Create two public storage buckets named `photos` and `files`.
4. Set the following environment variables in your Vercel project settings: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
5. Deploy the project using the Vercel CLI with the command `vercel --prod` or via your GitHub repository integration.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | The REST URL for your Supabase project. |
| `SUPABASE_SERVICE_KEY` | Yes | The secret service role key for bypassing Row Level Security. |
| `SUPABASE_ANON_KEY` | Optional | Fallback anonymous key. |

**Note:** The `SUPABASE_SERVICE_KEY` is highly privileged. Keep this service key secret and never expose it in client-side code.

## API Endpoints

### Device Management

| Method | Path | Description |
|---|---|---|
| POST | `/api/register` | Registers a new device. |
| POST | `/api/update-device` | Updates details of an existing device. |
| POST | `/api/heartbeat` | Updates the last seen status for a device. |
| GET | `/api/devices` | Retrieves a list of all registered devices. |
| DELETE | `/api/delete-device` | Removes a device and its associated data. |

### Data Ingestion

| Method | Path | Description |
|---|---|---|
| POST | `/api/photo` | Uploads and records a photo from a device. |
| POST | `/api/upload-file` | Uploads a generic file to the storage bucket. |
| POST | `/api/log` | Ingests application or system logs. |
| POST | `/api/location` | Records GPS or network location data. |

### Command System

| Method | Path | Description |
|---|---|---|
| POST | `/api/send-command` | Queues a command for a specific device. |
| GET | `/api/commands` | Retrieves pending commands for a device. |
| POST | `/api/submit-result` | Submits the output or result of an executed command. |

### Data Retrieval

| Method | Path | Description |
|---|---|---|
| GET | `/api/device-details` | Fetches comprehensive data for a specific device. |
| GET | `/api/photos` | Retrieves metadata and URLs for uploaded photos. |
| GET | `/api/logs` | Fetches ingested logs. |
| GET | `/api/locations` | Retrieves recorded location data. |

### Health & Status

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Returns the health status of the API and database. |
| GET | `/api/test` | Endpoint for testing API connectivity. |
| GET | `/` | Root endpoint, returns basic API information. |

## Database Schema

The backend relies on the following relational tables in Supabase: `devices`, `photos`, `logs`, `locations`, `files`, `commands`, and `results`. All associated data is designed with foreign keys that cascade on delete, meaning the removal of a device automatically removes its dependent records. The full SQL schema is not included here; refer to your own migration scripts.

## Storage Buckets

This API requires two public storage buckets in Supabase to function correctly. The **photos** bucket is used for storing uploaded media, while the **files** bucket is used for storing generic uploaded files. Because these buckets are public, assets can be accessed directly via URL. If you configure these as private buckets instead, you will be required to implement additional logic to generate and serve signed URLs.

## Testing

To verify that the API is running correctly, visit the `/api/health` and `/api/test` endpoints in your browser or via an API client. 

You can test device registration with the following `curl` command:

```bash
curl -X POST https://your-vercel-domain.vercel.app/api/register   -H "Content-Type: application/json"   -d '{"deviceId": "test-device-001", "os": "Android", "model": "Pixel 6"}'
```

## Local Development

To run the backend locally using the Vercel CLI:

1. Clone the repository to your local machine.
2. Install the necessary dependencies using `npm install`.
3. Create a `.env` file in the project root and add your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
4. Start the development server by running `vercel dev`.
5. Access the local API at `http://localhost:3000`.

## Project Structure

```text
.
├── api/
│   ├── index.js
│   └── hello.js
├── vercel.json
├── package.json
└── README.md
```

## Security Notes

**Privileged Access:** This application uses the Supabase Service Key, which bypasses Row Level Security (RLS). Ensure this key is strictly managed and never exposed to unauthorized parties. **CORS:** Cross-Origin Resource Sharing (CORS) is configured to be wide open by default to facilitate testing. It is highly recommended to restrict CORS origins in a production environment. **Authentication:** There is currently no endpoint authentication implemented. Secure your API routes with an API key, JWT, or similar mechanism before production use.

## License

For educational and authorized testing purposes only. Use responsibly.
