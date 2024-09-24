const express=require('express')
const UserModel=require('../schema/user_schema');
const Auction=require('../schema/auction_schema');
const Bid =require('../schema/bid_schema');
// const json = require('');

const route=express.Router();


function isLoggedIn(request,response,next){
    if(request.isAuthenticated()){
        next();
    }else{
        response.redirect('/login')
    }
}

// route.get('/home',isLoggedIn,async(request,response)=>{
//     return response.render('home');
// })



route.get('/home',isLoggedIn, async (request, response) => {
    try {
        const auctions = await Auction.find({ status: 'active' });
        const user=await UserModel.findOne({email:request.session.passport.user})

        if (!user) {
            throw new Error('User not found');
        }

        request.session.passport._id=user._id
        response.render('home', { auctions , userId: user._id });
    } 
    catch (error) {
        console.error('Error fetching auctions:', error);
        response.status(500).send('Error fetching auctions');
    }
})




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


setInterval(checkAuctions,60*1000);


module.exports = route