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

// login API
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

app.get('/users/IDs', (req, res) => {
    // sends list of all account IDs, used for testing only
    res.json(User.getAllIds());
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
        if (displayName.length == 0) {displayName = targetUser.displayName};
        if (password.length == 0) {password = targetUser.password};
        if (avatar.length == 0) {avatar = targetUser.avatar};
        if (displayName.length > 32 || password.length > 24 || avatar.length > 120) {
            res.status(400).send("400 bad request: parameter too long");
            return;
        }
        User.update(req.params.id, displayName, password, avatar);
        res.json(true);
        return;
    }
    else {res.status(403).send("403 forbidden");}
})

app.delete('/users/:id', (req, res) => {
    // deleting user; need to either be logged in as that user or as admin, sends back true on success
    let currUser = User.findById(req.session.user);
    if ((currUser.id == req.params.id) || (currUser.type == "admin")) {
        let temp = User.delete(req.params.id);
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

// make a get50mostrecent maybe?

app.get('/tweets/:id', (req, res) => {
    // finds tweet by tweet ID, sends out tweet object
    let t = Tweet.findById(req.params.id);
    if (t == null) {
        res.status(404).send("404: Tweet could not be found.");
        return;
    }
    if (t.isDeleted) {res.json("Tweet has been deleted.")}
    res.json(t);
    return;
});

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
    return res.json(t);
});

// implement like function; probably dual-function like/unlike just like the button for ease of frontend implementation, cannot like own tweet
app.post('/tweets/:id/like', (req, res) => {
    // this is the function body
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
        t.delete();
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
