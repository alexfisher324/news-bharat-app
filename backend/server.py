from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import aiohttp
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from emergentintegrations.llm.chat import LlmChat, UserMessage
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Get API keys
GNEWS_API_KEY = "c062112f47750533ae2175fa74747326"
NEWSAPI_KEY = "71077b405ea14c7bb4f362f441fb6669"
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "sk-emergent-6845fC8045d521a486")

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

class NewsResponse(BaseModel):
    news: List[News]
    total: int

# ===================== TRANSLATION SERVICE =====================
async def translate_text(text: str, target_language: str) -> str:
    """Translate text to target language using Gemini"""
    if target_language == "english":
        return text
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_{uuid.uuid4()}",
            system_message=f"You are a translator. Translate the given text to {target_language}. Return ONLY the translated text, nothing else."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        message = UserMessage(text=text)
        response = await chat.send_message(message)
        return response.strip()
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return text  # Return original if translation fails

# ===================== NEWS FETCHING SERVICE =====================
async def fetch_news_from_gnews(language: str, state: str = "National", max_articles: int = 20) -> List[dict]:
    """Fetch news from GNews API"""
    try:
        lang_code = LANGUAGE_CODES.get(language, "en")
        
        # Determine query based on state
        if state == "National":
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
                        image_base64 = None
                        if article.get('image'):
                            try:
                                async with session.get(article['image']) as img_response:
                                    if img_response.status == 200:
                                        img_data = await img_response.read()
                                        image_base64 = f"data:image/jpeg;base64,{base64.b64encode(img_data).decode()}"
                            except:
                                pass
                        
                        news_item = {
                            'title': article.get('title', ''),
                            'description': article.get('description', ''),
                            'content': article.get('content', article.get('description', '')),
                            'imageUrl': image_base64,
                            'source': article.get('source', {}).get('name', 'GNews'),
                            'publishedAt': article.get('publishedAt', datetime.utcnow().isoformat()),
                            'state': state,
                            'language': language
                        }
                        news_list.append(news_item)
                    
                    return news_list
                else:
                    logger.error(f"GNews API error: {response.status}")
                    return []
    except Exception as e:
        logger.error(f"Error fetching from GNews: {e}")
        return []

async def fetch_news_from_newsapi(language: str, state: str = "National", max_articles: int = 20) -> List[dict]:
    """Fetch news from NewsAPI.org"""
    try:
        lang_code = LANGUAGE_CODES.get(language, "en")
        
        # Determine query based on state
        if state == "National":
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
                        image_base64 = None
                        if article.get('urlToImage'):
                            try:
                                async with session.get(article['urlToImage']) as img_response:
                                    if img_response.status == 200:
                                        img_data = await img_response.read()
                                        image_base64 = f"data:image/jpeg;base64,{base64.b64encode(img_data).decode()}"
                            except:
                                pass
                        
                        news_item = {
                            'title': article.get('title', ''),
                            'description': article.get('description', ''),
                            'content': article.get('content', article.get('description', '')),
                            'imageUrl': image_base64,
                            'source': article.get('source', {}).get('name', 'NewsAPI'),
                            'publishedAt': article.get('publishedAt', datetime.utcnow().isoformat()),
                            'state': state,
                            'language': language
                        }
                        news_list.append(news_item)
                    
                    return news_list
                else:
                    logger.error(f"NewsAPI error: {response.status}")
                    return []
    except Exception as e:
        logger.error(f"Error fetching from NewsAPI: {e}")
        return []

async def fetch_and_store_news():
    """Fetch news for all languages and states, then store in database"""
    logger.info("Starting news fetch job...")
    
    try:
        # Fetch for default languages and states
        priority_languages = ["english", "hindi"]
        priority_states = ["National", "International"]
        
        for language in priority_languages:
            for state in priority_states:
                # Fetch from both APIs
                gnews_articles = await fetch_news_from_gnews(language, state, 10)
                newsapi_articles = await fetch_news_from_newsapi(language, state, 10)
                
                all_articles = gnews_articles + newsapi_articles
                
                # Store in database
                for article in all_articles:
                    try:
                        # Translate if needed
                        if language != "english":
                            article['title'] = await translate_text(article['title'], language)
                            article['description'] = await translate_text(article['description'], language)
                        
                        news_obj = News(
                            title=article['title'],
                            description=article['description'],
                            content=article['content'],
                            imageUrl=article.get('imageUrl'),
                            state=article['state'],
                            language=article['language'],
                            source=article['source'],
                            publishedAt=datetime.fromisoformat(article['publishedAt'].replace('Z', '+00:00'))
                        )
                        
                        # Check if news already exists
                        existing = await db.news.find_one({"title": news_obj.title})
                        if not existing:
                            await db.news.insert_one(news_obj.dict())
                            logger.info(f"Stored news: {news_obj.title[:50]}...")
                    except Exception as e:
                        logger.error(f"Error storing news: {e}")
                        continue
                
                await asyncio.sleep(2)  # Rate limiting
        
        logger.info("News fetch job completed!")
    except Exception as e:
        logger.error(f"Error in fetch_and_store_news: {e}")

