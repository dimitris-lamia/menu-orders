// index.js
// Main logic for order form, table view, and order management (for index.html)

const SERVER_URL = `${window.location.protocol}//${window.location.host}`;
let allOrders = [];
let lastSeenOrderTime = {};
let focusedTable = null;
let TABLE_COUNT = 40; // Default fallback
let orderItems = [];
let menuConfig = { categories: [], items: [], addons: [] };
let selectedCategoryId = null;
let selectedItemId = null;
let currentView = 'order'; // 'order' or 'table'

function setView(view) {
    currentView = view;
    const orderMenuSection = document.getElementById('orderMenuSection');
    const tableViewSection = document.getElementById('tableViewSection');
    const orderMenuBtn = document.getElementById('orderMenuBtn');
    const tableViewBtn = document.getElementById('tableViewBtn');
    if (view === 'order') {
        orderMenuSection.style.display = '';
        tableViewSection.style.display = 'none';
        orderMenuBtn.classList.add('selected');
        tableViewBtn.classList.remove('selected');
    } else if (view === 'table') {
        orderMenuSection.style.display = 'none';
        tableViewSection.style.display = '';
        orderMenuBtn.classList.remove('selected');
        tableViewBtn.classList.add('selected');
    }
}
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('orderMenuBtn').onclick = () => setView('order');
    document.getElementById('tableViewBtn').onclick = () => setView('table');
    setView('order');
    // Update table select min/max after menuConfig loads
    loadMenuConfig().then(() => {
        const customerInput = document.getElementById('customer');
        if (customerInput) {
            customerInput.min = 1;
            customerInput.max = TABLE_COUNT;
            customerInput.placeholder = `1-${TABLE_COUNT}`;
        }
    });
});

