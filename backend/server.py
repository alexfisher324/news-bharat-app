from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import uuid
from datetime import datetime, timedelta
import aiohttp
import asyncio
import hashlib
import random
from firebase_config import db, bucket
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
from google.cloud.firestore_v1.base_query import FieldFilter

# Scheduler instance (used by lifespan)
scheduler = AsyncIOScheduler()

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError:
    LlmChat = None
    UserMessage = None

import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
# mongo_url = os.environ['MONGO_URL']
# client = AsyncIOMotorClient(mongo_url)
# db = client[os.environ['DB_NAME']]


# Lifespan handler (replaces deprecated on_event startup/shutdown)
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up THE BHARAT API...")

    # Add EMERGENT_LLM_KEY to .env if not exists
    try:
        env_path = ROOT_DIR / '.env'
        env_content = env_path.read_text()
        if 'EMERGENT_LLM_KEY' not in env_content:
            with open(env_path, 'a') as f:
                f.write(f'\nEMERGENT_LLM_KEY={EMERGENT_LLM_KEY}\n')
    except Exception:
        logger.debug(".env update skipped or failed")

    # Create indexes for translation cache (fast lookups + auto-expire after 30 days)
    try:
        cache_docs = list(
            db.collection("translation_cache").limit(1).stream()
        )

        logger.info("Firestore connection successful")
    except Exception as e:
        logger.error(f"Firestore connection error: {e}")

    # Seed initial news data
    try:
        news_count = len(list(db.collection("news").limit(1).stream()))
        if news_count == 0:
            logger.info("Seeding initial news data...")
            await fetch_and_store_news()
    except Exception as e:
        logger.error(f"Error during initial seeding: {e}")

    # Schedule jobs
    scheduler.add_job(
        fetch_and_store_news,
        'cron',
        hour='*/6',
        minute='*/2',
        id='fetch_news'
    )

    scheduler.add_job(cleanup_old_news, 'interval', hours=1, id='cleanup_news')

    scheduler.start()
    logger.info("Scheduler started!")

    try:
        yield
    finally:
        try:
            scheduler.shutdown()
            logger.info("Scheduler shut down")
        except Exception as e:
            logger.error(f"Error shutting down scheduler: {e}")

# Create the main app without a prefix
app = FastAPI(lifespan=lifespan)


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Get API keys
GNEWS_API_KEY = "c062112f47750533ae2175fa74747326"
NEWSAPI_KEY = "75e5ec47602d4731b4160980e9b2408e"
NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY", "pub_68897f51c695f61b12117195ca98800b201ce")
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "sk-emergent-6845fC8045d521a486")

