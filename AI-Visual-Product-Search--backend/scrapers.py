import os
import re
import yaml
import logging
import aiohttp
from typing import List, Dict
from ebaysdk.finding import Connection as Finding
from ebaysdk.exception import ConnectionError
from utils import convert_currency  # Ensure this exists
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

def clean_price(price_str):
    """Clean price strings to remove currency symbols and convert to standard format."""
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
            logger.error("Ebay API credentials are not fully set in environment variables.")
            raise ValueError("Ebay API credentials are required.")
        self.api = Finding(appid=self.app_id, devid=self.devid, certid=self.certid, config_file=None)

    async def search_products(self, search_term: str, country_code: str, currency: str, max_results: int = 10) -> List[Dict]:
        """
        Searches eBay for products based on the search term and seller location.
        Converts prices to the desired currency.
        """
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
                price = float(item.get('sellingStatus', {}).get('currentPrice', {}).get('__value__', 0))
                seller_info = item.get('sellerInfo', {})
                seller_location = seller_info.get('sellerUserLocation', {}).get('location', '')

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

                # Convert price to desired currency if needed
                if currency != 'USD':  # Assuming eBay returns prices in USD
                    converted_price = await convert_currency(price, 'USD', currency)
                    product_currency = currency
                else:
                    converted_price = price
                    product_currency = 'USD'

                logger.debug(f"[eBay] Product: {title}, Price: {converted_price} {product_currency}")

                products.append({
                    'id': unique_id,
                    'title': title,
                    'price': converted_price,
                    'currency': product_currency,
                    'platform': 'eBay',
                    'imageUrl': image_url,
                    'sourceLink': source_link,
                })
            logger.debug(f"[eBay] Parsed Products: {products}")
            return products
        except ConnectionError as e:
            logger.error(f"[eBay] ConnectionError: {e}")
            return []
        except Exception as e:
            logger.error(f"[eBay] Unexpected error: {e}")
            return []

# --------------------------------------
# Flipkart scraper
# --------------------------------------

# def scrape_flipkart(search_term, max_retries=3):
#     base_url = "https://www.flipkart.com/search"
#     headers = {
#         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
#             (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
#     }
#     results = []
#     for attempt in range(max_retries):
#         try:
#             params = {
#                 "q": search_term,
#                 "otracker": "search",
#                 "marketplace": "FLIPKART"
#             }
#             print(f"[Flipkart] Attempt {attempt+1} - Searching: {search_term}")
#             response = requests.get(base_url, params=params, headers=headers, timeout=15)
#             print(f"[Flipkart] Response Code: {response.status_code}")
#             response.raise_for_status()
#             soup = BeautifulSoup(response.content, 'html.parser')

#             # Product containers
#             containers = (
#                 soup.select("div._1AtVbE div._13oc-S")
#                 or soup.select("div._4ddWXP")
#                 or soup.select("div._2kHMtA")
#             )
#             print(f"[Flipkart] Found {len(containers)} containers")

#             for container in containers[:10]:
#                 try:
#                     title_elem = (
#                         container.select_one("div._4rR01T") or
#                         container.select_one("a.s1Q9rs") or
#                         container.select_one("div._3wU53n")
#                     )
#                     price_elem = container.select_one("div._30jeq3")
#                     link_elem = (
#                         container.select_one("a._1fQZEK") or
#                         container.select_one("a.s1Q9rs")
#                     )
#                     image_elem = container.select_one("img._396cs4")

#                     if title_elem and price_elem and link_elem:
#                         results.append({
#                             "title": title_elem.text.strip(),
#                             "price": clean_price(price_elem.text),
#                             "link": urljoin("https://www.flipkart.com", link_elem['href']),
#                             "image_url": image_elem['src'] if image_elem else None,
#                             "source": "Flipkart"
#                         })
#                 except:
#                     continue

#             if results:
#                 break
#         except Exception as e:
#             print(f"[Flipkart] Attempt {attempt+1} - Error: {str(e)}")
#             if attempt < max_retries - 1:
#                 time.sleep(random.uniform(1, 3))

#     return results

# --------------------------------------
# Myntra scraper
# --------------------------------------


