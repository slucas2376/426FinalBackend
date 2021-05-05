const express = require('express');

const cors = require('cors');

//const cookieParser = require('cookie-parser')

const app = express();

// let corsOrigin = "http://localhost:3000";
// let corsOrigin = "174.111.45.28"  // owen
// let corsOrigin = "http://24.106.176.98" // raj
let corsOrigin = "https://426twitter20.com";
//let corsOrigin = "https://slucas2376.github.io"

//app.use(cookieParser());

const config = {
    origin: corsOrigin,
    methods: 'GET,PUT,POST,DELETE,OPTIONS',
    credentials: true,
    exposedHeaders: ["set-cookie"]
};

app.use(cors(config));

/*
app.use(cors({
    origin: corsOrigin,
    credentials: true
}));
*/

/*
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});
*/

const Tweet = require('./Tweet.js');

const User = require('./User.js');
const userData = require('data-store')({path: process.cwd() + '/data/users.json'});

app.use(express.json());
app.use(express.urlencoded());


const session = require('express-session');

app.set('trust proxy', 1);

app.use(session({
    cookie: {
        domain: 'api.426twitter20.com',
        sameSite: 'none',
        secure: true,
        maxAge: 5184000000
    },
    name: "defNotTwitterSessionCookie",
    secret: "coronavirus really needs to just Not(tm)",
    resave: false,
    saveUninitialized: false,
    proxy: true // true for heroku
}));

// const cookieSession = require('cookie-session');

/*app.use(cookieSession({
    name: "defNotTwitterSessionCookie",
    secret: "coronavirus really needs to just Not(tm)",
    secureProxy: true,
    cookie: {
        secure: true,
        maxAge: 5184000000,
        sameSite: "none",
        path: "/"
    }
}))*/



app.options('/login', cors(config));
// login/user database interaction API
app.post('/login', (req, res) => {
    // requires parameters userId and password, sends true if successful
    // lmao what's an """encryption""", seriously don't use passwords you care about here
    // maybe add logic to check if a user is already logged in, then send 400 already logged in?
    let userId = req.body.userId;
    if (userId == "") {res.status(400).send("400 bad request: invalid username"); return;}
    let password = req.body.password;
    if (password == "") {res.status(400).send("400 bad request: invalid password"); return;}
    let loginData = User.findById(userId);
    if (loginData == null || loginData == undefined || loginData == {}) {
        res.status(404).send("404: user not found");
        return;
    }
    if (loginData.password == password) {
        // successful login
        console.log("password correct; starting login process");
        req.session.regenerate(() => {});
        console.log("logging in for: " + userId + " | " + req.session.user + " logged in");
        console.log("property did not exist; attempting initialization on user: " + userId);
        //res.cookie('user', userId, {expires: new Date(Date.now() + 9999999), httpOnly: false});
        req.session.user = userId;
        req.session.save(() => {});
        console.log("initialized for user " + req.session.user);
        res.send(`${User.findById(userId)}`);
        return;
    }
    res.status(403).send("403 forbidden: username or password incorrect");
});


app.options('/logout', cors(config));
app.get('/logout', (req, res) => {
    // logs out current user, sends back true
    // delete req.session.user;
    console.log("user " + req.session.user + " logged out");
    req.session.destroy();
    res.json(true);
    return;
})

app.options('/register', cors(config));
app.post('/register', (req, res) => {
    // takes fields of (str) userId, (str) displayName, (str) password, (str image link) avatar (avatar is optional and defaults to whatever link we find for default)
    // sends back true on successful registration
    let userId = req.body.userId;
    let displayName = req.body.displayName;
    let password = req.body.password;
    let avatar = req.body.avatar;
    if (userId.length == 0 || displayName.length == 0 || password.length == 0 || avatar.length == 0) {
        res.status(400).send("400 bad request: parameter too short");
        return;
    }
    if (User.findById(userId).id == userId) { res.status(400).send("400 bad request: user already exists") };
    if (userId.length > 16 || displayName.length > 32 || password.length > 24 || avatar.length > 300) {
        res.status(400).send("400 bad request: parameter too long");
        return;
    }
    let u = User.create(userId, displayName, password, avatar);
    console.log("new user created: " + u);
    res.json(true);
    return;
})

