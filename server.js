const express = require('express');

const cors = require('cors');

const app = express();

// let corsOrigin = "http://localhost:3000";
// let corsOrigin = "174.111.45.28"  // owen
// let corsOrigin = "http://24.106.176.98" // raj
let corsOrigin = "https://426twitter20.com";
//let corsOrigin = "https://slucas2376.github.io"


const config = {
    origin: corsOrigin,
    methods: 'GET,PUT,POST,DELETE,OPTIONS',
    credentials: true,
    exposedHeaders: ["set-cookie"]
};

app.use(cors(config));

const Tweet = require('./Tweet.js');

const User = require('./User.js');
const session = require('express-session');

app.use(express.json());
app.use(express.urlencoded());


app.set('trust proxy', 1);



app.options('/login', cors(config));
// login/user database interaction API
app.post('/login', (req, res) => {
    // requires parameters userId and password, sends true if successful
    // lmao what's an """encryption""", seriously don't use passwords you care about here
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
        res.send(`${userId}`);
        return;
    };
    res.status(403).send("403 forbidden: username or password incorrect");
});

// as-is this method is kinda useless? it basically just prints user logged out on the console;
app.options('/logout', cors(config));
app.get('/logout', (req, res) => {
    console.log("user logged out");
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
    if (userId.length == 0 || displayName.length == 0 || password.length == 0) {
        res.status(400).send("400 bad request: parameter too short");
        return;
    }
    if (avatar == "") {avatar = "https://i.imgur.com/tdi3NGa.png";}
    if (User.findById(userId).id == userId) { res.status(400).send("400 bad request: user already exists") };
    if (userId.length > 16 || displayName.length > 32 || password.length > 24 || avatar.length > 300) {
        res.status(400).send("400 bad request: parameter too long");
        return;
    }
    let u = User.create(userId, displayName, password, avatar);
    console.log("new user created: " + u.id);
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
    res.json(arr);
    return;
})

app.options('/users/:id', cors(config));
app.get('/users/:id', (req, res) => {
    // sends JSON object User for the relevant id
    let targetUser = User.findById(req.params.id);
    if (targetUser != {} || targetUser != undefined || targetUser != null) {
        res.json(User.makeView(targetUser));
        return;
    }
    res.status(404).send("404: user not found");
})


