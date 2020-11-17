const express = require('express');

const app = express();

const Tweet = require('./Tweet.js');

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const expressSession = require('express-session');
app.use(expressSession({
    name: "defNotTwitterSessionCookie",
    secret: "coronavirus really needs to just Not(tm)",
    resave: false,
    saveuninitialized: false
}));


app.post('/login', (req, res) => {
    // lmao what's an """encryption""", seriously don't use passwords you care about here
    let user = req.body.user;
    let password = req.body.password;
    let userData = loginData.get(user);
    if (userData == null) {
        res.status(404).send("404: user not found");
        return;
    }
    if (userData.password == password) {
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

app.get('/tweet/allIDs', (req, res) => {
    // sends out array of integer IDs for all tweet objects, in ascending order of creation
    res.json(Tweet.getAllIds());
    return;
});

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
    console.log('server test running on port ' + port);
})