app.get('/users/idnames/:parameter', (req, res) => {
    // sends array of JSON objects containing a userId field and a displayName field, for all registered users
    let pairs = User.getAllIdNamePairs();
    let arr = []
    for (u of pairs) {
        if (u.userId.includes(req.params.parameter)) {
            arr.push(u);
        } else if (u.displayName.includes(req.params.parameter)) {
            arr.push(u);
        }
    }
    //res.json(pairs.map(e => e.userId));
    res.json(arr);
    return;
})

app.get('/users', (req, res) => {
    // if logged in as admin, gets list of all user objects
    if (User.findById(req.session.user).type == "admin") {
        res.json(User.getAll());
        return;
    }
    res.status(403).send("403 forbidden");
    // nonfunctional get all user view objects, for not admin
    /*    res.json(User.getAllView());
        return;*/
})

app.options('/users/current', cors(config));
app.get('/users/current', (req, res) => {

    console.log("current user is: " + req.session.user);
    let user = req.session.user;
    console.log(user);
    let u = User.findById(user);
    console.log(u);
    res.json(u);
})

app.options('/users/:id', cors(config));
app.get('/users/:id', (req, res) => {
    // sends JSON object User for the relevant id, will only include password field if logged in as that user or account type admin
    let u = User.findById(req.params.id);
    if ((req.session.user == u.id) || (User.findById(req.session.user).type == "admin")) {
        res.json(u);
        return;}
    if (u != null && u != undefined && u != {}) {
        res.json(User.makeView(u));
        return;
    }
    res.status(404).send("404: user not found");
})

app.put('/users/:id/', (req, res) => {
    // sends true if successful update of user data
    let currUser = User.findById(req.session.user);
    if ((currUser.id == req.params.id) || (currUser.type == "admin")) {
        let targetUser = User.findById(req.params.id);
        if (targetUser == {}) {
            res.status(404).send("404: user not found")
            return;
        }
        let displayName = req.body.displayName;
        let password = req.body.password;
        let avatar = req.body.avatar;
        let desc = req.body.profileDescription;
        if (displayName.length == 0) {displayName = targetUser.displayName};
        if (password.length == 0) {password = targetUser.password};
        if (avatar.length == 0) {avatar = targetUser.avatar};
        if (desc.length == 0) {desc = targetUser.profileDescription}
        if (displayName.length > 32 || password.length > 24 || avatar.length > 300) {
            res.status(400).send("400 bad request: parameter too long");
            return;
        }
        User.update(req.params.id, displayName, password, avatar, desc);
        res.json(true);
        return;
    }
    else {res.status(403).send("403 forbidden");}
})

app.delete('/users/:id', (req, res) => {
    // deleting user; need to either be logged in as that user or as admin, sends back true on success
    // also deletes all user-posted tweets
    let currUser = User.findById(req.session.user);
    if ((currUser.id == req.params.id) || (currUser.type == "admin")) {
        let tweets = User.findById(req.params.id).postedTweets;
        let t = "";
        for (t of tweets) {
            Tweet.delete(t);
        }
        let temp = User.delete(req.params.id);
        req.session.regenerate(() => {});
        if (temp) {res.json(true);
            return;}
        res.status(400).send("400 bad request: user could not be deleted");
        return;
    }
    if ((currUser == undefined) || (currUser == null)) { res.status(404).send("404: no user found"); return;};
    res.status(403).send("403 forbidden");

})

// tweet API
app.get('/tweets/allIDs', (req, res) => {
    // sends out array of integer IDs for all tweet objects, in ascending order of creation
    res.json(Tweet.getAllIds());
    return;
});

