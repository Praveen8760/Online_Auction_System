
const express=require('express')
const UserModel=require('../schema/user_schema');
const Auction=require('../schema/auction_schema');
const Bid =require('../schema/bid_schema');
const bcrypt=require('bcrypt')
const mongoose=require('mongoose')
const { upload } = require('../src/javascript/image_cloud');

const AuctionModel =require('../schema/auction_schema');
const CategoryModel=require('../schema/catagory_schema');
const send_wailtingList_email = require('../src/javascript/waitlist_Email.js');


const route=express.Router();


function isLoggedIn(request,response,next){
    if(request.isAuthenticated()){
        next();
    }else{
        response.redirect('/login')
    }
}





route.get('/home',isLoggedIn, async (request, response) => {
    try {
        const current_time=new Date();

        // current Auction data
        const auctions = await Auction.find({ status: 'active' ,start_time:{$lte:current_time},end_time:{$gt:current_time}});
        const user=await UserModel.findOne({email:request.session.passport.user})

        // getting upcoming auction data
        const upcomingAuctions=await Auction.find({start_time:{$gt:current_time},status:'active'});
        if (!user) {
            throw new Error('User not found');
        }

        request.session.passport._id=user._id
        response.render('home', {user, auctions , upcomingAuctions , userId: user._id });
    } 
    catch (error) {
        console.error('Error fetching auctions:', error);
        response.status(500).send('Error fetching auctions');
    }
})


// waiting List for Upcoming Auction

route.post('/join-waiting-list/:auctionId', isLoggedIn, async (req, res) => {
    const auctionId = req.params.auctionId;
    const userId = req.session.passport._id; // Ensure you have user ID from session

    try {
        // Find the auction by ID
        const auction = await Auction.findById(auctionId);
        const user=await UserModel.findOne({email:req.session.passport.user})
        if (!auction) {
            return res.status(404).send('Auction not found');
        }

        // Check if the user is already on the waiting list
        if (auction.waiting_list.includes(userId)) {
            return res.status(400).send('You are already on the waiting list.');
        }

        // Add the user to the waiting list
        auction.waiting_list.push(userId);
        await auction.save();

        send_wailtingList_email(user,auction);

        res.status(200).send('Successfully joined the waiting list.');
    } catch (error) {
        console.error('Error joining waiting list:', error);
        res.status(500).send('Error joining waiting list. Please try again later.');
    }
});


// profile routes

route.get('/profile',async(request,response)=>{
    const user=await UserModel.findOne({email:request.session.passport.user})
    return response.render('user/profile',{user})
})


route.post('/profile',async(request,response)=>{
    try {
        const { fullname, email, current_password, new_password, confirm_new_password, payment_method, } = request.body;
        
        
        // Find the user by their email
        const user = await UserModel.findOne({ email });

        if (!user) {
            response.redirect('profile');
        }

        // Check if current password matches


        // Update fields if provided
        if (new_password && new_password === confirm_new_password) {
            user.password = await bcrypt.hash(new_password, 10); // Hash the new password
        }

        user.fullname = fullname || user.fullname;
        user.email = email || user.email;

        // Update payment method
        if (payment_method) {
            user.payment_methods = [{
                card_number: payment_method.card_number,
                card_expiry: payment_method.card_expiry,
                card_cvc: payment_method.card_cvc,
            }];
        }

        // Save the updated user
        await user.save();

        // Redirect or send a success response
        response.redirect('profile');
    } catch (error) {
        console.error(error);
        response.redirect('profile');
    }
})


// add Auction routes
route.get('/addProduct',async(request,response)=>{
    const user=await UserModel.findOne({email:request.session.passport.user})
    response.render('user/add_product',{user})
})

