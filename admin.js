let menu = { categories: [], items: [], addons: [] };

document.addEventListener('DOMContentLoaded', loadMenu);

async function loadMenu() {
    try {
        const res = await fetch('menu.json');
        if (!res.ok) {
            if (res.status === 404) {
                console.warn('menu.json not found. Starting with an empty menu.');
                menu = { categories: [], items: [], addons: [] };
            } else {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
        } else {
            menu = await res.json();
        }
        renderMenu();
    } catch (error) {
        console.error('Error loading menu:', error);
        showMessage('Error loading menu. Check console for details.', 'red');
    }
}

function renderMenu() {
    const menuContentDiv = document.getElementById('menuContent');
    menuContentDiv.innerHTML = '';
    if (menu.categories.length === 0) {
        menuContentDiv.innerHTML += '<p style="text-align: center; margin-top: 20px; color: #777;">No categories defined. Add one above!</p>';
        return;
    }
    menu.categories.forEach(cat => {
        const categoryBlock = document.createElement('div');
        categoryBlock.className = 'category-block section';
        categoryBlock.innerHTML = `
            <div class="section-header">
                <h2>${cat.name}</h2>
                <button class="delete-btn" onclick="deleteCategory('${cat.id}')">Delete Category</button>
            </div>
            <div class="items-section">
                <h3>Items:</h3>
                <ul id="items-${cat.id}"></ul>
                <input type="text" id="newItem-${cat.id}" placeholder="New item name">
                <button onclick="addItem('${cat.id}')">Add Item</button>
            </div>
            <div class="addons-section">
                <h3>Available Add-ons:</h3>
                <ul id="addons-${cat.id}"></ul>
                <input type="text" id="newAddon-${cat.id}" placeholder="New add-on name">
                <button onclick="addAddon('${cat.id}')">Add Add-on</button>
            </div>
        `;
        menuContentDiv.appendChild(categoryBlock);
        renderItems(cat.id);
        renderAddons(cat.id);
    });
}

function renderItems(categoryId) {
    const itemsUl = document.getElementById(`items-${categoryId}`);
    itemsUl.innerHTML = '';
    menu.items.filter(item => item.categoryId === categoryId).forEach((item, itemIndex) => {
        const ingredientsInline = (item.ingredients || []).map((ing, ingIndex) =>
            `${ing} <button class='delete-btn' style='padding:2px 6px;margin-left:2px;' onclick="deleteIngredient('${item.id}', ${ingIndex})">x</button>`
        ).join(', ');
        const addonsInline = menu.addons.filter(a => a.categoryId === categoryId).map(a => a.name).join(', ');
        const li = document.createElement('li');
        li.innerHTML = `
            <b>${item.name}</b>
            <button class="delete-btn" onclick="deleteItem('${item.id}')">Delete</button>
            <div class="item-block">
                <span><b>Ingredients:</b> ${ingredientsInline || '<i>none</i>'}</span><br>
                <span><b>Add-ons:</b> ${addonsInline || '<i>none</i>'}</span>
                <br>
                <input type="text" id="newIngredient-${item.id}" placeholder="Add ingredient">
                <button onclick="addIngredient('${item.id}')">Add Ingredient</button>
            </div>
        `;
        itemsUl.appendChild(li);
    });
}

function renderAddons(categoryId) {
    const addonsUl = document.getElementById(`addons-${categoryId}`);
    addonsUl.innerHTML = '';
    menu.addons.filter(a => a.categoryId === categoryId).forEach((addon, addonIndex) => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${addon.name}
            <button class="delete-btn" onclick="deleteAddon('${addon.id}')">Delete</button>
        `;
        addonsUl.appendChild(li);
    });
}

function addCategory() {
    const newCategoryNameInput = document.getElementById('newCategoryName');
    const categoryName = newCategoryNameInput.value.trim();
    if (categoryName && !menu.categories.some(cat => cat.name === categoryName)) {
        const newId = 'cat' + (Date.now() + Math.floor(Math.random()*1000));
        menu.categories.push({ id: newId, name: categoryName });
        newCategoryNameInput.value = '';
        renderMenu();
        showMessage('Category added!', 'green');
    } else if (categoryName) {
        showMessage('Category already exists!', 'orange');
    } else {
        showMessage('Category name cannot be empty.', 'red');
    }
}

function deleteCategory(categoryId) {
    if (confirm(`Are you sure you want to delete this category and all its contents?`)) {
        menu.categories = menu.categories.filter(cat => cat.id !== categoryId);
        menu.items = menu.items.filter(item => item.categoryId !== categoryId);
        menu.addons = menu.addons.filter(addon => addon.categoryId !== categoryId);
        renderMenu();
        showMessage('Category deleted!', 'green');
    }
}

function addItem(categoryId) {
    const newItemInput = document.getElementById(`newItem-${categoryId}`);
    const itemName = newItemInput.value.trim();
    if (itemName && !menu.items.some(item => item.categoryId === categoryId && item.name === itemName)) {
        const newId = 'item' + (Date.now() + Math.floor(Math.random()*1000));
        menu.items.push({ id: newId, categoryId, name: itemName, ingredients: [] });
        newItemInput.value = '';
        renderMenu();
        showMessage('Item added!', 'green');
    } else if (itemName) {
        showMessage('Item already exists in this category!', 'orange');
    } else {
        showMessage('Item name cannot be empty.', 'red');
    }
}

function deleteItem(itemId) {
    if (confirm(`Are you sure you want to delete this item?`)) {
        menu.items = menu.items.filter(item => item.id !== itemId);
        renderMenu();
        showMessage('Item deleted!', 'green');
    }
}

function addIngredient(itemId) {
    const item = menu.items.find(i => i.id === itemId);
    const newIngredientInput = document.getElementById(`newIngredient-${itemId}`);
    const ingredientName = newIngredientInput.value.trim();
    if (ingredientName && item && !item.ingredients.includes(ingredientName)) {
        item.ingredients.push(ingredientName);
        newIngredientInput.value = '';
        renderMenu();
        showMessage('Ingredient added!', 'green');
    } else if (ingredientName) {
        showMessage('Ingredient already exists for this item!', 'orange');
    } else {
        showMessage('Ingredient name cannot be empty.', 'red');
    }
}

function deleteIngredient(itemId, ingIndex) {
    const item = menu.items.find(i => i.id === itemId);
    if (item && item.ingredients[ingIndex] !== undefined) {
        item.ingredients.splice(ingIndex, 1);
        renderMenu();
        showMessage('Ingredient deleted!', 'green');
    }
}

function addAddon(categoryId) {
    const newAddonInput = document.getElementById(`newAddon-${categoryId}`);
    const addonName = newAddonInput.value.trim();
    if (addonName && !menu.addons.some(a => a.categoryId === categoryId && a.name === addonName)) {
        const newId = 'addon' + (Date.now() + Math.floor(Math.random()*1000));
        menu.addons.push({ id: newId, categoryId, name: addonName });
        newAddonInput.value = '';
        renderMenu();
        showMessage('Add-on added!', 'green');
    } else if (addonName) {
        showMessage('Add-on already exists in this category!', 'orange');
    } else {
        showMessage('Add-on name cannot be empty.', 'red');
    }
}

function deleteAddon(addonId) {
    menu.addons = menu.addons.filter(a => a.id !== addonId);
    renderMenu();
    showMessage('Add-on deleted!', 'green');
}

async function saveMenu() {
    try {
        const res = await fetch('/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(menu)
        });
        if (res.ok) {
            showMessage('Menu saved successfully!', 'green');
        } else {
            const errorText = await res.text();
            throw new Error(`Server error: ${res.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error saving menu:', error);
        showMessage(`Error saving menu: ${error.message}`, 'red');
    }
}

function showMessage(msg, color = 'green') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = msg;
    messageDiv.style.color = color;
    setTimeout(() => {
        messageDiv.textContent = '';
    }, 3000);
}

// --- XLSX Import/Export ---
document.addEventListener('DOMContentLoaded', () => {
    const importBtn = document.getElementById('importXLSXBtn');
    const exportBtn = document.getElementById('exportXLSXBtn');
    const fileInput = document.getElementById('importXLSXInput');
    // Render tableCount if present
    const tableCountInput = document.getElementById('tableCountInput');
    if (tableCountInput) {
        tableCountInput.value = menu.tableCount || 40;
    }
    if (importBtn && fileInput) {
        importBtn.onclick = () => fileInput.click();
        fileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                // Assume first sheet
                const ws = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, {header:1});
                // Parse rows to menu structure
                const newMenu = parseMenuFromRows(rows);
                if (newMenu) {
                    menu = newMenu;
                    // Set tableCount if present in first row
                    if (rows[0][0] && String(rows[0][0]).toLowerCase().startsWith('tablecount:')) {
                        const tc = parseInt(rows[0][0].split(':')[1]);
                        if (!isNaN(tc)) menu.tableCount = tc;
                    }
                    renderMenu();
                    const tableCountInput = document.getElementById('tableCountInput');
                    if (tableCountInput) tableCountInput.value = menu.tableCount || 40;
                    showMessage('Menu imported from Excel! Remember to Save Menu.', 'green');
                } else {
                    showMessage('Invalid Excel format.', 'red');
                }
            };
            reader.readAsArrayBuffer(file);
        };
    }
    if (exportBtn) {
        exportBtn.onclick = function() {
            const wb = XLSX.utils.book_new();
            const rows = menuToRows(menu);
            // Add tableCount as first row
            rows.unshift([`tableCount:${menu.tableCount || 40}`]);
            const ws = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, 'Menu');
            XLSX.writeFile(wb, 'menu_export.xlsx');
        };
    }
});

