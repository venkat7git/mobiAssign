const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const { configDotenv } = require('dotenv');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));
dotenv.config();
mongoose.connect('mongodb://127.0.0.1:27017/ecommerce', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('error', (error) => console.log(error));





const toObjectId = (id) => { return mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : null; };


app.post('/users/add', async (req, res) => {
    const { username, email, password } = req.body; 
    try { 
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, cart: [] });
        await newUser.save(); res.status(201).json({ message: 'User added successfully', user: newUser }); 
    } catch (error) {
         if (error.code === 11000) { res.status(400).json({ error: 'Email already in use' }); 
} else { 
    res.status(500).json({ error: `Error adding user ${error}` }); 
} } 
});


app.post('/cart/add', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    try {
        const user = await User.findById((userId));
        if (!user) return res.status(404).json({ error: 'User not found' });
        const cartItem = user.cart.find(item => item.productId.toString() === productId);

        if (cartItem) {
            const newQuenity = cartItem.quantity + quantity;
            User.updateOne({userId},{$set:{"cart.$.quantity":newQuenity}});
            
        } else {
            User.updateOne({userId},{$push:{"cart":{productId,quantity}}});
            // user.cart.push({ productId, quantity });
        }

        // await user.save();
        res.status(200).json({ message: 'Product added to cart' });
    } catch (error) {
        res.status(500).json({ error: `Error adding product to cart ${error}` });
    }
});


app.post('/cart/remove', async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const user = await User.findById(userId);
        user.cart = user.cart.filter(item => item.productId.toString() !== productId);
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
        const user = await User.findById(userId).populate('cart.productId');
        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).json({ error: `Error fetching cart details ${error}` });
    }
});


app.post('/payment/initiate', async (req, res) => {
    const { userId,amount } = req.body;
    try {
        
        const response = await axios.post('https://sandbox.cashfree.com/pg/orders', {
            "customer_details": {
              "customer_id": "jhhgjhgj3665",
              "customer_phone": "9052160833"
            },
            "order_id": "56654667",
            "order_amount": 25,
            "order_currency": "INR"
          },{
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-client-id': process.env.CLIENT_ID,
                'x-client-secret': process.env.CLIENT_SECRET
            }
        });

        


        const order = new Order({
            user: userId,
            products: [], 
            amount,
            paymentStatus: 'pending'
        });
        await order.save();
        
        res.status(200).json({ order, paymentLink:response.data.paymentLink });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: `Error initiating payment ${error}` });
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
app.get('/users', async (req, res) => {
     try { const users = await User.find(); 
        res.status(200).json(users); } 
        catch (error) {
            res.status(500).json({ error: 'Error fetching users' }); 
        } });


app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
