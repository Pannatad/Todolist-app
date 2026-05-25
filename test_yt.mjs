import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_YOUTUBE_API_KEY;
console.log('API KEY IS:', API_KEY ? 'PRESENT' : 'MISSING');

fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=Ub3GoFaUcds&key=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
        console.log(JSON.stringify(data, null, 2));
    });