function parseMenuFromRows(rows) {
    // Expect header: Category | Item | Ingredient | Add-on
    if (!rows || rows.length < 2) return null;
    let headerRowIdx = 0;
    // Check for tableCount in first row
    if (rows[0][0] && String(rows[0][0]).toLowerCase().startsWith('tablecount:')) {
        headerRowIdx = 1;
    }
    const header = rows[headerRowIdx].map(h => h.toLowerCase());
    const catIdx = header.indexOf('category');
    const itemIdx = header.indexOf('item');
    const ingIdx = header.indexOf('ingredient');
    const addonIdx = header.indexOf('add-on');
    if (catIdx === -1 || itemIdx === -1) return null;
    const newMenu = { categories: [], items: [], addons: [] };
    let lastCat = '', lastItem = '';
    for (let i = headerRowIdx + 1; i < rows.length; ++i) {
        const row = rows[i];
        let cat = (row[catIdx]||'').trim();
        let item = (row[itemIdx]||'').trim();
        const ing = ingIdx !== -1 ? (row[ingIdx]||'').trim() : '';
        const addon = addonIdx !== -1 ? (row[addonIdx]||'').trim() : '';
        if (!cat) cat = lastCat;
        if (!item) item = lastItem;
        if (!cat) continue;
        if (!newMenu.categories.some(c => c.name === cat)) {
            newMenu.categories.push({ id: 'cat' + (Date.now() + Math.floor(Math.random()*1000)), name: cat });
        }
        if (item) {
            const category = newMenu.categories.find(c => c.name === cat);
            if (category && !newMenu.items.some(i => i.categoryId === category.id && i.name === item)) {
                newMenu.items.push({ id: 'item' + (Date.now() + Math.floor(Math.random()*1000)), categoryId: category.id, name: item, ingredients: [] });
            }
        }
        if (item && ing) {
            const itemObj = newMenu.items.find(i => i.name === item && i.categoryId === newMenu.categories.find(c => c.name === cat).id);
            if (itemObj && !itemObj.ingredients.includes(ing)) {
                itemObj.ingredients.push(ing);
            }
        }
        if (addon) {
            const category = newMenu.categories.find(c => c.name === cat);
            if (category && !newMenu.addons.some(a => a.categoryId === category.id && a.name === addon)) {
                newMenu.addons.push({ id: 'addon' + (Date.now() + Math.floor(Math.random()*1000)), categoryId: category.id, name: addon });
            }
        }
        if (cat) lastCat = cat;
        if (item) lastItem = item;
    }
    return newMenu;
}

function menuToRows(menu) {
    // Header
    const rows = [["Category", "Item", "Ingredient", "Add-on"]];
    menu.categories.forEach(cat => {
        const items = menu.items.filter(item => item.categoryId === cat.id) || [];
        const addons = menu.addons.filter(addon => addon.categoryId === cat.id) || [];
        if (items.length === 0 && addons.length === 0) {
            rows.push([cat.name, '', '', '']);
        }
        let firstCatRow = true;
        items.forEach(itemObj => {
            const ings = itemObj.ingredients || [];
            let firstItemRow = true;
            if (ings.length === 0) {
                rows.push([firstCatRow ? cat.name : '', itemObj.name, '', '']);
                firstCatRow = false;
            } else {
                ings.forEach((ing, idx) => {
                    rows.push([
                        firstCatRow ? cat.name : '',
                        firstItemRow ? itemObj.name : '',
                        ing,
                        ''
                    ]);
                    firstCatRow = false;
                    firstItemRow = false;
                });
            }
        });
        addons.forEach((addon, idx) => {
            rows.push([
                firstCatRow ? cat.name : '',
                '',
                '',
                addon.name
            ]);
            firstCatRow = false;
        });
    });
    return rows;
}