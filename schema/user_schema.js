    const mongoose = require('mongoose');


    const UserSchema=new mongoose.Schema({
        fullname: { 
            type: mongoose.Schema.Types.String, 
            required: true,  
        },
        email: { 
            type: mongoose.Schema.Types.String, 
            required: true, 
            unique: true 
        },
        password: { 
            type: mongoose.Schema.Types.String, 
            required: true 
        },
        profile_picture: { 
            type: mongoose.Schema.Types.String 
        },
        created_at: { 
            type: mongoose.Schema.Types.Date, 
            default: Date.now 
        },
        payment_methods: [{
            card_number: mongoose.Schema.Types.String,
            card_expiry: mongoose.Schema.Types.String,
            card_cvc: mongoose.Schema.Types.String,
        }],
        watchlist: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Auction' 
        }],
        bidding_history: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Bid' 
        }],
        role: { 
            type: mongoose.Schema.Types.String, 
            enum: ['buyer', 'seller', 'admin'], 
            default: 'buyer' 
        }
    });


    const UserModel=mongoose.model('User',UserSchema);

    module.exports = UserModel;