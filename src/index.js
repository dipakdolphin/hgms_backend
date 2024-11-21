const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const authenticateToken = require('./Authtoken');

const app = express();

app.use(express.json());
require('dotenv').config();

app.use(cors({
    origin: '*'
}));

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.status(201).send('User registered successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ username: user.username }, process.env.SECRET_KEY);
            // Add token to the database
            await pool.query('UPDATE users SET token = $1 WHERE username = $2', [token, username]);
            res.json({ token });
        } else {
            res.status(401).send('Invalid username or password');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post('/logout', async (req, res) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(400).send('Token is missing');
    }

    try {
        // Remove token from the database
        await pool.query('UPDATE users SET token = NULL WHERE token = $1', [token]);
        res.status(200).send('Logout successful');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post('/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).send('User not found');
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashedNewPassword, username]);

        res.status(200).send('Password reset successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


app.get('/products_item', authenticateToken, async (req, res) => {
    try {
        const all_products = await pool.query("SELECT id, name, is_active FROM products_item");
        res.json(all_products.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get('/products_item/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const product = await pool.query("SELECT id, name, is_active FROM products_item WHERE id = $1", [id]);
        if (product.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(product.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.post('/products_item', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const created_by_id = req.user && req.user.id;

        if (!created_by_id) {
            return res.status(400).json({ error: 'User ID not found' });
        }

        // Check if the product name already exists
        const existingProduct = await pool.query(
            "SELECT * FROM products_item WHERE name = $1",
            [name]
        );

        if (existingProduct.rows.length > 0) {
            return res.status(400).json({ error: 'Product name already exists' });
        }

        // Insert the new product if name doesn't exist
        const new_product = await pool.query(
            "INSERT INTO products_item (name, created_by_id, is_active) VALUES ($1, $2, true) RETURNING *",
            [name, created_by_id]
        );

        res.status(201).json(new_product.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});


app.put('/products_item/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updated_by_id = req.user && req.user.id;
        const { name, is_active } = req.body;
        const update_product = await pool.query(
            "UPDATE products_item SET name = $1, updated_by_id = $2, is_active = $3 WHERE id = $4 RETURNING *",
            [name, updated_by_id, is_active, id]
        );
        if (update_product.rows.length === 0) {
            return res.status(404).json({ error: "No products found" });
        }
        res.json(update_product.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.delete('/products_item/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM products_item WHERE id = $1", [id]);
        res.json("Product deleted");
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Unit Routes
app.post("/create_unit", authenticateToken, async (req, res) => {
    try {
        const { unit_name, code } = req.body;
        const created_by_id = req.user && req.user.id;
        if (!created_by_id) {
            return res.status(400).json({ error: 'User ID not found' });
        }

        // Check if the unit name or code already exists
        const existingUnit = await pool.query(
            "SELECT * FROM products_unit WHERE unit_name = $1 OR code = $2",
            [unit_name, code]
        );

        if (existingUnit.rows.length > 0) {
            return res.status(400).json({ error: 'Unit name or code already exists' });
        }

        const create_unit = await pool.query(
            "INSERT INTO products_unit (unit_name, created_by_id, code, is_active) VALUES ($1, $2, $3, true) RETURNING *",
            [unit_name, created_by_id, code]
        );

        res.status(201).json(create_unit.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


app.get("/all_unit", authenticateToken, async (req, res) => {
    try {
        const get_all_unit = await pool.query("SELECT id, unit_name, code, is_active FROM products_unit");
        res.json(get_all_unit.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});


app.get("/unit/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const unit = await pool.query("SELECT id, unit_name, code FROM products_unit WHERE id = $1", [id]);
        if (unit.rows.length === 0) {
            return res.status(404).json({ error: "Unit not found" });
        }
        res.json(unit.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.put("/unit/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { unit_name, code } = req.body;
        const updatedUnit = await pool.query(
            "UPDATE products_unit SET unit_name = $1, code = $2 WHERE id = $3 RETURNING *",
            [unit_name, code, id]
        );
        if (updatedUnit.rows.length === 0) {
            return res.status(404).json({ error: "Unit not found" });
        }
        res.json(updatedUnit.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.delete("/unit/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM products_unit WHERE id = $1", [id]);
        res.json({ message: "Unit deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Orders Routes
app.get("/grocery_orders", authenticateToken, async (req, res) => {
    try {
        const get_all_orders = await pool.query("SELECT id, name, TO_CHAR(from_date, 'YYYY/MM/DD') as from_date, TO_CHAR(to_date, 'YYYY/MM/DD') as to_date, is_end FROM products_groceryorder");
        res.json(get_all_orders.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.post('/grocery_orders', authenticateToken, async (req, res) => {
    try {
        const { name, from_date, to_date, is_end } = req.body;
        const created_by_id = req.user && req.user.id;
        if (!name || !from_date || !to_date || is_end === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (from_date > to_date) {
            return res.status(400).json({ error: 'From date cannot be greater than to date' });
        }
        const dateFormatRegex = /^\d{4}\/\d{2}\/\d{2}$/;
        if (!dateFormatRegex.test(from_date) || !dateFormatRegex.test(to_date)) {
            return res.status(400).json({ error: 'Invalid date format. Date format should be YYYY/MM/DD' });
        }

        // Check if an order with the same name already exists
        const existingOrder = await pool.query(
            'SELECT * FROM products_groceryorder WHERE name = $1',
            [name]
        );

        if (existingOrder.rows.length > 0) {
            return res.status(400).json({ error: 'An order with this name already exists' });
        }

        const newGroceryOrder = await pool.query(
            'INSERT INTO products_groceryorder (name, from_date, to_date, is_end, created_by_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, from_date, to_date, is_end, created_by_id]
        );
        res.status(201).json(newGroceryOrder.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.put("/grocery_orders/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updated_by_id = req.user && req.user.id;
        const { name, from_date, to_date, is_end } = req.body;
        const update_grocery_order = await pool.query(
            "UPDATE products_groceryorder SET name = $1, updated_by_id = $2, is_end = $3, from_date = $4, to_date = $5 WHERE id = $6 RETURNING *",
            [name, updated_by_id, is_end, from_date, to_date, id]
        );
        if (update_grocery_order.rows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.json(update_grocery_order.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.post('/create_grocery_order_item', authenticateToken, async (req, res) => {
    try {
        const { rate, order_id, product_id, unit_id, quantity } = req.body;
        const created_by_id = req.user && req.user.id;

        if (!rate || !order_id || !product_id || !unit_id || !quantity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const newOrderItem = await pool.query(
            'INSERT INTO products_groceryorderitem (rate, created_by_id, order_id, product_id, unit_id, quantity, updated_by_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [rate, created_by_id, order_id, product_id, unit_id, quantity, created_by_id]
        );
        res.status(201).json(newOrderItem.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});
app.get("/order_details/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const order_details = await pool.query(
            "SELECT pg.id AS orderId,pi.id as ProductId, pi.name, pu.unit_name AS unit, pgi.rate, pgi.quantity, pgi.total_amount AS total " +
            "FROM products_groceryorderitem pgi " +
            "JOIN products_item pi ON pi.id = pgi.product_id " +
            "JOIN products_unit pu ON pgi.unit_id = pu.id " +
            "JOIN public.products_groceryorder pg ON pgi.order_id = pg.id " +
            "WHERE pg.id = $1",
            [id]
        );
        res.json(order_details.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get("/order_by_id/:id?", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        let query = "SELECT pg.id, pi.name, pu.unit_name AS unit, pgi.rate, pgi.quantity, pgi.total_amount AS total " +
            "FROM products_groceryorderitem pgi " +
            "JOIN products_item pi ON pi.id = pgi.product_id " +
            "JOIN products_unit pu ON pgi.unit_id = pu.id " +
            "JOIN public.products_groceryorder pg ON pgi.order_id = pg.id";
        if (id) {
            query += " WHERE pi.id = $1";
        }

        const order_details = await pool.query(query, id ? [id] : []);
        res.json(order_details.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get("/chart_data", authenticateToken, async (req, res) => {
    try {
        const query = "SELECT p.name, cast( SUM(total_amount)as numeric) as total_amount " +
            "FROM products_groceryorderitem pg " +
            "JOIN public.products_groceryorder p ON pg.order_id = p.id " +
            "GROUP BY order_id, p.name";
        const report_data = await pool.query(query);
        const mappedData = report_data.rows.map(item => ({
            name: String(item.name),                 // Ensure name is a string
            total_amount: Number(item.total_amount)  // Ensure total_amount is numeric
        }));
        // res.json(report_data.rows);
        res.json(mappedData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get("/product_price/:product_id", authenticateToken, async (req, res) => {
    try {
        const { product_id } = req.params;
        
        const priceHistory = await pool.query(
            `select  pi.name as ProductName, rate, pgo.name as OrderName, Date(pgi.created_at) as date  from products_groceryorderitem pgi
                join products_item pi on pgi.product_id = pi.id
                 join products_groceryorder pgo on pgi.order_id = pgo.id
             where product_id = $1
             ORDER BY pgi.created_at DESC`,
            [product_id]
        );
        if (priceHistory.rows.length === 0) {
            return res.status(404).json({ 
                error: "No price history found for this product" 
            });
        }

        res.json(priceHistory.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

let port = 9092;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
