﻿# AI-Visual-Product-Search

AI Visual Product Search is a React-based web application that allows users to upload an image or enter a text search query to find products online. The app features authentication, image analysis using AI, and a wishlist functionality where users can save their favorite products.

---

## **Features**

### 1. **Search for Products**
   - **Image-based Search:** Upload an image, and the application analyzes it to find similar products online.
   - **Text-based Search:** Enter a keyword or query to search for products.

### 2. **Wishlist Management**
   - Add or remove products from a personalized wishlist.
   - View and manage saved items.

### 3. **Authentication**
   - **Sign Up:** Create a new account.
   - **Log In:** Access the platform with secure authentication.
   - **Token-based Authorization:** Secure backend communication using JWT.

### 4. **Responsive Design**
   - Mobile-first design with TailwindCSS.
   - Fully responsive for various devices.

---

## **Technologies Used**

### **Frontend**
- **React:** Component-based UI for dynamic functionality.
- **React Router:** For routing and navigation.
- **Redux Toolkit:** For state management (auth, wishlist).
- **TailwindCSS:** For responsive and modern styling.
- **Axios:** For API requests.
- **React Toastify:** For notifications.

### **Backend**
- **Flask:** Handles authentication, image analysis, and product fetching.
- **Google Vision API:** For analyzing uploaded images.
- **eBay & Google Custom Search API:** For fetching product data.

### **Database**
- **MongoDB:** Stores user data, wishlist items, and authentication tokens.

---

## **Setup Instructions**

### Prerequisites
Ensure you have the following installed on your system:
- Node.js (>= 14.x)
- npm or Yarn
- Python (>= 3.8)
- MongoDB (running locally or via a cloud service)

---

### **Frontend Setup**

1. Clone the repository:
   ```bash
   git clone https://github.com/AshuVj/AI-Visual-Product-Search.git
   cd visual-search-wishlist
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   VITE_API_URL=http://127.0.0.1:5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application at [http://localhost:5173](http://localhost:5173).

---

### **Backend Setup**

1. Navigate to the backend directory (if separate).

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables in a `.env` file:
   ```
   MONGO_URI=<your_mongodb_connection_string>
   JWT_SECRET_KEY=<your_jwt_secret_key>
   BING_SUBSCRIPTION_KEY=<your_bing_subscription_key>
   GCS_API_KEY=<your_google_custom_search_api_key>
   GCS_CX=<your_google_custom_search_engine_id>
   ```

4. Start the backend server:
   ```bash
   python app.py
   ```

5. The backend will run on [http://127.0.0.1:5000](http://127.0.0.1:5000).

---

## **Project Structure**

### **Frontend**
```
src/
├── components/     # Reusable React components
├── context/        # Context for shared state (e.g., Search)
├── hooks/          # Custom React hooks
├── pages/          # Pages for routing (e.g., Landing, Upload)
├── store/          # Redux slices for state management
├── styles/         # Global styles and TailwindCSS setup
├── utils/          # Utility functions and API handlers
└── App.tsx         # Main application component
```

### **Backend**
```
/
├── app.py          # Main Flask application
├── scrapers/       # Scrapers for eBay, Google Search, etc.
├── utils/          # Helper functions for backend operations
└── models/         # Database models
```

---

## **How It Works**

1. **User Uploads an Image:**
   - The image is sent to the backend, where it is analyzed using Google Vision API.
   - Keywords are extracted and used to fetch relevant products from Google Custom Search and eBay APIs.

2. **Product Results:**
   - Results are displayed on the frontend with product titles, prices, images, and source links.

3. **Wishlist Management:**
   - Users can save favorite products to their wishlist, stored securely in MongoDB.

4. **Authentication:**
   - Users must log in or sign up to access core functionalities.
   - JWT is used to secure API requests.

---

## **Screenshots**

1. **Landing Page:**
   - A visually appealing gradient background with a "Start Searching" button.

2. **Upload Page:**
   - Dropzone for image uploads.
   - Results displayed in a responsive grid.

3. **Wishlist Page:**
   - Displays saved items with options to remove them.

---

## **Known Issues**

- Some product results may have missing prices or inaccurate links.
- Image analysis depends on the quality and relevance of uploaded images.

---

## **Future Improvements**

- Implement user-defined filtering (price range, product category).
- Integrate more APIs for product data (e.g., Amazon).
- Enhance the image analysis model for better product matching.
- Add multi-language support for a global audience.

---

## **License**

This project is licensed under the MIT License.

---

## **Contributing**

Feel free to submit issues or pull requests for improvements or bug fixes. Ensure your code follows the existing project structure and coding guidelines.

---

## **Contact**

For any inquiries or suggestions, please contact:
- **Name:** [Ashutosh Vijay]
- **Email:** [ashutoshvijay2003@gmail.com]
- **GitHub:** [https://github.com/AshuVj](https://github.com/AshuVj)
```