NEWSAPI_DEFAULT_CATEGORIES = [
    "general",
    "business",
    "technology",
    "science",
    "health",
    "sports",
    "entertainment"
]
NEWSAPI_DEFAULT_SOURCES = [
    "bbc-news",
    # "bbc-sport",
    # "cnn",
    # "associated-press",
    # "abc-news",
    # "al-jazeera-english",
    # "axios",
    # "bloomberg",
    # "business-insider",
    # "cbs-news",
    # "cnbc",
    # "fortune",
    # "financial-post",
    # "fox-news",
    # "google-news",
    # "independent",
    # "medical-news-today",
    # "msnbc",
    # "national-geographic",
    # "nbc-news",
    # "new-scientist",
    # "newsweek",
    # "politico",
    # "reuters",
    # "techcrunch",
    # "techradar",
    # "the-economist",
    # "the-hill",
    # "the-next-web",
    # "the-verge",
    # "the-wall-street-journal",
    # "the-washington-post",
    # "time",
    # "usa-today",
    # "wired"
]
NEWSAPI_DEFAULT_QUERIES = [
    "world news",
    # "breaking news",
    # "technology",
    # "artificial intelligence",
    # "machine learning",
    # "startup",
    # "business",
    # "stock market",
    # "cryptocurrency",
    # "bitcoin",
    # "ethereum",
    # "finance",
    # "economy",
    # "banking",
    # "politics",
    # "elections",
    # "government",
    # "international relations",
    # "climate change",
    # "environment",
    # "renewable energy",
    # "science",
    # "space",
    # "NASA",
    # "ISRO",
    # "health",
    # "medicine",
    # "fitness",
    # "mental health",
    # "sports",
    # "football",
    # "cricket",
    # "IPL",
    # "FIFA",
    # "Olympics",
    # "tennis",
    # "basketball",
    # "entertainment",
    # "movies",
    # "Hollywood",
    # "Bollywood",
    # "OTT",
    # "Netflix",
    # "Amazon Prime",
    # "gaming",
    # "esports",
    # "cybersecurity",
    # "data privacy",
    # "education",
    # "jobs",
    # "real estate",
    # "automobile",
    # "electric vehicles",
    # "travel",
    # "tourism",
]
NEWSDATA_DEFAULT_QUERIES = [
    "India",
    "Indian politics",
    "Indian economy",
    "Indian government",
    "Parliament of India",
    "Supreme Court India",
    "Indian elections",
    "PM Modi",
    "BJP",
    "Congress",
    "Indian startups",
    "Make in India",
    "Digital India",
    "Indian stock market",
    "Sensex",
    "Nifty",
    "RBI",
    "SEBI",
    "Indian Railways",
    "ISRO",
    "Indian defense",
    "Indian army",
    "Indian education",
    "Indian healthcare",
    "Indian technology",
    "Indian business",
    "India weather",
    "India sports",
    "India cricket",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
     "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Puducherry",
    "Chandigarh",
    "Andaman and Nicobar",
    "Dadra and Nagar Haveli",
    "Daman and Diu",
    "Lakshadweep",
     "state politics",
    "state government",
    "local elections",
    "district news",
    "municipal corporation",
    "crime",
    "traffic",
    "weather",
    "education",
    "jobs",
    "business",
    "real estate",
    "health",
    "agriculture",
    "tourism",
    "breaking news",
    "latest news",
    "politics",
    "government",
    "crime",
    "education",
    "business",
    "sports",
    "weather",
    "technology",
    "breaking",
    "trending",
    "latest",
    "world",
    "jobs",
     "Mumbai",
    "Delhi",
    "Bengaluru",
    "Hyderabad",
    "Chennai",
    "Kolkata",
    "Pune",
    "Ahmedabad",
    "Jaipur",
    "Lucknow",
    "Patna",
    "Bhopal",
    "Chandigarh",
    "Kochi",
    "Indore",
    "Surat",
    "Nagpur",
    "Visakhapatnam",
    "Mysuru",
    "Noida",
    "Gurugram",
    "usa",
    "china",
    "russia",
    "middle east",
    "technology",
    "AI",
    "ChatGPT",
    "Google",
    "Apple",
    "Microsoft",
    "Meta",
    "Tesla",
    "SpaceX",
    "startup",
    "venture capital",
    "stock market",
    "NSE",
    "BSE",
    "Sensex",
    "Nifty",
    "cryptocurrency",
    "bitcoin",
    "ethereum",
    "politics",
    "election",
    "government",
    "parliament",
    "science",
    "space",
    "NASA",
    "ISRO",
    "health",
    "medicine",
    "sports",
    "cricket",
    "IPL",
    "football",
    "FIFA",
    "Olympics",
    "movies",
    "Bollywood",
    "Hollywood",
    "OTT",
    "Netflix",
    "gaming",
    "cybersecurity",
    "education",
    "jobs",
    "real estate",
    "automobile",
    "electric vehicles",
    "travel"
]
NEWSDATA_DEFAULT_CATEGORIES = [
    # "top",
    # "world",
    # "business",
    # "technology",
    # "science",
    "health",
    "sports",
    # "entertainment",
    # "politics",
    # "education",
    # "environment",
    # "crime",
    # "food",
    # "lifestyle",
    # "tourism",
    # "domestic",
    # "breaking"
]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# All 36 Indian States and UTs
INDIAN_STATES = [
    "National", "International",
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
]

LANGUAGES = ["english", "hindi", "odia", "marathi", "bengali", "tamil", "telugu"]

# Language codes for news APIs
LANGUAGE_CODES = {
    "english": "en",
    "hindi": "hi",
    "tamil": "ta",
    "telugu": "te",
    "bengali": "bn",
    "marathi": "mr",
    "odia": "or"
}

NEWSDATA_LANGUAGE_CODES = ["or", "en", "ta", "te", "mr", "bn"]
NEWSDATA_LANGUAGE_DISPLAY = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "bn": "Bengali",
    "mr": "Marathi",
    "or": "Odia"
}


def get_display_language(code_or_name: Optional[str]) -> str:
    token = (code_or_name or "").strip().lower()
    if not token:
        return "English"

    if token in NEWSDATA_LANGUAGE_DISPLAY:
        return NEWSDATA_LANGUAGE_DISPLAY[token]

    if token in LANGUAGE_CODES:
        return token.title()

    if token in LANGUAGE_CODES.values():
        return NEWSDATA_LANGUAGE_DISPLAY.get(token, token.upper())

    return code_or_name.strip().title()


def normalize_media_language_code(language: str) -> str:
    if not language:
        return "en"

    if "," in language:
        for token in [item.strip().lower() for item in language.split(",") if item.strip()]:
            if token in LANGUAGE_CODES:
                return LANGUAGE_CODES[token]
            if token in LANGUAGE_CODES.values():
                return token
        return "en"

    token = language.strip().lower()
    if token in LANGUAGE_CODES:
        return LANGUAGE_CODES[token]
    if token in LANGUAGE_CODES.values():
        return token

    return "en"