# def scrape_myntra(search_term, max_retries=3):
#     """Improved Myntra scraper using web scraping."""
#     base_url = "https://www.myntra.com"
#     search_url = f"{base_url}/{quote(search_term)}"

#     headers = {
#         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
#         "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
#         "Accept-Language": "en-US,en;q=0.5",
#         "Accept-Encoding": "gzip, deflate, br",
#         "Connection": "keep-alive",
#         "Upgrade-Insecure-Requests": "1",
#         "TE": "Trailers"
#     }

#     results = []
#     for attempt in range(max_retries):
#         try:
#             print(f"[Myntra] Attempt {attempt+1}: Fetching URL -> {search_url}")
#             response = requests.get(search_url, headers=headers, timeout=10)
#             print(f"[Myntra] Response Code: {response.status_code}")

#             response.raise_for_status()
#             soup = BeautifulSoup(response.content, 'html.parser')

#             # Find product listings
#             products = soup.find_all('li', class_='product-base')
#             print(f"[Myntra] Found {len(products)} products in HTML")

#             for product in products[:10]:
#                 try:
#                     anchor = product.find('a', class_='product-link')
#                     if not anchor:
#                         continue

#                     link = base_url + anchor['href']

#                     # Extract product details
#                     brand = product.find('h3', class_='product-brand')
#                     name = product.find('h4', class_='product-product')
#                     price = product.find('span', class_='product-discountedPrice')

#                     if not (brand and price):
#                         continue

#                     image = product.find('img')

#                     result = {
#                         "title": f"{brand.text} {name.text if name else ''}".strip(),
#                         "price": clean_price(price.text),
#                         "link": link,
#                         "image_url": image['src'] if image else None,
#                         "source": "Myntra"
#                     }
#                     results.append(result)
#                 except Exception as e:
#                     print(f"[Myntra] Error processing product: {str(e)}")
#                     continue

#             if results:
#                 print(f"[Myntra] Returning {len(results)} results.")
#                 break

#         except Exception as e:
#             print(f"[Myntra] Scraping attempt {attempt+1} failed: {str(e)}")
#             if attempt < max_retries - 1:
#                 time.sleep(random.uniform(1, 3))

#     return results


# --------------------------------------
# Amazon scraper
# --------------------------------------


# def scrape_amazon(search_term, max_retries=3):
#     """Amazon scraper with debug logs."""
#     base_url = "https://www.amazon.in/s"
#     headers = {
#         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
#         "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
#         "Accept-Language": "en-US,en;q=0.5"
#     }

#     results = []
#     for attempt in range(max_retries):
#         try:
#             params = {
#                 "k": search_term,
#                 "ref": "nb_sb_noss_2"
#             }
#             print(f"[Amazon] Attempt {attempt+1}: Searching for '{search_term}'")
#             response = requests.get(base_url, params=params, headers=headers, timeout=15)
#             print(f"[Amazon] Response Code: {response.status_code}")

#             response.raise_for_status()
#             soup = BeautifulSoup(response.content, 'html.parser')

#             products = soup.select('div.s-result-item[data-component-type="s-search-result"]')
#             print(f"[Amazon] Found {len(products)} products in HTML")

#             for product in products[:10]:
#                 try:
#                     title_elem = product.select_one('span.a-text-normal')
#                     price_elem = product.select_one('span.a-price-whole')
#                     link_elem = product.select_one('a.a-link-normal')
#                     image_elem = product.select_one('img.s-image')

#                     if title_elem and price_elem and link_elem:
#                         result = {
#                             "title": title_elem.text.strip(),
#                             "price": clean_price(price_elem.text),
#                             "link": urljoin("https://www.amazon.in", link_elem['href']),
#                             "image_url": image_elem['src'] if image_elem else None,
#                             "source": "Amazon"
#                         }
#                         results.append(result)

#                 except Exception as e:
#                     print(f"[Amazon] Error processing product: {str(e)}")
#                     continue

#             if results:
#                 print(f"[Amazon] Returning {len(results)} results.")
#                 break

#         except Exception as e:
#             print(f"[Amazon] Attempt {attempt+1} failed: {str(e)}")
#             if attempt < max_retries - 1:
#                 time.sleep(random.uniform(1, 3))

#     return results
