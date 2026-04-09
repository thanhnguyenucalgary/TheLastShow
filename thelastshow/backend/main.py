from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
import boto3
import requests
import os
import uuid
from urllib.parse import urlparse
import cloudinary
import cloudinary.uploader

app = FastAPI()

# Allow your React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your EC2 IP
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS Clients (K3s will use the EC2 IAM Role automatically)
polly = boto3.client('polly', region_name='ca-central-1')
dynamodb = boto3.resource('dynamodb', region_name='ca-central-1')
table = dynamodb.Table('obituaries-thanh-nguyen')
ssm = boto3.client('ssm', region_name='ca-central-1')


# Only return obituaries for the given user (created_by)
@app.get("/get-obituaries")
async def get_obituaries(created_by: str = Query(...)):
    response = table.scan()
    items = response.get('Items', [])
    user_items = [item for item in items if item.get("createdBy") == created_by]
    return user_items


@app.delete("/delete-obituary/{obituary_id}")
async def delete_obituary(obituary_id: str, created_by: str = Query(...)):
    existing = table.get_item(Key={"id": obituary_id}).get("Item")
    if not existing:
        raise HTTPException(status_code=404, detail="Obituary not found")

    if existing.get("createdBy") != created_by:
        raise HTTPException(status_code=403, detail="Not authorized to delete this obituary")

    table.delete_item(Key={"id": obituary_id})
    return {"ok": True, "deletedId": obituary_id}



# Load your API keys from SSM Parameter Store
GOOGLE_API_KEY = ssm.get_parameter(
    Name='/last-show/google_api_key',
    WithDecryption=True
)['Parameter']['Value']
CLOUDINARY_URL = ssm.get_parameter(
    Name='/last-show/cloudinary_url',
    WithDecryption=True
)['Parameter']['Value']
if CLOUDINARY_URL.startswith("CLOUDINARY_URL="):
    CLOUDINARY_URL = CLOUDINARY_URL.split("=", 1)[1].strip()

def _sanitize_cloudinary_url(value: str) -> tuple[str, str, str] | None:
    parsed = urlparse(value.strip())
    if parsed.scheme != "cloudinary":
        return None

    api_key = (parsed.username or "").strip().strip("<>")
    api_secret = (parsed.password or "").strip().strip("<>")
    cloud_name = (parsed.hostname or "").strip().strip("<>")

    if api_key and api_secret and cloud_name:
        return api_key, api_secret, cloud_name
    return None


parsed_creds = _sanitize_cloudinary_url(CLOUDINARY_URL)
if parsed_creds:
    api_key, api_secret, cloud_name = parsed_creds
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
    )
else:
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)

# Do not crash startup if Cloudinary is misconfigured.
# Upload failures will be returned by /create-obituary with a clear error.
_cloudinary_cfg = cloudinary.config()
if not _cloudinary_cfg.api_key or not _cloudinary_cfg.api_secret or not _cloudinary_cfg.cloud_name:
    print(
        "WARNING: Cloudinary credentials could not be parsed from /last-show/cloudinary_url. "
        "Expected cloudinary://<api_key>:<api_secret>@<cloud_name>"
    )


def generate_obituary_with_gemini(prompt: str) -> str:
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": 170,
            "temperature": 0.7,
        },
    }
    model_candidates = [
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-2.0-flash",
    ]

    last_error_text = ""
    for model_name in model_candidates:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={GOOGLE_API_KEY}"
        )

        try:
            response = requests.post(url, json=payload, timeout=30)
        except requests.RequestException as exc:
            raise HTTPException(
                status_code=502,
                detail="Google API request failed. Please try again shortly."
            ) from exc

        if response.status_code == 404:
            last_error_text = response.text
            continue

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Google API quota exceeded. Please check your billing/quota."
            )

        if not response.ok:
            raise HTTPException(
                status_code=502,
                detail=f"Google API error: {response.text}"
            )

        data = response.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise HTTPException(
                status_code=502,
                detail="Google API returned an unexpected response format."
            ) from exc

    raise HTTPException(
        status_code=502,
        detail=f"No supported Gemini model found for this API key/project. Last error: {last_error_text}",
    )

@app.post("/create-obituary")
async def create_obituary(
    name: str = Form(...),
    born_year: str = Form(...),
    died_year: str = Form(...),
    image: UploadFile = File(...),
    email: str = Form(...)
):
    # --- 1. Google Gemini Logic: Generate the Story ---
    prompt = f"Write a concise, touching obituary for {name}, who lived from {born_year} to {died_year}. Target around 100 words (between 90 and 120 words)."
    story_text = generate_obituary_with_gemini(prompt)

    # --- 2. Amazon Polly Logic: Generate the MP3 ---
    polly_response = polly.synthesize_speech(
        Text=story_text,
        OutputFormat='mp3',
        VoiceId='Joanna' # You can change the voice here
    )

    # Save audio to a temporary file
    temp_audio_path = f"/tmp/{uuid.uuid4()}.mp3"
    with open(temp_audio_path, "wb") as f:
        f.write(polly_response['AudioStream'].read())

    # --- 3. Cloudinary Logic: Upload Image and Audio ---
    # Upload Image
    image_upload = cloudinary.uploader.upload(image.file, folder="obituaries/images")
    image_url = image_upload.get("secure_url")

    # Upload Audio (Explicitly set resource_type to 'video' for MP3s)
    audio_upload = cloudinary.uploader.upload(
        temp_audio_path, 
        resource_type="video", 
        folder="obituaries/audio"
    )
    audio_url = audio_upload.get("secure_url")

    # Clean up temp file
    if os.path.exists(temp_audio_path):
        os.remove(temp_audio_path)

    # --- 4. Save to DynamoDB ---
    item = {
        "id": str(uuid.uuid4()), # Primary key recommended
        "name": name,
        "date": f"{born_year} - {died_year}",
        "story": story_text,
        "image": image_url,
        "audio": audio_url,
        "createdBy": email
    }
    table.put_item(Item=item)

    return item