import React, { useState, useEffect } from 'react';
import { Search, Utensils, X, ChefHat, Globe, Play, RefreshCw, Heart, Bookmark, ShoppingCart, Share2, Check, Trash2, Sparkles } from 'lucide-react';

const API_URL = 'https://www.themealdb.com/api/json/v1/1';

export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [error, setError] = useState('');
  
  // App Navigation State
  const [currentView, setCurrentView] = useState('home'); // 'home', 'favorites', 'shopping'
  const [activeCategory, setActiveCategory] = useState('Random');
  
  // Local Storage States
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('recipeFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [shoppingList, setShoppingList] = useState(() => {
    const saved = localStorage.getItem('recipeShoppingList');
    return saved ? JSON.parse(saved) : [];
  });

  // Custom Toast Notification
  const [toast, setToast] = useState(null);

  // Sync with Local Storage
  useEffect(() => {
    localStorage.setItem('recipeFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('recipeShoppingList', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    fetchRandomMeals();
    fetchCategories();
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories.php`);
      const data = await response.json();
      setCategories(data.categories);
    } catch (err) {
      console.error("Failed to fetch categories");
    }
  };

  const fetchRandomMeals = async () => {
    setLoading(true);
    setError('');
    setCurrentView('home');
    setActiveCategory('Random');
    setSearchQuery('');
    try {
      const promises = Array.from({ length: 8 }).map(() =>
        fetch(`${API_URL}/random.php`).then(res => res.json())
      );
      const results = await Promise.all(promises);
      const meals = results.map(data => data.meals[0]);
      setRecipes(meals);
    } catch (err) {
      setError('Failed to fetch recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchByCategory = async (categoryName) => {
    setLoading(true);
    setError('');
    setCurrentView('home');
    setActiveCategory(categoryName);
    setSearchQuery('');
    try {
      const response = await fetch(`${API_URL}/filter.php?c=${categoryName}`);
      const data = await response.json();
      setRecipes(data.meals || []);
    } catch (err) {
      setError(`Failed to load ${categoryName} recipes.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setCurrentView('home');
    setActiveCategory('Search');
    try {
      const response = await fetch(`${API_URL}/search.php?s=${searchQuery}`);
      const data = await response.json();
      
      if (data.meals) {
        setRecipes(data.meals);
      } else {
        setRecipes([]);
        setError(`No recipes found for "${searchQuery}"`);
      }
    } catch (err) {
      setError('Failed to search recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeClick = async (recipe) => {
    if (!recipe.strInstructions) {
      try {
        const response = await fetch(`${API_URL}/lookup.php?i=${recipe.idMeal}`);
        const data = await response.json();
        setSelectedRecipe(data.meals[0]);
      } catch (err) {
        showToast("Failed to load recipe details.");
      }
    } else {
      setSelectedRecipe(recipe);
    }
  };

  const toggleFavorite = (e, recipe) => {
    e.stopPropagation();
    if (!recipe.strInstructions) {
      fetch(`${API_URL}/lookup.php?i=${recipe.idMeal}`)
        .then(res => res.json())
        .then(data => updateFavoritesList(data.meals[0]));
    } else {
      updateFavoritesList(recipe);
    }
  };

  const updateFavoritesList = (fullRecipe) => {
    setFavorites(prev => {
      const isFavorited = prev.some(fav => fav.idMeal === fullRecipe.idMeal);
      if (isFavorited) {
        showToast("Removed from favorites");
        return prev.filter(fav => fav.idMeal !== fullRecipe.idMeal);
      } else {
        showToast("Added to favorites ❤️");
        return [...prev, fullRecipe];
      }
    });
  };

  const isFavorite = (idMeal) => favorites.some(fav => fav.idMeal === idMeal);

  // --- New Feature Functions ---

  const handleShare = () => {
    if (!selectedRecipe) return;
    const shareText = `Check out this recipe for ${selectedRecipe.strMeal}!\nWatch tutorial here: ${selectedRecipe.strYoutube || 'No video available'}`;
    
    const textArea = document.createElement("textarea");
    textArea.value = shareText;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("Link copied to clipboard! 🔗");
    } catch (err) {
      showToast("Failed to copy link.");
    }
    document.body.removeChild(textArea);
  };

  const addToShoppingList = () => {
    if (!selectedRecipe) return;
    const ingredients = getIngredients(selectedRecipe);
    
    const newItems = ingredients.map(ing => ({
      id: Date.now() + Math.random(),
      name: `${ing.measure} ${ing.name}`.trim(),
      checked: false,
      recipeName: selectedRecipe.strMeal
    }));
    
    setShoppingList(prev => [...prev, ...newItems]);
    showToast(`Added ${ingredients.length} items to shopping list 🛒`);
  };

  const toggleShoppingItem = (id) => {
    setShoppingList(prev => 
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const removeShoppingItem = (id) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const clearShoppingList = () => {
    setShoppingList([]);
    showToast("Shopping list cleared.");
  };

  const getIngredients = (meal) => {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== '') {
        ingredients.push({ name: ingredient, measure: measure ? measure.trim() : '' });
      }
    }
    return ingredients;
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans text-gray-800 flex flex-col relative selection:bg-orange-200 selection:text-orange-900">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-2 font-medium border border-gray-700">
          {toast}
        </div>
      )}

      {/* Header & Navigation */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-20 border-b border-orange-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-5 mb-5">
            
            {/* Logo */}
            <div 
              className="flex items-center gap-2 text-2xl font-black cursor-pointer group"
              onClick={fetchRandomMeals}
            >
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-xl text-white shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/40 group-hover:-rotate-6 transition-all duration-300">
                <ChefHat size={26} strokeWidth={2.5} />
              </div>
              <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent tracking-tight">
                CulinaryCanvas
              </span>
            </div>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full md:w-2/5 relative group">
              <input
                type="text"
                placeholder="Search for a recipe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-full border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all shadow-inner group-hover:border-orange-300"
              />
              <Search className="absolute left-4 top-3 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
            </form>

            {/* Main Navigation Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={() => { setCurrentView('favorites'); setSearchQuery(''); setActiveCategory('Favorites'); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all duration-300 ${currentView === 'favorites' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 -translate-y-0.5' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100'}`}
              >
                <Heart size={18} className={currentView === 'favorites' ? "fill-white" : ""} />
                <span className="hidden sm:inline">Saved</span>
                {favorites.length > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${currentView === 'favorites' ? 'bg-white/20 text-white' : 'bg-orange-200/50 text-orange-700'}`}>
                    {favorites.length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => { setCurrentView('shopping'); setSearchQuery(''); setActiveCategory('Shopping'); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all duration-300 ${currentView === 'shopping' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 -translate-y-0.5' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'}`}
              >
                <ShoppingCart size={18} />
                <span className="hidden sm:inline">List</span>
                {shoppingList.filter(i => !i.checked).length > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${currentView === 'shopping' ? 'bg-white/20 text-white' : 'bg-emerald-200/50 text-emerald-700'}`}>
                    {shoppingList.filter(i => !i.checked).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Categories Bar */}
          {currentView === 'home' && (
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 pt-1 mask-linear-fade">
              <button
                onClick={fetchRandomMeals}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeCategory === 'Random' ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'}`}
              >
                <Sparkles size={14} className="inline mr-1.5 -mt-0.5" /> Surprise Me
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1 my-auto shrink-0"></div>
              {categories.map(cat => (
                <button
                  key={cat.idCategory}
                  onClick={() => fetchByCategory(cat.strCategory)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeCategory === cat.strCategory ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 hover:border-orange-200'}`}
                >
                  {cat.strCategory}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        
        {/* Dynamic Page Header (Hero Style) */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
            {currentView === 'favorites' ? 'Your Personal Cookbook' : 
             currentView === 'shopping' ? 'Grocery List' :
             searchQuery ? `Searching for "${searchQuery}"` : 
             activeCategory !== 'Random' ? `${activeCategory} Classics` : 
             'What are you craving today?'}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            {currentView === 'favorites' ? 'All the recipes you\'ve saved for a rainy day.' : 
             currentView === 'shopping' ? 'Check off items as you shop, or clear the list for your next culinary adventure.' :
             searchQuery ? `We found these delicious results for your search.` : 
             'Explore mouth-watering recipes from around the globe, handpicked just for you.'}
          </p>
        </div>

        {error && (
          <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-orange-100">
            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="h-10 w-10 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h3>
            <p className="text-gray-500">{error}</p>
          </div>
        )}

        {/* --- VIEW: SHOPPING LIST --- */}
        {currentView === 'shopping' && (
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden max-w-3xl mx-auto">
            {shoppingList.length === 0 ? (
              <div className="text-center py-24 px-6">
                <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="h-12 w-12 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Your cart is empty</h2>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">Found a recipe you love? Open it and click "Add to List" to automatically generate your shopping list!</p>
                <button 
                  onClick={fetchRandomMeals}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-full hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-semibold"
                >
                  Find a Recipe
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-emerald-50/50 p-6 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-gray-800">Ingredients</span>
                    <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mt-1">
                      {shoppingList.filter(i => i.checked).length} of {shoppingList.length} obtained
                    </span>
                  </div>
                  <button 
                    onClick={clearShoppingList}
                    className="text-sm text-red-500 hover:text-red-700 font-bold flex items-center gap-2 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-all"
                  >
                    <Trash2 size={16} /> Clear All
                  </button>
                </div>
                <ul className="divide-y divide-gray-100">
                  {shoppingList.map((item) => (
                    <li key={item.id} className={`p-5 flex items-center justify-between transition-colors hover:bg-gray-50 group ${item.checked ? 'bg-gray-50/80' : ''}`}>
                      <div className="flex items-center gap-5 flex-grow cursor-pointer" onClick={() => toggleShoppingItem(item.id)}>
                        <div 
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/40' : 'border-gray-300 group-hover:border-emerald-400'}`}
                        >
                          {item.checked && <Check size={16} className="text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-lg font-semibold transition-all ${item.checked ? 'text-gray-400 line-through decoration-2' : 'text-gray-800'}`}>
                            {item.name}
                          </span>
                          <span className="text-sm text-gray-400 font-medium mt-0.5 flex items-center gap-1.5">
                            <Utensils size={12} /> {item.recipeName}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeShoppingItem(item.id)}
                        className="text-gray-300 hover:text-red-500 p-2.5 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove item"
                      >
                        <X size={20} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW: FAVORITES (Empty State) --- */}
        {currentView === 'favorites' && favorites.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-dashed border-gray-300 max-w-3xl mx-auto">
            <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-12 w-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">No saved recipes yet</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Click the heart icon on any recipe to build your personal collection of favorites!</p>
            <button 
              onClick={fetchRandomMeals}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-3 rounded-full hover:shadow-lg hover:shadow-orange-500/30 transition-all font-semibold"
            >
              Start Exploring
            </button>
          </div>
        )}

        {/* --- VIEW: RECIPE GRID (Home / Favorites) --- */}
        {currentView !== 'shopping' && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-32 w-full">
              <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                {/* Outer spinning dashed ring */}
                <div className="absolute inset-0 border-4 border-dashed border-orange-300 rounded-full animate-[spin_6s_linear_infinite]"></div>
                {/* Inner fast spinning solid ring */}
                <div className="absolute inset-2 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                {/* Center icon that pulses */}
                <div className="absolute inset-5 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full shadow-inner flex items-center justify-center animate-pulse">
                  <Utensils className="text-orange-600" size={32} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-800 tracking-tight bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                Whipping up recipes...
              </h3>
              <div className="flex items-center gap-1.5 mt-4">
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {(currentView === 'favorites' ? favorites : recipes).map((recipe) => (
                <div 
                  key={recipe.idMeal} 
                  onClick={() => handleRecipeClick(recipe)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-900/5 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer group flex flex-col relative border border-gray-100/50"
                >
                  <div className="relative h-56 overflow-hidden bg-gray-100">
                    {/* Image */}
                    <img 
                      src={recipe.strMealThumb} 
                      alt={recipe.strMeal} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-0 relative"
                      loading="lazy"
                    />
                    
                    {/* Top and Bottom Gradient Overlays for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/10 z-10 opacity-70 group-hover:opacity-40 transition-opacity duration-300"></div>
                    
                    {/* Category/Area Badge */}
                    {(recipe.strArea || recipe.strCategory) && (
                      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-gray-800 shadow-lg flex items-center gap-1.5 z-20">
                        {recipe.strArea && <Globe size={13} className="text-orange-500" />}
                        {recipe.strArea || recipe.strCategory}
                      </div>
                    )}

                    {/* Favorite Button */}
                    <button 
                      onClick={(e) => toggleFavorite(e, recipe)}
                      className="absolute top-4 right-4 p-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-lg hover:scale-110 transition-transform z-20"
                    >
                      <Heart 
                        size={18} 
                        className={isFavorite(recipe.idMeal) ? "fill-red-500 text-red-500" : "text-gray-400"} 
                      />
                    </button>
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <h3 className="font-extrabold text-xl text-gray-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                      {recipe.strMeal}
                    </h3>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-orange-500 bg-orange-50 px-2.5 py-1 rounded-md">
                        {recipe.strCategory}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <span className="font-semibold text-gray-500">Godana Emiru</span>
            <span className="text-sm">© {new Date().getFullYear()}</span>
          </div>
          <p className="text-sm text-gray-400">
            Powered by TheMealDB API
          </p>
        </div>
      </footer>

      {/* --- RECIPE DETAIL MODAL --- */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRecipe(null)}
          ></div>
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Image Header */}
            <div className="relative h-72 sm:h-80 shrink-0">
              <img 
                src={selectedRecipe.strMealThumb} 
                alt={selectedRecipe.strMeal} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10"></div>
              
              {/* Top Action Buttons */}
              <div className="absolute top-5 right-5 flex gap-3">
                <button 
                  onClick={handleShare}
                  title="Copy Link"
                  className="bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition-all hover:scale-105"
                >
                  <Share2 size={20} />
                </button>
                <button 
                  onClick={(e) => toggleFavorite(e, selectedRecipe)}
                  title="Save Recipe"
                  className="bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition-all hover:scale-105"
                >
                  <Heart size={20} className={isFavorite(selectedRecipe.idMeal) ? "fill-red-500 text-red-500" : ""} />
                </button>
                <button 
                  onClick={() => setSelectedRecipe(null)}
                  title="Close"
                  className="bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-md transition-all hover:scale-105 ml-2"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Title & Badges */}
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex flex-wrap gap-2.5 mb-4">
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                    {selectedRecipe.strCategory}
                  </span>
                  <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg border border-white/20">
                    <Globe size={14} /> {selectedRecipe.strArea}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight drop-shadow-lg tracking-tight">
                  {selectedRecipe.strMeal}
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-8 sm:p-10 flex-grow bg-[#faf8f5]">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                
                {/* Ingredients Sidebar (Left) */}
                <div className="md:col-span-4">
                  <div className="sticky top-0">
                    <h3 className="text-2xl font-black text-gray-900 mb-5 flex items-center gap-2">
                      <Utensils className="text-orange-500" size={24} />
                      Ingredients
                    </h3>

                    <button 
                      onClick={addToShoppingList}
                      className="w-full mb-6 bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <ShoppingCart size={18} />
                      Add all to List
                    </button>

                    <ul className="space-y-3">
                      {getIngredients(selectedRecipe).map((ing, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
                          <span className="font-semibold text-gray-800">{ing.name}</span>
                          <span className="text-sm font-bold text-orange-500 text-right shrink-0 ml-3 bg-orange-50 px-2 py-1 rounded-md">{ing.measure}</span>
                        </li>
                      ))}
                    </ul>

                    {selectedRecipe.strTags && (
                      <div className="mt-10">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedRecipe.strTags.split(',').map((tag, idx) => (
                            <span key={idx} className="bg-gray-200/50 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions Main Column (Right) */}
                <div className="md:col-span-8">
                  <h3 className="text-2xl font-black text-gray-900 mb-5 flex items-center gap-2">
                    <ChefHat className="text-orange-500" size={24} />
                    Instructions
                  </h3>
                  <div className="prose prose-lg prose-orange max-w-none text-gray-600 space-y-5">
                    {selectedRecipe.strInstructions.split('\n').filter(p => p.trim() !== '').map((paragraph, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="shrink-0 mt-1">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-black flex items-center justify-center text-sm">
                            {idx + 1}
                          </div>
                        </div>
                        <p className="leading-relaxed pt-1">
                          {paragraph}
                        </p>
                      </div>
                    ))}
                  </div>

                  {selectedRecipe.strYoutube && (
                    <div className="mt-12 pt-10 border-t border-gray-200">
                      <a 
                        href={selectedRecipe.strYoutube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-[#FF0000] text-white hover:bg-red-700 px-8 py-4 rounded-2xl font-bold transition-colors shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
                      >
                        <Play size={24} fill="currentColor" />
                        Watch Full Video Tutorial
                      </a>
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-linear-fade {
          -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
          mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
        }
      `}} />
    </div>
  );
}