async def cleanup_old_news():
    """Remove news older than 24 hours"""
    logger.info("Starting news cleanup job...")
    
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        result = await db.news.delete_many({"createdAt": {"$lt": cutoff_time}})
        logger.info(f"Deleted {result.deleted_count} old news items")
    except Exception as e:
        logger.error(f"Error in cleanup_old_news: {e}")

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
    """Get news with pagination and filters - admin news first, then API news"""
    try:
        query = {"isActive": True, "language": language}
        
        if state != "National" and state != "International":
            query["state"] = state
        elif state == "National":
            query["state"] = "National"
        elif state == "International":
            query["state"] = "International"
        
        total = await db.news.count_documents(query)
        # Sort by isAdminNews (True first), then by createdAt (newest first)
        news_items = await db.news.find(query).sort([("isAdminNews", -1), ("createdAt", -1)]).skip(skip).limit(limit).to_list(limit)
        
        news_list = [News(**item) for item in news_items]
        
        return NewsResponse(news=news_list, total=total)
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ads")
async def get_ads():
    """Get all active ads"""
    try:
        ads = await db.ads.find({"isActive": True}).sort("position", 1).to_list(100)
        return {"ads": [Ad(**ad) for ad in ads]}
    except Exception as e:
        logger.error(f"Error fetching ads: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    """Admin login"""
    if credentials.password == "sunil@123":
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
        
        await db.news.insert_one(news_obj.dict())
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
        
        await db.ads.insert_one(ad_obj.dict())
        return {"success": True, "message": "Ad created successfully", "id": ad_obj.id}
    except Exception as e:
        logger.error(f"Error creating ad: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/trigger-fetch")
async def trigger_news_fetch():
    """Admin: Manually trigger news fetch"""
    try:
        asyncio.create_task(fetch_and_store_news())
        return {"success": True, "message": "News fetch triggered"}
    except Exception as e:
        logger.error(f"Error triggering fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/news/list")
async def list_all_news_admin():
    """Admin: List all news for management"""
    try:
        news_items = await db.news.find({}, {"_id": 0, "content": 0}).sort([("isAdminNews", -1), ("createdAt", -1)]).to_list(500)
        return {"news": news_items, "total": len(news_items)}
    except Exception as e:
        logger.error(f"Error listing news: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/ads/list")
async def list_all_ads_admin():
    """Admin: List all ads for management"""
    try:
        ads = await db.ads.find({}, {"_id": 0, "media": 0}).sort("position", 1).to_list(500)
        return {"ads": ads, "total": len(ads)}
    except Exception as e:
        logger.error(f"Error listing ads: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/news/{news_id}")
async def delete_news(news_id: str):
    """Admin: Delete news"""
    try:
        result = await db.news.delete_one({"id": news_id})
        if result.deleted_count > 0:
            return {"success": True, "message": "News deleted"}
        else:
            raise HTTPException(status_code=404, detail="News not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting news: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/ads/{ad_id}")
async def delete_ad(ad_id: str):
    """Admin: Delete ad"""
    try:
        result = await db.ads.delete_one({"id": ad_id})
        if result.deleted_count > 0:
            return {"success": True, "message": "Ad deleted"}
        else:
            raise HTTPException(status_code=404, detail="Ad not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting ad: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== SCHEDULER =====================
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    """Initialize scheduler and seed data"""
    logger.info("Starting up THE BHARAT API...")
    
    # Add EMERGENT_LLM_KEY to .env if not exists
    env_path = ROOT_DIR / '.env'
    env_content = env_path.read_text()
    if 'EMERGENT_LLM_KEY' not in env_content:
        with open(env_path, 'a') as f:
            f.write(f'\nEMERGENT_LLM_KEY={EMERGENT_LLM_KEY}\n')
    
    # Seed initial news data
    news_count = await db.news.count_documents({})
    if news_count == 0:
        logger.info("Seeding initial news data...")
        await fetch_and_store_news()
    
    # Schedule jobs
    # Fetch news every 6 hours
    scheduler.add_job(fetch_and_store_news, 'interval', hours=6, id='fetch_news')
    
    # Cleanup old news every hour
    scheduler.add_job(cleanup_old_news, 'interval', hours=1, id='cleanup_news')
    
    scheduler.start()
    logger.info("Scheduler started!")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()