app.get('/tweet/:id', (req, res) => {
    // finds tweet by tweet ID, sends out tweet object
    let t = Tweet.findById(req.params.id);
    if (t == null) {
        res.status(404).send("404: Tweet could not be found.");
        return;
    }
    if (t.isDeleted) {res.json("Tweet has been deleted."); return;}
    t = Tweet.generateView(t.id);
    if (req.session.user = t.userId) { t.isMine = true; }
    let likedTweets = User.findById(req.session.user).likedTweets;
    if (likedTweets != undefined && likedTweets.includes(t.id)) { t.isLiked = true; }
    res.json(t);
    return;
});

app.get('/tweets/recent', (req, res) => {
    // sends out array of (limit) most recent Tweet objects in descending order of posting
    let limit = 75;
    let current = Tweet.nextId - 1;
    let last = current - limit;
    let arr = [];
    while (limit > 0) {
        let t = Tweet.findById(current);
        if (!t.isDeleted && !(t == {})) {
            // generate the usertweet object for current
            t = Tweet.generateView(t.id);
            if (req.session.user = t.userId) { t.isMine = true; }
            let likedTweets = User.findById(req.session.user).likedTweets;
            if (likedTweets != undefined && likedTweets.includes(t.id)) { t.isLiked = true; }
            arr.push(t);
            limit -= 1;
        }
        current -= 1;
        if (current < 0) {break;}
    }
    res.json(arr);
    return;
})

app.get('/tweets/user/likes/:userId', (req, res) => {
    // sends out array of tweets, all by author :userId, in descending order of posting, liking, or retweeting
    let limit = 75;
    let user = User.findById(req.params.userId);
    if (user == {}) {res.status(404).send("404: user not found"); return;};
    let readArr = [];
    readArr = user.likedTweets.map(e => e)
    if (readArr.length == 0) {res.status(404).send("404: user has no such tweets."); return;}
    let current = readArr.length - 1;
    let last = current - limit;
    if (last < 0) {last = 0;}
    let arr = [];
    while (limit > 0) {
        let t = Tweet.findById(readArr[current]);
        if (!t.isDeleted && !(t == {})) {
            // generate the usertweet object for current
            t = Tweet.generateView(t.id);
            if (req.session.user = t.userId) { t.isMine = true; }
            let likedTweets = User.findById(req.session.user).likedTweets;
            if (likedTweets != undefined && likedTweets.includes(t.id)) { t.isLiked = true; }
            arr.push(t);
            limit -= 1;
        }
        current -= 1;
        if (current < 0) {break;}
    }
    res.json(arr);
    return;
})

app.get('/tweets/user/posts/:userId', (req, res) => {
    // sends out array of tweets, all by author :userId, in descending order of posting, liking, or retweeting
    let limit = 75;
    let user = User.findById(req.params.userId);
    if (user == {}) {res.status(404).send("404: user not found"); return;};
    let readArr = [];
    readArr = user.postedTweets.map(e => e);
    if (readArr.length == 0) {res.status(404).send("404: user has no such tweets."); return;}
    let current = readArr.length - 1;
    let last = current - limit;
    if (last < 0) {last = 0;}
    let arr = [];
    while (limit > 0) {
        let t = Tweet.findById(readArr[current]);
        if (!t.isDeleted && !(t == {})) {
            // generate the usertweet object for current
            t = Tweet.generateView(t.id);
            if (req.session.user = t.userId) { t.isMine = true; }
            let likedTweets = User.findById(req.session.user).likedTweets;
            if (likedTweets != undefined && likedTweets.includes(t.id)) { t.isLiked = true; }
            arr.push(t);
            limit -= 1;
        }
        current -= 1;
        if (current < 0) {break;}
    }
    res.json(arr);
    return;
})

