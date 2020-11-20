const express = require('express');

const app = express();

const Tweet = require('./Tweet.js');

const User = require('./User.js');
const userData = require('data-store')({path: process.cwd() + '/data/users.json'});

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const expressSession = require('express-session');
app.use(expressSession({
    name: "defNotTwitterSessionCookie",
    secret: "coronavirus really needs to just Not(tm)",
    resave: false,
    saveUninitialized: false
}));

// login/user database interaction API
app.post('/login', (req, res) => {
    // requires parameters userId and password, sends true if successful
    // lmao what's an """encryption""", seriously don't use passwords you care about here
    // maybe add logic to check if a user is already logged in, then send 400 already logged in?
    let userId = req.body.userId;
    if (userId == "") {res.status(400).send("400 bad request: invalid username")}
    let password = req.body.password;
    if (password == "") {res.status(400).send("400 bad request: invalid password")}
    let loginData = userData.get(userId);
    if (loginData == null || loginData == undefined) {
        res.status(404).send("404: user not found");
        return;
    }
    if (loginData.password == password) {
        // successful login
        req.session.user = userId;
        res.json(true);
        return;
    }
    res.status(403).send("403 forbidden: username or password incorrect")
});

app.get('/logout', (req, res) => {
    // logs out current user, sends back true
    delete req.session.user;
    res.json(true);
})

app.post('/register', (req, res) => {
    // takes fields of (str) userId, (str) displayName, (str) password, (str image link) avatar (avatar is optional and defaults to whatever link we find for default)
    // sends back true on successful registration
    let userId = req.body.userId;
    if (User.findById(userId).id == userId) { res.status(400).send("400 bad request: user already exists") };
    let displayName = req.body.displayName;
    let password = req.body.password;
    let avatar = req.body.avatar;
    if (userId.length == 0 || displayName.length == 0 || password.length == 0 || avatar.length == 0) {
        res.status(400).send("400 bad request: parameter too short");
        return;
    }
    if (userId.length > 16 || displayName.length > 32 || password.length > 24 || avatar.length > 120) {
        res.status(400).send("400 bad request: parameter too long");
        return;
    }
    let u = User.create(userId, displayName, password, avatar);
    res.json(true);
})

app.get('/users/idnames', (req, res) => {
    // sends array of JSON objects containing a userId field and a displayName field, for all registered users
    res.json(User.getAllIdNamePairs());
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

app.get('/users/current', (req, res) => {
    res.json(User.makeView(User.findById(req.session.user)))
})

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
        if (displayName.length > 32 || password.length > 24 || avatar.length > 120) {
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
        delete req.session.user;
        if (temp) {res.json(true);
            return;}
        res.status(400).send("400 bad request: user could not be deleted");
        return;
    }
    if ((currUser == undefined) || (currUser == null)) { res.status(404).send("404: no user found")};
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
    // sends out array of (limit) most recent Tweet objects in descending order of posting, can skip any number of more recent tweets
    let skip = req.body.skip;
    let limit = req.body.limit;
    if (limit == "") {limit = 50;} else {limit = parseInt(limit);}
    if (skip == "") {skip = 0;} else {skip = parseInt(skip);}
    if (limit < 1 || limit > 75) {
        res.status(400).send("400 bad request: tweet limit out of bounds.");
        return;
    }
    let current = Tweet.nextId -1 - skip;
    if (current < 0) {
        res.status(400).send("400 bad request: skipped all tweets");
        return;
    }
    let last = current - limit;
    if (last < 0) {last = 0;}
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

app.get('/tweets/user/:userId', (req, res) => {
    // sends out array of tweets, all by author :userId, in descending order of posting or liking
    let skip = req.body.skip;
    let limit = req.body.limit;
    let likedOrPosted = req.body.likedOrPosted;
    if (likedOrPosted != "liked" && likedOrPosted != "posted") {res.status(400).send("400 bad request: invalid filter criterion")};
    if (limit == "") {limit = 50;} else {limit = parseInt(limit);}
    if (skip == "") {skip = 0;} else {skip = parseInt(skip);}
    if (limit < 1 || limit > 75) {
        res.status(400).send("400 bad request: tweet limit out of bounds.");
        return;
    }
    let user = User.findById(req.params.userId);
    if (user == {}) {res.status(404).send("404: user not found")};
    let readArr = [];
    if (likedOrPosted == "liked") { readArr = user.likedTweets.map(e => e)};
    if (likedOrPosted == "posted") {readArr = user.postedTweets.map(e => e)}
    if (readArr.length == 0) {res.status(404).send("404: user has no such tweets."); return;}
    let current = readArr.length - 1 - skip;
    if (current < 0) {
        res.status(400).send("400 bad request: skipped all tweets");
        return;
    }
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

app.get('/tweets', (req, res) => {
    // sends out a filtered array of some sort probably;
    // arr = something.
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
    // body length verification
    if (body.length > 280) {res.status(400).send("400: tweet is too long")};
    if (type != "retweet" && body.length == 0) {res.status(400).send("400: tweets and replies must have a body")};
    // type verification
    if (type != "tweet" && type != "retweet" && type != "reply") {res.status(400).send("400: invalid tweet type")}
    // if tweet is reply or retweet, set proper parent ID
    if (!(type == "tweet")) {parentId = req.body.parentId}
    let t = Tweet.create(userId, type, body, parentId);
    // if (t == null) {res.status(400).send("400: Bad Request")}
    // if tweet is reply, increment parent's replyCount
    if (type == "reply") {
        Tweet.replyCountIncrement(parentId);
    }
    // if tweet is retweet, increment parent's retweetCount
    if (type == "retweet") {
        Tweet.retweetCountIncrement(parentId);
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
        if (t == null || t == undefined || t.isDeleted) {
            res.status(404).send("404: Tweet could not be found.");
            return;
        }
        // if we're allowing attachment of media, here is where that's edited too
        let body = req.body.body;
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
    if (t == null || t == undefined) {
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


// port will probably come from heroku; look at tutorials for that!
const port = 3030;
app.listen(port, () => {
    console.log('server running on port ' + port);
/*    User.createAdmin("sclu", "Dev Sophie", "426final", "a picture of edelgard probably");
    User.create("test", "test account", "test")*/
})