route.post('/addProduct',upload.array('image',5),async(request,response)=>{
    try {
        const {body} = request;
        
        console.log(body);

        // Get the seller ID from the session
        const seller_id = request.session.passport._id;  
        console.log(seller_id);
        
        if (!seller_id) {
            console.log("seller ID");
            return response.status(401).send('You must be logged in to create an auction');
        }

        // Validate and process the category
        const category = await CategoryModel.findOneAndUpdate(
            { name: body.category },
            { name: body.category, updated_at: Date.now() },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Check for valid start and end times
        const startTimeParsed = new Date(body.startTime);
        const endTimeParsed = new Date(body.endTime);
        if (isNaN(startTimeParsed.getTime()) || isNaN(endTimeParsed.getTime())) {
            console.log("Time Issue");
            return response.status(400).send('Invalid start time or end time');
        }

        // Process the uploaded images from Cloudinary
        const imageUrls = request.files.map(file => file.path);
        if (imageUrls.length > 5) {
            console.log("Image");
            return response.status(400).send('You can upload a maximum of 5 images');
        }

        // Create the auction
        const newAuction=new AuctionModel({
            title:body.auctionName,
            description:body.description,
            images:imageUrls,
            starting_bid:body.startingBid,
            bid_increment:body.bidIncrement,
            start_time:startTimeParsed,
            end_time:endTimeParsed,
            seller_id:seller_id,
            status:'pending',
            category:category._id
        })
        console.log("Auction end");
        await newAuction.save();
        request.io.emit('newProduct', { productName: newAuction.title, productId: newAuction._id });
        response.redirect('home');
    } 
    catch (error) {
        console.error(error);
        response.status(500).send('Error creating auction');
    }   
});


// Bids History
// Route to fetch user's bids
route.get('/myBids', async (request, response) => {
    try {
        const userId = request.session.passport._id;  // Get the logged-in user's ID

        console.log('User ID:', userId);
        if (!userId) {
            return response.status(403).send('User not logged in');
        }
        const user=await UserModel.findOne({email:request.session.passport.user})

        
        // Fetch all bids for the user and populate auction details
        const bids = await Bid.find({ user_id: userId })
            .populate({
                path: 'auction_id',
                model: 'Auction',
                select: 'title description images starting_bid current_bid bid_increment start_time end_time status seller_id category',
                populate: { path: 'winner_id', model: 'User', select: 'fullname' }  
            })
            .exec();

        console.log('Fetched Bids:', bids);
        
        // Check if any bids were found
        if (bids.length === 0) {
            console.log('No bids found for user:', userId);
            return response.render('user/bids', { products: [], message: 'You haven\'t placed any bids yet.' });
        }

        // Group the bids by auction (product)
        const groupedBids = bids.reduce((acc, bid) => {
            const auctionId = bid.auction_id._id.toString();

            // Initialize auction entry if it doesn't exist
            if (!acc[auctionId]) {
                acc[auctionId] = {
                    auction: {
                        _id: bid.auction_id._id,
                        title: bid.auction_id.title,
                        description: bid.auction_id.description,
                        images: bid.auction_id.images,
                        starting_bid: bid.auction_id.starting_bid,
                        current_bid: bid.auction_id.current_bid,
                        bid_increment: bid.auction_id.bid_increment,
                        start_time: bid.auction_id.start_time,
                        end_time: bid.auction_id.end_time,
                        status: bid.auction_id.status,
                        seller_id: bid.auction_id.seller_id,
                        category: bid.auction_id.category,
                    },
                    bids: []
                };
            }
            
            // Add the current bid to the auction's bids array
            acc[auctionId].bids.push({
                _id: bid._id,
                amount: bid.amount.toString(),
                timestamp: bid.timestamp,
                status: bid.status
            });
            
            return acc;
        }, {});

        console.log('Grouped Bids:', groupedBids);
        
        // Convert the grouped bids object to an array for rendering
        const products = Object.values(groupedBids);

        // Render the bids view with grouped bids data
        response.render('user/bids', { products , user});
        
    } catch (err) {
        console.error('Error fetching bids:', err);
        response.status(500).send('Server error');
    }
});



async function checkAuctions() {
    const now = new Date();
    try {
        console.log('Checking for auctions to close at:', now); // Log current time
        
        const allAuctions = await Auction.find({ status: 'active' ,end_time :{$lte : now}});
        console.log('All active auctions:', allAuctions);
        
        if (allAuctions.length === 0) {
            console.log('No expired auctions found.');
        }

        for (const auction of allAuctions) {
            console.log(`Auction ${auction._id} (${auction.title}) has ended.`);

            // Find the highest bid for the auction
            const highestBid = await Bid.findOne({ auction_id: auction._id }).sort({ amount: -1 });

            if (highestBid) {
                // Mark the auction as completed
                auction.status = 'completed';
                await auction.save();

                // Fetch the winning user's email
                const winner = await UserModel.findById(highestBid.user_id);
                
                if (winner) {
                    console.log(`Winner for auction ${auction._id}: ${winner.email}`);
                    
                    // Send email to the winner
                    sendWinnerEmail(winner.email, auction.title, highestBid.amount);
                } else {
                    console.log(`No winner found for auction ${auction._id}`);
                }
            } else {
                console.log(`No bids found for auction ${auction._id}`);
            }
        }
    } catch (error) {
        console.error('Error checking auctions:', error);
    }
}


// Add this route in your Express app
route.get('/logout', (request, response) => {
    request.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('Server error');
        }

        // Destroy the session
        request.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return response.status(500).send('Server error');
            }

            
            request.redirect('/login'); 
        });
    });
});



setInterval(checkAuctions,60*1000);


module.exports = route