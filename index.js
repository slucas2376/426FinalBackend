const express = require('express');

const app = express();

const Tweet = require('./Tweet.js');

const User = require('./User.js');
const userData = require('data-store')({path: process.cwd() + './data/users.json'});

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const expressSession = require('express-session');
app.use(expressSession({
    name: "defNotTwitterSessionCookie",
    secret: "coronavirus really needs to just Not(tm)",
    resave: false,
    saveUninitialized: false
}));


app.post('/login', (req, res) => {
    // lmao what's an """encryption""", seriously don't use passwords you care about here
    let user = req.body.user;
    let password = req.body.password;
    let loginData = userData.get(user);
    if (loginData == null) {
        res.status(404).send("404: user not found");
        return;
    }
    if (loginData.password == password) {
        // successful login
        req.session.user = user;
        res.json(true);
        return;
    }
    res.status(403).send("403: password incorrect")
});

app.get('/logout', (req, res) => {
    delete req.session.user;
    res.json(true);
})

// TODO: user registration
app.post('/register', (req, res) => {
    // takes params of username, display name, avatar (avatar is optional and defaults to whatever link we find for default)
    let userId = req.body.userId;
    let displayName = req.body.displayName;
    let avatar = req.body.avatar;

})

app.get('/tweet/allIDs', (req, res) => {
    // sends out array of integer IDs for all tweet objects, in ascending order of creation
    res.json(Tweet.getAllIds());
    return;
});

app.get('/users/IDs', (req, res) => {
    res.json(User.getAllIds());
    return;
})

app.get('/users', (req, res) => {
    res.json(User.getAll());
    return;
})

app.get('users/:id', (req, res) => {
    let u = User.findById(req.params.id);
    if (u == null) {
        res.status(404).send("404: user not found");
        return;
    }
    res.json(u);
    return;
})

// make a get50mostrecent maybe?

app.get('/tweet/:id', (req, res) => {
    // finds tweet by tweet ID, sends out tweet object
    let t = Tweet.findById(req.params.id);
    if (t == null) {
        res.status(404).send("404: Tweet could not be found.");
        return;
    }
    res.json(t);
    return;
});

app.get('/tweet', (req, res) => {
    // sends out a filtered array of some sort;
    // arr = something.
})

app.post('/tweet', (req, res) => {
    // adds new tweet to tweetData
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
    // author verification??? idk, depends on login
    // if tweet is reply or retweet, set proper parent ID
    if (!(type == "tweet")) { parentId = req.body.parentId}
    let t = Tweet.create(userId, type, body, parentId);
    // if (t == null) {res.status(400).send("400: Bad Request")}
    return res.json(t);
});

app.put('/tweet/:id', (req, res) => {
    // editing tweets; will need auth once implemented
    let t = Tweet.findById(req.params.id);
    // user filtering
    if (req.session.user == undefined) {
        res.status(403).send("403 forbidden")
        return;
    }
    if (req.session.user)
        if (t == null) {
            res.status(404).send("404: Tweet could not be found.");
            return;
        }
    // if we're allowing attachment of media, here is where that's edited too
    let body = req.body.body;
    t.body = body;
    t.update();

    res.json(t);
})

app.delete('tweet/:id', (req, res) => {
    // deleting tweets; will need auth once implemented
    let t = Tweet.findById(req.params.id);
    if (t == null) {
        res.status(404).send("404: Tweet could not be found.");
        return;
    }
    t.delete();
    res.json(true);
})

// port will probably come from heroku; look at tutorials for that!
const port = 3030;
app.listen(port, () => {
    console.log('server running on port ' + port);
    User.createAdmin("sclu", "Dev Sophie", "426final", "a picture of edelgard probably");
})
