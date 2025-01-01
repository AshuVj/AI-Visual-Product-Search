# app.py

import os
import bcrypt
import asyncio
import aiohttp
from utils import clean_search_term
import re  # For regex operations
import logging  # For logging
from dotenv import load_dotenv  # For loading environment variables
from scrapers import EbaySearcher
from flask import Flask, request, jsonify
from flask_restful import Api, Resource
from flask_cors import CORS  # For handling CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)

from pymongo import MongoClient
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from typing import List, Dict

import google.cloud.vision as vision
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

###############################################################################
# CONFIGURATION
###############################################################################

load_dotenv()  # Load environment variables from .env

# Your keys
MONGO_URI = os.getenv("MONGO_URI")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
BING_SUBSCRIPTION_KEY = os.getenv("BING_SUBSCRIPTION_KEY")
GCS_API_KEY = os.getenv("GCS_API_KEY")
GCS_CX = os.getenv("GCS_CX")
EBAY_APPID = os.getenv('EBAY_APPID')
EBAY_DEVID = os.getenv('EBAY_DEVID')
EBAY_CERTID = os.getenv('EBAY_CERTID')
IPAGEO_GEOLOCATION_API_KEY = os.getenv("IPAGEO_GEOLOCATION_API_KEY")  # Your iPageoGeolocation API Key

###############################################################################
# LOGGING SETUP
###############################################################################
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for detailed logs
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

###############################################################################
# FLASK APP
###############################################################################
app = Flask(__name__)
api = Api(app)

# Enable CORS on everything. Adjust origins in production for security:
CORS(app, resources={r"/*": {"origins": "*"}})

###############################################################################
# MONGO + JWT SETUP
###############################################################################
client = MongoClient(MONGO_URI)
db = client["visual_search_engine"]

