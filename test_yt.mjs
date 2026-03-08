const API_KEY = "AIzaSyCNPmpMXKsLfFv1MQ7Fdu9R1rsZ0rJCBH8";

fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=Ub3GoFaUcds&key=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
        console.log(JSON.stringify(data, null, 2));
    });
