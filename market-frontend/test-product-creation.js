// Test script to debug product creation issue
const API_BASE_URL = 'http://localhost:8000/api';

// You need to get a valid token first by logging in
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE'; // Replace with actual token

async function testProductCreation() {
  try {
    // First, let's get categories to see what category_id we should use
    console.log('🔍 Fetching categories...');
    const categoriesResponse = await fetch(`${API_BASE_URL}/products/categories`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (!categoriesResponse.ok) {
      console.error('❌ Failed to fetch categories:', categoriesResponse.status, categoriesResponse.statusText);
      const errorText = await categoriesResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const categories = await categoriesResponse.json();
    console.log('✅ Categories fetched:', categories);
    
    if (categories.length === 0) {
      console.log('⚠️ No categories found. Creating default categories...');
      
      // Initialize default categories
      const initResponse = await fetch(`${API_BASE_URL}/products/categories/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });
      
      if (!initResponse.ok) {
        console.error('❌ Failed to initialize categories:', initResponse.status, initResponse.statusText);
        const errorText = await initResponse.text();
        console.error('Error details:', errorText);
        return;
      }
      
      const initResult = await initResponse.json();
      console.log('✅ Default categories initialized:', initResult);
      
      // Fetch categories again
      const categoriesResponse2 = await fetch(`${API_BASE_URL}/products/categories`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });
      
      if (categoriesResponse2.ok) {
        const categories2 = await categoriesResponse2.json();
        console.log('✅ Categories after initialization:', categories2);
        categories.push(...categories2);
      }
    }
    
    if (categories.length === 0) {
      console.error('❌ Still no categories available');
      return;
    }
    
    // Now try to create a product
    const testProduct = {
      name: 'Test Product',
      price: 10.99,
      quantity: 100,
      category_id: categories[0]._id || categories[0].id, // Use the first category
      description: 'Test product for debugging',
      discount: 0
    };
    
    console.log('🔍 Creating test product with data:', testProduct);
    
    const productResponse = await fetch(`${API_BASE_URL}/products/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(testProduct)
    });
    
    if (!productResponse.ok) {
      console.error('❌ Failed to create product:', productResponse.status, productResponse.statusText);
      const errorText = await productResponse.text();
      console.error('Error details:', errorText);
      
      // Try to parse as JSON for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Error JSON:', errorJson);
      } catch (e) {
        console.error('Error is not JSON:', errorText);
      }
      return;
    }
    
    const newProduct = await productResponse.json();
    console.log('✅ Product created successfully:', newProduct);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Instructions for use
console.log('📋 Instructions:');
console.log('1. First, you need to get an admin token by logging in');
console.log('2. Replace ADMIN_TOKEN with your actual token');
console.log('3. Run this script to test product creation');
console.log('4. Check the console for detailed results');

// Run the test if token is provided
if (ADMIN_TOKEN !== 'YOUR_ADMIN_TOKEN_HERE') {
  testProductCreation();
} else {
  console.log('⚠️ Please set ADMIN_TOKEN before running the test');
}
