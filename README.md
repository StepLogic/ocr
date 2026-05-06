# EduMetrics - Document OCR Scanner

A full-stack document scanning application with a React Native Expo mobile frontend and Python FastAPI backend. Uses Ollama's Gemma model for OCR text extraction from images.

## Architecture

- **Frontend**: React Native Expo mobile app with camera capture and gallery upload
- **Backend**: Python FastAPI server that receives images and calls Ollama for OCR
- **AI/OCR**: Ollama running Google's Gemma 3 model for text extraction
- **Hosting**: Backend designed for Railway deployment

## Project Structure

```
edumetrics/
├── backend/              # Python FastAPI backend
│   ├── main.py          # FastAPI application with OCR endpoints
│   ├── requirements.txt # Python dependencies
│   ├── Procfile         # Railway process definition
│   ├── runtime.txt      # Python version for Railway
│   ├── railway.toml     # Railway deployment configuration
│   ├── Dockerfile       # Optional container deployment
│   ├── docker-compose.yml # Docker compose for local testing
│   ├── .env.example     # Environment variables template
│   └── .gitignore       # Git ignore rules
└── frontend/            # React Native Expo app
    ├── App.js           # Main application with camera & OCR UI
    ├── app.json         # Expo configuration
    ├── package.json     # Node.js dependencies
    ├── babel.config.js  # Babel configuration
    └── .gitignore       # Git ignore rules
```

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- [Ollama](https://ollama.com) installed locally (for local dev)
- Railway CLI (for deployment)

## Quick Start

### 1. Install Ollama and Pull Gemma Model (Local Development)

```bash
# Install Ollama from https://ollama.com
# Then pull the Gemma model
ollama pull gemma3:4b
```

### 2. Start Ollama Server (Local)

```bash
ollama serve
```

Ollama will run on `http://localhost:11434`.

### 3. Start the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template and configure
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`.

Test it: http://localhost:8000/health

### 4. Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

Scan the QR code with the Expo Go app (iOS/Android) or press `w` for web.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check with Ollama status |
| `/ocr` | POST | Upload image file for OCR |
| `/ocr/base64` | POST | Send base64-encoded image for OCR |

### Example API Usage

```bash
# Health check
curl http://localhost:8000/health

# Upload image for OCR
curl -X POST -F "file=@document.jpg" http://localhost:8000/ocr
```

## Frontend Features

- Camera capture with real-time preview
- Gallery image picker
- Backend connectivity status indicator
- Image preview before processing
- OCR result display with copy-friendly formatting
- Loading states and error handling
- Clean, modern UI with document scanning frame overlay

## Backend Features

- FastAPI with auto-generated docs at `/docs`
- CORS enabled for cross-origin requests
- File upload validation (type and size)
- Base64 image support
- Health check endpoint with Ollama connectivity status
- Environment-based configuration
- Railway-ready deployment configuration
- Docker support

## Deploying to Railway

### 1. Install Railway CLI and Login

```bash
npm install -g @railway/cli
railway login
```

### 2. Create Project and Deploy

```bash
cd backend

# Initialize Railway project
railway init --name edumetrics-ocr

# Deploy
railway up
```

### 3. Configure Environment Variables

In Railway dashboard, add these environment variables:

- `OLLAMA_URL`: URL to your Ollama instance (must be publicly accessible or use Railway private networking)
- `OLLAMA_MODEL`: `gemma3:4b` (or your preferred model)
- `OLLAMA_API_KEY`: (optional) if your cloud Ollama requires authentication

### 4. Update Frontend API URL

In `frontend/App.js`, change `API_URL` to your Railway deployment URL:

```javascript
const API_URL = 'https://your-app.up.railway.app';
```

## Cloud Ollama Hosting

Since Railway doesn't natively support GPU workloads, Ollama itself needs to be hosted separately. Here are your options:

### Option 1: Self-Hosted Cloud Server (Recommended)

Rent a cloud GPU instance (e.g., RunPod, Vast.ai, Lambda Labs, or AWS EC2 with GPU) and install Ollama:

```bash
# On your cloud GPU server
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma3:4b
ollama serve
```

Secure it with a reverse proxy (Nginx/Caddy) and HTTPS. Then set `OLLAMA_URL` to your cloud Ollama URL.

### Option 2: Ollama Cloud Hosting Services

Some platforms offer managed Ollama hosting:
- **Ollama Cloud** (if available in your region)
- **Together.ai** - API-compatible with Ollama
- **Fireworks.ai** - Fast inference for open models
- **Groq** - Ultra-fast inference for supported models

### Option 3: Modal / Serverless GPU

Use [Modal](https://modal.com) for serverless GPU inference:

```python
# modal_ollama.py example
import modal

image = modal.Image.debian_slim().apt_install("curl").run_commands(
    "curl -fsSL https://ollama.com/install.sh | sh"
)

app = modal.App("ollama-ocr")

@app.function(image=image, gpu="T4")
@modal.web_endpoint()
def ollama_ocr(image_base64: str):
    import requests
    # Start ollama and run inference
    ...
```

### Option 4: ngrok for Development

Expose local Ollama during development:

```bash
# In a separate terminal
ngrok http 11434

# Set the HTTPS URL as OLLAMA_URL in Railway or .env
```

### Option 5: Railway + Ollama Sidecar (Advanced)

Use Railway's GPU support (if available) or deploy Ollama as a separate service:

1. Create a new Railway service for Ollama
2. Use a custom Dockerfile with Ollama installed
3. Connect the backend to the internal Railway URL

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `gemma3:4b` | Model to use for OCR |
| `OLLAMA_API_KEY` | `None` | API key for authenticated Ollama |
| `PORT` | `8000` | Server port |

## Model Recommendations

The default `gemma3:4b` provides good OCR accuracy with reasonable speed. Options:

- `gemma3:4b` - Fast, good accuracy (recommended)
- `gemma3:12b` - Higher accuracy, slower
- `llava:7b` - Alternative vision model
- `llava:13b` - Better vision, slower

## Development Notes

### Running Backend Locally with Cloud Ollama

If you're using a cloud-hosted Ollama for local development:

1. Set your cloud Ollama URL in `.env`:
   ```
   OLLAMA_URL=https://your-cloud-ollama.com
   OLLAMA_API_KEY=your-key-if-needed
   ```

2. Start the backend:
   ```bash
   uvicorn main:app --reload
   ```

### Testing OCR

Use the built-in API docs:
- Navigate to `http://localhost:8000/docs`
- Try the `/ocr` endpoint with the "Try it out" button

### Frontend Development

The Expo app supports:
- iOS simulator (macOS only)
- Android emulator
- Physical device via Expo Go app
- Web browser (limited camera support)

## Docker Deployment

### Using Docker Compose

```bash
cd backend

# Set your Ollama URL in .env
echo "OLLAMA_URL=https://your-cloud-ollama.com" > .env

# Build and run
docker-compose up --build -d
```

### Using Dockerfile directly

```bash
cd backend

docker build -t edumetrics-api .
docker run -p 8000:8000 \
  -e OLLAMA_URL=https://your-cloud-ollama.com \
  -e OLLAMA_MODEL=gemma3:4b \
  edumetrics-api
```

## Troubleshooting

### Ollama Connection Issues

- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check model is pulled: `ollama list`
- Ensure correct `OLLAMA_URL` in environment
- For cloud Ollama, verify firewall rules allow your backend IP

### Camera Issues on Mobile

- Grant camera permissions in device settings
- Use physical device for best camera experience
- Simulator has limited camera support

### Railway Deployment Issues

- Ensure `Procfile` and `runtime.txt` are committed
- Check Railway logs: `railway logs`
- Verify environment variables are set in Railway dashboard
- Ensure Ollama URL is accessible from Railway's network

## License

MIT