app.put('/users/:id/', (req, res) => {
    // sends true if successful update of user data
    let currUser = User.findById(req.body.userId);
    let currentPassword = req.body.currentPassword;
    if ((currUser.id == req.params.id) && (currentPassword == currUser.password)) {
        let targetUser = User.findById(req.params.id);
        if (targetUser == {}) {
            res.status(404).send("404: user not found")
            return;
        }
        let displayName = req.body.displayName;
        let password = req.body.updatedPassword;
        let avatar = req.body.avatar;
        let desc = req.body.profileDescription;
        if (displayName.length == 0) {displayName = targetUser.displayName};
        if (password.length == 0) {password = targetUser.password};
        if (avatar.length == 0) {avatar = targetUser.avatar};
        if (desc.length == 0) {desc = targetUser.profileDescription}
        if (displayName.length > 32 || password.length > 24 || avatar.length > 120 || desc.length > 300) {
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
    let tweets = User.findById(req.params.id).postedTweets;
    let t = "";
    for (t of tweets) {
        Tweet.delete(t);
    }
    let temp = User.delete(req.params.id);
    // req.session.regenerate(() => {});
    if (temp) {res.json(true);
        return;}
    res.status(400).send("400 bad request: user could not be deleted");
    return;
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
    res.json(t);
    return;
});

app.get('/tweets/recent', (req, res) => {
    // sends out array of (limit) most recent Tweet objects in descending order of posting, excluding replies
    let limit = 75;
    let current = Tweet.nextId - 1;
    let last = current - limit;
    let arr = [];
    while (limit > 0) {
        let t = Tweet.findById(current);
        if (!t.isDeleted && !(t == {}) && (t.type != "reply")) {
            t = Tweet.generateView(t.id);
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
    if (readArr.length == 0) {res.send([]); return;}
    let current = readArr.length - 1;
    let last = current - limit;
    if (last < 0) {last = 0;}
    let arr = [];
    while (limit > 0) {
        let t = Tweet.findById(readArr[current]);
        if (!t.isDeleted && !(t == {})) {
            t = Tweet.generateView(t.id);
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
    if (readArr.length == 0) {res.send([]); return;}
    let current = readArr.length - 1;
    let last = current - limit;
    if (last < 0) {last = 0;}
    let arr = [];
    while (limit > 0) {
        let t = Tweet.findById(readArr[current]);
        if (!t.isDeleted && !(t == {})) {
            t = Tweet.generateView(t.id);
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
    if (readArr.length == 0) {res.send([]); return;}
    let current = readArr.length - 1;
    let last = current - limit;
    if (last < 0) {last = 0;}
    let arr = [];
    while (limit > 0) {
        let t = Tweet.findById(readArr[current]);
        if (!t.isDeleted && !(t == {})) {
            t = Tweet.generateView(t.id);
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
        res.send([]);
        return;}
    let current = 0;
    let last = current + limit;
    if (last >= readArr.length) {last = readArr.length - 1;}
    let arr = [];
    while (current <= last) {
        let t = Tweet.findById(readArr[current]);
        if (!t.isDeleted && !(t == {})) {
            t = Tweet.generateView(t.id);
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
    let currUser = User.findById(req.body.userId);
    if (currUser == undefined || currUser == {}) {
        res.status(403).send("403 forbidden")
        return;
    }
    let type = req.body.type;
    let body = req.body.body;
    let parentId = 'no parent'
    let mediaType = "none";
    if (req.body.mediaType == "image") {mediaType = "image";};
    if (req.body.mediaType == "video") {mediaType = "video";};
    let mediaId = "";
    if (mediaType == "video" || mediaType == "image") {mediaId = req.body.mediaId;};
    if (body.length > 280) {res.status(400).send("400: tweet is too long"); return;};
    if (type != "retweet" && body.length == 0) {res.status(400).send("400: tweets and replies must have a body"); return;};
    if (type != "tweet" && type != "retweet" && type != "reply") {res.status(400).send("400: invalid tweet type"); return;}
    if (!(type == "tweet")) {parentId = req.body.parentId.toString()}
    let t = Tweet.create(currUser.id, type, body, parentId, mediaType, mediaId);
    if (type == "reply") {
        console.log("REPLY: parent " + parentId)
        Tweet.replyCountIncrement(parentId);
        Tweet.reply(t.id, parentId)
    }
    if (type == "retweet") {
        console.log("RETWEET: parent " + parentId)
        Tweet.retweetCountIncrement(parentId);
        User.retweet(currUser.id, parentId);
    }
    console.log("tweet " + t.id + " posted")
    User.postTweet(currUser.id, t.id);
    return res.json(t);
});

app.post('/tweets/:id/like', (req, res) => {
    let currUser = User.findById(req.body.userId);
    if (currUser == {} || req.body.userId == undefined) {
        res.status(403).send("403 forbidden: not logged in.")
        return;
    }
    let tweet = Tweet.findById(req.params.id);
    if (tweet == {}) {
        res.status(404).send("404: tweet not found.");
        return;
    }
    if (tweet.isDeleted) {
        res.status(400).send("400 bad request: cannot like a deleted tweet.")
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
    // editing tweets; only available for user who posted tweet
    let currUser = User.findById(req.body.userId);
    let t = Tweet.findById(req.params.id);
    // user filtering
    if (currUser == {} || currUser == undefined) {
        res.status(403).send("403 forbidden")
        return;
    }
    if (currUser.id == t.userId){
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
            t.mediaType = "video"; t.videoId = mediaId; t.imageLink = "";
        }
        if (mediaType == "image" && mediaId != "") {t.mediaType = "image"; t.imageLink = mediaId; t.videoId = "";}
        if (mediaType == "none") {t.mediaType = "none"; t.videoId = ""; t.imageLink = "";}
        t.body = body;
        t.edit();
        res.json(t);
        return;
    }
    res.status(403).send("403 forbidden")
})

app.delete('/tweets/:id', (req, res) => {
    let t = Tweet.findById(req.params.id);
    if (t == null || t == undefined || t == {}) {
        res.status(404).send("404: Tweet could not be found.");
        return;
    }
    if (t.isDeleted) {res.status(400).send("400 bad request: tweet already deleted.")}
    User.deleteTweet(t.userId, t.id);
    Tweet.delete(t.id);
    res.json(true);
    return;
    res.status(403).send("403 forbidden")
})


const port = (process.env.PORT || 3030);
app.listen(port, () => {
    console.log('server running on port ' + port);
    //User.create("sclu", "Dev Sophie", "426final", "https://imgur.com/572zTSG.jpg", "mood: aaaaaaaaaaaaaaa");
    //User.create("test", "test account", "test", "https://i.imgur.com/tdi3NGa.png", "test desc");
})
