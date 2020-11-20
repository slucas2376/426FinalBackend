const User = require("./User");
const tweetData = require('data-store')({path: process.cwd() + '/data/tweets.json'});

class Tweet {
    constructor(id, userId, type, body, parentId)
    {this.id = id;
        this.userId = userId;
        this.type = type;
        this.body = body;
        this.parentId = parentId;
        this.createdAt = new Date();
        this.isDeleted = false;}
    // add other properties, incl default vals; are we adding media links? I don't want to have a cdn so no uploading of our own content
    isEdited = false;
    editedAt = null;
    likeCount = 0;
    replyCount = 0;
    retweetCount = 0;
    replyIds = [];

    edit() {
        this.isEdited = true;
        this.editedAt = new Date();
        tweetData.set(this.id.toString(), this);
    }

    update() {
        tweetData.set(this.id.toString(), this);
    }
}

Tweet.getAllIds = () => {
    // return an array of all tweet IDs
    return Object.keys(tweetData.data).map((id => {return parseInt(id);}));
}

Tweet.getAllIdsForAuthor = (userId) => {
    // returns all tweets with author userId
    return Object.keys(tweetData.data).map((id => {return parseInt(id);})).filter(id => tweetData.get(id).userId == author).map(id => parseInt(id));
}

Tweet.findById = (id) => {
    let t = tweetData.get(id.toString());
    if (t != null && t != undefined) {
        // old code; generally I can sanitize the constructor or sanitize this and I choose to sanitize the constructor
        // return new Tweet(t.id, t.userId, t.type, t.body, t.parentId);
        return t;
    }
    return null;
}

Tweet.generateView = (tweetId) => {
    // will return empty object if tweet does not exist;
    let t = Tweet.findById(tweetId);
    if (!t.isDeleted) {
        let v = t;
        v.isMine = false;
        v.isLiked = false;
        v.author = {};
        return v;
    } else { return t; }
}

Tweet.nextId = Tweet.getAllIds().reduce((max, nextId) => {
    if (max < nextId) {
        return nextId;
    }
    return max;
}, -1) + 1;

Tweet.create = (userId, type, body, parentId = 'no parent') => {
    let newId = Tweet.nextId;
    Tweet.nextId += 1;
    let t = new Tweet(newId, userId, type, body, parentId)
    tweetData.set(t.id.toString(), t);
    return t;
}

Tweet.replyCountIncrement = (id) => {
    let t = tweetData.get(id);
    t.replyCount += 1;
    tweetData.set(id.toString(), t);
}

Tweet.retweetCountIncrement = (id) => {
    let t = tweetData.get(id);
    t.retweetCount += 1;
    tweetData.set(id.toString(), t);
}

Tweet.likeCountIncrement = (id) => {
    let t = tweetData.get(id);
    t.likeCount += 1;
    tweetData.set(id.toString(), t);
}

Tweet.likeCountDecrement = (id) => {
    let t = tweetData.get(id);
    if (t.likeCount != 0) {
        t.likeCount -= 1;
        tweetData.set(id.toString(), t);
    }
}

Tweet.isMine = (userId, tweetId) => {
    // if user posted tweet, returns true; else returns false
    let t = Tweet.findById(tweetId);
    if (t.userId = userId) {
        return true;
    }
    return false;
}

Tweet.isLiked = (userId, tweetId) => {
    // if user liked tweet, returns true; else returns false
    let u = User.findById(userId);
    if (u.likedTweets.includes(tweetId.toString())) {
        return true;
    }
    return false;
}

Tweet.delete = (id) => {
    // replaces Tweet object with a version of itself containing only an id field containing its id and an isDeleted field set to true
    t = Tweet.findById(id.toString());
    tweetData.set(id.toString(), {id: id.toString(), isDeleted: true});
}

module.exports = Tweet;