app.get('/tweets/user/retweets/:userId', (req, res) => {
    // sends out array of tweets, all by author :userId, in descending order of posting, liking, or retweeting
    let limit = 75;
    let user = User.findById(req.params.userId);
    if (user == {}) {res.status(404).send("404: user not found"); return;};
    let readArr = [];
    readArr = user.hasRetweeted.map(e => e);
    if (readArr.length == 0) {res.status(404).send("404: user has no such tweets."); return;}
    let current = readArr.length - 1;
    let last = current - limit;
    if (last < 0) {last = 0;}
    let arr = [];
    while (limit > 0) {
        let t = Tweet.findById(readArr[current]);
        if (!t.isDeleted && !(t == {})) {
            // generate the usertweet object for current
            t = Tweet.generateView(t.id);
            if (req.session.user = t.userId) { t.isMine = true; }
            let likedTweets = User.findById(req.session.user).likedTweets;
            if (likedTweets != undefined && likedTweets.includes(t.id)) { t.isLiked = true; }
            arr.push(t);
            limit -= 1;
        }
        current -= 1;
        if (current < 0) {break;}
    }
    res.json(arr);
    return;
})

app.get('/tweets/:id/replies', (req, res) => {
    // sends array of tweets that are replies to tweet :id, least recent first
    let limit = 75
    let parent = Tweet.findById(req.params.id);
    if (parent == {}) {
        res.status(404).send("404: tweet not found");
        return;};
    let readArr = parent.replyIds.map(e => e);
    if (readArr.length == 0) {
        res.status(404).send("404: tweet has no replies.");
        return;}
    let current = 0;
    let last = current + limit;
    if (last >= readArr.length) {last = readArr.length - 1;}
    let arr = [];
    while (current <= last) {
        let t = Tweet.findById(readArr[current]);
        if (!t.isDeleted && !(t == {})) {
            // generate the usertweet object for current
            t = Tweet.generateView(t.id);
            if (req.session.user = t.userId) { t.isMine = true; }
            let likedTweets = User.findById(req.session.user).likedTweets;
            if (likedTweets != undefined && likedTweets.includes(t.id)) { t.isLiked = true; }
            arr.push(t);
            limit -=1;
        }
        current += 1;
        if (current > last) {break;}
        if (limit <= 0) {break;}
    }
    res.json(arr);
    return;
})

app.post('/tweets', (req, res) => {
    // adds new tweet to tweetData, given fields in req body: type, body, parentId (optional) and returns Tweet object
    if (req.session.user == undefined) {
        res.status(403).send("403 forbidden")
        return;
    }
    let userId = req.session.user;
    let type = req.body.type;
    let body = req.body.body;
    let parentId = 'no parent'
    let mediaType = "none";
    if (req.body.mediaType == "image") {mediaType = "image";};
    if (req.body.mediaType == "video") {mediaType = "video";};
    let mediaId = "";
    if (mediaType == "video" || mediaType == "image") {mediaId = req.body.mediaId;};
    // body length verification
    if (body.length > 280) {res.status(400).send("400: tweet is too long"); return;};
    if (type != "retweet" && body.length == 0) {res.status(400).send("400: tweets and replies must have a body"); return;};
    // type verification
    if (type != "tweet" && type != "retweet" && type != "reply") {res.status(400).send("400: invalid tweet type"); return;}
    // if tweet is reply or retweet, set proper parent ID
    if (!(type == "tweet")) {parentId = req.body.parentId}
    let t = Tweet.create(userId, type, body, parentId, mediaType, mediaId);
    // if (t == null) {res.status(400).send("400: Bad Request")}
    // if tweet is reply, increment parent's replyCount
    if (type == "reply") {
        Tweet.replyCountIncrement(parentId);
        Tweet.reply(t.id, parentId)
    }
    // if tweet is retweet, increment parent's retweetCount
    if (type == "retweet") {
        Tweet.retweetCountIncrement(parentId);
        User.retweet(userId, parentId);
    }
    User.postTweet(userId, t.id);
    return res.json(t);
});

