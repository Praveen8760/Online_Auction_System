const express = require('express');

const mongoose =require('mongoose');
const passport=require('passport');
const http = require('http');
const socketIo = require('socket.io');
const local=require('./strategy/local_strategy');

const GoogleStrategy=require('./strategy/google_auth')

const MongoStore=require('connect-mongo');

const User=require('./schema/user_schema')



const bodypareser=require('body-parser');
const session =require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');


// routes
const LoginRoute=require('./routes/login_route');
const RegisterRoute = require('./routes/register_route');
const Main_route=require('./routes/main_route');
const admin=require('./routes/admin_route');

const google_auth=require('./routes/google_auth_route');



const app=express();
const PORT=process.env.PORT || 3000;

const server=http.createServer(app)
const io=socketIo(server)



// Database connection

const DB=mongoose.connect("mongodb://localhost:27017/auction_App")
.then(()=>{
    console.log("DB Conneted");
})
.catch((err)=>{
    console.log("Database Error");
})



// const uri="mongodb+srv://praveen8760:praveen890340@auctionsystemdatabase.zyyid.mongodb.net/?retryWrites=true&w=majority&appName=AuctionSystemDatabase"
// const DB=mongoose.connect(uri)
// .then(()=>{
//     console.log("DB");
//     mongoose.connection.db.admin().ping();
// })
// .then(async() => {
//     console.log("Pinged the database, connection is active");
//     const newUser=await User.create({
//         fullname:'testUser',
//         password:"testUser",
//         email:"hello2@gmail.com"
//     });
//     newUser.save()
//     console.log("done");
    
// })
// .catch((err)=>{
//     console.log(err);
    
// })



    





// template engine
app.set('view engine','ejs');

// static file
app.use(express.static('src'))
app.use(express.static('public'))

// middleWare
app.use(express.json())
app.use(bodypareser.json())
app.use(bodypareser.urlencoded({
    extended:true
}))

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser("Auction_system"))



app.use(session({
    secret:"Auction_system",
    saveUninitialized:true,
    resave:true,
    cookie:{
        maxAge: 1000 * 60 * 60 * 24, // 1-day
    },
    store:MongoStore.create({
        // mongoUrl:uri,
        client:mongoose.connection.getClient(),
    })
}))

app.use(flash());

app.use(passport.initialize())
app.use(passport.session())


app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});


// route middelware
app.use('/',RegisterRoute);
app.use('/',LoginRoute);
app.use('/', Main_route);
app.use('/admin',admin);

// app.use('/google',google_auth);


require('./src/javascript/socket')(io);


app.get('/',(request,response)=>{
    return response.render('home')
})


server.listen(PORT,(err)=>{
    if(err){
        console.log("server Error");
    }
    else{
        console.log(`Server running in PORT: ${PORT}`);
       
    }
})