app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)  # Extended to 1 hour
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)  # Refresh tokens valid for 30 days
jwt = JWTManager(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB

###############################################################################
# REAL GOOGLE VISION DETECTION
###############################################################################

def analyze_image_with_vision(image_path: str) -> Dict:
    """
    Uses Google Cloud Vision to detect labels, objects, and web entities.
    """
    client = vision.ImageAnnotatorClient()

    with open(image_path, "rb") as f:
        content = f.read()
        image = vision.Image(content=content)

    # 1) Label detection
    label_response = client.label_detection(image=image)
    label_detection = label_response.label_annotations

    # 2) Object detection
    obj_response = client.object_localization(image=image)
    object_detection = obj_response.localized_object_annotations

    # 3) Web detection
    web_response = client.web_detection(image=image)
    web_detection = web_response.web_detection

    detected_terms = []
    confidence_scores = []

    # Best guess labels from web detection
    if web_detection.best_guess_labels:
        for label in web_detection.best_guess_labels:
            detected_terms.append(label.label)
            # Assume a high confidence for best guess
            confidence_scores.append(0.9)

    # Web entities with high score
    if web_detection.web_entities:
        # Pick top 2-3, for example
        sorted_web_entities = sorted(
            web_detection.web_entities, 
            key=lambda e: e.score or 0, 
            reverse=True
        )
        for entity in sorted_web_entities[:2]:
            if entity.score and entity.score > 0.7:
                detected_terms.append(entity.description)
                confidence_scores.append(entity.score)

    # Object detection
    for obj in object_detection:
        if obj.score > 0.7:
            detected_terms.append(obj.name)
            confidence_scores.append(obj.score)

    # Label detection
    if label_detection:
        sorted_labels = sorted(label_detection, key=lambda l: l.score, reverse=True)
        for lab in sorted_labels[:2]:
            if lab.score > 0.8:
                detected_terms.append(lab.description)
                confidence_scores.append(lab.score)

    # Remove duplicates while preserving order
    seen = set()
    unique_terms = []
    unique_scores = []
    for term, sc in zip(detected_terms, confidence_scores):
        t_lower = term.lower()
        if t_lower not in seen:
            seen.add(t_lower)
            unique_terms.append(term)
            unique_scores.append(sc)

    avg_conf = sum(unique_scores) / len(unique_scores) if unique_scores else 0

    # Example logic: categorize terms
    product_info = {
        'category': [t for t in unique_terms if any(cat in t.lower() for cat in ['shirt','shoe','dress','watch','phone'])],
        'attributes': [t for t in unique_terms if not any(cat in t.lower() for cat in ['shirt','shoe','dress','watch','phone'])],
        'confidence': avg_conf > 0.8
    }

    logger.debug(f"Product Info: {product_info}")

    return {
        'search_terms': unique_terms[:5],
        'product_info': product_info,
        'confidence': avg_conf > 0.8,
    }

###############################################################################
# REAL BING VISUAL SEARCH
###############################################################################

async def fetch_bing_similar_products(image_path: str, api_key: str) -> List[Dict]:
    """
    Uses Bing Visual Search to find similar products.
    """
    endpoint = "https://api.bing.microsoft.com/v7.0/images/visualsearch"
    headers = {"Ocp-Apim-Subscription-Key": api_key}

    async with aiohttp.ClientSession() as session:
        try:
            with open(image_path, "rb") as f:
                image_data = f.read()

            form = aiohttp.FormData()
            form.add_field('image', image_data, filename='image.jpg')

            async with session.post(endpoint, headers=headers, data=form) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.debug(f"[BING] Response Data: {data}")
                    # Parse Bing's response
                    products = []
                    tags = data.get('tags', [])
                    for tag in tags:
                        actions = tag.get('actions', [])
                        for act in actions:
                            if act.get('actionType') == 'ProductVisualSearch':
                                for item in act.get('data', {}).get('items', []):
                                    host_page_url = item.get('hostPageUrl', '')
                                    # Ensure the URL has the protocol
                                    source_link = host_page_url if host_page_url.startswith(('http://', 'https://')) else f"https://{host_page_url}"
                                    price = float(item.get('price', 0)) if item.get('price') else 0  # Extract price if available
                                    products.append({
                                        'title': item.get('name', ''),
                                        'price': price,
                                        'currency': 'USD',  # Assuming USD, adjust if necessary
                                        'platform': 'Bing Visual Search',
                                        'imageUrl': item.get('thumbnailUrl', ''),
                                        'sourceLink': source_link,  # Ensure protocol
                                        'id': host_page_url,  # Assuming 'hostPageUrl' is unique
                                    })
                    logger.debug(f"[BING] Parsed Products: {products}")
                    return products
                else:
                    logger.error(f"[BING] HTTP {response.status}")
                    return []
        except Exception as e:
            logger.error(f"[BING] Error: {str(e)}")
            return []

###############################################################################
# REAL GOOGLE CUSTOM SEARCH
###############################################################################

def extract_price(text: str) -> float:
    """
    Extracts the most plausible price from the given text.
    Prioritizes higher prices and excludes discount amounts.
    """
    # Define regex patterns to match prices not followed by 'off' or 'discount'
    price_patterns = [
        r'₹\s?([\d,]+\.?\d*)\s?(?!off|discount)',          # Indian Rupee not followed by 'off' or 'discount'
        r'\bINR\s?([\d,]+\.?\d*)\b(?!\s?off|discount)',    # INR with word boundary not followed by 'off' or 'discount'
        r'€\s?([\d,]+\.?\d*)',                            # Euro
        r'\bEUR\s?([\d,]+\.?\d*)\b',                      # EUR with word boundary
        r'£\s?([\d,]+\.?\d*)',                            # British Pound
        r'\bGBP\s?([\d,]+\.?\d*)\b',                      # GBP with word boundary
        r'¥\s?([\d,]+\.?\d*)',                            # Japanese Yen
        r'\bJPY\s?([\d,]+\.?\d*)\b',                      # JPY with word boundary
        r'\$\s?([\d,]+\.?\d*)',                           # USD symbol
        r'\bUSD\s?([\d,]+\.?\d*)\b',                      # USD with word boundary
        # Add more patterns as needed
    ]

    prices = []
    for pattern in price_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            price_str = match.replace(',', '')
            try:
                price = float(price_str)
                # Implement a sanity check (e.g., prices between 100 and 1,000,000)
                if 100.0 <= price <= 1000000.0:
                    prices.append(price)
                else:
                    logger.debug(f"Excluded unrealistic price: {price}")
            except ValueError:
                logger.debug(f"Failed to convert price string to float: '{match}'")
                continue

    if prices:
        # Return the highest plausible price to avoid discounts
        selected_price = max(prices)
        logger.debug(f"Selected price: {selected_price}")
        return selected_price

    logger.debug("No valid price found in text.")
    return 0.0  # Default if no price found

async def fetch_google_custom_search(search_term: str, api_key: str, cx: str) -> List[Dict]:
    """
    Fetches search results from Google Custom Search API and extracts product information.
    """
    endpoint = "https://www.googleapis.com/customsearch/v1"
    params = {
        'q': search_term,
        'key': api_key,
        'cx': cx,
        'searchType': 'image',
        'num': 10,
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(endpoint, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    items = data.get('items', [])
                    products = []
                    for it in items:
                        title = it.get('title', '')
                        image_url = it.get('link', '')  # main image
                        snippet = it.get('snippet', '')
                        pagemap = it.get('pagemap', {})
                        source_link = it.get('image', {}).get('contextLink', '')

                        logger.debug(f"[GCS] Processing item: {title}")
                        logger.debug(f"[GCS] Pagemap: {pagemap}")

                        if not source_link.startswith(('http://', 'https://')):
                            logger.warning(f"Invalid sourceLink for GCS item: '{title}'. Skipping.")
                            continue

                        price = 0.0

                        # Attempt price from pagemap.offer
                        if 'offer' in pagemap and isinstance(pagemap['offer'], list) and len(pagemap['offer']) > 0:
                            offer = pagemap['offer'][0]
                            if 'price' in offer:
                                try:
                                    price = float(offer['price'])
                                    logger.debug(f"[GCS] Extracted price from offer: {price}")
                                except (ValueError, TypeError):
                                    price = 0.0
                                    logger.error(f"[GCS] Failed to convert offer price for item '{title}'")

                        # Attempt price from pagemap.product
                        if price == 0.0 and 'product' in pagemap and isinstance(pagemap['product'], list) and len(pagemap['product']) > 0:
                            product = pagemap['product'][0]
                            if 'price' in product:
                                try:
                                    price = float(product['price'])
                                    logger.debug(f"[GCS] Extracted price from product: {price}")
                                except (ValueError, TypeError):
                                    price = 0.0
                                    logger.error(f"[GCS] Failed to convert product price for item '{title}'")

                        # If price still not found, try snippet
                        if price == 0.0:
                            price = extract_price(snippet)
                            logger.debug(f"[GCS] Extracted price from snippet: {price}")

                        # Force image URL check
                        if not image_url.startswith(('http://', 'https://')):
                            logger.warning(f"Invalid imageUrl for GCS item: '{title}'. Skipping.")
                            continue

                        # Hardcode currency to 'INR'
                        product_currency = 'INR'

                        # Create a unique ID
                        unique_id = f"gcs_{hash(source_link)}"

                        # Add product to the list
                        products.append({
                            'id': unique_id,
                            'title': title,
                            'price': price,
                            'currency': product_currency,
                            'platform': 'Google Custom Search',
                            'imageUrl': image_url,
                            'sourceLink': source_link,
                        })
                        logger.debug(f"[GCS] Added product: {unique_id}, Price: {price} {product_currency}")

                    logger.debug(f"[GCS] Total parsed products: {len(products)}")
                    return products
                else:
                    logger.error(f"[GCS] HTTP {response.status} for search term '{search_term}'")
                    return []
        except Exception as ex:
            logger.error(f"[GCS] Error during search: {str(ex)}")
            return []

###############################################################################
# AUTH RESOURCES
###############################################################################
class Register(Resource):
    def post(self):
        data = request.get_json()
        if not data or "email" not in data or "password" not in data:
            logger.error("Registration failed: Email and password are required")
            return {"error": "Email and password are required"}, 400

        hashed_password = bcrypt.hashpw(
            data["password"].encode("utf-8"), bcrypt.gensalt()
        )
        user = {"email": data["email"], "password": hashed_password.decode("utf-8")}

        if db["users"].find_one({"email": user["email"]}):
            logger.error(f"Registration failed: User already exists ({user['email']})")
            return {"error": "User already exists"}, 400

        db["users"].insert_one(user)
        logger.info(f"User registered successfully: {user['email']}")
        return {"message": "User registered successfully"}, 201

class Login(Resource):
    def post(self):
        data = request.get_json()
        if not data or "email" not in data or "password" not in data:
            logger.error("Login failed: Email and password are required")
            return {"error": "Email and password are required"}, 400

        user = db["users"].find_one({"email": data["email"]})
        if not user:
            logger.warning(f"Login failed: Invalid email ({data.get('email')})")
            return {"error": "Invalid email or password"}, 401

        # Compare hashed password
        if not bcrypt.checkpw(
            data["password"].encode("utf-8"), user["password"].encode("utf-8")
        ):
            logger.warning(f"Login failed: Incorrect password for email ({data.get('email')})")
            return {"error": "Invalid email or password"}, 401

        access_token = create_access_token(identity=user["email"])
        refresh_token = create_refresh_token(identity=user["email"])
        logger.info(f"User logged in successfully: {user['email']}")
        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }, 200

class RefreshTokenResource(Resource):
    @jwt_required(refresh=True)
    async def post(self):
        current_user = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user)
        logger.info(f"Access token refreshed for user: {current_user}")
        return {"access_token": new_access_token}, 200

###############################################################################
# WISHLIST RESOURCE
###############################################################################
class ProtectedWishlist(Resource):
    @jwt_required()
    async def get(self):
        user_email = get_jwt_identity()
        try:
            wishlist = list(db["wishlist"].find(
                {
                    "userId": user_email, 
                    "imageUrl": {"$ne": None, "$regex": "^(http|https)://"},
                    "sourceLink": {"$ne": None, "$regex": "^(http|https)://"}
                }, 
                {"_id": 0, "userId": 0, "createdAt": 0, "updatedAt": 0}
            ))
            
            # Rename 'itemId' to 'id' for frontend consistency
            for item in wishlist:
                item['id'] = item.pop('itemId', None)
            
            logger.info(f"Fetched wishlist for user: {user_email}, count: {len(wishlist)}")
            return {"wishlist": wishlist, "count": len(wishlist)}, 200
        except Exception as e:
            logger.error(f"Error fetching wishlist for user {user_email}: {str(e)}")
            return {"error": "Failed to fetch wishlist"}, 500

    @jwt_required()
    async def post(self):
        user_email = get_jwt_identity()
        data = request.get_json()

        required_fields = ["itemId", "title", "price", "platform", "imageUrl", "sourceLink"]
        missing_fields = [field for field in required_fields if field not in data]
        if not data or missing_fields:
            error_message = f"Required fields: {', '.join(required_fields)}. Missing: {', '.join(missing_fields)}"
            logger.error(f"Error in POST /wishlist-protected: {error_message}")
            return {"error": error_message}, 400

        # Validate data types
        if not isinstance(data["price"], (int, float)):
            error_message = "Field 'price' must be a number"
            logger.error(f"Error in POST /wishlist-protected: {error_message}")
            return {"error": error_message}, 400

        if not isinstance(data["imageUrl"], str) or not data["imageUrl"].startswith(('http://', 'https://')):
            error_message = "Field 'imageUrl' must be a valid URL"
            logger.error(f"Error in POST /wishlist-protected: {error_message}")
            return {"error": error_message}, 400

        if not isinstance(data["sourceLink"], str) or not data["sourceLink"].startswith(('http://', 'https://')):
            error_message = "Field 'sourceLink' must be a valid URL"
            logger.error(f"Error in POST /wishlist-protected: {error_message}")
            return {"error": error_message}, 400

        data.update({
            "userId": user_email,
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat(),
        })

        existing_item = db["wishlist"].find_one({"userId": user_email, "itemId": data["itemId"]})
        if existing_item:
            error_message = "Item already exists in wishlist"
            logger.error(f"Error in POST /wishlist-protected: {error_message}")
            return {"error": error_message}, 400

        try:
            db["wishlist"].insert_one(data)
            logger.info(f"Wishlist item added for user {user_email}: {data}")
        except Exception as e:
            logger.error(f"Error adding item to wishlist for user {user_email}: {str(e)}")
            return {"error": "Failed to add item to wishlist"}, 500
        
        # Prepare response matching the frontend's Product interface
        response_item = {
            "id": data["itemId"],
            "title": data["title"],
            "price": data["price"],
            "currency": data.get("currency", "INR"),  # Include currency if available
            "platform": data["platform"],
            "imageUrl": data["imageUrl"],
            "sourceLink": data["sourceLink"],  # Ensure protocol
        }
        return {
            "message": "Item added to wishlist",
            "item": response_item,
        }, 201

    @jwt_required()
    async def delete(self):
        user_email = get_jwt_identity()
        item_id = request.args.get('itemId')
        if not item_id:
            logger.error("Error: Missing itemId in delete request")
            return {"error": "Missing itemId"}, 400
        try:
            result = db["wishlist"].delete_one({"userId": user_email, "itemId": item_id})
            if result.deleted_count == 0:
                logger.info(f"Item with itemId {item_id} already removed for user {user_email}")
                return {"message": "Item already removed from wishlist"}, 200
            logger.info(f"Wishlist item deleted for user {user_email}: {item_id}")
            return {"message": "Deleted successfully"}, 200
        except Exception as e:
            logger.error(f"Error deleting item from wishlist for user {user_email}: {str(e)}")
            return {"error": "Failed to delete item from wishlist"}, 500

###############################################################################
# IMAGE ANALYSIS RESOURCE
###############################################################################
class ImageAnalysis(Resource):
    @jwt_required()
    async def post(self):
        try:
            if "image" not in request.files:
                logger.error("No image file provided in the request")
                return {"error": "No image file provided"}, 400

            image = request.files["image"]
            if not image.filename or not image.filename.lower().endswith((".png", ".jpg", ".jpeg")):
                logger.error(f"Invalid file type: {image.filename}")
                return {"error": "Invalid file type"}, 400

            filename = secure_filename(image.filename)
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            image.save(file_path)
            logger.info(f"Image saved: {file_path}")

            try:
                # 1. Analyze with Vision
                analysis_result = analyze_image_with_vision(file_path)
                search_terms = analysis_result["search_terms"]
                product_info = analysis_result["product_info"]
                logger.info(f"[VISION] Detected search terms: {search_terms}")
                logger.info(f"[VISION] Product Info: {product_info}")

                all_results = []

                # 2. GOOGLE CUSTOM SEARCH
                try:
                    logger.info("[GCS] Fetching Google Custom Search results...")
                    search_queries = []
                    if search_terms:
                        # Prioritize broader terms over specific ones
                        for term in search_terms:
                            cleaned_term = clean_search_term(term)
                            if cleaned_term and cleaned_term not in search_queries:
                                search_queries.append(cleaned_term)
                    if product_info["category"]:
                        for category in product_info["category"]:
                            cleaned_category = clean_search_term(category)
                            if cleaned_category and cleaned_category not in search_queries:
                                search_queries.append(cleaned_category)

                    # Use only the first specific search term to ensure consistency
                    if search_queries:
                        primary_search_term = search_queries[0]
                        google_results = await fetch_google_custom_search(
                            primary_search_term, GCS_API_KEY, GCS_CX
                        )
                        if google_results:
                            logger.info(f"[GCS] Found {len(google_results)} results for '{primary_search_term}'.")
                            all_results.extend(google_results)
                except Exception as gcs_exc:
                    logger.error(f"[GCS] Google Custom Search error: {str(gcs_exc)}")

                # 3. EBAY
                try:
                    logger.info("[EBAY] Fetching eBay search results...")
                    ebay_scraper = EbaySearcher()
                    # Use the same primary search term for eBay
                    if search_terms:
                        ebay_search_term = search_terms[0]
                    elif product_info["category"]:
                        ebay_search_term = product_info["category"][0]
                    else:
                        ebay_search_term = "Shoe"  # Default term

                    # Clean the eBay search term similarly
                    ebay_search_term_cleaned = clean_search_term(ebay_search_term)
                    if not ebay_search_term_cleaned:
                        ebay_search_term_cleaned = "Shoe"  # Fallback

                    # Fetch user's country code and currency from geolocation data
                    # Since geolocation is being removed, set defaults or derive from other sources
                    # For example, default to 'IN' and 'INR'
                    user_country_code = 'IN'  # India
                    user_currency = 'INR'

                    ebay_results = await ebay_scraper.search_products(ebay_search_term_cleaned, user_country_code, user_currency, max_results=10)
                    logger.info(f"[EBAY] Found {len(ebay_results)} results for '{ebay_search_term_cleaned}'.")
                    all_results.extend(ebay_results)
                except Exception as ebay_exc:
                    logger.error(f"[EBAY] eBay Search error: {str(ebay_exc)}")

                # 4. Deduplicate
                seen = set()
                unique_results = []
                for item in all_results:
                    key = (
                        item.get("title","").lower(),
                        item.get("price", ""),
                        item.get("id",""),
                        item.get("platform",""),
                    )
                    if key not in seen:
                        seen.add(key)
                        unique_results.append(item)

                # 5. Score & sort
                scored_results = []
                for r in unique_results:
                    score = 0
                    title_lower = r["title"].lower() if "title" in r else ""
                    for st in search_terms:
                        if st.lower() in title_lower:
                            score += 5  # Increased weight for specific search terms
                    for c in product_info["category"]:
                        if c.lower() in title_lower:
                            score += 3  # Reduced weight for category terms
                    for a in product_info["attributes"]:
                        if a.lower() in title_lower:
                            score += 1  # Minimal weight for attributes
                    # If item has a 'condition' of "new" in it
                    if r.get("condition") and "new" in r["condition"].lower():
                        score += 0.5
                    r["relevance_score"] = score
                    scored_results.append(r)

                final_results = sorted(
                    scored_results, key=lambda x: x["relevance_score"], reverse=True
                )
                logger.info(f"[FINAL] Final unique results count: {len(final_results)}")

                # Optionally, include products with price=0.0 by not filtering them out
                # If you still want to filter out, uncomment the following lines
                # final_results = [
                #     product for product in final_results 
                #     if product.get('price', 0) > 0
                # ]

                # Further enhance product data
                for product in final_results:
                    # Ensure all required fields are present
                    product['id'] = product.get('id', '')  # Already set from backend
                    product['title'] = product.get('title', 'No Title')
                    product['price'] = product.get('price', 0)
                    product['platform'] = product.get('platform', 'Unknown')
                    product['imageUrl'] = product.get('imageUrl', '')
                    product['sourceLink'] = product.get('sourceLink', product.get('id', ''))  # Fallback to 'id' if 'sourceLink' not available

                # Log final results for debugging
                logger.debug(f"[FINAL] Final Results: {final_results}")

                return {
                    "message": "Image analyzed successfully",
                    "product_info": product_info,
                    "search_terms": search_terms,
                    "products": final_results[:20],
                    "results_count": len(final_results),
                }, 200

            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Image file removed: {file_path}")

        except Exception as e:
            logger.error(f"[Analysis Error] {str(e)}")
            return {"error": f"Analysis failed: {str(e)}"}, 500

###############################################################################
# WELCOME
###############################################################################
class Welcome(Resource):
    def get(self):
        return {"message": "Welcome to the Visual Search Engine API"}

###############################################################################
# REGISTER ROUTES
###############################################################################
api.add_resource(Register, "/register")
api.add_resource(Login, "/login")
api.add_resource(ProtectedWishlist, "/wishlist-protected")
api.add_resource(ImageAnalysis, "/analyze-image")
api.add_resource(Welcome, "/")
api.add_resource(RefreshTokenResource, "/refresh")  # Added Refresh Token Endpoint

###############################################################################
# MAIN
###############################################################################
if __name__ == "__main__":
    app.run(debug=True, port=5000)