app.post('/tweets/:id/like', (req, res) => {
    let currUser = User.findById(req.session.user);
    if (currUser == {}) {
        res.status(403).send("403 forbidden: not logged in.")
        return;
    }
    let tweet = Tweet.findById(req.params.id);
    if (tweet == {}) {
        res.status(404).send("404: tweet not found.");
        return;
    }
    if (tweet.isDeleted) {
        User.unlikeTweet(req.session.user, req.params.id);
        res.status(400).send("400 bad request: cannot like a deleted tweet.")
        return;
    }
    if (tweet.userId == currUser.id) {
        res.status(400).send("400 bad request: cannot like own tweet");
        return;
    }
    if (currUser.likedTweets.includes(req.params.id)) {
        User.unlikeTweet(currUser.id, req.params.id);
        Tweet.likeCountDecrement(req.params.id);
        res.json(true);
        return;
    }
    if (!currUser.likedTweets.includes(req.params.id)) {
        User.likeTweet(currUser.id, req.params.id);
        Tweet.likeCountIncrement(req.params.id);
        res.json(true);
        return;
    }
})

app.put('/tweets/:id', (req, res) => {
    // editing tweets; only available for user who posted tweet or admins
    let t = Tweet.findById(req.params.id);
    // user filtering
    if (req.session.user == undefined) {
        res.status(403).send("403 forbidden")
        return;
    }
    if (req.session.user == t.userId || req.session.user.type == "admin"){
        if (t == null || t == undefined || t.isDeleted || t == {}) {
            res.status(404).send("404: Tweet could not be found.");
            return;
        }
        let body = t.body;
        if (req.body.body != "") {body = req.body.body;};
        let mediaType = "";
        if (req.body.mediaType != "") {mediaType = req.body.mediaType;};
        let mediaId = "";
        if (req.body.mediaId != "") {mediaId = req.body.mediaId;};
        if (body.length > 280) {res.status(400).send("400 bad request: tweet body too long"); return;}
        if (t.type == "tweet" || t.type == "reply") {if (body.length == 0) {res.status(400).send("400 bad request: tweet body too short"); return;}}
        if (mediaType == "video" && mediaId != "") {
            if (mediaId.indexOf("http://www.youtube.com/embed/" == 0)) {t.videoId = mediaId.slice(29, 40)}
            else if (mediaId.indexOf("https://www.youtube.com/embed/" == 0)) {t.videoId = mediaId.slice(30, 41)}
            else if (mediaId.length == 11) {t.videoId = mediaId}
            if (t.videoId != "") {t.mediaType = "video"}
        }
        if (mediaType == "image" && mediaId != "") {t.mediaType = "image"; t.imageLink = mediaId;}
        if (mediaType == "none") {t.mediaType = "none"; t.videoId = ""; t.imageLink = "";}
        t.body = body;
        t.edit();
        res.json(t);
        return;
    }
    res.status(403).send("403 forbidden")
})

app.delete('/tweets/:id', (req, res) => {
    // deleting tweets; only available for user who posted tweet or admins
    let t = Tweet.findById(req.params.id);
    if (t == null || t == undefined || t == {}) {
        res.status(404).send("404: Tweet could not be found.");
        return;
    }
    if (req.session.user == t.userId || req.session.user.type == "admin"){
        if (t.isDeleted) {res.status(400).send("400 bad request: tweet already deleted.")}
        User.deleteTweet(t.userId, t.id);
        Tweet.delete(t.id);
        res.json(true);
        return;
    }
    res.status(403).send("403 forbidden")
})


const port = (process.env.PORT || 3030);
app.listen(port, () => {
    console.log('server running on port ' + port);
    //User.createAdmin("sclu", "Dev Sophie", "426final", "https://imgur.com/572zTSG.jpg", "mood: aaaaaaaaaaaaaaa");
    //User.create("test", "test account", "test", "test avatar", "test desc");
})
