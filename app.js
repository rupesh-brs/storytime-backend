import express from "express";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import { connect } from "mongoose";
import { errorHandler, notFound} from "./src/middleware/errMiddleware.js";

import { sendEmailVerificationLink } from "./src/utils/utils.js";
//Routes for fetching data 
import languageRoute from './src/routes/languageRoute.js';
import categoryRoute from './src/routes/categoryRoute.js';
import userRoute from './src/routes/userRoute.js';
//cors
import cors from 'cors'
dotenv.config();
connectDB();
const app = express();
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended:true}))

console.log('MongoDB URI:', process.env.MONGO_URI);

app.get('/',(req,res)=>{
     res.send("Story-Time-BackEnd");    
});
app.use('/api/languages',languageRoute)
app.use("/api/categories", categoryRoute);
app.use("/api/users", userRoute);
app.use(notFound);
app.use(errorHandler);
const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`App starting at ${PORT}`);
});





