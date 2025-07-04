
// --- FIXED: All requires and app initialization at the top ---
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;


app.use(cors());
app.use(bodyParser.json());

// --- In-memory auth token store ---
const activeTokens = {};
const TOKEN_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes
function generateToken() {
    return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}
function setToken(token, role) {
    activeTokens[token] = { role, expires: Date.now() + TOKEN_EXPIRY_MS };
}
function isTokenValid(token) {
    if (!token || !activeTokens[token]) return false;
    if (Date.now() > activeTokens[token].expires) {
        delete activeTokens[token];
        return false;
    }
    return true;
}
function getTokenRole(token) {
    return activeTokens[token]?.role;
}

// --- Login endpoint ---
app.post('/login', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const codes = readUserCodes();
    const user = codes.find(c => c.code === code);
    if (!user) return res.status(401).json({ error: 'Invalid code' });
    const token = generateToken();
    setToken(token, user.role);
    res.json({ token, role: user.role });
});

// --- User Codes Management ---
const userCodesPath = path.join(__dirname, 'user_codes.json');

function readUserCodes() {
    if (!fs.existsSync(userCodesPath)) return [];
    try {
        const data = fs.readFileSync(userCodesPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function writeUserCodes(codes) {
    fs.writeFileSync(userCodesPath, JSON.stringify(codes, null, 2));
}

app.get('/user-codes', (req, res) => {
    res.json(readUserCodes());
});

app.post('/user-codes', (req, res) => {
    const { code, role } = req.body;
    if (!code || !role) return res.status(400).json({ error: 'Missing code or role' });
    let codes = readUserCodes();
    if (codes.find(c => c.code === code)) {
        return res.status(409).json({ error: 'Code already exists' });
    }
    codes.push({ code, role });
    writeUserCodes(codes);
    res.json({ success: true });
});

app.delete('/user-codes/:code', (req, res) => {
    const code = req.params.code;
    let codes = readUserCodes();
    const newCodes = codes.filter(c => c.code !== code);
    if (codes.length === newCodes.length) {
        return res.status(404).json({ error: 'Code not found' });
    }
    writeUserCodes(newCodes);
    res.json({ success: true });
});

app.use(cors());
app.use(bodyParser.json());

// Serve static files, but block direct access to protected pages unless ?auth=<valid token> is present
const protectedPages = ['/orders.html', '/admin.html', '/kitchen.html'];
app.use((req, res, next) => {
    if (protectedPages.includes(req.path)) {
        const token = req.query && req.query.auth;
        if (isTokenValid(token)) {
            return next();
        } else {
            return res.redirect('/landing.html');
        }
    }
    next();
});
app.use(express.static(path.join(__dirname)));

// SQLite database setup
const db = new sqlite3.Database('orders.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer TEXT NOT NULL,
        time INTEGER NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        item TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        ingredients TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id)
    )`);
});

// Serve menu.json
app.get('/menu.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'menu.json'));
});

// Update menu.json
app.post('/menu', (req, res) => {
    fs.writeFile(path.join(__dirname, 'menu.json'), JSON.stringify(req.body, null, 2), err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Get all orders with items and ingredients
app.get('/orders', (req, res) => {
    db.all('SELECT * FROM orders ORDER BY time ASC', [], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        if (orders.length === 0) return res.json([]);
        const orderIds = orders.map(o => o.id);
        db.all(`SELECT * FROM order_items WHERE order_id IN (${orderIds.map(()=>'?').join(',')})`, orderIds, (err2, items) => {
            if (err2) return res.status(500).json({ error: err2.message });
            // Group items by order_id
            const itemsByOrder = {};
            items.forEach(item => {
                if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
                itemsByOrder[item.order_id].push({
                    item: item.item,
                    quantity: item.quantity,
                    ingredients: item.ingredients ? JSON.parse(item.ingredients) : []
                });
            });
            // Attach items to orders
            const result = orders.map(order => ({
                id: order.id,
                customer: order.customer,
                time: order.time,
                items: itemsByOrder[order.id] || []
            }));
            res.json(result);
        });
    });
});

// Add a new order with multiple items and ingredients
app.post('/orders', (req, res) => {
    const { customer, items } = req.body;
    if (!customer || !Array.isArray(items) || items.length === 0) {
        console.error('POST /orders error: missing fields', req.body);
        return res.status(400).json({ error: 'Missing fields' });
    }
    const time = Date.now();
    db.run('INSERT INTO orders (customer, time) VALUES (?, ?)', [customer, time], function(err) {
        if (err) {
            console.error('DB error inserting order:', err);
            return res.status(500).json({ error: err.message });
        }
        const orderId = this.lastID;
        const stmt = db.prepare('INSERT INTO order_items (order_id, item, quantity, ingredients) VALUES (?, ?, ?, ?)');
        for (const it of items) {
            stmt.run(orderId, it.item, it.quantity, JSON.stringify(it.defaultIngredients ? it.defaultIngredients.concat(it.extraIngredients || []) : it.ingredients || []), function(err2) {
                if (err2) console.error('DB error inserting order_item:', err2, it);
            });
        }
        stmt.finalize();
        res.json({ success: true, id: orderId });
    });
});

// Utility to archive orders to orders_archive.json
function archiveOrders(orders) {
    if (!orders || orders.length === 0) return;
    const archivePath = path.join(__dirname, 'orders_archive.json');
    let archive = {};
    if (fs.existsSync(archivePath)) {
        try {
            archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
        } catch (e) {
            archive = {};
        }
    }
    const today = new Date().toISOString().slice(0, 10);
    if (!archive[today]) archive[today] = [];
    archive[today].push(...orders);
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
}

// Clear all orders (for admin/testing)
app.delete('/orders', (req, res) => {
    db.all('SELECT * FROM orders', [], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        if (orders.length === 0) {
            db.serialize(() => {
                db.run('DELETE FROM order_items');
                db.run('DELETE FROM orders', [], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                });
            });
            return;
        }
        const orderIds = orders.map(o => o.id);
        db.all(`SELECT * FROM order_items WHERE order_id IN (${orderIds.map(()=>'?').join(',')})`, orderIds, (err2, items) => {
            if (err2) return res.status(500).json({ error: err2.message });
            // Group items by order_id
            const itemsByOrder = {};
            items.forEach(item => {
                if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
                itemsByOrder[item.order_id].push({
                    item: item.item,
                    quantity: item.quantity,
                    ingredients: item.ingredients ? JSON.parse(item.ingredients) : []
                });
            });
            // Attach items to orders
            const archiveData = orders.map(order => ({
                id: order.id,
                customer: order.customer,
                time: order.time,
                items: itemsByOrder[order.id] || []
            }));
            archiveOrders(archiveData);
            db.serialize(() => {
                db.run('DELETE FROM order_items');
                db.run('DELETE FROM orders', [], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                });
            });
        });
    });
});

// Clear all orders for a specific table
app.delete('/orders/table/:table', (req, res) => {
    const table = req.params.table;
    db.all('SELECT * FROM orders WHERE customer = ?', [table], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        if (orders.length === 0) return res.json({ success: true });
        const orderIds = orders.map(r => r.id);
        db.all(`SELECT * FROM order_items WHERE order_id IN (${orderIds.map(()=>'?').join(',')})`, orderIds, (err2, items) => {
            if (err2) return res.status(500).json({ error: err2.message });
            // Group items by order_id
            const itemsByOrder = {};
            items.forEach(item => {
                if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
                itemsByOrder[item.order_id].push({
                    item: item.item,
                    quantity: item.quantity,
                    ingredients: item.ingredients ? JSON.parse(item.ingredients) : []
                });
            });
            // Attach items to orders
            const archiveData = orders.map(order => ({
                id: order.id,
                customer: order.customer,
                time: order.time,
                items: itemsByOrder[order.id] || []
            }));
            archiveOrders(archiveData);
            db.serialize(() => {
                db.run(`DELETE FROM order_items WHERE order_id IN (${orderIds.map(()=>'?').join(',')})`, orderIds, function(err2) {
                    if (err2) return res.status(500).json({ error: err2.message });
                    db.run('DELETE FROM orders WHERE customer = ?', [table], function(err3) {
                        if (err3) return res.status(500).json({ error: err3.message });
                        res.json({ success: true });
                    });
                });
            });
        });
    });
});

// Endpoint to clear orders_archive.json
app.post('/clear_orders_archive', (req, res) => {
    const archivePath = path.join(__dirname, 'orders_archive.json');
    fs.writeFile(archivePath, '{}', err => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// Move a specific item from one table's order to another table
app.post('/orders/move', (req, res) => {
    const { fromTable, toTable, orderTime, itemIndex } = req.body;
    if (!fromTable || !toTable || typeof orderTime === 'undefined' || typeof itemIndex === 'undefined') {
        return res.status(400).json({ error: 'Missing fields' });
    }
    // Find the source order
    db.get('SELECT * FROM orders WHERE customer = ? AND time = ?', [fromTable, orderTime], (err, order) => {
        if (err || !order) return res.status(404).json({ error: 'Order not found' });
        db.all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [order.id], (err2, items) => {
            if (err2 || !items || itemIndex < 0 || itemIndex >= items.length) {
                return res.status(404).json({ error: 'Order item not found' });
            }
            const itemToMove = items[itemIndex];
            // Remove the item from the source order
            db.run('DELETE FROM order_items WHERE id = ?', [itemToMove.id], function(err3) {
                if (err3) return res.status(500).json({ error: err3.message });
                // If the source order has no more items, delete the order
                db.get('SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?', [order.id], (err4, row) => {
                    if (!err4 && row.cnt === 0) {
                        db.run('DELETE FROM orders WHERE id = ?', [order.id]);
                    }
                });
                // Check if a target order for toTable at the same time exists
                db.get('SELECT * FROM orders WHERE customer = ? AND time = ?', [toTable, orderTime], (err5, targetOrder) => {
                    if (targetOrder) {
                        // Add the item to the existing order
                        db.run('INSERT INTO order_items (order_id, item, quantity, ingredients) VALUES (?, ?, ?, ?)',
                            [targetOrder.id, itemToMove.item, itemToMove.quantity, itemToMove.ingredients],
                            function(err6) {
                                if (err6) return res.status(500).json({ error: err6.message });
                                return res.json({ success: true });
                            }
                        );
                    } else {
                        // Create a new order for toTable at the same time
                        db.run('INSERT INTO orders (customer, time) VALUES (?, ?)', [toTable, orderTime], function(err7) {
                            if (err7) return res.status(500).json({ error: err7.message });
                            const newOrderId = this.lastID;
                            db.run('INSERT INTO order_items (order_id, item, quantity, ingredients) VALUES (?, ?, ?, ?)',
                                [newOrderId, itemToMove.item, itemToMove.quantity, itemToMove.ingredients],
                                function(err8) {
                                    if (err8) return res.status(500).json({ error: err8.message });
                                    return res.json({ success: true });
                                }
                            );
                        });
                    }
                });
            });
        });
    });
});

// Move all orders from one table to another
app.post('/orders/moveTable', (req, res) => {
    const { fromTable, toTable } = req.body;
    if (!fromTable || !toTable || fromTable === toTable) {
        return res.status(400).json({ error: 'Missing or invalid fields' });
    }
    // Update all orders for fromTable to toTable
    db.run('UPDATE orders SET customer = ? WHERE customer = ?', [toTable, fromTable], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Listen on all interfaces so other devices can connect
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Order server running at http://0.0.0.0:${PORT}`);
});
