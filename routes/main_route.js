const express=require('express')
const UserModel=require('../schema/user_schema');
// const json = require('');

const route=express.Router();


function isLoggedIn(request,response,next){
    if(request.isAuthenticated()){
        next();
    }
    response.redirect('/login')
}

route.get('/home',isLoggedIn,async(request,response)=>{
    return response.send("welcome")
})


module.exports = route