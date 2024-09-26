const express = require('express');
const router = express.Router();
const authenticateToken = require('../Authtoken');
const pool = require('../db');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Products management
 */

/**
 * @swagger
 * /products_item:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Successfully retrieved products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   is_active:
 *                     type: boolean
 */
router.get('/products_item', authenticateToken, async (req, res) => {
    try {
        const all_products = await pool.query("SELECT id, name, is_active FROM products_item");
        res.json(all_products.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

/**
 * @swagger
 * /products_item/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Successfully retrieved product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 is_active:
 *                   type: boolean
 *       404:
 *         description: Product not found
 */
router.get('/products_item/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const product = await pool.query("SELECT id, name, is_active FROM products_item WHERE id = $1", [id]);
        if (product.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(product.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
