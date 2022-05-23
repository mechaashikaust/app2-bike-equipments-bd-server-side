const express = require('express')
const cors = require('cors');
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// var nodemailer = require('nodemailer');
// var sgTransport = require('nodemailer-sendgrid-transport');
// const stripe = require('stripe')('sk_test_51L27KODAkvG9mHY4dhbSwva03SNuTXSNAHklAOT0xXC2WpHqQKMIZnp5ZylhymUYjPC6GgOdAEB63GzujJNHcGKw00A0NfAIQU');

require('dotenv').config();
// const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());









app.get('/', (req, res) => {
    res.send('Hello From Doctors Portal Server!')
})

app.listen(port, () => {
    console.log(`Doctors App listening on port ${port}`)
})