def normalize_newsdata_language_codes(language_filter: Optional[str]) -> List[str]:
    if not language_filter:
        return NEWSDATA_LANGUAGE_CODES.copy()

    tokens = [item.strip().lower() for item in language_filter.split(",") if item.strip()]
    normalized = []

    for token in tokens:
        if token in NEWSDATA_LANGUAGE_DISPLAY:
            normalized.append(token)
            continue

        if token in LANGUAGE_CODES:
            normalized.append(LANGUAGE_CODES[token])
            continue

        if token in LANGUAGE_CODES.values():
            normalized.append(token)
            continue

    return normalized or NEWSDATA_LANGUAGE_CODES.copy()


def determine_state_from_article(
    title: Optional[str],
    description: Optional[str],
    content: Optional[str],
    country_field: Optional[object] = None,
    default_state: Optional[str] = None
) -> str:
    """Determine `state` for an article.

    Logic:
    - If any Indian state name appears in title/description/content, return that state.
    - If `country_field` indicates India, return 'National'. If indicates non-India, return 'International'.
    - If text mentions 'india', return 'National'.
    - If a `default_state` is provided and it's not 'National', return it.
    - If `default_state` is 'National' but there's no evidence of India in text/country, prefer 'International'.
    - When unsure, default to 'International'.
    """
    text = " ".join([s for s in (title or "", description or "", content or "")]).lower()

    # 1) Check explicit Indian state names in text
    for st in INDIAN_STATES:
        if st.lower() in ("national", "international"):
            continue
        if st.lower() in text:
            return st

    # 2) Use country_field when available
    if country_field:
        # country_field may be a list like ["india"] or a string
        if isinstance(country_field, list):
            cf = [c.lower() for c in country_field]
            if "india" in cf or "in" in cf:
                return "National"
            return "International"
        if isinstance(country_field, str):
            if country_field.lower() in ("india", "in"):
                return "National"
            return "International"

    # 3) Look for 'india' mention in text
    if "india" in text:
        return "National"

    # 4) Respect non-National defaults, but avoid assuming National without evidence
    if default_state:
        if default_state.lower() == "national":
            # default was National but we have no evidence -> treat as International
            return "International"
        return default_state

    # 5) Fallback
    return "International"


