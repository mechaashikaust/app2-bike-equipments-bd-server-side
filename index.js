const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
const stripe = require('stripe')('sk_test_51L27KODAkvG9mHY4dhbSwva03SNuTXSNAHklAOT0xXC2WpHqQKMIZnp5ZylhymUYjPC6GgOdAEB63GzujJNHcGKw00A0NfAIQU');

require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.awau4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




// {4} My Appointemnts with verifying JWT

function verifyJWT(req, res, next) {
    //1///////////////////////////////////////
    const authHeader = req.headers.authorization;

    //2///////////////////////////////////////
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized' });
    }
    //3////////////////////////////////////////
    const token = authHeader.split(' ')[1];

    //4////////////////////////////////////////
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;

        //5/////////////////////////////////////////
        next();

    });

}



// Send GRID // start

const emailSenderOptions = {
    auth: {
        api_key: process.env.EMAIL_SENDER_KEY
    }
}

const emailClient = nodemailer.createTransport(sgTransport(emailSenderOptions));

function sendAppointmentEmail(booking) {
    const { user, email, itemName, price, quantity } = booking;

    var email2 = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: `Your Appointment for ${itemName} is on ${price} at ${quantity} is Confirmed`,
        text: `Your Appointment for ${itemName} is on ${price} at ${quantity} is Confirmed`,
        html: `
        <div>
          <p> Hello ${user}, </p>
          <h3>Your Appointment for ${itemName} is confirmed</h3>
          <p>Looking forward to seeing you on ${price} at ${quantity}.</p>
          
          <h3>Our Address</h3>
          <p>Andor Killa Bandorban</p>
          <p>Bangladesh</p>
          <a href="https://web.programming-hero.com/">unsubscribe</a>
        </div>
      `
    };

    emailClient.sendMail(email2, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Message sent: ', info);
        }
    });

}


// console.log(uri);







async function run() {
    try {
        await client.connect();

        // Equipment Collection
        const equipmentCollection = client.db('bike_equipments_bd').collection('equipment');
        
        
        //New Equipment Collection
        const newEquipmentCollection = client.db('bike_equipments_bd').collection('newEquipment');

        // Booking Collection
        const bookingCollection = client.db('bike_equipments_bd').collection('bookings');

        // // Users Collection
        const usersCollection = client.db('bike_equipments_bd').collection('users');

        // // Doctors Collection
        // const doctorCollection = client.db('bike_equipments_bd').collection('doctors');

        // // Payment Collection
        const paymentCollection = client.db('bike_equipments_bd').collection('payments');



        // Verifying admin for doctors         (after image uploading) 
        const verifyAdmin = async (req, res, next) => {

            //Copied from jwt
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                //Copied from jwt // END

                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }




        // {13} Calculate Order Amount (https://stripe.com/docs/payments/quickstart)

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });




        // {7} Checking that are you admin or not
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        // {6} Admin

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;

            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);

            res.send({ result });


        })





        // {3} users set to the DB, can't login same email twice with 3 login methods (login, registratin, googlesignin)

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

            res.send({ result, token });
        })



        // {5} get All Users

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        })






        // {4} My Appointemnts with verifying JWT

        app.get('/booking', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
        })

        // {12} Get data for Payment route for a specific id.

        app.get('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })


        // {2}  Add a new specific Booking

        app.post('/booking', async (req, res) => {
            const booking = req.body;

            // Let a Booking had done. I shouldn't apply a same booking again. 
            // So, we will check that does the user booked an item before or not
            const query = { itemName: booking.itemName }
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }


            const result = await bookingCollection.insertOne(booking);

            // SendGrid (mail verification)
            sendAppointmentEmail(booking);

            return res.send({ success: true, result });
        });




        // {13} Payment Updating

        app.patch('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await bookingCollection.updateOne(filter, updatedDoc);
            sendPaymentConfirmationEmail(booking);
            res.send(updatedBooking);
        })









        // {9} equipment Adding & image Uploading

        app.post('/equipment', verifyJWT, verifyAdmin, async (req, res) => {
            const equipment2 = req.body;
            const result = await equipmentCollection.insertOne(equipment2);
            res.send(result);
        })



        // Get All Equipments From DB

        app.get('/equipment', async (req, res) => {
            const query = {};
            const cursor = equipmentCollection.find(query);
            const equipments = await cursor.toArray();
            res.send(equipments);
        })

        app.get('/equipment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const equipment = await equipmentCollection.findOne(query);
            res.send(equipment);
        })

        {/********************************* Update your Order Quantity Here! **************************************/ }
        app.put('/equipment/:id', async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };

            const updatedDoc = {
                $set: {
                    minimumOrderQuantity: updatedUser.minimumOrderQuantity,
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