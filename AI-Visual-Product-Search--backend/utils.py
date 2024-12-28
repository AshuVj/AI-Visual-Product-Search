# utils.py

import re
import os
import aiohttp
import logging

def clean_search_term(term):
    """
    Clean the term by removing punctuation, limiting to first 2 words,
    and skipping generic words like 'object', 'item', etc.
    """
    # Define some generic words to drop
    generic_terms = {'object', 'product', 'item', 'thing'}

    # Remove non-alphanumeric except space
    term = re.sub(r'[^\w\s]', '', term.lower())

    # Split into words
    words = term.split()

    # Remove generic words
    words = [w for w in words if w not in generic_terms]

    # Keep only first 2 words and ensure they are specific
    cleaned = " ".join(words[:2]) if words else ""
    
    # Additional check to remove overly generic terms
    if cleaned in {'shoe', 'sneaker', 'trainer', 'phone'}:
        return ""
    
    return cleaned

def extract_brand_model(vision_labels, web_entities):
    """
    Extract brand and model information from Vision API results.
    Example use if you want to identify brand in the future.
    """
    common_brands = ['nike', 'adidas', 'puma', 'reebok', 'samsung', 'apple', 'sony']
    
    # Look for brand names in both labels and web entities
    brands = []
    for term in vision_labels + web_entities:
        term_lower = term.lower()
        if any(brand in term_lower for brand in common_brands):
            brands.append(term)
    
    return brands[0] if brands else None

def clean_price(price_str):
    """Clean price strings to remove currency symbols and convert to standard format."""
    cleaned_price = re.sub(r'[^\d.]', '', price_str)
    try:
        return float(cleaned_price)
    except ValueError:
        return 0.0

logger = logging.getLogger(__name__)

async def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    """
    Converts amount from one currency to another using ExchangeRate-API.
    """
    try:
        api_key = os.getenv('EXCHANGERATE_API_KEY')
        if not api_key:
            logger.error("Exchange Rate API key is not set.")
            return amount  # Return the original amount if API key is missing

        endpoint = f"https://v6.exchangerate-api.com/v6/{api_key}/pair/{from_currency}/{to_currency}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('result') == 'success':
                        conversion_rate = data.get('conversion_rate', 1)
                        converted_amount = round(amount * conversion_rate, 2)
                        logger.debug(f"Converted {amount} {from_currency} to {converted_amount} {to_currency}")
                        return converted_amount
                    else:
                        logger.error(f"Currency conversion failed: {data.get('error-type')}")
                        return amount
                else:
                    logger.error(f"Currency conversion API returned status {response.status}")
                    return amount
    except Exception as ex:
        logger.error(f"Error in convert_currency: {str(ex)}")
        return amount
