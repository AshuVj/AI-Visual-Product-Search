# scrapers.py

import os
import re
import logging
from typing import List, Dict
from ebaysdk.finding import Connection as Finding
from ebaysdk.exception import ConnectionError

logger = logging.getLogger(__name__)

def clean_price(price_str):
    cleaned_price = re.sub(r'[^\d.]', '', price_str)
    try:
        return float(cleaned_price)
    except ValueError:
        return 0.0

class EbaySearcher:
    def __init__(self):
        self.app_id = os.getenv('EBAY_APPID')
        self.devid = os.getenv('EBAY_DEVID')
        self.certid = os.getenv('EBAY_CERTID')
        if not all([self.app_id, self.devid, self.certid]):
            logger.error("eBay API credentials are not fully set in environment variables.")
            raise ValueError("eBay API credentials are required.")
        self.api = Finding(appid=self.app_id, devid=self.devid, certid=self.certid, config_file=None)

    async def search_products(self, search_term: str, country_code: str, currency: str, max_results: int = 10) -> List[Dict]:
        try:
            response = self.api.execute('findItemsAdvanced', {
                'keywords': search_term,
                'paginationInput': {
                    'entriesPerPage': max_results,
                    'pageNumber': 1
                },
                'outputSelector': ['SellerInfo', 'PictureURLSuperSize'],
                'itemFilter': [
                    {
                        'name': 'LocatedIn',
                        'value': country_code
                    }
                ]
            })
            items = response.dict().get('searchResult', {}).get('item', [])
            products = []
            for item in items:
                title = item.get('title', '')
                image_url = item.get('galleryURL', '')
                source_link = item.get('viewItemURL', '')
                price = float(item.get('sellingStatus', {}).get('currentPrice', {}).get('value', 0))
                currency_id = item.get('sellingStatus', {}).get('currentPrice', {}).get('currencyId', 'USD')

                # Validate URLs
                if not image_url.startswith(('http://', 'https://')):
                    logger.warning(f"Invalid imageUrl for eBay item: '{title}'. Skipping.")
                    continue
                if not source_link.startswith(('http://', 'https://')):
                    logger.warning(f"Invalid sourceLink for eBay item: '{title}'. Skipping.")
                    continue

                # Assign a unique ID by prefixing with 'ebay_'
                item_id = item.get('itemId', '')
                unique_id = f"ebay_{item_id}"
                converted_price = price  # Assuming no conversion needed; handled in frontend if necessary

                products.append({
                    'id': unique_id,
                    'title': title,
                    'price': converted_price,
                    'currency': currency_id,  # Dynamically set based on API response
                    'platform': 'eBay',
                    'imageUrl': image_url,
                    'sourceLink': source_link,
                })

                # Debug log for each product
                logger.debug(f"[eBay] Item ID: {item_id}, Title: {title}, Price: {price} {currency_id}")

            logger.debug(f"[eBay] Parsed Products: {products}")
            return products
        except ConnectionError as e:
            logger.error(f"[eBay] ConnectionError: {e}")
            return []
        except Exception as e:
            logger.error(f"[eBay] Unexpected error: {e}")
            return []
