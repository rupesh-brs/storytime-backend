import express from 'express';
import { createUser, verifyEmail, loginUser, generateSpotifyRefreshToken, getUserProfile, updateUserProfile, updatePreferredLanguage, updatePassword, forgotPassword, resetPassword, saveSpotifyStory, removeSpotifyStory, getSpotifyStories} from '../controllers/userController.js';
import { checkToken } from '../middleware/authMiddleware.js';



const router = express.Router()


router.post('/register',createUser);
router.get("/verifyEmail/:verify_token",verifyEmail);
router.post("/login",loginUser);
router.get("/refreshToken",checkToken, generateSpotifyRefreshToken);
router.get("/profile", checkToken, getUserProfile);
router.post("/profile",checkToken, updateUserProfile);
router.post("/preferredlanguage",checkToken, updatePreferredLanguage);
router.post("/updatepassword",checkToken, updatePassword);
router.post("/forgotpassword",forgotPassword);
router.post("/resetpassword/:token",resetPassword);
router.post("/savestory",checkToken, saveSpotifyStory);
router.delete("/removestory", checkToken, removeSpotifyStory);
router.get("/library", checkToken, getSpotifyStories);





export default router;         