const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://127.0.0.1:27017/ecommerce', { useNewUrlParser: true, useUnifiedTopology: true });

app.post('/cart/add', async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const user = await User.findById(userId);
        user.cart.push(productId);
        await user.save();
        res.status(200).json({ message: 'Product added to cart' });
    } catch (error) {
        res.status(500).json({ error: 'Error adding product to cart' });
    }
});


app.post('/cart/remove', async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const user = await User.findById(userId);
        user.cart = user.cart.filter(id => id.toString() !== productId);
        await user.save();
        res.status(200).json({ message: 'Product removed from cart' });
    } catch (error) {
        res.status(500).json({ error: 'Error removing product from cart' });
    }
});


app.post('/cart/update', async (req, res) => {
    const { userId, productId, quantity } = req.body; 
    try {
        const user = await User.findById(userId);
        const cartItem = user.cart.find(item => item.productId.toString() === productId);

        if (cartItem) {
            cartItem.quantity = quantity;
        } else {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        await user.save();
        res.status(200).json({ message: 'Cart updated' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating cart' });
    }
});



app.get('/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId).populate('cart');
        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching cart details' });
    }
});


app.post('/payment/initiate', async (req, res) => {
    const { userId, amount } = req.body;
    try {
        
        const response = await axios.post('https://sandbox.cashfree.com/pg/orders', {
            
        });

        const order = new Order({
            user: userId,
            products: [], 
            amount,
            paymentStatus: 'pending'
        });
        await order.save();
        res.status(200).json({ order, paymentLink: response.data.paymentLink });
    } catch (error) {
        res.status(500).json({ error: 'Error initiating payment' });
    }
});


app.post('/payment/webhook', async (req, res) => {
    const { orderId, paymentStatus } = req.body;
    try {
        const order = await Order.findById(orderId);
        order.paymentStatus = paymentStatus;
        await order.save();
        res.status(200).json({ message: 'Payment status updated' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating payment status' });
    }
});

app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
