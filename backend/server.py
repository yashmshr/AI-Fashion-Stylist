from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import base64
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


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


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class FashionAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    clothing_pieces: List[Dict[str, Any]]
    overall_analysis: Dict[str, Any]
    styling_tips: List[str]
    occasion_recommendations: List[str]
    color_palette: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AnalysisResponse(BaseModel):
    success: bool
    analysis: Optional[FashionAnalysis] = None
    error: Optional[str] = None


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "AI Fashion Stylist API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/analyze-fashion", response_model=AnalysisResponse)
async def analyze_fashion_image(file: UploadFile = File(...)):
    try:
        # Validate file type
        if file.content_type not in ["image/jpeg", "image/jpg", "image/png", "image/heic"]:
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload JPG, PNG, or HEIC images only")
        
        # Check file size (5MB limit)
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="File too large. Please upload an image smaller than 5MB")
        
        # Convert to base64
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # Get Emergent LLM key
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="AI service not available")
        
        # Initialize LLM chat with GPT-4 Vision
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"fashion-analysis-{uuid.uuid4()}",
            system_message="""You are an expert AI fashion stylist with deep knowledge of fashion trends, color theory, body types, and styling techniques. 
            
            Analyze fashion images comprehensively and provide detailed styling advice in JSON format. Focus on:
            - Identifying clothing pieces with detailed descriptions
            - Color analysis and palette recommendations
            - Style categorization and occasion appropriateness
            - Professional styling tips and recommendations
            - Mix-and-match suggestions for versatile styling
            
            Always provide constructive, positive, and actionable advice."""
        ).with_model("openai", "gpt-4o")
        
        # Create fashion analysis prompt
        fashion_prompt = """
        Analyze this fashion image comprehensively as an expert stylist. Provide your analysis in the following JSON format:

        {
          "clothing_pieces": [
            {
              "type": "dress/top/bottom/jacket/accessories/shoes",
              "description": "detailed description of the item",
              "colors": ["primary color", "accent color"],
              "pattern": "solid/striped/floral/geometric/abstract/etc",
              "fit": "loose/fitted/oversized/tailored",
              "style_category": "casual/formal/business/party/sporty"
            }
          ],
          "overall_analysis": {
            "style_category": "minimalist/boho/classic/trendy/edgy/romantic/etc",
            "formality_level": "casual/smart-casual/business/formal",
            "season": "spring/summer/fall/winter/all-season",
            "occasions": ["work", "casual", "date", "party", "wedding", "etc"]
          },
          "styling_tips": [
            "specific styling advice",
            "how to improve the look",
            "alternative styling options"
          ],
          "occasion_recommendations": [
            "best occasions for this outfit",
            "where this style works well"
          ],
          "color_palette": [
            "dominant color",
            "accent colors",
            "complementary colors that would work"
          ]
        }

        Provide detailed, professional styling advice. Be specific about colors, fits, and styling techniques.
        """
        
        # Create image content
        image_content = ImageContent(image_base64=base64_image)
        
        # Create user message with image
        user_message = UserMessage(
            text=fashion_prompt,
            file_contents=[image_content]
        )
        
        # Send message and get response
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        import json
        try:
            analysis_data = json.loads(response)
            
            # Create FashionAnalysis object
            fashion_analysis = FashionAnalysis(
                clothing_pieces=analysis_data.get("clothing_pieces", []),
                overall_analysis=analysis_data.get("overall_analysis", {}),
                styling_tips=analysis_data.get("styling_tips", []),
                occasion_recommendations=analysis_data.get("occasion_recommendations", []),
                color_palette=analysis_data.get("color_palette", [])
            )
            
            # Store in database
            await db.fashion_analyses.insert_one(fashion_analysis.dict())
            
            return AnalysisResponse(success=True, analysis=fashion_analysis)
            
        except json.JSONDecodeError:
            # If JSON parsing fails, create a simplified response
            fashion_analysis = FashionAnalysis(
                clothing_pieces=[{"type": "outfit", "description": "Fashion items detected", "colors": ["various"], "pattern": "mixed", "fit": "analyzed", "style_category": "stylish"}],
                overall_analysis={"style_category": "analyzed", "formality_level": "determined", "season": "versatile", "occasions": ["analyzed"]},
                styling_tips=[response[:200] + "..." if len(response) > 200 else response],
                occasion_recommendations=["Professional styling advice provided"],
                color_palette=["Color analysis completed"]
            )
            
            await db.fashion_analyses.insert_one(fashion_analysis.dict())
            return AnalysisResponse(success=True, analysis=fashion_analysis)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Fashion analysis error: {str(e)}")
        return AnalysisResponse(success=False, error="Unable to analyze fashion image. Please try again with a clearer photo.")

@api_router.get("/recent-analyses", response_model=List[FashionAnalysis])
async def get_recent_analyses(limit: int = 10):
    analyses = await db.fashion_analyses.find().sort("timestamp", -1).limit(limit).to_list(limit)
    return [FashionAnalysis(**analysis) for analysis in analyses]


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()