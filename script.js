const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw_1VCVHugXjPxRQNPAI61X_DPAYYkOBFkfjx6sJLUilTfVMbGRD3gsoq01vedcJ2p3/exec';
        
        // State Management
        let buyList = []; // Will be populated from Google Sheets
        let currentView = 'gallery';
        let activeItemId = null; 
        let currentTab = 'all'; 
        let currentCategory = 'all';
        let searchQuery = '';
        let maxPriceFilter = Infinity;

        // DOM Elements
        const views = {
            gallery: document.getElementById('view-gallery'),
            detail: document.getElementById('view-detail'),
            form: document.getElementById('view-form')
        };
        const nav = {
            back: document.getElementById('nav-back-btn'),
            add: document.getElementById('nav-add-btn'),
            menu: document.getElementById('nav-menu-btn')
        };
        const galleryContainer = document.getElementById('gallery-container');
        const emptyState = document.getElementById('empty-state');
        const itemForm = document.getElementById('item-form');
        const globalLoader = document.getElementById('global-loader');
        
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebar-backdrop');
        const priceSlider = document.getElementById('price-slider');
        const priceDisplay = document.getElementById('price-display');

        const generateId = () => Math.random().toString(36).substr(2, 9);
        const formatCurrency = (amount) => amount ? new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(amount) : '';

        // --- NAVIGATION & VIEW ROUTING ---
        function switchView(viewName) {
            Object.values(views).forEach(el => el.classList.add('hidden'));
            views[viewName].classList.remove('hidden');
            currentView = viewName;

            if (viewName === 'gallery') {
                nav.back.classList.add('hidden');
                nav.add.classList.remove('hidden');
                nav.menu.classList.remove('hidden'); 
                renderGallery(); 
            } else {
                nav.back.classList.remove('hidden');
                nav.add.classList.add('hidden');
                nav.menu.classList.add('hidden'); 
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function goBack() {
            if (currentView === 'form' && activeItemId) {
                switchView('detail');
            } else {
                switchView('gallery');
            }
        }

        nav.back.addEventListener('click', goBack);

        // --- SIDEBAR & MENU ---
        function toggleSidebar(show) {
            if (show) {
                sidebarBackdrop.classList.remove('hidden');
                requestAnimationFrame(() => {
                    sidebarBackdrop.classList.remove('opacity-0');
                    sidebar.classList.remove('translate-x-full');
                });
            } else {
                sidebarBackdrop.classList.add('opacity-0');
                sidebar.classList.add('translate-x-full');
                setTimeout(() => {
                    sidebarBackdrop.classList.add('hidden');
                }, 300);
            }
        }

        // --- SEARCH, FILTERING & TABS ---
        function handleSearch(val) {
            searchQuery = val.toLowerCase();
            renderGallery();
        }

        function setTab(tab) {
            currentTab = tab;
            ['all', 'active', 'purchased'].forEach(t => {
                const btn = document.getElementById(`tab-${t}`);
                if (t === tab) {
                    btn.className = "text-left text-black transition-all";
                } else {
                    btn.className = "text-left text-gray-400 hover:text-black transition-all";
                }
            });
            renderGallery();
        }

        function setCategoryFilter(category) {
            currentCategory = category;
            renderGallery();
        }

        function handlePriceFilter(val) {
            maxPriceFilter = parseFloat(val);
            priceDisplay.textContent = formatCurrency(maxPriceFilter);
            renderGallery();
        }

        function updateFilterUI() {
            const categories = [...new Set(buyList.map(item => item.category).filter(Boolean))].sort();
            
            const select = document.getElementById('category-filter');
            select.innerHTML = '<option value="all">All Categories</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                if (cat === currentCategory) option.selected = true;
                select.appendChild(option);
            });
            
            const datalist = document.getElementById('category-suggestions');
            datalist.innerHTML = '';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                datalist.appendChild(option);
            });

            // Update Price Max Slider Scale dynamically
            if (buyList.length > 0) {
                const maxItemPrice = Math.max(...buyList.map(item => item.price || 0));
                const maxLimit = Math.max(100, Math.ceil(maxItemPrice));
                
                priceSlider.max = maxLimit;
                
                if (maxPriceFilter === Infinity || maxPriceFilter > maxLimit) {
                    maxPriceFilter = maxLimit;
                    priceSlider.value = maxLimit;
                }
            } else {
                priceSlider.max = 1000;
                maxPriceFilter = 1000;
                priceSlider.value = 1000;
            }
            priceDisplay.textContent = formatCurrency(maxPriceFilter);
        }

        // --- GALLERY VIEW ---
        function renderGallery() {
            galleryContainer.innerHTML = '';
            updateFilterUI();
            
            if (buyList.length === 0) {
                galleryContainer.classList.add('hidden');
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
                return;
            }

            let filteredList = buyList.filter(item => {
                const matchTab = currentTab === 'all' || 
                                (currentTab === 'purchased' && item.purchased) ||
                                (currentTab === 'active' && !item.purchased);
                const matchCategory = currentCategory === 'all' || item.category === currentCategory;
                const matchSearch = !searchQuery || 
                                    item.name.toLowerCase().includes(searchQuery) || 
                                    (item.brand && item.brand.toLowerCase().includes(searchQuery)) ||
                                    (item.category && item.category.toLowerCase().includes(searchQuery));
                
                const itemPrice = item.price || 0;
                const matchPrice = itemPrice <= maxPriceFilter;

                return matchTab && matchCategory && matchSearch && matchPrice;
            });

            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');

            if (filteredList.length === 0) {
                galleryContainer.classList.remove('hidden');
                galleryContainer.innerHTML = `<div class="col-span-full py-20 text-center text-gray-400 font-light italic">No items match your criteria.</div>`;
                return;
            }

            galleryContainer.classList.remove('hidden');

            filteredList.forEach(item => {
                const defaultImage = `https://placehold.co/600x800/f8f9fa/d1d5db?text=No+Image`;
                const imageUrl = item.image || defaultImage;
                
                const card = document.createElement('div');
                card.className = `masonry-item relative group cursor-pointer transition-opacity duration-300 ${item.purchased ? 'opacity-50 hover:opacity-80' : 'hover:opacity-80'}`;
                card.onclick = () => openDetail(item.id);
                
                card.innerHTML = `
                    <div class="bg-gray-50 mb-3 relative overflow-hidden">
                        <img 
                            src="${imageUrl}" 
                            alt="${item.name}" 
                            class="w-full h-auto object-cover block mix-blend-multiply"
                            onerror="this.onerror=null;this.src='${defaultImage}';"
                        >
                        ${item.purchased ? `
                            <div class="absolute top-2 left-2 bg-black text-white px-2 py-0.5 text-[8px] uppercase tracking-[0.2em]">
                                Purchased
                            </div>
                        ` : ''}
                    </div>
                    <div class="px-1">
                        ${item.brand ? `<p class="text-[9px] uppercase tracking-[0.2em] text-gray-500 mb-1">${item.brand}</p>` : ''}
                        <h3 class="font-serif text-lg text-black leading-snug mb-1">${item.name}</h3>
                        <p class="text-sm font-light text-gray-600">${item.price ? formatCurrency(item.price) : ''}</p>
                    </div>
                `;
                
                galleryContainer.appendChild(card);
            });
        }

        // --- DETAIL VIEW ---
        function openDetail(id) {
            const item = buyList.find(i => i.id === id);
            if (!item) return switchView('gallery');

            activeItemId = id;
            const defaultImage = `https://placehold.co/800x800/f8f9fa/d1d5db?text=No+Image`;
            
            const imgEl = document.getElementById('detail-image');
            imgEl.src = item.image || defaultImage;
            imgEl.onerror = () => { imgEl.src = defaultImage; };
            
            document.getElementById('detail-name').textContent = item.name;
            document.getElementById('detail-price').textContent = item.price ? formatCurrency(item.price) : '';
            document.getElementById('detail-desc').textContent = item.details || 'No editorial notes provided.';
            
            const brandEl = document.getElementById('detail-brand');
            if (item.brand) {
                brandEl.textContent = item.brand;
                brandEl.classList.remove('hidden');
            } else {
                brandEl.classList.add('hidden');
            }

            const catBadge = document.getElementById('detail-category');
            if (item.category) {
                catBadge.textContent = item.category;
                catBadge.classList.remove('hidden');
            } else {
                catBadge.classList.add('hidden');
            }

            const linkContainer = document.getElementById('detail-link-container');
            const linkEl = document.getElementById('detail-link');
            if (item.link) {
                linkContainer.classList.remove('hidden');
                linkEl.href = item.link;
            } else {
                linkContainer.classList.add('hidden');
            }

            const badge = document.getElementById('detail-purchased-badge');
            const toggleBtn = document.getElementById('btn-toggle-purchase');
            
            if (item.purchased) {
                badge.classList.remove('hidden');
                imgEl.classList.add('grayscale');
                toggleBtn.className = "col-span-2 py-4 border border-black text-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors";
                toggleBtn.textContent = "Move to Wishlist";
            } else {
                badge.classList.add('hidden');
                imgEl.classList.remove('grayscale');
                toggleBtn.className = "col-span-2 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors";
                toggleBtn.textContent = "Mark as Purchased";
            }

            toggleBtn.onclick = () => togglePurchase(id);
            document.getElementById('btn-edit').onclick = () => openEditForm(id);
            document.getElementById('btn-delete').onclick = () => deleteItem(id);

            switchView('detail');
        }

        function togglePurchase(id) {
            const item = buyList.find(i => i.id === id);
            if (item) {
                item.purchased = !item.purchased;
                updateDataOnServer({ action: 'update', data: { id: item.id, purchased: item.purchased } }, () => {
                    openDetail(id);
                });
            }
        }

        function deleteItem(id) {
            if(confirm("Remove this item from your catalog?")) {
                const item = buyList.find(i => i.id === id);
                buyList = buyList.filter(i => i.id !== id);
                updateDataOnServer({ action: 'delete', id: id }, () => {
                    switchView('gallery');
                });
            }
        }

        // --- FORM VIEW ---
        function openAddForm() {
            activeItemId = null;
            itemForm.reset();
            document.getElementById('form-item-id').value = '';
            document.getElementById('form-title').textContent = 'New Addition';
            switchView('form');
        }

        function openEditForm(id) {
            const item = buyList.find(i => i.id === id);
            if (!item) return;
            
            activeItemId = id;
            document.getElementById('form-title').textContent = 'Edit Record';
            
            document.getElementById('form-item-id').value = item.id;
            document.getElementById('itemBrand').value = item.brand || '';
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemCategory').value = item.category || '';
            document.getElementById('itemPrice').value = item.price || '';
            document.getElementById('itemImage').value = item.image || '';
            document.getElementById('itemLink').value = item.link || '';
            document.getElementById('itemDetails').value = item.details || '';
            
            switchView('form');
        }

        itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const id = document.getElementById('form-item-id').value;
            const itemData = {
                brand: document.getElementById('itemBrand').value.trim(),
                name: document.getElementById('itemName').value.trim(),
                category: document.getElementById('itemCategory').value.trim(),
                price: parseFloat(document.getElementById('itemPrice').value) || null,
                image: document.getElementById('itemImage').value.trim(),
                link: document.getElementById('itemLink').value.trim(),
                details: document.getElementById('itemDetails').value.trim()
            };

            if (id) {
                const index = buyList.findIndex(i => i.id === id);
                if (index !== -1) {
                    buyList[index] = { ...buyList[index], ...itemData };
                }
                updateDataOnServer({ action: 'update', data: { id: id, ...itemData } }, () => {
                    openDetail(id);
                });
            } else {
                const newItem = {
                    id: generateId(),
                    ...itemData,
                    createdAt: new Date().toISOString(),
                    purchased: false
                };
                buyList.unshift(newItem);
                updateDataOnServer({ action: 'create', data: newItem }, () => {
                    switchView('gallery');
                });
            }
        });

        // --- SERVER COMMUNICATION & PERSISTENCE ---
        function showLoader(show) {
            if(show) {
                globalLoader.classList.remove('hidden');
            } else {
                globalLoader.classList.add('hidden');
            }
        }

        async function updateDataOnServer(payload, callback) {
            showLoader(true);
            try {
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Prevents CORS preflight errors with Apps Script
                    body: JSON.stringify(payload)
                });
                if (callback) callback();
            } catch (error) {
                console.error("Error syncing with server:", error);
            } finally {
                showLoader(false);
                // Cache locally as backup
                localStorage.setItem('myBuyList', JSON.stringify(buyList)); 
            }
        }

        async function fetchInitialData() {
            showLoader(true);
            try {
                const response = await fetch(SCRIPT_URL);
                const result = await response.json();
                if (result.status === 'success') {
                    // Sheets append to the bottom, so reverse to show newest first
                    buyList = result.data.reverse(); 
                    localStorage.setItem('myBuyList', JSON.stringify(buyList));
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                // Fallback to local storage if offline or error occurs
                buyList = JSON.parse(localStorage.getItem('myBuyList')) || [];
            } finally {
                showLoader(false);
                renderGallery();
            }
        }

        // Initialize App by fetching from Google Sheets
        fetchInitialData();