# ===================== MODELS =====================
class News(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    content: str
    imageUrl: Optional[str] = None  # base64
    category: str = "general"
    state: str = "National"
    language: str = "english"
    source: str
    publishedAt: datetime
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    isActive: bool = True
    isAdminNews: bool = False  # Flag to identify admin-uploaded news

class NewsCreate(BaseModel):
    title: str
    description: str
    content: str
    imageUrl: Optional[str] = None
    category: str = "general"
    state: str = "National"
    language: str = "english"

class Short(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    videoUrl: str
    fileName: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    isActive: bool = True

class ShortCreate(BaseModel):
    title: str
    description: Optional[str] = None
    videoUrl: str
    fileName: str

class Ad(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    media: str  # base64
    mediaType: str  # 'image' or 'video'
    position: int
    duration: Optional[int] = None  # in seconds
    isActive: bool = True
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: Optional[datetime] = None

class AdCreate(BaseModel):
    title: str
    media: str
    mediaType: str
    position: int
    duration: Optional[int] = None

class AdminLogin(BaseModel):
    password: str

class FetchFilters(BaseModel):
    newsapi_categories: Optional[List[str]] = None
    newsapi_sources: Optional[List[str]] = None
    newsapi_queries: Optional[List[str]] = None
    newsdata_queries: Optional[List[str]] = None
    newsdata_categories: Optional[List[str]] = None
    newsdata_language_filter: Optional[str] = None
    country: str = "us"
    language: str = "english"
    state: str = "National"

class NewsResponse(BaseModel):
    news: List[News]
    total: int

# ===================== TRANSLATION SERVICE =====================
async def translate_text(text: str, target_language: str) -> str:
    """Translate text to target language using Gemini with Firestore caching"""

    if (
        target_language == "english"
        or not text
        or not text.strip()
        or LlmChat is None
    ):
        if LlmChat is None and target_language != "english" and text and text.strip():
            logger.warning("Translation service unavailable; returning original text")
        return text

    cache_key = hashlib.sha256(
        f"{text}|{target_language}".encode("utf-8")
    ).hexdigest()

    # =====================
    # FIRESTORE CACHE LOOKUP
    # =====================
    try:
        cache_doc = (
            db.collection("translation_cache")
            .document(cache_key)
            .get()
        )

        if cache_doc.exists:
            cache_data = cache_doc.to_dict()

            if cache_data.get("translated_text"):
                return cache_data["translated_text"]

    except Exception as e:
        logger.error(f"Cache lookup error: {e}")

    # =====================
    # GEMINI TRANSLATION
    # =====================
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_{uuid.uuid4()}",
            system_message=(
                f"You are a translator. Translate the given text "
                f"to {target_language}. Return ONLY the translated text."
            ),
        ).with_model(
            "gemini",
            "gemini-3-flash-preview"
        )

        message = UserMessage(text=text)

        response = await chat.send_message(message)

        translated = response.strip()

        # =====================
        # FIRESTORE CACHE SAVE
        # =====================
        try:
            db.collection("translation_cache").document(cache_key).set({
                "cache_key": cache_key,
                "source_text": text[:500],
                "target_language": target_language,
                "translated_text": translated,
                "created_at": datetime.utcnow()
            })

        except Exception as cache_err:
            logger.error(f"Cache write error: {cache_err}")

        return translated

    except Exception as e:
        logger.error(f"Translation error: {e}")
        return text

# ===================== NEWS FETCHING SERVICE =====================

async def upload_image_to_firebase(
    image_url: str,
    folder: str = "news"
) -> Optional[str]:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as response:
                if response.status != 200:
                    return None

                image_bytes = await response.read()

        file_name = f"{folder}/{uuid.uuid4()}.jpg"

        blob = bucket.blob(file_name)

        blob.upload_from_string(
            image_bytes,
            content_type="image/jpeg"
        )

        blob.make_public()

        return blob.public_url

    except Exception as e:
        logger.error(f"Firebase image upload error: {e}")
        return None


async def upload_video_to_firebase(
    video_file: UploadFile,
    folder: str = "videos"
) -> Optional[dict]:
    try:
        video_bytes = await video_file.read()
        extension = Path(video_file.filename).suffix or ".mp4"
        file_name = f"{folder}/{uuid.uuid4()}{extension}"

        blob = bucket.blob(file_name)
        blob.upload_from_string(
            video_bytes,
            content_type=video_file.content_type or "video/mp4"
        )
        blob.make_public()

        return {
            "public_url": blob.public_url,
            "file_name": file_name
        }

    except Exception as e:
        logger.error(f"Firebase video upload error: {e}")
        return None


async def fetch_news_from_gnews(language: str, state: str = "National", max_articles: int = 20, query_override: str = None) -> List[dict]:
    """Fetch news from GNews API"""
    try:
        lang_code = normalize_media_language_code(language)
        
        # Determine query based on state or use override
        if query_override:
            query = query_override
        elif state == "National":
            query = f"India"
        elif state == "International":
            query = "world"
        else:
            query = f"{state} India"
        
        url = f"https://gnews.io/api/v4/search?q={query}&lang={lang_code}&country=in&max={max_articles}&apikey={GNEWS_API_KEY}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    articles = data.get('articles', [])
                    
                    news_list = []
                    for article in articles:
                        # Convert image URL to base64 if exists
                        image_url = None

                        if article.get("image"):
                            image_url = await upload_image_to_firebase(
                                article["image"],
                                "news"
                            )
                        
                        news_item = {
                            'title': article.get('title', ''),
                            'description': article.get('description', ''),
                            'content': article.get('content', article.get('description', '')),
                            'imageUrl': image_url,
                            'source': article.get('source', {}).get('name', 'GNews'),
                            'publishedAt': article.get('publishedAt', datetime.utcnow().isoformat()),
                            'state': determine_state_from_article(
                                article.get('title'),
                                article.get('description'),
                                article.get('content'),
                                country_field=None,
                                default_state=state
                            ),
                            'language': get_display_language(language)
                        }
                        news_list.append(news_item)
                    
                    return news_list
                else:
                    logger.error(f"GNews API error: {response.status}")
                    return []
    except Exception as e:
        logger.error(f"Error fetching from GNews: {e}")
        return []

async def fetch_news_from_newsapi(language: str, state: str = "National", max_articles: int = 20, query_override: str = None) -> List[dict]:
    """Fetch news from NewsAPI.org"""
    try:
        lang_code = normalize_media_language_code(language)
        
        # Determine query based on state or use override
        if query_override:
            query = query_override
        elif state == "National":
            query = "India"
        elif state == "International":
            query = "world"
        else:
            query = f"{state}"
        
        url = f"https://newsapi.org/v2/everything?q={query}&language={lang_code}&sortBy=publishedAt&pageSize={max_articles}&apiKey={NEWSAPI_KEY}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    articles = data.get('articles', [])
                    
                    news_list = []
                    for article in articles:
                        # Convert image URL to base64 if exists
                        image_url = None

                        if article.get("urlToImage"):
                            image_url = await upload_image_to_firebase(
                                article["urlToImage"],
                                "news"
                            )
                        
                        news_item = {
                            'title': article.get('title', ''),
                            'description': article.get('description', ''),
                            'content': article.get('content', article.get('description', '')),
                            'imageUrl': image_url,
                            'source': article.get('source', {}).get('name', 'NewsAPI'),
                            'publishedAt': article.get('publishedAt', datetime.utcnow().isoformat()),
                            'state': determine_state_from_article(
                                article.get('title'),
                                article.get('description'),
                                article.get('content'),
                                country_field=None,
                                default_state=state
                            ),
                            'language': get_display_language(language)
                        }
                        news_list.append(news_item)
                    
                    return news_list
                else:
                    logger.error(f"NewsAPI error: {response.status}")
                    return []
    except Exception as e:
        logger.error(f"Error fetching from NewsAPI: {e}")
        return []

async def fetch_from_newsapi_top_headlines(language: str, state: str = "National", category: str = None, max_articles: int = 20) -> List[dict]:
    """Fetch top headlines from NewsAPI.org (different from /everything endpoint)"""
    try:
        lang_code = normalize_media_language_code(language)
        
        if state == "International":
            url = f"https://newsapi.org/v2/top-headlines?language={lang_code}&pageSize={max_articles}&apiKey={NEWSAPI_KEY}"
            if category:
                url += f"&category={category}"
        else:
            # National or state-specific
            url = f"https://newsapi.org/v2/top-headlines?country=in&pageSize={max_articles}&apiKey={NEWSAPI_KEY}"
            if category:
                url += f"&category={category}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    articles = data.get('articles', [])
                    
                    news_list = []
                    for article in articles:
                        image_url = None

                        if article.get("urlToImage"):
                            image_url = await upload_image_to_firebase(
                                article["urlToImage"],
                                "news"
                            )
                        
                        news_item = {
                            'title': article.get('title', ''),
                            'description': article.get('description', '') or article.get('title', ''),
                            'content': article.get('content', '') or article.get('description', '') or '',
                            'imageUrl': image_url,
                            'source': article.get('source', {}).get('name', 'NewsAPI'),
                            'publishedAt': article.get('publishedAt', datetime.utcnow().isoformat()),
                            'state': determine_state_from_article(
                                article.get('title'),
                                article.get('description'),
                                article.get('content'),
                                country_field=('in' if state != 'International' else None),
                                default_state=state
                            ),
                            'language': get_display_language(language)
                        }
                        news_list.append(news_item)
                    
                    return news_list
                else:
                    logger.error(f"NewsAPI top-headlines error: {response.status}")
                    return []
    except Exception as e:
        logger.error(f"Error fetching top-headlines: {e}")
        return []

async def fetch_newsapi_url(
    url: str,
    state: str = "National",
    language: str = "english",
    category: str = "general",
    default_source: str = "NewsAPI"
) -> List[dict]:
    """Fetch a generic NewsAPI endpoint and normalize the result."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"NewsAPI request failed: {response.status} {url}")
                    return []

                data = await response.json()
                articles = data.get("articles", [])

                news_list = []
                for article in articles:
                    image_url = None
                    if article.get("urlToImage"):
                        image_url = await upload_image_to_firebase(
                            article["urlToImage"],
                            "news"
                        )

                    news_list.append({
                        "title": article.get("title", ""),
                        "description": article.get("description", "") or article.get("title", ""),
                        "content": article.get("content", "") or article.get("description", "") or "",
                        "imageUrl": image_url,
                        "source": article.get("source", {}).get("name", default_source),
                        "category": category,
                        "publishedAt": article.get("publishedAt", datetime.utcnow().isoformat()),
                        "state": determine_state_from_article(
                            article.get("title"),
                            article.get("description"),
                            article.get("content"),
                            country_field=None,
                            default_state=state
                        ),
                        "language": get_display_language(language)
                    })

                return news_list
    except Exception as e:
        logger.error(f"Error fetching NewsAPI URL {url}: {e}")
        return []

async def fetch_newsdata_articles(
    query: str,
    country: str = "in",
    language_codes: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    max_results: int = 20
) -> List[dict]:
    """Fetch articles from NewsData.io latest endpoint and normalize the result."""
    if not NEWSDATA_API_KEY:
        logger.warning("NEWSDATA_API_KEY not configured; skipping NewsData.io fetch")
        return []

    country_code = country.lower()
    state = "National" if country_code == "in" else "International"
    language_codes = language_codes or NEWSDATA_LANGUAGE_CODES.copy()

    try:
        news_list: List[dict] = []

        for index in range(0, len(language_codes), 4):
            chunk = language_codes[index:index + 4]
            if not chunk:
                continue

            url = (
                f"https://newsdata.io/api/1/latest?apikey={NEWSDATA_API_KEY}"
                f"&q={query}&language={','.join(chunk)}"
            )
            if categories:
                url += "&category=" + ",".join(categories[:4])

            if chunk == ["en"]:
                url += f"&country={country_code}"

            logger.info(f"NewsData.io request URL: {url}")
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.error(f"NewsData.io request failed: {response.status} {url}")
                        continue

                    data = await response.json()
                    results = data.get("results", []) or []

                    for item in results:
                        if len(news_list) >= max_results:
                            break

                        image_url = None
                        if item.get("image_url"):
                            image_url = await upload_image_to_firebase(
                                item["image_url"],
                                "news"
                            )

                        item_lang = item.get("language") or chunk[0]
                        if isinstance(item_lang, str) and "," in item_lang:
                            item_lang = item_lang.split(",")[0].strip().lower()

                        news_list.append({
                            "title": item.get("title", ""),
                            "description": item.get("description", "") or item.get("title", ""),
                            "content": item.get("content", "") or item.get("description", "") or "",
                            "imageUrl": image_url,
                            "source": item.get("source_id", "NewsData.io"),
                            "category": ",".join(item.get("category", [])) if item.get("category") else (categories[0] if categories else "general"),
                            "publishedAt": item.get("pubDate", datetime.utcnow().isoformat()),
                            "state": determine_state_from_article(
                                item.get("title"),
                                item.get("description"),
                                item.get("content"),
                                country_field=country_code,
                                default_state=state
                            ),
                            "language": get_display_language(item_lang)
                        })

            if len(news_list) >= max_results:
                break
            await asyncio.sleep(0.2)

        return news_list
    except Exception as e:
        logger.error(f"Error fetching NewsData.io articles: {e}")
        return []

# part 3
async def fetch_and_store_news(
    newsapi_categories: Optional[List[str]] = None,
    newsapi_sources: Optional[List[str]] = None,
    newsapi_queries: Optional[List[str]] = None,
    newsdata_queries: Optional[List[str]] = None,
    newsdata_categories: Optional[List[str]] = None,
    newsdata_language_filter: Optional[str] = None,
    country: str = "us",
    language: str = "english",
    state: str = "National",
    max_articles_per_source: int = 20
):
    """Fetch news from NewsAPI and NewsData.io and store unique results."""
    if newsapi_categories is None:
        newsapi_categories = NEWSAPI_DEFAULT_CATEGORIES
    if newsapi_sources is None:
        newsapi_sources = NEWSAPI_DEFAULT_SOURCES
    if newsapi_queries is None:
        newsapi_queries = NEWSAPI_DEFAULT_QUERIES
    if newsdata_queries is None:
        newsdata_queries = NEWSDATA_DEFAULT_QUERIES
    if newsdata_categories is None:
        newsdata_categories = NEWSDATA_DEFAULT_CATEGORIES

    logger.info("Starting news fetch job...")

    try:
        total_stored = 0

        # === NewsAPI top-headlines by category ===
        for category in newsapi_categories:
            articles = await fetch_from_newsapi_top_headlines(
                language=language,
                state=state,
                category=category,
                max_articles=max_articles_per_source
            )
            logger.info(f"Fetched {len(articles)} NewsAPI top-headlines articles for category={category}")
            total_stored += await _store_articles(articles, language, translate=False)
            await asyncio.sleep(0.5)

        # === NewsAPI top-headlines by source ===
        for source in newsapi_sources:
            url = (
                f"https://newsapi.org/v2/top-headlines?sources={source}"
                f"&apiKey={NEWSAPI_KEY}"
            )
            articles = await fetch_newsapi_url(
                url,
                state=state,
                language=language,
                category="general",
                default_source=source
            )
            logger.info(f"Fetched {len(articles)} NewsAPI top-headlines articles for source={source}")
            total_stored += await _store_articles(articles, language, translate=False)
            await asyncio.sleep(0.5)

        # === NewsAPI everything queries ===
        for query in newsapi_queries:
            articles = await fetch_news_from_newsapi(
                language=language,
                state=state,
                max_articles=max_articles_per_source,
                query_override=query
            )
            logger.info(f"Fetched {len(articles)} NewsAPI everything articles for query={query}")
            total_stored += await _store_articles(articles, language, translate=False)
            await asyncio.sleep(0.5)

        # === NewsData.io query-based fetch ===
        if newsdata_language_filter is None:
            newsdata_language_filter = ",".join(NEWSDATA_LANGUAGE_CODES)

        for query in newsdata_queries:
            newsdata_codes = normalize_newsdata_language_codes(newsdata_language_filter)
            articles = await fetch_newsdata_articles(
                query=query,
                country=country,
                language_codes=newsdata_codes,
                categories=newsdata_categories,
                max_results=max_articles_per_source
            )
            logger.info(
                f"Fetched {len(articles)} NewsData.io articles for query={query} "
                f"languages={','.join(newsdata_codes)}"
            )
            total_stored += await _store_articles(articles, language, translate=False)
            await asyncio.sleep(0.5)

        logger.info(f"News fetch job completed! Total new articles: {total_stored}")
    except Exception as e:
        logger.error(f"Error in fetch_and_store_news: {e}")

async def _store_articles(
    articles: List[dict],
    language: str,
    translate: bool = False
) -> int:
    """Store articles in Firestore and skip duplicates"""

    stored = 0

    for article in articles:
        try:
            if not article.get("title") or not article.get("description"):
                continue

            if translate and language != "english":
                article["title"] = await translate_text(
                    article["title"],
                    language
                )

                article["description"] = await translate_text(
                    article["description"],
                    language
                )

            news_obj = News(
                title=article["title"],
                description=article["description"],
                content=article["content"],
                imageUrl=article.get("imageUrl"),
                category=article.get("category", "general"),
                state=article["state"],
                language=article["language"],
                source=article["source"],
                publishedAt=datetime.fromisoformat(
                    article["publishedAt"].replace("Z", "+00:00")
                )
            )

            docs = (
                db.collection("news")
                .where(filter=FieldFilter("title", "==", news_obj.title))
                .where(filter=FieldFilter("language", "==", news_obj.language))
                .where(filter=FieldFilter("source", "==", news_obj.source))
                .limit(1)
                .stream()
            )

            existing = next(docs, None)

            if not existing:
                db.collection("news").document(news_obj.id).set(
                    news_obj.dict()
                )

                stored += 1

        except Exception as e:
            logger.error(f"Error storing article: {e}")
            continue

    return stored

async def cleanup_old_news():
    logger.info("Starting news cleanup job...")

    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=24)

        docs = (
            db.collection("news")
            .where(filter=FieldFilter("createdAt", "<", cutoff_time))
            .stream()
        )

        deleted_count = 0

        for doc in docs:
            doc.reference.delete()
            deleted_count += 1

        logger.info(
            f"Deleted {deleted_count} old news items"
        )

    except Exception as e:
        logger.error(
            f"Error in cleanup_old_news: {e}"
        )
# ===================== API ENDPOINTS =====================
@api_router.get("/")
async def root():
    return {"message": "THE BHARAT News API"}

@api_router.get("/states")
async def get_states():
    """Get list of all states"""
    return {"states": INDIAN_STATES}

@api_router.get("/languages")
async def get_languages():
    """Get list of all supported languages"""
    return {"languages": LANGUAGES}

@api_router.get("/news", response_model=NewsResponse)
async def get_news(
    language: str = "english",
    state: str = "National",
    skip: int = 0,
    limit: int = 50
):
    try:

        query = (
            db.collection("news")
            .where(filter=FieldFilter("isActive", "==", True))
            .where(filter=FieldFilter("language", "==", language))
        )

        if state == "National":
            query = query.where(filter=FieldFilter("state", "==", "National"))

        elif state == "International":
            query = query.where(filter=FieldFilter("state", "==", "International"))

        else:
            query = query.where(filter=FieldFilter("state", "==", state))

        docs = list(query.stream())

        news_items = [
            doc.to_dict()
            for doc in docs
        ]

        news_items.sort(
            key=lambda x: (
                not x.get("isAdminNews", False),
                -x.get(
                    "createdAt",
                    datetime.min
                ).timestamp()
            )
        )

        total = len(news_items)

        news_items = news_items[
            skip : skip + limit
        ]

        news_list = [
            News(**item)
            for item in news_items
        ]

        return NewsResponse(
            news=news_list,
            total=total
        )

    except Exception as e:
        logger.error(
            f"Error fetching news: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# part 4
@api_router.get("/ads")
async def get_ads():
    try:
        docs = db.collection("ads").where(
            filter=FieldFilter("isActive", "==", True)
        ).stream()

        ads = [
            doc.to_dict()
            for doc in docs
        ]

        ads.sort(
            key=lambda x: x.get("position", 999)
        )

        return {
            "ads": [
                Ad(**ad)
                for ad in ads
            ]
        }

    except Exception as e:
        logger.error(f"Error fetching ads: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    """Admin login"""
    if credentials.password == "sunilk@12295":
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid password")

@api_router.post("/admin/news")
async def create_news(news: NewsCreate):
    """Admin: Create custom news"""
    try:
        news_obj = News(
            title=news.title,
            description=news.description,
            content=news.content,
            imageUrl=news.imageUrl,
            category=news.category,
            state=news.state,
            language=news.language,
            source="THE BHARAT",
            publishedAt=datetime.utcnow(),
            isAdminNews=True
        )
        
        db.collection("news").document(news_obj.id).set(
    news_obj.dict()
)
        return {"success": True, "message": "News created successfully", "id": news_obj.id}
    except Exception as e:
        logger.error(f"Error creating news: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/ads")
async def create_ad(ad: AdCreate):
    """Admin: Create ad"""
    try:
        ad_obj = Ad(
            title=ad.title,
            media=ad.media,
            mediaType=ad.mediaType,
            position=ad.position,
            duration=ad.duration
        )
        
        if ad.duration:
            ad_obj.expiresAt = datetime.utcnow() + timedelta(seconds=ad.duration)
        
        db.collection("ads").document(ad_obj.id).set(
    ad_obj.dict()
)
        return {"success": True, "message": "Ad created successfully", "id": ad_obj.id}
    except Exception as e:
        logger.error(f"Error creating ad: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/shorts")
async def create_short(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    video: UploadFile = File(...)
):
    """Admin: Upload a video short to Firebase storage and save metadata."""
    try:
        upload_result = await upload_video_to_firebase(video)
        if not upload_result:
            raise HTTPException(status_code=500, detail="Video upload failed")

        short_obj = Short(
            title=title,
            description=description,
            videoUrl=upload_result["public_url"],
            fileName=upload_result["file_name"]
        )

        db.collection("shorts").document(short_obj.id).set(short_obj.dict())
        return {"success": True, "message": "Short uploaded successfully", "id": short_obj.id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating short: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/shorts/{short_id}")
async def delete_short(short_id: str):
    """Admin: Delete a short and remove its video from Firebase storage."""
    try:
        doc_ref = db.collection("shorts").document(short_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Short not found")

        short_data = doc.to_dict() or {}
        file_name = short_data.get("fileName")
        if file_name:
            try:
                bucket.blob(file_name).delete()
            except Exception as e:
                logger.warning(f"Failed to delete video file from storage: {e}")

        doc_ref.delete()
        return {"success": True, "message": "Short deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting short: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/shorts")
async def list_shorts(limit: int = 20):
    """Fetch shorts in random order for the user."""
    try:
        docs = list(db.collection("shorts").where(filter=FieldFilter("isActive", "==", True)).stream())
        shorts = [doc.to_dict() for doc in docs]
        random.shuffle(shorts)
        selected = shorts[:limit]
        return {"shorts": selected, "total": len(shorts)}
    except Exception as e:
        logger.error(f"Error fetching shorts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/trigger-fetch")
async def trigger_news_fetch(filters: Optional[FetchFilters] = None):
    """Admin: Manually trigger news fetch"""
    try:
        filters = filters or FetchFilters()
        asyncio.create_task(fetch_and_store_news(
            newsapi_categories=filters.newsapi_categories,
            newsapi_sources=filters.newsapi_sources,
            newsapi_queries=filters.newsapi_queries,
            newsdata_queries=filters.newsdata_queries,
            newsdata_categories=filters.newsdata_categories,
            newsdata_language_filter=filters.newsdata_language_filter,
            country=filters.country,
            language=filters.language,
            state=filters.state
        ))
        return {"success": True, "message": "News fetch triggered"}
    except Exception as e:
        logger.error(f"Error triggering fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/cache/stats")
async def cache_stats():
    try:

        docs = list(
            db.collection(
                "translation_cache"
            ).stream()
        )

        total = len(docs)

        by_language = {}

        for doc in docs:
            data = doc.to_dict()

            lang = data.get(
                "target_language",
                "unknown"
            )

            by_language[lang] = (
                by_language.get(lang, 0) + 1
            )

        return {
            "total_cached_translations": total,
            "by_language": by_language
        }

    except Exception as e:
        logger.error(
            f"Cache stats error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@api_router.delete("/admin/cache/clear")
async def clear_cache():
    try:

        docs = db.collection(
            "translation_cache"
        ).stream()

        deleted_count = 0

        for doc in docs:
            doc.reference.delete()
            deleted_count += 1

        return {
            "success": True,
            "deleted_count": deleted_count
        }

    except Exception as e:
        logger.error(
            f"Cache clear error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@api_router.get("/admin/news/list")
async def list_all_news_admin():
    try:

        docs = list(
            db.collection("news").stream()
        )

        news_items = []

        for doc in docs:
            data = doc.to_dict()

            data.pop("content", None)

            news_items.append(data)

        news_items.sort(
            key=lambda x: (
                not x.get(
                    "isAdminNews",
                    False
                ),
                -x.get(
                    "createdAt",
                    datetime.min
                ).timestamp()
            )
        )

        return {
            "news": news_items,
            "total": len(news_items)
        }

    except Exception as e:
        logger.error(
            f"Error listing news: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@api_router.get("/admin/ads/list")
async def list_all_ads_admin():
    try:

        docs = list(
            db.collection("ads").stream()
        )

        ads = []

        for doc in docs:
            data = doc.to_dict()

            data.pop("media", None)

            ads.append(data)

        ads.sort(
            key=lambda x: x.get(
                "position",
                999
            )
        )

        return {
            "ads": ads,
            "total": len(ads)
        }

    except Exception as e:
        logger.error(
            f"Error listing ads: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@api_router.delete("/admin/news/{news_id}")
async def delete_news(news_id: str):
    try:

        doc_ref = db.collection(
            "news"
        ).document(news_id)

        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(
                status_code=404,
                detail="News not found"
            )

        doc_ref.delete()

        return {
            "success": True,
            "message": "News deleted"
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Error deleting news: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@api_router.delete("/admin/ads/{ad_id}")
async def delete_ad(ad_id: str):
    try:

        doc_ref = db.collection(
            "ads"
        ).document(ad_id)

        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(
                status_code=404,
                detail="Ad not found"
            )

        doc_ref.delete()

        return {
            "success": True,
            "message": "Ad deleted"
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Error deleting ad: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lifespan handler manages scheduler startup and shutdown