async function loadMenuConfig() {
    const res = await fetch('menu.json');
    menuConfig = await res.json();
    TABLE_COUNT = menuConfig.tableCount || 40;
    renderCategoryButtons();
}
function renderCategoryButtons() {
    const catDiv = document.getElementById('categories');
    catDiv.innerHTML = '';
    menuConfig.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn' + (selectedCategoryId === cat.id ? ' selected pressed' : '');
        btn.textContent = cat.name;
        btn.onclick = () => {
            selectedCategoryId = cat.id;
            selectedItemId = null;
            renderCategoryButtons();
            renderItemButtons();
            renderOrderForm();
        };
        catDiv.appendChild(btn);
    });
    renderItemButtons();
}
function renderItemButtons() {
    const itemDiv = document.getElementById('items');
    itemDiv.innerHTML = '';
    if (!selectedCategoryId) return;
    const items = menuConfig.items.filter(item => item.categoryId === selectedCategoryId);
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'item-btn' + (selectedItemId === item.id ? ' selected pressed' : '');
        btn.textContent = item.name;
        btn.onclick = () => {
            selectedItemId = item.id;
            renderItemButtons();
            renderOrderForm();
        };
        itemDiv.appendChild(btn);
    });
    renderOrderForm();
}
function renderOrderForm() {
    const formDiv = document.getElementById('orderFormSection');
    if (!selectedCategoryId || !selectedItemId) { formDiv.style.display = 'none'; return; }
    formDiv.style.display = '';
    formDiv.innerHTML = '';
    // Quantity (side by side, bigger input)
    const qtyDiv = document.createElement('div');
    qtyDiv.style.display = 'flex';
    qtyDiv.style.alignItems = 'center';
    qtyDiv.style.marginBottom = '10px';
    const qtyLabel = document.createElement('label');
    qtyLabel.textContent = 'Quantity';
    qtyLabel.style.marginRight = '8px';
    qtyLabel.style.fontWeight = 'bold';
    qtyDiv.appendChild(qtyLabel);
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = 1;
    qtyInput.value = 1;
    qtyInput.className = 'item-qty';
    qtyInput.style.width = '60px';
    qtyInput.style.fontSize = '1.2em';
    qtyInput.style.padding = '4px 8px';
    qtyInput.style.marginRight = '8px';
    qtyDiv.appendChild(qtyInput);
    formDiv.appendChild(qtyDiv);
    // Ingredients UI: default (checkboxes) and extra (dropdown)
    const ingBox = document.createElement('div');
    ingBox.className = 'ingredients-box';
    ingBox.innerHTML = '<span>Ingredients:</span> ';
    const itemObj = menuConfig.items.find(i => i.id === selectedItemId);
    const allIngs = (itemObj && itemObj.ingredients) ? itemObj.ingredients : [];
    let selectedDefaults = allIngs.slice(); // checked by default
    let extraIngs = [];
    // Default ingredient checkboxes
    allIngs.forEach(ing => {
        const label = document.createElement('label');
        label.style.marginRight = '10px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = ing;
        cb.checked = true;
        cb.onchange = function() {
            if (cb.checked && !selectedDefaults.includes(ing)) {
                selectedDefaults.push(ing);
            } else if (!cb.checked && selectedDefaults.includes(ing)) {
                selectedDefaults = selectedDefaults.filter(i => i !== ing);
            }
            renderSummary();
        };
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + ing));
        ingBox.appendChild(label);
    });
    // Extra ingredients as checkboxes (add-ons)
    const extraDiv = document.createElement('div');
    extraDiv.style.marginTop = '8px';
    extraDiv.innerHTML = '<b>Add extra:</b> ';
    const availableAddons = menuConfig.addons.filter(a => a.categoryId === selectedCategoryId);
    availableAddons.filter(a => !allIngs.includes(a.name)).forEach(addon => {
        const label = document.createElement('label');
        label.style.marginRight = '10px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = addon.name;
        cb.checked = false;
        cb.onchange = function() {
            if (cb.checked && !extraIngs.includes(addon.name)) {
                extraIngs.push(addon.name);
            } else if (!cb.checked && extraIngs.includes(addon.name)) {
                extraIngs = extraIngs.filter(i => i !== addon.name);
            }
            renderSummary();
        };
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + addon.name));
        extraDiv.appendChild(label);
    });
    ingBox.appendChild(extraDiv);
    // Summary chips
    const summaryDiv = document.createElement('div');
    summaryDiv.style.margin = '8px 0';
    summaryDiv.style.display = 'flex';
    summaryDiv.style.flexWrap = 'wrap';
    summaryDiv.style.gap = '8px';
    function renderSummary() {
        summaryDiv.innerHTML = '';
        // Default chips (no label, no x)
        // (intentionally left blank)
        // Extra chips
        if (extraIngs.length > 0) {
            const extraLabel = document.createElement('span');
            extraLabel.textContent = 'Extra:';
            extraLabel.style.fontWeight = 'bold';
            extraLabel.style.margin = '0 8px 0 0';
            extraLabel.style.color = '#b07d00';
            summaryDiv.appendChild(extraLabel);
        }
        extraIngs.forEach((ing, idx) => {
            const chip = document.createElement('span');
            chip.textContent = 'extra: ' + ing;
            chip.style.background = '#fffbe6';
            chip.style.color = '#b07d00';
            chip.style.padding = '4px 12px';
            chip.style.borderRadius = '16px';
            chip.style.display = 'inline-flex';
            chip.style.alignItems = 'center';
            chip.style.fontWeight = 'bold';
            chip.style.fontSize = '1em';
            chip.style.boxShadow = '0 1px 4px #ffe066';
            chip.style.marginRight = '6px';
            // Remove button
            const rm = document.createElement('span');
            rm.textContent = '×';
            rm.style.marginLeft = '8px';
            rm.style.cursor = 'pointer';
            rm.onclick = () => {
                extraIngs.splice(idx,1);
                Array.from(extraDiv.querySelectorAll('input[type=checkbox]')).forEach(cb => {
                    if (cb.value === ing) cb.checked = false;
                });
                renderSummary();
            };
            chip.appendChild(rm);
            summaryDiv.appendChild(chip);
        });
    }
    ingBox.appendChild(summaryDiv);
    renderSummary();
    formDiv.appendChild(ingBox);
    // Add Item button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-item-btn';
    addBtn.textContent = 'Add Item';
    addBtn.onclick = function() {
        const quantity = qtyInput.value;
        const defaultIngredients = selectedDefaults.slice();
        // Add 'extra: ' prefix to each extra ingredient
        const extraIngredients = extraIngs.map(ing => 'extra: ' + ing);
        if (!selectedItemId || !quantity) return;
        const itemObj = menuConfig.items.find(i => i.id === selectedItemId);
        orderItems.push({ item: itemObj ? itemObj.name : '', quantity, defaultIngredients, extraIngredients });
        renderItemList();
        selectedItemId = null;
        renderItemButtons();
        renderOrderForm();
    };
    formDiv.appendChild(addBtn);
}
function renderItemList() {
    const itemList = document.getElementById('itemList');
    itemList.innerHTML = '';
    orderItems.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'order-item';
        let ingHtml = '';
        if (item.defaultIngredients && item.defaultIngredients.length)
            ingHtml += item.defaultIngredients.join(', ');
        if (item.extraIngredients && item.extraIngredients.length)
            ingHtml += (ingHtml ? ', ' : '') + item.extraIngredients.join(', ');
        div.innerHTML = `${item.quantity} x ${item.item}` + (ingHtml ? ` <span>(${ingHtml})</span>` : '');
        const rmBtn = document.createElement('button');
        rmBtn.className = 'remove-btn';
        rmBtn.textContent = 'Remove';
        rmBtn.onclick = () => { orderItems.splice(idx,1); renderItemList(); };
        div.appendChild(rmBtn);
        itemList.appendChild(div);
    });
}
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const customer = document.getElementById('customer').value.trim();
    if (!customer || orderItems.length === 0) return;
    const order = { customer, items: orderItems };
    try {
        await fetch(`${SERVER_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        this.reset();
        orderItems = [];
        renderItemList();
        selectedCategoryId = null;
        selectedItemId = null;
        renderCategoryButtons();
        renderItemButtons();
        renderOrderForm();
        fetchOrders();
    } catch (e) {
        alert('Failed to send order. Is the server running?');
    }
});

// --- Table and order display (unchanged) ---
function groupOrdersByTable(orders) {
    const grouped = {};
    orders.forEach(order => {
        const table = String(order.customer);
        if (!grouped[table]) grouped[table] = [];
        grouped[table].push(order);
    });
    return grouped;
}
function renderTables(grouped) {
    const tablesDiv = document.getElementById('tables');
    tablesDiv.innerHTML = '';
    for (let i = 1; i <= TABLE_COUNT; i++) {
        const tableNum = String(i);
        const hasOrders = grouped[tableNum] && grouped[tableNum].length > 0;
        let blink = false;
        if (hasOrders) {
            const latestOrder = grouped[tableNum][grouped[tableNum].length-1];
            if (!lastSeenOrderTime[tableNum] || latestOrder.time > lastSeenOrderTime[tableNum]) {
                blink = true;
            }
        }
        const icon = document.createElement('div');
        icon.className = 'table-icon' + (hasOrders ? ' active' : '') + (blink ? ' blink' : '');
        icon.innerHTML = `<span>${tableNum}</span>`;
        icon.title = `Table ${tableNum}`;
        icon.onclick = (e) => {
            e.stopPropagation();
            focusedTable = tableNum;
            // Mark all orders for this table as seen (stop blink)
            if (grouped[tableNum] && grouped[tableNum].length > 0) {
                lastSeenOrderTime[tableNum] = grouped[tableNum][grouped[tableNum].length-1].time;
            }
            renderOrders(grouped);
            renderTables(grouped);
            showOrderModal({
                customer: tableNum,
                time: grouped[tableNum] && grouped[tableNum].length > 0 ? grouped[tableNum][grouped[tableNum].length-1].time : '',
                items: grouped[tableNum] ? grouped[tableNum].flatMap(order => order.items) : []
            });
        };
        tablesDiv.appendChild(icon);
    }
}
function renderOrders(grouped) {
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '';
    if (focusedTable) {
        const tableOrders = grouped[focusedTable] || [];
        const btnDiv = document.createElement('div');
        btnDiv.style.display = 'flex';
        btnDiv.style.gap = '10px';
        btnDiv.style.marginBottom = '10px';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = 'Close Table ' + focusedTable;
        closeBtn.onclick = () => { focusedTable = null; renderOrders(grouped); };
        btnDiv.appendChild(closeBtn);
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-table-btn';
        clearBtn.textContent = 'Clear Table';
        clearBtn.onclick = async () => {
            if (confirm('Clear all orders for table ' + focusedTable + '?')) {
                await fetch(`${SERVER_URL}/orders/table/${focusedTable}`, { method: 'DELETE' });
                focusedTable = null;
                fetchOrders();
            }
        };
        btnDiv.appendChild(clearBtn);
        const moveTableBtn = document.createElement('button');
        moveTableBtn.className = 'move-table-btn';
        moveTableBtn.textContent = 'Move Table';
        moveTableBtn.onclick = () => {
            // Use modal.js logic for move table
            showOrderModal({
                customer: focusedTable,
                items: tableOrders.flatMap(order => order.items)
            });
        };
        btnDiv.appendChild(moveTableBtn);
        ordersList.appendChild(btnDiv);
        const div = document.createElement('div');
        div.className = 'table-orders';
        div.innerHTML = `<strong>Table ${focusedTable}</strong>`;
        tableOrders.forEach((order, orderIdx) => {
            order.items.forEach((item, itemIdx) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'order-item';
                let ingHtml = '';
                if (item.defaultIngredients && item.defaultIngredients.length)
                    ingHtml += item.defaultIngredients.join(', ');
                if (item.extraIngredients && item.extraIngredients.length)
                    ingHtml += (ingHtml ? ', ' : '') + item.extraIngredients.join(', ');
                if ((!item.defaultIngredients || !item.defaultIngredients.length) && (!item.extraIngredients || !item.extraIngredients.length) && item.ingredients && item.ingredients.length)
                    ingHtml += item.ingredients.join(', ');
                itemDiv.innerHTML = `${item.quantity} x ${item.item}` + (ingHtml ? ` <span>(${ingHtml})</span>` : '');
                // Add click event to show modal
                itemDiv.style.cursor = 'pointer';
                itemDiv.onclick = () => showOrderModal(order);
                // --- Move button ---
                const moveBtn = document.createElement('button');
                moveBtn.className = 'move-btn';
                moveBtn.textContent = 'Move';
                moveBtn.style.background = '#2196f3';
                moveBtn.style.color = '#fff';
                moveBtn.style.border = 'none';
                moveBtn.style.padding = '4px 12px';
                moveBtn.style.borderRadius = '4px';
                moveBtn.style.fontWeight = 'bold';
                moveBtn.style.cursor = 'pointer';
                moveBtn.style.marginLeft = '10px';
                moveBtn.style.boxShadow = '0 1px 4px #b3e5fc';
                moveBtn.onclick = async (e) => {
                    e.stopPropagation();
                    let newTable = prompt(`Move to table (1-${TABLE_COUNT}):`, '');
                    if (!newTable) return;
                    newTable = parseInt(newTable);
                    if (isNaN(newTable) || newTable < 1 || newTable > TABLE_COUNT || newTable == focusedTable) {
                        alert('Invalid table number.');
                        return;
                    }
                    // Send move request to backend
                    try {
                        await fetch(`${SERVER_URL}/orders/move`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                fromTable: focusedTable,
                                toTable: newTable,
                                orderTime: order.time,
                                itemIndex: itemIdx
                            })
                        });
                        fetchOrders();
                    } catch (err) {
                        alert('Failed to move order.');
                    }
                };
                itemDiv.appendChild(moveBtn);
                div.appendChild(itemDiv);
            });
        });
        if (tableOrders.length === 0) {
            div.innerHTML += '<div class="order-item"><em>No orders for this table.</em></div>';
        }
        ordersList.appendChild(div);
    } else {
        // Show all tables with orders
        let anyOrders = false;
        for (let i = 1; i <= TABLE_COUNT; i++) {
            const tableNum = String(i);
            const tableOrders = grouped[tableNum] || [];
            if (tableOrders.length > 0) {
                anyOrders = true;
                const div = document.createElement('div');
                div.className = 'table-orders';
                div.id = `table-orders-${tableNum}`;
                div.innerHTML = `<strong>Table ${tableNum}</strong>`;
                tableOrders.forEach(order => {
                    order.items.forEach((item, itemIdx) => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'order-item';
                        let ingHtml = '';
                        if (item.defaultIngredients && item.defaultIngredients.length)
                            ingHtml += item.defaultIngredients.join(', ');
                        if (item.extraIngredients && item.extraIngredients.length)
                            ingHtml += (ingHtml ? ', ' : '') + item.extraIngredients.join(', ');
                        if ((!item.defaultIngredients || !item.defaultIngredients.length) && (!item.extraIngredients || !item.extraIngredients.length) && item.ingredients && item.ingredients.length)
                            ingHtml += item.ingredients.join(', ');
                        itemDiv.innerHTML = `${item.quantity} x ${item.item}` + (ingHtml ? ` <span>(${ingHtml})</span>` : '');
                        // Add click event to show modal
                        itemDiv.style.cursor = 'pointer';
                        itemDiv.onclick = () => showOrderModal(order);
                        // --- Move button (always available) ---
                        const moveBtn = document.createElement('button');
                        moveBtn.className = 'move-btn';
                        moveBtn.textContent = 'Move';
                        moveBtn.style.background = '#2196f3';
                        moveBtn.style.color = '#fff';
                        moveBtn.style.border = 'none';
                        moveBtn.style.padding = '4px 12px';
                        moveBtn.style.borderRadius = '4px';
                        moveBtn.style.fontWeight = 'bold';
                        moveBtn.style.cursor = 'pointer';
                        moveBtn.style.marginLeft = '10px';
                        moveBtn.style.boxShadow = '0 1px 4px #b3e5fc';
                        moveBtn.onclick = async (e) => {
                            e.stopPropagation();
                            let newTable = prompt(`Move to table (1-${TABLE_COUNT}):`, '');
                            if (!newTable) return;
                            newTable = parseInt(newTable);
                            if (isNaN(newTable) || newTable < 1 || newTable > TABLE_COUNT || newTable == tableNum) {
                                alert('Invalid table number.');
                                return;
                            }
                            try {
                                await fetch(`${SERVER_URL}/orders/move`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        fromTable: tableNum,
                                        toTable: newTable,
                                        orderTime: order.time,
                                        itemIndex: itemIdx
                                    })
                                });
                                fetchOrders();
                            } catch (err) {
                                alert('Failed to move order.');
                            }
                        };
                        itemDiv.appendChild(moveBtn);
                        div.appendChild(itemDiv);
                    });
                });
                ordersList.appendChild(div);
            }
        }
        if (!anyOrders) {
            ordersList.innerHTML = '<em>No orders yet.</em>';
        }
    }
}
function openTableOrders(tableNum, grouped) {
    focusedTable = tableNum;
    // Mark all orders for this table as seen
    if (grouped[tableNum] && grouped[tableNum].length > 0) {
        lastSeenOrderTime[tableNum] = grouped[tableNum][grouped[tableNum].length-1].time;
    }
    renderOrders(grouped);
    renderTables(grouped);
}
async function fetchOrders() {
    try {
        const res = await fetch(`${SERVER_URL}/orders`);
        const orders = await res.json();
        allOrders = orders;
        const grouped = groupOrdersByTable(orders);
        renderTables(grouped);
        renderOrders(grouped);
    } catch (e) {
        document.getElementById('ordersList').innerHTML = '<em>Could not load orders. Is the server running?</em>';
        document.getElementById('tables').innerHTML = '';
    }
}
function ordersToCSV(orders) {
    const header = ['Table','Item','Quantity','Ingredients'];
    let rows = [];
    orders.forEach(o => {
        o.items.forEach(item => {
            let ings = '';
            if (item.defaultIngredients && item.defaultIngredients.length)
                ings += item.defaultIngredients.join('; ');
            if (item.extraIngredients && item.extraIngredients.length)
                ings += (ings ? '; ' : '') + item.extraIngredients.join('; ');
            rows.push([o.customer, item.item, item.quantity, ings]);
        });
    });
    const csv = [header, ...rows].map(row => row.map(field => '"'+String(field).replace(/"/g,'""')+'"').join(',')).join('\n');
    return csv;
}
function downloadOrders() {
    if (allOrders.length === 0) { alert('No orders to download.'); return; }
    const csv = ordersToCSV(allOrders);
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
document.getElementById('downloadOrdersBtn').addEventListener('click', downloadOrders);
// Poll for new orders every 3 seconds
fetchOrders();
setInterval(fetchOrders, 3000);
// Initial menu load
loadMenuConfig();

/* Add to the bottom of the file or in a <style> block in index.html */
// Add persistent pressed color for selected category/item
const style = document.createElement('style');
style.innerHTML = `
.cat-btn.pressed, .cat-btn.selected.pressed {
  background: #ff9800 !important;
  color: #fff !important;
}
.item-btn.pressed, .item-btn.selected.pressed {
  background: #ff9800 !important;
  color: #fff !important;
}
`;
document.head.appendChild(style);
