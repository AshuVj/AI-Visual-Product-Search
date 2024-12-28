// Mock wishlist data for development
let mockWishlist: string[] = [];

export const getWishlistItems = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockWishlist;
};

export const addWishlistItem = async (productId: string) => {
  if (!mockWishlist.includes(productId)) {
    mockWishlist.push(productId);
  }
  return mockWishlist;
};

export const removeWishlistItem = async (productId: string) => {
  mockWishlist = mockWishlist.filter(id => id !== productId);
  return mockWishlist;
};