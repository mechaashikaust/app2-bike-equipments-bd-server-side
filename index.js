const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// var nodemailer = require('nodemailer');
// var sgTransport = require('nodemailer-sendgrid-transport');
// const stripe = require('stripe')('sk_test_51L27KODAkvG9mHY4dhbSwva03SNuTXSNAHklAOT0xXC2WpHqQKMIZnp5ZylhymUYjPC6GgOdAEB63GzujJNHcGKw00A0NfAIQU');

require('dotenv').config();
// const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.awau4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// console.log(uri);

async function run() {
    try {
        await client.connect();

        // Equipment Collection
        const equipmentCollection = client.db('bike_equipments_bd').collection('equipment');
        // Booking Collection
        // const bookingCollection = client.db('bike_equipments_bd').collection('bookings');
        // // Users Collection
        // const usersCollection = client.db('bike_equipments_bd').collection('users');
        // // Doctors Collection
        // const doctorCollection = client.db('bike_equipments_bd').collection('doctors');
        // // Payment Collection
        // const paymentCollection = client.db('bike_equipments_bd').collection('payments');



        // Get All Services From DB
        // {8} Add Doctors data getting  => .project({ name: 1 })
        app.get('/equipment', async (req, res) => {
            const query = {};
            const cursor = equipmentCollection.find(query)/*.project({ name: 1 })*/;
            const equipments = await cursor.toArray();
            res.send(equipments);
        })

        app.get('/equipment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const equipment = await equipmentCollection.findOne(query);
            res.send(equipment);
        })


        app.put('/equipment/:id', async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };

            const updatedDoc = {
                $set: {
                    // name: updatedUser.name,
                    // price: updatedUser.price,
                    minimumOrderQuantity: updatedUser.minimumOrderQuantity,
                    // availableQuantity: updatedUser.availableQuantity
                    // description: updatedUser.description
                    // img: updatedUser.img
                }
            };
            const result = await equipmentCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })








        

    }

    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello From Bike Equipments BD!')
})

app.listen(port, () => {
    console.log(`Bike Equipments BD listening on port ${port}`)
})