# utils.py

import re
import logging

def clean_search_term(term: str) -> str:
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

def extract_brand_model(vision_labels: list, web_entities: list) -> str:
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

def clean_price(price_str: str) -> float:
    """Clean price strings to remove currency symbols and convert to standard format."""
    cleaned_price = re.sub(r'[^\d.]', '', price_str)
    try:
        return float(cleaned_price)
    except ValueError:
        return 0.0

logger = logging.getLogger(__name__)
